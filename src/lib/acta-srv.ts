import { causaPorUuid, check, configNum, historial, HttpError, nombreUsuario, sha, type Db } from './srv';
import { formatearNumeroActa, resolverLeyes, TIPOS_ACTA, tipoActa } from './dominio';
import type { UsuarioRow } from './types';

export async function reservar(d: Db, serie: string): Promise<number> {
  const { data, error } = await d.rpc('reservar_numero', { p_serie: serie });
  if (error) throw new HttpError(500, `No se pudo reservar número: ${error.message}`);
  return Number(data);
}

/** Crea el borrador del acta con número de su serie y legajo común ya reservados (RN-02, RN-03). */
export async function iniciarActa(d: Db, user: UsuarioRow, tipoNombre: string, uuid: string) {
  const tipo = tipoActa(tipoNombre);
  const info = TIPOS_ACTA[tipo];
  const nActa = await reservar(d, info.serie);
  const nLeg = await reservar(d, 'LEG');
  const ahora = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fecha = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
  const row = {
    uuid,
    infraccion_tipo_id: info.id,
    infraccion_tipo_nombre: tipo,
    legajo_numero_acta: formatearNumeroActa(info.serie, nActa),
    legajo_number: String(nLeg),
    legajo_anio: String(ahora.getFullYear()),
    legajo_fecha: fecha,
    estado: 'Activo',
    estado_faltas: 'Borrador',
    situacion_infractor: 'presente',
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
  check(user.firma_activa !== false, 'Su firma digital está inactiva: pida a la Dirección de Faltas que la habilite en «Inspectores».', 403);
  const sit = String(c.situacion_infractor ?? 'presente');
  if (sit !== 'nn') {
    check(String(c.infractor_nombre ?? '').trim() || String(c.infractor_razon_social ?? '').trim(), 'Complete el nombre o la razón social del infractor');
    check(String(c.infractor_documento_numero ?? '').trim() || String(c.infractor_cuit ?? '').trim(), 'Complete el documento o CUIT del infractor');
    if (sit === 'presente' || sit === 'se_niega') {
      check(String(c.infractor_domicilio ?? '').trim(), 'Complete el domicilio del infractor');
    }
  }
  check(String(c.domicilio_infraccion_calle ?? '').trim(), 'Complete el lugar del hecho');
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
  const firmante = nombreUsuario(user);
  await historial(d, c.id, firmante, 'Acta firmada', `Firma del inspector registrada (código ${hash.slice(0, 12)}). Situación del infractor: ${sit}.`, { anterior: 'Borrador', nuevo: 'Iniciado' });
  await historial(d, c.id, 'Sistema', 'Ingreso como causa', conMedida ? 'El acta trae medida preventiva: queda pendiente de resolución.' : null);
  return { uuid: c.uuid, hash };
}
