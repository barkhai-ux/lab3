import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavRoute {
  key: string;
  path: string;
}

const DEFAULT_ROUTES: NavRoute[] = [
  { key: 'D', path: '/' },
  { key: 'M', path: '/matches' },
  { key: 'I', path: '/insights' },
];

interface UseKeyboardNavOptions {
  routes?: NavRoute[];
  onSlash?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboardNav(options: UseKeyboardNavOptions = {}) {
  const {
    routes = DEFAULT_ROUTES,
    onSlash,
    onEscape,
    enabled = true,
  } = options;

  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Skip if user is typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Only handle Escape in inputs
      if (e.key === 'Escape' && onEscape) {
        onEscape();
      }
      return;
    }

    // Handle slash key for search focus
    if (e.key === '/' && onSlash) {
      e.preventDefault();
      onSlash();
      return;
    }

    // Handle Escape
    if (e.key === 'Escape' && onEscape) {
      onEscape();
      return;
    }

    // Handle navigation shortcuts
    const key = e.key.toUpperCase();
    const route = routes.find((r) => r.key === key);
    if (route) {
      e.preventDefault();
      navigate(route.path);
    }
  }, [enabled, routes, navigate, onSlash, onEscape]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

interface UseTableKeyboardNavOptions {
  itemCount: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onEnter?: (index: number) => void;
  enabled?: boolean;
}

export function useTableKeyboardNav(options: UseTableKeyboardNavOptions) {
  const {
    itemCount,
    selectedIndex,
    onSelect,
    onEnter,
    enabled = true,
  } = options;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Skip if user is typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onSelect(Math.min(selectedIndex + 1, itemCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onSelect(Math.max(selectedIndex - 1, 0));
    } else if (e.key === 'Enter' && onEnter && selectedIndex >= 0) {
      e.preventDefault();
      onEnter(selectedIndex);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSelect(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onSelect(itemCount - 1);
    }
  }, [enabled, itemCount, selectedIndex, onSelect, onEnter]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
