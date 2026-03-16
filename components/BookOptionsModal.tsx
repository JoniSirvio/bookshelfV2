import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FinnaSearchResult } from '../api/finna';
import { BookCoverPlaceholder } from './BookCoverPlaceholder';
import { FormatBadge } from './FormatBadge';
import { useAudio } from '../context/AudioContext';
import { ABSItem } from '../api/abs';
import BottomSheet from './BottomSheet';
import { colors, touchTargetMin, typography } from '../theme';

type Mode = 'search' | 'home' | 'read' | 'recommendation';

interface BookOptionsModalProps {
    isVisible: boolean;
    onClose: () => void;
    book: FinnaSearchResult | null;
    mode: Mode;
    onMarkAsRead?: (book: FinnaSearchResult) => void;
    onTriggerDelete?: (book: FinnaSearchResult) => void;
    onAdd?: (book: FinnaSearchResult) => void;
    onStartReading?: (book: FinnaSearchResult) => void;
    showStartReading?: boolean;
    toReadIds?: string[];
    readIds?: string[];
    onRateAndReview?: (book: FinnaSearchResult) => void;
    onAskAI?: (book: FinnaSearchResult) => void;
}

const BookOptionsModal: React.FC<BookOptionsModalProps> = ({
    isVisible,
    onClose,
    book,
    mode,
    onMarkAsRead,
    onTriggerDelete,
    onAdd,
    onStartReading,
    showStartReading,
    toReadIds,
    readIds,
    onRateAndReview,
    onAskAI,
}) => {
    if (!book) return null;

    const isInToRead = toReadIds?.includes(book.id);
    const isInRead = readIds?.includes(book.id);
    const alreadyAdded = isInToRead || isInRead;

    const format = book.absProgress ? 'audiobook' : ((book as any).format || 'book');

    const { loadBook, openPlayer } = useAudio();

    const handleListen = async () => {
        if (format === 'audiobook') {
            await loadBook(book as unknown as ABSItem);
            openPlayer();
            onClose();
        }
    };

    const insets = useSafeAreaInsets();

    const headerBlock = (
        <View style={styles.header}>
            <View style={styles.headerImageContainer}>
                {book.images?.length ? (
                    <View style={styles.coverImageWrapper}>
                        <Image source={{ uri: book.images[0].url }} style={styles.headerCoverImage} />
                        <FormatBadge format={format} />
                    </View>
                ) : (
                    <View style={[styles.coverImageWrapper, { backgroundColor: colors.surfaceVariant }]}>
                        <BookCoverPlaceholder
                            id={book.id}
                            title={book.title}
                            authors={book.authors}
                            format={format}
                            compact={true}
                        />
                    </View>
                )}
            </View>

            <View style={styles.headerTextContent}>
                <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
                {book.authors && <Text style={styles.author} numberOfLines={1}>{book.authors.join(', ')}</Text>}
            </View>

            <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityLabel="Sulje"
                accessibilityRole="button"
            >
                <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
        </View>
    );

    const optionsBody = (
        <>
                    {/* Ask AI (all modes) */}
                    {onAskAI && (
                        <TouchableOpacity
                            style={styles.option}
                            onPress={() => {
                                onAskAI(book);
                                onClose();
                            }}
                        >
                            <MaterialCommunityIcons name="robot-outline" size={24} color={colors.primary} />
                            <Text style={styles.optionText}>Kysy AI:lta kirjasta</Text>
                        </TouchableOpacity>
                    )}

                    {/* Start Reading / Listening */}
                    {format === 'audiobook' ? (
                        <TouchableOpacity style={styles.option} onPress={handleListen}>
                            <MaterialCommunityIcons name="headphones" size={24} color={colors.textPrimary} />
                            <Text style={styles.optionText}>Aloita kuuntelu</Text>
                        </TouchableOpacity>
                    ) : (
                        showStartReading && onStartReading && (
                            <TouchableOpacity style={styles.option} onPress={() => { onStartReading(book); onClose(); }}>
                                <MaterialCommunityIcons name="book-open-page-variant" size={24} color={colors.textPrimary} />
                                <Text style={styles.optionText}>Aloita lukeminen</Text>
                            </TouchableOpacity>
                        )
                    )}

                    {/* Home Mode Actions */}
                    {mode === 'home' && (
                        <>
                            {onMarkAsRead && (
                                <TouchableOpacity style={styles.option} onPress={() => { onMarkAsRead(book); onClose(); }}>
                                    <MaterialCommunityIcons name="check-all" size={24} color={colors.primary} />
                                    <Text style={styles.optionText}>Lisää luetuksi{'\n'}(ilman arvostelua)</Text>
                                </TouchableOpacity>
                            )}
                            {onRateAndReview && (
                                <TouchableOpacity style={styles.option} onPress={() => { onRateAndReview(book); onClose(); }}>
                                    <MaterialCommunityIcons name="star-outline" size={24} color={colors.primary} />
                                    <Text style={styles.optionText}>Arvostele ja merkitse luetuksi</Text>
                                </TouchableOpacity>
                            )}
                            {onTriggerDelete && (
                                <TouchableOpacity style={styles.option} onPress={() => { onTriggerDelete(book); onClose(); }}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.delete} />
                                    <Text style={[styles.optionText, { color: colors.delete }]}>Poista hyllystä</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}

                    {/* Search Mode Actions */}
                    {mode === 'search' && onAdd && (
                        <>
                            {onMarkAsRead && !alreadyAdded && (
                                <TouchableOpacity style={styles.option} onPress={() => { onMarkAsRead(book); onClose(); }}>
                                    <MaterialCommunityIcons name="check-all" size={24} color={colors.primary} />
                                    <Text style={styles.optionText}>Lisää luetuksi{'\n'}(ilman arvostelua)</Text>
                                </TouchableOpacity>
                            )}

                            {onRateAndReview && !alreadyAdded && (
                                <TouchableOpacity style={styles.option} onPress={() => { onRateAndReview(book); onClose(); }}>
                                    <MaterialCommunityIcons name="star-outline" size={24} color={colors.primary} />
                                    <Text style={styles.optionText}>Arvostele ja merkitse luetuksi</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.option, alreadyAdded && styles.disabledOption]}
                                onPress={() => {
                                    if (!alreadyAdded) {
                                        onAdd(book);
                                        onClose();
                                    }
                                }}
                                disabled={alreadyAdded}
                            >
                                <MaterialCommunityIcons
                                    name={alreadyAdded ? "check" : "plus-circle-outline"}
                                    size={24}
                                    color={alreadyAdded ? colors.disabled : colors.primary}
                                />
                                <Text style={[styles.optionText, alreadyAdded && { color: colors.disabled }]}>
                                    {alreadyAdded ? "Hyllyssä" : "Lisää hyllyyn"}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Read Mode Actions */}
                    {mode === 'read' && onTriggerDelete && (
                        <TouchableOpacity style={styles.option} onPress={() => { onTriggerDelete(book); onClose(); }}>
                            <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.delete} />
                            <Text style={[styles.optionText, { color: colors.delete }]}>Poista historiasta</Text>
                        </TouchableOpacity>
                    )}
                    {/* Recommendation Mode Actions */}
                    {mode === 'recommendation' && (
                        <>
                            {onAdd && (
                                <TouchableOpacity style={styles.option} onPress={() => { onAdd(book); onClose(); }}>
                                    <MaterialCommunityIcons name="plus-circle-outline" size={24} color={colors.primary} />
                                    <Text style={styles.optionText}>Lisää hyllyyn</Text>
                                </TouchableOpacity>
                            )}
                            {onTriggerDelete && (
                                <TouchableOpacity style={styles.option} onPress={() => { onTriggerDelete(book); onClose(); }}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.delete} />
                                    <Text style={[styles.optionText, { color: colors.delete }]}>Poista suositus</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
        </>
    );

    const sheetContent = (
        <View style={[styles.modalContent, styles.modalContentSheet]}>
            {headerBlock}
            <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={[styles.sheetScrollContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
                showsVerticalScrollIndicator={false}
            >
                {optionsBody}
            </ScrollView>
        </View>
    );

    return (
        <BottomSheet
            visible={isVisible}
            onClose={onClose}
            accessibilityLabel={`Kirjan ${book.title} valinnat`}
        >
            {sheetContent}
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    modalContentSheet: {
        flex: 1,
        maxHeight: undefined,
        paddingBottom: 0,
    },
    sheetScroll: {
        flex: 1,
    },
    sheetScrollContent: {
        paddingBottom: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 15,
    },
    headerImageContainer: {
        marginRight: 15,
        shadowColor: colors.shadow,
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
    headerTextContent: {
        flex: 1,
        justifyContent: 'center',
        paddingTop: 4,
    },
    title: {
        fontSize: 18,
        fontFamily: typography.fontFamilyDisplay,
        color: colors.textPrimary,
        marginBottom: 4,
    },
    author: {
        fontSize: 14,
        fontFamily: typography.fontFamilyBody,
        color: colors.textSecondaryAlt,
    },
    closeButton: {
        marginLeft: 10,
        minWidth: touchTargetMin,
        minHeight: touchTargetMin,
        justifyContent: 'center',
        alignItems: 'center',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    disabledOption: {
        opacity: 0.6,
    },
    optionText: {
        fontSize: 16,
        fontFamily: typography.fontFamilyBody,
        marginLeft: 15,
        color: colors.textPrimary,
    },
});

export default BookOptionsModal;
