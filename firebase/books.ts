import {
    onSnapshot,
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
    status: 'unread' | 'read';
    order: number;
    addedAt: any; // Timestamp or FieldValue
    firestoreId?: string; // To store the document ID if different from Finna ID
}

const getUserBookCollection = (userId: string) => collection(firestore, 'users', userId, 'books');

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

export const addBookToFirestore = async (userId: string, book: FinnaSearchResult) => {
    try {
        const bookRef = doc(getUserBookCollection(userId), book.id);

        const order = Date.now();

        const newBook: FirestoreBook = {
            ...book,
            status: 'unread',
            order: order,
            addedAt: serverTimestamp(),
        };

        await setDoc(bookRef, newBook);
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
