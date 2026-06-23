import React from "react";
import { BookOpen, MessageCircle } from "lucide-react";
import type { FollowUpSuggestion } from "../lib/followUpSuggestions";
import type { ThemeId } from "../theme";
import { cn } from "../lib/utils";
import { isDarkTheme } from "../theme";

interface FollowUpChipsProps {
  followUps: FollowUpSuggestion[];
  theme: ThemeId;
  label: string;
  onSelect: (text: string) => void;
}

export function FollowUpChips({
  followUps,
  theme,
  label,
  onSelect,
}: FollowUpChipsProps) {
  if (followUps.length === 0) return null;

  const isDark = isDarkTheme(theme);

  return (
    <div className="mt-5 pt-4 border-t border-white/5">
      <p
        className={cn(
          "text-[10px] font-semibold tracking-[0.18em] uppercase mb-3",
          isDark ? "text-gold-500/70" : "text-gold-600/80",
        )}
      >
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {followUps.map((item, index) => {
          const isVerse = item.type === "verse";
          const actionText =
            isVerse && item.reference ? item.reference : item.text;

          return (
            <button
              key={`${item.type}-${index}`}
              type="button"
              onClick={() => onSelect(actionText)}
              className={cn(
                "inline-flex items-start gap-2 text-left text-xs sm:text-sm leading-snug px-3 py-2 rounded-xl border transition-all",
                isDark
                  ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-slate-200"
                  : "border-slate-200 bg-slate-50 hover:bg-white text-slate-700 shadow-sm",
              )}
            >
              {isVerse ? (
                <BookOpen
                  className={cn(
                    "w-3.5 h-3.5 shrink-0 mt-0.5",
                    isDark ? "text-gold-400" : "text-gold-600",
                  )}
                />
              ) : (
                <MessageCircle
                  className={cn(
                    "w-3.5 h-3.5 shrink-0 mt-0.5",
                    isDark ? "text-gold-400" : "text-gold-600",
                  )}
                />
              )}
              <span>{item.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
