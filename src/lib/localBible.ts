import type { BibleTranslationId } from "./bibleTranslations";
import type { ChapterVerse } from "./bibleVerse";

export interface BibleBookChapter {
  book: string;
  chapters: number;
}

export interface LocalBibleStorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem?: (key: string) => Promise<void>;
}

export interface LocalBibleDownloadProgress {
  completed: number;
  total: number;
  currentBook: string;
  currentChapter: number;
}

const LOCAL_BIBLE_PREFIX = "dailyhealingword_local_bible";
const LOCAL_BIBLE_VERSION = 1;

export const BIBLE_BOOK_CHAPTERS: BibleBookChapter[] = [
  { book: "Genesis", chapters: 50 },
  { book: "Exodus", chapters: 40 },
  { book: "Leviticus", chapters: 27 },
  { book: "Numbers", chapters: 36 },
  { book: "Deuteronomy", chapters: 34 },
  { book: "Joshua", chapters: 24 },
  { book: "Judges", chapters: 21 },
  { book: "Ruth", chapters: 4 },
  { book: "1 Samuel", chapters: 31 },
  { book: "2 Samuel", chapters: 24 },
  { book: "1 Kings", chapters: 22 },
  { book: "2 Kings", chapters: 25 },
  { book: "1 Chronicles", chapters: 29 },
  { book: "2 Chronicles", chapters: 36 },
  { book: "Ezra", chapters: 10 },
  { book: "Nehemiah", chapters: 13 },
  { book: "Esther", chapters: 10 },
  { book: "Job", chapters: 42 },
  { book: "Psalms", chapters: 150 },
  { book: "Proverbs", chapters: 31 },
  { book: "Ecclesiastes", chapters: 12 },
  { book: "Song of Solomon", chapters: 8 },
  { book: "Isaiah", chapters: 66 },
  { book: "Jeremiah", chapters: 52 },
  { book: "Lamentations", chapters: 5 },
  { book: "Ezekiel", chapters: 48 },
  { book: "Daniel", chapters: 12 },
  { book: "Hosea", chapters: 14 },
  { book: "Joel", chapters: 3 },
  { book: "Amos", chapters: 9 },
  { book: "Obadiah", chapters: 1 },
  { book: "Jonah", chapters: 4 },
  { book: "Micah", chapters: 7 },
  { book: "Nahum", chapters: 3 },
  { book: "Habakkuk", chapters: 3 },
  { book: "Zephaniah", chapters: 3 },
  { book: "Haggai", chapters: 2 },
  { book: "Zechariah", chapters: 14 },
  { book: "Malachi", chapters: 4 },
  { book: "Matthew", chapters: 28 },
  { book: "Mark", chapters: 16 },
  { book: "Luke", chapters: 24 },
  { book: "John", chapters: 21 },
  { book: "Acts", chapters: 28 },
  { book: "Romans", chapters: 16 },
  { book: "1 Corinthians", chapters: 16 },
  { book: "2 Corinthians", chapters: 13 },
  { book: "Galatians", chapters: 6 },
  { book: "Ephesians", chapters: 6 },
  { book: "Philippians", chapters: 4 },
  { book: "Colossians", chapters: 4 },
  { book: "1 Thessalonians", chapters: 5 },
  { book: "2 Thessalonians", chapters: 3 },
  { book: "1 Timothy", chapters: 6 },
  { book: "2 Timothy", chapters: 4 },
  { book: "Titus", chapters: 3 },
  { book: "Philemon", chapters: 1 },
  { book: "Hebrews", chapters: 13 },
  { book: "James", chapters: 5 },
  { book: "1 Peter", chapters: 5 },
  { book: "2 Peter", chapters: 3 },
  { book: "1 John", chapters: 5 },
  { book: "2 John", chapters: 1 },
  { book: "3 John", chapters: 1 },
  { book: "Jude", chapters: 1 },
  { book: "Revelation", chapters: 22 },
];

let storageAdapter: LocalBibleStorageAdapter | null = null;

export function setLocalBibleStorageAdapter(adapter: LocalBibleStorageAdapter): void {
  storageAdapter = adapter;
}

function chapterKey(
  translation: BibleTranslationId,
  book: string,
  chapter: number,
): string {
  return `${LOCAL_BIBLE_PREFIX}:chapter:${translation}:${book}:${chapter}`;
}

function manifestKey(translation: BibleTranslationId): string {
  return `${LOCAL_BIBLE_PREFIX}:manifest:${translation}`;
}

function getTotalChapterCount(): number {
  return BIBLE_BOOK_CHAPTERS.reduce((sum, item) => sum + item.chapters, 0);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 4,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) {
        throw error;
      }
      await wait(attempt * 400);
    }
  }

  throw lastError;
}

export async function getCachedChapterVerses(
  translation: BibleTranslationId,
  book: string,
  chapter: number,
): Promise<ChapterVerse[] | null> {
  if (!storageAdapter) return null;
  const raw = await storageAdapter.getItem(chapterKey(translation, book, chapter));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ChapterVerse[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function cacheChapterVerses(
  translation: BibleTranslationId,
  book: string,
  chapter: number,
  verses: ChapterVerse[],
): Promise<void> {
  if (!storageAdapter) return;
  await storageAdapter.setItem(
    chapterKey(translation, book, chapter),
    JSON.stringify(verses),
  );
}

export async function isBibleTranslationDownloaded(
  translation: BibleTranslationId,
): Promise<boolean> {
  if (!storageAdapter) return false;
  const raw = await storageAdapter.getItem(manifestKey(translation));
  if (!raw) return false;

  try {
    const manifest = JSON.parse(raw) as {
      version?: number;
      completed?: boolean;
      chapterCount?: number;
    };
    return (
      manifest.version === LOCAL_BIBLE_VERSION &&
      manifest.completed === true &&
      manifest.chapterCount === getTotalChapterCount()
    );
  } catch {
    return false;
  }
}

export async function downloadLocalBibleTranslation(
  translation: BibleTranslationId,
  fetchChapter: (
    book: string,
    chapter: number,
    translation: BibleTranslationId,
  ) => Promise<ChapterVerse[]>,
  onProgress?: (progress: LocalBibleDownloadProgress) => void,
): Promise<void> {
  if (!storageAdapter) {
    throw new Error("Local Bible storage is not available");
  }

  const total = getTotalChapterCount();
  let completed = 0;
  let failedChapters = 0;

  await storageAdapter.setItem(
    manifestKey(translation),
    JSON.stringify({
      version: LOCAL_BIBLE_VERSION,
      completed: false,
      chapterCount: total,
      updatedAt: Date.now(),
    }),
  );

  for (const item of BIBLE_BOOK_CHAPTERS) {
    for (let chapter = 1; chapter <= item.chapters; chapter += 1) {
      try {
        const cached = await getCachedChapterVerses(translation, item.book, chapter);
        if (!cached) {
          const verses = await runWithRetry(() =>
            fetchChapter(item.book, chapter, translation),
          );
          await cacheChapterVerses(translation, item.book, chapter, verses);
        }
      } catch (error) {
        failedChapters += 1;
        console.error(
          `Failed to download chapter ${item.book} ${chapter} for ${translation}:`,
          error,
        );
      } finally {
        completed += 1;
        onProgress?.({
          completed,
          total,
          currentBook: item.book,
          currentChapter: chapter,
        });
      }
    }
  }

  await storageAdapter.setItem(
    manifestKey(translation),
    JSON.stringify({
      version: LOCAL_BIBLE_VERSION,
      completed: true,
      chapterCount: total,
      failedChapterCount: failedChapters,
      updatedAt: Date.now(),
    }),
  );
}

