import { useLocation } from "wouter";
import { Plus, Trash2, FolderOpen, X, Globe, Lock, ChevronRight, Hash, Pin, PinOff, Download, Upload, Pencil, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang, LANGUAGES } from "@/contexts/language-context";
import { getOnboardingCopy } from "@/locales/onboarding-i18n";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useListNotes, useCreateNote, Note, useDeleteNote, useUpdateNote, getListNotesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useProStatus } from "@/hooks/use-pro-status";
import { ProGateModal } from "@/components/pro-gate-modal";
import { track } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { notesToMarkdown, parseImportFile, downloadTextFile } from "@/lib/notes-io";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SettingsBugButton } from "@/components/notepad/settings-bug-dialog";
function AccountBlock() {
  return (
    <div className="px-3 py-2 border-t border-sidebar-border">
      <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
        <span className="text-primary font-bold">✦</span>
        <span className="truncate">Powered by Sovereign Aether</span>
      </div>
    </div>
  );
}


function LangPicker({ lang, setLang }: { lang: string; setLang: (c: any) => void }) {
  const [search, setSearch] = useState("");
  const filtered = LANGUAGES.filter((l) => {
    const q = search.toLowerCase();
    return l.label.toLowerCase().includes(q) || l.nativeLabel.toLowerCase().includes(q);
  });
  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:border-primary mb-1.5"
        autoFocus
      />
      <div className="overflow-y-auto max-h-52 space-y-0.5" style={{ scrollbarWidth: "thin" }}>
        {filtered.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
              lang === l.code
                ? "bg-primary text-primary-foreground font-semibold"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <span className="text-base">{l.flag}</span>
            <span className="truncate">{l.nativeLabel}</span>
            <span className={`ml-auto shrink-0 text-[10px] ${lang === l.code ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{l.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface SidebarProps {
  currentNoteId?: number;
  onClose?: () => void;
}

export function Sidebar({ currentNoteId, onClose }: SidebarProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: notes, isLoading } = useListNotes();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const updateNote = useUpdateNote();
  const { t, lang, setLang } = useLang();
  const uiCopy = getOnboardingCopy(lang);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { isPro } = useProStatus();
  const [proGateOpen, setProGateOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [noteToRename, setNoteToRename] = useState<Note | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameCategory, setRenameCategory] = useState("General");
  const [renameCustomCategory, setRenameCustomCategory] = useState("");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [sectionToRename, setSectionToRename] = useState<string | null>(null);
  const [sectionRenameValue, setSectionRenameValue] = useState("");
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [customCategory, setCustomCategory] = useState("");
  const [showSectionInput, setShowSectionInput] = useState(false);
  const [newSectionInput, setNewSectionInput] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["General"]));
  const [pinnedSections, setPinnedSections] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("notepad-pinned-sections");
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch { return new Set(); }
  });

  const allNotes = notes ?? [];
  const customSections = Array.from(
    new Set(allNotes.map((n) => n.category).filter(Boolean).filter((c) => c !== "General"))
  ).sort() as string[];
  const baseSections = ["General", ...customSections];
  const sections = [...baseSections].sort((a, b) => {
    const ap = pinnedSections.has(a) ? 1 : 0;
    const bp = pinnedSections.has(b) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return baseSections.indexOf(a) - baseSections.indexOf(b);
  });

  const notesForSection = (section: string) =>
    [...allNotes.filter((n) => n.category === section)].sort((a, b) => {
      const ap = (a as { pinned?: boolean }).pinned ? 1 : 0;
      const bp = (b as { pinned?: boolean }).pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const openRename = (note: Note) => {
    setRenameValue(note.title || "");
    setRenameCategory(note.category || "General");
    setRenameCustomCategory("");
    setNoteToRename(note);
  };

  const handleRename = () => {
    if (!noteToRename) return;
    const title = renameValue.trim() || "Untitled Note";
    const category = renameCustomCategory.trim() || renameCategory || "General";
    updateNote.mutate(
      { id: noteToRename.id, data: { title, category } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          setExpandedSections((prev) => new Set([...prev, category]));
          setNoteToRename(null);
        },
      }
    );
  };

  const startLongPress = (note: Note, x: number, y: number) => {
    longPressFired.current = false;
    longPressStart.current = { x, y };
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      longPressTimer.current = null;
      try { (navigator as Navigator & { vibrate?: (n: number) => void }).vibrate?.(15); } catch {}
      openRename(note);
    }, 500);
  };

  const startNoteTouchLongPress = (note: Note, e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    startLongPress(note, t.clientX, t.clientY);
  };
  const noteTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    maybeCancelOnMove(t.clientX, t.clientY);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressStart.current = null;
  };

  const maybeCancelOnMove = (x: number, y: number) => {
    const start = longPressStart.current;
    if (!start || !longPressTimer.current) return;
    const dx = x - start.x;
    const dy = y - start.y;
    if (dx * dx + dy * dy > 400) {
      cancelLongPress();
    }
  };

  const openSectionRename = (section: string) => {
    if (section === "General") return;
    setSectionRenameValue(section);
    setSectionToRename(section);
  };

  const handleSectionRename = async () => {
    if (!sectionToRename) return;
    const next = sectionRenameValue.trim();
    if (!next || next === sectionToRename) {
      setSectionToRename(null);
      return;
    }
    const notesInSection = allNotes.filter((n) => n.category === sectionToRename);
    await Promise.all(
      notesInSection.map((n) =>
        updateNote.mutateAsync({ id: n.id, data: { category: next } })
      )
    );
    setExpandedSections((prev) => {
      const s = new Set(prev);
      s.delete(sectionToRename);
      s.add(next);
      return s;
    });
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
    setSectionToRename(null);
  };

  const startSectionLongPress = (section: string, x: number, y: number) => {
    if (section === "General") return;
    longPressFired.current = false;
    longPressStart.current = { x, y };
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      longPressTimer.current = null;
      try { (navigator as Navigator & { vibrate?: (n: number) => void }).vibrate?.(15); } catch {}
      openSectionRename(section);
    }, 500);
  };

  const startSectionTouchLongPress = (section: string, e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    startSectionLongPress(section, t.clientX, t.clientY);
  };
  const sectionTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    maybeCancelOnMove(t.clientX, t.clientY);
  };

  const handleTogglePin = (note: Note) => {
    const next = !(note as { pinned?: boolean }).pinned;
    if (next && note.category) {
      setExpandedSections((prev) => new Set([...prev, note.category as string]));
    }
    updateNote.mutate(
      { id: note.id, data: { pinned: next } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        },
      }
    );
  };

  const toggleSectionPin = (section: string) => {
    setPinnedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      try { localStorage.setItem("notepad-pinned-sections", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleDeleteSection = () => {
    if (!sectionToDelete) return;
    const notesInSection = notesForSection(sectionToDelete);
    Promise.all(notesInSection.map((n) =>
      new Promise<void>((resolve) => deleteNote.mutate({ id: n.id }, { onSuccess: () => resolve(), onError: () => resolve() }))
    )).then(() => {
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      if (notesInSection.some((n) => n.id === currentNoteId)) setLocation("/");
      setSectionToDelete(null);
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleOpenNewNote = (preselectedCategory?: string) => {
    setNewTitle("");
    setNewCategory(preselectedCategory || "General");
    setCustomCategory("");
    setIsNewNoteOpen(true);
  };

  const handleCreateNote = () => {
    const category = customCategory.trim() || newCategory;
    const title = newTitle.trim() || "Untitled Note";
    createNote.mutate(
      { data: { title, content: "", category } },
      {
        onSuccess: (note) => {
          track("note_created", { category });
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          setIsNewNoteOpen(false);
          setExpandedSections((prev) => new Set([...prev, category]));
          setLocation(`/?id=${note.id}`);
          onClose?.();
        },
      }
    );
  };

  const handleExport = () => {
    if (allNotes.length === 0) {
      toast({ title: "No notes to export", description: "Create a note first." });
      return;
    }
    const md = notesToMarkdown(allNotes);
    const date = format(new Date(), "yyyy-MM-dd");
    downloadTextFile(`my-ai-notebook-${date}.md`, md);
    track("notes_exported", { count: allNotes.length });
    toast({
      title: "Notes exported",
      description: `${allNotes.length} note(s) saved to your device.`,
    });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed = parseImportFile(file.name, text);
      if (parsed.length === 0) {
        toast({ title: "Nothing to import", description: "No notes found in that file." });
        return;
      }
      let ok = 0;
      for (const n of parsed) {
        try {
          await createNote.mutateAsync({
            data: { title: n.title, content: n.content, category: n.category },
          });
          ok++;
        } catch {
          /* skip notes that fail to import */
        }
      }
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      track("notes_imported", { count: ok });
      toast({
        title: "Import complete",
        description: `${ok} of ${parsed.length} note(s) added.`,
      });
    } catch {
      toast({
        title: "Import failed",
        description: "Could not read that file.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = () => {
    if (!noteToDelete) return;
    deleteNote.mutate(
      { id: noteToDelete },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          if (currentNoteId === noteToDelete) setLocation("/");
          setNoteToDelete(null);
        },
      }
    );
  };

  const handleSelectNote = (id: number) => {
    setLocation(`/?id=${id}`);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-screen max-w-[22rem] md:w-72 md:max-w-none shrink-0">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-sidebar-border">
        <button
          type="button"
          onClick={() => {
            setLocation("/");
            onClose?.();
          }}
          title="Return to Welcome Screen"
          className="flex items-center gap-2 font-serif text-base font-semibold hover:opacity-80 transition text-left"
        >
          <img
            src="/icons/icon-192.png?v=4"
            alt=""
            className="h-6 w-6 rounded-md shadow-sm"
          />
          {t.myNotepad}
        </button>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleOpenNewNote()}
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            title="New Note in General"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {/* Close button — visible only on mobile */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 md:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>


      {/* Section tree */}
      <ScrollArea className="flex-1">
        <div className="py-2">

          {/* New section input */}
          {showSectionInput && (
            <div className="flex items-center gap-1.5 mx-3 mb-2 px-2 py-1.5 rounded-lg border border-primary/40 bg-background">
              <Hash className="h-3.5 w-3.5 text-primary shrink-0" />
              <input
                autoFocus
                type="text"
                value={newSectionInput}
                onChange={(e) => setNewSectionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSectionInput.trim()) {
                    setShowSectionInput(false);
                    handleOpenNewNote(newSectionInput.trim());
                    setNewSectionInput("");
                  }
                  if (e.key === "Escape") {
                    setShowSectionInput(false);
                    setNewSectionInput("");
                  }
                }}
                placeholder={t.nameSectionPlaceholder}
                className="flex-1 text-xs bg-transparent outline-none"
              />
              <button
                onClick={() => {
                  if (newSectionInput.trim()) {
                    setShowSectionInput(false);
                    handleOpenNewNote(newSectionInput.trim());
                    setNewSectionInput("");
                  }
                }}
                className="text-[10px] bg-primary text-primary-foreground rounded px-1.5 py-0.5 font-medium"
              >
                {t.add}
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="px-3 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-1/2 mb-2 bg-sidebar-border" />
                  <Skeleton className="h-3.5 w-3/4 mb-1.5 ml-4 bg-sidebar-border" />
                  <Skeleton className="h-3.5 w-2/3 ml-4 bg-sidebar-border" />
                </div>
              ))}
            </div>
          ) : (
            sections.map((section) => {
              const sectionNotes = notesForSection(section);
              const isExpanded = expandedSections.has(section);
              return (
                <div key={section}>
                  {/* Section header row — explicit grid: title | count | + | trash */}
                  <div className="mx-1 rounded-lg hover:bg-sidebar-accent/50 transition-colors flex items-center pr-1">
                    <button
                      onClick={() => {
                        if (longPressFired.current) {
                          longPressFired.current = false;
                          return;
                        }
                        toggleSection(section);
                      }}
                      onPointerDown={(e) => startSectionLongPress(section, e.clientX, e.clientY)}
                      onPointerUp={cancelLongPress}
                      onPointerLeave={cancelLongPress}
                      onPointerMove={(e) => maybeCancelOnMove(e.clientX, e.clientY)}
                      onPointerCancel={cancelLongPress}
                      onTouchStart={(e) => startSectionTouchLongPress(section, e)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={sectionTouchMove}
                      onTouchCancel={cancelLongPress}
                      onContextMenu={(e) => { if (section !== "General") { e.preventDefault(); cancelLongPress(); openSectionRename(section); } }}
                      style={{ touchAction: "manipulation", WebkitTouchCallout: "none", userSelect: "none" } as React.CSSProperties}
                      className="flex items-center gap-1.5 py-2 pl-2 pr-1 text-left flex-1 min-w-0"
                    >
                      <ChevronRight
                        className={`h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0 transition-transform duration-150 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                      {isExpanded
                        ? <FolderOpen className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        : <FolderOpen className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
                      }
                      <span className="text-sm font-medium font-serif truncate text-sidebar-foreground min-w-0 flex items-center gap-1">
                        {pinnedSections.has(section) && <Pin className="h-3 w-3 text-primary shrink-0 fill-primary" />}
                        {section === "General" ? uiCopy.ui.generalSection : section}
                      </span>
                      <span className="text-[10px] text-sidebar-foreground/40 shrink-0 ml-auto">
                        {sectionNotes.length}
                      </span>
                    </button>
                    {/* Action icons — inline, sleek, dark, always visible */}
                    {/* Three-dots (⋮) menu right where Guy marked + Pin + Add Subsection */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          title={`Options for ${section}`}
                          aria-label={`Options for ${section}`}
                          className="ml-1 flex items-center justify-center h-7 w-7 rounded-md text-sidebar-foreground/60 hover:text-foreground hover:bg-sidebar-accent transition-colors shrink-0"
                          data-testid={`button-menu-section-${section}`}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-48 p-1.5"
                        align="start"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {section !== "General" && (
                          <button
                            type="button"
                            onClick={() => openSectionRename(section)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground hover:bg-accent text-left transition-colors"
                            data-testid={`menu-rename-section-${section}`}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            {uiCopy.renameSection}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenNewNote(section)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground hover:bg-accent text-left transition-colors"
                          data-testid={`menu-new-subsection-${section}`}
                        >
                          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                          {uiCopy.newSubsection}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isPro) { setProGateOpen(true); return; }
                            setShowSectionInput(true);
                            setNewSectionInput("");
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground hover:bg-accent text-left transition-colors"
                          data-testid={`menu-new-section-from-${section}`}
                        >
                          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          {uiCopy.newSection}
                        </button>
                        {section !== "General" && (
                          <>
                            <div className="my-1 h-px bg-border" />
                            <button
                              type="button"
                              onClick={() => setSectionToDelete(section)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 text-left transition-colors"
                              data-testid={`menu-delete-section-${section}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {uiCopy.deleteSection}
                            </button>
                          </>
                        )}
                      </PopoverContent>
                    </Popover>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSectionPin(section); }}
                      title={pinnedSections.has(section) ? `Unpin ${section} section` : `Pin ${section} section to top`}
                      aria-label={pinnedSections.has(section) ? `Unpin ${section}` : `Pin ${section} to top`}
                      className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors shrink-0 ${
                        pinnedSections.has(section)
                          ? "text-primary hover:bg-primary/10"
                          : "text-sidebar-foreground/40 hover:text-primary hover:bg-sidebar-accent"
                      }`}
                      data-testid={`button-pin-section-${section}`}
                    >
                      {pinnedSections.has(section) ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenNewNote(section); }}
                      title={`New subsection in ${section}`}
                      aria-label={`Add new subsection in ${section}`}
                      className="flex items-center justify-center h-7 w-7 rounded-md text-sidebar-foreground hover:bg-sidebar-accent active:bg-sidebar-accent/80 transition-colors shrink-0"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.75} />
                    </button>
                  </div>

                  {/* Subsections under this section */}
                  {isExpanded && (
                    <div className="ml-6 mr-2 mb-2 space-y-0.5">
                      {sectionNotes.map((note: Note) => {
                        const isPinned = !!(note as { pinned?: boolean }).pinned;
                        return (
                        <div
                          key={note.id}
                          className={`group/note flex items-center rounded-lg pr-1 transition-colors ${
                            currentNoteId === note.id
                              ? "bg-primary/15 text-primary"
                              : "hover:bg-sidebar-accent/60 text-sidebar-foreground"
                          }`}
                        >
                          <button
                            onClick={() => {
                              if (longPressFired.current) {
                                longPressFired.current = false;
                                return;
                              }
                              handleSelectNote(note.id);
                            }}
                            onPointerDown={(e) => startLongPress(note, e.clientX, e.clientY)}
                            onPointerUp={cancelLongPress}
                            onPointerLeave={cancelLongPress}
                            onPointerMove={(e) => maybeCancelOnMove(e.clientX, e.clientY)}
                            onPointerCancel={cancelLongPress}
                            onTouchStart={(e) => startNoteTouchLongPress(note, e)}
                            onTouchEnd={cancelLongPress}
                            onTouchMove={noteTouchMove}
                            onTouchCancel={cancelLongPress}
                            onContextMenu={(e) => { e.preventDefault(); cancelLongPress(); openRename(note); }}
                            style={{ touchAction: "manipulation", WebkitTouchCallout: "none", userSelect: "none" } as React.CSSProperties}
                            className="flex-1 min-w-0 text-left px-2 py-2 rounded-lg"
                            data-testid={`note-item-${note.id}`}
                          >
                            <p className="font-medium text-sm truncate font-serif leading-snug flex items-center gap-1.5">
                              {isPinned && <Pin className="h-3 w-3 text-primary shrink-0 fill-primary" />}
                              <span className="truncate">{note.title || "Untitled"}</span>
                            </p>
                            <span className="text-[11px] text-sidebar-foreground/40">
                              {format(new Date(note.updatedAt), "MMM d, h:mm a")}
                            </span>
                          </button>
                          <button
                            type="button"
                            className={`flex items-center justify-center h-6 w-6 rounded-md shrink-0 transition-colors ${
                              isPinned
                                ? "opacity-100 text-primary hover:bg-primary/10"
                                : "opacity-100 md:opacity-0 md:group-hover/note:opacity-100 text-sidebar-foreground/60 hover:text-primary hover:bg-primary/10"
                            }`}
                            onClick={(e) => { e.stopPropagation(); handleTogglePin(note); }}
                            title={isPinned ? "Unpin subsection" : "Pin subsection to top"}
                            data-testid={`button-pin-${note.id}`}
                          >
                            {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                          </button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center justify-center h-6 w-6 rounded-md shrink-0 text-sidebar-foreground/60 hover:text-foreground hover:bg-sidebar-accent transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                title="Subsection options"
                                data-testid={`button-menu-note-${note.id}`}
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-48 p-1.5"
                              align="end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => openRename(note)}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground hover:bg-accent text-left transition-colors"
                                data-testid={`menu-rename-note-${note.id}`}
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                {uiCopy.renameSubsection}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenNewNote(section)}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground hover:bg-accent text-left transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                {uiCopy.newSubsection}
                              </button>
                              <div className="my-1 h-px bg-border" />
                              <button
                                type="button"
                                onClick={() => setNoteToDelete(note.id)}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 text-left transition-colors"
                                data-testid={`menu-delete-note-${note.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {t.delete}
                              </button>
                            </PopoverContent>
                          </Popover>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Add new section button */}
          <div className="px-3 mt-2">
            <button
              onClick={() => {
                if (!isPro) { setProGateOpen(true); return; }
                setShowSectionInput(true);
                setNewSectionInput("");
              }}
              className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-primary transition-colors py-1 font-medium"
              data-testid="button-new-folder"
            >
              {isPro ? <Plus className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {uiCopy.newSection}
              {!isPro && (
                <span className="px-1 py-px rounded text-[9px] bg-primary/15 text-primary font-bold tracking-wide">PRO</span>
              )}
            </button>
          </div>
        </div>
      </ScrollArea>


      {/* Account block */}
      <AccountBlock />

      {/* Import / Export */}
      <div className="px-3 py-2 border-t border-sidebar-border flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          className="hidden"
          onChange={handleImportFile}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg px-2 py-1.5 transition-colors disabled:opacity-50"
          data-testid="button-import-notes"
        >
          <Upload className="h-3.5 w-3.5 shrink-0" />
          {isImporting ? "…" : uiCopy.importBtn}
        </button>
        <button
          onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg px-2 py-1.5 transition-colors"
          data-testid="button-export-notes"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          {uiCopy.exportBtn}
        </button>
      </div>

      {/* Language Switcher & Settings / Bug Report */}
      <div className="px-3 py-2 border-t border-sidebar-border space-y-1">
        <SettingsBugButton />
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 w-full text-left hover:bg-sidebar-accent rounded-lg px-2 py-1.5 transition-colors group">
              <Globe className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
              <span className="text-xs text-muted-foreground group-hover:text-foreground">
                {LANGUAGES.find(l => l.code === lang)?.flag}{" "}
                {LANGUAGES.find(l => l.code === lang)?.nativeLabel}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground/50">▾</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start" side="top">
            <LangPicker lang={lang} setLang={setLang} />
          </PopoverContent>
        </Popover>
      </div>

      {/* New Subsection Dialog */}
      <Dialog open={isNewNoteOpen} onOpenChange={setIsNewNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">
              New Subsection in "{customCategory.trim() || newCategory || "General"}"
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="note-title">Subsection Name (e.g., Cherry Pie, Jesus Christ Picture)</Label>
              <Input
                id="note-title"
                placeholder="Enter subsection name..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateNote()}
                autoFocus
                data-testid="input-new-note-title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewNoteOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleCreateNote} disabled={createNote.isPending} data-testid="button-create-note">
              Create Subsection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Section Dialog */}
      <Dialog open={!!sectionToRename} onOpenChange={(open) => !open && setSectionToRename(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Rename Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="rename-section">Section Name (e.g., Recipes, Religion, Poems)</Label>
            <Input
              id="rename-section"
              value={sectionRenameValue}
              onChange={(e) => setSectionRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSectionRename();
                if (e.key === "Escape") setSectionToRename(null);
              }}
              autoFocus
              data-testid="input-rename-section"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionToRename(null)}>{t.cancel}</Button>
            <Button onClick={handleSectionRename} disabled={updateNote.isPending} data-testid="button-rename-section-save">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Subsection Dialog */}
      <Dialog open={!!noteToRename} onOpenChange={(open) => !open && setNoteToRename(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Rename Subsection or Move to Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rename-title">Subsection Name</Label>
              <Input
                id="rename-title"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setNoteToRename(null);
                }}
                autoFocus
                data-testid="input-rename-title"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Section</Label>
              <div className="flex flex-wrap gap-1.5">
                {baseSections.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setRenameCategory(cat); setRenameCustomCategory(""); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      renameCategory === cat && !renameCustomCategory.trim()
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-background border-border text-foreground/70 hover:bg-sidebar-accent/60"
                    }`}
                    data-testid={`button-rename-cat-${cat}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <Input
                value={renameCustomCategory}
                onChange={(e) => setRenameCustomCategory(e.target.value)}
                placeholder="Or new Section name (e.g., Recipes, Religion)..."
                className="mt-1.5"
                data-testid="input-rename-custom-category"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteToRename(null)}>{t.cancel}</Button>
            <Button onClick={handleRename} disabled={updateNote.isPending} data-testid="button-rename-save">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Note Confirmation */}
      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteNote}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Section Confirmation */}
      <AlertDialog open={!!sectionToDelete} onOpenChange={(open) => !open && setSectionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{sectionToDelete}" section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the section and all {sectionToDelete ? notesForSection(sectionToDelete).length : 0} note(s) inside it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pro Gate */}
      <ProGateModal
        open={proGateOpen}
        onOpenChange={setProGateOpen}
        featureName="Custom tabs"
      />
    </div>
  );
}
