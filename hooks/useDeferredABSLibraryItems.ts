import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { ABSItem, fetchABSLibraryItems } from '../api/abs';
import { absItemsKey } from '../utils/absQueryKeys';
import { ABS_ITEMS_STALE_TIME } from '../utils/absLibraryPrefetch';
import { absItemsListDiffers } from '../utils/absItemsDiff';

interface UseDeferredABSLibraryItemsOptions {
    url: string | null;
    token: string | null;
    selectedLibraryId: string | null;
}

export function useDeferredABSLibraryItems({
    url,
    token,
    selectedLibraryId,
}: UseDeferredABSLibraryItemsOptions) {
    const queryClient = useQueryClient();
    const enabled = !!url && !!token && !!selectedLibraryId;

    const { data: queryItems, isPending, isFetching, refetch } = useQuery({
        queryKey: absItemsKey(url, selectedLibraryId),
        queryFn: ({ queryKey }) => {
            const libraryId = queryKey[2] as string;
            return fetchABSLibraryItems(url!, token!, libraryId);
        },
        enabled,
        staleTime: ABS_ITEMS_STALE_TIME,
        initialData: () => {
            if (!url || !selectedLibraryId) return undefined;
            return queryClient.getQueryData<ABSItem[]>(absItemsKey(url, selectedLibraryId));
        },
    });

    const [displayedItems, setDisplayedItems] = useState<ABSItem[] | undefined>();
    const [hasPendingUpdate, setHasPendingUpdate] = useState(false);

    const displayedItemsRef = useRef<ABSItem[] | undefined>(undefined);
    const displayedLibraryRef = useRef<string | null>(null);
    const pendingItemsRef = useRef<ABSItem[] | null>(null);

    useEffect(() => {
        displayedItemsRef.current = displayedItems;
    }, [displayedItems]);

    useEffect(() => {
        if (!selectedLibraryId || !url) {
            setDisplayedItems(undefined);
            setHasPendingUpdate(false);
            pendingItemsRef.current = null;
            displayedLibraryRef.current = null;
            return;
        }

        const cached = queryClient.getQueryData<ABSItem[]>(absItemsKey(url, selectedLibraryId));
        setDisplayedItems(cached);
        displayedLibraryRef.current = selectedLibraryId;
        setHasPendingUpdate(false);
        pendingItemsRef.current = null;
    }, [selectedLibraryId, url, queryClient]);

    useEffect(() => {
        if (!queryItems || !selectedLibraryId) return;
        if (displayedLibraryRef.current !== selectedLibraryId) return;

        const current = displayedItemsRef.current;

        if (!current) {
            setDisplayedItems(queryItems);
            return;
        }

        if (absItemsListDiffers(current, queryItems)) {
            pendingItemsRef.current = queryItems;
            setHasPendingUpdate(true);
        }
    }, [queryItems, selectedLibraryId]);

    useFocusEffect(
        useCallback(() => {
            if (!enabled) return;
            void refetch();
        }, [enabled, refetch])
    );

    const applyPendingUpdate = useCallback(() => {
        if (pendingItemsRef.current) {
            setDisplayedItems(pendingItemsRef.current);
            pendingItemsRef.current = null;
            setHasPendingUpdate(false);
        }
    }, []);

    const refresh = useCallback(async () => {
        const result = await refetch();
        if (result.data) {
            setDisplayedItems(result.data);
            pendingItemsRef.current = null;
            setHasPendingUpdate(false);
        }
    }, [refetch]);

    const isInitialLoading = enabled && isPending && !displayedItems;

    return {
        displayedItems,
        isInitialLoading,
        isFetching,
        hasPendingUpdate,
        applyPendingUpdate,
        refresh,
    };
}
