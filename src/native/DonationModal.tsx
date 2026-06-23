import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getNativeApiUrl,
  getNativePaymentSetupHint,
} from "./apiBase";
import {
  BAKED_BANK_ACCOUNT_NAME,
  BAKED_BANK_ACCOUNT_NUMBER,
  BAKED_BANK_NAME,
  BAKED_GCASH_NAME,
  BAKED_GCASH_NUMBER,
  isNativeSandboxMode,
  ENABLE_XENDIT_CHECKOUT,
} from "../config/apiKey";
import { getDefaultDonationPurpose } from "../data/givingTypes";
import type { LangType } from "../types";
import { t } from "./translations";

const PRESET_AMOUNTS = ["100", "250", "500", "1000", "2500", "5000"];

interface DonationModalProps {
  visible: boolean;
  onClose: () => void;
  language: LangType;
  colors: {
    background: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    chip: string;
    input: string;
  };
}

export function DonationModal({ visible, onClose, language, colors }: DonationModalProps) {
  const [amount, setAmount] = useState("500");
  const [contributorName, setContributorName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const resetForm = () => {
    setAmount("500");
    setContributorName("");
    setEmail("");
    setMobile("");
    setCheckoutUrl(null);
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    setCheckoutUrl(null);

    const numericAmount = parseFloat(amount);
    if (Number.isNaN(numericAmount) || numericAmount < 20) {
      setErrorMsg(t("donationMinAmount", language));
      return;
    }

    setSubmitting(true);
    try {
      const sandbox = isNativeSandboxMode();
      const response = await fetch(getNativeApiUrl("/api/xendit/create-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          purpose: getDefaultDonationPurpose(language),
          name: contributorName.trim() || undefined,
          email: email.trim() || undefined,
          phone: mobile.trim() || undefined,
          isSandbox: sandbox,
          isDebug: sandbox,
        }),
      });

      const text = await response.text();
      let data: { checkoutUrl?: string; message?: string } = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(t("donationGatewayError", language));
      }

      if (!response.ok) {
        throw new Error(data.message || t("donationGatewayError", language));
      }

      if (!data.checkoutUrl) {
        throw new Error(t("donationNoCheckoutUrl", language));
      }

      setCheckoutUrl(data.checkoutUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("donationGatewayError", language);
      const isNetworkError =
        message.includes("Network request failed") ||
        message.includes("Failed to connect") ||
        message.includes("NetworkError");
      setErrorMsg(isNetworkError ? getNativePaymentSetupHint() : message);
    } finally {
      setSubmitting(false);
    }
  };

  const openCheckout = async () => {
    if (!checkoutUrl) return;
    await Linking.openURL(checkoutUrl);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top", "left", "right", "bottom"]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t("givingSanctuary", language)}</Text>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Text style={[styles.closeButton, { color: colors.text }]}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.subtitle, { color: colors.muted }]}>{t("donationSubtitle", language)}</Text>

          {ENABLE_XENDIT_CHECKOUT && checkoutUrl ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t("donationReadyTitle", language)}</Text>
              <Text style={[styles.cardText, { color: colors.muted }]}>
                {t("donationReadyDesc", language)}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.muted }]}>
                ₱ {parseFloat(amount).toLocaleString()} PHP
              </Text>
              <Pressable style={styles.primaryButton} onPress={openCheckout}>
                <Text style={styles.primaryButtonText}>{t("donationOpenCheckout", language)}</Text>
              </Pressable>
            </View>
          ) : ENABLE_XENDIT_CHECKOUT ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t("donationAmountLabel", language)}</Text>
              <View style={styles.presetGrid}>
                {PRESET_AMOUNTS.map((preset) => (
                  <Pressable
                    key={preset}
                    onPress={() => setAmount(preset)}
                    style={[
                      styles.presetChip,
                      {
                        borderColor: amount === preset ? "#D4AF37" : colors.border,
                        backgroundColor: amount === preset ? "rgba(212,175,55,0.15)" : colors.chip,
                      },
                    ]}
                  >
                    <Text style={{ color: amount === preset ? "#D4AF37" : colors.text, fontWeight: "600" }}>
                      ₱ {parseInt(preset, 10).toLocaleString()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="500"
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
              />

              <TextInput
                value={contributorName}
                onChangeText={setContributorName}
                placeholder={t("donationNamePlaceholder", language)}
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder={t("donationEmailPlaceholder", language)}
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
              />
              <TextInput
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
                placeholder={t("donationPhonePlaceholder", language)}
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
              />

              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

              <Pressable
                style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#0B0C10" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t("donationSubmit", language)}</Text>
                )}
              </Pressable>
            </>
          ) : null}

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t("donationManualTitle", language)}</Text>
            <Text style={[styles.cardText, { color: colors.muted }]}>
              {BAKED_BANK_NAME}
              {"\n"}
              {BAKED_BANK_ACCOUNT_NAME}
              {"\n"}
              {BAKED_BANK_ACCOUNT_NUMBER}
            </Text>
            <Text style={[styles.cardText, { color: colors.muted, marginTop: 12 }]}>
              GCash: {BAKED_GCASH_NAME}
              {"\n"}
              {BAKED_GCASH_NUMBER}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18, fontWeight: "700" },
  closeButton: { fontSize: 22 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#D4AF37",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: "#0B0C10", fontWeight: "700", fontSize: 15 },
  errorText: { color: "#f87171", fontSize: 13 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  cardText: { fontSize: 13, lineHeight: 20 },
  cardMeta: { fontSize: 12, marginTop: 8, marginBottom: 12 },
});
