import test from "node:test";
import assert from "node:assert/strict";
import { fetchVerseText } from "./bibleVerse";
import { setLocalBibleStorageAdapter } from "./localBible";

function createStorageAdapter() {
  const store = new Map<string, string>();

  return {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  };
}

test("fetchVerseText avoids network lookups for downloaded translations without local chapter data", async () => {
  const storage = createStorageAdapter();
  setLocalBibleStorageAdapter(storage);

  const manifestKey = "dailyhealingword_local_bible:manifest:kjv";
  await storage.setItem(
    manifestKey,
    JSON.stringify({ version: 1, completed: true, chapterCount: 1189 }),
  );

  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  await assert.rejects(
    () => fetchVerseText({ book: "Genesis", chapter: 1, startVerse: 1 }, "kjv"),
    /local bible data/i,
  );

  assert.equal(fetchCalls, 0);
});
