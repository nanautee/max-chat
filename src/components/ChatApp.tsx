'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AuthScreen } from './AuthScreen';
import { ChatSidebar } from './ChatSidebar';
import { Conversation } from './Conversation';
import { NewChatDialog } from './NewChatDialog';
import { ChatIcon } from './icons';
import { MAX_MESSAGE_LENGTH } from './Composer';
import { createLocalId, useChats } from '@/hooks/useChats';
import { useNotifications } from '@/hooks/useNotifications';
import { GreenApiClient, GreenApiError, describeState } from '@/lib/greenApi';
import { formatPhone } from '@/lib/format';
import {
  findPendingOutgoingEcho,
  parseMessageNotification,
  parseStatusNotification,
} from '@/lib/messages';
import { clearSession } from '@/lib/storage';
import {
  getCredentialsServerSnapshot,
  getCredentialsSnapshot,
  signIn,
  signOut,
  subscribeCredentials,
} from '@/lib/session';
import type {
  AccountSettings,
  Chat,
  Credentials,
  InstanceState,
  MessageNotification,
  StateNotification,
  StatusNotification,
} from '@/lib/types';
import styles from './ChatApp.module.css';

export function ChatApp() {
  const credentials = useSyncExternalStore(
    subscribeCredentials,
    getCredentialsSnapshot,
    getCredentialsServerSnapshot,
  );

  const [lastCredentials, setLastCredentials] = useState<Credentials>({
    idInstance: '',
    apiTokenInstance: '',
  });
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [instanceState, setInstanceState] = useState<InstanceState | null>(null);
  const [account, setAccount] = useState<AccountSettings | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const client = useMemo(
    () => (credentials ? new GreenApiClient(credentials) : null),
    [credentials],
  );

  const { chats, activeChatId, activeChat, actions } = useChats(credentials);

  const chatsRef = useRef<Chat[]>(chats);
  const activeChatIdRef = useRef<string | null>(activeChatId);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  /* ---------------------------------------------------- account / instance state */
  const refreshAccount = useCallback(async (activeClient: GreenApiClient) => {
    try {
      const settings = await activeClient.getAccountSettings();
      setAccount(settings);
      setInstanceState(settings.stateInstance);
    } catch (error) {
      if (error instanceof GreenApiError && error.status !== 429) {
        setConnectionError(error.message);
      }
    }
  }, []);

  const connect = useCallback(
    async (next: Credentials) => {
      setAuthBusy(true);
      setAuthError(null);

      const nextClient = new GreenApiClient(next);
      try {
        const { stateInstance } = await nextClient.getStateInstance();
        signIn(next);
        setLastCredentials(next);
        setInstanceState(stateInstance);
        void refreshAccount(nextClient);
      } catch (error) {
        if (error instanceof GreenApiError) {
          if (error.status === 401 || error.status === 403) {
            setAuthError(
              'Неверный idInstance или apiTokenInstance. Проверьте данные в личном кабинете GREEN-API.',
            );
          } else if (error.status === 404) {
            setAuthError('Инстанс не найден. Проверьте idInstance и тариф.');
          } else {
            setAuthError(error.message);
          }
        } else {
          setAuthError('Не удалось подключиться. Проверьте подключение к интернету.');
        }
        setAuthBusy(false);
        return;
      }

      setAuthBusy(false);
    },
    [refreshAccount],
  );

  const logout = useCallback(() => {
    if (credentials) clearSession(credentials.idInstance);
    signOut();
    setAccount(null);
    setInstanceState(null);
    setConnectionError(null);
    setAuthError(null);
    setDialogOpen(false);
    setDrafts({});
    setMobileChatOpen(false);
  }, [credentials]);

  /* ------------------------------------------- periodic instance state polling */
  useEffect(() => {
    if (!client) return;

    let stopped = false;
    const tick = async () => {
      try {
        const { stateInstance } = await client.getStateInstance();
        if (stopped) return;
        setInstanceState(stateInstance);
        if (stateInstance === 'authorized') void refreshAccount(client);
      } catch (error) {
        if (stopped) return;
        if (error instanceof GreenApiError && error.status === 401) {
          setConnectionError('GREEN-API отклонил токен доступа.');
        }
      }
    };

    void tick();
    const interval = window.setInterval(tick, 8000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [client, refreshAccount]);

  /* ------------------------------------------------------------------- helpers */
  const fetchAvatar = useCallback(
    (activeClient: GreenApiClient, chatId: string) => {
      void activeClient
        .getAvatar(chatId)
        .then((response) => {
          if (response.urlAvatar) {
            actions.upsertChat({ chatId, title: '', avatarUrl: response.urlAvatar });
          }
        })
        .catch(() => undefined);
    },
    [actions],
  );

  const upsertChatFromNotification = useCallback(
    (
      activeClient: GreenApiClient,
      chatId: string,
      title: string | null,
      phone: string | null,
    ) => {
      const existing = chatsRef.current.find((chat) => chat.chatId === chatId);
      if (existing) return;

      actions.upsertChat({
        chatId,
        title: title || (phone ? formatPhone(phone) : `Чат ${chatId}`),
        phone: phone ?? undefined,
        lastActivity: Date.now(),
        unread: 0,
        messages: [],
      });
      fetchAvatar(activeClient, chatId);
    },
    [actions, fetchAvatar],
  );

  const isMessageVisible = (messageChatId: string) => {
    if (typeof document !== 'undefined' && document.hidden) return false;
    return activeChatIdRef.current === messageChatId;
  };

  /* -------------------------------------------------------------- notifications */
  const handleMessage = useCallback(
    (notification: MessageNotification) => {
      if (!client) return;

      const parsed = parseMessageNotification(notification);
      if (!parsed) return;

      const { message, chatTitle, chatPhone } = parsed;
      upsertChatFromNotification(client, message.chatId, chatTitle, chatPhone);

      if (message.outgoing) {
        const pending = findPendingOutgoingEcho(chatsRef.current, message.chatId, message.text);
        if (pending) {
          actions.patchByLocalId(pending.localId, {
            idMessage: message.idMessage,
            status: 'sent',
          });
          return;
        }
      }

      actions.addMessage(message, !message.outgoing && !isMessageVisible(message.chatId));
    },
    [actions, client, upsertChatFromNotification],
  );

  const handleStatus = useCallback(
    (notification: StatusNotification) => {
      const patch = parseStatusNotification(notification);
      actions.patchByIdMessage(notification.chatId, notification.idMessage, patch);
    },
    [actions],
  );

  const handleState = useCallback(
    (notification: StateNotification) => {
      setInstanceState(notification.stateInstance);
      if (notification.stateInstance === 'authorized' && client) {
        void refreshAccount(client);
      }
    },
    [client, refreshAccount],
  );

  const handlePollError = useCallback((error: GreenApiError) => {
    if (/custom webhook url/i.test(error.message)) {
      setConnectionError(
        'В настройках инстанса указан webhookUrl — очистите его (SetSettings с пустым webhookUrl), чтобы работал приём через HTTP API.',
      );
    } else if (error.status === 401) {
      setConnectionError('GREEN-API отклонил токен доступа.');
    }
  }, []);

  const pollingStatus = useNotifications(client, instanceState === 'authorized', {
    onMessage: handleMessage,
    onStatus: handleStatus,
    onState: handleState,
    onError: handlePollError,
  });

  /* --------------------------------------------------------- read on refocus */
  useEffect(() => {
    const handleFocus = () => {
      if (activeChatIdRef.current) actions.markRead(activeChatIdRef.current);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [actions]);

  /* ------------------------------------------------------------------- sending */
  const sendMessage = useCallback(async () => {
    if (!client || !activeChat) return;
    const text = (drafts[activeChat.chatId] ?? '').trim();
    if (!text || text.length > MAX_MESSAGE_LENGTH) return;

    const localId = createLocalId();
    actions.addMessage(
      {
        localId,
        idMessage: null,
        chatId: activeChat.chatId,
        text,
        timestamp: Date.now(),
        outgoing: true,
        status: 'pending',
      },
      false,
    );
    setDrafts((current) => ({ ...current, [activeChat.chatId]: '' }));

    try {
      const response = await client.sendMessage(activeChat.chatId, text);
      actions.patchByLocalId(localId, { idMessage: response.idMessage, status: 'sent' });
    } catch (error) {
      const reason = error instanceof GreenApiError ? error.message : 'Сообщение не отправлено';
      actions.patchByLocalId(localId, { status: 'failed', error: reason });
    }
  }, [actions, activeChat, client, drafts]);

  /* ------------------------------------------------------------------ new chat */
  const createChat = useCallback(
    async (phone: string): Promise<boolean> => {
      if (!client) return false;
      setDialogBusy(true);
      setDialogError(null);

      try {
        const response = await client.checkAccount(phone);
        if (!response.exist) {
          setDialogError('Аккаунт с таким номером не найден в MAX.');
          return false;
        }

        const chatId = response.chatId;
        const existing = chatsRef.current.find((chat) => chat.chatId === chatId);

        actions.upsertChat({
          chatId,
          title: formatPhone(phone),
          phone,
          lastActivity: existing?.lastActivity ?? Date.now(),
          unread: 0,
          messages: existing?.messages ?? [],
          avatarUrl: existing?.avatarUrl,
        });

        fetchAvatar(client, chatId);
        actions.setActiveChat(chatId);
        setMobileChatOpen(true);
        setDialogOpen(false);
        return true;
      } catch (error) {
        if (error instanceof GreenApiError) {
          if (error.status === 466 || /limit reached/i.test(error.message)) {
            setDialogError(
              'Достигнут лимит запросов CheckAccount. Подождите пару секунд и повторите попытку.',
            );
          } else if (/11 or 12 digits/i.test(error.message)) {
            setDialogError('Номер должен содержать 11 или 12 цифр (7… или 375…).');
          } else {
            setDialogError(error.message);
          }
        } else {
          setDialogError('Не удалось проверить номер. Попробуйте ещё раз.');
        }
        return false;
      } finally {
        setDialogBusy(false);
      }
    },
    [actions, client, fetchAvatar],
  );

  /* --------------------------------------------------------------------- views */
  if (!credentials) {
    return (
      <AuthScreen
        initial={lastCredentials}
        busy={authBusy}
        error={authError}
        onSubmit={connect}
      />
    );
  }

  const canSend = instanceState === 'authorized';

  return (
    <div className={styles.app}>
      <div className={styles.frame}>
        <div
          className={`${styles.sidebarSlot} ${
            mobileChatOpen && activeChat ? styles.sidebarHidden : ''
          }`}
        >
          <ChatSidebar
            chats={chats}
            activeChatId={activeChatId}
            selfName={account?.phone ? `Аккаунт ${account.phone}` : 'Аккаунт MAX'}
            selfPhone={account?.phone ?? ''}
            selfAvatar={account?.avatar ?? ''}
            instanceState={instanceState}
            connectionError={connectionError}
            streaming={pollingStatus === 'polling'}
            onSelectChat={(chatId) => {
              actions.setActiveChat(chatId);
              setMobileChatOpen(true);
            }}
            onNewChat={() => {
              setDialogError(null);
              setDialogOpen(true);
            }}
            onLogout={logout}
          />
        </div>

        {canSend ? (
          <Conversation
            chat={activeChat}
            draft={activeChat ? (drafts[activeChat.chatId] ?? '') : ''}
            disabled={!canSend}
            onDraftChange={(value) => {
              if (!activeChat) return;
              setDrafts((current) => ({ ...current, [activeChat.chatId]: value }));
            }}
            onSend={() => void sendMessage()}
            onClearHistory={() => {
              if (activeChat) actions.clearHistory(activeChat.chatId);
            }}
            onBack={() => setMobileChatOpen(false)}
          />
        ) : (
          <div className={styles.gate}>
            <div className={styles.gateCard}>
              <span className={styles.gateGlyph}>
                <ChatIcon size={30} />
              </span>
              <h2 className={styles.gateTitle}>Инстанс не авторизован в MAX</h2>
              <p className={styles.gateText}>
                Текущий статус:{' '}
                <strong>{instanceState ? describeState(instanceState) : 'определяется…'}</strong>.
                Откройте личный кабинет GREEN-API, отсканируйте QR-код приложением MAX и вернитесь
                сюда — чат подключится автоматически.
              </p>
              <div className={styles.gateActions}>
                <a
                  className={styles.button}
                  href="https://console.green-api.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть кабинет
                </a>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonGhost}`}
                  onClick={logout}
                >
                  Сменить инстанс
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {dialogOpen ? (
        <NewChatDialog
          busy={dialogBusy}
          error={dialogError}
          onCreate={createChat}
          onClose={() => {
            if (!dialogBusy) {
              setDialogOpen(false);
              setDialogError(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}