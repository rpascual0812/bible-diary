/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  BookOpen, 
  Sparkles, 
  User, 
  ChevronLeft, 
  ChevronDown,
  Languages,
  Menu,
  MessageSquare,
  Search,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  Globe,
  Sun,
  Moon,
  Heart,
  Key
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { GeminiService, Message } from "./services/geminiService";
import { cn, formatTime } from "./lib/utils";
import { getOfflineAnswer } from "./data/offlineBibleData";
import { LanguageDropdown } from "./components/LanguageDropdown";
import { BibleVerseReader } from "./components/BibleVerseReader";
import { VoiceReader } from "./components/VoiceReader";
import { DonationModal } from "./components/DonationModal";
import { BAKED_GEMINI_API_KEY } from "./config/apiKey";
import brandLogo from "./assets/images/living_word_logo_1780587127782.png";
import { saveSessionsToIndexedDB, loadSessionsFromIndexedDB } from "./lib/indexedDbHelper";

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  created_at: number;
}

export type LangType = "en" | "fil" | "ceb" | "bik" | "ilo" | "hil";

const ALL_TOPICS = [
  "What does scripture say about peace?",
  "Tell me the story of Melchizedek.",
  "Explain the Sermon on the Mount.",
  "What does the Bible say about hope?",
  "Who was Queen Esther and how did she save her people?",
  "Explain the profound meaning of Psalm 23.",
  "What does the Bible teach about sacrificial love (Agape)?",
  "How is faith explained in Hebrews chapter 11?",
  "Tell me the story of Elijah on Mount Carmel.",
  "What can we learn from the Parable of the Prodigal Son?",
  "Summarize the major covenant promises to Abraham.",
  "What are the fruits of the Spirit in Galatians 5?",
  "Explain the significance of the Gospel story."
];

const ALL_TOPICS_FIL = [
  "Ano ang sinasabi ng kasulatan tungkol sa kapayapaan?",
  "Ikwento sa akon ang buhay ni Melquisedek.",
  "Ipaliwanag ang Sermon sa Bundok sa Mateo.",
  "Ano ang sinasabi ng Bibliya tungkol sa pag-asa?",
  "Sino si Reyna Ester at paano niya iniligtas ang kanyang lahi?",
  "Ipaliwanag ang malalim na kahulugan ng Salmo 23.",
  "Ano ang itinuturo ng Bibliya tungkol sa tapat na pag-ibig?",
  "Paano ipinaliwanag ang pananampalataya sa Hebreo kabanata 11?",
  "Ikwento sa akin ang tungkol kay Elias sa Bundok ng Carmelo.",
  "Ano ang matututunan natin sa Talinghaga ng Nawawalang Anak?",
  "Ibuod ang mga pangako ng kasunduan ng Diyos kay Abraham.",
  "Ano ang naging mga bunga ng Espiritu Santo sa Galacia 5?",
  "Ipaliwanag ang kahalagahan ng Ebanghelyo ni Kristo Hesus."
];

const ALL_TOPICS_CEB = [
  "Unsay giingon sa kasulatan bahin sa kalinaw?",
  "Isubay kanako ang sugilanon mahitungod kang Melquisedec.",
  "Ipapatin-aw ang Sermon sa Bukid ni Mateo.",
  "Unsay giingon sa Bibliya bahin sa paglaum?",
  "Kinsa si Rayna Ester ug sa unsang paagi niya naluwas ang iyang katawhan?",
  "Ipapatin-aw ang lawom nga kahulugan sa Salmo 23.",
  "Unsay gitudlo sa Bibliya bahin sa sakripisyong gugma?",
  "Giunsa pagpatin-aw ang pagtuo sa Hebreohanon kapitulo 11?",
  "Iasoy kanako ang mahitungod kang Elias sa Bukid sa Carmelo.",
  "Unsay atong makat-unan sa Parabula sa Nawalang Anak?",
  "I-summarize ang mahinungdanong mga saad sa kasabotan ngadto kang Abraham.",
  "Unsa ang mga bunga sa Espiritu sa Galacia 5?",
  "Ikapatin-aw ang kahulugan sa Ebanghelyo ni Hesukristo."
];

const ALL_TOPICS_BIK = [
  "Ano an sinasabi kan kasuratan manungod sa katoninongan?",
  "I-storya sako an buhay ni Melquisedec.",
  "Ipaliwanag an Sermon sa Bukid sa Mateo.",
  "Ano an sinasabi kan Biblia manungod sa paglaom?",
  "Siisay si Reyna Ester asin pano niya iniligtas an saiyang kapwa?",
  "Ipaliwanag an malolobong kahulugan kan Salmo 23.",
  "Ano an itinutukdo kan Biblia manungod sa pagsakripisyong pagkamoot-Agape?",
  "Pano ipinaliwanag an pagtubod sa Hebreo kabanata 11?",
  "I-storya sako an manungod ki Elias sa Bukid kan Carmelo.",
  "Ano an satong manonodan sa Talinhaga kan Nawalang Aki?",
  "Ibuod an mga pangako kan tipan nin Dios ki Abraham.",
  "Ano an mga bunga kan Espiritu Santo sa Galacia 5?",
  "Ipaliwanag an kahalagahan kan Ebanghelyo ni Cristo Hesus."
];

const ALL_TOPICS_ILO = [
  "Ania ti ibagbaga ti kasuratan maipanggep iti katalnaan?",
  "Saritaem kaniak ti maipanggep ken Melquisedec.",
  "Ipalawagmo ti Sermon iti Bantay ti Mateo.",
  "Ania ti ibagbaga ti Biblia maipanggep iti namnama?",
  "Siasino ni Reyna Ester ken kasano a sinalakanna ti ilina?",
  "Ipalawag ti nauneg a kaipapanan ti Salmo 23.",
  "Ania ti isursuro ti Biblia maipanggep iti ayat a managsakripisio (Agape)?",
  "Kasano a nailawag ti pammati iti Hebreo kabanata 11?",
  "Ipadamag kaniak ti maipanggep ken Elias sadi Bantay Carmelo.",
  "Ania ti masursurotayo iti Parabola ti No Nagawid nga Anak?",
  "Ibuod ti maipanggep kadagiti tulag ti Dios ken Abraham.",
  "Ania dagiti bunga ti Espiritu Santo iti Galacia 5?",
  "Ipalawag ti pateg ti Ebanghelyo ni Jesucristo."
];

const ALL_TOPICS_HIL = [
  "Ano ang ginasiling sang kasuratan nahanungod sa paghidait?",
  "Isugid sa akon ang sugilanon nahanungod kay Melquisedec.",
  "Ipaathag ang Sermon sa Bukid sa Mateo.",
  "Ano ang ginasiling sang Biblia nahanungod sa paglaum?",
  "Sin-o si Reyna Ester kag paano niya ginluwas ang iya kapungsuran?",
  "Ipaathag ang madalom nga kahulugan sang Salmo 23.",
  "Ano ang ginatudlo sang Biblia nahanungod sa gugma nga nagasandig (Agape)?",
  "Paano ginasaysay ang pagtuo sa Hebreo kapitulo 11?",
  "Isugid sa akon ang sugilanon nahanungod kay Elias sa Bukid sang Carmelo.",
  "Ano ang aton matun-an sa Paraliko sang Nadula nga Anak?",
  "I-summarize ang mga mabinantayon nga saad sang Dios kay Abraham.",
  "Ano ang mga bunga sang Espiritu Santo sa Galacia 5?",
  "Ipaathag ang importansya sang Ebanghelyo ni Hesukristo."
];

const getUiTranslation = (key: string, lang: LangType) => {
  const dicts: Record<string, Record<string, string>> = {
    studyArchives: {
      en: "Study Archives",
      fil: "Mga Archive ng Pag-aaral",
      ceb: "Mga Archive sa Pagtuon",
      bik: "Mga Archive kan Pag-adal",
      ilo: "Pakasaritaan ti Pag-adal",
      hil: "Mga Archive sang Pagtuon"
    },
    noChats: {
      en: "No previous study chats saved.",
      fil: "Walang nakaraang chat sa pag-aaral.",
      ceb: "Walay unang chat sa pagtuon.",
      bik: "Mayong nakaaging chat sa pag-adal.",
      ilo: "Awan ti nasarita a pag-adal.",
      hil: "Wala sing nauna nga chat sa pagtuon."
    },
    newChat: {
      en: "New Study Chat",
      fil: "Bagong Chat",
      ceb: "Bag-ong Chat",
      bik: "Bagong Chat",
      ilo: "Baro a Chat",
      hil: "Bag-o nga Chat"
    },
    langLabel: {
      en: "Conversation Language",
      fil: "Wika ng Pag-aaral",
      ceb: "Pinulongan sa Pagtuon",
      bik: "Wika nin Pag-adal",
      ilo: "Pagsasao ti Panag-adal",
      hil: "Hambal sang Pagtuon"
    },
    demoTitle: {
      en: "Demo Testing",
      fil: "Pagsubok sa Demo",
      ceb: "Pagsulay sa Demo",
      bik: "Pagsubok sa Demo",
      ilo: "Padasen ti Demo",
      hil: "Pagsulay sa Demo"
    },
    simOffline: {
      en: "Simulate Offline Mode",
      fil: "I-simulate ang Offline",
      ceb: "I-simulate ang Offline",
      bik: "I-simulate an Offline",
      ilo: "I-simulate ti Offline",
      hil: "I-simulate ang Offline"
    },
    connected: {
      en: "Connection OK",
      fil: "May Koneksyon",
      ceb: "Konektado",
      bik: "May Koneksyon",
      ilo: "Addaan Koneksion",
      hil: "May Koneksyon"
    },
    noNet: {
      en: "No Internet",
      fil: "Walang Net",
      ceb: "Walay Net",
      bik: "Mayong Net",
      ilo: "Awan ti Net",
      hil: "Wala sing Net"
    },
    currentChat: {
      en: "Current Chat:",
      fil: "Paksa:",
      ceb: "Pakisayran:",
      bik: "Paksa:",
      ilo: "Ad-adalem:",
      hil: "Ginatinguhaan:"
    },
    introGuide: {
      en: "Introduction Guide",
      fil: "Gabay sa Panimula",
      ceb: "Panugod nga Giya",
      bik: "Gabay sa Panimula",
      ilo: "Pangyuna a Tarabay",
      hil: "Panugod nga Giya"
    },
    offlineActive: {
      en: "Offline Study Active",
      fil: "Offline Study Aktibo",
      ceb: "Offline Study Aktibo",
      bik: "Offline Study Aktibo",
      ilo: "Offline a Pag-adal Aktibo",
      hil: "Offline nga Pagtuon Aktibo"
    },
    onlineActive: {
      en: "Scribe Cloud Engaged",
      fil: "Scribe Cloud Aktibo",
      ceb: "Scribe Cloud Aktibo",
      bik: "Scribe Cloud Aktibo",
      ilo: "Scribe Cloud Aktibo",
      hil: "Scribe Cloud Aktibo"
    },
    closeStudy: {
      en: "Close Study",
      fil: "Isara",
      ceb: "Isira",
      bik: "Isara",
      ilo: "Irikep",
      hil: "Siraon"
    },
    titleMain: {
      en: "bible-diary, Unbound.",
      fil: "Ang Buhay na Salita, Walang Hadlang.",
      ceb: "Ang Buhing Pulong, Walang Babag.",
      bik: "An Buhay na Tataramon, Daing Hadlang.",
      ilo: "Ti Sibibiag a Sao, Awan Patinggana.",
      hil: "Ang Buhi nga Pulong, Wala sing Sablag."
    },
    welcomeDesc: {
      en: "Welcome to bible-diary. Type any theology question or scripture phrase.",
      fil: "Maligayang pagdating sa bible-diary. Magtanong ng anuman katanungang teolohikal ukol sa Banal na Kasulatan.",
      ceb: "Maayong pag-abot sa bible-diary. Pangutana og bisan unsa nga teolohikal nga asoy mahitungod sa Balaang Kasulatan.",
      bik: "Marhay na pag-abot sa bible-diary. Maghapot nin anuman na katanungang teolohikal manungod sa Banal na Kasuratan.",
      ilo: "Naimbag a panagparangyo ditoy bible-diary. Agsaludsodkayo iti aniaman maipanggep iti teolohia ken Banal a Kasuratan.",
      hil: "Maayo nga pag-abot sa bible-diary. Mamangkot sang bisan ano nga teolohikal nga asoy nahanungod sa Balaan nga Kasulatan."
    },
    offlineBanner: {
      en: " Currently operating in fully cached Offline Mode. You can query anytime.",
      fil: " Kasalukuyang tumatakbo sa ganap na naka-cache na Offline Mode. Maaari kang magtanong sa Tagalog ngayon.",
      ceb: " Kasamtangang nagdagan sa hingpit nga naka-cache nga Offline Mode. Mahimo ka mangutana sa Cebuano.",
      bik: " Kasalukuyang nagpapadalagan sa ganap na naka-cache na Offline Mode. Pwede kang maghapot sa Bicolano ngunyan.",
      ilo: " Kasalukuyan nga agtartaray iti Offline Mode. Mabalin ti agdamag iti Ilocano ita.",
      hil: " Kasalukuyan nga nagadalagan sa bug-os nga naka-cache nga Offline Mode. Pwede ka mamangkot sa Hiligaynon subong."
    },
    queryGuide: {
      en: "Query Guide",
      fil: "Gabay sa Pagtatanong",
      ceb: "Giya sa Pangutana",
      bik: "Gabay sa Pagtatanong",
      ilo: "Tarabay ti Saludsod",
      hil: "Giya sa Pamangkot"
    },
    offlineSummaryTitle: {
      en: "Offline Capabilities Built-In",
      fil: "May Built-In Na Offline Na Kakanyahan",
      ceb: "Dunay Built-In Nga Offline Nga Katakus",
      bik: "May Built-In Na Offline Na Kakanyahan",
      ilo: "Built-In nga Offline a Kababalin",
      hil: "May Built-In nga Offline nga Katakus"
    },
    offlineSummaryDesc: {
      en: "This app works fully offline, allowing you to read, search, and study the Bible anytime—even without an internet connection. It remembers your progress and includes a powerful Bible study assistant that can help you explore Bible characters, important topics such as faith, peace, and love, as well as well-known passages and teachings like Psalm 23 and the Sermon on the Mount. Whether you're at home, traveling, or in an area with limited connectivity, your Bible study tools remain available.",
      fil: "Gumagana nang buo offline ang app na ito, na nagbibigay-daan sa iyo na magbasa, maghanap, at mag-aral ng Bibliya anumang oras—kahit walang koneksyon sa internet. Naaalala nito ang iyong progreso at kasama ang isang mahusay na katulong sa pag-aaral ng Bibliya na makakatulong sa iyong tuklasin ang mga tauhan sa Bibliya, mahahalagang paksa tulad ng pananampalataya, kapayapaan, at pag-ibig, pati na rin ang mga sikat na talata at turo tulad ng Salmo 23 at ang Sermon sa Bundok. Nasa bahay ka man, naglalakbay, o nasa isang lugar na may limitadong koneksyon, mananatiling magagamit ang iyong mga kagamitan sa pag-aaral ng Bibliya.",
      ceb: "Kini nga app hingpit nga naglihok offline, nga nagtugot kanimo sa pagbasa, pagpangita, ug pagtuon sa Bibliya bisan unsang orasa—bisan walay koneksyon sa internet. Nahinumdom kini sa imong pag-uswag ug naglakip sa usa ka gamhanang katabang sa pagtuon sa Bibliya nga makatabang kanimo sa pagsusi sa mga karakter sa Bibliya, importante nga mga paksa sama sa pagtuo, kalinaw, ug gugma, ingon man usab sa mga sikat nga mga bersikulo ug mga pagtulon-an sama sa Salmo 23 ug ang Sermon sa Bukid. Naa ka man sa balay, nagbiyahe, o sa usa ka lugar nga adunay limitado nga signal, ang imong mga gigamit sa pagtuon sa Bibliya magpabilin nga magamit.",
      bik: "Ining app na ini nagpapadalagan nin sunod sa offline, na nagtatao saimo nin kakayahan na magbasa, maghanap, asin mag-adal kan Biblia sa anuman na oras—dawa mayong koneksyon sa internet. Naroromdoman kaini an saimong progreso asin igwa nin sarong makapangyarihang katabang sa pag-adal kan Biblia na makakatabang saimong magsaliksik sa mga tauhan sa Biblia, mga importanteng tema arog kan pagtubod, katoninongan, asin pagkamoot, siring man an mga sikat na bersikulo asin katokdoan arog kan Salmo 23 asin an Sermon sa Bukid. Magin yaon ka sa harong, nagbibiyahe, o sa sarong lugar na may limitadong signal, an saimong mga kagamitan sa pag-adal magdadanay na magagamit.",
      ilo: "Daytoy nga app ket gaan-anay nga agandar offline, tapno makabasa, makasarak, ken makapag-adal kayo iti Biblia iti aniaman nga oras—uray awan ti koneksyon ti internet. Laglagipenna ti progresoyo ken addaan iti nabileg a katulongan iti panag-adal iti Biblia a makatulong kadakayo a mangsukisok kadagiti tattao iti Biblia, napapateg a topiko kas iti pammati, katalnaan, ken ayat, kasta met dagiti pungkasing a bersikulo ken sursuro kas iti Salmo 23 ken Sermon iti Bantay. Addakayo man iti balay, nagbiahe, wenno adda iti lugar a limitado ti signal-na, dagiti ramit ti panag-adalyo iti Biblia ket kankanayon a magun-od.",
      hil: "Ini nga app de-kalidad nga nagatrabaho offline, nga nagatuyot sa imo sa pagbasa, pagpangita, kag pagtuon sang Biblia sa bisan ano nga oras—bisan wala sing koneksyon sa internet. Nadumduman sini ang imo pag-uswag kag nagaupod sang isa ka gamhanan nga katimbang sa pagtuon sang Biblia nga makatabang sa imo sa pag-usisa sang mga tinawo sa Biblia, importante nga mga tema subong sang pagtuo, paghidait, kag gugma, subong man ang mga kilala nga mga bersikulo kag mga pagtulun-an subong sang Salmo 23 kag ang Sermon sa Bukid. Yara ka man sa balay, nagabyahe, ukon sa isa ka lugar nga may limitado nga signal, ang imo mga galamiton sa pagtuon sang Biblia magapabilin nga magamit."
    },
    scribe: {
      en: "The Scribe",
      fil: "Ang Tagasulat",
      ceb: "Ang Tigsulat",
      bik: "An Parasurat",
      ilo: "Ti Manunurat",
      hil: "Ang Manunulat"
    },
    consulting: {
      en: "Consulting the Scribes...",
      fil: "Sumasangguni sa mga Kasulatan...",
      ceb: "Nagapakisayran sa mga Kasulatan...",
      bik: "Sumasangguni sa mga Kasuratan...",
      ilo: "Agal-aldaw iti Kasuratan...",
      hil: "Nagapangita sa mga Kasulatan..."
    },
    selectGuide: {
      en: "Select Preloaded Guide",
      fil: "Pumili ng Gabay sa Pag-aaral",
      ceb: "Pagpili og Giya sa Pagtuon",
      bik: "Pumili nin Gabay sa Pag-adal",
      ilo: "Pilien ti Naisagana a Tarabay",
      hil: "Magpili sang Giya sa Pagtuon"
    },
    placeholderOnline: {
      en: "Search bible-diary...",
      fil: "Magsaliksik sa buhay na Salita...",
      ceb: "Pangitaa ang buhing Pulong...",
      bik: "Magsaliksik sa buhay na Tataramon...",
      ilo: "Sarakem ti sibibiag a Sao...",
      hil: "Pangitaa ang buhi nga Pulong..."
    },
    placeholderOffline: {
      en: "Ask offline database (e.g. peace, hope, Jesus)...",
      fil: "Magtanong sa offline database (kapayapaan, pag-asa, Hesus)...",
      ceb: "Pangutana sa offline database (kalinaw, paglaum, Hesus)...",
      bik: "Maghapot sa offline database (katoninongan, paglaom, Hesus)...",
      ilo: "Agsaludsod iti offline database (talna, namnama, Hesus)...",
      hil: "Mamangkot sa offline database (paghidait, paglaum, Hesus)..."
    },
    sourceFooter: {
      en: "Scripture references based on King James & English Standard Versions",
      fil: "Sanggunian: Tagalog Ang Biblia, King James at English Standard Versions",
      ceb: "Pakisayran: Ang Biblia (Cebuano), King James ug English Standard Versions",
      bik: "Sanggunian: Bicolano Biblia, King James asin English Standard Versions",
      ilo: "Pangsarigan: Ti Biblia (Ilocano), King James ken English Standard Versions",
      hil: "Sadsaran: Ang Biblia (Hiligaynon), King James kag English Standard Versions"
    },
    bibleNavigation: {
      en: "Bible Study Navigation",
      fil: "Pagbasa ng Bibliya",
      ceb: "Pagbasa sa Bibliya",
      bik: "Pagbasa kan Biblia",
      ilo: "Panagbasa ti Biblia",
      hil: "Pagbasa sang Biblia"
    }
  };
  return dicts[key]?.[lang] || dicts[key]?.["en"] || "";
};

export const detectBibleVerse = (text: string) => {
  if (!text) return null;
  
  // Clean off common leading request phrases and command words
  let cleanText = text.replace(/^(?:please|paki|pakisuyo|paki-suyo|can\s+you\s+)?(?:read|show|open|find|basahin|basaha|basahon|basaen|hanapin|ipakita|isulat)\s+(?:ang|an|ti|the\s+)?/i, "").trim();
  
  const regex = /\b((?:[1-3]\s*)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)[\s:]+(\d+)(?:\s*-\s*(\d+))?/;
  const match = cleanText.match(regex);
  if (!match) return null;

  const book = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const startVerse = parseInt(match[3], 10);
  const endVerse = match[4] ? parseInt(match[4], 10) : undefined;

  const exclusions = ["what", "how", "why", "who", "when", "where", "the", "and", "they", "this", "that", "there", "their"];
  if (exclusions.includes(book.toLowerCase())) {
    return null;
  }

  return { book, chapter, startVerse, endVerse };
};

export const getReadVerseLabel = (lang: LangType, verse: string) => {
  switch (lang) {
    case "fil":
      return `Basahin ang ${verse}`;
    case "ceb":
      return `Basaha ang ${verse}`;
    case "bik":
      return `Basahon an ${verse}`;
    case "ilo":
      return `Basaen ti ${verse}`;
    case "hil":
      return `Basaha ang ${verse}`;
    default:
      return `Read ${verse}`;
  }
};

export default function App() {
  // Lang preference state (en / fil / ceb / bik / ilo / hil)
  const [language, setLanguage] = useState<LangType>(() => {
    try {
      return (localStorage.getItem("biblesphere_lang") as LangType) || "en";
    } catch (e) {
      return "en";
    }
  });

  // Theme state ('dark' | 'light')
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      return (localStorage.getItem("biblesphere_theme") as "dark" | "light") || "light";
    } catch (e) {
      return "light";
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("biblesphere_theme", nextTheme);
  };

  // State for offline support
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [forceOffline, setForceOffline] = useState(false); // To test offline mode on the fly

  // Splash screen state
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  // Support & Offering Box states
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [donationSuccessDetails, setDonationSuccessDetails] = useState<{ amount: string; purpose: string } | null>(null);

  // Read URL query parameters for successful donation callbacks
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const donationStatus = params.get("donation_status");
      const amount = params.get("amount");
      const purpose = params.get("purpose");

      if (donationStatus === "success" && amount && purpose) {
        setDonationSuccessDetails({
          amount,
          purpose: decodeURIComponent(purpose),
        });

        // Clean query strings to prevent annoying alerts on refresh
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  // Retrieve sessions from LocalStorage
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem("biblesphere_sessions");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("biblesphere_active_id") || null;
    } catch (e) {
      return null;
    }
  });

  // Load robust durable IndexedDB backups on startup
  useEffect(() => {
    let active = true;
    const restoreBackup = async () => {
      try {
        const storedDB = await loadSessionsFromIndexedDB();
        if (!active) return;
        
        if (storedDB && storedDB.length > 0) {
          const storedLSString = localStorage.getItem("biblesphere_sessions");
          const storedLS: ChatSession[] = storedLSString ? JSON.parse(storedLSString) : [];
          
          const hasMoreOrDifferent = storedLS.length !== storedDB.length || 
            JSON.stringify(storedLS) !== JSON.stringify(storedDB);
            
          if (hasMoreOrDifferent) {
            console.log("Syncing: Restored chats from IndexedDB backup.");
            setSessions(storedDB);
            localStorage.setItem("biblesphere_sessions", JSON.stringify(storedDB));
            
            const currentActive = localStorage.getItem("biblesphere_active_id");
            const stillExists = storedDB.some(s => s.id === currentActive);
            if (!stillExists && storedDB.length > 0) {
              setActiveSessionId(storedDB[0].id);
              localStorage.setItem("biblesphere_active_id", storedDB[0].id);
            }
          }
        } else if (sessions.length > 0) {
          await saveSessionsToIndexedDB(sessions);
        }
      } catch (err) {
        console.error("Backup restoration error:", err);
      }
    };
    
    restoreBackup();
    return () => {
      active = false;
    };
  }, []);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [windowWidth, setWindowWidth] = useState(() => {
    try {
      return typeof window !== "undefined" ? window.innerWidth : 1024;
    } catch {
      return 1024;
    }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      return typeof window !== "undefined" ? window.innerWidth >= 1024 : false;
    } catch {
      return false;
    }
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Dynamic visual layout height state to avoid being cut off or behind the mobile keyboard
  const [viewportHeight, setViewportHeight] = useState<string>("100vh");

  useEffect(() => {
    if (!window.visualViewport) {
      const handleResize = () => {
        setViewportHeight(`${window.innerHeight}px`);
        setWindowWidth(window.innerWidth);
      };
      window.addEventListener("resize", handleResize);
      handleResize();
      return () => window.removeEventListener("resize", handleResize);
    }

    const handleResize = () => {
      const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      setViewportHeight(`${height}px`);
      setWindowWidth(window.innerWidth);
      window.scrollTo(0, 0);
    };

    window.visualViewport.addEventListener("resize", handleResize);
    window.visualViewport.addEventListener("scroll", handleResize);
    
    handleResize();

    const timer = setTimeout(handleResize, 150);

    return () => {
      clearTimeout(timer);
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
    };
  }, []);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const geminiRef = useRef<GeminiService | null>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Initialize/Configure Gemini Service based on key/language preference
  useEffect(() => {
    const envKey = process.env.GEMINI_API_KEY;
    const finalKey = (typeof BAKED_GEMINI_API_KEY !== "undefined" ? BAKED_GEMINI_API_KEY.trim() : "") || 
                     (envKey ? envKey.trim() : "");
    if (finalKey) {
      geminiRef.current = new GeminiService(finalKey, language);
    } else {
      geminiRef.current = null;
    }
  }, [language]);

  // Randomize suggestion chips on activeSessionId change or language switch
  useEffect(() => {
    let topicsList = ALL_TOPICS;
    if (language === "fil") {
      topicsList = ALL_TOPICS_FIL;
    } else if (language === "ceb") {
      topicsList = ALL_TOPICS_CEB;
    } else if (language === "bik") {
      topicsList = ALL_TOPICS_BIK;
    } else if (language === "ilo") {
      topicsList = ALL_TOPICS_ILO;
    } else if (language === "hil") {
      topicsList = ALL_TOPICS_HIL;
    }
    const shuffled = [...topicsList].sort(() => 0.5 - Math.random());
    setSuggestions(shuffled.slice(0, 4));
  }, [activeSessionId, language]);

  // Scroll to bottom on new messages
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Persists sessions to LocalStorage and IndexedDB
  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    localStorage.setItem("biblesphere_sessions", JSON.stringify(updatedSessions));
    saveSessionsToIndexedDB(updatedSessions).catch((e) => {
      console.error("Failsafe IndexedDB write failed:", e);
    });
  };

  const handleLanguageChange = (newLang: LangType) => {
    setLanguage(newLang);
    localStorage.setItem("biblesphere_lang", newLang);
    if (geminiRef.current) {
      geminiRef.current.setLanguage(newLang);
    }
  };

  const handleCreateSession = (initialMsgText?: string) => {
    const newId = "session_" + Date.now();
    const defaultTitle = getUiTranslation("newChat", language);
    const newSession: ChatSession = {
      id: newId,
      title: initialMsgText 
        ? (initialMsgText.substring(0, 32) + (initialMsgText.length > 32 ? "..." : "")) 
        : defaultTitle,
      messages: [],
      created_at: Date.now()
    };
    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newId);
    localStorage.setItem("biblesphere_active_id", newId);
    return newId;
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    saveSessions(updated);
    if (activeSessionId === id) {
      const nextActive = updated.length > 0 ? updated[0].id : null;
      setActiveSessionId(nextActive);
      if (nextActive) {
        localStorage.setItem("biblesphere_active_id", nextActive);
      } else {
        localStorage.removeItem("biblesphere_active_id");
      }
    }
  };

  const currentOnlineStatus = isOnline && !forceOffline;

  const handleSend = async (customText?: string) => {
    const textToSend = customText ? customText.trim() : input.trim();
    if (!textToSend || isLoading) return;

    let sessionId = activeSessionId;
    let sList = [...sessions];
    let currentSession = sList.find((s) => s.id === sessionId);

    // Create session if none active or existing session belongs elsewhere
    if (!currentSession) {
      const newId = "session_" + Date.now();
      currentSession = {
        id: newId,
        title: textToSend.substring(0, 32) + (textToSend.length > 32 ? "..." : ""),
        messages: [],
        created_at: Date.now()
      };
      sList = [currentSession, ...sList];
      sessionId = newId;
    } else if (currentSession.messages.length === 0) {
      // Set name from first query
      currentSession.title = textToSend.substring(0, 32) + (textToSend.length > 32 ? "..." : "");
    }

    const userMsg: Message = {
      role: "user",
      text: textToSend,
      timestamp: Date.now(),
    };

    currentSession.messages = [...currentSession.messages, userMsg];
    saveSessions(sList);
    setActiveSessionId(sessionId);
    localStorage.setItem("biblesphere_active_id", sessionId!);
    setInput("");
    setIsLoading(true);

    try {
      let aiText = "";
      if (!currentOnlineStatus) {
        // Evaluate with offline search indexing
        aiText = getOfflineAnswer(textToSend, language);
      } else if (geminiRef.current) {
        aiText = await geminiRef.current.sendMessage(textToSend);
      } else {
        // Fallback if key missing
        if (language === "fil") {
          aiText = `## Naka-activate ang Offline Mode (API Configuration Mode)\n\nKailangan ng API key upang makakonekta sa mga cloud model. Bumabalik sa lokal na database.\n\n${getOfflineAnswer(textToSend, language)}`;
        } else if (language === "ceb") {
          aiText = `## Naka-activate ang Offline Mode (API Configuration Mode)\n\nNagkinahanglan og API key aron makakonekta sa mga cloud model. Nibisita sa lokal nga database.\n\n${getOfflineAnswer(textToSend, language)}`;
        } else if (language === "bik") {
          aiText = `## Naka-activate an Offline Mode (API Configuration Mode)\n\nKaipuhan nin API key tanganing makakonektar sa mga cloud model. Nagbabalik sa lokal na database.\n\n${getOfflineAnswer(textToSend, language)}`;
        } else if (language === "ilo") {
          aiText = `## Naka-activate ti Offline Mode (API Configuration Mode)\n\nMasapul ti API key tapno makakonektar kadagiti cloud model. Reverting to local search database.\n\n${getOfflineAnswer(textToSend, language)}`;
        } else if (language === "hil") {
          aiText = `## Naka-activate ang Offline Mode (API Configuration Mode)\n\nKinahanglan sing API key agod makakonekta sa mga cloud model. Nagabalik sa lokal nga database.\n\n${getOfflineAnswer(textToSend, language)}`;
        } else {
          aiText = `## Offline Mode Activated (API Configuration Mode)\n\nAn API key is required to connect to the cloud models. Reverting to local search database.\n\n${getOfflineAnswer(textToSend, language)}`;
        }
      }

      const aiMsg: Message = {
        role: "model",
        text: aiText,
        timestamp: Date.now(),
      };

      // Force refresh on mutated lists
      const freshList = sList.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: [...s.messages, aiMsg],
          };
        }
        return s;
      });
      saveSessions(freshList);
    } catch (err) {
      let errorText = "";
      if (language === "fil") {
        errorText = "Hindi ko makuha ang sagot mula sa buhay na mapagkukunan. Nagbabalik ng offline na kaalaman fallback:\n\n" + getOfflineAnswer(textToSend, language);
      } else if (language === "ceb") {
        errorText = "Dili nako makuha ang tubag gikan sa buhi nga tuburan. Nagabalik sa offline nga kahibalo fallback:\n\n" + getOfflineAnswer(textToSend, language);
      } else if (language === "bik") {
        errorText = "Dai ko makuha an simbag gikan sa buhay na mapagkukunan. Nagbabalik sa offline na kaalaman fallback:\n\n" + getOfflineAnswer(textToSend, language);
      } else if (language === "ilo") {
        errorText = "Saan a magun-od ti sungbat manipud iti sibibiag a gubuayan. Agsubli iti offline a napanunotan:\n\n" + getOfflineAnswer(textToSend, language);
      } else if (language === "hil") {
        errorText = "Indi ko makuha ang sabat gikan sa buhi nga ginahalinan. Nagabalik sa offline nga sabat:\n\n" + getOfflineAnswer(textToSend, language);
      } else {
        errorText = "I was unable to retrieve a response from the living source. Returning offline knowledge fallback:\n\n" + getOfflineAnswer(textToSend, language);
      }

      const errMsg: Message = {
        role: "model",
        text: errorText,
        timestamp: Date.now(),
      };
      
      const freshList = sList.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: [...s.messages, errMsg],
          };
        }
        return s;
      });
      saveSessions(freshList);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      style={{ height: viewportHeight }}
      className={cn(
        "flex font-sans overflow-hidden transition-colors duration-300 w-full", 
        theme === "dark" ? "bg-midnight text-[#E0E0E0]" : "bg-[#F4F5F7] text-slate-800"
      )}
    >
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className={cn(
              "fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-colors duration-500",
              theme === "dark" ? "bg-[#07080a]" : "bg-[#F4F5F7]"
            )}
          >
            <motion.div
              initial={{ scale: 0.82, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
              className="text-center space-y-6 flex flex-col items-center"
            >
              <div className="relative group">
                <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-[#D4AF37]/30 to-[#8E6E2E]/30 blur-2xl opacity-75"></div>
                <img
                  src={brandLogo}
                  alt="bible-diary Logo"
                  className="relative w-40 h-40 rounded-full object-cover shadow-2xl border border-amber-500/20 select-none"
                  referrerPolicy="no-referrer"
                />
              </div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="space-y-2"
              >
                <h1 className="text-3xl md:text-4xl font-display font-light tracking-wider">
                  <span className="gold-gradient font-semibold">bible-diary</span>
                </h1>
                <p className={cn(
                  "text-xs uppercase tracking-widest font-sans font-light",
                  theme === "dark" ? "text-slate-500" : "text-slate-400"
                )}>
                  Bible Companion & Study Guide
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="flex items-center gap-1.5 mt-8"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-ping"></span>
                <span className={cn(
                  "text-[10px] font-mono tracking-widest uppercase",
                  theme === "dark" ? "text-slate-600" : "text-slate-500"
                )}>
                  Opening Scriptures...
                </span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decorative Glows */}
      <div className={cn(
        "fixed top-1/4 left-1/2 -translate-x-1/2 glow-background -z-0 pointer-events-none transition-opacity duration-300",
        theme === "dark" ? "opacity-45" : "opacity-10 bg-yellow-500/5"
      )} />

      {/* Sidebar Navigation */}
      <motion.aside
        initial={false}
        animate={{ 
          x: isSidebarOpen ? 0 : -300,
          width: isSidebarOpen ? "280px" : "0px"
        }}
        className={cn(
          "fixed lg:relative z-50 h-full flex flex-col transition-all duration-300 shadow-2xl border-r",
          theme === "dark" ? "bg-[#07080a] border-white/10" : "bg-white border-slate-200/80",
          "lg:translate-x-0 lg:w-72"
        )}
      >
        {/* Nav head */}
        <div className={cn(
          "p-6 flex items-center justify-between border-b",
          theme === "dark" ? "border-white/5" : "border-slate-100"
        )}>
          <div className="flex items-center gap-3">
            <img
              src={brandLogo}
              alt="bible-diary Logo"
              className="w-8 h-8 rounded-lg object-cover shadow-md shadow-yellow-500/10 border border-amber-500/20 select-none animate-fade-in"
              referrerPolicy="no-referrer"
            />
            <span className={cn(
              "text-lg font-semibold tracking-tight",
              theme === "dark" ? "text-white" : "text-slate-900"
            )}>The Living <span className="text-gold-500 font-light font-sans">Word</span></span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className={cn(
              "p-2 rounded-lg text-slate-400 transition-colors",
              theme === "dark" ? "hover:bg-white/5" : "hover:bg-slate-100"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button Stack */}
        <div className="p-4 space-y-2">
          <button 
            onClick={() => {
              handleCreateSession();
              if (windowWidth < 1024) {
                setIsSidebarOpen(false);
              }
            }}
            className={cn(
              "w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full transition-all text-xs font-semibold uppercase tracking-wider shadow-md border cursor-pointer",
              theme === "dark"
                ? "bg-white/5 hover:bg-white/10 border-white/10 text-white hover:border-gold-500/50"
                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:border-gold-500/50"
            )}
          >
            <Plus className="w-4 h-4 text-gold-500" />
            <span>{getUiTranslation("newChat", language)}</span>
          </button>

          <button 
            onClick={() => {
              setIsDonationModalOpen(true);
              if (windowWidth < 1024) {
                setIsSidebarOpen(false);
              }
            }}
            className={cn(
              "w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full transition-all text-xs font-semibold uppercase tracking-wider shadow-sm border cursor-pointer",
              theme === "dark"
                ? "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20 text-gold-400 hover:text-gold-300"
                : "bg-amber-500/5 hover:bg-amber-500/10 border-amber-200 text-amber-700 hover:text-amber-800"
            )}
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
            <span>
              {language === "fil" ? "Dakong Handugan" : language === "ceb" ? "Dakong Halad" : "Giving Sanctuary"}
            </span>
          </button>
        </div>

        {/* Scrollable chat history */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 py-2">
          <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center justify-between">
            <span>{getUiTranslation("studyArchives", language)}</span>
            <span className={cn(
              "font-mono text-[9px]",
              theme === "dark" ? "text-slate-500" : "text-slate-400"
            )}>{sessions.length} {language === "fil" ? "session" : language === "ceb" ? "session" : "sessions"}</span>
          </div>

          {sessions.length === 0 ? (
            <div className={cn(
              "px-4 py-6 text-xs font-light italic text-center",
              theme === "dark" ? "text-slate-600" : "text-slate-400"
            )}>
              {getUiTranslation("noChats", language)}
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      setActiveSessionId(sess.id);
                      localStorage.setItem("biblesphere_active_id", sess.id);
                      if (windowWidth < 1024) {
                        setIsSidebarOpen(false);
                      }
                    }}
                    className={cn(
                      "group w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all cursor-pointer border border-transparent",
                      isActive 
                        ? (theme === "dark" ? "bg-white/[0.08] text-white border-l-2 border-l-gold-500" : "bg-slate-100 text-slate-900 border-l-2 border-l-gold-500 font-semibold shadow-sm") 
                        : (theme === "dark" ? "text-slate-400 hover:bg-white/5 hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-1">
                      <MessageSquare className={cn(
                        "w-4 h-4 flex-shrink-0",
                        isActive ? "text-gold-500" : (theme === "dark" ? "text-slate-500" : "text-slate-400")
                      )} />
                      <span className="text-xs truncate font-light">{sess.title}</span>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      className={cn(
                        "opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 transition-all flex-shrink-0",
                        theme === "dark" ? "hover:bg-white/10 text-slate-500" : "hover:bg-slate-200/80 text-slate-400"
                      )}
                      title={language === "ceb" ? "I-delete kini nga Study Chat" : language === "fil" ? "I-delete itong Study Chat" : language === "bik" ? "I-delete ining Study Chat" : "Prune this Chat"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live offline simulator control & preferences */}
        <div className={cn(
          "p-4 border-t space-y-3",
          theme === "dark" ? "border-white/5 bg-[#050608]/80" : "border-slate-100 bg-[#FAFAFB]"
        )}>
          
          {/* Quick Language switcher widget inside sidebar */}
          <LanguageDropdown
            currentLang={language}
            onChange={handleLanguageChange}
            langLabel={getUiTranslation("langLabel", language)}
            align="up"
            className="w-full"
            theme={theme}
          />

          {/* Theme selection toggle in Sidebar */}
          <button
            onClick={toggleTheme}
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer shadow-sm text-xs font-medium",
              theme === "dark"
                ? "bg-white/[0.03] border-white/5 hover:bg-white/10 active:bg-white/15 text-slate-300 hover:text-white"
                : "bg-white border-slate-200/60 hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900"
            )}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <div className="flex items-center gap-2">
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-500" />
              )}
              <span>
                {language === "fil" ? "Tema ng App" : language === "ceb" ? "Tema sa App" : "App Theme"}
              </span>
            </div>
            <span className={cn(
              "text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase",
              theme === "dark" ? "bg-amber-500/10 text-amber-400" : "bg-slate-100 text-slate-600 border border-slate-200/60"
            )}>
              {theme === "dark" ? "Dark" : "Light"}
            </span>
          </button>



          <div className={cn(
            "flex items-center justify-between text-xs px-2 pt-1 font-light",
            theme === "dark" ? "text-slate-500" : "text-slate-400"
          )}>
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              {isOnline 
                ? getUiTranslation("connected", language)
                : getUiTranslation("noNet", language)}
            </span>
            <span className="text-[10px]">v1.4 (PWA)</span>
          </div>
        </div>
      </motion.aside>

      {/* Main Study Desk */}
      <main className="flex-1 flex flex-col relative min-w-0 z-10">
        
        {/* Header toolbar */}
        <header className={cn(
          "h-16 flex items-center justify-between px-4 lg:px-8 border-b backdrop-blur-md sticky top-0 z-30 transition-colors duration-300",
          theme === "dark" ? "border-white/5 bg-[#0B0C10]/60" : "border-slate-200/60 bg-[#FAFAFB]/80"
        )}>
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  theme === "dark" ? "hover:bg-white/5 text-white" : "hover:bg-slate-200 text-slate-800"
                )}
              >
                <Menu className="w-5 h-5 animate-pulse" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs uppercase tracking-[0.25em] font-medium",
                theme === "dark" ? "text-white/50" : "text-slate-500"
              )}>
                {getUiTranslation("currentChat", language)}
              </span>
              <span className={cn(
                "text-xs font-semibold tracking-wide max-w-[200px] md:max-w-xs truncate",
                theme === "dark" ? "text-white" : "text-slate-800"
              )}>
                {activeSession ? activeSession.title : getUiTranslation("introGuide", language)}
              </span>
            </div>
          </div>

          {/* Network-aware indicators and status block */}
          <div className="flex items-center gap-3 sm:gap-4">
            <AnimatePresence mode="wait">
              {!currentOnlineStatus ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] tracking-wider uppercase text-[#D4AF37] font-semibold"
                >
                  <WifiOff className="w-3.5 h-3.5 animate-bounce" />
                  <span>{getUiTranslation("offlineActive", language)}</span>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] tracking-wider uppercase text-emerald-400 font-semibold"
                >
                  <Sparkles className="w-3 h-3 text-gold-500 animate-pulse" />
                  <span>{getUiTranslation("onlineActive", language)}</span>
                </motion.div>
              )}
            </AnimatePresence>

              {activeSession && (
              <button 
                onClick={() => {
                  setActiveSessionId(null);
                  localStorage.removeItem("biblesphere_active_id");
                }}
                className={cn(
                  "hidden sm:inline-flex transition-all text-xs border px-3 py-1 rounded-full items-center gap-1 font-semibold",
                  theme === "dark"
                    ? "text-slate-400 hover:text-white border-white/10 bg-white/5"
                    : "text-slate-600 hover:text-slate-950 border-slate-200 bg-slate-50"
                )}
              >
                <span>{getUiTranslation("closeStudy", language)}</span>
              </button>
            )}

            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center border",
              theme === "dark" ? "bg-slate-800 border-white/10" : "bg-slate-100 border-slate-200"
            )}>
              <User className={cn(
                "w-5 h-5",
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              )} />
            </div>
          </div>
        </header>

        {/* Content Box */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-24 xl:px-44 py-8 scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-4xl mx-auto space-y-12 py-12">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-6 flex flex-col items-center"
              >
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-[#D4AF37]/20 to-[#8E6E2E]/20 blur-xl opacity-60 group-hover:opacity-100 transition duration-1000"></div>
                  <img
                    src={brandLogo}
                    alt="bible-diary Logo"
                    className="relative w-24 h-24 rounded-3xl object-cover shadow-xl border border-amber-500/15 select-none transition-all duration-500 hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <h1 className="text-4xl md:text-5xl font-display font-light tracking-tight mt-2">
                  <span className="gold-gradient">
                    {getUiTranslation("titleMain", language)}
                  </span>
                </h1>
                <p className={cn(
                  "text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed",
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                )}>
                  {getUiTranslation("welcomeDesc", language)}
                  
                  {!currentOnlineStatus && (
                    <span className="text-gold-500 font-normal">
                      {getUiTranslation("offlineBanner", language)}
                    </span>
                  )}
                </p>
              </motion.div>

              {/* Suggestions Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {suggestions.map((text, i) => (
                  <motion.button
                    key={text}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * i }}
                    onClick={() => {
                      handleSend(text);
                    }}
                    className={cn(
                      "p-6 text-left border rounded-2xl transition-all group shadow-xl flex flex-col justify-between cursor-pointer",
                      theme === "dark"
                        ? "bg-white/5 hover:bg-white/10 border-white/5 hover:border-gold-500/30"
                        : "bg-white hover:bg-slate-50 border-slate-200 hover:border-gold-500/30 shadow-sm"
                    )}
                  >
                    <p className={cn(
                      "font-light mb-4 leading-relaxed",
                      theme === "dark" ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900"
                    )}>{text}</p>
                    <div className="flex items-center justify-between w-full">
                      <span className={cn(
                        "text-[9px] uppercase tracking-widest font-mono transition-colors",
                        theme === "dark" ? "text-slate-500 group-hover:text-gold-500" : "text-slate-400 group-hover:text-gold-600"
                      )}>
                        {getUiTranslation("queryGuide", language)}
                      </span>
                      <Search className={cn(
                        "w-4 h-4 transition-colors",
                        theme === "dark" ? "text-slate-600 group-hover:text-gold-500" : "text-slate-400 group-hover:text-gold-600"
                      )} />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-12 max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col group",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  {msg.role === "model" && (
                    <div className="flex items-center justify-between w-full mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F9E4A0] animate-pulse shadow-[0_0_15px_rgba(212,175,55,0.3)]"></div>
                        <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-500/80">
                          {getUiTranslation("scribe", language)}
                        </span>
                      </div>
                      
                      <VoiceReader
                        text={msg.text}
                        language={language}
                        theme={theme}
                      />
                    </div>
                  )}
                  
                  <div className={cn(
                    "max-w-[90%] md:max-w-[85%]",
                    msg.role === "user" 
                      ? (theme === "dark" 
                          ? "bg-slate-overlay border border-white/5 rounded-2xl rounded-tr-none px-6 py-4 shadow-xl" 
                          : "bg-white border border-slate-200/80 rounded-2xl rounded-tr-none px-6 py-4 shadow-md text-slate-800")
                      : cn(
                          "space-y-4 text-sm sm:text-base md:text-lg font-light leading-relaxed max-w-none bible-markdown",
                          theme === "dark" ? "text-white prose-invert prose-gold" : "text-slate-800 prose prose-gold"
                        )
                  )}>
                    {msg.role === "user" ? (
                      <p className={cn(
                        "leading-relaxed font-light",
                        theme === "dark" ? "text-slate-200" : "text-slate-800"
                      )}>{msg.text}</p>
                    ) : (
                      <div className="bible-markdown">
                        <ReactMarkdown 
                          components={{
                            blockquote: ({node, ...props}) => (
                              <blockquote className={cn(
                                "border-l-2 border-gold-500 pl-6 py-1 italic text-lg my-6 rounded-r-md",
                                theme === "dark" ? "bg-white/[0.01] text-slate-400" : "bg-slate-100/50 text-slate-600"
                              )} {...props} />
                            ),
                            strong: ({node, ...props}) => (
                              <span className="text-gold-500 font-medium" {...props} />
                            ),
                            h3: ({node, ...props}) => (
                              <h3 className={cn(
                                "font-display text-lg tracking-wider mb-2",
                                theme === "dark" ? "text-white" : "text-slate-900 font-semibold"
                              )} {...props} />
                            )
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>

                        {(() => {
                          const userText = i > 0 && messages[i - 1]?.role === "user" ? messages[i - 1].text : null;
                          if (!userText) return null;

                          return (
                            <BibleVerseReader
                              query={userText}
                              onNavigate={(verse) => handleSend(verse)}
                              language={language}
                              theme={theme}
                            />
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  
                  <span className={cn(
                    "text-[10px] mt-2 tracking-widest uppercase font-medium",
                    theme === "dark" ? "text-slate-600" : "text-slate-400",
                    msg.role === "user" ? "mr-1" : "ml-1"
                  )}>
                    {formatTime(msg.timestamp)}
                  </span>
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gold-500/20 animate-bounce"></div>
                  <span className="text-xs tracking-widest uppercase text-gold-500/50 animate-pulse">
                    {getUiTranslation("consulting", language)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input box */}
        <div className="p-4 pb-6 md:p-8 md:pb-12 flex flex-col items-center bg-transparent relative flex-shrink-0 w-full">
          <div className="w-full max-w-2xl relative">
            <div className={cn(
              "relative flex items-center border rounded-full h-14 md:h-16 px-4 md:px-6 shadow-2xl transition-all group",
              theme === "dark"
                ? "bg-slate-overlay border-white/10 focus-within:border-gold-500/50"
                : "bg-white border-slate-200 focus-within:border-gold-500/50 shadow-md"
            )}>
               <button 
                 onClick={() => {
                   // Let user explore local help
                   setInput(
                     language === "ceb" 
                       ? "Ipapatin-aw ang Sermon sa Bukid." 
                       : language === "fil" 
                         ? "Ipaliwanag ang Sermon sa Bundok." 
                         : language === "bik"
                           ? "Ipaliwanag an Sermon sa Bukid."
                           : language === "ilo"
                             ? "Ipalawagmo ti Sermon iti Bantay."
                             : language === "hil"
                               ? "Ipaathag ang Sermon sa Bukid."
                               : "Explain the Sermon on the Mount."
                   );
                 }}
                 className={cn(
                   "transition-colors flex-shrink-0 cursor-pointer",
                   theme === "dark" ? "text-slate-500 hover:text-gold-500" : "text-slate-400 hover:text-gold-600"
                 )}
                 title={getUiTranslation("selectGuide", language)}
               >
                  <BookOpen className="w-6 h-6" />
                </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  currentOnlineStatus 
                    ? getUiTranslation("placeholderOnline", language)
                    : getUiTranslation("placeholderOffline", language)
                }
                className={cn(
                  "flex-1 bg-transparent border-none focus:ring-0 px-4 font-light focus:outline-none min-w-0 font-sans",
                  theme === "dark" ? "text-white placeholder-slate-500" : "text-slate-800 placeholder-slate-400"
                )}
              />
              <div className="flex items-center gap-3 flex-shrink-0">
                <button 
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer",
                    input.trim() && !isLoading 
                      ? "bg-gradient-to-tr from-[#D4AF37] to-[#8E6E2E] text-midnight shadow-lg shadow-yellow-900/40 active:scale-95" 
                      : (theme === "dark" ? "bg-white/5 text-slate-600 cursor-not-allowed" : "bg-slate-100 text-slate-300 cursor-not-allowed")
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <p className={cn(
              "text-[9px] text-center mt-4 uppercase tracking-[0.3em]",
              theme === "dark" ? "text-slate-600" : "text-slate-400"
            )}>
              {getUiTranslation("sourceFooter", language)}
            </p>
          </div>
        </div>
      </main>

      {/* Interactive Offering Box Overlay */}
      <DonationModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        language={language}
        theme={theme}
      />

      {/* Successful offering celebration modal */}
      <AnimatePresence>
        {donationSuccessDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className={cn(
                "max-w-md w-full p-6 md:p-8 rounded-3xl border text-center relative overflow-hidden select-text",
                theme === "dark" ? "bg-[#0E1015]/95 border-white/10" : "bg-white border-slate-200"
              )}
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 select-none" />
              
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 fill-emerald-500 text-emerald-500 animate-pulse" />
              </div>

              <h2 className="text-xl font-black tracking-tight mb-2">
                {language === "fil" ? "Malugod na Tinanggap ang Alay!" : language === "ceb" ? "Nadawat na ang Halad!" : "Offering Gracefully Accepted!"}
              </h2>
              
              <p className="text-xs font-light text-slate-400 max-w-xs mx-auto leading-relaxed mb-6">
                {language === "fil" 
                  ? "Maraming salamat sa inyong paghahasik sa gawain ng Panginoon! Pagpalain kayo ng masagana." 
                  : language === "ceb" 
                    ? "Salamat kaayo sa inyong paghatag sa buhat sa Ginoo! Pagatabangan ug panalanginan kamo sa Dios." 
                    : "Your support allows our ministries, scriptures, and spiritual research to flourish across the region."}
              </p>

              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 mb-6 text-left text-xs space-y-1.5 font-mono select-text">
                <p className="text-slate-500">CATEGORY: <span className="text-emerald-400 font-bold">{donationSuccessDetails.purpose}</span></p>
                <p className="text-slate-500">AMOUNT COMPLETED: <span className="text-emerald-400 font-black">₱ {parseFloat(donationSuccessDetails.amount).toLocaleString()} PHP</span></p>
                <p className="text-slate-500">PROVIDER: <span className="text-[#3b82f6] font-bold">PayMongo Gateway Secured</span></p>
              </div>

              <button
                onClick={() => setDonationSuccessDetails(null)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 transition-all text-white rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Amen
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
