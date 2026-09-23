'use client';

import { apiClient } from './api-client';
import type { Usuario } from './types';

export const TOKEN_KEY = 'faltas-piloto-token';
export const USER_KEY = 'faltas-piloto-user';

type Listener = (user: Usuario | null) => void;

let cachedUser: Usuario | null = null;
const listeners = new Set<Listener>();

function readUser(): Usuario | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Usuario;
  } catch {
    return null;
  }
}

function emit(user: Usuario | null) {
  cachedUser = user;
  listeners.forEach((fn) => fn(user));
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): Usuario | null {
  if (cachedUser !== null) return cachedUser;
  cachedUser = readUser();
  return cachedUser;
}

export function subscribeAuth(listener: Listener): () => void {
  listeners.add(listener);
  listener(getUser());
  return () => listeners.delete(listener);
}

export async function login(username: string, password: string): Promise<Usuario> {
  const u = await apiClient.login(username, password);
  if (u.token) localStorage.setItem(TOKEN_KEY, u.token);
  const { token, ...perfil } = u;
  void token;
  localStorage.setItem(USER_KEY, JSON.stringify(perfil));
  emit(u);
  return u;
}

export function restoreSession(): void {
  if (!getToken()) return;
  apiClient
    .actual()
    .then((u) => {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      emit(u);
    })
    .catch(() => logout(false));
}

export function logout(navigate = true): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  emit(null);
  if (navigate && typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
