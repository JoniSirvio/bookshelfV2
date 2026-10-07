import { QueryClient } from '@tanstack/react-query';
import { fetchABSLibraryItems, ABSLibrary } from '../api/abs';
import { absItemsKey } from './absQueryKeys';

export const ABS_ITEMS_STALE_TIME = 1000 * 60 * 30; // 30 minutes

function sortLibrariesForPrefetch(
    libraries: ABSLibrary[],
    preferredLibraryId?: string | null
): ABSLibrary[] {
    if (!preferredLibraryId) return libraries;
    const preferred = libraries.find((lib) => lib.id === preferredLibraryId);
    if (!preferred) return libraries;
    return [preferred, ...libraries.filter((lib) => lib.id !== preferredLibraryId)];
}

export function isQueryFresh(queryClient: QueryClient, url: string, libraryId: string): boolean {
    const state = queryClient.getQueryState(absItemsKey(url, libraryId));
    if (!state?.dataUpdatedAt) return false;
    return Date.now() - state.dataUpdatedAt < ABS_ITEMS_STALE_TIME;
}

export async function prefetchABSLibraries(
    queryClient: QueryClient,
    url: string,
    token: string,
    libraries: ABSLibrary[],
    options?: { preferredLibraryId?: string | null; libraryIds?: string[] }
): Promise<void> {
    const targetLibraries =
        options?.libraryIds != null
            ? sortLibrariesForPrefetch(
                  libraries.filter((lib) => options.libraryIds!.includes(lib.id)),
                  options.preferredLibraryId
              )
            : sortLibrariesForPrefetch(libraries, options?.preferredLibraryId);

    if (targetLibraries.length === 0) return;

    // 1. Prioritize preferred/first library so user sees it immediately
    const [primary, ...secondary] = targetLibraries;

    if (primary && !isQueryFresh(queryClient, url, primary.id)) {
        await queryClient.prefetchQuery({
            queryKey: absItemsKey(url, primary.id),
            queryFn: () => fetchABSLibraryItems(url, token, primary.id),
            staleTime: ABS_ITEMS_STALE_TIME,
        });
    }

    // 2. Prefetch any secondary libraries concurrently in parallel
    const staleSecondary = secondary.filter((lib) => !isQueryFresh(queryClient, url, lib.id));
    if (staleSecondary.length > 0) {
        await Promise.all(
            staleSecondary.map((lib) =>
                queryClient.prefetchQuery({
                    queryKey: absItemsKey(url, lib.id),
                    queryFn: () => fetchABSLibraryItems(url, token, lib.id),
                    staleTime: ABS_ITEMS_STALE_TIME,
                })
            )
        );
    }
}
