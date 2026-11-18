import { useState, useEffect } from 'react';

type UseCachingFetch = (url: string) => {
  isLoading: boolean;
  data: unknown;
  error: Error | null;
};

interface CacheEntry {
  data: unknown;
  error: Error | null;
  isResolved: boolean;
  promise?: Promise<void>;
}

const cache = new Map<string, CacheEntry>();

export const wipeCache = (): void => {
  cache.clear();
};

export const serializeCache = (): string => {
  const serializable: Record<string, unknown> = {};
  for (const [url, entry] of cache.entries()) {
    if (entry.isResolved && entry.error === null) {
      serializable[url] = entry.data;
    }
  }
  return JSON.stringify(serializable);
};

export const initializeCache = (serializedCache: string): void => {
  try {
    const parsed = JSON.parse(serializedCache);
    if (parsed && typeof parsed === 'object') {
      for (const [url, data] of Object.entries(parsed)) {
        cache.set(url, {
          data,
          error: null,
          isResolved: true,
        });
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
};

const fetchData = async (url: string): Promise<void> => {
  let entry = cache.get(url);
  if (!entry) {
    entry = { data: null, error: null, isResolved: false };
    cache.set(url, entry);
  }

  if (entry.isResolved || entry.error !== null) {
    return;
  }

  if (entry.promise) {
    return entry.promise;
  }

  entry.promise = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      entry!.data = data;
      entry!.error = null;
      entry!.isResolved = true;
    } catch (err) {
      entry!.error = err instanceof Error ? err : new Error(String(err));
      entry!.data = null;
      entry!.isResolved = true;
    } finally {
      entry!.promise = undefined;
    }
  })();

  return entry.promise;
};

/**
 * Implement a caching fetch hook. The hook should return an object with the following properties:
 * - isLoading: a boolean that is true when the fetch is in progress and false otherwise
 * - data: the data returned from the fetch, or null if the fetch has not completed
 * - error: an error object if the fetch fails, or null if the fetch is successful
 */
export const useCachingFetch: UseCachingFetch = (url) => {
  const entry = cache.get(url);
  const initialResolved = entry ? entry.isResolved : false;
  const initialData = entry ? entry.data : null;
  const initialError = entry ? entry.error : null;

  const [data, setData] = useState<unknown>(initialData);
  const [error, setError] = useState<Error | null>(initialError);
  const [isLoading, setIsLoading] = useState<boolean>(!initialResolved);

  useEffect(() => {
    let isMounted = true;

    const currentEntry = cache.get(url);
    if (currentEntry && currentEntry.isResolved) {
      setData(currentEntry.data);
      setError(currentEntry.error);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchData(url).then(() => {
      if (!isMounted) return;
      const updated = cache.get(url);
      setData(updated ? updated.data : null);
      setError(updated ? updated.error : null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [url]);

  return {
    isLoading,
    data,
    error,
  };
};

/**
 * Implement a preloading caching fetch function. The function should fetch the data.
 * This function will be called once on the server before any rendering occurs.
 */
export const preloadCachingFetch = async (url: string): Promise<void> => {
  await fetchData(url);
};