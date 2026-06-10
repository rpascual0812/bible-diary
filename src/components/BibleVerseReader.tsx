import React, { useState, useEffect } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";
import { LangType, detectBibleVerse, getReadVerseLabel } from "../App";

interface BibleVerseReaderProps {
  query: string;
  onNavigate: (verseRef: string) => void;
  language: LangType;
  theme: "dark" | "light";
}

// Map Tagalog/Cebuano/Bicolano/Ilocano/Hiligaynon bible book names to English for bible-api.com
const BOOK_MAP: Record<string, string> = {
  // Pentateuch
  "genesis": "Genesis",
  "exodo": "Exodus",
  "levitico": "Leviticus",
  "bilang": "Numbers",
  "numero": "Numbers",
  "deuteronomio": "Deuteronomy",
  
  // Historical
  "josue": "Joshua",
  "hukom": "Judges",
  "rut": "Ruth",
  "samuel": "Samuel",
  "hari": "Kings",
  "cronica": "Chronicles",
  "esdras": "Ezra",
  "nehemias": "Nehemiah",
  "ester": "Esther",
  
  // Wisdom/Poetry
  "job": "Job",
  "salmo": "Psalms",
  "mgasalmo": "Psalms",
  "mga salmo": "Psalms",
  "kawikaan": "Proverbs",
  "mangangaral": "Ecclesiastes",
  "awit ng mga awit": "Song of Solomon",
  "awit": "Song of Solomon",
  
  // Major Prophets
  "isaias": "Isaiah",
  "jeremias": "Jeremiah",
  "panaghoy": "Lamentations",
  "ezekiel": "Ezekiel",
  "daniel": "Daniel",
  
  // Minor Prophets
  "hosea": "Hosea",
  "joel": "Joel",
  "amos": "Amos",
  "obadias": "Obadiah",
  "jonas": "Jonah",
  "miqueas": "Micah",
  "nahum": "Nahum",
  "habacuc": "Habakkuk",
  "sofonias": "Zephaniah",
  "hageo": "Haggai",
  "zacarias": "Zechariah",
  "malakias": "Malachi",
  
  // Gospels & Acts
  "mateo": "Matthew",
  "marcos": "Mark",
  "lucas": "Luke",
  "juan": "John",
  "gawa": "Acts",
  "mga gawa": "Acts",
  
  // Pauline Epistles
  "roma": "Romans",
  "corinto": "Corinthians",
  "galacia": "Galatians",
  "efeso": "Ephesians",
  "filipos": "Philippians",
  "colosas": "Colossians",
  "tesalonica": "Thessalonians",
  "timoteo": "Timothy",
  "tito": "Titus",
  "filemon": "Philemon",
  
  // General Epistles
  "hebreo": "Hebrews",
  "santiago": "James",
  "pedro": "Peter",
  "judas": "Jude",
  
  // Apocalyptic
  "pahayag": "Revelation",
  "apocalipsis": "Revelation"
};

function cleanAndMapBook(bookName: string): string {
  const norm = bookName.toLowerCase().replace(/\s+/g, "").trim();
  
  // Check prefix numbers like 1, 2, 3
  const numberPrefixMatch = bookName.match(/^([1-3])\s*(.*)$/);
  if (numberPrefixMatch) {
    const num = numberPrefixMatch[1];
    const rest = numberPrefixMatch[2].toLowerCase().replace(/\s+/g, "").trim();
    const mappedRest = BOOK_MAP[rest] || bookName;
    return `${num} ${mappedRest}`;
  }
  
  return BOOK_MAP[norm] || bookName;
}

export function BibleVerseReader({
  query,
  onNavigate,
  language,
  theme,
}: BibleVerseReaderProps) {
  const [verseText, setVerseText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [chapterVerses, setChapterVerses] = useState<{ verse: number; text: string }[]>([]);
  const [chapterLoading, setChapterLoading] = useState<boolean>(false);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [showFullChapter, setShowFullChapter] = useState<boolean>(false);

  const verseInfo = detectBibleVerse(query);
  const isDark = theme === "dark";

  useEffect(() => {
    if (!verseInfo) return;

    // Reset full chapter states on new verse query
    setShowFullChapter(false);
    setChapterVerses([]);
    setChapterError(null);

    let active = true;
    const fetchVerse = async () => {
      setLoading(true);
      setError(null);
      setVerseText("");

      const searchBook = cleanAndMapBook(verseInfo.book);

      const bibleApiBase = process.env.VITE_BIBLE_API_URL || "https://bible-api.com";

      try {
        const response = await fetch(
          `${bibleApiBase}/${encodeURIComponent(searchBook)}+${verseInfo.chapter}:${
            verseInfo.startVerse
          }${verseInfo.endVerse ? "-" + verseInfo.endVerse : ""}?translation=kjv`
        );

        if (!response.ok) {
          throw new Error("Bible text not found");
        }

        const data = await response.json();
        if (active) {
          if (data.text) {
            setVerseText(data.text.trim());
          } else {
            throw new Error("No verse text found");
          }
        }
      } catch (err) {
        if (active) {
          console.error("Failed to fetch bible quote:", err);
          setError("Could not retrieve automatic translation. You can request Scribe below.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchVerse();

    return () => {
      active = false;
    };
  }, [query]);

  if (!verseInfo) return null;

  const currentVerseRef = `${verseInfo.book} ${verseInfo.chapter}:${verseInfo.startVerse}${
    verseInfo.endVerse ? "-" + verseInfo.endVerse : ""
  }`;

  const prevVerse =
    verseInfo.startVerse > 1
      ? `${verseInfo.book} ${verseInfo.chapter}:${verseInfo.startVerse - 1}`
      : verseInfo.chapter > 1
      ? `${verseInfo.book} ${verseInfo.chapter - 1}:1`
      : null;

  const nextVerse = verseInfo.endVerse
    ? `${verseInfo.book} ${verseInfo.chapter}:${verseInfo.endVerse + 1}`
    : `${verseInfo.book} ${verseInfo.chapter}:${verseInfo.startVerse + 1}`;

  const handleToggleFullChapter = async () => {
    if (showFullChapter) {
      setShowFullChapter(false);
      return;
    }

    setShowFullChapter(true);
    if (chapterVerses.length > 0) return;

    setChapterLoading(true);
    setChapterError(null);
    const searchBook = cleanAndMapBook(verseInfo.book);

    const bibleApiBase = process.env.VITE_BIBLE_API_URL || "https://bible-api.com";

    try {
      const response = await fetch(
        `${bibleApiBase}/${encodeURIComponent(searchBook)}+${verseInfo.chapter}?translation=kjv`
      );

      if (!response.ok) {
        throw new Error("Chapter not found");
      }

      const data = await response.json();
      if (data.verses && data.verses.length > 0) {
        setChapterVerses(
          data.verses.map((v: any) => ({
            verse: v.verse,
            text: v.text.trim(),
          }))
        );
      } else {
        throw new Error("No verses returned");
      }
    } catch (err) {
      console.error("Failed to fetch full chapter:", err);
      setChapterError("Could not load the full chapter automatically. Please try again.");
    } finally {
      setChapterLoading(false);
    }
  };

  // Get localized language name
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
      default:
        return "English";
    }
  };

  const currentLangName = getLanguageName(language);

  // Labels based on selected language
  const labels = {
    title: {
      en: "Scripture Passage",
      fil: "Banal na Kasulatan",
      ceb: "Balaang Kasulatan",
      bik: "Banal na Kasuratan",
      ilo: "Gubuayan a Kasuratan",
      hil: "Balaan nga Kasulatan",
    },
    previous: {
      en: "Read Previous",
      fil: "Basahin ang Nakaraan",
      ceb: "Basaha ang Niagi",
      bik: "Basahon an Nakaagi",
      ilo: "Basaen ti Umuna",
      hil: "Basaha ang Nauna",
    },
    next: {
      en: "Continue Reading",
      fil: "Ipagpatuloy ang Pagbasa",
      ceb: "Ipadayon ang Pagbasa",
      bik: "Ipadagos an Pagbasa",
      ilo: "Ituloy ti Panagbasa",
      hil: "Ipadayon ang Pagbasa",
    },
    requestTranslation: {
      en: "Explain in context",
      fil: "Isalin sa Tagalog",
      ceb: "Hubaron sa Cebuano",
      bik: "I-translate sa Bicolano",
      ilo: "I-translate iti Ilocano",
      hil: "I-translate sa Hiligaynon",
    },
    translationPrompt: {
      en: `Can you show and explain ${currentVerseRef} in detail?`,
      fil: `Maaari mo bang isulat at ipaliwanag ang ${currentVerseRef} sa wikang Tagalog?`,
      ceb: `Palihug isulat ug ipasabut ang ${currentVerseRef} sa pinulongang Cebuano.`,
      bik: `Paki-sulat asin ipaliwanag an ${currentVerseRef} sa tataramong Bicolano.`,
      ilo: `Paki-surat ken ipamaysa ti lawag ti ${currentVerseRef} iti pagsasao nga Ilocano.`,
      hil: `Palihug isulat kag ipaathag ang ${currentVerseRef} sa polong nga Hiligaynon.`,
    },
    fullChapter: {
      en: "Read Full Chapter",
      fil: "Basahin ang Buong Kapitulo",
      ceb: "Basaha ang Tibuok Kapitulo",
      bik: "Basahon an Bilog na Kapitulo",
      ilo: "Basaen ti Intero a Kapitulo",
      hil: "Basaha ang Tibuok nga Kapitulo",
    },
    verseOnly: {
      en: "Show Selected Verse",
      fil: "Ipakita ang Bersikulo",
      ceb: "Ipakita ang Bersikulo",
      bik: "Ipakita an Bersikulo",
      ilo: "Ipakita ti Bersikulo",
      hil: "Ipakita ang Bersikulo",
    },
    chapterTitle: {
      en: "Full Chapter Text",
      fil: "Buong Kapitulo",
      ceb: "Tibuok Kapitulo",
      bik: "Bilog na Kapitulo",
      ilo: "Intero na Kapitulo",
      hil: "Tibuok nga Kapitulo",
    },
  };

  return (
    <div
      className={cn(
        "mt-6 p-5 border rounded-2xl flex flex-col w-full text-sm font-sans transition-all shadow-md select-text",
        isDark
          ? "bg-slate-overlay/50 border-white/5 shadow-black/40"
          : "bg-slate-50/80 border-slate-200/60 shadow-slate-200/50"
      )}
    >
      {/* Header section with book indicator */}
      <div className="flex items-center justify-between gap-3 mb-3 border-b pb-2.5 border-white/5">
        <span
          className={cn(
            "text-[10px] uppercase font-mono tracking-widest font-bold flex items-center gap-1.5",
            isDark ? "text-gold-500" : "text-gold-600"
          )}
        >
          <BookOpen className="w-3.5 h-3.5 animate-pulse" />
          {labels.title[language] || labels.title.en}: {currentVerseRef}
        </span>
        
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleFullChapter}
            className={cn(
              "text-[10px] px-2.5 py-1 rounded-full font-bold transition-all border flex items-center gap-1 cursor-pointer active:scale-95 touch-manipulation hover:scale-[1.02]",
              showFullChapter
                ? (isDark
                    ? "bg-gold-500/20 hover:bg-gold-500/30 border-gold-500/30 text-gold-400"
                    : "bg-gold-50 hover:bg-gold-100 border-gold-200 text-gold-700")
                : (isDark
                    ? "bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-slate-300"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800")
            )}
          >
            <BookOpen className="w-3 h-3 text-gold-500" />
            <span>
              {showFullChapter
                ? (labels.verseOnly[language] || labels.verseOnly.en)
                : (labels.fullChapter[language] || labels.fullChapter.en)}
            </span>
          </button>
          
          <span
            className={cn(
              "text-[9px] px-2 py-1 rounded-full font-semibold border hidden sm:inline-block",
              isDark
                ? "bg-white/5 border-white/10 text-slate-400"
                : "bg-slate-100 border-slate-200 text-slate-500"
            )}
          >
            KJV
          </span>
        </div>
      </div>

      {/* Main Scripture Area */}
      <div className="my-3 relative">
        {!showFullChapter ? (
          <>
            {loading && (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-gold-500" />
                <span className={cn("text-xs font-light", isDark ? "text-slate-400" : "text-slate-500")}>
                  Opening scripture scroll...
                </span>
              </div>
            )}

            {error && !loading && (
              <div className={cn("text-xs italic py-2 text-center", isDark ? "text-slate-400" : "text-slate-500")}>
                {error}
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
                  Fetching chapter verses...
                </span>
              </div>
            )}

            {chapterError && !chapterLoading && (
              <div className={cn("text-xs italic py-2 text-center", isDark ? "text-slate-400" : "text-slate-500")}>
                {chapterError}
              </div>
            )}

            {chapterVerses.length > 0 && !chapterLoading && (
              <div className="flex flex-col gap-2">
                <div className={cn(
                  "text-[10px] uppercase font-mono tracking-wider font-bold mb-1",
                  isDark ? "text-gold-500/60" : "text-gold-600"
                )}>
                  {labels.chapterTitle[language] || labels.chapterTitle.en}: {verseInfo.book} {verseInfo.chapter}
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
                              ? (isDark ? "text-gold-400" : "text-gold-600")
                              : (isDark ? "text-slate-500" : "text-slate-400")
                          )}
                        >
                          {v.verse}
                        </sup>
                        <span
                          className={cn(
                            "transition-colors duration-200",
                            isHighlighted
                              ? (isDark
                                  ? "bg-gold-500/15 text-white font-medium px-1.5 py-0.5 rounded border-b border-gold-500/50"
                                  : "bg-gold-100 text-slate-950 font-medium px-1.5 py-0.5 rounded border-b border-gold-600/50")
                              : (isDark ? "text-slate-300" : "text-slate-700")
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

      {/* Actions and Translation Option */}
      <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-3">
        {/* Localized request translation helper if language is not English */}
        {language !== "en" && (
          <button
            onClick={() => onNavigate(labels.translationPrompt[language] || labels.translationPrompt.en)}
            className={cn(
              "self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all hover:scale-[1.01] active:scale-95 cursor-pointer touch-manipulation shadow-sm border",
              isDark
                ? "bg-gold-500/10 hover:bg-gold-500/20 active:bg-gold-500/25 border-gold-500/20 text-gold-400"
                : "bg-gold-50 hover:bg-gold-100 active:bg-gold-200 border-gold-200 text-gold-700"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{labels.requestTranslation[language]} ({currentLangName})</span>
          </button>
        )}

        {/* Previous / Next continuous scroll buttons */}
        <div className="flex flex-wrap gap-2.5 items-center justify-between w-full mt-1.5">
          {prevVerse ? (
            <button
              onClick={() => onNavigate(prevVerse)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all active:scale-95 shadow-sm touch-manipulation hover:scale-[1.01] flex-1 sm:flex-initial text-left sm:text-center justify-center",
                isDark
                  ? "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
                  : "bg-white hover:bg-[#FAFAFB] border-slate-200 text-slate-700 hover:text-slate-950"
              )}
            >
              <ChevronLeft className="w-4 h-4 text-gold-500 flex-shrink-0" />
              <span>{labels.previous[language] || labels.previous.en} ({prevVerse})</span>
            </button>
          ) : (
            <div className="flex-1 sm:flex-initial" />
          )}

          <button
            onClick={() => onNavigate(nextVerse)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all active:scale-95 shadow-sm touch-manipulation hover:scale-[1.01] flex-1 sm:flex-initial text-right sm:text-center justify-center",
              isDark
                ? "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
                : "bg-white hover:bg-[#FAFAFB] border-slate-200 text-slate-700 hover:text-slate-950"
            )}
          >
            <span>{labels.next[language] || labels.next.en} ({nextVerse})</span>
            <ChevronRight className="w-4 h-4 text-gold-500 flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
