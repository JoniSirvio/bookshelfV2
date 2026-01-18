import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { BookList } from "../components/BookList";
import { useBooksContext } from "../context/BooksContext";
import { useState, useMemo } from "react";
import { FinnaSearchResult } from "../api/finna";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import BookOptionsModal from "../components/BookOptionsModal";

export default function PastReadScreen() {
  const { readBooks, removeReadBook, reorderBooks } = useBooksContext();

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedBookForDeletion, setSelectedBookForDeletion] = useState<FinnaSearchResult | null>(null);

  // State for Options Modal
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [selectedBookForOptions, setSelectedBookForOptions] = useState<FinnaSearchResult | null>(null);

  // State for filtering
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Group books by month
  const booksByMonth = useMemo(() => {
    const groups: { [key: string]: number } = {};
    readBooks.forEach(book => {
      if (book.finishedReading) {
        const date = new Date(book.finishedReading);
        const key = date.toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' });
        const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
        groups[capitalizedKey] = (groups[capitalizedKey] || 0) + 1;
      }
    });
    return groups;
  }, [readBooks]);

  // Re-sorting keys by date to ensure chip order is logical (newest first)
  const sortedMonthKeys = useMemo(() => {
    return Object.keys(booksByMonth).sort((a, b) => {
      const parseDate = (str: string) => {
        const parts = str.split(' ');
        const months: { [key: string]: number } = { 'Tammikuu': 0, 'Helmikuu': 1, 'Maaliskuu': 2, 'Huhtikuu': 3, 'Toukokuu': 4, 'Kesäkuu': 5, 'Heinäkuu': 6, 'Elokuu': 7, 'Syyskuu': 8, 'Lokakuu': 9, 'Marraskuu': 10, 'Joulukuu': 11 };
        const month = months[parts[0]];
        const year = parseInt(parts[1]);
        return new Date(year, month).getTime();
      };
      return parseDate(b) - parseDate(a);
    });
  }, [booksByMonth]);

  const filteredBooks = useMemo(() => {
    if (!selectedMonth) return readBooks;
    return readBooks.filter(book => {
      if (!book.finishedReading) return false;
      const date = new Date(book.finishedReading);
      const key = date.toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' });
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      return capitalizedKey === selectedMonth;
    });
  }, [readBooks, selectedMonth]);

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

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.filterChip, selectedMonth === null && styles.activeFilterChip]}
            onPress={() => setSelectedMonth(null)}
          >
            <Text style={[styles.filterText, selectedMonth === null && styles.activeFilterText]}>
              Kaikki ({readBooks.length})
            </Text>
          </TouchableOpacity>
          {sortedMonthKeys.map(month => (
            <TouchableOpacity
              key={month}
              style={[styles.filterChip, selectedMonth === month && styles.activeFilterChip]}
              onPress={() => setSelectedMonth(month)}
            >
              <Text style={[styles.filterText, selectedMonth === month && styles.activeFilterText]}>
                {month} ({booksByMonth[month]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <BookList
        books={filteredBooks}
        mode="read"
        onTriggerDelete={handleOpenDeleteModal}
        onReorder={(newList) => reorderBooks(newList, 'readBooks')}
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
          book={selectedBookForOptions}
          mode="read"
          onTriggerDelete={handleOpenDeleteModal}
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
    marginBottom: 8, // Reduced from 16 to fit total count close
  },
  totalCount: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  filterContainer: {
    height: 50,
    marginBottom: 8,
  },
  filterContent: {
    alignItems: 'center',
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#636B2F', // App green
  },
  filterText: {
    color: '#333',
    fontWeight: '500',
  },
  activeFilterText: {
    color: 'white',
  },
});