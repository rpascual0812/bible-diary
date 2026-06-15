import type { LangType } from "../types";

export class GeminiQuotaError extends Error {
  readonly kind = "quota" as const;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "GeminiQuotaError";
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

function collectErrorText(error: unknown, depth = 0): string {
  if (depth > 4 || error == null) return "";
  if (typeof error === "string") return error;

  if (error instanceof Error) {
    const nested = [
      error.message,
      collectErrorText((error as Error & { cause?: unknown }).cause, depth + 1),
      collectErrorText((error as Error & { error?: unknown }).error, depth + 1),
    ].filter(Boolean);
    return nested.join(" ");
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const nested = [
      record.message,
      record.status,
      record.statusCode,
      record.code,
      record.details,
      record.error,
      record.cause,
    ]
      .map((part) => collectErrorText(part, depth + 1))
      .filter(Boolean);
    return nested.join(" ");
  }

  return String(error);
}

function extractHttpStatus(error: unknown): number | undefined {
  if (error == null || typeof error !== "object") return undefined;
  const record = error as Record<string, unknown>;
  const direct = record.status ?? record.statusCode;
  if (typeof direct === "number") return direct;

  const nested = record.error ?? record.cause;
  if (nested && nested !== error) return extractHttpStatus(nested);

  return undefined;
}

/** True when Gemini rejected the request due to quota or rate limiting. */
export function isGeminiQuotaOrRateLimitError(error: unknown): boolean {
  if (error instanceof GeminiQuotaError) return true;

  const status = extractHttpStatus(error);
  if (status === 429) return true;

  const text = collectErrorText(error).toLowerCase();
  return (
    text.includes("quota") ||
    text.includes("rate limit") ||
    text.includes("rate_limit") ||
    text.includes("resource_exhausted") ||
    text.includes("too many requests") ||
    text.includes("exceeded your current quota")
  );
}

const QUOTA_MESSAGES: Record<LangType, string> = {
  en: "## Cloud AI limit reached\n\nYour Gemini API key has hit its rate or daily quota. Wait a little while and try again, or check usage in [Google AI Studio](https://aistudio.google.com/).",
  fil: "## Naabot na ang limit ng Cloud AI\n\nNaabot na ng Gemini API key mo ang rate o daily quota. Maghintay sandali at subukang muli, o tingnan ang usage sa Google AI Studio.",
  ceb: "## Naabot na ang limit sa Cloud AI\n\nNaabot na sa imong Gemini API key ang rate o daily quota. Hulata gamay ug sulayi pag-usab, o tan-awa ang usage sa Google AI Studio.",
  bik: "## Naabot na an limit kan Cloud AI\n\nNaabot na kan saimong Gemini API key an rate o daily quota. Maghalat sagkod na mag-otro, o hilingon an usage sa Google AI Studio.",
  ilo: "## Naabot ti limit ti Cloud AI\n\nNaaboten ti Gemini API key mo ti rate wenno daily quota. Agurayka kaniam ket padasem manen, wenno kitaem ti usage iti Google AI Studio.",
  hil: "## Naabot na ang limit sang Cloud AI\n\nNaabot na sang imo Gemini API key ang rate ukon daily quota. Hulata gid sang makadali kag tilaw liwat, ukon tan-awa ang usage sa Google AI Studio.",
  es: "## Límite de Cloud AI alcanzado\n\nTu clave de Gemini alcanzó el límite de uso o cuota diaria. Espera un momento e inténtalo de nuevo, o revisa el uso en Google AI Studio.",
  la: "## Finis limitis Cloud AI\n\nClavis Gemini tuae limitem velocitatis vel quota diurna attigit. Expecta paulisper et iterum conare.",
  el: "## Έφτασε το όριο Cloud AI\n\nΤο κλειδί Gemini έφτασε το όριο ρυθμού ή την ημερήσια ποσόστωση. Περιμένετε λίγο και δοκιμάστε ξανά.",
};

export function getGeminiQuotaUserMessage(lang: LangType): string {
  return QUOTA_MESSAGES[lang] ?? QUOTA_MESSAGES.en;
}

/** Chat/translation fallback when Gemini fails mid-request. */
export function resolveGeminiChatErrorMessage(
  error: unknown,
  lang: LangType,
  offlineFallback: string,
): string {
  if (error instanceof GeminiQuotaError) {
    return `${error.message}\n\n${offlineFallback}`;
  }
  if (isGeminiQuotaOrRateLimitError(error)) {
    return `${getGeminiQuotaUserMessage(lang)}\n\n${offlineFallback}`;
  }
  if (error instanceof Error && error.message.trim()) {
    return `${error.message}\n\n${offlineFallback}`;
  }
  return offlineFallback;
}

export function isGeminiQuotaError(error: unknown): boolean {
  return (
    error instanceof GeminiQuotaError || isGeminiQuotaOrRateLimitError(error)
  );
}
