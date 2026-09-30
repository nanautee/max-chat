import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthScreen } from './AuthScreen';

const EMPTY = { idInstance: '', apiTokenInstance: '' };

describe('AuthScreen', () => {
  it('рендерит поля ввода учётных данных GREEN-API', () => {
    render(<AuthScreen initial={EMPTY} busy={false} error={null} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('idInstance')).toBeInTheDocument();
    expect(screen.getByLabelText('apiTokenInstance')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Подключиться' })).toBeInTheDocument();
  });

  it('кнопка заблокирована, пока поля пусты', () => {
    render(<AuthScreen initial={EMPTY} busy={false} error={null} onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Подключиться' })).toBeDisabled();
  });

  it('отправляет обрезанные значения и не отправляет пустые', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AuthScreen initial={EMPTY} busy={false} error={null} onSubmit={onSubmit} />);

    const idInput = screen.getByLabelText('idInstance');
    const tokenInput = screen.getByLabelText('apiTokenInstance');

    await user.type(idInput, '1101000001');
    await user.type(tokenInput, '  secret-token  ');

    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Подключиться' }));

    expect(onSubmit).toHaveBeenCalledWith({
      idInstance: '1101000001',
      apiTokenInstance: 'secret-token',
    });
  });

  it('в idInstance остаются только цифры', async () => {
    const user = userEvent.setup();
    render(<AuthScreen initial={EMPTY} busy={false} error={null} onSubmit={vi.fn()} />);

    const idInput = screen.getByLabelText('idInstance');
    await user.type(idInput, '110a10b0001');

    expect(idInput).toHaveValue('110100001');
  });

  it('переключает видимость токена', async () => {
    const user = userEvent.setup();
    render(<AuthScreen initial={EMPTY} busy={false} error={null} onSubmit={vi.fn()} />);

    const tokenInput = screen.getByLabelText('apiTokenInstance');
    expect(tokenInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Показать токен' }));
    expect(tokenInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Скрыть токен' }));
    expect(tokenInput).toHaveAttribute('type', 'password');
  });

  it('показывает ошибку подключения', () => {
    render(
      <AuthScreen
        initial={EMPTY}
        busy={false}
        error="Неверный idInstance или apiTokenInstance."
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Неверный idInstance');
  });

  it('показывает состояние загрузки и блокирует форму', () => {
    render(<AuthScreen initial={EMPTY} busy error={null} onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Подключение/ })).toBeDisabled();
  });

  it('предзаполняет последние использованные учётные данные', () => {
    render(
      <AuthScreen
        initial={{ idInstance: '1101000001', apiTokenInstance: 'token' }}
        busy={false}
        error={null}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('idInstance')).toHaveValue('1101000001');
  });
});