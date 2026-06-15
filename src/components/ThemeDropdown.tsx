import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Palette, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import type { LangType } from "../types";
import {
  isDarkTheme,
  THEME_EMOJI,
  THEME_IDS,
  getThemeLabelKey,
  type ThemeId,
} from "../theme";

interface ThemeDropdownProps {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
  themeLabel?: string;
  align?: "up" | "down";
  className?: string;
  theme?: ThemeId;
  language: LangType;
  getLabel: (key: string, lang: LangType) => string;
}

export function ThemeDropdown({
  value,
  onChange,
  themeLabel,
  align = "down",
  className,
  theme = "light",
  language,
  getLabel,
}: ThemeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  const selectedLabel = getLabel(getThemeLabelKey(value), language);

  return (
    <div ref={dropdownRef} className={cn("relative inline-block text-left", className)}>
      {themeLabel && (
        <span
          className={cn(
            "block text-[10px] uppercase tracking-wider font-semibold mb-1.5 px-1",
            isDark ? "text-slate-500" : "text-slate-500"
          )}
        >
          {themeLabel}
        </span>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-2.5 px-3.5 py-2 border rounded-xl transition-all text-xs font-semibold group shadow-md cursor-pointer",
          isDark
            ? "bg-white/5 hover:bg-white/10 active:bg-white/15 border-white/10 text-white"
            : "bg-white hover:bg-slate-50 active:bg-slate-100 border-slate-200 text-slate-800"
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Palette className="w-3.5 h-3.5 text-gold-500/80 group-hover:text-gold-500 transition-colors shrink-0" />
          <span className="truncate">
            {THEME_EMOJI[value]} {selectedLabel}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform duration-200 shrink-0",
            isDark ? "text-slate-400" : "text-slate-500",
            isOpen && "transform rotate-180"
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
              "absolute w-full min-w-[12rem] rounded-xl p-1.5 shadow-2xl z-50 backdrop-blur-md focus:outline-none border max-h-64 overflow-y-auto overscroll-contain",
              isDark ? "bg-[#0e1015]/95 border-white/10" : "bg-white border-slate-200",
              align === "up"
                ? "bottom-full mb-2 left-0 origin-bottom-left"
                : "right-0 mt-2 origin-top-right"
            )}
          >
            <div className="space-y-0.5">
              {THEME_IDS.map((option) => {
                const label = getLabel(getThemeLabelKey(option), language);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer border",
                      option === value
                        ? isDark
                          ? "bg-gold-500/15 text-gold-400 border-gold-500/10"
                          : "bg-gold-500/10 text-gold-600 border-gold-500/20"
                        : isDark
                          ? "text-slate-300 hover:text-white hover:bg-white/5 border-transparent"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent"
                    )}
                  >
                    <span className="font-semibold">
                      {THEME_EMOJI[option]} {label}
                    </span>
                    {option === value && (
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full bg-gold-400",
                          isDark ? "shadow-[0_0_8px_rgba(212,175,55,0.8)]" : ""
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
