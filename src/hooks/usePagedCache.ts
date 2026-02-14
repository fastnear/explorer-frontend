import { useState, useRef, useCallback, useEffect } from "react";

interface PageData<T> {
  items: T[];
  resumeToken?: string;
}

interface FetchPageResult<T> {
  items: T[];
  resumeToken?: string;
  totalCount: number;
}

interface UsePagedCacheOptions<T> {
  fetchPage: (
    resumeToken?: string,
    limit?: number
  ) => Promise<FetchPageResult<T>>;
  pageSize: number;
  batchPages?: number;
  key: string;
}

interface UsePagedCacheReturn<T> {
  items: T[];
  currentPage: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
  goFirst: () => void;
  goNext: () => void;
  goPrev: () => void;
  loading: boolean;
  error: string | null;
  aheadItems: T[];
}

export default function usePagedCache<T>({
  fetchPage,
  pageSize,
  batchPages = 4,
  key,
}: UsePagedCacheOptions<T>): UsePagedCacheReturn<T> {
  const cache = useRef<Map<number, PageData<T>>>(new Map());
  const prefetchingRef = useRef(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<T[]>([]);
  // Bump to trigger re-render after background prefetch populates cache
  const [, setTick] = useState(0);
  // Queue a page to navigate to once a prefetch completes
  const pendingNavRef = useRef<number | null>(null);

  const storeBatch = useCallback(
    (startPage: number, result: FetchPageResult<T>) => {
      if (result.totalCount > 0) {
        setTotalCount(result.totalCount);
      }
      const allItems = result.items;
      let page = startPage;
      for (let i = 0; i < allItems.length; i += pageSize) {
        const chunk = allItems.slice(i, i + pageSize);
        const isLastChunk = i + pageSize >= allItems.length;
        cache.current.set(page, {
          items: chunk,
          resumeToken: isLastChunk ? result.resumeToken : undefined,
        });
        page++;
      }
    },
    [pageSize]
  );

  // Prefetch next batch in the background (no loading state)
  const prefetch = useCallback(
    async (startPage: number, resumeToken: string) => {
      if (cache.current.has(startPage)) return;
      if (prefetchingRef.current) return;
      prefetchingRef.current = true;
      try {
        const result = await fetchPage(resumeToken, pageSize * batchPages);
        storeBatch(startPage, result);
        // If user tried to navigate while we were prefetching, fulfill it now
        const nav = pendingNavRef.current;
        if (nav !== null) {
          pendingNavRef.current = null;
          const cached = cache.current.get(nav);
          if (cached) {
            setItems(cached.items);
            setCurrentPage(nav);
          }
          setLoading(false);
        }
        setTick((n) => n + 1);
      } catch {
        // Silently ignore prefetch errors
        if (pendingNavRef.current !== null) {
          pendingNavRef.current = null;
          setLoading(false);
        }
      } finally {
        prefetchingRef.current = false;
      }
    },
    [fetchPage, pageSize, batchPages, storeBatch]
  );

  const fetchBatch = useCallback(
    async (startPage: number, resumeToken?: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPage(resumeToken, pageSize * batchPages);
        storeBatch(startPage, result);

        const firstPage = cache.current.get(startPage);
        if (firstPage) {
          setItems(firstPage.items);
          setCurrentPage(startPage);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [fetchPage, pageSize, batchPages, storeBatch]
  );

  // Reset on key change and fetch first batch
  useEffect(() => {
    cache.current = new Map();
    prefetchingRef.current = false;
    pendingNavRef.current = null;
    setCurrentPage(0);
    setTotalCount(0);
    setItems([]);

    setLoading(true);
    setError(null);
    fetchPage(undefined, pageSize * batchPages)
      .then((result) => {
        storeBatch(0, result);
        const firstPage = cache.current.get(0);
        if (firstPage) {
          setItems(firstPage.items);
          setCurrentPage(0);
        }
      })
      .catch((err) => {
        setError(String(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key, fetchPage, pageSize, batchPages, storeBatch]);

  // Prefetch next batch when within 2 pages of the batch boundary
  useEffect(() => {
    if (prefetchingRef.current) return;
    for (let p = currentPage; p <= currentPage + 1; p++) {
      const data = cache.current.get(p);
      if (data?.resumeToken && !cache.current.has(p + 1)) {
        prefetch(p + 1, data.resumeToken);
        return;
      }
    }
  }, [currentPage, items, prefetch]);

  const goNext = useCallback(() => {
    const nextPage = currentPage + 1;
    const cached = cache.current.get(nextPage);
    if (cached) {
      setCurrentPage(nextPage);
      setItems(cached.items);
      return;
    }
    // If a prefetch is already fetching this data, wait for it
    if (prefetchingRef.current) {
      pendingNavRef.current = nextPage;
      setLoading(true);
      return;
    }
    // Otherwise fetch directly
    const currentData = cache.current.get(currentPage);
    if (currentData?.resumeToken) {
      fetchBatch(nextPage, currentData.resumeToken);
    }
  }, [currentPage, fetchBatch]);

  const goPrev = useCallback(() => {
    if (currentPage <= 0) return;
    const prevPage = currentPage - 1;
    const cached = cache.current.get(prevPage);
    if (cached) {
      setCurrentPage(prevPage);
      setItems(cached.items);
    }
  }, [currentPage]);

  const goFirst = useCallback(() => {
    if (currentPage <= 0) return;
    const cached = cache.current.get(0);
    if (cached) {
      setCurrentPage(0);
      setItems(cached.items);
    }
  }, [currentPage]);

  const currentData = cache.current.get(currentPage);
  const hasNext =
    cache.current.has(currentPage + 1) || !!currentData?.resumeToken;
  const hasPrev = currentPage > 0;

  // Collect up to 2 pages ahead for tx detail preloading
  const aheadItems: T[] = [];
  for (let p = currentPage + 1; p <= currentPage + 2 && cache.current.has(p); p++) {
    aheadItems.push(...cache.current.get(p)!.items);
  }

  return {
    items,
    currentPage,
    totalCount,
    hasNext,
    hasPrev,
    goFirst,
    goNext,
    goPrev,
    loading,
    error,
    aheadItems,
  };
}
