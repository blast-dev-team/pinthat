import type { Feedback, SavedSession, SessionsData } from '../types';

export const SESSIONS_KEY = 'qa-sessions';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function getSessionsData(): Promise<SessionsData> {
  try {
    const result = await chrome.storage.local.get(SESSIONS_KEY);
    const data = result[SESSIONS_KEY];
    if (!data || !Array.isArray(data.sessions)) return { sessions: [] };
    return data as SessionsData;
  } catch {
    return { sessions: [] };
  }
}

export async function saveSessionsData(data: SessionsData): Promise<void> {
  await chrome.storage.local.set({ [SESSIONS_KEY]: data });
}

/** Returns the number of sessions removed. */
export async function cleanOldSessions(): Promise<number> {
  const data = await getSessionsData();
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const before = data.sessions.length;
  data.sessions = data.sessions.filter(
    (s) => new Date(s.createdAt).getTime() >= cutoff,
  );
  const removed = before - data.sessions.length;
  if (removed > 0) await saveSessionsData(data);
  return removed;
}

export async function addSession(
  name: string,
  feedbacks: Feedback[],
  nextId: number,
): Promise<SavedSession> {
  const data = await getSessionsData();
  const session: SavedSession = {
    id: 'session-' + Date.now(),
    name,
    page: location.pathname,
    url: location.href,
    createdAt: new Date().toISOString(),
    status: 'open',
    feedbacks,
    nextId,
  };
  data.sessions.push(session);
  await saveSessionsData(data);
  return session;
}

export async function removeSession(id: string): Promise<void> {
  const data = await getSessionsData();
  data.sessions = data.sessions.filter((s) => s.id !== id);
  await saveSessionsData(data);
}
