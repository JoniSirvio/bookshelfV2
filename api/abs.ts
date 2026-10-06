import axios from 'axios';
import { withAbsRetry } from '../utils/absRequest';

const LIBRARY_PAGE_SIZE = 250;
const NEW_BOOKS_PAGE_SIZE = 100;

export interface ABSLibrary {
    id: string;
    name: string;
    mediaType: string; // 'book' or 'audiobook'
}

export interface AudioFile {
    index: number;
    ino: string;
    metadata: {
        filename: string;
        ext: string;
        path: string;
        relPath: string;
        size: number;
        mtimeMs: number;
        ctimeMs: number;
        birthtimeMs: number;
    };
    addedAt: number;
    trackNumFromMeta?: number;
    discNumFromMeta?: number;
    trackNum?: number;
    duration: number;
    format: string;
    bitRate: number;
    codec: string;
}

export interface ABSItem {
    id: string;
    libraryId: string;
    mediaType: string; // 'book', 'podcast'
    addedAt: number; // Timestamp
    media: {
        metadata: {
            title: string;
            authorName?: string;
            authors?: { name: string }[];
            series?: { name: string }[];
            publishedYear?: string;
            description?: string;
        };
        coverPath?: string;
        duration?: number;
        numAudioFiles?: number;
        numPages?: number;
        ebookFile?: any;
        tracks?: any[];
        audioFiles?: AudioFile[];
        chapters?: any[]; // Allow for chapters if present
    };
    userMedia?: {
        currentTime: number;
        duration: number;
        progress: number;
        finishedAt?: number;
        lastPlayedAt?: number;
    };
}

export const fetchABSLibraries = async (baseUrl: string, token: string): Promise<ABSLibrary[]> => {
    if (!baseUrl || !token) throw new Error("Missing credentials");
    // Ensure baseUrl doesn't have trailing slash
    const cleanUrl = baseUrl.replace(/\/$/, "");
    const response = await withAbsRetry(() =>
        axios.get(`${cleanUrl}/api/libraries`, {
            headers: { Authorization: `Bearer ${token}` },
        })
    );
    return response.data.libraries;
};

export const searchABSLibrary = async (
    baseUrl: string,
    token: string,
    libraryId: string,
    query: string
): Promise<ABSItem[]> => {
    if (!baseUrl || !token) throw new Error("Missing credentials");
    const cleanUrl = baseUrl.replace(/\/$/, "");
    const cleanLibId = libraryId.replace(/^abs-/, "");
    try {
        const response = await withAbsRetry(() =>
            axios.get(`${cleanUrl}/api/libraries/${cleanLibId}/search`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    q: query,
                    limit: 50,
                },
                timeout: 5000,
            })
        );
        const items: ABSItem[] = [];
        const seenIds = new Set<string>();

        const addItem = (item: any) => {
            const libItem = item?.libraryItem ?? item;
            if (libItem && libItem.id && !seenIds.has(libItem.id)) {
                seenIds.add(libItem.id);
                items.push(libItem);
            }
        };

        // 1. Direct book matches
        const bookMatches = Array.isArray(response.data)
            ? response.data
            : (response.data?.book ?? []);
        bookMatches.forEach(addItem);

        // 2. Series matches (e.g. searching "Stormlight Archive" returns series and its books)
        const seriesMatches = response.data?.series ?? [];
        for (const s of seriesMatches) {
            const seriesBooks = s?.books ?? s?.items ?? [];
            seriesBooks.forEach(addItem);
        }

        // 3. Author matches (e.g. searching "Brandon Sanderson")
        const authorMatches = response.data?.authors ?? [];
        for (const a of authorMatches) {
            const authorBooks = a?.books ?? a?.items ?? [];
            authorBooks.forEach(addItem);
        }

        return items;
    } catch (err: any) {
        console.warn(`[ABS Search] Search failed for library ${libraryId}:`, err?.message);
        return [];
    }
};

export interface ABSLibrarySearchResult {
    libraryId: string;
    libraryName: string;
    items: ABSItem[];
}

export const searchAllABSBookLibraries = async (
    baseUrl: string,
    token: string,
    query: string
): Promise<ABSLibrarySearchResult[]> => {
    if (!baseUrl || !token) return [];
    try {
        const libraries = await fetchABSLibraries(baseUrl, token);
        // Include all book and audiobook libraries (everything except podcasts)
        const bookLibs = libraries.filter(lib => lib.mediaType !== 'podcast');
        
        const searchPromises = bookLibs.map(async (lib) => {
            const items = await searchABSLibrary(baseUrl, token, lib.id, query);
            return {
                libraryId: lib.id,
                libraryName: lib.name,
                items,
            };
        });

        const results = await Promise.all(searchPromises);
        return results.filter(r => r.items.length > 0);
    } catch (err: any) {
        console.warn('[ABS Search] Search across all book libraries failed:', err?.message);
        return [];
    }
};


async function fetchABSLibraryItemsPage(
    baseUrl: string,
    token: string,
    libraryId: string,
    page: number,
    pageSize: number
): Promise<{ results: ABSItem[]; total: number }> {
    const cleanUrl = baseUrl.replace(/\/$/, "");
    const cleanLibId = libraryId.replace(/^abs-/, "");
    const response = await withAbsRetry(() =>
        axios.get(`${cleanUrl}/api/libraries/${cleanLibId}/items`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                limit: pageSize,
                page,
                sort: 'addedAt:desc',
                minified: 1,
            },
        })
    );
    return {
        results: response.data.results ?? [],
        total: typeof response.data.total === 'number' ? response.data.total : 0,
    };
}

export const fetchABSLibraryItems = async (baseUrl: string, token: string, libraryId: string): Promise<ABSItem[]> => {
    if (!baseUrl || !token) throw new Error("Missing credentials");

    // 1. Fetch page 0 first to get initial slice and read total item count
    const firstPage = await fetchABSLibraryItemsPage(baseUrl, token, libraryId, 0, LIBRARY_PAGE_SIZE);
    const all: ABSItem[] = [...firstPage.results];

    // If all items fit in page 0 or total reached, return immediately (1 request!)
    if (firstPage.results.length < LIBRARY_PAGE_SIZE || (firstPage.total > 0 && all.length >= firstPage.total)) {
        return all;
    }

    // 2. If total is known from response, fetch remaining pages concurrently
    if (firstPage.total > 0) {
        const totalPages = Math.ceil(firstPage.total / LIBRARY_PAGE_SIZE);
        const remainingPageNumbers: number[] = [];
        for (let p = 1; p < totalPages; p++) {
            remainingPageNumbers.push(p);
        }

        // Fetch remaining pages in parallel batches (max 4 concurrent requests to not overload the server)
        const CONCURRENCY = 4;
        for (let i = 0; i < remainingPageNumbers.length; i += CONCURRENCY) {
            const chunk = remainingPageNumbers.slice(i, i + CONCURRENCY);
            const chunkResults = await Promise.all(
                chunk.map((p) => fetchABSLibraryItemsPage(baseUrl, token, libraryId, p, LIBRARY_PAGE_SIZE))
            );
            for (const res of chunkResults) {
                all.push(...res.results);
            }
        }
    } else {
        // Fallback for servers that omit total: sequential pagination
        let page = 1;
        while (true) {
            const pageRes = await fetchABSLibraryItemsPage(baseUrl, token, libraryId, page, LIBRARY_PAGE_SIZE);
            all.push(...pageRes.results);
            if (pageRes.results.length < LIBRARY_PAGE_SIZE) break;
            page++;
        }
    }

    // De-duplicate items by ID
    const seen = new Set<string>();
    const deduplicated: ABSItem[] = [];
    for (const item of all) {
        if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            deduplicated.push(item);
        }
    }

    return deduplicated;
};

/**
 * Fetches recent/sample items across all book libraries in Audiobookshelf for browsing and recommendations.
 */
export const getRecentABSBookLibraryItems = async (
    baseUrl: string,
    token: string,
    limit: number = 25
): Promise<ABSItem[]> => {
    if (!baseUrl || !token) return [];
    try {
        const libraries = await fetchABSLibraries(baseUrl, token);
        const bookLibs = libraries.filter(lib => lib.mediaType !== 'podcast');
        const allItems: ABSItem[] = [];
        for (const lib of bookLibs) {
            const pageData = await fetchABSLibraryItemsPage(baseUrl, token, lib.id, 0, limit);
            allItems.push(...pageData.results);
            if (allItems.length >= limit) break;
        }
        return allItems.slice(0, limit);
    } catch (err: any) {
        console.warn('[ABS] Failed to fetch recent library items:', err?.message);
        return [];
    }
};

/** Fetches only items added after `sinceMs`, stopping early when older items are reached. */
export const fetchABSLibraryItemsAddedSince = async (
    baseUrl: string,
    token: string,
    libraryId: string,
    sinceMs: number
): Promise<ABSItem[]> => {
    if (!baseUrl || !token) throw new Error("Missing credentials");

    const all: ABSItem[] = [];
    let page = 0;

    while (true) {
        const pageData = await fetchABSLibraryItemsPage(baseUrl, token, libraryId, page, NEW_BOOKS_PAGE_SIZE);
        const results = pageData.results;
        if (!results.length) break;

        for (const item of results) {
            if ((item.addedAt || 0) <= sinceMs) return all;
            all.push(item);
        }

        if (results.length < NEW_BOOKS_PAGE_SIZE) break;
        page++;
    }

    return all;
};

export const fetchABSItemsInProgress = async (
    baseUrl: string,
    token: string,
    limit = 100
): Promise<ABSItem[]> => {
    const cleanUrl = baseUrl.replace(/\/$/, "");
    const response = await withAbsRetry(() =>
        axios.get(`${cleanUrl}/api/me/items-in-progress`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { limit },
        })
    );
    return response.data.libraryItems ?? [];
};

export const getABSCoverUrl = (baseUrl: string, token: string, itemId: string): string => {
    const cleanUrl = baseUrl.replace(/\/$/, "");
    const cleanId = itemId.replace(/^abs-/, "");
    return `${cleanUrl}/api/items/${cleanId}/cover?token=${token}`;
}

export const getAudioStreamUrl = (baseUrl: string, token: string, itemId: string, fileId: string): string => {
    const cleanUrl = baseUrl.replace(/\/$/, "");
    const cleanId = itemId.replace(/^abs-/, "");
    // /api/items/<itemId>/file/<fileId> is standard for streaming source files
    return `${cleanUrl}/api/items/${cleanId}/file/${fileId}?token=${token}`;
}

export const getABSHlsUrl = (baseUrl: string, token: string, itemId: string): string => {
    const cleanUrl = baseUrl.replace(/\/$/, "");
    const cleanId = itemId.replace(/^abs-/, "");
    // HLS Playlist endpoint
    return `${cleanUrl}/api/items/${cleanId}/hls/playlist.m3u8?token=${token}`;
}

export const loginToABS = async (baseUrl: string, username: string, password: string): Promise<string> => {
    const cleanUrl = baseUrl.replace(/\/$/, "");
    try {
        const response = await axios.post(`${cleanUrl}/login`, {
            username,
            password
        });
        return response.data.user.token;
    } catch (error) {
        console.error("ABS Login Error:", error);
        throw error;
    }
};

export const fetchABSMe = async (baseUrl: string, token: string): Promise<any> => {
    const cleanUrl = baseUrl.replace(/\/$/, "");
    try {
        const response = await withAbsRetry(() =>
            axios.get(`${cleanUrl}/api/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })
        );

        if (response.data.user) {
            return response.data.user;
        } else if (response.data.id) {
            // direct user object?
            return response.data;
        }

        console.warn('[ABS API] /api/me response did not contain "user" object');
        return null;
    } catch (error) {
        console.error('[ABS API] Error fetching /api/me:', error);
        throw error;
    }
};

export const fetchABSItem = async (baseUrl: string, token: string, itemId: string): Promise<ABSItem> => {
    const cleanUrl = baseUrl.replace(/\/$/, "");
    const cleanId = itemId.replace(/^abs-/, "");
    const response = await withAbsRetry(() =>
        axios.get(`${cleanUrl}/api/items/${cleanId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
    );
    return response.data;
};

export const updateABSProgress = async (baseUrl: string, token: string, itemId: string, currentTime: number, duration: number) => {
    const cleanUrl = baseUrl.replace(/\/$/, "");
    const cleanId = itemId.replace(/^abs-/, "");

    // Calculate progress data
    const now = Date.now();
    const progress = duration > 0 ? currentTime / duration : 0;
    const isFinished = duration > 0 && currentTime >= duration * 0.99;

    // Payload for Batch Update / Sync (PATCH/POST)
    const payloadBatch = {
        localMediaProgress: [{
            libraryItemId: cleanId,
            episodeId: null,
            duration,
            progress,
            currentTime,
            isFinished,
            hideFromContinueListening: false,
            lastUpdate: now,
            startedAt: now,
            finishedAt: null
        }]
    };

    // Payload for Simple Update (POST)
    const payloadSimple = {
        currentTime,
        duration,
        progress,
        deviceInfo: {
            clientName: "BookshelfV2 Mobile",
            deviceId: "mobile-app"
        },
        isFinished
    };

    // Strategy: Try endpoints in order of likelihood/modernity
    // 1. PATCH /api/me/progress/batch/update (Modern, recommended)
    // 2. POST /api/me/sync-local-progress (Legacy batch)
    // 3. POST /api/me/progress/{id} (User-centric fallback)
    // 4. POST /api/items/{id}/progress (Item-centric fallback)
    const endpoints = [
        { url: `${cleanUrl}/api/me/progress/batch/update`, payload: payloadBatch.localMediaProgress, name: "Batch Update (PATCH)", method: 'PATCH' },
        { url: `${cleanUrl}/api/me/sync-local-progress`, payload: payloadBatch, name: "Batch Sync (POST)", method: 'POST' },
        { url: `${cleanUrl}/api/me/progress/${cleanId}`, payload: payloadSimple, name: "User Progress (ID)", method: 'POST' },
        { url: `${cleanUrl}/api/items/${cleanId}/progress`, payload: payloadSimple, name: "Item Progress", method: 'POST' },
    ];

    for (const ep of endpoints) {
        try {
            await axios({
                method: ep.method,
                url: ep.url,
                data: ep.payload,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`[Sync] Success via ${ep.name}`);
            return; // Success!
        } catch (error: any) {
            // If it's a 404, the endpoint might not exist on this server version, so continue to next.
            if (error.response?.status === 404) {
                continue;
            }
            // For other errors (401, 500), failure is real.
            console.warn(`[Sync] ${ep.name} failed (${error.response?.status}): ${error.message}`);
            if (error.response?.status === 401 || error.response?.status === 403) break;
        }
    }
    console.warn(`[Sync] All sync attempts failed for ${cleanId}`);
};
