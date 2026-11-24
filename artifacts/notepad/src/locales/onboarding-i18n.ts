import { WORLD_LANGUAGE_PACK, type WorldLanguageEntry } from "@/locales/world-languages-pack";

export type OnboardingCopy = WorldLanguageEntry["onboarding"] & {
  ui: WorldLanguageEntry["ui"];
  rtl: boolean;
  speechLang: string;
};

export function getOnboardingCopy(lang: string): OnboardingCopy {
  const found =
    WORLD_LANGUAGE_PACK.find((l) => l.code === lang) ||
    WORLD_LANGUAGE_PACK.find((l) => l.code === lang.split("-")[0]) ||
    WORLD_LANGUAGE_PACK[0];
  return {
    ...found.onboarding,
    ui: found.ui,
    rtl: found.rtl,
    speechLang: found.speechLang,
  };
}
