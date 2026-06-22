import { detectBibleVerse, fetchVerseText } from "./bibleVerse";

export interface DailyVerse {
  date: string;
  reference: string;
  text: string;
}

export interface DailyVerseStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
}

import { STORAGE_KEYS } from "./appIdentity";

const CACHE_KEY = STORAGE_KEYS.dailyVerse;

export const VERSE_SUGGESTION_REFERENCES = [
  "Genesis 1:1",
  "Genesis 12:2",
  "Exodus 14:14",
  "Exodus 20:3",
  "Deuteronomy 6:5",
  "Deuteronomy 31:6",
  "Joshua 1:9",
  "1 Samuel 16:7",
  "2 Chronicles 7:14",
  "Nehemiah 8:10",
  "Job 19:25",
  "Psalm 1:1",
  "Psalm 19:1",
  "Psalm 23:1",
  "Psalm 27:1",
  "Psalm 37:4",
  "Psalm 46:1",
  "Psalm 51:10",
  "Psalm 91:1",
  "Psalm 100:4",
  "Psalm 103:12",
  "Psalm 119:105",
  "Psalm 121:1",
  "Psalm 139:14",
  "Proverbs 3:5",
  "Proverbs 3:6",
  "Proverbs 16:3",
  "Proverbs 18:10",
  "Proverbs 22:6",
  "Ecclesiastes 3:1",
  "Isaiah 9:6",
  "Isaiah 40:31",
  "Isaiah 41:10",
  "Isaiah 53:5",
  "Jeremiah 29:11",
  "Jeremiah 33:3",
  "Lamentations 3:22",
  "Micah 6:8",
  "Matthew 5:3",
  "Matthew 5:16",
  "Matthew 6:33",
  "Matthew 7:7",
  "Matthew 11:28",
  "Matthew 16:26",
  "Matthew 22:37",
  "Matthew 28:19",
  "Mark 10:27",
  "Mark 12:30",
  "Luke 1:37",
  "Luke 2:11",
  "Luke 6:31",
  "Luke 11:9",
  "John 1:1",
  "John 1:12",
  "John 3:16",
  "John 3:17",
  "John 8:12",
  "John 10:10",
  "John 11:25",
  "John 14:6",
  "John 14:27",
  "John 15:13",
  "John 16:33",
  "Acts 1:8",
  "Acts 4:12",
  "Romans 1:16",
  "Romans 3:23",
  "Romans 5:8",
  "Romans 6:23",
  "Romans 8:1",
  "Romans 8:28",
  "Romans 8:38",
  "Romans 10:9",
  "Romans 12:2",
  "Romans 15:13",
  "1 Corinthians 10:13",
  "1 Corinthians 13:4",
  "1 Corinthians 13:13",
  "2 Corinthians 5:17",
  "2 Corinthians 12:9",
  "Galatians 2:20",
  "Galatians 5:22",
  "Ephesians 2:8",
  "Ephesians 4:32",
  "Ephesians 6:10",
  "Philippians 1:6",
  "Philippians 2:3",
  "Philippians 4:6",
  "Philippians 4:7",
  "Philippians 4:13",
  "Philippians 4:19",
  "Colossians 3:2",
  "Colossians 3:23",
  "1 Thessalonians 5:16",
  "1 Thessalonians 5:18",
  "2 Timothy 1:7",
  "Hebrews 4:12",
  "Hebrews 11:1",
  "Hebrews 12:2",
  "Hebrews 13:8",
  "James 1:2",
  "James 1:5",
  "James 4:7",
  "1 Peter 5:7",
  "1 John 1:9",
  "1 John 4:8",
  "1 John 4:19",
  "Revelation 3:20",
  "Revelation 21:4",
] as const;

export function getTodayDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashDate(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getReferenceForDate(dateKey: string): string {
  const index = hashDate(dateKey) % VERSE_SUGGESTION_REFERENCES.length;
  return VERSE_SUGGESTION_REFERENCES[index];
}

async function readCachedVerse(
  storage: DailyVerseStorage,
  dateKey: string,
): Promise<DailyVerse | null> {
  const raw = await storage.getItem(CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as DailyVerse;
    if (parsed.date === dateKey && parsed.reference && parsed.text) {
      return parsed;
    }
  } catch {
    // ignore invalid cache
  }

  return null;
}

async function writeCachedVerse(
  storage: DailyVerseStorage,
  verse: DailyVerse,
): Promise<void> {
  await storage.setItem(CACHE_KEY, JSON.stringify(verse));
}

export async function loadDailyVerse(
  storage: DailyVerseStorage,
  date = new Date(),
): Promise<DailyVerse> {
  const dateKey = getTodayDateKey(date);
  const cached = await readCachedVerse(storage, dateKey);
  if (cached) return cached;

  const reference = getReferenceForDate(dateKey);
  const info = detectBibleVerse(reference);
  let text = "";

  if (info) {
    try {
      text = await fetchVerseText(info);
    } catch {
      text = "";
    }
  }

  const verse: DailyVerse = { date: dateKey, reference, text };
  if (text) {
    await writeCachedVerse(storage, verse);
  }

  return verse;
}

export function createWebDailyVerseStorage(): DailyVerseStorage {
  return {
    getItem: (key) =>
      typeof localStorage !== "undefined" ? localStorage.getItem(key) : null,
    setItem: (key, value) => {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, value);
      }
    },
  };
}
