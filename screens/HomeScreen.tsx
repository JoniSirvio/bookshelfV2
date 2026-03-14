import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Dimensions } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BookList } from "../components/BookList";
import { useBooksContext } from "../context/BooksContext";
import ReviewModal from '../components/ReviewModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import BookOptionsModal from '../components/BookOptionsModal';
import { useAIChat } from '../context/AIChatContext';
import { useState, useRef } from "react";
import { FinnaSearchResult } from "../api/finna";
import { BookGridItem } from "../components/BookGridItem";
import { useViewMode } from "../hooks/useViewMode";
import { FlashList } from "@shopify/flash-list";
import { AnimatedFadeInView } from "../components/AnimatedFadeInView";
import { AnimatedScalePressable } from "../components/AnimatedScalePressable";

import { useABSInProgress } from "../hooks/useABSInProgress";
import { colors, loaderColor, touchTargetMin, typography } from "../theme";

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { myBooks, readBooks, removeBook, markAsRead, startReading, reorderBooks, recommendations, generateRecommendations, removeRecommendation, addBook } = useBooksContext();
  const { inProgressBooks, loading: absLoading } = useABSInProgress(readBooks);
  const { openAIModal } = useAIChat();

  const [generating, setGenerating] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [userWishes, setUserWishes] = useState("");
  const [viewMode, setViewMode] = useViewMode('home_view_mode', 'list');

  // State for Options Modal (Grid View)
  const [selectedBookForOptions, setSelectedBookForOptions] = useState<FinnaSearchResult | null>(null);
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);

  // Combine ABS books with My Books
  // We put ABS books at the top for visibility
  const combinedBooks = [
    ...inProgressBooks,
    ...myBooks
  ];

  // State for Review Modal
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [selectedBookForReview, setSelectedBookForReview] = useState<FinnaSearchResult | null>(null);

  // State for Delete Confirmation Modal
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedBookForDeletion, setSelectedBookForDeletion] = useState<FinnaSearchResult | null>(null);

  // Handlers for Review Modal
  const handleRateAndReview = (book: FinnaSearchResult) => {
    setSelectedBookForReview(book);
    setIsReviewModalVisible(true);
  };

  const handleCloseReviewModal = () => {
    setIsReviewModalVisible(false);
    setSelectedBookForReview(null);
  };

  const handleSaveReview = (bookId: string, review: string, rating: number, readOrListened: string, finishedDate?: string) => {
    // If it's the currently selected book (which might be ABS), pass the whole object
    if (selectedBookForReview && selectedBookForReview.id === bookId) {
      markAsRead(selectedBookForReview, review, rating, readOrListened, finishedDate);
    } else {
      markAsRead(bookId, review, rating, readOrListened, finishedDate);
    }
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
      // Check if it's a recommendation or normal book
      if ((selectedBookForDeletion as any).status === 'recommendation') {
        removeRecommendation(selectedBookForDeletion.id);
      } else {
        removeBook(selectedBookForDeletion.id);
      }
    }
    handleCloseDeleteModal();
  };

  // Prevent accidental multiple taps
  const lastCallTime = useRef(0);

  const handleGenerateRecommendations = async () => {
    const now = Date.now();
    if (now - lastCallTime.current < 2000) {
      return; // Ignore if clicked within 2 seconds
    }
    lastCallTime.current = now;

    setGenerating(true);
    setRecommendationError(null);
    try {
      await generateRecommendations(userWishes);
    } catch (error: any) {
      setRecommendationError(error?.message || 'Tuntematon virhe');
    } finally {
      setGenerating(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>Luettavien hylly</Text>
      <TouchableOpacity
        onPress={() => setViewMode(prev => prev === 'list' ? 'grid' : 'list')}
        style={styles.viewModeButton}
        accessibilityLabel={viewMode === 'list' ? 'Vaihda ruudukkoviewiin' : 'Vaihda listanäkymään'}
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name={viewMode === 'list' ? 'view-grid' : 'view-list'} size={28} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyShelf = () => (
    <AnimatedFadeInView style={styles.emptyShelfContainer}>
      <MaterialCommunityIcons name="bookshelf" size={80} color={colors.textSecondary} />
      <Text style={styles.emptyShelfTitle}>Hylly on tyhjä</Text>
      <Text style={styles.emptyShelfWhat}>
        Täällä näet luettavien listasi – kirjat, joita haluat lukea seuraavaksi.
      </Text>
      <Text style={styles.emptyShelfSubtitle}>
        Lisää kirjoja äänikirjastosta tai hae tekoälysuosituksia alla. Voit merkitä kirjat luetuiksi ja pitää kirjaa edistymisestäsi.
      </Text>
      <AnimatedScalePressable
        onPress={handleGenerateRecommendations}
        disabled={generating}
        style={[styles.emptyShelfCtaPrimary, generating ? styles.emptyShelfCtaDisabled : null]}
        accessibilityLabel={generating ? 'Haetaan suosituksia' : 'Hae suosituksia'}
        accessibilityRole="button"
      >
        {generating ? (
          <ActivityIndicator size="small" color={colors.white} style={{ marginRight: 8 }} />
        ) : (
          <MaterialCommunityIcons name="robot" size={22} color={colors.white} style={{ marginRight: 8 }} />
        )}
        <Text style={styles.emptyShelfCtaPrimaryText}>
          {generating ? 'Haetaan...' : 'Hae suosituksia'}
        </Text>
      </AnimatedScalePressable>
      <TouchableOpacity
        onPress={() => navigation.navigate('Kirjasto')}
        style={styles.emptyShelfCtaSecondary}
        accessibilityLabel="Siirry kirjoihin"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="bookshelf" size={20} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={styles.emptyShelfCtaSecondaryText}>Siirry kirjoihin</Text>
      </TouchableOpacity>
    </AnimatedFadeInView>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      <Text style={styles.sectionTitle}>Mitä lukea seuraavaksi?</Text>
      <Text style={styles.sectionSubtitle}>Anna tekoälyn etsiä uutta luettavaa historiasi perusteella.</Text>

      {recommendationError && (
        <View style={styles.recommendationErrorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.delete} />
          <Text style={styles.recommendationErrorText}>{recommendationError}</Text>
          <TouchableOpacity
            onPress={() => { setRecommendationError(null); handleGenerateRecommendations(); }}
            style={styles.retryButton}
            accessibilityLabel="Yritä uudelleen"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Yritä uudelleen</Text>
          </TouchableOpacity>
        </View>
      )}

      <TextInput
        style={styles.wishesInput}
        placeholder="Esim. 'Haluaisin lyhyitä scifi-kirjoja' (valinnainen)"
        placeholderTextColor={colors.placeholder}
        value={userWishes}
        onChangeText={(t) => { setUserWishes(t); if (recommendationError) setRecommendationError(null); }}
        editable={!generating}
        multiline
      />

      <TouchableOpacity
        onPress={handleGenerateRecommendations}
        disabled={generating}
        style={styles.generateButton}
        accessibilityLabel={generating ? 'Haetaan suosituksia' : 'Hae suosituksia'}
        accessibilityRole="button"
        accessibilityState={{ disabled: generating, busy: generating }}
      >
        {generating ? (
          <ActivityIndicator size="small" color={loaderColor} style={{ marginRight: 8 }} />
        ) : null}
        <Text style={styles.generateButtonText}>{generating ? 'Haetaan...' : 'Hae suosituksia'}</Text>
        {!generating && <MaterialCommunityIcons name="robot" size={20} color={colors.primary} style={{ marginLeft: 8 }} />}
      </TouchableOpacity>

      {recommendations.length > 0 && (
        <View style={styles.recommendationsList}>
          <BookList
            books={recommendations}
            mode="recommendation"
            onAdd={(book) => addBook(book)} // Add to shelf
            onTriggerDelete={handleOpenDeleteModal} // Remove recommendation
            scrollEnabled={false}
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {viewMode === 'list' ? (
        <BookList
          ListHeaderComponent={renderHeader()}
          ListFooterComponent={renderFooter()}
          ListEmptyComponent={renderEmptyShelf()}
          books={combinedBooks}
          onTriggerDelete={handleOpenDeleteModal}
          onMarkAsRead={(book) => {
            markAsRead(book);
          }}
          onRateAndReview={handleRateAndReview}
          mode="home"
          onReorder={(newList) => {
            const localBooksOnly = newList.filter(b => !b.id.startsWith('abs-'));
            reorderBooks(localBooksOnly as any, 'myBooks')
          }}
          onStartReading={(book) => !book.id.startsWith('abs-') && startReading(book.id)}
          onAskAI={(book) => openAIModal(book)}
        />
      ) : (
        <FlashList
          data={combinedBooks}
          ListEmptyComponent={renderEmptyShelf()}
          renderItem={({ item }) => (
            <BookGridItem
              id={item.id}
              title={item.title}
              authors={item.authors}
              coverUrl={item.images?.[0]?.url}
              publicationYear={item.publicationYear}
              format={item.id.startsWith('abs-') ? 'audiobook' : 'book'}
              absProgress={item.absProgress}
              onPress={() => {
                setSelectedBookForOptions(item);
                setIsOptionsModalVisible(true);
              }}
            />
          )}
          numColumns={3}
          estimatedItemSize={200}
          ListHeaderComponent={renderHeader()}
          ListFooterComponent={renderFooter()}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {selectedBookForReview && (
        <ReviewModal
          key={selectedBookForReview.id}
          isVisible={isReviewModalVisible}
          onClose={handleCloseReviewModal}
          onSaveReview={handleSaveReview}
          onMarkAsReadWithoutReview={(bookId, readOrListened, finishedDate) => {
            markAsRead(bookId, undefined, undefined, readOrListened, finishedDate);
            handleCloseReviewModal();
          }}
          bookId={selectedBookForReview.id}
          bookTitle={selectedBookForReview.title}
          bookAuthors={selectedBookForReview.authors}
          initialReadOrListened={selectedBookForReview.id.startsWith('abs-') ? 'listened' : 'read'}
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
          onClose={() => setIsOptionsModalVisible(false)}
          book={selectedBookForOptions}
          mode="home"
          onTriggerDelete={handleOpenDeleteModal}
          onMarkAsRead={(book) => {
            markAsRead(book);
          }}
          onStartReading={(book) => !book.id.startsWith('abs-') && startReading(book.id)}
          onRateAndReview={handleRateAndReview}
          showStartReading={!selectedBookForOptions.startedReading}
          onAskAI={(book) => { setIsOptionsModalVisible(false); openAIModal(book); }}
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
    marginBottom: 20,
  },
  viewModeButton: {
    minWidth: touchTargetMin,
    minHeight: touchTargetMin,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.displaySize,
    fontWeight: typography.displayWeight,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: typography.sectionSize,
    fontWeight: typography.sectionWeight,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondaryAlt,
    marginBottom: 16,
  },
  wishesInput: {
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  footerContainer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 40,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  generateButton: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgRec,
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  generateButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  recommendationsList: {
    backgroundColor: colors.white,
  },
  emptyShelfContainer: {
    paddingVertical: 56,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  emptyShelfTitle: {
    fontSize: typography.emptyHeroSize,
    fontWeight: typography.emptyHeroWeight,
    color: colors.textPrimary,
    marginTop: 20,
    textAlign: 'center',
  },
  emptyShelfWhat: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
  },
  emptyShelfSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  emptyShelfCtaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginTop: 28,
    alignSelf: 'stretch',
    shadowColor: colors.shadowPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 1,
    elevation: 4,
  },
  emptyShelfCtaDisabled: {
    opacity: 0.7,
  },
  emptyShelfCtaPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  emptyShelfCtaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    alignSelf: 'stretch',
  },
  emptyShelfCtaSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  recommendationErrorBox: {
    flexDirection: 'column',
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  recommendationErrorText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 6,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});

export default HomeScreen;