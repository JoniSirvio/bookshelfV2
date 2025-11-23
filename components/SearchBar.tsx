import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Button } from "react-native-paper";

interface SearchBarProps {
    query: string;
    setQuery: (text: string) => void;
    onSearch: () => void;
    loading?: boolean;
}

export default function SearchBar({ query, setQuery, onSearch, loading }: SearchBarProps) {
    return (
        <View style={styles.searchRow}>
            <TextInput
                placeholder="Etsi kirjaa..."
                value={query}
                onChangeText={setQuery}
                style={styles.input}
            />
            <Button
                icon="magnify"
                mode="contained"
                onPress={onSearch}
                disabled={loading}
                buttonColor="#636B2F"
                textColor="#000"
            >
                Hae
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        gap: 8,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 8,
    },
});
