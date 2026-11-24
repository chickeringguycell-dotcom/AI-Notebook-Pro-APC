import { useState } from "react";
import { Sparkles, Lock, Check, Gift } from "lucide-react";
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
  "Unlimited custom sections & pages (Recipes, Religion, Poems & more)",
  "Aria & Aether AI Writing, Storytelling & Poetry Studio",
  "All 42 custom stationeries, 9 fonts & ink colors",
  "Voice dictation & companion neural voices",
];

interface ProGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

export function ProGateModal({ open, onOpenChange, featureName }: ProGateModalProps) {
  const { unlockWithCode } = useProStatus();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const handleRedeem = async () => {
    setError("");
    if (!code.trim()) {
      setError("Please enter a code.");
      return;
    }
    setRedeeming(true);
    const ok = await unlockWithCode(code.trim());
    setRedeeming(false);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setCode("");
      }, 1200);
    } else {
      setError("That code isn't valid. Double-check and try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            {featureName ? `${featureName} is a Pro feature` : "Pro feature"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Feature pill */}
          <div className="rounded-xl bg-primary/8 border border-primary/15 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              What you unlock with Pro
            </p>
            <ul className="space-y-1.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing */}
          <div className="text-center py-1">
            <span className="font-serif text-3xl font-bold text-foreground">$6</span>
            <span className="text-muted-foreground text-sm">/month</span>
            <p className="text-xs text-muted-foreground mt-0.5">Cancel any time</p>
          </div>

          {/* Upgrade button */}
          <Button
            className="w-full font-semibold"
            onClick={() => {
              window.open("/landing/#pricing", "_blank");
            }}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            Upgrade to Pro
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Gift className="h-3 w-3" /> Have an invite?
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Invite code */}
          {success ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-primary">
              <Check className="h-4 w-4" />
              Pro unlocked — enjoy!
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter invite code"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && !redeeming && handleRedeem()}
                  disabled={redeeming}
                  className="flex-1 uppercase placeholder:normal-case text-sm"
                />
                <Button variant="outline" onClick={handleRedeem} disabled={redeeming} className="shrink-0 text-sm">
                  {redeeming ? "Redeeming…" : "Redeem"}
                </Button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
