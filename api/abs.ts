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
