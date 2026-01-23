import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Alert, TextInput as NativeTextInput } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useABSCredentials } from '../hooks/useABSCredentials';
import { fetchABSLibraries, fetchABSLibraryItems, getABSCoverUrl, loginToABS, ABSItem, ABSLibrary } from '../api/abs';
import { BookList } from '../components/BookList'; // Import BookList
import { BookGridItem } from '../components/BookGridItem';
import { useBooksContext } from '../context/BooksContext'; // Import context
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../firebase/Config';
import { useAuth } from '../context/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_COUNT = 3;
const ITEM_WIDTH = SCREEN_WIDTH / COLUMN_COUNT;

import SearchBar from '../components/SearchBar'; // Shared component
import { useFinnaSearchResults } from '../hooks/useBooks';
import ReviewModal from '../components/ReviewModal';

import BookOptionsModal from '../components/BookOptionsModal';
import { FilterSortModal, SortOption, SortDirection, StatusFilter } from '../components/FilterSortModal';

export default function ABSLibraryScreen() {
    const { url, token, loading: credsLoading } = useABSCredentials();
    const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const { myBooks, readBooks, addBook, markAsRead } = useBooksContext();
    const { user } = useAuth();
    const [inputUrl, setInputUrl] = useState('');
    const [inputUsername, setInputUsername] = useState('');
    const [inputPassword, setInputPassword] = useState('');
    const [savingCreds, setSavingCreds] = useState(false);

    // Options Modal State (for ABS items)
    const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
    const [selectedBookForOptions, setSelectedBookForOptions] = useState<any | null>(null);

    // Filter/Sort State
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [sortOption, setSortOption] = useState<SortOption>('added');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    // Finna State
    const [searchSource, setSearchSource] = useState<'abs' | 'finna'>('abs');
    const { results: finnaResults, loading: finnaLoading, searchBooks: searchFinna } = useFinnaSearchResults();
    const [finnaQuery, setFinnaQuery] = useState('');

    // Review Modal State
    const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
    const [selectedBookForReview, setSelectedBookForReview] = useState<any | null>(null);

    // 1. Fetch Libraries
    const { data: libraries, isLoading: librariesLoading } = useQuery({
        queryKey: ['absLibraries', url],
        queryFn: () => fetchABSLibraries(url!, token!),
        enabled: !!url && !!token,
        staleTime: 1000 * 60 * 60, // Libraries don't change often
    });

    // Auto-select first library
    useEffect(() => {
        if (libraries && libraries.length > 0 && !selectedLibraryId) {
            setSelectedLibraryId(libraries[0].id);
        }
    }, [libraries]);

    // 2. Fetch Items for selected library
    const { data: items, isLoading: itemsLoading, refetch } = useQuery({
        queryKey: ['absItems', selectedLibraryId, 'unlimited'],
        queryFn: () => fetchABSLibraryItems(url!, token!, selectedLibraryId!),
        enabled: !!url && !!token && !!selectedLibraryId,
        staleTime: 1000 * 60 * 10, // Keep data fresh for 10 minutes
    });

    const handleRefresh = async () => {
        await refetch();
    };

    const handleBookPress = (book: any) => {
        setSelectedBookForOptions(book);
        setIsOptionsModalVisible(true);
    };

    const renderGridItem = useCallback(({ item }: { item: any }) => {
        return (
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
        );
    }, [handleBookPress]);

    // Credential state is now at top
    // Handlers
    const handleSaveCredentials = async () => {
        if (!user) return;
        if (!inputUrl.trim() || !inputUsername.trim() || !inputPassword.trim()) {
            Alert.alert("Virhe", "Täytä kaikki kentät.");
            return;
        }
        setSavingCreds(true);
        try {
            // 1. Login to get token
            const token = await loginToABS(inputUrl.trim(), inputUsername.trim(), inputPassword.trim());

            // 2. Save credentials to Firestore (using setDoc with merge to create if missing)
            const userDoc = doc(firestore, 'users', user.uid);
            await setDoc(userDoc, {
                absUrl: inputUrl.trim(),
                absToken: token
            }, { merge: true });

            Alert.alert("Tallennettu", "Yhdistäminen onnistui!");
        } catch (error: any) {
            console.error("Error saving creds:", error);
            if (error.response?.status === 401 || error.message?.includes('401')) {
                Alert.alert("Virhe", "Väärä käyttäjätunnus tai salasana.");
            } else {
                Alert.alert("Virhe", "Yhdistäminen epäonnistui. Tarkista tiedot ja verkkoyhteys.");
            }
        } finally {
            setSavingCreds(false);
        }
    };

    // Finna Handlers
    // Finna Handlers
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



    // Filter and Sort Items (Moved up to prevent hook errors)
    const processedItems = React.useMemo(() => {
        if (!items) return [];

        // 1. Filter
        let result = items.filter(item => {
            // Search Query
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const title = item.media.metadata.title?.toLowerCase() || '';
                const author = item.media.metadata.authorName?.toLowerCase() || '';
                const authors = item.media.metadata.authors?.map(a => a.name.toLowerCase()).join(' ') || '';
                if (!title.includes(q) && !author.includes(q) && !authors.includes(q)) return false;
            }

            // Status Filter
            if (statusFilter !== 'all') {
                const isFinished = item.userMedia?.finishedAt;
                const progress = item.userMedia?.progress || 0;

                if (statusFilter === 'unread' && (isFinished || progress > 0)) return false;
                if (statusFilter === 'in-progress' && (!progress || isFinished)) return false;
                if (statusFilter === 'finished' && !isFinished) return false;
            }

            return true;
        });

        // 2. Sort
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
                    // Prefer duration (audio), fallback to numPages (ebook - strictly not comparable but better than nothing)
                    // Or usually we sort audioItems by duration.
                    valA = a.media.duration || a.media.numPages || 0;
                    valB = b.media.duration || b.media.numPages || 0;
                    break;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [items, searchQuery, statusFilter, sortOption, sortDirection]);

    const filteredItems = processedItems;

    if (credsLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#636B2F" /></View>;
    }

    if (!url || !token) {
        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.center}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.formContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <MaterialCommunityIcons name="bookshelf" size={64} color="#636B2F" style={{ marginBottom: 20 }} />
                    <Text style={styles.title}>Yhdistä Audiobookshelfiin</Text>
                    <Text style={styles.subtitle}>Syötä palvelimen tiedot kirjautuaksesi.</Text>

                    <TextInput
                        label="Palvelimen osoite (URL)"
                        placeholder="https://my-abs-server.com"
                        value={inputUrl}
                        onChangeText={setInputUrl}
                        autoCapitalize="none"
                        keyboardType="url"
                        style={styles.input}
                        mode="outlined"
                        activeOutlineColor="#636B2F"
                    />

                    <TextInput
                        label="Käyttäjätunnus"
                        value={inputUsername}
                        onChangeText={setInputUsername}
                        autoCapitalize="none"
                        style={styles.input}
                        mode="outlined"
                        activeOutlineColor="#636B2F"
                    />

                    <TextInput
                        label="Salasana"
                        value={inputPassword}
                        onChangeText={setInputPassword}
                        secureTextEntry
                        style={styles.input}
                        mode="outlined"
                        activeOutlineColor="#636B2F"
                    />

                    <Button
                        mode="contained"
                        onPress={handleSaveCredentials}
                        loading={savingCreds}
                        disabled={savingCreds}
                        style={styles.saveButton}
                        buttonColor="#636B2F"
                    >
                        Yhdistä
                    </Button>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    // Adapter for BookList (ABS)
    const currentLib = libraries?.find(l => l.id === selectedLibraryId);

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

        const isAudio = item.mediaType === 'audiobook' || currentLib?.mediaType === 'audiobook' || currentLib?.name?.toLowerCase().includes('audio');

        return {
            id: item.id,
            title: item.media.metadata.title,
            authors: item.media.metadata.authors?.map(a => a.name) || [item.media.metadata.authorName || ''],
            images: item.media.coverPath ? [{ url: getABSCoverUrl(url!, token!, item.id) }] : [],
            publicationYear: item.media.metadata.publishedYear,
            description: item.media.metadata.description,
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
                <View style={[styles.headerTop, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <Text style={styles.headerTitle}>
                        {searchSource === 'abs' ? 'Audiobookshelf' : 'Finna-haku'}
                    </Text>
                    <TouchableOpacity
                        onPress={() => setSearchSource(prev => prev === 'abs' ? 'finna' : 'abs')}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#F1F8E9',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: '#C5E1A5'
                        }}
                    >
                        <Text style={{ marginRight: 6, color: '#33691E', fontWeight: 'bold' }}>
                            {searchSource === 'abs' ? 'Hae Finnasta' : 'Oma kirjasto'}
                        </Text>
                        <MaterialCommunityIcons
                            name={searchSource === 'abs' ? 'book-search' : 'bookshelf'}
                            size={20}
                            color="#33691E"
                        />
                    </TouchableOpacity>
                </View>

                {searchSource === 'abs' && (
                    <View style={styles.tabsRow}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.libraryTabs}>
                            {libraries?.map(lib => (
                                <TouchableOpacity
                                    key={lib.id}
                                    style={[styles.tab, selectedLibraryId === lib.id && styles.activeTab]}
                                    onPress={() => setSelectedLibraryId(lib.id)}
                                >
                                    <Text style={[styles.tabText, selectedLibraryId === lib.id && styles.activeTabText]}>
                                        {(lib.mediaType === 'audiobook' || lib.name.toLowerCase().includes('audio')) ? 'Äänikirjat' : (lib.mediaType === 'book' ? 'E-kirjat' : lib.name)}
                                        {selectedLibraryId === lib.id && filteredItems ? ` (${filteredItems.length})` : ''}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity onPress={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')} style={styles.viewToggle}>
                            <MaterialCommunityIcons
                                name={viewMode === 'grid' ? "view-list" : "view-grid"}
                                size={28}
                                color="#333"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setIsFilterModalVisible(true)} style={styles.viewToggle}>
                            <MaterialCommunityIcons
                                name="sort-variant"
                                size={28}
                                color="#333"
                            />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {searchSource === 'abs' ? (
                itemsLoading && !items ? (
                    <View style={styles.center}><ActivityIndicator size="large" color="#636B2F" /></View>
                ) : (
                    viewMode === 'grid' ? (
                        <FlashList
                            data={bookListItems}
                            renderItem={renderGridItem}
                            estimatedItemSize={200}
                            numColumns={COLUMN_COUNT}
                            contentContainerStyle={styles.listContent}
                            onRefresh={handleRefresh}
                            refreshing={itemsLoading}
                            ListHeaderComponent={<SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Hae kirjaa tai kirjailijaa..." />}
                            keyboardShouldPersistTaps="handled"
                        />
                    ) : (
                        <BookList
                            books={bookListItems as any}
                            mode="search"
                            scrollEnabled={true}
                            ListHeaderComponent={<SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Hae kirjaa tai kirjailijaa..." />}
                        />
                    )
                )
            ) : (
                // Finna Search UI
                <>
                    <SearchBar
                        query={finnaQuery}
                        setQuery={setFinnaQuery}
                        onSearch={() => searchFinna(finnaQuery)}
                        loading={finnaLoading}
                        placeholder="Hae Finnasta..."
                        value={finnaQuery}
                        onChangeText={setFinnaQuery}
                    />
                    <BookList
                        books={finnaResults}
                        toReadIds={toReadIds}
                        readIds={readIds}
                        onAdd={addBook}
                        onMarkAsRead={handleMarkAsRead}
                        onRateAndReview={handleRateAndReview}
                        mode="search"
                        scrollEnabled={true}
                    />
                </>
            )}

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
                            addBook({ ...selectedBookForReview, readOrListened }, 'read', finishedDate);
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

            {/* Options Modal for ABS Items */}
            <BookOptionsModal
                isVisible={isOptionsModalVisible}
                onClose={() => setIsOptionsModalVisible(false)}
                book={selectedBookForOptions}
                mode="search" // Treat as search/discovery
                toReadIds={toReadIds}
                readIds={readIds}
                onAdd={addBook}
                onRateAndReview={(book) => {
                    setIsOptionsModalVisible(false);
                    // Slight delay to allow modal to close?
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
        padding: 16, // Added padding to match HomeScreen
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center', // This centers the ScrollView horizontally
        padding: 20,
        backgroundColor: '#fff',
    },
    // ...
    scrollView: {
        width: '100%', // ScrollView must take full width of center container
    },
    formContent: {
        alignItems: 'center',
        width: '100%',
    },
    input: {
        width: '100%',
        marginBottom: 15,
        backgroundColor: 'white',
    },
    // ...
    message: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    header: {
        marginBottom: 16,
    },
    headerTop: {
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 0,
    },
    tabsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    libraryTabs: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    viewToggle: {
        marginLeft: 10,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
    },
    activeTab: {
        backgroundColor: '#636B2F',
    },
    tabText: {
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    listContent: {
        padding: 10,
    },
    bookItem: {
        flex: 1,
        margin: 5,
        marginBottom: 15,
        maxWidth: ITEM_WIDTH - 10,
    },
    bookItemWrapper: {
        flex: 1,
        maxWidth: ITEM_WIDTH,
    },
    coverContainer: {
        width: '100%',
        aspectRatio: 2 / 3,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 5,
        backgroundColor: '#eee',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    placeholderCover: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    bookAuthor: {
        fontSize: 12,
        color: '#888',
    },

    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center',
    },
    // ... (Styles)

    saveButton: {
        width: '100%',
        marginTop: 10,
        paddingVertical: 5,
    },
    placeholderTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#555',
        textAlign: 'center',
        padding: 4
    }
});
