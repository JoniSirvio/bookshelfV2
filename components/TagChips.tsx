import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

interface TagChipsProps {
    tags: string[];
    /** Max chips shown before collapsing to "+N". */
    maxVisible?: number;
    compact?: boolean;
}

/** Small read-only tag chips for book list rows and grid cards. */
export const TagChips: React.FC<TagChipsProps> = ({ tags, maxVisible = 3, compact = false }) => {
    if (tags.length === 0) return null;

    const visible = tags.slice(0, maxVisible);
    const overflow = tags.length - visible.length;

    return (
        <View style={styles.wrap}>
            {visible.map(tag => (
                <View key={tag} style={[styles.chip, compact && styles.chipCompact]}>
                    <Text style={[styles.chipText, compact && styles.chipTextCompact]} numberOfLines={1}>
                        {tag}
                    </Text>
                </View>
            ))}
            {overflow > 0 && (
                <View style={[styles.chip, compact && styles.chipCompact]}>
                    <Text style={[styles.chipText, compact && styles.chipTextCompact]}>+{overflow}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 6,
    },
    chip: {
        backgroundColor: colors.bgLight,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 10,
        maxWidth: 140,
    },
    chipCompact: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        maxWidth: 100,
    },
    chipText: {
        fontSize: 11,
        fontFamily: typography.fontFamilyBody,
        fontWeight: '600',
        color: colors.primary,
    },
    chipTextCompact: {
        fontSize: 10,
    },
});
