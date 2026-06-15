import { GoogleGenAI } from "@google/genai";
import {
  getGeminiQuotaUserMessage,
  isGeminiQuotaOrRateLimitError,
  GeminiQuotaError,
} from "../lib/geminiErrors";
import { getLanguageName } from "../languages";
import type { ChatSession, LangType } from "../types";
import type { Message } from "./geminiService";

const MODEL = "gemini-3-flash-preview";

function parseJsonStringArray(raw: string): string[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("Translation response was not a JSON array.");
  }
  return parsed.map((item) => String(item));
}

async function generateWithQuotaCheck(
  apiKey: string,
  lang: LangType,
  contents: string,
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
    });
    return response.text ?? "";
  } catch (error) {
    if (isGeminiQuotaOrRateLimitError(error)) {
      throw new GeminiQuotaError(getGeminiQuotaUserMessage(lang), error);
    }
    throw error;
  }
}

export async function translateText(
  apiKey: string,
  text: string,
  targetLang: LangType,
): Promise<string> {
  if (!text.trim()) return text;

  const raw = await generateWithQuotaCheck(
    apiKey,
    targetLang,
    `Translate the following text to ${getLanguageName(targetLang)}. Preserve Markdown formatting and scripture references. Return ONLY the translated text.\n\n${text}`,
  );

  return raw.trim() || text;
}

export async function translateMessages(
  apiKey: string,
  messages: Message[],
  targetLang: LangType,
): Promise<Message[]> {
  if (messages.length === 0) return [];

  const payload = messages.map((message) => message.text);
  const raw = await generateWithQuotaCheck(
    apiKey,
    targetLang,
    `You are translating a Bible study chat for Bible Diary. Translate each string in the JSON array below to ${getLanguageName(targetLang)}. Preserve Markdown, scripture references, and theological terms. Return ONLY a JSON array of translated strings in the same order.

${JSON.stringify(payload)}`,
  );

  const translated = parseJsonStringArray(raw || "[]");
  return messages.map((message, index) => ({
    ...message,
    text: translated[index] ?? message.text,
  }));
}

export function sessionNeedsTranslation(
  session: ChatSession,
  targetLang: LangType,
): boolean {
  if (session.messages.length === 0) return false;
  if (session.language == null) return true;
  return session.language !== targetLang;
}

export async function translateChatSession(
  apiKey: string,
  session: ChatSession,
  targetLang: LangType,
): Promise<ChatSession> {
  const translatedMessages = await translateMessages(
    apiKey,
    session.messages,
    targetLang,
  );
  const translatedTitle = session.title.trim()
    ? await translateText(apiKey, session.title, targetLang)
    : session.title;

  return {
    ...session,
    title: translatedTitle,
    messages: translatedMessages,
    language: targetLang,
  };
}
