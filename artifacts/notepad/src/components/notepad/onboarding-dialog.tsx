import { useState } from "react";
import { Globe, UserRound, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLang, LANGUAGES } from "@/contexts/language-context";
import {
  getCompanionUserProfile,
  saveCompanionUserProfile,
} from "@/lib/sovereign-aether-runtime";

export function FirstLaunchOnboardingDialog() {
  const { lang, setLang } = useLang();
  const existing = getCompanionUserProfile();
  const [open, setOpen] = useState(() => !existing.onboardingCompleted);
  const [preferredName, setPreferredName] = useState(existing.preferredName);
  const [birthDate, setBirthDate] = useState(existing.birthDate);
  const [aboutYou, setAboutYou] = useState(existing.aboutYou);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCompanionUserProfile({
      preferredName: preferredName.trim(),
      birthDate: birthDate.trim(),
      aboutYou: aboutYou.trim(),
      onboardingCompleted: true,
    });
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          saveCompanionUserProfile({ onboardingCompleted: true });
          setOpen(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Welcome to My AI Notebook
          </DialogTitle>
          <DialogDescription>
            This is so Aether and Aria can get to know you a little better. You can update these anytime in Settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* 1. Select Language First */}
          <div className="space-y-1.5">
            <Label htmlFor="onboard-language" className="text-xs font-medium flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary" />
              1. Select your language
            </Label>
            <select
              id="onboard-language"
              value={lang}
              onChange={(e) => setLang(e.target.value as any)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid="select-onboard-language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.nativeLabel} ({l.label})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Preferred Name */}
          <div className="space-y-1.5">
            <Label htmlFor="onboard-name" className="text-xs font-medium flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 text-primary" />
              2. What would you like Aether or Aria to call you?
            </Label>
            <Input
              id="onboard-name"
              placeholder="Your first name or nickname"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              className="h-9 text-sm"
              data-testid="input-onboard-name"
            />
          </div>

          {/* 3. Birth Date */}
          <div className="space-y-1.5">
            <Label htmlFor="onboard-birthdate" className="text-xs font-medium flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              3. Your birth date (optional)
            </Label>
            <Input
              id="onboard-birthdate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="h-9 text-sm"
              data-testid="input-onboard-birthdate"
            />
          </div>

          {/* 4. About You */}
          <div className="space-y-1.5">
            <Label htmlFor="onboard-about" className="text-xs font-medium">
              4. What would you like your AI to know about you? (optional)
            </Label>
            <textarea
              id="onboard-about"
              rows={3}
              placeholder="For example: hobbies, favorite recipes, family, writing interests, or anything you'd like Aether and Aria to remember..."
              value={aboutYou}
              onChange={(e) => setAboutYou(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              data-testid="input-onboard-about"
            />
          </div>

          <Button type="submit" className="w-full font-semibold" data-testid="button-onboard-submit">
            Continue to My Notebook
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
