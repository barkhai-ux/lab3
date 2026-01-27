import { useState, useEffect, useCallback } from 'react';
import type { UserOut } from '../types';
import { getMe, logout as apiLogout } from '../api/auth';
import { ApiError } from '../api/client';

interface AuthState {
  user: UserOut | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setState({ user: null, loading: false, error: null });
      return;
    }
    try {
      const user = await getMe();
      setState({ user, loading: false, error: null });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('token');
        setState({ user: null, loading: false, error: null });
      } else {
        setState({
          user: null,
          loading: false,
          error: 'Failed to verify session',
        });
      }
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Clear local state even if server logout fails
      localStorage.removeItem('token');
      localStorage.removeItem('steam_id');
      localStorage.removeItem('persona_name');
    }
    setState({ user: null, loading: false, error: null });
  }, []);

  const isAuthenticated = state.user !== null;

  return { ...state, isAuthenticated, logout, refetch: checkAuth };
}
