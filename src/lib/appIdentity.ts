export const APP_NAME = "Daily Healing Word";
export const APP_NAME_LEGACY = "Bible Diary";

export const ANDROID_PACKAGE = "com.rpascual.studio.dailyhealingword";
export const IOS_BUNDLE_IDENTIFIER = "com.rpascual.studio.dailyhealingword";

export const STORAGE_KEYS = {
  sessions: "dailyhealingword_sessions",
  activeId: "dailyhealingword_active_id",
  language: "dailyhealingword_lang",
  theme: "dailyhealingword_theme",
  bibleTranslation: "dailyhealingword_bible_translation",
  dailyVerse: "dailyhealingword_daily_verse",
} as const;

const LEGACY_STORAGE_KEYS: Record<keyof typeof STORAGE_KEYS, string> = {
  sessions: "biblesphere_sessions",
  activeId: "biblesphere_active_id",
  language: "biblesphere_lang",
  theme: "biblesphere_theme",
  bibleTranslation: "biblesphere_bible_translation",
  dailyVerse: "biblesphere_daily_verse",
};

export function migrateLegacyWebStorage(storage: Storage = localStorage): void {
  (Object.keys(STORAGE_KEYS) as Array<keyof typeof STORAGE_KEYS>).forEach(
    (key) => {
      const nextKey = STORAGE_KEYS[key];
      const legacyKey = LEGACY_STORAGE_KEYS[key];
      if (!storage.getItem(nextKey) && storage.getItem(legacyKey)) {
        storage.setItem(nextKey, storage.getItem(legacyKey)!);
      }
    },
  );
}

export async function migrateLegacyNativeStorage(
  getItem: (key: string) => Promise<string | null>,
  setItem: (key: string, value: string) => Promise<void>,
): Promise<void> {
  await Promise.all(
    (Object.keys(STORAGE_KEYS) as Array<keyof typeof STORAGE_KEYS>).map(
      async (key) => {
        const nextKey = STORAGE_KEYS[key];
        const legacyKey = LEGACY_STORAGE_KEYS[key];
        const current = await getItem(nextKey);
        if (current) return;
        const legacy = await getItem(legacyKey);
        if (legacy) {
          await setItem(nextKey, legacy);
        }
      },
    ),
  );
}

export async function readNativeStorageItem(
  getItem: (key: string) => Promise<string | null>,
  key: keyof typeof STORAGE_KEYS,
): Promise<string | null> {
  return (
    (await getItem(STORAGE_KEYS[key])) ??
    (await getItem(LEGACY_STORAGE_KEYS[key]))
  );
}
