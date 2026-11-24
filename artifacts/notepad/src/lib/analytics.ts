const VISITOR_KEY = "notebook-visitor-id";
const ARTIFACT = "notepad";

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function track(
  eventType: string,
  metadata?: Record<string, unknown>,
): void {
  try {
    const body = JSON.stringify({
      visitorId: getVisitorId(),
      eventType,
      artifact: ARTIFACT,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      metadata: metadata ?? null,
    });

    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/events", blob);
      if (ok) return;
    }

    void fetch("/api/events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // analytics must never break the app
  }
}
