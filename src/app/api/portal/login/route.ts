import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { issueToken } from '@/lib/jwt';
import { perfilPublico, type Ciudadano } from '@/lib/portal-srv';
import { check, handlePublic } from '@/lib/srv';

export async function POST(req: NextRequest) {
  const b = (await req.json()) as { email: string; password: string };
  return handlePublic(async ({ db }) => {
    const { data } = await db.from('ciudadano').select('*').eq('email', String(b.email ?? '').trim().toLowerCase()).maybeSingle();
    const c = data as (Ciudadano & { password_hash: string }) | null;
    check(c && (await bcrypt.compare(b.password ?? '', c.password_hash)), 'Correo o contraseña incorrectos', 401);
    check(c!.email_verificado === 1, 'Valide su correo con el código que le enviamos', 403);
    return { token: await issueToken(`ciudadano:${c!.uuid}`), perfil: perfilPublico(c!) };
  });
}
