# People Directory & Caching Fetch Library

A full-stack React application with a custom Server-Side Rendering (SSR) setup, an MSW mock server for offline development, and a lightweight caching fetch library designed to deduplicate requests and transfer server-fetched data to the client.

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   npm start

2. **Explore the app:**
   Open http://localhost:3000 in your browser. From there, you can test both rendering strategies:

   - /appWithoutSSRData: Fetches and caches the directory data entirely on the client side.
   - /appWithSSRData: Preloads the data on the server, serializes the cache into the initial HTML payload, and hydrates on the client with zero extra network calls.

3. **Test the caching fetch library:**
   - The library is located in `caching-fetch-library/cachingFetch.ts`.
   - It demonstrates request deduplication and cache hydration between server and client.
   - You can inspect the browser console to see cache behavior and network activity.


## Project Structure
- `/application` — React UI components (App, Person, Name), TypeScript types, and runtime data validation.
- `/caching-fetch-library` — The core caching fetch hook (useCachingFetch), SSR preloader (preloadCachingFetch), and cache serialization helpers (serializeCache, initializeCache, wipeCache).
- `/framework` — Custom Express/Node SSR server, client hydration entry point, and MSW mock API handlers.

### Repository Configuration & Production Readiness Choices
Because the initial repository only included a minimal build setup and tsconfig.json, the following architectural choices and production practices were prioritized:

Strict TypeScript Checking: Kept strict type safety intact across cachingFetch.ts so the exported surface API (UseCachingFetch, preloadCachingFetch, serializeCache, initializeCache, wipeCache) integrates seamlessly with both the framework and application layers without modifying any external files.

Code Formatting & Linting (Recommended Setup): In a production environment, adding ESLint (with TypeScript and React hooks plugins) alongside Prettier ensures consistent code style and prevents accidental hook dependency bugs.

Automated Testing (Recommended Setup): Adding Jest or Vitest with React Testing Library would allow automated verification of request deduplication, cache serialization fidelity, and error state handling.

CI Pipeline (Recommended Setup): A lightweight GitHub Actions workflow running type-checking (tsc --noEmit), linter checks, and test suites on pull requests before merging.

### Issues Found & Fixed
When first booting up the project, the framework and UI were complete, but the caching layer was stubbed out, leading to a few specific issues:

Client-Side Rendering Failure (/appWithoutSSRData):

Issue: Visiting /appWithoutSSRData threw `Error: UseCachingFetch has not been implemented. Furthermore, because useCachingFetch` is called three separate times across the component tree (App.tsx, Person.tsx, and Name.tsx), a naive fetch inside the hook would have fired three duplicate HTTP requests.

Fix: Implemented an in-memory `Map` cache paired with an active in-flight promise tracker inside cachingFetch.ts. When the three components mount and request the same URL concurrently, the first call initiates the fetch and stores the pending promise, while the subsequent calls attach to that same promise—resulting in a single network request in the browser's Network tab.

Server-Side Rendering Failure (/appWithSSRData):

Issue: Visiting /appWithSSRData `returned a 500 Internal Server Error`(preloadCachingFetch has not been implemented).

Fix: Implemented `preloadCachingFetch` to execute and await the shared fetchData routine on the server before React renders the component tree, ensuring data is immediately available synchronously when useCachingFetch runs during SSR.

Client Hydration & Duplicate Network Calls on /appWithSSRData:

Issue: Even after preloading data on the server, the browser needs that cache state upon page load; otherwise, the client would re-fetch the data on hydration.

Fix: Implemented serializeCache() to safely convert resolved, error-free cache entries into a JSON string on the server, and initializeCache() to hydrate the client's in-memory Map before the React app mounts. As a result, /appWithSSRData renders with JavaScript disabled and makes zero API network calls when JavaScript is enabled.

### Known Issues & Next Steps
Given the 2-hour timebox, a few edge cases and architectural improvements remain as natural next steps for production:

1. No Cache Expiration (TTL / LRU Eviction):

Currently, the in-memory Map stores entries indefinitely until wipeCache() is called or the page refreshes. In a long-lived session, stale data could persist or memory usage could grow. Adding a configurable Time-To-Live (TTL) or Least Recently Used (LRU) eviction policy would resolve this.

2. Non-JSON Serialized Data Types:

serializeCache uses JSON.stringify, which works cleanly for standard JSON payloads but would strip out complex JavaScript types (like Date objects, Map, or Set) if an endpoint ever returned non-JSON structures.

3. Cache Key Granularity:

The cache is currently keyed solely by the url string to match the existing surface API. If POST requests, custom headers, or query option variations were needed in the future, the cache key generator would need to incorporate serialized request options.

4. Server Memory Isolation:

On the server, cache is a module-level Map. If multiple concurrent requests hit the server for different users or dynamic URLs, a request-scoped cache context (or calling wipeCache() per request lifecycle) would prevent cross-request cache pollution.