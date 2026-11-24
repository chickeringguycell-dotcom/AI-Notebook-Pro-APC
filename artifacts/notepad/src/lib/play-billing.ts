// Native Google Play Billing v7 Bridge & Free-Taste Meter for My AI Notebook

export const SKU_YEARLY = "ainotebook_pro_yearly";
export const SKU_MONTHLY = "ainotebook_pro_monthly";

export const DEFAULT_YEARLY_PRICE = "$23.99";
export const DEFAULT_MONTHLY_PRICE = "$3.99";
export const DEFAULT_STRIKE_YEARLY = "$47.88";

export const FREE_AI_LIMIT = 4;
export const FREE_SCAN_LIMIT = 2;

const ENTITLEMENT_KEY = "ainotebook-pro-entitlement-v2";
const AI_USED_KEY = "ainotebook-free-ai-used-v2";
const SCAN_USED_KEY = "ainotebook-free-scans-used-v2";

const VALID_VIP_CODES = new Set([
  "VIPER2026",
  "AETHER2026",
  "GUY2026",
  "FOUNDER2026",
  "VIPERPRO",
]);

interface PlayBillingNativePlugin {
  getStatus(): Promise<{
    available: boolean;
    isSubscribed: boolean;
    activeProductId?: string;
    yearlyPrice?: string;
    monthlyPrice?: string;
  }>;
  subscribe(opts: { productId: string }): Promise<{
    ok: boolean;
    isSubscribed?: boolean;
    productId?: string;
    cancelled?: boolean;
    error?: string;
  }>;
  restorePurchases(): Promise<{
    available: boolean;
    isSubscribed: boolean;
    activeProductId?: string;
    yearlyPrice?: string;
    monthlyPrice?: string;
  }>;
  addListener?: (
    eventName: string,
    listenerFunc: (data: { isSubscribed: boolean; activeProductId?: string }) => void,
  ) => Promise<{ remove: () => void }>;
}

function getNativePlayBilling(): PlayBillingNativePlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: { PlayBilling?: PlayBillingNativePlugin };
    };
  }).Capacitor;
  if (cap?.isNativePlatform?.() && cap.Plugins?.PlayBilling) {
    return cap.Plugins.PlayBilling;
  }
  return null;
}

let cachedYearlyPrice = DEFAULT_YEARLY_PRICE;
let cachedMonthlyPrice = DEFAULT_MONTHLY_PRICE;
let initialized = false;

function broadcastUpdate(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ainotebook:pro-updated"));
  }
}

export function isUserEntitledToPro(): boolean {
  try {
    return localStorage.getItem(ENTITLEMENT_KEY) === "true";
  } catch {
    return false;
  }
}

export function setProEntitlement(active: boolean, source?: string): void {
  try {
    if (active) {
      localStorage.setItem(ENTITLEMENT_KEY, "true");
      if (source) localStorage.setItem(`${ENTITLEMENT_KEY}-source`, source);
    } else {
      const existingSource = localStorage.getItem(`${ENTITLEMENT_KEY}-source`);
      // Preserve VIP/Owner code unlocks even if Google Play subscription check returns empty
      if (existingSource !== "vip_code") {
        localStorage.removeItem(ENTITLEMENT_KEY);
      }
    }
  } catch {
    /* ignore */
  }
  broadcastUpdate();
}

export function getFreeAiUsed(): number {
  try {
    const raw = parseInt(localStorage.getItem(AI_USED_KEY) || "0", 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  } catch {
    return 0;
  }
}

export function getFreeAiTriesLeft(): number {
  if (isUserEntitledToPro()) return Infinity;
  return Math.max(0, FREE_AI_LIMIT - getFreeAiUsed());
}

export function consumeOneFreeAiTry(): boolean {
  if (isUserEntitledToPro()) return true;
  const used = getFreeAiUsed();
  if (used >= FREE_AI_LIMIT) {
    broadcastUpdate();
    return false;
  }
  try {
    localStorage.setItem(AI_USED_KEY, String(used + 1));
  } catch {
    /* ignore */
  }
  broadcastUpdate();
  return true;
}

export function getFreeScansLeft(): number {
  if (isUserEntitledToPro()) return Infinity;
  try {
    const used = parseInt(localStorage.getItem(SCAN_USED_KEY) || "0", 10) || 0;
    return Math.max(0, FREE_SCAN_LIMIT - used);
  } catch {
    return FREE_SCAN_LIMIT;
  }
}

export function consumeOneFreeScan(): boolean {
  if (isUserEntitledToPro()) return true;
  try {
    const used = parseInt(localStorage.getItem(SCAN_USED_KEY) || "0", 10) || 0;
    if (used >= FREE_SCAN_LIMIT) {
      broadcastUpdate();
      return false;
    }
    localStorage.setItem(SCAN_USED_KEY, String(used + 1));
    broadcastUpdate();
    return true;
  } catch {
    return false;
  }
}

export function getLiveSubscriptionPrices(): {
  yearlyPrice: string;
  monthlyPrice: string;
  strikeYearlyPrice: string;
} {
  return {
    yearlyPrice: cachedYearlyPrice,
    monthlyPrice: cachedMonthlyPrice,
    strikeYearlyPrice: DEFAULT_STRIKE_YEARLY,
  };
}

export async function initPlayBilling(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const plugin = getNativePlayBilling();
  if (!plugin) return;

  try {
    plugin.addListener?.("subscriptionUpdated", (evt) => {
      setProEntitlement(Boolean(evt?.isSubscribed), "google_play");
    });
    const status = await plugin.getStatus();
    if (status.yearlyPrice) cachedYearlyPrice = status.yearlyPrice;
    if (status.monthlyPrice) cachedMonthlyPrice = status.monthlyPrice;
    setProEntitlement(Boolean(status.isSubscribed), status.isSubscribed ? "google_play" : undefined);
  } catch {
    /* ignore cold offline startup */
  }
}

export async function startGooglePlaySubscription(
  plan: "yearly" | "monthly",
): Promise<{ ok: boolean; cancelled?: boolean; message?: string }> {
  const productId = plan === "yearly" ? SKU_YEARLY : SKU_MONTHLY;
  const plugin = getNativePlayBilling();

  if (!plugin) {
    return {
      ok: false,
      message:
        "Subscriptions are processed securely through the Google Play Store app on your Android phone or tablet.",
    };
  }

  try {
    const res = await plugin.subscribe({ productId });
    if (res.ok && res.isSubscribed) {
      setProEntitlement(true, "google_play");
      return { ok: true };
    }
    if (res.cancelled) {
      return { ok: false, cancelled: true };
    }
    return {
      ok: false,
      message: res.error || "Could not complete Google Play subscription.",
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Google Play Billing error.",
    };
  }
}

export async function restoreGooglePlaySubscriptions(): Promise<{
  ok: boolean;
  restored: boolean;
  message?: string;
}> {
  const plugin = getNativePlayBilling();
  if (!plugin) {
    return {
      ok: false,
      restored: isUserEntitledToPro(),
      message: "Open My AI Notebook on your Android device to restore Google Play subscriptions.",
    };
  }
  try {
    const status = await plugin.restorePurchases();
    if (status.yearlyPrice) cachedYearlyPrice = status.yearlyPrice;
    if (status.monthlyPrice) cachedMonthlyPrice = status.monthlyPrice;
    if (status.isSubscribed) {
      setProEntitlement(true, "google_play");
      return { ok: true, restored: true };
    }
    return {
      ok: true,
      restored: false,
      message: "No active Google Play subscription was found for this Google account.",
    };
  } catch {
    return {
      ok: false,
      restored: false,
      message: "Could not reach Google Play right now. Please check your connection.",
    };
  }
}

export function redeemVipProCode(rawCode: string): boolean {
  const normalized = rawCode.trim().toUpperCase();
  if (!VALID_VIP_CODES.has(normalized)) {
    return false;
  }
  setProEntitlement(true, "vip_code");
  return true;
}
