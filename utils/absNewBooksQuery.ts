import { fetchABSLibraryItems, ABSItem, ABSLibrary } from '../api/abs';
import { getLastSeenNewBooksTime, setLastSeenNewBooksTime } from './notificationsStore';
import { queryClient } from './queryClient';

export interface FetchNewBooksOptions {
    /** When true (default), updates last-seen time and invalidates hasNewBooks. Set false for prefetch so the bell badge is not cleared on app open. */
    updateLastSeen?: boolean;
}

/**
 * Fetches "new" books (added after last visit). Optionally updates last-seen time
 * and invalidates the hasNewBooks badge. Used by NewBooksScreen (with updateLastSeen)
 * and by prefetch on app open (without updateLastSeen) so the notification bell still shows.
 */
export async function fetchNewBooksWithSideEffects(
    url: string,
    token: string,
    libraries: ABSLibrary[],
    options: FetchNewBooksOptions = {}
): Promise<ABSItem[]> {
    const { updateLastSeen = true } = options;
    const previousLastSeen = await getLastSeenNewBooksTime();
    let all: ABSItem[] = [];
    for (const lib of libraries) {
        try {
            const items = await fetchABSLibraryItems(url, token, lib.id);
            all = [...all, ...items.map(i => ({ ...i, libraryId: lib.id }))];
        } catch (libErr) {
            console.error(`Failed to fetch items for lib ${lib.name}`, libErr);
        }
    }
    const newOnly = all.filter(item => (item.addedAt || 0) > previousLastSeen);
    newOnly.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    if (updateLastSeen) {
        await setLastSeenNewBooksTime(Date.now());
        queryClient.invalidateQueries({ queryKey: ['hasNewBooks'] });
    }
    return newOnly;
}
