import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useFinnaSearchResults } from "../hooks/useBooks";
import SearchBar from "../components/SearchBar";
import { BookList } from "../components/BookList";
import { useBooksContext } from "../context/BooksContext";
import ReviewModal from "../components/ReviewModal";

export default function SearchScreen() {
    const [query, setQuery] = useState("");
    const { results, loading, searchBooks } = useFinnaSearchResults();
    const { myBooks, readBooks, addBook } = useBooksContext();
    const toReadIds = myBooks.map(book => book.id);
    const readIds = readBooks.map(book => book.id);

    // State for Review Modal
    const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
    const [selectedBookForReview, setSelectedBookForReview] = useState<any | null>(null);

    const handleMarkAsRead = (book: any) => {
        addBook(book, 'read');
    };

    const handleRateAndReview = (book: any) => {
        setSelectedBookForReview(book);
        setIsReviewModalVisible(true);
    };

    const handleSaveReview = (bookId: string, review: string, rating: number, readOrListened: string, finishedDate?: string) => {
        if (selectedBookForReview) {
            addBook({ ...selectedBookForReview, review, rating, readOrListened }, 'read', finishedDate);
        }
        setIsReviewModalVisible(false);
        setSelectedBookForReview(null);
    };

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
                onMarkAsRead={handleMarkAsRead}
                onRateAndReview={handleRateAndReview}
                mode="search"
            />
            {selectedBookForReview && (
                <ReviewModal
                    isVisible={isReviewModalVisible}
                    onClose={() => {
                        setIsReviewModalVisible(false);
                        setSelectedBookForReview(null);
                    }}
                    onSaveReview={handleSaveReview}
                    onMarkAsReadWithoutReview={(bookId, readOrListened, finishedDate) => {
                        if (selectedBookForReview) {
                            addBook({ ...selectedBookForReview, readOrListened }, 'read', finishedDate);
                        }
                        setIsReviewModalVisible(false);
                        setSelectedBookForReview(null);
                    }}
                    bookId={selectedBookForReview.id}
                    bookTitle={selectedBookForReview.title}
                    bookAuthors={selectedBookForReview.authors}
                />
            )}
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
