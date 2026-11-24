import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetAetherConversationQueryKey } from "@workspace/api-client-react";
import {
  streamAetherNotebookChat,
  speakAetherNotebookReply,
  type CompanionId,
} from "@/lib/sovereign-aether-runtime";

export function useAiChat(
  conversationId: number | null,
  noteId?: number,
  autoSpeakReply = true,
  companion: CompanionId = "aether",
) {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string): Promise<string | null> => {
      if (!conversationId || !content.trim()) return null;

      setIsStreaming(true);
      setStreamingContent("");
      setError(null);

      try {
        const finalReply = await streamAetherNotebookChat({
          conversationId,
          noteId,
          companion,
          userMessage: content.trim(),
          onDelta: (accumulated) => {
            setStreamingContent(accumulated);
          },
        });

        await queryClient.invalidateQueries({
          queryKey: getGetAetherConversationQueryKey(conversationId),
        });

        if (autoSpeakReply && finalReply.trim()) {
          void speakAetherNotebookReply(finalReply, companion);
        }
        return finalReply;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to reach Sovereign Aether");
        return null;
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    [conversationId, noteId, autoSpeakReply, companion, queryClient],
  );

  return {
    sendMessage,
    isStreaming,
    streamingContent,
    error,
  };
}
