import { useQuery } from '@tanstack/react-query';
import { useABSCredentials } from './useABSCredentials';
import { fetchABSMe } from '../api/abs';
import { useMemo } from 'react';

/**
 * Returns a map of abs-{libraryItemId} -> finishedAt (timestamp) for all items
 * that have been finished in Audiobookshelf. Used to sort read shelf by actual
 * listening completion date when Firestore may not have finishedReading.
 */
export const useABSFinishedDates = (): Record<string, number> => {
    const { url, token } = useABSCredentials();

    const { data: user } = useQuery({
        queryKey: ['absMe', url],
        queryFn: async () => {
            const u = await fetchABSMe(url!, token!);
            if (!u) throw new Error('Could not fetch user profile');
            return u;
        },
        enabled: !!url && !!token,
        staleTime: 1000 * 60 * 5, // 5 min
    });

    return useMemo(() => {
        if (!user?.mediaProgress) return {};

        const map: Record<string, number> = {};
        for (const p of user.mediaProgress) {
            if (p.isFinished && p.finishedAt != null) {
                const key = `abs-${p.libraryItemId}`;
                map[key] = p.finishedAt;
            }
        }
        return map;
    }, [user?.mediaProgress]);
};
