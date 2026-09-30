import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearCredentials,
  loadCredentials,
  loadSession,
  saveCredentials,
  saveSession,
} from './storage';

const CREDENTIALS = { idInstance: '1101000001', apiTokenInstance: 'token' };

beforeEach(() => {
  window.localStorage.clear();
});

describe('учётные данные', () => {
  it('возвращает null, если ничего не сохранено', () => {
    expect(loadCredentials()).toBeNull();
  });

  it('сохраняет и читает обратно', () => {
    saveCredentials(CREDENTIALS);

    expect(loadCredentials()).toEqual(CREDENTIALS);
  });

  it('игнорирует мусор в localStorage', () => {
    window.localStorage.setItem('max-chat.credentials', '{не json');

    expect(loadCredentials()).toBeNull();
  });

  it('игнорирует JSON неожиданной формы', () => {
    window.localStorage.setItem('max-chat.credentials', '{"foo":1}');

    expect(loadCredentials()).toBeNull();
  });

  it('удаляет учётные данные', () => {
    saveCredentials(CREDENTIALS);
    clearCredentials();

    expect(loadCredentials()).toBeNull();
  });
});

describe('сессия чатов', () => {
  const session = {
    credentials: CREDENTIALS,
    chats: [
      { chatId: 'a', title: 'Анна', lastActivity: 2, unread: 1, messages: [] },
    ],
    activeChatId: 'a',
  };

  it('возвращает пустую сессию для нового инстанса', () => {
    expect(loadSession(CREDENTIALS)).toEqual({
      credentials: CREDENTIALS,
      chats: [],
      activeChatId: null,
    });
  });

  it('разделяет сессии разных инстансов', () => {
    const other = { ...CREDENTIALS, idInstance: '1101000002' };

    saveSession(session);
    saveSession({
      ...session,
      credentials: other,
      chats: [{ chatId: 'b', title: 'Борис', lastActivity: 1, unread: 0, messages: [] }],
    });

    expect(loadSession(CREDENTIALS).chats[0].chatId).toBe('a');
    expect(loadSession(other).chats[0].chatId).toBe('b');
  });

  it('восстанавливает чаты и активный чат', () => {
    saveSession(session);

    const restored = loadSession(CREDENTIALS);
    expect(restored.chats).toHaveLength(1);
    expect(restored.activeChatId).toBe('a');
  });

  it('не падает на повреждённых данных сессии', () => {
    window.localStorage.setItem(`max-chat.session.${CREDENTIALS.idInstance}`, 'null');

    expect(loadSession(CREDENTIALS).chats).toEqual([]);
  });

  it('восстанавливает null, если активный чат был строкой не из числа', () => {
    window.localStorage.setItem(
      `max-chat.session.${CREDENTIALS.idInstance}`,
      JSON.stringify({ chats: [], activeChatId: 42 }),
    );

    expect(loadSession(CREDENTIALS).activeChatId).toBeNull();
  });
});