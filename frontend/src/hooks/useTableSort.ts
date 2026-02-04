import { useState, useCallback, useMemo } from 'react';

type SortOrder = 'asc' | 'desc';

interface UseTableSortResult<T> {
  sortKey: string | null;
  sortOrder: SortOrder;
  sortedData: T[];
  handleSort: (key: string) => void;
  setSortKey: (key: string | null) => void;
  setSortOrder: (order: SortOrder) => void;
}

interface SortConfig<T> {
  key: string;
  getValue: (item: T) => number | string | null | undefined;
}

export function useTableSort<T>(
  data: T[],
  sortConfigs: SortConfig<T>[],
  initialSortKey?: string,
  initialSortOrder: SortOrder = 'desc'
): UseTableSortResult<T> {
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey ?? null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  }, [sortKey]);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    const config = sortConfigs.find((c) => c.key === sortKey);
    if (!config) return data;

    return [...data].sort((a, b) => {
      const aVal = config.getValue(a);
      const bVal = config.getValue(b);

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortOrder, sortConfigs]);

  return {
    sortKey,
    sortOrder,
    sortedData,
    handleSort,
    setSortKey,
    setSortOrder,
  };
}
