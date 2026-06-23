import { migrateLegacyWebStorage, readNativeStorageItem, STORAGE_KEYS } from "./appIdentity";
import {
  DEFAULT_BIBLE_TRANSLATION,
  normalizeBibleTranslation,
  type BibleTranslationId,
} from "./bibleTranslations";

let cachedTranslation: BibleTranslationId = DEFAULT_BIBLE_TRANSLATION;

export function getCachedBibleTranslation(): BibleTranslationId {
  return cachedTranslation;
}

export function setCachedBibleTranslation(translation: BibleTranslationId): void {
  cachedTranslation = normalizeBibleTranslation(translation);
}

export function readBibleTranslationFromWebStorage(): BibleTranslationId {
  try {
    if (typeof localStorage !== "undefined") {
      migrateLegacyWebStorage();
      cachedTranslation = normalizeBibleTranslation(
        localStorage.getItem(STORAGE_KEYS.bibleTranslation),
      );
    }
  } catch {
    cachedTranslation = DEFAULT_BIBLE_TRANSLATION;
  }
  return cachedTranslation;
}

export function writeBibleTranslationToWebStorage(
  translation: BibleTranslationId,
): void {
  const next = normalizeBibleTranslation(translation);
  cachedTranslation = next;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.bibleTranslation, next);
    }
  } catch {
    // ignore write failures
  }
}

export async function readBibleTranslationFromNativeStorage(
  getItem: (key: string) => Promise<string | null>,
): Promise<BibleTranslationId> {
  const saved = await readNativeStorageItem(getItem, "bibleTranslation");
  cachedTranslation = normalizeBibleTranslation(saved);
  return cachedTranslation;
}

export async function writeBibleTranslationToNativeStorage(
  setItem: (key: string, value: string) => Promise<void>,
  translation: BibleTranslationId,
): Promise<void> {
  const next = normalizeBibleTranslation(translation);
  cachedTranslation = next;
  await setItem(STORAGE_KEYS.bibleTranslation, next);
}
