'use client';

import { useState, type FormEvent } from 'react';
import { MaxLogo } from './MaxLogo';
import { AlertIcon, EyeIcon, EyeOffIcon, SpinnerIcon } from './icons';
import type { Credentials } from '@/lib/types';
import styles from './AuthScreen.module.css';

interface AuthScreenProps {
  initial: Credentials;
  busy: boolean;
  error: string | null;
  onSubmit: (credentials: Credentials) => void;
}

export function AuthScreen({ initial, busy, error, onSubmit }: AuthScreenProps) {
  const [idInstance, setIdInstance] = useState(initial.idInstance);
  const [apiTokenInstance, setApiTokenInstance] = useState(initial.apiTokenInstance);
  const [tokenVisible, setTokenVisible] = useState(false);

  const canSubmit = idInstance.trim().length > 0 && apiTokenInstance.trim().length > 0 && !busy;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ idInstance: idInstance.trim(), apiTokenInstance: apiTokenInstance.trim() });
  };

  return (
    <main className={styles.wrapper}>
      <section className={styles.card}>
        <div className={styles.brand}>
          <MaxLogo size={64} />
          <div>
            <h1 className={styles.title}>Подключение к MAX</h1>
            <p className={styles.subtitle}>
              Введите учётные данные инстанса GREEN-API, чтобы начать переписку
            </p>
          </div>
          <span className={styles.badge}>
            <span className={styles.dot} />
            Тестовый прототип · текстовые сообщения
          </span>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="idInstance">
              idInstance
            </label>
            <input
              id="idInstance"
              className={`${styles.input} ${styles.inputMono}`}
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              placeholder="1101000001"
              value={idInstance}
              onChange={(event) => setIdInstance(event.target.value.replace(/\D/g, ''))}
            />
            <p className={styles.hint}>Идентификатор инстанса из личного кабинета GREEN-API.</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="apiTokenInstance">
              apiTokenInstance
            </label>
            <div className={styles.inputWrap}>
              <input
                id="apiTokenInstance"
                className={`${styles.input} ${styles.inputMono} ${styles.inputWithButton}`}
                type={tokenVisible ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                placeholder="d75b3a66…"
                value={apiTokenInstance}
                onChange={(event) => setApiTokenInstance(event.target.value.trim())}
              />
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setTokenVisible((visible) => !visible)}
                aria-label={tokenVisible ? 'Скрыть токен' : 'Показать токен'}
                title={tokenVisible ? 'Скрыть токен' : 'Показать токен'}
              >
                {tokenVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <p className={styles.hint}>Токен доступа к API инстанса.</p>
          </div>

          {error ? (
            <div className={styles.error} role="alert">
              <AlertIcon />
              <span>{error}</span>
            </div>
          ) : null}

          <button type="submit" className={styles.submit} disabled={!canSubmit}>
            {busy ? <SpinnerIcon /> : null}
            {busy ? 'Подключение…' : 'Подключиться'}
          </button>
        </form>

        <p className={styles.footer}>
          Данные хранятся только в вашем браузере (localStorage) и никуда не передаются, кроме
          api.green-api.com.
          <br />
          Нет инстанса?{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            Личный кабинет GREEN-API
          </a>
        </p>
      </section>
    </main>
  );
}