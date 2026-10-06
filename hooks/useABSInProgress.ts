import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useABSCredentials } from './useABSCredentials';
import { fetchABSMe, fetchABSItem, fetchABSItemsInProgress, getABSCoverUrl, ABSItem } from '../api/abs';
import { FinnaSearchResult } from '../api/finna';
import { useMemo } from 'react';
import { mapWithConcurrency } from '../utils/absRequest';

interface MediaProgressItem {
    libraryItemId: string;
    duration?: number;
    currentTime?: number;
    isFinished?: boolean;
    hideFromContinueListening?: boolean;
    lastUpdate?: number;
    startedAt?: number;
    finishedAt?: number;
    progress?: number;
}

function mapAbsItemToFinnaResult(
    itemDetails: ABSItem,
    progressItem: MediaProgressItem,
    url: string,
    token: string
): FinnaSearchResult {
    const duration = progressItem.duration || 0;
    const currentTime = progressItem.currentTime || 0;
    const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;
    const isFinished = progressItem.isFinished;

    let timeLeftString = '';
    if (isFinished) {
        timeLeftString = 'Valmis';
    } else {
        const timeLeftSeconds = duration - currentTime;
        const hoursLeft = Math.floor(timeLeftSeconds / 3600);
        const minutesLeft = Math.floor((timeLeftSeconds % 3600) / 60);

        if (hoursLeft > 0) timeLeftString += `${hoursLeft}h `;
        timeLeftString += `${minutesLeft}min`;
        if (Math.abs(timeLeftSeconds) < 60) timeLeftString = 'Alle 1min';
    }

    const hasAudio = Boolean(
        (itemDetails.media.numAudioFiles && itemDetails.media.numAudioFiles > 0) ||
        (itemDetails.media.audioFiles && itemDetails.media.audioFiles.length > 0) ||
        (itemDetails.media.duration && itemDetails.media.duration > 0)
    );
    const hasEbook = Boolean(
        itemDetails.media.ebookFile ||
        (itemDetails.media.numPages && itemDetails.media.numPages > 0)
    );

    let format: 'audiobook' | 'ebook' | 'both' = 'audiobook';
    if (hasAudio && hasEbook) {
        format = 'both';
    } else if (hasEbook && !hasAudio) {
        format = 'ebook';
    } else {
        format = 'audiobook';
    }

    return {
        id: `abs-${itemDetails.id}`,
        title: itemDetails.media.metadata.title,
        authors: itemDetails.media.metadata.authors?.map((a) => a.name) || [
            itemDetails.media.metadata.authorName || '',
        ],
        publicationYear: itemDetails.media.metadata.publishedYear
            ? itemDetails.media.metadata.publishedYear.substring(0, 4)
            : undefined,
        images: itemDetails.media.coverPath
            ? [{ url: getABSCoverUrl(url, token, itemDetails.id) }]
            : [],
        format,
        absMediaTypes: {
            hasAudio,
            hasEbook,
        },
        readOrListened: hasAudio ? 'listened' : 'read',
        absProgress: {
            percentage,
            timeLeft: timeLeftString,
            duration,
            currentTime,
            isFinished,
        },
        startedReading: new Date(progressItem.startedAt || Date.now()).toISOString(),
        finishedReading:
            progressItem.isFinished && progressItem.finishedAt
                ? new Date(progressItem.finishedAt).toISOString()
                : undefined,
    };
}

export const useABSInProgress = (readBooks: any[] = []) => {
    const { url, token } = useABSCredentials();
    const queryClient = useQueryClient();

    const { data: user } = useQuery({
        queryKey: ['absMe', url],
        queryFn: async () => {
            const u = await fetchABSMe(url!, token!);
            if (!u) throw new Error('Could not fetch user profile');
            return u;
        },
        enabled: !!url && !!token,
        staleTime: 0,
    });

    const { data: rawInProgressBooks, isLoading } = useQuery({
        queryKey: ['absInProgressDetails', url, user?.mediaProgress?.length],
        queryFn: async () => {
            if (!user?.mediaProgress) return [];

            const progressList = user.mediaProgress as MediaProgressItem[];
            const progressMap = new Map(progressList.map((p) => [p.libraryItemId, p]));

            const inProgressItems = await fetchABSItemsInProgress(url!, token!, 100);
            const inProgressIds = new Set(inProgressItems.map((item) => item.id));

            const fromInProgressEndpoint = inProgressItems
                .map((item) => {
                    const progressItem = progressMap.get(item.id);
                    if (!progressItem || progressItem.hideFromContinueListening) return null;
                    return mapAbsItemToFinnaResult(item, progressItem, url!, token!);
                })
                .filter((r): r is FinnaSearchResult => r !== null);

            const finishedCandidates = progressList.filter(
                (p) =>
                    (p.progress ?? 0) > 0 &&
                    !p.hideFromContinueListening &&
                    p.isFinished &&
                    !inProgressIds.has(p.libraryItemId)
            );

            // Populate from memory cache first so finished items don't require individual HTTP requests
            const cachedItemsMap = new Map<string, ABSItem>();
            const cachedQueries = queryClient.getQueriesData<ABSItem[]>({ queryKey: ['absItems'] });
            for (const [, items] of cachedQueries) {
                if (Array.isArray(items)) {
                    for (const it of items) {
                        if (it?.id) cachedItemsMap.set(it.id, it);
                    }
                }
            }

            const finishedResults = await mapWithConcurrency(
                finishedCandidates,
                async (progressItem) => {
                    try {
                        const cached = cachedItemsMap.get(progressItem.libraryItemId);
                        const itemDetails = cached ?? (await fetchABSItem(url!, token!, progressItem.libraryItemId));
                        return mapAbsItemToFinnaResult(itemDetails, progressItem, url!, token!);
                    } catch (err) {
                        console.warn(
                            `[ABS Hook] Failed to fetch details for item ${progressItem.libraryItemId}`,
                            err
                        );
                        return null;
                    }
                },
                3
            );

            const combined = [...fromInProgressEndpoint, ...finishedResults.filter((r): r is FinnaSearchResult => r !== null)];

            combined.sort((a, b) => {
                const aProgress = progressMap.get(a.id.replace(/^abs-/, ''));
                const bProgress = progressMap.get(b.id.replace(/^abs-/, ''));
                return (bProgress?.lastUpdate ?? 0) - (aProgress?.lastUpdate ?? 0);
            });

            return combined;
        },
        enabled: !!url && !!token && !!user?.mediaProgress,
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 5,
    });

    const inProgressBooks = useMemo(() => {
        if (!rawInProgressBooks) return [];

        return rawInProgressBooks.filter((book) => {
            const isLocallyRead = readBooks.some((b) => b.id === book.id);
            return !isLocallyRead;
        });
    }, [rawInProgressBooks, readBooks]);

    return {
        inProgressBooks: inProgressBooks || [],
        loading: isLoading,
    };
};
