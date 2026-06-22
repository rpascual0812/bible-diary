import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BIBLE_TRANSLATION_OPTIONS,
  getBibleTranslationOption,
  type BibleTranslationId,
} from "../lib/bibleTranslations";

interface BibleTranslationDropdownProps {
  value: BibleTranslationId;
  onChange: (translation: BibleTranslationId) => void;
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

export function BibleTranslationDropdown({
  value,
  onChange,
  disabled = false,
  menuOpen = true,
  onOpenChange,
  colors,
}: BibleTranslationDropdownProps) {
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

  const selected = getBibleTranslationOption(value);

  const handleSelect = (id: BibleTranslationId) => {
    setOpen(false);
    if (id !== value) {
      onChange(id);
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
          {selected.abbreviation}
          <Text style={[styles.triggerSubtext, { color: colors.muted }]}>
            {" "}
            ({selected.label})
          </Text>
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
            data={BIBLE_TRANSLATION_OPTIONS}
            keyExtractor={(item) => item.id}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            style={styles.menuList}
            renderItem={({ item }) => {
              const isSelected = item.id === value;
              return (
                <Pressable
                  onPress={() => handleSelect(item.id)}
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
                      numberOfLines={1}
                    >
                      {item.abbreviation} · {item.label}
                    </Text>
                    <Text style={[styles.optionLabel, { color: colors.muted }]}>
                      {item.language}
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
