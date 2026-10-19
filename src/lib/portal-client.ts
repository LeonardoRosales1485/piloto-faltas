'use client';
import { avisarCambio } from './avisos-datos';

const KEY = 'faltas-portal-token';
const PERFIL = 'faltas-portal-perfil';

export type Perfil = {
  uuid: string; tipoPersona: string; nombre: string | null; apellido: string | null; documentoTipo: string | null; documentoNumero: string | null;
  razonSocial: string | null; cuit: string | null; email: string; domicilioElectronico: boolean; ddjjAt: number | null;
};

export function portalToken() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function portalPerfil(): Perfil | null {
  try { const r = localStorage.getItem(PERFIL); return r ? (JSON.parse(r) as Perfil) : null; } catch { return null; }
}

export function guardarSesion(token: string, perfil: Perfil) {
  localStorage.setItem(KEY, token);
  localStorage.setItem(PERFIL, JSON.stringify(perfil));
}

export function guardarPerfil(perfil: Perfil) {
  localStorage.setItem(PERFIL, JSON.stringify(perfil));
}

export function salirPortal() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(PERFIL); } catch { /* sin almacenamiento */ }
  // replace: la pantalla con sesión no queda en el historial («Atrás» no vuelve a ella) (QA AUTH-CONT-10).
  window.location.replace('/portal');
}

/** Pantallas del portal que necesitan sesión (fuera de ellas, /portal muestra el login). */
export function rutaPortalPrivada(path: string) {
  return /^\/portal\/(causa|documento|perfil)(\/|$)/.test(path);
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = portalToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(path, { ...init, headers });
  const body = (await res.json()) as { data: T; message?: string };
  // Sesión vencida o cerrada (también en otra pestaña): al ingreso, en lugar de dejar la pantalla con datos viejos.
  if (res.status === 401 && !/^\/api\/portal\/(login|registro|verificar|recuperar|restablecer)/.test(path)) { salirPortal(); }
  if (!res.ok) throw new Error(body.message ?? `Error ${res.status}`);
  if (init.method === 'POST') avisarCambio(path);
  return body.data;
}

export const portal = {
  get: <T,>(p: string) => req<T>(p),
  post: <T,>(p: string, b: unknown) => req<T>(p, { method: 'POST', body: JSON.stringify(b) }),
};

export function nombrePerfil(p: Perfil | null) {
  if (!p) return '';
  return p.tipoPersona === 'juridica' ? p.razonSocial ?? p.email : `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim();
}
