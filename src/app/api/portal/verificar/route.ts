import { NextRequest } from 'next/server';
import { issueToken } from '@/lib/jwt';
import { perfilPublico, type Ciudadano } from '@/lib/portal-srv';
import { check, enviarCorreo, handlePublic } from '@/lib/srv';

export async function POST(req: NextRequest) {
  const b = (await req.json()) as { email: string; codigo: string; ddjj?: boolean };
  return handlePublic(async ({ db }) => {
    const { data } = await db.from('ciudadano').select('*').eq('email', String(b.email).trim().toLowerCase()).maybeSingle();
    check(data, 'Cuenta inexistente', 404);
    const c = data as Ciudadano & { codigo_verificacion: string };
    check(c.codigo_verificacion && c.codigo_verificacion === String(b.codigo).trim(), 'Código incorrecto');
    // DD.JJ. de domicilio electrónico en el primer ingreso (minuta 20/10): queda constituida y no se vuelve a pedir.
    // Si ya estaba constituida, se respeta la fecha original.
    const ddjj = b.ddjj === true && Number(c.domicilio_electronico) !== 1 ? { domicilio_electronico: 1, ddjj_at: Date.now() } : {};
    await db.from('ciudadano').update({ email_verificado: 1, codigo_verificacion: null, ...ddjj }).eq('id', c.id);
    if ('ddjj_at' in ddjj) {
      await enviarCorreo(db, c.email, 'Domicilio electrónico constituido', 'Desde ahora las notificaciones de la Dirección de Faltas se le enviarán a esta casilla y se tendrán por válidas.');
    }
    return { token: await issueToken(`ciudadano:${c.uuid}`), perfil: perfilPublico({ ...c, email_verificado: 1, ...ddjj }) };
  });
}
