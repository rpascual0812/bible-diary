export type ThemeId =
  | "light"
  | "dark"
  | "floral-verdant"
  | "floral-blush"
  | "floral-lavender"
  | "floral-amber"
  | "floral-azure"
  | "floral-crimson"
  | "floral-navy";

export const FLORAL_THEME_IDS = [
  "floral-verdant",
  "floral-blush",
  "floral-lavender",
  "floral-amber",
  "floral-azure",
  "floral-crimson",
  "floral-navy",
] as const satisfies readonly ThemeId[];

export type FloralThemeId = (typeof FLORAL_THEME_IDS)[number];

export const THEME_IDS: ThemeId[] = [
  "light",
  "dark",
  ...FLORAL_THEME_IDS,
];

export interface NativeThemeColors {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  chip: string;
  input: string;
  accent: string;
  sendButtonBg: string;
  sendButtonText: string;
}

const darkColors: NativeThemeColors = {
  background: "#0B0C10",
  surface: "#111827",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  border: "rgba(255,255,255,0.08)",
  chip: "rgba(255,255,255,0.06)",
  input: "#1f2937",
  accent: "#D4AF37",
  sendButtonBg: "#D4AF37",
  sendButtonText: "#0B0C10",
};

const lightColors: NativeThemeColors = {
  background: "#F4F5F7",
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "rgba(0,0,0,0.08)",
  chip: "#E5E7EB",
  input: "#F3F4F6",
  accent: "#D4AF37",
  sendButtonBg: "#D4AF37",
  sendButtonText: "#0B0C10",
};

const floralVerdantColors: NativeThemeColors = {
  background: "#E6F3EE",
  surface: "rgba(255,255,255,0.88)",
  text: "#1B4332",
  muted: "#52796F",
  border: "rgba(61,122,98,0.18)",
  chip: "rgba(61,122,98,0.10)",
  input: "rgba(255,255,255,0.92)",
  accent: "#3D7A62",
  sendButtonBg: "#3D7A62",
  sendButtonText: "#FFFFFF",
};

const floralBlushColors: NativeThemeColors = {
  background: "#FDF2F8",
  surface: "rgba(255,255,255,0.90)",
  text: "#831843",
  muted: "#9D174D",
  border: "rgba(219,39,119,0.16)",
  chip: "rgba(244,114,182,0.14)",
  input: "rgba(255,255,255,0.94)",
  accent: "#DB2777",
  sendButtonBg: "#DB2777",
  sendButtonText: "#FFFFFF",
};

const floralLavenderColors: NativeThemeColors = {
  background: "#F3EEF8",
  surface: "rgba(255,255,255,0.90)",
  text: "#4C1D95",
  muted: "#7C3AED",
  border: "rgba(124,58,237,0.16)",
  chip: "rgba(167,139,250,0.16)",
  input: "rgba(255,255,255,0.94)",
  accent: "#7C3AED",
  sendButtonBg: "#7C3AED",
  sendButtonText: "#FFFFFF",
};

const floralAmberColors: NativeThemeColors = {
  background: "#FEF3E2",
  surface: "rgba(255,255,255,0.90)",
  text: "#78350F",
  muted: "#B45309",
  border: "rgba(217,119,6,0.18)",
  chip: "rgba(251,191,36,0.20)",
  input: "rgba(255,255,255,0.94)",
  accent: "#D97706",
  sendButtonBg: "#D97706",
  sendButtonText: "#FFFFFF",
};

const floralAzureColors: NativeThemeColors = {
  background: "#E8F4FC",
  surface: "rgba(255,255,255,0.90)",
  text: "#0C4A6E",
  muted: "#0369A1",
  border: "rgba(2,132,199,0.16)",
  chip: "rgba(56,189,248,0.16)",
  input: "rgba(255,255,255,0.94)",
  accent: "#0284C7",
  sendButtonBg: "#0284C7",
  sendButtonText: "#FFFFFF",
};

const floralCrimsonColors: NativeThemeColors = {
  background: "#FEF2F2",
  surface: "rgba(255,255,255,0.90)",
  text: "#7F1D1D",
  muted: "#B91C1C",
  border: "rgba(220,38,38,0.16)",
  chip: "rgba(248,113,113,0.16)",
  input: "rgba(255,255,255,0.94)",
  accent: "#DC2626",
  sendButtonBg: "#DC2626",
  sendButtonText: "#FFFFFF",
};

const floralNavyColors: NativeThemeColors = {
  background: "#E8EDF5",
  surface: "rgba(255,255,255,0.90)",
  text: "#0F172A",
  muted: "#334155",
  border: "rgba(30,58,138,0.16)",
  chip: "rgba(59,130,246,0.12)",
  input: "rgba(255,255,255,0.94)",
  accent: "#1E3A8A",
  sendButtonBg: "#1E3A8A",
  sendButtonText: "#FFFFFF",
};

const FLORAL_THEME_SET = new Set<string>(FLORAL_THEME_IDS);

export function normalizeTheme(value: string | null | undefined): ThemeId {
  if (value === "floral-boys") return "floral-verdant";
  if (value === "floral-girls") return "floral-blush";

  if (
    value === "light" ||
    value === "dark" ||
    FLORAL_THEME_SET.has(value ?? "")
  ) {
    return value as ThemeId;
  }
  return "light";
}

export function isDarkTheme(theme: ThemeId): boolean {
  return theme === "dark";
}

export function isFloralTheme(theme: ThemeId): theme is FloralThemeId {
  return FLORAL_THEME_SET.has(theme);
}

export function getNativeThemeColors(theme: ThemeId): NativeThemeColors {
  switch (theme) {
    case "dark":
      return darkColors;
    case "floral-verdant":
      return floralVerdantColors;
    case "floral-blush":
      return floralBlushColors;
    case "floral-lavender":
      return floralLavenderColors;
    case "floral-amber":
      return floralAmberColors;
    case "floral-azure":
      return floralAzureColors;
    case "floral-crimson":
      return floralCrimsonColors;
    case "floral-navy":
      return floralNavyColors;
    case "light":
    default:
      return lightColors;
  }
}

export function getRootClassName(theme: ThemeId): string {
  switch (theme) {
    case "dark":
      return "bg-midnight text-[#E0E0E0]";
    case "floral-verdant":
      return "theme-floral-verdant bg-[#E6F3EE] text-[#1B4332]";
    case "floral-blush":
      return "theme-floral-blush bg-[#FDF2F8] text-[#831843]";
    case "floral-lavender":
      return "theme-floral-lavender bg-[#F3EEF8] text-[#4C1D95]";
    case "floral-amber":
      return "theme-floral-amber bg-[#FEF3E2] text-[#78350F]";
    case "floral-azure":
      return "theme-floral-azure bg-[#E8F4FC] text-[#0C4A6E]";
    case "floral-crimson":
      return "theme-floral-crimson bg-[#FEF2F2] text-[#7F1D1D]";
    case "floral-navy":
      return "theme-floral-navy bg-[#E8EDF5] text-[#0F172A]";
    case "light":
    default:
      return "bg-[#F4F5F7] text-slate-800";
  }
}

export function getSplashClassName(theme: ThemeId): string {
  switch (theme) {
    case "dark":
      return "bg-[#07080a]";
    case "floral-verdant":
      return "bg-[#D9EDE4]";
    case "floral-blush":
      return "bg-[#FCE7F3]";
    case "floral-lavender":
      return "bg-[#EDE9FE]";
    case "floral-amber":
      return "bg-[#FFEDD5]";
    case "floral-azure":
      return "bg-[#E0F2FE]";
    case "floral-crimson":
      return "bg-[#FEE2E2]";
    case "floral-navy":
      return "bg-[#DBEAFE]";
    case "light":
    default:
      return "bg-[#F4F5F7]";
  }
}

export type ThemeLabelKey =
  | "themeLight"
  | "themeDark"
  | "themeFloralVerdant"
  | "themeFloralBlush"
  | "themeFloralLavender"
  | "themeFloralAmber"
  | "themeFloralAzure"
  | "themeFloralCrimson"
  | "themeFloralNavy";

export function getThemeLabelKey(theme: ThemeId): ThemeLabelKey {
  switch (theme) {
    case "dark":
      return "themeDark";
    case "floral-verdant":
      return "themeFloralVerdant";
    case "floral-blush":
      return "themeFloralBlush";
    case "floral-lavender":
      return "themeFloralLavender";
    case "floral-amber":
      return "themeFloralAmber";
    case "floral-azure":
      return "themeFloralAzure";
    case "floral-crimson":
      return "themeFloralCrimson";
    case "floral-navy":
      return "themeFloralNavy";
    case "light":
    default:
      return "themeLight";
  }
}

export const THEME_EMOJI: Record<ThemeId, string> = {
  light: "☀",
  dark: "☾",
  "floral-verdant": "🌿",
  "floral-blush": "🌸",
  "floral-lavender": "🪻",
  "floral-amber": "🌻",
  "floral-azure": "💠",
  "floral-crimson": "🔴",
  "floral-navy": "⚓",
};
