import { NextRequest } from 'next/server';
import { issueToken } from '@/lib/jwt';
import { perfilPublico, type Ciudadano } from '@/lib/portal-srv';
import { check, handlePublic } from '@/lib/srv';

export async function POST(req: NextRequest) {
  const b = (await req.json()) as { email: string; codigo: string };
  return handlePublic(async ({ db }) => {
    const { data } = await db.from('ciudadano').select('*').eq('email', String(b.email).trim().toLowerCase()).maybeSingle();
    check(data, 'Cuenta inexistente', 404);
    const c = data as Ciudadano & { codigo_verificacion: string };
    check(c.codigo_verificacion && c.codigo_verificacion === String(b.codigo).trim(), 'Código incorrecto');
    await db.from('ciudadano').update({ email_verificado: 1, codigo_verificacion: null }).eq('id', c.id);
    return { token: await issueToken(`ciudadano:${c.uuid}`), perfil: perfilPublico({ ...c, email_verificado: 1 }) };
  });
}
