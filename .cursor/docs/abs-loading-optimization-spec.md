# Spec: Audiobookshelf Loading Performance Optimization

## Problem Statement

When users open their personal Audiobookshelf library or navigate between tabs in Bookshelf V2, loading books can feel sluggish and frustrating—especially for readers with hundreds or thousands of titles in their collection.

Currently:
1. **Paging is strictly sequential**: If a user has 1,000 books, the application fetches 200 books, pauses for the network round-trip, requests the next 200, pauses again, and repeats this 5–6 times in series. Over residential Wi-Fi, mobile networks, or home server tunnels, this can take 3 to 5 seconds before the user can browse their complete library.
2. **Tab navigation triggers redundant downloads**: Every time the user switches tabs to view their library, the application initiates a full network refresh of all books, even if the library was fetched just seconds earlier and no changes occurred. This creates unwanted network overhead, drains mobile battery, and causes temporary interface hitching.
3. **Multiple libraries wait in line**: If the user maintains both an Audiobook library and an Ebook library, the second library cannot start downloading until the first library has completely finished every page.
4. **Finished books trigger extra round-trips**: When loading user progress for recently completed books, the application makes individual HTTP requests for book metadata that is often already present in the local library cache.

Readers expect their personal bookshelf to feel instantaneous, smooth, and respectful of bandwidth.

---

## Solution

Optimize the Audiobookshelf data pipeline from end to end:
1. **Parallel Paged Ingestion**: The first page fetched from Audiobookshelf already provides the total item count. The application will immediately calculate remaining pages and fetch them concurrently using a controlled concurrency pool, cutting multi-page fetch times by 50% to 70%.
2. **Cache-Aware Tab Switching**: Screen navigation will respect the 30-minute freshness policy. Switching between tabs will render instantly from memory in 0 milliseconds without firing redundant network requests. Users retain manual pull-to-refresh for on-demand updates.
3. **Concurrent Multi-Library Prefetching**: Secondary libraries will prefetch in parallel in the background once the primary active library begins, so all formats (audiobooks and e-books) are ready when the user needs them.
4. **In-Memory Progress Enrichment**: Finished and in-progress book details will prioritize existing cached library records before falling back to individual network calls.
5. **Optimized Batch Sizing**: Tune standard batch size to 250 items to minimize HTTP handshake overhead while keeping minified payload size lightweight.

---

## User Stories

1. As a reader with a large library, I want all my books to load in under a second, so that I am never stuck waiting on a loading spinner when opening my library.
2. As a mobile reader, I want switching between the "Luettavat" (Home), "Kirjat" (Library), and "Luetut" (Past Read) tabs to be instant, so that the app feels responsive and smooth.
3. As a user with mobile data caps, I want the app to avoid re-downloading the entire catalog every time I change tabs, so that I don't waste data on unchanged content.
4. As a reader browsing my collection, I want to scroll through my books without experiencing stutter caused by background network requests, so that navigation feels native and fluid.
5. As an audiobook and e-book reader with multiple libraries, I want both my audiobooks and e-books prefetched concurrently, so that switching library types doesn't require a cold fetch.
6. As a reader who just added a book on my computer, I want pull-to-refresh to immediately check for updates, so that I have manual control over when a full sync occurs.
7. As a reader in an area with high network latency, I want remaining library pages to download in parallel after the first page, so that I don't suffer cumulative round-trip delays.
8. As a reader listening to audiobooks, I want my listening progress and finished book shelf to populate from memory when possible, so that the home screen loads immediately without individual book lookups.
9. As a power user with a home server setup, I want the mobile app to limit its parallel requests to a polite concurrency pool (3–4 requests), so that my home server or reverse proxy is not overwhelmed.
10. As a reader on an unstable cellular connection, I want individual page failures during parallel fetching to retry gracefully, so that transient connection drops do not fail the entire library load.
11. As a user asking questions to the AI assistant, I want my library books to be fully available in memory, so that book inquiries and recommendations are answered instantly without hitting the Audiobookshelf server.
12. As a reader filtering books by author or genre, I want complete catalog data available in memory, so that local filtering never misses books that haven't loaded yet.
13. As a user opening the app for the first time in a day, I want the active library to be prioritized first, so that the books I am most likely to open appear before secondary libraries sync.
14. As an e-book reader, I want format indicators (audiobook vs e-book vs both) to be populated accurately on initial load, so that I know at a glance what format each book is in.
15. As a reader whose device enters the background, I want active sync tasks to clean up or complete safely, so that the app doesn't leak memory or background resources.

---

## Implementation Decisions

### 1. Parallel Paged Fetching Architecture
- When fetching a library's items, the client executes page 0 first to receive the initial slice of items and read the total item count returned by the server.
- If the total count exceeds the first page's capacity, the total number of remaining pages is computed upfront.
- Remaining pages are executed concurrently through a concurrency-limited pool (bounded to a maximum of 4 concurrent requests).
- Results from all pages are assembled in sequence and de-duplicated by unique item identifier.
- If the server response omits the total count, the client falls back to sequential pagination until an undersized page is encountered.

### 2. Page Size Optimization
- The standard batch limit per page is increased from 200 to 250 items.
- Because items use the minified representation, payload size remains minimal (~250 KB compressed) while eliminating 20% of HTTP connection round-trips.

### 3. Navigation and Focus Synchronization
- The deferred library presentation hook will check query freshness before executing a refetch on screen focus.
- When cached data is within the fresh time window (30 minutes), focus events bypass network calls completely.
- Pull-to-refresh gestures and manual refresh triggers will bypass the freshness check and force a complete sync.

### 4. Concurrent Multi-Library Prefetching
- The prefetch coordinator will prioritize the preferred/active library first.
- Once the primary library is underway or cached, secondary libraries will be prefetched concurrently rather than awaiting full completion of each library sequentially.

### 5. In-Memory Progress Entity Resolution
- For completed or in-progress media progress items, the application will look up the book item in the existing TanStack Query cache before initiating an individual item HTTP request.
- Individual item network requests will only be issued for items not currently cached in memory.

---

## Testing Decisions

### What Makes a Good Test
- Tests must verify observable behavior and outcomes, never internal private variables or loop counters.
- Given a mocked server returning a library of 1,000 items with a total count, the service must return all 1,000 unique items without missing or duplicate elements.
- The parallel pagination worker pool must never exceed the configured concurrency limit at any point during execution.
- If a page request fails intermittently, retry mechanisms must recover and deliver the complete set.
- When library data is fresh in cache, screen focus events must produce zero outbound network requests.

### Modules to Test
- **Audiobookshelf Client Service**: Multi-page item retrieval, concurrency limit adherence, and fallback behavior when total count is absent.
- **Library Prefetch Coordinator**: Priority ordering of preferred library and parallel prefetching of secondary libraries.
- **Deferred Library Presentation Hook**: Cache freshness validation on navigation focus and pull-to-refresh execution.

### Prior Art
- Existing test patterns and async utilities in `utils/queryClient.ts` and `api/abs.ts`.

---

## Out of Scope

- Modifying the upstream Audiobookshelf backend server implementation or SQLite database schemas.
- Full two-way WebSocket event streaming for instant server push notifications.
- Replacing the image caching pipeline or converting image components across the application.
- Altering the user interface layout of the library screen or book cards.

---

## Further Notes

- Once GitHub CLI authentication is refreshed via `gh auth login`, this specification can be published directly as a GitHub issue with the `ready-for-agent` label.
