import type { LangType } from "../types";
import { pickRandomVerseReferences } from "./verseSuggestions";

export interface FollowUpSuggestion {
  type: "question" | "verse";
  text: string;
  reference?: string;
}

const FOLLOWUPS_FENCE_RE = /```followups\s*([\s\S]*?)```/i;

const OFFLINE_QUESTIONS: Record<LangType, string[]> = {
  en: [
    "How does this theme appear elsewhere in Scripture?",
    "What practical step can you take from this teaching today?",
    "Would you like to explore a related Bible character or story?",
  ],
  fil: [
    "Paano lumilitaw ang temang ito sa ibang bahagi ng Kasulatan?",
    "Anong praktikal na hakbang ang maaari mong gawin mula sa aral na ito ngayon?",
    "Nais mo bang tuklasin ang isang kaugnay na tauhan o kuwento sa Bibliya?",
  ],
  ceb: [
    "Giunsa kini nga tema makita sa ubang bahin sa Kasulatan?",
    "Unsang praktikal nga lakang ang imong mahimo gikan niini nga pagtulon-an karon?",
    "Gusto ka bang susihon ang usa ka may kalabotan nga tawo o sugilanon sa Bibliya?",
  ],
  bik: [
    "Paano an tema na ini nagpapakita sa ibang parte kan Kasuratan?",
    "Anong praktikal na lakdang an pwede mong gibo gikan sa aral na ini ngonian?",
    "Gusto mo bang saliksikon an sarong may kaugnayan na tawo o istorya sa Biblia?",
  ],
  ilo: [
    "Kasano a makita daytoy a tema iti sabali a paset ti Kasuratan?",
    "Ania ti praktikal a tignay a mabalinmo nga aramiden manipud iti daytoy a sursuro ita nga aldaw?",
    "Kayatmo kadi a sukisoken ti maysa a mainaig a tao wenno istoria iti Biblia?",
  ],
  hil: [
    "Paano makita ini nga tema sa iban nga bahin sang Kasulatan?",
    "Ano ang praktikal nga tikang nga mahimo mo gikan sa sini nga pagtulun-an subong?",
    "Gusto mo bala mag-usisa sang may kalabotan nga tawo ukon sugilanon sa Bibliya?",
  ],
  es: [
    "¿Cómo aparece este tema en otras partes de la Escritura?",
    "¿Qué paso práctico puedes dar hoy a partir de esta enseñanza?",
    "¿Te gustaría explorar un personaje o historia bíblica relacionada?",
  ],
  la: [
    "Quomodo hoc thema alibi in Scriptura apparet?",
    "Quod prakticum gradum ex hac doctrina hodie capere potes?",
    "Visne personam vel historiam biblicam cognatam explorare?",
  ],
  el: [
    "Πώς εμφανίζεται αυτό το θέμα αλλού στην Αγία Γραφή;",
    "Ποιο πρακτικό βήμα μπορείτε να κάνετε από αυτή τη διδασκαλία σήμερα;",
    "Θα θέλατε να εξερευνήσετε έναν σχετικό βιβλικό χαρακτήρα ή ιστορία;",
  ],
  pt: [
    "Como esse tema aparece em outras partes das Escrituras?",
    "Que passo prático você pode dar a partir deste ensino hoje?",
    "Gostaria de explorar um personagem ou história bíblica relacionada?",
  ],
  fr: [
    "Comment ce thème apparaît-il ailleurs dans les Écritures ?",
    "Quelle démarche pratique pouvez-vous tirer de cet enseignement aujourd'hui ?",
    "Souhaitez-vous explorer un personnage ou une histoire biblique liée ?",
  ],
};

const READ_VERSE_LABEL: Record<LangType, string> = {
  en: "Read",
  fil: "Basahin",
  ceb: "Basaha",
  bik: "Basaha",
  ilo: "Basaen",
  hil: "Basaha",
  es: "Lee",
  la: "Lege",
  el: "Διάβασε",
  pt: "Leia",
  fr: "Lisez",
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function parseFollowUpJson(raw: string): FollowUpSuggestion[] {
  try {
    const parsed = JSON.parse(raw.trim()) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item): FollowUpSuggestion | null => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const type = record.type;
        const text = typeof record.text === "string" ? record.text.trim() : "";
        if (!text) return null;

        if (type === "question") {
          return { type: "question", text };
        }

        if (type === "verse") {
          const reference =
            typeof record.reference === "string"
              ? record.reference.trim()
              : text;
          return {
            type: "verse",
            reference,
            text:
              reference === text
                ? `${READ_VERSE_LABEL.en} ${reference}`
                : text,
          };
        }

        return null;
      })
      .filter((item): item is FollowUpSuggestion => item !== null)
      .slice(0, 3);
  } catch {
    return [];
  }
}

export function stripAndParseFollowUps(raw: string): {
  text: string;
  followUps: FollowUpSuggestion[];
} {
  const match = raw.match(FOLLOWUPS_FENCE_RE);
  if (!match) {
    return { text: raw.trimEnd(), followUps: [] };
  }

  return {
    text: raw.replace(FOLLOWUPS_FENCE_RE, "").trimEnd(),
    followUps: parseFollowUpJson(match[1]),
  };
}

export function buildOfflineFollowUps(
  responseText: string,
  _userQuery: string,
  lang: LangType,
): FollowUpSuggestion[] {
  const questions = shuffle(OFFLINE_QUESTIONS[lang] ?? OFFLINE_QUESTIONS.en).slice(
    0,
    2,
  );
  const [verseRef] = pickRandomVerseReferences(1);
  const readLabel = READ_VERSE_LABEL[lang] ?? READ_VERSE_LABEL.en;

  return [
    ...questions.map(
      (text): FollowUpSuggestion => ({
        type: "question",
        text,
      }),
    ),
    {
      type: "verse",
      reference: verseRef,
      text: `${readLabel} ${verseRef}`,
    },
  ];
}

export function processModelResponse(
  raw: string,
  userQuery: string,
  lang: LangType,
): { text: string; followUps: FollowUpSuggestion[] } {
  const { text, followUps } = stripAndParseFollowUps(raw);
  if (followUps.length > 0) {
    return { text, followUps };
  }
  return {
    text,
    followUps: buildOfflineFollowUps(text, userQuery, lang),
  };
}

export const FOLLOW_UP_SYSTEM_APPENDIX = `
CRITICAL: After your complete visible answer, append a fenced code block with language tag followups containing a JSON array of 2-3 follow-up suggestions closely related to what you just discussed. Mix "question" items (thoughtful study questions) and "verse" items (scripture references with a brief reason to read them). Example:
\`\`\`followups
[{"type":"question","text":"How does this connect to God's covenant?"},{"type":"verse","reference":"Romans 8:28","text":"Read how God works all things for good."}]
\`\`\`
Write all text fields in the same language as your main answer. Do not mention or describe this block in your visible answer.`;
