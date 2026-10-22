import { config, handlePublic } from '@/lib/srv';
import { limitesAdjuntos } from '@/lib/adjuntos-srv';

export async function GET() {
  return handlePublic(async ({ db }) => {
    const { data } = await db.from('texto_portal').select('llave, titulo, texto');
    const textos: Record<string, string> = {};
    for (const t of (data ?? []) as { llave: string; texto: string }[]) textos[t.llave] = t.texto;
    return { textos, contacto: await config(db, 'portal_contacto', ''), descuento: Number(await config(db, 'descuento_pago_voluntario', '50')), limites: await limitesAdjuntos(db) };
  });
}
