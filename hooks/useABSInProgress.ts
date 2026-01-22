import { useQuery } from '@tanstack/react-query';
import { useABSCredentials } from './useABSCredentials';
import { fetchABSMe, fetchABSItem, getABSCoverUrl } from '../api/abs';
import { FinnaSearchResult } from '../api/finna';

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
    const { data: inProgressBooks, isLoading } = useQuery({
        queryKey: ['absInProgressDetails', url, user?.mediaProgress?.length, readBooks.length],
        queryFn: async () => {
            if (!user || !user.mediaProgress) return [];

            // Filter logic:
            // 1. Progress > 0 (started)
            // 2. AND (Not Finished OR (Finished but NOT in local readBooks))
            const candidates = user.mediaProgress.filter((p: any) => {
                const hasStarted = p.progress > 0;
                if (!hasStarted) return false;

                const absId = `abs-${p.libraryItemId}`;
                const isLocallyRead = readBooks.some(b => b.id === absId);

                // If it's finished in ABS, only show it if we haven't marked it as read locally
                if (p.isFinished) {
                    return !isLocallyRead;
                }

                return true; // Show in-progress items
            });

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
            const validResults = results.filter(r => r !== null) as FinnaSearchResult[];
            return validResults;
        },
        enabled: !!url && !!token && !!user?.mediaProgress,
        staleTime: 1000 * 60 * 5,
    });

    return {
        inProgressBooks: inProgressBooks || [],
        loading: isLoading
    };
};
