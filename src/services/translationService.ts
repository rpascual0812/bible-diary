import { GoogleGenAI } from "@google/genai";
import { getLanguageName } from "../languages";
import type { LangType } from "../types";
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

export async function translateText(
  apiKey: string,
  text: string,
  targetLang: LangType,
): Promise<string> {
  if (!text.trim()) return text;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Translate the following text to ${getLanguageName(targetLang)}. Preserve Markdown formatting and scripture references. Return ONLY the translated text.\n\n${text}`,
  });

  return response.text?.trim() || text;
}

export async function translateMessages(
  apiKey: string,
  messages: Message[],
  targetLang: LangType,
): Promise<Message[]> {
  if (messages.length === 0) return [];

  const ai = new GoogleGenAI({ apiKey });
  const payload = messages.map((message) => message.text);
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `You are translating a Bible study chat for Bible Diary. Translate each string in the JSON array below to ${getLanguageName(targetLang)}. Preserve Markdown, scripture references, and theological terms. Return ONLY a JSON array of translated strings in the same order.

${JSON.stringify(payload)}`,
  });

  const translated = parseJsonStringArray(response.text ?? "[]");
  return messages.map((message, index) => ({
    ...message,
    text: translated[index] ?? message.text,
  }));
}
