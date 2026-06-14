import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { LANG_OPTIONS } from "../languages";
import type { LangType } from "../types";

interface LanguageDropdownProps {
  currentLang: LangType;
  onChange: (lang: LangType) => void;
  disabled?: boolean;
  menuOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  colors: {
    text: string;
    muted: string;
    border: string;
    chip: string;
    surface: string;
  };
}

export function LanguageDropdown({
  currentLang,
  onChange,
  disabled = false,
  menuOpen = true,
  onOpenChange,
  colors,
}: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const setOpen = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  useEffect(() => {
    if (!menuOpen) {
      setOpen(false);
    }
  }, [menuOpen]);

  const selected = LANG_OPTIONS.find((option) => option.code === currentLang) ?? LANG_OPTIONS[0];

  const handleSelect = (code: LangType) => {
    setOpen(false);
    if (code !== currentLang) {
      onChange(code);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setOpen(!isOpen)}
        disabled={disabled}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.chip,
            borderColor: colors.border,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <Text style={[styles.triggerText, { color: colors.text }]} numberOfLines={1}>
          {selected.native ?? selected.label}
          <Text style={[styles.triggerSubtext, { color: colors.muted }]}> ({selected.label})</Text>
        </Text>
        <Text style={[styles.chevron, { color: colors.muted }]}>{isOpen ? "▴" : "▾"}</Text>
      </Pressable>

      {isOpen && (
        <View
          style={[
            styles.menu,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <FlatList
            data={LANG_OPTIONS}
            keyExtractor={(item) => item.code}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            style={styles.menuList}
            renderItem={({ item }) => {
              const isSelected = item.code === currentLang;
              return (
                <Pressable
                  onPress={() => handleSelect(item.code)}
                  style={[
                    styles.option,
                    isSelected && { backgroundColor: "rgba(212, 175, 55, 0.15)" },
                  ]}
                >
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.optionNative,
                        { color: isSelected ? "#D4AF37" : colors.text },
                      ]}
                    >
                      {item.native ?? item.label}
                    </Text>
                    <Text style={[styles.optionLabel, { color: colors.muted }]}>
                      {item.label}
                    </Text>
                  </View>
                  {isSelected && <Text style={styles.checkmark}>●</Text>}
                </Pressable>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  triggerSubtext: {
    fontSize: 12,
    fontWeight: "400",
  },
  chevron: {
    fontSize: 12,
    marginLeft: 8,
  },
  menu: {
    marginTop: 6,
    height: 240,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  menuList: {
    flex: 1,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionText: {
    flex: 1,
  },
  optionNative: {
    fontSize: 14,
    fontWeight: "600",
  },
  optionLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  checkmark: {
    color: "#D4AF37",
    fontSize: 10,
    marginLeft: 8,
  },
});
