import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type AndroidBrowser = "chrome" | "firefox" | "samsung" | "other";

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [androidBrowser, setAndroidBrowser] = useState<AndroidBrowser>("other");

  useEffect(() => {
    const ua = navigator.userAgent;

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(ua);
    setIsIos(ios);

    // Detect Android browser family (best-effort UA sniff for instructions only)
    if (/android/i.test(ua)) {
      if (/firefox|fxios|focus|klar|fennec/i.test(ua)) {
        setAndroidBrowser("firefox");
      } else if (/samsungbrowser/i.test(ua)) {
        setAndroidBrowser("samsung");
      } else if (/chrome/i.test(ua) && !/edg|opr|opera/i.test(ua)) {
        setAndroidBrowser("chrome");
      } else {
        setAndroidBrowser("other");
      }
    }

    // Detect if already installed (standalone mode)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsInstalled(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  };

  return { install, installPrompt, isInstalled, isIos, androidBrowser };
}
