import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { check, handlePublic } from '@/lib/srv';

export async function POST(req: NextRequest) {
  const b = (await req.json()) as { email: string; codigo: string; password: string };
  return handlePublic(async ({ db }) => {
    check(String(b.password ?? '').length >= 8, 'La contraseña debe tener al menos 8 caracteres');
    const { data } = await db.from('ciudadano').select('id, codigo_verificacion').eq('email', String(b.email).trim().toLowerCase()).maybeSingle();
    const c = data as { id: number; codigo_verificacion: string | null } | null;
    check(c && c.codigo_verificacion === String(b.codigo).trim(), 'Código incorrecto');
    await db.from('ciudadano').update({ password_hash: await bcrypt.hash(b.password, 10), codigo_verificacion: null, email_verificado: 1 }).eq('id', c!.id);
    return { ok: true };
  });
}
