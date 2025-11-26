import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReducer, useEffect, useRef } from 'react';
import { FinnaSearchResult } from '../api/finna';

type BookState = {
    myBooks: FinnaSearchResult[];
    readBooks: FinnaSearchResult[];
};

type BookAction =
    | { type: 'LOAD_BOOKS'; myBooks: FinnaSearchResult[]; readBooks: FinnaSearchResult[] }
    | { type: 'ADD_BOOK'; book: FinnaSearchResult }
    | { type: 'REMOVE_BOOK'; bookId: string }
    | { type: 'REMOVE_READ_BOOK'; bookId: string }
    | { type: 'MARK_AS_READ'; bookId: string; review?: string; rating?: number; readOrListened?: string }
    | { type: 'REORDER_BOOKS'; newList: FinnaSearchResult[]; listType: 'myBooks' | 'readBooks' }

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
            const bookToMark = state.myBooks.find(book => book.id === action.bookId);
            if (!bookToMark) return state;

            const updatedBook = {
                ...bookToMark,
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

    useEffect(() => {
        (async () => {
            try {
                const storedMyBooks = await AsyncStorage.getItem('myBooks');
                const storedReadBooks = await AsyncStorage.getItem('readBooks');

                dispatch({
                    type: 'LOAD_BOOKS',
                    myBooks: storedMyBooks ? JSON.parse(storedMyBooks) : [],
                    readBooks: storedReadBooks ? JSON.parse(storedReadBooks) : [],
                });
            } catch (err) {
                console.log('Error loading books from storage', err);
            }
        })();
    }, []);

    const isFirstRendering = useRef(true);

    useEffect(() => {
        if (isFirstRendering.current) {
            isFirstRendering.current = false;
            return;
        }
        AsyncStorage.setItem('myBooks', JSON.stringify(state.myBooks));
        AsyncStorage.setItem('readBooks', JSON.stringify(state.readBooks));
    }, [state.myBooks, state.readBooks]);

    const addBook = (book: FinnaSearchResult) => {
        dispatch({ type: 'ADD_BOOK', book });
    };

    const removeBook = (bookId: string) => {
        dispatch({ type: 'REMOVE_BOOK', bookId });
    };

    const removeReadBook = (bookId: string) => {
        dispatch({ type: 'REMOVE_READ_BOOK', bookId });
    };

    const markAsRead = (bookId: string, review?: string, rating?: number, readOrListened?: string) => {
        dispatch({ type: 'MARK_AS_READ', bookId, review, rating, readOrListened });
    };

    const reorderBooks = (newList: FinnaSearchResult[], listType: 'myBooks' | 'readBooks') => {
        dispatch({ type: 'REORDER_BOOKS', newList, listType });
    };



    const startReading = (bookId: string) => {
        dispatch({ type: 'START_READING', bookId });
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
