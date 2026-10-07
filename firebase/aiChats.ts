import {
    doc,
    setDoc,
    collection,
    getDocs,
    query,
    orderBy,
    serverTimestamp,
    Timestamp,
    deleteDoc,
} from "firebase/firestore";
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
    /** Optional display title for general chat (e.g. from first user message). */
    conversationTitle?: string;
}

/**
 * Save or update an AI chat for a user. One document per book (bookId).
 * Call after each successful AI response to persist the conversation.
 */
export async function saveAIChat(
    userId: string,
    bookId: string,
    bookSnapshot: AIChatBookSnapshot,
    messages: ChatMessage[],
    conversationTitle?: string
): Promise<void> {
    const safeChatId = bookId.replace(/\//g, '_');
    const ref = doc(firestore, "users", userId, "aiChats", safeChatId);
    const rawPayload: Record<string, unknown> = {
        bookId,
        book: bookSnapshot,
        messages,
    };
    if (conversationTitle != null && conversationTitle.trim() !== '') {
        rawPayload.conversationTitle = conversationTitle.trim();
    }
    // Deeply strip any `undefined` properties before passing to Firestore
    // Firestore throws a fatal error if any field in an object or array is undefined.
    const sanitizedPayload = {
        ...JSON.parse(JSON.stringify(rawPayload)),
        updatedAt: serverTimestamp(),
    };
    await setDoc(ref, sanitizedPayload, { merge: true });
}

/**
 * Load all saved AI chats for a user, ordered by updatedAt descending.
 * Falls back to unordered getDocs with in-memory sorting if index/query error occurs.
 */
export async function getAIChats(userId: string): Promise<SavedAIChat[]> {
    const col = collection(firestore, "users", userId, "aiChats");
    let docs;
    try {
        const q = query(col, orderBy("updatedAt", "desc"));
        const snapshot = await getDocs(q);
        docs = snapshot.docs;
    } catch (err) {
        console.warn("[getAIChats] Query with orderBy failed, falling back to all docs:", err);
        const snapshot = await getDocs(col);
        docs = snapshot.docs;
    }

    const chats: SavedAIChat[] = docs.map((d) => {
        const data = d.data();
        return {
            bookId: (data.bookId as string) || d.id,
            book: (data.book as AIChatBookSnapshot) || { id: d.id, title: 'Keskustelu', authors: [] },
            messages: (data.messages ?? []) as ChatMessage[],
            updatedAt: data.updatedAt as Timestamp,
            conversationTitle: data.conversationTitle as string | undefined,
        };
    });

    // In-memory sort fallback to ensure newest chats always appear first
    chats.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis?.() ?? (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
        const timeB = b.updatedAt?.toMillis?.() ?? (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
        return timeB - timeA;
    });

    return chats;
}

/** Delete a saved AI chat for a user. */
export async function deleteAIChat(userId: string, chatId: string): Promise<void> {
    const safeChatId = chatId.replace(/\//g, '_');
    const ref = doc(firestore, "users", userId, "aiChats", safeChatId);
    await deleteDoc(ref);
}
