/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Plus,
  Trash2,
  Pencil,
  Wifi,
  WifiOff,
  Globe,
  Heart,
  Key,
  Download,
  Upload,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { GeminiService, Message } from "./services/geminiService";
import { cn, formatTime } from "./lib/utils";
import { getOfflineAnswer } from "./data/offlineBibleData";
import { LanguageDropdown } from "./components/LanguageDropdown";
import { ThemeDropdown } from "./components/ThemeDropdown";
import { BibleVerseReader } from "./components/BibleVerseReader";
import {
  getRootClassName,
  getSplashClassName,
  isDarkTheme,
  isFloralTheme,
  normalizeTheme,
  type ThemeId,
} from "./theme";
import { useOnlineStatus } from "./lib/useOnlineStatus";
import {
  loadVerseSuggestions,
  pickRandomVerseReferences,
  SUGGESTION_COUNT,
  type VerseSuggestion,
} from "./lib/verseSuggestions";
import {
  handleChatBackPress,
  pickFallbackSessionId,
  sessionHasMessages,
} from "./lib/chatNavigation";
import { mergeImportedSessions } from "./lib/conversationBackup";
import {
  exportConversationsWeb,
  readImportFileWeb,
} from "./lib/conversationExportWeb";
import { VoiceReader } from "./components/VoiceReader";
import { DonationModal } from "./components/DonationModal";
import { resolveGeminiApiKey } from "./config/apiKey";
import {
  isGeminiQuotaError,
  resolveGeminiChatErrorMessage,
} from "./lib/geminiErrors";
import type { LangType } from "./types";
import {
  sessionNeedsTranslation,
  translateChatSession,
} from "./services/translationService";

export type { LangType };
import brandLogo from "./assets/images/brand-logo.png";
import {
  saveSessionsToIndexedDB,
  loadSessionsFromIndexedDB,
} from "./lib/indexedDbHelper";

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  created_at: number;
  language?: LangType;
}

const getUiTranslation = (key: string, lang: LangType) => {
  const dicts: Record<string, Record<string, string>> = {
    studyArchives: {
      en: "Study Archives",
      fil: "Mga Archive ng Pag-aaral",
      ceb: "Mga Archive sa Pagtuon",
      bik: "Mga Archive kan Pag-adal",
      ilo: "Pakasaritaan ti Pag-adal",
      hil: "Mga Archive sang Pagtuon",
    },
    noChats: {
      en: "No previous study chats saved.",
      fil: "Walang nakaraang chat sa pag-aaral.",
      ceb: "Walay unang chat sa pagtuon.",
      bik: "Mayong nakaaging chat sa pag-adal.",
      ilo: "Awan ti nasarita a pag-adal.",
      hil: "Wala sing nauna nga chat sa pagtuon.",
    },
    newChat: {
      en: "New Study Chat",
      fil: "Bagong Chat",
      ceb: "Bag-ong Chat",
      bik: "Bagong Chat",
      ilo: "Baro a Chat",
      hil: "Bag-o nga Chat",
    },
    giving: {
      en: "Giving",
      fil: "Handog",
      ceb: "Halad",
      bik: "Alay",
      ilo: "Daton",
      hil: "Halad",
      es: "Ofrenda",
      la: "Donatio",
      el: "Δωρεά",
    },
    langLabel: {
      en: "Conversation Language",
      fil: "Wika ng Pag-aaral",
      ceb: "Pinulongan sa Pagtuon",
      bik: "Wika nin Pag-adal",
      ilo: "Pagsasao ti Panag-adal",
      hil: "Hambal sang Pagtuon",
    },
    themeLabel: {
      en: "App Theme",
      fil: "Tema ng App",
      ceb: "Tema sa App",
      bik: "Tema kan App",
      ilo: "Tema ti App",
      hil: "Tema sang App",
      es: "Tema de la app",
      la: "Thema applicationis",
      el: "Θέμα εφαρμογής",
    },
    themeLight: {
      en: "Light",
      fil: "Light",
      ceb: "Light",
      bik: "Light",
      ilo: "Light",
      hil: "Light",
      es: "Claro",
      la: "Lucidum",
      el: "Φωτεινό",
    },
    themeDark: {
      en: "Dark",
      fil: "Dark",
      ceb: "Dark",
      bik: "Dark",
      ilo: "Dark",
      hil: "Dark",
      es: "Oscuro",
      la: "Obscurum",
      el: "Σκοτεινό",
    },
    themeFloralVerdant: {
      en: "Verdant Canticle",
      fil: "Verdant Canticle",
      ceb: "Verdant Canticle",
      bik: "Verdant Canticle",
      ilo: "Verdant Canticle",
      hil: "Verdant Canticle",
      es: "Cántico Verde",
      la: "Canticum Viride",
      el: "Πράσινο Άσμα",
    },
    themeFloralBlush: {
      en: "Blush Benediction",
      fil: "Blush Benediction",
      ceb: "Blush Benediction",
      bik: "Blush Benediction",
      ilo: "Blush Benediction",
      hil: "Blush Benediction",
      es: "Bendición Rosada",
      la: "Benedictio Rosea",
      el: "Ροζ Ευλογία",
    },
    themeFloralLavender: {
      en: "Lavender Liturgy",
      fil: "Lavender Liturgy",
      ceb: "Lavender Liturgy",
      bik: "Lavender Liturgy",
      ilo: "Lavender Liturgy",
      hil: "Lavender Liturgy",
      es: "Liturgia Lavanda",
      la: "Liturgia Lavendulae",
      el: "Λειτουργία Λεβάντας",
    },
    themeFloralAmber: {
      en: "Amber Alleluia",
      fil: "Amber Alleluia",
      ceb: "Amber Alleluia",
      bik: "Amber Alleluia",
      ilo: "Amber Alleluia",
      hil: "Amber Alleluia",
      es: "Aleluya Ámbar",
      la: "Alleluia Aurea",
      el: "Κεχριμπαρένιο Αλληλούια",
    },
    themeFloralAzure: {
      en: "Azure Canticle",
      fil: "Azure Canticle",
      ceb: "Azure Canticle",
      bik: "Azure Canticle",
      ilo: "Azure Canticle",
      hil: "Azure Canticle",
      es: "Cántico Azul",
      la: "Canticum Caeruleum",
      el: "Γαλάζιο Άσμα",
    },
    themeFloralCrimson: {
      en: "Scarlet Sanctus",
      fil: "Scarlet Sanctus",
      ceb: "Scarlet Sanctus",
      bik: "Scarlet Sanctus",
      ilo: "Scarlet Sanctus",
      hil: "Scarlet Sanctus",
      es: "Sánctus Escarlata",
      la: "Sanctus Coccineus",
      el: "Κόκκινο Άγιο",
    },
    themeFloralNavy: {
      en: "Indigo Invocatio",
      fil: "Indigo Invocatio",
      ceb: "Indigo Invocatio",
      bik: "Indigo Invocatio",
      ilo: "Indigo Invocatio",
      hil: "Indigo Invocatio",
      es: "Invocatio Índigo",
      la: "Invocatio Indica",
      el: "Ινδικό Επίκληση",
    },
    demoTitle: {
      en: "Demo Testing",
      fil: "Pagsubok sa Demo",
      ceb: "Pagsulay sa Demo",
      bik: "Pagsubok sa Demo",
      ilo: "Padasen ti Demo",
      hil: "Pagsulay sa Demo",
    },
    simOffline: {
      en: "Simulate Offline Mode",
      fil: "I-simulate ang Offline",
      ceb: "I-simulate ang Offline",
      bik: "I-simulate an Offline",
      ilo: "I-simulate ti Offline",
      hil: "I-simulate ang Offline",
    },
    connected: {
      en: "Connection OK",
      fil: "May Koneksyon",
      ceb: "Konektado",
      bik: "May Koneksyon",
      ilo: "Addaan Koneksion",
      hil: "May Koneksyon",
    },
    noNet: {
      en: "No Internet",
      fil: "Walang Net",
      ceb: "Walay Net",
      bik: "Mayong Net",
      ilo: "Awan ti Net",
      hil: "Wala sing Net",
    },
    currentChat: {
      en: "Current Chat:",
      fil: "Paksa:",
      ceb: "Pakisayran:",
      bik: "Paksa:",
      ilo: "Ad-adalem:",
      hil: "Ginatinguhaan:",
    },
    renameChat: {
      en: "Rename chat",
      fil: "Palitan ang pangalan",
      ceb: "Ilisi ang ngalan",
      bik: "Palitan an pangaran",
      ilo: "Sukatan ti nagan",
      hil: "Ilisan ang ngalan",
      es: "Renombrar chat",
      la: "Rename colloquium",
      el: "Μετονομασία συνομιλίας",
    },
    renamePlaceholder: {
      en: "Chat title",
      fil: "Pamagat ng chat",
      ceb: "Ulohan sa chat",
      bik: "Titulo kan chat",
      ilo: "Titulo ti chat",
      hil: "Titulo sang chat",
      es: "Título del chat",
      la: "Titulus colloquii",
      el: "Τίτλος συνομιλίας",
    },
    save: {
      en: "Save",
      fil: "I-save",
      ceb: "I-save",
      bik: "I-save",
      ilo: "Idulin",
      hil: "I-save",
      es: "Guardar",
      la: "Serva",
      el: "Αποθήκευση",
    },
    cancel: {
      en: "Cancel",
      fil: "Kanselahin",
      ceb: "Kanselahon",
      bik: "Kanselahon",
      ilo: "Kanselaen",
      hil: "Kanselahon",
      es: "Cancelar",
      la: "Cancella",
      el: "Ακύρωση",
    },
    deleteChat: {
      en: "Delete chat",
      fil: "I-delete ang chat",
      ceb: "I-delete ang chat",
      bik: "I-delete an chat",
      ilo: "I-delete ti chat",
      hil: "I-delete ang chat",
      es: "Eliminar chat",
      la: "Dele colloquium",
      el: "Διαγραφή συνομιλίας",
    },
    deleteChatConfirm: {
      en: "This will permanently remove this study and all its messages. This cannot be undone.",
      fil: "Permanenteng mabubura ang pag-aaral na ito at lahat ng mensahe. Hindi na ito maibabalik.",
      ceb: "Permanenteng mawala ang pagtuon ug tanang mensahe. Dili na kini mabalik.",
      bik: "Permanenteng mawawara an pag-adal asin gabos na mensahe. Dai na ini mababalik.",
      ilo: "Permanentemente a maikkat daytoy a pagadalan ken amin a mensahe. Saanen a mabalik.",
      hil: "Permanente nga mawala ini nga pagtuon kag tanan nga mensahe. Indi na ini mabalik.",
      es: "Se eliminará permanentemente este estudio y todos sus mensajes. No se puede deshacer.",
      la: "Hoc studium cum omnibus nuntiis perpetuo delebitur. Non revocari potest.",
      el: "Αυτή η μελέτη και όλα τα μηνύματά της θα διαγραφούν οριστικά. Δεν μπορεί να αναιρεθεί.",
    },
    delete: {
      en: "Delete",
      fil: "I-delete",
      ceb: "I-delete",
      bik: "I-delete",
      ilo: "I-delete",
      hil: "I-delete",
      es: "Eliminar",
      la: "Dele",
      el: "Διαγραφή",
    },
    exportConversations: {
      en: "Export Conversations",
      fil: "I-export ang mga Usapan",
      ceb: "I-export ang mga Chat",
      bik: "I-export an mga Chat",
      ilo: "I-export dagiti Chat",
      hil: "I-export ang mga Chat",
      es: "Exportar conversaciones",
      la: "Exporta colloquia",
      el: "Εξαγωγή συνομιλιών",
    },
    importConversations: {
      en: "Import Conversations",
      fil: "I-import ang mga Usapan",
      ceb: "I-import ang mga Chat",
      bik: "I-import an mga Chat",
      ilo: "I-import dagiti Chat",
      hil: "I-import ang mga Chat",
      es: "Importar conversaciones",
      la: "Importa colloquia",
      el: "Εισαγωγή συνομιλιών",
    },
    exportEmpty: {
      en: "There are no conversations to export yet.",
      fil: "Walang usapan na maaaring i-export.",
      ceb: "Walay chat nga ma-export.",
      bik: "Mayong chat na ma-export.",
      ilo: "Awan chat a ma-export.",
      hil: "Wala chat nga ma-export.",
      es: "No hay conversaciones para exportar.",
      la: "Nulla colloquia ad exportandum.",
      el: "Δεν υπάρχουν συνομιλίες για εξαγωγή.",
    },
    exportError: {
      en: "Could not export conversations. Please try again.",
      fil: "Hindi ma-export ang mga usapan. Subukang muli.",
      ceb: "Dili ma-export ang mga chat. Sulayi pag-usab.",
      bik: "Dai ma-export an mga chat. Probaran liwat.",
      ilo: "Saan a ma-export dagiti chat. Padasen manen.",
      hil: "Indi ma-export ang mga chat. Sulayi liwat.",
      es: "No se pudieron exportar las conversaciones.",
      la: "Colloquia exportari non potuerunt.",
      el: "Αποτυχία εξαγωγής συνομιλιών.",
    },
    importSuccess: {
      en: "Imported {count} conversation(s).",
      fil: "Na-import ang {count} usapan.",
      ceb: "Na-import ang {count} ka chat.",
      bik: "Na-import an {count} chat.",
      ilo: "Na-import ti {count} a chat.",
      hil: "Na-import ang {count} ka chat.",
      es: "Se importaron {count} conversación(es).",
      la: "{count} colloquia importata.",
      el: "Εισήχθησαν {count} συνομιλίες.",
    },
    importError: {
      en: "Could not import that file. Choose a valid Bible Diary export.",
      fil: "Hindi ma-import ang file. Pumili ng wastong Bible Diary export.",
      ceb: "Dili ma-import ang file. Pilia ang husto nga Bible Diary export.",
      bik: "Dai ma-import an file. Pili an tama na Bible Diary export.",
      ilo: "Saan a ma-import ti file. Agpili ti umno a Bible Diary export.",
      hil: "Indi ma-import ang file. Pilia ang husto nga Bible Diary export.",
      es: "No se pudo importar. Elige un archivo de exportación válido.",
      la: "Importatio non potuit. Elige validum Bible Diary export.",
      el: "Αποτυχία εισαγωγής. Επιλέξτε έγκυρο αρχείο Bible Diary.",
    },
    introGuide: {
      en: "Introduction Guide",
      fil: "Gabay sa Panimula",
      ceb: "Panugod nga Giya",
      bik: "Gabay sa Panimula",
      ilo: "Pangyuna a Tarabay",
      hil: "Panugod nga Giya",
    },
    offlineActive: {
      en: "Offline Study Active",
      fil: "Offline Study Aktibo",
      ceb: "Offline Study Aktibo",
      bik: "Offline Study Aktibo",
      ilo: "Offline a Pag-adal Aktibo",
      hil: "Offline nga Pagtuon Aktibo",
    },
    onlineActive: {
      en: "Scribe Cloud Engaged",
      fil: "Scribe Cloud Aktibo",
      ceb: "Scribe Cloud Aktibo",
      bik: "Scribe Cloud Aktibo",
      ilo: "Scribe Cloud Aktibo",
      hil: "Scribe Cloud Aktibo",
    },
    cloudQuotaActive: {
      en: "Cloud AI limit reached",
      fil: "Naabot ang limit ng Cloud AI",
      ceb: "Naabot ang limit sa Cloud AI",
      bik: "Naabot an limit kan Cloud AI",
      ilo: "Naabot ti limit ti Cloud AI",
      hil: "Naabot ang limit sang Cloud AI",
      es: "Límite de Cloud AI alcanzado",
      la: "Finis limitis Cloud AI",
      el: "Έφτασε το όριο Cloud AI",
    },
    closeStudy: {
      en: "Close Study",
      fil: "Isara",
      ceb: "Isira",
      bik: "Isara",
      ilo: "Irikep",
      hil: "Siraon",
    },
    titleMain: {
      en: "Bible Diary, Unbound.",
      fil: "Ang Buhay na Salita, Walang Hadlang.",
      ceb: "Ang Buhing Pulong, Walang Babag.",
      bik: "An Buhay na Tataramon, Daing Hadlang.",
      ilo: "Ti Sibibiag a Sao, Awan Patinggana.",
      hil: "Ang Buhi nga Pulong, Wala sing Sablag.",
    },
    welcomeDesc: {
      en: "Welcome to Bible Diary. Type any theology question or scripture phrase.",
      fil: "Maligayang pagdating sa Bible Diary. Magtanong ng anuman katanungang teolohikal ukol sa Banal na Kasulatan.",
      ceb: "Maayong pag-abot sa Bible Diary. Pangutana og bisan unsa nga teolohikal nga asoy mahitungod sa Balaang Kasulatan.",
      bik: "Marhay na pag-abot sa Bible Diary. Maghapot nin anuman na katanungang teolohikal manungod sa Banal na Kasuratan.",
      ilo: "Naimbag a panagparangyo ditoy Bible Diary. Agsaludsodkayo iti aniaman maipanggep iti teolohia ken Banal a Kasuratan.",
      hil: "Maayo nga pag-abot sa Bible Diary. Mamangkot sang bisan ano nga teolohikal nga asoy nahanungod sa Balaan nga Kasulatan.",
    },
    offlineBanner: {
      en: " Currently operating in fully cached Offline Mode. You can query anytime.",
      fil: " Kasalukuyang tumatakbo sa ganap na naka-cache na Offline Mode. Maaari kang magtanong sa Tagalog ngayon.",
      ceb: " Kasamtangang nagdagan sa hingpit nga naka-cache nga Offline Mode. Mahimo ka mangutana sa Cebuano.",
      bik: " Kasalukuyang nagpapadalagan sa ganap na naka-cache na Offline Mode. Pwede kang maghapot sa Bicolano ngunyan.",
      ilo: " Kasalukuyan nga agtartaray iti Offline Mode. Mabalin ti agdamag iti Ilocano ita.",
      hil: " Kasalukuyan nga nagadalagan sa bug-os nga naka-cache nga Offline Mode. Pwede ka mamangkot sa Hiligaynon subong.",
    },
    queryGuide: {
      en: "Query Guide",
      fil: "Gabay sa Pagtatanong",
      ceb: "Giya sa Pangutana",
      bik: "Gabay sa Pagtatanong",
      ilo: "Tarabay ti Saludsod",
      hil: "Giya sa Pamangkot",
    },
    dailyVerseLabel: {
      en: "Verse of the Day",
      fil: "Talata ng Araw",
      ceb: "Bersikulo sa Adlaw",
      bik: "Talata kan Aldaw",
      ilo: "Bersikulo ti Aldaw",
      hil: "Bersikulo sang Adlaw",
      es: "Versículo del día",
      la: "Versus diei",
      el: "Εδάφιο της ημέρας",
    },
    dailyVerseLoading: {
      en: "Loading today's verse…",
      fil: "Kinukuha ang talata ngayong araw…",
      ceb: "Gikuha ang bersikulo karong adlawa…",
      bik: "Kinukuha an talata ngonian na aldaw…",
      ilo: "Agik-ikkan ti bersikulo ita nga aldaw…",
      hil: "Ginakuha ang bersikulo subong nga adlaw…",
      es: "Cargando el versículo de hoy…",
      la: "Versus hodiernus oneratur…",
      el: "Φόρτωση σημερινού εδαφίου…",
    },
    dailyVerseTap: {
      en: "Tap to study this passage",
      fil: "I-tap para pag-aralan ang talatang ito",
      ceb: "I-tap aron tun-an kining bersikulo",
      bik: "I-tap para pag-aralan an talata",
      ilo: "I-tap tapno adalen daytoy a bersikulo",
      hil: "I-tap para pagtuonon ini nga bersikulo",
      es: "Toca para estudiar este pasaje",
      la: "Tange ut hunc locum studias",
      el: "Πατήστε για μελέτη αυτού του εδαφίου",
    },
    suggestedPassages: {
      en: "Suggested passages",
      fil: "Mga iminumungkahing talata",
      ceb: "Gisugyot nga mga bersikulo",
      bik: "Mga sugeridong talata",
      ilo: "Dagiti masugestan a bersikulo",
      hil: "Ginasugyot nga mga bersikulo",
      es: "Pasajes sugeridos",
      la: "Loca suggesta",
      el: "Προτεινόμενα εδάφια",
    },
    verseSuggestionsLoading: {
      en: "Loading suggestions…",
      fil: "Kinukuha ang mga mungkahi…",
      ceb: "Gikuha ang mga sugyot…",
      bik: "Kinukuha an mga suhestyon…",
      ilo: "Agik-ikkan dagiti singasing…",
      hil: "Ginakuha ang mga sugyot…",
      es: "Cargando sugerencias…",
      la: "Suggestiones onerantur…",
      el: "Φόρτωση προτάσεων…",
    },
    suggestMore: {
      en: "Suggest more",
      fil: "Magmungkahi pa",
      ceb: "Mag-sugyot pa",
      bik: "Mag-sugyot pa",
      ilo: "Agmangmangnga pay",
      hil: "Mag-sugyot pa",
      es: "Sugerir más",
      la: "Plura sugger",
      el: "Περισσότερες προτάσεις",
    },
    offlineSummaryTitle: {
      en: "Offline Capabilities Built-In",
      fil: "May Built-In Na Offline Na Kakanyahan",
      ceb: "Dunay Built-In Nga Offline Nga Katakus",
      bik: "May Built-In Na Offline Na Kakanyahan",
      ilo: "Built-In nga Offline a Kababalin",
      hil: "May Built-In nga Offline nga Katakus",
    },
    offlineSummaryDesc: {
      en: "This app works fully offline, allowing you to read, search, and study the Bible anytime—even without an internet connection. It remembers your progress and includes a powerful Bible study assistant that can help you explore Bible characters, important topics such as faith, peace, and love, as well as well-known passages and teachings like Psalm 23 and the Sermon on the Mount. Whether you're at home, traveling, or in an area with limited connectivity, your Bible study tools remain available.",
      fil: "Gumagana nang buo offline ang app na ito, na nagbibigay-daan sa iyo na magbasa, maghanap, at mag-aral ng Bibliya anumang oras—kahit walang koneksyon sa internet. Naaalala nito ang iyong progreso at kasama ang isang mahusay na katulong sa pag-aaral ng Bibliya na makakatulong sa iyong tuklasin ang mga tauhan sa Bibliya, mahahalagang paksa tulad ng pananampalataya, kapayapaan, at pag-ibig, pati na rin ang mga sikat na talata at turo tulad ng Salmo 23 at ang Sermon sa Bundok. Nasa bahay ka man, naglalakbay, o nasa isang lugar na may limitadong koneksyon, mananatiling magagamit ang iyong mga kagamitan sa pag-aaral ng Bibliya.",
      ceb: "Kini nga app hingpit nga naglihok offline, nga nagtugot kanimo sa pagbasa, pagpangita, ug pagtuon sa Bibliya bisan unsang orasa—bisan walay koneksyon sa internet. Nahinumdom kini sa imong pag-uswag ug naglakip sa usa ka gamhanang katabang sa pagtuon sa Bibliya nga makatabang kanimo sa pagsusi sa mga karakter sa Bibliya, importante nga mga paksa sama sa pagtuo, kalinaw, ug gugma, ingon man usab sa mga sikat nga mga bersikulo ug mga pagtulon-an sama sa Salmo 23 ug ang Sermon sa Bukid. Naa ka man sa balay, nagbiyahe, o sa usa ka lugar nga adunay limitado nga signal, ang imong mga gigamit sa pagtuon sa Bibliya magpabilin nga magamit.",
      bik: "Ining app na ini nagpapadalagan nin sunod sa offline, na nagtatao saimo nin kakayahan na magbasa, maghanap, asin mag-adal kan Biblia sa anuman na oras—dawa mayong koneksyon sa internet. Naroromdoman kaini an saimong progreso asin igwa nin sarong makapangyarihang katabang sa pag-adal kan Biblia na makakatabang saimong magsaliksik sa mga tauhan sa Biblia, mga importanteng tema arog kan pagtubod, katoninongan, asin pagkamoot, siring man an mga sikat na bersikulo asin katokdoan arog kan Salmo 23 asin an Sermon sa Bukid. Magin yaon ka sa harong, nagbibiyahe, o sa sarong lugar na may limitadong signal, an saimong mga kagamitan sa pag-adal magdadanay na magagamit.",
      ilo: "Daytoy nga app ket gaan-anay nga agandar offline, tapno makabasa, makasarak, ken makapag-adal kayo iti Biblia iti aniaman nga oras—uray awan ti koneksyon ti internet. Laglagipenna ti progresoyo ken addaan iti nabileg a katulongan iti panag-adal iti Biblia a makatulong kadakayo a mangsukisok kadagiti tattao iti Biblia, napapateg a topiko kas iti pammati, katalnaan, ken ayat, kasta met dagiti pungkasing a bersikulo ken sursuro kas iti Salmo 23 ken Sermon iti Bantay. Addakayo man iti balay, nagbiahe, wenno adda iti lugar a limitado ti signal-na, dagiti ramit ti panag-adalyo iti Biblia ket kankanayon a magun-od.",
      hil: "Ini nga app de-kalidad nga nagatrabaho offline, nga nagatuyot sa imo sa pagbasa, pagpangita, kag pagtuon sang Biblia sa bisan ano nga oras—bisan wala sing koneksyon sa internet. Nadumduman sini ang imo pag-uswag kag nagaupod sang isa ka gamhanan nga katimbang sa pagtuon sang Biblia nga makatabang sa imo sa pag-usisa sang mga tinawo sa Biblia, importante nga mga tema subong sang pagtuo, paghidait, kag gugma, subong man ang mga kilala nga mga bersikulo kag mga pagtulun-an subong sang Salmo 23 kag ang Sermon sa Bukid. Yara ka man sa balay, nagabyahe, ukon sa isa ka lugar nga may limitado nga signal, ang imo mga galamiton sa pagtuon sang Biblia magapabilin nga magamit.",
    },
    scribe: {
      en: "The Scribe",
      fil: "Ang Tagasulat",
      ceb: "Ang Tigsulat",
      bik: "An Parasurat",
      ilo: "Ti Manunurat",
      hil: "Ang Manunulat",
    },
    consulting: {
      en: "Consulting the Scribes...",
      fil: "Sumasangguni sa mga Kasulatan...",
      ceb: "Nagapakisayran sa mga Kasulatan...",
      bik: "Sumasangguni sa mga Kasuratan...",
      ilo: "Agal-aldaw iti Kasuratan...",
      hil: "Nagapangita sa mga Kasulatan...",
      es: "Consultando las Escrituras...",
      la: "Scripturas consuluntur...",
      el: "Συμβουλεύομαι τις Γραφές...",
    },
    translating: {
      en: "Translating conversation...",
      fil: "Isinasalin ang usapan...",
      ceb: "Gihubad ang panag-istorya...",
      bik: "Tina-translate an pag-olay...",
      ilo: "Agipatarus ti panagsalsalita...",
      hil: "Ginatranslate ang pag-istoryahanay...",
      es: "Traduciendo la conversación...",
      la: "Colloquium vertitur...",
      el: "Μετάφραση συνομιλίας...",
    },
    selectGuide: {
      en: "Select Preloaded Guide",
      fil: "Pumili ng Gabay sa Pag-aaral",
      ceb: "Pagpili og Giya sa Pagtuon",
      bik: "Pumili nin Gabay sa Pag-adal",
      ilo: "Pilien ti Naisagana a Tarabay",
      hil: "Magpili sang Giya sa Pagtuon",
    },
    placeholderOnline: {
      en: "Search Bible Diary...",
      fil: "Magsaliksik sa Bible Diary...",
      ceb: "Pangitaa ang Bible Diary...",
      bik: "Magsaliksik sa Bible Diary...",
      ilo: "Sarakem ti Bible Diary...",
      hil: "Pangitaa ang Bible Diary...",
    },
    placeholderOffline: {
      en: "Ask offline database (e.g. peace, hope, Jesus)...",
      fil: "Magtanong sa offline database (kapayapaan, pag-asa, Hesus)...",
      ceb: "Pangutana sa offline database (kalinaw, paglaum, Hesus)...",
      bik: "Maghapot sa offline database (katoninongan, paglaom, Hesus)...",
      ilo: "Agsaludsod iti offline database (talna, namnama, Hesus)...",
      hil: "Mamangkot sa offline database (paghidait, paglaum, Hesus)...",
    },
    sourceFooter: {
      en: "Scripture references based on King James & English Standard Versions",
      fil: "Sanggunian: Tagalog Ang Biblia, King James at English Standard Versions",
      ceb: "Pakisayran: Ang Biblia (Cebuano), King James ug English Standard Versions",
      bik: "Sanggunian: Bicolano Biblia, King James asin English Standard Versions",
      ilo: "Pangsarigan: Ti Biblia (Ilocano), King James ken English Standard Versions",
      hil: "Sadsaran: Ang Biblia (Hiligaynon), King James kag English Standard Versions",
    },
    bibleNavigation: {
      en: "Bible Study Navigation",
      fil: "Pagbasa ng Bibliya",
      ceb: "Pagbasa sa Bibliya",
      bik: "Pagbasa kan Biblia",
      ilo: "Panagbasa ti Biblia",
      hil: "Pagbasa sang Biblia",
    },
  };
  return dicts[key]?.[lang] || dicts[key]?.["en"] || "";
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

  // Theme state
  const [theme, setTheme] = useState<ThemeId>(() => {
    try {
      return normalizeTheme(localStorage.getItem("biblesphere_theme"));
    } catch (e) {
      return "light";
    }
  });

  const changeTheme = (next: ThemeId) => {
    setTheme(next);
    localStorage.setItem("biblesphere_theme", next);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // State for offline support
  const isOnline = useOnlineStatus();
  const [forceOffline, setForceOffline] = useState(false); // To test offline mode on the fly
  const [cloudQuotaExceeded, setCloudQuotaExceeded] = useState(false);

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
  const [donationSuccessDetails, setDonationSuccessDetails] = useState<{
    amount: string;
    purpose: string;
  } | null>(null);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

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

  const [showHomeScreen, setShowHomeScreen] = useState(true);

  // Load robust durable IndexedDB backups on startup
  useEffect(() => {
    let active = true;
    const restoreBackup = async () => {
      try {
        const storedDB = await loadSessionsFromIndexedDB();
        if (!active) return;

        if (storedDB && storedDB.length > 0) {
          const storedLSString = localStorage.getItem("biblesphere_sessions");
          const storedLS: ChatSession[] = storedLSString
            ? JSON.parse(storedLSString)
            : [];

          const hasMoreOrDifferent =
            storedLS.length !== storedDB.length ||
            JSON.stringify(storedLS) !== JSON.stringify(storedDB);

          if (hasMoreOrDifferent) {
            console.log("Syncing: Restored chats from IndexedDB backup.");
            setSessions(storedDB);
            localStorage.setItem(
              "biblesphere_sessions",
              JSON.stringify(storedDB),
            );

            const currentActive = localStorage.getItem("biblesphere_active_id");
            const stillExists = storedDB.some((s) => s.id === currentActive);
            const nextActive = stillExists
              ? currentActive
              : pickFallbackSessionId(storedDB) ?? storedDB[0]?.id ?? null;
            if (nextActive && nextActive !== currentActive) {
              setActiveSessionId(nextActive);
              localStorage.setItem("biblesphere_active_id", nextActive);
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
  const [isTranslating, setIsTranslating] = useState(false);

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

  const [verseSuggestions, setVerseSuggestions] = useState<VerseSuggestion[]>(
    [],
  );
  const [verseSuggestionsLoading, setVerseSuggestionsLoading] = useState(true);

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
      const height = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const sessionsRef = useRef(sessions);
  const languageRef = useRef(language);
  const activeSessionIdRef = useRef(activeSessionId);
  const showHomeScreenRef = useRef(showHomeScreen);
  const translateOnOpenRef = useRef<(sessionId: string) => void>(() => {});
  const translatingSessionRef = useRef<string | null>(null);
  sessionsRef.current = sessions;
  languageRef.current = language;
  activeSessionIdRef.current = activeSessionId;
  showHomeScreenRef.current = showHomeScreen;
  const lastScrollTop = useRef(0);
  const dragStartScrollTop = useRef(0);
  const isDraggingScroll = useRef(false);
  const hideTriggeredThisDrag = useRef(false);
  const geminiRef = useRef<GeminiService | null>(null);

  const SCROLL_DOWN_THRESHOLD = 24;

  const handleScrollInteractionStart = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    isDraggingScroll.current = true;
    dragStartScrollTop.current = container.scrollTop;
    lastScrollTop.current = container.scrollTop;
    hideTriggeredThisDrag.current = false;
  }, []);

  const handleScrollInteractionEnd = useCallback(() => {
    isDraggingScroll.current = false;
  }, []);

  const handleChatScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || !isDraggingScroll.current) return;

    const currentTop = container.scrollTop;
    const scrolledDown = dragStartScrollTop.current - currentTop;
    lastScrollTop.current = currentTop;

    if (
      document.activeElement === inputRef.current &&
      scrolledDown > SCROLL_DOWN_THRESHOLD &&
      !hideTriggeredThisDrag.current
    ) {
      hideTriggeredThisDrag.current = true;
      inputRef.current?.blur();
    }
  }, []);

  // Initialize/Configure Gemini Service based on key/language preference
  useEffect(() => {
    const finalKey = resolveGeminiApiKey();
    if (finalKey) {
      geminiRef.current = new GeminiService(finalKey, language);
    } else {
      geminiRef.current = null;
    }
  }, [language]);

  const chatHistoryTrapped = useRef(false);

  const refreshVerseSuggestions = useCallback(async (exclude: string[] = []) => {
    setVerseSuggestionsLoading(true);
    const references = pickRandomVerseReferences(SUGGESTION_COUNT, exclude);
    try {
      const loaded = await loadVerseSuggestions(references);
      setVerseSuggestions(loaded);
    } catch {
      setVerseSuggestions(
        references.map((reference) => ({ reference, text: "" })),
      );
    } finally {
      setVerseSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshVerseSuggestions();
  }, [refreshVerseSuggestions]);

  // Scroll to bottom on new messages
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];

  const goHome = useCallback(() => {
    setShowHomeScreen(true);
    setIsSidebarOpen(false);
    chatHistoryTrapped.current = false;
  }, []);

  const selectSession = useCallback(
    (id: string, recordHistory = false) => {
      setActiveSessionId(id);
      localStorage.setItem("biblesphere_active_id", id);
      setShowHomeScreen(false);
      if (
        recordHistory &&
        typeof window !== "undefined" &&
        sessionHasMessages(sessions, id)
      ) {
        window.history.pushState(
          { sessionId: id, inChat: true },
          "",
          window.location.href,
        );
      }
      if (windowWidth < 1024) {
        setIsSidebarOpen(false);
      }
      translateOnOpenRef.current(id);
    },
    [sessions, windowWidth],
  );

  const runBackNavigation = useCallback(() => {
    if (isDonationModalOpen) {
      setIsDonationModalOpen(false);
      return true;
    }

    return handleChatBackPress(
      {
        sessions,
        activeSessionId,
        sidebarOpen: isSidebarOpen,
        renameOpen: renameSessionId !== null,
        deleteOpen: deleteSessionId !== null,
        showHomeScreen,
      },
      {
        openSidebar: () => setIsSidebarOpen(true),
        closeSidebar: () => setIsSidebarOpen(false),
        closeRename: () => {
          setRenameSessionId(null);
          setRenameDraft("");
        },
        closeDelete: () => setDeleteSessionId(null),
        selectSession: (id) => selectSession(id, false),
        goHome,
      },
    );
  }, [
    sessions,
    activeSessionId,
    isSidebarOpen,
    renameSessionId,
    deleteSessionId,
    isDonationModalOpen,
    showHomeScreen,
    selectSession,
    goHome,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPopState = (event: PopStateEvent) => {
      const state = event.state as {
        sessionId?: string;
        inChat?: boolean;
      } | null;
      const currentSessions = sessionsRef.current;
      const currentActiveId = activeSessionIdRef.current;

      if (
        state?.sessionId &&
        sessionHasMessages(currentSessions, state.sessionId)
      ) {
        setActiveSessionId(state.sessionId);
        localStorage.setItem("biblesphere_active_id", state.sessionId);
        setShowHomeScreen(false);
      } else if (
        sessionHasMessages(currentSessions, currentActiveId) ||
        currentSessions.some((session) => session.messages.length > 0)
      ) {
        setShowHomeScreen(false);
      }

      if (!runBackNavigation()) return;

      const trapSessionId =
        activeSessionIdRef.current ??
        state?.sessionId ??
        pickFallbackSessionId(currentSessions);
      window.history.pushState(
        { sessionId: trapSessionId, inChat: true },
        "",
        window.location.href,
      );
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [runBackNavigation]);

  // Intercept browser swipe-back while viewing a conversation
  useEffect(() => {
    if (typeof window === "undefined") return;

    const inChat =
      !showHomeScreen &&
      (sessionHasMessages(sessions, activeSessionId) ||
        sessions.some((session) => session.messages.length > 0));

    if (!inChat) {
      chatHistoryTrapped.current = false;
      return;
    }
    if (chatHistoryTrapped.current) return;

    window.history.pushState(
      { sessionId: activeSessionId, inChat: true },
      "",
      window.location.href,
    );
    chatHistoryTrapped.current = true;
  }, [showHomeScreen, sessions, activeSessionId]);

  // Restore chat state when returning from bfcache (iOS swipe-back)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      try {
        const saved = localStorage.getItem("biblesphere_sessions");
        const parsed: ChatSession[] = saved ? JSON.parse(saved) : [];
        const activeId = localStorage.getItem("biblesphere_active_id");
        setSessions(parsed);
        setActiveSessionId(activeId);
        setShowHomeScreen(true);
      } catch {
        // ignore
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Persists sessions to LocalStorage and IndexedDB
  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    localStorage.setItem(
      "biblesphere_sessions",
      JSON.stringify(updatedSessions),
    );
    saveSessionsToIndexedDB(updatedSessions).catch((e) => {
      console.error("Failsafe IndexedDB write failed:", e);
    });
  };

  const getTranslationApiKey = useCallback(() => resolveGeminiApiKey(), []);

  const translateSessionToCurrentLanguage = useCallback(
    async (sessionId: string, targetLang: LangType = language) => {
      if (translatingSessionRef.current === sessionId) return;

      const session = sessionsRef.current.find((s) => s.id === sessionId);
      if (!session || !sessionNeedsTranslation(session, targetLang)) return;

      const apiKey = getTranslationApiKey();
      if (!apiKey || !isOnline || forceOffline) return;

      translatingSessionRef.current = sessionId;
      setIsTranslating(true);
      try {
        const translated = await translateChatSession(
          apiKey,
          session,
          targetLang,
        );
        saveSessions(
          sessionsRef.current.map((s) =>
            s.id === sessionId ? translated : s,
          ),
        );
      } catch (error) {
        console.error("Translation failed:", error);
        if (isGeminiQuotaError(error)) {
          setCloudQuotaExceeded(true);
        }
      } finally {
        translatingSessionRef.current = null;
        setIsTranslating(false);
      }
    },
    [language, isOnline, forceOffline, getTranslationApiKey],
  );

  useEffect(() => {
    translateOnOpenRef.current = (sessionId: string) => {
      void translateSessionToCurrentLanguage(sessionId, languageRef.current);
    };
  }, [translateSessionToCurrentLanguage]);

  useEffect(() => {
    if (!activeSessionId || showHomeScreen) return;
    void translateSessionToCurrentLanguage(activeSessionId, language);
  }, [
    activeSessionId,
    showHomeScreen,
    language,
    translateSessionToCurrentLanguage,
  ]);

  const handleLanguageChange = async (newLang: LangType) => {
    if (newLang === language) return;

    setLanguage(newLang);
    localStorage.setItem("biblesphere_lang", newLang);
    geminiRef.current?.setLanguage(newLang);

    const session = sessions.find((s) => s.id === activeSessionId);
    if (!session) return;

    if (!session.messages.length) {
      saveSessions(
        sessions.map((s) =>
          s.id === activeSessionId ? { ...s, language: newLang } : s,
        ),
      );
      return;
    }

    const apiKey = getTranslationApiKey();
    if (!apiKey || !isOnline || forceOffline) return;

    setIsTranslating(true);
    try {
      const translated = await translateChatSession(apiKey, session, newLang);
      saveSessions(
        sessions.map((s) => (s.id === activeSessionId ? translated : s)),
      );
    } catch (error) {
      console.error("Translation failed:", error);
      if (isGeminiQuotaError(error)) {
        setCloudQuotaExceeded(true);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCreateSession = (initialMsgText?: string) => {
    const newId = "session_" + Date.now();
    const defaultTitle = getUiTranslation("newChat", language);
    const newSession: ChatSession = {
      id: newId,
      title: initialMsgText
        ? initialMsgText.substring(0, 32) +
          (initialMsgText.length > 32 ? "..." : "")
        : defaultTitle,
      messages: [],
      created_at: Date.now(),
      language,
    };
    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newId);
    localStorage.setItem("biblesphere_active_id", newId);
    setShowHomeScreen(false);
    chatHistoryTrapped.current = false;
    return newId;
  };

  const openDeleteConfirm = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteSessionId(id);
  };

  const closeDeleteConfirm = () => {
    setDeleteSessionId(null);
  };

  const confirmDeleteSession = () => {
    if (!deleteSessionId) return;
    const id = deleteSessionId;
    const updated = sessions.filter((s) => s.id !== id);
    saveSessions(updated);
    if (activeSessionId === id) {
      const nextActive =
        updated.length > 0
          ? pickFallbackSessionId(updated) ?? updated[0].id
          : null;
      setActiveSessionId(nextActive);
      if (nextActive) {
        localStorage.setItem("biblesphere_active_id", nextActive);
      } else {
        localStorage.removeItem("biblesphere_active_id");
        setShowHomeScreen(true);
      }
    }
    setDeleteSessionId(null);
  };

  const openRenameSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    setRenameSessionId(sessionId);
    setRenameDraft(session.title);
  };

  const handleRenameSession = () => {
    if (!renameSessionId) return;
    const trimmed = renameDraft.trim();
    if (!trimmed) return;
    const updated = sessions.map((s) =>
      s.id === renameSessionId ? { ...s, title: trimmed } : s,
    );
    saveSessions(updated);
    setRenameSessionId(null);
    setRenameDraft("");
  };

  const handleExportConversations = async () => {
    const result = await exportConversationsWeb(sessions, activeSessionId);
    if (result.cancelled) return;
    if (result.error === "empty") {
      window.alert(getUiTranslation("exportEmpty", language));
      return;
    }
    if (result.error) {
      window.alert(getUiTranslation("exportError", language));
    }
  };

  const handleImportConversations = () => {
    importFileRef.current?.click();
  };

  const handleImportFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const backup = await readImportFileWeb(file);
      const {
        sessions: merged,
        activeSessionId: nextActive,
        importedCount,
      } = mergeImportedSessions(sessions, backup.sessions);
      saveSessions(merged);
      setActiveSessionId(nextActive);
      if (nextActive) {
        localStorage.setItem("biblesphere_active_id", nextActive);
      } else {
        localStorage.removeItem("biblesphere_active_id");
      }
      window.alert(
        getUiTranslation("importSuccess", language).replace(
          "{count}",
          String(importedCount),
        ),
      );
    } catch {
      window.alert(getUiTranslation("importError", language));
    }
  };

  const currentOnlineStatus = isOnline && !forceOffline;

  const handleSend = async (customText?: string) => {
    const textToSend = customText ? customText.trim() : input.trim();
    if (!textToSend || isLoading) return;

    setIsLoading(true);
    setInput("");

    let sessionId = activeSessionId;
    let sList = [...sessions];
    let currentSession = sList.find((s) => s.id === sessionId);

    if (showHomeScreen) {
      const newId = "session_" + Date.now();
      currentSession = {
        id: newId,
        title:
          textToSend.substring(0, 32) + (textToSend.length > 32 ? "..." : ""),
        messages: [],
        created_at: Date.now(),
        language,
      };
      sList = [currentSession, ...sList];
      sessionId = newId;
    } else if (!currentSession) {
      const newId = "session_" + Date.now();
      currentSession = {
        id: newId,
        title:
          textToSend.substring(0, 32) + (textToSend.length > 32 ? "..." : ""),
        messages: [],
        created_at: Date.now(),
        language,
      };
      sList = [currentSession, ...sList];
      sessionId = newId;
    } else if (currentSession.messages.length === 0) {
      // Set name from first query
      currentSession.title =
        textToSend.substring(0, 32) + (textToSend.length > 32 ? "..." : "");
      currentSession.language = language;
    }

    const userMsg: Message = {
      role: "user",
      text: textToSend,
      timestamp: Date.now(),
    };

    currentSession.messages = [...currentSession.messages, userMsg];
    if (
      currentSession.language == null ||
      currentSession.language === language
    ) {
      currentSession.language = language;
    }
    saveSessions(sList);
    setActiveSessionId(sessionId);
    localStorage.setItem("biblesphere_active_id", sessionId!);
    const enteringChat = showHomeScreen;
    setShowHomeScreen(false);
    if (enteringChat && typeof window !== "undefined") {
      window.history.pushState(
        { sessionId, inChat: true },
        "",
        window.location.href,
      );
      chatHistoryTrapped.current = true;
    }

    try {
      let aiText = "";
      if (geminiRef.current && currentOnlineStatus) {
        aiText = await geminiRef.current.sendMessage(textToSend);
      } else if (!currentOnlineStatus) {
        aiText = getOfflineAnswer(textToSend, language);
      } else {
        aiText = `## Local Study Mode\n\nYou are online, but cloud AI is not configured (missing Gemini API key). Using the offline Bible study database.\n\n${getOfflineAnswer(textToSend, language)}`;
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
            language: s.language ?? language,
          };
        }
        return s;
      });
      saveSessions(freshList);
      setCloudQuotaExceeded(false);
    } catch (err) {
      if (isGeminiQuotaError(err)) {
        setCloudQuotaExceeded(true);
      }
      const errorText = resolveGeminiChatErrorMessage(
        err,
        language,
        getOfflineAnswer(textToSend, language),
      );

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
            language: s.language ?? language,
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
        "flex font-sans overflow-hidden transition-colors duration-300 w-full relative",
        getRootClassName(theme),
      )}
    >
      {isFloralTheme(theme) && (
        <div className="floral-backdrop fixed inset-0 pointer-events-none z-0" aria-hidden />
      )}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className={cn(
              "fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-colors duration-500",
              getSplashClassName(theme),
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
                  alt="Bible Diary Logo"
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
                  <span className="gold-gradient font-semibold">
                    Bible Diary
                  </span>
                </h1>
                <p
                  className={cn(
                    "text-xs uppercase tracking-widest font-sans font-light",
                    isDarkTheme(theme) ? "text-slate-500" : "text-slate-400",
                  )}
                >
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
                <span
                  className={cn(
                    "text-[10px] font-mono tracking-widest uppercase",
                    isDarkTheme(theme) ? "text-slate-600" : "text-slate-500",
                  )}
                >
                  Opening Scriptures...
                </span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decorative Glows */}
      <div
        className={cn(
          "fixed top-1/4 left-1/2 -translate-x-1/2 glow-background -z-0 pointer-events-none transition-opacity duration-300",
          isDarkTheme(theme) ? "opacity-45" : "opacity-10 bg-yellow-500/5",
        )}
      />

      {/* Sidebar Navigation */}
      <motion.aside
        initial={false}
        animate={{
          x: isSidebarOpen ? 0 : -300,
          width: isSidebarOpen ? "280px" : "0px",
        }}
        className={cn(
          "theme-sidebar fixed lg:relative z-50 h-full flex flex-col transition-all duration-300 shadow-2xl border-r",
          isDarkTheme(theme)
            ? "bg-[#07080a] border-white/10"
            : "bg-white border-slate-200/80",
          "lg:translate-x-0 lg:w-72",
        )}
      >
        {/* Nav head */}
        <div
          className={cn(
            "p-6 flex items-center justify-between border-b",
            isDarkTheme(theme) ? "border-white/5" : "border-slate-100",
          )}
        >
          <div className="flex items-center gap-3">
            <img
              src={brandLogo}
              alt="Bible Diary Logo"
              className="w-8 h-8 rounded-lg object-cover shadow-md shadow-yellow-500/10 border border-amber-500/20 select-none animate-fade-in"
              referrerPolicy="no-referrer"
            />
            <span
              className={cn(
                "text-lg font-semibold tracking-tight",
                isDarkTheme(theme) ? "text-white" : "text-slate-900",
              )}
            >
              The Living{" "}
              <span className="text-gold-500 font-light font-sans">Word</span>
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={cn(
              "p-2 rounded-lg text-slate-400 transition-colors",
              isDarkTheme(theme) ? "hover:bg-white/5" : "hover:bg-slate-100",
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
              isDarkTheme(theme)
                ? "bg-white/5 hover:bg-white/10 border-white/10 text-white hover:border-gold-500/50"
                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:border-gold-500/50",
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
              isDarkTheme(theme)
                ? "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20 text-gold-400 hover:text-gold-300"
                : "bg-amber-500/5 hover:bg-amber-500/10 border-amber-200 text-amber-700 hover:text-amber-800",
            )}
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
            <span>{getUiTranslation("giving", language)}</span>
          </button>
        </div>

        {/* Scrollable chat history */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 py-2">
          <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center justify-between">
            <span>{getUiTranslation("studyArchives", language)}</span>
            <span
              className={cn(
                "font-mono text-[9px]",
                isDarkTheme(theme) ? "text-slate-500" : "text-slate-400",
              )}
            >
              {sessions.length}{" "}
              {language === "fil"
                ? "session"
                : language === "ceb"
                  ? "session"
                  : "sessions"}
            </span>
          </div>

          {sessions.length === 0 ? (
            <div
              className={cn(
                "px-4 py-6 text-xs font-light italic text-center",
                isDarkTheme(theme) ? "text-slate-600" : "text-slate-400",
              )}
            >
              {getUiTranslation("noChats", language)}
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => selectSession(sess.id, true)}
                    className={cn(
                      "group w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all cursor-pointer border border-transparent",
                      isActive
                        ? isDarkTheme(theme)
                          ? "bg-white/[0.08] text-white border-l-2 border-l-gold-500"
                          : "bg-slate-100 text-slate-900 border-l-2 border-l-gold-500 font-semibold shadow-sm"
                        : isDarkTheme(theme)
                          ? "text-slate-400 hover:bg-white/5 hover:text-white"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-1">
                      <MessageSquare
                        className={cn(
                          "w-4 h-4 flex-shrink-0",
                          isActive
                            ? "text-gold-500"
                            : isDarkTheme(theme)
                              ? "text-slate-500"
                              : "text-slate-400",
                        )}
                      />
                      <span className="text-xs truncate font-light">
                        {sess.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openRenameSession(sess.id);
                        }}
                        className={cn(
                          "opacity-0 group-hover:opacity-100 p-1 rounded hover:text-gold-400 transition-all",
                          isDarkTheme(theme)
                            ? "hover:bg-white/10 text-slate-500"
                            : "hover:bg-slate-200/80 text-slate-400",
                        )}
                        title={getUiTranslation("renameChat", language)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => openDeleteConfirm(sess.id, e)}
                        className={cn(
                          "opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 transition-all",
                          isDarkTheme(theme)
                            ? "hover:bg-white/10 text-slate-500"
                            : "hover:bg-slate-200/80 text-slate-400",
                        )}
                        title={getUiTranslation("deleteChat", language)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-2 pt-4 pb-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  void handleExportConversations();
                }}
                className={cn(
                  "flex items-center justify-center gap-2 px-3 py-3 rounded-full transition-all text-[10px] font-semibold uppercase tracking-wider border cursor-pointer",
                  isDarkTheme(theme)
                    ? "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700",
                )}
              >
                <Download className="w-3.5 h-3.5 text-gold-500" />
                <span>{getUiTranslation("exportConversations", language)}</span>
              </button>
              <button
                onClick={handleImportConversations}
                className={cn(
                  "flex items-center justify-center gap-2 px-3 py-3 rounded-full transition-all text-[10px] font-semibold uppercase tracking-wider border cursor-pointer",
                  isDarkTheme(theme)
                    ? "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700",
                )}
              >
                <Upload className="w-3.5 h-3.5 text-gold-500" />
                <span>{getUiTranslation("importConversations", language)}</span>
              </button>
            </div>
            <input
              ref={importFileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFileChange}
            />
          </div>
        </div>

        {/* Live offline simulator control & preferences */}
        <div
          className={cn(
            "p-4 border-t space-y-3",
            isDarkTheme(theme)
              ? "border-white/5 bg-[#050608]/80"
              : "border-slate-100 bg-white",
          )}
        >
          {/* Quick Language switcher widget inside sidebar */}
          <LanguageDropdown
            currentLang={language}
            onChange={handleLanguageChange}
            langLabel={getUiTranslation("langLabel", language)}
            align="up"
            className="w-full"
            theme={theme}
          />

          <ThemeDropdown
            value={theme}
            onChange={changeTheme}
            themeLabel={getUiTranslation("themeLabel", language)}
            align="up"
            className="w-full"
            theme={theme}
            language={language}
            getLabel={getUiTranslation}
          />

          <div
            className={cn(
              "flex items-center justify-between text-xs px-2 pt-1 font-light",
              isDarkTheme(theme) ? "text-slate-500" : "text-slate-400",
            )}
          >
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
        <header
          className={cn(
            "h-16 flex items-center justify-between px-4 lg:px-8 border-b backdrop-blur-md sticky top-0 z-30 transition-colors duration-300",
            isDarkTheme(theme)
              ? "border-white/5 bg-[#0B0C10]/60"
              : "border-slate-200/60 bg-[#FAFAFB]/80",
          )}
        >
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isDarkTheme(theme)
                    ? "hover:bg-white/5 text-white"
                    : "hover:bg-slate-200 text-slate-800",
                )}
              >
                <Menu className="w-5 h-5 animate-pulse" />
              </button>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "text-xs uppercase tracking-[0.25em] font-medium shrink-0",
                  isDarkTheme(theme) ? "text-white/50" : "text-slate-500",
                )}
              >
                {showHomeScreen
                  ? getUiTranslation("suggestedPassages", language)
                  : getUiTranslation("currentChat", language)}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold tracking-wide max-w-[200px] md:max-w-xs truncate",
                  isDarkTheme(theme) ? "text-white" : "text-slate-800",
                )}
              >
                {showHomeScreen
                  ? getUiTranslation("titleMain", language)
                  : activeSession
                    ? activeSession.title
                    : getUiTranslation("introGuide", language)}
              </span>
            </div>
          </div>

          {/* Network-aware indicators and status block */}
          <div className="flex items-center gap-3 sm:gap-4">
            <AnimatePresence mode="wait">
              {!currentOnlineStatus ? (
                <motion.div
                  key="offline"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] tracking-wider uppercase text-[#D4AF37] font-semibold"
                >
                  <WifiOff className="w-3.5 h-3.5 animate-bounce" />
                  <span>{getUiTranslation("offlineActive", language)}</span>
                </motion.div>
              ) : cloudQuotaExceeded ? (
                <motion.div
                  key="quota"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-2.5 py-1 bg-orange-500/10 border border-orange-500/25 rounded-full text-[10px] tracking-wider uppercase text-orange-400 font-semibold"
                >
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>{getUiTranslation("cloudQuotaActive", language)}</span>
                </motion.div>
              ) : (
                <motion.div
                  key="online"
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

            {activeSession && !showHomeScreen && (
              <button
                onClick={goHome}
                className={cn(
                  "lg:hidden transition-all text-xs border px-3 py-1 rounded-full items-center gap-1 font-semibold inline-flex",
                  isDarkTheme(theme)
                    ? "text-slate-400 hover:text-white border-white/10 bg-white/5"
                    : "text-slate-600 hover:text-slate-950 border-slate-200 bg-slate-50",
                )}
              >
                <span>{getUiTranslation("closeStudy", language)}</span>
              </button>
            )}

            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center border",
                isDarkTheme(theme)
                  ? "bg-slate-800 border-white/10"
                  : "bg-slate-100 border-slate-200",
              )}
            >
              <User
                className={cn(
                  "w-5 h-5",
                  isDarkTheme(theme) ? "text-slate-400" : "text-slate-500",
                )}
              />
            </div>
          </div>
        </header>

        {/* Content Box */}
        <div
          ref={scrollRef}
          onScroll={handleChatScroll}
          onTouchStart={handleScrollInteractionStart}
          onTouchEnd={handleScrollInteractionEnd}
          onTouchCancel={handleScrollInteractionEnd}
          onMouseDown={handleScrollInteractionStart}
          onMouseUp={handleScrollInteractionEnd}
          onMouseLeave={handleScrollInteractionEnd}
          className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-24 xl:px-44 py-8 scroll-smooth"
        >
          {showHomeScreen ? (
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
                    alt="Bible Diary Logo"
                    className="relative w-24 h-24 rounded-3xl object-cover shadow-xl border border-amber-500/15 select-none transition-all duration-500 hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <h1 className="text-4xl md:text-5xl font-display font-light tracking-tight mt-2">
                  <span className="gold-gradient">
                    {getUiTranslation("titleMain", language)}
                  </span>
                </h1>
                <p
                  className={cn(
                    "text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed",
                    isDarkTheme(theme) ? "text-slate-400" : "text-slate-600",
                  )}
                >
                  {getUiTranslation("welcomeDesc", language)}

                  {!currentOnlineStatus && (
                    <span className="text-gold-500 font-normal">
                      {getUiTranslation("offlineBanner", language)}
                    </span>
                  )}
                </p>
              </motion.div>

              {/* Verse suggestions */}
              <div className="w-full max-w-3xl mx-auto space-y-6">
                <p
                  className={cn(
                    "text-[10px] uppercase tracking-widest font-semibold text-center",
                    isDarkTheme(theme) ? "text-gold-400" : "text-gold-600",
                  )}
                >
                  {getUiTranslation("suggestedPassages", language)}
                </p>

                {verseSuggestionsLoading ? (
                  <div
                    className={cn(
                      "p-6 border rounded-2xl text-center text-sm font-light",
                      isDarkTheme(theme)
                        ? "bg-white/5 border-white/5 text-slate-400"
                        : "bg-white border-slate-200 text-slate-500",
                    )}
                  >
                    {getUiTranslation("verseSuggestionsLoading", language)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {verseSuggestions.map((suggestion) => (
                      <motion.button
                        key={suggestion.reference}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => handleSend(suggestion.reference)}
                        className={cn(
                          "p-5 text-left border rounded-2xl transition-all group shadow-lg flex flex-col gap-3 cursor-pointer h-full",
                          isDarkTheme(theme)
                            ? "bg-white/5 hover:bg-white/10 border-white/5 hover:border-gold-500/30"
                            : "bg-white hover:bg-slate-50 border-slate-200 hover:border-gold-500/30 shadow-sm",
                        )}
                      >
                        {suggestion.text ? (
                          <p
                            className={cn(
                              "font-light leading-relaxed text-sm md:text-base line-clamp-4",
                              isDarkTheme(theme)
                                ? "text-slate-300 group-hover:text-white"
                                : "text-slate-700 group-hover:text-slate-900",
                            )}
                          >
                            {suggestion.text}
                          </p>
                        ) : null}
                        <div className="flex items-center justify-between w-full gap-3 mt-auto">
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              isDarkTheme(theme)
                                ? "text-gold-400 group-hover:text-gold-300"
                                : "text-gold-600 group-hover:text-gold-700",
                            )}
                          >
                            {suggestion.reference}
                          </span>
                          <span
                            className={cn(
                              "text-[9px] uppercase tracking-widest font-mono transition-colors shrink-0",
                              isDarkTheme(theme)
                                ? "text-slate-500 group-hover:text-gold-500"
                                : "text-slate-400 group-hover:text-gold-600",
                            )}
                          >
                            {getUiTranslation("dailyVerseTap", language)}
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    void refreshVerseSuggestions(
                      verseSuggestions.map((suggestion) => suggestion.reference),
                    )
                  }
                  disabled={verseSuggestionsLoading}
                  className={cn(
                    "w-full py-3 px-4 rounded-2xl border text-sm font-semibold tracking-wide transition-all disabled:opacity-50",
                    isDarkTheme(theme)
                      ? "border-white/10 bg-white/5 hover:bg-white/10 text-gold-400"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-gold-600",
                  )}
                >
                  {getUiTranslation("suggestMore", language)}
                </button>
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
                    msg.role === "user" ? "items-end" : "items-start",
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

                  <div
                    className={cn(
                      "max-w-[90%] md:max-w-[85%]",
                      msg.role === "user"
                        ? isDarkTheme(theme)
                          ? "bg-slate-overlay border border-white/5 rounded-2xl rounded-tr-none px-6 py-4 shadow-xl"
                          : "bg-white border border-slate-200/80 rounded-2xl rounded-tr-none px-6 py-4 shadow-md text-slate-800"
                        : cn(
                            "space-y-4 text-sm sm:text-base md:text-lg font-light leading-relaxed max-w-none bible-markdown",
                            isDarkTheme(theme)
                              ? "text-white prose-invert prose-gold"
                              : "text-slate-800 prose prose-gold",
                          ),
                    )}
                  >
                    {msg.role === "user" ? (
                      <>
                        <p
                          className={cn(
                            "leading-relaxed font-light",
                            isDarkTheme(theme)
                              ? "text-slate-200"
                              : "text-slate-800",
                          )}
                        >
                          {msg.text}
                        </p>
                        {detectBibleVerse(msg.text) && (
                          <BibleVerseReader
                            query={msg.text}
                            onNavigate={(verse) => handleSend(verse)}
                            language={language}
                            theme={theme}
                          />
                        )}
                      </>
                    ) : (
                      <div className="bible-markdown">
                        <ReactMarkdown
                          components={{
                            blockquote: ({ node, ...props }) => (
                              <blockquote
                                className={cn(
                                  "border-l-2 border-gold-500 pl-6 py-1 italic text-lg my-6 rounded-r-md",
                                  isDarkTheme(theme)
                                    ? "bg-white/[0.01] text-slate-400"
                                    : "bg-slate-100/50 text-slate-600",
                                )}
                                {...props}
                              />
                            ),
                            strong: ({ node, ...props }) => (
                              <span
                                className="text-gold-500 font-medium"
                                {...props}
                              />
                            ),
                            h3: ({ node, ...props }) => (
                              <h3
                                className={cn(
                                  "font-display text-lg tracking-wider mb-2",
                                  isDarkTheme(theme)
                                    ? "text-white"
                                    : "text-slate-900 font-semibold",
                                )}
                                {...props}
                              />
                            ),
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  <span
                    className={cn(
                      "text-[10px] mt-2 tracking-widest uppercase font-medium",
                      isDarkTheme(theme) ? "text-slate-600" : "text-slate-400",
                      msg.role === "user" ? "mr-1" : "ml-1",
                    )}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                </motion.div>
              ))}

              {(isTranslating || isLoading) && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-start w-full"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F9E4A0] animate-pulse shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
                    <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-500/80">
                      {getUiTranslation("scribe", language)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-5 py-4 border rounded-2xl rounded-tl-none shadow-lg",
                      isDarkTheme(theme)
                        ? "bg-white/5 border-white/10 text-slate-300"
                        : "bg-white border-slate-200 text-slate-600 shadow-sm",
                    )}
                  >
                    <Loader2
                      className={cn(
                        "w-5 h-5 shrink-0 animate-spin",
                        isDarkTheme(theme) ? "text-gold-400" : "text-gold-600",
                      )}
                    />
                    <span className="text-sm font-light animate-pulse">
                      {isTranslating
                        ? getUiTranslation("translating", language)
                        : getUiTranslation("consulting", language)}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Input box */}
        <div className="p-4 pb-6 md:p-8 md:pb-12 flex flex-col items-center bg-transparent relative flex-shrink-0 w-full">
          <div className="w-full max-w-2xl relative">
            <div
              className={cn(
                "relative flex items-center border rounded-full h-14 md:h-16 px-4 md:px-6 shadow-2xl transition-all group",
                isDarkTheme(theme)
                  ? "bg-slate-overlay border-white/10 focus-within:border-gold-500/50"
                  : "bg-white border-slate-200 focus-within:border-gold-500/50 shadow-md",
              )}
            >
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
                              : "Explain the Sermon on the Mount.",
                  );
                }}
                className={cn(
                  "transition-colors flex-shrink-0 cursor-pointer",
                  isDarkTheme(theme)
                    ? "text-slate-500 hover:text-gold-500"
                    : "text-slate-400 hover:text-gold-600",
                )}
                title={getUiTranslation("selectGuide", language)}
              >
                <BookOpen className="w-6 h-6" />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollTop =
                      scrollRef.current.scrollHeight;
                  }
                }}
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
                  isDarkTheme(theme)
                    ? "text-white placeholder-slate-500"
                    : "text-slate-800 placeholder-slate-400",
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
                      : isDarkTheme(theme)
                        ? "bg-white/5 text-slate-600 cursor-not-allowed"
                        : "bg-slate-100 text-slate-300 cursor-not-allowed",
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <p
              className={cn(
                "text-[9px] text-center mt-4 uppercase tracking-[0.3em]",
                isDarkTheme(theme) ? "text-slate-600" : "text-slate-400",
              )}
            >
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
                isDarkTheme(theme)
                  ? "bg-[#0E1015]/95 border-white/10"
                  : "bg-white border-slate-200",
              )}
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 select-none" />

              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 fill-emerald-500 text-emerald-500 animate-pulse" />
              </div>

              <h2 className="text-xl font-black tracking-tight mb-2">
                {language === "fil"
                  ? "Malugod na Tinanggap ang Alay!"
                  : language === "ceb"
                    ? "Nadawat na ang Halad!"
                    : "Offering Gracefully Accepted!"}
              </h2>

              <p className="text-xs font-light text-slate-400 max-w-xs mx-auto leading-relaxed mb-6">
                {language === "fil"
                  ? "Maraming salamat sa inyong paghahasik sa gawain ng Panginoon! Pagpalain kayo ng masagana."
                  : language === "ceb"
                    ? "Salamat kaayo sa inyong paghatag sa buhat sa Ginoo! Pagatabangan ug panalanginan kamo sa Dios."
                    : "Your support allows our ministries, scriptures, and spiritual research to flourish across the region."}
              </p>

              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 mb-6 text-left text-xs space-y-1.5 font-mono select-text">
                <p className="text-slate-500">
                  CATEGORY:{" "}
                  <span className="text-emerald-400 font-bold">
                    {donationSuccessDetails.purpose}
                  </span>
                </p>
                <p className="text-slate-500">
                  AMOUNT COMPLETED:{" "}
                  <span className="text-emerald-400 font-black">
                    ₱{" "}
                    {parseFloat(donationSuccessDetails.amount).toLocaleString()}{" "}
                    PHP
                  </span>
                </p>
                <p className="text-slate-500">
                  PROVIDER:{" "}
                  <span className="text-[#3b82f6] font-bold">
                    PayMongo Gateway Secured
                  </span>
                </p>
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

      <AnimatePresence>
        {renameSessionId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setRenameSessionId(null);
              setRenameDraft("");
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full max-w-md rounded-2xl border p-5 shadow-2xl",
                isDarkTheme(theme)
                  ? "bg-[#0E1015] border-white/10"
                  : "bg-white border-slate-200",
              )}
            >
              <h2
                className={cn(
                  "text-lg font-semibold mb-4",
                  isDarkTheme(theme) ? "text-white" : "text-slate-900",
                )}
              >
                {getUiTranslation("renameChat", language)}
              </h2>
              <input
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSession();
                  if (e.key === "Escape") {
                    setRenameSessionId(null);
                    setRenameDraft("");
                  }
                }}
                placeholder={getUiTranslation("renamePlaceholder", language)}
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500/40 mb-4",
                  isDarkTheme(theme)
                    ? "bg-white/5 border-white/10 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-900",
                )}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setRenameSessionId(null);
                    setRenameDraft("");
                  }}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-semibold border",
                    isDarkTheme(theme)
                      ? "border-white/10 text-slate-300 hover:bg-white/5"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {getUiTranslation("cancel", language)}
                </button>
                <button
                  onClick={handleRenameSession}
                  disabled={!renameDraft.trim()}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-gold-500 text-black disabled:opacity-50"
                >
                  {getUiTranslation("save", language)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteSessionId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeDeleteConfirm}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full max-w-md rounded-2xl border p-5 shadow-2xl",
                isDarkTheme(theme)
                  ? "bg-[#0E1015] border-white/10"
                  : "bg-white border-slate-200",
              )}
            >
              <h2
                className={cn(
                  "text-lg font-semibold mb-2",
                  isDarkTheme(theme) ? "text-white" : "text-slate-900",
                )}
              >
                {getUiTranslation("deleteChat", language)}
              </h2>
              <p
                className={cn(
                  "text-sm mb-1",
                  isDarkTheme(theme) ? "text-slate-400" : "text-slate-600",
                )}
              >
                {sessions.find((s) => s.id === deleteSessionId)?.title}
              </p>
              <p
                className={cn(
                  "text-sm mb-5",
                  isDarkTheme(theme) ? "text-slate-500" : "text-slate-500",
                )}
              >
                {getUiTranslation("deleteChatConfirm", language)}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={closeDeleteConfirm}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-semibold border",
                    isDarkTheme(theme)
                      ? "border-white/10 text-slate-300 hover:bg-white/5"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {getUiTranslation("cancel", language)}
                </button>
                <button
                  onClick={confirmDeleteSession}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-red-500 hover:bg-red-600 text-white"
                >
                  {getUiTranslation("delete", language)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
