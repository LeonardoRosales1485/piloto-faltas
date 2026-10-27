import { modulosDe, type ModuloActa } from './dominio';
import { valoresVigentes } from './causa-srv';
import { causaPorUuid, check, configNum, historial, HttpError, nombreUsuario, sha, type Db } from './srv';
import { ahoraArgentina, formatearNumeroActa, resolverLeyes, TIPOS_ACTA, tipoActa } from './dominio';
import type { UsuarioRow } from './types';

export async function reservar(d: Db, serie: string): Promise<number> {
  const { data, error } = await d.rpc('reservar_numero', { p_serie: serie });
  if (error) throw new HttpError(500, `No se pudo reservar número: ${error.message}`);
  return Number(data);
}

/** Crea el borrador del acta con número de su serie y legajo común ya reservados (RN-02, RN-03). */
/** Horas sin firmar tras las cuales el borrador de un inspector se da por abandonado (app cerrada a mitad del acta). */
const HORAS_BORRADOR_ABANDONADO = 12;

/** Anula borradores como «Acta abandonada» (número anulado, con historial). */
async function anularAbandonados(d: Db, filas: { id: number }[], motivo: string) {
  for (const f of filas) {
    await d.from('infraccion').update({ estado_faltas: 'Anulada', anulada_motivo: motivo }).eq('id', f.id).eq('estado_faltas', 'Borrador');
    await historial(d, f.id, 'Sistema', 'Acta abandonada', motivo, { anterior: 'Borrador', nuevo: 'Anulada' });
  }
}

/**
 * Borradores de inspectores que ya no se pueden retomar (no tienen listado ni «Guardar borrador»):
 * - los del mismo inspector, al empezar un acta nueva (cerró la app o salió sin pasar por el aviso);
 * - los de cualquier inspector con más de HORAS_BORRADOR_ABANDONADO horas sin firmar.
 * Los borradores del back office (Directora, Responsables, Administrador) no se tocan.
 */
export async function abandonarBorradores(d: Db, user: UsuarioRow) {
  if (user.rol === 'Inspector') {
    const { data } = await d.from('infraccion').select('id').eq('estado_faltas', 'Borrador').eq('inspector_username', user.username);
    await anularAbandonados(d, (data ?? []) as { id: number }[], 'Acta abandonada: el inspector empezó otra acta sin firmar esta');
  }
  const { data: insp } = await d.from('usuario').select('username').eq('rol', 'Inspector');
  const nombres = ((insp ?? []) as { username: string }[]).map((x) => x.username);
  if (!nombres.length) return;
  const limite = Date.now() - HORAS_BORRADOR_ABANDONADO * 3600 * 1000;
  const { data: viejos } = await d.from('infraccion').select('id').eq('estado_faltas', 'Borrador').in('inspector_username', nombres).lt('date_created', limite);
  await anularAbandonados(d, (viejos ?? []) as { id: number }[], `Acta abandonada: más de ${HORAS_BORRADOR_ABANDONADO} horas sin firmar`);
}

export async function iniciarActa(d: Db, user: UsuarioRow, tipoNombre: string, uuid: string) {
  // Antes de reservar un número nuevo: dar por abandonados los borradores que ya no se pueden retomar.
  try { await abandonarBorradores(d, user); } catch { /* no impide labrar */ }
  const tipo = tipoActa(tipoNombre);
  const info = TIPOS_ACTA[tipo];
  const nActa = await reservar(d, info.serie);
  const nLeg = await reservar(d, 'LEG');
  // Hora del servidor expresada en hora argentina (el servidor corre en UTC: sin esto quedaba 3 h adelantada).
  const ahora = ahoraArgentina();
  const fecha = ahora.iso;
  const row = {
    uuid,
    infraccion_tipo_id: info.id,
    infraccion_tipo_nombre: tipo,
    legajo_numero_acta: formatearNumeroActa(info.serie, nActa),
    legajo_number: String(nLeg),
    legajo_anio: String(ahora.anio),
    legajo_fecha: fecha,
    estado: 'Activo',
    estado_faltas: 'Borrador',
    situacion_infractor: null,
    infractor_provincia_nombre: 'Buenos Aires',
    infractor_partido_nombre: 'Malvinas Argentinas',
    inspector_username: user.username,
    inspector_nombre: nombreUsuario(user),
    inspector_legajo: (user as { legajo?: string | null }).legajo ?? null,
    inspector_dependencia: user.sector ?? null,
    date_created: Date.now(),
  };
  const { data, error } = await d.from('infraccion').insert(row).select('*').single();
  if (error) throw new HttpError(500, error.message);
  return data as { id: number; uuid: string };
}

export async function montoEstimado(d: Db, infraccionId: number): Promise<number> {
  const uf = await configNum(d, 'finanza_unidad_fija', 2000);
  const { data: rel } = await d.from('infraccion_ley').select('ley_nombre').eq('infraccion_id', infraccionId);
  const nombres = ((rel ?? []) as { ley_nombre: string }[]).map((r) => r.ley_nombre);
  if (!nombres.length) return 0;
  const { data: leyes } = await d.from('ley').select('nombre, articulo, multiplicador');
  const unidades = resolverLeyes(nombres, (leyes ?? []) as { nombre: string; articulo: string; multiplicador: number }[]).reduce((acc, l) => acc + Number(l.multiplicador || 0), 0);
  return unidades * uf;
}

/** Valida y firma el acta. A partir de acá es inmutable y entra como causa «Iniciado». */
export async function firmarActa(d: Db, user: UsuarioRow, uuidActa: string, firmaInfractor: string | null) {
  const c = await causaPorUuid(d, uuidActa);
  check(c.estado_faltas === 'Borrador', 'El acta ya fue firmada o anulada', 409);
  check(modulosDe(user).includes(String(c.infraccion_tipo_nombre) as ModuloActa), 'No tiene autorizado labrar este tipo de acta', 403);
  check(user.firma_activa !== false, 'Su firma digital está inactiva: pida a la Dirección de Faltas que la habilite en «Inspectores».', 403);
  const sit = String(c.situacion_infractor ?? '');
  check(['presente', 'ausente', 'se_niega', 'nn'].includes(sit), 'Indique la situación del infractor');
  if (sit !== 'nn') {
    // Ausente: nombre y documento no son obligatorios (se cargan si se pueden constatar).
    if (sit !== 'ausente') check(String(c.infractor_nombre ?? '').trim() || String(c.infractor_razon_social ?? '').trim(), 'Complete el nombre o la razón social del infractor');
    // Ausente: el documento o CUIT no es obligatorio (se carga si se puede constatar).
    if (sit !== 'ausente') check(String(c.infractor_documento_numero ?? '').trim() || String(c.infractor_cuit ?? '').trim(), 'Complete el documento o CUIT del infractor');
    if (sit === 'presente' || sit === 'se_niega') {
      check(String(c.infractor_domicilio ?? '').trim(), 'Complete el domicilio del infractor');
    }
  }
  check(String(c.domicilio_infraccion_calle ?? '').trim(), 'Complete el lugar de infracción');
  if (String(c.infraccion_tipo_nombre) !== 'contravenciones') {
    check(String(c.vehiculo_numero_dominio ?? '').trim(), 'Complete el dominio del vehículo');
    check(String(c.vehiculo_tipo_nombre ?? '').trim(), 'Complete el tipo de vehículo');
    if (String(c.infraccion_tipo_nombre) === 'multas') {
      const meta = (() => { try { return JSON.parse(String(c.metadata_json ?? '{}')) as Record<string, string>; } catch { return {}; } })();
      check(String(meta.marca ?? '').trim(), 'Complete la marca del vehículo');
      check(String(meta.modelo ?? '').trim(), 'Complete el modelo del vehículo');
      check(String(meta.sentidoCirculacion ?? '').trim(), 'Complete el sentido de circulación');
    }
  }
  const { count: fotos } = await d.from('infraccion_imagen').select('*', { count: 'exact', head: true }).eq('infraccion_id', c.id);
  check((fotos ?? 0) > 0, 'Suba al menos una foto');
  const { count } = await d.from('infraccion_ley').select('*', { count: 'exact', head: true }).eq('infraccion_id', c.id);
  check((count ?? 0) > 0, 'Seleccione al menos un artículo');
  if (sit === 'presente') check(firmaInfractor && firmaInfractor.startsWith('data:image'), 'Falta la firma del infractor');

  const medidas = (() => { try { return JSON.parse(String(c.medidas_preventivas ?? '[]')) as string[]; } catch { return []; } })();
  const conMedida = Number(c.retencion_de_licencia) === 1 || Number(c.retencion_de_vehiculo) === 1 || medidas.length > 0;
  const ahora = Date.now();
  const hash = sha(JSON.stringify({ ...c, firma_infractor: firmaInfractor, firmante: user.username, ahora }));
  const monto = await montoEstimado(d, c.id);
  const { error } = await d
    .from('infraccion')
    .update({
      firma_infractor: sit === 'presente' ? firmaInfractor : null,
      firma_inspector_hash: hash,
      firmada_at: ahora,
      estado_faltas: 'Iniciado',
      medida_vigente: conMedida ? 1 : 0,
      monto_estimado: monto,
      legajo_caratula: `${c.legajo_numero_acta} · ${c.infractor_nombre || c.infractor_razon_social || 'NN'}`,
    })
    .eq('id', c.id);
  if (error) throw new HttpError(500, error.message);
  // Valores del momento del labrado (UF y múltiplos): la causa no cambia si después se actualizan las tarifas.
  // Si falta sql/023 la columna no existe y la causa usa los valores vigentes, como antes.
  await d.from('infraccion').update({ valores_labrado_json: JSON.stringify(await valoresVigentes(d, c)) }).eq('id', c.id);
  const firmante = nombreUsuario(user);
  await historial(d, c.id, firmante, 'Acta firmada', `Firma del inspector registrada (código ${hash.slice(0, 12)}). Situación del infractor: ${sit}.`, { anterior: 'Borrador', nuevo: 'Iniciado' });
  await historial(d, c.id, 'Sistema', 'Ingreso como causa', conMedida ? 'El acta trae medida preventiva: queda pendiente de resolución.' : null);
  return { uuid: c.uuid, hash };
}
