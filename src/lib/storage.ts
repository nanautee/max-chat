import type { Credentials, StoredSession } from './types';

const CREDENTIALS_KEY = 'max-chat.credentials';
const SESSION_PREFIX = 'max-chat.session.';

const emptySession = (credentials: Credentials): StoredSession => ({
  credentials,
  chats: [],
  activeChatId: null,
});

function sessionKey(idInstance: string): string {
  return `${SESSION_PREFIX}${idInstance}`;
}

/** В localStorage пишется только `chats` и `activeChatId`: credentials уже лежат в ключе. */
function isStoredSession(value: unknown): value is Omit<StoredSession, 'credentials'> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Omit<StoredSession, 'credentials'>>;
  return (
    Array.isArray(candidate.chats) &&
    candidate.chats.every(
      (chat) => !!chat && typeof chat === 'object' && typeof (chat as { chatId?: unknown }).chatId === 'string',
    )
  );
}

export function loadCredentials(): Credentials | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const { idInstance, apiTokenInstance } = parsed as Partial<Credentials>;
    if (typeof idInstance !== 'string' || typeof apiTokenInstance !== 'string') return null;
    return { idInstance, apiTokenInstance };
  } catch {
    return null;
  }
}

export function saveCredentials(credentials: Credentials): void {
  try {
    window.localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  } catch {
    /* localStorage may be unavailable (private mode) — ignore */
  }
}

export function clearCredentials(): void {
  try {
    window.localStorage.removeItem(CREDENTIALS_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSession(credentials: Credentials): StoredSession {
  const fallback = emptySession(credentials);
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(sessionKey(credentials.idInstance));
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredSession(parsed)) return fallback;
    return {
      credentials,
      chats: parsed.chats,
      activeChatId: typeof parsed.activeChatId === 'string' ? parsed.activeChatId : null,
    };
  } catch {
    return fallback;
  }
}

export function saveSession(session: StoredSession): void {
  try {
    const { credentials, ...rest } = session;
    window.localStorage.setItem(sessionKey(credentials.idInstance), JSON.stringify(rest));
  } catch {
    /* ignore */
  }
}

export function clearSession(idInstance: string): void {
  try {
    window.localStorage.removeItem(sessionKey(idInstance));
  } catch {
    /* ignore */
  }
}