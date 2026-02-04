import { useState, useCallback, useEffect, useRef } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  sortKey?: keyof T | ((row: T) => number | string | null);
  render: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  initialSortKey?: string;
  initialSortOrder?: 'asc' | 'desc';
  selectedKey?: string | number | null;
  compact?: boolean;
}

export default function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  initialSortKey,
  initialSortOrder = 'desc',
  selectedKey,
  compact = false,
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey ?? null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  }, [sortKey]);

  const getSortValue = useCallback((row: T, column: Column<T>): number | string | null => {
    if (!column.sortKey) return null;
    if (typeof column.sortKey === 'function') {
      return column.sortKey(row);
    }
    const value = row[column.sortKey as keyof T];
    if (value === null || value === undefined) return null;
    return value as number | string;
  }, []);

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const column = columns.find((c) => c.key === sortKey);
        if (!column) return 0;

        const aVal = getSortValue(a, column);
        const bVal = getSortValue(b, column);

        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;

        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'asc' ? comparison : -comparison;
      })
    : data;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tableRef.current?.contains(document.activeElement)) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, sortedData.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && selectedIndex >= 0 && onRowClick) {
        e.preventDefault();
        onRowClick(sortedData[selectedIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sortedData, selectedIndex, onRowClick]);

  const alignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table ref={tableRef} className="data-table" tabIndex={0}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortKey && handleSort(col.key)}
                className={`${alignClass(col.align)} ${sortKey === col.key ? 'sorted' : ''} ${!col.sortKey ? 'cursor-default' : ''}`}
                style={col.width ? { width: col.width } : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortKey && sortKey === col.key && (
                    <span className="text-dota-gold">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => {
            const key = keyExtractor(row);
            const isSelected = selectedKey !== undefined ? key === selectedKey : index === selectedIndex;

            return (
              <tr
                key={key}
                onClick={() => {
                  setSelectedIndex(index);
                  onRowClick?.(row);
                }}
                className={`${isSelected ? 'selected' : ''} ${onRowClick ? 'cursor-pointer' : ''} ${compact ? '' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={alignClass(col.align)}>
                    {col.render(row, index)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {sortedData.length === 0 && (
        <div className="py-8 text-center text-dota-text-muted">
          No data available
        </div>
      )}
    </div>
  );
}
