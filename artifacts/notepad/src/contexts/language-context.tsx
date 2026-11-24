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
import { WORLD_LANGUAGE_PACK, type WorldLanguageEntry } from "@/locales/world-languages-pack";

export type LangCode = string;

export const LANGUAGES: {
  code: LangCode;
  label: string;
  nativeLabel: string;
  flag: string;
  speechLang: string;
  rtl: boolean;
}[] = WORLD_LANGUAGE_PACK.map((entry) => ({
  code: entry.code,
  label: entry.label,
  nativeLabel: entry.nativeLabel,
  flag: entry.flag,
  speechLang: entry.speechLang,
  rtl: entry.rtl,
}));

const legacyTranslations: Record<string, typeof en> = {
  en, zh, ru, es, fr, pt, fil, no, ar, hi, de, ja,
  ko, it, nl, id, tr, pl, vi, th, sv, da, uk, ms, bn, sw,
};

type Translations = typeof en;

interface LanguageContextValue {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: Translations;
  worldEntry: WorldLanguageEntry;
  isRtl: boolean;
  speechLang: string;
  hasChosen: boolean;
  confirmChoice: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function findWorldEntry(code: string): WorldLanguageEntry {
  return (
    WORLD_LANGUAGE_PACK.find((l) => l.code === code) ||
    WORLD_LANGUAGE_PACK.find((l) => l.code === code.split("-")[0]) ||
    WORLD_LANGUAGE_PACK[0]
  );
}

function buildFullTranslations(code: string, entry: WorldLanguageEntry): Translations {
  const base = legacyTranslations[code] || legacyTranslations[code.split("-")[0]] || en;
  return {
    ...base,
    myNotepad: entry.ui.myNotepad || base.myNotepad,
    welcomeTitle: entry.ui.welcomeTitle || base.welcomeTitle,
    welcomeSubtitle: entry.ui.welcomeSubtitle || base.welcomeSubtitle,
    startWriting: entry.ui.startWriting || base.startWriting,
    dictate: entry.ui.dictate || base.dictate,
    listening: entry.ui.listening || base.listening,
    saved: entry.ui.saved || base.saved,
    createNewNote: entry.ui.createNewNote || base.createNewNote,
    titleLabel: entry.ui.titleLabel || base.titleLabel,
    sectionLabel: entry.ui.sectionLabel || base.sectionLabel,
    createNote: entry.ui.createNote || base.createNote,
    cancel: entry.ui.cancel || base.cancel,
    delete: entry.ui.delete || base.delete,
    section: `${entry.ui.sectionLabel}:`,
  };
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    const saved = localStorage.getItem("notepad-lang");
    if (saved && WORLD_LANGUAGE_PACK.some((l) => l.code === saved)) return saved;
    if (typeof navigator !== "undefined") {
      const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
      for (const raw of candidates) {
        if (!raw) continue;
        const exact = WORLD_LANGUAGE_PACK.find((l) => l.code.toLowerCase() === raw.toLowerCase());
        if (exact) return exact.code;
        if (raw.toLowerCase().startsWith("zh-tw") || raw.toLowerCase().startsWith("zh-hk")) return "zh-TW";
        const prefix = raw.toLowerCase().split("-")[0];
        if (prefix === "tl") return "fil";
        if (prefix === "nb" || prefix === "nn") return "no";
        if (prefix === "iw") return "he";
        const byPrefix = WORLD_LANGUAGE_PACK.find((l) => l.code.toLowerCase() === prefix);
        if (byPrefix) return byPrefix.code;
      }
    }
    return "en";
  });

  const [hasChosen, setHasChosen] = useState(() => {
    return localStorage.getItem("notepad-lang-chosen") === "true";
  });

  const setLang = (code: LangCode) => {
    const entry = findWorldEntry(code);
    setLangState(entry.code);
    localStorage.setItem("notepad-lang", entry.code);
    localStorage.setItem("notepad-speech-lang", entry.speechLang);
    localStorage.setItem("notepad-lang-label", `${entry.nativeLabel} (${entry.label})`);
  };

  const confirmChoice = () => {
    localStorage.setItem("notepad-lang-chosen", "true");
    setHasChosen(true);
  };

  const worldEntry = findWorldEntry(lang);
  const t = buildFullTranslations(lang, worldEntry);

  return (
    <LanguageContext.Provider
      value={{
        lang: worldEntry.code,
        setLang,
        t,
        worldEntry,
        isRtl: worldEntry.rtl,
        speechLang: worldEntry.speechLang,
        hasChosen,
        confirmChoice,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
