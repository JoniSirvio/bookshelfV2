import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { searchFinna, FinnaSearchResult } from './finna';
import { searchAllABSBookLibraries, getRecentABSBookLibraryItems, ABSItem } from './abs';
import { queryClient } from '../utils/queryClient';

export interface ToolStatusUpdate {
    toolName: string;
    query?: string;
    status: 'running' | 'done' | 'failed';
    displayLabel: string;
}

export interface ToolContext {
    absCredentials?: { url: string; token: string } | null;
    userBooks?: {
        readBooks?: FinnaSearchResult[];
        myBooks?: FinnaSearchResult[];
    };
    onStatusUpdate?: (status: ToolStatusUpdate) => void;
}

export interface ToolExecutionResult {
    result: Record<string, any>;
    attachedBooks?: FinnaSearchResult[];
}

// 1. Tool Declarations for Gemini
export const searchFinnaDeclaration: FunctionDeclaration = {
    name: 'search_finna',
    description: 'Hae kirjoja virallisesta suomalaisesta Finna-tietokannasta (yleinen kirjastotietokanta). Käytä tätä yleisiin kirjasuosituksiin ja Finna-hakuun. HUOM: ÄLÄ KOSKAAN käytä tätä, jos käyttäjä pyysi etsimään Audiobookshelfistä (ABS) tai omasta kirjastostaan!',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            query: {
                type: SchemaType.STRING,
                description: 'Hakusana (esim. kirjan nimi, kirjailijan nimi tai genre)',
            },
        },
        required: ['query'],
    },
};

export const searchFinnaBatchDeclaration: FunctionDeclaration = {
    name: 'search_finna_batch',
    description: 'Hae useita kirjoja tai kirjailijoita Finna-tietokannasta rinnakkain yhdellä kutsulla. HUOM: ÄLÄ KOSKAAN käytä tätä, jos käyttäjä pyysi etsimään Audiobookshelfistä (ABS)!',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            queries: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.STRING,
                },
                description: 'Lista hakusanoja (esim. ["Tuntematon sotilas", "Sinuhe egyptiläinen"])',
            },
        },
        required: ['queries'],
    },
};

export const checkAudiobookshelfDeclaration: FunctionDeclaration = {
    name: 'check_audiobookshelf',
    description: 'Etsi, tarkista tai selaa teoksia käyttäjän omalta Audiobookshelf (ABS) -palvelimelta (äänikirjat ja e-kirjat). Käytä TÄTÄ työkalua aina kun käyttäjä mainitsee "ABS", "Audiobookshelf", "äänikirjat", "e-kirjat", "oma kirjasto" tai haluaa tietää mitä teoksia hänellä on tai suosituksia omista teoksistaan. TÄRKEÄÄ: Käytä hakusanana AINA kirjan aitoa nimeä (usein alkuperäiskielellä / englanniksi, esim. "Words of Radiance"), kirjailijaa (esim. "Brandon Sanderson") tai sarjan nimeä (esim. "Stormlight Archive"). ÄLÄ KOSKAAN keksi tekaistuja suomennoksia hakusanaksi! Jos halutaan selata kirjastoa, jätä query tyhjäksi tai käytä "browse".',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            query: {
                type: SchemaType.STRING,
                description: 'Haettavan kirjan aito nimi (esim. "Words of Radiance"), kirjailija ("Brandon Sanderson") tai sarja ("Stormlight Archive"). Älä koskaan käännä kirjojen nimiä omasta päästäsi!',
            },
        },
    },
};

export const getUserShelfDeclaration: FunctionDeclaration = {
    name: 'get_user_shelf',
    description: 'Tarkastele käyttäjän omia kirjalistoja sovelluksessa (luetut kirjat arvosteluineen tai luettavien to-be-read -lista).',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            shelf: {
                type: SchemaType.STRING,
                description: 'Haettava hylly: "read" (luetut), "myBooks" (luettavat) tai "all" (kaikki)',
            },
        },
    },
};

export const geminiTools = [
    {
        functionDeclarations: [
            searchFinnaDeclaration,
            searchFinnaBatchDeclaration,
            checkAudiobookshelfDeclaration,
            getUserShelfDeclaration,
        ],
    },
];

const timeoutPromise = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);
};

/**
 * Normalizes text for search matching:
 * lowercase, removes diacritics, strips punctuation into spaces, collapses whitespace.
 */
function normalizeSearchText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Retrieves all ABS items stored in TanStack Query cache in memory.
 * No network requests are made.
 */
export function getCachedABSItems(filterUrl?: string | null): ABSItem[] {
    const itemMap = new Map<string, ABSItem>();
    const cleanFilterUrl = filterUrl ? filterUrl.replace(/\/$/, '') : null;

    const queryLists = [
        ...queryClient.getQueriesData<ABSItem[]>({ queryKey: ['absItems'] }),
        ...queryClient.getQueriesData<ABSItem[]>({ queryKey: ['absNewBooks'] }),
    ];

    const addItem = (item: ABSItem) => {
        if (item && item.id && !itemMap.has(item.id)) {
            if (item.mediaType !== 'podcast') {
                itemMap.set(item.id, item);
            }
        }
    };

    // First pass: try matching the specific server URL if provided
    for (const [key, data] of queryLists) {
        if (!Array.isArray(data)) continue;
        if (cleanFilterUrl && key.length > 1 && typeof key[1] === 'string') {
            const queryUrl = key[1].replace(/\/$/, '');
            if (queryUrl !== cleanFilterUrl) continue;
        }
        data.forEach(addItem);
    }

    // Fallback: if no items matched with strict URL, take any cached ABS items
    if (itemMap.size === 0) {
        for (const [, data] of queryLists) {
            if (Array.isArray(data)) {
                data.forEach(addItem);
            }
        }
    }

    return Array.from(itemMap.values());
}

/**
 * Searches and scores cached ABS items in memory.
 */
export function searchCachedABSItems(
    items: ABSItem[],
    rawQuery: string,
    isBrowse: boolean = false
): ABSItem[] {
    if (!items || items.length === 0) return [];

    const lowerQuery = rawQuery.toLowerCase().trim();

    // Check if user specifically requested audiobooks or ebooks
    const isAudioOnly = /^(äänikirja|äänikirjat|audiobook|audiobooks)$/i.test(lowerQuery);
    const isEbookOnly = /^(e-kirja|e-kirjat|ekirja|ekirjat|ebook|ebooks)$/i.test(lowerQuery);

    if (isBrowse || !rawQuery.trim() || isAudioOnly || isEbookOnly) {
        let sorted = [...items];
        if (isAudioOnly) {
            sorted = sorted.filter((item) => {
                return Boolean(
                    (item.media?.numAudioFiles && item.media.numAudioFiles > 0) ||
                    (item.media?.audioFiles && item.media.audioFiles.length > 0) ||
                    (item.media?.duration && item.media.duration > 0) ||
                    (item.media?.tracks && item.media.tracks.length > 0) ||
                    item.mediaType === 'audiobook'
                );
            });
        } else if (isEbookOnly) {
            sorted = sorted.filter((item) => {
                return Boolean(
                    item.media?.ebookFile ||
                    (item.media?.numPages && item.media.numPages > 0) ||
                    (item.media as any)?.ebookFormat ||
                    item.mediaType === 'ebook'
                );
            });
        }

        // Sort newest first
        sorted.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        return sorted.slice(0, 50);
    }

    const normQuery = normalizeSearchText(rawQuery);
    const queryTokens = normQuery.split(' ').filter((t) => t.length > 1);

    interface ScoredItem {
        item: ABSItem;
        score: number;
    }

    const scoredItems: ScoredItem[] = [];

    for (const item of items) {
        const metadata = item.media?.metadata;
        const rawTitle = (metadata?.title || '').trim();
        const rawAuthor = (
            metadata?.authorName ||
            metadata?.authors?.map((a) => a.name).join(' ') ||
            ''
        ).trim();
        const rawSeries = (
            metadata?.series?.map((s: any) => (typeof s === 'string' ? s : s?.name)).filter(Boolean).join(' ') ||
            ''
        ).trim();
        const rawDesc = (metadata?.description || '').trim();

        const lowerTitle = rawTitle.toLowerCase();
        const lowerAuthor = rawAuthor.toLowerCase();
        const lowerSeries = rawSeries.toLowerCase();

        let score = 0;

        // 1. Direct case-insensitive match (highest precision)
        if (lowerTitle === lowerQuery) {
            score += 350;
        } else if (lowerTitle.startsWith(lowerQuery)) {
            score += 200;
        } else if (lowerTitle.includes(lowerQuery)) {
            score += 160;
        } else if (lowerQuery.length > 3 && lowerQuery.includes(lowerTitle)) {
            score += 130;
        }

        if (lowerSeries) {
            if (lowerSeries === lowerQuery) {
                score += 220;
            } else if (lowerSeries.includes(lowerQuery)) {
                score += 150;
            } else if (lowerQuery.includes(lowerSeries)) {
                score += 110;
            }
        }

        if (lowerAuthor) {
            if (lowerAuthor === lowerQuery) {
                score += 200;
            } else if (lowerAuthor.includes(lowerQuery)) {
                score += 140;
            } else if (lowerQuery.includes(lowerAuthor)) {
                score += 100;
            }
        }

        // 2. Normalized matching (handles punctuation, accents, brackets)
        const normTitle = normalizeSearchText(rawTitle);
        const normAuthor = normalizeSearchText(rawAuthor);
        const normSeries = normalizeSearchText(rawSeries);

        if (normTitle === normQuery && score < 300) {
            score += 300;
        } else if (normTitle.includes(normQuery) && score < 150) {
            score += 140;
        } else if (normQuery.length > 3 && normQuery.includes(normTitle) && score < 120) {
            score += 120;
        }

        if (normSeries && normSeries.includes(normQuery) && score < 130) {
            score += 130;
        }
        if (normAuthor && normAuthor.includes(normQuery) && score < 120) {
            score += 120;
        }

        // 3. Multi-token matching
        if (queryTokens.length > 0) {
            let matchedInTitleCount = 0;
            let matchedInAuthorOrSeriesCount = 0;

            for (const token of queryTokens) {
                const inTitle = normTitle.includes(token);
                const inAuthor = normAuthor.includes(token);
                const inSeries = normSeries.includes(token);

                if (inTitle) {
                    matchedInTitleCount++;
                    score += 30;
                }
                if (inAuthor || inSeries) {
                    matchedInAuthorOrSeriesCount++;
                    score += 25;
                }
            }

            // Bonus if all tokens appeared in title
            if (queryTokens.length > 1 && matchedInTitleCount === queryTokens.length) {
                score += 90;
            }
            // Bonus if all tokens appeared across title/author/series
            if (
                queryTokens.length > 1 &&
                matchedInTitleCount + matchedInAuthorOrSeriesCount >= queryTokens.length
            ) {
                score += 50;
            }
        }

        // 4. Fallback: description match (low weight)
        if (rawDesc && normQuery.length >= 4) {
            const normDesc = normalizeSearchText(rawDesc);
            if (normDesc.includes(normQuery)) {
                score += 20;
            }
        }

        if (score > 0) {
            scoredItems.push({ item, score });
        }
    }

    scoredItems.sort((a, b) => b.score - a.score);
    return scoredItems.map((s) => s.item).slice(0, 30);
}

// 2. Tool Execution Router
export const executeGeminiTool = async (
    name: string,
    args: Record<string, any>,
    context: ToolContext
): Promise<ToolExecutionResult> => {
    const { absCredentials, userBooks, onStatusUpdate } = context;

    switch (name) {
        case 'search_finna': {
            const query = String(args.query || '').trim();
            onStatusUpdate?.({
                toolName: name,
                query,
                status: 'running',
                displayLabel: `Haetaan Finnasta: "${query}"...`,
            });

            try {
                const results = await timeoutPromise(searchFinna(query), 5000, []);
                onStatusUpdate?.({
                    toolName: name,
                    query,
                    status: 'done',
                    displayLabel: `Finna-haku valmis (${results.length} löytyi)`,
                });

                const topMatches = results.slice(0, 5);
                return {
                    result: {
                        query,
                        count: results.length,
                        books: topMatches.map((b) => ({
                            id: b.id,
                            title: b.title,
                            authors: b.authors,
                            year: b.publicationYear,
                            hasCover: Boolean(b.images && b.images.length > 0),
                            summary: b.summary ? b.summary.slice(0, 300) : undefined,
                        })),
                    },
                    attachedBooks: topMatches,
                };
            } catch (err: any) {
                onStatusUpdate?.({
                    toolName: name,
                    query,
                    status: 'failed',
                    displayLabel: 'Finna-haku epäonnistui',
                });
                return {
                    result: { error: err?.message || 'Finna search failed' },
                };
            }
        }

        case 'search_finna_batch': {
            const queries: string[] = Array.isArray(args.queries) ? args.queries.slice(0, 10) : [];
            onStatusUpdate?.({
                toolName: name,
                query: queries.join(', '),
                status: 'running',
                displayLabel: `Tarkistetaan ${queries.length} kirjaa Finnasta...`,
            });

            try {
                const searchPromises = queries.map((q) =>
                    timeoutPromise(searchFinna(q), 5000, []).then((res) => ({
                        query: q,
                        topMatch: res[0] || null,
                    }))
                );

                const batchResults = await Promise.all(searchPromises);
                const verifiedBooks: FinnaSearchResult[] = [];

                const payload = batchResults.map((r) => {
                    if (r.topMatch) {
                        verifiedBooks.push(r.topMatch);
                        return {
                            query: r.query,
                            found: true,
                            id: r.topMatch.id,
                            title: r.topMatch.title,
                            authors: r.topMatch.authors,
                            year: r.topMatch.publicationYear,
                            summary: r.topMatch.summary ? r.topMatch.summary.slice(0, 300) : undefined,
                        };
                    }
                    return { query: r.query, found: false };
                });

                onStatusUpdate?.({
                    toolName: name,
                    status: 'done',
                    displayLabel: `${verifiedBooks.length}/${queries.length} kirjaa varmistettu Finnasta`,
                });

                return {
                    result: { results: payload },
                    attachedBooks: verifiedBooks,
                };
            } catch (err: any) {
                onStatusUpdate?.({
                    toolName: name,
                    status: 'failed',
                    displayLabel: 'Finna-sarjahaku epäonnistui',
                });
                return {
                    result: { error: err?.message || 'Batch Finna search failed' },
                };
            }
        }

        case 'check_audiobookshelf': {
            const rawQuery = String(args.query || '').trim();
            const isBrowse = !rawQuery || /^(browse|kaikki|all|uudet|kirjat|suosittele)$/i.test(rawQuery);
            const query = isBrowse ? '' : rawQuery;

            onStatusUpdate?.({
                toolName: name,
                query: query || 'Kirjaston selaus',
                status: 'running',
                displayLabel: query
                    ? `Tarkistetaan Audiobookshelf: "${query}"...`
                    : 'Selaataan Audiobookshelf-kirjastoa...',
            });

            if (!absCredentials?.url || !absCredentials?.token) {
                onStatusUpdate?.({
                    toolName: name,
                    query: query || 'Kirjaston selaus',
                    status: 'done',
                    displayLabel: 'Audiobookshelf ei ole yhdistetty',
                });
                return {
                    result: {
                        connected: false,
                        message: 'Käyttäjän Audiobookshelf-palvelinta ei ole määritetty tai käyttäjä ei ole kirjautunut sisään.',
                    },
                };
            }

            try {
                let allItems: ABSItem[] = [];

                // 1. Memory-first: Search cached items from TanStack Query (no network calls, instant, zero server load)
                const cachedItems = getCachedABSItems(absCredentials.url);

                if (cachedItems.length > 0) {
                    allItems = searchCachedABSItems(cachedItems, query, isBrowse);
                } else {
                    // Fallback to network only if local cache has not finished populating yet
                    if (isBrowse) {
                        allItems = await timeoutPromise(
                            getRecentABSBookLibraryItems(absCredentials.url, absCredentials.token, 50),
                            6000,
                            []
                        );
                    } else {
                        const searchResults = await timeoutPromise(
                            searchAllABSBookLibraries(absCredentials.url, absCredentials.token, query),
                            6000,
                            []
                        );
                        searchResults.forEach((group) => {
                            allItems.push(...group.items);
                        });

                        // Fallback 1: If cleanQuery without parentheses/brackets is different, try cleanQuery
                        const cleanQuery = query.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
                        if (allItems.length === 0 && cleanQuery && cleanQuery !== query) {
                            const fallbackResults = await timeoutPromise(
                                searchAllABSBookLibraries(absCredentials.url, absCredentials.token, cleanQuery),
                                6000,
                                []
                            );
                            fallbackResults.forEach((group) => {
                                allItems.push(...group.items);
                            });
                        }

                        // Fallback 2: If query has colon or dash (e.g. "Stormlight Archive: Words of Radiance")
                        if (allItems.length === 0 && (query.includes(':') || query.includes(' - '))) {
                            const parts = query.split(/[:\-]/).map(p => p.trim()).filter(Boolean);
                            for (const part of parts) {
                                if (part.length >= 3) {
                                    const partResults = await timeoutPromise(
                                        searchAllABSBookLibraries(absCredentials.url, absCredentials.token, part),
                                        5000,
                                        []
                                    );
                                    partResults.forEach((group) => {
                                        allItems.push(...group.items);
                                    });
                                    if (allItems.length > 0) break;
                                }
                            }
                        }
                    }
                }

                // De-duplicate allItems by ID
                const uniqueItems: ABSItem[] = [];
                const seenItemIds = new Set<string>();
                for (const item of allItems) {
                    if (item && item.id && !seenItemIds.has(item.id)) {
                        seenItemIds.add(item.id);
                        uniqueItems.push(item);
                    }
                }
                allItems = uniqueItems;

                onStatusUpdate?.({
                    toolName: name,
                    query: query || 'Kirjaston selaus',
                    status: 'done',
                    displayLabel: allItems.length > 0
                        ? `Löytyi ${allItems.length} teosta Audiobookshelfistä`
                        : 'Ei osumia Audiobookshelfissä',
                });

                if (allItems.length === 0) {
                    return {
                        result: {
                            connected: true,
                            count: 0,
                            query,
                            isBrowse,
                            message: query
                                ? `Teosta tai hakusanaa "${query}" ei löytynyt käyttäjän omalta Audiobookshelf-palvelimelta.`
                                : `Käyttäjän Audiobookshelf-kirjastosta ei löytynyt teoksia.`,
                            matches: [],
                        },
                        attachedBooks: [],
                    };
                }

                // Check for user progress in cache to enrich progress
                const meQueries = queryClient.getQueriesData<{ mediaProgress?: any[] }>({ queryKey: ['absMe'] });
                const progressMap = new Map<string, any>();
                for (const [, meData] of meQueries) {
                    if (meData?.mediaProgress && Array.isArray(meData.mediaProgress)) {
                        for (const p of meData.mediaProgress) {
                            if (p.libraryItemId) {
                                progressMap.set(p.libraryItemId, p);
                            }
                        }
                    }
                }

                // Map ABSItems to FinnaSearchResult-compatible cards for attachedBooks (up to 8 books)
                const attachedBooks: FinnaSearchResult[] = allItems.slice(0, 8).map((item) => {
                    const cleanUrl = absCredentials.url.replace(/\/$/, "");
                    const cleanId = item.id.replace(/^abs-/, "");
                    const coverUrl = `${cleanUrl}/api/items/${cleanId}/cover?token=${absCredentials.token}`;

                    const hasAudio = Boolean(
                        (item.media?.numAudioFiles && item.media.numAudioFiles > 0) ||
                        (item.media?.audioFiles && item.media.audioFiles.length > 0) ||
                        (item.media?.duration && item.media.duration > 0) ||
                        (item.media?.tracks && item.media.tracks.length > 0) ||
                        item.mediaType === 'audiobook'
                    );
                    const hasEbook = Boolean(
                        item.media?.ebookFile ||
                        (item.media?.numPages && item.media.numPages > 0) ||
                        (item.media as any)?.ebookFormat ||
                        item.mediaType === 'ebook'
                    );

                    let format: 'audiobook' | 'ebook' | 'both' = 'audiobook';
                    if (hasAudio && hasEbook) {
                        format = 'both';
                    } else if (hasEbook && !hasAudio) {
                        format = 'ebook';
                    } else {
                        format = 'audiobook';
                    }

                    const userProgress = item.userMedia || progressMap.get(item.id);

                    return {
                        id: `abs-${cleanId}`,
                        title: item.media?.metadata?.title || 'Tuntematon teos',
                        authors: item.media?.metadata?.authors?.map(a => a.name) || (item.media?.metadata?.authorName ? [item.media.metadata.authorName] : []),
                        publicationYear: item.media?.metadata?.publishedYear,
                        images: [{ url: coverUrl }],
                        readOrListened: hasAudio ? 'listened' : 'read',
                        format,
                        absMediaTypes: {
                            hasAudio,
                            hasEbook,
                        },
                        absProgress: userProgress ? {
                            percentage: Math.round((userProgress.progress || 0) * 100),
                            timeLeft: '',
                            duration: userProgress.duration || 0,
                            currentTime: userProgress.currentTime || 0,
                            isFinished: Boolean(userProgress.finishedAt || userProgress.isFinished),
                        } : undefined,
                    };
                });

                return {
                    result: {
                        connected: true,
                        count: allItems.length,
                        isBrowse,
                        matches: allItems.slice(0, 20).map((item) => {
                            const hasAudio = Boolean(
                                (item.media?.numAudioFiles && item.media.numAudioFiles > 0) ||
                                (item.media?.audioFiles && item.media.audioFiles.length > 0) ||
                                (item.media?.duration && item.media.duration > 0) ||
                                (item.media?.tracks && item.media.tracks.length > 0) ||
                                item.mediaType === 'audiobook'
                            );
                            const hasEbook = Boolean(
                                item.media?.ebookFile ||
                                (item.media?.numPages && item.media.numPages > 0) ||
                                (item.media as any)?.ebookFormat ||
                                item.mediaType === 'ebook'
                            );
                            let format = 'audiobook';
                            if (hasAudio && hasEbook) format = 'both';
                            else if (hasEbook && !hasAudio) format = 'ebook';

                            const seriesName = item.media?.metadata?.series?.map((s: any) => typeof s === 'string' ? s : s?.name).filter(Boolean).join(', ') || undefined;
                            const userProgress = item.userMedia || progressMap.get(item.id);

                            return {
                                id: item.id,
                                title: item.media?.metadata?.title,
                                author: item.media?.metadata?.authorName || item.media?.metadata?.authors?.[0]?.name,
                                series: seriesName,
                                format,
                                hasAudio,
                                hasEbook,
                                durationMinutes: item.media?.duration ? Math.round(item.media.duration / 60) : undefined,
                                progressPercent: userProgress?.progress ? Math.round(userProgress.progress * 100) : 0,
                                isFinished: Boolean(userProgress?.finishedAt || userProgress?.isFinished),
                            };
                        }),
                    },
                    attachedBooks,
                };
            } catch (err: any) {
                onStatusUpdate?.({
                    toolName: name,
                    query: query || 'Kirjaston selaus',
                    status: 'failed',
                    displayLabel: 'Audiobookshelf-haku epäonnistui',
                });
                return {
                    result: {
                        connected: false,
                        error: err?.message || 'Failed to search Audiobookshelf',
                    },
                };
            }
        }

        case 'get_user_shelf': {
            const shelf = String(args.shelf || 'all').toLowerCase();
            onStatusUpdate?.({
                toolName: name,
                status: 'running',
                displayLabel: `Tarkistetaan omat kirjat (${shelf})...`,
            });

            const readBooks = userBooks?.readBooks || [];
            const myBooks = userBooks?.myBooks || [];

            let selectedBooks: { shelf: string; title: string; author: string; rating?: number }[] = [];

            if (shelf === 'read' || shelf === 'all') {
                selectedBooks.push(
                    ...readBooks.slice(0, 50).map((b) => ({
                        shelf: 'read',
                        title: b.title,
                        author: (b.authors || []).join(', '),
                        rating: b.rating,
                    }))
                );
            }

            if (shelf === 'mybooks' || shelf === 'tbr' || shelf === 'all') {
                selectedBooks.push(
                    ...myBooks.slice(0, 50).map((b) => ({
                        shelf: 'myBooks',
                        title: b.title,
                        author: (b.authors || []).join(', '),
                    }))
                );
            }

            onStatusUpdate?.({
                toolName: name,
                status: 'done',
                displayLabel: `Omat kirjat haettu (${selectedBooks.length} kpl)`,
            });

            return {
                result: {
                    shelfRequested: shelf,
                    totalReturned: selectedBooks.length,
                    books: selectedBooks,
                },
            };
        }

        default:
            return {
                result: { error: `Unknown tool: ${name}` },
            };
    }
};
