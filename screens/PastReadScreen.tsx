import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { BookList } from "../components/BookList";
import { useBooksContext } from "../context/BooksContext";
import { useState, useMemo } from "react";
import { FinnaSearchResult } from "../api/finna";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import BookOptionsModal from "../components/BookOptionsModal";
import AskAIAboutBookModal from "../components/AskAIAboutBookModal";
import { BookGridItem } from "../components/BookGridItem";
import { useViewMode } from "../hooks/useViewMode";
import { FlashList } from "@shopify/flash-list";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from "../theme";

export default function PastReadScreen() {
  const { readBooks, removeReadBook, reorderBooks } = useBooksContext();
  const [viewMode, setViewMode] = useViewMode('history_view_mode', 'list');

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedBookForDeletion, setSelectedBookForDeletion] = useState<FinnaSearchResult | null>(null);

  // State for Options Modal
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [selectedBookForOptions, setSelectedBookForOptions] = useState<FinnaSearchResult | null>(null);

  // State for Ask AI Modal
  const [bookForAI, setBookForAI] = useState<FinnaSearchResult | null>(null);
  const [askAIModalVisible, setAskAIModalVisible] = useState(false);

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
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Luettujen hylly</Text>
        <TouchableOpacity onPress={() => setViewMode(prev => prev === 'list' ? 'grid' : 'list')}>
          <MaterialCommunityIcons name={viewMode === 'list' ? 'view-grid' : 'view-list'} size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

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

      {viewMode === 'list' ? (
        <BookList
          books={filteredBooks}
          mode="read"
          onTriggerDelete={handleOpenDeleteModal}
          onReorder={(newList) => reorderBooks(newList, 'readBooks')}
          onBookPress={handleOpenOptionsModal}
          onAskAI={(book) => { setBookForAI(book); setAskAIModalVisible(true); }}
        />
      ) : (
        <FlashList
          data={filteredBooks}
          renderItem={({ item }) => (
            <BookGridItem
              id={item.id}
              title={item.title}
              authors={item.authors}
              coverUrl={item.images?.[0]?.url}
              publicationYear={item.publicationYear}
              format={item.id.startsWith('abs-') ? 'audiobook' : 'book'}
              onPress={() => handleOpenOptionsModal(item)}
            />
          )}
          numColumns={3}
          estimatedItemSize={200}
          contentContainerStyle={{ paddingBottom: 20 }}
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
          book={selectedBookForOptions}
          mode="read"
          onTriggerDelete={handleOpenDeleteModal}
          showStartReading={false}
          onAskAI={(book) => { setBookForAI(book); handleCloseOptionsModal(); setAskAIModalVisible(true); }}
        />
      )}

      <AskAIAboutBookModal
        isVisible={askAIModalVisible}
        onClose={() => { setAskAIModalVisible(false); setBookForAI(null); }}
        book={bookForAI}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.white,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  totalCount: {
    fontSize: 16,
    color: colors.textSecondaryAlt,
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
    backgroundColor: colors.primary,
  },
  filterText: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: colors.white,
  },
});