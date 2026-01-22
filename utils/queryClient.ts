import { QueryClient } from '@tanstack/react-query';
import { Persister } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a custom persister for TanStack Query using AsyncStorage
// (MMKV is not supported in Expo Go without a custom dev build)
export const clientPersister: Persister = {
    persistClient: async (client) => {
        try {
            await AsyncStorage.setItem('REACT_QUERY_OFFLINE_CACHE', JSON.stringify(client));
        } catch (error) {
            console.error('Failed to persist query client:', error);
        }
    },
    restoreClient: async () => {
        try {
            const persistedClient = await AsyncStorage.getItem('REACT_QUERY_OFFLINE_CACHE');
            return persistedClient ? JSON.parse(persistedClient) : undefined;
        } catch (error) {
            console.error('Failed to restore query client:', error);
            return undefined;
        }
    },
    removeClient: async () => {
        await AsyncStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
    },
};

// Create the QueryClient with default options
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 10, // 10 minutes
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
            retry: 2,
        },
    },
});
