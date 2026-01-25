import axios from 'axios';

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
    const response = await axios.get(`${cleanUrl}/api/libraries`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return response.data.libraries;
};

export const fetchABSLibraryItems = async (baseUrl: string, token: string, libraryId: string): Promise<ABSItem[]> => {
    if (!baseUrl || !token) throw new Error("Missing credentials");
    const cleanUrl = baseUrl.replace(/\/$/, "");
    const cleanLibId = libraryId.replace(/^abs-/, "");
    // Fetch Items from library
    const response = await axios.get(`${cleanUrl}/api/libraries/${cleanLibId}/items`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        params: {
            limit: 100000, // Fetch effectively all items (user requested to remove 1000 limit)
            sort: 'addedAt:desc'
        }
    });
    return response.data.results;
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
    // console.log('[ABS API] Fetching /api/me...');
    try {
        const response = await axios.get(`${cleanUrl}/api/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });

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
    const response = await axios.get(`${cleanUrl}/api/items/${cleanId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
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
