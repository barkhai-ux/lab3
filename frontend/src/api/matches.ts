import { request } from './client';
import type {
  MatchListOut,
  MatchDetailOut,
  TimelineOut,
  MatchAnalysisOut,
  TaskStatusOut,
} from '../types';

export async function listMatches(
  page = 1,
  perPage = 20,
): Promise<MatchListOut> {
  return request<MatchListOut>(
    `/api/matches?page=${page}&per_page=${perPage}`,
  );
}

export async function refreshMatches(): Promise<TaskStatusOut> {
  return request<TaskStatusOut>('/api/matches/refresh', { method: 'POST' });
}

export async function getMatch(matchId: number): Promise<MatchDetailOut> {
  return request<MatchDetailOut>(`/api/matches/${matchId}`);
}

export async function getTimeline(
  matchId: number,
  eventType?: string,
  limit = 1000,
): Promise<TimelineOut> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (eventType) params.set('event_type', eventType);
  return request<TimelineOut>(`/api/matches/${matchId}/timeline?${params}`);
}

export async function getAnalysis(
  matchId: number,
): Promise<MatchAnalysisOut | null> {
  try {
    return await request<MatchAnalysisOut>(
      `/api/matches/${matchId}/analysis`,
    );
  } catch (err) {
    if (err instanceof Error && 'status' in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
}

export async function triggerAnalysis(
  matchId: number,
): Promise<TaskStatusOut> {
  return request<TaskStatusOut>(`/api/matches/${matchId}/analyze`, {
    method: 'POST',
  });
}

export async function fetchReplay(
  matchId: number,
): Promise<TaskStatusOut> {
  return request<TaskStatusOut>(`/api/matches/${matchId}/fetch-replay`, {
    method: 'POST',
  });
}
