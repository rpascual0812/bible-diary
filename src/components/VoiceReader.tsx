import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Volume2, ChevronDown, Activity } from "lucide-react";
import { cn } from "../lib/utils";
import type { LangType } from "../types";
import type { ThemeId } from "../theme";
import { isDarkTheme } from "../theme";

interface VoiceReaderProps {
  text: string;
  language: LangType;
  theme: ThemeId;
}

function cleanMarkdownForSpeech(mdText: string): string {
  if (!mdText) return "";
  let text = mdText;
  
  // Remove markdown headers
  text = text.replace(/^#+\s+/gm, "");
  
  // Remove bold/italic markers
  text = text.replace(/[\*_~`]+/g, "");
  
  // Remove links, leaving the text
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, "");
  
  // Remove blockquote symbol lines
  text = text.replace(/^\s*>\s+/gm, "");
  
  // Normalize whitespaces
  text = text.replace(/\s+/g, " ");
  
  return text.trim();
}

export function VoiceReader({ text, language, theme }: VoiceReaderProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [rate, setRate] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);

  // Store speech instance to monitor
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isDark = isDarkTheme(theme);

  // Load voices dynamically on boot & handle voices changed event callback
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        setVoices(window.speechSynthesis.getVoices());
      }
    };

    updateVoices();

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
      };
    }
  }, []);

  // Set default voice matching active language
  useEffect(() => {
    if (voices.length === 0) return;

    // Preference map for voice matches
    let preferenceCodes: string[] = [];
    if (language === "fil" || language === "ceb" || language === "bik" || language === "ilo" || language === "hil") {
      preferenceCodes = ["fil-ph", "tl-ph", "tl", "en-us", "en"];
    } else {
      preferenceCodes = ["en-us", "en-gb", "en"];
    }

    let found = false;
    for (const code of preferenceCodes) {
      const match = voices.find((v) => v.lang.toLowerCase().startsWith(code));
      if (match) {
        setSelectedVoiceName(match.name);
        found = true;
        break;
      }
    }

    if (!found && voices.length > 0) {
      // Fallback to first available voice
      setSelectedVoiceName(voices[0].name);
    }
  }, [voices, language]);

  // Handle unmount speech cessation
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Control action triggered by user
  const handlePlay = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // If currently paused, resume speaking
    if (isPlaying && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    // Cancel prior actions before speaking
    window.speechSynthesis.cancel();

    const plainText = cleanMarkdownForSpeech(text);
    if (!plainText) return;

    const utterance = new SpeechSynthesisUtterance(plainText);
    const chosenVoice = voices.find((v) => v.name === selectedVoiceName);
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }
    
    utterance.rate = rate;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      // Don't error out on clean interupted cancellations
      if (e.error !== "interrupted") {
        console.error("SpeechSynthesisUtterance error:", e);
      }
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    setIsPlaying(true);
    setIsPaused(false);

    window.speechSynthesis.speak(utterance);
  };

  const handlePause = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    // Restart voice dynamically if speaking to apply rate changes immediately
    if (isPlaying) {
      setTimeout(() => {
        handlePlay();
      }, 50);
    }
  };

  const selectedVoice = voices.find((v) => v.name === selectedVoiceName);

  // Internationalized Labels
  const uiLabels = {
    audioRead: {
      en: "Read aloud",
      fil: "Basahin nang malakas",
      ceb: "Basaha sa kusog",
      bik: "Basahon nin makusog",
      ilo: "Basaen ti napigsa",
      hil: "Basaha sing mabaskog",
    },
    voicePicker: {
      en: "Choose Voice",
      fil: "Pumili ng Boses",
      ceb: "Pilia ang Tingog",
      bik: "Pumili kan Tingog",
      ilo: "Pilien ti Timpuyog",
      hil: "Pilia ang Tingog",
    },
    speed: {
      en: "Speed",
      fil: "Bilis",
      ceb: "Kakusgon",
      bik: "Kabilisan",
      ilo: "Kapartas",
      hil: "Kadasigon",
    }
  };

  return (
    <div className="flex flex-col gap-2 items-end select-none">
      <div className="flex items-center gap-1.5 flex-wrap md:flex-nowrap">
        {/* Minimal Audio indicator waveform */}
        {isPlaying && !isPaused && (
          <div className="flex items-center gap-0.5 px-1 bg-gold-500/10 rounded border border-gold-500/10 h-5">
            <span className="w-[2px] h-3 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-[2px] h-4 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-[2px] h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            <span className="w-[2px] h-3.5 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "450ms" }} />
          </div>
        )}

        {/* Toggle Controls Panel Button */}
        <button
          onClick={() => setShowControls((prev) => !prev)}
          title="Voice Reader Customization"
          className={cn(
            "p-1.5 rounded-full cursor-pointer transition-all active:scale-90 border",
            showControls
              ? (isDark ? "bg-gold-500/10 border-gold-500/30 text-gold-400" : "bg-gold-50 border-gold-200 text-gold-700")
              : (isDark ? "bg-white/5 border-transparent text-slate-400 hover:text-white hover:bg-white/10" : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50")
          )}
        >
          <Volume2 className="w-4 h-4" />
        </button>

        {/* Basic Audio Control Group */}
        <div className={cn(
          "flex items-center gap-1 border rounded-full px-1 py-0.5",
          isDark ? "bg-white/5 border-white/5" : "bg-white border-slate-200"
        )}>
          {isPlaying && !isPaused ? (
            <button
              onClick={handlePause}
              title="Pause"
              className={cn(
                "p-1.5 rounded-full cursor-pointer transition-colors active:scale-90",
                isDark ? "hover:bg-white/10 text-slate-300 hover:text-white" : "hover:bg-slate-50 text-slate-500 hover:text-slate-800"
              )}
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handlePlay}
              title="Play"
              className={cn(
                "p-1.5 rounded-full cursor-pointer transition-colors active:scale-90",
                isDark ? "hover:bg-white/10 text-slate-300 hover:text-white" : "hover:bg-slate-50 text-slate-500 hover:text-slate-800"
              )}
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}

          {isPlaying && (
            <button
              onClick={handleStop}
              title="Stop"
              className={cn(
                "p-1.5 rounded-full cursor-pointer transition-colors active:scale-90",
                isDark ? "hover:bg-white/10 text-red-400" : "hover:bg-slate-50 text-red-500"
              )}
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded selection drawer for voices and rate */}
      {showControls && (
        <div className={cn(
          "flex flex-col md:flex-row md:items-center gap-3 p-3 border rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-1 w-64 md:w-auto relative z-10",
          isDark
            ? "bg-slate-overlay/95 border-white/10 shadow-black/40 text-slate-200"
            : "bg-white/95 border-slate-200/80 shadow-slate-200/50 text-slate-800"
        )}>
          {/* Voice List Select */}
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-[9px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
              {uiLabels.voicePicker[language] || uiLabels.voicePicker.en}
            </label>
            <div className="relative flex items-center">
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className={cn(
                  "w-full bg-transparent text-xs outline-none border rounded-lg pl-2 pr-6 py-1 font-sans cursor-pointer h-7 text-ellipsis select-text appearance-none",
                  isDark
                    ? "border-white/15 focus:border-gold-500/50 text-slate-200 bg-midnight/90"
                    : "border-slate-200 focus:border-gold-500/50 text-slate-800 bg-white"
                )}
              >
                {voices.length === 0 ? (
                  <option value="">No system voices found</option>
                ) : (
                  voices.map((v) => {
                    const isPreferred =
                      language === "en"
                        ? v.lang.toLowerCase().startsWith("en")
                        : v.lang.toLowerCase().startsWith("fil") ||
                          v.lang.toLowerCase().startsWith("tl") ||
                          v.lang.toLowerCase().startsWith("ph");
                    return (
                      <option key={v.name} value={v.name} className="py-1">
                        {v.name} {isPreferred ? "★" : ""} ({v.lang})
                      </option>
                    );
                  })
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none text-slate-400" />
            </div>
          </div>

          {/* Speed settings list */}
          <div className="flex flex-col gap-1 shrink-0">
            <label className="text-[9px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
              {uiLabels.speed[language] || uiLabels.speed.en}
            </label>
            <div className="flex gap-1">
              {[0.75, 1.0, 1.25, 1.5].map((speedValue) => (
                <button
                  key={speedValue}
                  onClick={() => handleRateChange(speedValue)}
                  className={cn(
                    "text-[10px] px-1.5 py-1 rounded cursor-pointer transition-colors font-mono font-bold border active:scale-95",
                    rate === speedValue
                      ? (isDark
                          ? "bg-gold-500/25 border-gold-500/50 text-gold-400"
                          : "bg-gold-50 border-gold-200 text-gold-700")
                      : (isDark
                          ? "bg-white/5 border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/10"
                          : "bg-white border-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-50")
                  )}
                >
                  {speedValue}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
