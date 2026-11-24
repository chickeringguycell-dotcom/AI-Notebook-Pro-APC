import { useState, useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { Sidebar } from "@/components/notepad/sidebar";
import { Editor } from "@/components/notepad/editor";
import { AiPanel } from "@/components/notepad/ai-panel";
import { FirstLaunchOnboardingDialog } from "@/components/notepad/onboarding-dialog";
import { WelcomeRobotVideo } from "@/components/welcome-robot-video";
import { FileText } from "lucide-react";
import { useLang } from "@/contexts/language-context";
import { useCreateNote, getListNotesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { plainTextToHtml } from "@/lib/notes-io";

// Consume a note shared into the app via the Android share sheet (share_target).
function useSharedNoteImport() {
  const createNote = useCreateNote();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    const raw = sessionStorage.getItem("pending-share-import");
    if (!raw) return;
    ranRef.current = true;

    let parsed: { title?: string; text?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem("pending-share-import");
      return;
    }

    const text = (parsed.text || "").trim();
    const firstLine = text.split("\n").find((l) => l.trim()) ?? "";
    const title =
      (parsed.title || "").trim() ||
      firstLine.slice(0, 80).trim() ||
      "Imported note";

    createNote.mutate(
      { data: { title, content: plainTextToHtml(text), category: "General" } },
      {
        onSuccess: (note) => {
          sessionStorage.removeItem("pending-share-import");
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          navigate(`/?id=${note.id}`);
          toast({
            title: "Note imported",
            description: "Added from your shared note.",
          });
        },
        onError: () => {
          toast({
            title: "Import failed",
            description: "Could not save the shared note. Please try again.",
            variant: "destructive",
          });
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function NotepadPage() {
  useSharedNoteImport();
  const search = useSearch();
  const { t } = useLang();
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const idParam = params.get("id");
  const noteId = idParam ? parseInt(idParam, 10) : undefined;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <FirstLaunchOnboardingDialog />

      {/* Mobile overlay backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always visible on desktop, drawer on mobile */}
      <div
        className={`
          fixed inset-y-0 left-0 z-30 transition-transform duration-200
          md:relative md:translate-x-0 md:z-auto
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar
          currentNoteId={noteId}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {noteId ? (
          <div className="flex flex-1 overflow-hidden">
            <Editor
              key={noteId}
              noteId={noteId}
              onToggleAiPanel={() => setIsAiPanelOpen((v) => !v)}
              isAiPanelOpen={isAiPanelOpen}
              onOpenSidebar={() => setIsSidebarOpen(true)}
              onNoteDeleted={() => navigate("/")}
            />
            {isAiPanelOpen && (
              <AiPanel noteId={noteId} onClose={() => setIsAiPanelOpen(false)} />
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-start text-center px-6 pt-6 md:pt-7 pb-6 overflow-y-auto">

            {/* Welcome AI video (ShipAnimation preserved in backups/classic_tall_ship) */}
            <div className="mb-4 md:mb-5 w-full flex justify-center">
              <WelcomeRobotVideo />
            </div>

            {/* Mobile: tap-here button — below the ship (exact original mobile layout) */}
            <button
              className="md:hidden mb-6 flex flex-col items-center gap-2 group"
              onClick={() => setIsSidebarOpen(true)}
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-md">
                  <FileText className="h-12 w-12 text-primary" />
                </div>
                <div className="absolute inset-0 rounded-2xl border-2 border-primary/40 animate-ping opacity-40" />
              </div>
              <div className="flex flex-col items-center gap-0.5 mt-1">
                <span className="text-base font-bold text-primary">👆 Tap here to open your notes</span>
                <span className="text-xs text-muted-foreground">or create your first note</span>
              </div>
            </button>

            <h2 className="text-2xl font-serif font-medium mb-3">{t.welcomeTitle}</h2>
            <p className="text-muted-foreground max-w-sm leading-relaxed">
              {t.welcomeSubtitle}
            </p>

            {/* Desktop hint */}
            <p className="hidden md:block mt-4 text-sm text-muted-foreground/60 italic">
              ← Use the sidebar to create or open a note
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
