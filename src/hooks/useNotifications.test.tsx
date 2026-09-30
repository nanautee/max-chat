import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GreenApiClient, GreenApiError } from '@/lib/greenApi';
import type {
  MessageNotification,
  StateNotification,
  StatusNotification,
} from '@/lib/types';
import { useNotifications } from './useNotifications';

interface QueueItem {
  receiptId: number;
  body: unknown;
}

const INSTANCE_DATA = { idInstance: 1, wid: '', typeInstance: 'v3' };
const SENDER = {
  chatId: '10000000',
  chatName: '',
  chatType: 'user' as const,
  sender: '10000000',
  senderName: 'Анна',
  senderType: 'user' as const,
  senderContactName: '',
  senderPhoneNumber: 79991234567,
};

const handlers = {
  onMessage: vi.fn(),
  onStatus: vi.fn(),
  onState: vi.fn(),
  onError: vi.fn(),
};

function textMessage(idMessage: string): MessageNotification {
  return {
    typeWebhook: 'incomingMessageReceived',
    instanceData: INSTANCE_DATA,
    timestamp: 1_700_000_000,
    idMessage,
    senderData: SENDER,
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: `П${idMessage}` } },
  };
}

function createFakeClient(queue: QueueItem[]) {
  const waiters: Array<() => void> = [];
  const acknowledged: number[] = [];
  let stopped = false;

  const wake = () => {
    while (waiters.length > 0 && queue.length > 0) {
      const resolve = waiters.shift();
      resolve?.();
    }
  };

  return {
    acknowledged,
    client: {
      async receiveNotification(): Promise<{ receiptId: number | undefined; body?: unknown }> {
        while (queue.length === 0 && !stopped) {
          await new Promise<void>((resolve) => waiters.push(resolve));
        }
        const item = queue.shift();
        return item ? { receiptId: item.receiptId, body: item.body } : { receiptId: undefined };
      },
      async deleteNotification(receiptId: number) {
        acknowledged.push(receiptId);
        return { result: true, reason: '' };
      },
    } as unknown as GreenApiClient,
    push(item: QueueItem) {
      queue.push(item);
      wake();
    },
    stop() {
      stopped = true;
      wake();
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useNotifications', () => {
  it('не запускает цикл, пока enabled=false', () => {
    const fake = createFakeClient([]);
    const { result } = renderHook(() =>
      useNotifications(fake.client, false, handlers),
    );

    expect(result.current).toBe('idle');
    fake.stop();
  });

  it('раздаёт входящее сообщение и подтверждает его receiptId', async () => {
    const fake = createFakeClient([]);
    renderHook(() => useNotifications(fake.client, true, handlers));

    await act(async () => {
      fake.push({ receiptId: 11, body: textMessage('1') });
    });

    await waitFor(() => expect(handlers.onMessage).toHaveBeenCalledTimes(1));
    expect(handlers.onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ idMessage: '1' }),
    );
    await waitFor(() => expect(fake.acknowledged).toEqual([11]));

    fake.stop();
  });

  it('маршрутизирует статусы доставки', async () => {
    const fake = createFakeClient([]);
    renderHook(() => useNotifications(fake.client, true, handlers));

    const status: StatusNotification = {
      typeWebhook: 'outgoingMessageStatus',
      instanceData: INSTANCE_DATA,
      timestamp: 1,
      idMessage: '7',
      chatId: '10000000',
      status: 'read',
      description: '',
    };

    await act(async () => {
      fake.push({ receiptId: 12, body: status });
    });

    await waitFor(() => expect(handlers.onStatus).toHaveBeenCalledWith(status));

    fake.stop();
  });

  it('маршрутизирует смену состояния инстанса', async () => {
    const fake = createFakeClient([]);
    renderHook(() => useNotifications(fake.client, true, handlers));

    const state: StateNotification = {
      typeWebhook: 'stateInstanceChanged',
      instanceData: INSTANCE_DATA,
      timestamp: 1,
      stateInstance: 'suspended',
    };

    await act(async () => {
      fake.push({ receiptId: 13, body: state });
    });

    await waitFor(() => expect(handlers.onState).toHaveBeenCalledWith(state));

    fake.stop();
  });

  it('игнорирует неизвестные типы уведомлений, но подтверждает их', async () => {
    const fake = createFakeClient([]);
    renderHook(() => useNotifications(fake.client, true, handlers));

    await act(async () => {
      fake.push({ receiptId: 14, body: { typeWebhook: 'quotaExceeded' } });
    });

    await waitFor(() => expect(fake.acknowledged).toEqual([14]));
    expect(handlers.onMessage).not.toHaveBeenCalled();
    expect(handlers.onStatus).not.toHaveBeenCalled();
    expect(handlers.onState).not.toHaveBeenCalled();

    fake.stop();
  });

  it('подтверждает уведомление, даже если обработчик бросил исключение', async () => {
    const fake = createFakeClient([]);
    handlers.onMessage.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const onErrorSpy = vi.fn();
    renderHook(() =>
      useNotifications(fake.client, true, { ...handlers, onError: onErrorSpy }),
    );

    await act(async () => {
      fake.push({ receiptId: 15, body: textMessage('2') });
    });

    await waitFor(() => expect(onErrorSpy).toHaveBeenCalled());
    await waitFor(() => expect(fake.acknowledged).toEqual([15]));

    fake.stop();
  });

  it('переживает транзиентную ошибку и продолжает опрос', async () => {
    const fake = createFakeClient([]);
    let attempts = 0;
    const flaky = {
      ...(fake.client as unknown as Record<string, unknown>),
      async receiveNotification() {
        attempts += 1;
        if (attempts === 1) {
          throw new GreenApiError(429, 'Too many requests');
        }
        return fake.client.receiveNotification(5);
      },
    } as unknown as GreenApiClient;

    const onErrorSpy = vi.fn();
    renderHook(() => useNotifications(flaky, true, { ...handlers, onError: onErrorSpy }));

    await waitFor(() => expect(onErrorSpy).toHaveBeenCalled(), { timeout: 3000 });
    await waitFor(() => expect(attempts).toBeGreaterThan(1), { timeout: 5000 });

    fake.stop();
  });

  it('останавливает цикл при размонтировании и не удаляет уведомление', async () => {
    const fake = createFakeClient([]);
    const { unmount } = renderHook(() => useNotifications(fake.client, true, handlers));

    await act(async () => {
      fake.push({ receiptId: 16, body: textMessage('3') });
    });
    await waitFor(() => expect(handlers.onMessage).toHaveBeenCalled());
    await waitFor(() => expect(fake.acknowledged).toEqual([16]));

    unmount();
    expect(fake.acknowledged).toEqual([16]);
  });
});