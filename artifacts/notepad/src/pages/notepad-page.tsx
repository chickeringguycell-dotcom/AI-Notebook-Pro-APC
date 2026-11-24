import { useState, useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { Sidebar } from "@/components/notepad/sidebar";
import { Editor } from "@/components/notepad/editor";
import { AiPanel } from "@/components/notepad/ai-panel";
import { ShipAnimation } from "@/components/ship-animation";
import { FileText } from "lucide-react";
import { useLang } from "@/contexts/language-context";
import { usePwaInstall } from "@/hooks/use-pwa-install";
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
          // Keep the payload so the import retries on the next app load.
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
  const [showIosModal, setShowIosModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const { install, installPrompt, isInstalled, isIos, androidBrowser } = usePwaInstall();

  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const idParam = params.get("id");
  const noteId = idParam ? parseInt(idParam, 10) : undefined;

  return (
    <div className="flex h-screen overflow-hidden bg-background">

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
          <div className="flex-1 flex flex-col items-center justify-start text-center px-8 pt-3 pb-8">

            {/* Download buttons — very top, only if not already installed */}
            {!isInstalled && (
              <div className="w-full max-w-xs mb-6">
                <p className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold mb-2">
                  📲 Download the App
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowIosModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors shadow"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                    Apple
                  </button>
                  {installPrompt ? (
                    <button
                      onClick={install}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors shadow"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M17.523 15.341a.9.9 0 01-.9.9H7.377a.9.9 0 01-.9-.9V8.66a.9.9 0 01.9-.9h9.246a.9.9 0 01.9.9v6.681zM6.235 7.115l-1.4-2.424a.3.3 0 01.52-.3l1.418 2.455a8.732 8.732 0 017.454 0L15.645 4.39a.3.3 0 01.52.3l-1.4 2.424A8.713 8.713 0 0119.2 11.5H4.8a8.713 8.713 0 011.435-4.385zM9.6 9.85a.75.75 0 100 1.5.75.75 0 000-1.5zm4.8 0a.75.75 0 100 1.5.75.75 0 000-1.5z"/></svg>
                      Android
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowAndroidModal(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors shadow"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M17.523 15.341a.9.9 0 01-.9.9H7.377a.9.9 0 01-.9-.9V8.66a.9.9 0 01.9-.9h9.246a.9.9 0 01.9.9v6.681zM6.235 7.115l-1.4-2.424a.3.3 0 01.52-.3l1.418 2.455a8.732 8.732 0 017.454 0L15.645 4.39a.3.3 0 01.52.3l-1.4 2.424A8.713 8.713 0 0119.2 11.5H4.8a8.713 8.713 0 011.435-4.385zM9.6 9.85a.75.75 0 100 1.5.75.75 0 000-1.5zm4.8 0a.75.75 0 100 1.5.75.75 0 000-1.5z"/></svg>
                      Android
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mb-6 w-full max-w-sm">
              <ShipAnimation />
            </div>

            {/* Mobile: tap-here button — below the ship */}
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

      {/* Android Install Instructions Modal (for Firefox, Samsung Internet, etc.) */}
      {showAndroidModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowAndroidModal(false)}>
          <div className="bg-background rounded-t-2xl w-full max-w-sm p-6 pb-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-semibold text-lg">
                {androidBrowser === "firefox" && "Install on Firefox"}
                {androidBrowser === "samsung" && "Install on Samsung Internet"}
                {androidBrowser !== "firefox" && androidBrowser !== "samsung" && "Add to Android"}
              </h3>
              <button onClick={() => setShowAndroidModal(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
            </div>

            {androidBrowser === "firefox" && (
              <>
                <p className="text-sm text-muted-foreground mb-5">Firefox uses a different name for installing — follow these exact steps:</p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">1</div>
                    <div>
                      <p className="text-sm font-medium">Tap ⋮ (three dots) at the bottom-right</p>
                      <p className="text-xs text-muted-foreground">Next to the address bar at the bottom of Firefox</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">2</div>
                    <div>
                      <p className="text-sm font-medium">Tap <span className="text-primary font-bold">"More"</span>, then tap <span className="text-primary font-bold">"Add app to Home screen"</span></p>
                      <p className="text-xs text-muted-foreground">It has a small phone icon next to it. (On older Firefox versions it may just say "Add to Home screen".)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">3</div>
                    <div>
                      <p className="text-sm font-medium">Tap <strong>Add</strong> to confirm</p>
                      <p className="text-xs text-muted-foreground">My AI Notebook will appear on your home screen</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-900 dark:text-red-200">
                  <strong>⚠️ Don't tap "Downloads"</strong> or "Add to shortcuts" — those don't install the app. Look for "<strong>Add app to Home screen</strong>" instead.
                </div>
              </>
            )}

            {androidBrowser === "samsung" && (
              <>
                <p className="text-sm text-muted-foreground mb-5">Follow these steps in Samsung Internet:</p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">1</div>
                    <div>
                      <p className="text-sm font-medium">Tap ≡ (three lines) at the bottom-right</p>
                      <p className="text-xs text-muted-foreground">The menu button next to the address bar</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">2</div>
                    <div>
                      <p className="text-sm font-medium">Tap <span className="text-primary font-bold">"Add page to"</span> → <span className="text-primary font-bold">"Home screen"</span></p>
                      <p className="text-xs text-muted-foreground">Or look for "Install" if shown</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">3</div>
                    <div>
                      <p className="text-sm font-medium">Tap <strong>Add</strong> to confirm</p>
                      <p className="text-xs text-muted-foreground">My AI Notebook will appear on your home screen</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {androidBrowser !== "firefox" && androidBrowser !== "samsung" && (
              <>
                <p className="text-sm text-muted-foreground mb-5">Follow these steps to add My AI Notebook to your home screen:</p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">1</div>
                    <div>
                      <p className="text-sm font-medium">Tap the menu button</p>
                      <p className="text-xs text-muted-foreground">Look for ⋮ (three dots) or ≡ in your browser</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">2</div>
                    <div>
                      <p className="text-sm font-medium">Tap "Install app" or "Add to Home screen"</p>
                      <p className="text-xs text-muted-foreground">The wording depends on your browser — both work the same</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">3</div>
                    <div>
                      <p className="text-sm font-medium">Confirm by tapping Add</p>
                      <p className="text-xs text-muted-foreground">My AI Notebook will appear on your home screen</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-5 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <strong>💡 Faster option:</strong> Open this page in <strong>Chrome</strong> on Android — the green Android button does a one-tap install with no menus.
            </div>

            <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-xs text-green-900 dark:text-green-200">
              <strong>✓ No install needed?</strong> My AI Notebook works fully right here in your browser — write notes, use the AI assistant, and unlock Pro without installing anything.
            </div>

            <button
              onClick={() => setShowAndroidModal(false)}
              className="mt-4 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* iOS Install Instructions Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowIosModal(false)}>
          <div className="bg-background rounded-t-2xl w-full max-w-sm p-6 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-semibold text-lg">Add to iPhone</h3>
              <button onClick={() => setShowIosModal(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Follow these 3 steps in Safari to install My AI Notebook on your home screen:</p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">1</div>
                <div>
                  <p className="text-sm font-medium">Open in Safari</p>
                  <p className="text-xs text-muted-foreground">Make sure you're using Safari — not Chrome or another browser</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">2</div>
                <div>
                  <p className="text-sm font-medium">Tap the Share button</p>
                  <p className="text-xs text-muted-foreground">The box with the arrow pointing up — at the bottom of your screen</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">3</div>
                <div>
                  <p className="text-sm font-medium">Tap "Add to Home Screen"</p>
                  <p className="text-xs text-muted-foreground">Scroll down in the Share menu and tap it — then tap Add</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowIosModal(false)}
              className="mt-6 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
