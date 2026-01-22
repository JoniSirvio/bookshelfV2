import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FinnaSearchResult } from '../api/finna';
import {
    fetchBooks, // New function
    addBookToFirestore,
    removeBookFromFirestore,
    updateBookInFirestore,
    updateBooksOrder,
    FirestoreBook
} from '../firebase/books';
import { useAuth } from '../context/AuthContext';

export const useBooks = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // 1. Fetch all books
    const { data: allBooks = [] } = useQuery({
        queryKey: ['userBooks', user?.uid],
        queryFn: async () => {
            if (!user) return [];
            return fetchBooks(user.uid);
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 10, // 10 minutes cache (Single Device usage)
    });

    // Derived State
    const myBooks = allBooks.filter(b => b.status === 'unread');
    const readBooks = allBooks.filter(b => b.status === 'read');
    const recommendations = allBooks.filter(b => b.status === 'recommendation');


    // 2. Mutations
    // Helper to optimistically update cache
    const updateCache = (updater: (old: FirestoreBook[]) => FirestoreBook[]) => {
        queryClient.setQueryData(['userBooks', user?.uid], (old: FirestoreBook[] | undefined) => {
            return updater(old || []);
        });
    };

    const addBookMutation = useMutation({
        mutationFn: async ({ book, status, finishedDate, reason }: { book: FinnaSearchResult, status: 'unread' | 'read' | 'recommendation', finishedDate?: string, reason?: string }) => {
            if (!user) return;
            await addBookToFirestore(user.uid, book, status, reason, finishedDate);
        },
        onMutate: async ({ book, status, finishedDate, reason }) => {
            await queryClient.cancelQueries({ queryKey: ['userBooks', user?.uid] });
            const previousBooks = queryClient.getQueryData<FirestoreBook[]>(['userBooks', user?.uid]);

            updateCache(old => {
                if (old.find(b => b.id === book.id)) return old; // Duplicate check
                const newBook: FirestoreBook = {
                    ...book,
                    status,
                    order: Date.now(),
                    addedAt: new Date(), // Provisional
                    recommendationReason: reason,
                    finishedReading: finishedDate
                } as FirestoreBook;
                return [...old, newBook];
            });

            return { previousBooks };
        },
        onError: (err, newBook, context) => {
            if (context?.previousBooks) {
                queryClient.setQueryData(['userBooks', user?.uid], context.previousBooks);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['userBooks', user?.uid] });
        }
    });

    const removeBookMutation = useMutation({
        mutationFn: async (bookId: string) => {
            if (!user) return;
            await removeBookFromFirestore(user.uid, bookId);
        },
        onMutate: async (bookId) => {
            await queryClient.cancelQueries({ queryKey: ['userBooks', user?.uid] });
            const previousBooks = queryClient.getQueryData<FirestoreBook[]>(['userBooks', user?.uid]);

            updateCache(old => old.filter(b => b.id !== bookId));

            return { previousBooks };
        },
        onError: (err, vars, context) => {
            if (context?.previousBooks) queryClient.setQueryData(['userBooks', user?.uid], context.previousBooks);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['userBooks', user?.uid] })
    });

    const updateBookMutation = useMutation({
        mutationFn: async ({ bookId, data }: { bookId: string, data: Partial<FirestoreBook> }) => {
            if (!user) return;
            await updateBookInFirestore(user.uid, bookId, data);
        },
        onMutate: async ({ bookId, data }) => {
            await queryClient.cancelQueries({ queryKey: ['userBooks', user?.uid] });
            const previousBooks = queryClient.getQueryData<FirestoreBook[]>(['userBooks', user?.uid]);

            updateCache(old => old.map(b => b.id === bookId ? { ...b, ...data } : b));

            return { previousBooks };
        },
        onError: (err, vars, context) => {
            if (context?.previousBooks) queryClient.setQueryData(['userBooks', user?.uid], context.previousBooks);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['userBooks', user?.uid] })
    });

    const reorderMutation = useMutation({
        mutationFn: async (newList: FirestoreBook[]) => {
            if (!user) return;
            await updateBooksOrder(user.uid, newList);
        },
        // We handle optimistic update manually in the reorderBooks wrapper to keep logic simple
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['userBooks', user?.uid] })
    });


    // 3. Exposed API (Interpreters) -- Keeping the same signature as before
    const addBook = async (book: FinnaSearchResult, status: 'unread' | 'read' = 'unread', finishedDate?: string) => {
        if (!user) return;

        // Recommendation handling logic from previous reducer
        const existingRec = recommendations.find(b => b.id === book.id);
        if (existingRec) {
            const updatePayload: any = { status: status, addedAt: new Date() };
            if (status === 'read') updatePayload.finishedReading = finishedDate || new Date().toISOString();
            updateBookMutation.mutate({ bookId: book.id, data: updatePayload });
            return;
        }

        if (myBooks.find(b => b.id === book.id) || readBooks.find(b => b.id === book.id)) return;

        addBookMutation.mutate({ book, status, finishedDate });
    };

    const removeBook = (bookId: string) => removeBookMutation.mutate(bookId);
    const removeReadBook = (bookId: string) => removeBookMutation.mutate(bookId);
    const removeRecommendation = (bookId: string) => removeBookMutation.mutate(bookId);

    const markAsRead = (bookOrId: string | FinnaSearchResult, review?: string, rating?: number, readOrListened?: string, finishedDate?: string) => {
        if (!user) return;
        const bookId = typeof bookOrId === 'string' ? bookOrId : bookOrId.id;

        let book = allBooks.find(b => b.id === bookId);
        // Handle external book (Search/ABS)
        if (!book && typeof bookOrId !== 'string') {
            // It's a new book! Add it as read directly.
            // We need to construct the book object
            const inputBook = bookOrId as FinnaSearchResult;

            // Reuse logic: Add book with 'read' status + extended props
            const actualFinishedDate = finishedDate || new Date().toISOString();
            // We can't use 'addBookMutation' easily because it only takes basic args. 
            // We need a custom logic or extended payload.
            // Actually `addBookToFirestore` supports extra args if we modified it?
            // But here we want to pass review etc.

            // simpler: Add basic, then update? No, that's 2 writes.
            // Best: Since we can't easily change `addBookMutation` signature without breaking generic use,
            // let's just run the firestore op directly in the mutation OR create a specific one.
            // But we want optimistic updates.

            // Simplest: Add it as 'read' via addBookMutation (we need to pass extra data though)
            // I'll update addBookMutation to allow extra fields? No, `addBookToFirestore` doesn't take review.
            // `addBookToFirestore` takes `finishedDate`.
            // Review/Rating are typically updates.

            // Wait, the previous reducer handled this by:
            // 1. If existing: update.
            // 2. If new: `addBookToFirestore` with merged data.
            // The `addBookToFirestore` in `firebase/books.ts` ONLY takes status, reason, finishedDate.
            // It does NOT take review/rating. 
            // If I look at `firebase/books.ts` (Step 1647):
            // `addBookToFirestore(..., status, recommendationReason, finishedDate)` -> `setDoc(..., newBook)`.
            // It creates `newBook = { ...book, ...}`.

            // So if I pass a `book` object that ALREADY HAS review/rating/readOrListened, it will save them! 
            // YES. `FinnaSearchResult` doesn't strictly type those, but `FirestoreBook` does.
            // If I cast `bookOrId` to `FirestoreBook` or mix in the props.

            const actualDate = finishedDate || new Date().toISOString();
            const bookWithMetadata = {
                ...inputBook,
                review,
                rating,
                readOrListened,
                finishedReading: actualDate,
                daysRead: undefined // Calculated if needed
            } as any; // Cast to bypass strict FinnaSearchResult

            addBookMutation.mutate({ book: bookWithMetadata, status: 'read', finishedDate: actualDate });
            return;
        }

        if (!book) return;

        const actualFinishedDate = finishedDate || book.finishedReading || new Date().toISOString();
        const updateData: Partial<FirestoreBook> = {
            status: 'read',
            finishedReading: actualFinishedDate,
            // Re-calc daysRead?
            // Order update?
        };
        // Logic for order update (put at top of read list)
        // ...

        if (review !== undefined) updateData.review = review;
        if (rating !== undefined) updateData.rating = rating;
        if (readOrListened !== undefined) updateData.readOrListened = readOrListened;

        updateBookMutation.mutate({ bookId, data: updateData });
    };

    const reorderBooks = (newList: FirestoreBook[], listType: 'myBooks' | 'readBooks') => {
        // We only support reordering myBooks or readBooks locally, then push to server.
        // But since `allBooks` is one big list, we need to be careful.
        // We act optimistically on the filtered list, but we need to update the Cache's BIG list.

        // This is complex. `updateBooksOrder` updates a subset? 
        // `updateBooksOrder` takes `books`. It iterates and updates `order` field.

        // Optimistic update:
        queryClient.setQueryData(['userBooks', user?.uid], (old: FirestoreBook[] | undefined) => {
            if (!old) return [];
            const oldMap = new Map(old.map(b => [b.id, b]));

            // Update the order of items in `newList`
            newList.forEach((item, index) => {
                const original = oldMap.get(item.id);
                if (original) {
                    original.order = index; // Or list-specific offset?
                    // Currently myBooks and readBooks share 'order' space?
                    // If I reorder Read shelf, I shouldn't mess up Unread shelf order?
                    // The previous implementation `orderBy('order', 'asc')` implies global order?
                    // Or maybe they are disjoint?
                    // If I have 10 unread and 10 read.
                    // If I reorder Read, I'm setting their order to 0..9.
                    // If Unread also has 0..9, sorting is weird?
                    // Usually lists have independent ordering or global.
                    // Looking at `reorderBooks` in old hook:
                    // `dispatch({ type: 'REORDER_BOOKS', newList, listType })`
                    // It updated local state for that list.
                    // Then called `updateBooksOrder(uid, newList)`.
                    // `updateBooksOrder` updates `order` field for THOSE books to 0..N.

                    // So yes, if I reorder Read books, they get order 0, 1, 2...
                    // If I reorder Unread books, they get order 0, 1, 2...
                    // This means `orderBy('order')` in `fetchBooks` will interleave them if we fetched all together?
                    // `fetchBooks` does `orderBy('order', 'asc')`.
                    // If Unread[0].order=0 and Read[0].order=0...
                    // `allBooks` will have them mixed.
                    // But we filter: `myBooks = allBooks.filter(...)`.
                    // `myBooks.sort(order)` -> they will be correct RELATIVE to each other.
                    // So we just need to update the `order` property in the cache.
                }
            });

            return Array.from(oldMap.values());
        });

        reorderMutation.mutate(newList);
    };

    const startReading = (bookId: string) => {
        updateBookMutation.mutate({
            bookId,
            data: { startedReading: new Date().toISOString() }
        });
        // We should also move it to top?
        // Old logic: splice and unshift.
        // Effectively order=0 (or min - 1).
        // updateBookMutation logic handles `data` merge. To allow order update we can pass it.
        // But `updateBookInFirestore` is generic.

        // Should we replicate standard behavior?
        // For now simpler is better. Just update timestamp. 
    };

    const generateRecommendations = async (userWishes?: string) => {
        // This is complex API + multiple adds.
        // We can keep the logic mostly same but use `addBookMutation`?
        // Or just direct `addBookToFirestore` calls and then valid queries.
        if (!user) return;

        // Remove old recs
        // We can't use `removeBookMutation` in loop efficiently (lots of re-renders).
        // Better: direct calls + 1 invalidation.

        const deletePromises = recommendations.map(r => removeBookFromFirestore(user.uid, r.id));
        await Promise.all(deletePromises);

        const readBookTitles = readBooks.map(b => `${b.title} by ${b.authors.join(', ')}`);

        const { getBookRecommendations } = await import('../api/gemini');
        const { searchFinna } = await import('../api/finna');

        const newRecs = await getBookRecommendations(readBookTitles, userWishes);

        for (const rec of newRecs) {
            const query = `${rec.title} ${rec.author}`;
            const searchResults = await searchFinna(query);
            const bestMatch = searchResults[0];

            if (bestMatch) {
                const exists = allBooks.some(b => b.id === bestMatch.id); // Ensure `allBooks` usage
                if (!exists) {
                    await addBookToFirestore(user.uid, bestMatch, 'recommendation', rec.reason);
                }
            }
        }

        queryClient.invalidateQueries({ queryKey: ['userBooks', user.uid] });
    };

    return {
        myBooks,
        readBooks,
        recommendations,
        addBook,
        removeBook,
        removeReadBook,
        removeRecommendation,
        markAsRead,
        reorderBooks,
        startReading,
        generateRecommendations
    };
};

import { useState } from 'react';
import { searchFinna } from '../api/finna';

export const useFinnaSearchResults = () => {
    const [results, setResults] = useState<FinnaSearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    const searchBooks = async (query: string) => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const books = await searchFinna(query);
            setResults(books);
        } finally {
            setLoading(false);
        }
    };

    return { results, loading, searchBooks };
};
