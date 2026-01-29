import axios from 'axios';

export interface FinnaImage {
    url: string;
}

export interface FinnaSearchResult {
    id: string;
    title: string;
    authors: string[];
    publicationYear?: string;
    images?: FinnaImage[];
    review?: string; // Added for book review
    rating?: number; // Added for book rating (1-10 stars)
    readOrListened?: string; // Added for read or listened status
    startedReading?: string; // ISO Date string
    finishedReading?: string; // ISO Date string
    daysRead?: number;
    absProgress?: {
        percentage: number;
        timeLeft: string;
        duration: number;
        currentTime: number;
        isFinished?: boolean;
    };
}

const FINNA_API_BASE_URL = 'https://api.finna.fi/api/v1/';

export const searchFinna = async (query: string): Promise<FinnaSearchResult[]> => {
    try {
        const response = await axios.get(`${FINNA_API_BASE_URL}search`, {
            params: {
                lookfor: query,
                type: 'AllFields',
                limit: 30,
                filter: ['format:0/Book/', 'language:fin', 'building:0/Outi/'],
            },
        });


        if (!response.data || !response.data.records) {
            console.log('No records found from Finna for query:', query);
            return [];
        }

        const results = response.data.records.map((record: any) => ({
            id: record.id,
            title: record.title,
            authors: record.nonPresenterAuthors?.map((a: any) => String(a.name || '')) ?? [],
            publicationYear: record.year,
            images: record.images?.map((img: string) => ({
                url: img.startsWith('http') ? img : `https://api.finna.fi${img}`
            })) ?? [],
        }));

        //Sort by image availability
        const sortedResults = results.sort((a: FinnaSearchResult, b: FinnaSearchResult) => {
            const aHasImage = a.images && a.images.length > 0;
            const bHasImage = b.images && b.images.length > 0;

            if (aHasImage && !bHasImage) return -1;

            if (!aHasImage && bHasImage) return 1;

            return 0;
        });

        return sortedResults;

    } catch (error: any) {
        console.warn('Finna search failed (silenced):', error.message);
        return [];
    }
};