import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import {
  getThemeLabelKey,
  THEME_EMOJI,
  THEME_IDS,
  type ThemeId,
} from "../theme";
import type { LangType } from "../types";
import { t } from "./translations";

interface ThemeDropdownProps {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
  language: LangType;
  disabled?: boolean;
  menuOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  colors: {
    text: string;
    muted: string;
    border: string;
    chip: string;
    surface: string;
    accent: string;
  };
}

export function ThemeDropdown({
  value,
  onChange,
  language,
  disabled = false,
  menuOpen = true,
  onOpenChange,
  colors,
}: ThemeDropdownProps) {
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

  const selectedLabel = t(getThemeLabelKey(value), language);

  const handleSelect = (themeId: ThemeId) => {
    setOpen(false);
    if (themeId !== value) {
      onChange(themeId);
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
          {THEME_EMOJI[value]} {selectedLabel}
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
            data={THEME_IDS}
            keyExtractor={(item) => item}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            style={styles.menuList}
            renderItem={({ item }) => {
              const isSelected = item === value;
              const label = t(getThemeLabelKey(item), language);
              return (
                <Pressable
                  onPress={() => handleSelect(item)}
                  style={[
                    styles.option,
                    isSelected && { backgroundColor: `${colors.accent}26` },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionNative,
                      { color: isSelected ? colors.accent : colors.text },
                    ]}
                  >
                    {THEME_EMOJI[item]} {label}
                  </Text>
                  {isSelected && (
                    <Text style={[styles.checkmark, { color: colors.accent }]}>●</Text>
                  )}
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
  chevron: {
    fontSize: 12,
    marginLeft: 8,
  },
  menu: {
    marginTop: 6,
    maxHeight: 280,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  menuList: {
    flexGrow: 0,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionNative: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 10,
    marginLeft: 8,
  },
});
