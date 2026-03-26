import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import SwipeableItem, { OpenDirection } from 'react-native-swipeable-item';
import { useAuth } from '../context/AuthContext';
import { deleteAIChat, getAIChats, SavedAIChat } from '../firebase/aiChats';
import { BookCoverPlaceholder } from '../components/BookCoverPlaceholder';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import SearchBar from '../components/SearchBar';
import { colors, typography } from '../theme';
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
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const [chats, setChats] = useState<SavedAIChat[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [chatPendingDelete, setChatPendingDelete] = useState<SavedAIChat | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const rowRefs = useRef<Record<string, SwipeableItem<SavedAIChat> | null>>({});

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

    const handlePress = (chat: SavedAIChat) => {
        const bookAsFinna: FinnaSearchResult = {
            id: chat.book.id,
            title: chat.book.title,
            authors: chat.book.authors,
            images: chat.book.images,
        };
        navigation.navigate('AskAIBook', { book: bookAsFinna, initialConversation: chat.messages });
    };

    const openGeneralChat = () => {
        const newBook: FinnaSearchResult = {
            id: `general-${Date.now()}`,
            title: 'Yleinen keskustelu',
            authors: [],
        };
        navigation.navigate('AskAIBook', { book: newBook, initialConversation: [] });
    };

    const filteredChats = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return chats;
        return chats.filter((chat) => getChatSearchText(chat).includes(q));
    }, [chats, searchQuery]);

    const closeAllRows = () => {
        Object.values(rowRefs.current).forEach((rowRef) => rowRef?.close());
    };

    const openDeleteModal = (chat: SavedAIChat) => {
        closeAllRows();
        setChatPendingDelete(chat);
    };

    const closeDeleteModal = () => {
        if (isDeleting) return;
        setChatPendingDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!user?.uid || !chatPendingDelete) return;
        setIsDeleting(true);
        try {
            await deleteAIChat(user.uid, chatPendingDelete.bookId);
            setChats((prev) => prev.filter((chat) => chat.bookId !== chatPendingDelete.bookId));
            setChatPendingDelete(null);
        } catch (error) {
            console.warn('Failed to delete AI chat:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const renderTopBar = () => (
        <SafeAreaView edges={['top']} style={styles.topBarSafeArea}>
            <View style={styles.topBar}>
                <View style={styles.topBarLeftSlot}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        accessibilityRole="button"
                        accessibilityLabel="Takaisin"
                        style={styles.backButton}
                    >
                        <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.topBarTitle} numberOfLines={1}>AI-keskustelut</Text>
                <View style={styles.topBarRightSlot} />
            </View>
        </SafeAreaView>
    );

    if (!user) {
        return (
            <View style={styles.screenWrap}>
                {renderTopBar()}
                <View style={styles.center}>
                    <Text style={styles.emptyText}>Kirjaudu sisään nähdäksesi keskustelut.</Text>
                </View>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.screenWrap}>
                {renderTopBar()}
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    if (chats.length === 0) {
        return (
            <View style={styles.screenWrap}>
                {renderTopBar()}
                <View style={styles.center}>
                    <MaterialCommunityIcons name="message-text-outline" size={56} color={colors.textSecondaryAlt} />
                    <Text style={styles.emptyText}>Ei tallennettuja keskusteluja</Text>
                    <Text style={styles.emptySubtext}>
                        Täällä näet AI-keskustelusi kirjoista. Kysy suosituksia, kuvauksia tai oma kysymyksesi – vastaukset tallentuvat tänne.
                    </Text>
                    <Text style={styles.emptyCtaHint}>Aloita painamalla alla olevaa painiketta.</Text>
                </View>
                <TouchableOpacity
                    style={styles.fab}
                    onPress={openGeneralChat}
                    activeOpacity={0.85}
                    accessibilityLabel="Aloita uusi keskustelu"
                    accessibilityRole="button"
                >
                    <MaterialCommunityIcons name="plus" size={28} color={colors.white} />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.screenWrap}>
            {renderTopBar()}
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.searchRow}>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Hae keskusteluja..."
                    />
                </View>
                {filteredChats.map((chat) => (
                    <View key={chat.bookId} style={styles.swipeItem}>
                        <SwipeableItem
                            ref={(ref) => {
                                rowRefs.current[chat.bookId] = ref;
                            }}
                            item={chat}
                            renderUnderlayRight={() => (
                                <View style={styles.underlayRight}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={30} color={colors.white} />
                                    <Text style={styles.actionText}>Poista</Text>
                                </View>
                            )}
                            snapPointsLeft={[]}
                            snapPointsRight={[150]}
                            onChange={(params) => {
                                if (params.openDirection === OpenDirection.RIGHT) {
                                    openDeleteModal(chat);
                                }
                            }}
                            activationThreshold={20}
                        >
                            <TouchableOpacity
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
                        </SwipeableItem>
                    </View>
                ))}
            {filteredChats.length === 0 && chats.length > 0 && (
                <Text style={styles.noResults}>Ei tuloksia haulla</Text>
            )}
            </ScrollView>
            <TouchableOpacity style={styles.fab} onPress={openGeneralChat} activeOpacity={0.85}>
                <MaterialCommunityIcons name="plus" size={28} color={colors.white} />
            </TouchableOpacity>
            <ConfirmDeleteModal
                isVisible={chatPendingDelete != null}
                onClose={closeDeleteModal}
                onConfirm={handleConfirmDelete}
                bookTitle={chatPendingDelete?.book?.title ?? 'Keskustelu'}
                message={`Haluatko varmasti poistaa tallennetun keskustelun "${(chatPendingDelete?.bookId.startsWith('general') && chatPendingDelete?.conversationTitle?.trim()) ? chatPendingDelete.conversationTitle : (chatPendingDelete?.book?.title ?? 'Keskustelu')}"?`}
                confirmButtonLabel={isDeleting ? 'Poistetaan...' : 'Vahvista poisto'}
                accessibilityLabel="Poista AI-keskustelu"
            />
        </View>
    );
}

const CARD_RADIUS = 10;
const THUMB_WIDTH = 52;
const THUMB_HEIGHT = Math.round(THUMB_WIDTH * (3 / 2));

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    content: {
        padding: 16,
        paddingBottom: 100,
    },
    screenWrap: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    topBarSafeArea: {
        backgroundColor: colors.primary,
    },
    topBar: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        backgroundColor: colors.primary,
    },
    topBarLeftSlot: {
        width: 44,
        alignItems: 'flex-start',
    },
    topBarRightSlot: {
        width: 44,
        alignItems: 'flex-end',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topBarTitle: {
        flex: 1,
        textAlign: 'center',
        fontFamily: typography.fontFamilyDisplay,
        fontSize: 18,
        fontWeight: '700',
        color: colors.white,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: colors.surface,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: typography.fontFamilyBody,
        color: colors.textPrimary,
        textAlign: 'center',
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 14,
        fontFamily: typography.fontFamilyBody,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
    },
    emptyCtaHint: {
        fontSize: 13,
        fontFamily: typography.fontFamilyBody,
        color: colors.textSecondaryAlt,
        textAlign: 'center',
        marginTop: 12,
    },
    emptyCtaWrap: {
        backgroundColor: colors.surfaceVariant,
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
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    noResults: {
        fontSize: 14,
        fontFamily: typography.fontFamilyBody,
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
        backgroundColor: colors.surface,
    },
    swipeItem: {
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        overflow: 'hidden',
    },
    underlayRight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.delete,
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingLeft: 20,
        gap: 2,
    },
    actionText: {
        color: colors.white,
        fontFamily: typography.fontFamilyBody,
        fontSize: 14,
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
        fontFamily: typography.fontFamilyBody,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    authors: {
        fontSize: 14,
        fontFamily: typography.fontFamilyBody,
        color: colors.textSecondary,
        marginTop: 2,
    },
    date: {
        fontSize: 12,
        fontFamily: typography.fontFamilyBody,
        color: colors.textSecondaryAlt,
        marginTop: 4,
    },
});
