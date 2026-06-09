export const ABS_LAST_LIBRARY_ID_KEY = 'abs_last_library_id';

export const absLibrariesKey = (url: string | null) => ['absLibraries', url] as const;

export const absItemsKey = (url: string | null, libraryId: string | null) =>
    ['absItems', url, libraryId] as const;

export const absNewBooksKey = (url: string | null, libraryIdsKey: string) =>
    ['absNewBooks', url, libraryIdsKey] as const;

export const hasNewBooksKey = (url: string | null) => ['hasNewBooks', url] as const;

/** Query keys that should be persisted to disk. */
export const PERSISTED_ABS_QUERY_ROOTS = new Set(['absItems', 'absLibraries', 'absNewBooks']);
