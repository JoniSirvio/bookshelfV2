import AsyncStorage from '@react-native-async-storage/async-storage';
import { ABS_LAST_LIBRARY_ID_KEY } from './absQueryKeys';

let memoryCache: string | null = null;

/** Synchronous read of the in-memory last-library id (populated by {@link loadLastLibraryId}). */
export function getCachedLastLibraryId(): string | null {
    return memoryCache;
}

/** Loads last library id from AsyncStorage into memory. Safe to call multiple times. */
export async function loadLastLibraryId(): Promise<string | null> {
    if (memoryCache) return memoryCache;
    memoryCache = await AsyncStorage.getItem(ABS_LAST_LIBRARY_ID_KEY);
    return memoryCache;
}

export function setLastLibraryId(libraryId: string): void {
    memoryCache = libraryId;
    void AsyncStorage.setItem(ABS_LAST_LIBRARY_ID_KEY, libraryId);
}
