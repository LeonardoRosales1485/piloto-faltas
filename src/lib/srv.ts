import { AsyncLocalStorage } from 'node:async_hooks';
import { NextRequest } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { requireUser } from './auth';
import { jsonFail, jsonOk } from './http-data';
import { createServerClient } from './supabase-server';
import type { UsuarioRow } from './types';
import { estadoFinal, puede, tipoVisible, type Permiso } from './dominio';

export type Db = ReturnType<typeof createServerClient>;

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function db(): Db {
  return createServerClient();
}

/** Envuelve un handler de API: autentica, controla permisos y traduce errores a { data, status, message }. */
/** Rol del usuario de la request en curso (para el alcance por tipo de acta). */
export const rolActual = new AsyncLocalStorage<string>();

function verificarAlcance(c: CausaRow | null): CausaRow | null {
  if (c && !tipoVisible(rolActual.getStore(), (c as unknown as { infraccion_tipo_id?: number }).infraccion_tipo_id)) return null;
  return c;
}

export async function handle<T>(
  req: NextRequest,
  fn: (ctx: { user: UsuarioRow; db: Db }) => Promise<T>,
  permiso?: Permiso,
) {
  try {
    const user = await requireUser(req);
    if (permiso && !puede(user, permiso)) {
      return jsonFail(403, 'No tiene permiso para esta acción');
    }
    const data = await rolActual.run(user.rol, () => fn({ user, db: db() }));
    return jsonOk(data);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}

/** Handler público (portal / verificación). */
export async function handlePublic<T>(fn: (ctx: { db: Db }) => Promise<T>) {
  try {
    return jsonOk(await fn({ db: db() }));
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}

export function must<T>(value: T | null | undefined, status = 404, msg = 'No encontrado'): T {
  if (value === null || value === undefined) throw new HttpError(status, msg);
  return value;
}

export function check(cond: unknown, msg: string, status = 400): asserts cond {
  if (!cond) throw new HttpError(status, msg);
}

export function uuid() {
  return randomUUID();
}

export function sha(text: string) {
  return createHash('sha256').update(text).digest('hex');
}

export function nombreUsuario(u: Pick<UsuarioRow, 'nombre' | 'apellido' | 'username'>) {
  return `${u.nombre} ${u.apellido}`.trim() || u.username;
}

export async function q<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new HttpError(500, error.message);
  return data as T;
}

// ---------------------------------------------------------------------------
// Causa: carga, historial y cambio de estado
// ---------------------------------------------------------------------------
export type CausaRow = {
  id: number;
  uuid: string;
  estado_faltas: string;
  infraccion_tipo_nombre: string;
  legajo_numero_acta: string | null;
  legajo_number: string | null;
  medida_vigente: number | null;
  infractor_email: string | null;
  infractor_nombre: string | null;
  notificada_at: number | null;
  [k: string]: unknown;
};

export async function causaPorUuid(d: Db, uuidCausa: string): Promise<CausaRow> {
  const { data } = await d.from('infraccion').select('*').eq('uuid', uuidCausa).maybeSingle();
  return must(verificarAlcance(data as CausaRow | null), 404, 'Causa no encontrada');
}

export async function causaPorId(d: Db, id: number): Promise<CausaRow> {
  const { data } = await d.from('infraccion').select('*').eq('id', id).maybeSingle();
  return must(verificarAlcance(data as CausaRow | null), 404, 'Causa no encontrada');
}

export async function historial(
  d: Db,
  infraccionId: number,
  usuario: string,
  accion: string,
  detalle?: string | null,
  estados?: { anterior?: string | null; nuevo?: string | null },
) {
  await d.from('causa_historial').insert({
    infraccion_id: infraccionId,
    fecha: Date.now(),
    usuario,
    accion,
    estado_anterior: estados?.anterior ?? null,
    estado_nuevo: estados?.nuevo ?? null,
    detalle: detalle ?? null,
  });
}

/** Cambia el estado de Faltas de la causa y deja constancia. Valida la regla del archivo por pago. */
export async function cambiarEstado(
  d: Db,
  causa: CausaRow,
  nuevo: string,
  usuario: string,
  accion: string,
  detalle?: string | null,
  extra: Record<string, unknown> = {},
) {
  if (nuevo === 'Archivo por pago' && Number(causa.medida_vigente) === 1) {
    throw new HttpError(409, 'No se puede archivar por pago: la causa tiene una medida preventiva vigente.');
  }
  const patch: Record<string, unknown> = { estado_faltas: nuevo, ...extra };
  if (estadoFinal(nuevo) && Number(causa.medida_vigente) !== 1 && nuevo !== 'En Juzgado') patch.visible_portal = nuevo === 'Archivo por pago' ? 0 : 1;
  const { error } = await d.from('infraccion').update(patch).eq('id', causa.id);
  if (error) throw new HttpError(500, error.message);
  await historial(d, causa.id, usuario, accion, detalle, { anterior: causa.estado_faltas, nuevo });
  causa.estado_faltas = nuevo;
  Object.assign(causa, extra);
}

// ---------------------------------------------------------------------------
// Configuración y textos
// ---------------------------------------------------------------------------
export async function config(d: Db, llave: string, porDefecto: string): Promise<string> {
  const { data } = await d.from('configuracion').select('valor').eq('llave', llave).maybeSingle();
  return (data as { valor: string } | null)?.valor ?? porDefecto;
}

export async function configNum(d: Db, llave: string, porDefecto: number): Promise<number> {
  const n = Number(await config(d, llave, String(porDefecto)));
  return Number.isFinite(n) ? n : porDefecto;
}

// ---------------------------------------------------------------------------
// Plazos: días corridos y días hábiles con feriados
// ---------------------------------------------------------------------------
export async function feriados(d: Db): Promise<Set<string>> {
  const { data } = await d.from('feriado').select('fecha');
  return new Set(((data ?? []) as { fecha: string }[]).map((f) => String(f.fecha).slice(0, 10)));
}

function isoDia(dt: Date) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function sumarCorridos(desde: number, dias: number): number {
  const dt = new Date(desde);
  dt.setDate(dt.getDate() + dias);
  dt.setHours(23, 59, 59, 0);
  return dt.getTime();
}

export function sumarHabiles(desde: number, dias: number, fer: Set<string>): number {
  const dt = new Date(desde);
  let n = 0;
  while (n < dias) {
    dt.setDate(dt.getDate() + 1);
    const dow = dt.getDay();
    if (dow !== 0 && dow !== 6 && !fer.has(isoDia(dt))) n++;
  }
  dt.setHours(23, 59, 59, 0);
  return dt.getTime();
}

// ---------------------------------------------------------------------------
// Correo saliente simulado (no-reply)
// ---------------------------------------------------------------------------
export async function enviarCorreo(d: Db, para: string | null | undefined, asunto: string, cuerpo: string, infraccionId?: number) {
  if (!para) return;
  await d.from('correo_saliente').insert({ para, asunto, cuerpo, infraccion_id: infraccionId ?? null, date_created: Date.now() });
}
