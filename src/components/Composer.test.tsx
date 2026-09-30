import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Composer, MAX_MESSAGE_LENGTH } from './Composer';

describe('Composer', () => {
  it('отправляет по Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer value="Привет" disabled={false} onChange={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Текст сообщения'), '{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('не отправляет по Shift+Enter (перенос строки)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer value="Привет" disabled={false} onChange={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Текст сообщения'), '{Shift>}{Enter}{/Shift}');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('кнопка отправки активна только при непустом тексте', () => {
    const { rerender } = render(
      <Composer value="   " disabled={false} onChange={vi.fn()} onSubmit={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled();

    rerender(<Composer value="Привет" disabled={false} onChange={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Отправить' })).toBeEnabled();
  });

  it('блокирует отправку при превышении лимита GREEN-API в 4000 символов', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const tooLong = 'a'.repeat(MAX_MESSAGE_LENGTH + 1);
    render(
      <Composer value={tooLong} disabled={false} onChange={vi.fn()} onSubmit={onSubmit} />,
    );

    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled();
    expect(screen.getByText(/Превышен лимит GREEN-API/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Текст сообщения'), '{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('принимает текст ровно в 4000 символов', () => {
    render(
      <Composer
        value={'a'.repeat(MAX_MESSAGE_LENGTH)}
        disabled={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Отправить' })).toBeEnabled();
  });

  it('не отправляет ничего, когда поле заблокировано', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer value="Привет" disabled onChange={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Текст сообщения'), '{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Текст сообщения')).toBeDisabled();
  });

  it('вызывает onChange при вводе', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    function Controlled() {
      const [value, setValue] = useState('');
      return (
        <Composer
          value={value}
          disabled={false}
          onChange={(next) => {
            setValue(next);
            onChange(next);
          }}
          onSubmit={vi.fn()}
        />
      );
    }

    render(<Controlled />);

    await user.type(screen.getByLabelText('Текст сообщения'), 'Привет');

    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith('Привет');
    expect(screen.getByLabelText('Текст сообщения')).toHaveValue('Привет');
  });

  it('кнопки файлов и эмодзи отключены согласно объёму задания', () => {
    render(<Composer value="" disabled={false} onChange={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Прикрепить файл' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Добавить эмодзи' })).toBeDisabled();
  });
});