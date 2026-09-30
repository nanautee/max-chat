'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertIcon, CloseIcon, SpinnerIcon } from './icons';
import { normalizePhone } from '@/lib/format';
import styles from './NewChatDialog.module.css';

interface NewChatDialogProps {
  busy: boolean;
  error: string | null;
  onCreate: (phone: string) => Promise<boolean> | boolean;
  onClose: () => void;
}

export function NewChatDialog({ busy, error, onCreate, onClose }: NewChatDialogProps) {
  const [phone, setPhone] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onClose]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setValidationError(
        'Введите номер в международном формате: 11 цифр для РФ (7…) или 12 цифр для РБ (375…).',
      );
      return;
    }
    setValidationError(null);
    const created = await onCreate(normalized);
    if (created) setPhone('');
  };

  const shownError = validationError ?? error;

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Новый чат">
        <div className={styles.dialogHeader}>
          <div>
            <h2 className={styles.dialogTitle}>Новый чат</h2>
            <p className={styles.dialogSubtitle}>
              Номер проверяется методом GREEN-API <code>CheckAccount</code> и преобразуется в
              идентификатор чата MAX.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={busy}
            aria-label="Закрыть"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="phone">
              Номер телефона получателя
            </label>
            <div className={styles.inputWrap}>
              <input
                ref={inputRef}
                id="phone"
                className={`${styles.input} ${styles.inputWithPrefix}`}
                inputMode="tel"
                autoComplete="off"
                placeholder="7 999 123-45-67"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setValidationError(null);
                }}
              />
            </div>
          </div>

          {shownError ? (
            <div className={styles.error} role="alert">
              <AlertIcon />
              <span>{shownError}</span>
            </div>
          ) : null}

          <div className={styles.footer}>
            <button type="button" className={styles.cancel} onClick={onClose} disabled={busy}>
              Отмена
            </button>
            <button type="submit" className={styles.submit} disabled={busy || !phone.trim()}>
              {busy ? <SpinnerIcon /> : null}
              {busy ? 'Проверяем…' : 'Создать чат'}
            </button>
          </div>

          <p className={styles.note}>
            Номер можно вводить в любом удобном виде — «8 999 123 45 67», «+7 999 123-45-67» или
            «9991234567». Получатель должен быть зарегистрирован в MAX.
          </p>
        </form>
      </div>
    </div>
  );
}