import { modulosDe, SITUACIONES_VALIDAS, textoSituacion, type ModuloActa } from './dominio';
import { valoresVigentes } from './causa-srv';
import { causaPorUuid, check, configNum, historial, HttpError, nombreUsuario, sha, type Db } from './srv';
import { ahoraArgentina, formatearNumeroActa, resolverLeyes, TIPOS_ACTA, tipoActa } from './dominio';
import type { UsuarioRow } from './types';

export async function reservar(d: Db, serie: string): Promise<number> {
  const { data, error } = await d.rpc('reservar_numero', { p_serie: serie });
  if (error) throw new HttpError(500, `No se pudo reservar número: ${error.message}`);
  return Number(data);
}

/**
 * Plazo de labrado (reunión 27/10): el acta abierta vence si no se firma ni se extiende a tiempo y queda
 * «Acta abandonada» (número anulado). Horas por tipo de acta en la configuración (Configuración → Labrado en el POS).
 */
export async function plazoLabradoMs(d: Db, tipo: string): Promise<number> {
  const defecto = tipo === 'multas' ? 1 : 24;
  const horas = await configNum(d, `labrado_plazo_horas_${tipo}`, defecto);
  return Math.max(0.05, horas) * 3600 * 1000;
}

/** Anula borradores como «Acta abandonada» (número anulado, con historial). */
async function anularAbandonados(d: Db, filas: { id: number }[], motivo: string) {
  for (const f of filas) {
    await d.from('infraccion').update({ estado_faltas: 'Anulada', anulada_motivo: motivo }).eq('id', f.id).eq('estado_faltas', 'Borrador');
    await historial(d, f.id, 'Sistema', 'Acta abandonada', motivo, { anterior: 'Borrador', nuevo: 'Anulada' });
  }
}

type BorradorPlazo = { id: number; uuid: string; infraccion_tipo_nombre: string; date_created: number; labrado_vence_at?: number | null };

/** Vencimiento del labrado: el guardado, o (actas anteriores a sql/034) la creación más el plazo de su tipo. */
async function venceDe(d: Db, b: BorradorPlazo): Promise<number> {
  return Number(b.labrado_vence_at) || Number(b.date_created) + (await plazoLabradoMs(d, b.infraccion_tipo_nombre));
}

/**
 * Da por abandonados los borradores de inspectores con el plazo de labrado vencido. Los del back office no se tocan.
 * Devuelve los borradores vigentes del inspector indicado (para retomarlos: el acta se termina sí o sí).
 */
export async function abandonarVencidos(d: Db, inspector?: string): Promise<BorradorPlazo[]> {
  const { data: insp } = await d.from('usuario').select('username').eq('rol', 'Inspector');
  const nombres = ((insp ?? []) as { username: string }[]).map((x) => x.username);
  if (!nombres.length) return [];
  const { data } = await d.from('infraccion').select('*').eq('estado_faltas', 'Borrador').in('inspector_username', nombres);
  const ahora = Date.now();
  const vigentes: BorradorPlazo[] = [];
  for (const b of (data ?? []) as (BorradorPlazo & { inspector_username: string })[]) {
    const vence = await venceDe(d, b);
    if (vence < ahora) await anularAbandonados(d, [b], `Acta abandonada: venció el plazo de labrado (${new Date(vence).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}) sin firmarla ni extenderlo`);
    else if (b.inspector_username === inspector) vigentes.push(b);
  }
  return vigentes;
}

/** Inspector con el plazo vencido: el acta queda abandonada y no se puede guardar ni firmar. */
export async function controlarPlazo(d: Db, user: UsuarioRow, c: { id: number; estado_faltas: string } & Record<string, unknown>) {
  if (user.rol !== 'Inspector' || c.estado_faltas !== 'Borrador') return;
  const vence = await venceDe(d, c as unknown as BorradorPlazo);
  if (vence >= Date.now()) return;
  await anularAbandonados(d, [c], 'Acta abandonada: venció el plazo de labrado sin firmarla ni extenderlo');
  throw new HttpError(409, 'Venció el plazo de labrado: el acta quedó abandonada (número anulado).');
}

/** Extiende el plazo de labrado del acta abierta (botón «Extender tiempo» del POS): suma el plazo de su tipo. */
export async function extenderLabrado(d: Db, user: UsuarioRow, uuidActa: string) {
  const c = await causaPorUuid(d, uuidActa);
  check(c.estado_faltas === 'Borrador', 'El acta ya no está abierta', 409);
  const b = c as unknown as BorradorPlazo;
  const vence = await venceDe(d, b);
  check(vence >= Date.now(), 'El plazo de labrado ya venció: el acta quedó abandonada', 409);
  const nuevo = vence + (await plazoLabradoMs(d, b.infraccion_tipo_nombre));
  const { error } = await d.from('infraccion').update({ labrado_vence_at: nuevo }).eq('id', c.id);
  if (error) throw new HttpError(500, 'Falta correr sql/034 (plazo de labrado)');
  await historial(d, c.id, nombreUsuario(user), 'Plazo de labrado extendido', `Nuevo vencimiento: ${new Date(nuevo).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`);
  return { venceAt: nuevo };
}

/** Crea el borrador del acta con número de su serie y legajo común ya reservados (RN-02, RN-03). */
export async function iniciarActa(d: Db, user: UsuarioRow, tipoNombre: string, uuid: string) {
  // Antes de reservar un número nuevo: se abandonan los vencidos y, si el inspector tiene un acta abierta vigente, se
  // retoma esa (reunión 27/10: el acta iniciada se termina sí o sí).
  let abiertas: BorradorPlazo[] = [];
  try { abiertas = await abandonarVencidos(d, user.rol === 'Inspector' ? user.username : undefined); } catch { /* no impide labrar */ }
  if (abiertas.length) return { ...(abiertas.sort((a, b) => b.id - a.id)[0] as { id: number; uuid: string }), retomada: true };
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
  // Vencimiento del labrado (sql/034). Aparte: sin la columna, el acta se crea igual.
  await d.from('infraccion').update({ labrado_vence_at: Date.now() + (await plazoLabradoMs(d, tipo)) }).eq('id', (data as { id: number }).id);
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
/** true si alguno de los artículos del acta exige foto. */
async function fotoRequeridaPor(d: Db, infraccionId: number): Promise<boolean> {
  const { data: rel } = await d.from('infraccion_ley').select('ley_nombre').eq('infraccion_id', infraccionId);
  const nombres = ((rel ?? []) as { ley_nombre: string }[]).map((r) => r.ley_nombre);
  if (!nombres.length) return false;
  const { data: leyes, error } = await d.from('ley').select('nombre, articulo, multiplicador, requiere_foto');
  if (error) return false; // sin sql/034
  return resolverLeyes(nombres, (leyes ?? []) as { nombre: string; articulo: string; multiplicador: number; requiere_foto?: number }[]).some((l) => Number((l as { requiere_foto?: number }).requiere_foto) === 1);
}

export async function firmarActa(d: Db, user: UsuarioRow, uuidActa: string, firmaInfractor: string | null) {
  const c = await causaPorUuid(d, uuidActa);
  check(c.estado_faltas === 'Borrador', 'El acta ya fue firmada o anulada', 409);
  await controlarPlazo(d, user, c as unknown as { id: number; estado_faltas: string });
  check(modulosDe(user).includes(String(c.infraccion_tipo_nombre) as ModuloActa), 'No tiene autorizado labrar este tipo de acta', 403);
  check(user.firma_activa !== false, 'Su firma digital está inactiva: pida a la Dirección de Faltas que la habilite en «Inspectores».', 403);
  const sit = String(c.situacion_infractor ?? '');
  check(SITUACIONES_VALIDAS.includes(sit), 'Indique la situación de la persona');
  // Reunión 27/10: los datos de la persona se exigen solo si está presente (si no, se cargan los que se constaten).
  if (sit === 'presente' || sit === 'se_niega') {
    check(String(c.infractor_nombre ?? '').trim() || String(c.infractor_razon_social ?? '').trim(), 'Complete el nombre o la razón social del infractor');
    check(String(c.infractor_documento_numero ?? '').trim() || String(c.infractor_cuit ?? '').trim(), 'Complete el documento o CUIT del infractor');
    check(String(c.infractor_domicilio ?? '').trim(), 'Complete el domicilio del infractor');
  }
  check(String(c.domicilio_infraccion_calle ?? '').trim(), 'Complete el lugar de infracción');
  if (String(c.infraccion_tipo_nombre) !== 'contravenciones') {
    check(String(c.vehiculo_numero_dominio ?? '').trim(), 'Complete el dominio del vehículo');
    check(String(c.vehiculo_tipo_nombre ?? '').trim(), 'Complete el tipo de vehículo');
    if (String(c.infraccion_tipo_nombre) === 'multas') {
      const meta = (() => { try { return JSON.parse(String(c.metadata_json ?? '{}')) as Record<string, string>; } catch { return {}; } })();
      check(String(meta.marca ?? '').trim(), 'Complete la marca del vehículo');
      check(String(meta.modelo ?? '').trim(), 'Complete el modelo del vehículo');
    }
  }
  const { count } = await d.from('infraccion_ley').select('*', { count: 'exact', head: true }).eq('infraccion_id', c.id);
  check((count ?? 0) > 0, 'Seleccione al menos un artículo');
  // La foto es obligatoria solo si algún artículo la pide (Ordenanzas → «Requiere foto», sql/034).
  if (await fotoRequeridaPor(d, c.id)) {
    const { count: fotos } = await d.from('infraccion_imagen').select('*', { count: 'exact', head: true }).eq('infraccion_id', c.id);
    check((fotos ?? 0) > 0, 'Suba al menos una foto: la pide uno de los artículos');
  }
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
      legajo_caratula: `${c.legajo_numero_acta} · ${c.infractor_nombre || c.infractor_razon_social || 'Sin identificar'}`,
    })
    .eq('id', c.id);
  if (error) throw new HttpError(500, error.message);
  // Valores del momento del labrado (UF y múltiplos): la causa no cambia si después se actualizan las tarifas.
  // Si falta sql/023 la columna no existe y la causa usa los valores vigentes, como antes.
  await d.from('infraccion').update({ valores_labrado_json: JSON.stringify(await valoresVigentes(d, c)) }).eq('id', c.id);
  const firmante = nombreUsuario(user);
  const metaF = (() => { try { return JSON.parse(String(c.metadata_json ?? '{}')) as Record<string, string>; } catch { return {}; } })();
  const motivo = metaF.motivoIncompleta ? ` Datos faltantes completados con «Desconocido» · motivo: ${metaF.motivoIncompleta}.` : '';
  await historial(d, c.id, firmante, 'Acta firmada', `Firma del inspector registrada (código ${hash.slice(0, 12)}). Situación de la persona: ${textoSituacion(sit) || sit}.${motivo}`, { anterior: 'Borrador', nuevo: 'Iniciado' });
  await historial(d, c.id, 'Sistema', 'Ingreso como causa', conMedida ? 'El acta trae medida preventiva: queda pendiente de resolución.' : null);
  return { uuid: c.uuid, hash };
}
