"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserBook = exports.deleteUserBook = exports.createUser = exports.setAdminClaim = exports.setUserDisabled = exports.getDashboardStats = exports.getUserAIUsage = exports.getUserBooks = exports.getUserDetail = exports.listUsers = exports.verifyAdmin = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
const auth = (0, auth_1.getAuth)();
const db = (0, firestore_1.getFirestore)();
function requireAdmin(request) {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in");
    }
    const token = request.auth.token;
    if (token?.admin !== true) {
        throw new https_1.HttpsError("permission-denied", "Admin only");
    }
    return request.auth.uid;
}
/** Verify the caller is an admin. Returns { admin: true }. */
exports.verifyAdmin = (0, https_1.onCall)({ cors: true }, (request) => {
    requireAdmin(request);
    return { admin: true };
});
/** List users (paginated). */
exports.listUsers = (0, https_1.onCall)({ cors: true }, async (request) => {
    requireAdmin(request);
    try {
        const { pageToken, maxResults = 50 } = request.data ?? {};
        const listResult = pageToken && String(pageToken).trim()
            ? await auth.listUsers(maxResults, pageToken)
            : await auth.listUsers(maxResults);
        const users = listResult.users.map((u) => ({
            uid: u.uid,
            email: u.email ?? null,
            disabled: u.disabled,
            metadata: {
                creationTime: u.metadata.creationTime,
                lastSignInTime: u.metadata.lastSignInTime ?? null,
            },
        }));
        return { users, nextPageToken: listResult.pageToken ?? null };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("listUsers error:", err);
        throw new https_1.HttpsError("internal", message);
    }
});
/** Get one user's Auth record. */
exports.getUserDetail = (0, https_1.onCall)({ cors: true }, async (request) => {
    requireAdmin(request);
    const { uid } = request.data ?? {};
    if (!uid || typeof uid !== "string")
        throw new https_1.HttpsError("invalid-argument", "uid required");
    const userRecord = await auth.getUser(uid);
    return {
        uid: userRecord.uid,
        email: userRecord.email ?? null,
        disabled: userRecord.disabled,
        customClaims: userRecord.customClaims ?? {},
        metadata: {
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime ?? null,
        },
    };
});
/** Get a user's books from Firestore. */
exports.getUserBooks = (0, https_1.onCall)({ cors: true }, async (request) => {
    requireAdmin(request);
    const { uid } = request.data ?? {};
    if (!uid || typeof uid !== "string")
        throw new https_1.HttpsError("invalid-argument", "uid required");
    const snap = await db.collection("users").doc(uid).collection("books").orderBy("order", "asc").get();
    const books = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { books };
});
/** Get a user's AI usage. */
exports.getUserAIUsage = (0, https_1.onCall)({ cors: true }, async (request) => {
    requireAdmin(request);
    const { uid } = request.data ?? {};
    if (!uid || typeof uid !== "string")
        throw new https_1.HttpsError("invalid-argument", "uid required");
    const ref = db.collection("users").doc(uid).collection("aiUsage").doc("usage");
    const snap = await ref.get();
    if (!snap.exists) {
        return { recommendationCount: 0, chatTurnCount: 0, lastRecommendationAt: null, lastChatAt: null };
    }
    const d = snap.data();
    return {
        recommendationCount: d.recommendationCount ?? 0,
        chatTurnCount: d.chatTurnCount ?? 0,
        lastRecommendationAt: d.lastRecommendationAt?.toMillis?.() ?? null,
        lastChatAt: d.lastChatAt?.toMillis?.() ?? null,
    };
});
/** Dashboard stats: total users, total books, total AI usage. */
exports.getDashboardStats = (0, https_1.onCall)({ cors: true }, async (request) => {
    requireAdmin(request);
    const listResult = await auth.listUsers(1000);
    const totalUsers = listResult.users.length;
    let totalBooks = 0;
    let totalRecommendations = 0;
    let totalChatTurns = 0;
    for (const u of listResult.users) {
        const booksSnap = await db.collection("users").doc(u.uid).collection("books").get();
        totalBooks += booksSnap.size;
        const usageSnap = await db.collection("users").doc(u.uid).collection("aiUsage").doc("usage").get();
        if (usageSnap.exists) {
            const d = usageSnap.data();
            totalRecommendations += d.recommendationCount ?? 0;
            totalChatTurns += d.chatTurnCount ?? 0;
        }
    }
    return { totalUsers, totalBooks, totalRecommendations, totalChatTurns };
});
/** Set user disabled. */
exports.setUserDisabled = (0, https_1.onCall)({ cors: true }, async (request) => {
    requireAdmin(request);
    const { uid, disabled } = request.data ?? {};
    if (!uid || typeof uid !== "string")
        throw new https_1.HttpsError("invalid-argument", "uid required");
    if (typeof disabled !== "boolean")
        throw new https_1.HttpsError("invalid-argument", "disabled must be boolean");
    await auth.updateUser(uid, { disabled });
    return { ok: true };
});
/** Set admin custom claim. */
exports.setAdminClaim = (0, https_1.onCall)({ cors: true }, async (request) => {
    requireAdmin(request);
    const { uid, admin } = request.data ?? {};
    if (!uid || typeof uid !== "string")
        throw new https_1.HttpsError("invalid-argument", "uid required");
    if (typeof admin !== "boolean")
        throw new https_1.HttpsError("invalid-argument", "admin must be boolean");
    await auth.setCustomUserClaims(uid, { admin });
    return { ok: true };
});
/** Create a new Firebase Auth user (admin only). */
exports.createUser = (0, https_1.onCall)({ cors: true }, async (request) => {
    requireAdmin(request);
    const { email, password } = request.data ?? {};
    if (!email || typeof email !== "string" || !email.trim()) {
        throw new https_1.HttpsError("invalid-argument", "email required");
    }
    if (!password || typeof password !== "string" || password.length < 6) {
        throw new https_1.HttpsError("invalid-argument", "password must be at least 6 characters");
    }
    const userRecord = await auth.createUser({ email: email.trim(), password });
    return { uid: userRecord.uid, email: userRecord.email };
});
/** Delete a book from a user's collection. */
exports.deleteUserBook = (0, https_1.onCall)({ cors: true }, async (request) => {
    requireAdmin(request);
    const { uid, bookId } = request.data ?? {};
    if (!uid || typeof uid !== "string")
        throw new https_1.HttpsError("invalid-argument", "uid required");
    if (!bookId || typeof bookId !== "string")
        throw new https_1.HttpsError("invalid-argument", "bookId required");
    const ref = db.collection("users").doc(uid).collection("books").doc(bookId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Book not found");
    await ref.delete();
    return { ok: true };
});
/** Update a book in a user's collection. Allows partial update of safe fields. */
exports.updateUserBook = (0, https_1.onCall)({ cors: true }, async (request) => {
    requireAdmin(request);
    const { uid, bookId, data } = request.data ?? {};
    if (!uid || typeof uid !== "string")
        throw new https_1.HttpsError("invalid-argument", "uid required");
    if (!bookId || typeof bookId !== "string")
        throw new https_1.HttpsError("invalid-argument", "bookId required");
    if (!data || typeof data !== "object")
        throw new https_1.HttpsError("invalid-argument", "data required");
    const allowed = [
        "title", "authors", "status", "review", "rating", "readOrListened",
        "finishedReading", "startedReading", "recommendationReason", "order",
    ];
    const sanitized = {};
    for (const key of Object.keys(data)) {
        if (allowed.includes(key))
            sanitized[key] = data[key];
    }
    if (Object.keys(sanitized).length === 0)
        return { ok: true };
    const ref = db.collection("users").doc(uid).collection("books").doc(bookId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Book not found");
    await ref.update(sanitized);
    return { ok: true };
});
