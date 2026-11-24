import { useState, useRef, useEffect } from "react";
import { Send, X, Bot, User, Loader2, Mic, Volume2, VolumeX, PlusCircle, Feather, Square, Ban } from "lucide-react";
import { useProStatus } from "@/hooks/use-pro-status";
import { ProGateModal } from "@/components/pro-gate-modal";
import { Button } from "@/components/ui/button";
import {
  useGetAetherConversation,
  useCreateAetherConversation,
  getGetAetherConversationQueryKey,
  getListNotesQueryKey,
  getGetNoteQueryKey,
} from "@workspace/api-client-react";
import { useAiChat } from "@/hooks/use-ai-chat";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useQueryClient } from "@tanstack/react-query";
import {
  speakAetherNotebookReply,
  stopAetherVoicePlayback,
  subscribeSovereignVoiceSpeaking,
  extractCleanDraftForStationery,
  appendConversationPair,
  renameActiveNoteRecord,
  moveActiveNoteToFolder,
  organizeAllNotesUponRequest,
  type CompanionId,
  type NoteTextAlign,
} from "@/lib/sovereign-aether-runtime";

import { useLang } from "@/contexts/language-context";
import { getOnboardingCopy } from "@/locales/onboarding-i18n";

interface AiPanelProps {
  noteId: number;
  onClose: () => void;
}

const VOICE_STOP_RE = /^(stop|stop talking|stop speaking|pause|quiet|mute|hold on|be quiet|hush)[.!?\s]*$/i;

const WRITE_PREVIOUS_DRAFT_TO_STATIONERY_RE =
  /\b(type|write|put|place|copy|move|transfer|send|draft)\b[\s\S]{0,45}\b(that|it|this|the poem|the letter|the note|the draft|what we (?:drafted|wrote|made))\b[\s\S]{0,45}\b(on|onto|into|in|to)\b[\s\S]{0,25}\b(stationery|stationary|page|paper|note)\b|\b(?:on|onto)\s+(?:the\s+|my\s+)?(?:stationery|stationary)\b/i;

const RENAME_NOTE_RE =
  /\b(?:rename|retitle|change\s+the\s+(?:title|name)\s+of)\s+(?:this\s+|my\s+)?note\s+to\s+["']?([^"'.!?\n]{2,80})["']?/i;

const MOVE_NOTE_TO_FOLDER_RE =
  /\b(?:move|put|file)\s+(?:this\s+|my\s+)?note\s+(?:into|in|to|under)\s+(?:the\s+|my\s+)?["']?([A-Za-z0-9 &'-]{2,40}?)["']?(?:\s+(?:folder|section|tab|category))?[.!?\s]*$/i;

const ORGANIZE_ALL_NOTES_RE =
  /\b(?:organize|sort|categorize|tidy\s+up)\s+(?:all\s+)?(?:my\s+|our\s+|the\s+)?notes\b/i;

const REWRITE_ACTIVE_NOTE_ON_PAGE_RE =
  /\b(?:rewrite|polish\s+up|fix\s+the\s+grammar\s+(?:in|on))\s+(?:this\s+|my\s+)(?:note|page|stationery)\b/i;

export function AiPanel({ noteId, onClose }: AiPanelProps) {
  const queryClient = useQueryClient();
  const { lang, t } = useLang();
  const uiCopy = getOnboardingCopy(lang);
  const { isPro, aiTriesLeft, freeAiLimit, consumeAiTry, yearlyPrice } = useProStatus();
  const [proGateOpen, setProGateOpen] = useState(false);
  const outOfFreeAi = !isPro && aiTriesLeft <= 0;
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [companion, setCompanion] = useState<CompanionId>(() => {
    try {
      return localStorage.getItem("viper_notebook_companion") === "aria" ? "aria" : "aether";
    } catch {
      return "aether";
    }
  });
  const [input, setInput] = useState("");
  const [voiceReplyOn, setVoiceReplyOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const createConversation = useCreateAetherConversation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoStartedRef = useRef<number | null>(null);
  const pausedMicForSpeechRef = useRef(false);

  const { data: conversation, isLoading } = useGetAetherConversation(
    conversationId ?? 0,
    {
      query: {
        enabled: !!conversationId,
        queryKey: getGetAetherConversationQueryKey(conversationId ?? 0),
      },
    },
  );

  const { sendMessage, isStreaming, streamingContent } = useAiChat(
    conversationId,
    noteId,
    voiceReplyOn,
    companion,
  );

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    onResult: (spoken) => {
      const text = spoken.trim();
      if (!text) return;
      // Ignore any stray recognition event if speaker is active (half-duplex protection)
      if (isSpeaking) return;
      if (VOICE_STOP_RE.test(text)) {
        stopAetherVoicePlayback();
        return;
      }
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    },
  });

  // Strict Half-Duplex Lock (ported from Religious App `lds-15-minute-talks`):
  // Whenever Aether or Aria speaks, pause the microphone so the speaker NEVER feeds back into the mic!
  useEffect(() => {
    return subscribeSovereignVoiceSpeaking((speaking) => {
      setIsSpeaking(speaking);
      if (speaking && isListening) {
        pausedMicForSpeechRef.current = true;
        stopListening();
      } else if (!speaking && pausedMicForSpeechRef.current) {
        pausedMicForSpeechRef.current = false;
        setTimeout(() => {
          startListening();
        }, 360);
      }
    });
  }, [isListening, startListening, stopListening]);

  const handleCompanionSwitch = (next: CompanionId) => {
    stopAetherVoicePlayback();
    setCompanion(next);
    try {
      localStorage.setItem("viper_notebook_companion", next);
    } catch {
      /* ignore */
    }
  };

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

  const dispatchTypeOntoStationery = (
    rawText: string,
    mode: "replace" | "append" = "replace",
    explicitAlign?: NoteTextAlign,
  ) => {
    const extracted = extractCleanDraftForStationery(rawText);
    if (!extracted.body) return;
    const align: NoteTextAlign | undefined =
      explicitAlign ?? (extracted.isLikelyPoem ? "center" : undefined);
    window.dispatchEvent(
      new CustomEvent("aether-type-onto-stationery", {
        detail: {
          title: extracted.title,
          text: extracted.body,
          mode,
          align,
        },
      }),
    );
  };

  const getLatestAssistantDraft = (): string | null => {
    const msgs = conversation?.messages ?? [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "assistant" && msgs[i].content.trim().length > 20) {
        return msgs[i].content;
      }
    }
    return null;
  };

  const handleSend = async (explicitText?: string) => {
    if (!isPro && aiTriesLeft <= 0) {
      setProGateOpen(true);
      return;
    }
    const msg = (explicitText ?? input).trim();
    if (!msg || isStreaming) return;

    // Stop voice immediately if user typed/said "stop"
    if (VOICE_STOP_RE.test(msg)) {
      if (!explicitText) setInput("");
      stopAetherVoicePlayback();
      return;
    }

    if (!isPro && !consumeAiTry()) {
      setProGateOpen(true);
      return;
    }
    if (!explicitText) setInput("");

    // Turn off open mic before AI responds so AI voice never overrides user input
    if (isListening) {
      pausedMicForSpeechRef.current = false;
      stopListening();
    }
    stopAetherVoicePlayback();

    // Explicit Action A: Rename Note Upon Request ("Rename this note to Cherry Pie Recipe")
    const renameMatch = msg.match(RENAME_NOTE_RE);
    if (renameMatch && renameMatch[1] && conversationId) {
      const nextTitle = renameMatch[1].trim();
      await renameActiveNoteRecord(noteId, nextTitle);
      window.dispatchEvent(new CustomEvent("aether-update-note-meta", { detail: { title: nextTitle } }));
      await queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetNoteQueryKey(noteId) });
      const ack =
        companion === "aria"
          ? `Done! I renamed this note to "${nextTitle}" for you.`
          : `Done—I renamed this note to "${nextTitle}".`;
      await appendConversationPair(conversationId, msg, ack);
      await queryClient.invalidateQueries({ queryKey: getGetAetherConversationQueryKey(conversationId) });
      if (voiceReplyOn) void speakAetherNotebookReply(ack, companion);
      return;
    }

    // Explicit Action B: Move Note to Folder Upon Request ("Move this note to Recipes")
    const moveFolderMatch = msg.match(MOVE_NOTE_TO_FOLDER_RE);
    if (
      moveFolderMatch &&
      moveFolderMatch[1] &&
      !/^(?:stationery|stationary|page|paper)$/i.test(moveFolderMatch[1].trim()) &&
      conversationId
    ) {
      const folderName = moveFolderMatch[1].trim();
      await moveActiveNoteToFolder(noteId, folderName);
      window.dispatchEvent(new CustomEvent("aether-update-note-meta", { detail: { category: folderName } }));
      await queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetNoteQueryKey(noteId) });
      const ack =
        companion === "aria"
          ? `All set! I moved this note into your "${folderName}" folder.`
          : `Done—I filed this note inside your "${folderName}" folder.`;
      await appendConversationPair(conversationId, msg, ack);
      await queryClient.invalidateQueries({ queryKey: getGetAetherConversationQueryKey(conversationId) });
      if (voiceReplyOn) void speakAetherNotebookReply(ack, companion);
      return;
    }

    // Explicit Action C: Organize All Notes Into Folders Upon Request ("Organize my notes")
    if (ORGANIZE_ALL_NOTES_RE.test(msg) && conversationId) {
      const org = await organizeAllNotesUponRequest();
      await queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetNoteQueryKey(noteId) });
      const ack =
        org.movedCount > 0
          ? `I organized ${org.movedCount} note${org.movedCount === 1 ? "" : "s"} into clean folders for you:\n\n${org.summaryLines.join("\n")}`
          : `Your notes are already neatly sorted into folders:\n\n${org.summaryLines.join("\n")}`;
      await appendConversationPair(conversationId, msg, ack);
      await queryClient.invalidateQueries({ queryKey: getGetAetherConversationQueryKey(conversationId) });
      if (voiceReplyOn) {
        void speakAetherNotebookReply(
          org.movedCount > 0
            ? `All done! I organized ${org.movedCount} of your notes into clean folders in your sidebar.`
            : "Your notes are already neatly organized in your folders!",
          companion
        );
      }
      return;
    }

    const wantsCenter = /\bcenter(?:ed)?\b/i.test(msg);
    const wantsRight = /\bright[- ]align|\bright column\b/i.test(msg);
    const explicitAlign: NoteTextAlign | undefined = wantsCenter
      ? "center"
      : wantsRight
        ? "right"
        : undefined;

    // Case 1: User says "Hey, can you type on the stationery the poem we drafted together?"
    const latestDraft = getLatestAssistantDraft();
    const isTransferOfExistingDraft =
      WRITE_PREVIOUS_DRAFT_TO_STATIONERY_RE.test(msg) &&
      !!latestDraft &&
      !/\b(change|rewrite|add a|make it|about|longer|shorter|new poem|new letter)\b/i.test(msg);

    if (isTransferOfExistingDraft && latestDraft && conversationId) {
      const ack =
        companion === "aria"
          ? "Certainly! Typing our draft right onto your stationery now."
          : "Certainly. Typing our draft directly onto your stationery now.";
      await appendConversationPair(conversationId, msg, ack);
      await queryClient.invalidateQueries({
        queryKey: getGetAetherConversationQueryKey(conversationId),
      });
      if (voiceReplyOn) {
        void speakAetherNotebookReply(ack, companion);
      }
      dispatchTypeOntoStationery(latestDraft, "replace", explicitAlign);
      return;
    }

    // Case 2: User explicitly asks to rewrite their note OR write directly onto the stationery
    const shouldAutoTypeResultToStationery =
      WRITE_PREVIOUS_DRAFT_TO_STATIONERY_RE.test(msg) || REWRITE_ACTIVE_NOTE_ON_PAGE_RE.test(msg);
    const promptForModel = shouldAutoTypeResultToStationery
      ? `${msg}\n\n(Output ONLY the clean finished piece—with optional 'Title: ...' on line 1—ready to be typed directly onto the user's stationery with zero extra commentary.)`
      : msg;

    const reply = await sendMessage(promptForModel);
    if (shouldAutoTypeResultToStationery && reply) {
      dispatchTypeOntoStationery(reply, "replace", explicitAlign);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleMicToggle = () => {
    stopAetherVoicePlayback();
    if (!isPro && aiTriesLeft <= 0) {
      setProGateOpen(true);
      return;
    }
    pausedMicForSpeechRef.current = false;
    if (isListening) stopListening();
    else startListening();
  };

  const companionName = companion === "aria" ? "Aria" : "Aether";
  const latestDraft = getLatestAssistantDraft();

  return (
    <div className="fixed inset-y-0 right-0 z-40 md:relative md:z-auto flex flex-col h-full border-l border-sidebar-border bg-sidebar text-sidebar-foreground w-80 sm:w-96 shrink-0 no-print shadow-xl md:shadow-none">
      {/* Clean Header: Studio Title + Stop/Mute + Close */}
      <div className="h-12 border-b border-sidebar-border flex items-center justify-between px-3 gap-1.5">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <span className="text-primary font-bold text-base">
            {companion === "aria" ? "🌸" : "✦"}
          </span>
          <span>{companion === "aria" ? uiCopy.ui.studioAria : uiCopy.ui.studioAether}</span>
        </div>

        <div className="flex items-center gap-1">
          {isSpeaking && (
            <Button
              variant="destructive"
              size="sm"
              onClick={stopAetherVoicePlayback}
              title="Stop"
              className="h-7 px-2 text-[11px] gap-1"
              data-testid="button-stop-voice"
            >
              <Square className="h-3 w-3 fill-current" /> Stop
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const next = !voiceReplyOn;
              setVoiceReplyOn(next);
              if (!next) stopAetherVoicePlayback();
            }}
            title={voiceReplyOn ? "Voice ON" : "Voice OFF"}
            className="h-8 w-8 hover:bg-sidebar-accent"
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
            title={uiCopy.closeLabel}
            className="h-8 w-8 hover:bg-sidebar-accent"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dedicated Personality & Voice Toggle Bar (Aether vs. Aria ONLY — zero clutter!) */}
      <div className="px-3 py-2 border-b border-sidebar-border bg-sidebar">
        <div className="grid grid-cols-2 gap-1 bg-background/70 p-1 rounded-xl border border-sidebar-border shadow-2xs">
          <button
            type="button"
            onClick={() => handleCompanionSwitch("aether")}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              companion === "aether"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="companion-aether"
          >
            <span>✦</span> {uiCopy.ui.voiceAether}
          </button>
          <button
            type="button"
            onClick={() => handleCompanionSwitch("aria")}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              companion === "aria"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="companion-aria"
          >
            <span>🌸</span> {uiCopy.ui.voiceAria}
          </button>
        </div>
      </div>

      {/* Work Pane Conversation Area */}
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
                  {companionName} — {uiCopy.ui.partnerTag}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {uiCopy.ui.studioHint}
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
                    <span className="text-xs font-bold text-primary">
                      {companion === "aria" ? "🌸" : "✦"}
                    </span>
                  </div>
                )}
                <div className="max-w-[86%] space-y-1.5">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-background/85 border border-sidebar-border text-foreground rounded-tl-sm shadow-2xs"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-1">
                      <button
                        type="button"
                        onClick={() => dispatchTypeOntoStationery(msg.content, "replace")}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        <Feather className="h-3 w-3" /> {uiCopy.ui.typeOntoStationery}
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatchTypeOntoStationery(msg.content, "append")}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary"
                      >
                        <PlusCircle className="h-3 w-3" /> {uiCopy.ui.insertAtCursor}
                      </button>
                      <button
                        type="button"
                        onClick={() => void speakAetherNotebookReply(msg.content, companion)}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <Volume2 className="h-3 w-3" /> {uiCopy.ui.readAloud}
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
                  <span className="text-xs font-bold text-primary">
                    {companion === "aria" ? "🌸" : "✦"}
                  </span>
                </div>
                <div className="max-w-[86%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-background/85 border border-sidebar-border text-foreground shadow-2xs">
                  {streamingContent}
                  <span className="inline-block w-1 h-4 bg-primary ml-0.5 animate-pulse" />
                </div>
              </div>
            )}
            {isStreaming && !streamingContent && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {companion === "aria" ? "🌸" : "✦"}
                  </span>
                </div>
                <div className="bg-background/85 border border-sidebar-border rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input & Half-Duplex Voice Mic — ONLY the mic symbol turns bright red when active! */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar space-y-2">
        {!isPro && (
          <button
            type="button"
            onClick={() => setProGateOpen(true)}
            className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
              outOfFreeAi
                ? "bg-red-500/10 border-red-500/35 text-red-800 hover:bg-red-500/15"
                : "bg-amber-500/12 border-amber-700/25 text-amber-950 hover:bg-amber-500/20"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {outOfFreeAi ? (
                <>
                  <Ban className="h-3.5 w-3.5 text-red-600 stroke-[2.5]" />
                  <span>Free AI tries used ({freeAiLimit}/{freeAiLimit})</span>
                </>
              ) : (
                <>
                  <span className="text-primary font-bold">✦</span>
                  <span>
                    {aiTriesLeft} of {freeAiLimit} free AI {aiTriesLeft === 1 ? "try" : "tries"} left
                  </span>
                </>
              )}
            </span>
            <span className="font-bold underline underline-offset-2">
              50% Off Year ({yearlyPrice})
            </span>
          </button>
        )}
        <div className="flex gap-1.5 items-end">
          {isSupported && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleMicToggle}
              title={isListening ? t.listening : t.dictate}
              className={`shrink-0 h-10 w-10 bg-background/85 hover:bg-sidebar-accent transition-colors ${
                isListening ? "border-red-500/60 ring-1 ring-red-500/30" : "border-sidebar-border"
              }`}
              data-testid="button-ai-mic"
            >
              <Mic
                className={`h-4 w-4 transition-colors ${
                  isListening ? "text-red-600 animate-pulse stroke-[2.5]" : "text-foreground"
                }`}
              />
            </Button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? `${t.listening} (${companionName})`
                : uiCopy.ui.talkPlaceholder.replace("{name}", companionName)
            }
            disabled={isStreaming || !conversationId}
            rows={1}
            className="flex-1 resize-none bg-background/85 border border-sidebar-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
            data-testid="input-ai-prompt"
          />
          {outOfFreeAi ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setProGateOpen(true)}
              title={`Free AI tries used — Get whole year half price (${yearlyPrice})`}
              className="shrink-0 rounded-xl h-10 w-10 border-2 border-red-500/85 bg-red-50 hover:bg-red-100 cursor-not-allowed shadow-xs"
              data-testid="button-send-ai"
            >
              <Ban className="h-5 w-5 text-red-600 stroke-[2.5]" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={() => void handleSend()}
              disabled={!input.trim() || isStreaming || !conversationId}
              className="shrink-0 rounded-xl h-10 w-10"
              data-testid="button-send-ai"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ProGateModal
        open={proGateOpen}
        onOpenChange={setProGateOpen}
        featureName="Unlimited Aria & Aether AI Studio"
      />
    </div>
  );
}
