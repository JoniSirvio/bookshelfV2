import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface FormatBadgeProps {
    format: 'audiobook' | 'ebook' | 'book';
}

export const FormatBadge: React.FC<FormatBadgeProps> = ({ format }) => {
    // Only show badge for audiobook or ebook
    if (format === 'book') return null;

    let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'book';
    if (format === 'audiobook') {
        iconName = 'headphones';
    } else if (format === 'ebook') {
        iconName = 'cellphone'; // UX Choice: "Digital Edition" look
    }

    return (
        <View style={styles.container}>
            <MaterialCommunityIcons name={iconName} size={14} color="#FFFFFF" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 12, // Circle or pill
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
});
