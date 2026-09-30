'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import { AttachIcon, SendIcon, SmileIcon } from './icons';
import styles from './Composer.module.css';

export const MAX_MESSAGE_LENGTH = 4000;

interface ComposerProps {
  value: string;
  disabled: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function Composer({
  value,
  disabled,
  placeholder = 'Напишите сообщение…',
  onChange,
  onSubmit,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 140)}px`;
  }, [value]);

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  const overLimit = value.length > MAX_MESSAGE_LENGTH;
  const canSubmit = value.trim().length > 0 && !overLimit && !disabled;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  return (
    <div className={styles.composer}>
      <div className={`${styles.field} ${disabled ? styles.fieldDisabled : ''}`}>
        <button
          type="button"
          className={styles.toolButton}
          disabled
          title="Отправка файлов не входит в тестовое задание"
          aria-label="Прикрепить файл"
        >
          <AttachIcon size={20} />
        </button>

        <textarea
          ref={textareaRef}
          className={styles.textarea}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Текст сообщения"
        />

        <button
          type="button"
          className={styles.toolButton}
          disabled
          title="Отправка файлов не входит в тестовое задание"
          aria-label="Добавить эмодзи"
        >
          <SmileIcon size={20} />
        </button>

        <button
          type="button"
          className={styles.sendButton}
          disabled={!canSubmit}
          onClick={onSubmit}
          aria-label="Отправить"
          title="Отправить (Enter)"
        >
          <SendIcon size={19} />
        </button>
      </div>

      {overLimit ? (
        <p className={`${styles.counter} ${styles.counterOver}`}>
          Превышен лимит GREEN-API: {value.length} из {MAX_MESSAGE_LENGTH} символов
        </p>
      ) : (
        <p className={styles.hintRow}>
          <span>Enter — отправить, Shift + Enter — перенос строки</span>
          {value.length > MAX_MESSAGE_LENGTH - 300 ? <span>{value.length}</span> : null}
        </p>
      )}
    </div>
  );
}