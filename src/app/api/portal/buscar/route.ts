import { NextRequest } from 'next/server';
import { infoEstado, patronDocumento } from '@/lib/dominio';
import { documentosSubsanados, esTitular, handlePortal } from '@/lib/portal-srv';

const CAMPOS = 'id, uuid, infractor_documento_numero, infractor_cuit, legajo_numero_acta, legajo_number, legajo_anio, legajo_fecha, infraccion_tipo_nombre, estado_faltas, medida_vigente, vehiculo_numero_dominio, notificada_at, vence_plazo_at, domicilio_infraccion_calle, domicilio_infraccion_numero';

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
    type Fila = { id: number; estado_faltas: string; infractor_documento_numero: string | null; infractor_cuit: string | null };
    let filas = (data ?? []) as unknown as Fila[];
    if (!q) {
      // Reunión 27/10: con una subsanación que cambió el DNI, la causa pasa al nuevo titular y sale del anterior.
      const doc = String(ciu.cuit || ciu.documento_numero || '').replace(/\D/g, '');
      const { data: subs } = await db.from('subsanacion').select('infraccion_id').ilike('campos_json', `%${doc}%`).limit(50);
      const extra = ((subs ?? []) as { infraccion_id: number }[]).map((s) => s.infraccion_id).filter((id) => !filas.some((f) => f.id === id));
      if (extra.length) {
        const { data: mas } = await db.from('infraccion').select(CAMPOS).in('id', extra).not('estado_faltas', 'in', '("Borrador","Anulada")').eq('visible_portal', 1);
        filas = [...filas, ...((mas ?? []) as unknown as Fila[])].sort((a, b) => b.id - a.id);
      }
      const vig = await documentosSubsanados(db, filas.map((f) => f.id));
      filas = filas.filter((f) => {
        const v = vig.get(f.id);
        return esTitular(ciu, { infractor_documento_numero: v?.doc ?? f.infractor_documento_numero, infractor_cuit: v?.cuit ?? f.infractor_cuit });
      });
    }
    // Sin id ni documentos en la respuesta al portal.
    return filas.map((f) => {
      const c: Record<string, unknown> = { ...f };
      delete c.id; delete c.infractor_documento_numero; delete c.infractor_cuit;
      return { ...c, estadoVisible: infoEstado(f.estado_faltas).portal };
    });
  });
}
