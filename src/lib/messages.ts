import type {
  Chat,
  ChatMessage,
  MessageNotification,
  OutgoingStatus,
  StatusNotification,
} from './types';

export interface ParsedNotification {
  chatId: string;
  chatTitle: string | null;
  chatPhone: string | null;
  message: ChatMessage;
}

function isOutgoingNotification(notification: MessageNotification): boolean {
  return (
    notification.typeWebhook === 'outgoingAPIMessageReceived' ||
    notification.typeWebhook === 'outgoingMessageReceived'
  );
}

function senderPhoneOf(notification: MessageNotification): string | null {
  const raw = notification.senderData?.senderPhoneNumber;
  return raw && raw > 0 ? String(raw) : null;
}

export function notificationKey(chatId: string, idMessage: string): string {
  return `${chatId}_${idMessage}`;
}

export function parseMessageNotification(
  notification: MessageNotification,
): ParsedNotification | null {
  const text = notification.messageData?.textMessageData?.textMessage;
  if (typeof text !== 'string' || text.length === 0) return null;

  const outgoing = isOutgoingNotification(notification);
  const senderData = notification.senderData;

  // У личных чатов id лежит в sender, у групп и каналов — в chatId.
  const chatId =
    !outgoing && senderData.chatType === 'user'
      ? senderData.sender || senderData.chatId
      : senderData.chatId;

  const phone = senderPhoneOf(notification);

  const chatTitle = outgoing
    ? null
    : senderData.senderName || senderData.senderContactName || null;

  return {
    chatId,
    chatTitle,
    chatPhone: phone,
    message: {
      localId: notificationKey(chatId, notification.idMessage),
      idMessage: notification.idMessage,
      chatId,
      text,
      timestamp: notification.timestamp * 1000,
      outgoing,
      status: outgoing ? 'sent' : 'read',
    },
  };
}

/**
 * Эхо GREEN-API приходит раньше ответа sendMessage, поэтому оптимистичное
 * сообщение сопоставляется по чату, статусу и тексту — иначе в ленте будет дубль.
 */
export function findPendingOutgoingEcho(
  chats: Chat[],
  chatId: string,
  text: string,
): ChatMessage | null {
  const chat = chats.find((item) => item.chatId === chatId);
  if (!chat) return null;
  return (
    chat.messages.find(
      (message) =>
        message.outgoing && message.status === 'pending' && message.text === text,
    ) ?? null
  );
}

export interface StatusPatch {
  status: ChatMessage['status'];
  error?: string;
}

function describeStatusError(status: OutgoingStatus): string {
  switch (status) {
    case 'noAccount':
      return 'У получателя нет аккаунта MAX';
    case 'notInGroup':
      return 'Аккаунт не состоит в группе';
    default:
      return 'Сообщение не доставлено';
  }
}

export function parseStatusNotification(notification: StatusNotification): StatusPatch {
  switch (notification.status) {
    case 'read':
      return { status: 'read' };
    case 'delivered':
      return { status: 'delivered' };
    default:
      return {
        status: 'failed',
        error: notification.description || describeStatusError(notification.status),
      };
  }
}