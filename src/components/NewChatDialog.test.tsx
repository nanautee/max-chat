import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NewChatDialog } from './NewChatDialog';

describe('NewChatDialog', () => {
  function renderDialog(overrides: Partial<React.ComponentProps<typeof NewChatDialog>> = {}) {
    const props = {
      busy: false,
      error: null,
      onCreate: vi.fn().mockResolvedValue(true),
      onClose: vi.fn(),
      ...overrides,
    };
    return { props, ...render(<NewChatDialog {...props} />) };
  }

  it('не передаёт некорректный номер в CheckAccount', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();

    await user.type(screen.getByLabelText(/Номер телефона/), '12345');
    await user.click(screen.getByRole('button', { name: 'Создать чат' }));

    expect(props.onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('международном формате');
  });

  it('нормализует номер в формат, ожидаемый GREEN-API', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();

    await user.type(screen.getByLabelText(/Номер телефона/), '8 (999) 123-45-67');
    await user.click(screen.getByRole('button', { name: 'Создать чат' }));

    expect(props.onCreate).toHaveBeenCalledWith('79991234567');
  });

  it('поддерживает номера РБ', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();

    await user.type(screen.getByLabelText(/Номер телефона/), '+375 29 123-45-67');
    await user.click(screen.getByRole('button', { name: 'Создать чат' }));

    expect(props.onCreate).toHaveBeenCalledWith('375291234567');
  });

  it('показывает ошибку от GREEN-API', () => {
    renderDialog({ error: 'Аккаунт с таким номером не найден в MAX.' });

    expect(screen.getByRole('alert')).toHaveTextContent('не найден в MAX');
  });

  it('закрывается по Escape и по кнопке закрытия', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it('блокирует повторную отправку во время проверки номера', () => {
    renderDialog({ busy: true });

    expect(screen.getByRole('button', { name: /Проверяем/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeDisabled();
  });

  it('не закрывается по Escape во время проверки', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog({ busy: true });

    await user.keyboard('{Escape}');

    expect(props.onClose).not.toHaveBeenCalled();
  });
});