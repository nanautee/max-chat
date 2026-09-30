'use client';

import { useMemo, useState } from 'react';
import { Avatar } from './Avatar';
import { LogoutIcon, PlusIcon, SearchIcon } from './icons';
import { formatListTime } from '@/lib/format';
import type { Chat, InstanceState } from '@/lib/types';
import styles from './ChatSidebar.module.css';

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  selfName: string;
  selfPhone: string;
  selfAvatar: string;
  instanceState: InstanceState | null;
  connectionError: string | null;
  streaming: boolean;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onLogout: () => void;
}

export function ChatSidebar({
  chats,
  activeChatId,
  selfName,
  selfPhone,
  selfAvatar,
  instanceState,
  connectionError,
  streaming,
  onSelectChat,
  onNewChat,
  onLogout,
}: ChatSidebarProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chats;
    return chats.filter((chat) => {
      const haystack = `${chat.title} ${chat.phone ?? ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [chats, query]);

  const status = useMemo(() => {
    if (connectionError) {
      return { tone: 'statusError' as const, text: connectionError, live: false };
    }
    if (instanceState === null) {
      return { tone: 'statusOk' as const, text: 'Подключено к GREEN-API', live: streaming };
    }
    if (instanceState === 'authorized') {
      return {
        tone: 'statusOk' as const,
        text: 'Инстанс авторизован · приём уведомлений активен',
        live: streaming,
      };
    }
    if (instanceState === 'starting') {
      return {
        tone: 'statusWarn' as const,
        text: 'Инстанс запускается, это занимает до 5 минут',
        live: false,
      };
    }
    return {
      tone: 'statusWarn' as const,
      text: `Статус инстанса: ${instanceState}. Отсканируйте QR-код в кабинете GREEN-API.`,
      live: false,
    };
  }, [connectionError, instanceState, streaming]);

  return (
    <aside className={styles.sidebar}>
      <header className={styles.header}>
        <Avatar name={selfName || 'ME'} src={selfAvatar || undefined} size={42} online />
        <div className={styles.headerInfo}>
          <span className={styles.selfName}>{selfName || 'Мой аккаунт'}</span>
          <span className={styles.selfPhone}>
            {selfPhone ? `+${selfPhone}` : 'номер неизвестен'}
          </span>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.ghostButton}
            onClick={onLogout}
            title="Отключиться от GREEN-API"
            aria-label="Отключиться"
          >
            <LogoutIcon />
          </button>
        </div>
      </header>

      <div className={styles.search}>
        <span className={styles.searchIcon}>
          <SearchIcon size={17} />
        </span>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Поиск чатов"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Поиск чатов"
        />
      </div>

      <div className={`${styles.statusStrip} ${styles[status.tone]}`}>
        <span className={styles.statusDot} />
        <span>{status.text}</span>
        {status.live ? <span className={styles.liveBadge}>LIVE</span> : null}
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>
            {chats.length === 0
              ? 'Пока нет ни одного чата. Начните новый, указав номер телефона получателя.'
              : 'Ничего не найдено по вашему запросу.'}
          </p>
        ) : (
          filtered.map((chat) => {
            const last = chat.messages[chat.messages.length - 1];
            const preview = last
              ? `${last.outgoing ? 'Вы: ' : ''}${last.text}`
              : 'Нет сообщений';

            return (
              <button
                key={chat.chatId}
                type="button"
                className={`${styles.item} ${
                  chat.chatId === activeChatId ? styles.itemActive : ''
                }`}
                onClick={() => onSelectChat(chat.chatId)}
              >
                <Avatar name={chat.title} src={chat.avatarUrl} size={46} />
                <span className={styles.itemBody}>
                  <span className={styles.itemTop}>
                    <span className={styles.itemTitle}>{chat.title}</span>
                    {last ? <span className={styles.itemTime}>{formatListTime(last.timestamp)}</span> : null}
                  </span>
                  <span className={styles.itemBottom}>
                    <span
                      className={`${styles.itemPreview} ${
                        last?.outgoing ? styles.previewOutgoing : ''
                      }`}
                    >
                      {preview}
                    </span>
                    {chat.unread > 0 ? <span className={styles.badge}>{chat.unread}</span> : null}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className={styles.newChatRow}>
        <button
          type="button"
          className={styles.newChatButton}
          onClick={onNewChat}
          disabled={instanceState !== null && instanceState !== 'authorized'}
          title={
            instanceState !== null && instanceState !== 'authorized'
              ? 'Инстанс не авторизован в MAX'
              : 'Создать чат по номеру телефона'
          }
        >
          <PlusIcon size={18} />
          Новый чат
        </button>
      </div>
    </aside>
  );
}