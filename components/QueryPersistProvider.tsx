import React from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useABSCredentials } from '../hooks/useABSCredentials';
import { queryClient, getQueryPersistOptions } from '../utils/queryClient';

export function QueryPersistProvider({ children }: { children: React.ReactNode }) {
    const { url } = useABSCredentials();
    const buster = url ?? 'no-abs';

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={getQueryPersistOptions(buster)}
        >
            {children}
        </PersistQueryClientProvider>
    );
}
