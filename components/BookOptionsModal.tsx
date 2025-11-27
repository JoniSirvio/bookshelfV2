import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FinnaSearchResult } from '../api/finna';

type Mode = 'search' | 'home' | 'read';

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
}) => {
    if (!book) return null;

    const isInToRead = toReadIds?.includes(book.id);
    const isInRead = readIds?.includes(book.id);
    const alreadyAdded = isInToRead || isInRead;

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
                        <Text style={styles.title} numberOfLines={1}>{book.title}</Text>
                        <TouchableOpacity onPress={onClose}>
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
                                    <Text style={styles.optionText}>Merkitse luetuksi</Text>
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
                    )}

                    {/* Read Mode Actions */}
                    {mode === 'read' && onTriggerDelete && (
                        <TouchableOpacity style={styles.option} onPress={() => { onTriggerDelete(book); onClose(); }}>
                            <MaterialCommunityIcons name="trash-can-outline" size={24} color="#d9534f" />
                            <Text style={[styles.optionText, { color: '#d9534f' }]}>Poista historiasta</Text>
                        </TouchableOpacity>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 15,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 10,
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
