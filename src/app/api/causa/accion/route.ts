import { NextRequest } from 'next/server';
import { emitirBoletas, evaluarArchivoPorPago, generarEscrito, notificarDocumento } from '@/lib/causa-srv';
import { ESTADOS, estadoFinal, puede, pesos } from '@/lib/dominio';
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
      case 'cambiar_estado': {
        check(puede(user.rol, 'cambiarEstadoManual'), 'Sin permiso', 403);
        check(ESTADOS.some((e) => e.nombre === txt('estado')), 'Estado inválido');
        check(txt('motivo'), 'Indique el motivo del cambio manual');
        await cambiarEstado(db, c, txt('estado'), quien, 'Cambio manual de estado', txt('motivo'));
        return { ok: true };
      }
      case 'desestimar': {
        check(gestion, 'Sin permiso', 403);
        check(txt('motivo'), 'Indique el motivo');
        check(!estadoFinal(c.estado_faltas), 'La causa ya está cerrada');
        await cambiarEstado(db, c, 'Desestimada', quien, 'Causa desestimada', txt('motivo'));
        return { ok: true };
      }
      case 'subsanar': {
        check(gestion, 'Sin permiso', 403);
        check(txt('detalle'), 'Describa la corrección');
        const html = `<p><strong>CONSTANCIA DE SUBSANACIÓN</strong></p><p>Acta ${c.legajo_numero_acta}. ${txt('detalle').replace(/</g, '&lt;')}</p><p>El acta firmada no se modifica: esta constancia integra el legajo.</p>`;
        await db.from('documento').insert({ uuid: uuid(), infraccion_id: c.id, tipo: 'escrito', titulo: 'Constancia de subsanación', contenido_html: html, estado: 'definitivo', creado_por: quien, date_created: Date.now(), date_updated: Date.now() });
        await historial(db, c.id, quien, 'Subsanación de datos', txt('detalle'));
        return { ok: true };
      }
      case 'adjuntar': {
        check(txt('archivoRaw').startsWith('data:'), 'Archivo inválido');
        await db.from('documento').insert({ uuid: uuid(), infraccion_id: c.id, tipo: 'adjunto', titulo: txt('titulo') || txt('archivoNombre'), archivo_nombre: txt('archivoNombre'), archivo_raw: txt('archivoRaw'), estado: 'definitivo', creado_por: quien, date_created: Date.now() });
        await historial(db, c.id, quien, 'Documento adjuntado', txt('titulo') || txt('archivoNombre'));
        return { ok: true };
      }
      case 'archivar': {
        check(gestion, 'Sin permiso', 403);
        const motivo = txt('motivo');
        check(motivo.startsWith('Archiv'), 'Seleccione el tipo de archivo');
        await cambiarEstado(db, c, motivo, quien, 'Causa archivada', txt('detalle') || null);
        return { ok: true };
      }
      case 'reingresar': {
        check(gestion, 'Sin permiso', 403);
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
      case 'generar_escrito': {
        check(puede(user.rol, 'redactarEscritos'), 'Sin permiso', 403);
        return generarEscrito(db, user, c, Number(d.plantillaId));
      }
      case 'notificar_documento': {
        check(gestion, 'Sin permiso', 403);
        const { data } = await db.from('documento').select('id').eq('uuid', txt('documentoUuid')).single();
        check(data, 'Documento inexistente', 404);
        return notificarDocumento(db, (data as { id: number }).id, quien);
      }
      case 'emitir_boleta': {
        check(gestion, 'Sin permiso', 403);
        const modo = txt('modo') as 'voluntario' | 'total' | 'cuotas';
        check(['voluntario', 'total', 'cuotas'].includes(modo), 'Modo inválido');
        return emitirBoletas(db, c, modo, Number(d.cuotas ?? 1), txt('aNombre') || String(c.infractor_razon_social || c.infractor_nombre || ''), quien);
      }
      case 'emitir_estadia': {
        check(gestion, 'Sin permiso', 403);
        const ingreso = Number(d.ingresoAt);
        check(ingreso > 0, 'Indique la fecha de ingreso al depósito');
        const dias = Math.max(1, Math.ceil((Date.now() - ingreso) / 86400000));
        const diaria = await configNum(db, 'finanza_estadia_diaria', 8000);
        const { reservar } = await import('@/lib/acta-srv');
        const num = await reservar(db, `BOL-${new Date().getFullYear()}`);
        await db.from('infraccion').update({ estadia_ingreso_at: ingreso }).eq('id', c.id);
        await db.from('boleta').insert({ uuid: uuid(), infraccion_id: c.id, numero: `M2000-${String(num).padStart(7, '0')}`, concepto: `Estadía en depósito (${dias} días) · Acta ${c.legajo_numero_acta}`, detalle_json: JSON.stringify({ dias, diaria }), monto: dias * diaria, vencimiento: Date.now() + 5 * 86400000, a_nombre_de: txt('aNombre') || c.infractor_nombre, estado: 'emitida', date_created: Date.now() });
        await historial(db, c.id, quien, 'Boleta de estadía emitida', `${dias} días × ${pesos(diaria)}`);
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
        await historial(db, c.id, quien, 'Pago acreditado (definitivo)', `Boleta ${b.numero} · ${pesos(Number(b.monto))}`);
        await evaluarArchivoPorPago(db, c, quien);
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
      case 'resultado_externo': {
        check(gestion, 'Sin permiso', 403);
        check(DESTINOS_EXTERNOS.includes(txt('estado')), 'Resultado inválido');
        await cambiarEstado(db, c, txt('estado'), quien, 'Resultado informado por organismo externo', txt('detalle') || null);
        return { ok: true };
      }
      case 'presentacion_mesa': {
        check(gestion, 'Sin permiso', 403);
        check(['descargo', 'pago_voluntario', 'boleta', 'cuotas', 'apelacion'].includes(txt('tipo')), 'Tipo inválido');
        await db.from('presentacion').insert({ uuid: uuid(), infraccion_id: c.id, origen: 'mesa', tipo: txt('tipo'), texto: txt('texto'), cuotas_solicitadas: d.cuotas ? Number(d.cuotas) : null, estado: 'pendiente', date_created: Date.now() });
        await historial(db, c.id, quien, 'Presentación registrada en mesa', `${txt('tipo')}: ${txt('texto')}`);
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
