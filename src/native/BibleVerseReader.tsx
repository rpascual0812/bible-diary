import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { LangType } from "../types";
import { getBibleReaderLabels } from "../lib/bibleReaderLabels";
import {
  detectBibleVerse,
  fetchChapterVerses,
  fetchVerseText,
  formatVerseRef,
  getNextChapterRef,
  getPrevChapterRef,
  type ChapterVerse,
} from "../lib/bibleVerse";
import {
  getBibleTranslationAbbreviation,
  type BibleTranslationId,
} from "../lib/bibleTranslations";

interface NativeBibleVerseReaderProps {
  query: string;
  onNavigate: (verseRef: string) => void;
  language: LangType;
  bibleTranslation: BibleTranslationId;
  colors: {
    text: string;
    muted: string;
    border: string;
    chip: string;
  };
  isDark: boolean;
}

export function NativeBibleVerseReader({
  query,
  onNavigate,
  language,
  bibleTranslation,
  colors,
  isDark,
}: NativeBibleVerseReaderProps) {
  const verseInfo = useMemo(() => detectBibleVerse(query), [query]);
  const [verseText, setVerseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chapterVerses, setChapterVerses] = useState<ChapterVerse[]>([]);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [showFullChapter, setShowFullChapter] = useState(false);

  useEffect(() => {
    if (!verseInfo) return;

    setShowFullChapter(false);
    setChapterVerses([]);
    setChapterError(null);

    let active = true;

    const loadVerse = async () => {
      setLoading(true);
      setError(null);
      setVerseText("");

      try {
        const text = await fetchVerseText(verseInfo, bibleTranslation);
        if (active) setVerseText(text);
      } catch {
        if (active) setError("verse");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadVerse();
    return () => {
      active = false;
    };
  }, [query, verseInfo, bibleTranslation]);

  if (!verseInfo) return null;

  const currentVerseRef = formatVerseRef(verseInfo);
  const labels = getBibleReaderLabels(language, currentVerseRef);
  const prevChapter = getPrevChapterRef(verseInfo);
  const nextChapter = getNextChapterRef(verseInfo);

  const handleToggleFullChapter = async () => {
    if (showFullChapter) {
      setShowFullChapter(false);
      return;
    }

    setShowFullChapter(true);
    if (chapterVerses.length > 0) return;

    setChapterLoading(true);
    setChapterError(null);

    try {
      setChapterVerses(await fetchChapterVerses(verseInfo, bibleTranslation));
    } catch {
      setChapterError("chapter");
    } finally {
      setChapterLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {labels.title}: {currentVerseRef}
          </Text>
          <Text style={[styles.translationBadge, { color: colors.muted, borderColor: colors.border }]}>
            {getBibleTranslationAbbreviation(bibleTranslation)}
          </Text>
        </View>
        <Pressable
          onPress={handleToggleFullChapter}
          style={[styles.chapterToggle, { borderColor: colors.border, backgroundColor: colors.chip }]}
        >
          <Text style={[styles.chapterToggleText, { color: colors.text }]}>
            {showFullChapter ? labels.verseOnly : labels.fullChapter}
          </Text>
        </Pressable>
      </View>

      {!showFullChapter ? (
        <>
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#D4AF37" size="small" />
              <Text style={[styles.loadingText, { color: colors.muted }]}>{labels.loadingVerse}</Text>
            </View>
          )}
          {error && !loading && (
            <Text style={[styles.errorText, { color: colors.muted }]}>{labels.verseError}</Text>
          )}
          {verseText && !loading && (
            <Text style={[styles.verseText, { color: colors.text }]}>"{verseText}"</Text>
          )}
        </>
      ) : (
        <>
          {chapterLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#D4AF37" size="small" />
              <Text style={[styles.loadingText, { color: colors.muted }]}>{labels.loadingChapter}</Text>
            </View>
          )}
          {chapterError && !chapterLoading && (
            <Text style={[styles.errorText, { color: colors.muted }]}>{labels.chapterError}</Text>
          )}
          {chapterVerses.length > 0 && !chapterLoading && (
            <View>
              <Text style={[styles.chapterHeading, { color: colors.muted }]}>
                {labels.chapterTitle}: {verseInfo.book} {verseInfo.chapter}
              </Text>
              <Text style={[styles.chapterBody, { color: colors.text }]}>
                {chapterVerses.map((v) => {
                  const isHighlighted =
                    v.verse >= verseInfo.startVerse &&
                    v.verse <= (verseInfo.endVerse || verseInfo.startVerse);
                  return (
                    <Text
                      key={v.verse}
                      style={isHighlighted ? styles.highlightedVerse : undefined}
                    >
                      <Text style={styles.verseNumber}>{v.verse} </Text>
                      {v.text}{" "}
                    </Text>
                  );
                })}
              </Text>
            </View>
          )}
        </>
      )}

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        {language !== "en" && (
          <Pressable
            onPress={() => onNavigate(labels.translationPrompt)}
            style={[styles.translateButton, { borderColor: colors.border }]}
          >
            <Text style={styles.translateButtonText}>{labels.requestTranslation}</Text>
          </Pressable>
        )}

        <View style={styles.navRow}>
          {prevChapter ? (
            <Pressable
              onPress={() => onNavigate(prevChapter)}
              style={[styles.navButton, { borderColor: colors.border, backgroundColor: colors.chip }]}
            >
              <Text style={[styles.navButtonText, { color: colors.text }]} numberOfLines={2}>
                ← {labels.prevChapter}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.navSpacer} />
          )}

          <Pressable
            onPress={() => onNavigate(nextChapter)}
            style={[styles.navButton, { borderColor: colors.border, backgroundColor: colors.chip }]}
          >
            <Text style={[styles.navButtonText, { color: colors.text }]} numberOfLines={2}>
              {labels.nextChapter} →
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    marginBottom: 10,
    gap: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  headerTitle: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    flex: 1,
  },
  translationBadge: {
    fontSize: 10,
    fontWeight: "700",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  chapterToggle: {
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chapterToggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: { fontSize: 12 },
  errorText: { fontSize: 12, fontStyle: "italic", paddingVertical: 8 },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: "italic",
    paddingVertical: 4,
  },
  chapterHeading: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  chapterBody: {
    fontSize: 15,
    lineHeight: 24,
  },
  verseNumber: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D4AF37",
  },
  highlightedVerse: {
    backgroundColor: "rgba(212, 175, 55, 0.12)",
  },
  actions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  translateButton: {
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  translateButtonText: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "600",
  },
  navRow: {
    flexDirection: "row",
    gap: 8,
  },
  navSpacer: { flex: 1 },
  navButton: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
