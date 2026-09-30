import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Conversation } from './Conversation';
import type { Chat, ChatMessage } from '@/lib/types';

const NOW = new Date('2026-03-15T14:30:00').getTime();

function message(partial: Partial<ChatMessage>): ChatMessage {
  return {
    localId: partial.localId ?? '1',
    idMessage: partial.idMessage ?? '1',
    chatId: '10000000',
    text: partial.text ?? 'Текст',
    timestamp: partial.timestamp ?? NOW,
    outgoing: partial.outgoing ?? false,
    status: partial.status ?? 'read',
    ...(partial.error ? { error: partial.error } : {}),
  };
}

function chat(messages: ChatMessage[]): Chat {
  return {
    chatId: '10000000',
    title: 'Анна Петрова',
    phone: '79991234567',
    lastActivity: NOW,
    unread: 0,
    messages,
  };
}

function renderConversation(overrides: Partial<React.ComponentProps<typeof Conversation>> = {}) {
  const props = {
    chat: chat([message({ text: 'Встречаемся в 15:00' })]),
    draft: '',
    disabled: false,
    onDraftChange: vi.fn(),
    onSend: vi.fn(),
    onClearHistory: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<Conversation {...props} />) };
}

describe('Conversation: состояния', () => {
  it('показывает пустое состояние без выбранного чата', () => {
    renderConversation({ chat: null });

    expect(screen.getByText('Выберите чат')).toBeInTheDocument();
    expect(screen.queryByLabelText('Текст сообщения')).not.toBeInTheDocument();
  });

  it('показывает имя и отформатированный номер чата', () => {
    renderConversation();

    expect(screen.getByText('Анна Петрова')).toBeInTheDocument();
    expect(screen.getByText('+7 999 123-45-67')).toBeInTheDocument();
  });

  it('подставляет chatId, если номера нет', () => {
    renderConversation({ chat: { ...chat([]), phone: undefined } });

    expect(screen.getByText(/chatId 10000000/)).toBeInTheDocument();
  });

  it('группирует сообщения по календарным дням', () => {
    const realNow = Date.now();
    const startOfToday = new Date().setHours(12, 0, 0, 0);

    renderConversation({
      chat: chat([
        message({ localId: 'a', text: 'Вчерашнее', timestamp: realNow - 86_400_000 }),
        message({ localId: 'b', text: 'Сегодняшнее', timestamp: startOfToday }),
      ]),
    });

    expect(screen.getByText('Вчера')).toBeInTheDocument();
    expect(screen.getByText('Сегодня')).toBeInTheDocument();
  });

  it('рисует разделитель дня один раз для нескольких сообщений', () => {
    const startOfToday = new Date().setHours(12, 0, 0, 0);

    renderConversation({
      chat: chat([
        message({ localId: 'a', text: 'Первое', timestamp: startOfToday }),
        message({ localId: 'b', text: 'Второе', timestamp: startOfToday + 60_000 }),
      ]),
    });

    expect(screen.getAllByText('Сегодня')).toHaveLength(1);
  });

  it('подписывает разделитель датой для старых сообщений', () => {
    const oldTimestamp = new Date(2020, 0, 15, 12, 0).getTime();

    renderConversation({ chat: chat([message({ localId: 'a', text: 'Давно', timestamp: oldTimestamp })]) });

    expect(screen.getByText('15 января')).toBeInTheDocument();
  });
});

describe('Conversation: взаимодействие', () => {
  it('передаёт изменение черновика', async () => {
    const user = userEvent.setup();
    const { props } = renderConversation();

    await user.type(screen.getByLabelText('Текст сообщения'), 'Понял');

    expect(props.onDraftChange).toHaveBeenCalled();
  });

  it('вызывает onSend по Enter', async () => {
    const user = userEvent.setup();
    const { props } = renderConversation({ draft: 'Понял' });

    await user.type(screen.getByLabelText('Текст сообщения'), '{Enter}');

    expect(props.onSend).toHaveBeenCalledTimes(1);
  });

  it('блокирует ввод, когда инстанс не авторизован', () => {
    renderConversation({ disabled: true });

    expect(screen.getByLabelText('Текст сообщения')).toBeDisabled();
    expect(screen.getByPlaceholderText(/не авторизован/)).toBeInTheDocument();
  });

  it('вызывает onBack и onClearHistory', async () => {
    const user = userEvent.setup();
    const { props } = renderConversation();

    await user.click(screen.getByRole('button', { name: 'Удалить историю' }));
    expect(props.onClearHistory).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Назад к списку чатов' }));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });
});