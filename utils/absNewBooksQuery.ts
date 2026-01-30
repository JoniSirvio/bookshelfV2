import { fetchABSLibraryItems, ABSItem, ABSLibrary } from '../api/abs';
import { getLastSeenNewBooksTime, setLastSeenNewBooksTime } from './notificationsStore';
import { queryClient } from './queryClient';

/**
 * Fetches "new" books (added after last visit), updates last-seen time,
 * and invalidates the hasNewBooks badge. Used by NewBooksScreen and by
 * prefetch on app open so users see new books immediately.
 */
export async function fetchNewBooksWithSideEffects(
    url: string,
    token: string,
    libraries: ABSLibrary[]
): Promise<ABSItem[]> {
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
    await setLastSeenNewBooksTime(Date.now());
    queryClient.invalidateQueries({ queryKey: ['hasNewBooks'] });
    return newOnly;
}
