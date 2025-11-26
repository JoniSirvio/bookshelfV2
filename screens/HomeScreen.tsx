import { View, Text, StyleSheet } from "react-native";
import { BookList } from "../components/BookList";
import { useBooksContext } from "../context/BooksContext";
import ReviewModal from '../components/ReviewModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import BookOptionsModal from '../components/BookOptionsModal';
import { useState } from "react";
import { FinnaSearchResult } from "../api/finna";

const HomeScreen: React.FC = () => {
  const { myBooks, removeBook, markAsRead, startReading, reorderBooks } = useBooksContext();

  // State for Review Modal
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [selectedBookForReview, setSelectedBookForReview] = useState<FinnaSearchResult | null>(null);

  // State for Delete Confirmation Modal
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedBookForDeletion, setSelectedBookForDeletion] = useState<FinnaSearchResult | null>(null);

  // State for Options Modal
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [selectedBookForOptions, setSelectedBookForOptions] = useState<FinnaSearchResult | null>(null);

  // Handlers for Review Modal
  const handleOpenReviewModal = (book: FinnaSearchResult) => {
    setSelectedBookForReview(book);
    setIsReviewModalVisible(true);
  };

  const handleCloseReviewModal = () => {
    setIsReviewModalVisible(false);
    setSelectedBookForReview(null);
  };

  const handleSaveReview = (bookId: string, review: string, rating: number, readOrListened: string) => {
    markAsRead(bookId, review, rating, readOrListened);
    handleCloseReviewModal();
  };

  // Handlers for Delete Modal
  const handleOpenDeleteModal = (book: FinnaSearchResult) => {
    setSelectedBookForDeletion(book);
    setIsDeleteModalVisible(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setSelectedBookForDeletion(null);
  };

  const handleConfirmDelete = () => {
    if (selectedBookForDeletion) {
      removeBook(selectedBookForDeletion.id);
    }
    handleCloseDeleteModal();
  };

  // Handlers for Options Modal
  const handleOpenOptionsModal = (book: FinnaSearchResult) => {
    setSelectedBookForOptions(book);
    setIsOptionsModalVisible(true);
  };

  const handleCloseOptionsModal = () => {
    setIsOptionsModalVisible(false);
    setSelectedBookForOptions(null);
  };



  const handleStartReading = () => {
    if (selectedBookForOptions) {
      startReading(selectedBookForOptions.id);
    }
    handleCloseOptionsModal();
  };



  return (
    <View style={styles.container}>
      <Text style={styles.title}>Luettavien hylly</Text>
      <BookList
        books={myBooks}
        onTriggerDelete={handleOpenDeleteModal}
        onMarkAsRead={handleOpenReviewModal} // Swipe right opens review modal
        mode="home"
        onReorder={(newList) => {
          reorderBooks(newList, 'myBooks')
        }}
        onBookPress={handleOpenOptionsModal}
      />

      {selectedBookForReview && (
        <ReviewModal
          isVisible={isReviewModalVisible}
          onClose={handleCloseReviewModal}
          onSaveReview={handleSaveReview}
          onMarkAsReadWithoutReview={(bookId, readOrListened) => {
            markAsRead(bookId, undefined, undefined, readOrListened);
            handleCloseReviewModal();
          }}
          bookId={selectedBookForReview.id}
          bookTitle={selectedBookForReview.title}
          bookAuthors={selectedBookForReview.authors}
        />
      )}

      {selectedBookForDeletion && (
        <ConfirmDeleteModal
          isVisible={isDeleteModalVisible}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          bookTitle={selectedBookForDeletion.title}
        />
      )}

      {selectedBookForOptions && (
        <BookOptionsModal
          isVisible={isOptionsModalVisible}
          onClose={handleCloseOptionsModal}
          onStartReading={handleStartReading}
          bookTitle={selectedBookForOptions.title}
          showStartReading={!selectedBookForOptions.startedReading}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  }
});

export default HomeScreen;