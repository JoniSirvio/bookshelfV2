import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FinnaSearchResult } from '../api/finna';
import {
    fetchBooks,
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

    const { data: allBooks = [] } = useQuery({
        queryKey: ['userBooks', user?.uid],
        queryFn: async () => {
            if (!user) return [];
            return fetchBooks(user.uid);
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 10,
    });

    const myBooks = allBooks.filter(b => b.status === 'unread');
    const readBooks = allBooks.filter(b => b.status === 'read');
    const recommendations = allBooks.filter(b => b.status === 'recommendation');


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
                if (old.find(b => b.id === book.id)) return old;
                const newBook: FirestoreBook = {
                    ...book,
                    status,
                    order: Date.now(),
                    addedAt: new Date(),
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
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['userBooks', user?.uid] })
    });


    const addBook = async (book: FinnaSearchResult, status: 'unread' | 'read' = 'unread', finishedDate?: string) => {
        if (!user) return;

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
        if (!book && typeof bookOrId !== 'string') {
            const inputBook = bookOrId as FinnaSearchResult;
            const actualDate = finishedDate || (inputBook as any).finishedReading || new Date().toISOString();
            const bookWithMetadata: any = {
                ...inputBook,
                status: 'read',
                finishedReading: actualDate,
            };
            if (review !== undefined) bookWithMetadata.review = review;
            if (rating !== undefined) bookWithMetadata.rating = rating;
            if (readOrListened !== undefined) bookWithMetadata.readOrListened = readOrListened;

            addBookMutation.mutate({ book: bookWithMetadata, status: 'read', finishedDate: actualDate });
            return;
        }

        if (!book) return;

        const actualFinishedDate = finishedDate || book.finishedReading || new Date().toISOString();
        const updateData: Partial<FirestoreBook> = {
            status: 'read',
            finishedReading: actualFinishedDate,
        };
        if (review !== undefined) updateData.review = review;
        if (rating !== undefined) updateData.rating = rating;
        if (readOrListened !== undefined) updateData.readOrListened = readOrListened;

        updateBookMutation.mutate({ bookId, data: updateData });
    };

    const reorderBooks = (newList: FirestoreBook[], listType: 'myBooks' | 'readBooks') => {
        queryClient.setQueryData(['userBooks', user?.uid], (old: FirestoreBook[] | undefined) => {
            if (!old) return [];
            const oldMap = new Map(old.map(b => [b.id, b]));
            newList.forEach((item, index) => {
                const original = oldMap.get(item.id);
                if (original) original.order = index;
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
        const book = myBooks.find(b => b.id === bookId);
        if (book) {
            const rest = myBooks.filter(b => b.id !== bookId);
            reorderBooks([book, ...rest], 'myBooks');
        }
    };

    const generateRecommendations = async (userWishes?: string) => {
        if (!user) return;

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
                const exists = allBooks.some(b => b.id === bestMatch.id);
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
