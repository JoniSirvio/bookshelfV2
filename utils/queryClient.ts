import { Query, QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PERSISTED_ABS_QUERY_ROOTS } from './absQueryKeys';

export const clientPersister = createAsyncStoragePersister({
    storage: AsyncStorage,
    throttleTime: 1000, // Throttle writes to once every second
});

export const QUERY_PERSIST_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

export function getQueryPersistOptions(buster: string) {
    return {
        persister: clientPersister,
        maxAge: QUERY_PERSIST_MAX_AGE,
        buster,
        dehydrateOptions: {
            shouldDehydrateQuery: (query: Query) => {
                const root = query.queryKey[0];
                return typeof root === 'string' && PERSISTED_ABS_QUERY_ROOTS.has(root);
            },
        },
    };
}

// Create the QueryClient with default options
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 10, // 10 minutes
            gcTime: QUERY_PERSIST_MAX_AGE,
            retry: 2,
        },
    },
});
