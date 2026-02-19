import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_COUNT = 3;
const ITEM_WIDTH = SCREEN_WIDTH / COLUMN_COUNT;
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useABSCredentials } from '../hooks/useABSCredentials';
import { fetchABSLibraries, getABSCoverUrl, ABSItem } from '../api/abs';
import { BookList } from '../components/BookList';
import { useBooksContext } from '../context/BooksContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SearchBar from '../components/SearchBar';
import ReviewModal from '../components/ReviewModal';
import { fetchNewBooksWithSideEffects } from '../utils/absNewBooksQuery';
import { setLastSeenNewBooksTime } from '../utils/notificationsStore';
import { BookGridItem } from '../components/BookGridItem';
import { useViewMode } from '../hooks/useViewMode';
import { FlashList } from '@shopify/flash-list';

import BookOptionsModal from '../components/BookOptionsModal';
import AskAIAboutBookModal from '../components/AskAIAboutBookModal';
import { FilterSortModal, SortOption, SortDirection, StatusFilter } from '../components/FilterSortModal';
import { colors, loaderColor } from '../theme';

export default function NewBooksScreen() {
    const queryClient = useQueryClient();
    const { url, token, loading: credsLoading } = useABSCredentials();
    const { myBooks, readBooks, addBook, markAsRead } = useBooksContext();
    const [selectedType, setSelectedType] = useState<'all' | 'audio' | 'ebook'>('all');
    const [viewMode, setViewMode] = useViewMode('newbooks_view_mode', 'list');
    const [searchQuery, setSearchQuery] = useState('');

    // Review Modal State
    const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
    const [selectedBookForReview, setSelectedBookForReview] = useState<any | null>(null);

    // Options Modal State
    const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
    const [selectedBookForOptions, setSelectedBookForOptions] = useState<any | null>(null);

    // Ask AI Modal State
    const [bookForAI, setBookForAI] = useState<any | null>(null);
    const [askAIModalVisible, setAskAIModalVisible] = useState(false);

    // Filter/Sort State
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [sortOption, setSortOption] = useState<SortOption>('added'); // Default to 'added' for New Books
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    // 1. Fetch Libraries
    const { data: libraries } = useQuery({
        queryKey: ['absLibraries', url],
        queryFn: () => fetchABSLibraries(url!, token!),
        enabled: !!url && !!token,
        staleTime: 1000 * 60 * 60,
    });
    const libraryMediaTypeMap = useMemo(() => {
        const map: Record<string, string> = {};
        if (libraries) {
            libraries.forEach(lib => {
                // Robust detection: If name says "audio", treat as audiobook even if type is 'book'
                if (lib.mediaType === 'audiobook' || lib.name.toLowerCase().includes('audio')) {
                    map[lib.id] = 'audiobook';
                } else {
                    map[lib.id] = lib.mediaType;
                }
            });
        }
        return map;
    }, [libraries]);


    // 2. Fetch "new" items from ALL libraries via TanStack Query (cached + persisted locally)
    const libraryIdsKey = libraries?.map(l => l.id).sort().join(',') ?? '';
    const { data: newBooksData, isLoading: loadingItems } = useQuery({
        queryKey: ['absNewBooks', url, libraryIdsKey],
        queryFn: () => fetchNewBooksWithSideEffects(url!, token!, libraries!),
        enabled: !!url && !!token && !!libraries?.length,
        staleTime: 1000 * 60 * 10, // 10 min cache; persisted via PersistQueryClientProvider
    });

    // Mark new books as seen when user views this screen so the bell badge clears (even when cache is used)
    useFocusEffect(
        useCallback(() => {
            setLastSeenNewBooksTime(Date.now()).then(() => {
                queryClient.invalidateQueries({ queryKey: ['hasNewBooks'] });
            });
        }, [queryClient])
    );

    const allItems = newBooksData ?? [];


    // Handlers
    const counts = useMemo(() => {
        let audio = 0;
        let ebook = 0;
        allItems.forEach(item => {
            const type = libraryMediaTypeMap[item.libraryId];
            // Robust check: Library type OR duration presence
            const isAudio = type === 'audiobook' || type === 'podcast' || (item.media?.duration || 0) > 0;

            if (isAudio) audio++;
            else ebook++;
        });
        return { audio, ebook };
    }, [allItems, libraryMediaTypeMap]);

    const handleMarkAsRead = (book: any) => {
        markAsRead(book);
    };

    const handleRateAndReview = (book: any) => {
        setSelectedBookForReview(book);
        setIsReviewModalVisible(true);
    };

    const handleSaveReview = (bookId: string, review: string, rating: number, readOrListened: string, finishedDate?: string) => {
        if (selectedBookForReview) {
            markAsRead(selectedBookForReview, review, rating, readOrListened, finishedDate);
        }
        setIsReviewModalVisible(false);
        setSelectedBookForReview(null);
    };

    const handleBookPress = (book: any) => {
        setSelectedBookForOptions(book);
        setIsOptionsModalVisible(true);
    };

    const renderGridItem = useCallback(({ item }: { item: any }) => (
        <View style={styles.bookItemWrapper}>
            <BookGridItem
                id={item.id}
                title={item.title}
                authors={item.authors}
                coverUrl={item.images?.[0]?.url}
                publicationYear={item.publicationYear}
                format={item.format}
                absProgress={item.absProgress}
                onPress={() => handleBookPress(item)}
            />
        </View>
    ), [handleBookPress]);

    // Filter and Sort (Moved up)
    const processedItems = useMemo(() => {
        let result = allItems.filter(item => {
            // 1. Existing Type Filter
            const type = libraryMediaTypeMap[item.libraryId];
            const isAudio = type === 'audiobook' || type === 'podcast' || (item.media?.duration || 0) > 0;
            const isEbook = !isAudio;

            if (selectedType === 'audio' && !isAudio) return false;
            if (selectedType === 'ebook' && !isEbook) return false;

            // 2. Search Query
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const title = item.media.metadata.title?.toLowerCase() || '';
                const author = item.media.metadata.authorName?.toLowerCase() || '';
                if (!title.includes(q) && !author.includes(q)) return false;
            }

            // 3. Status Filter
            if (statusFilter !== 'all') {
                const isFinished = item.userMedia?.finishedAt;
                const progress = item.userMedia?.progress || 0;

                if (statusFilter === 'unread' && (isFinished || progress > 0)) return false;
                if (statusFilter === 'in-progress' && (!progress || isFinished)) return false;
                if (statusFilter === 'finished' && !isFinished) return false;
            }

            return true;
        });

        // 4. Sort
        result.sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            switch (sortOption) {
                case 'title':
                    valA = a.media.metadata.title?.toLowerCase() || '';
                    valB = b.media.metadata.title?.toLowerCase() || '';
                    break;
                case 'author':
                    valA = a.media.metadata.authorName?.toLowerCase() || '';
                    valB = b.media.metadata.authorName?.toLowerCase() || '';
                    break;
                case 'added':
                    valA = a.addedAt || 0;
                    valB = b.addedAt || 0;
                    break;
                case 'year':
                    valA = parseInt(a.media.metadata.publishedYear || '0') || 0;
                    valB = parseInt(b.media.metadata.publishedYear || '0') || 0;
                    break;
                case 'duration':
                    // Prefer duration (audio), fallback to numPages (ebook)
                    valA = a.media.duration || a.media.numPages || 0;
                    valB = b.media.duration || b.media.numPages || 0;
                    break;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [allItems, selectedType, searchQuery, statusFilter, sortOption, sortDirection, libraryMediaTypeMap]);

    const filteredItems = processedItems;

    const bookListItems = useMemo(() => {
        return filteredItems.map(item => {
            let absProgress = undefined;
            if (item.userMedia && item.userMedia.duration > 0) {
                const duration = item.userMedia.duration;
                const currentTime = item.userMedia.currentTime || 0;
                const percentage = (currentTime / duration) * 100;

                const timeLeftSeconds = duration - currentTime;
                let timeLeft = "";
                const hoursLeft = Math.floor(timeLeftSeconds / 3600);
                const minutesLeft = Math.floor((timeLeftSeconds % 3600) / 60);

                if (hoursLeft > 0) timeLeft += `${hoursLeft}h `;
                timeLeft += `${minutesLeft}min`;
                if (timeLeftSeconds < 60) timeLeft = "Alle 1min";
                if (timeLeftSeconds <= 0) timeLeft = "Valmis";

                const isFinished = percentage >= 99 || timeLeftSeconds <= 0;

                absProgress = {
                    percentage,
                    timeLeft,
                    duration,
                    currentTime,
                    isFinished
                };
            }

            const isAudio = libraryMediaTypeMap[item.libraryId] === 'audiobook' || (item.media?.duration || 0) > 0;

            return {
                id: item.id,
                title: item.media.metadata.title,
                authors: item.media.metadata.authors?.map(a => a.name) || [item.media.metadata.authorName || ''],
                images: item.media.coverPath ? [{ url: getABSCoverUrl(url!, token!, item.id) }] : [],
                publicationYear: item.media.metadata.publishedYear,
                description: item.media.metadata.description,
                addedAt: item.addedAt,
                format: isAudio ? 'audiobook' : 'ebook',
                absProgress,
                finishedReading: item.userMedia?.finishedAt ? new Date(item.userMedia.finishedAt).toISOString() : undefined,
                readOrListened: isAudio ? 'listened' : 'read'
            };
        });
    }, [filteredItems, url, token, libraryMediaTypeMap]);

    if (credsLoading || loadingItems) {
        return <View style={styles.center}><ActivityIndicator size="large" color={loaderColor} /></View>;
    }

    if (!url || !token) {
        return <View style={styles.center}><Text>Kirjaudu ensin Audiobookshelfiin Kirjat-välilehdellä.</Text></View>;
    }





    const toReadIds = myBooks.map(b => b.id);
    const readIds = readBooks.map(b => b.id);



    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={[styles.headerTitle, { marginBottom: 0 }]}>Uudet lisäykset</Text>
                    <TouchableOpacity onPress={() => setViewMode(prev => prev === 'list' ? 'grid' : 'list')}>
                        <MaterialCommunityIcons name={viewMode === 'list' ? 'view-grid' : 'view-list'} size={28} color={colors.textPrimary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setIsFilterModalVisible(true)} style={{ marginLeft: 10 }}>
                        <MaterialCommunityIcons name="sort-variant" size={28} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Type Toggles */}
                <View style={styles.toggles}>
                    <TouchableOpacity onPress={() => setSelectedType('all')} style={[styles.pill, selectedType === 'all' && styles.activePill]}>
                        <Text style={[styles.pillText, selectedType === 'all' && styles.activePillText]}>Kaikki ({allItems.length})</Text>
                    </TouchableOpacity>

                    {/* Counts for Audiobooks and E-books */}
                    <TouchableOpacity onPress={() => setSelectedType('audio')} style={[styles.pill, selectedType === 'audio' && styles.activePill]}>
                        {/*<Icon name="headphones" />*/}
                        <Text style={[styles.pillText, selectedType === 'audio' && styles.activePillText]}>Äänikirjat ({counts.audio})</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setSelectedType('ebook')} style={[styles.pill, selectedType === 'ebook' && styles.activePill]}>
                        {/*<Icon name="book-open-variant" />*/}
                        <Text style={[styles.pillText, selectedType === 'ebook' && styles.activePillText]}>E-kirjat ({counts.ebook})</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {viewMode === 'list' ? (
                <BookList
                    books={bookListItems as any}
                    mode="search"
                    toReadIds={toReadIds}
                    readIds={readIds}
                    onAdd={addBook}
                    onMarkAsRead={handleMarkAsRead}
                    onRateAndReview={handleRateAndReview}
                    onAskAI={(book) => { setBookForAI(book); setAskAIModalVisible(true); }}
                    ListHeaderComponent={<SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Suodata uutuuksia..." />}
                    scrollEnabled={true}
                />
            ) : (
                <FlashList
                    data={bookListItems}
                    renderItem={renderGridItem}
                    numColumns={3}
                    estimatedItemSize={200}
                    ListHeaderComponent={<SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Suodata uutuuksia..." />}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}

            {/* Review Modal */}
            {selectedBookForReview && (
                <ReviewModal
                    isVisible={isReviewModalVisible}
                    onClose={() => {
                        setIsReviewModalVisible(false);
                        setSelectedBookForReview(null);
                    }}
                    onSaveReview={handleSaveReview}
                    onMarkAsReadWithoutReview={(bookId, readOrListened, finishedDate) => {
                        if (selectedBookForReview) {
                            markAsRead(selectedBookForReview, undefined, undefined, readOrListened, finishedDate);
                        }
                        setIsReviewModalVisible(false);
                        setSelectedBookForReview(null);
                    }}
                    bookId={selectedBookForReview.id}
                    bookTitle={selectedBookForReview.title}
                    bookAuthors={selectedBookForReview.authors}
                />
            )}

            {/* Filter Modal */}
            <FilterSortModal
                visible={isFilterModalVisible}
                onClose={() => setIsFilterModalVisible(false)}
                currentSort={sortOption}
                currentDirection={sortDirection}
                currentStatus={statusFilter}
                onApply={(sort, dir, status) => {
                    setSortOption(sort);
                    setSortDirection(dir);
                    setStatusFilter(status);
                }}
            />

            {/* Options Modal */}
            <BookOptionsModal
                isVisible={isOptionsModalVisible}
                onClose={() => setIsOptionsModalVisible(false)}
                book={selectedBookForOptions}
                mode="search"
                toReadIds={toReadIds}
                readIds={readIds}
                onAdd={addBook}
                onRateAndReview={(book) => {
                    setIsOptionsModalVisible(false);
                    setTimeout(() => handleRateAndReview(book), 500);
                }}
                onMarkAsRead={handleMarkAsRead}
                onAskAI={(book) => { setBookForAI(book); setIsOptionsModalVisible(false); setAskAIModalVisible(true); }}
            />

            <AskAIAboutBookModal
                isVisible={askAIModalVisible}
                onClose={() => { setAskAIModalVisible(false); setBookForAI(null); }}
                book={bookForAI}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        padding: 16
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    bookItemWrapper: {
        flex: 1,
        maxWidth: ITEM_WIDTH,
    },
    header: {
        marginBottom: 10
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: colors.textPrimary
    },
    toggles: {
        flexDirection: 'row',
        marginBottom: 10,
        gap: 10
    },
    pill: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
    },
    activePill: {
        backgroundColor: colors.primary,
    },
    pillText: {
        color: colors.textSecondaryAlt,
        fontWeight: '500'
    },
    activePillText: {
        color: colors.white,
        fontWeight: 'bold'
    }
});
