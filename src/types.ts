import type { Message } from "./services/geminiService";

export type LangType = "en" | "fil" | "ceb" | "bik" | "ilo" | "hil" | "es" | "la" | "el";

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  created_at: number;
}
