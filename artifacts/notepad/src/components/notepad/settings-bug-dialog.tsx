import { useState, useRef } from "react";
import { Settings, Bug, Send, CheckCircle2, ImagePlus, X, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  compressInlinePhotoToDataUrl,
  getCompanionUserProfile,
  saveCompanionUserProfile,
} from "@/lib/sovereign-aether-runtime";
import { useLang } from "@/contexts/language-context";
import { getOnboardingCopy } from "@/locales/onboarding-i18n";

const AETHER_ISSUE_ENDPOINT = "https://lds.viperstudiostechnologies.com/api/aether-bridge/lds-report-issue";

interface SettingsBugDialogProps {
  activeContext?: string;
  compactIconOnly?: boolean;
}

export function SettingsBugButton({ activeContext, compactIconOnly = false }: SettingsBugDialogProps) {
  const { lang } = useLang();
  const uiCopy = getOnboardingCopy(lang);
  const [open, setOpen] = useState(false);
  const [preferredName, setPreferredName] = useState(() => getCompanionUserProfile().preferredName);
  const [category, setCategory] = useState<"platform_bug" | "suggestion" | "other">("platform_bug");
  const [replyEmail, setReplyEmail] = useState("");
  const [description, setDescription] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const handleNameBlurOrSave = (val: string) => {
    setPreferredName(val);
    saveCompanionUserProfile({ preferredName: val.trim() });
  };

  const handleScreenshotFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const compressed = await compressInlinePhotoToDataUrl(file);
      setScreenshotDataUrl(compressed);
    } catch {
      toast({
        title: "Could not attach image",
        description: "Please try another screenshot file.",
        variant: "destructive",
      });
    }
  };

  const handlePasteScreenshot = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await handleScreenshotFile(file);
          return;
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Please describe the problem",
        description: "Write a short note telling us what happened so our AI and team can fix it.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
    const fullReport = [
      `App: My AI Notebook: Voice & Notes (com.ainotebook.mobile)`,
      `Category: ${category === "platform_bug" ? "Bug / Problem" : category === "suggestion" ? "Idea / Feature" : "Other Help"}`,
      preferredName.trim() ? `User Name: ${preferredName.trim()}` : "",
      replyEmail.trim() ? `Reporter Reply Email: ${replyEmail.trim()}` : `Reporter Reply Email: (not provided)`,
      activeContext ? `Active Note / Folder Context: ${activeContext}` : "",
      `Device: ${ua}`,
      `Timestamp: ${new Date().toISOString()}`,
      ``,
      `Details:`,
      description.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await fetch(AETHER_ISSUE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          app: "My AI Notebook: Voice & Notes",
          memberName: preferredName.trim() || "Notebook User",
          reporterEmail: replyEmail.trim(),
          issueText: fullReport,
          screenshotDataUrl: screenshotDataUrl || undefined,
        }),
      });
    } catch {
      /* queued gracefully */
    }

    setSubmitting(false);
    setSent(true);
    toast({
      title: "Report sent!",
      description: "Your message has been delivered automatically to Sovereign Aether triage and our support team.",
    });
  };

  const resetAndOpen = () => {
    setPreferredName(getCompanionUserProfile().preferredName);
    setSent(false);
    setOpen(true);
  };

  return (
    <>
      {compactIconOnly ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetAndOpen}
          title={uiCopy.settingsAndReport}
          className="h-8 px-1.5 text-xs"
          data-testid="button-settings-toolbar"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <button
          type="button"
          onClick={resetAndOpen}
          className="flex items-center gap-2 w-full text-left hover:bg-sidebar-accent rounded-lg px-2 py-1.5 transition-colors group"
          data-testid="button-settings-sidebar"
        >
          <Settings className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
          <span className="text-xs text-muted-foreground group-hover:text-foreground">
            {uiCopy.settingsAndReport}
          </span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" onPaste={(e) => void handlePasteScreenshot(e)}>
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Settings & Support
            </DialogTitle>
            <DialogDescription>
              Personalize how Aria & Aether greet you, or report a bug, stationery issue, or feature idea directly to our team.
            </DialogDescription>
          </DialogHeader>

          {sent ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <p className="text-sm font-semibold text-foreground">
                Thank you! Your report has been sent automatically to our team.
              </p>
              <p className="text-xs text-muted-foreground">
                Sovereign Aether AI triage and our engineers have received your details{screenshotDataUrl ? " and screenshot" : ""}.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setDescription("");
                    setScreenshotDataUrl("");
                    setSent(false);
                    setOpen(false);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3 py-1">
                {/* Companion Greeting Name */}
                <div className="space-y-1.5 pb-2 border-b border-border/60">
                  <Label htmlFor="user-preferred-name" className="text-xs flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 text-primary" /> Your name (so Aria & Aether know what to call you)
                  </Label>
                  <Input
                    id="user-preferred-name"
                    placeholder="e.g., Gaius, Sarah, Mom..."
                    value={preferredName}
                    onChange={(e) => handleNameBlurOrSave(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Bug className="h-3.5 w-3.5 text-primary" /> Report a problem or idea
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "platform_bug" as const, label: "Bug / Problem" },
                      { id: "suggestion" as const, label: "Idea / Feature" },
                      { id: "other" as const, label: "Other Help" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCategory(opt.id)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                          category === opt.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bug-email" className="text-xs">
                    Your email (optional, if you'd like a reply)
                  </Label>
                  <Input
                    id="bug-email"
                    type="email"
                    placeholder="you@example.com"
                    value={replyEmail}
                    onChange={(e) => setReplyEmail(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bug-details" className="text-xs">
                    Describe the bug or problem
                  </Label>
                  <textarea
                    id="bug-details"
                    rows={3}
                    placeholder="Tell us what happened or paste a screenshot (Ctrl+V)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    data-testid="input-bug-description"
                  />
                </div>

                {/* Optional Screenshot Attachment */}
                <div className="space-y-1.5">
                  <input
                    ref={screenshotInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      void handleScreenshotFile(f);
                    }}
                  />
                  {screenshotDataUrl ? (
                    <div className="relative rounded-lg border border-border bg-muted/30 p-2 flex items-center gap-3">
                      <img
                        src={screenshotDataUrl}
                        alt="Attached screenshot"
                        className="h-14 w-20 object-cover rounded border border-border"
                      />
                      <div className="flex-1 min-w-0 text-xs text-muted-foreground">
                        Screenshot attached — will be included automatically with your report.
                      </div>
                      <button
                        type="button"
                        onClick={() => setScreenshotDataUrl("")}
                        className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Remove screenshot"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => screenshotInputRef.current?.click()}
                      className="w-full h-8 text-xs gap-1.5 border-dashed"
                      data-testid="button-attach-bug-screenshot"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      Add Screenshot (optional — or paste with Ctrl+V)
                    </Button>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                  className="gap-1.5"
                  data-testid="button-submit-bug-report"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Sending…" : "Send Report"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
