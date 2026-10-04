import { useSyncExternalStore } from 'react';
import { load, save } from './lib/storage';

// Auth tiruan (keputusan: mock dulu, tanpa Firebase). Satu peran: operator.
export interface User {
  email: string;
  name: string;
  role: 'operator';
}

const KEY = 'asapify.user';
const listeners = new Set<() => void>();
let current: User | null = read();

function read(): User | null {
  const raw = load(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as User; } catch { return null; }
}

function set(u: User | null) {
  current = u;
  save(KEY, u ? JSON.stringify(u) : null);
  listeners.forEach((l) => l());
}

export function signIn(): User {
  const u: User = { email: 'operator@contoh.id', name: 'Operator Demo', role: 'operator' };
  set(u);
  return u;
}

export function signOut(): void { set(null); }

export function useUser(): User | null {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => current,
  );
}
