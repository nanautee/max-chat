'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Avatar } from './Avatar';
import { Composer } from './Composer';
import { MessageBubble } from './MessageBubble';
import { ArrowLeftIcon, ChatIcon, TrashIcon } from './icons';
import { formatChatDay, formatPhone } from '@/lib/format';
import type { Chat } from '@/lib/types';
import styles from './Conversation.module.css';

interface ConversationProps {
  chat: Chat | null;
  draft: string;
  disabled: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onClearHistory: () => void;
  onBack: () => void;
}

export function Conversation({
  chat,
  draft,
  disabled,
  onDraftChange,
  onSend,
  onClearHistory,
  onBack,
}: ConversationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const messages = useMemo(() => chat?.messages ?? [], [chat]);

  const withDividers = useMemo(() => {
    const seenDays = new Set<string>();
    return messages.map((message) => {
      const day = formatChatDay(message.timestamp);
      if (seenDays.has(day)) return { message, divider: undefined };
      seenDays.add(day);
      return { message, divider: day };
    });
  }, [messages]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const handleScroll = () => {
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      stickToBottomRef.current = distance < 120;
    };

    node.addEventListener('scroll', handleScroll, { passive: true });
    return () => node.removeEventListener('scroll', handleScroll);
  }, [chat?.chatId]);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, chat?.chatId]);

  if (!chat) {
    return (
      <section className={styles.conversation}>
        <div className={styles.empty}>
          <span className={styles.emptyGlyph}>
            <ChatIcon size={54} />
          </span>
          <h2 className={styles.emptyTitle}>Выберите чат</h2>
          <p className={styles.emptyText}>
            Создайте новый чат по номеру телефона получателя или откройте существующий в списке
            слева.
          </p>
        </div>
      </section>
    );
  }

  const subtitle = chat.phone ? formatPhone(chat.phone) : `chatId ${chat.chatId}`;

  return (
    <section className={styles.conversation}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
          aria-label="Назад к списку чатов"
        >
          <ArrowLeftIcon />
        </button>
        <Avatar name={chat.title} src={chat.avatarUrl} size={42} presenceRingColor="var(--bg-surface)" />
        <div className={styles.headerInfo}>
          <span className={styles.title}>{chat.title}</span>
          <span className={styles.subtitle}>{subtitle}</span>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.ghostButton}
            onClick={onClearHistory}
            title="Удалить локальную историю"
            aria-label="Удалить историю"
          >
            <TrashIcon />
          </button>
        </div>
      </header>

      <div className={styles.messages} ref={scrollRef}>
        <div className={styles.messagesInner}>
          <p className={styles.systemNotice}>
            Сообщения в этом прототипе хранятся локально в браузере. Отправка выполняется методом
            GREEN-API <code>SendMessage</code>, приём — методом <code>ReceiveNotification</code>.
          </p>

          {withDividers.map(({ message, divider }) => (
            <MessageBubble key={message.localId} message={message} showDayDivider={divider} />
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      <Composer
        value={draft}
        disabled={disabled}
        placeholder={disabled ? 'Инстанс не авторизован в MAX' : 'Напишите сообщение…'}
        onChange={onDraftChange}
        onSubmit={onSend}
      />
    </section>
  );
}