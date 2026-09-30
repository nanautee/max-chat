import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatSidebar } from './ChatSidebar';
import type { Chat } from '@/lib/types';

const NOW = 1_700_000_000_000;

function chat(partial: Partial<Chat> & { chatId: string }): Chat {
  return {
    title: partial.chatId,
    lastActivity: partial.lastActivity ?? NOW,
    unread: partial.unread ?? 0,
    messages: partial.messages ?? [],
    ...partial,
  };
}

function renderSidebar(overrides: Partial<React.ComponentProps<typeof ChatSidebar>> = {}) {
  const props = {
    chats: [] as Chat[],
    activeChatId: null,
    selfName: 'Аккаунт 79998887766',
    selfPhone: '79998887766',
    selfAvatar: '',
    instanceState: 'authorized' as const,
    connectionError: null,
    streaming: true,
    onSelectChat: vi.fn(),
    onNewChat: vi.fn(),
    onLogout: vi.fn(),
    ...overrides,
  };

  return { props, ...render(<ChatSidebar {...props} />) };
}

describe('ChatSidebar', () => {
  it('показывает пустое состояние без чатов', () => {
    renderSidebar();

    expect(screen.getByText(/Пока нет ни одного чата/)).toBeInTheDocument();
  });

  it('выводит название чата и превью последнего сообщения', () => {
    renderSidebar({
      chats: [
        chat({
          chatId: 'a',
          title: 'Анна Петрова',
          messages: [
            {
              localId: '1',
              idMessage: '1',
              chatId: 'a',
              text: 'Привет!',
              timestamp: NOW,
              outgoing: false,
              status: 'read',
            },
          ],
        }),
      ],
    });

    expect(screen.getByText('Анна Петрова')).toBeInTheDocument();
    expect(screen.getByText('Привет!')).toBeInTheDocument();
  });

  it('помечает собственные сообщения префиксом «Вы»', () => {
    renderSidebar({
      chats: [
        chat({
          chatId: 'a',
          title: 'Анна',
          messages: [
            {
              localId: '1',
              idMessage: '1',
              chatId: 'a',
              text: 'Договорились',
              timestamp: NOW,
              outgoing: true,
              status: 'sent',
            },
          ],
        }),
      ],
    });

    expect(screen.getByText('Вы: Договорились')).toBeInTheDocument();
  });

  it('показывает счётчик непрочитанных', () => {
    renderSidebar({ chats: [chat({ chatId: 'a', title: 'Анна', unread: 4 })] });

    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('вызывает onSelectChat по клику на чат', async () => {
    const user = userEvent.setup();
    const { props } = renderSidebar({
      chats: [chat({ chatId: 'a', title: 'Анна' }), chat({ chatId: 'b', title: 'Борис' })],
    });

    await user.click(screen.getByRole('button', { name: /Борис/ }));

    expect(props.onSelectChat).toHaveBeenCalledWith('b');
  });

  it('фильтрует чаты по поисковому запросу', async () => {
    const user = userEvent.setup();
    renderSidebar({
      chats: [chat({ chatId: 'a', title: 'Анна Петрова' }), chat({ chatId: 'b', title: 'Борис' })],
    });

    await user.type(screen.getByLabelText('Поиск чатов'), 'анна');

    expect(screen.getByText('Анна Петрова')).toBeInTheDocument();
    expect(screen.queryByText('Борис')).not.toBeInTheDocument();
  });

  it('сообщает, когда по запросу ничего не найдено', async () => {
    const user = userEvent.setup();
    renderSidebar({ chats: [chat({ chatId: 'a', title: 'Анна' })] });

    await user.type(screen.getByLabelText('Поиск чатов'), 'zzz');

    expect(screen.getByText(/Ничего не найдено/)).toBeInTheDocument();
  });

  it('блокирует создание чата, когда инстанс не авторизован', async () => {
    const user = userEvent.setup();
    const { props } = renderSidebar({ instanceState: 'notAuthorized' });

    await user.click(screen.getByRole('button', { name: /Новый чат/ }));

    expect(props.onNewChat).not.toHaveBeenCalled();
  });

  it('создаёт чат, когда инстанс авторизован', async () => {
    const user = userEvent.setup();
    const { props } = renderSidebar();

    await user.click(screen.getByRole('button', { name: /Новый чат/ }));

    expect(props.onNewChat).toHaveBeenCalledTimes(1);
  });

  it('предупреждает о неавторизованном инстансе', () => {
    renderSidebar({ instanceState: 'starting' });

    expect(screen.getByText(/запускается/)).toBeInTheDocument();
  });

  it('показывает ошибку соединения вместо обычного статуса', () => {
    renderSidebar({ connectionError: 'Указан webhookUrl — HTTP-приём недоступен' });

    expect(screen.getByText(/webhookUrl/)).toBeInTheDocument();
  });

  it('вызывает onLogout по кнопке выхода', async () => {
    const user = userEvent.setup();
    const { props } = renderSidebar();

    await user.click(screen.getByRole('button', { name: 'Отключиться' }));

    expect(props.onLogout).toHaveBeenCalledTimes(1);
  });
});