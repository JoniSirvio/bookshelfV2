import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard,
    Image,
    TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FinnaSearchResult } from '../api/finna';
import { chatAboutBook, ChatMessage, BookChatMode } from '../api/gemini';
import { useBooksContext } from '../context/BooksContext';
import { BookCoverPlaceholder } from './BookCoverPlaceholder';
import { FormatBadge } from './FormatBadge';
import Markdown from 'react-native-markdown-display';
import { colors, loaderColor } from '../theme';

interface AskAIAboutBookModalProps {
    isVisible: boolean;
    onClose: () => void;
    book: FinnaSearchResult | null;
}

const markdownStyles = StyleSheet.create({
    body: {
        color: colors.textPrimary,
        fontSize: 14,
        lineHeight: 22,
        flex: 1,
        alignSelf: 'stretch',
    },
    paragraph: { marginTop: 0, marginBottom: 8 },
    strong: { fontWeight: 'bold', color: colors.textPrimary },
    em: { fontStyle: 'italic', color: colors.textPrimary },
    text: { color: colors.textPrimary },
    bullet_list: { marginBottom: 8 },
    bullet_list_icon: { color: colors.primary, marginLeft: 2, marginRight: 8, fontSize: 14 },
    bullet_list_content: { flex: 1 },
    ordered_list: { marginBottom: 8 },
    ordered_list_icon: { color: colors.primary, marginLeft: 2, marginRight: 8, fontSize: 14 },
    list_item: { marginBottom: 6 },
    heading1: { fontSize: 17, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 6, marginTop: 4 },
    heading2: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4, marginTop: 2 },
    heading3: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 4, marginTop: 2 },
    blockquote: {
        backgroundColor: 'rgba(99, 107, 47, 0.08)',
        borderLeftColor: colors.primary,
        borderLeftWidth: 4,
        paddingLeft: 12,
        paddingVertical: 8,
        marginVertical: 8,
        borderRadius: 0,
    },
    code_inline: {
        backgroundColor: 'rgba(0,0,0,0.07)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: 13,
        color: colors.textPrimary,
    },
});

const MODES: { key: BookChatMode; label: string; icon: string }[] = [
    { key: 'description', label: 'Kuvaus', icon: 'text-box-outline' },
    { key: 'goodfit', label: 'Sopiiko minulle?', icon: 'account-check-outline' },
    { key: 'custom', label: 'Oma kysymykseni', icon: 'message-question-outline' },
];

const AskAIAboutBookModal: React.FC<AskAIAboutBookModalProps> = ({
    isVisible,
    onClose,
    book,
}) => {
    const { readBooks } = useBooksContext();
    const [mode, setMode] = useState<BookChatMode>('description');
    const [conversation, setConversation] = useState<ChatMessage[]>([]);
    const [userQuestion, setUserQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const readBooksTitles = readBooks.map(b => `${b.title} by ${(b.authors || []).join(', ')}`);
    const isFirstTurn = conversation.length === 0;
    const canSendFirst = isFirstTurn && (mode !== 'custom' || userQuestion.trim().length > 0);
    const canSendFollowUp = !isFirstTurn && userQuestion.trim().length > 0;
    const canSend = canSendFirst || canSendFollowUp;

    const handleAsk = async () => {
        if (!book || !canSend) return;
        setLoading(true);
        setError(null);
        const currentQuestion = userQuestion.trim();
        if (!isFirstTurn) setUserQuestion('');

        try {
            const authors = Array.isArray(book.authors) ? book.authors : (book.authors ? [String(book.authors)] : []);
            const { response, newHistory } = await chatAboutBook(
                { title: book.title, authors },
                {
                    mode,
                    readBooksTitles: mode === 'goodfit' ? readBooksTitles : undefined,
                    userMessage: isFirstTurn ? (mode === 'custom' ? currentQuestion : undefined) : currentQuestion,
                },
                conversation
            );
            setConversation(newHistory);
            setUserQuestion('');
        } catch (e) {
            setError('Vastaus epäonnistui. Tarkista verkko ja kokeile uudelleen.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setUserQuestion('');
        setConversation([]);
        setError(null);
        setLoading(false);
        setMode('description');
        onClose();
    };

    if (!book) return null;

    const authors = Array.isArray(book.authors) ? book.authors : (book.authors ? [String(book.authors)] : []);
    const authorsStr = authors.length ? authors.join(', ') : ((book as { authorName?: string }).authorName || '');
    const format = ((book as FinnaSearchResult).absProgress ? 'audiobook' : ((book as { format?: string }).format || 'book')) as 'book' | 'audiobook' | 'ebook';
    const coverUrl = book.images?.[0]?.url;

    const inputPlaceholder = isFirstTurn
        ? (mode === 'custom' ? 'Kirjoita kysymyksesi kirjasta...' : 'Voit kirjoittaa lisäkysymyksen (valinnainen)')
        : 'Kysy lisää tai kirjoita uusi kysymys...';

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.overlayTouchable} />
                </TouchableWithoutFeedback>
                <View style={styles.content}>
                        <View style={styles.header}>
                            <View style={styles.headerImageContainer}>
                                {coverUrl ? (
                                    <View style={styles.coverImageWrapper}>
                                        <Image source={{ uri: coverUrl }} style={styles.headerCoverImage} />
                                        <FormatBadge format={format} />
                                    </View>
                                ) : (
                                    <View style={[styles.coverImageWrapper, { backgroundColor: '#eee' }]}>
                                        <BookCoverPlaceholder
                                            id={book.id}
                                            title={book.title}
                                            authors={authors}
                                            format={format}
                                            compact={true}
                                        />
                                    </View>
                                )}
                            </View>
                            <View style={styles.headerText}>
                                <Text style={styles.headerTitle} numberOfLines={2}>{book.title}</Text>
                                {authorsStr ? <Text style={styles.author} numberOfLines={1}>{authorsStr}</Text> : null}
                            </View>
                            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modeLabel}>Mitä haluat kysyä?</Text>
                        <View style={styles.modeRow}>
                            {MODES.map((m) => (
                                <TouchableOpacity
                                    key={m.key}
                                    style={[styles.modePill, mode === m.key && styles.modePillActive]}
                                    onPress={() => { setMode(m.key); setConversation([]); setError(null); }}
                                    disabled={loading}
                                >
                                    <MaterialCommunityIcons
                                        name={m.icon as any}
                                        size={18}
                                        color={mode === m.key ? colors.white : colors.textSecondaryAlt}
                                    />
                                    <Text style={[styles.modePillText, mode === m.key && styles.modePillTextActive]} numberOfLines={1}>
                                        {m.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {conversation.length > 0 ? (
                            <ScrollView
                                style={styles.conversationContainer}
                                contentContainerStyle={styles.conversationContent}
                                showsVerticalScrollIndicator={true}
                                nestedScrollEnabled
                                keyboardShouldPersistTaps="handled"
                            >
                                {conversation.map((msg, i) => (
                                    <View
                                        key={i}
                                        style={[styles.messageBubble, msg.role === 'user' ? styles.messageUser : styles.messageModel]}
                                    >
                                        {msg.role === 'model' && (
                                            <MaterialCommunityIcons name="robot-outline" size={16} color={colors.primary} style={styles.messageIcon} />
                                        )}
                                        {msg.role === 'model' ? (
                                            <View style={styles.messageMarkdownWrap}>
                                                <Markdown
                                                    key={`ai-${i}`}
                                                    style={markdownStyles}
                                                    mergeStyle={true}
                                                >
                                                    {String(msg.text ?? '')}
                                                </Markdown>
                                            </View>
                                        ) : (
                                            <Text style={[styles.messageText, styles.messageTextUser]}>
                                                {msg.text}
                                            </Text>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.hint}>
                                {mode === 'description' && 'AI tuottaa lyhyen kuvauksen kirjasta ilman spoilereita.'}
                                {mode === 'goodfit' && 'AI vertaa kirjaa lukemaasi historiaan ja arvioi sopivuuden.'}
                                {mode === 'custom' && 'Kirjoita oma kysymyksesi kirjasta.'}
                            </Text>
                        )}

                        {error ? (
                            <View style={styles.errorBox}>
                                <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.delete} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <TextInput
                            style={styles.promptInput}
                            placeholder={inputPlaceholder}
                            placeholderTextColor="#999"
                            value={userQuestion}
                            onChangeText={setUserQuestion}
                            editable={!loading}
                            multiline
                        />

                        <TouchableOpacity
                            style={[styles.askButton, (loading || !canSend) && styles.askButtonDisabled]}
                            onPress={handleAsk}
                            disabled={loading || !canSend}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color={colors.white} />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="robot-outline" size={22} color={colors.white} />
                                    <Text style={styles.askButtonText}>
                                        {isFirstTurn ? 'Kysy AI:lta' : 'Lähetä'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    overlayTouchable: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    content: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 32,
        height: '92%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    headerImageContainer: {
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3.84,
        elevation: 5,
    },
    coverImageWrapper: {
        width: 60,
        height: 90,
        borderRadius: 4,
        overflow: 'hidden',
    },
    headerCoverImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    headerText: {
        flex: 1,
        justifyContent: 'center',
        paddingTop: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    author: {
        fontSize: 14,
        color: colors.textSecondaryAlt,
    },
    closeButton: {
        padding: 4,
    },
    modeLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    modeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
    },
    modePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    modePillActive: {
        backgroundColor: colors.primary,
    },
    modePillText: {
        fontSize: 13,
        color: colors.textSecondaryAlt,
        maxWidth: 100,
    },
    modePillTextActive: {
        color: colors.white,
        fontWeight: '600',
    },
    hint: {
        fontSize: 13,
        color: colors.textSecondaryAlt,
        marginBottom: 12,
    },
    conversationContainer: {
        flex: 1,
        minHeight: 280,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        padding: 10,
    },
    conversationContent: {
        paddingBottom: 16,
        flexGrow: 1,
    },
    messageBubble: {
        marginBottom: 10,
        padding: 10,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    messageUser: {
        backgroundColor: colors.bgTint,
        alignSelf: 'flex-end',
        maxWidth: '90%',
    },
    messageModel: {
        backgroundColor: colors.bgRec,
        alignSelf: 'flex-start',
        maxWidth: '95%',
    },
    messageIcon: {
        marginRight: 6,
        marginTop: 2,
    },
    messageMarkdownWrap: {
        flex: 1,
    },
    messageText: {
        flex: 1,
        fontSize: 14,
        color: colors.textPrimary,
        lineHeight: 20,
    },
    messageTextUser: {
        color: colors.textPrimary,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.bgRec,
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: colors.delete,
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        color: colors.textPrimary,
    },
    promptInput: {
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: colors.textPrimary,
        marginBottom: 12,
        minHeight: 48,
        textAlignVertical: 'top',
    },
    askButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 8,
    },
    askButtonDisabled: {
        opacity: 0.6,
    },
    askButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.white,
    },
});

export default AskAIAboutBookModal;
