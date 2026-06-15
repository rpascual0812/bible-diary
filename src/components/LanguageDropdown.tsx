import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Languages, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import type { LangType } from "../types";
import type { ThemeId } from "../theme";
import { isDarkTheme } from "../theme";
import { LANG_OPTIONS } from "../languages";

interface LanguageDropdownProps {
  currentLang: LangType;
  onChange: (lang: LangType) => void;
  langLabel?: string;
  align?: "up" | "down";
  className?: string;
  theme?: ThemeId;
}

const LANGUAGES = LANG_OPTIONS.map(({ code, label, native }) => ({
  code,
  label,
  native: native ?? label,
}));

export function LanguageDropdown({
  currentLang,
  onChange,
  langLabel,
  align = "down",
  className,
  theme = "light",
}: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLang = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

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
      {langLabel && (
        <span className={cn(
          "block text-[10px] uppercase tracking-wider font-semibold mb-1.5 px-1",
          isDark ? "text-slate-500" : "text-slate-500"
        )}>
          {langLabel}
        </span>
      )}
      <button
        type="button"
        id={`lang-dropdown-btn-${align}`}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-2.5 px-3.5 py-2 border rounded-xl transition-all text-xs font-semibold group shadow-md cursor-pointer",
          isDark 
            ? "bg-white/5 hover:bg-white/10 active:bg-white/15 border-white/10 text-white" 
            : "bg-white hover:bg-slate-50 active:bg-slate-100 border-slate-200 text-slate-800"
        )}
      >
        <span className="flex items-center gap-2">
          <Languages className="w-3.5 h-3.5 text-gold-500/80 group-hover:text-gold-500 transition-colors" />
          <span>{selectedLang.native}</span>
          <span className={cn(
            "text-[10px] font-normal",
            isDark ? "text-slate-400" : "text-slate-500"
          )}>({selectedLang.label})</span>
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform duration-200",
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
              "absolute w-56 rounded-xl p-1.5 shadow-2xl z-50 backdrop-blur-md focus:outline-none border max-h-56 overflow-y-auto overscroll-contain",
              isDark 
                ? "bg-[#0e1015]/95 border-white/10" 
                : "bg-white border-slate-200",
              align === "up"
                ? "bottom-full mb-2 left-0 origin-bottom-left"
                : "right-0 mt-2 origin-top-right whitespace-nowrap"
            )}
          >
            <div className="space-y-0.5">
              {LANGUAGES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  id={`lang-opt-${item.code}`}
                  onClick={() => {
                    onChange(item.code);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer border",
                    item.code === currentLang
                      ? (isDark 
                          ? "bg-gold-500/15 text-gold-400 border-gold-500/10" 
                          : "bg-gold-500/10 text-gold-600 border-gold-500/20")
                      : (isDark 
                          ? "text-slate-300 hover:text-white hover:bg-white/5 border-transparent" 
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent")
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{item.native}</span>
                    <span className={cn(
                      "text-[10px]",
                      isDark ? "text-slate-500" : "text-slate-400"
                    )}>{item.label}</span>
                  </div>
                  {item.code === currentLang && (
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full bg-gold-400",
                      isDark ? "shadow-[0_0_8px_rgba(212,175,55,0.8)]" : ""
                    )} />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
