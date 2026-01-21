import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Alert, TextInput as NativeTextInput } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useABSCredentials } from '../hooks/useABSCredentials';
import { fetchABSLibraries, fetchABSLibraryItems, getABSCoverUrl, loginToABS, ABSItem, ABSLibrary } from '../api/abs';
import { BookList } from '../components/BookList'; // Import BookList
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

export default function ABSLibraryScreen() {
    const { url, token, loading: credsLoading } = useABSCredentials();
    const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const { myBooks, readBooks } = useBooksContext();
    const { user } = useAuth();
    const [inputUrl, setInputUrl] = useState('');
    const [inputUsername, setInputUsername] = useState('');
    const [inputPassword, setInputPassword] = useState('');
    const [savingCreds, setSavingCreds] = useState(false);

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

    const renderItem = ({ item }: { item: ABSItem }) => {
        if (!url || !token) return null;
        const coverUrl = getABSCoverUrl(url, token, item.id);

        return (
            <View style={styles.bookItem}>
                <View style={styles.coverContainer}>
                    {item.media.coverPath ? (
                        <Image
                            source={{ uri: coverUrl }}
                            style={styles.coverImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.coverImage, styles.placeholderCover]}>
                            <MaterialCommunityIcons name="book-open-page-variant" size={30} color="#ccc" />
                        </View>
                    )}
                </View>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.media.metadata.title}</Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>{item.media.metadata.authorName}</Text>
            </View>
        );
    };

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

    // Filter items based on search query
    const filteredItems = items?.filter(item => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const title = item.media.metadata.title?.toLowerCase() || '';
        const author = item.media.metadata.authorName?.toLowerCase() || '';
        const authors = item.media.metadata.authors?.map(a => a.name.toLowerCase()).join(' ') || '';
        return title.includes(q) || author.includes(q) || authors.includes(q);
    }) || [];

    // Adapter for BookList
    const bookListItems = filteredItems.map(item => ({
        id: item.id,
        title: item.media.metadata.title,
        authors: item.media.metadata.authors?.map(a => a.name) || [item.media.metadata.authorName || 'Tuntematon'],
        images: item.media.coverPath ? [{ url: getABSCoverUrl(url!, token!, item.id) }] : [],
        publicationYear: item.media.metadata.publishedYear, // Assuming prop exists or optional
        description: item.media.metadata.description
    }));

    const toReadIds = myBooks.map(b => b.id);
    const readIds = readBooks.map(b => b.id);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Audiobookshelf</Text>
                </View>

                <View style={styles.tabsRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.libraryTabs}>
                        {libraries?.map(lib => (
                            <TouchableOpacity
                                key={lib.id}
                                style={[styles.tab, selectedLibraryId === lib.id && styles.activeTab]}
                                onPress={() => setSelectedLibraryId(lib.id)}
                            >
                                <Text style={[styles.tabText, selectedLibraryId === lib.id && styles.activeTabText]}>
                                    {lib.name}
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
                </View>
            </View>

            {itemsLoading && !items ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#636B2F" /></View>
            ) : (
                viewMode === 'grid' ? (
                    <FlashList
                        data={filteredItems}
                        renderItem={renderItem}
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
            )}
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
    input: {
        width: '100%',
        marginBottom: 15,
        backgroundColor: 'white',
    },
    saveButton: {
        width: '100%',
        marginTop: 10,
        paddingVertical: 5,
    },
});
