import type { Message } from "./services/geminiService";

export type LangType = "en" | "fil" | "ceb" | "bik" | "ilo" | "hil" | "es" | "la" | "el" | "pt" | "fr";

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  created_at: number;
  /** Language the stored title and messages are written in. */
  language?: LangType;
}
