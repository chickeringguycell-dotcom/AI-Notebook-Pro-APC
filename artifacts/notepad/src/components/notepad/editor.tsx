import { useState, useEffect, useRef, useCallback } from "react";
import { useLang } from "@/contexts/language-context";
import { useGetNote, useUpdateNote, useListNotes, useDeleteNote, useScanImageText, usePolishText, getGetNoteQueryKey, getListNotesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Mic, Printer, CheckCircle2, Hash, Menu, Lock, Share2, Trash2, Copy, Check, ImagePlus, Loader2, ScanLine, List, ListOrdered, ListChecks, AlignLeft, AlignCenter, AlignRight, Undo2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useProStatus } from "@/hooks/use-pro-status";
import { ProGateModal } from "@/components/pro-gate-modal";
import { PaperPicker, InkColorPicker, FontPicker, type PaperTheme, type LineStyle } from "@/components/notepad/paper-picker";
import { RichEditor, type RichEditorHandle, type ImageTarget } from "@/components/notepad/rich-editor";
import { PhotoLightbox } from "@/components/notepad/photo-lightbox";
import { SettingsBugButton } from "@/components/notepad/settings-bug-dialog";
import { uploadPhoto } from "@/lib/upload-photo";
import {
  registerLiveActiveNoteGetter,
  stripHtmlForAiContext,
  type NoteTextAlign,
} from "@/lib/sovereign-aether-runtime";

interface EditorProps {
  noteId: number;
  onToggleAiPanel: () => void;
  isAiPanelOpen: boolean;
  onOpenSidebar: () => void;
  onNoteDeleted?: () => void;
}

export function Editor({ noteId, onToggleAiPanel, isAiPanelOpen, onOpenSidebar, onNoteDeleted }: EditorProps) {
  const queryClient = useQueryClient();
  const { data: note, isLoading } = useGetNote(noteId);
  const { data: allNotes } = useListNotes();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const { t } = useLang();

  const { isPro } = useProStatus();
  const [proGateOpen, setProGateOpen] = useState(false);
  const [proGateFeature, setProGateFeature] = useState("AI assistant");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const customSections = Array.from(
    new Set((allNotes ?? []).map((n) => n.category).filter(Boolean).filter((c) => c !== "General"))
  ).sort() as string[];

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [paperTheme, setPaperTheme] = useState<PaperTheme>("classic");
  const [lineStyle, setLineStyle] = useState<LineStyle>("lined");
  const [inkColor, setInkColor] = useState<string>("");
  const [font, setFont] = useState<string>("");
  const [textAlign, setTextAlign] = useState<NoteTextAlign>("left");
  const [undoAiSnapshot, setUndoAiSnapshot] = useState<{ title: string; content: string; textAlign: NoteTextAlign } | null>(null);
  const [customCat, setCustomCat] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const debouncedTitle = useDebounce(title, 800);
  const debouncedContent = useDebounce(content, 800);
  const debouncedCategory = useDebounce(category, 800);
  const debouncedPaperTheme = useDebounce(paperTheme, 400);
  const debouncedLineStyle = useDebounce(lineStyle, 400);
  const debouncedInkColor = useDebounce(inkColor, 400);
  const debouncedFont = useDebounce(font, 400);
  const debouncedTextAlign = useDebounce(textAlign, 400);

  const initializedForId = useRef<number | null>(null);
  const lastSaved = useRef({ title: "", content: "", category: "", paperTheme: "classic", lineStyle: "lined", inkColor: "", font: "", textAlign: "left" as NoteTextAlign });
  const editorRef = useRef<RichEditorHandle>(null);
  const paperScrollRef = useRef<HTMLDivElement>(null);
  const typewriterTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const mutateFnRef = useRef(updateNote.mutate);
  mutateFnRef.current = updateNote.mutate;
  const scanImage = useScanImageText();
  const polishText = usePolishText();
  const dictationBufferRef = useRef("");
  const dictationStartRef = useRef<number | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);

  const [lightboxTarget, setLightboxTarget] = useState<ImageTarget | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (note && initializedForId.current !== noteId) {
      initializedForId.current = noteId;
      setTitle(note.title);
      setContent(note.content);
      setCategory(note.category ?? "General");
      const theme = ((note as { paperTheme?: string }).paperTheme ?? "classic") as PaperTheme;
      const lstyle = ((note as { lineStyle?: string }).lineStyle ?? "lined") as LineStyle;
      const ink = (note as { inkColor?: string }).inkColor ?? "";
      const fnt = (note as { font?: string }).font ?? "";
      const align = ((note as { textAlign?: NoteTextAlign }).textAlign ?? "left") as NoteTextAlign;
      setPaperTheme(theme);
      setLineStyle(lstyle);
      setInkColor(ink);
      setFont(fnt);
      setTextAlign(align);
      setUndoAiSnapshot(null);
      lastSaved.current = {
        title: note.title,
        content: note.content,
        category: note.category ?? "General",
        paperTheme: theme,
        lineStyle: lstyle,
        inkColor: ink,
        font: fnt,
        textAlign: align,
      };
    }
  }, [note, noteId]);

  useEffect(() => {
    const plainToCleanHtml = (txt: string) => {
      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const blocks = txt.split(/\n\n+/);
      return blocks
        .map((b) => `<p>${esc(b).replace(/\n/g, "<br>")}</p>`)
        .join("");
    };

    const onTypeOntoStationery = (ev: Event) => {
      const custom = ev as CustomEvent<{
        title?: string;
        text?: string;
        mode?: "replace" | "append";
        align?: NoteTextAlign;
      }>;
      const incomingText = custom.detail?.text?.trim();
      if (!incomingText) return;

      if (typewriterTimerRef.current) {
        window.clearInterval(typewriterTimerRef.current);
        typewriterTimerRef.current = null;
      }

      // Save undo snapshot before Aether types onto the stationery
      setUndoAiSnapshot({ title, content, textAlign });

      if (custom.detail?.align) {
        setTextAlign(custom.detail.align);
      }
      if (custom.detail?.title && custom.detail.mode !== "append") {
        setTitle(custom.detail.title);
      }

      paperScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });

      if (custom.detail?.mode === "append") {
        if (editorRef.current) {
          editorRef.current.focus();
          editorRef.current.insertText(`\n${incomingText}\n`);
        } else {
          setContent((prev) => (prev ? `${prev}\n\n${incomingText}` : incomingText));
        }
        toast({ title: "Added to stationery", description: "Inserted cleanly between the lines." });
        return;
      }

      // Smooth live word-by-word typewriter directly onto the stationery!
      const tokens = incomingText.match(/\S+\s*/g) || [incomingText];
      let idx = 0;
      const step = Math.max(1, Math.ceil(tokens.length / 45));

      typewriterTimerRef.current = window.setInterval(() => {
        idx = Math.min(tokens.length, idx + step);
        const partial = tokens.slice(0, idx).join("");
        const html = plainToCleanHtml(partial);
        editorRef.current?.setHtmlContent(html);
        setContent(html);
        if (idx >= tokens.length && typewriterTimerRef.current) {
          window.clearInterval(typewriterTimerRef.current);
          typewriterTimerRef.current = null;
        }
      }, 32);

      toast({
        title: "Writing onto stationery",
        description: "Drafting cleanly between the lines of your page.",
      });
    };

    const onLegacyInsert = (ev: Event) => {
      const custom = ev as CustomEvent<{ text?: string }>;
      const text = custom.detail?.text?.trim();
      if (!text) return;
      editorRef.current?.focus();
      editorRef.current?.insertText(`\n${text}\n`);
    };

    const onUpdateMeta = (ev: Event) => {
      const custom = ev as CustomEvent<{ title?: string; category?: string }>;
      if (typeof custom.detail?.title === "string") {
        setUndoAiSnapshot({ title, content, textAlign });
        setTitle(custom.detail.title);
      }
      if (typeof custom.detail?.category === "string") {
        setCategory(custom.detail.category);
        setCustomCat("");
      }
    };

    window.addEventListener("aether-type-onto-stationery", onTypeOntoStationery);
    window.addEventListener("aether-insert-into-note", onLegacyInsert);
    window.addEventListener("aether-update-note-meta", onUpdateMeta);
    return () => {
      window.removeEventListener("aether-type-onto-stationery", onTypeOntoStationery);
      window.removeEventListener("aether-insert-into-note", onLegacyInsert);
      window.removeEventListener("aether-update-note-meta", onUpdateMeta);
    };
  }, [title, content, textAlign]);

  useEffect(() => {
    registerLiveActiveNoteGetter(() => ({
      id: noteId,
      title,
      category,
      paperTheme,
      plainText: editorRef.current?.getText()?.trim() || stripHtmlForAiContext(content),
    }));
    return () => {
      registerLiveActiveNoteGetter(null);
    };
  }, [noteId, title, category, paperTheme, content]);

  const saveNote = useCallback(
    (t: string, c: string, cat: string, theme: string, lstyle: string, ink: string, fnt: string, align: NoteTextAlign) => {
      setIsSaving(true);
      mutateFnRef.current(
        { id: noteId, data: { title: t, content: c, category: cat, paperTheme: theme, lineStyle: lstyle, inkColor: ink, font: fnt, ...( { textAlign: align } as Record<string, unknown> ) } },
        {
          onSuccess: (data) => {
            queryClient.setQueryData(getGetNoteQueryKey(noteId), () => data);
            queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
            setIsSaving(false);
            setShowSaved(true);
            setTimeout(() => setShowSaved(false), 2000);
          },
          onError: () => setIsSaving(false),
        }
      );
    },
    [noteId, queryClient]
  );

  useEffect(() => {
    if (initializedForId.current !== noteId) return;
    if (
      debouncedTitle !== title ||
      debouncedContent !== content ||
      debouncedCategory !== category ||
      debouncedPaperTheme !== paperTheme ||
      debouncedLineStyle !== lineStyle ||
      debouncedInkColor !== inkColor ||
      debouncedFont !== font ||
      debouncedTextAlign !== textAlign
    ) {
      return;
    }
    if (
      debouncedTitle !== lastSaved.current.title ||
      debouncedContent !== lastSaved.current.content ||
      debouncedCategory !== lastSaved.current.category ||
      debouncedPaperTheme !== lastSaved.current.paperTheme ||
      debouncedLineStyle !== lastSaved.current.lineStyle ||
      debouncedInkColor !== lastSaved.current.inkColor ||
      debouncedFont !== lastSaved.current.font ||
      debouncedTextAlign !== lastSaved.current.textAlign
    ) {
      saveNote(debouncedTitle, debouncedContent, debouncedCategory, debouncedPaperTheme, debouncedLineStyle, debouncedInkColor, debouncedFont, debouncedTextAlign);
      lastSaved.current = {
        title: debouncedTitle,
        content: debouncedContent,
        category: debouncedCategory,
        paperTheme: debouncedPaperTheme,
        lineStyle: debouncedLineStyle,
        inkColor: debouncedInkColor,
        font: debouncedFont,
        textAlign: debouncedTextAlign,
      };
    }
  }, [debouncedTitle, debouncedContent, debouncedCategory, debouncedPaperTheme, debouncedLineStyle, debouncedInkColor, debouncedFont, debouncedTextAlign, title, content, category, paperTheme, lineStyle, inkColor, font, textAlign, noteId, saveNote]);

  const handleSpeechResult = useCallback((text: string) => {
    const chunk = text + " ";
    if (editorRef.current && dictationStartRef.current === null) {
      dictationStartRef.current = editorRef.current.getSearchTextLength();
    }
    dictationBufferRef.current += chunk;
    if (editorRef.current) {
      editorRef.current.insertText(chunk);
    } else {
      setContent((prev) => {
        const space = prev.endsWith(" ") || prev.length === 0 ? "" : " ";
        return prev + space + text;
      });
    }
  }, []);

  const handleSpeechEnd = useCallback(async () => {
    const raw = dictationBufferRef.current.trim();
    const startPos = dictationStartRef.current ?? 0;
    dictationBufferRef.current = "";
    dictationStartRef.current = null;
    if (!raw || !isPro) return;
    setIsPolishing(true);
    try {
      const fullText = editorRef.current?.getText() ?? "";
      const ctxStart = Math.max(0, startPos - 400);
      const context = startPos > 0 ? fullText.slice(ctxStart, startPos).trim() : "";
      const result = await polishText.mutateAsync({
        data: { text: raw, ...(context ? { context } : {}) },
      });
      const cleaned = (result?.text ?? "").trim();
      if (cleaned && cleaned !== raw && editorRef.current) {
        editorRef.current.replaceLastText(raw, cleaned + " ", startPos);
      }
    } catch {
      // silent: keep raw dictation if polish fails
    } finally {
      setIsPolishing(false);
    }
  }, [isPro, polishText]);

  const handlePhotoButtonClick = () => {
    if (!isPro) {
      setProGateFeature("Inline photos");
      setProGateOpen(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please pick an image file.");
      setTimeout(() => setUploadError(null), 3000);
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setUploadError("Photo too large (max 12MB).");
      setTimeout(() => setUploadError(null), 3000);
      return;
    }
    setIsUploadingPhoto(true);
    setUploadError(null);
    try {
      editorRef.current?.focus();
      const { url } = await uploadPhoto(file);
      editorRef.current?.insertImage(url);
    } catch (err) {
      setUploadError("Couldn't upload photo. Try again.");
      setTimeout(() => setUploadError(null), 3000);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleScanButtonClick = () => {
    if (!isPro) {
      setProGateFeature("Scan to text");
      setProGateOpen(true);
      return;
    }
    scanInputRef.current?.click();
  };

  const handleScanFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isPro) {
      setProGateFeature("Scan to text");
      setProGateOpen(true);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setUploadError("Please pick an image file.");
      setTimeout(() => setUploadError(null), 3000);
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setUploadError("Image too large (max 12MB).");
      setTimeout(() => setUploadError(null), 3000);
      return;
    }
    setIsScanning(true);
    setUploadError(null);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error("read failed"));
        reader.readAsDataURL(file);
      });
      const commaIdx = dataUrl.indexOf(",");
      const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
      const result = await scanImage.mutateAsync({
        data: { image: base64, contentType: file.type },
      });
      const text = (result?.text ?? "").trim();
      if (!text) {
        setUploadError("No text found in that image.");
        setTimeout(() => setUploadError(null), 3000);
        return;
      }
      editorRef.current?.focus();
      editorRef.current?.insertText(text + " ");
    } catch (err) {
      setUploadError("Couldn't read that image. Try again.");
      setTimeout(() => setUploadError(null), 3000);
    } finally {
      setIsScanning(false);
    }
  };

  const { isListening, isSupported, toggleListening } = useSpeechRecognition({
    onResult: handleSpeechResult,
    onEnd: handleSpeechEnd,
  });

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    setCustomCat("");
  };

  const handleDelete = () => {
    deleteNote.mutate({ id: noteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        onNoteDeleted?.();
      },
    });
  };

  const getPlainContent = () => {
    const fromEditor = editorRef.current?.getText();
    if (fromEditor && fromEditor.trim().length > 0) return fromEditor;
    // Fallback: strip HTML tags from the raw content so we never copy markup.
    const div = document.createElement("div");
    div.innerHTML = content;
    return div.textContent ?? "";
  };

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Fallback for browsers/webviews where the async clipboard fails:
      // select the full text in an off-screen textarea and copy it.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch (_) {
        return false;
      }
    }
  };

  const handleCopyAll = async () => {
    const text = `${title}\n\n${getPlainContent()}`;
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({ title: "Copy failed", description: "Your browser blocked the copy. Try again, or use Share instead.", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    const shareText = `${title}\n\n${getPlainContent()}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "My AI Notebook", text: shareText });
      } catch (_) {}
    } else {
      const mailto = `mailto:?subject=${encodeURIComponent(title || "My AI Notebook")}&body=${encodeURIComponent(shareText)}`;
      window.open(mailto, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 animate-pulse">
        <div className="h-10 bg-muted w-1/2 mb-8 rounded-lg" />
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        {t.noteNotFound}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="h-12 border-b flex items-center px-3 gap-2 bg-background/95 backdrop-blur-sm shrink-0 no-print">
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile: open sidebar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSidebar}
            className="h-8 w-8 md:hidden"
            title="Open Notes"
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* Section badge */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                data-testid="category-badge"
              >
                <Hash className="h-3 w-3" />
                {category}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-3" align="start">
              <p className="text-xs font-medium text-muted-foreground mb-2">Move to section</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  onClick={() => handleCategorySelect("General")}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    category === "General" && !customCat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                  }`}
                >General</button>
                {isPro && customSections.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategorySelect(cat)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      category === cat && !customCat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                    }`}
                  >{cat}</button>
                ))}
              </div>
              {isPro ? (
                <Input
                  placeholder="New custom section..."
                  value={customCat}
                  onChange={(e) => {
                    setCustomCat(e.target.value);
                    if (e.target.value) setCategory(e.target.value);
                  }}
                  className="text-xs h-7"
                />
              ) : (
                <button onClick={() => { setProGateFeature("Custom tabs"); setProGateOpen(true); }} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded border border-dashed border-primary/30 text-xs text-muted-foreground hover:text-primary">
                  <Lock className="h-3 w-3 text-primary/60" /> Custom section... <span className="ml-auto text-[9px] bg-primary/15 text-primary px-1 rounded font-bold">PRO</span>
                </button>
              )}
            </PopoverContent>
          </Popover>

          {!isAiPanelOpen && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {isSaving ? t.saving : showSaved ? (
                <span className="flex items-center gap-1 text-primary">
                  <CheckCircle2 className="h-3 w-3" /> {t.saved}
                </span>
              ) : t.autoSaved}
            </span>
          )}
        </div>

        <div
          className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden toolbar-scroll"
          data-ai-open={isAiPanelOpen ? "true" : undefined}
        >
          <div className={`flex items-center ${isAiPanelOpen ? "gap-0.5" : "gap-1"} w-max mr-auto pl-2 pr-1`}>
          {isSupported && (
            <Button
              variant={isListening ? "destructive" : "ghost"}
              size="sm"
              onClick={() => {
                if (!isPro) { setProGateFeature("Voice dictation"); setProGateOpen(true); return; }
                toggleListening();
              }}
              className={`text-xs h-8 ${isAiPanelOpen ? "px-1.5" : "px-2"} ${isListening ? "animate-pulse" : ""}`}
              title="Voice Dictation"
              data-testid="button-dictate"
            >
              <Mic className="h-3.5 w-3.5" />
              <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline ml-1"}>{isListening ? t.listening : t.dictate}</span>
            </Button>
          )}
          {isPolishing && (
            <span
              className="inline-flex items-center gap-1 text-xs text-muted-foreground px-1"
              title="Cleaning up dictation with AI"
              data-testid="status-polishing"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {!isAiPanelOpen && <span className="hidden sm:inline">Polishing…</span>}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorRef.current?.toggleBulletList()}
            title="Bullet list"
            className={`h-8 text-xs ${isAiPanelOpen ? "px-1.5" : "gap-1.5"}`}
            data-testid="button-bullet-list"
          >
            <List className="h-3.5 w-3.5" />
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>Bullets</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorRef.current?.toggleOrderedList()}
            title="Numbered list"
            className={`h-8 text-xs ${isAiPanelOpen ? "px-1.5" : "gap-1.5"}`}
            data-testid="button-ordered-list"
          >
            <ListOrdered className="h-3.5 w-3.5" />
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>Numbered</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorRef.current?.toggleTaskList()}
            title="Checklist"
            className={`h-8 text-xs ${isAiPanelOpen ? "px-1.5" : "gap-1.5"}`}
            data-testid="button-task-list"
          >
            <ListChecks className="h-3.5 w-3.5" />
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>Checklist</span>
          </Button>

          {/* Left / Center / Right Text Alignment Group */}
          <div className="inline-flex items-center rounded-md border border-border/70 bg-muted/30 p-0.5 h-8">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setTextAlign("left")}
              title="Align Left (Letters & Notes)"
              className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                textAlign === "left" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-align-left"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setTextAlign("center")}
              title="Align Center (Poems & Tributes)"
              className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                textAlign === "center" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-align-center"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setTextAlign("right")}
              title="Align Right"
              className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                textAlign === "right" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-align-right"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyAll}
            title="Copy all text"
            className={`h-8 text-xs ${isAiPanelOpen ? "px-1.5" : "gap-1.5"}`}
            data-testid="button-copy-all"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>{copied ? "Copied!" : "Copy"}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            title="Share note"
            className={`h-8 text-xs ${isAiPanelOpen ? "px-1.5" : "gap-1.5"}`}
            data-testid="button-share"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>Share</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePhotoButtonClick}
            disabled={isUploadingPhoto}
            title="Insert photo at cursor"
            className={`h-8 text-xs ${isAiPanelOpen ? "px-1.5" : "gap-1.5"}`}
            data-testid="button-insert-photo"
          >
            {isUploadingPhoto ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>Photo</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoFileChange}
            data-testid="input-photo-upload"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleScanButtonClick}
            disabled={isScanning}
            title="Scan text from a photo"
            className={`h-8 text-xs ${isAiPanelOpen ? "px-1.5" : "gap-1.5"}`}
            data-testid="button-scan-text"
          >
            {isScanning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ScanLine className="h-3.5 w-3.5" />
            )}
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>Scan</span>
          </Button>
          <input
            ref={scanInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleScanFileChange}
            data-testid="input-scan-upload"
          />
          <PaperPicker
            theme={paperTheme}
            lineStyle={lineStyle}
            isPro={isPro}
            compact={isAiPanelOpen}
            onThemeChange={setPaperTheme}
            onLineStyleChange={setLineStyle}
            onLockedClick={() => { setProGateFeature("Stationery themes"); setProGateOpen(true); }}
          />
          <InkColorPicker
            inkColor={inkColor}
            isPro={isPro}
            compact={isAiPanelOpen}
            onInkColorChange={setInkColor}
            onLockedClick={() => { setProGateFeature("Ink colors"); setProGateOpen(true); }}
          />
          <FontPicker
            font={font}
            isPro={isPro}
            compact={isAiPanelOpen}
            onFontChange={setFont}
            onLockedClick={() => { setProGateFeature("Fonts"); setProGateOpen(true); }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            title={t.print}
            className={`h-8 text-xs ${isAiPanelOpen ? "px-2" : "gap-1.5"}`}
            data-testid="button-print"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>{t.print}</span>
          </Button>
          <Button
            variant={isAiPanelOpen ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (!isPro) { setProGateFeature("AI writing assistant"); setProGateOpen(true); return; }
              onToggleAiPanel();
            }}
            title="Toggle Sovereign Aether / Aria Studio"
            className={`h-8 ${isAiPanelOpen ? "px-2 gap-1" : "gap-1.5"} text-xs font-bold tracking-wide`}
            data-testid="button-ai-panel"
          >
            <span className="text-sm">✦</span>
            AI
          </Button>
          <SettingsBugButton
            compactIconOnly
            activeContext={`Note #${noteId} | Theme: ${paperTheme} | Align: ${textAlign}`}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete this note"
            className="h-8 px-1.5 text-xs text-muted-foreground hover:text-destructive"
            data-testid="button-delete-note"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          </div>
        </div>

        {/* Pro gate modal */}
        <ProGateModal
          open={proGateOpen}
          onOpenChange={setProGateOpen}
          featureName={proGateFeature}
        />

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDeleteConfirm(false)}>
            <div className="bg-background rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-serif font-semibold text-lg mb-2">Delete this note?</h3>
              <p className="text-sm text-muted-foreground mb-5">
                <span className="font-medium text-foreground">{title || "Untitled"}</span> will be permanently deleted. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={() => { setShowDeleteConfirm(false); handleDelete(); }}>Delete</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Writing area with lined paper */}
      <div
        ref={paperScrollRef}
        className={`flex-1 overflow-auto paper-page print-container paper-theme-${paperTheme}`}
        data-custom-font={font ? "true" : undefined}
        data-text-align={textAlign}
        style={{
          ...(inkColor ? ({ "--paper-ink": inkColor } as Record<string, string>) : {}),
          ...(font ? ({ "--note-font": font, fontFamily: font } as Record<string, string>) : {}),
        }}
      >
        <div className="px-6 md:px-16 py-8">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.noteTitlePlaceholder}
            className={`w-full text-2xl md:text-3xl ${font ? "" : "font-serif"} font-bold bg-transparent border-none outline-none mb-2 text-foreground placeholder:text-muted-foreground/40 focus:ring-0`}
            style={{
              ...(font ? { fontFamily: font } : {}),
              textAlign,
            }}
            data-testid="input-note-title"
          />

          {/* Section + On-Page Alignment & Undo Row */}
          <div className="flex flex-wrap items-center gap-2 mb-2 no-print">
            <span className="text-xs text-muted-foreground font-medium">Section:</span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors border border-primary/20"
                  data-testid="category-badge-paper"
                >
                  <Hash className="h-3 w-3" />
                  {category}
                  <span className="text-primary/50 ml-0.5">▾</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Move Page to Section</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    onClick={() => handleCategorySelect("General")}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      category === "General" && !customCat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                    }`}
                  >General</button>
                  {isPro && customSections.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategorySelect(cat)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        category === cat && !customCat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                      }`}
                    >{cat}</button>
                  ))}
                </div>
                <Input
                  placeholder="New Section (e.g., Recipes, Religion)..."
                  value={customCat}
                  onChange={(e) => {
                    setCustomCat(e.target.value);
                    if (e.target.value) setCategory(e.target.value);
                  }}
                  className="text-xs h-7"
                />
              </PopoverContent>
            </Popover>

            {/* Quick On-Stationery Left / Center / Right Selector */}
            <div className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-background/50 backdrop-blur-2xs border border-border/60 p-0.5">
              {(["left", "center", "right"] as const).map((al) => (
                <button
                  key={al}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setTextAlign(al)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize transition-colors ${
                    textAlign === al
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {al}
                </button>
              ))}
            </div>

            {undoAiSnapshot && (
              <button
                type="button"
                onClick={() => {
                  setTitle(undoAiSnapshot.title);
                  setContent(undoAiSnapshot.content);
                  setTextAlign(undoAiSnapshot.textAlign);
                  editorRef.current?.setHtmlContent(undoAiSnapshot.content);
                  setUndoAiSnapshot(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-background/80 border border-border hover:border-primary text-foreground"
                title="Undo last AI write onto stationery"
              >
                <Undo2 className="h-3 w-3" /> Undo AI
              </button>
            )}
          </div>

          <div className="border-b-2 border-[#7ca8c4] mb-0 w-full" />

          {/* Upload error toast */}
          {uploadError && (
            <div className="mb-2 px-3 py-2 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20 no-print">
              {uploadError}
            </div>
          )}

          {/* Lined writing area — rich editor with inline photos */}
          <RichEditor
            ref={editorRef}
            content={content}
            onChange={setContent}
            placeholder={t.startWriting}
            className={`line-style-${lineStyle} note-lines w-full min-h-[calc(100vh-220px)] bg-transparent text-base md:text-lg ${font ? "" : "font-serif"}`}
            onImageClick={(target) => setLightboxTarget(target)}
          />
        </div>
      </div>

      {/* Tap-to-zoom lightbox with built-in Delete button */}
      <PhotoLightbox
        target={lightboxTarget}
        onClose={() => setLightboxTarget(null)}
        onDelete={(target) => {
          editorRef.current?.deleteImageAt(target.pos);
          setLightboxTarget(null);
        }}
      />
    </div>
  );
}
