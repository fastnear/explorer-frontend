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
  fetchPage: (resumeToken?: string) => Promise<FetchPageResult<T>>;
  pageSize: number;
  key: string; // changing this resets the cache (e.g. accountId)
}

interface UsePagedCacheReturn<T> {
  items: T[];
  currentPage: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
  goNext: () => void;
  goPrev: () => void;
  loading: boolean;
  error: string | null;
}

export default function usePagedCache<T>({
  fetchPage,
  key,
}: UsePagedCacheOptions<T>): UsePagedCacheReturn<T> {
  const cache = useRef<Map<number, PageData<T>>>(new Map());
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<T[]>([]);

  const fetchAndStore = useCallback(
    async (page: number, resumeToken?: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPage(resumeToken);
        cache.current.set(page, {
          items: result.items,
          resumeToken: result.resumeToken,
        });
        setTotalCount(result.totalCount);
        setItems(result.items);
        setCurrentPage(page);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [fetchPage]
  );

  // Reset on key change and fetch page 0
  useEffect(() => {
    cache.current = new Map();
    setCurrentPage(0);
    setTotalCount(0);
    setItems([]);
    fetchAndStore(0);
  }, [key, fetchAndStore]);

  const goNext = useCallback(() => {
    const nextPage = currentPage + 1;
    const cached = cache.current.get(nextPage);
    if (cached) {
      setCurrentPage(nextPage);
      setItems(cached.items);
    } else {
      const currentData = cache.current.get(currentPage);
      if (currentData?.resumeToken) {
        fetchAndStore(nextPage, currentData.resumeToken);
      }
    }
  }, [currentPage, fetchAndStore]);

  const goPrev = useCallback(() => {
    if (currentPage <= 0) return;
    const prevPage = currentPage - 1;
    const cached = cache.current.get(prevPage);
    if (cached) {
      setCurrentPage(prevPage);
      setItems(cached.items);
    }
  }, [currentPage]);

  const currentData = cache.current.get(currentPage);
  const hasNext =
    !!currentData?.resumeToken ||
    cache.current.has(currentPage + 1);
  const hasPrev = currentPage > 0;

  return {
    items,
    currentPage,
    totalCount,
    hasNext,
    hasPrev,
    goNext,
    goPrev,
    loading,
    error,
  };
}
