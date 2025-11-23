import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface BookOptionsModalProps {
    isVisible: boolean;
    onClose: () => void;
    onStartReading?: () => void;
    bookTitle: string;
    showStartReading: boolean;
}

const BookOptionsModal: React.FC<BookOptionsModalProps> = ({
    isVisible,
    onClose,
    onStartReading,
    bookTitle,
    showStartReading,
}) => {
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
                        <Text style={styles.title} numberOfLines={1}>{bookTitle}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {showStartReading && onStartReading && (
                        <TouchableOpacity style={styles.option} onPress={onStartReading}>
                            <MaterialCommunityIcons name="book-open-page-variant" size={24} color="#333" />
                            <Text style={styles.optionText}>Aloita lukeminen</Text>
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
        minHeight: 200,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
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
        borderBottomColor: '#eee',
    },
    optionText: {
        fontSize: 16,
        marginLeft: 15,
        color: '#333',
    },
});

export default BookOptionsModal;
