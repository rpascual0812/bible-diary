import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
} from "react-native";
import Markdown from "react-native-markdown-display";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { GeminiService, Message } from "../src/services/geminiService";
import {
  sessionNeedsTranslation,
  translateChatSession,
} from "../src/services/translationService";
import { getOfflineAnswer } from "../src/data/offlineBibleData";
import { resolveGeminiApiKey } from "../src/config/apiKey";
import {
  isGeminiQuotaError,
  resolveGeminiChatErrorMessage,
} from "../src/lib/geminiErrors";
import { useOnlineStatus } from "../src/lib/useOnlineStatus";
import { formatTime } from "../src/lib/utils";
import type { ChatSession, LangType } from "../src/types";
import {
  migrateLegacyNativeStorage,
  readNativeStorageItem,
  STORAGE_KEYS,
} from "../src/lib/appIdentity";
import { getItem, removeItem, setItem } from "../src/native/storage";
import { t } from "../src/native/translations";
import {
  loadVerseSuggestions,
  pickRandomVerseReferences,
  SUGGESTION_COUNT,
  type VerseSuggestion,
} from "../src/lib/verseSuggestions";
import { processModelResponse } from "../src/lib/followUpSuggestions";
import {
  handleChatBackPress,
  pickFallbackSessionId,
} from "../src/lib/chatNavigation";
import { LanguageDropdown } from "../src/native/LanguageDropdown";
import { ThemeDropdown } from "../src/native/ThemeDropdown";
import { BibleTranslationDropdown } from "../src/native/BibleTranslationDropdown";
import { DonationModal } from "../src/native/DonationModal";
import { NativeBibleVerseReader } from "../src/native/BibleVerseReader";
import { detectBibleVerse } from "../src/lib/bibleVerse";
import { mergeImportedSessions } from "../src/lib/conversationBackup";
import {
  normalizeBibleTranslation,
  type BibleTranslationId,
} from "../src/lib/bibleTranslations";
import {
  readBibleTranslationFromNativeStorage,
  writeBibleTranslationToNativeStorage,
} from "../src/lib/bibleTranslationStorage";
import {
  getNativeThemeColors,
  isDarkTheme,
  normalizeTheme,
  type ThemeId,
} from "../src/theme";

const brandLogo = require("../src/assets/images/brand-logo.png");

function createSession(title: string, language: LangType): ChatSession {
  return {
    id: `session_${Date.now()}`,
    title,
    messages: [],
    created_at: Date.now(),
    language,
  };
}

export default function NativeApp() {
  const [language, setLanguage] = useState<LangType>("en");
  const [theme, setTheme] = useState<ThemeId>("dark");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showHomeScreen, setShowHomeScreen] = useState(true);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const isOnline = useOnlineStatus();
  const [cloudQuotaExceeded, setCloudQuotaExceeded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [bibleTranslationDropdownOpen, setBibleTranslationDropdownOpen] =
    useState(false);
  const [bibleTranslation, setBibleTranslation] = useState<BibleTranslationId>(
    () => normalizeBibleTranslation(null),
  );
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [verseSuggestions, setVerseSuggestions] = useState<VerseSuggestion[]>(
    [],
  );
  const [verseSuggestionsLoading, setVerseSuggestionsLoading] = useState(true);

  const geminiRef = useRef<GeminiService | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const pendingScrollAnchorRef = useRef<number | null>(null);
  const sessionsRef = useRef(sessions);
  const languageRef = useRef(language);
  const translatingSessionRef = useRef<string | null>(null);
  sessionsRef.current = sessions;
  languageRef.current = language;

  const colors = getNativeThemeColors(theme);
  const isDark = isDarkTheme(theme);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );
  const messages = activeSession?.messages ?? [];

  const scrollToMessageIndex = useCallback((index: number) => {
    if (index < 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index,
        viewPosition: 0,
        animated: true,
      });
    });
  }, []);

  const scrollToMessageAnchor = useCallback(
    (timestamp: number) => {
      const index = messages.findIndex((msg) => msg.timestamp === timestamp);
      scrollToMessageIndex(index);
    },
    [messages, scrollToMessageIndex],
  );

  const scrollToLastUserMessage = useCallback(() => {
    const lastUserIndex = messages.findLastIndex((msg) => msg.role === "user");
    scrollToMessageIndex(lastUserIndex);
  }, [messages, scrollToMessageIndex]);

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number }) => {
      setTimeout(() => scrollToMessageIndex(info.index), 100);
    },
    [scrollToMessageIndex],
  );

  const saveSessions = useCallback(
    async (updated: ChatSession[], activeId = activeSessionId) => {
      setSessions(updated);
      await setItem(STORAGE_KEYS.sessions, JSON.stringify(updated));
      if (activeId) {
        await setItem(STORAGE_KEYS.activeId, activeId);
      }
    },
    [activeSessionId],
  );

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      await migrateLegacyNativeStorage(getItem, setItem);

      const [savedLang, savedTheme, savedSessions, savedActiveId] =
        await Promise.all([
          readNativeStorageItem(getItem, "language"),
          readNativeStorageItem(getItem, "theme"),
          readNativeStorageItem(getItem, "sessions"),
          readNativeStorageItem(getItem, "activeId"),
        ]);

      if (!active) return;

      if (savedLang) setLanguage(savedLang as LangType);
      if (savedTheme) setTheme(normalizeTheme(savedTheme));
      const savedTranslation = await readBibleTranslationFromNativeStorage(getItem);
      setBibleTranslation(savedTranslation);

      if (savedSessions) {
        try {
          const parsed = JSON.parse(savedSessions) as ChatSession[];
          setSessions(parsed);
          const activeId =
            savedActiveId &&
            parsed.some((session) => session.id === savedActiveId)
              ? savedActiveId
              : parsed.length > 0
                ? parsed[0].id
                : null;
          if (activeId) {
            setActiveSessionId(activeId);
          }
          setShowHomeScreen(true);
        } catch {
          setSessions([]);
          setShowHomeScreen(true);
        }
      } else {
        setShowHomeScreen(true);
      }

      setHydrated(true);
    }

    hydrate();
    return () => {
      active = false;
    };
  }, []);

  const refreshVerseSuggestions = useCallback(async (exclude: string[] = []) => {
    setVerseSuggestionsLoading(true);
    const references = pickRandomVerseReferences(SUGGESTION_COUNT, exclude);
    try {
      const loaded = await loadVerseSuggestions(references, bibleTranslation);
      setVerseSuggestions(loaded);
    } catch {
      setVerseSuggestions(
        references.map((reference) => ({ reference, text: "" })),
      );
    } finally {
      setVerseSuggestionsLoading(false);
    }
  }, [bibleTranslation]);

  useEffect(() => {
    if (!hydrated) return;
    void refreshVerseSuggestions();
  }, [hydrated, refreshVerseSuggestions]);

  useEffect(() => {
    if (!hydrated) return;

    const apiKey = resolveGeminiApiKey();
    if (apiKey) {
      geminiRef.current = new GeminiService(apiKey, language);
    } else {
      geminiRef.current = null;
    }
  }, [language, hydrated]);

  useEffect(() => {
    const anchorTs = pendingScrollAnchorRef.current;
    if (!anchorTs || messages.length === 0) return;

    const anchorIndex = messages.findIndex((msg) => msg.timestamp === anchorTs);
    if (anchorIndex === -1) return;

    const hasResponse =
      messages.length > anchorIndex + 1 &&
      messages[anchorIndex + 1].role === "model" &&
      !isLoading;

    if (hasResponse) {
      scrollToMessageAnchor(anchorTs);
      pendingScrollAnchorRef.current = null;
      return;
    }

    if (isLoading && messages[anchorIndex]?.role === "user") {
      scrollToMessageAnchor(anchorTs);
    }
  }, [messages, isLoading, scrollToMessageAnchor]);

  useEffect(() => {
    const event =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const subscription = Keyboard.addListener(event, () => {
      setTimeout(() => scrollToLastUserMessage(), 50);
    });
    return () => subscription.remove();
  }, [scrollToLastUserMessage]);

  const handleLanguageChange = async (lang: LangType) => {
    if (lang === language) return;

    setLanguage(lang);
    await setItem(STORAGE_KEYS.language, lang);
    geminiRef.current?.setLanguage(lang);

    const session = sessions.find((item) => item.id === activeSessionId);
    if (!session) return;

    if (!session.messages.length) {
      await saveSessions(
        sessions.map((item) =>
          item.id === activeSessionId ? { ...item, language: lang } : item,
        ),
        activeSessionId ?? undefined,
      );
      return;
    }

    const apiKey = resolveGeminiApiKey();
    if (!apiKey || !isOnline) return;

    setIsTranslating(true);
    try {
      const translated = await translateChatSession(apiKey, session, lang);
      const updated = sessions.map((item) =>
        item.id === activeSessionId ? translated : item,
      );
      await saveSessions(updated, activeSessionId ?? undefined);
    } catch (error) {
      console.error("Translation failed:", error);
      if (isGeminiQuotaError(error)) {
        setCloudQuotaExceeded(true);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const translateSessionToCurrentLanguage = useCallback(
    async (sessionId: string, targetLang: LangType = language) => {
      if (translatingSessionRef.current === sessionId) return;

      const session = sessionsRef.current.find((item) => item.id === sessionId);
      if (!session || !sessionNeedsTranslation(session, targetLang)) return;

      const apiKey = resolveGeminiApiKey();
      if (!apiKey || !isOnline) return;

      translatingSessionRef.current = sessionId;
      setIsTranslating(true);
      try {
        const translated = await translateChatSession(
          apiKey,
          session,
          targetLang,
        );
        const updated = sessionsRef.current.map((item) =>
          item.id === sessionId ? translated : item,
        );
        await saveSessions(updated, sessionId);
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
    [language, isOnline, saveSessions],
  );

  useEffect(() => {
    if (!hydrated || !activeSessionId || showHomeScreen) return;
    void translateSessionToCurrentLanguage(activeSessionId, language);
  }, [
    hydrated,
    activeSessionId,
    showHomeScreen,
    language,
    translateSessionToCurrentLanguage,
  ]);

  const changeTheme = async (next: ThemeId) => {
    setTheme(next);
    await setItem(STORAGE_KEYS.theme, next);
  };

  const changeBibleTranslation = useCallback(
    async (next: BibleTranslationId) => {
      const normalized = normalizeBibleTranslation(next);
      if (normalized === bibleTranslation) return;
      setBibleTranslation(normalized);
      await writeBibleTranslationToNativeStorage(setItem, normalized);
    },
    [bibleTranslation],
  );

  const goHome = useCallback(() => {
    setShowHomeScreen(true);
    setSidebarOpen(false);
  }, []);

  const handleSelectSession = async (id: string) => {
    setActiveSessionId(id);
    await setItem(STORAGE_KEYS.activeId, id);
    setShowHomeScreen(false);
    setSidebarOpen(false);
    void translateSessionToCurrentLanguage(id, languageRef.current);
  };

  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    if (!hydrated) return;

    const onBackPress = () => {
      if (isDonationModalOpen) {
        setIsDonationModalOpen(false);
        return true;
      }

      return handleChatBackPress(
        {
          sessions,
          activeSessionId,
          sidebarOpen,
          renameOpen: renameSessionId !== null,
          deleteOpen: deleteSessionId !== null,
          showHomeScreen,
        },
        {
          openSidebar: () => setSidebarOpen(true),
          closeSidebar,
          closeRename: () => {
            setRenameSessionId(null);
            setRenameDraft("");
          },
          closeDelete: () => setDeleteSessionId(null),
          selectSession: (id) => {
            void handleSelectSession(id);
          },
          goHome,
        },
      );
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [
    hydrated,
    sessions,
    activeSessionId,
    sidebarOpen,
    renameSessionId,
    deleteSessionId,
    isDonationModalOpen,
    showHomeScreen,
    goHome,
  ]);

  const handleCreateSession = async () => {
    const session = createSession(t("newChat", language), language);
    const updated = [session, ...sessions];
    await saveSessions(updated, session.id);
    setActiveSessionId(session.id);
    setShowHomeScreen(false);
    setSidebarOpen(false);
  };

  const handleDeleteSession = async (id: string) => {
    const updated = sessions.filter((session) => session.id !== id);
    const nextActive =
      activeSessionId === id
        ? updated.length > 0
          ? pickFallbackSessionId(updated) ?? updated[0]?.id ?? null
          : null
        : activeSessionId;
    setActiveSessionId(nextActive);
    if (nextActive) {
      await setItem(STORAGE_KEYS.activeId, nextActive);
    } else {
      setShowHomeScreen(true);
      await removeItem(STORAGE_KEYS.activeId);
    }
    await saveSessions(updated, nextActive ?? undefined);
  };

  const openDeleteConfirm = (sessionId: string) => {
    setDeleteSessionId(sessionId);
    setSidebarOpen(false);
  };

  const closeDeleteConfirm = () => {
    setDeleteSessionId(null);
  };

  const confirmDeleteSession = async () => {
    if (!deleteSessionId) return;
    await handleDeleteSession(deleteSessionId);
    closeDeleteConfirm();
  };

  const openRenameSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    setRenameSessionId(sessionId);
    setRenameDraft(session.title);
    setSidebarOpen(false);
  };

  const closeRenameSession = () => {
    setRenameSessionId(null);
    setRenameDraft("");
  };

  const handleRenameSession = async () => {
    if (!renameSessionId) return;
    const trimmed = renameDraft.trim();
    if (!trimmed) return;
    const updated = sessions.map((session) =>
      session.id === renameSessionId ? { ...session, title: trimmed } : session,
    );
    await saveSessions(updated, activeSessionId ?? undefined);
    closeRenameSession();
  };

  const handleExportConversations = async () => {
    setSidebarOpen(false);
    try {
      const { exportConversationsNative } = await import(
        "../src/native/conversationBackup.native"
      );
      const result = await exportConversationsNative(sessions, activeSessionId);
      if (result.cancelled) return;
      if (result.error === "empty") {
        Alert.alert(
          t("exportConversations", language),
          t("exportEmpty", language),
        );
        return;
      }
      if (result.error === "native_module_unavailable") {
        Alert.alert(
          t("exportConversations", language),
          t("nativeModuleUnavailable", language),
        );
        return;
      }
      if (result.error) {
        Alert.alert(
          t("exportConversations", language),
          t("exportError", language),
        );
      }
    } catch {
      Alert.alert(
        t("exportConversations", language),
        t("exportError", language),
      );
    }
  };

  const handleImportConversations = async () => {
    setSidebarOpen(false);
    try {
      const { importConversationsNative } = await import(
        "../src/native/conversationBackup.native"
      );
      const result = await importConversationsNative();
      if ("cancelled" in result) return;

      const {
        sessions: merged,
        activeSessionId: nextActive,
        importedCount,
      } = mergeImportedSessions(sessions, result.backup.sessions);
      setActiveSessionId(nextActive);
      setShowHomeScreen(true);
      if (nextActive) {
        await setItem(STORAGE_KEYS.activeId, nextActive);
      } else {
        await removeItem(STORAGE_KEYS.activeId);
      }
      await saveSessions(merged, nextActive ?? undefined);
      Alert.alert(
        t("importConversations", language),
        t("importSuccess", language).replace("{count}", String(importedCount)),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "native_module_unavailable"
      ) {
        Alert.alert(
          t("importConversations", language),
          t("nativeModuleUnavailable", language),
        );
        return;
      }
      Alert.alert(
        t("importConversations", language),
        t("importError", language),
      );
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText ?? input).trim();
    if (!textToSend || isLoading) return;

    setIsLoading(true);
    setInput("");

    let sessionId = activeSessionId;
    let sessionList = [...sessions];
    let currentSession = sessionList.find(
      (session) => session.id === sessionId,
    );

    if (showHomeScreen) {
      currentSession = createSession(
        textToSend.substring(0, 32) + (textToSend.length > 32 ? "..." : ""),
        language,
      );
      sessionList = [currentSession, ...sessionList];
      sessionId = currentSession.id;
      setActiveSessionId(sessionId);
    } else if (!currentSession) {
      currentSession = createSession(
        textToSend.substring(0, 32) + (textToSend.length > 32 ? "..." : ""),
        language,
      );
      sessionList = [currentSession, ...sessionList];
      sessionId = currentSession.id;
      setActiveSessionId(sessionId);
    } else if (currentSession.messages.length === 0) {
      currentSession = {
        ...currentSession,
        title:
          textToSend.substring(0, 32) + (textToSend.length > 32 ? "..." : ""),
        language,
      };
      sessionList = sessionList.map((session) =>
        session.id === currentSession!.id ? currentSession! : session,
      );
    }

    const userMsg: Message = {
      role: "user",
      text: textToSend,
      timestamp: Date.now(),
    };
    pendingScrollAnchorRef.current = userMsg.timestamp;

    const withUser = sessionList.map((session) => {
      if (session.id !== sessionId) return session;
      const nextLanguage =
        session.language == null || session.language === language
          ? language
          : session.language;
      return {
        ...session,
        messages: [...session.messages, userMsg],
        language: nextLanguage,
      };
    });

    setSessions(withUser);
    setShowHomeScreen(false);
    void saveSessions(withUser, sessionId);

    try {
      let aiText = "";
      if (geminiRef.current && isOnline) {
        aiText = await geminiRef.current.sendMessage(textToSend);
      } else if (!isOnline) {
        aiText = getOfflineAnswer(textToSend, language);
      } else {
        aiText = `## Local Study Mode\n\nYou are online, but cloud AI is not configured (missing Gemini API key). Using the offline Bible study database.\n\n${getOfflineAnswer(textToSend, language)}`;
      }

      const { text: displayText, followUps } = processModelResponse(
        aiText,
        textToSend,
        language,
      );

      const aiMsg: Message = {
        role: "model",
        text: displayText,
        timestamp: Date.now(),
        followUps,
      };

      const withAi = withUser.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages, aiMsg],
              language: session.language ?? language,
            }
          : session,
      );
      await saveSessions(withAi, sessionId);
      setCloudQuotaExceeded(false);
    } catch (error) {
      if (isGeminiQuotaError(error)) {
        setCloudQuotaExceeded(true);
      }
      const fallbackText = resolveGeminiChatErrorMessage(
        error,
        language,
        getOfflineAnswer(textToSend, language),
      );
      const { text: displayFallbackText, followUps } = processModelResponse(
        fallbackText,
        textToSend,
        language,
      );
      const fallback: Message = {
        role: "model",
        text: displayFallbackText,
        timestamp: Date.now(),
        followUps,
      };
      const withFallback = withUser.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages, fallback],
              language: session.language ?? language,
            }
          : session,
      );
      await saveSessions(withFallback, sessionId);
    } finally {
      setIsLoading(false);
    }
  };

  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.splash, { backgroundColor: colors.background }]}
        >
          <Image source={brandLogo} style={styles.splashLogo} />
          <Text style={[styles.splashTitle, { color: colors.text }]}>
            Daily Healing Word
          </Text>
          <Text style={[styles.splashSubtitle, { color: colors.muted }]}>
            Bible Companion & Study Guide
          </Text>
          <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!hydrated) {
    return (
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.centered, { backgroundColor: colors.background }]}
        >
          <ActivityIndicator color={colors.accent} size="large" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NativeAppContent
        theme={theme}
        colors={colors}
        isDark={isDark}
        language={language}
        isOnline={isOnline}
        cloudQuotaExceeded={cloudQuotaExceeded}
        bibleTranslation={bibleTranslation}
        activeSession={activeSession}
        messages={messages}
        verseSuggestions={verseSuggestions}
        verseSuggestionsLoading={verseSuggestionsLoading}
        refreshVerseSuggestions={refreshVerseSuggestions}
        showHomeScreen={showHomeScreen}
        goHome={goHome}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        isTranslating={isTranslating}
        sidebarOpen={sidebarOpen}
        langDropdownOpen={langDropdownOpen}
        themeDropdownOpen={themeDropdownOpen}
        bibleTranslationDropdownOpen={bibleTranslationDropdownOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        listRef={listRef}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        onComposerFocus={scrollToLastUserMessage}
        handleSend={handleSend}
        handleLanguageChange={handleLanguageChange}
        changeTheme={changeTheme}
        changeBibleTranslation={changeBibleTranslation}
        setSidebarOpen={setSidebarOpen}
        closeSidebar={closeSidebar}
        setLangDropdownOpen={setLangDropdownOpen}
        setThemeDropdownOpen={setThemeDropdownOpen}
        setBibleTranslationDropdownOpen={setBibleTranslationDropdownOpen}
        handleCreateSession={handleCreateSession}
        handleSelectSession={handleSelectSession}
        openDeleteConfirm={openDeleteConfirm}
        deleteSessionId={deleteSessionId}
        confirmDeleteSession={confirmDeleteSession}
        closeDeleteConfirm={closeDeleteConfirm}
        openRenameSession={openRenameSession}
        renameSessionId={renameSessionId}
        renameDraft={renameDraft}
        setRenameDraft={setRenameDraft}
        handleRenameSession={handleRenameSession}
        closeRenameSession={closeRenameSession}
        handleExportConversations={handleExportConversations}
        handleImportConversations={handleImportConversations}
        isDonationModalOpen={isDonationModalOpen}
        setIsDonationModalOpen={setIsDonationModalOpen}
      />
    </SafeAreaProvider>
  );
}

interface NativeAppContentProps {
  theme: ThemeId;
  colors: ReturnType<typeof getNativeThemeColors>;
  isDark: boolean;
  language: LangType;
  bibleTranslation: BibleTranslationId;
  isOnline: boolean;
  cloudQuotaExceeded: boolean;
  activeSession: ChatSession | null;
  messages: Message[];
  verseSuggestions: VerseSuggestion[];
  verseSuggestionsLoading: boolean;
  refreshVerseSuggestions: (exclude?: string[]) => Promise<void>;
  showHomeScreen: boolean;
  goHome: () => void;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isTranslating: boolean;
  sidebarOpen: boolean;
  langDropdownOpen: boolean;
  themeDropdownOpen: boolean;
  bibleTranslationDropdownOpen: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  listRef: React.RefObject<FlatList<Message> | null>;
  onScrollToIndexFailed: (info: { index: number }) => void;
  onComposerFocus: () => void;
  handleSend: (customText?: string) => Promise<void>;
  handleLanguageChange: (lang: LangType) => Promise<void>;
  changeTheme: (theme: ThemeId) => Promise<void>;
  changeBibleTranslation: (translation: BibleTranslationId) => Promise<void>;
  setSidebarOpen: (open: boolean) => void;
  closeSidebar: () => void;
  setLangDropdownOpen: (open: boolean) => void;
  setThemeDropdownOpen: (open: boolean) => void;
  setBibleTranslationDropdownOpen: (open: boolean) => void;
  handleCreateSession: () => Promise<void>;
  handleSelectSession: (id: string) => Promise<void>;
  openDeleteConfirm: (id: string) => void;
  deleteSessionId: string | null;
  confirmDeleteSession: () => Promise<void>;
  closeDeleteConfirm: () => void;
  openRenameSession: (id: string) => void;
  renameSessionId: string | null;
  renameDraft: string;
  setRenameDraft: (value: string) => void;
  handleRenameSession: () => Promise<void>;
  closeRenameSession: () => void;
  handleExportConversations: () => Promise<void>;
  handleImportConversations: () => Promise<void>;
  isDonationModalOpen: boolean;
  setIsDonationModalOpen: (open: boolean) => void;
}

function NativeAppContent({
  theme,
  colors,
  isDark,
  language,
  bibleTranslation,
  isOnline,
  cloudQuotaExceeded,
  activeSession,
  messages,
  verseSuggestions,
  verseSuggestionsLoading,
  refreshVerseSuggestions,
  showHomeScreen,
  goHome,
  input,
  setInput,
  isLoading,
  isTranslating,
  sidebarOpen,
  langDropdownOpen,
  themeDropdownOpen,
  bibleTranslationDropdownOpen,
  sessions,
  activeSessionId,
  listRef,
  onScrollToIndexFailed,
  onComposerFocus,
  handleSend,
  handleLanguageChange,
  changeTheme,
  changeBibleTranslation,
  setSidebarOpen,
  closeSidebar,
  setLangDropdownOpen,
  setThemeDropdownOpen,
  setBibleTranslationDropdownOpen,
  handleCreateSession,
  handleSelectSession,
  openDeleteConfirm,
  deleteSessionId,
  confirmDeleteSession,
  closeDeleteConfirm,
  openRenameSession,
  renameSessionId,
  renameDraft,
  setRenameDraft,
  handleRenameSession,
  closeRenameSession,
  handleExportConversations,
  handleImportConversations,
  isDonationModalOpen,
  setIsDonationModalOpen,
}: NativeAppContentProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const lastScrollY = useRef(0);
  const dragStartScrollY = useRef(0);
  const isDraggingScroll = useRef(false);
  const keyboardVisibleRef = useRef(false);
  const hideTriggeredThisDrag = useRef(false);

  const SCROLL_DOWN_THRESHOLD = 24;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => {
      keyboardVisibleRef.current = true;
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardVisibleRef.current = false;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleScrollBeginDrag = useCallback((event: NativeScrollEvent) => {
    isDraggingScroll.current = true;
    dragStartScrollY.current = event.nativeEvent.contentOffset.y;
    lastScrollY.current = dragStartScrollY.current;
    hideTriggeredThisDrag.current = false;
  }, []);

  const handleScrollEnd = useCallback(() => {
    isDraggingScroll.current = false;
  }, []);

  const handleMessagesScroll = useCallback((event: NativeScrollEvent) => {
    if (!isDraggingScroll.current) return;

    const currentY = event.nativeEvent.contentOffset.y;
    const scrolledDown = dragStartScrollY.current - currentY;
    lastScrollY.current = currentY;

    if (
      keyboardVisibleRef.current &&
      scrolledDown > SCROLL_DOWN_THRESHOLD &&
      !hideTriggeredThisDrag.current
    ) {
      hideTriggeredThisDrag.current = true;
      Keyboard.dismiss();
      inputRef.current?.blur();
    }
  }, []);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.flex}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable
              onPress={() => setSidebarOpen(true)}
              style={styles.headerButton}
            >
              <Text style={[styles.headerButtonText, { color: colors.text }]}>
                ☰
              </Text>
            </Pressable>
            <View style={styles.headerCenter}>
              <Text
                style={[styles.headerTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {showHomeScreen
                  ? "Daily Healing Word"
                  : (activeSession?.title ?? "Daily Healing Word")}
              </Text>
              <Text
                style={[
                  styles.headerStatus,
                  {
                    color: !isOnline
                      ? colors.muted
                      : cloudQuotaExceeded
                        ? "#fb923c"
                        : "#4ade80",
                  },
                ]}
              >
                {!isOnline
                  ? t("offlineActive", language)
                  : cloudQuotaExceeded
                    ? t("cloudQuotaActive", language)
                    : t("onlineActive", language)}
              </Text>
            </View>
            {!showHomeScreen ? (
              <Pressable onPress={goHome} style={styles.headerButton} hitSlop={8}>
                <Text style={[styles.headerButtonText, { color: colors.text }]}>
                  ⌂
                </Text>
              </Pressable>
            ) : (
              <View style={styles.headerButton} />
            )}
          </View>

          {showHomeScreen ? (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.homeContent}
              keyboardShouldPersistTaps="handled"
            >
              <Image source={brandLogo} style={styles.emptyLogo} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Daily Healing Word
              </Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {t("welcomeDesc", language)}
              </Text>

              <Text
                style={[styles.suggestionsHeading, { color: colors.accent }]}
              >
                {t("suggestedPassages", language)}
              </Text>

              {verseSuggestionsLoading ? (
                <View
                  style={[
                    styles.dailyVerseCard,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.chip,
                    },
                  ]}
                >
                  <ActivityIndicator color={colors.accent} size="small" />
                  <Text
                    style={[styles.dailyVerseLoadingText, { color: colors.muted }]}
                  >
                    {t("verseSuggestionsLoading", language)}
                  </Text>
                </View>
              ) : (
                <View style={styles.suggestionGrid}>
                  {verseSuggestions.map((suggestion) => (
                    <Pressable
                      key={suggestion.reference}
                      onPress={() => handleSend(suggestion.reference)}
                      style={[
                        styles.suggestionCard,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.chip,
                        },
                      ]}
                    >
                      {suggestion.text ? (
                        <Text
                          style={[styles.suggestionCardText, { color: colors.text }]}
                          numberOfLines={4}
                        >
                          {suggestion.text}
                        </Text>
                      ) : null}
                      <Text
                        style={[styles.dailyVerseRef, { color: colors.accent }]}
                      >
                        {suggestion.reference}
                      </Text>
                      <Text style={[styles.dailyVerseTap, { color: colors.muted }]}>
                        {t("dailyVerseTap", language)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Pressable
                onPress={() =>
                  void refreshVerseSuggestions(
                    verseSuggestions.map((suggestion) => suggestion.reference),
                  )
                }
                disabled={verseSuggestionsLoading}
                style={[
                  styles.suggestMoreButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.chip,
                    opacity: verseSuggestionsLoading ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={[styles.suggestMoreText, { color: colors.accent }]}>
                  {t("suggestMore", language)}
                </Text>
              </Pressable>
            </ScrollView>
          ) : (
          <FlatList
            ref={listRef}
            style={styles.flex}
            data={messages}
            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEnd}
            onMomentumScrollEnd={handleScrollEnd}
            onScroll={handleMessagesScroll}
            scrollEventThrottle={16}
            onScrollToIndexFailed={onScrollToIndexFailed}
            ListEmptyComponent={null}
            ListFooterComponent={
              isTranslating || isLoading ? (
                <View style={styles.typingWrap}>
                  <View style={styles.typingHeader}>
                    <View
                      style={[
                        styles.typingAvatar,
                        { backgroundColor: colors.accent },
                      ]}
                    />
                    <Text
                      style={[styles.typingLabel, { color: colors.accent }]}
                    >
                      Daily Healing Word
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.typingBubble,
                      {
                        backgroundColor: isDark ? "#111827" : "#ffffff",
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <ActivityIndicator color={colors.accent} size="small" />
                    <Text style={[styles.typingText, { color: colors.muted }]}>
                      {isTranslating
                        ? t("translating", language)
                        : t("consulting", language)}
                    </Text>
                  </View>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageBubble,
                  item.role === "user"
                    ? [
                        styles.userBubble,
                        { backgroundColor: isDark ? "#1f2937" : "#e2e8f0" },
                      ]
                    : [
                        styles.modelBubble,
                        {
                          backgroundColor: isDark ? "#111827" : "#ffffff",
                          borderColor: colors.border,
                        },
                      ],
                ]}
              >
                <Text style={[styles.messageMeta, { color: colors.muted }]}>
                  {item.role === "user" ? "You" : "Daily Healing Word"} ·{" "}
                  {formatTime(item.timestamp)}
                </Text>
                {item.role === "model" ? (
                  <>
                    <Markdown style={markdownStyles(isDark)}>
                      {item.text}
                    </Markdown>
                    {item.followUps && item.followUps.length > 0 && (
                      <View style={styles.followUpSection}>
                        <Text
                          style={[styles.followUpLabel, { color: colors.accent }]}
                        >
                          {t("continueStudy", language)}
                        </Text>
                        <View style={styles.followUpChips}>
                          {item.followUps.map((followUp, chipIndex) => {
                            const actionText =
                              followUp.type === "verse" && followUp.reference
                                ? followUp.reference
                                : followUp.text;
                            return (
                              <Pressable
                                key={`${followUp.type}-${chipIndex}`}
                                onPress={() => handleSend(actionText)}
                                style={[
                                  styles.followUpChip,
                                  {
                                    borderColor: colors.border,
                                    backgroundColor: isDark
                                      ? "#1f2937"
                                      : "#f8fafc",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.followUpChipText,
                                    { color: colors.text },
                                  ]}
                                >
                                  {followUp.text}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={[styles.messageText, { color: colors.text }]}>
                      {item.text}
                    </Text>
                    {detectBibleVerse(item.text) && (
                      <NativeBibleVerseReader
                        query={item.text}
                        onNavigate={(verse) => handleSend(verse)}
                        language={language}
                        bibleTranslation={bibleTranslation}
                        colors={colors}
                        isDark={isDark}
                      />
                    )}
                  </>
                )}
              </View>
            )}
          />
          )}

          <View
            style={[
              styles.composer,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.surface,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              onFocus={() => {
                setTimeout(() => onComposerFocus(), 50);
              }}
              placeholder={
                isOnline
                  ? t("placeholderOnline", language)
                  : t("placeholderOffline", language)
              }
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                { color: colors.text, backgroundColor: colors.input },
              ]}
              multiline
              maxLength={4000}
            />
            <Pressable
              onPress={() => handleSend()}
              disabled={isLoading || !input.trim()}
              style={[
                styles.sendButton,
                {
                  backgroundColor: colors.sendButtonBg,
                  opacity: isLoading || !input.trim() ? 0.5 : 1,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.sendButtonText} size="small" />
              ) : (
                <Text style={[styles.sendButtonText, { color: colors.sendButtonText }]}>
                  Send
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={sidebarOpen}
        transparent
        animationType="fade"
        onRequestClose={closeSidebar}
      >
        <View style={styles.sidebarOverlay}>
          <SafeAreaView
            style={[
              styles.sidebarPanel,
              {
                backgroundColor: isDark ? colors.surface : "#FFFFFF",
                borderRightColor: colors.border,
              },
            ]}
            edges={["top", "left", "bottom"]}
          >
            <View
              style={[
                styles.sidebarHeader,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.sidebarTitle, { color: colors.text }]}>
                Menu
              </Text>
              <Pressable onPress={closeSidebar} hitSlop={8}>
                <Text style={[styles.headerButtonText, { color: colors.text }]}>
                  ✕
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.sidebarSection,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text
                style={[styles.sidebarSectionLabel, { color: colors.muted }]}
              >
                {t("themeLabel", language)}
              </Text>
              <ThemeDropdown
                value={theme}
                onChange={changeTheme}
                language={language}
                menuOpen={sidebarOpen}
                onOpenChange={setThemeDropdownOpen}
                colors={colors}
              />
            </View>

            <View
              style={[
                styles.sidebarSection,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text
                style={[styles.sidebarSectionLabel, { color: colors.muted }]}
              >
                {t("bibleVersionLabel", language)}
              </Text>
              <BibleTranslationDropdown
                value={bibleTranslation}
                onChange={changeBibleTranslation}
                menuOpen={sidebarOpen}
                onOpenChange={setBibleTranslationDropdownOpen}
                colors={colors}
              />
            </View>

            <View
              style={[
                styles.sidebarSection,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text
                style={[styles.sidebarSectionLabel, { color: colors.muted }]}
              >
                Language
              </Text>
              <LanguageDropdown
                currentLang={language}
                onChange={handleLanguageChange}
                disabled={isTranslating}
                menuOpen={sidebarOpen}
                onOpenChange={setLangDropdownOpen}
                colors={colors}
              />
            </View>

            <Pressable
              onPress={handleCreateSession}
              style={styles.newChatButton}
            >
              <Text style={styles.newChatButtonText}>
                + {t("newChat", language)}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setIsDonationModalOpen(true);
                closeSidebar();
              }}
              style={styles.donationButton}
            >
              <Text style={styles.donationButtonText}>
                ♥ {t("giving", language)}
              </Text>
            </Pressable>

            <Text
              style={[
                styles.sidebarSectionLabel,
                styles.conversationsLabel,
                { color: colors.muted },
              ]}
            >
              Past conversations
            </Text>

            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              style={styles.sessionList}
              scrollEnabled={!langDropdownOpen && !themeDropdownOpen}
              contentContainerStyle={
                sessions.length === 0 ? styles.sessionListEmpty : undefined
              }
              ListEmptyComponent={
                <Text style={[styles.emptySidebar, { color: colors.muted }]}>
                  {t("noChats", language)}
                </Text>
              }
              ListFooterComponent={
                <View style={styles.backupRow}>
                  <Pressable
                    onPress={handleExportConversations}
                    style={styles.backupButton}
                  >
                    <Text style={styles.backupButtonText}>
                      ↓ {t("exportConversations", language)}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleImportConversations}
                    style={styles.backupButton}
                  >
                    <Text style={styles.backupButtonText}>
                      ↑ {t("importConversations", language)}
                    </Text>
                  </Pressable>
                </View>
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.sessionRow,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor:
                        item.id === activeSessionId
                          ? colors.chip
                          : "transparent",
                    },
                  ]}
                >
                  <Pressable
                    style={styles.sessionPressable}
                    onPress={() => handleSelectSession(item.id)}
                  >
                    <Text
                      style={[styles.sessionTitle, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.sessionMeta, { color: colors.muted }]}>
                      {item.messages.length} messages
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openRenameSession(item.id)}
                    hitSlop={8}
                    accessibilityLabel={t("renameChat", language)}
                  >
                    <Text
                      style={[
                        styles.renameSessionText,
                        { color: colors.muted },
                      ]}
                    >
                      ✎
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openDeleteConfirm(item.id)}
                    hitSlop={8}
                    accessibilityLabel={t("deleteChat", language)}
                  >
                    <Text style={styles.deleteSessionText}>🗑</Text>
                  </Pressable>
                </View>
              )}
            />
          </SafeAreaView>
          <Pressable
            style={styles.sidebarBackdrop}
            onPress={closeSidebar}
            accessibilityLabel="Close sidebar"
          />
        </View>
      </Modal>

      <Modal
        visible={Boolean(deleteSessionId)}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteConfirm}
      >
        <Pressable style={styles.renameOverlay} onPress={closeDeleteConfirm}>
          <View
            style={[
              styles.renameCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.renameTitle, { color: colors.text }]}>
              {t("deleteChat", language)}
            </Text>
            <Text style={[styles.deleteConfirmTitle, { color: colors.text }]}>
              {
                sessions.find((session) => session.id === deleteSessionId)
                  ?.title
              }
            </Text>
            <Text style={[styles.deleteConfirmText, { color: colors.muted }]}>
              {t("deleteChatConfirm", language)}
            </Text>
            <View style={styles.renameActions}>
              <Pressable
                onPress={closeDeleteConfirm}
                style={[
                  styles.renameCancelButton,
                  { borderColor: colors.border },
                ]}
              >
                <Text style={[styles.renameCancelText, { color: colors.text }]}>
                  {t("cancel", language)}
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmDeleteSession}
                style={styles.deleteConfirmButton}
              >
                <Text style={styles.deleteConfirmButtonText}>
                  {t("delete", language)}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(renameSessionId)}
        transparent
        animationType="fade"
        onRequestClose={closeRenameSession}
      >
        <Pressable style={styles.renameOverlay} onPress={closeRenameSession}>
          <View
            style={[
              styles.renameCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.renameTitle, { color: colors.text }]}>
              {t("renameChat", language)}
            </Text>
            <TextInput
              value={renameDraft}
              onChangeText={setRenameDraft}
              placeholder={t("renamePlaceholder", language)}
              placeholderTextColor={colors.muted}
              style={[
                styles.renameInput,
                {
                  color: colors.text,
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                },
              ]}
              autoFocus
              maxLength={120}
              onSubmitEditing={handleRenameSession}
              returnKeyType="done"
            />
            <View style={styles.renameActions}>
              <Pressable
                onPress={closeRenameSession}
                style={[
                  styles.renameCancelButton,
                  { borderColor: colors.border },
                ]}
              >
                <Text style={[styles.renameCancelText, { color: colors.text }]}>
                  {t("cancel", language)}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleRenameSession}
                disabled={!renameDraft.trim()}
                style={[
                  styles.renameSaveButton,
                  { opacity: renameDraft.trim() ? 1 : 0.5 },
                ]}
              >
                <Text style={styles.renameSaveText}>{t("save", language)}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <DonationModal
        visible={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        language={language}
        colors={colors}
      />
    </SafeAreaView>
  );
}

function markdownStyles(isDark: boolean) {
  return {
    body: {
      color: isDark ? "#E5E7EB" : "#111827",
      fontSize: 15,
      lineHeight: 22,
    },
    heading1: { color: isDark ? "#F9FAFB" : "#111827" },
    heading2: { color: isDark ? "#F9FAFB" : "#111827" },
    blockquote: {
      backgroundColor: isDark
        ? "rgba(212,175,55,0.08)"
        : "rgba(212,175,55,0.12)",
      borderLeftColor: "#D4AF37",
      borderLeftWidth: 3,
      paddingLeft: 10,
    },
  };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  splashLogo: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  splashTitle: { fontSize: 28, fontWeight: "700" },
  splashSubtitle: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonText: { fontSize: 20 },
  headerCenter: { flex: 1, paddingHorizontal: 8 },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  headerStatus: { fontSize: 11, marginTop: 2 },
  messagesContent: { padding: 16, paddingBottom: 24, flexGrow: 1 },
  emptyState: { alignItems: "center", paddingTop: 24, paddingHorizontal: 12 },
  emptyLogo: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  emptyText: { textAlign: "center", lineHeight: 22, marginBottom: 20 },
  suggestionWrap: { width: "100%" },
  homeContent: {
    padding: 16,
    paddingBottom: 24,
    alignItems: "center",
  },
  suggestionsHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
    alignSelf: "stretch",
    textAlign: "center",
  },
  suggestionGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  suggestionCard: {
    width: "48%",
    minWidth: 140,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  suggestionCardText: {
    fontSize: 13,
    lineHeight: 20,
  },
  suggestMoreButton: {
    width: "100%",
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  suggestMoreText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dailyVerseCard: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  dailyVerseLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  dailyVerseText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  dailyVerseFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dailyVerseRef: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  dailyVerseTap: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  dailyVerseLoadingText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    maxWidth: "100%",
  },
  userBubble: { alignSelf: "flex-end", maxWidth: "88%" },
  modelBubble: {
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "96%",
  },
  messageMeta: { fontSize: 11, marginBottom: 6 },
  messageText: { fontSize: 15, lineHeight: 22 },
  followUpSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148, 163, 184, 0.35)",
  },
  followUpLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  followUpChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  followUpChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: "100%",
  },
  followUpChipText: { fontSize: 13, lineHeight: 18 },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  loadingText: { fontSize: 13 },
  typingWrap: { paddingTop: 8, paddingBottom: 4 },
  typingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  typingAvatar: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.9,
  },
  typingLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    maxWidth: "88%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  typingText: { fontSize: 14, flexShrink: 1 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 2,
  },
  sendButtonText: { fontWeight: "700" },
  sidebarOverlay: {
    flex: 1,
    flexDirection: "row",
  },
  sidebarBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sidebarPanel: {
    width: 300,
    maxWidth: "86%",
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sidebarTitle: { fontSize: 18, fontWeight: "700" },
  sidebarSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sidebarSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  themeToggle: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  themeToggleText: { fontSize: 15, fontWeight: "600" },
  conversationsLabel: {
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 4,
  },
  newChatButton: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#D4AF37",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  newChatButtonText: { color: "#0B0C10", fontWeight: "700" },
  donationButton: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    borderColor: "rgba(212, 175, 55, 0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  donationButtonText: { color: "#D4AF37", fontWeight: "700" },
  backupRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backupButton: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212, 175, 55, 0.35)",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    backgroundColor: "rgba(212, 175, 55, 0.08)",
  },
  backupButtonText: {
    color: "#D4AF37",
    fontWeight: "600",
    fontSize: 11,
    textAlign: "center",
  },
  sessionList: { flex: 1 },
  sessionListEmpty: { flexGrow: 1 },
  emptySidebar: { padding: 16, textAlign: "center" },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  sessionPressable: { flex: 1 },
  sessionTitle: { fontSize: 15, fontWeight: "600" },
  sessionMeta: { fontSize: 12, marginTop: 2 },
  renameSessionText: { fontSize: 18 },
  deleteSessionText: { color: "#f87171", fontSize: 18 },
  renameOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 24,
  },
  renameCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  renameTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  renameInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  renameActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  renameCancelButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  renameCancelText: { fontSize: 13, fontWeight: "600" },
  renameSaveButton: {
    backgroundColor: "#D4AF37",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  renameSaveText: { color: "#0B0C10", fontSize: 13, fontWeight: "700" },
  deleteConfirmTitle: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  deleteConfirmText: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  deleteConfirmButton: {
    backgroundColor: "#ef4444",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  deleteConfirmButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
