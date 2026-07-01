import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookMarked, Check, ChevronDown, Download, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import type { LangType } from "../types";
import type { ThemeId } from "../theme";
import { isDarkTheme } from "../theme";
import {
  BIBLE_TRANSLATION_OPTIONS,
  getBibleTranslationOption,
  type BibleTranslationId,
} from "../lib/bibleTranslations";
import type { LocalBibleDownloadProgress } from "../lib/localBible";

interface BibleTranslationDropdownProps {
  value: BibleTranslationId;
  onChange: (translation: BibleTranslationId) => void;
  onDownload?: (translation: BibleTranslationId) => void;
  downloadedTranslations?: Set<BibleTranslationId>;
  downloadingTranslation?: BibleTranslationId | null;
  downloadProgress?: LocalBibleDownloadProgress | null;
  label?: string;
  align?: "up" | "down";
  className?: string;
  theme?: ThemeId;
}

export function BibleTranslationDropdown({
  value,
  onChange,
  onDownload,
  downloadedTranslations = new Set(),
  downloadingTranslation = null,
  downloadProgress = null,
  label,
  align = "down",
  className,
  theme = "light",
}: BibleTranslationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = getBibleTranslationOption(value);
  const isDark = isDarkTheme(theme);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={cn("relative inline-block text-left", className)}>
      {label && (
        <span
          className={cn(
            "block text-[10px] uppercase tracking-wider font-semibold mb-1.5 px-1",
            isDark ? "text-slate-500" : "text-slate-500",
          )}
        >
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-2.5 px-3.5 py-2 border rounded-xl transition-all text-xs font-semibold group shadow-md cursor-pointer",
          isDark
            ? "bg-white/5 hover:bg-white/10 active:bg-white/15 border-white/10 text-white"
            : "bg-white hover:bg-slate-50 active:bg-slate-100 border-slate-200 text-slate-800",
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <BookMarked className="w-3.5 h-3.5 shrink-0 text-gold-500/80 group-hover:text-gold-500 transition-colors" />
          <span className="truncate">{selected.abbreviation}</span>
          <span
            className={cn(
              "text-[10px] font-normal truncate",
              isDark ? "text-slate-400" : "text-slate-500",
            )}
          >
            ({selected.label})
          </span>
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 shrink-0 transition-transform duration-200",
            isDark ? "text-slate-400" : "text-slate-500",
            isOpen && "transform rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={
              align === "up"
                ? { opacity: 0, y: -10, scale: 0.95 }
                : { opacity: 0, y: 10, scale: 0.95 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              align === "up"
                ? { opacity: 0, y: -10, scale: 0.95 }
                : { opacity: 0, y: 10, scale: 0.95 }
            }
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute w-64 rounded-xl p-1.5 shadow-2xl z-50 backdrop-blur-md focus:outline-none border max-h-56 overflow-y-auto overscroll-contain",
              isDark ? "bg-[#0e1015]/95 border-white/10" : "bg-white border-slate-200",
              align === "up"
                ? "bottom-full mb-2 left-0 origin-bottom-left"
                : "right-0 mt-2 origin-top-right",
            )}
          >
            <div className="space-y-0.5">
              {BIBLE_TRANSLATION_OPTIONS.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "relative w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left border",
                    item.id === value
                      ? isDark
                        ? "bg-gold-500/15 text-gold-400 border-gold-500/10"
                        : "bg-gold-500/10 text-gold-600 border-gold-500/20"
                      : isDark
                        ? "text-slate-300 hover:text-white hover:bg-white/5 border-transparent"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setIsOpen(false);
                    }}
                    className="flex flex-col min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <span className="font-semibold truncate">
                      {item.abbreviation} · {item.label}
                    </span>
                    <span
                      className={cn(
                        "text-[10px]",
                        isDark ? "text-slate-500" : "text-slate-400",
                      )}
                    >
                      {item.language}
                    </span>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.id === value && (
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0",
                          isDark ? "shadow-[0_0_8px_rgba(212,175,55,0.8)]" : "",
                        )}
                      />
                    )}
                    {onDownload && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (downloadingTranslation) return;
                          onDownload(item.id);
                        }}
                        disabled={Boolean(downloadingTranslation)}
                        title={
                          downloadedTranslations.has(item.id)
                            ? "Downloaded for offline reading"
                            : "Download and set as default"
                        }
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center border transition-colors",
                          downloadedTranslations.has(item.id)
                            ? isDark
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                              : "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                            : isDark
                              ? "border-white/10 bg-white/5 text-slate-300 hover:text-gold-400"
                              : "border-slate-200 bg-white text-slate-500 hover:text-gold-600",
                          downloadingTranslation && "opacity-60 cursor-wait",
                        )}
                      >
                        {downloadingTranslation === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : downloadedTranslations.has(item.id) ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                  {downloadingTranslation === item.id && downloadProgress && (
                    <span
                      className={cn(
                        "absolute left-3 right-3 bottom-1 h-0.5 rounded-full overflow-hidden",
                        isDark ? "bg-white/10" : "bg-slate-200",
                      )}
                    >
                      <span
                        className="block h-full bg-gold-500"
                        style={{
                          width: `${Math.round(
                            (downloadProgress.completed /
                              Math.max(downloadProgress.total, 1)) *
                              100,
                          )}%`,
                        }}
                      />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
