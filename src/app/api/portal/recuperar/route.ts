import { NextRequest } from 'next/server';
import { enviarCorreo, handlePublic } from '@/lib/srv';

export async function POST(req: NextRequest) {
  const b = (await req.json()) as { email: string };
  return handlePublic(async ({ db }) => {
    const email = String(b.email ?? '').trim().toLowerCase();
    const { data } = await db.from('ciudadano').select('id').eq('email', email).maybeSingle();
    if (!data) return { enviado: true };
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    await db.from('ciudadano').update({ codigo_verificacion: codigo }).eq('id', (data as { id: number }).id);
    await enviarCorreo(db, email, 'Recuperación de contraseña · Portal de Faltas', `Su código para restablecer la contraseña es ${codigo}.`);
    return { enviado: true, codigoPiloto: codigo };
  });
}
