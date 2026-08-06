import {
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    setDoc,
    collection,
    writeBatch,
    serverTimestamp,
} from "firebase/firestore";
import { firestore } from "./Config";

export interface UserTag {
    id: string;
    name: string;
    /** Lowercase, trimmed name used for case-insensitive dedup and matching. */
    normalizedName: string;
    createdAt: any; // Timestamp or FieldValue
}

/** bookKey (normalized book id) -> tag ids assigned to that book. */
export type BookTagAssignments = Record<string, string[]>;

export const normalizeTagName = (name: string) => name.trim().toLowerCase();

/**
 * The same audiobook appears with id `abs-<id>` on the shelf (Firestore/in-progress)
 * and with the raw `<id>` on the Kirjat/New Books screens. Normalize so a tag
 * follows the book across all screens.
 */
export const tagBookKey = (bookId: string) =>
    bookId.startsWith('abs-') ? bookId.slice(4) : bookId;

const getTagsCollection = (userId: string) => collection(firestore, 'users', userId, 'tags');
const getAssignmentsCollection = (userId: string) => collection(firestore, 'users', userId, 'bookTagAssignments');

export const fetchUserTags = async (userId: string): Promise<UserTag[]> => {
    try {
        const snapshot = await getDocs(getTagsCollection(userId));
        const tags: UserTag[] = [];
        snapshot.forEach((d) => {
            tags.push({ ...(d.data() as Omit<UserTag, 'id'>), id: d.id });
        });
        return tags.sort((a, b) => a.normalizedName.localeCompare(b.normalizedName, 'fi'));
    } catch (error) {
        console.error("Error fetching user tags from Firestore: ", error);
        return [];
    }
};

export const fetchBookTagAssignments = async (userId: string): Promise<BookTagAssignments> => {
    try {
        const snapshot = await getDocs(getAssignmentsCollection(userId));
        const assignments: BookTagAssignments = {};
        snapshot.forEach((d) => {
            const data = d.data() as { tagIds?: string[] };
            assignments[d.id] = data.tagIds ?? [];
        });
        return assignments;
    } catch (error) {
        console.error("Error fetching book tag assignments from Firestore: ", error);
        return {};
    }
};

/** Creates the tag doc with a pre-generated id (so the caller can be optimistic). */
export const createTagInFirestore = async (userId: string, tag: { id: string, name: string }) => {
    try {
        const tagRef = doc(getTagsCollection(userId), tag.id);
        await setDoc(tagRef, {
            name: tag.name.trim(),
            normalizedName: normalizeTagName(tag.name),
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error creating tag in Firestore: ", error);
        throw error;
    }
};

export const generateTagId = (userId: string) => doc(collection(firestore, 'users', userId, 'tags')).id;

export const renameTagInFirestore = async (userId: string, tagId: string, newName: string) => {
    try {
        const tagRef = doc(getTagsCollection(userId), tagId);
        await updateDoc(tagRef, {
            name: newName.trim(),
            normalizedName: normalizeTagName(newName),
        });
    } catch (error) {
        console.error("Error renaming tag in Firestore: ", error);
        throw error;
    }
};

/** Deletes the tag and removes it from every book assignment. */
export const deleteTagInFirestore = async (userId: string, tagId: string) => {
    try {
        const assignmentsSnapshot = await getDocs(getAssignmentsCollection(userId));
        const batch = writeBatch(firestore);

        assignmentsSnapshot.forEach((d) => {
            const tagIds: string[] = (d.data() as { tagIds?: string[] }).tagIds ?? [];
            if (!tagIds.includes(tagId)) return;
            const remaining = tagIds.filter(id => id !== tagId);
            if (remaining.length === 0) {
                batch.delete(d.ref);
            } else {
                batch.update(d.ref, { tagIds: remaining, updatedAt: serverTimestamp() });
            }
        });

        batch.delete(doc(getTagsCollection(userId), tagId));
        await batch.commit();
    } catch (error) {
        console.error("Error deleting tag from Firestore: ", error);
        throw error;
    }
};

/** Sets the full tag list for a book. An empty list removes the assignment doc. */
export const setBookTagsInFirestore = async (userId: string, bookId: string, tagIds: string[]) => {
    const key = tagBookKey(bookId);
    const assignmentRef = doc(getAssignmentsCollection(userId), key);
    try {
        if (tagIds.length === 0) {
            await deleteDoc(assignmentRef);
        } else {
            await setDoc(assignmentRef, {
                bookId: key,
                tagIds,
                updatedAt: serverTimestamp(),
            });
        }
    } catch (error) {
        console.error("Error setting book tags in Firestore: ", error);
        throw error;
    }
};
