import { NextRequest } from 'next/server';
import { TIPOS_ACTA, tipoActa } from '@/lib/dominio';
import { handle, nombreUsuario } from '@/lib/srv';

type Fila = {
  uuid: string; titulo: string; numero: string | null; estado: string; date_updated: number | null; date_created: number; firmado_at: number | null;
  plantilla: { categoria: string | null } | null;
  infraccion: { legajo_numero_acta: string; infraccion_tipo_nombre: string; infractor_nombre: string | null; infractor_razon_social: string | null } | null;
};

/** Pantalla del Intendente: escritos aprobados por la Dirección que esperan su firma y los últimos que firmó. */
export async function GET(req: NextRequest) {
  return handle(req, async ({ db, user }) => {
    const campos = 'uuid, titulo, numero, estado, date_updated, date_created, firmado_at, plantilla(categoria), infraccion(legajo_numero_acta, infraccion_tipo_nombre, infractor_nombre, infractor_razon_social)';
    const [pend, firm] = await Promise.all([
      db.from('documento').select(campos).eq('tipo', 'escrito').eq('estado', 'para_firma').order('id', { ascending: true }).limit(200),
      db.from('documento').select(campos).eq('tipo', 'escrito').eq('estado', 'firmado').eq('firmado_por', nombreUsuario(user)).order('firmado_at', { ascending: false }).limit(15),
    ]);
    if (pend.error) throw new Error(pend.error.message);
    const fila = (d: Fila) => ({
      uuid: d.uuid, titulo: d.titulo, numero: d.numero, categoria: d.plantilla?.categoria ?? null, desde: d.date_updated ?? d.date_created, firmadoAt: d.firmado_at,
      acta: d.infraccion?.legajo_numero_acta ?? '-', tipo: TIPOS_ACTA[tipoActa(String(d.infraccion?.infraccion_tipo_nombre ?? ''))].corto,
      infractor: d.infraccion?.infractor_razon_social || d.infraccion?.infractor_nombre || 'NN',
    });
    return { pendientes: ((pend.data ?? []) as unknown as Fila[]).map(fila), firmados: ((firm.data ?? []) as unknown as Fila[]).map(fila) };
  }, 'firmaIntendente');
}
