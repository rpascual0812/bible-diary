export type BibleTranslationId =
  | "kjv"
  | "web"
  | "asv"
  | "bbe"
  | "darby"
  | "dra"
  | "ylt"
  | "webbe"
  | "oeb-cw"
  | "oeb-us"
  | "clementine"
  | "almeida"
  | "cuv"
  | "cherokee"
  | "bkr"
  | "rccv";

export interface BibleTranslationOption {
  id: BibleTranslationId;
  label: string;
  abbreviation: string;
  language: string;
}

export const DEFAULT_BIBLE_TRANSLATION: BibleTranslationId = "kjv";

export const BIBLE_TRANSLATION_OPTIONS: BibleTranslationOption[] = [
  { id: "kjv", label: "King James Version", abbreviation: "KJV", language: "English" },
  { id: "web", label: "World English Bible", abbreviation: "WEB", language: "English" },
  { id: "asv", label: "American Standard Version", abbreviation: "ASV", language: "English" },
  { id: "bbe", label: "Bible in Basic English", abbreviation: "BBE", language: "English" },
  { id: "darby", label: "Darby Bible", abbreviation: "DARBY", language: "English" },
  { id: "dra", label: "Douay-Rheims 1899", abbreviation: "DRA", language: "English" },
  { id: "ylt", label: "Young's Literal Translation", abbreviation: "YLT", language: "English" },
  { id: "webbe", label: "World English Bible (British)", abbreviation: "WEBBE", language: "English (UK)" },
  { id: "oeb-cw", label: "Open English Bible (Commonwealth)", abbreviation: "OEB-CW", language: "English (UK)" },
  { id: "oeb-us", label: "Open English Bible (US)", abbreviation: "OEB-US", language: "English (US)" },
  { id: "clementine", label: "Clementine Latin Vulgate", abbreviation: "VULG", language: "Latin" },
  { id: "almeida", label: "João Ferreira de Almeida", abbreviation: "ALMEIDA", language: "Portuguese" },
  { id: "cuv", label: "Chinese Union Version", abbreviation: "CUV", language: "Chinese" },
  { id: "cherokee", label: "Cherokee New Testament", abbreviation: "CHEROKEE", language: "Cherokee" },
  { id: "bkr", label: "Bible kralická", abbreviation: "BKR", language: "Czech" },
  { id: "rccv", label: "Romanian Cornilescu", abbreviation: "RCCV", language: "Romanian" },
];

const VALID_IDS = new Set(BIBLE_TRANSLATION_OPTIONS.map((option) => option.id));

export function normalizeBibleTranslation(value: string | null | undefined): BibleTranslationId {
  if (value && VALID_IDS.has(value as BibleTranslationId)) {
    return value as BibleTranslationId;
  }
  return DEFAULT_BIBLE_TRANSLATION;
}

export function getBibleTranslationOption(
  id: BibleTranslationId,
): BibleTranslationOption {
  return (
    BIBLE_TRANSLATION_OPTIONS.find((option) => option.id === id) ??
    BIBLE_TRANSLATION_OPTIONS[0]
  );
}

export function getBibleTranslationAbbreviation(id: BibleTranslationId): string {
  return getBibleTranslationOption(id).abbreviation;
}
