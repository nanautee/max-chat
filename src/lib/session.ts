import { clearCredentials, loadCredentials, saveCredentials } from './storage';
import type { Credentials } from './types';

type Listener = () => void;

const listeners = new Set<Listener>();

/** `undefined` — ещё не читали, чтобы обращаться к localStorage только на клиенте. */
let snapshot: Credentials | null | undefined;

function read(): Credentials | null {
  if (snapshot === undefined) {
    snapshot = typeof window === 'undefined' ? null : loadCredentials();
  }
  return snapshot;
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeCredentials(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCredentialsSnapshot(): Credentials | null {
  return read();
}

export function getCredentialsServerSnapshot(): Credentials | null {
  return null;
}

export function signIn(credentials: Credentials): void {
  saveCredentials(credentials);
  snapshot = credentials;
  emit();
}

export function signOut(): void {
  clearCredentials();
  snapshot = null;
  emit();
}