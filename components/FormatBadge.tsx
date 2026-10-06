import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

interface FormatBadgeProps {
    format: 'audiobook' | 'ebook' | 'book' | 'both';
    compact?: boolean;
}

export const FormatBadge: React.FC<FormatBadgeProps> = ({ format, compact = false }) => {
    // Only show badge for audiobook, ebook or both
    if (format === 'book') return null;

    const iconSize = compact ? 12 : 14;
    const padding = compact ? 2 : 4;
    const top = compact ? 4 : 6;
    const right = compact ? 4 : 6;

    if (format === 'both') {
        return (
            <View style={[styles.container, styles.bothContainer, { padding, top, right }]}>
                <MaterialCommunityIcons name="headphones" size={iconSize} color={colors.white} />
                <View style={{ width: 2 }} />
                <MaterialCommunityIcons name="cellphone" size={iconSize} color={colors.white} />
            </View>
        );
    }

    let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'book';
    if (format === 'audiobook') {
        iconName = 'headphones';
    } else if (format === 'ebook') {
        iconName = 'cellphone'; // UX Choice: "Digital Edition" look
    }

    return (
        <View style={[styles.container, { padding, top, right }]}>
            <MaterialCommunityIcons name={iconName} size={iconSize} color={colors.white} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        backgroundColor: colors.overlayDark,
        borderRadius: 12, // Circle or pill
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    bothContainer: {
        flexDirection: 'row',
        paddingHorizontal: 4,
    },
});
