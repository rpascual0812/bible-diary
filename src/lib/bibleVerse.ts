import { getCachedBibleTranslation } from "./bibleTranslationStorage";
import type { BibleTranslationId } from "./bibleTranslations";
import {
  cacheChapterVerses,
  getCachedChapterVerses,
  isBibleTranslationDownloaded,
} from "./localBible";
import type { LangType } from "../types";

export interface BibleVerseInfo {
  book: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
}

const BOOK_MAP: Record<string, string> = {
  genesis: "Genesis",
  exodo: "Exodus",
  levitico: "Leviticus",
  bilang: "Numbers",
  numero: "Numbers",
  deuteronomio: "Deuteronomy",
  josue: "Joshua",
  hukom: "Judges",
  rut: "Ruth",
  samuel: "Samuel",
  hari: "Kings",
  cronica: "Chronicles",
  esdras: "Ezra",
  nehemias: "Nehemiah",
  ester: "Esther",
  job: "Job",
  salmo: "Psalms",
  mgasalmo: "Psalms",
  "mga salmo": "Psalms",
  kawikaan: "Proverbs",
  mangangaral: "Ecclesiastes",
  "awit ng mga awit": "Song of Solomon",
  awit: "Song of Solomon",
  isaias: "Isaiah",
  jeremias: "Jeremiah",
  panaghoy: "Lamentations",
  ezekiel: "Ezekiel",
  daniel: "Daniel",
  hosea: "Hosea",
  joel: "Joel",
  amos: "Amos",
  obadias: "Obadiah",
  jonas: "Jonah",
  miqueas: "Micah",
  nahum: "Nahum",
  habacuc: "Habakkuk",
  sofonias: "Zephaniah",
  hageo: "Haggai",
  zacarias: "Zechariah",
  malakias: "Malachi",
  mateo: "Matthew",
  marcos: "Mark",
  lucas: "Luke",
  juan: "John",
  gawa: "Acts",
  "mga gawa": "Acts",
  roma: "Romans",
  corinto: "Corinthians",
  galacia: "Galatians",
  efeso: "Ephesians",
  filipos: "Philippians",
  colosas: "Colossians",
  tesalonica: "Thessalonians",
  timoteo: "Timothy",
  tito: "Titus",
  filemon: "Philemon",
  hebreo: "Hebrews",
  santiago: "James",
  pedro: "Peter",
  judas: "Jude",
  pahayag: "Revelation",
  apocalipsis: "Revelation",
};

const BOOK_NAME_TRANSLATIONS: Record<LangType, Record<string, string>> = {
  en: {},
  fil: {
    Genesis: "Genesis",
    Exodus: "Exodo",
    Leviticus: "Levitiko",
    Numbers: "Bilang",
    Deuteronomy: "Deuteronomio",
    Joshua: "Josue",
    Judges: "Hukom",
    Ruth: "Ruth",
    Samuel: "Samuel",
    Kings: "Hari",
    Chronicles: "Cronica",
    Ezra: "Esdras",
    Nehemiah: "Nehemias",
    Esther: "Ester",
    Job: "Job",
    Psalms: "Salmo",
    Proverbs: "Kawikaan",
    Ecclesiastes: "Ecclesiastes",
    "Song of Solomon": "Awit ng mga Awit",
    Isaiah: "Isaias",
    Jeremiah: "Jeremias",
    Lamentations: "Panaghoy",
    Ezekiel: "Ezekiel",
    Daniel: "Daniel",
    Hosea: "Hosea",
    Joel: "Joel",
    Amos: "Amos",
    Obadiah: "Obadias",
    Jonah: "Jonas",
    Micah: "Miqueas",
    Nahum: "Nahum",
    Habakkuk: "Habacuc",
    Zephaniah: "Sofonias",
    Haggai: "Hageo",
    Zechariah: "Zacarias",
    Malachi: "Malakias",
    Matthew: "Mateo",
    Mark: "Marcos",
    Luke: "Lucas",
    John: "Juan",
    Acts: "Gawa",
    Romans: "Roma",
    Corinthians: "Corinto",
    Galatians: "Galacia",
    Ephesians: "Efeso",
    Philippians: "Filipos",
    Colossians: "Colosas",
    Thessalonians: "Tesalonica",
    Timothy: "Timoteo",
    Titus: "Tito",
    Philemon: "Filemon",
    Hebrews: "Hebreo",
    James: "Santiago",
    Peter: "Pedro",
    Jude: "Judas",
    Revelation: "Pahayag",
  },
  ceb: {
    Genesis: "Genesis",
    Exodus: "Exodo",
    Leviticus: "Levitico",
    Numbers: "Mga Numero",
    Deuteronomy: "Deuteronomio",
    Joshua: "Josue",
    Judges: "Hukom",
    Ruth: "Ruth",
    Samuel: "Samuel",
    Kings: "Hari",
    Chronicles: "Cronica",
    Ezra: "Esdras",
    Nehemiah: "Nehemias",
    Esther: "Ester",
    Job: "Job",
    Psalms: "Salmo",
    Proverbs: "Kawikaan",
    Ecclesiastes: "Ecclesiastes",
    "Song of Solomon": "Awit sa mga Awit",
    Isaiah: "Isaias",
    Jeremiah: "Jeremias",
    Lamentations: "Panaghoy",
    Ezekiel: "Ezekiel",
    Daniel: "Daniel",
    Hosea: "Hosea",
    Joel: "Joel",
    Amos: "Amos",
    Obadiah: "Obadias",
    Jonah: "Jonas",
    Micah: "Miqueas",
    Nahum: "Nahum",
    Habakkuk: "Habacuc",
    Zephaniah: "Sofonias",
    Haggai: "Hageo",
    Zechariah: "Zacarias",
    Malachi: "Malakias",
    Matthew: "Mateo",
    Mark: "Marcos",
    Luke: "Lucas",
    John: "Juan",
    Acts: "Gawa",
    Romans: "Roma",
    Corinthians: "Corinto",
    Galatians: "Galacia",
    Ephesians: "Efeso",
    Philippians: "Filipos",
    Colossians: "Colosas",
    Thessalonians: "Tesalonica",
    Timothy: "Timoteo",
    Titus: "Tito",
    Philemon: "Filemon",
    Hebrews: "Hebreo",
    James: "Santiago",
    Peter: "Pedro",
    Jude: "Judas",
    Revelation: "Pahayag",
  },
  bik: {
    Genesis: "Genesis",
    Exodus: "Exodo",
    Leviticus: "Levitico",
    Numbers: "Mga Numero",
    Deuteronomy: "Deuteronomio",
    Joshua: "Josue",
    Judges: "Hukom",
    Ruth: "Ruth",
    Samuel: "Samuel",
    Kings: "Hari",
    Chronicles: "Cronica",
    Ezra: "Esdras",
    Nehemiah: "Nehemias",
    Esther: "Ester",
    Job: "Job",
    Psalms: "Salmo",
    Proverbs: "Kawikaan",
    Ecclesiastes: "Ecclesiastes",
    "Song of Solomon": "Awit kan mga Awit",
    Isaiah: "Isaias",
    Jeremiah: "Jeremias",
    Lamentations: "Panaghoy",
    Ezekiel: "Ezekiel",
    Daniel: "Daniel",
    Hosea: "Hosea",
    Joel: "Joel",
    Amos: "Amos",
    Obadiah: "Obadias",
    Jonah: "Jonas",
    Micah: "Miqueas",
    Nahum: "Nahum",
    Habakkuk: "Habacuc",
    Zephaniah: "Sofonias",
    Haggai: "Hageo",
    Zechariah: "Zacarias",
    Malachi: "Malakias",
    Matthew: "Mateo",
    Mark: "Marcos",
    Luke: "Lucas",
    John: "Juan",
    Acts: "Gawa",
    Romans: "Roma",
    Corinthians: "Corinto",
    Galatians: "Galacia",
    Ephesians: "Efeso",
    Philippians: "Filipos",
    Colossians: "Colosas",
    Thessalonians: "Tesalonica",
    Timothy: "Timoteo",
    Titus: "Tito",
    Philemon: "Filemon",
    Hebrews: "Hebreo",
    James: "Santiago",
    Peter: "Pedro",
    Jude: "Judas",
    Revelation: "Pahayag",
  },
  ilo: {
    Genesis: "Genesis",
    Exodus: "Exodo",
    Leviticus: "Levitico",
    Numbers: "Numero",
    Deuteronomy: "Deuteronomio",
    Joshua: "Josue",
    Judges: "Hukom",
    Ruth: "Ruth",
    Samuel: "Samuel",
    Kings: "Hari",
    Chronicles: "Cronica",
    Ezra: "Esdras",
    Nehemiah: "Nehemias",
    Esther: "Ester",
    Job: "Job",
    Psalms: "Salmo",
    Proverbs: "Kawikaan",
    Ecclesiastes: "Ecclesiastes",
    "Song of Solomon": "Awit ti mga Awit",
    Isaiah: "Isaias",
    Jeremiah: "Jeremias",
    Lamentations: "Panaghoy",
    Ezekiel: "Ezekiel",
    Daniel: "Daniel",
    Hosea: "Hosea",
    Joel: "Joel",
    Amos: "Amos",
    Obadiah: "Obadias",
    Jonah: "Jonas",
    Micah: "Miqueas",
    Nahum: "Nahum",
    Habakkuk: "Habacuc",
    Zephaniah: "Sofonias",
    Haggai: "Hageo",
    Zechariah: "Zacarias",
    Malachi: "Malakias",
    Matthew: "Mateo",
    Mark: "Marcos",
    Luke: "Lucas",
    John: "Juan",
    Acts: "Gawa",
    Romans: "Roma",
    Corinthians: "Corinto",
    Galatians: "Galacia",
    Ephesians: "Efeso",
    Philippians: "Filipos",
    Colossians: "Colosas",
    Thessalonians: "Tesalonica",
    Timothy: "Timoteo",
    Titus: "Tito",
    Philemon: "Filemon",
    Hebrews: "Hebreo",
    James: "Santiago",
    Peter: "Pedro",
    Jude: "Judas",
    Revelation: "Pahayag",
  },
  hil: {
    Genesis: "Genesis",
    Exodus: "Exodo",
    Leviticus: "Levitico",
    Numbers: "Mga Numero",
    Deuteronomy: "Deuteronomio",
    Joshua: "Josue",
    Judges: "Hukom",
    Ruth: "Ruth",
    Samuel: "Samuel",
    Kings: "Hari",
    Chronicles: "Cronica",
    Ezra: "Esdras",
    Nehemiah: "Nehemias",
    Esther: "Ester",
    Job: "Job",
    Psalms: "Salmo",
    Proverbs: "Kawikaan",
    Ecclesiastes: "Ecclesiastes",
    "Song of Solomon": "Awit sang mga Awit",
    Isaiah: "Isaias",
    Jeremiah: "Jeremias",
    Lamentations: "Panaghoy",
    Ezekiel: "Ezekiel",
    Daniel: "Daniel",
    Hosea: "Hosea",
    Joel: "Joel",
    Amos: "Amos",
    Obadiah: "Obadias",
    Jonah: "Jonas",
    Micah: "Miqueas",
    Nahum: "Nahum",
    Habakkuk: "Habacuc",
    Zephaniah: "Sofonias",
    Haggai: "Hageo",
    Zechariah: "Zacarias",
    Malachi: "Malakias",
    Matthew: "Mateo",
    Mark: "Marcos",
    Luke: "Lucas",
    John: "Juan",
    Acts: "Gawa",
    Romans: "Roma",
    Corinthians: "Corinto",
    Galatians: "Galacia",
    Ephesians: "Efeso",
    Philippians: "Filipos",
    Colossians: "Colosas",
    Thessalonians: "Tesalonica",
    Timothy: "Timoteo",
    Titus: "Tito",
    Philemon: "Filemon",
    Hebrews: "Hebreo",
    James: "Santiago",
    Peter: "Pedro",
    Jude: "Judas",
    Revelation: "Pahayag",
  },
  es: {
    Genesis: "Génesis",
    Exodus: "Éxodo",
    Leviticus: "Levítico",
    Numbers: "Números",
    Deuteronomy: "Deuteronomio",
    Joshua: "Josué",
    Judges: "Jueces",
    Ruth: "Rut",
    Samuel: "Samuel",
    Kings: "Reyes",
    Chronicles: "Crónicas",
    Ezra: "Esdras",
    Nehemiah: "Nehemías",
    Esther: "Ester",
    Job: "Job",
    Psalms: "Salmos",
    Proverbs: "Proverbios",
    Ecclesiastes: "Eclesiastés",
    "Song of Solomon": "Cantar de los Cantares",
    Isaiah: "Isaías",
    Jeremiah: "Jeremías",
    Lamentations: "Lamentaciones",
    Ezekiel: "Ezequiel",
    Daniel: "Daniel",
    Hosea: "Oseas",
    Joel: "Joel",
    Amos: "Amós",
    Obadiah: "Abdías",
    Jonah: "Jonás",
    Micah: "Miqueas",
    Nahum: "Nahúm",
    Habakkuk: "Habacuc",
    Zephaniah: "Sofonías",
    Haggai: "Hageo",
    Zechariah: "Zacarías",
    Malachi: "Malaquías",
    Matthew: "Mateo",
    Mark: "Marcos",
    Luke: "Lucas",
    John: "Juan",
    Acts: "Hechos",
    Romans: "Romanos",
    Corinthians: "Corintios",
    Galatians: "Gálatas",
    Ephesians: "Efesios",
    Philippians: "Filipenses",
    Colossians: "Colosenses",
    Thessalonians: "Tesalonicenses",
    Timothy: "Timoteo",
    Titus: "Tito",
    Philemon: "Filemón",
    Hebrews: "Hebreos",
    James: "Santiago",
    Peter: "Pedro",
    Jude: "Judas",
    Revelation: "Apocalipsis",
  },
  la: {
    Genesis: "Genesis",
    Exodus: "Exodus",
    Leviticus: "Leviticus",
    Numbers: "Numeri",
    Deuteronomy: "Deuteronomium",
    Joshua: "Iosue",
    Judges: "Iudices",
    Ruth: "Ruth",
    Samuel: "Samuel",
    Kings: "Reges",
    Chronicles: "Chronica",
    Ezra: "Esdra",
    Nehemiah: "Nehemia",
    Esther: "Esther",
    Job: "Iob",
    Psalms: "Psalmi",
    Proverbs: "Proverbia",
    Ecclesiastes: "Ecclesiastes",
    "Song of Solomon": "Canticum Canticorum",
    Isaiah: "Isaias",
    Jeremiah: "Ieremias",
    Lamentations: "Lamentationes",
    Ezekiel: "Ezechiel",
    Daniel: "Daniel",
    Hosea: "Osee",
    Joel: "Joel",
    Amos: "Amos",
    Obadiah: "Abdias",
    Jonah: "Ionas",
    Micah: "Micha",
    Nahum: "Nahum",
    Habakkuk: "Habacuc",
    Zephaniah: "Sophonias",
    Haggai: "Haggai",
    Zechariah: "Zacharias",
    Malachi: "Malachias",
    Matthew: "Matthaeus",
    Mark: "Marcus",
    Luke: "Lucas",
    John: "Ioannes",
    Acts: "Actus",
    Romans: "Ad Romanos",
    Corinthians: "Ad Corinthios",
    Galatians: "Ad Galatas",
    Ephesians: "Ad Ephesios",
    Philippians: "Ad Philippenses",
    Colossians: "Ad Colossenses",
    Thessalonians: "Ad Thessalonicenses",
    Timothy: "Ad Timotheum",
    Titus: "Ad Titum",
    Philemon: "Ad Philemonem",
    Hebrews: "Ad Hebraeos",
    James: "Iacobus",
    Peter: "Petrus",
    Jude: "Iudas",
    Revelation: "Apocalypsis",
  },
  el: {
    Genesis: "Γένεση",
    Exodus: "Έξοδος",
    Leviticus: "Λευιτικό",
    Numbers: "Αριθμοί",
    Deuteronomy: "Δευτερονόμιο",
    Joshua: "Ιησούς του Ναυή",
    Judges: "Κριτές",
    Ruth: "Ρουθ",
    Samuel: "Σαμουήλ",
    Kings: "Βασιλείες",
    Chronicles: "Παραλειπομένων",
    Ezra: "Έσδρας",
    Nehemiah: "Νεεμίας",
    Esther: "Εσθήρ",
    Job: "Ιώβ",
    Psalms: "Ψαλμοί",
    Proverbs: "Παροιμίες",
    Ecclesiastes: "Εκκλησιαστής",
    "Song of Solomon": "Άσμα Ασμάτων",
    Isaiah: "Ησαΐας",
    Jeremiah: "Ιερεμίας",
    Lamentations: "Θρήνοι",
    Ezekiel: "Ιεζεκιήλ",
    Daniel: "Δανιήλ",
    Hosea: "Ωσηέ",
    Joel: "Ιωήλ",
    Amos: "Αμώς",
    Obadiah: "Αβδιού",
    Jonah: "Ιωνάς",
    Micah: "Μιχαίας",
    Nahum: "Ναούμ",
    Habakkuk: "Αββακούμ",
    Zephaniah: "Σοφονίας",
    Haggai: "Αγγαίος",
    Zechariah: "Ζαχαρίας",
    Malachi: "Μαλαχίας",
    Matthew: "Ματθαίος",
    Mark: "Μάρκος",
    Luke: "Λουκάς",
    John: "Ιωάννης",
    Acts: "Πράξεις",
    Romans: "Ρωμαίους",
    Corinthians: "Κορινθίους",
    Galatians: "Γαλάτες",
    Ephesians: "Εφεσίους",
    Philippians: "Φιλιππησίους",
    Colossians: "Κολοσσαείς",
    Thessalonians: "Θεσσαλονικείς",
    Timothy: "Τιμόθεο",
    Titus: "Τίτο",
    Philemon: "Φιλήμονα",
    Hebrews: "Εβραίους",
    James: "Ιάκωβος",
    Peter: "Πέτρος",
    Jude: "Ιούδα",
    Revelation: "Αποκάλυψη",
  },
  pt: {
    Genesis: "Gênesis",
    Exodus: "Êxodo",
    Leviticus: "Levítico",
    Numbers: "Números",
    Deuteronomy: "Deuteronômio",
    Joshua: "Josué",
    Judges: "Juízes",
    Ruth: "Rute",
    Samuel: "Samuel",
    Kings: "Reis",
    Chronicles: "Crônicas",
    Ezra: "Esdras",
    Nehemiah: "Neemias",
    Esther: "Ester",
    Job: "Jó",
    Psalms: "Salmos",
    Proverbs: "Provérbios",
    Ecclesiastes: "Eclesiastes",
    "Song of Solomon": "Cântico dos Cânticos",
    Isaiah: "Isaías",
    Jeremiah: "Jeremias",
    Lamentations: "Lamentações",
    Ezekiel: "Ezequiel",
    Daniel: "Daniel",
    Hosea: "Oséias",
    Joel: "Joel",
    Amos: "Amós",
    Obadiah: "Obadias",
    Jonah: "Jonas",
    Micah: "Miqueias",
    Nahum: "Naum",
    Habakkuk: "Habacuque",
    Zephaniah: "Sofonias",
    Haggai: "Ageu",
    Zechariah: "Zacarias",
    Malachi: "Malaquias",
    Matthew: "Mateus",
    Mark: "Marcos",
    Luke: "Lucas",
    John: "João",
    Acts: "Atos",
    Romans: "Romanos",
    Corinthians: "Coríntios",
    Galatians: "Gálatas",
    Ephesians: "Efésios",
    Philippians: "Filipenses",
    Colossians: "Colossenses",
    Thessalonians: "Tessalonicenses",
    Timothy: "Tiago",
    Titus: "Tito",
    Philemon: "Filêmon",
    Hebrews: "Hebreus",
    James: "Tiago",
    Peter: "Pedro",
    Jude: "Judas",
    Revelation: "Apocalipse",
  },
  fr: {
    Genesis: "Genèse",
    Exodus: "Exode",
    Leviticus: "Lévitique",
    Numbers: "Nombres",
    Deuteronomy: "Deutéronome",
    Joshua: "Josué",
    Judges: "Juges",
    Ruth: "Ruth",
    Samuel: "Samuel",
    Kings: "Rois",
    Chronicles: "Chroniques",
    Ezra: "Esdras",
    Nehemiah: "Néhémie",
    Esther: "Esther",
    Job: "Job",
    Psalms: "Psaumes",
    Proverbs: "Proverbes",
    Ecclesiastes: "Ecclésiaste",
    "Song of Solomon": "Cantique des Cantiques",
    Isaiah: "Ésaïe",
    Jeremiah: "Jérémie",
    Lamentations: "Lamentations",
    Ezekiel: "Ézéchiel",
    Daniel: "Daniel",
    Hosea: "Osée",
    Joel: "Joël",
    Amos: "Amos",
    Obadiah: "Abdias",
    Jonah: "Jonas",
    Micah: "Michée",
    Nahum: "Nahum",
    Habakkuk: "Habacuc",
    Zephaniah: "Sophonie",
    Haggai: "Aggée",
    Zechariah: "Zacharie",
    Malachi: "Malachie",
    Matthew: "Matthieu",
    Mark: "Marc",
    Luke: "Luc",
    John: "Jean",
    Acts: "Actes",
    Romans: "Romains",
    Corinthians: "Corinthiens",
    Galatians: "Galates",
    Ephesians: "Éphésiens",
    Philippians: "Philippiens",
    Colossians: "Colossiens",
    Thessalonians: "Thessaloniciens",
    Timothy: "Timothée",
    Titus: "Tite",
    Philemon: "Philémon",
    Hebrews: "Hébreux",
    James: "Jacques",
    Peter: "Pierre",
    Jude: "Jude",
    Revelation: "Apocalypse",
  },
};

export function cleanAndMapBook(bookName: string): string {
  const norm = bookName.toLowerCase().replace(/\s+/g, "").trim();
  const numberPrefixMatch = bookName.match(/^([1-3])\s*(.*)$/);
  if (numberPrefixMatch) {
    const num = numberPrefixMatch[1];
    const rest = numberPrefixMatch[2].toLowerCase().replace(/\s+/g, "").trim();
    const mappedRest = BOOK_MAP[rest] || bookName;
    return `${num} ${mappedRest}`;
  }
  return BOOK_MAP[norm] || bookName;
}

export function detectBibleVerse(text: string): BibleVerseInfo | null {
  if (!text) return null;

  const cleanText = text
    .replace(
      /^(?:please|paki|pakisuyo|paki-suyo|can\s+you\s+)?(?:read|show|open|find|basahin|basaha|basahon|basaen|hanapin|ipakita|isulat)\s+(?:ang|an|ti|the\s+)?/i,
      ""
    )
    .trim();

  const regex = /\b((?:[1-3]\s*)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)[\s:]+(\d+)(?:\s*-\s*(\d+))?/;
  const match = cleanText.match(regex);
  if (!match) return null;

  const book = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const startVerse = parseInt(match[3], 10);
  const endVerse = match[4] ? parseInt(match[4], 10) : undefined;

  const exclusions = [
    "what",
    "how",
    "why",
    "who",
    "when",
    "where",
    "the",
    "and",
    "they",
    "this",
    "that",
    "there",
    "their",
  ];
  if (exclusions.includes(book.toLowerCase())) {
    return null;
  }

  return { book, chapter, startVerse, endVerse };
}

export function formatVerseRef(info: BibleVerseInfo): string {
  const range = info.endVerse ? `-${info.endVerse}` : "";
  return `${info.book} ${info.chapter}:${info.startVerse}${range}`;
}

export function localizeVerseReference(reference: string, lang: LangType): string {
  if (!reference || lang === "en") return reference;

  const match = reference.match(
    /^((?:[1-3]\s*)?(?:[A-Za-z]+(?:\s+[A-Za-z]+)*))\s+(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/,
  );
  if (!match) return reference;

  const [, rawBook, chapter, verse, endVerse] = match;
  const numberPrefixMatch = rawBook.match(/^([1-3])\s*(.*)$/);
  const prefix = numberPrefixMatch?.[1] ?? "";
  const baseBook = numberPrefixMatch?.[2] ?? rawBook;
  const localizedBook = BOOK_NAME_TRANSLATIONS[lang]?.[baseBook] ?? baseBook;
  const versePart = verse ? `:${verse}${endVerse ? `-${endVerse}` : ""}` : "";
  const formattedBook = prefix ? `${prefix} ${localizedBook}` : localizedBook;
  return `${formattedBook} ${chapter}${versePart}`;
}

export function getPrevChapterRef(info: BibleVerseInfo): string | null {
  if (info.chapter <= 1) return null;
  return `${info.book} ${info.chapter - 1}:1`;
}

export function getNextChapterRef(info: BibleVerseInfo): string {
  return `${info.book} ${info.chapter + 1}:1`;
}

export function getBibleApiBase(): string {
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_BIBLE_API_URL) {
    return process.env.EXPO_PUBLIC_BIBLE_API_URL.replace(/\/$/, "");
  }
  if (typeof process !== "undefined" && process.env?.VITE_BIBLE_API_URL) {
    return process.env.VITE_BIBLE_API_URL.replace(/\/$/, "");
  }
  return "https://bible-api.com";
}

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
    ? !navigator.onLine
    : false;
}

function isRetryableVerseLookupError(error: unknown): boolean {
  if (isBrowserOffline()) return false;

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("offline") ||
      message.includes("not found") ||
      message.includes("no verse text found") ||
      message.includes("no verses returned") ||
      message.includes("verse not found") ||
      message.includes("chapter not found")
    ) {
      return false;
    }
    if (
      message.includes("failed to fetch") ||
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("429") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("econnreset") ||
      message.includes("socket hang up")
    ) {
      return true;
    }
  }

  return true;
}

async function fetchWithRetry<T>(request: () => Promise<T>): Promise<T> {
  const maxAttempts = 4;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRetryableVerseLookupError(error)) {
        throw error;
      }

      const delayMs = attempt * 350;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

export async function fetchVerseText(
  info: BibleVerseInfo,
  translation?: BibleTranslationId,
): Promise<string> {
  const resolvedTranslation = translation ?? getCachedBibleTranslation();
  const searchBook = cleanAndMapBook(info.book);
  const cachedChapter = await getCachedChapterVerses(
    resolvedTranslation,
    searchBook,
    info.chapter,
  );
  if (cachedChapter) {
    const endVerse = info.endVerse || info.startVerse;
    const text = cachedChapter
      .filter((v) => v.verse >= info.startVerse && v.verse <= endVerse)
      .map((v) => v.text)
      .join(" ")
      .trim();
    if (text) return text;
  }

  const translationIsDownloaded = await isBibleTranslationDownloaded(resolvedTranslation);
  if (translationIsDownloaded) {
    throw new Error("Local Bible data is not available for this passage");
  }

  if (isBrowserOffline()) {
    throw new Error("OFFLINE");
  }

  const range = info.endVerse ? `-${info.endVerse}` : "";
  return fetchWithRetry(async () => {
    const response = await fetch(
      `${getBibleApiBase()}/${encodeURIComponent(searchBook)}+${info.chapter}:${info.startVerse}${range}?translation=${encodeURIComponent(resolvedTranslation)}`
    );
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Verse not found");
      }
      throw new Error("Bible text not found");
    }
    const data = await response.json();
    if (!data.text) {
      throw new Error("No verse text found");
    }
    return data.text.trim();
  });
}

export interface ChapterVerse {
  verse: number;
  text: string;
}

export async function fetchChapterVerses(
  info: BibleVerseInfo,
  translation?: BibleTranslationId,
): Promise<ChapterVerse[]> {
  const resolvedTranslation = translation ?? getCachedBibleTranslation();
  const searchBook = cleanAndMapBook(info.book);
  const cachedChapter = await getCachedChapterVerses(
    resolvedTranslation,
    searchBook,
    info.chapter,
  );
  if (cachedChapter) return cachedChapter;

  const translationIsDownloaded = await isBibleTranslationDownloaded(resolvedTranslation);
  if (translationIsDownloaded) {
    throw new Error("Local Bible data is not available for this chapter");
  }

  const verses = await fetchChapterVersesFromNetwork(
    searchBook,
    info.chapter,
    resolvedTranslation,
  );
  await cacheChapterVerses(
    resolvedTranslation,
    searchBook,
    info.chapter,
    verses,
  );
  return verses;
}

export async function fetchChapterVersesFromNetwork(
  book: string,
  chapter: number,
  translation: BibleTranslationId,
): Promise<ChapterVerse[]> {
  if (isBrowserOffline()) {
    throw new Error("OFFLINE");
  }

  return fetchWithRetry(async () => {
    const response = await fetch(
      `${getBibleApiBase()}/${encodeURIComponent(book)}+${chapter}?translation=${encodeURIComponent(translation)}`
    );
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Chapter not found");
      }
      throw new Error("Chapter lookup failed");
    }
    const data = await response.json();
    if (!data.verses?.length) {
      throw new Error("No verses returned");
    }
    return data.verses.map((v: { verse: number; text: string }) => ({
      verse: v.verse,
      text: v.text.trim(),
    }));
  });
}
