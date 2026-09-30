'use client';

import { useEffect, useMemo, useReducer } from 'react';
import { loadSession, saveSession } from '@/lib/storage';
import type { ChatMessage, Credentials, StoredSession } from '@/lib/types';
import {
  chatsReducer,
  initialChatsState,
  type ChatDraft,
} from './chatsReducer';

export { createLocalId } from './chatsReducer';
export type { ChatDraft } from './chatsReducer';

export function useChats(credentials: Credentials | null) {
  const [state, dispatch] = useReducer(chatsReducer, initialChatsState);

  useEffect(() => {
    if (!credentials) return;
    dispatch({ type: 'hydrate', session: loadSession(credentials) });
  }, [credentials]);

  useEffect(() => {
    if (!credentials || state.chats.length === 0) return;
    const session: StoredSession = { credentials, chats: state.chats, activeChatId: state.activeChatId };
    const timer = window.setTimeout(() => saveSession(session), 250);
    return () => window.clearTimeout(timer);
  }, [credentials, state]);

  const actions = useMemo(
    () => ({
      setActiveChat: (chatId: string | null) => dispatch({ type: 'setActiveChat', chatId }),
      upsertChat: (chat: ChatDraft) => dispatch({ type: 'upsertChat', chat }),
      addMessage: (message: ChatMessage, incrementUnread: boolean) =>
        dispatch({ type: 'addMessage', message, incrementUnread }),
      patchByIdMessage: (chatId: string, idMessage: string, patch: Partial<ChatMessage>) =>
        dispatch({ type: 'patchMessageByIdMessage', chatId, idMessage, patch }),
      patchByLocalId: (localId: string, patch: Partial<ChatMessage>) =>
        dispatch({ type: 'patchMessageByLocalId', localId, patch }),
      removeMessage: (localId: string) => dispatch({ type: 'removeMessage', localId }),
      markRead: (chatId: string) => dispatch({ type: 'markRead', chatId }),
      clearHistory: (chatId: string) => dispatch({ type: 'clearHistory', chatId }),
    }),
    [],
  );

  const activeChat = useMemo(
    () => state.chats.find((chat) => chat.chatId === state.activeChatId) ?? null,
    [state.chats, state.activeChatId],
  );

  return { chats: state.chats, activeChatId: state.activeChatId, activeChat, actions };
}