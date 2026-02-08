import { doc, updateDoc, setDoc, serverTimestamp, increment } from "firebase/firestore";
import { firestore } from "./Config";

const AI_USAGE_DOC_ID = "usage";

export type AIUsageType = "recommendation" | "chat";

/**
 * Increment AI usage counters for the current user. Fire-and-forget; failures do not throw to caller.
 * Stores in users/{userId}/aiUsage/usage.
 */
export async function incrementAIUsage(userId: string, type: AIUsageType): Promise<void> {
    const usageRef = doc(firestore, "users", userId, "aiUsage", AI_USAGE_DOC_ID);
    try {
        if (type === "recommendation") {
            await updateDoc(usageRef, {
                recommendationCount: increment(1),
                lastRecommendationAt: serverTimestamp(),
            });
        } else {
            await updateDoc(usageRef, {
                chatTurnCount: increment(1),
                lastChatAt: serverTimestamp(),
            });
        }
    } catch (e: unknown) {
        const err = e as { code?: string };
        if (err?.code === "not-found" || (err as Error)?.message?.includes("NOT_FOUND")) {
            try {
                await setDoc(usageRef, {
                    recommendationCount: type === "recommendation" ? 1 : 0,
                    chatTurnCount: type === "chat" ? 1 : 0,
                    ...(type === "recommendation"
                        ? { lastRecommendationAt: serverTimestamp() }
                        : { lastChatAt: serverTimestamp() }),
                });
            } catch {
                // Ignore; don't break app flow
            }
        }
        // Else ignore other errors (e.g. permission, network)
    }
}
