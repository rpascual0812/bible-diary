import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";
import type { LangType } from "../types";
import type { ThemeId } from "../theme";
import { isDarkTheme } from "../theme";
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

interface BibleVerseReaderProps {
  query: string;
  onNavigate: (verseRef: string) => void;
  language: LangType;
  theme: ThemeId;
  bibleTranslation: BibleTranslationId;
}

export function BibleVerseReader({
  query,
  onNavigate,
  language,
  theme,
  bibleTranslation,
}: BibleVerseReaderProps) {
  const verseInfo = useMemo(() => detectBibleVerse(query), [query]);
  const [verseText, setVerseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chapterVerses, setChapterVerses] = useState<ChapterVerse[]>([]);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [showFullChapter, setShowFullChapter] = useState(false);

  const isDark = isDarkTheme(theme);

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
      } catch (err) {
        if (active) {
          console.error("Failed to fetch bible quote:", err);
          setError("verse");
        }
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
    } catch (err) {
      console.error("Failed to fetch full chapter:", err);
      setChapterError("chapter");
    } finally {
      setChapterLoading(false);
    }
  };

  const getLanguageName = (lang: LangType) => {
    switch (lang) {
      case "fil":
        return "Tagalog";
      case "ceb":
        return "Cebuano";
      case "bik":
        return "Bicolano";
      case "ilo":
        return "Ilocano";
      case "hil":
        return "Hiligaynon";
      case "es":
        return "Español";
      case "pt":
        return "Português";
      case "fr":
        return "Français";
      case "la":
        return "Latina";
      case "el":
        return "Ελληνικά";
      default:
        return "English";
    }
  };

  return (
    <div
      className={cn(
        "mt-4 p-5 border rounded-2xl flex flex-col w-full text-sm font-sans transition-all shadow-md select-text",
        isDark
          ? "bg-slate-overlay/50 border-white/5 shadow-black/40"
          : "bg-slate-50/80 border-slate-200/60 shadow-slate-200/50"
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-3 border-b pb-2.5 border-white/5">
        <span
          className={cn(
            "text-[10px] uppercase font-mono tracking-widest font-bold flex items-center gap-1.5",
            isDark ? "text-gold-500" : "text-gold-600"
          )}
        >
          <BookOpen className="w-3.5 h-3.5" />
          {labels.title}: {currentVerseRef}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleFullChapter}
            className={cn(
              "text-[10px] px-2.5 py-1 rounded-full font-bold transition-all border flex items-center gap-1 cursor-pointer active:scale-95 touch-manipulation hover:scale-[1.02]",
              showFullChapter
                ? isDark
                  ? "bg-gold-500/20 hover:bg-gold-500/30 border-gold-500/30 text-gold-400"
                  : "bg-gold-50 hover:bg-gold-100 border-gold-200 text-gold-700"
                : isDark
                  ? "bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-slate-300"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800"
            )}
          >
            <BookOpen className="w-3 h-3 text-gold-500" />
            <span>{showFullChapter ? labels.verseOnly : labels.fullChapter}</span>
          </button>

          <span
            className={cn(
              "text-[9px] px-2 py-1 rounded-full font-semibold border hidden sm:inline-block",
              isDark
                ? "bg-white/5 border-white/10 text-slate-400"
                : "bg-slate-100 border-slate-200 text-slate-500"
            )}
          >
            {getBibleTranslationAbbreviation(bibleTranslation)}
          </span>
        </div>
      </div>

      <div className="my-3 relative">
        {!showFullChapter ? (
          <>
            {loading && (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-gold-500" />
                <span className={cn("text-xs font-light", isDark ? "text-slate-400" : "text-slate-500")}>
                  {labels.loadingVerse}
                </span>
              </div>
            )}

            {error && !loading && (
              <div className={cn("text-xs italic py-2 text-center", isDark ? "text-slate-400" : "text-slate-500")}>
                {labels.verseError}
              </div>
            )}

            {verseText && !loading && (
              <blockquote
                className={cn(
                  "pl-4 border-l-2 py-1 text-base md:text-lg italic leading-relaxed font-serif",
                  isDark ? "border-gold-500/80 text-slate-100" : "border-gold-600 text-slate-800"
                )}
              >
                "{verseText}"
              </blockquote>
            )}
          </>
        ) : (
          <>
            {chapterLoading && (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-gold-500" />
                <span className={cn("text-xs font-light", isDark ? "text-slate-400" : "text-slate-500")}>
                  {labels.loadingChapter}
                </span>
              </div>
            )}

            {chapterError && !chapterLoading && (
              <div className={cn("text-xs italic py-2 text-center", isDark ? "text-slate-400" : "text-slate-500")}>
                {labels.chapterError}
              </div>
            )}

            {chapterVerses.length > 0 && !chapterLoading && (
              <div className="flex flex-col gap-2">
                <div
                  className={cn(
                    "text-[10px] uppercase font-mono tracking-wider font-bold mb-1",
                    isDark ? "text-gold-500/60" : "text-gold-600"
                  )}
                >
                  {labels.chapterTitle}: {verseInfo.book} {verseInfo.chapter}
                </div>
                <div className="leading-relaxed font-serif text-base mt-2 text-justify pb-1">
                  {chapterVerses.map((v) => {
                    const isHighlighted =
                      v.verse >= verseInfo.startVerse &&
                      v.verse <= (verseInfo.endVerse || verseInfo.startVerse);
                    return (
                      <span key={v.verse} className="inline mr-1.5 break-words">
                        <sup
                          className={cn(
                            "text-[9px] font-sans font-extrabold select-none mr-0.5",
                            isHighlighted
                              ? isDark
                                ? "text-gold-400"
                                : "text-gold-600"
                              : isDark
                                ? "text-slate-500"
                                : "text-slate-400"
                          )}
                        >
                          {v.verse}
                        </sup>
                        <span
                          className={cn(
                            "transition-colors duration-200",
                            isHighlighted
                              ? isDark
                                ? "bg-gold-500/15 text-white font-medium px-1.5 py-0.5 rounded border-b border-gold-500/50"
                                : "bg-gold-100 text-slate-950 font-medium px-1.5 py-0.5 rounded border-b border-gold-600/50"
                              : isDark
                                ? "text-slate-300"
                                : "text-slate-700"
                          )}
                        >
                          {v.text}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-3">
        {language !== "en" && (
          <button
            onClick={() => onNavigate(labels.translationPrompt)}
            className={cn(
              "self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all hover:scale-[1.01] active:scale-95 cursor-pointer touch-manipulation shadow-sm border",
              isDark
                ? "bg-gold-500/10 hover:bg-gold-500/20 active:bg-gold-500/25 border-gold-500/20 text-gold-400"
                : "bg-gold-50 hover:bg-gold-100 active:bg-gold-200 border-gold-200 text-gold-700"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {labels.requestTranslation} ({getLanguageName(language)})
            </span>
          </button>
        )}

        <div className="flex flex-wrap gap-2.5 items-center justify-between w-full mt-1.5">
          {prevChapter ? (
            <button
              onClick={() => onNavigate(prevChapter)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all active:scale-95 shadow-sm touch-manipulation hover:scale-[1.01] flex-1 sm:flex-initial text-left sm:text-center justify-center",
                isDark
                  ? "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
                  : "bg-white hover:bg-[#FAFAFB] border-slate-200 text-slate-700 hover:text-slate-950"
              )}
            >
              <ChevronLeft className="w-4 h-4 text-gold-500 flex-shrink-0" />
              <span>
                {labels.prevChapter} ({prevChapter})
              </span>
            </button>
          ) : (
            <div className="flex-1 sm:flex-initial" />
          )}

          <button
            onClick={() => onNavigate(nextChapter)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all active:scale-95 shadow-sm touch-manipulation hover:scale-[1.01] flex-1 sm:flex-initial text-right sm:text-center justify-center",
              isDark
                ? "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
                : "bg-white hover:bg-[#FAFAFB] border-slate-200 text-slate-700 hover:text-slate-950"
            )}
          >
            <span>
              {labels.nextChapter} ({nextChapter})
            </span>
            <ChevronRight className="w-4 h-4 text-gold-500 flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
