import {
    onSnapshot,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    query,
    orderBy,
    writeBatch,
    serverTimestamp,
    setDoc,
    collection
} from "firebase/firestore";
import { firestore } from "./Config";
import { FinnaSearchResult } from "../api/finna";

export interface FirestoreBook extends FinnaSearchResult {
    status: 'unread' | 'read' | 'recommendation';
    order: number;
    addedAt: any; // Timestamp or FieldValue
    firestoreId?: string; // To store the document ID if different from Finna ID
    recommendationReason?: string; // Added for AI recommendations
}

const getUserBookCollection = (userId: string) => collection(firestore, 'users', userId, 'books');

export const fetchBooks = async (userId: string): Promise<FirestoreBook[]> => {
    try {
        const q = query(getUserBookCollection(userId), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        const books: FirestoreBook[] = [];
        snapshot.forEach((doc) => {
            books.push({ ...doc.data(), firestoreId: doc.id } as FirestoreBook);
        });
        return books;
    } catch (error) {
        console.error("Error fetching books from Firestore: ", error);
        return [];
    }
};

export const subscribeToBooks = (userId: string, onUpdate: (books: FirestoreBook[]) => void) => {
    const q = query(getUserBookCollection(userId), orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const books: FirestoreBook[] = [];
        snapshot.forEach((doc) => {
            books.push({ ...doc.data(), firestoreId: doc.id } as FirestoreBook);
        });
        onUpdate(books);
    });

    return unsubscribe;
};

export const addBookToFirestore = async (userId: string, book: FinnaSearchResult, status: 'unread' | 'read' | 'recommendation' = 'unread', recommendationReason?: string, finishedDate?: string) => {
    try {
        const bookRef = doc(getUserBookCollection(userId), book.id);

        const order = Date.now();

        const newBook: FirestoreBook = {
            ...book,
            status: status,
            order: order,
            addedAt: serverTimestamp(),
        };

        if (status === 'read') {
            newBook.finishedReading = finishedDate || (book as any).finishedReading || new Date().toISOString();
        }

        if (recommendationReason) {
            newBook.recommendationReason = recommendationReason;
        }

        // Sanitize undefined values (e.g. absProgress might be undefined)
        const sanitizedBook = Object.entries(newBook).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {} as any);

        await setDoc(bookRef, sanitizedBook);
    } catch (error) {
        console.error("Error adding book to Firestore: ", error);
        throw error;
    }
};

export const removeBookFromFirestore = async (userId: string, bookId: string) => {
    try {
        await deleteDoc(doc(getUserBookCollection(userId), bookId));
    } catch (error) {
        console.error("Error removing book from Firestore: ", error);
        throw error;
    }
};

export const updateBookInFirestore = async (userId: string, bookId: string, data: Partial<FirestoreBook>) => {
    try {
        const bookRef = doc(getUserBookCollection(userId), bookId);
        await updateDoc(bookRef, data);
    } catch (error) {
        console.error("Error updating book in Firestore: ", error);
        throw error;
    }
};

export const updateBooksOrder = async (userId: string, books: FirestoreBook[]) => {
    try {
        const batch = writeBatch(firestore);

        books.forEach((book, index) => {
            const bookRef = doc(getUserBookCollection(userId), book.id);
            batch.update(bookRef, { order: index });
        });

        await batch.commit();
    } catch (error) {
        console.error("Error updating books order: ", error);
        throw error;
    }
};
