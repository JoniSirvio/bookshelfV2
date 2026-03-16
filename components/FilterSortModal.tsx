import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, touchTargetMin, typography } from '../theme';
import BottomSheet from './BottomSheet';

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

    const insets = useSafeAreaInsets();

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
                        color={colors.white}
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

    const sortAndFilterBody = (
        <>
            <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>Järjestä</Text>
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
        </>
    );

    const filterContent = (
        <View style={[styles.modalContent, styles.modalContentSheet]}>
            <View style={styles.header}>
                <Text style={styles.title}>Järjestä ja Suodata</Text>
                <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeButton}
                    accessibilityLabel="Sulje"
                    accessibilityRole="button"
                >
                    <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            {sortAndFilterBody}

            <View style={styles.applyButtonWrap}>
                <TouchableOpacity
                    style={styles.applyButton}
                    onPress={handleApply}
                    accessibilityLabel="Käytä valitut järjestys- ja suodatusasetukset"
                    accessibilityRole="button"
                >
                    <Text style={styles.applyButtonText}>Käytä</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const sheetContent = (
        <View style={styles.sheetContainer}>
            <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={[styles.sheetScrollContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {filterContent}
            </ScrollView>
        </View>
    );

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            accessibilityLabel="Järjestä ja suodata"
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
        maxHeight: '80%',
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontFamily: typography.fontFamilyDisplay,
        color: colors.textPrimary,
    },
    closeButton: {
        minWidth: touchTargetMin,
        minHeight: touchTargetMin,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: typography.fontFamilyBody,
        fontWeight: '600',
        color: colors.textSecondaryAlt,
        marginTop: 8,
        marginBottom: 6,
    },
    sectionTitleFirst: {
        marginTop: 0,
    },
    listContainer: {
        marginBottom: 8,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    selectedOption: {
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderBottomWidth: 0,
        marginVertical: 2,
    },
    optionText: {
        fontSize: 16,
        fontFamily: typography.fontFamilyBody,
        color: colors.textPrimary,
    },
    selectedOptionText: {
        color: colors.white,
        fontFamily: typography.fontFamilyDisplay,
    },
    directionText: {
        fontSize: 12,
        fontFamily: typography.fontFamilyBody,
        color: colors.textLightOpacity,
        marginTop: 2,
    },
    pillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    pill: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    activePill: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    pillText: {
        fontFamily: typography.fontFamilyBody,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    activePillText: {
        fontFamily: typography.fontFamilyDisplay,
        color: colors.white,
    },
    applyButtonWrap: {
        paddingTop: 16,
    },
    applyButton: {
        backgroundColor: colors.primary,
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    applyButtonText: {
        color: colors.white,
        fontSize: 16,
        fontFamily: typography.fontFamilyDisplay,
    },
});
