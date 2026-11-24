import { useState } from "react";
import { Globe, UserRound, Calendar, Sparkles, ChevronDown, Check, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang, LANGUAGES, LangCode } from "@/contexts/language-context";
import { getOnboardingCopy } from "@/locales/onboarding-i18n";
import {
  getCompanionUserProfile,
  saveCompanionUserProfile,
} from "@/lib/sovereign-aether-runtime";

export function FirstLaunchOnboardingDialog() {
  const { lang, setLang, confirmChoice } = useLang();
  const existing = getCompanionUserProfile();
  const forcePreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("onboarding") === "1";
  const [open, setOpen] = useState(() => !existing.onboardingCompleted || forcePreview);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [preferredName, setPreferredName] = useState(existing.preferredName);
  const [birthDate, setBirthDate] = useState(existing.birthDate);
  const [aboutYou, setAboutYou] = useState(existing.aboutYou);

  const activeLang = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const copy = getOnboardingCopy(lang);
  const isRtl = copy.rtl;

  const filteredLanguages = LANGUAGES.filter((l) => {
    const q = langSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      l.nativeLabel.toLowerCase().includes(q) ||
      l.label.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  });

  const clearOnboardingParam = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("onboarding")) {
      url.searchParams.delete("onboarding");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  };

  const finishOnboarding = () => {
    confirmChoice();
    saveCompanionUserProfile({
      preferredName: preferredName.trim(),
      birthDate: birthDate.trim(),
      aboutYou: aboutYou.trim(),
      onboardingCompleted: true,
    });
    clearOnboardingParam();
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    finishOnboarding();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-dialog-title"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={finishOnboarding}
          aria-label={copy.closeLabel}
          className={`absolute top-4 rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary ${
            isRtl ? "left-4" : "right-4"
          }`}
          data-testid="button-onboard-close"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className={`space-y-1.5 ${isRtl ? "pl-6" : "pr-6"}`}>
          <h2
            id="onboarding-dialog-title"
            className="font-serif text-xl font-semibold leading-snug tracking-tight flex items-center gap-2 text-foreground"
          >
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <span>{copy.title}</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {copy.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* 1. Select Language First — 112 World & American Languages in Their Native Script */}
          <div className="space-y-1.5 relative">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{copy.q1Language}</span>
            </Label>
            <button
              type="button"
              onClick={() => setLangMenuOpen((v) => !v)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground flex items-center justify-between hover:bg-accent/40 focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid="select-onboard-language"
            >
              <span className="flex items-center gap-2 truncate">
                <span>{activeLang.flag}</span>
                <span className="font-semibold">{activeLang.nativeLabel}</span>
                {activeLang.nativeLabel !== activeLang.label && (
                  <span className="text-muted-foreground text-xs">({activeLang.label})</span>
                )}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                  langMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {langMenuOpen && (
              <div className="absolute left-0 right-0 top-[62px] z-50 rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
                <div className="p-2 border-b border-border bg-background/60 flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder="🌐 English / Español / 中文 / Русский / العربية / हिन्दी…"
                    className="w-full bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {filteredLanguages.map((l) => {
                    const isSelected = l.code === lang;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          setLang(l.code as LangCode);
                          setLangMenuOpen(false);
                          setLangSearch("");
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-accent transition-colors ${
                          isSelected ? "bg-primary/10 font-semibold text-primary" : "text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span>{l.flag}</span>
                          <span className="font-semibold">{l.nativeLabel}</span>
                          {l.nativeLabel !== l.label && (
                            <span className="text-xs text-muted-foreground">({l.label})</span>
                          )}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. Preferred Name */}
          <div className="space-y-1.5">
            <Label htmlFor="onboard-name" className="text-xs font-medium flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{copy.q2Name}</span>
            </Label>
            <Input
              id="onboard-name"
              placeholder={copy.q2Placeholder}
              value={preferredName}
              onFocus={() => setLangMenuOpen(false)}
              onChange={(e) => setPreferredName(e.target.value)}
              className="h-9 text-sm"
              data-testid="input-onboard-name"
            />
          </div>

          {/* 3. Birth Date */}
          <div className="space-y-1.5">
            <Label htmlFor="onboard-birthdate" className="text-xs font-medium flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{copy.q3BirthDate}</span>
            </Label>
            <Input
              id="onboard-birthdate"
              type="date"
              lang={lang}
              value={birthDate}
              onFocus={() => setLangMenuOpen(false)}
              onChange={(e) => setBirthDate(e.target.value)}
              className="h-9 text-sm"
              data-testid="input-onboard-birthdate"
            />
          </div>

          {/* 4. About You */}
          <div className="space-y-1.5">
            <Label htmlFor="onboard-about" className="text-xs font-medium block">
              {copy.q4AboutYou}
            </Label>
            <textarea
              id="onboard-about"
              rows={3}
              placeholder={copy.q4Placeholder}
              value={aboutYou}
              onFocus={() => setLangMenuOpen(false)}
              onChange={(e) => setAboutYou(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              data-testid="input-onboard-about"
            />
          </div>

          <Button type="submit" className="w-full font-semibold" data-testid="button-onboard-submit">
            {copy.continueBtn}
          </Button>
        </form>
      </div>
    </div>
  );
}
