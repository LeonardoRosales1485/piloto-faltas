import { NextRequest } from 'next/server';
import { infoEstado, patronDocumento, TIPOS_ACTA, tipoActa } from '@/lib/dominio';
import { check, handlePublic } from '@/lib/srv';

/**
 * Consulta pública de actas por dominio o por documento, sin cuenta (minuta 20/10, «esquema CABA»): sirve cuando el
 * titular del vehículo no es quien manejaba. Devuelve lo mínimo para identificar el acta (número, fecha, tipo, estado
 * y dominio), sin datos personales ni montos; para verla, pagar o presentar algo hay que ingresar al portal.
 */
export async function GET(req: NextRequest) {
  const dominio = (req.nextUrl.searchParams.get('dominio') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const documento = (req.nextUrl.searchParams.get('documento') || '').replace(/\D/g, '');
  return handlePublic(async ({ db }) => {
    check(dominio.length >= 6 || documento.length >= 7, 'Ingrese el dominio completo (6 o 7 caracteres) o el número de documento.');
    let q = db.from('infraccion').select('uuid, legajo_numero_acta, legajo_fecha, infraccion_tipo_nombre, estado_faltas, vehiculo_numero_dominio')
      .not('estado_faltas', 'in', '("Borrador","Anulada")').eq('visible_portal', 1).order('id', { ascending: false }).limit(30);
    q = dominio
      ? q.eq('vehiculo_numero_dominio', dominio)
      : q.or(`infractor_documento_numero.match.${patronDocumento(documento)},infractor_cuit.match.${patronDocumento(documento)}`);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, string>[]).map((c) => ({
      uuid: c.uuid,
      numero: c.legajo_numero_acta,
      fecha: String(c.legajo_fecha ?? '').slice(0, 10),
      tipo: TIPOS_ACTA[tipoActa(c.infraccion_tipo_nombre)].titulo,
      estado: infoEstado(c.estado_faltas).portal,
      dominio: c.vehiculo_numero_dominio || null,
    }));
  });
}
