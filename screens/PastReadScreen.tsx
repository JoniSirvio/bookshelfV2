import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { BookList } from "../components/BookList";
import { useBooksContext } from "../context/BooksContext";
import { useState, useMemo } from "react";
import { FinnaSearchResult } from "../api/finna";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import BookOptionsModal from "../components/BookOptionsModal";
import { useNavigation } from "@react-navigation/native";
import { BookGridItem } from "../components/BookGridItem";
import { useViewMode } from "../hooks/useViewMode";
import { useABSFinishedDates } from "../hooks/useABSFinishedDates";
import { FlashList } from "@shopify/flash-list";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography } from "../theme";
import { AnimatedFadeInView } from "../components/AnimatedFadeInView";

export default function PastReadScreen() {
  const navigation = useNavigation<any>();
  const { readBooks, removeReadBook, reorderBooks } = useBooksContext();
  const absFinishedDates = useABSFinishedDates();
  const [viewMode, setViewMode] = useViewMode('history_view_mode', 'list');

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedBookForDeletion, setSelectedBookForDeletion] = useState<FinnaSearchResult | null>(null);

  // State for Options Modal
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [selectedBookForOptions, setSelectedBookForOptions] = useState<FinnaSearchResult | null>(null);

  // State for filtering
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Sort by reading order: most recently finished first (finishedAt / finishedReading descending)
  // Use Firestore finishedReading, or ABS finishedAt for audiobooks when Firestore lacks it
  const sortedReadBooks = useMemo(() => {
    const getTime = (book: FinnaSearchResult) => {
      if (book.finishedReading) return new Date(book.finishedReading).getTime();
      if (book.id.startsWith('abs-') && absFinishedDates[book.id] != null) return absFinishedDates[book.id];
      return 0;
    };
    return [...readBooks].sort((a, b) => getTime(b) - getTime(a)); // Newest first
  }, [readBooks, absFinishedDates]);

  // Group books by month (based on effective finished date)
  const booksByMonth = useMemo(() => {
    const getTime = (book: FinnaSearchResult) => {
      if (book.finishedReading) return new Date(book.finishedReading).getTime();
      if (book.id.startsWith('abs-') && absFinishedDates[book.id] != null) return absFinishedDates[book.id];
      return 0;
    };
    const groups: { [key: string]: number } = {};
    sortedReadBooks.forEach(book => {
      const time = getTime(book);
      if (time > 0) {
        const date = new Date(time);
        const key = date.toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' });
        const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
        groups[capitalizedKey] = (groups[capitalizedKey] || 0) + 1;
      }
    });
    return groups;
  }, [sortedReadBooks, absFinishedDates]);

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
    if (!selectedMonth) return sortedReadBooks;
    const getTime = (book: FinnaSearchResult) => {
      if (book.finishedReading) return new Date(book.finishedReading).getTime();
      if (book.id.startsWith('abs-') && absFinishedDates[book.id] != null) return absFinishedDates[book.id];
      return 0;
    };
    return sortedReadBooks.filter(book => {
      const time = getTime(book);
      if (time <= 0) return false;
      const date = new Date(time);
      const key = date.toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' });
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      return capitalizedKey === selectedMonth;
    });
  }, [sortedReadBooks, selectedMonth, absFinishedDates]);

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

  const renderEmptyReadHistory = () => {
    const noBooksAtAll = readBooks.length === 0;
    return (
      <AnimatedFadeInView style={styles.emptyReadContainer}>
        <MaterialCommunityIcons
          name={noBooksAtAll ? 'book-check-outline' : 'calendar-blank-outline'}
          size={56}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyReadTitle}>
          {noBooksAtAll ? 'Ei luettuja kirjoja vielä' : 'Ei kirjoja tässä kuussa'}
        </Text>
        <Text style={styles.emptyReadSubtitle}>
          {noBooksAtAll
            ? 'Merkitse kirja luetuksi Luettavat-välilehdeltä (pyyhkäise oikealle tai avaa kirja ja valitse Luettu), niin se ilmestyy tänne.'
            : 'Valitse toinen kuukausi yllä tai paina Kaikki nähdäksesi kaikki luetut.'}
        </Text>
      </AnimatedFadeInView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Luettujen hylly</Text>
        <TouchableOpacity
          onPress={() => setViewMode(prev => prev === 'list' ? 'grid' : 'list')}
          style={styles.viewToggleButton}
          accessibilityLabel={viewMode === 'list' ? 'Vaihda ruudukkonäkymään' : 'Vaihda listanäkymään'}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name={viewMode === 'list' ? 'view-grid' : 'view-list'} size={28} color={colors.textPrimary} />
          <Text style={styles.viewToggleLabel}>{viewMode === 'list' ? 'Ruudukko' : 'Lista'}</Text>
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
          ListEmptyComponent={renderEmptyReadHistory()}
          onTriggerDelete={handleOpenDeleteModal}
          onReorder={(newList) => reorderBooks(newList, 'readBooks')}
          onBookPress={handleOpenOptionsModal}
          onAskAI={(book) => navigation.navigate('AskAIBook', { book })}
        />
      ) : (
        <FlashList
          data={filteredBooks}
          ListEmptyComponent={renderEmptyReadHistory()}
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
          onAskAI={(book) => { handleCloseOptionsModal(); navigation.navigate('AskAIBook', { book }); }}
        />
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.surface,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: typography.displaySize,
    fontWeight: typography.displayWeight,
    fontFamily: typography.fontFamilyDisplay,
    color: colors.textPrimary,
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewToggleLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBody,
    color: colors.textSecondary,
  },
  totalCount: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBody,
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
    backgroundColor: colors.surfaceVariant,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontFamily: typography.fontFamilyBody,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: colors.white,
  },
  emptyReadContainer: {
    paddingVertical: 56,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  emptyReadTitle: {
    fontSize: typography.sectionSize,
    fontWeight: typography.sectionWeight,
    fontFamily: typography.fontFamilyDisplay,
    color: colors.textPrimary,
    marginTop: 20,
    textAlign: 'center',
  },
  emptyReadSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBody,
    color: colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});