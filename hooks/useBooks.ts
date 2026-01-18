import { useReducer, useEffect, useRef } from 'react';
import { FinnaSearchResult } from '../api/finna';
import {
    subscribeToBooks,
    addBookToFirestore,
    removeBookFromFirestore,
    updateBookInFirestore,
    updateBooksOrder,
    FirestoreBook
} from '../firebase/books';
import { useAuth } from '../context/AuthContext';

type BookState = {
    myBooks: FirestoreBook[];
    readBooks: FirestoreBook[];
    recommendations: FirestoreBook[];
};

type BookAction =
    | { type: 'LOAD_BOOKS'; myBooks: FirestoreBook[]; readBooks: FirestoreBook[]; recommendations: FirestoreBook[] }
    | { type: 'ADD_BOOK'; book: FirestoreBook }
    | { type: 'REMOVE_BOOK'; bookId: string }
    | { type: 'REMOVE_BOOK'; bookId: string }
    | { type: 'REMOVE_READ_BOOK'; bookId: string }
    | { type: 'REMOVE_RECOMMENDATION'; bookId: string }
    | { type: 'MARK_AS_READ'; bookId: string; review?: string; rating?: number; readOrListened?: string; finishedDate?: string }
    | { type: 'REORDER_BOOKS'; newList: FirestoreBook[]; listType: 'myBooks' | 'readBooks' }
    | { type: 'START_READING'; bookId: string };

const initialState: BookState = {
    myBooks: [],
    readBooks: [],
    recommendations: [],
};

function bookReducer(state: BookState, action: BookAction): BookState {
    switch (action.type) {
        case 'LOAD_BOOKS':
            return {
                ...state,
                myBooks: action.myBooks,
                readBooks: action.readBooks,
                recommendations: action.recommendations,
            };
        case 'ADD_BOOK':
            if (state.myBooks.find(b => b.id === action.book.id)) return state;
            return { ...state, myBooks: [...state.myBooks, action.book] };
        case 'REMOVE_BOOK':
            return { ...state, myBooks: state.myBooks.filter(book => book.id !== action.bookId) };
        case 'REMOVE_READ_BOOK':
            return { ...state, readBooks: state.readBooks.filter(book => book.id !== action.bookId) };
        case 'REMOVE_RECOMMENDATION':
            return { ...state, recommendations: state.recommendations.filter(book => book.id !== action.bookId) };
        case 'MARK_AS_READ':
            // Optimistic update logic if needed, but we rely on subscription mostly.
            // However, for smooth UI, we can keep it.
            const bookToMark = state.myBooks.find(book => book.id === action.bookId);
            if (!bookToMark) return state;

            const updatedBook: FirestoreBook = {
                ...bookToMark,
                status: 'read',
                review: action.review,
                rating: action.rating,
                readOrListened: action.readOrListened,
                finishedReading: action.finishedDate || new Date().toISOString(),
                daysRead: bookToMark.startedReading
                    ? Math.ceil((new Date().getTime() - new Date(bookToMark.startedReading).getTime()) / (1000 * 3600 * 24))
                    : undefined,
            };

            return {
                ...state,
                myBooks: state.myBooks.filter(book => book.id !== action.bookId),
                readBooks: [...state.readBooks, updatedBook],
            };
        case 'REORDER_BOOKS':
            return { ...state, [action.listType]: action.newList };

        case 'START_READING':
            const bookIndexToStart = state.myBooks.findIndex(b => b.id === action.bookId);
            if (bookIndexToStart === -1) return state;

            const bookToStart = { ...state.myBooks[bookIndexToStart], startedReading: new Date().toISOString() };
            const updatedMyBooks = [...state.myBooks];
            updatedMyBooks.splice(bookIndexToStart, 1);
            updatedMyBooks.unshift(bookToStart);

            return {
                ...state,
                myBooks: updatedMyBooks,
            };
        default:
            return state;
    }
}

export const useBooks = () => {
    const [state, dispatch] = useReducer(bookReducer, initialState);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            dispatch({ type: 'LOAD_BOOKS', myBooks: [], readBooks: [], recommendations: [] });
            return;
        }

        const unsubscribe = subscribeToBooks(user.uid, (books) => {
            const myBooks = books.filter(b => b.status === 'unread');
            const readBooks = books.filter(b => b.status === 'read');
            const recommendations = books.filter(b => b.status === 'recommendation');

            dispatch({
                type: 'LOAD_BOOKS',
                myBooks,
                readBooks,
                recommendations
            });
        });

        return () => unsubscribe();
    }, [user]);

    const addBook = async (book: FinnaSearchResult, status: 'unread' | 'read' = 'unread', finishedDate?: string) => {
        if (!user) return;

        // If it's already in recommendations, we update it to new status
        const existingRec = state.recommendations.find(b => b.id === book.id);
        if (existingRec) {
            dispatch({ type: 'REMOVE_RECOMMENDATION', bookId: book.id }); // Remove from recs in UI
            // Add to myBooks in UI (will be reloaded by listener anyway, but for optimism)
            // dispatch({ type: 'ADD_BOOK', book: { ...book, status: 'unread' } as FirestoreBook }); 
            // Actually simpler to just update firestore

            const updatePayload: any = { status: status, addedAt: new Date() };
            if (status === 'read') {
                updatePayload.finishedReading = finishedDate || new Date().toISOString();
            }

            await updateBookInFirestore(user.uid, book.id, updatePayload);
            return;
        }

        if (state.myBooks.find(b => b.id === book.id) || state.readBooks.find(b => b.id === book.id)) {
            return;
        }
        await addBookToFirestore(user.uid, book, status, undefined, finishedDate);
    };

    const removeBook = async (bookId: string) => {
        if (!user) return;
        dispatch({ type: 'REMOVE_BOOK', bookId }); // Optimistic
        await removeBookFromFirestore(user.uid, bookId);
    };

    const removeReadBook = async (bookId: string) => {
        if (!user) return;
        dispatch({ type: 'REMOVE_READ_BOOK', bookId }); // Optimistic
        await removeBookFromFirestore(user.uid, bookId);
    };

    const markAsRead = async (bookId: string, review?: string, rating?: number, readOrListened?: string, finishedDate?: string) => {
        if (!user) return;
        const book = state.myBooks.find(b => b.id === bookId);
        if (!book) return;

        dispatch({ type: 'MARK_AS_READ', bookId, review, rating, readOrListened, finishedDate }); // Optimistic

        const daysRead = book.startedReading
            ? Math.ceil((new Date().getTime() - new Date(book.startedReading).getTime()) / (1000 * 3600 * 24))
            : undefined;

        const currentMinOrder = state.readBooks.length > 0
            ? Math.min(...state.readBooks.map(b => b.order || 0))
            : Date.now();
        const newOrder = currentMinOrder - 1000;

        const updateData: Partial<FirestoreBook> = {
            status: 'read',
            finishedReading: finishedDate || new Date().toISOString(),
            order: newOrder
        };

        if (review !== undefined) updateData.review = review;
        if (rating !== undefined) updateData.rating = rating;
        if (readOrListened !== undefined) updateData.readOrListened = readOrListened;
        if (daysRead !== undefined) updateData.daysRead = daysRead;

        await updateBookInFirestore(user.uid, bookId, updateData);
    };

    const reorderBooks = async (newList: FirestoreBook[], listType: 'myBooks' | 'readBooks') => {
        if (!user) return;
        dispatch({ type: 'REORDER_BOOKS', newList, listType }); // Optimistic
        await updateBooksOrder(user.uid, newList);
    };

    const startReading = async (bookId: string) => {
        if (!user) return;
        dispatch({ type: 'START_READING', bookId }); // Optimistic

        await updateBookInFirestore(user.uid, bookId, { startedReading: new Date().toISOString() });

        const bookIndex = state.myBooks.findIndex(b => b.id === bookId);
        if (bookIndex !== -1) {
            const bookToStart = { ...state.myBooks[bookIndex], startedReading: new Date().toISOString() };
            const updatedMyBooks = [...state.myBooks];
            updatedMyBooks.splice(bookIndex, 1);
            updatedMyBooks.unshift(bookToStart);
            await updateBooksOrder(user.uid, updatedMyBooks);
        }
    };

    const removeRecommendation = async (bookId: string) => {
        if (!user) return;
        dispatch({ type: 'REMOVE_RECOMMENDATION', bookId });
        await removeBookFromFirestore(user.uid, bookId);
    };

    const generateRecommendations = async (userWishes?: string) => {
        if (!user) return;

        // delete old recommendations
        const deletePromises = state.recommendations.map(r => removeBookFromFirestore(user.uid, r.id));
        await Promise.all(deletePromises);

        const readBookTitles = state.readBooks.map(b => `${b.title} by ${b.authors.join(', ')}`);

        const { getBookRecommendations } = await import('../api/gemini');
        const { searchFinna } = await import('../api/finna');

        // If no read books, maybe pass empty array or handle inside api
        const recommendations = await getBookRecommendations(readBookTitles, userWishes);

        for (const rec of recommendations) {
            const query = `${rec.title} ${rec.author}`;
            const searchResults = await searchFinna(query);

            const bestMatch = searchResults[0];

            if (bestMatch) {
                const alreadyExists = [...state.myBooks, ...state.readBooks, ...state.recommendations].some(b => b.id === bestMatch.id);
                if (!alreadyExists) {
                    await addBookToFirestore(user.uid, bestMatch, 'recommendation', rec.reason);
                }
            }
        }
    };



    return {
        myBooks: state.myBooks,
        readBooks: state.readBooks,
        recommendations: state.recommendations,
        addBook,
        removeBook,
        removeReadBook,
        removeRecommendation,
        markAsRead,
        reorderBooks,
        startReading,
        generateRecommendations,
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
            console.log('Search results:', books);
            setResults(books);
        } finally {
            setLoading(false);
        }
    };

    return { results, loading, searchBooks };
};
