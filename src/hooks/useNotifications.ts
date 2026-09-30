'use client';

import { useEffect, useRef, useState } from 'react';
import { GreenApiClient, GreenApiError } from '@/lib/greenApi';
import type {
  MessageNotification,
  StateNotification,
  StatusNotification,
} from '@/lib/types';

export type PollingStatus = 'idle' | 'polling' | 'error';

interface Handlers {
  onMessage: (notification: MessageNotification) => void;
  onStatus: (notification: StatusNotification) => void;
  onState: (notification: StateNotification) => void;
  onError: (error: GreenApiError) => void;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const NON_FATAL_PATTERN =
  /instance in starting process|instance is starting|not authorized|getStateInstance|authtype|WebSocket/i;

function isTransient(error: GreenApiError): boolean {
  return error.status === 0 || error.status === 429 || error.status === 502 || NON_FATAL_PATTERN.test(error.message);
}

export function useNotifications(
  client: GreenApiClient | null,
  enabled: boolean,
  handlers: Handlers,
): PollingStatus {
  const [status, setStatus] = useState<PollingStatus>('idle');

  const handlersRef = useRef(handlers);
  const clientRef = useRef(client);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  useEffect(() => {
    if (!enabled || !client) return;

    let stopped = false;
    let consecutiveFailures = 0;

    const acknowledge = async (receiptId: number) => {
      try {
        await client.deleteNotification(receiptId);
      } catch {
        // Повторная доставка безопасна: сообщения дедуплицируются по idMessage.
      }
    };

    const dispatch = (body: unknown) => {
      if (!body || typeof body !== 'object') return;
      const typeWebhook = (body as { typeWebhook?: string }).typeWebhook;

      try {
        switch (typeWebhook) {
          case 'incomingMessageReceived':
          case 'outgoingMessageReceived':
          case 'outgoingAPIMessageReceived':
            handlersRef.current.onMessage(body as MessageNotification);
            break;
          case 'outgoingMessageStatus':
            handlersRef.current.onStatus(body as StatusNotification);
            break;
          case 'stateInstanceChanged':
            handlersRef.current.onState(body as StateNotification);
            break;
          default:
            break;
        }
      } catch (error) {
        // Ошибка обработчика не должна ронять цикл: уведомление всё равно
        // подтверждается ниже.
        handlersRef.current.onError(
          error instanceof GreenApiError
            ? error
            : new GreenApiError(0, 'Ошибка обработки уведомления GREEN-API.', error),
        );
      }
    };

    const loop = async () => {
      while (!stopped) {
        try {
          const response = await client.receiveNotification(5);
          if (stopped) return;

          consecutiveFailures = 0;
          if (response && typeof response.receiptId === 'number') {
            try {
              dispatch(response.body);
            } finally {
              await acknowledge(response.receiptId);
            }
          } else {
            // Неавторизованный инстанс может ответить на long polling мгновенно —
            // пауза не даёт циклу превратиться в горячий spin.
            await sleep(1000);
          }
        } catch (error) {
          if (stopped) return;
          consecutiveFailures += 1;

          if (error instanceof GreenApiError) {
            handlersRef.current.onError(error);
            if (isTransient(error) && consecutiveFailures < 40) {
              setStatus('polling');
              await sleep(consecutiveFailures < 5 ? 1200 : 4000);
              continue;
            }
          }

          setStatus('error');
          await sleep(4000);
        }
      }
    };

    void loop();

    return () => {
      stopped = true;
    };
  }, [client, enabled]);

  if (!enabled || !client) return 'idle';
  return status === 'idle' ? 'polling' : status;
}