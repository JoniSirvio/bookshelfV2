import { doc, setDoc, collection, getDocs, query, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";
import { firestore } from "./Config";
import type { ChatMessage } from "../api/gemini";

/** Minimal book snapshot for display and reopening the modal. Compatible with FinnaSearchResult. */
export interface AIChatBookSnapshot {
    id: string;
    title: string;
    authors: string[];
    images?: { url: string }[];
}

export interface SavedAIChat {
    bookId: string;
    book: AIChatBookSnapshot;
    messages: ChatMessage[];
    updatedAt: Timestamp;
}

/**
 * Save or update an AI chat for a user. One document per book (bookId).
 * Call after each successful AI response to persist the conversation.
 */
export async function saveAIChat(
    userId: string,
    bookId: string,
    bookSnapshot: AIChatBookSnapshot,
    messages: ChatMessage[]
): Promise<void> {
    const ref = doc(firestore, "users", userId, "aiChats", bookId);
    await setDoc(
        ref,
        {
            bookId,
            book: bookSnapshot,
            messages,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

/**
 * Load all saved AI chats for a user, ordered by updatedAt descending.
 */
export async function getAIChats(userId: string): Promise<SavedAIChat[]> {
    const col = collection(firestore, "users", userId, "aiChats");
    const q = query(col, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
        const data = d.data();
        return {
            bookId: data.bookId as string,
            book: data.book as AIChatBookSnapshot,
            messages: (data.messages ?? []) as ChatMessage[],
            updatedAt: data.updatedAt as Timestamp,
        };
    });
}
