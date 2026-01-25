import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ViewMode = 'list' | 'grid';

/**
 * Custom hook to manage and persist view mode (list/grid) preference.
 * @param storageKey Unique key for AsyncStorage
 * @param initialMode Default mode if no preference is saved
 * @returns [currentMode, setModeFunction]
 */
export const useViewMode = (
    storageKey: string,
    initialMode: ViewMode = 'list'
): [ViewMode, (mode: ViewMode | ((prev: ViewMode) => ViewMode)) => void] => {
    const [mode, setMode] = useState<ViewMode>(initialMode);
    // We could add an 'isLoading' state if we wanted to block rendering until loaded,
    // but for view modes, defaulting to initial and then switching is usually fine/faster perceived perf.
    // Although slight layout shift might occur.

    useEffect(() => {
        const loadPreference = async () => {
            try {
                const savedMode = await AsyncStorage.getItem(storageKey);
                if (savedMode === 'list' || savedMode === 'grid') {
                    setMode(savedMode);
                }
            } catch (error) {
                console.warn('Failed to load view mode preference:', error);
            }
        };
        loadPreference();
    }, [storageKey]);

    const setViewMode = useCallback(async (newMode: ViewMode | ((prev: ViewMode) => ViewMode)) => {
        // Determine the next value
        // Note: We need the current 'mode' from state to calculate next if function is passed.
        let resolvedMode: ViewMode;
        if (typeof newMode === 'function') {
            resolvedMode = newMode(mode);
        } else {
            resolvedMode = newMode;
        }

        setMode(resolvedMode);
        try {
            await AsyncStorage.setItem(storageKey, resolvedMode);
        } catch (error) {
            console.warn('Failed to save view mode preference:', error);
        }
    }, [storageKey, mode]);

    return [mode, setViewMode];
};
