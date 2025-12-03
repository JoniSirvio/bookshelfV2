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
};

type BookAction =
    | { type: 'LOAD_BOOKS'; myBooks: FirestoreBook[]; readBooks: FirestoreBook[] }
    | { type: 'ADD_BOOK'; book: FirestoreBook }
    | { type: 'REMOVE_BOOK'; bookId: string }
    | { type: 'REMOVE_READ_BOOK'; bookId: string }
    | { type: 'MARK_AS_READ'; bookId: string; review?: string; rating?: number; readOrListened?: string }
    | { type: 'REORDER_BOOKS'; newList: FirestoreBook[]; listType: 'myBooks' | 'readBooks' }
    | { type: 'START_READING'; bookId: string };

const initialState: BookState = {
    myBooks: [],
    readBooks: [],
};

function bookReducer(state: BookState, action: BookAction): BookState {
    switch (action.type) {
        case 'LOAD_BOOKS':
            return {
                ...state,
                myBooks: action.myBooks,
                readBooks: action.readBooks,
            };
        case 'ADD_BOOK':
            if (state.myBooks.find(b => b.id === action.book.id)) return state;
            return { ...state, myBooks: [...state.myBooks, action.book] };
        case 'REMOVE_BOOK':
            return { ...state, myBooks: state.myBooks.filter(book => book.id !== action.bookId) };
        case 'REMOVE_READ_BOOK':
            return { ...state, readBooks: state.readBooks.filter(book => book.id !== action.bookId) };
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
                finishedReading: new Date().toISOString(),
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
            dispatch({ type: 'LOAD_BOOKS', myBooks: [], readBooks: [] });
            return;
        }

        const unsubscribe = subscribeToBooks(user.uid, (books) => {
            const myBooks = books.filter(b => b.status === 'unread');
            const readBooks = books.filter(b => b.status === 'read');

            dispatch({
                type: 'LOAD_BOOKS',
                myBooks,
                readBooks
            });
        });

        return () => unsubscribe();
    }, [user]);

    const addBook = async (book: FinnaSearchResult) => {
        if (!user) return;
        if (state.myBooks.find(b => b.id === book.id) || state.readBooks.find(b => b.id === book.id)) {
            return;
        }
        await addBookToFirestore(user.uid, book);
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

    const markAsRead = async (bookId: string, review?: string, rating?: number, readOrListened?: string) => {
        if (!user) return;
        const book = state.myBooks.find(b => b.id === bookId);
        if (!book) return;

        dispatch({ type: 'MARK_AS_READ', bookId, review, rating, readOrListened }); // Optimistic

        const daysRead = book.startedReading
            ? Math.ceil((new Date().getTime() - new Date(book.startedReading).getTime()) / (1000 * 3600 * 24))
            : undefined;

        const updateData: Partial<FirestoreBook> = {
            status: 'read',
            finishedReading: new Date().toISOString(),
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

    return {
        myBooks: state.myBooks,
        readBooks: state.readBooks,
        addBook,
        removeBook,
        removeReadBook,
        markAsRead,
        reorderBooks,
        startReading,
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
