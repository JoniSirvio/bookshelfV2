import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

interface FormatBadgeProps {
    format: 'audiobook' | 'ebook' | 'book';
    compact?: boolean;
}

export const FormatBadge: React.FC<FormatBadgeProps> = ({ format, compact = false }) => {
    // Only show badge for audiobook or ebook
    if (format === 'book') return null;

    let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'book';
    if (format === 'audiobook') {
        iconName = 'headphones';
    } else if (format === 'ebook') {
        iconName = 'cellphone'; // UX Choice: "Digital Edition" look
    }

    const iconSize = compact ? 12 : 14;
    const padding = compact ? 2 : 4;
    const top = compact ? 4 : 6;
    const right = compact ? 4 : 6;

    return (
        <View style={[styles.container, { padding, top, right }]}>
            <MaterialCommunityIcons name={iconName} size={iconSize} color={colors.white} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 12, // Circle or pill
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
});
