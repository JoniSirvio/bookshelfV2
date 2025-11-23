import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useFinnaSearchResults } from "../hooks/useBooks";
import SearchBar from "../components/SearchBar";
import { BookList } from "../components/BookList";
import { useBooksContext } from "../context/BooksContext";

export default function SearchScreen() {
    const [query, setQuery] = useState("");
    const { results, loading, searchBooks } = useFinnaSearchResults();
    const { myBooks, readBooks, addBook } = useBooksContext();
    const toReadIds = myBooks.map(book => book.id);
    const readIds = readBooks.map(book => book.id);

    return (
        <View style={styles.container}>
            <SearchBar
                query={query}
                setQuery={setQuery}
                onSearch={() => searchBooks(query)}
                loading={loading}
            />
            <BookList
                books={results}
                toReadIds={toReadIds}
                readIds={readIds}
                onAdd={addBook}
                mode="search"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#fff",
    },
});
