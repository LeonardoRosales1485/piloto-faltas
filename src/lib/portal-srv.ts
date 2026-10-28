import { NextRequest } from 'next/server';
import { bearerToken } from './auth';
import { esContravencional, ESTADOS_PRE_FALLO } from './dominio';
import { jsonFail, jsonOk } from './http-data';
import { subjectFromToken } from './jwt';
import { db, HttpError, type CausaRow, type Db } from './srv';

export type Ciudadano = {
  id: number; uuid: string; tipo_persona: string; nombre: string | null; apellido: string | null; documento_tipo: string | null;
  documento_numero: string | null; razon_social: string | null; tipo_societario: string | null; cuit: string | null; email: string;
  telefono: string | null; domicilio: string | null; localidad: string | null; email_verificado: number; domicilio_electronico: number; ddjj_at: number | null;
};

export async function requireCiudadano(req: NextRequest, d: Db): Promise<Ciudadano> {
  const token = bearerToken(req);
  if (!token) throw new HttpError(401, 'Ingrese al portal');
  let sub = '';
  try {
    sub = await subjectFromToken(token);
  } catch {
    throw new HttpError(401, 'Sesión vencida');
  }
  if (!sub.startsWith('ciudadano:')) throw new HttpError(401, 'Sesión inválida');
  const { data } = await d.from('ciudadano').select('*').eq('uuid', sub.slice(10)).maybeSingle();
  if (!data) throw new HttpError(401, 'Sesión inválida');
  return data as Ciudadano;
}

export async function handlePortal<T>(req: NextRequest, fn: (ctx: { ciu: Ciudadano; db: Db }) => Promise<T>) {
  try {
    const d = db();
    const ciu = await requireCiudadano(req, d);
    return jsonOk(await fn({ ciu, db: d }));
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    return jsonFail(status, e instanceof Error ? e.message : 'Error');
  }
}

export function perfilPublico(c: Ciudadano) {
  return {
    uuid: c.uuid, tipoPersona: c.tipo_persona, nombre: c.nombre, apellido: c.apellido, documentoTipo: c.documento_tipo,
    documentoNumero: c.documento_numero, razonSocial: c.razon_social, cuit: c.cuit, email: c.email, telefono: c.telefono,
    domicilio: c.domicilio, localidad: c.localidad, domicilioElectronico: c.domicilio_electronico === 1, ddjjAt: c.ddjj_at,
  };
}

export function nombreCiudadano(c: Ciudadano) {
  return c.tipo_persona === 'juridica' ? c.razon_social ?? c.email : `${c.nombre ?? ''} ${c.apellido ?? ''}`.trim();
}

export type Presentacion = { id: number; tipo: string; estado: string; reenvio_de: number | null };

/**
 * Acciones disponibles para el infractor según el estado, el tipo de acta y sus presentaciones previas.
 * Tránsito: pago voluntario y descargo son excluyentes (30 días). Contravención: pueden convivir (15 días).
 * Después del fallo: solo apelación y boleta, dentro de los 5 días hábiles.
 */
export function accionesDisponibles(c: CausaRow, pres: Presentacion[], boletasActivas: number, ahora = Date.now()) {
  const e = c.estado_faltas;
  const transito = !esContravencional(c.infraccion_tipo_nombre);
  const vigentes = pres.filter((p) => p.estado !== 'rechazada');
  const tiene = (t: string) => vigentes.some((p) => p.tipo === t);
  const pendiente = (t: string) => pres.some((p) => p.tipo === t && p.estado === 'pendiente');
  // El descargo cuenta como presentado aunque se haya rechazado (QA UI-CONT-09): no se puede volver a presentar y,
  // en tránsito, ya no hay pago voluntario. Un pedido de pago rechazado, en cambio, se puede volver a pedir.
  const presentoDescargo = pres.some((p) => p.tipo === 'descargo');
  const descargoRechazado = pres.some((p) => p.tipo === 'descargo' && p.estado === 'rechazada');
  const enPlazo = Boolean(c.vence_plazo_at) && ahora <= Number(c.vence_plazo_at);
  const out: Record<string, { ok: boolean; motivo?: string }> = {};
  const no = (motivo: string) => ({ ok: false, motivo });
  const si = { ok: true };

  if (!c.notificada_at) {
    for (const k of ['pago_voluntario', 'descargo', 'boleta', 'cuotas', 'apelacion', 'reenviar_descargo']) out[k] = no('Primero debe abrir el acta.');
    return out;
  }
  const preFallo = ESTADOS_PRE_FALLO.includes(e);
  const conBoletas = boletasActivas > 0;

  // Pago voluntario
  if (!preFallo) out.pago_voluntario = no('Ya no corresponde en este estado de la causa.');
  else if (!enPlazo) out.pago_voluntario = no('Venció el plazo del pago voluntario.');
  else if (conBoletas || tiene('pago_voluntario') || tiene('cuotas')) out.pago_voluntario = no('Ya tiene una solicitud de pago.');
  else if (transito && presentoDescargo) out.pago_voluntario = no('En tránsito no puede pedir pago voluntario si presentó descargo.');
  else out.pago_voluntario = si;

  // Descargo
  if (!preFallo || e === 'Descargo') out.descargo = no(e === 'Descargo' ? 'Su descargo está en análisis.' : 'Ya no corresponde en este estado de la causa.');
  else if (e === 'Causa observada') out.descargo = no('Use «Reenviar descargo».');
  else if (presentoDescargo) out.descargo = no(descargoRechazado ? 'Su descargo no fue admitido: no se puede presentar otro.' : 'Ya presentó un descargo.');
  else if (transito && (tiene('pago_voluntario') || conBoletas)) out.descargo = no('En tránsito no puede presentar descargo si pidió el pago voluntario.');
  else out.descargo = si;

  // Reenvío de descargo observado (única vez)
  const obs = pres.find((p) => p.tipo === 'descargo' && p.estado === 'observada');
  out.reenviar_descargo = e === 'Causa observada' && obs && !obs.reenvio_de && !pres.some((p) => p.reenvio_de === obs.id) ? si : no('No hay un descargo observado para reenviar.');

  // Boleta sin beneficio (vencido el plazo o con fallo notificado)
  const posFallo = e === 'Fallo notificado' && enPlazo;
  if (conBoletas) out.boleta = no('Ya tiene boletas emitidas.');
  else if (pendiente('boleta')) out.boleta = no('Ya pidió la boleta.');
  else if (posFallo || (preFallo && !enPlazo && e !== 'Descargo')) out.boleta = si;
  // Tránsito con descargo presentado: pierde el 50 % y le queda la boleta sin beneficio (RN-40 · PI-F22).
  else if (transito && preFallo && presentoDescargo && e !== 'Descargo') out.boleta = si;
  else out.boleta = no(preFallo ? 'Mientras esté en plazo puede pedir el pago voluntario.' : 'No corresponde en este estado.');

  // Plan de cuotas
  if (conBoletas || tiene('cuotas') || pendiente('pago_voluntario')) out.cuotas = no('Ya tiene una solicitud de pago.');
  else if (preFallo || posFallo) out.cuotas = si;
  else out.cuotas = no('No corresponde en este estado.');

  // Apelación (solo después del fallo y dentro de 5 días hábiles)
  if (e !== 'Fallo notificado') out.apelacion = no('Se habilita cuando se le notifica el fallo.');
  else if (!enPlazo) out.apelacion = no('Venció el plazo para apelar.');
  else if (tiene('apelacion')) out.apelacion = no('Ya presentó la apelación.');
  else out.apelacion = si;

  return out;
}

const soloDigitos = (x: unknown) => String(x ?? '').replace(/\D/g, '');

/**
 * Reunión 27/10: el usuario del portal es titular del acta solo si su DNI o CUIT coincide con el del acta vigente
 * (con las subsanaciones aplicadas). Sin coincidencia ve el acta, pero no queda notificado ni puede presentar nada.
 */
export function esTitular(ciu: Ciudadano, causa: object): boolean {
  const vigente = causa as { infractor_documento_numero?: unknown; infractor_cuit?: unknown };
  const mios = [soloDigitos(ciu.documento_numero), soloDigitos(ciu.cuit)].filter((x) => x.length >= 6);
  const delActa = [soloDigitos(vigente.infractor_documento_numero), soloDigitos(vigente.infractor_cuit)].filter((x) => x.length >= 6);
  // El CUIT contiene al DNI (XX-DNI-X): también cuenta como coincidencia.
  return mios.some((m) => delActa.some((a) => a === m || (a.length === 11 && a.slice(2, 10) === m.padStart(8, '0')) || (m.length === 11 && m.slice(2, 10) === a.padStart(8, '0'))));
}

/** DNI/CUIT vigentes por causa según las subsanaciones (solo las causas que tienen alguna). */
export async function documentosSubsanados(d: Db, ids: number[]): Promise<Map<number, { doc?: string; cuit?: string }>> {
  const out = new Map<number, { doc?: string; cuit?: string }>();
  if (!ids.length) return out;
  const { data } = await d.from('subsanacion').select('infraccion_id, campos_json, date_created').in('infraccion_id', ids).order('date_created', { ascending: true });
  for (const r of (data ?? []) as { infraccion_id: number; campos_json: string }[]) {
    let campos: Record<string, { despues: string }> = {};
    try { campos = JSON.parse(r.campos_json) as typeof campos; } catch { /* vacío */ }
    const prev = out.get(r.infraccion_id) ?? {};
    if (campos.infractor_documento_numero) prev.doc = campos.infractor_documento_numero.despues;
    if (campos.infractor_cuit) prev.cuit = campos.infractor_cuit.despues;
    if (prev.doc !== undefined || prev.cuit !== undefined) out.set(r.infraccion_id, prev);
  }
  return out;
}
