import { describe, expect, it } from 'vitest';
import {
  chatsReducer,
  findMessageByIdMessage,
  initialChatsState,
  type ChatsState,
} from './chatsReducer';
import type { Chat, ChatMessage } from '@/lib/types';

function message(partial: Partial<ChatMessage> & { chatId: string }): ChatMessage {
  return {
    localId: partial.localId ?? `local-${partial.idMessage ?? Math.random()}`,
    idMessage: partial.idMessage ?? null,
    chatId: partial.chatId,
    text: partial.text ?? 'text',
    timestamp: partial.timestamp ?? 1_700_000_000_000,
    outgoing: partial.outgoing ?? false,
    status: partial.status ?? 'read',
    ...(partial.error ? { error: partial.error } : {}),
  };
}

function chat(partial: Partial<Chat> & { chatId: string }): Chat {
  return {
    title: partial.chatId,
    lastActivity: partial.lastActivity ?? 1_700_000_000_000,
    unread: partial.unread ?? 0,
    messages: partial.messages ?? [],
    ...partial,
  };
}

function reduce(state: ChatsState, ...actions: Parameters<typeof chatsReducer>[1][]): ChatsState {
  return actions.reduce(chatsReducer, state);
}

function messagesOf(state: ChatsState, chatId: string): ChatMessage[] {
  const found = state.chats.find((item) => item.chatId === chatId);
  if (!found) throw new Error(`Чат ${chatId} отсутствует в состоянии`);
  return found.messages;
}

describe('chatsReducer: гидратация', () => {
  it('сортирует чаты по свежести и восстанавливает активный', () => {
    const state = reduce(initialChatsState, {
      type: 'hydrate',
      session: {
        credentials: { idInstance: '1', apiTokenInstance: 't' },
        chats: [
          chat({ chatId: 'old', lastActivity: 100 }),
          chat({ chatId: 'new', lastActivity: 900 }),
        ],
        activeChatId: 'old',
      },
    });

    expect(state.chats.map((item) => item.chatId)).toEqual(['new', 'old']);
    expect(state.activeChatId).toBe('old');
  });
});

describe('chatsReducer: выбор чата и непрочитанные', () => {
  const base: ChatsState = {
    chats: [chat({ chatId: 'a', unread: 3 }), chat({ chatId: 'b', unread: 1 })],
    activeChatId: null,
  };

  it('открытие чата сбрасывает его счётчик', () => {
    const state = reduce(base, { type: 'setActiveChat', chatId: 'a' });

    expect(state.activeChatId).toBe('a');
    expect(state.chats[0].unread).toBe(0);
    expect(state.chats[1].unread).toBe(1);
  });

  it('markRead обнуляет счётчик без смены активного чата', () => {
    const state = reduce(base, { type: 'markRead', chatId: 'b' });

    expect(state.chats[1].unread).toBe(0);
    expect(state.activeChatId).toBeNull();
  });

  it('переключение на null оставляет чаты нетронутыми', () => {
    const state = reduce({ ...base, activeChatId: 'a' }, { type: 'setActiveChat', chatId: null });

    expect(state.activeChatId).toBeNull();
    expect(state.chats[0].unread).toBe(3);
  });
});

describe('chatsReducer: upsertChat', () => {
  it('создаёт чат с дефолтами, если его не было', () => {
    const state = reduce(initialChatsState, { type: 'upsertChat', chat: { chatId: 'x' } });

    expect(state.chats).toHaveLength(1);
    expect(state.chats[0]).toMatchObject({
      chatId: 'x',
      title: 'Чат x',
      unread: 0,
      messages: [],
    });
  });

  it('обновляет существующий чат, не затирая сообщения', () => {
    const base: ChatsState = {
      chats: [chat({ chatId: 'x', title: 'Анна', messages: [message({ chatId: 'x' })] })],
      activeChatId: 'x',
    };

    const state = reduce(base, {
      type: 'upsertChat',
      chat: { chatId: 'x', title: 'Анна Петрова', avatarUrl: 'https://cdn/a.jpg' },
    });

    expect(state.chats[0].title).toBe('Анна Петрова');
    expect(state.chats[0].avatarUrl).toBe('https://cdn/a.jpg');
    expect(state.chats[0].messages).toHaveLength(1);
  });

  it('пустой title не затирает существующий', () => {
    const base: ChatsState = { chats: [chat({ chatId: 'x', title: 'Анна' })], activeChatId: null };

    const state = reduce(base, { type: 'upsertChat', chat: { chatId: 'x', title: '' } });

    expect(state.chats[0].title).toBe('Анна');
  });
});

describe('chatsReducer: сообщения', () => {
  const base: ChatsState = {
    chats: [chat({ chatId: 'a' }), chat({ chatId: 'b', lastActivity: 500 })],
    activeChatId: 'a',
  };

  it('добавляет входящее сообщение и поднимает чат наверх', () => {
    const state = reduce(base, {
      type: 'addMessage',
      message: message({ chatId: 'a', idMessage: '1', localId: 'a_1' }),
      incrementUnread: true,
    });

    expect(state.chats[0].chatId).toBe('a');
    expect(state.chats[0].messages).toHaveLength(1);
    expect(state.chats[0].unread).toBe(1);
  });

  it('исходящее сообщение не увеличивает непрочитанные', () => {
    const state = reduce(base, {
      type: 'addMessage',
      message: message({ chatId: 'a', outgoing: true, localId: 'local-1' }),
      incrementUnread: false,
    });

    expect(state.chats[0].unread).toBe(0);
  });

  it('входящее сообщение в неактивный чат увеличивает счётчик', () => {
    const state = reduce(
      { ...base, activeChatId: 'a' },
      {
        type: 'addMessage',
        message: message({ chatId: 'b', idMessage: '9', localId: 'b_9' }),
        incrementUnread: true,
      },
    );

    expect(state.chats[0].chatId).toBe('b');
    expect(state.chats[0].unread).toBe(1);
  });

  it('создаёт чат автоматически, если сообщение пришло в неизвестный', () => {
    const state = reduce(initialChatsState, {
      type: 'addMessage',
      message: message({ chatId: 'new', idMessage: '1', localId: 'new_1' }),
      incrementUnread: true,
    });

    expect(state.chats).toHaveLength(1);
    expect(state.chats[0]).toMatchObject({ chatId: 'new', unread: 1 });
  });

  it('игнорирует дубль по localId', () => {
    const once = reduce(base, {
      type: 'addMessage',
      message: message({ chatId: 'a', idMessage: '1', localId: 'a_1' }),
      incrementUnread: true,
    });
    const twice = reduce(once, {
      type: 'addMessage',
      message: message({ chatId: 'a', idMessage: '1', localId: 'a_1' }),
      incrementUnread: true,
    });

    expect(twice.chats[0].messages).toHaveLength(1);
    expect(twice.chats[0].unread).toBe(1);
  });

  it('игнорирует дубль по idMessage даже с другим localId', () => {
    const once = reduce(base, {
      type: 'addMessage',
      message: message({ chatId: 'a', idMessage: '1', localId: 'a_1' }),
      incrementUnread: false,
    });
    const twice = reduce(once, {
      type: 'addMessage',
      message: message({ chatId: 'a', idMessage: '1', localId: 'other-key' }),
      incrementUnread: false,
    });

    expect(twice.chats[0].messages).toHaveLength(1);
  });

  it('одинаковый idMessage в разных чатах не считается дублем', () => {
    const state = reduce(base, {
      type: 'addMessage',
      message: message({ chatId: 'b', idMessage: '1', localId: 'b_1' }),
      incrementUnread: false,
    });

    expect(state.chats[0].messages).toHaveLength(1);
  });

  it('patch по idMessage обновляет статус', () => {
    const withMessage = reduce(base, {
      type: 'addMessage',
      message: message({ chatId: 'a', idMessage: '1', localId: 'a_1', outgoing: true }),
      incrementUnread: false,
    });

    const state = reduce(withMessage, {
      type: 'patchMessageByIdMessage',
      chatId: 'a',
      idMessage: '1',
      patch: { status: 'read' },
    });

    expect(messagesOf(state, 'a')[0].status).toBe('read');
  });

  it('patch по неизвестному idMessage не меняет состояние', () => {
    const withMessage = reduce(base, {
      type: 'addMessage',
      message: message({ chatId: 'a', idMessage: '1', localId: 'a_1' }),
      incrementUnread: false,
    });

    const state = reduce(withMessage, {
      type: 'patchMessageByIdMessage',
      chatId: 'a',
      idMessage: 'missing',
      patch: { status: 'read' },
    });

    expect(state).toBe(withMessage);
  });

  it('patch по localId связывает оптимистичное сообщение с idMessage', () => {
    const optimistic = reduce(base, {
      type: 'addMessage',
      message: message({ chatId: 'a', outgoing: true, localId: 'local-x', status: 'pending' }),
      incrementUnread: false,
    });

    const state = reduce(optimistic, {
      type: 'patchMessageByLocalId',
      localId: 'local-x',
      patch: { idMessage: '555', status: 'sent' },
    });

    expect(messagesOf(state, 'a')[0]).toMatchObject({
      idMessage: '555',
      status: 'sent',
    });
  });

  it('removeMessage удаляет сообщение', () => {
    const withMessage = reduce(base, {
      type: 'addMessage',
      message: message({ chatId: 'a', idMessage: '1', localId: 'a_1' }),
      incrementUnread: false,
    });

    const state = reduce(withMessage, { type: 'removeMessage', localId: 'a_1' });

    expect(messagesOf(state, 'a')).toHaveLength(0);
  });

  it('clearHistory очищает сообщения и счётчик', () => {
    const withMessage = reduce(base, {
      type: 'addMessage',
      message: message({ chatId: 'a', idMessage: '1', localId: 'a_1' }),
      incrementUnread: true,
    });

    const state = reduce(withMessage, { type: 'clearHistory', chatId: 'a' });

    expect(messagesOf(state, 'a')).toHaveLength(0);
    expect(state.chats.find((item) => item.chatId === 'a')?.unread).toBe(0);
  });
});

describe('findMessageByIdMessage', () => {
  it('находит сообщение в нужном чате', () => {
    const chats = [
      chat({ chatId: 'a', messages: [message({ chatId: 'a', idMessage: '1', localId: 'a_1' })] }),
    ];

    expect(findMessageByIdMessage(chats, 'a', '1')).not.toBeNull();
    expect(findMessageByIdMessage(chats, 'b', '1')).toBeNull();
    expect(findMessageByIdMessage(chats, 'a', '2')).toBeNull();
  });
});