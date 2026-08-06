import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FinnaSearchResult } from '../api/finna';
import { useUserTags } from '../hooks/useUserTags';
import { normalizeTagName } from '../firebase/tags';
import BottomSheet from './BottomSheet';
import { colors, touchTargetMin, typography } from '../theme';

interface TagEditorSheetProps {
    visible: boolean;
    onClose: () => void;
    book: FinnaSearchResult | null;
}

/**
 * Bottom sheet for editing a single book's personal tags.
 * New tag names are kept pending locally and only persisted on save.
 * Input + save stay pinned below the scroll area so they ride up with
 * BottomSheet when the keyboard opens.
 */
export const TagEditorSheet: React.FC<TagEditorSheetProps> = ({ visible, onClose, book }) => {
    const insets = useSafeAreaInsets();
    const { tags, getTagsForBook, ensureTag, setBookTags } = useUserTags();

    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [pendingNewNames, setPendingNewNames] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [saving, setSaving] = useState(false);

    // Reset local state from the current assignment whenever the sheet opens
    useEffect(() => {
        if (visible && book) {
            setSelectedTagIds(getTagsForBook(book.id).map(t => t.id));
            setPendingNewNames([]);
            setInputValue('');
            setSaving(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, book?.id]);

    if (!book) return null;

    const toggleExistingTag = (tagId: string) => {
        setSelectedTagIds(prev =>
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
    };

    const removePendingName = (name: string) => {
        setPendingNewNames(prev => prev.filter(n => n !== name));
    };

    const handleAddFromInput = () => {
        const normalized = normalizeTagName(inputValue);
        if (!normalized) return;

        // Case-insensitive: reuse an existing tag instead of creating a duplicate
        const existing = tags.find(t => t.normalizedName === normalized);
        if (existing) {
            if (!selectedTagIds.includes(existing.id)) {
                setSelectedTagIds(prev => [...prev, existing.id]);
            }
        } else if (!pendingNewNames.some(n => normalizeTagName(n) === normalized)) {
            setPendingNewNames(prev => [...prev, inputValue.trim()]);
        }
        setInputValue('');
    };

    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        try {
            const newIds: string[] = [];
            for (const name of pendingNewNames) {
                const tag = await ensureTag(name);
                if (tag && !selectedTagIds.includes(tag.id) && !newIds.includes(tag.id)) {
                    newIds.push(tag.id);
                }
            }
            setBookTags(book.id, [...selectedTagIds, ...newIds]);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const suggestions = tags.filter(t => !selectedTagIds.includes(t.id));
    const selectedTags = tags.filter(t => selectedTagIds.includes(t.id));
    const hasSelection = selectedTags.length > 0 || pendingNewNames.length > 0;

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            accessibilityLabel={`Kirjan ${book.title} tunnisteet`}
        >
            <View style={styles.header}>
                <View style={styles.headerText}>
                    <Text style={styles.title}>Tunnisteet</Text>
                    <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
                </View>
                <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeButton}
                    accessibilityLabel="Sulje"
                    accessibilityRole="button"
                >
                    <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Current tags on this book */}
                <Text style={styles.sectionTitle}>Kirjan tunnisteet</Text>
                {hasSelection ? (
                    <View style={styles.chipsWrap}>
                        {selectedTags.map(tag => (
                            <TouchableOpacity
                                key={tag.id}
                                style={styles.selectedChip}
                                onPress={() => toggleExistingTag(tag.id)}
                                accessibilityLabel={`Poista tunniste ${tag.name}`}
                                accessibilityRole="button"
                            >
                                <Text style={styles.selectedChipText}>{tag.name}</Text>
                                <MaterialCommunityIcons name="close-circle" size={16} color={colors.white} />
                            </TouchableOpacity>
                        ))}
                        {pendingNewNames.map(name => (
                            <TouchableOpacity
                                key={name}
                                style={[styles.selectedChip, styles.pendingChip]}
                                onPress={() => removePendingName(name)}
                                accessibilityLabel={`Poista uusi tunniste ${name}`}
                                accessibilityRole="button"
                            >
                                <Text style={styles.selectedChipText}>{name}</Text>
                                <MaterialCommunityIcons name="close-circle" size={16} color={colors.white} />
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.emptyText}>Ei tunnisteita vielä.</Text>
                )}

                {/* Suggestions from existing catalog */}
                {suggestions.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Aiemmat tunnisteet</Text>
                        <View style={styles.chipsWrap}>
                            {suggestions.map(tag => (
                                <TouchableOpacity
                                    key={tag.id}
                                    style={styles.suggestionChip}
                                    onPress={() => toggleExistingTag(tag.id)}
                                    accessibilityLabel={`Lisää tunniste ${tag.name}`}
                                    accessibilityRole="button"
                                >
                                    <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
                                    <Text style={styles.suggestionChipText}>{tag.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}
                {tags.length === 0 && pendingNewNames.length === 0 && (
                    <Text style={[styles.emptyText, { marginTop: 8 }]}>
                        Luo ensimmäinen tunnisteesi kirjoittamalla nimi alle.
                    </Text>
                )}
            </ScrollView>

            {/* Sticky footer: stays above the keyboard via BottomSheet KAV */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom > 0 ? 0 : 8, 0) }]}>
                <Text style={styles.sectionTitleFooter}>Lisää tunniste</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={inputValue}
                        onChangeText={setInputValue}
                        placeholder="Esim. Grimdark fantasy"
                        placeholderTextColor={colors.placeholder}
                        onSubmitEditing={handleAddFromInput}
                        returnKeyType="done"
                        autoCapitalize="sentences"
                    />
                    <TouchableOpacity
                        style={[styles.addButton, !inputValue.trim() && styles.addButtonDisabled]}
                        onPress={handleAddFromInput}
                        disabled={!inputValue.trim()}
                        accessibilityLabel="Lisää tunniste"
                        accessibilityRole="button"
                    >
                        <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                    accessibilityLabel="Tallenna tunnisteet"
                    accessibilityRole="button"
                >
                    <Text style={styles.saveButtonText}>{saving ? 'Tallennetaan...' : 'Tallenna'}</Text>
                </TouchableOpacity>
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    headerText: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 20,
        fontFamily: typography.fontFamilyDisplay,
        color: colors.textPrimary,
    },
    bookTitle: {
        fontSize: 14,
        fontFamily: typography.fontFamilyBody,
        color: colors.textSecondaryAlt,
        marginTop: 2,
    },
    closeButton: {
        minWidth: touchTargetMin,
        minHeight: touchTargetMin,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    scroll: {
        maxHeight: 260,
    },
    scrollContent: {
        paddingBottom: 8,
    },
    sectionTitle: {
        fontSize: 15,
        fontFamily: typography.fontFamilyBody,
        fontWeight: '600',
        color: colors.textSecondaryAlt,
        marginTop: 14,
        marginBottom: 8,
    },
    sectionTitleFooter: {
        fontSize: 15,
        fontFamily: typography.fontFamilyBody,
        fontWeight: '600',
        color: colors.textSecondaryAlt,
        marginBottom: 8,
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    selectedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.primary,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    pendingChip: {
        opacity: 0.85,
    },
    selectedChipText: {
        fontFamily: typography.fontFamilyDisplay,
        color: colors.white,
        fontSize: 14,
    },
    suggestionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.bgLight,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    suggestionChipText: {
        fontFamily: typography.fontFamilyBody,
        color: colors.primary,
        fontWeight: '500',
        fontSize: 14,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: typography.fontFamilyBody,
        color: colors.textSecondary,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        paddingTop: 12,
        marginTop: 4,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        fontFamily: typography.fontFamilyBody,
        color: colors.textPrimary,
    },
    addButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        minWidth: touchTargetMin,
        minHeight: touchTargetMin,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonDisabled: {
        opacity: 0.5,
    },
    saveButton: {
        backgroundColor: colors.primary,
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: colors.white,
        fontSize: 16,
        fontFamily: typography.fontFamilyDisplay,
    },
});

export default TagEditorSheet;
