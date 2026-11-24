import { useState } from "react";
import { Sparkles, Check, Crown, RotateCcw, Gift, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProStatus } from "@/hooks/use-pro-status";

const PRO_FEATURES = [
  "Unlimited Aria & Aether AI Poetry, Recipes, Stories & Voice",
  "All 42 Custom Illustrated Stationeries, Page & Ink Colors",
  "Photo Watermark Keepsake Studio & Auto-Fit Typography",
  "Unlimited Voice Dictation, Camera Scans & Custom Sections",
];

interface ProGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

export function ProGateModal({ open, onOpenChange, featureName }: ProGateModalProps) {
  const {
    subscribePlan,
    restoreProPurchases,
    unlockWithCode,
    yearlyPrice,
    monthlyPrice,
    strikeYearlyPrice,
    billingBusy,
  } = useProStatus();

  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly">("yearly");
  const [showVipInput, setShowVipInput] = useState(false);
  const [code, setCode] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "error" | "info" | "success"; text: string } | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const handleSubscribe = async () => {
    setStatusMsg(null);
    const res = await subscribePlan(selectedPlan);
    if (res.ok) {
      setStatusMsg({ type: "success", text: "Welcome to My AI Notebook Pro! Everything is unlocked." });
      setTimeout(() => {
        onOpenChange(false);
        setStatusMsg(null);
      }, 1100);
      return;
    }
    if (!res.cancelled && res.message) {
      setStatusMsg({ type: "info", text: res.message });
    }
  };

  const handleRestore = async () => {
    setStatusMsg(null);
    const res = await restoreProPurchases();
    if (res.restored) {
      setStatusMsg({ type: "success", text: "Your Google Play Pro subscription has been restored!" });
      setTimeout(() => {
        onOpenChange(false);
        setStatusMsg(null);
      }, 1100);
    } else if (res.message) {
      setStatusMsg({ type: "info", text: res.message });
    }
  };

  const handleRedeem = async () => {
    setStatusMsg(null);
    if (!code.trim()) {
      setStatusMsg({ type: "error", text: "Please enter a code." });
      return;
    }
    setRedeeming(true);
    const ok = await unlockWithCode(code.trim());
    setRedeeming(false);
    if (ok) {
      setStatusMsg({ type: "success", text: "Pro unlocked — enjoy!" });
      setTimeout(() => {
        onOpenChange(false);
        setStatusMsg(null);
        setCode("");
      }, 1100);
    } else {
      setStatusMsg({ type: "error", text: "That code isn't valid. Double-check and try again." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[430px] border-amber-700/30 bg-[#fcf7ee] text-[#2a1f16]">
        <DialogHeader className="space-y-1.5 text-left">
          {featureName && (
            <div className="inline-flex items-center gap-1.5 w-fit px-2.5 py-0.5 rounded-full bg-amber-600/15 text-amber-900 text-[11px] font-semibold">
              <Crown className="h-3 w-3 text-amber-700" />
              <span>{featureName}</span>
            </div>
          )}
          <DialogTitle className="font-serif text-xl leading-snug text-[#261a10]">
            Why not purchase the whole year for half price at only {yearlyPrice}?
          </DialogTitle>
          <p className="text-xs text-[#6e5844]">
            Unlock every stationery, photo keepsake tool, and unlimited Aria &amp; Aether AI creations.
          </p>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          {/* Two-Plan Selector: Whole Year (50% OFF Default) vs Monthly */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Yearly Half-Price Card */}
            <button
              type="button"
              onClick={() => setSelectedPlan("yearly")}
              className={`relative text-left rounded-xl p-3 border-2 transition-all ${
                selectedPlan === "yearly"
                  ? "border-amber-700 bg-amber-500/12 shadow-sm"
                  : "border-[#dfcfb8] bg-white/70 hover:border-amber-700/50"
              }`}
            >
              <span className="absolute -top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-amber-700 text-[#fff9ef] text-[10px] font-bold tracking-wide uppercase shadow-xs">
                50% OFF · Half Price
              </span>
              <div className="mt-1 text-xs font-semibold text-[#5c4430]">Whole Year</div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-serif text-2xl font-bold text-[#24180e]">{yearlyPrice}</span>
                <span className="text-[11px] line-through text-[#8c7560]">{strikeYearlyPrice}</span>
              </div>
              <div className="text-[11px] font-medium text-amber-900 mt-0.5">
                Just $1.99/mo · Billed yearly
              </div>
            </button>

            {/* Monthly Card */}
            <button
              type="button"
              onClick={() => setSelectedPlan("monthly")}
              className={`relative text-left rounded-xl p-3 border-2 transition-all ${
                selectedPlan === "monthly"
                  ? "border-amber-700 bg-amber-500/12 shadow-sm"
                  : "border-[#dfcfb8] bg-white/70 hover:border-amber-700/50"
              }`}
            >
              <div className="mt-1 text-xs font-semibold text-[#5c4430]">Monthly</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-serif text-2xl font-bold text-[#24180e]">{monthlyPrice}</span>
                <span className="text-xs text-[#6e5844]">/mo</span>
              </div>
              <div className="text-[11px] text-[#6e5844] mt-0.5">
                Flexible · Cancel anytime
              </div>
            </button>
          </div>

          {/* What's Included */}
          <div className="rounded-xl bg-white/75 border border-[#e5d7c3] px-3.5 py-2.5">
            <p className="text-[11px] font-semibold text-[#6e5844] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-700" />
              Everything included in Pro
            </p>
            <ul className="space-y-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-[#2e2116]">
                  <Check className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Primary Subscribe CTA */}
          <Button
            className="w-full h-11 font-semibold text-sm bg-[#7c4a1e] hover:bg-[#663b16] text-[#fffaf2] shadow-md"
            disabled={billingBusy}
            onClick={() => void handleSubscribe()}
            data-testid="button-subscribe-pro"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            {billingBusy
              ? "Connecting to Google Play…"
              : selectedPlan === "yearly"
                ? `Get Whole Year Half Price — ${yearlyPrice}/yr`
                : `Subscribe Monthly — ${monthlyPrice}/mo`}
          </Button>

          {statusMsg && (
            <div
              className={`rounded-lg px-3 py-2 text-xs font-medium ${
                statusMsg.type === "error"
                  ? "bg-red-500/10 text-red-700 border border-red-500/25"
                  : statusMsg.type === "success"
                    ? "bg-emerald-500/12 text-emerald-800 border border-emerald-600/25"
                    : "bg-amber-500/12 text-[#4a341e] border border-amber-700/25"
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          {/* Footer links: Google Play Cancel Anytime + Restore + VIP Code */}
          <div className="flex items-center justify-between text-[11px] text-[#7a6450] pt-0.5">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />
              Cancel anytime on Google Play
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleRestore()}
                disabled={billingBusy}
                className="inline-flex items-center gap-1 hover:text-[#2a1f16] underline-offset-2 hover:underline"
              >
                <RotateCcw className="h-3 w-3" />
                Restore
              </button>
              <button
                type="button"
                onClick={() => setShowVipInput((v) => !v)}
                className="inline-flex items-center gap-1 hover:text-[#2a1f16] underline-offset-2 hover:underline"
              >
                <Gift className="h-3 w-3" />
                VIP Code
              </button>
            </div>
          </div>

          {showVipInput && (
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Enter VIP / Founder code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setStatusMsg(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && !redeeming && void handleRedeem()}
                disabled={redeeming}
                className="flex-1 uppercase placeholder:normal-case text-xs h-9 bg-white"
              />
              <Button
                variant="outline"
                onClick={() => void handleRedeem()}
                disabled={redeeming}
                className="shrink-0 text-xs h-9"
              >
                {redeeming ? "Checking…" : "Unlock"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
