const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

export async function withAbsRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err: unknown) {
            lastError = err;
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (!status || !RETRYABLE_STATUSES.has(status) || attempt === maxAttempts - 1) {
                throw err;
            }
            await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        }
    }
    throw lastError;
}

/** Run async work over items with a fixed concurrency cap to avoid overwhelming ABS. */
export async function mapWithConcurrency<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    concurrency = 3
): Promise<R[]> {
    if (items.length === 0) return [];
    const results: R[] = new Array(items.length);
    let index = 0;

    async function worker() {
        while (true) {
            const i = index++;
            if (i >= items.length) break;
            results[i] = await fn(items[i]);
        }
    }

    const workers = Math.min(concurrency, items.length);
    await Promise.all(Array.from({ length: workers }, () => worker()));
    return results;
}
