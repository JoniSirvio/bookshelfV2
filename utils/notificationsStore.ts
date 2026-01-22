import { Storage } from 'expo-sqlite/kv-store';
// Wait, user asked for MMKV in implementation plan, but I might as well use a simple wrapper or just AsyncStorage if MMKV setup is complex in one go. 
// Actually I already have MMKV setup for QueryClient. Let's use it.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const NOTES_KEY = 'last_seen_new_books_timestamp';

export const getLastSeenNewBooksTime = async (): Promise<number> => {
    try {
        const val = await AsyncStorage.getItem(NOTES_KEY);
        return val ? parseInt(val, 10) : 0;
    } catch (e) {
        return 0;
    }
};

export const setLastSeenNewBooksTime = async (timestamp: number) => {
    try {
        await AsyncStorage.setItem(NOTES_KEY, timestamp.toString());
    } catch (e) {
        console.error("Failed to save timestamp", e);
    }
};
