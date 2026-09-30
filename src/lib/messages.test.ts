import { describe, expect, it } from 'vitest';
import {
  findPendingOutgoingEcho,
  notificationKey,
  parseMessageNotification,
  parseStatusNotification,
} from './messages';
import type {
  Chat,
  ChatMessage,
  MessageNotification,
  StatusNotification,
} from './types';

const BASE_SENDER = {
  chatId: '10000000',
  chatName: '',
  chatType: 'user' as const,
  sender: '10000000',
  senderName: '',
  senderType: 'user' as const,
  senderContactName: '',
  senderPhoneNumber: 0,
};

const INSTANCE_DATA = { idInstance: 1101000001, wid: '', typeInstance: 'v3' };

function notification(
  partial: Partial<MessageNotification> & Pick<MessageNotification, 'typeWebhook'>,
): MessageNotification {
  return {
    instanceData: INSTANCE_DATA,
    timestamp: 1_700_000_000,
    idMessage: '1',
    senderData: BASE_SENDER,
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
    ...partial,
  };
}

describe('notificationKey', () => {
  it('включает chatId, потому что в MAX idMessage уникален только внутри чата', () => {
    expect(notificationKey('10000000', '1')).toBe('10000000_1');
    expect(notificationKey('20000000', '1')).not.toBe(notificationKey('10000000', '1'));
  });
});

describe('parseMessageNotification', () => {
  it('разбирает входящее сообщение от пользователя', () => {
    const result = parseMessageNotification(
      notification({
        typeWebhook: 'incomingMessageReceived',
        senderData: {
          ...BASE_SENDER,
          senderName: 'Анна Петрова',
          senderPhoneNumber: 79991234567,
        },
      }),
    );

    expect(result).not.toBeNull();
    expect(result!.chatId).toBe('10000000');
    expect(result!.chatTitle).toBe('Анна Петрова');
    expect(result!.chatPhone).toBe('79991234567');
    expect(result!.message).toMatchObject({
      chatId: '10000000',
      idMessage: '1',
      text: 'Привет',
      outgoing: false,
      status: 'read',
      localId: '10000000_1',
    });
  });

  it('переводит unix-секунды в миллисекунды', () => {
    const result = parseMessageNotification(
      notification({ typeWebhook: 'incomingMessageReceived', timestamp: 1_700_000_000 }),
    );

    expect(result!.message.timestamp).toBe(1_700_000_000_000);
  });

  it('для входящего в группу использует chatId, а не sender', () => {
    const result = parseMessageNotification(
      notification({
        typeWebhook: 'incomingMessageReceived',
        senderData: {
          ...BASE_SENDER,
          chatType: 'group',
          senderType: 'user',
          sender: '555000',
          chatId: '-10000000000000',
          senderName: 'Рабочий чат',
        },
      }),
    );

    expect(result!.chatId).toBe('-10000000000000');
    expect(result!.message.localId).toBe('-10000000000000_1');
  });

  it('для исходящего эха берёт chatId и не переопределяет заголовок чата', () => {
    const result = parseMessageNotification(
      notification({
        typeWebhook: 'outgoingAPIMessageReceived',
        senderData: { ...BASE_SENDER, chatId: '10000000', senderName: 'Анна' },
      }),
    );

    expect(result!.chatId).toBe('10000000');
    expect(result!.chatTitle).toBeNull();
    expect(result!.message).toMatchObject({ outgoing: true, status: 'sent' });
  });

  it('помечает сообщение с телефона как исходящее', () => {
    const result = parseMessageNotification(
      notification({ typeWebhook: 'outgoingMessageReceived' }),
    );

    expect(result!.message.outgoing).toBe(true);
  });

  it('возвращает null для неподдерживаемых типов сообщений', () => {
    const result = parseMessageNotification(
      notification({
        typeWebhook: 'incomingMessageReceived',
        messageData: { typeMessage: 'imageMessage' },
      }),
    );

    expect(result).toBeNull();
  });

  it('возвращает null для пустого текста', () => {
    const result = parseMessageNotification(
      notification({
        typeWebhook: 'incomingMessageReceived',
        messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: '' } },
      }),
    );

    expect(result).toBeNull();
  });

  it('не считает скрытый номер за телефон', () => {
    const result = parseMessageNotification(
      notification({ typeWebhook: 'incomingMessageReceived' }),
    );

    expect(result!.chatPhone).toBeNull();
  });

  it('использует senderContactName, если имени отправителя нет', () => {
    const result = parseMessageNotification(
      notification({
        typeWebhook: 'incomingMessageReceived',
        senderData: { ...BASE_SENDER, senderName: '', senderContactName: 'Коллега' },
      }),
    );

    expect(result!.chatTitle).toBe('Коллега');
  });
});

describe('findPendingOutgoingEcho', () => {
  const pending: ChatMessage = {
    localId: 'local-1',
    idMessage: null,
    chatId: 'a',
    text: 'Привет',
    timestamp: 1,
    outgoing: true,
    status: 'pending',
  };

  const chats: Chat[] = [
    { chatId: 'a', title: 'A', lastActivity: 1, unread: 0, messages: [pending] },
  ];

  it('находит оптимистичное сообщение с тем же текстом', () => {
    expect(findPendingOutgoingEcho(chats, 'a', 'Привет')).toBe(pending);
  });

  it('не матчит сообщение из другого чата', () => {
    expect(findPendingOutgoingEcho(chats, 'b', 'Привет')).toBeNull();
  });

  it('не матчит другое сообщение', () => {
    expect(findPendingOutgoingEcho(chats, 'a', 'Пока')).toBeNull();
  });

  it('не матчит уже отправленное сообщение', () => {
    const sent = [{ ...pending, status: 'sent' as const }];
    expect(findPendingOutgoingEcho([{ ...chats[0], messages: sent }], 'a', 'Привет')).toBeNull();
  });

  it('не матчит входящее сообщение с тем же текстом', () => {
    const incoming = [{ ...pending, outgoing: false, status: 'read' as const }];
    expect(findPendingOutgoingEcho([{ ...chats[0], messages: incoming }], 'a', 'Привет')).toBeNull();
  });
});

describe('parseStatusNotification', () => {
  function statusNotification(status: StatusNotification['status'], description = '') {
    return {
      typeWebhook: 'outgoingMessageStatus',
      instanceData: INSTANCE_DATA,
      timestamp: 1,
      idMessage: '1',
      chatId: '10000000',
      status,
      description,
    } satisfies StatusNotification;
  }

  it('read переводит сообщение в прочитанные', () => {
    expect(parseStatusNotification(statusNotification('read'))).toEqual({ status: 'read' });
  });

  it('delivered переводит сообщение в доставленные', () => {
    expect(parseStatusNotification(statusNotification('delivered'))).toEqual({
      status: 'delivered',
    });
  });

  it('failed с описанием от GREEN-API сохраняет его', () => {
    expect(parseStatusNotification(statusNotification('failed', 'Message not delivered'))).toEqual({
      status: 'failed',
      error: 'Message not delivered',
    });
  });

  it('noAccount получает человекочитаемую причину', () => {
    expect(parseStatusNotification(statusNotification('noAccount')).error).toMatch(/нет аккаунта MAX/);
  });

  it('notInGroup получает человекочитаемую причину', () => {
    expect(parseStatusNotification(statusNotification('notInGroup')).error).toMatch(/не состоит/);
  });
});