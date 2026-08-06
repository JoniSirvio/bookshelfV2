import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { UserTag } from '../firebase/tags';
import { colors, typography } from '../theme';

interface TagFilterBarProps {
    /** Selected filter tags (resolved to full tag objects). */
    tags: UserTag[];
    /** Number of books matching the current filter. */
    matchCount: number;
    onRemove: (tagId: string) => void;
    onClear: () => void;
}

/** Shows the active tag filter as removable chips with a match count and clear action. */
export const TagFilterBar: React.FC<TagFilterBarProps> = ({ tags, matchCount, onRemove, onClear }) => {
    if (tags.length === 0) return null;

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {tags.map(tag => (
                    <TouchableOpacity
                        key={tag.id}
                        style={styles.chip}
                        onPress={() => onRemove(tag.id)}
                        accessibilityLabel={`Poista suodatin ${tag.name}`}
                        accessibilityRole="button"
                    >
                        <Text style={styles.chipText}>{tag.name}</Text>
                        <MaterialCommunityIcons name="close-circle" size={16} color={colors.white} />
                    </TouchableOpacity>
                ))}
            </ScrollView>
            <Text style={styles.countText}>{matchCount} kirjaa</Text>
            <TouchableOpacity
                onPress={onClear}
                style={styles.clearButton}
                accessibilityLabel="Tyhjennä tunnistesuodatin"
                accessibilityRole="button"
            >
                <Text style={styles.clearText}>Tyhjennä</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    chipsRow: {
        alignItems: 'center',
        gap: 6,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.primary,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 14,
    },
    chipText: {
        fontFamily: typography.fontFamilyDisplay,
        color: colors.white,
        fontSize: 13,
    },
    countText: {
        fontSize: 13,
        fontFamily: typography.fontFamilyBody,
        color: colors.textSecondaryAlt,
    },
    clearButton: {
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    clearText: {
        fontSize: 13,
        fontFamily: typography.fontFamilyDisplay,
        color: colors.primary,
    },
});
