import { useState } from "react";
import { useLang, LANGUAGES, LangCode } from "@/contexts/language-context";

const CONTINUE_LABELS: Partial<Record<LangCode, string>> = {
  en: "Continue →", zh: "继续 →", hi: "जारी रखें →", es: "Continuar →",
  ar: "متابعة →", fr: "Continuer →", bn: "চালিয়ে যান →", pt: "Continuar →",
  ru: "Продолжить →", ja: "続ける →", de: "Weiter →", ko: "계속 →",
  vi: "Tiếp Tục →", it: "Continua →", th: "ดำเนินการต่อ →", fil: "Magpatuloy →",
  tr: "Devam Et →", pl: "Kontynuuj →", nl: "Doorgaan →", id: "Lanjutkan →",
  uk: "Продовжити →", ms: "Teruskan →", no: "Fortsett →", sv: "Fortsätt →",
  da: "Fortsæt →", sw: "Endelea →",
};

const SUBTITLE_LABELS: Partial<Record<LangCode, string>> = {
  en: "Choose your language", zh: "请选择您的语言", hi: "अपनी भाषा चुनें",
  es: "Elige tu idioma", ar: "اختر لغتك", fr: "Choisissez votre langue",
  bn: "আপনার ভাষা বেছে নিন", pt: "Escolha seu idioma", ru: "Выберите язык",
  ja: "言語を選択", de: "Sprache wählen", ko: "언어 선택",
  vi: "Chọn Ngôn Ngữ", it: "Scegli la tua lingua", th: "เลือกภาษาของคุณ",
  fil: "Piliin ang Iyong Wika", tr: "Dilinizi Seçin", pl: "Wybierz język",
  nl: "Kies je taal", id: "Pilih Bahasa Anda", uk: "Виберіть мову",
  ms: "Pilih Bahasa Anda", no: "Velg språk", sv: "Välj språk",
  da: "Vælg sprog", sw: "Chagua Lugha Yako",
};

export function LanguageSelector() {
  const { lang, setLang, confirmChoice } = useLang();
  const [selected, setSelected] = useState<LangCode>(lang);
  const [search, setSearch] = useState("");

  const filtered = LANGUAGES.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.label.toLowerCase().includes(q) ||
      l.nativeLabel.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  });

  const handleContinue = () => {
    setLang(selected);
    confirmChoice();
  };

  const subtitle = SUBTITLE_LABELS[selected] ?? "Choose your language";
  const continueLabel = CONTINUE_LABELS[selected] ?? "Continue →";

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-background px-4 py-8">
      <div className="w-full max-w-md flex flex-col items-center">

        {/* Icon + Title */}
        <div className="flex items-center gap-3 mb-1">
          <img
            src="/icons/icon-192.png"
            alt="My AI Notebook"
            className="w-12 h-12 rounded-2xl shadow-md"
          />
          <h1 className="text-3xl font-serif font-bold text-foreground">
            My AI Notebook
          </h1>
        </div>
        <p className="text-muted-foreground text-sm mb-4 text-center">{subtitle}</p>

        {/* Search */}
        <div className="w-full mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search language... / Buscar idioma..."
            className="w-full px-4 py-2.5 rounded-xl bg-white text-foreground placeholder:text-muted-foreground border border-border outline-none focus:border-primary text-sm"
          />
        </div>

        {/* Language grid — scrollable */}
        <div className="w-full overflow-y-auto max-h-[52vh] rounded-2xl pr-0.5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,0,0,0.15) transparent" }}>
          <div className="grid grid-cols-2 gap-2">
            {filtered.length === 0 && (
              <p className="col-span-2 text-center text-muted-foreground py-6 text-sm">No languages found</p>
            )}
            {filtered.map((language) => (
              <button
                key={language.code}
                onClick={() => setSelected(language.code)}
                className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 transition-all text-left ${
                  selected === language.code
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-white text-foreground border-border hover:bg-accent"
                }`}
              >
                <span className="text-xl shrink-0">{language.flag}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-none mb-0.5 truncate">{language.nativeLabel}</p>
                  <p className={`text-xs truncate ${selected === language.code ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {language.label}
                  </p>
                </div>
                {selected === language.code && (
                  <span className="ml-auto shrink-0 font-bold text-base">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Continue */}
        <button
          onClick={handleContinue}
          className="w-full mt-4 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-md hover:bg-primary/90 transition-colors"
        >
          {continueLabel}
        </button>

        <p className="text-muted-foreground/60 text-xs mt-3 text-center">
          You can change this anytime in the app
        </p>
      </div>
    </div>
  );
}
