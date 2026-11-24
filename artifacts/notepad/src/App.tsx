import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotepadPage } from "@/pages/notepad-page";
import NotFound from "@/pages/not-found";
import { LanguageProvider } from "@/contexts/language-context";
import { track } from "@/lib/analytics";
import { handleSovereignLocalApi } from "@/lib/sovereign-aether-runtime";
import { initPlayBilling } from "@/lib/play-billing";

if (typeof globalThis !== "undefined") {
  (
    globalThis as unknown as {
      __VIPER_SOVEREIGN_LOCAL_API__?: typeof handleSovereignLocalApi;
    }
  ).__VIPER_SOVEREIGN_LOCAL_API__ = handleSovereignLocalApi;
}

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function captureSharedImport(): void {
  try {
    const url = new URL(window.location.href);
    if (stripBase(url.pathname) !== "/share-target") return;
    const title = url.searchParams.get("title") ?? "";
    const text = url.searchParams.get("text") ?? "";
    const sharedUrl = url.searchParams.get("url") ?? "";
    const body = [text, sharedUrl].filter(Boolean).join("\n\n");
    if (title || body) {
      sessionStorage.setItem(
        "pending-share-import",
        JSON.stringify({ title, text: body }),
      );
    }
    window.history.replaceState({}, "", basePath || "/");
  } catch {
    /* ignore malformed share payloads */
  }
}

captureSharedImport();

function Router() {
  return (
    <Switch>
      <Route path="/" component={NotepadPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

function App() {
  useEffect(() => {
    void initPlayBilling();
    track("page_view");
  }, []);

  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}

export default App;
