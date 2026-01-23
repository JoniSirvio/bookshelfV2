import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FinnaSearchResult } from '../api/finna';
import { BookCoverPlaceholder } from './BookCoverPlaceholder';
import { FormatBadge } from './FormatBadge';

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
}) => {
    if (!book) return null;

    const isInToRead = toReadIds?.includes(book.id);
    const isInRead = readIds?.includes(book.id);
    const alreadyAdded = isInToRead || isInRead;

    const format = book.absProgress ? 'audiobook' : ((book as any).format || 'book');

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        {/* Cover Image Wrapper */}
                        <View style={styles.headerImageContainer}>
                            {book.images?.length ? (
                                <View style={styles.coverImageWrapper}>
                                    <Image source={{ uri: book.images[0].url }} style={styles.headerCoverImage} />
                                    <FormatBadge format={format} />
                                </View>
                            ) : (
                                <View style={[styles.coverImageWrapper, { backgroundColor: '#eee' }]}>
                                    <BookCoverPlaceholder
                                        id={book.id}
                                        title={book.title}
                                        authors={book.authors}
                                        format={format}
                                        compact={true}
                                    />
                                    {/* Placeholder has its own badge logic often, but consistent badge overlay is fine too if placeholder doesn't double up or we want unified style. 
                                        Actually placeholder has it built-in. Let's rely on placeholder's own if no image, OR overlay our new badge. 
                                        Our new badge is better styled. Let's use our new badge on top if we want consistency, 
                                        BUT BookCoverPlaceholder already has one. Let's stick to just Image wrapper for now.
                                        Wait, BookList uses Placeholder when no image. 
                                        Let's just use our wrapper + image/placeholder pattern.
                                    */}
                                </View>
                            )}
                        </View>

                        <View style={styles.headerTextContent}>
                            <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
                            {book.authors && <Text style={styles.author} numberOfLines={1}>{book.authors.join(', ')}</Text>}
                        </View>

                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialCommunityIcons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {/* Start Reading */}
                    {showStartReading && onStartReading && (
                        <TouchableOpacity style={styles.option} onPress={() => { onStartReading(book); onClose(); }}>
                            <MaterialCommunityIcons name="book-open-page-variant" size={24} color="#333" />
                            <Text style={styles.optionText}>Aloita lukeminen</Text>
                        </TouchableOpacity>
                    )}

                    {/* Home Mode Actions */}
                    {mode === 'home' && (
                        <>
                            {onMarkAsRead && (
                                <TouchableOpacity style={styles.option} onPress={() => { onMarkAsRead(book); onClose(); }}>
                                    <MaterialCommunityIcons name="check-all" size={24} color="#636B2F" />
                                    <Text style={styles.optionText}>Lisää luetuksi{'\n'}(ilman arvostelua)</Text>
                                </TouchableOpacity>
                            )}
                            {onRateAndReview && (
                                <TouchableOpacity style={styles.option} onPress={() => { onRateAndReview(book); onClose(); }}>
                                    <MaterialCommunityIcons name="star-outline" size={24} color="#636B2F" />
                                    <Text style={styles.optionText}>Arvostele ja merkitse luetuksi</Text>
                                </TouchableOpacity>
                            )}
                            {onTriggerDelete && (
                                <TouchableOpacity style={styles.option} onPress={() => { onTriggerDelete(book); onClose(); }}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={24} color="#d9534f" />
                                    <Text style={[styles.optionText, { color: '#d9534f' }]}>Poista hyllystä</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}

                    {/* Search Mode Actions */}
                    {mode === 'search' && onAdd && (
                        <>
                            {onMarkAsRead && !alreadyAdded && (
                                <TouchableOpacity style={styles.option} onPress={() => { onMarkAsRead(book); onClose(); }}>
                                    <MaterialCommunityIcons name="check-all" size={24} color="#636B2F" />
                                    <Text style={styles.optionText}>Lisää luetuksi{'\n'}(ilman arvostelua)</Text>
                                </TouchableOpacity>
                            )}

                            {onRateAndReview && !alreadyAdded && (
                                <TouchableOpacity style={styles.option} onPress={() => { onRateAndReview(book); onClose(); }}>
                                    <MaterialCommunityIcons name="star-outline" size={24} color="#636B2F" />
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
                                    color={alreadyAdded ? "#9E9E9E" : "#636B2F"}
                                />
                                <Text style={[styles.optionText, alreadyAdded && { color: '#9E9E9E' }]}>
                                    {alreadyAdded ? "Hyllyssä" : "Lisää hyllyyn"}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Read Mode Actions */}
                    {mode === 'read' && onTriggerDelete && (
                        <TouchableOpacity style={styles.option} onPress={() => { onTriggerDelete(book); onClose(); }}>
                            <MaterialCommunityIcons name="trash-can-outline" size={24} color="#d9534f" />
                            <Text style={[styles.optionText, { color: '#d9534f' }]}>Poista historiasta</Text>
                        </TouchableOpacity>
                    )}
                    {/* Recommendation Mode Actions */}
                    {mode === 'recommendation' && (
                        <>
                            {onAdd && (
                                <TouchableOpacity style={styles.option} onPress={() => { onAdd(book); onClose(); }}>
                                    <MaterialCommunityIcons name="plus-circle-outline" size={24} color="#636B2F" />
                                    <Text style={styles.optionText}>Lisää hyllyyn</Text>
                                </TouchableOpacity>
                            )}
                            {onTriggerDelete && (
                                <TouchableOpacity style={styles.option} onPress={() => { onTriggerDelete(book); onClose(); }}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={24} color="#d9534f" />
                                    <Text style={[styles.optionText, { color: '#d9534f' }]}>Poista suositus</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}

                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 15,
    },
    headerImageContainer: {
        marginRight: 15,
        /* Add shadow for depth */
        shadowColor: "#000",
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
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    author: {
        fontSize: 14,
        color: '#666',
    },
    closeButton: {
        marginLeft: 10,
        padding: 4,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    disabledOption: {
        opacity: 0.6,
    },
    optionText: {
        fontSize: 16,
        marginLeft: 15,
        color: '#333',
    },
});

export default BookOptionsModal;
