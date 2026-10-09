import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { check, handle } from '@/lib/srv';

import { MODULOS_ACTA } from '@/lib/dominio';

const CAMPOS = 'uuid, username, nombre, apellido, email, sector, legajo, terminal, firma_activa, modulos_acta, activo, date_created';

/** Inspectores con su cantidad de actas firmadas y la última. */
export async function GET(req: NextRequest) {
  return handle(req, async ({ db }) => {
    const { data, error } = await db.from('usuario').select(CAMPOS).eq('rol', 'Inspector').order('apellido');
    if (error) throw new Error(error.message);
    const { data: actas } = await db.from('infraccion').select('inspector_username, firmada_at').not('firmada_at', 'is', null);
    const est: Record<string, { actas: number; ultima: number }> = {};
    for (const a of (actas ?? []) as { inspector_username: string; firmada_at: number }[]) {
      const e = (est[a.inspector_username] ??= { actas: 0, ultima: 0 });
      e.actas += 1;
      e.ultima = Math.max(e.ultima, Number(a.firmada_at));
    }
    return ((data ?? []) as { username: string }[]).map((u) => ({ ...u, actas: est[u.username]?.actas ?? 0, ultima_acta: est[u.username]?.ultima || null }));
  }, 'inspectores');
}

type Body = {
  uuid?: string; username?: string; nombre?: string; apellido?: string; email?: string; sector?: string;
  legajo?: string; terminal?: string; modulos_acta?: string; firma_activa?: boolean; activo?: boolean; password?: string;
};

/** Alta y edición de inspectores (el rol queda fijo en «Inspector»). Las bajas son lógicas. */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as Body;
  return handle(req, async ({ db }) => {
    const datos = {
      nombre: (b.nombre ?? '').trim(),
      apellido: (b.apellido ?? '').trim(),
      email: (b.email ?? '').trim() || null,
      sector: (b.sector ?? '').trim() || null,
      legajo: (b.legajo ?? '').trim() || null,
      terminal: (b.terminal ?? '').trim() || null,
      modulos_acta: String(b.modulos_acta ?? '').split(',').map((x) => x.trim()).filter((x) => MODULOS_ACTA.some((m) => m.v === x)).join(','),
    };
    check(datos.modulos_acta, 'Marque al menos un tipo de acta que pueda labrar');
    check(datos.nombre && datos.apellido, 'Nombre y apellido son obligatorios');
    check(datos.legajo, 'El N° de legajo es obligatorio');
    check(datos.sector, 'Indique la dependencia');
    check(!datos.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email), 'Correo inválido');
    const pass = b.password ?? '';
    check(!pass || pass.length >= 6, 'La contraseña debe tener al menos 6 caracteres');
    const ahora = Date.now();

    if (datos.terminal) {
      let q = db.from('usuario').select('username').eq('rol', 'Inspector').eq('terminal', datos.terminal).eq('activo', true);
      if (b.uuid) q = q.neq('uuid', b.uuid);
      const { data: ocupada } = await q.maybeSingle();
      check(!ocupada, `La terminal ${datos.terminal} ya está asignada a ${(ocupada as { username?: string } | null)?.username}`, 409);
    }

    if (!b.uuid) {
      const username = (b.username ?? '').trim().toLowerCase();
      check(/^[a-z0-9._-]{3,40}$/.test(username), 'Usuario inválido: 3 a 40 caracteres (letras, números, punto, guion)');
      check(pass, 'La contraseña es obligatoria para el alta');
      const { data: existe } = await db.from('usuario').select('id').eq('username', username).maybeSingle();
      check(!existe, 'Ya existe un usuario con ese nombre', 409);
      const { error } = await db.from('usuario').insert({
        uuid: crypto.randomUUID(), username, password_hash: bcrypt.hashSync(pass, 10), rol: 'Inspector', ...datos,
        firma_activa: b.firma_activa !== false, activo: true, date_created: ahora,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { data: actual } = await db.from('usuario').select('rol').eq('uuid', b.uuid).maybeSingle();
    check((actual as { rol?: string } | null)?.rol === 'Inspector', 'Inspector no encontrado', 404);
    const cambios: Record<string, unknown> = { ...datos, date_updated: ahora };
    if (typeof b.firma_activa === 'boolean') cambios.firma_activa = b.firma_activa;
    if (typeof b.activo === 'boolean') cambios.activo = b.activo;
    if (pass) cambios.password_hash = bcrypt.hashSync(pass, 10);
    const { error } = await db.from('usuario').update(cambios).eq('uuid', b.uuid);
    if (error) throw new Error(error.message);
    return { ok: true };
  }, 'inspectores');
}
