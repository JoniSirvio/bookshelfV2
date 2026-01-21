import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BookList } from "../components/BookList";
import { useBooksContext } from "../context/BooksContext";
import ReviewModal from '../components/ReviewModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import BookOptionsModal from '../components/BookOptionsModal';
import { useState, useRef } from "react";
import { FinnaSearchResult } from "../api/finna";

import { useABSInProgress } from "../hooks/useABSInProgress";

const HomeScreen: React.FC = () => {
  const { myBooks, readBooks, removeBook, markAsRead, startReading, reorderBooks, recommendations, generateRecommendations, removeRecommendation, addBook } = useBooksContext();
  const { inProgressBooks, loading: absLoading } = useABSInProgress(readBooks); // Fetch ABS items

  const [generating, setGenerating] = useState(false);
  const [userWishes, setUserWishes] = useState("");

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
    try {
      await generateRecommendations(userWishes);
    } catch (error: any) {
      alert(`Virhe suositusten haussa: ${error.message || 'Tuntematon virhe'}`);
    } finally {
      setGenerating(false);
    }
  };

  const renderHeader = () => (
    <View>
      <Text style={styles.title}>Luettavien hylly</Text>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      <Text style={styles.sectionTitle}>Mitä lukea seuraavaksi?</Text>
      <Text style={styles.sectionSubtitle}>Anna tekoälyn etsiä uutta luettavaa historiasi perusteella.</Text>

      <TextInput
        style={styles.wishesInput}
        placeholder="Esim. 'Haluaisin lyhyitä scifi-kirjoja' (valinnainen)"
        placeholderTextColor="#999"
        value={userWishes}
        onChangeText={setUserWishes}
        editable={!generating}
        multiline
      />

      <TouchableOpacity onPress={handleGenerateRecommendations} disabled={generating} style={styles.generateButton}>
        {generating ? (
          <ActivityIndicator size="small" color="#33691E" style={{ marginRight: 8 }} />
        ) : null}
        <Text style={styles.generateButtonText}>{generating ? 'Haetaan...' : 'Hae suosituksia'}</Text>
        {!generating && <MaterialCommunityIcons name="robot" size={20} color="#636B2F" style={{ marginLeft: 8 }} />}
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

  const returnAlert = (msg: string) => alert(msg);

  return (
    <View style={styles.container}>
      <BookList
        ListHeaderComponent={renderHeader()}
        ListFooterComponent={renderFooter()}
        books={combinedBooks} // Use merged list
        onTriggerDelete={handleOpenDeleteModal}
        onMarkAsRead={(book) => {
          // Allow marking ABS books as read now
          if (book.id.startsWith('abs-')) {
            // Open review modal directly
            handleRateAndReview(book);
            return;
          }
          markAsRead(book.id)
        }}
        onRateAndReview={handleRateAndReview}
        mode="home"
        onReorder={(newList) => {
          // Reordering might be tricky with mixed sources. 
          // For now, filter out ABS books before saving order?
          // or just disable reorder if ABS books are present?
          // Let's filter:
          const localBooksOnly = newList.filter(b => !b.id.startsWith('abs-'));
          reorderBooks(localBooksOnly as any, 'myBooks')
        }}
        onStartReading={(book) => !book.id.startsWith('abs-') && startReading(book.id)}
      />


      {selectedBookForReview && (
        <ReviewModal
          key={selectedBookForReview.id} // Force re-render to reset state like readOrListened
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
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  wishesInput: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  footerContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: 40,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  generateButton: {
    borderColor: '#636B2F',
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F8E9',
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  generateButtonText: {
    color: '#33691E',
    fontWeight: 'bold',
    fontSize: 16,
  },
  recommendationsList: {
    backgroundColor: '#FFF',
  }
});

export default HomeScreen;