import React from "react";
import { View, TextInput as NativeTextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Button } from "react-native-paper";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

interface SearchBarProps {
    value?: string;
    onChangeText?: (text: string) => void;
    query?: string;
    setQuery?: (text: string) => void;
    onSearch?: () => void;
    loading?: boolean;
    placeholder?: string;
}

export default function SearchBar({
    value,
    onChangeText,
    query,
    setQuery,
    onSearch,
    loading,
    placeholder
}: SearchBarProps) {
    // Resolve props to handle both usages
    const effectiveValue = value ?? query ?? "";
    const effectiveOnChange = onChangeText ?? setQuery;

    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <MaterialCommunityIcons
                    name="magnify"
                    size={20}
                    color={colors.textSecondaryAlt}
                    style={styles.searchIcon}
                />
                <NativeTextInput
                    placeholder={placeholder || "Etsi kirjaa..."}
                    placeholderTextColor={colors.placeholder}
                    value={effectiveValue}
                    onChangeText={effectiveOnChange}
                    style={styles.searchInput}
                    selectionColor={colors.primary}
                    onSubmitEditing={onSearch}
                    returnKeyType="search"
                    accessibilityLabel="Etsi kirjaa"
                    accessibilityHint="Kirjoita kirjan nimi tai tekijä"
                />
                {effectiveValue.length > 0 && (
                    <TouchableOpacity
                        onPress={() => effectiveOnChange?.('')}
                        accessibilityLabel="Tyhjennä haku"
                        accessibilityRole="button"
                    >
                        <MaterialCommunityIcons name="close-circle" size={20} color={colors.placeholder} />
                    </TouchableOpacity>
                )}
            </View>
            {onSearch && (
                <Button
                    mode="contained"
                    onPress={onSearch}
                    loading={loading}
                    disabled={loading}
                    buttonColor={colors.primary}
                    textColor={colors.white}
                    style={styles.searchButton}
                    contentStyle={{ height: 45 }}
                    accessibilityLabel="Hae"
                    accessibilityRole="button"
                >
                    Hae
                </Button>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 45,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 45,
        backgroundColor: 'transparent',
        fontSize: 16,
        color: colors.textPrimary,
    },
    searchButton: {
        borderRadius: 10,
        justifyContent: 'center',
    },
});
