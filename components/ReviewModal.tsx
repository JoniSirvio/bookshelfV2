import React, { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, Platform, TouchableWithoutFeedback, Keyboard, Switch, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SegmentedButtons } from 'react-native-paper';

interface ReviewModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSaveReview: (bookId: string, review: string, rating: number, readOrListened: string, finishedDate?: string) => void;
  onMarkAsReadWithoutReview: (bookId: string, readOrListened: string, finishedDate?: string) => void;
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
  const [useCustomDate, setUseCustomDate] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());

  const months = [
    { label: 'Tammi', value: '1' }, { label: 'Helmi', value: '2' }, { label: 'Maalis', value: '3' },
    { label: 'Huhti', value: '4' }, { label: 'Touko', value: '5' }, { label: 'Kesä', value: '6' },
    { label: 'Heinä', value: '7' }, { label: 'Elo', value: '8' }, { label: 'Syys', value: '9' },
    { label: 'Loka', value: '10' }, { label: 'Marras', value: '11' }, { label: 'Joulu', value: '12' }
  ];

  const getFinishedDate = () => {
    if (!useCustomDate) return undefined;
    // Default to 1st of the month, or current day if current month/year
    // Actually, if backdating, just picking a valid date in that month is enough.
    // Let's stick to 12:00 PM to avoid timezone jumping issues with simple dates
    const monthIndex = parseInt(selectedMonth) - 1;
    const date = new Date(parseInt(selectedYear), monthIndex, 1, 12, 0, 0);
    return date.toISOString();
  };

  const handleSave = () => {
    onSaveReview(bookId, reviewText, rating, readOrListened, getFinishedDate());
    resetState();
  };

  const handleMarkAsRead = () => {
    onMarkAsReadWithoutReview(bookId, readOrListened, getFinishedDate());
    resetState();
  };

  const resetState = () => {
    setReviewText('');
    setRating(0);
    setUseCustomDate(false);
    setSelectedYear(currentYear.toString());
    setSelectedMonth((new Date().getMonth() + 1).toString());
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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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

              <View style={styles.dateOptionContainer}>
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Valitse ajankohta</Text>
                  <Switch
                    trackColor={{ false: "#767577", true: "#a5d6a7" }}
                    thumbColor={useCustomDate ? "#636B2F" : "#f4f3f4"}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={setUseCustomDate}
                    value={useCustomDate}
                  />
                </View>

                {useCustomDate && (
                  <View style={styles.datePickerContainer}>
                    <View style={styles.yearContainer}>
                      <TouchableOpacity onPress={() => setSelectedYear((parseInt(selectedYear) - 1).toString())}>
                        <MaterialCommunityIcons name="chevron-left" size={24} color="#333" />
                      </TouchableOpacity>
                      <Text style={styles.yearText}>{selectedYear}</Text>
                      <TouchableOpacity
                        onPress={() => setSelectedYear((parseInt(selectedYear) + 1).toString())}
                        disabled={parseInt(selectedYear) >= currentYear}
                        style={{ opacity: parseInt(selectedYear) >= currentYear ? 0.3 : 1 }}
                      >
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#333" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.monthsGrid}>
                      {months.map((m) => {
                        const isFuture = parseInt(selectedYear) === currentYear && parseInt(m.value) > currentMonth;
                        return (
                          <TouchableOpacity
                            key={m.value}
                            style={[
                              styles.monthChip,
                              selectedMonth === m.value && styles.selectedMonthChip,
                              isFuture && styles.disabledMonthChip
                            ]}
                            onPress={() => !isFuture && setSelectedMonth(m.value)}
                            disabled={isFuture}
                          >
                            <Text style={[
                              styles.monthText,
                              selectedMonth === m.value && styles.selectedMonthText,
                              isFuture && styles.disabledMonthText
                            ]}>{m.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              <Text style={styles.label}>Tähdet (1-5):</Text>
              {renderStars()}
              <Text style={styles.currentRatingText}>Valittu: {rating}/5 tähteä</Text>

              <Text style={styles.label}>Arvostelu:</Text>
              <View style={styles.reviewInputWrapper}>
                <TextInput
                  style={styles.reviewInput}
                  multiline
                  scrollEnabled={true}
                  placeholder="Kirjoita lyhyt arvostelu..."
                  placeholderTextColor="#666"
                  value={reviewText}
                  onChangeText={setReviewText}
                />
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton
                  ]}
                  onPress={handleSave}
                >
                  <View style={styles.buttonContent}>
                    <MaterialCommunityIcons name="content-save-outline" size={20} color="white" style={styles.buttonIcon} />
                    <Text style={styles.primaryButtonText}>Tallenna arvostelu</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Peruuta</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    borderRadius: 15,
    padding: 20, // Reduced padding
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
    maxWidth: 400,
    maxHeight: '85%', // Prevent overflow
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20, // Slightly smaller title to save space
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
    color: '#555',
  },
  starContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  starButton: {
    paddingHorizontal: 4,
  },
  currentRatingText: {
    marginBottom: 10,
    fontSize: 15,
    color: '#777',
  },
  reviewInputWrapper: {
    height: 100,
    width: '100%',
    marginBottom: 15,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  reviewInput: {
    flex: 1, // Fill the wrapper
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#333',
    padding: 0, // Remove padding from input itself to avoid scroll issues
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
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
    backgroundColor: '#636B2F',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  segmentedButtons: {
    marginBottom: 15, // Reduced margin
  },
  dateOptionContainer: {
    width: '100%',
    marginBottom: 15,
    padding: 12, // Increased padding
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Push switch to right
    marginBottom: 5,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  datePickerContainer: {
    marginTop: 10, // Added margin top
  },
  yearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  yearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 5,
  },
  monthChip: {
    width: '30%',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    marginBottom: 5,
  },
  selectedMonthChip: {
    backgroundColor: '#636B2F',
  },
  disabledMonthChip: {
    opacity: 0.3,
    backgroundColor: '#e0e0e0',
  },
  monthText: {
    fontSize: 14,
    color: '#333',
  },
  selectedMonthText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabledMonthText: {
    color: '#999',
  },
});

export default ReviewModal;
