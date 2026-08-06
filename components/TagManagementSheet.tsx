import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUserTags } from '../hooks/useUserTags';
import { normalizeTagName } from '../firebase/tags';
import BottomSheet from './BottomSheet';
import { colors, touchTargetMin, typography } from '../theme';

interface TagManagementSheetProps {
    visible: boolean;
    onClose: () => void;
}

/**
 * Bottom sheet for managing the user's tag catalog:
 * rename (propagates via tag id) and delete (removed from all books).
 */
export const TagManagementSheet: React.FC<TagManagementSheetProps> = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();
    const { tags, usageCountByTagId, renameTag, deleteTag } = useUserTags();

    const [editingTagId, setEditingTagId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    useEffect(() => {
        if (visible) {
            setEditingTagId(null);
            setEditingName('');
        }
    }, [visible]);

    const startEditing = (tagId: string, currentName: string) => {
        setEditingTagId(tagId);
        setEditingName(currentName);
    };

    const commitRename = () => {
        if (!editingTagId) return;
        const normalized = normalizeTagName(editingName);
        if (!normalized) {
            setEditingTagId(null);
            return;
        }
        // Prevent renaming into a name that already exists on another tag (case-insensitive)
        const conflict = tags.find(t => t.id !== editingTagId && t.normalizedName === normalized);
        if (conflict) {
            Alert.alert('Tunniste on jo olemassa', `Tunniste "${conflict.name}" on jo käytössä.`);
            return;
        }
        renameTag(editingTagId, editingName);
        setEditingTagId(null);
        setEditingName('');
    };

    const confirmDelete = (tagId: string, name: string) => {
        const count = usageCountByTagId[tagId] || 0;
        Alert.alert(
            'Poista tunniste',
            count > 0
                ? `Poistetaanko tunniste "${name}"? Se poistetaan ${count} kirjalta.`
                : `Poistetaanko tunniste "${name}"?`,
            [
                { text: 'Peruuta', style: 'cancel' },
                { text: 'Poista', style: 'destructive', onPress: () => deleteTag(tagId) },
            ]
        );
    };

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            accessibilityLabel="Hallinnoi tunnisteita"
        >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.header}>
                    <Text style={styles.title}>Hallinnoi tunnisteita</Text>
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
                    contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {tags.length === 0 ? (
                        <Text style={styles.emptyText}>
                            Ei tunnisteita vielä. Lisää kirjalle tunniste sen valikosta.
                        </Text>
                    ) : (
                        tags.map(tag => (
                            <View key={tag.id} style={styles.tagRow}>
                                {editingTagId === tag.id ? (
                                    <>
                                        <TextInput
                                            style={styles.editInput}
                                            value={editingName}
                                            onChangeText={setEditingName}
                                            onSubmitEditing={commitRename}
                                            returnKeyType="done"
                                            autoFocus
                                        />
                                        <TouchableOpacity
                                            onPress={commitRename}
                                            style={styles.iconButton}
                                            accessibilityLabel={`Tallenna tunnisteen ${tag.name} uusi nimi`}
                                            accessibilityRole="button"
                                        >
                                            <MaterialCommunityIcons name="check" size={22} color={colors.primary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setEditingTagId(null)}
                                            style={styles.iconButton}
                                            accessibilityLabel="Peruuta nimen muokkaus"
                                            accessibilityRole="button"
                                        >
                                            <MaterialCommunityIcons name="close" size={22} color={colors.textSecondaryAlt} />
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <>
                                        <View style={styles.tagInfo}>
                                            <Text style={styles.tagName} numberOfLines={1}>{tag.name}</Text>
                                            <Text style={styles.tagCount}>
                                                {usageCountByTagId[tag.id] || 0} kirjaa
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => startEditing(tag.id, tag.name)}
                                            style={styles.iconButton}
                                            accessibilityLabel={`Muokkaa tunnistetta ${tag.name}`}
                                            accessibilityRole="button"
                                        >
                                            <MaterialCommunityIcons name="pencil-outline" size={22} color={colors.textSecondaryAlt} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => confirmDelete(tag.id, tag.name)}
                                            style={styles.iconButton}
                                            accessibilityLabel={`Poista tunniste ${tag.name}`}
                                            accessibilityRole="button"
                                        >
                                            <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.delete} />
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    title: {
        fontSize: 20,
        fontFamily: typography.fontFamilyDisplay,
        color: colors.textPrimary,
    },
    closeButton: {
        minWidth: touchTargetMin,
        minHeight: touchTargetMin,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scroll: {
        maxHeight: 400,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: typography.fontFamilyBody,
        color: colors.textSecondary,
        paddingVertical: 12,
    },
    tagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    tagInfo: {
        flex: 1,
        minWidth: 0,
    },
    tagName: {
        fontSize: 16,
        fontFamily: typography.fontFamilyBody,
        color: colors.textPrimary,
    },
    tagCount: {
        fontSize: 12,
        fontFamily: typography.fontFamilyBody,
        color: colors.textSecondary,
        marginTop: 2,
    },
    iconButton: {
        minWidth: touchTargetMin,
        minHeight: touchTargetMin,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editInput: {
        flex: 1,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 15,
        fontFamily: typography.fontFamilyBody,
        color: colors.textPrimary,
    },
});

export default TagManagementSheet;
