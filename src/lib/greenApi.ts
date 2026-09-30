import type {
  AccountSettings,
  AvatarResponse,
  CheckAccountResponse,
  Credentials,
  DeleteNotificationResponse,
  ReceiveNotificationResponse,
  SendMessageResponse,
  SetSettingsResponse,
} from './types';

export const API_BASE = 'https://api.green-api.com';

export class GreenApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = 'GreenApiError';
    this.status = status;
    this.payload = payload;
  }
}

type ErrorBody = {
  message?: string;
  reason?: string;
  error?: string;
  errorMessage?: string;
};

function extractMessage(body: unknown, fallback: string): string {
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    for (const key of ['message', 'reason', 'error', 'errorMessage'] as const) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    if (Array.isArray(record.errors) && record.errors.length > 0) {
      return record.errors.map(String).join('; ');
    }
  }
  return fallback;
}

export class GreenApiClient {
  private readonly idInstance: string;
  private readonly apiTokenInstance: string;

  constructor(credentials: Credentials) {
    this.idInstance = credentials.idInstance.trim();
    this.apiTokenInstance = credentials.apiTokenInstance.trim();
  }

  get instanceId(): string {
    return this.idInstance;
  }

  private url(method: string, pathSuffix = ''): string {
    return `${API_BASE}/waInstance${this.idInstance}/${method}/${this.apiTokenInstance}${pathSuffix}`;
  }

  private async request<T>(
    method: string,
    init: {
      httpMethod?: 'GET' | 'POST' | 'DELETE';
      body?: unknown;
      query?: Record<string, string>;
      pathSuffix?: string;
    } = {},
  ): Promise<T> {
    const { httpMethod = 'GET', body, query } = init;

    let url = this.url(method, init.pathSuffix);
    if (query) {
      const search = new URLSearchParams(query).toString();
      if (search) url += `?${search}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: httpMethod,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
      });
    } catch (cause) {
      throw new GreenApiError(
        0,
        'Не удалось соединиться с GREEN-API. Проверьте интернет-соединение и доступ к api.green-api.com.',
        cause,
      );
    }

    const raw = await response.text();
    let parsed: unknown = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }

    if (!response.ok) {
      throw new GreenApiError(
        response.status,
        extractMessage(parsed as ErrorBody, `Запрос завершился с кодом ${response.status}`),
        parsed,
      );
    }

    return parsed as T;
  }

  getStateInstance() {
    return this.request<{ stateInstance: AccountSettings['stateInstance'] }>('getStateInstance');
  }

  getAccountSettings() {
    return this.request<AccountSettings>('getAccountSettings');
  }

  getAvatar(chatId: string) {
    return this.request<AvatarResponse>('getAvatar', {
      httpMethod: 'POST',
      body: { chatId },
    });
  }

  checkAccount(phoneNumber: string, force = false) {
    return this.request<CheckAccountResponse>('checkAccount', {
      httpMethod: 'POST',
      body: { phoneNumber: Number(phoneNumber), force },
    });
  }

  sendMessage(chatId: string, message: string) {
    return this.request<SendMessageResponse>('sendMessage', {
      httpMethod: 'POST',
      body: { chatId, message },
    });
  }

  receiveNotification(receiveTimeout = 5) {
    return this.request<ReceiveNotificationResponse>('receiveNotification', {
      query: { receiveTimeout: String(receiveTimeout) },
    });
  }

  deleteNotification(receiptId: number) {
    return this.request<DeleteNotificationResponse>('deleteNotification', {
      httpMethod: 'DELETE',
      pathSuffix: `/${encodeURIComponent(String(receiptId))}`,
    });
  }

  setSettings(settings: Record<string, string>) {
    return this.request<SetSettingsResponse>('setSettings', {
      httpMethod: 'POST',
      body: settings,
    });
  }
}

export function describeState(state: string): string {
  switch (state) {
    case 'authorized':
      return 'Авторизован';
    case 'starting':
      return 'Запускается';
    case 'notAuthorized':
      return 'Не авторизован — отсканируйте QR-код в кабинете GREEN-API';
    case 'blocked':
      return 'Аккаунт заблокирован';
    case 'suspended':
      return 'Аккаунт приостановлен';
    case 'pendingPassword':
      return 'Ожидает облачный пароль';
    default:
      return state;
  }
}