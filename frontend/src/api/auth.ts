import { request } from './client';
import type { UserOut } from '../types';

export async function getMe(): Promise<UserOut> {
  return request<UserOut>('/auth/me');
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' });
  localStorage.removeItem('token');
  localStorage.removeItem('steam_id');
  localStorage.removeItem('persona_name');
}

export function getSteamLoginUrl(): string {
  return '/auth/steam';
}
