import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_COUNT = 3;
const ITEM_WIDTH = SCREEN_WIDTH / COLUMN_COUNT;
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useABSCredentials } from '../hooks/useABSCredentials';
import { fetchABSLibraries, fetchABSLibraryItems, getABSCoverUrl, ABSItem } from '../api/abs';
import { BookList } from '../components/BookList';
import { useBooksContext } from '../context/BooksContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SearchBar from '../components/SearchBar';
import ReviewModal from '../components/ReviewModal';
import { setLastSeenNewBooksTime, getLastSeenNewBooksTime } from '../utils/notificationsStore';
import { BookGridItem } from '../components/BookGridItem';
import { FlashList } from '@shopify/flash-list';

import BookOptionsModal from '../components/BookOptionsModal';

export default function NewBooksScreen() {
    const { url, token, loading: credsLoading } = useABSCredentials();
    const { myBooks, readBooks, addBook, markAsRead } = useBooksContext();
    const [selectedType, setSelectedType] = useState<'all' | 'audio' | 'ebook'>('all');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [searchQuery, setSearchQuery] = useState('');

    // Review Modal State
    const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
    const [selectedBookForReview, setSelectedBookForReview] = useState<any | null>(null);

    // Options Modal State
    const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
    const [selectedBookForOptions, setSelectedBookForOptions] = useState<any | null>(null);

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


    // 2. Fetch items from ALL libraries manually (simplification: iterate and fetch)
    // Ideally we want an endpoint for "recently added" across libraries, but ABS API structure often requires per-library fetch.
    // We will simulate "All New Books" by fetching from all libraries and sorting.

    const [allItems, setAllItems] = useState<ABSItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    const queryClient = useQueryClient();

    useEffect(() => {
        const fetchAll = async () => {
            if (!url || !token || !libraries) return;
            setLoadingItems(true);
            try {
                // 1. Get the time we LAST checked/saw the list
                const previousLastSeen = await getLastSeenNewBooksTime();

                let all: ABSItem[] = [];
                for (const lib of libraries) {
                    try {
                        const items = await fetchABSLibraryItems(url, token, lib.id);
                        // Inject libraryId manually
                        all = [...all, ...items.map(i => ({ ...i, libraryId: lib.id }))];
                    } catch (libErr) {
                        console.error(`Failed to fetch items for lib ${lib.name}`, libErr);
                    }
                }

                // 2. Filter: Only keep books added AFTER our last visit
                const newOnly = all.filter(item => (item.addedAt || 0) > previousLastSeen);

                // Sort by addedAt desc
                newOnly.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
                setAllItems(newOnly);

                // 3. Mark "now" as the new reference point (clearing the inbox for next time)
                await setLastSeenNewBooksTime(Date.now());

                // 4. Invalidate the notification query so the bell updates immediately
                queryClient.invalidateQueries({ queryKey: ['hasNewBooks'] });

            } catch (e) {
                console.error("Failed to fetch new books", e);
            } finally {
                setLoadingItems(false);
            }
        };

        if (libraries && libraries.length > 0) {
            fetchAll();
        }
    }, [libraries, url, token, queryClient]);


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

    if (credsLoading || loadingItems) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#636B2F" /></View>;
    }

    if (!url || !token) {
        return <View style={styles.center}><Text>Kirjaudu ensin Audiobookshelfiin Kirjat-välilehdellä.</Text></View>;
    }



    // Filter
    const filteredItems = allItems.filter(item => {
        // Determine type from Library Metadata (most reliable) with fallback
        const type = libraryMediaTypeMap[item.libraryId];
        // Robust check: Library type OR duration presence matches 'counts' logic
        const isAudio = type === 'audiobook' || type === 'podcast' || (item.media?.duration || 0) > 0;
        const isEbook = !isAudio;

        if (selectedType === 'audio' && !isAudio) return false;
        if (selectedType === 'ebook' && !isEbook) return false;

        // Query filter
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const title = item.media.metadata.title?.toLowerCase() || '';
        const author = item.media.metadata.authorName?.toLowerCase() || '';
        return title.includes(q) || author.includes(q);
    });

    const bookListItems = filteredItems.map(item => {
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

    const toReadIds = myBooks.map(b => b.id);
    const readIds = readBooks.map(b => b.id);



    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={[styles.headerTitle, { marginBottom: 0 }]}>Uudet lisäykset</Text>
                    <TouchableOpacity onPress={() => setViewMode(prev => prev === 'list' ? 'grid' : 'list')}>
                        <MaterialCommunityIcons name={viewMode === 'list' ? 'view-grid' : 'view-list'} size={28} color="#333" />
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
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
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
        aspectRatio: 1 / 1.5,
    },
    header: {
        marginBottom: 10
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333'
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
        backgroundColor: '#636B2F',
    },
    pillText: {
        color: '#666',
        fontWeight: '500'
    },
    activePillText: {
        color: '#fff',
        fontWeight: 'bold'
    }
});
