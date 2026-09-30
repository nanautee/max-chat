import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '@/lib/types';

function message(partial: Partial<ChatMessage>): ChatMessage {
  return {
    localId: '1',
    idMessage: '1',
    chatId: '10000000',
    text: 'Текст сообщения',
    timestamp: new Date('2026-03-15T14:30:00').getTime(),
    outgoing: false,
    status: 'read',
    ...partial,
  };
}

describe('MessageBubble', () => {
  it('показывает время сообщения', () => {
    render(<MessageBubble message={message({})} />);

    expect(screen.getByText('14:30')).toBeInTheDocument();
  });

  it('показывает текст с переносами строк как есть', () => {
    render(<MessageBubble message={message({ text: 'строка 1\nстрока 2' })} />);

    expect(screen.getByText(/строка 1/)).toBeInTheDocument();
  });

  it('разделитель дня рендерится только когда передан', () => {
    const { rerender } = render(<MessageBubble message={message({})} showDayDivider="Сегодня" />);
    expect(screen.getByText('Сегодня')).toBeInTheDocument();

    rerender(<MessageBubble message={message({})} />);
    expect(screen.queryByText('Сегодня')).not.toBeInTheDocument();
  });

  it('у входящего сообщения нет индикатора статуса доставки', () => {
    const { container } = render(<MessageBubble message={message({ outgoing: false })} />);

    expect(container.querySelector('svg')).toBeNull();
  });

  it('у исходящего сообщения есть индикатор статуса', () => {
    const { container } = render(
      <MessageBubble message={message({ outgoing: true, status: 'sent' })} />,
    );

    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('показывает причину ошибки доставки', () => {
    render(
      <MessageBubble
        message={message({
          outgoing: true,
          status: 'failed',
          error: 'У получателя нет аккаунта MAX',
        })}
      />,
    );

    expect(screen.getByText('У получателя нет аккаунта MAX')).toBeInTheDocument();
  });

  it('не показывает причину, если ошибки нет', () => {
    const { container } = render(
      <MessageBubble message={message({ outgoing: true, status: 'failed' })} />,
    );

    expect(container.textContent).not.toContain('У получателя');
  });
});