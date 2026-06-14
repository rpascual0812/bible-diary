import type { LangType } from "./types";

export const LANGUAGE_NAMES: Record<LangType, string> = {
  en: "English",
  fil: "Filipino (Tagalog)",
  ceb: "Cebuano",
  bik: "Bicolano",
  ilo: "Ilocano",
  hil: "Hiligaynon",
  es: "Spanish",
  la: "Latin",
  el: "Greek",
};

export const LANG_OPTIONS: { code: LangType; label: string; native?: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "fil", label: "Filipino", native: "Tagalog" },
  { code: "ceb", label: "Cebuano", native: "Sinugboanon" },
  { code: "bik", label: "Bicolano", native: "Bicolano" },
  { code: "ilo", label: "Ilocano", native: "Ilokano" },
  { code: "hil", label: "Hiligaynon", native: "Hiligaynon" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "la", label: "Latin", native: "Latina" },
  { code: "el", label: "Greek", native: "Ελληνικά" },
];

export function getLanguageName(lang: LangType): string {
  return LANGUAGE_NAMES[lang] ?? LANGUAGE_NAMES.en;
}
