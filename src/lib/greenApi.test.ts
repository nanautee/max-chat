import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE, GreenApiClient, GreenApiError, describeState } from './greenApi';

const CREDENTIALS = { idInstance: '1101000001', apiTokenInstance: 'token123' };

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

function textResponse(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

function client(): GreenApiClient {
  return new GreenApiClient(CREDENTIALS);
}

function lastCall(): [string, RequestInit] {
  return fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit];
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GreenApiClient: адреса и методы', () => {
  it('getStateInstance строит GET без тела', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ stateInstance: 'authorized' }));

    const result = await client().getStateInstance();

    const [url, init] = lastCall();
    expect(url).toBe(`${API_BASE}/waInstance1101000001/getStateInstance/token123`);
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(result.stateInstance).toBe('authorized');
  });

  it('checkAccount отправляет phoneNumber числом', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ exist: true, chatId: '10000000', fromCache: false }));

    const result = await client().checkAccount('79991234567');

    const [url, init] = lastCall();
    expect(url).toBe(`${API_BASE}/waInstance1101000001/checkAccount/token123`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      phoneNumber: 79991234567,
      force: false,
    });
    expect(result.chatId).toBe('10000000');
  });

  it('sendMessage отправляет chatId и message', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ idMessage: '1763115112345' }));

    const result = await client().sendMessage('10000000', 'Привет!');

    const [url, init] = lastCall();
    expect(url).toBe(`${API_BASE}/waInstance1101000001/sendMessage/token123`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      chatId: '10000000',
      message: 'Привет!',
    });
    expect(result.idMessage).toBe('1763115112345');
  });

  it('receiveNotification передаёт receiveTimeout в query', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ receiptId: 7, body: null }));

    await client().receiveNotification(5);

    const [url] = lastCall();
    expect(url).toBe(
      `${API_BASE}/waInstance1101000001/receiveNotification/token123?receiveTimeout=5`,
    );
  });

  it('deleteNotification использует DELETE и receiptId в пути', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ result: true, reason: '' }));

    await client().deleteNotification(42);

    const [url, init] = lastCall();
    expect(url).toBe(`${API_BASE}/waInstance1101000001/deleteNotification/token123/42`);
    expect(init.method).toBe('DELETE');
  });

  it('getAvatar отправляет chatId в теле', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ urlAvatar: 'https://cdn/a.jpg' }));

    await client().getAvatar('10000000');

    const [url, init] = lastCall();
    expect(url).toBe(`${API_BASE}/waInstance1101000001/getAvatar/token123`);
    expect(JSON.parse(init.body as string)).toEqual({ chatId: '10000000' });
  });

  it('setSettings передаёт настройки как есть', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ saveSettings: true }));

    await client().setSettings({ webhookUrl: '', incomingWebhook: 'yes' });

    const [, init] = lastCall();
    expect(JSON.parse(init.body as string)).toEqual({
      webhookUrl: '',
      incomingWebhook: 'yes',
    });
  });

  it('пустое тело ответа деградирует в null, а не падает', async () => {
    fetchMock.mockResolvedValue(textResponse(''));

    await expect(client().receiveNotification()).resolves.toBeNull();
  });
});

describe('GreenApiClient: обработка ошибок', () => {
  it('достаёт текст из поля message', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'bad request data' }, 400));

    await expect(client().sendMessage('1', 'x')).rejects.toThrow('bad request data');
  });

  it('достаёт текст из поля reason (формат CheckAccount)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: false, reason: 'not authorized' }, 400));

    await expect(client().checkAccount('79991234567')).rejects.toThrow('not authorized');
  });

  it('сохраняет HTTP-статус в GreenApiError', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'nope' }, 429));

    await expect(client().getStateInstance()).rejects.toMatchObject({
      status: 429,
      message: 'nope',
    });
  });

  it('401 с пустым телом даёт читаемое сообщение по умолчанию', async () => {
    fetchMock.mockResolvedValue(textResponse('', 401));

    await expect(client().getStateInstance()).rejects.toThrow('Запрос завершился с кодом 401');
  });

  it('валидация из details сохраняется в message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          message:
            "Validation failed. Details: 'message' length must be less than or equal to 4000 characters long",
        },
        400,
      ),
    );

    await expect(client().sendMessage('1', 'x')).rejects.toThrow(/4000 characters/);
  });

  it('сетевая ошибка превращается в GreenApiError со статусом 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await client()
      .getStateInstance()
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(GreenApiError);
    expect((error as GreenApiError).status).toBe(0);
    expect((error as GreenApiError).message).toMatch(/api\.green-api\.com/);
  });

  it('нестандартный текст ошибки не ломает разбор', async () => {
    fetchMock.mockResolvedValue(textResponse('<html>502</html>', 502));

    await expect(client().getStateInstance()).rejects.toThrow('<html>502</html>');
  });
});

describe('describeState', () => {
  it('переводит известные состояния', () => {
    expect(describeState('authorized')).toBe('Авторизован');
    expect(describeState('starting')).toBe('Запускается');
    expect(describeState('notAuthorized')).toMatch(/QR-код/);
    expect(describeState('suspended')).toBe('Аккаунт приостановлен');
  });

  it('возвращает неизвестное состояние как есть', () => {
    expect(describeState('someNewState')).toBe('someNewState');
  });
});