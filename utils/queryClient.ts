import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

export const clientPersister = createAsyncStoragePersister({
    storage: AsyncStorage,
    throttleTime: 1000, // Throttle writes to once every second
});

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
