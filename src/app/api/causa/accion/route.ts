import { NextRequest } from 'next/server';
import { constanciaSinMonto, correspondeDescuento, efectoNotificacionPositiva, emitirBoletas, evaluarArchivoPorPago, generarEscrito, notificarActa, notificarDocumento, valorizacion, valoresVigentes } from '@/lib/causa-srv';
import { ESTADOS, esBoletaLiberacion, estadoFinal, puede, pesos, REQUISITOS_LIBERACION } from '@/lib/dominio';
import { descargoPendiente } from '@/lib/camino';
import { calculoLiberacion, claseVehiculo, diasEnDeposito, tarifaEstadia, validezLiberacionMs } from '@/lib/tarifas';
import { aplicarSubsanacion, CAMPOS_SUBSANABLES, leyesVigentes, subsanacionDe, valorDe } from '@/lib/subsanacion';
import { accionesDisponibles, type Presentacion } from '@/lib/portal-srv';
import { controlarAdjuntos } from '@/lib/adjuntos-srv';
import { elevarRecurso, movimientoRecurso, resolverRecurso } from '@/lib/recursos-srv';
import { boletasLiberacionActivas, calcularEstadoLiberacion, datosLiberacion, type BoletaLib, type CausaLib } from '@/lib/liberacion-srv';
import {
  cambiarEstado, causaPorUuid, check, configNum, handle, historial, HttpError, nombreUsuario, uuid,
} from '@/lib/srv';

type Body = { uuid: string; accion: string; datos?: Record<string, unknown> };

const DESTINOS_EXTERNOS = ['Pago en Apremios', 'Archivo judicial', 'Archivo absolución', 'Archivo nulidad', 'Archivo prescripción'];

/** Acciones de la causa desde el back office. Cada una deja constancia en el historial. */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  return handle(req, async ({ user, db }) => {
    const c = await causaPorUuid(db, body.uuid);
    const d = body.datos ?? {};
    const quien = nombreUsuario(user);
    const txt = (k: string) => String(d[k] ?? '').trim();
    const gestion = puede(user.rol, 'gestionarCausas');

    switch (body.accion) {
      case 'descartar_acta': {
        // Solo el Administrador (prototipo: limpiar actas de prueba). Queda anulada, fuera de bandejas y del portal.
        check(user.rol === 'Administrador', 'Solo el administrador puede descartar actas', 403);
        check(c.estado_faltas !== 'Anulada', 'El acta ya está anulada', 409);
        const motivo = txt('motivo');
        check(motivo, 'Indique el motivo');
        await cambiarEstado(db, c, 'Anulada', quien, 'Acta descartada por el administrador', motivo, { anulada_motivo: motivo });
        await db.from('infraccion').update({ visible_portal: 0 }).eq('id', c.id);
        return { ok: true };
      }
      case 'cambiar_estado': {
        check(puede(user.rol, 'cambiarEstadoManual'), 'Sin permiso', 403);
        check(ESTADOS.some((e) => e.nombre === txt('estado')), 'Estado inválido');
        check(txt('estado') !== 'Desestimada', 'Las causas ya no se desestiman (minuta 20/10).');
        check(txt('motivo'), 'Indique el motivo del cambio manual');
        await cambiarEstado(db, c, txt('estado'), quien, 'Cambio manual de estado', txt('motivo'));
        return { ok: true };
      }
      case 'desestimar':
        // Minuta 20/10: no se desestiman causas; se cierran por fallo, archivo formal o nulidad fundada.
        throw new HttpError(410, 'Las causas ya no se desestiman: ciérrela con fallo, archivo o nulidad.');
      case 'subsanar': {
        check(puede(user.rol, 'subsanar'), 'Sin permiso', 403);
        // Reunión 27/10: se puede subsanar más de una vez. El «antes» es el dato vigente (ya subsanado si hubo otra).
        const previa = await subsanacionDe(db, c.id);
        const motivo = txt('motivo');
        check(motivo, 'Indique el motivo de la subsanación');
        const nuevos = (d.campos ?? {}) as Record<string, unknown>;
        const { data: rel } = await db.from('infraccion_ley').select('ley_nombre').eq('infraccion_id', c.id);
        const leyesOrig = leyesVigentes(((rel ?? []) as { ley_nombre: string }[]).map((r) => r.ley_nombre), previa);
        const vig = aplicarSubsanacion(c as unknown as Record<string, unknown>, previa);
        const cambios: Record<string, { antes: string; despues: string }> = {};
        for (const campo of CAMPOS_SUBSANABLES) {
          if (!(campo.k in nuevos)) continue;
          const antes = valorDe(vig, campo.k, leyesOrig);
          const despues = campo.k === 'leyes'
            ? String(nuevos.leyes ?? '').split(/\s*[|,]\s*/).map((x) => x.trim()).filter(Boolean).join(' | ')
            : String(nuevos[campo.k] ?? '').trim();
          if (despues !== antes.trim()) cambios[campo.k] = { antes, despues };
        }
        check(Object.keys(cambios).length, 'No cambió ningún dato');
        if (cambios.leyes) check(cambios.leyes.despues, 'El acta debe tener al menos un artículo');
        const etiqueta = (k: string) => CAMPOS_SUBSANABLES.find((x) => x.k === k)?.t ?? k;
        const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        const filas = Object.entries(cambios).map(([k, v]) => `<tr><td>${esc(etiqueta(k))}</td><td>${esc(v.antes || '—')}</td><td>${esc(v.despues || '—')}</td></tr>`).join('');
        const html = `<p style="text-align:center"><strong>CONSTANCIA DE SUBSANACIÓN${previa ? ` N.° ${previa.lista.length + 1}` : ''}</strong></p><p>Acta ${esc(String(c.legajo_numero_acta))} · Legajo ${esc(String(c.legajo_number))}/${esc(String(c.legajo_anio))}.</p><p><strong>Motivo:</strong> ${esc(motivo)}</p><table border="1" cellpadding="4" style="border-collapse:collapse;width:100%"><thead><tr><th>Dato</th><th>Decía</th><th>Debe decir</th></tr></thead><tbody>${filas}</tbody></table><p>El acta firmada no se modifica: esta constancia integra el legajo y los datos corregidos se usan en adelante.</p><p>${esc(quien)} · ${new Date().toLocaleDateString('es-AR')}</p>`;
        const { data: doc } = await db.from('documento').insert({ uuid: uuid(), infraccion_id: c.id, tipo: 'escrito', titulo: 'Constancia de subsanación', contenido_html: html, estado: 'definitivo', creado_por: quien, date_created: Date.now(), date_updated: Date.now() }).select('id').single();
        const { error } = await db.from('subsanacion').insert({ uuid: uuid(), infraccion_id: c.id, campos_json: JSON.stringify(cambios), motivo, usuario: quien, documento_id: (doc as { id: number } | null)?.id ?? null, date_created: Date.now() });
        if (error) throw new HttpError(500, error.message);
        await historial(db, c.id, quien, 'Subsanación de datos', `${Object.keys(cambios).map(etiqueta).join(', ')}. Motivo: ${motivo}`);
        return { ok: true };
      }
      case 'adjuntar': {
        await controlarAdjuntos(db, [{ nombre: txt('archivoNombre'), raw: txt('archivoRaw') }]);
        check(txt('archivoRaw').startsWith('data:'), 'Archivo inválido');
        await db.from('documento').insert({ uuid: uuid(), infraccion_id: c.id, tipo: 'adjunto', titulo: txt('titulo') || txt('archivoNombre'), archivo_nombre: txt('archivoNombre'), archivo_raw: txt('archivoRaw'), estado: 'definitivo', creado_por: quien, date_created: Date.now() });
        await historial(db, c.id, quien, 'Documento adjuntado', txt('titulo') || txt('archivoNombre'));
        return { ok: true };
      }
      case 'quitar_documento': {
        // Quitar un escrito o adjunto cargado por error. No se quitan los firmados/definitivos ni los ya notificados,
        // ni los adjuntos que llegaron con una presentación del infractor (forman parte de su presentación).
        check(puede(user.rol, 'redactarEscritos'), 'Sin permiso', 403);
        const { data: doc } = await db.from('documento').select('id, tipo, estado, titulo, presentacion_id').eq('uuid', txt('documentoUuid')).eq('infraccion_id', c.id).maybeSingle();
        check(doc, 'Documento no encontrado', 404);
        const dd = doc as { id: number; tipo: string; estado: string; titulo: string; presentacion_id: number | null };
        check(!dd.presentacion_id, 'Es parte de una presentación del infractor: no se puede quitar');
        check(dd.tipo === 'adjunto' || ['borrador', 'devuelto', 'en_revision'].includes(dd.estado), 'Los escritos firmados o definitivos no se pueden quitar');
        const { count: notif } = await db.from('notificacion').select('id', { count: 'exact', head: true }).eq('documento_id', dd.id);
        check(!notif, 'El documento ya fue notificado: no se puede quitar');
        const { data: sub } = await db.from('subsanacion').select('id').eq('documento_id', dd.id).maybeSingle();
        check(!sub, 'Es la constancia de una subsanación: no se puede quitar');
        await db.from('documento').delete().eq('id', dd.id);
        await historial(db, c.id, quien, dd.tipo === 'adjunto' ? 'Adjunto quitado' : 'Escrito quitado', `${dd.titulo}${txt('motivo') ? ` · ${txt('motivo')}` : ''}`);
        return { ok: true };
      }
      case 'archivar': {
        check(puede(user.rol, 'archivar'), 'Sin permiso', 403);
        const motivo = txt('motivo');
        check(motivo.startsWith('Archiv'), 'Seleccione el tipo de archivo');
        await cambiarEstado(db, c, motivo, quien, 'Causa archivada', txt('detalle') || null);
        return { ok: true };
      }
      case 'reingresar': {
        check(puede(user.rol, 'archivar'), 'Sin permiso', 403);
        check(estadoFinal(c.estado_faltas), 'Solo se reingresan causas archivadas');
        check(txt('motivo'), 'Indique el motivo');
        await cambiarEstado(db, c, c.notificada_at ? 'Notificado' : 'Iniciado', quien, 'Reingreso de causa archivada', txt('motivo'), { visible_portal: 1 });
        return { ok: true };
      }
      case 'espera_respuesta': {
        check(gestion, 'Sin permiso', 403);
        await cambiarEstado(db, c, 'Espera respuesta', quien, 'Nota a un área: espera respuesta', txt('detalle') || null);
        return { ok: true };
      }
      case 'ajustar_monto': {
        check(gestion, 'Sin permiso', 403);
        const monto = Number(d.monto);
        check(Number.isFinite(monto) && monto >= 0, 'Monto inválido');
        check(txt('motivo'), 'Indique el motivo del ajuste');
        await db.from('infraccion').update({ monto_ajustado: monto, monto_ajuste_motivo: txt('motivo') }).eq('id', c.id);
        await historial(db, c.id, quien, 'Valorización ajustada', `${pesos(monto)} · ${txt('motivo')}`);
        return { ok: true };
      }
      case 'ajustar_articulos': {
        // Montos por artículo de esta causa: múltiplo propio y/o subtotal manual (vacío = valor del catálogo).
        check(gestion, 'Sin permiso', 403);
        check(!estadoFinal(c.estado_faltas), 'La causa está cerrada');
        const items = (Array.isArray(d.items) ? d.items : []) as { clave: string; multiplo?: string | number | null; montoManual?: string | number | null }[];
        const v = await valorizacion(db, c);
        const validas = new Set(v.leyes.map((l) => l.clave));
        const num = (x: unknown) => (x === null || x === undefined || String(x).trim() === '' ? null : Number(String(x).replace(',', '.')));
        const cambios: string[] = [];
        for (const it of items) {
          check(validas.has(it.clave), 'Artículo que no pertenece a la causa');
          const multiplo = num(it.multiplo);
          const monto = num(it.montoManual);
          check(multiplo === null || (Number.isFinite(multiplo) && multiplo >= 0), 'Múltiplo inválido');
          check(monto === null || (Number.isFinite(monto) && monto >= 0), 'Monto inválido');
          const l = v.leyes.find((x) => x.clave === it.clave)!;
          const mult = multiplo !== null && multiplo === l.multiploCatalogo ? null : multiplo;
          if (mult === null && monto === null) {
            if (l.ajustada) { await db.from('causa_ley_ajuste').delete().eq('infraccion_id', c.id).eq('ley_clave', it.clave); cambios.push(`${l.nombre} ${l.articulo}: valor del catálogo`); }
            continue;
          }
          const { error } = await db.from('causa_ley_ajuste').upsert({ infraccion_id: c.id, ley_clave: it.clave, multiplo: mult, monto_manual: monto, usuario: quien, date_updated: Date.now() }, { onConflict: 'infraccion_id,ley_clave' });
          if (error) throw new HttpError(500, /causa_ley_ajuste/.test(error.message) ? 'Falta correr sql/022_ajuste_articulos.sql en Supabase' : error.message);
          cambios.push(`${l.nombre} ${l.articulo}: ${monto !== null ? `monto manual ${pesos(monto)}` : `múltiplo ${mult}`}`);
        }
        if (cambios.length) await historial(db, c.id, quien, 'Montos por artículo ajustados', `${cambios.join('; ')}${txt('motivo') ? ` · ${txt('motivo')}` : ''}`);
        return { ok: true };
      }
      case 'actualizar_valores': {
        // Pasa la causa de los valores del labrado a los vigentes (UF y múltiplos del catálogo).
        check(gestion, 'Sin permiso', 403);
        check(!estadoFinal(c.estado_faltas), 'La causa está cerrada');
        const antes = await valorizacion(db, c);
        const nuevos = await valoresVigentes(db, c);
        const { error } = await db.from('infraccion').update({ valores_labrado_json: JSON.stringify(nuevos) }).eq('id', c.id);
        if (error) throw new HttpError(500, /valores_labrado_json/.test(error.message) ? 'Falta correr sql/023_valores_labrado.sql en Supabase' : error.message);
        const despues = await valorizacion(db, { ...c, valores_labrado_json: JSON.stringify(nuevos) } as typeof c);
        await historial(db, c.id, quien, 'Valores actualizados a los vigentes', `UF ${pesos(antes.uf)} → ${pesos(nuevos.uf)} · subtotal artículos ${pesos(antes.subtotal)} → ${pesos(despues.subtotal)}`);
        return { ok: true };
      }
      case 'esperar_infractor': {
        // Causa recién labrada: pasa a «En notificación» para esperar que el infractor vea el acta digital,
        // o se deja constancia de que no se espera (la acción siguiente es «Considerar notificado»).
        check(gestion, 'Sin permiso', 403);
        check(c.estado_faltas === 'Iniciado', 'La causa ya no está en «Iniciado»');
        if (txt('esperar') === 'si') await cambiarEstado(db, c, 'En notificación', quien, 'En espera del infractor', 'El infractor todavía no visualizó el acta digital.');
        else await historial(db, c.id, quien, 'No se espera al infractor', 'Se decidió no pasar a «En notificación».');
        return { ok: true };
      }
      case 'considerar_notificado': {
        check(gestion, 'Sin permiso', 403);
        check(['Iniciado', 'En notificación'].includes(c.estado_faltas) && !c.notificada_at, 'La causa ya está notificada o no está en notificación');
        check(await notificarActa(db, c, 'considerada', quien), 'No se pudo considerar notificada la causa');
        return { ok: true };
      }
      case 'generar_escrito': {
        check(puede(user.rol, 'redactarEscritos'), 'Sin permiso', 403);
        const { data: pl } = await db.from('plantilla').select('codigo, categoria').eq('id', Number(d.plantillaId)).maybeSingle();
        const esFallo = pl && (String((pl as { categoria: string }).categoria) === 'Fallo' || String((pl as { codigo: string }).codigo ?? '').startsWith('FALLO'));
        if (esFallo) {
          const { data: pres } = await db.from('presentacion').select('tipo, estado').eq('infraccion_id', c.id);
          check(!descargoPendiente((pres ?? []) as { tipo: string; estado: string }[]), 'Resuelva primero el descargo presentado', 409);
        }
        return generarEscrito(db, user, c, Number(d.plantillaId));
      }
      case 'notificar_documento': {
        check(gestion, 'Sin permiso', 403);
        const { data } = await db.from('documento').select('id').eq('uuid', txt('documentoUuid')).single();
        check(data, 'Documento inexistente', 404);
        return notificarDocumento(db, (data as { id: number }).id, quien);
      }
      case 'considerar_notificado_documento': {
        // Fallo, resolución o disposición publicados en el portal que el infractor no abrió: la Dirección lo
        // considera notificado (como con el acta) y empieza a correr el plazo que corresponda.
        check(gestion, 'Sin permiso', 403);
        const { data: doc } = await db.from('documento').select('id, titulo').eq('uuid', txt('documentoUuid')).eq('infraccion_id', c.id).maybeSingle();
        check(doc, 'Documento inexistente', 404);
        const { data: pend } = await db.from('notificacion').select('id, objeto').eq('infraccion_id', c.id).eq('documento_id', (doc as { id: number }).id).eq('estado', 'pendiente');
        check((pend ?? []).length, 'Ese documento no tiene una notificación pendiente', 409);
        await historial(db, c.id, quien, 'Considerado notificado', `${(doc as { titulo: string }).titulo}: el infractor tuvo tiempo suficiente para verlo en el portal.`);
        for (const n of (pend ?? []) as { id: number; objeto: string }[]) {
          await db.from('notificacion').update({ estado: 'positiva', via: 'considerada', fecha_resultado: Date.now(), registrado_por: quien }).eq('id', n.id);
          await efectoNotificacionPositiva(db, await causaPorUuid(db, c.uuid as string), n.objeto, quien);
        }
        return { ok: true };
      }
      case 'emitir_boleta': {
        check(puede(user.rol, 'emitirBoletas'), 'Sin permiso', 403);
        check(['auto', 'voluntario', 'total', 'cuotas', 'cuotas_sin'].includes(txt('modo')), 'Modo inválido');
        // Descuento (decisión 22/10): «auto» aplica el 50 % si corresponde (sin descargo ni fallo); «total» lo quita, con motivo.
        // Reunión 27/10: las cuotas siguen la misma regla («cuotas» = con 50 % si corresponde; «cuotas_sin» lo quita).
        const corresponde = await correspondeDescuento(db, c);
        check(!(txt('modo') === 'voluntario' && !corresponde), 'No corresponde el descuento: el infractor presentó descargo o la causa ya tiene fallo', 409);
        if (['total', 'cuotas_sin'].includes(txt('modo')) && corresponde) {
          check(txt('motivo'), 'Indique por qué se quita el descuento');
          await historial(db, c.id, quien, 'Descuento del pago voluntario quitado', txt('motivo'));
        }
        const enCuotas = txt('modo').startsWith('cuotas');
        const modo = (enCuotas ? 'cuotas' : txt('modo') === 'auto' ? (corresponde ? 'voluntario' : 'total') : txt('modo')) as 'voluntario' | 'total' | 'cuotas';
        if (enCuotas) check(Number(d.cuotas) >= 2 && Number(d.cuotas) <= 12, 'Indique entre 2 y 12 cuotas');
        return emitirBoletas(db, c, modo, Number(d.cuotas ?? 1), txt('aNombre') || String(c.infractor_razon_social || c.infractor_nombre || ''), quien, { cuotasConDescuento: txt('modo') === 'cuotas' && corresponde });
      }
      case 'emitir_estadia': {
        check(puede(user.rol, 'emitirBoletas'), 'Sin permiso', 403);
        const ingreso = Number(d.ingresoAt);
        check(ingreso > 0, 'Indique la fecha de ingreso al depósito');
        const dias = diasEnDeposito(ingreso);
        const est = await tarifaEstadia(db, claseVehiculo(c.vehiculo_tipo_nombre as string | null), dias);
        if (est.monto <= 0) {
          // Estadía sin cargo: constancia en PDF en lugar de una boleta por $0.
          await db.from('infraccion').update({ estadia_ingreso_at: ingreso }).eq('id', c.id);
          return { constancia: await constanciaSinMonto(db, c, quien, txt('aNombre') || String(c.infractor_nombre || ''), 'estadia') };
        }
        const { reservar } = await import('@/lib/acta-srv');
        const num = await reservar(db, `BOL-${new Date().getFullYear()}`);
        await db.from('infraccion').update({ estadia_ingreso_at: ingreso }).eq('id', c.id);
        await db.from('boleta').insert({ uuid: uuid(), infraccion_id: c.id, numero: `M2000-${String(num).padStart(7, '0')}`, concepto: `Estadía en depósito (${dias} días) · Acta ${c.legajo_numero_acta}`, detalle_json: JSON.stringify({ dias, tramo: est.tramo }), monto: est.monto, vencimiento: Date.now() + (await validezLiberacionMs(db)), a_nombre_de: txt('aNombre') || c.infractor_nombre, estado: 'emitida', date_created: Date.now() });
        await historial(db, c.id, quien, 'Boleta de estadía emitida', `${dias} días (${est.tramo}): ${pesos(est.monto)}`);
        return { ok: true };
      }
      case 'informar_pago': {
        await db.from('boleta').update({ estado: 'a_verificar', pagado_at: Date.now() }).eq('uuid', txt('boletaUuid')).eq('infraccion_id', c.id);
        await historial(db, c.id, quien, 'Pago informado', 'Queda «a verificar» hasta la acreditación de Malvinas 2000.');
        return { ok: true };
      }
      case 'confirmar_pago': {
        check(puede(user.rol, 'confirmarPagos'), 'Sin permiso', 403);
        const { data } = await db.from('boleta').select('*').eq('uuid', txt('boletaUuid')).eq('infraccion_id', c.id).maybeSingle();
        check(data, 'Boleta inexistente', 404);
        const b = data as { id: number; numero: string; monto: number; pagado_at: number | null };
        await db.from('boleta').update({ estado: 'definitiva', pagado_at: b.pagado_at ?? Date.now(), confirmado_por: quien }).eq('id', b.id);
        await db.from('boleta').update({ acreditado_at: Date.now() }).eq('id', b.id); // sql/032 (informe del Tribunal de Cuentas)
        await historial(db, c.id, quien, 'Pago acreditado (definitivo)', `Boleta ${b.numero} · ${pesos(Number(b.monto))}`);
        await evaluarArchivoPorPago(db, c, quien);
        return { ok: true };
      }
      // Confirmación manual por demora del clearing (minuta 20/10): el agente acredita el pago con el comprobante del
      // infractor adjunto y bajo su responsabilidad. La boleta queda paga, marcada «a conciliar» hasta que llegue la acreditación.
      case 'confirmar_pago_manual': {
        check(puede(user.rol, 'confirmarPagos'), 'Sin permiso', 403);
        const { data } = await db.from('boleta').select('*').eq('uuid', txt('boletaUuid')).eq('infraccion_id', c.id).maybeSingle();
        check(data, 'Boleta inexistente', 404);
        const b = data as { id: number; numero: string; monto: number; estado: string; pagado_at: number | null; detalle_json: string | null };
        check(['emitida', 'a_verificar', 'vencida'].includes(b.estado), 'La boleta ya está acreditada o anulada', 409);
        check(txt('archivoRaw').startsWith('data:'), 'Adjunte el comprobante de pago (foto o PDF)');
        check(txt('declaracion') === 'si', 'Debe aceptar la declaración de responsabilidad');
        await controlarAdjuntos(db, [{ nombre: txt('archivoNombre'), raw: txt('archivoRaw') }]);
        const docUuid = uuid();
        await db.from('documento').insert({ uuid: docUuid, infraccion_id: c.id, tipo: 'adjunto', titulo: `Comprobante de pago · Boleta ${b.numero}`, archivo_nombre: txt('archivoNombre') || 'comprobante', archivo_raw: txt('archivoRaw'), estado: 'definitivo', creado_por: quien, date_created: Date.now() });
        let det: Record<string, unknown> = {};
        try { det = JSON.parse(b.detalle_json || '{}') as Record<string, unknown>; } catch { det = {}; }
        const conciliacion = { estado: 'pendiente', comprobante: docUuid, confirmadoPor: quien, confirmadoAt: Date.now(), detalle: txt('detalle') || null };
        await db.from('boleta').update({ estado: 'definitiva', pagado_at: b.pagado_at ?? Date.now(), confirmado_por: `${quien} (manual)`, detalle_json: JSON.stringify({ ...det, conciliacion }) }).eq('id', b.id);
        await db.from('boleta').update({ acreditado_at: Date.now() }).eq('id', b.id);
        await historial(db, c.id, quien, 'Pago confirmado manualmente (a conciliar)', `Boleta ${b.numero} · ${pesos(Number(b.monto))} · con comprobante adjunto y declaración de responsabilidad${txt('detalle') ? ` · ${txt('detalle')}` : ''}`);
        await evaluarArchivoPorPago(db, c, quien);
        return { ok: true };
      }
      // Conciliación de un pago confirmado a mano: llegó la acreditación (ok) o no se acreditó (rechazado: vuelve a emitida).
      case 'conciliar_pago': {
        check(puede(user.rol, 'confirmarPagos'), 'Sin permiso', 403);
        const { data } = await db.from('boleta').select('*').eq('uuid', txt('boletaUuid')).eq('infraccion_id', c.id).maybeSingle();
        check(data, 'Boleta inexistente', 404);
        const b = data as { id: number; numero: string; monto: number; detalle_json: string | null };
        let det: Record<string, unknown> = {};
        try { det = JSON.parse(b.detalle_json || '{}') as Record<string, unknown>; } catch { det = {}; }
        const conc = (det.conciliacion ?? null) as Record<string, unknown> | null;
        check(conc && conc.estado === 'pendiente', 'La boleta no tiene un pago a conciliar', 409);
        const ok = txt('resultado') !== 'rechazado';
        det.conciliacion = { ...conc, estado: ok ? 'conciliado' : 'rechazado', conciliadoPor: quien, conciliadoAt: Date.now() };
        await db.from('boleta').update(ok ? { detalle_json: JSON.stringify(det) } : { estado: 'emitida', pagado_at: null, confirmado_por: null, detalle_json: JSON.stringify(det) }).eq('id', b.id);
        if (!ok) await db.from('boleta').update({ acreditado_at: null }).eq('id', b.id);
        await historial(db, c.id, quien, ok ? 'Pago conciliado' : 'Pago no acreditado en la conciliación', `Boleta ${b.numero} · ${pesos(Number(b.monto))}${ok ? '' : ' · la boleta vuelve a quedar impaga. Revise el estado de la causa.'}${txt('detalle') ? ` · ${txt('detalle')}` : ''}`);
        return { ok: true };
      }
      case 'continuar_procedimiento': {
        check(gestion, 'Sin permiso', 403);
        const { data: fallos } = await db.from('documento').select('id, plantilla!inner(codigo)').eq('infraccion_id', c.id).eq('plantilla.codigo', 'FALLO_CONDENATORIO').in('estado', ['firmado', 'definitivo']);
        await db.from('boleta').update({ estado: 'vencida' }).eq('infraccion_id', c.id).eq('estado', 'emitida');
        if ((fallos ?? []).length) {
          await cambiarEstado(db, c, 'En Apremios', quien, 'Caducidad del plan de cuotas', 'Cuotas impagas de un fallo: se deriva a Apremios.');
        } else {
          await cambiarEstado(db, c, 'Notificado', quien, 'Caducidad del plan de cuotas', 'Cuotas impagas: la causa continúa a fallo.', { vence_plazo_at: Date.now() - 1000 });
        }
        return { ok: true };
      }
      case 'derivar': {
        check(gestion, 'Sin permiso', 403);
        const destino = txt('destino') === 'juzgado' ? 'En Juzgado' : 'En Apremios';
        await cambiarEstado(db, c, destino, quien, `Derivación a ${destino === 'En Juzgado' ? 'Juzgado de Paz' : 'Apremios'}`, txt('detalle') || 'Se remite el legajo completo en PDF.');
        return { ok: true };
      }
      // Recursos (minuta 20/10, apartado F): elevación, seguimiento y sentencia.
      case 'elevar_recurso': {
        check(gestion, 'Sin permiso', 403);
        await elevarRecurso(db, c, quien, { instancia: txt('instancia'), expediente: txt('expediente'), fecha: Number(d.fechaAt) || Date.now(), tipo: txt('tipo'), detalle: txt('detalle') });
        return { ok: true };
      }
      case 'movimiento_recurso': {
        check(gestion, 'Sin permiso', 403);
        await movimientoRecurso(db, c, quien, txt('recursoUuid'), { fecha: Number(d.fechaAt) || Date.now(), texto: txt('texto'), expediente: txt('expediente') });
        return { ok: true };
      }
      case 'resolver_recurso': {
        check(gestion, 'Sin permiso', 403);
        await controlarAdjuntos(db, [{ nombre: txt('archivoNombre'), raw: txt('archivoRaw') }]);
        await resolverRecurso(db, c, quien, txt('recursoUuid'), { resultado: txt('resultado'), monto: d.monto ? Number(d.monto) : null, detalle: txt('detalle'), archivoRaw: txt('archivoRaw'), archivoNombre: txt('archivoNombre'), aNombre: txt('aNombre') });
        return { ok: true };
      }
      // Exportación «Juzgado de Paz» o «Solo PDF» (el PDF lo arma el navegador): queda constancia en el historial.
      case 'registrar_exportacion': {
        check(gestion, 'Sin permiso', 403);
        await historial(db, c.id, quien, txt('destino') === 'juzgado' ? 'Legajo exportado para el Juzgado de Paz' : 'Legajo exportado en PDF', `${Number(d.piezas) || 0} pieza(s)`);
        return { ok: true };
      }
      case 'resultado_externo': {
        check(gestion, 'Sin permiso', 403);
        check(DESTINOS_EXTERNOS.includes(txt('estado')), 'Resultado inválido');
        await cambiarEstado(db, c, txt('estado'), quien, 'Resultado informado por organismo externo', txt('detalle') || null);
        return { ok: true };
      }
      case 'presentacion_mesa': {
        check(gestion, 'Sin permiso', 403);
        check(['descargo', 'pago_voluntario', 'boleta', 'cuotas', 'apelacion'].includes(txt('tipo')), 'Tipo inválido');
        // Mismas reglas que en el portal: pago voluntario y descargo excluyentes (tránsito), un descargo por vez, plazos.
        const { data: presM } = await db.from('presentacion').select('id, tipo, estado, reenvio_de').eq('infraccion_id', c.id);
        const { count: bolM } = await db.from('boleta').select('*', { count: 'exact', head: true }).eq('infraccion_id', c.id).in('estado', ['emitida', 'a_verificar', 'definitiva']);
        const acc = accionesDisponibles(c, (presM ?? []) as Presentacion[], bolM ?? 0)[txt('tipo')];
        check(acc?.ok, acc?.motivo ?? 'No corresponde en este estado', 409);
        await db.from('presentacion').insert({ uuid: uuid(), infraccion_id: c.id, origen: 'mesa', tipo: txt('tipo'), texto: txt('texto'), cuotas_solicitadas: d.cuotas ? Number(d.cuotas) : null, estado: 'pendiente', date_created: Date.now() });
        await historial(db, c.id, quien, 'Presentación registrada en mesa', `${txt('tipo')}: ${txt('texto')}`);
        return { ok: true };
      }
      case 'corregir_ejido':
        // Minuta 20/10: dominio, lugar de la falta y ejido son inalterables una vez firmada el acta.
        throw new HttpError(410, 'El ejido del acta no se puede modificar.');
      case 'memo': {
        check(puede(user.rol, 'memos'), 'Sin permiso', 403);
        const texto = txt('texto');
        check(texto, 'Escriba el memo');
        await db.from('memo').insert({ uuid: uuid(), infraccion_id: c.id, texto, usuario: quien, fecha: Date.now() });
        // El memo no cambia el estado. En el historial queda solo un extracto.
        await historial(db, c.id, quien, 'Memo interno agregado', texto.length > 60 ? `${texto.slice(0, 60)}…` : texto);
        return { ok: true };
      }
      // Liberación del vehículo en dos pasos (Informe 6.c y Anexo V): 1) boleta de acarreo y estadía, que se cobra al retirar;
      // 2) con esa boleta paga y la disposición de levantamiento firmada por la Directora, se registra la liberación efectiva.
      case 'liberar_vehiculo': {
        check(puede(user.rol, 'retenciones'), 'Sin permiso', 403);
        check(Number(c.retencion_de_vehiculo) === 1, 'El acta no tiene retención de vehículo');
        check(!c.vehiculo_liberado_at, 'El vehículo ya fue liberado', 409);
        const { data: bolLib } = await db.from('boleta').select('id, detalle_json').eq('infraccion_id', c.id).neq('estado', 'anulada');
        check(!((bolLib ?? []) as { detalle_json: string | null }[]).some((b) => esBoletaLiberacion(b)), 'La boleta de acarreo y estadía ya fue emitida', 409);
        const ingreso = Number(d.ingresoAt) || Number(c.estadia_ingreso_at) || Number(c.firmada_at);
        check(ingreso > 0, 'Indique la fecha de ingreso al depósito');
        const calc = await calculoLiberacion(db, c.vehiculo_tipo_nombre as string | null, ingreso);
        const { reservar } = await import('@/lib/acta-srv');
        const num = await reservar(db, `BOL-${new Date().getFullYear()}`);
        const aNombre = txt('aNombre') || String(c.infractor_razon_social || c.infractor_nombre || '');
        await db.from('boleta').insert({ uuid: uuid(), infraccion_id: c.id, numero: `M2000-${String(num).padStart(7, '0')}`, concepto: `Liberación de vehículo: acarreo y estadía (${calc.dias} días) · Acta ${c.legajo_numero_acta}`, detalle_json: JSON.stringify({ liberacion: true, ...calc }), monto: calc.total, vencimiento: Date.now() + (await validezLiberacionMs(db)), a_nombre_de: aNombre, estado: 'emitida', date_created: Date.now() });
        // La liberación todavía no se registra: falta el pago de esta boleta y la disposición de levantamiento firmada.
        await db.from('infraccion').update({ estadia_ingreso_at: ingreso, vehiculo_liberacion_json: JSON.stringify(calc) }).eq('id', c.id);
        await historial(db, c.id, quien, 'Boleta de acarreo y estadía emitida', `${calc.claseNombre} · ${calc.dias} días · acarreo ${pesos(calc.acarreo)} + estadía ${pesos(calc.estadia)} (${calc.tramo}) = ${pesos(calc.total)}. La liberación se registra con la boleta paga y la disposición de levantamiento firmada.`);
        // Si la retención es la medida vigente, queda la disposición de levantamiento en borrador para revisión y firma.
        let disposicion: string | null = null;
        if (Number(c.medida_vigente) === 1) {
          const { data: pl } = await db.from('plantilla').select('id').eq('codigo', 'DISPOSICION_LEVANTAMIENTO').maybeSingle();
          const { data: ya } = await db.from('documento').select('id, plantilla!inner(codigo)').eq('infraccion_id', c.id).eq('plantilla.codigo', 'DISPOSICION_LEVANTAMIENTO').limit(1);
          if (pl && !(ya ?? []).length) disposicion = (await generarEscrito(db, user, c, (pl as { id: number }).id)).uuid;
        }
        return { ...calc, disposicion };
      }
      case 'registrar_liberacion': {
        check(puede(user.rol, 'retenciones'), 'Sin permiso', 403);
        check(Number(c.retencion_de_vehiculo) === 1, 'El acta no tiene retención de vehículo');
        check(!c.vehiculo_liberado_at, 'El vehículo ya fue liberado', 409);
        const { data: disp } = await db.from('documento').select('id, numero, plantilla!inner(codigo)').eq('infraccion_id', c.id).eq('plantilla.codigo', 'DISPOSICION_LEVANTAMIENTO').in('estado', ['firmado', 'definitivo']).limit(1);
        check((disp ?? []).length > 0, 'Falta la disposición de levantamiento firmada por la Directora', 409);
        const { data: bolLib } = await db.from('boleta').select('estado, detalle_json, vencimiento, monto').eq('infraccion_id', c.id);
        const lib = boletasLiberacionActivas((bolLib ?? []) as BoletaLib[]);
        if (lib.length) {
          check(lib.every((b) => b.estado === 'definitiva'), 'La boleta de acarreo y estadía todavía no está acreditada', 409);
          // Con la boleta vencida no se libera: corresponde la boleta complementaria por la estadía adicional (minuta 20/10).
          const est = calcularEstadoLiberacion(c as unknown as CausaLib, (bolLib ?? []) as BoletaLib[], await validezLiberacionMs(db));
          check(est.estado !== 'vencida', 'La boleta de acarreo y estadía venció: emita la boleta complementaria por la estadía adicional', 409);
        } else check(d.sinBoleta === true, 'No se emitió la boleta de acarreo y estadía: confirme que se libera sin cobrarla', 409);
        // Entrega presencial en la sede de Faltas (minuta 20/10): se acreditan los requisitos uno por uno.
        const requisitos = (Array.isArray(d.requisitos) ? d.requisitos : []).map(String);
        const faltan = REQUISITOS_LIBERACION.filter((r) => !requisitos.includes(r));
        check(!faltan.length, `Falta acreditar: ${faltan.join(', ').toLowerCase()}`, 409);
        const n = (disp as { numero: string | null }[])[0].numero;
        await db.from('infraccion').update({ vehiculo_liberado_at: Date.now() }).eq('id', c.id);
        await historial(db, c.id, quien, 'Vehículo liberado', `Disposición de levantamiento${n ? ` N° ${n}` : ''}${lib.length ? ' · acarreo y estadía pagos' : ' · sin boleta de acarreo y estadía'} · Entrega presencial: ${REQUISITOS_LIBERACION.join(', ').toLowerCase()} acreditados${txt('detalle') ? ` · ${txt('detalle')}` : ''}`);
        return { ok: true };
      }
      // Liberación vencida (minuta 20/10): el corralón no entrega y Faltas emite la boleta complementaria con la diferencia de
      // acarreo y estadía a hoy. Las boletas impagas vencidas quedan «vencidas». Si no hay diferencia, se renueva la validez.
      case 'boleta_complementaria': {
        check(puede(user.rol, 'retenciones') || puede(user.rol, 'emitirBoletas'), 'Sin permiso', 403);
        check(Number(c.retencion_de_vehiculo) === 1, 'El acta no tiene retención de vehículo');
        const { data: bol } = await db.from('boleta').select('uuid, estado, detalle_json, vencimiento, monto').eq('infraccion_id', c.id);
        const boletas = (bol ?? []) as (BoletaLib & { uuid: string })[];
        const ahora = Date.now();
        const validez = await validezLiberacionMs(db);
        const impagasVencidas = boletasLiberacionActivas(boletas).filter((b) => b.estado !== 'definitiva' && Number(b.vencimiento) < ahora) as (BoletaLib & { uuid: string })[];
        const est = calcularEstadoLiberacion(c as unknown as CausaLib, boletas, validez, ahora);
        check(est.estado === 'vencida' || (est.estado === 'pendiente_pago' && impagasVencidas.length === boletasLiberacionActivas(boletas).filter((b) => b.estado !== 'definitiva').length),
          'La liberación no está vencida: no corresponde boleta complementaria', 409);
        if (impagasVencidas.length) await db.from('boleta').update({ estado: 'vencida' }).in('uuid', impagasVencidas.map((b) => b.uuid));
        const ingreso = Number(c.estadia_ingreso_at) || Number(c.firmada_at);
        const calc = await calculoLiberacion(db, c.vehiculo_tipo_nombre as string | null, ingreso, ahora);
        const diferencia = Math.max(0, calc.total - est.pagado);
        const json = datosLiberacion(c as unknown as CausaLib);
        if (diferencia > 0) {
          const { reservar } = await import('@/lib/acta-srv');
          const num = await reservar(db, `BOL-${new Date().getFullYear()}`);
          await db.from('boleta').insert({ uuid: uuid(), infraccion_id: c.id, numero: `M2000-${String(num).padStart(7, '0')}`, concepto: `Liberación de vehículo: complementaria por estadía adicional (${calc.dias} días) · Acta ${c.legajo_numero_acta}`, detalle_json: JSON.stringify({ liberacion: true, complementaria: true, ...calc, pagadoAntes: est.pagado }), monto: diferencia, vencimiento: ahora + validez, a_nombre_de: txt('aNombre') || String(c.infractor_razon_social || c.infractor_nombre || ''), estado: 'emitida', date_created: ahora });
        }
        await db.from('infraccion').update({ vehiculo_liberacion_json: JSON.stringify({ ...json, ...calc, vigenteHasta: diferencia > 0 ? null : ahora + validez }) }).eq('id', c.id);
        await historial(db, c.id, quien, diferencia > 0 ? 'Boleta complementaria de liberación emitida' : 'Validez de la liberación renovada',
          diferencia > 0 ? `${calc.dias} días · total a hoy ${pesos(calc.total)} − pagado ${pesos(est.pagado)} = ${pesos(diferencia)}. Con la boleta paga, la liberación vuelve a estar vigente.` : `Sin diferencia a cobrar (${calc.dias} días, ${calc.tramo}). Vigente por ${Math.round(validez / 3600000)} h.`);
        return { diferencia, ...calc };
      }
      // El corralón registra la entrega del vehículo, después de controlar el QR (liberación vigente).
      case 'entrega_corralon': {
        check(puede(user.rol, 'retenciones'), 'Sin permiso', 403);
        const { data: bol } = await db.from('boleta').select('estado, detalle_json, vencimiento, monto').eq('infraccion_id', c.id);
        const est = calcularEstadoLiberacion(c as unknown as CausaLib, (bol ?? []) as BoletaLib[], await validezLiberacionMs(db));
        check(est.estado === 'vigente', est.estado === 'entregado' ? 'El vehículo ya fue entregado' : est.estado === 'vencida' ? 'La liberación está vencida: no se entrega' : 'La liberación todavía no está registrada en Faltas', 409);
        await db.from('infraccion').update({ vehiculo_liberacion_json: JSON.stringify({ ...datosLiberacion(c as unknown as CausaLib), entregadoAt: Date.now(), entregadoPor: quien, retiro: txt('retiro') || null }) }).eq('id', c.id);
        await historial(db, c.id, quien, 'Vehículo entregado en el corralón', txt('retiro') ? `Retiró: ${txt('retiro')}` : 'Liberación vigente controlada por QR');
        return { ok: true };
      }
      case 'asignar_responsable': {
        // Reunión 27/10: el responsable se puede cambiar a mano; con «Asignar a este usuario» queda fijo.
        check(gestion, 'Sin permiso', 403);
        const usuario = txt('usuario') || quien;
        const fijo = d.fijo === true || d.fijo === 1 || d.fijo === '1';
        const { error } = await db.from('infraccion').update({ responsable: usuario, responsable_fijo: fijo ? 1 : 0 }).eq('id', c.id);
        if (error) throw new HttpError(409, 'Falta correr sql/035 en la base para usar el responsable de la causa.');
        await db.from('causa_historial').insert({ infraccion_id: c.id, fecha: Date.now(), usuario: quien, accion: 'Responsable de la causa', detalle: `${usuario}${fijo ? ' (asignado fijo)' : ''}` });
        return { ok: true };
      }
      case 'correo_infractor': {
        check(gestion, 'Sin permiso', 403);
        const correo = txt('correo').toLowerCase();
        check(!correo || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo), 'Correo electrónico inválido');
        await db.from('infraccion').update({ infractor_email: correo || null }).eq('id', c.id);
        await historial(db, c.id, quien, 'Correo del infractor actualizado', correo || 'Se quitó el correo');
        return { ok: true };
      }
      default:
        throw new HttpError(400, 'Acción desconocida');
    }
  }, 'verCausas');
}
