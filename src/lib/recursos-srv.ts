/**
 * Recursos (apelaciones) e impacto de las sentencias (minuta 20/10, apartado F). Un recurso se eleva a una instancia
 * (Juzgado de Paz u otra) con fecha y n.° de expediente, acumula movimientos de seguimiento y se resuelve con la
 * sentencia adjunta: confirma o modifica el monto (se re-emite la boleta por el monto ordenado), revoca (absolución)
 * o declara la nulidad (archivo por nulidad).
 */
import { estadoFinal, pesos } from './dominio';
import { reservar } from './acta-srv';
import { movimientosDe, RESULTADOS_RECURSO, type Movimiento } from './recursos';
import { cambiarEstado, check, feriados, historial, sumarHabiles, uuid, type CausaRow, type Db } from './srv';

export type RecursoRow = {
  id: number; uuid: string; infraccion_id: number; tipo: string; instancia: string; expediente: string | null; fecha_elevacion: number;
  estado: 'elevado' | 'en_tramite' | 'resuelto'; resultado: string | null; monto_ordenado: number | null; sentencia_documento_id: number | null;
  movimientos_json: string; creado_por: string | null; date_created: number; resuelto_at: number | null;
};

async function recursoDe(db: Db, causaId: number, recursoUuid: string): Promise<RecursoRow> {
  const { data, error } = await db.from('recurso').select('*').eq('uuid', recursoUuid).eq('infraccion_id', causaId).maybeSingle();
  check(!error, 'Falta correr sql/032_recursos_y_trazabilidad.sql', 500);
  check(data, 'Recurso inexistente', 404);
  return data as RecursoRow;
}

export async function elevarRecurso(db: Db, c: CausaRow, quien: string, d: { instancia: string; expediente: string; fecha: number; tipo: string; detalle: string }) {
  check(!estadoFinal(c.estado_faltas), 'La causa está cerrada');
  check(d.instancia, 'Indique la instancia');
  check(d.fecha > 0, 'Indique la fecha de elevación');
  const { data: abiertos, error } = await db.from('recurso').select('id').eq('infraccion_id', c.id).neq('estado', 'resuelto');
  check(!error, 'Falta correr sql/032_recursos_y_trazabilidad.sql', 500);
  check(!(abiertos ?? []).length, 'Ya hay un recurso en trámite: registre su resultado antes de elevar otro', 409);
  const movimientos: Movimiento[] = [{ fecha: d.fecha, texto: `Elevado a ${d.instancia}${d.expediente ? ` · Expte. ${d.expediente}` : ''}${d.detalle ? ` · ${d.detalle}` : ''}`, usuario: quien }];
  await db.from('recurso').insert({
    uuid: uuid(), infraccion_id: c.id, tipo: d.tipo || 'apelacion', instancia: d.instancia, expediente: d.expediente || null, fecha_elevacion: d.fecha,
    estado: 'elevado', movimientos_json: JSON.stringify(movimientos), creado_por: quien, date_created: Date.now(),
  });
  // La elevación al Juzgado deja la causa «En Juzgado» (familia externa) hasta que llegue la sentencia.
  if (c.estado_faltas !== 'En Juzgado') await cambiarEstado(db, c, 'En Juzgado', quien, `Recurso elevado a ${d.instancia}`, `${d.expediente ? `Expte. ${d.expediente} · ` : ''}Se remite el legajo completo en PDF.`);
  else await historial(db, c.id, quien, `Recurso elevado a ${d.instancia}`, d.expediente ? `Expte. ${d.expediente}` : null);
}

export async function movimientoRecurso(db: Db, c: CausaRow, quien: string, recursoUuid: string, d: { fecha: number; texto: string; expediente?: string }) {
  const r = await recursoDe(db, c.id, recursoUuid);
  check(r.estado !== 'resuelto', 'El recurso ya está resuelto', 409);
  check(d.texto, 'Describa el movimiento');
  const movs = [...movimientosDe(r), { fecha: d.fecha || Date.now(), texto: d.texto, usuario: quien }];
  await db.from('recurso').update({ movimientos_json: JSON.stringify(movs), estado: 'en_tramite', ...(d.expediente ? { expediente: d.expediente } : {}) }).eq('id', r.id);
  await historial(db, c.id, quien, 'Movimiento del recurso', `${r.instancia}${d.expediente || r.expediente ? ` · Expte. ${d.expediente || r.expediente}` : ''}: ${d.texto}`);
}

export async function resolverRecurso(
  db: Db, c: CausaRow, quien: string, recursoUuid: string,
  d: { resultado: string; monto: number | null; detalle: string; archivoRaw: string; archivoNombre: string; aNombre: string },
) {
  const r = await recursoDe(db, c.id, recursoUuid);
  check(r.estado !== 'resuelto', 'El recurso ya está resuelto', 409);
  check(RESULTADOS_RECURSO[d.resultado], 'Indique el resultado de la sentencia');
  check(d.archivoRaw.startsWith('data:'), 'Adjunte la sentencia (PDF o imagen)');
  const cobra = d.resultado === 'confirma' || d.resultado === 'modifica';
  const monto = cobra ? Number(d.monto) || Number(c.monto_estimado) || 0 : null;
  if (cobra) check(monto && monto > 0, 'Indique el monto que ordena la sentencia');
  const ahora = Date.now();
  const { data: doc } = await db.from('documento').insert({
    uuid: uuid(), infraccion_id: c.id, tipo: 'adjunto', titulo: `Sentencia · ${r.instancia}${r.expediente ? ` · Expte. ${r.expediente}` : ''}`,
    archivo_nombre: d.archivoNombre || 'sentencia', archivo_raw: d.archivoRaw, estado: 'definitivo', creado_por: quien, date_created: ahora,
  }).select('id').single();
  const movs = [...movimientosDe(r), { fecha: ahora, texto: `Sentencia: ${RESULTADOS_RECURSO[d.resultado]}${monto ? ` · ${pesos(monto)}` : ''}${d.detalle ? ` · ${d.detalle}` : ''}`, usuario: quien }];
  await db.from('recurso').update({
    estado: 'resuelto', resultado: d.resultado, monto_ordenado: monto, sentencia_documento_id: (doc as { id: number } | null)?.id ?? null,
    movimientos_json: JSON.stringify(movs), resuelto_at: ahora,
  }).eq('id', r.id);
  // Las boletas impagas del fallo quedan sin efecto: la sentencia fija lo que se cobra.
  const { data: impagas } = await db.from('boleta').select('id, detalle_json').eq('infraccion_id', c.id).in('estado', ['emitida', 'vencida']);
  const anular = ((impagas ?? []) as { id: number; detalle_json: string | null }[]).filter((b) => !String(b.detalle_json ?? '').includes('"liberacion":true')).map((b) => b.id);
  if (anular.length) await db.from('boleta').update({ estado: 'anulada' }).in('id', anular);
  const detalle = `${r.instancia}${r.expediente ? ` · Expte. ${r.expediente}` : ''}${d.detalle ? ` · ${d.detalle}` : ''}${anular.length ? ` · ${anular.length} boleta(s) impaga(s) anulada(s)` : ''}`;
  if (d.resultado === 'revoca') {
    await cambiarEstado(db, c, 'Archivo absolución', quien, 'Sentencia: revoca el fallo', detalle);
  } else if (d.resultado === 'nulidad') {
    await cambiarEstado(db, c, 'Archivo nulidad', quien, 'Sentencia: nulidad', detalle);
  } else {
    // Re-emisión de la boleta por el monto que ordena la sentencia (sin derecho de oficina: ya se cobró con el acta).
    const num = await reservar(db, `BOL-${new Date().getFullYear()}`);
    await db.from('boleta').insert({
      uuid: uuid(), infraccion_id: c.id, numero: `M2000-${String(num).padStart(7, '0')}`,
      concepto: `Multa según sentencia (${r.instancia}) · Acta ${c.legajo_numero_acta}`,
      detalle_json: JSON.stringify({ multa: monto, acarreo: 0, derecho_oficina: 0, sentencia: true, recurso: r.uuid }),
      monto, vencimiento: sumarHabiles(ahora, 10, await feriados(db)), a_nombre_de: d.aNombre || String(c.infractor_razon_social || c.infractor_nombre || ''),
      estado: 'emitida', date_created: ahora,
    });
    await cambiarEstado(db, c, 'Esp. Acreditar Pago', quien, `Sentencia: ${RESULTADOS_RECURSO[d.resultado].toLowerCase()}`, `${detalle} · Boleta re-emitida por ${pesos(monto!)}`, { monto_estimado: monto });
  }
}
