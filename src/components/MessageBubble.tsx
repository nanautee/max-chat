'use client';

import { memo } from 'react';
import { AlertIcon, CheckIcon, ClockIcon, DoubleCheckIcon } from './icons';
import { formatTime } from '@/lib/format';
import type { ChatMessage } from '@/lib/types';
import styles from './MessageBubble.module.css';

interface MessageBubbleProps {
  message: ChatMessage;
  showDayDivider?: string;
}

const STATUS_LABELS: Record<ChatMessage['status'], string> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
};

function StatusGlyph({ message }: { message: ChatMessage }) {
  const label = STATUS_LABELS[message.status] ?? '';

  switch (message.status) {
    case 'pending':
      return <ClockIcon size={13} aria-label={label} />;
    case 'sent':
      return <CheckIcon size={13} aria-label={label} />;
    case 'delivered':
    case 'read':
      return <DoubleCheckIcon size={15} aria-label={label} />;
    case 'failed':
      return <AlertIcon size={13} aria-label={label} />;
    default:
      return null;
  }
}

function MessageBubbleImpl({ message, showDayDivider }: MessageBubbleProps) {
  const rowClass = [
    styles.row,
    message.outgoing ? styles.rowOutgoing : styles.rowIncoming,
    message.outgoing && message.status === 'failed' ? styles.rowOutgoingFailed : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {showDayDivider ? <div className={styles.dayDivider}>{showDayDivider}</div> : null}
      <div className={rowClass}>
        <div className={styles.bubble}>
          <div className={styles.text}>{message.text}</div>
          <div className={styles.meta}>
            <time dateTime={new Date(message.timestamp).toISOString()}>
              {formatTime(message.timestamp)}
            </time>
            {message.outgoing ? <StatusGlyph message={message} /> : null}
          </div>
          {message.status === 'failed' && message.error ? (
            <div className={styles.errorText}>
              <AlertIcon size={13} />
              <span>{message.error}</span>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);