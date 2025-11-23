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
}

const FINNA_API_BASE_URL = 'https://api.finna.fi/api/v1/';

export const searchFinna = async (query: string): Promise<FinnaSearchResult[]> => {
    try {
        const response = await axios.get(`${FINNA_API_BASE_URL}search`, {
            params: {
                lookfor: query,
                type: 'AllFields',
                limit: 10,
                filter: ['format:0/Book/', 'language:fin', 'building:0/Outi/'],
            },
        });


        return response.data.records.map((record: any) => ({
            id: record.id,
            title: record.title,
            authors: record.nonPresenterAuthors?.map((a: any) => String(a.name || '')) ?? [],
            publicationYear: record.year,
            images: record.images?.map((img: string) => ({ url: `https://api.finna.fi${img}` })) ?? [],
        }));
    } catch (error) {
        console.error('Error searching Finna:', JSON.stringify(error, null, 2));
        return [];
    }
};