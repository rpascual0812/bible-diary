import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
} from "react-native";
import * as Network from "expo-network";
import Markdown from "react-native-markdown-display";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { GeminiService, Message } from "../src/services/geminiService";
import {
  translateMessages,
  translateText,
} from "../src/services/translationService";
import { getOfflineAnswer } from "../src/data/offlineBibleData";
import { BAKED_GEMINI_API_KEY } from "../src/config/apiKey";
import { formatTime } from "../src/lib/utils";
import type { ChatSession, LangType } from "../src/types";
import { getItem, removeItem, setItem } from "../src/native/storage";
import { TOPICS, t } from "../src/native/translations";
import { LanguageDropdown } from "../src/native/LanguageDropdown";
import { DonationModal } from "../src/native/DonationModal";
import { NativeBibleVerseReader } from "../src/native/BibleVerseReader";
import { detectBibleVerse } from "../src/lib/bibleVerse";
import { mergeImportedSessions } from "../src/lib/conversationBackup";
import {
  exportConversationsNative,
  importConversationsNative,
} from "../src/native/conversationBackup.native";

const brandLogo = require("../src/assets/images/brand-logo.png");

const STORAGE_KEYS = {
  sessions: "biblesphere_sessions",
  activeId: "biblesphere_active_id",
  language: "biblesphere_lang",
  theme: "biblesphere_theme",
};

function createSession(title?: string): ChatSession {
  return {
    id: `session_${Date.now()}`,
    title: title ?? "New Study",
    messages: [],
    created_at: Date.now(),
  };
}

export default function NativeApp() {
  const [language, setLanguage] = useState<LangType>("en");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const geminiRef = useRef<GeminiService | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const isDark = theme === "dark";
  const colors = isDark ? darkColors : lightColors;

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );
  const messages = activeSession?.messages ?? [];
  const suggestions = TOPICS[language];

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

    async function refreshNetworkState() {
      try {
        const state = await Network.getNetworkStateAsync();
        if (!active) return;
        setIsOnline(
          Boolean(state.isConnected && state.isInternetReachable !== false),
        );
      } catch {
        if (active) setIsOnline(false);
      }
    }

    refreshNetworkState();
    const interval = setInterval(refreshNetworkState, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      const [savedLang, savedTheme, savedSessions, savedActiveId] =
        await Promise.all([
          getItem(STORAGE_KEYS.language),
          getItem(STORAGE_KEYS.theme),
          getItem(STORAGE_KEYS.sessions),
          getItem(STORAGE_KEYS.activeId),
        ]);

      if (!active) return;

      if (savedLang) setLanguage(savedLang as LangType);
      if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);

      if (savedSessions) {
        try {
          const parsed = JSON.parse(savedSessions) as ChatSession[];
          setSessions(parsed);
          if (
            savedActiveId &&
            parsed.some((session) => session.id === savedActiveId)
          ) {
            setActiveSessionId(savedActiveId);
          } else if (parsed.length > 0) {
            setActiveSessionId(parsed[0].id);
          }
        } catch {
          setSessions([]);
        }
      }

      setHydrated(true);
    }

    hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const apiKey = BAKED_GEMINI_API_KEY?.trim();
    if (apiKey) {
      geminiRef.current = new GeminiService(apiKey, language);
    } else {
      geminiRef.current = null;
    }
  }, [language, hydrated]);

  useEffect(() => {
    if (messages.length === 0) return;
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages, isLoading]);

  useEffect(() => {
    const event =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const subscription = Keyboard.addListener(event, () => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return () => subscription.remove();
  }, []);

  const handleLanguageChange = async (lang: LangType) => {
    if (lang === language) return;

    setLanguage(lang);
    await setItem(STORAGE_KEYS.language, lang);
    geminiRef.current?.setLanguage(lang);

    if (!activeSession?.messages.length) return;

    const apiKey = BAKED_GEMINI_API_KEY?.trim();
    if (!apiKey || !isOnline) return;

    setIsTranslating(true);
    try {
      const translatedMessages = await translateMessages(
        apiKey,
        activeSession.messages,
        lang,
      );
      const translatedTitle = await translateText(
        apiKey,
        activeSession.title,
        lang,
      );
      const updated = sessions.map((session) =>
        session.id === activeSessionId
          ? { ...session, title: translatedTitle, messages: translatedMessages }
          : session,
      );
      await saveSessions(updated, activeSessionId ?? undefined);
    } catch (error) {
      console.error("Translation failed:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleTheme = async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    await setItem(STORAGE_KEYS.theme, next);
  };

  const handleSelectSession = async (id: string) => {
    setActiveSessionId(id);
    await setItem(STORAGE_KEYS.activeId, id);
    setSidebarOpen(false);
  };

  const closeSidebar = () => setSidebarOpen(false);

  const handleCreateSession = async () => {
    const session = createSession(t("newChat", language));
    const updated = [session, ...sessions];
    await saveSessions(updated, session.id);
    setActiveSessionId(session.id);
    setSidebarOpen(false);
  };

  const handleDeleteSession = async (id: string) => {
    const updated = sessions.filter((session) => session.id !== id);
    const nextActive =
      activeSessionId === id ? (updated[0]?.id ?? null) : activeSessionId;
    setActiveSessionId(nextActive);
    if (!nextActive) {
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
    const result = await exportConversationsNative(sessions, activeSessionId);
    if (result.cancelled) return;
    if (result.error === "empty") {
      Alert.alert(
        t("exportConversations", language),
        t("exportEmpty", language),
      );
      return;
    }
    if (result.error) {
      Alert.alert(
        t("exportConversations", language),
        t("exportError", language),
      );
    }
  };

  const handleImportConversations = async () => {
    setSidebarOpen(false);
    try {
      const result = await importConversationsNative();
      if ("cancelled" in result) return;

      const {
        sessions: merged,
        activeSessionId: nextActive,
        importedCount,
      } = mergeImportedSessions(sessions, result.backup.sessions);
      setActiveSessionId(nextActive);
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
    } catch {
      Alert.alert(
        t("importConversations", language),
        t("importError", language),
      );
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText ?? input).trim();
    if (!textToSend || isLoading) return;

    let sessionId = activeSessionId;
    let sessionList = [...sessions];
    let currentSession = sessionList.find(
      (session) => session.id === sessionId,
    );

    if (!currentSession) {
      currentSession = createSession(
        textToSend.substring(0, 32) + (textToSend.length > 32 ? "..." : ""),
      );
      sessionList = [currentSession, ...sessionList];
      sessionId = currentSession.id;
      setActiveSessionId(sessionId);
    } else if (currentSession.messages.length === 0) {
      currentSession = {
        ...currentSession,
        title:
          textToSend.substring(0, 32) + (textToSend.length > 32 ? "..." : ""),
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

    const withUser = sessionList.map((session) =>
      session.id === sessionId
        ? { ...session, messages: [...session.messages, userMsg] }
        : session,
    );

    await saveSessions(withUser, sessionId);
    setInput("");
    setIsLoading(true);

    try {
      let aiText = "";
      if (isOnline && geminiRef.current) {
        aiText = await geminiRef.current.sendMessage(textToSend);
      } else {
        aiText = getOfflineAnswer(textToSend, language);
      }

      const aiMsg: Message = {
        role: "model",
        text: aiText,
        timestamp: Date.now(),
      };

      const withAi = withUser.map((session) =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, aiMsg] }
          : session,
      );
      await saveSessions(withAi, sessionId);
    } catch {
      const fallback: Message = {
        role: "model",
        text: getOfflineAnswer(textToSend, language),
        timestamp: Date.now(),
      };
      const withFallback = withUser.map((session) =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, fallback] }
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
            Bible Diary
          </Text>
          <Text style={[styles.splashSubtitle, { color: colors.muted }]}>
            Bible Companion & Study Guide
          </Text>
          <ActivityIndicator color="#D4AF37" style={{ marginTop: 24 }} />
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
          <ActivityIndicator color="#D4AF37" size="large" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NativeAppContent
        colors={colors}
        isDark={isDark}
        language={language}
        isOnline={isOnline}
        activeSession={activeSession}
        messages={messages}
        suggestions={suggestions}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        isTranslating={isTranslating}
        sidebarOpen={sidebarOpen}
        langDropdownOpen={langDropdownOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        listRef={listRef}
        handleSend={handleSend}
        handleLanguageChange={handleLanguageChange}
        toggleTheme={toggleTheme}
        setSidebarOpen={setSidebarOpen}
        closeSidebar={closeSidebar}
        setLangDropdownOpen={setLangDropdownOpen}
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
  colors: typeof darkColors;
  isDark: boolean;
  language: LangType;
  isOnline: boolean;
  activeSession: ChatSession | null;
  messages: Message[];
  suggestions: string[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isTranslating: boolean;
  sidebarOpen: boolean;
  langDropdownOpen: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  listRef: React.RefObject<FlatList<Message> | null>;
  handleSend: (customText?: string) => Promise<void>;
  handleLanguageChange: (lang: LangType) => Promise<void>;
  toggleTheme: () => Promise<void>;
  setSidebarOpen: (open: boolean) => void;
  closeSidebar: () => void;
  setLangDropdownOpen: (open: boolean) => void;
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
  colors,
  isDark,
  language,
  isOnline,
  activeSession,
  messages,
  suggestions,
  input,
  setInput,
  isLoading,
  isTranslating,
  sidebarOpen,
  langDropdownOpen,
  sessions,
  activeSessionId,
  listRef,
  handleSend,
  handleLanguageChange,
  toggleTheme,
  setSidebarOpen,
  closeSidebar,
  setLangDropdownOpen,
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
                {activeSession?.title ?? "Bible Diary"}
              </Text>
              <Text
                style={[
                  styles.headerStatus,
                  { color: isOnline ? "#4ade80" : colors.muted },
                ]}
              >
                {isOnline
                  ? t("onlineActive", language)
                  : t("offlineActive", language)}
              </Text>
            </View>
            <View style={styles.headerButton} />
          </View>

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
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Image source={brandLogo} style={styles.emptyLogo} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Bible Diary
                </Text>
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  {t("welcomeDesc", language)}
                </Text>
                <View style={styles.suggestionWrap}>
                  {suggestions.map((topic) => (
                    <Pressable
                      key={topic}
                      onPress={() => handleSend(topic)}
                      style={[
                        styles.suggestionChip,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.chip,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.suggestionText, { color: colors.text }]}
                      >
                        {topic}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            }
            ListFooterComponent={
              isTranslating || isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#D4AF37" size="small" />
                  <Text style={[styles.loadingText, { color: colors.muted }]}>
                    {isTranslating
                      ? t("translating", language)
                      : t("consulting", language)}
                  </Text>
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
                  {item.role === "user" ? "You" : "Bible Diary"} ·{" "}
                  {formatTime(item.timestamp)}
                </Text>
                {item.role === "model" ? (
                  <Markdown style={markdownStyles(isDark)}>
                    {item.text}
                  </Markdown>
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
                        colors={colors}
                        isDark={isDark}
                      />
                    )}
                  </>
                )}
              </View>
            )}
          />

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
                setTimeout(
                  () => listRef.current?.scrollToEnd({ animated: true }),
                  50,
                );
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
                { opacity: isLoading || !input.trim() ? 0.5 : 1 },
              ]}
            >
              <Text style={styles.sendButtonText}>Send</Text>
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
                backgroundColor: colors.surface,
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
                Theme
              </Text>
              <Pressable
                onPress={toggleTheme}
                style={[
                  styles.themeToggle,
                  { backgroundColor: colors.chip, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.themeToggleText, { color: colors.text }]}>
                  {isDark ? "☀ Light mode" : "☾ Dark mode"}
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
              scrollEnabled={!langDropdownOpen}
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

const darkColors = {
  background: "#0B0C10",
  surface: "#111827",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  border: "rgba(255,255,255,0.08)",
  chip: "rgba(255,255,255,0.06)",
  input: "#1f2937",
};

const lightColors = {
  background: "#F4F5F7",
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "rgba(0,0,0,0.08)",
  chip: "#E5E7EB",
  input: "#F3F4F6",
};

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
  suggestionWrap: { width: "100%", gap: 10 },
  suggestionChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionText: { fontSize: 14, lineHeight: 20 },
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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  loadingText: { fontSize: 13 },
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
    backgroundColor: "#D4AF37",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 2,
  },
  sendButtonText: { color: "#0B0C10", fontWeight: "700" },
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
