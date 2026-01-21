import axios from 'axios';

export interface ABSLibrary {
    id: string;
    name: string;
    mediaType: string; // 'book' or 'audiobook'
}

export interface ABSItem {
    id: string;
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
    };
    userMedia?: {
        currentTime: number;
        duration: number;
        progress: number;
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
    // Fetch Items from library
    const response = await axios.get(`${cleanUrl}/api/libraries/${libraryId}/items`, {
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
    return `${cleanUrl}/api/items/${itemId}/cover?token=${token}`;
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
    console.log('[ABS API] Fetching /api/me...');
    try {
        const response = await axios.get(`${cleanUrl}/api/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('[ABS API] /api/me response:', JSON.stringify(response.data, null, 2));

        if (response.data.user) {
            return response.data.user;
        } else if (response.data.id) {
            // direct user object?
            return response.data;
        }

        console.warn('[ABS API] /api/me response did not contain "user" object');
        return null; // Return null instead of undefined
    } catch (error) {
        console.error('[ABS API] Error fetching /api/me:', error);
        throw error;
    }
};

export const fetchABSItem = async (baseUrl: string, token: string, itemId: string): Promise<ABSItem> => {
    const cleanUrl = baseUrl.replace(/\/$/, "");
    const response = await axios.get(`${cleanUrl}/api/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};


