import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useABSCredentials } from './useABSCredentials';
import { fetchABSMe, fetchABSItem, getABSCoverUrl } from '../api/abs';
import { FinnaSearchResult } from '../api/finna';
import { useMemo } from 'react';

export const useABSInProgress = (readBooks: any[] = []) => {
    const { url, token } = useABSCredentials();

    // 1. Fetch User Profile (includes mediaProgress)
    const { data: user } = useQuery({
        queryKey: ['absMe', url],
        queryFn: async () => {
            const u = await fetchABSMe(url!, token!);
            if (!u) throw new Error("Could not fetch user profile");
            return u;
        },
        enabled: !!url && !!token,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // 2. Process Progress & Fetch Item Details
    // We fetch ALL started items, even if finished. Filtering happens locally to avoid re-fetching when local state changes.
    const { data: rawInProgressBooks, isLoading } = useQuery({
        queryKey: ['absInProgressDetails', url, user?.mediaProgress?.length], // Removed readBooks dependency
        queryFn: async () => {
            if (!user || !user.mediaProgress) return [];

            // Filter logic: Only started items
            const candidates = user.mediaProgress.filter((p: any) => p.progress > 0);

            // Sort by last update (most recent first)
            candidates.sort((a: any, b: any) => b.lastUpdate - a.lastUpdate);

            // Fetch details for each candidate
            const promises = candidates.map(async (progressItem: any) => {
                try {
                    const itemDetails = await fetchABSItem(url!, token!, progressItem.libraryItemId);

                    // Construct the FinnaSearchResult object
                    const duration = progressItem.duration || 0;
                    const currentTime = progressItem.currentTime || 0;
                    const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;
                    const isFinished = progressItem.isFinished;

                    // Calculate time left
                    let timeLeftString = "";
                    if (isFinished) {
                        timeLeftString = "Valmis";
                    } else {
                        const timeLeftSeconds = duration - currentTime;
                        const hoursLeft = Math.floor(timeLeftSeconds / 3600);
                        const minutesLeft = Math.floor((timeLeftSeconds % 3600) / 60);

                        if (hoursLeft > 0) timeLeftString += `${hoursLeft}h `;
                        timeLeftString += `${minutesLeft}min`;
                        if (Math.abs(timeLeftSeconds) < 60) timeLeftString = "Alle 1min";
                    }

                    const result: FinnaSearchResult = {
                        id: `abs-${itemDetails.id}`,
                        title: itemDetails.media.metadata.title,
                        authors: itemDetails.media.metadata.authors?.map(a => a.name) || [itemDetails.media.metadata.authorName || ''],
                        publicationYear: itemDetails.media.metadata.publishedYear ? itemDetails.media.metadata.publishedYear.substring(0, 4) : undefined,
                        images: itemDetails.media.coverPath ? [{ url: getABSCoverUrl(url!, token!, itemDetails.id) }] : [],
                        absProgress: {
                            percentage,
                            timeLeft: timeLeftString,
                            duration,
                            currentTime,
                            isFinished // Pass this flag to UI
                        },
                        startedReading: new Date(progressItem.startedAt || Date.now()).toISOString(),
                        finishedReading: progressItem.isFinished && progressItem.finishedAt ? new Date(progressItem.finishedAt).toISOString() : undefined,
                    };
                    return result;
                } catch (err) {
                    console.warn(`[ABS Hook] Failed to fetch details for item ${progressItem.libraryItemId}`, err);
                    return null;
                }
            });

            const results = await Promise.all(promises);
            // Filter out nulls (failed fetches)
            return results.filter(r => r !== null) as FinnaSearchResult[];
        },
        enabled: !!url && !!token && !!user?.mediaProgress,
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 5,
    });

    // 3. Local Filter: Hide items that are locally marked as read
    const inProgressBooks = useMemo(() => {
        if (!rawInProgressBooks) return [];

        return rawInProgressBooks.filter(book => {
            // Check if this ABS book ID exists in readBooks
            const isLocallyRead = readBooks.some(b => b.id === book.id);

            // If it's finished in ABS (implied by isFinished flag), only show it if NOT read locally.
            // If it's still in progress (<100%), show it even if read locally? 
            // Usually if marked read locally, we shouldn't show it in "In Progress" anymore.
            // The previous logic was: `if (p.isFinished) return !isLocallyRead;`.
            // But if I mark it as read in app, it should disappear from "In Progress" even if ABS thinks it's 50%?
            // User intention: "Mark as read" -> move to Read shelf.
            // So: If isLocallyRead, hide it.

            if (isLocallyRead) return false;

            return true;
        });
    }, [rawInProgressBooks, readBooks]);

    return {
        inProgressBooks: inProgressBooks || [],
        loading: isLoading
    };
};
