import { detectBibleVerse, fetchVerseText } from "./bibleVerse";
import {
  DEFAULT_BIBLE_TRANSLATION,
  type BibleTranslationId,
} from "./bibleTranslations";
import { VERSE_SUGGESTION_REFERENCES } from "./dailyVerse";

export interface VerseSuggestion {
  reference: string;
  text: string;
}

export const SUGGESTION_COUNT = 4;

export function pickRandomVerseReferences(
  count: number,
  exclude: string[] = [],
): string[] {
  const excludeSet = new Set(exclude);
  const pool = VERSE_SUGGESTION_REFERENCES.filter(
    (reference) => !excludeSet.has(reference),
  );
  const shuffled = [...pool];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export async function loadVerseSuggestions(
  references: string[],
  translation: BibleTranslationId = DEFAULT_BIBLE_TRANSLATION,
): Promise<VerseSuggestion[]> {
  return Promise.all(
    references.map(async (reference) => {
      const info = detectBibleVerse(reference);
      let text = "";

      if (info) {
        try {
          text = await fetchVerseText(info, translation);
        } catch {
          text = "";
        }
      }

      return { reference, text };
    }),
  );
}
