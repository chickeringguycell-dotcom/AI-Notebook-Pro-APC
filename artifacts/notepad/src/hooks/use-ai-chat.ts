import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetOpenaiConversationQueryKey } from "@workspace/api-client-react";
import { track } from "@/lib/analytics";
import {
  streamAetherNotebookChat,
  speakAetherNotebookReply,
} from "@/lib/sovereign-aether-runtime";

export function useAiChat(
  conversationId: number | null,
  noteId?: number,
  voiceReplyEnabled = false,
) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const queryClient = useQueryClient();

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return;

      setIsStreaming(true);
      setStreamingContent("");
      track("ai_message_sent");

      queryClient.setQueryData(
        getGetOpenaiConversationQueryKey(conversationId),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            messages: [
              ...(old.messages || []),
              {
                id: Date.now(),
                conversationId,
                role: "user",
                content,
                createdAt: new Date().toISOString(),
              },
            ],
          };
        },
      );

      try {
        const reply = await streamAetherNotebookChat({
          conversationId,
          noteId,
          userMessage: content,
          onDelta: (accumulated) => {
            setStreamingContent(accumulated);
          },
        });

        await queryClient.invalidateQueries({
          queryKey: getGetOpenaiConversationQueryKey(conversationId),
        });

        if (voiceReplyEnabled && reply.trim()) {
          void speakAetherNotebookReply(reply, "aria");
        }
      } catch (error) {
        console.error("Sovereign Aether chat error:", error);
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    [conversationId, noteId, queryClient, voiceReplyEnabled],
  );

  return {
    sendMessage,
    isStreaming,
    streamingContent,
  };
}
