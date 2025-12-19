import React, { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SegmentedButtons } from 'react-native-paper';

interface ReviewModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSaveReview: (bookId: string, review: string, rating: number, readOrListened: string) => void;
  onMarkAsReadWithoutReview: (bookId: string, readOrListened: string) => void;
  bookId: string;
  bookTitle: string;
  bookAuthors?: string[];
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isVisible,
  onClose,
  onSaveReview,
  onMarkAsReadWithoutReview,
  bookId,
  bookTitle,
  bookAuthors,
}) => {
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0); // 0-5
  const [readOrListened, setReadOrListened] = useState('read');

  const handleSave = () => {
    onSaveReview(bookId, reviewText, rating, readOrListened);
    setReviewText('');
    setRating(0);
  };

  const handleMarkAsRead = () => {
    onMarkAsReadWithoutReview(bookId, readOrListened);
    setReviewText('');
    setRating(0);
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => setRating(i)} style={styles.starButton}>
          <MaterialCommunityIcons
            name={i <= rating ? 'star' : 'star-outline'}
            size={30}
            color={i <= rating ? '#FFD700' : '#C0C0C0'}
          />
        </TouchableOpacity>
      );
    }
    return <View style={styles.starContainer}>{stars}</View>;
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>
              Arvostele "{bookTitle}"
              {bookAuthors && bookAuthors.length > 0 ? ` - ${bookAuthors.join(', ')}` : ''}
            </Text>

            <SegmentedButtons
              value={readOrListened}
              onValueChange={setReadOrListened}
              buttons={[
                {
                  value: 'read',
                  label: 'Luettu',
                  icon: 'book-open-page-variant-outline',
                },
                {
                  value: 'listened',
                  label: 'Kuunneltu',
                  icon: 'headphones',
                },
              ]}
              style={styles.segmentedButtons}
              theme={{
                colors: {
                  secondaryContainer: '#636B2F',
                  onSecondaryContainer: '#FFFFFF',
                },
              }}
            />

            <Text style={styles.label}>Tähdet (1-5):</Text>
            {renderStars()}
            <Text style={styles.currentRatingText}>Valittu: {rating}/5 tähteä</Text>

            <Text style={styles.label}>Arvostelu:</Text>
            <TextInput
              style={styles.reviewInput}
              multiline
              placeholder="Kirjoita lyhyt arvostelu..."
              placeholderTextColor="#666"
              value={reviewText}
              onChangeText={setReviewText}
            />

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  (rating === 0 && reviewText.trim().length === 0) && styles.disabledButton
                ]}
                onPress={handleSave}
                disabled={rating === 0 && reviewText.trim().length === 0}
              >
                <View style={styles.buttonContent}>
                  <MaterialCommunityIcons name="content-save-outline" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={styles.primaryButtonText}>Tallenna arvostelu</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleMarkAsRead}
              >
                <Text style={styles.secondaryButtonText}>
                  Merkitse luetuksi{'\n'}(ilman arvostelua)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Peruuta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', // Darker overlay
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 15, // Slightly less rounded
    padding: 25, // Reduced padding
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
      },
    }),
    width: '90%',
    maxWidth: 400, // Max width for larger screens
  },
  modalTitle: {
    fontSize: 22, // Slightly larger title
    fontWeight: 'bold',
    marginBottom: 20, // More space below title
    textAlign: 'center',
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 8, // More space below label
    color: '#555',
  },
  starContainer: {
    flexDirection: 'row',
    marginBottom: 15, // More space below stars
  },
  starButton: {
    paddingHorizontal: 4, // Padding for better touch area
  },
  currentRatingText: {
    marginBottom: 20, // More space below rating text
    fontSize: 15,
    color: '#777',
  },
  reviewInput: {
    height: 120, // Taller input
    borderColor: '#ddd', // Lighter border
    borderWidth: 1,
    borderRadius: 8, // Rounded input
    width: '100%',
    padding: 12,
    marginBottom: 25, // More space below input
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    width: '100%',
    gap: 12, // Space between buttons
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  primaryButton: {
    backgroundColor: '#636B2F', // Green for primary action
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#2196F3', // Blue for secondary action
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#F44336', // Red for cancel action
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  segmentedButtons: {
    marginBottom: 20,
  },
});

export default ReviewModal;
