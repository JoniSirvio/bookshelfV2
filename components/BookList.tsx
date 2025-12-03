import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import SwipeableItem, { OpenDirection, useSwipeableItemParams } from 'react-native-swipeable-item';
import { FinnaSearchResult } from '../api/finna';
import BookOptionsModal from './BookOptionsModal';

type Mode = 'search' | 'home' | 'read';

interface BookListProps<T extends FinnaSearchResult> {
  books: T[];
  mode?: Mode;
  toReadIds?: string[];
  readIds?: string[];
  onMarkAsRead?: (book: T) => void;
  onTriggerDelete?: (book: T) => void;
  onAdd?: (book: T) => void;
  onBookPress?: (book: T) => void;
  onReorder?: (data: T[]) => void;
  onStartReading?: (book: T) => void;
}

const UnderlayLeft = ({ item, mode, toReadIds, readIds }: { item: FinnaSearchResult, mode: Mode, toReadIds?: string[], readIds?: string[] }) => {
  let content = null;
  let backgroundColor = '#636B2F'; // Green

  if (mode === 'home') {
    content = (
      <>
        <MaterialCommunityIcons name="check-all" size={30} color="white" />
        <Text style={styles.actionText}>Luettu</Text>
      </>
    );
  } else if (mode === 'search') {
    const alreadyAdded = toReadIds?.includes(item.id) || readIds?.includes(item.id);
    if (alreadyAdded) {
      backgroundColor = '#9E9E9E'; // Gray
      content = (
        <>
          <MaterialCommunityIcons name="check" size={30} color="white" />
          <Text style={styles.actionText}>Lisätty!</Text>
        </>
      );
    } else {
      content = (
        <>
          <MaterialCommunityIcons name="plus-circle-outline" size={30} color="white" />
          <Text style={styles.actionText}>Lisää</Text>
        </>
      );
    }
  }

  return (
    <View style={[styles.underlayLeft, { backgroundColor }]}>
      {content}
    </View>
  );
};

// Underlay for Right Swipe (Delete)
const UnderlayRight = () => {
  return (
    <View style={styles.underlayRight}>
      <MaterialCommunityIcons name="trash-can-outline" size={30} color="white" />
      <Text style={styles.actionText}>Poista</Text>
    </View>
  );
};



// This component renders the visible content of the book list item.
const BookContent: React.FC<{
  item: FinnaSearchResult;
  mode: Mode;
  toReadIds?: string[];
  readIds?: string[];
}> = ({ item, mode, toReadIds, readIds }) => {
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <MaterialCommunityIcons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={i <= rating ? 'gold' : 'gray'}
        />
      );
    }
    return <View style={styles.starRatingContainer}>{stars}</View>;
  };

  const isInToRead = mode === 'search' && toReadIds?.includes(item.id);
  const isInRead = mode === 'search' && readIds?.includes(item.id);
  const shelfLabel = isInToRead ? 'Luettavien hyllyssä' : 'Luettujen hyllyssä';
  const shelfIcon = isInToRead ? 'bookshelf' : 'book-check';

  const getDaysRead = () => {
    if (item.startedReading && !item.finishedReading) {
      const start = new Date(item.startedReading).getTime();
      const now = new Date().getTime();
      const days = Math.ceil((now - start) / (1000 * 3600 * 24));
      return days;
    }
    return null;
  };

  const currentDaysRead = getDaysRead();

  return (
    <View style={styles.listItem}>
      <View style={styles.itemRow}>
        {item.images?.length ? (
          <Image source={{ uri: item.images[0].url }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <MaterialCommunityIcons name="book-outline" size={40} />
          </View>
        )}
        <View style={styles.itemText}>
          <Text style={styles.title}>{item.title || ''}</Text>
          <Text>{item.authors && item.authors.length > 0 ? item.authors.join(', ') : ''}</Text>
          <Text>{item.publicationYear || ''}</Text>

          {mode === 'home' && item.startedReading && !item.finishedReading && (
            <View style={styles.readingStatusContainer}>
              <MaterialCommunityIcons name="book-open-page-variant" size={16} color="#636B2F" />
              <Text style={styles.readingStatusText}>Luetaan ({currentDaysRead} pv)</Text>
            </View>
          )}

          {mode === 'read' && item.rating !== undefined && (
            <View style={styles.reviewDetails}>
              {item.readOrListened && (
                <View style={styles.readFormatContainer}>
                  <MaterialCommunityIcons
                    name={item.readOrListened === 'listened' ? 'headphones' : 'book-open-page-variant-outline'}
                    size={16}
                    color="#333"
                  />
                  <Text style={styles.readFormatText}>
                    {item.readOrListened === 'listened' ? 'Kuunneltu' : 'Luettu'}
                    {item.daysRead !== undefined ? ` ${item.daysRead} päivässä` : ''}
                  </Text>
                </View>
              )}
              {item.finishedReading && (
                <View style={styles.dateContainer}>
                  <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#555" />
                  <Text style={styles.dateText}>
                    {new Date(item.finishedReading).toLocaleDateString('fi-FI')}
                  </Text>
                </View>
              )}
              {renderStars(item.rating)}
              <Text style={styles.ratingText}>{item.rating}/5 tähteä</Text>
              {item.review && <Text style={styles.reviewText}>"{item.review}"</Text>}
            </View>
          )}
          {(isInToRead || isInRead) && (
            <View style={styles.inShelfContainer}>
              <MaterialCommunityIcons name={shelfIcon} size={16} color="#636B2F" />
              <Text style={styles.inShelfText}>{shelfLabel}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// This component wraps the BookContent with Drag and Swipe functionality.
function BookListItem<T extends FinnaSearchResult>({
  item,
  mode,
  toReadIds,
  readIds,
  onPress,
  drag,
  isActive,
  onMarkAsRead,
  onTriggerDelete,
  onAdd
}: {
  item: T;
  mode: Mode;
  toReadIds?: string[];
  readIds?: string[];
  onPress?: () => void;
  drag?: () => void;
  isActive?: boolean;
  onMarkAsRead?: (book: T) => void;
  onTriggerDelete?: (book: T) => void;
  onAdd?: (book: T) => void;
}) {

  const itemRef = useRef<any>(null);
  const snapPointsLeft = mode === 'home' || mode === 'search' ? [150] : [];
  const snapPointsRight = mode === 'home' || mode === 'read' ? [150] : [];

  const onChange = useCallback((params: { openDirection: OpenDirection, snapPoint: number }) => {
    if (params.openDirection === OpenDirection.LEFT) {
      // Swipe Right (Left Underlay revealed)
      if (mode === 'home' && onMarkAsRead) {
        onMarkAsRead(item);
        itemRef.current?.close();
      } else if (mode === 'search' && onAdd) {
        if (!toReadIds?.includes(item.id) && !readIds?.includes(item.id)) {
          onAdd(item);
        }
        itemRef.current?.close();
      }
    } else if (params.openDirection === OpenDirection.RIGHT) {
      // Swipe Left (Right Underlay revealed)
      if ((mode === 'home' || mode === 'read') && onTriggerDelete) {
        onTriggerDelete(item);
        itemRef.current?.close();
      }
    }
  }, [mode, onMarkAsRead, onAdd, onTriggerDelete, item, toReadIds, readIds]);

  return (
    <SwipeableItem
      key={item.id}
      ref={itemRef}
      item={item}
      renderUnderlayLeft={() => <UnderlayLeft item={item} mode={mode} toReadIds={toReadIds} readIds={readIds} />}
      renderUnderlayRight={() => <UnderlayRight />}
      snapPointsLeft={snapPointsLeft}
      snapPointsRight={snapPointsRight}
      onChange={onChange}
      activationThreshold={20}
    >
      <ScaleDecorator>
        <TouchableOpacity
          onPress={onPress}
          onLongPress={mode === 'home' ? drag : undefined}
          disabled={isActive}
          activeOpacity={1} // SwipeableItem handles opacity
          style={[
            styles.itemContainer,
            isActive && { backgroundColor: '#f0f0f0', elevation: 5 }
          ]}
        >
          <BookContent item={item} mode={mode} toReadIds={toReadIds} readIds={readIds} />
        </TouchableOpacity>
      </ScaleDecorator>
    </SwipeableItem>
  );
};

export const BookList = <T extends FinnaSearchResult>({ books, mode = 'search', onReorder, ...props }: BookListProps<T>) => {
  const [selectedBook, setSelectedBook] = useState<T | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleBookPress = (book: T) => {
    setSelectedBook(book);
    setModalVisible(true);
  };

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<T>) => {
    return (
      <BookListItem
        item={item}
        mode={mode}
        toReadIds={props.toReadIds}
        readIds={props.readIds}
        onPress={() => handleBookPress(item)}
        drag={drag}
        isActive={isActive}
        onMarkAsRead={props.onMarkAsRead}
        onTriggerDelete={props.onTriggerDelete}
        onAdd={props.onAdd}
      />
    );
  }, [mode, props]);

  return (
    <>
      <DraggableFlatList
        data={books}
        onDragEnd={({ data }) => onReorder && onReorder(data)}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        activationDistance={20}
        containerStyle={styles.flatListContainer}
      />
      <BookOptionsModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        book={selectedBook}
        mode={mode}
        onMarkAsRead={props.onMarkAsRead as any} // Cast to any to avoid complex type issues with Modal props
        onTriggerDelete={props.onTriggerDelete as any}
        onAdd={props.onAdd as any}
        onStartReading={props.onStartReading as any}
        showStartReading={mode === 'home' && selectedBook ? !selectedBook.startedReading : false}
        toReadIds={props.toReadIds}
        readIds={props.readIds}
      />
    </>
  );
};

const styles = StyleSheet.create({
  flatListContainer: {
    flex: 1,
  },
  list: {
    paddingBottom: 20,
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  underlayLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 20,
  },
  underlayRight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#d9534f', // Red
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 20,
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    paddingTop: 5,
  },
  listItem: {
    padding: 12,
    backgroundColor: '#fff',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverImage: {
    width: 100,
    height: 150,
    marginRight: 12,
    borderRadius: 6,
  },
  coverPlaceholder: {
    width: 100,
    height: 150,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 6,
  },
  itemText: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  reviewDetails: {
    marginTop: 5,
  },
  starRatingContainer: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  reviewText: {
    fontStyle: 'italic',
    color: '#555',
    fontSize: 13,
  },
  inShelfContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  inShelfText: {
    marginLeft: 6,
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 12,
  },
  readFormatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  readFormatText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  readingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  readingStatusText: {
    marginLeft: 5,
    color: '#636B2F',
    fontWeight: 'bold',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#555',
  },
});