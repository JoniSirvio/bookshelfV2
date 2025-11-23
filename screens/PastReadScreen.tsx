import { View, Text, StyleSheet } from "react-native";
import { BookList } from "../components/BookList";
import { useBooksContext } from "../context/BooksContext";
import { useState } from "react";
import { FinnaSearchResult } from "../api/finna";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import BookOptionsModal from "../components/BookOptionsModal";

export default function PastReadScreen() {
  const { readBooks, removeReadBook } = useBooksContext();

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedBookForDeletion, setSelectedBookForDeletion] = useState<FinnaSearchResult | null>(null);

  // State for Options Modal
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [selectedBookForOptions, setSelectedBookForOptions] = useState<FinnaSearchResult | null>(null);

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
      removeReadBook(selectedBookForDeletion.id);
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





  return (
    <View style={styles.container}>
      <Text style={styles.title}>Luettujen hylly</Text>
      <BookList
        books={readBooks}
        mode="read"
        onTriggerDelete={handleOpenDeleteModal}

        onBookPress={handleOpenOptionsModal}
      />
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
          bookTitle={selectedBookForOptions.title}
          showStartReading={false}
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