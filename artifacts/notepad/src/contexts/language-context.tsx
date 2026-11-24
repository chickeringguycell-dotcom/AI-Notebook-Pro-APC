import { createContext, useContext, useState, ReactNode } from "react";
import en from "@/locales/en";
import zh from "@/locales/zh";
import ru from "@/locales/ru";
import es from "@/locales/es";
import fr from "@/locales/fr";
import pt from "@/locales/pt";
import fil from "@/locales/fil";
import no from "@/locales/no";
import ar from "@/locales/ar";
import hi from "@/locales/hi";
import de from "@/locales/de";
import ja from "@/locales/ja";
import ko from "@/locales/ko";
import it from "@/locales/it";
import nl from "@/locales/nl";
import id from "@/locales/id";
import tr from "@/locales/tr";
import pl from "@/locales/pl";
import vi from "@/locales/vi";
import th from "@/locales/th";
import sv from "@/locales/sv";
import da from "@/locales/da";
import uk from "@/locales/uk";
import ms from "@/locales/ms";
import bn from "@/locales/bn";
import sw from "@/locales/sw";

export type LangCode =
  | "en" | "zh" | "ru" | "es" | "fr" | "pt"
  | "fil" | "no" | "ar" | "hi" | "de" | "ja"
  | "ko" | "it" | "nl" | "id" | "tr" | "pl"
  | "vi" | "th" | "sv" | "da" | "uk" | "ms"
  | "bn" | "sw";

export const LANGUAGES: { code: LangCode; label: string; nativeLabel: string; flag: string }[] = [
  { code: "en",  label: "English",    nativeLabel: "English",       flag: "🇺🇸" },
  { code: "zh",  label: "Chinese",    nativeLabel: "中文",           flag: "🇨🇳" },
  { code: "hi",  label: "Hindi",      nativeLabel: "हिन्दी",         flag: "🇮🇳" },
  { code: "es",  label: "Spanish",    nativeLabel: "Español",        flag: "🇪🇸" },
  { code: "ar",  label: "Arabic",     nativeLabel: "العربية",        flag: "🇸🇦" },
  { code: "fr",  label: "French",     nativeLabel: "Français",       flag: "🇫🇷" },
  { code: "bn",  label: "Bengali",    nativeLabel: "বাংলা",          flag: "🇧🇩" },
  { code: "pt",  label: "Portuguese", nativeLabel: "Português",      flag: "🇧🇷" },
  { code: "ru",  label: "Russian",    nativeLabel: "Русский",        flag: "🇷🇺" },
  { code: "ja",  label: "Japanese",   nativeLabel: "日本語",          flag: "🇯🇵" },
  { code: "de",  label: "German",     nativeLabel: "Deutsch",        flag: "🇩🇪" },
  { code: "ko",  label: "Korean",     nativeLabel: "한국어",          flag: "🇰🇷" },
  { code: "vi",  label: "Vietnamese", nativeLabel: "Tiếng Việt",    flag: "🇻🇳" },
  { code: "it",  label: "Italian",    nativeLabel: "Italiano",       flag: "🇮🇹" },
  { code: "th",  label: "Thai",       nativeLabel: "ภาษาไทย",        flag: "🇹🇭" },
  { code: "fil", label: "Filipino",   nativeLabel: "Filipino",       flag: "🇵🇭" },
  { code: "tr",  label: "Turkish",    nativeLabel: "Türkçe",         flag: "🇹🇷" },
  { code: "pl",  label: "Polish",     nativeLabel: "Polski",         flag: "🇵🇱" },
  { code: "nl",  label: "Dutch",      nativeLabel: "Nederlands",     flag: "🇳🇱" },
  { code: "id",  label: "Indonesian", nativeLabel: "Bahasa Indonesia",flag: "🇮🇩" },
  { code: "uk",  label: "Ukrainian",  nativeLabel: "Українська",     flag: "🇺🇦" },
  { code: "ms",  label: "Malay",      nativeLabel: "Bahasa Melayu",  flag: "🇲🇾" },
  { code: "no",  label: "Norwegian",  nativeLabel: "Norsk",          flag: "🇳🇴" },
  { code: "sv",  label: "Swedish",    nativeLabel: "Svenska",        flag: "🇸🇪" },
  { code: "da",  label: "Danish",     nativeLabel: "Dansk",          flag: "🇩🇰" },
  { code: "sw",  label: "Swahili",    nativeLabel: "Kiswahili",      flag: "🇹🇿" },
];

const translations: Record<LangCode, typeof en> = {
  en, zh, ru, es, fr, pt, fil, no, ar, hi, de, ja,
  ko, it, nl, id, tr, pl, vi, th, sv, da, uk, ms, bn, sw,
};

type Translations = typeof en;

interface LanguageContextValue {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: Translations;
  hasChosen: boolean;
  confirmChoice: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    return (localStorage.getItem("notepad-lang") as LangCode) || "en";
  });
  const [hasChosen, setHasChosen] = useState(() => {
    return localStorage.getItem("notepad-lang-chosen") === "true";
  });

  const setLang = (code: LangCode) => {
    setLangState(code);
    localStorage.setItem("notepad-lang", code);
  };

  const confirmChoice = () => {
    localStorage.setItem("notepad-lang-chosen", "true");
    setHasChosen(true);
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, hasChosen, confirmChoice }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
