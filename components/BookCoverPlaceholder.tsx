import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface BookCoverPlaceholderProps {
    id: string;
    title: string;
    authors?: string[];
    format?: 'audiobook' | 'ebook' | 'book';
    compact?: boolean; // New prop for small thumbnails
}

// Brand Colors
const COLORS = {
    primary: '#636B2F',
    textDark: '#333333',
    bgLight: '#FFFFFF',
    bgTint: '#EBECE6', // 10-15% opacity of primary on white
    bgAccent: '#636B2F',
    textLight: '#FFFFFF',
    textLightOpacity: 'rgba(255, 255, 255, 0.8)',
};

type Variant = 'light' | 'tint' | 'accent';

const getVariant = (id: string): Variant => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Distribution: 45% Light, 45% Tint, 10% Accent
    const normalized = Math.abs(hash) % 100;
    if (normalized < 45) return 'light';
    if (normalized < 90) return 'tint';
    return 'accent';
};

export const BookCoverPlaceholder: React.FC<BookCoverPlaceholderProps> = ({ id, title, authors, format = 'book', compact = false }) => {
    // User Request: Only Green background, remove watermark.
    const bgColor = COLORS.bgAccent;
    const titleColor = COLORS.textLight;
    const authorColor = COLORS.textLightOpacity;
    const iconColor = COLORS.textLight;

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>

            {/* Format Indicator */}
            <View style={styles.formatIndicator}>
                {!compact && ( // Hide built-in format indicator in compact mode if we are using external badge, 
                    // OR just scale it down. The user showed a screenshot where it was overlapping or large.
                    // Let's scale it down or keep it if it fits. 
                    // Actually, in the modal, we MIGHT overlay our new FormatBadge, 
                    // but BookOptionsModal is NOT overlaying FormatBadge on placeholder (it's commented out/logic is separate).
                    // So we DO need it here.
                    <MaterialCommunityIcons
                        name={format === 'audiobook' ? 'headphones' : 'book'}
                        size={compact ? 14 : 20}
                        color={iconColor}
                    />
                )}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text
                    style={[
                        styles.title,
                        { color: titleColor },
                        compact && { fontSize: 10, lineHeight: 12, marginBottom: 2 } // Compact styles
                    ]}
                    numberOfLines={compact ? 3 : 4}
                    adjustsFontSizeToFit={!compact} // Disable on tiny ones to prevent microscopic text, just truncation is better or fixed small size
                    minimumFontScale={0.8}
                >
                    {title}
                </Text>
                {authors && authors.length > 0 && (
                    <Text
                        style={[
                            styles.author,
                            { color: authorColor },
                            compact && { fontSize: 8 }
                        ]}
                        numberOfLines={1}
                    >
                        {authors[0]}
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        padding: 8,
        position: 'relative' // For absolute positioning children
    },
    watermark: {
        position: 'absolute',
        bottom: -10,
        right: -10,
        transform: [{ rotate: '-15deg' }]
    },
    formatIndicator: {
        position: 'absolute',
        top: 6,
        right: 6,
        zIndex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    title: {
        fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
        fontSize: 16, // Base size, adjusted by numberOfLines/adjustsFontSizeToFit logic where possible, but RN Text behaves reliably with fixed size + lines
        // User requested 18-22sp. Given 100px width covers, 18 might be large. Let's try 16-18.
        // Actually grid items can be small. 
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 6,
        lineHeight: 20,
    },
    author: {
        fontSize: 11,
        fontWeight: '400',
        textAlign: 'center',
    }
});
