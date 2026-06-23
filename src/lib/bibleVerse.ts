import { getCachedBibleTranslation } from "./bibleTranslationStorage";
import type { BibleTranslationId } from "./bibleTranslations";

export interface BibleVerseInfo {
  book: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
}

const BOOK_MAP: Record<string, string> = {
  genesis: "Genesis",
  exodo: "Exodus",
  levitico: "Leviticus",
  bilang: "Numbers",
  numero: "Numbers",
  deuteronomio: "Deuteronomy",
  josue: "Joshua",
  hukom: "Judges",
  rut: "Ruth",
  samuel: "Samuel",
  hari: "Kings",
  cronica: "Chronicles",
  esdras: "Ezra",
  nehemias: "Nehemiah",
  ester: "Esther",
  job: "Job",
  salmo: "Psalms",
  mgasalmo: "Psalms",
  "mga salmo": "Psalms",
  kawikaan: "Proverbs",
  mangangaral: "Ecclesiastes",
  "awit ng mga awit": "Song of Solomon",
  awit: "Song of Solomon",
  isaias: "Isaiah",
  jeremias: "Jeremiah",
  panaghoy: "Lamentations",
  ezekiel: "Ezekiel",
  daniel: "Daniel",
  hosea: "Hosea",
  joel: "Joel",
  amos: "Amos",
  obadias: "Obadiah",
  jonas: "Jonah",
  miqueas: "Micah",
  nahum: "Nahum",
  habacuc: "Habakkuk",
  sofonias: "Zephaniah",
  hageo: "Haggai",
  zacarias: "Zechariah",
  malakias: "Malachi",
  mateo: "Matthew",
  marcos: "Mark",
  lucas: "Luke",
  juan: "John",
  gawa: "Acts",
  "mga gawa": "Acts",
  roma: "Romans",
  corinto: "Corinthians",
  galacia: "Galatians",
  efeso: "Ephesians",
  filipos: "Philippians",
  colosas: "Colossians",
  tesalonica: "Thessalonians",
  timoteo: "Timothy",
  tito: "Titus",
  filemon: "Philemon",
  hebreo: "Hebrews",
  santiago: "James",
  pedro: "Peter",
  judas: "Jude",
  pahayag: "Revelation",
  apocalipsis: "Revelation",
};

export function cleanAndMapBook(bookName: string): string {
  const norm = bookName.toLowerCase().replace(/\s+/g, "").trim();
  const numberPrefixMatch = bookName.match(/^([1-3])\s*(.*)$/);
  if (numberPrefixMatch) {
    const num = numberPrefixMatch[1];
    const rest = numberPrefixMatch[2].toLowerCase().replace(/\s+/g, "").trim();
    const mappedRest = BOOK_MAP[rest] || bookName;
    return `${num} ${mappedRest}`;
  }
  return BOOK_MAP[norm] || bookName;
}

export function detectBibleVerse(text: string): BibleVerseInfo | null {
  if (!text) return null;

  const cleanText = text
    .replace(
      /^(?:please|paki|pakisuyo|paki-suyo|can\s+you\s+)?(?:read|show|open|find|basahin|basaha|basahon|basaen|hanapin|ipakita|isulat)\s+(?:ang|an|ti|the\s+)?/i,
      ""
    )
    .trim();

  const regex = /\b((?:[1-3]\s*)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)[\s:]+(\d+)(?:\s*-\s*(\d+))?/;
  const match = cleanText.match(regex);
  if (!match) return null;

  const book = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const startVerse = parseInt(match[3], 10);
  const endVerse = match[4] ? parseInt(match[4], 10) : undefined;

  const exclusions = [
    "what",
    "how",
    "why",
    "who",
    "when",
    "where",
    "the",
    "and",
    "they",
    "this",
    "that",
    "there",
    "their",
  ];
  if (exclusions.includes(book.toLowerCase())) {
    return null;
  }

  return { book, chapter, startVerse, endVerse };
}

export function formatVerseRef(info: BibleVerseInfo): string {
  const range = info.endVerse ? `-${info.endVerse}` : "";
  return `${info.book} ${info.chapter}:${info.startVerse}${range}`;
}

export function getPrevChapterRef(info: BibleVerseInfo): string | null {
  if (info.chapter <= 1) return null;
  return `${info.book} ${info.chapter - 1}:1`;
}

export function getNextChapterRef(info: BibleVerseInfo): string {
  return `${info.book} ${info.chapter + 1}:1`;
}

export function getBibleApiBase(): string {
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_BIBLE_API_URL) {
    return process.env.EXPO_PUBLIC_BIBLE_API_URL.replace(/\/$/, "");
  }
  if (typeof process !== "undefined" && process.env?.VITE_BIBLE_API_URL) {
    return process.env.VITE_BIBLE_API_URL.replace(/\/$/, "");
  }
  return "https://bible-api.com";
}

export async function fetchVerseText(
  info: BibleVerseInfo,
  translation?: BibleTranslationId,
): Promise<string> {
  const resolvedTranslation = translation ?? getCachedBibleTranslation();
  const searchBook = cleanAndMapBook(info.book);
  const range = info.endVerse ? `-${info.endVerse}` : "";
  const response = await fetch(
    `${getBibleApiBase()}/${encodeURIComponent(searchBook)}+${info.chapter}:${info.startVerse}${range}?translation=${encodeURIComponent(resolvedTranslation)}`
  );
  if (!response.ok) {
    throw new Error("Bible text not found");
  }
  const data = await response.json();
  if (!data.text) {
    throw new Error("No verse text found");
  }
  return data.text.trim();
}

export interface ChapterVerse {
  verse: number;
  text: string;
}

export async function fetchChapterVerses(
  info: BibleVerseInfo,
  translation?: BibleTranslationId,
): Promise<ChapterVerse[]> {
  const resolvedTranslation = translation ?? getCachedBibleTranslation();
  const searchBook = cleanAndMapBook(info.book);
  const response = await fetch(
    `${getBibleApiBase()}/${encodeURIComponent(searchBook)}+${info.chapter}?translation=${encodeURIComponent(resolvedTranslation)}`
  );
  if (!response.ok) {
    throw new Error("Chapter not found");
  }
  const data = await response.json();
  if (!data.verses?.length) {
    throw new Error("No verses returned");
  }
  return data.verses.map((v: { verse: number; text: string }) => ({
    verse: v.verse,
    text: v.text.trim(),
  }));
}
