import { useState, useRef, useEffect } from "react";
import { Send, X, Bot, User, Loader2, Mic, Volume2, VolumeX, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetOpenaiConversation,
  useCreateOpenaiConversation,
  getGetOpenaiConversationQueryKey,
} from "@workspace/api-client-react";
import { useAiChat } from "@/hooks/use-ai-chat";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import {
  speakAetherNotebookReply,
  stopAetherVoicePlayback,
} from "@/lib/sovereign-aether-runtime";

interface AiPanelProps {
  noteId: number;
  onClose: () => void;
}

export function AiPanel({ noteId, onClose }: AiPanelProps) {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [voiceReplyOn, setVoiceReplyOn] = useState(true);
  const createConversation = useCreateOpenaiConversation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoStartedRef = useRef<number | null>(null);

  const { data: conversation, isLoading } = useGetOpenaiConversation(
    conversationId ?? 0,
    {
      query: {
        enabled: !!conversationId,
        queryKey: getGetOpenaiConversationQueryKey(conversationId ?? 0),
      },
    },
  );

  const { sendMessage, isStreaming, streamingContent } = useAiChat(
    conversationId,
    noteId,
    voiceReplyOn,
  );

  const { isListening, isSupported, toggleListening } = useSpeechRecognition({
    onResult: (spoken) => {
      const text = spoken.trim();
      if (!text) return;
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    },
  });

  // Automatically open/resume the Aether writing chat for this note immediately
  useEffect(() => {
    if (autoStartedRef.current === noteId) return;
    autoStartedRef.current = noteId;
    createConversation.mutate(
      { data: { title: `Note #${noteId} Chat` } },
      {
        onSuccess: (conv) => {
          setConversationId(conv.id);
        },
      },
    );
  }, [noteId, createConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages, streamingContent]);

  useEffect(() => {
    return () => {
      stopAetherVoicePlayback();
    };
  }, []);

  const handleSend = async (explicitText?: string) => {
    const msg = (explicitText ?? input).trim();
    if (!msg || isStreaming) return;
    if (!explicitText) setInput("");
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleInsertIntoNote = (text: string) => {
    window.dispatchEvent(
      new CustomEvent("aether-insert-into-note", { detail: { text } }),
    );
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 md:relative md:z-auto flex flex-col h-full border-l bg-card text-card-foreground w-80 sm:w-96 shrink-0 no-print shadow-xl md:shadow-none">
      <div className="h-14 border-b flex items-center justify-between px-3">
        <div className="flex items-center gap-2 font-medium text-sm">
          <span className="text-primary font-bold text-base">✦</span>
          <span>Aether Writing Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const next = !voiceReplyOn;
              setVoiceReplyOn(next);
              if (!next) stopAetherVoicePlayback();
            }}
            title={voiceReplyOn ? "Voice replies ON (tap to mute)" : "Voice replies OFF (tap to speak aloud)"}
            className="h-8 w-8"
          >
            {voiceReplyOn ? (
              <Volume2 className="h-4 w-4 text-primary" />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              stopAetherVoicePlayback();
              onClose();
            }}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick 1-Tap Writing Helper Prompts */}
      <div className="px-3 py-2 border-b bg-muted/40 flex gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { label: "✨ Polish note", prompt: "Please polish and improve the clarity and flow of my current note while keeping my voice." },
          { label: "✍️ Continue writing", prompt: "Help me write the next paragraph naturally continuing from what I wrote in my note." },
          { label: "💡 Brainstorm", prompt: "Give me 5 creative ideas or outline points to expand this note." },
          { label: "📝 Summarize", prompt: "Give me a crisp summary of the key points in my note." },
        ].map((q) => (
          <button
            key={q.label}
            type="button"
            disabled={isStreaming || !conversationId}
            onClick={() => void handleSend(q.prompt)}
            className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-background border border-border hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isLoading || !conversationId ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {conversation?.messages?.length === 0 && !isStreaming && (
              <div className="text-center py-6 px-2 space-y-2">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Hi! I'm Aether — ready to help you write.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tap the <strong>🎤 mic</strong> to talk to me aloud, pick a quick helper above, or ask anything about your open note.
                </p>
              </div>
            )}
            {conversation?.messages?.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-xs font-bold text-primary">✦</span>
                  </div>
                )}
                <div className="max-w-[85%] space-y-1">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 pl-1">
                      <button
                        type="button"
                        onClick={() => handleInsertIntoNote(msg.content)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        <PlusCircle className="h-3 w-3" /> Insert into note
                      </button>
                      <button
                        type="button"
                        onClick={() => void speakAetherNotebookReply(msg.content, "aria")}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <Volume2 className="h-3 w-3" /> Read aloud
                      </button>
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isStreaming && streamingContent && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-xs font-bold text-primary">✦</span>
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-muted text-foreground">
                  {streamingContent}
                  <span className="inline-block w-1 h-4 bg-primary ml-0.5 animate-pulse" />
                </div>
              </div>
            )}
            {isStreaming && !streamingContent && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">✦</span>
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-3 border-t">
        <div className="flex gap-1.5 items-end">
          {isSupported && (
            <Button
              type="button"
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={toggleListening}
              title={isListening ? "Stop listening" : "Speak to Aether aloud"}
              className="shrink-0 h-10 w-10"
            >
              <Mic className={`h-4 w-4 ${isListening ? "animate-pulse" : ""}`} />
            </Button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening… speak naturally" : "Talk or type to Aether…"}
            className="flex-1 resize-none text-sm bg-muted rounded-xl px-3 py-2 border-none outline-none focus:ring-1 focus:ring-primary min-h-[40px] max-h-[120px] leading-relaxed"
            rows={1}
            disabled={isStreaming}
          />
          <Button
            size="icon"
            onClick={() => void handleSend()}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 h-10 w-10"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
