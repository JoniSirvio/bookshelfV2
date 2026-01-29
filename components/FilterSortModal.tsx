import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

export type SortOption = 'added' | 'title' | 'author' | 'year' | 'duration';
export type SortDirection = 'asc' | 'desc';
export type StatusFilter = 'all' | 'unread' | 'in-progress' | 'finished';

interface FilterSortModalProps {
    visible: boolean;
    onClose: () => void;
    currentSort: SortOption;
    currentDirection: SortDirection;
    currentStatus: StatusFilter;
    onApply: (sort: SortOption, direction: SortDirection, status: StatusFilter) => void;
}

export const FilterSortModal: React.FC<FilterSortModalProps> = ({
    visible,
    onClose,
    currentSort,
    currentDirection,
    currentStatus,
    onApply,
}) => {
    const [sort, setSort] = React.useState<SortOption>(currentSort);
    const [direction, setDirection] = React.useState<SortDirection>(currentDirection);
    const [status, setStatus] = React.useState<StatusFilter>(currentStatus);

    // Reset local state when modal opens
    React.useEffect(() => {
        if (visible) {
            setSort(currentSort);
            setDirection(currentDirection);
            setStatus(currentStatus);
        }
    }, [visible, currentSort, currentDirection, currentStatus]);

    const handleApply = () => {
        onApply(sort, direction, status);
        onClose();
    };

    const getDirectionLabel = (option: SortOption, dir: SortDirection) => {
        switch (option) {
            case 'added':
                return dir === 'desc' ? 'Uudet ensin' : 'Vanhimmat ensin';
            case 'title':
            case 'author':
                return dir === 'asc' ? 'A-Ö' : 'Ö-A';
            case 'year':
                return dir === 'desc' ? 'Uusin ensin' : 'Vanhin ensin';
            case 'duration':
                return dir === 'desc' ? 'Pisin ensin' : 'Lyhyin ensin';
        }
    };

    const SortItem = ({ label, value }: { label: string, value: SortOption }) => {
        const isSelected = sort === value;
        return (
            <TouchableOpacity
                style={[styles.optionItem, isSelected && styles.selectedOption]}
                onPress={() => {
                    if (isSelected) {
                        setDirection(direction === 'asc' ? 'desc' : 'asc');
                    } else {
                        setSort(value);
                        // Default directions
                        if (value === 'added' || value === 'year' || value === 'duration') setDirection('desc');
                        else setDirection('asc');
                    }
                }}
            >
                <View>
                    <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
                        {label}
                    </Text>
                    {isSelected && (
                        <Text style={styles.directionText}>
                            {getDirectionLabel(value, direction)}
                        </Text>
                    )}
                </View>
                {isSelected && (
                    <MaterialCommunityIcons
                        name={direction === 'asc' ? 'sort-ascending' : 'sort-descending'}
                        size={20}
                        color={colors.primary}
                    />
                )}
            </TouchableOpacity>
        );
    };

    const StatusItem = ({ label, value }: { label: string, value: StatusFilter }) => (
        <TouchableOpacity
            style={[styles.pill, status === value && styles.activePill]}
            onPress={() => setStatus(value)}
        >
            <Text style={[styles.pillText, status === value && styles.activePillText]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal
            transparent
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            <View style={styles.header}>
                                <Text style={styles.title}>Järjestä ja Suodata</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.sectionTitle}>Järjestä</Text>
                            <View style={styles.listContainer}>
                                <SortItem label="Lisätty" value="added" />
                                <SortItem label="Nimi" value="title" />
                                <SortItem label="Kirjailija" value="author" />
                                <SortItem label="Julkaisuvuosi" value="year" />
                                <SortItem label="Kesto / Pituus" value="duration" />
                            </View>

                            <Text style={styles.sectionTitle}>Tila</Text>
                            <View style={styles.pillsContainer}>
                                <StatusItem label="Kaikki" value="all" />
                                <StatusItem label="Ei aloitettu" value="unread" />
                                <StatusItem label="Kesken" value="in-progress" />
                                <StatusItem label="Luettu" value="finished" />
                            </View>

                            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                                <Text style={styles.applyButtonText}>Käytä</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondaryAlt,
        marginTop: 10,
        marginBottom: 10,
    },
    listContainer: {
        marginBottom: 20,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedOption: {
        backgroundColor: colors.bgRec,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderBottomWidth: 0,
        marginVertical: 2,
    },
    optionText: {
        fontSize: 16,
        color: colors.textPrimary,
    },
    selectedOptionText: {
        color: colors.primary,
        fontWeight: 'bold',
    },
    directionText: {
        fontSize: 12,
        color: colors.primary,
        marginTop: 2,
    },
    pillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 30,
    },
    pill: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#eee',
    },
    activePill: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    pillText: {
        color: colors.textSecondaryAlt,
        fontWeight: '500',
    },
    activePillText: {
        color: colors.white,
        fontWeight: 'bold',
    },
    applyButton: {
        backgroundColor: colors.primary,
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    applyButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
