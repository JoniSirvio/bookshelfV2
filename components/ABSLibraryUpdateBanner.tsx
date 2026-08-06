import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, touchTargetMin } from '../theme';

interface ABSLibraryUpdateBannerProps {
    visible: boolean;
    onApply: () => void;
}

export function ABSLibraryUpdateBanner({ visible, onApply }: ABSLibraryUpdateBannerProps) {
    if (!visible) return null;

    return (
        <View style={styles.banner}>
            <Text style={styles.bannerText}>Kirjasto on päivittynyt — päivitä lista</Text>
            <TouchableOpacity
                onPress={onApply}
                style={styles.button}
                accessibilityLabel="Päivitä kirjasto"
                accessibilityRole="button"
            >
                <Text style={styles.buttonText}>Päivitä</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 10,
        gap: 10,
    },
    bannerText: {
        flex: 1,
        fontSize: 14,
        fontFamily: typography.fontFamilyBody,
        color: colors.textPrimary,
    },
    button: {
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 6,
        minHeight: touchTargetMin,
        justifyContent: 'center',
    },
    buttonText: {
        color: colors.white,
        fontFamily: typography.fontFamilyDisplay,
        fontSize: 14,
    },
});
