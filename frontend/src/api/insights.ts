import { request } from './client';
import type { AggregateInsights, HeroPerformance } from '../types';

export async function getInsights(
  heroId?: number,
  role?: number,
  lastN = 50,
): Promise<AggregateInsights> {
  const params = new URLSearchParams({ last_n: String(lastN) });
  if (heroId !== undefined) params.set('hero_id', String(heroId));
  if (role !== undefined) params.set('role', String(role));
  return request<AggregateInsights>(`/api/insights?${params}`);
}

export async function getHeroPerformance(
  lastN = 100,
): Promise<HeroPerformance[]> {
  return request<HeroPerformance[]>(
    `/api/insights/heroes?last_n=${lastN}`,
  );
}
