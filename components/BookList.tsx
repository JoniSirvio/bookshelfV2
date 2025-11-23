import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Swipeable } from 'react-native-gesture-handler';
import { FinnaSearchResult } from '../api/finna';

type Mode = 'search' | 'home' | 'read';

interface BookListProps {
  books: FinnaSearchResult[];
  mode?: Mode;
  onMarkAsRead?: (book: FinnaSearchResult) => void;
  onTriggerDelete?: (book: FinnaSearchResult) => void;
  toReadIds?: string[];
  readIds?: string[];
  onAdd?: (book: FinnaSearchResult) => void;
  onBookPress?: (book: FinnaSearchResult) => void;
}

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
      return days; // 1 day minimum if started today? or 0? "Aloita lukeminen" -> 1st day.
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

// This component wraps the BookContent with Swipeable functionality.
const BookListItem: React.FC<{
  item: FinnaSearchResult;
  mode: Mode;
  onMarkAsRead?: (book: FinnaSearchResult) => void;
  onTriggerDelete?: (book: FinnaSearchResult) => void;
  toReadIds?: string[];
  readIds?: string[];
  onAdd?: (book: FinnaSearchResult) => void;
  onPress?: () => void;
}> = ({ item, mode, onMarkAsRead, onTriggerDelete, toReadIds, readIds, onAdd, onPress }) => {
  const swipeableRef = useRef<Swipeable>(null);

  const handleRightSwipe = () => {
    if (mode === 'home' && onMarkAsRead) onMarkAsRead(item);
    if (mode === 'search' && onAdd && !toReadIds?.includes(item.id) && !readIds?.includes(item.id)) onAdd(item);

    setTimeout(() => {
      swipeableRef.current?.close();
    }, 1000);
  };

  const handleLeftSwipe = () => {
    if (onTriggerDelete) onTriggerDelete(item);

    setTimeout(() => {
      swipeableRef.current?.close();
    }, 1000);
  };

  const renderLeftActions = () => {
    let content = null;
    let style = styles.rightAction;

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
        style = styles.disabledAction;
        content = (
          <>
            <MaterialCommunityIcons name="check" size={30} color="white" />
            <Text style={styles.actionText}>Lisätty!</Text>
          </>
        );
      }
      else {
        content = (
          <>
            <MaterialCommunityIcons name="plus-circle-outline" size={30} color="white" />
            <Text style={styles.actionText}>Lisää</Text>
          </>
        );
      }
    }
    if (!content) return null;
    return <View style={style}>{content}</View>;
  };

  const renderRightActions = () => {
    return (
      <View style={styles.leftAction}>
        <MaterialCommunityIcons name="trash-can-outline" size={30} color="white" />
        <Text style={styles.actionText}>Poista</Text>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      overshootFriction={5}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableRightWillOpen={handleLeftSwipe}
      onSwipeableLeftWillOpen={handleRightSwipe}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
      >
        <BookContent item={item} mode={mode} toReadIds={toReadIds} readIds={readIds} />
      </TouchableOpacity>
    </Swipeable>
  );
};

export const BookList: React.FC<BookListProps> = ({ books, mode = 'search', ...props }) => {
  return (
    <FlatList
      style={styles.list}
      data={books}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <BookListItem
          item={item}
          mode={mode}
          onMarkAsRead={props.onMarkAsRead}
          onTriggerDelete={props.onTriggerDelete}
          onAdd={props.onAdd}
          toReadIds={props.toReadIds}
          readIds={props.readIds}
          onPress={() => props.onBookPress && props.onBookPress(item)}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    marginTop: 12,
    paddingBottom: 20,
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
  separator: {
    height: 1,
    backgroundColor: '#eee',
  },
  leftAction: {
    backgroundColor: '#d9534f', // Red
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
  },
  rightAction: {
    backgroundColor: '#636B2F', // Green for 'Luettu'
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
  },
  disabledAction: {
    backgroundColor: '#9E9E9E', // Gray for disabled actions
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    paddingTop: 5,
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
  }
});