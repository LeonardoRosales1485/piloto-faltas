import { NextRequest } from 'next/server';
import { infoEstado, patronDocumento } from '@/lib/dominio';
import { handlePortal } from '@/lib/portal-srv';

const CAMPOS = 'uuid, legajo_numero_acta, legajo_number, legajo_anio, legajo_fecha, infraccion_tipo_nombre, estado_faltas, medida_vigente, vehiculo_numero_dominio, notificada_at, vence_plazo_at, domicilio_infraccion_calle, domicilio_infraccion_numero';

/** Búsqueda de causas por acta, dominio o documento, en tránsito o contravención (PI-07). Sin parámetro: las del usuario. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  const tipo = req.nextUrl.searchParams.get('tipo') || '';
  return handlePortal(req, async ({ ciu, db }) => {
    let query = db.from('infraccion').select(CAMPOS).not('estado_faltas', 'in', '("Borrador","Anulada")').eq('visible_portal', 1).order('id', { ascending: false }).limit(50);
    if (tipo === 'transito') query = query.eq('infraccion_tipo_id', 1);
    if (tipo === 'contravencion') query = query.in('infraccion_tipo_id', [2, 3]);
    if (q) {
      const limpio = q.toUpperCase().replace(/\s|-/g, '');
      const num = q.replace(/\D/g, '');
      const ors = [`legajo_numero_acta.ilike.%${q.toUpperCase()}%`, `vehiculo_numero_dominio.ilike.${limpio}`];
      if (num.length >= 6) ors.push(`infractor_documento_numero.match.${patronDocumento(num)}`, `infractor_cuit.match.${patronDocumento(num)}`);
      query = query.or(ors.join(','));
    } else {
      const doc = String(ciu.cuit || ciu.documento_numero || '').replace(/\D/g, '');
      // Mismo documento aunque el acta lo tenga con puntos, espacios o guiones (QA UI-CONT-08).
      if (!doc) return [];
      query = query.or(`infractor_documento_numero.match.${patronDocumento(doc)},infractor_cuit.match.${patronDocumento(doc)}`);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data ?? []) as { estado_faltas: string }[]).map((c) => ({ ...c, estadoVisible: infoEstado(c.estado_faltas).portal }));
  });
}
