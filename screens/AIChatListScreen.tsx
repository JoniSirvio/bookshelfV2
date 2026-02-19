import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAIChat } from '../context/AIChatContext';
import { getAIChats, SavedAIChat } from '../firebase/aiChats';
import { colors } from '../theme';
import type { FinnaSearchResult } from '../api/finna';

function formatDate(updatedAt: { toDate?: () => Date }): string {
    const date = updatedAt?.toDate?.() ?? new Date();
    return date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AIChatListScreen() {
    const { user } = useAuth();
    const { openAIModal } = useAIChat();
    const [chats, setChats] = useState<SavedAIChat[]>([]);
    const [loading, setLoading] = useState(true);

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
        openAIModal(bookAsFinna, chat.messages);
    };

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
            <View style={styles.center}>
                <MaterialCommunityIcons name="message-text-outline" size={48} color={colors.textSecondaryAlt} />
                <Text style={styles.emptyText}>Ei tallennettuja keskusteluja</Text>
                <Text style={styles.emptySubtext}>Kysy kirjoista AI:lta kirjojen kohdalta – keskustelut tallentuvat tänne.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {chats.map((chat) => (
                <TouchableOpacity
                    key={chat.bookId}
                    style={styles.row}
                    onPress={() => handlePress(chat)}
                    activeOpacity={0.7}
                >
                    <View style={styles.textBlock}>
                        <Text style={styles.title} numberOfLines={2}>{chat.book.title}</Text>
                        {chat.book.authors?.length > 0 && (
                            <Text style={styles.authors} numberOfLines={1}>{chat.book.authors.join(', ')}</Text>
                        )}
                        <Text style={styles.date}>{formatDate(chat.updatedAt)}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondaryAlt} />
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    content: {
        padding: 16,
        paddingBottom: 24,
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
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    textBlock: {
        flex: 1,
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
