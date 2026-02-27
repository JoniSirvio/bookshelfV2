import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAIChat } from '../context/AIChatContext';
import { getAIChats, SavedAIChat } from '../firebase/aiChats';
import { BookCoverPlaceholder } from '../components/BookCoverPlaceholder';
import SearchBar from '../components/SearchBar';
import { colors } from '../theme';
import type { FinnaSearchResult } from '../api/finna';

export const GENERAL_CHAT_BOOK: FinnaSearchResult = {
    id: 'general',
    title: 'Yleinen keskustelu',
    authors: [],
};

function formatDate(updatedAt: { toDate?: () => Date }): string {
    const date = updatedAt?.toDate?.() ?? new Date();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const ts = date.getTime();
    if (ts >= startOfToday.getTime()) {
        return `Tänään ${date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (ts >= startOfYesterday.getTime() && ts < startOfToday.getTime()) {
        return 'Eilen';
    }
    return date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getChatSearchText(chat: SavedAIChat): string {
    const title = (chat.bookId.startsWith('general') && chat.conversationTitle?.trim())
        ? chat.conversationTitle
        : (chat.book?.title ?? '');
    const authors = (chat.book?.authors ?? []).join(' ');
    return `${title} ${authors}`.toLowerCase();
}

export default function AIChatListScreen() {
    const { user } = useAuth();
    const { openAIModal, isModalVisible } = useAIChat();
    const prevModalVisible = useRef(false);
    const [chats, setChats] = useState<SavedAIChat[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadChats = useCallback(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }
        setLoading(true);
        getAIChats(user.uid)
            .then(setChats)
            .catch(() => setChats([]))
            .finally(() => setLoading(false));
    }, [user?.uid]);

    useFocusEffect(
        useCallback(() => {
            loadChats();
        }, [loadChats])
    );

    useEffect(() => {
        if (prevModalVisible.current && !isModalVisible) {
            loadChats();
        }
        prevModalVisible.current = isModalVisible;
    }, [isModalVisible, loadChats]);

    const handlePress = (chat: SavedAIChat) => {
        const bookAsFinna: FinnaSearchResult = {
            id: chat.book.id,
            title: chat.book.title,
            authors: chat.book.authors,
            images: chat.book.images,
        };
        openAIModal(bookAsFinna, chat.messages);
    };

    const openGeneralChat = () => {
        const newBook: FinnaSearchResult = {
            id: `general-${Date.now()}`,
            title: 'Yleinen keskustelu',
            authors: [],
        };
        openAIModal(newBook, []);
    };

    const filteredChats = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return chats;
        return chats.filter((chat) => getChatSearchText(chat).includes(q));
    }, [chats, searchQuery]);

    if (!user) {
        return (
            <View style={styles.center}>
                <Text style={styles.emptyText}>Kirjaudu sisään nähdäksesi keskustelut.</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (chats.length === 0) {
        return (
            <View style={styles.screenWrap}>
                <View style={styles.center}>
                    <MaterialCommunityIcons name="message-text-outline" size={48} color={colors.textSecondaryAlt} />
                    <Text style={styles.emptyText}>Ei tallennettuja keskusteluja</Text>
                    <Text style={styles.emptySubtext}>Aloita keskustelu saadaksesi suosituksia tai kysyä kirjoista.</Text>
                </View>
                <TouchableOpacity style={styles.fab} onPress={openGeneralChat} activeOpacity={0.85}>
                    <MaterialCommunityIcons name="plus" size={28} color={colors.white} />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.screenWrap}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.searchRow}>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Hae keskusteluja..."
                    />
                </View>
                {filteredChats.map((chat) => (
                <TouchableOpacity
                    key={chat.bookId}
                    style={styles.card}
                    onPress={() => handlePress(chat)}
                    activeOpacity={0.65}
                >
                    <View style={styles.thumbnailWrap}>
                        {chat.bookId.startsWith('general') ? (
                            <MaterialCommunityIcons name="message-text-outline" size={28} color={colors.primary} />
                        ) : chat.book?.images?.[0]?.url ? (
                            <Image source={{ uri: chat.book.images[0].url }} style={styles.thumbnailImage} />
                        ) : (
                            <BookCoverPlaceholder
                                id={chat.book?.id ?? ''}
                                title={chat.book?.title ?? 'Keskustelu'}
                                authors={chat.book?.authors}
                                format="book"
                                compact
                            />
                        )}
                    </View>
                    <View style={styles.textBlock}>
                        <Text style={styles.title} numberOfLines={2}>
                            {(chat.bookId.startsWith('general') && chat.conversationTitle?.trim())
                                ? chat.conversationTitle
                                : (chat.book?.title ?? 'Keskustelu')}
                        </Text>
                        {(chat.book?.authors?.length ?? 0) > 0 && (
                            <Text style={styles.authors} numberOfLines={1}>{chat.book?.authors?.join(', ') ?? ''}</Text>
                        )}
                        <Text style={styles.date}>{formatDate(chat.updatedAt)}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondaryAlt} />
                </TouchableOpacity>
            ))}
            {filteredChats.length === 0 && chats.length > 0 && (
                <Text style={styles.noResults}>Ei tuloksia haulla</Text>
            )}
            </ScrollView>
            <TouchableOpacity style={styles.fab} onPress={openGeneralChat} activeOpacity={0.85}>
                <MaterialCommunityIcons name="plus" size={28} color={colors.white} />
            </TouchableOpacity>
        </View>
    );
}

const CARD_RADIUS = 10;
const THUMB_WIDTH = 52;
const THUMB_HEIGHT = Math.round(THUMB_WIDTH * (3 / 2));

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    content: {
        padding: 16,
        paddingBottom: 100,
    },
    screenWrap: {
        flex: 1,
        backgroundColor: colors.white,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: colors.white,
    },
    emptyText: {
        fontSize: 16,
        color: colors.textPrimary,
        textAlign: 'center',
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
    },
    emptyCtaWrap: {
        backgroundColor: '#FAFAFA',
        padding: 16,
        borderRadius: CARD_RADIUS,
        marginTop: 16,
    },
    searchRow: {
        marginTop: 12,
        marginBottom: 12,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    noResults: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 24,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 72,
        paddingVertical: 12,
        paddingHorizontal: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    thumbnailWrap: {
        width: THUMB_WIDTH,
        height: THUMB_HEIGHT,
        borderRadius: 6,
        overflow: 'hidden',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    textBlock: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    authors: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
    },
    date: {
        fontSize: 12,
        color: colors.textSecondaryAlt,
        marginTop: 4,
    },
});
