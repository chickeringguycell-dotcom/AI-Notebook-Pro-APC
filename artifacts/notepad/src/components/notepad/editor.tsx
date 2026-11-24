import { useState, useEffect, useRef, useCallback } from "react";
import { useLang } from "@/contexts/language-context";
import { getOnboardingCopy } from "@/locales/onboarding-i18n";
import { useGetNote, useUpdateNote, useListNotes, useDeleteNote, useScanImageText, usePolishText, getGetNoteQueryKey, getListNotesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Mic, Printer, CheckCircle2, Hash, Menu, Lock, Share2, Trash2, Copy, Check, ImagePlus, Loader2, Camera, List, ListOrdered, ListChecks, AlignLeft, AlignCenter, AlignRight, Undo2, ArrowUpToLine, ArrowDownToLine, Minus, Plus, Maximize2
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
import { PaperPicker, PageColorPicker, InkColorPicker, FontPicker, isDarkHexColor, type PaperTheme, type LineStyle } from "@/components/notepad/paper-picker";
import { RichEditor, type RichEditorHandle, type ImageTarget } from "@/components/notepad/rich-editor";
import { PhotoLightbox } from "@/components/notepad/photo-lightbox";
import { CameraScanDialog } from "@/components/notepad/camera-scan-dialog";
import { SettingsBugButton } from "@/components/notepad/settings-bug-dialog";
import { uploadPhoto } from "@/lib/upload-photo";
import {
  registerLiveActiveNoteGetter,
  stripHtmlForAiContext,
  type NoteTextAlign,
} from "@/lib/sovereign-aether-runtime";

const FONT_POINT_SIZES = [11, 12, 14, 16, 18, 20, 22, 24, 28, 32] as const;

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
  const { t, lang } = useLang();
  const uiCopy = getOnboardingCopy(lang);

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
  const [pageColor, setPageColor] = useState<string>("");
  const [lineStyle, setLineStyle] = useState<LineStyle>("lined");
  const [inkColor, setInkColor] = useState<string>("");
  const [font, setFont] = useState<string>("");
  const [fontSizePt, setFontSizePt] = useState<number>(14);
  const [textOnPhoto, setTextOnPhoto] = useState<boolean>(false);
  const [photoOpacity, setPhotoOpacity] = useState<number>(100);
  const [photoOverlayContrast, setPhotoOverlayContrast] = useState<"light" | "dark">("light");
  const [textAlign, setTextAlign] = useState<NoteTextAlign>("left");
  const [undoAiSnapshot, setUndoAiSnapshot] = useState<{ title: string; content: string; textAlign: NoteTextAlign } | null>(null);
  const [customCat, setCustomCat] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const debouncedTitle = useDebounce(title, 800);
  const debouncedContent = useDebounce(content, 800);
  const debouncedCategory = useDebounce(category, 800);
  const debouncedPaperTheme = useDebounce(paperTheme, 400);
  const debouncedPageColor = useDebounce(pageColor, 300);
  const debouncedLineStyle = useDebounce(lineStyle, 400);
  const debouncedInkColor = useDebounce(inkColor, 400);
  const debouncedFont = useDebounce(font, 400);
  const debouncedFontSizePt = useDebounce(fontSizePt, 400);
  const debouncedTextOnPhoto = useDebounce(textOnPhoto, 300);
  const debouncedPhotoOpacity = useDebounce(photoOpacity, 250);
  const debouncedPhotoOverlayContrast = useDebounce(photoOverlayContrast, 300);
  const debouncedTextAlign = useDebounce(textAlign, 400);

  const initializedForId = useRef<number | null>(null);
  const lastSaved = useRef({
    title: "",
    content: "",
    category: "",
    paperTheme: "classic",
    pageColor: "",
    lineStyle: "lined",
    inkColor: "",
    font: "",
    fontSizePt: 14,
    textOnPhoto: false,
    photoOpacity: 100,
    photoOverlayContrast: "light" as "light" | "dark",
    textAlign: "left" as NoteTextAlign,
  });
  const editorRef = useRef<RichEditorHandle>(null);
  const paperScrollRef = useRef<HTMLDivElement>(null);
  const heroImgRef = useRef<HTMLImageElement>(null);
  const photoFrameRef = useRef<HTMLDivElement>(null);
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
  const [cameraScanOpen, setCameraScanOpen] = useState(false);

  useEffect(() => {
    if (note && initializedForId.current !== noteId) {
      initializedForId.current = noteId;
      setTitle(note.title);
      setContent(note.content);
      setCategory(note.category ?? "General");
      const theme = ((note as { paperTheme?: string }).paperTheme ?? "classic") as PaperTheme;
      const pgColor = (note as { pageColor?: string }).pageColor ?? "";
      const lstyle = ((note as { lineStyle?: string }).lineStyle ?? "lined") as LineStyle;
      const ink = (note as { inkColor?: string }).inkColor ?? "";
      const fnt = (note as { font?: string }).font ?? "";
      const fsize = typeof (note as { fontSizePt?: number }).fontSizePt === "number" ? (note as { fontSizePt: number }).fontSizePt : 14;
      const onPhoto = Boolean((note as { textOnPhoto?: boolean }).textOnPhoto ?? false);
      const pOpacity = typeof (note as { photoOpacity?: number }).photoOpacity === "number" ? (note as { photoOpacity: number }).photoOpacity : (onPhoto ? 50 : 100);
      const pContrast = (note as { photoOverlayContrast?: "light" | "dark" }).photoOverlayContrast === "dark" ? "dark" : "light";
      const align = ((note as { textAlign?: NoteTextAlign }).textAlign ?? "left") as NoteTextAlign;
      setPaperTheme(theme);
      setPageColor(pgColor);
      setLineStyle(lstyle);
      setInkColor(ink);
      setFont(fnt);
      setFontSizePt(fsize);
      setTextOnPhoto(onPhoto);
      setPhotoOpacity(pOpacity);
      setPhotoOverlayContrast(pContrast);
      setTextAlign(align);
      setUndoAiSnapshot(null);
      lastSaved.current = {
        title: note.title,
        content: note.content,
        category: note.category ?? "General",
        paperTheme: theme,
        pageColor: pgColor,
        lineStyle: lstyle,
        inkColor: ink,
        font: fnt,
        fontSizePt: fsize,
        textOnPhoto: onPhoto,
        photoOpacity: pOpacity,
        photoOverlayContrast: pContrast,
        textAlign: align,
      };
    }
  }, [note, noteId]);

  useEffect(() => {
    const plainToCleanHtml = (txt: string, preservedImgsHtml = "") => {
      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const blocks = txt.split(/\n\n+/);
      const bodyHtml = blocks
        .map((b) => `<p>${esc(b).replace(/\n/g, "<br>")}</p>`)
        .join("");
      return preservedImgsHtml ? `${preservedImgsHtml}${bodyHtml}` : bodyHtml;
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

      // Preserve any existing inline photos in the note when writing onto stationery!
      const existingImgs = (content.match(/<img\b[^>]*>/gi) || []).join("");

      // Smooth live word-by-word typewriter directly onto the stationery!
      const tokens = incomingText.match(/\S+\s*/g) || [incomingText];
      let idx = 0;
      const step = Math.max(1, Math.ceil(tokens.length / 45));

      typewriterTimerRef.current = window.setInterval(() => {
        idx = Math.min(tokens.length, idx + step);
        const partial = tokens.slice(0, idx).join("");
        const html = plainToCleanHtml(partial, existingImgs);
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
    (
      tVal: string,
      cVal: string,
      catVal: string,
      themeVal: string,
      pgColorVal: string,
      lstyleVal: string,
      inkVal: string,
      fntVal: string,
      fsizeVal: number,
      onPhotoVal: boolean,
      pOpacityVal: number,
      pContrastVal: "light" | "dark",
      alignVal: NoteTextAlign
    ) => {
      setIsSaving(true);
      mutateFnRef.current(
        {
          id: noteId,
          data: {
            title: tVal,
            content: cVal,
            category: catVal,
            paperTheme: themeVal,
            lineStyle: lstyleVal,
            inkColor: inkVal,
            font: fntVal,
            ...({
              pageColor: pgColorVal,
              fontSizePt: fsizeVal,
              textOnPhoto: onPhotoVal,
              photoOpacity: pOpacityVal,
              photoOverlayContrast: pContrastVal,
              textAlign: alignVal,
            } as Record<string, unknown>),
          },
        },
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
      debouncedPageColor !== pageColor ||
      debouncedLineStyle !== lineStyle ||
      debouncedInkColor !== inkColor ||
      debouncedFont !== font ||
      debouncedFontSizePt !== fontSizePt ||
      debouncedTextOnPhoto !== textOnPhoto ||
      debouncedPhotoOpacity !== photoOpacity ||
      debouncedPhotoOverlayContrast !== photoOverlayContrast ||
      debouncedTextAlign !== textAlign
    ) {
      return;
    }
    if (
      debouncedTitle !== lastSaved.current.title ||
      debouncedContent !== lastSaved.current.content ||
      debouncedCategory !== lastSaved.current.category ||
      debouncedPaperTheme !== lastSaved.current.paperTheme ||
      debouncedPageColor !== lastSaved.current.pageColor ||
      debouncedLineStyle !== lastSaved.current.lineStyle ||
      debouncedInkColor !== lastSaved.current.inkColor ||
      debouncedFont !== lastSaved.current.font ||
      debouncedFontSizePt !== lastSaved.current.fontSizePt ||
      debouncedTextOnPhoto !== lastSaved.current.textOnPhoto ||
      debouncedPhotoOpacity !== lastSaved.current.photoOpacity ||
      debouncedPhotoOverlayContrast !== lastSaved.current.photoOverlayContrast ||
      debouncedTextAlign !== lastSaved.current.textAlign
    ) {
      saveNote(
        debouncedTitle,
        debouncedContent,
        debouncedCategory,
        debouncedPaperTheme,
        debouncedPageColor,
        debouncedLineStyle,
        debouncedInkColor,
        debouncedFont,
        debouncedFontSizePt,
        debouncedTextOnPhoto,
        debouncedPhotoOpacity,
        debouncedPhotoOverlayContrast,
        debouncedTextAlign
      );
      lastSaved.current = {
        title: debouncedTitle,
        content: debouncedContent,
        category: debouncedCategory,
        paperTheme: debouncedPaperTheme,
        pageColor: debouncedPageColor,
        lineStyle: debouncedLineStyle,
        inkColor: debouncedInkColor,
        font: debouncedFont,
        fontSizePt: debouncedFontSizePt,
        textOnPhoto: debouncedTextOnPhoto,
        photoOpacity: debouncedPhotoOpacity,
        photoOverlayContrast: debouncedPhotoOverlayContrast,
        textAlign: debouncedTextAlign,
      };
    }
  }, [
    debouncedTitle,
    debouncedContent,
    debouncedCategory,
    debouncedPaperTheme,
    debouncedPageColor,
    debouncedLineStyle,
    debouncedInkColor,
    debouncedFont,
    debouncedFontSizePt,
    debouncedTextOnPhoto,
    debouncedPhotoOpacity,
    debouncedPhotoOverlayContrast,
    debouncedTextAlign,
    title,
    content,
    category,
    paperTheme,
    pageColor,
    lineStyle,
    inkColor,
    font,
    fontSizePt,
    textOnPhoto,
    photoOpacity,
    photoOverlayContrast,
    textAlign,
    noteId,
    saveNote,
  ]);

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

  const stepFontSize = (dir: -1 | 1) => {
    setFontSizePt((cur) => {
      const next = Math.max(10, Math.min(42, cur + dir * 2));
      return next;
    });
  };

  const handleFitTextToPage = () => {
    const plain = (editorRef.current?.getText() || stripHtmlForAiContext(content)).trim();
    if (!plain) {
      toast({
        title: "Write or add text first",
        description: "Add a poem or note on the page, then tap Fit Text to Page.",
      });
      return;
    }

    const isPhotoMode = Boolean(content.match(/<img\b[^>]*src=/i)) && textOnPhoto;

    let availWidth = 620;
    let targetHeight = 520;

    if (isPhotoMode && photoFrameRef.current) {
      const frameRect = photoFrameRef.current.getBoundingClientRect();
      const padX = window.innerWidth >= 768 ? 96 : 48;
      const padY = window.innerWidth >= 768 ? 84 : 48;
      availWidth = Math.max(220, frameRect.width - padX);
      const imgEl = heroImgRef.current;
      if (imgEl && imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
        const naturalRenderedHeight = frameRect.width * (imgEl.naturalHeight / imgEl.naturalWidth);
        targetHeight = Math.max(200, naturalRenderedHeight - padY);
      } else {
        targetHeight = Math.max(220, frameRect.height - padY);
      }
    } else if (paperScrollRef.current) {
      const scrollRect = paperScrollRef.current.getBoundingClientRect();
      const padX = window.innerWidth >= 768 ? 128 : 48;
      availWidth = Math.max(240, scrollRect.width - padX);
      targetHeight = Math.max(240, scrollRect.height - 185);
    }

    // Create an invisible offscreen measurement box matching the exact font & width
    const probe = document.createElement("div");
    probe.style.position = "fixed";
    probe.style.left = "-9999px";
    probe.style.top = "0";
    probe.style.width = `${availWidth}px`;
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.whiteSpace = "pre-wrap";
    probe.style.wordBreak = "break-word";
    probe.style.fontFamily = font || "Georgia, serif";
    probe.style.textAlign = textAlign;
    probe.textContent = plain;
    document.body.appendChild(probe);

    let bestPt = 11;
    const maxPt = isPhotoMode ? 40 : 34;
    for (let pt = maxPt; pt >= 10; pt -= 1) {
      probe.style.fontSize = `${pt}pt`;
      probe.style.lineHeight = isPhotoMode ? "1.55" : pt >= 22 ? "64px" : "32px";
      if (probe.scrollHeight <= targetHeight) {
        bestPt = pt;
        break;
      }
    }

    document.body.removeChild(probe);
    setFontSizePt(bestPt);
    toast({
      title: `Fitted to ${isPhotoMode ? "photo" : "page"} (${bestPt}pt)`,
      description: "Scaled text to fill the space cleanly from top to bottom.",
    });
  };

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

  const runScanOnDataUrl = async (dataUrl: string, mimeType: string) => {
    setIsScanning(true);
    setUploadError(null);
    try {
      const commaIdx = dataUrl.indexOf(",");
      const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
      const result = await scanImage.mutateAsync({
        data: { image: base64, contentType: mimeType || "image/jpeg" },
      });
      const text = (result?.text ?? "").trim();
      if (!text) {
        setUploadError("No text found in that image. Try holding the page steady in bright light.");
        setTimeout(() => setUploadError(null), 4000);
        return;
      }
      setCameraScanOpen(false);
      editorRef.current?.focus();
      editorRef.current?.insertText(text + " ");
      toast({
        title: "Scanned onto page",
        description: "Words extracted from photo and added to your note.",
      });
    } catch {
      setUploadError("Couldn't read that image. Try again.");
      setTimeout(() => setUploadError(null), 3000);
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanButtonClick = () => {
    if (!isPro) {
      setProGateFeature("Scan to text");
      setProGateOpen(true);
      return;
    }
    // Open the real live camera viewfinder first!
    setCameraScanOpen(true);
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
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error("read failed"));
      reader.readAsDataURL(file);
    });
    await runScanOnDataUrl(dataUrl, file.type);
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

  const firstPhotoMatch = content.match(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/i);
  const firstPhotoSrc = firstPhotoMatch?.[1] ?? "";
  const hasPhoto = Boolean(firstPhotoSrc);
  const activeOnPhoto = hasPhoto && textOnPhoto;
  const lineStepPx = fontSizePt >= 22 ? 64 : 32;

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
                {category === "General" ? uiCopy.ui.generalSection : category}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-3" align="start">
              <p className="text-xs font-medium text-muted-foreground mb-2">{t.moveToSection}</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  onClick={() => handleCategorySelect("General")}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    category === "General" && !customCat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                  }`}
                >{uiCopy.ui.generalSection}</button>
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
                  placeholder={t.customSectionPlaceholder}
                  value={customCat}
                  onChange={(e) => {
                    setCustomCat(e.target.value);
                    if (e.target.value) setCategory(e.target.value);
                  }}
                  className="text-xs h-7"
                />
              ) : (
                <button onClick={() => { setProGateFeature("Custom tabs"); setProGateOpen(true); }} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded border border-dashed border-primary/30 text-xs text-muted-foreground hover:text-primary">
                  <Lock className="h-3 w-3 text-primary/60" /> {uiCopy.newSection}... <span className="ml-auto text-[9px] bg-primary/15 text-primary px-1 rounded font-bold">PRO</span>
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
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!isPro) { setProGateFeature("Voice dictation"); setProGateOpen(true); return; }
                toggleListening();
              }}
              className={`text-xs h-8 ${isAiPanelOpen ? "px-1.5" : "px-2"} ${
                isListening ? "ring-1 ring-red-500/40 bg-red-500/5" : ""
              }`}
              title={t.dictate}
              data-testid="button-dictate"
            >
              <Mic
                className={`h-3.5 w-3.5 transition-colors ${
                  isListening ? "text-red-600 animate-pulse stroke-[2.5]" : ""
                }`}
              />
              <span className={`${isAiPanelOpen ? "hidden" : "hidden sm:inline ml-1"} ${isListening ? "text-red-600 font-semibold" : ""}`}>
                {isListening ? t.listening : t.dictate}
              </span>
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
            title={uiCopy.ui.bullets}
            className={`h-8 text-xs ${isAiPanelOpen ? "px-1.5" : "gap-1.5"}`}
            data-testid="button-bullet-list"
          >
            <List className="h-3.5 w-3.5" />
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>{uiCopy.ui.bullets}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorRef.current?.toggleOrderedList()}
            title={uiCopy.ui.numbered}
            className={`h-8 text-xs ${isAiPanelOpen ? "px-1.5" : "gap-1.5"}`}
            data-testid="button-ordered-list"
          >
            <ListOrdered className="h-3.5 w-3.5" />
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>{uiCopy.ui.numbered}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorRef.current?.toggleTaskList()}
            title={uiCopy.ui.checklist}
            className={`h-8 text-xs ${isAiPanelOpen ? "px-1.5" : "gap-1.5"}`}
            data-testid="button-task-list"
          >
            <ListChecks className="h-3.5 w-3.5" />
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>{uiCopy.ui.checklist}</span>
          </Button>

          {/* Left / Center / Right Text Alignment Group */}
          <div className="inline-flex items-center rounded-md border border-border/70 bg-muted/30 p-0.5 h-8">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setTextAlign("left")}
              title={uiCopy.ui.alignLeft}
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
              title={uiCopy.ui.alignCenter}
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
              title={uiCopy.ui.alignRight}
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
            title={uiCopy.ui.copyBtn}
            className={`h-8 text-xs ${isAiPanelOpen ? "px-1.5" : "gap-1.5"}`}
            data-testid="button-copy-all"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>{copied ? "✓" : uiCopy.ui.copyBtn}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            title={uiCopy.ui.shareBtn}
            className={`h-8 text-xs ${isAiPanelOpen ? "px-1.5" : "gap-1.5"}`}
            data-testid="button-share"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>{uiCopy.ui.shareBtn}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePhotoButtonClick}
            disabled={isUploadingPhoto}
            title={uiCopy.ui.photoBtn}
            className={`h-8 text-xs ${isAiPanelOpen ? "px-1.5" : "gap-1.5"}`}
            data-testid="button-insert-photo"
          >
            {isUploadingPhoto ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>{uiCopy.ui.photoBtn}</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoFileChange}
            data-testid="input-photo-upload"
          />

          {/* Camera Scan Button — Same monoline Lucide icon family as neighboring tools */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleScanButtonClick}
            disabled={isScanning}
            title="Open camera to scan words from a book or page"
            className={`h-8 text-xs ${isAiPanelOpen ? "px-1.5" : "gap-1.5"}`}
            data-testid="button-scan-text"
          >
            {isScanning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            <span className={isAiPanelOpen ? "hidden" : "hidden sm:inline"}>{uiCopy.ui.scanBtn}</span>
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
            onThemeChange={(nextTheme) => {
              setPaperTheme(nextTheme);
              setPageColor("");
            }}
            onLineStyleChange={setLineStyle}
            onLockedClick={() => { setProGateFeature("Stationery themes"); setProGateOpen(true); }}
          />
          <PageColorPicker
            pageColor={pageColor}
            isPro={isPro}
            compact={isAiPanelOpen}
            onPageColorChange={setPageColor}
            onLockedClick={() => { setProGateFeature("Page colors"); setProGateOpen(true); }}
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

          {/* Font Point Size Up / Down Control (11pt – 32pt) */}
          <div
            className="inline-flex items-center rounded-md border border-border/70 bg-muted/30 px-0.5 h-8"
            title="Change font point size"
            data-testid="toolbar-font-size-group"
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => stepFontSize(-1)}
              disabled={fontSizePt <= 10}
              title="Smaller font size"
              className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-35 transition-colors"
              data-testid="button-font-size-down"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="px-1.5 text-[11px] font-semibold tabular-nums text-foreground select-none">
              {fontSizePt}pt
            </span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => stepFontSize(1)}
              disabled={fontSizePt >= 42}
              title="Larger font size"
              className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-35 transition-colors"
              data-testid="button-font-size-up"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

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
            activeContext={`Note #${noteId} | Theme: ${paperTheme} | Font: ${fontSizePt}pt | Align: ${textAlign}`}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            title={t.deleteNote}
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
              <h3 className="font-serif font-semibold text-lg mb-2">{t.deleteNote}</h3>
              <p className="text-sm text-muted-foreground mb-5">
                <span className="font-medium text-foreground">{title || "Untitled"}</span> — {t.deleteConfirm}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>{t.cancel}</Button>
                <Button variant="destructive" className="flex-1" onClick={() => { setShowDeleteConfirm(false); handleDelete(); }}>{t.delete}</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Writing area with lined paper or solid custom page color */}
      <div
        ref={paperScrollRef}
        className={`flex-1 overflow-auto paper-page print-container paper-theme-${paperTheme}`}
        data-custom-font={font ? "true" : undefined}
        data-solid-page={pageColor ? "true" : undefined}
        data-text-align={textAlign}
        style={{
          ...(pageColor
            ? {
                "--solid-page-bg": pageColor,
                "--paper-bg": pageColor,
                "--paper-rule": isDarkHexColor(pageColor)
                  ? "rgba(255, 255, 255, 0.2)"
                  : "#a8c4d8",
                ...(!inkColor
                  ? { "--paper-ink": isDarkHexColor(pageColor) ? "#f8fafc" : "#241d12" }
                  : {}),
              }
            : {}),
          ...(inkColor ? ({ "--paper-ink": inkColor } as Record<string, string>) : {}),
          ...(font ? ({ "--note-font": font } as Record<string, string>) : {}),
          "--note-font-size": `${fontSizePt}pt`,
          "--note-line-step": `${lineStepPx}px`,
          "--note-photo-opacity": `${photoOpacity / 100}`,
        } as React.CSSProperties}
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

          {/* Section + Promote/Demote Photo Overlay + Photo Opacity Slider + Alignment & Undo Row */}
          <div
            className="flex flex-wrap items-center gap-2 mb-2 no-print font-sans"
            style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
          >
            <span className="text-xs text-muted-foreground font-medium">{t.section}</span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors border border-primary/20"
                  data-testid="category-badge-paper"
                >
                  <Hash className="h-3 w-3" />
                  {category === "General" ? uiCopy.ui.generalSection : category}
                  <span className="text-primary/50 ml-0.5">▾</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t.moveToSection}</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    onClick={() => handleCategorySelect("General")}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      category === "General" && !customCat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                    }`}
                  >{uiCopy.ui.generalSection}</button>
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
                  placeholder={t.customSectionPlaceholder}
                  value={customCat}
                  onChange={(e) => {
                    setCustomCat(e.target.value);
                    if (e.target.value) setCategory(e.target.value);
                  }}
                  className="text-xs h-7"
                />
              </PopoverContent>
            </Popover>

            {/* Auto-Detected Photo Overlay Control: Promote text to photo / Demote text back to page */}
            {hasPhoto && (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setTextOnPhoto((prev) => {
                      const next = !prev;
                      if (next && photoOpacity === 100) {
                        setPhotoOpacity(50);
                      }
                      return next;
                    });
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border shadow-2xs ${
                    activeOnPhoto
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background/80 text-foreground border-primary/35 hover:bg-primary/10"
                  }`}
                  data-testid="button-toggle-text-on-photo"
                >
                  {activeOnPhoto ? (
                    <>
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                      <span>{uiCopy.ui.demoteToPage}</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpToLine className="h-3.5 w-3.5" />
                      <span>{uiCopy.ui.promoteToPhoto}</span>
                    </>
                  )}
                </button>

                {activeOnPhoto && !inkColor && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setPhotoOverlayContrast((c) => (c === "light" ? "dark" : "light"))}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-background/75 border border-border hover:border-primary text-foreground"
                    title="Switch light vs dark text contrast over photo"
                  >
                    {photoOverlayContrast === "light" ? "Light Ink" : "Dark Ink"}
                  </button>
                )}
              </div>
            )}

            {/* Right-Side Page Controls: Photo Opacity Slider (when photo present) + Left / Center / Right */}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {hasPhoto && (
                <div
                  className="inline-flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-2xs border border-border/70 px-3 py-0.5 shadow-2xs"
                  title="Adjust photo opacity behind your text (turn down for a soft stationery watermark)"
                  data-testid="control-photo-opacity"
                >
                  <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap select-none">
                    Photo
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={photoOpacity}
                    onChange={(e) => setPhotoOpacity(Number(e.target.value))}
                    className="w-20 sm:w-24 h-1.5 accent-primary cursor-pointer"
                    aria-label="Photo opacity"
                    data-testid="slider-photo-opacity"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoOpacity((cur) => (cur === 50 ? 100 : 50))}
                    title="Click to toggle 50% watermark vs 100% full photo"
                    className="text-[10px] font-bold tabular-nums text-foreground hover:text-primary min-w-[2.2rem] text-right"
                  >
                    {photoOpacity}%
                  </button>
                </div>
              )}

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleFitTextToPage}
                title="Automatically size your words to fill the photo or page from top to bottom"
                className="inline-flex items-center gap-1.5 rounded-full bg-background/80 hover:bg-primary/10 border border-primary/35 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:text-primary transition-colors shadow-2xs"
                data-testid="button-fit-text-to-page"
              >
                <Maximize2 className="h-3 w-3 text-primary" />
                <span>{activeOnPhoto ? "Fit Text to Photo" : "Fit Text to Page"}</span>
              </button>

              <div className="inline-flex items-center gap-0.5 rounded-full bg-background/50 backdrop-blur-2xs border border-border/60 p-0.5">
              {([
                { id: "left", label: uiCopy.ui.alignLeft },
                { id: "center", label: uiCopy.ui.alignCenter },
                { id: "right", label: uiCopy.ui.alignRight },
              ] as const).map((al) => (
                <button
                  key={al.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setTextAlign(al.id)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                    textAlign === al.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {al.label}
                </button>
              ))}
              </div>
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

          {/* Writing Canvas: Either Promoted Directly Onto Hero Photo OR Standard Lined Stationery Page */}
          {activeOnPhoto ? (
            <div
              ref={photoFrameRef}
              className="my-3 rounded-xl overflow-hidden shadow-lg photo-overlay-mode"
              style={{
                display: "grid",
                backgroundColor: pageColor || "var(--paper-bg, #fdf6ec)",
              }}
            >
              <img
                ref={heroImgRef}
                src={firstPhotoSrc}
                alt={title || "Note photo"}
                className="w-full h-full object-cover block select-none transition-opacity duration-150"
                style={{ gridArea: "1 / 1", opacity: photoOpacity / 100 }}
              />
              {/* Editable poem/note layer stacked in same CSS grid cell so tall poems never clip at the bottom */}
              <div
                className={`z-10 flex flex-col justify-center p-6 md:p-12 ${
                  photoOpacity > 65
                    ? photoOverlayContrast === "light"
                      ? "bg-black/18"
                      : "bg-white/15"
                    : ""
                } ${
                  inkColor
                    ? ""
                    : photoOpacity <= 55 && !(pageColor && isDarkHexColor(pageColor))
                    ? "photo-overlay-dark"
                    : photoOverlayContrast === "light"
                    ? "photo-overlay-light"
                    : "photo-overlay-dark"
                }`}
                style={{
                  gridArea: "1 / 1",
                  ...(inkColor ? { color: inkColor } : {}),
                  ...(font ? { fontFamily: font } : {}),
                }}
                onClick={() => editorRef.current?.focus()}
              >
                <RichEditor
                  ref={editorRef}
                  content={content}
                  onChange={setContent}
                  placeholder={t.startWriting}
                  className={`w-full bg-transparent ${font ? "" : "font-serif"}`}
                  onImageClick={(target) => setLightboxTarget(target)}
                />
              </div>
            </div>
          ) : (
            <RichEditor
              ref={editorRef}
              content={content}
              onChange={setContent}
              placeholder={t.startWriting}
              className={`line-style-${lineStyle} ${lineStyle === "lined" && lineStepPx === 64 ? "line-style-lined-double" : ""} note-lines w-full min-h-[calc(100vh-220px)] bg-transparent text-base md:text-lg ${font ? "" : "font-serif"}`}
              onImageClick={(target) => setLightboxTarget(target)}
            />
          )}
        </div>
      </div>

      {/* Live Camera Book & Page Text Scanner */}
      <CameraScanDialog
        open={cameraScanOpen}
        isScanning={isScanning}
        onClose={() => setCameraScanOpen(false)}
        onCaptureDataUrl={(dataUrl, mimeType) => void runScanOnDataUrl(dataUrl, mimeType)}
        onPickFileFallback={() => scanInputRef.current?.click()}
      />

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
