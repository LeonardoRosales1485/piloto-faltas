import { NextRequest } from 'next/server';
import { accionesDisponibles, handlePortal, nombreCiudadano, type Presentacion } from '@/lib/portal-srv';
import { causaPorUuid, check, historial, uuid } from '@/lib/srv';
import { controlarAdjuntos } from '@/lib/adjuntos-srv';

type Body = { causaUuid: string; tipo: 'pago_voluntario' | 'boleta' | 'cuotas' | 'descargo' | 'apelacion' | 'reenviar_descargo'; texto?: string; cuotas?: number; adjuntos?: { nombre: string; raw: string; titulo: string }[] };

const TITULO: Record<string, string> = { pago_voluntario: 'Solicitud de pago voluntario', boleta: 'Solicitud de boleta', cuotas: 'Solicitud de plan de cuotas', descargo: 'Descargo', apelacion: 'Apelación', reenviar_descargo: 'Descargo (reenvío)' };

/** Presentaciones del infractor desde el portal, con las reglas de cada régimen (PI-13 a PI-25). */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as Body;
  return handlePortal(req, async ({ ciu, db }) => {
    const c = await causaPorUuid(db, b.causaUuid);
    const { data: pres } = await db.from('presentacion').select('id, tipo, estado, reenvio_de').eq('infraccion_id', c.id);
    const { count } = await db.from('boleta').select('*', { count: 'exact', head: true }).eq('infraccion_id', c.id).in('estado', ['emitida', 'a_verificar', 'definitiva']);
    const acc = accionesDisponibles(c, (pres ?? []) as Presentacion[], count ?? 0)[b.tipo];
    check(acc?.ok, acc?.motivo ?? 'Acción no disponible', 409);
    const adj = b.adjuntos ?? [];
    await controlarAdjuntos(db, adj);
    check(adj.some((a) => a.titulo === 'DNI frente') && adj.some((a) => a.titulo === 'DNI dorso'), 'Adjunte el DNI de ambos lados');
    if (ciu.tipo_persona === 'juridica') check(adj.some((a) => a.titulo === 'Estatuto'), 'Adjunte el estatuto de la persona jurídica');
    if (['descargo', 'reenviar_descargo', 'apelacion'].includes(b.tipo)) check((b.texto ?? '').trim().length >= 20 || adj.some((a) => a.titulo === 'Escrito'), 'Escriba su presentación o adjunte el escrito firmado');
    let reenvioDe: number | null = null;
    if (b.tipo === 'reenviar_descargo') reenvioDe = ((pres ?? []) as Presentacion[]).find((p) => p.tipo === 'descargo' && p.estado === 'observada')!.id;
    const tipo = b.tipo === 'reenviar_descargo' ? 'descargo' : b.tipo;
    const { data: p, error } = await db.from('presentacion').insert({
      uuid: uuid(), infraccion_id: c.id, ciudadano_id: ciu.id, origen: 'portal', tipo, texto: (b.texto ?? '').trim(),
      cuotas_solicitadas: tipo === 'cuotas' ? Math.max(2, Math.min(12, Number(b.cuotas ?? 3))) : null, estado: 'pendiente', reenvio_de: reenvioDe, date_created: Date.now(),
    }).select('id').single();
    if (error) throw new Error(error.message);
    if (reenvioDe) await db.from('presentacion').update({ estado: 'reenviada' }).eq('id', reenvioDe);
    for (const a of adj) {
      check(String(a.raw).startsWith('data:'), 'Archivo inválido');
      await db.from('documento').insert({ uuid: uuid(), infraccion_id: c.id, tipo: 'adjunto', presentacion_id: (p as { id: number }).id, titulo: `${a.titulo} · ${TITULO[b.tipo]}`, archivo_nombre: a.nombre, archivo_raw: a.raw, estado: 'definitivo', creado_por: nombreCiudadano(ciu), date_created: Date.now() });
    }
    await historial(db, c.id, `${nombreCiudadano(ciu)} (portal)`, `${TITULO[b.tipo]} recibida`, b.texto ? b.texto.slice(0, 300) : null);
    return { ok: true };
  });
}
