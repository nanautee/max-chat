import type { Chat, ChatMessage, StoredSession } from '@/lib/types';

export function createLocalId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export type ChatDraft = Pick<Chat, 'chatId'> & Partial<Omit<Chat, 'chatId'>>;

export type ChatsAction =
  | { type: 'hydrate'; session: StoredSession }
  | { type: 'setActiveChat'; chatId: string | null }
  | { type: 'upsertChat'; chat: ChatDraft }
  | { type: 'addMessage'; message: ChatMessage; incrementUnread: boolean }
  | {
      type: 'patchMessageByIdMessage';
      chatId: string;
      idMessage: string;
      patch: Partial<ChatMessage>;
    }
  | { type: 'patchMessageByLocalId'; localId: string; patch: Partial<ChatMessage> }
  | { type: 'removeMessage'; localId: string }
  | { type: 'markRead'; chatId: string }
  | { type: 'clearHistory'; chatId: string };

export interface ChatsState {
  chats: Chat[];
  activeChatId: string | null;
}

export const initialChatsState: ChatsState = { chats: [], activeChatId: null };

function updateChat(
  chats: Chat[],
  chatId: string,
  updater: (chat: Chat) => Chat,
): Chat[] {
  return chats.map((chat) => (chat.chatId === chatId ? updater(chat) : chat));
}

export function findMessageByIdMessage(
  chats: Chat[],
  chatId: string,
  idMessage: string,
): ChatMessage | null {
  const chat = chats.find((item) => item.chatId === chatId);
  return chat?.messages.find((message) => message.idMessage === idMessage) ?? null;
}

function withChatMovedToTop(chats: Chat[], chatId: string): Chat[] {
  const index = chats.findIndex((chat) => chat.chatId === chatId);
  if (index <= 0) return chats;
  const next = [...chats];
  const [target] = next.splice(index, 1);
  return [target, ...next];
}

export function chatsReducer(state: ChatsState, action: ChatsAction): ChatsState {
  switch (action.type) {
    case 'hydrate':
      return {
        chats: [...action.session.chats].sort((a, b) => b.lastActivity - a.lastActivity),
        activeChatId: action.session.activeChatId,
      };

    case 'setActiveChat': {
      if (!action.chatId) return { ...state, activeChatId: null };
      const target = state.chats.find((chat) => chat.chatId === action.chatId);
      if (!target) return { ...state, activeChatId: action.chatId };
      return {
        chats: updateChat(state.chats, action.chatId, (chat) =>
          chat.unread > 0 ? { ...chat, unread: 0 } : chat,
        ),
        activeChatId: action.chatId,
      };
    }

    case 'upsertChat': {
      const existing = state.chats.find((chat) => chat.chatId === action.chat.chatId);
      if (!existing) {
        return {
          chats: [
            {
              messages: [],
              unread: 0,
              title: `Чат ${action.chat.chatId}`,
              lastActivity: Date.now(),
              ...action.chat,
            },
            ...state.chats,
          ],
          activeChatId: state.activeChatId,
        };
      }
      return {
        chats: updateChat(state.chats, action.chat.chatId, (chat) => ({
          ...chat,
          title: action.chat.title || chat.title,
          phone: action.chat.phone ?? chat.phone,
          avatarUrl: action.chat.avatarUrl ?? chat.avatarUrl,
        })),
        activeChatId: state.activeChatId,
      };
    }

    case 'addMessage': {
      const { message, incrementUnread } = action;
      const chat = state.chats.find((item) => item.chatId === message.chatId);
      const isDuplicate = chat?.messages.some(
        (item) =>
          item.localId === message.localId ||
          (message.idMessage !== null && item.idMessage === message.idMessage),
      );
      if (isDuplicate) return state;

      const nextChat: Chat = chat
        ? {
            ...chat,
            messages: [...chat.messages, message],
            lastActivity: message.timestamp,
            unread: incrementUnread ? chat.unread + 1 : chat.unread,
          }
        : {
            chatId: message.chatId,
            title: message.chatId,
            lastActivity: message.timestamp,
            unread: incrementUnread ? 1 : 0,
            messages: [message],
          };

      const chats = chat
        ? updateChat(state.chats, message.chatId, () => nextChat)
        : [nextChat, ...state.chats];

      return { chats: withChatMovedToTop(chats, message.chatId), activeChatId: state.activeChatId };
    }

    case 'patchMessageByIdMessage': {
      if (!findMessageByIdMessage(state.chats, action.chatId, action.idMessage)) return state;
      return {
        chats: updateChat(state.chats, action.chatId, (chat) => ({
          ...chat,
          messages: chat.messages.map((message) =>
            message.idMessage === action.idMessage ? { ...message, ...action.patch } : message,
          ),
        })),
        activeChatId: state.activeChatId,
      };
    }

    case 'patchMessageByLocalId': {
      const chat = state.chats.find((item) =>
        item.messages.some((message) => message.localId === action.localId),
      );
      if (!chat) return state;
      return {
        chats: updateChat(state.chats, chat.chatId, (item) => ({
          ...item,
          messages: item.messages.map((message) =>
            message.localId === action.localId ? { ...message, ...action.patch } : message,
          ),
        })),
        activeChatId: state.activeChatId,
      };
    }

    case 'removeMessage': {
      const chat = state.chats.find((item) =>
        item.messages.some((message) => message.localId === action.localId),
      );
      if (!chat) return state;
      return {
        chats: updateChat(state.chats, chat.chatId, (item) => ({
          ...item,
          messages: item.messages.filter((message) => message.localId !== action.localId),
        })),
        activeChatId: state.activeChatId,
      };
    }

    case 'markRead':
      return {
        chats: updateChat(state.chats, action.chatId, (chat) =>
          chat.unread > 0 ? { ...chat, unread: 0 } : chat,
        ),
        activeChatId: state.activeChatId,
      };

    case 'clearHistory': {
      const chat = state.chats.find((item) => item.chatId === action.chatId);
      if (!chat) return state;
      return {
        chats: updateChat(state.chats, action.chatId, (item) => ({
          ...item,
          messages: [],
          unread: 0,
        })),
        activeChatId: state.activeChatId,
      };
    }

    default:
      return state;
  }
}