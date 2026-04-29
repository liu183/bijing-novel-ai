'use client';

import { useState, useCallback, useMemo } from 'react';

/**
 * Generic paginated list hook.
 * Returns a progressively increasing slice of items with load-more support.
 */
export function usePaginatedList<T>(items: T[], pageSize: number = 6) {
  const [displayCount, setDisplayCount] = useState(pageSize);
  const [loadingMore, setLoadingMore] = useState(false);

  const displayItems = useMemo(() => {
    return items.slice(0, displayCount);
  }, [items, displayCount]);

  const hasMore = items.length > displayCount;

  const loadMore = useCallback(() => {
    if (loadingMore) return;
    setLoadingMore(true);
    setDisplayCount((prev) => prev + pageSize);
    setLoadingMore(false);
  }, [loadingMore, pageSize]);

  const reset = useCallback(() => {
    setDisplayCount(pageSize);
  }, [pageSize]);

  return { displayItems, hasMore, loadMore, loadingMore, reset };
}
