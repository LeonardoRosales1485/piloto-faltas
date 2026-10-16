/**
 * Operaciones de la causa: notificación, escritos, presentaciones, boletas, fallo y archivo.
 * Todo cambio de estado pasa por cambiarEstado() y deja historial.
 */
import { ahoraArgentina, claveLey, esContravencional, fechaCorta, pesos, resolverLeyes, TIPOS_ACTA, tipoActa } from './dominio';
import { claseVehiculo, tarifaAcarreo } from './tarifas';
import { causaVigente, leyesVigentes, subsanacionDe } from './subsanacion';
import {
  cambiarEstado, causaPorId, check, config, configNum, enviarCorreo, feriados, historial, HttpError,
  nombreUsuario, sha, sumarCorridos, sumarHabiles, uuid, type CausaRow, type Db,
} from './srv';
import { reservar } from './acta-srv';
import { normalizarHtml } from './campos';
import type { UsuarioRow } from './types';

export const PLAZO_TRANSITO = 30;
export const PLAZO_CONTRAVENCION = 15;

// ---------------------------------------------------------------------------
// Datos derivados
// ---------------------------------------------------------------------------
export async function leyesDeCausa(d: Db, id: number) {
  const { data: rel } = await d.from('infraccion_ley').select('ley_nombre').eq('infraccion_id', id);
  // Artículos vigentes: los subsanados si hubo subsanación (el acta original no cambia).
  const nombres = leyesVigentes(((rel ?? []) as { ley_nombre: string }[]).map((r) => r.ley_nombre), await subsanacionDe(d, id));
  if (!nombres.length) return [] as { nombre: string; articulo: string; descripcion: string; multiplicador: number }[];
  const { data } = await d.from('ley').select('nombre, articulo, descripcion, multiplicador');
  return resolverLeyes(nombres, (data ?? []) as { nombre: string; articulo: string; descripcion: string; multiplicador: number }[]);
}

export function medidasDe(c: CausaRow): string[] {
  const out: string[] = [];
  if (Number(c.retencion_de_licencia) === 1) out.push('retención de licencia');
  if (Number(c.retencion_de_vehiculo) === 1) out.push('retención de vehículo');
  if (Number(c.acarreo) === 1) out.push('acarreo');
  try {
    for (const m of JSON.parse(String(c.medidas_preventivas ?? '[]')) as string[]) out.push(m.toLowerCase());
  } catch {
    /* sin medidas */
  }
  return out;
}

export type LeyValorizada = { clave: string; nombre: string; articulo: string; descripcion: string; multiplicador: number;
  /** Múltiplo del catálogo (sin ajuste). */ multiploCatalogo: number; subtotal: number; manual: boolean; ajustada: boolean };

/** Ajustes por artículo de la causa (sql/022). Si la tabla no existe todavía, no hay ajustes. */
export async function ajustesLeyes(d: Db, id: number) {
  const { data, error } = await d.from('causa_ley_ajuste').select('ley_clave, multiplo, monto_manual').eq('infraccion_id', id);
  const m = new Map<string, { multiplo: number | null; monto_manual: number | null }>();
  if (error) return m;
  for (const r of (data ?? []) as { ley_clave: string; multiplo: number | null; monto_manual: number | null }[]) m.set(r.ley_clave, r);
  return m;
}

/** Valores del labrado guardados en la causa (sql/023): UF y múltiplo de cada artículo. */
export type ValoresLabrado = { uf: number; fecha: number; leyes: Record<string, number> };
export function leerValoresLabrado(c: CausaRow): ValoresLabrado | null {
  try {
    const v = JSON.parse(String((c as unknown as { valores_labrado_json?: string | null }).valores_labrado_json ?? 'null')) as ValoresLabrado | null;
    return v && Number.isFinite(Number(v.uf)) ? { uf: Number(v.uf), fecha: Number(v.fecha) || 0, leyes: v.leyes ?? {} } : null;
  } catch {
    return null;
  }
}

/** Valores vigentes hoy (configuración y catálogo) para los artículos de la causa. */
export async function valoresVigentes(d: Db, c: CausaRow): Promise<ValoresLabrado> {
  const uf = await configNum(d, 'finanza_unidad_fija', 2000);
  const leyes = await leyesDeCausa(d, c.id);
  return { uf, fecha: Date.now(), leyes: Object.fromEntries(leyes.map((l) => [claveLey(l), Number(l.multiplicador || 0)])) };
}

/**
 * Valorización: por artículo, múltiplo (del catálogo o ajustado en la causa) × UF, o un subtotal manual.
 * La multa es la suma de subtotales, salvo un ajuste global del monto («Ajustar valorización»).
 */
export async function valorizacion(d: Db, c: CausaRow) {
  // Se usan los valores del momento del labrado; los vigentes solo si la causa no los tiene (borradores, datos viejos).
  const ufVigente = await configNum(d, 'finanza_unidad_fija', 2000);
  const lab = leerValoresLabrado(c);
  const uf = lab?.uf ?? ufVigente;
  const base = await leyesDeCausa(d, c.id);
  const aj = await ajustesLeyes(d, c.id);
  let difiere = Boolean(lab && lab.uf !== ufVigente);
  const leyes: LeyValorizada[] = base.map((l) => {
    const clave = claveLey(l);
    const a = aj.get(clave);
    const actual = Number(l.multiplicador || 0);
    const multiploCatalogo = lab && clave in lab.leyes ? Number(lab.leyes[clave]) : actual;
    if (lab && multiploCatalogo !== actual) difiere = true;
    const multiplo = a?.multiplo != null ? Number(a.multiplo) : multiploCatalogo;
    const manual = a?.monto_manual != null;
    return { clave, nombre: l.nombre, articulo: l.articulo, descripcion: l.descripcion, multiplicador: multiplo, multiploCatalogo,
      subtotal: manual ? Number(a!.monto_manual) : multiplo * uf, manual, ajustada: Boolean(a && (a.multiplo != null || manual)) };
  });
  const unidades = leyes.reduce((s, l) => s + l.multiplicador, 0);
  const subtotal = leyes.reduce((s, l) => s + l.subtotal, 0);
  const ajuste = c.monto_ajustado != null ? Number(c.monto_ajustado) : null;
  return { uf, unidades, subtotal, multa: ajuste ?? subtotal, leyes,
    valores: { fijados: Boolean(lab), fecha: lab?.fecha ?? null, ufVigente, difiere } };
}

// ---------------------------------------------------------------------------
// Plantillas: reemplazo de campos [Acta:...] [System:...] [Causa:...] [Documento:...]
// ---------------------------------------------------------------------------
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function esc(s: unknown) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function camposDeCausa(d: Db, c0: CausaRow, user?: UsuarioRow) {
  const c = await causaVigente(d, c0);
  const v = await valorizacion(d, c);
  const hoy = ahoraArgentina();
  const [fecha, hora] = String(c.legajo_fecha ?? '').split('T');
  const { data: deps } = await d.from('infraccion_dependencia').select('dependencia_nombre').eq('infraccion_id', c.id);
  const ids = ((deps ?? []) as { dependencia_nombre: string }[]).map((x) => Number(x.dependencia_nombre)).filter((n) => !Number.isNaN(n));
  let dependencia = TIPOS_ACTA[tipoActa(c.infraccion_tipo_nombre)].corto;
  if (ids.length) {
    const { data: cat } = await d.from('catalogo').select('nombre').in('id', ids);
    dependencia = ((cat ?? []) as { nombre: string }[]).map((x) => x.nombre).join(', ');
  }
  const titular = c.infractor_razon_social || c.infractor_nombre || 'NN';
  return {
    'Acta:Numero': c.legajo_numero_acta,
    'Acta:Expediente': `${c.legajo_number ?? ''}/${c.legajo_anio ?? ''}`,
    'Acta:Titular': titular,
    'Acta:TipoDocumento': c.infractor_cuit ? 'CUIT' : (c.infractor_documento_tipo_nombre || 'DNI'),
    'Acta:Nro.Documento': c.infractor_cuit || c.infractor_documento_numero,
    'Acta:Calle': c.infractor_domicilio,
    'Acta:Nro.Puerta': c.infractor_calle_altura,
    'Acta:Localidad': c.infractor_localidad_nombre,
    'Acta:Partido': c.infractor_partido_nombre,
    'Acta:Provincia.Infractor': c.infractor_provincia_nombre,
    'Acta:Fecha': fecha ? fechaCorta(`${fecha}T12:00`) : '',
    'Acta:Hora': hora ?? '',
    'Acta:Calle.Infraccion': c.domicilio_infraccion_calle,
    'Acta:Nro.Puerta.Infraccion': c.domicilio_infraccion_numero,
    'Acta:Localidad_Infraccion': c.domicilio_infraccion_localidad_nombre,
    'Acta:Partido.Infraccion': 'Malvinas Argentinas',
    'Acta:Provincia.Infraccion': 'Buenos Aires',
    'Acta:Dependencia': dependencia,
    'Acta:Dominio.Vehiculo': c.vehiculo_numero_dominio,
    'Acta:Infracciones': v.leyes.map((l) => `${l.nombre} ${l.articulo} (${l.descripcion})`).join('; '),
    'Acta:Actividad': ' ', // Anexo V: se elimina «actividad económica»
    'System:FECHA': `${hoy.dia}/${hoy.mes}/${hoy.anio}`,
    'System:TEXTOFECHA': `${hoy.dia} de ${MESES[hoy.mes - 1]} de ${hoy.anio}`,
    'System:HORA': `${hoy.hora}:${hoy.minuto}`,
    'Causa:Monto': pesos(v.multa),
    'Causa:Unidades': String(v.unidades),
    'Causa:Medidas': medidasDe(c).join(', ') || 'sin medidas',
    'Causa:FechaNotificacion': c.notificada_at ? fechaCorta(Number(c.notificada_at)) : '',
    'Causa:Vencimiento': c.vence_plazo_at ? fechaCorta(Number(c.vence_plazo_at)) : '',
    'Usuario:Nombre': user ? nombreUsuario(user) : '',
  } as Record<string, unknown>;
}

const ETIQUETA_AUTO: Record<string, string> = {
  'Acta:Dominio.Vehiculo': 'Dominio', 'Acta:Nro.Puerta': 'Altura del domicilio', 'Acta:Calle': 'Domicilio del infractor',
  'Acta:Localidad': 'Localidad', 'Acta:Partido': 'Partido', 'Acta:Provincia.Infractor': 'Provincia', 'Acta:Titular': 'Titular',
  'Acta:Nro.Documento': 'N° de documento', 'Acta:Nro.Puerta.Infraccion': 'Altura del lugar de infracción', 'Acta:Calle.Infraccion': 'Calle del lugar de infracción',
  'Acta:Localidad_Infraccion': 'Localidad del hecho', 'Acta:Hora': 'Hora', 'Acta:Fecha': 'Fecha del acta', 'Causa:FechaNotificacion': 'Fecha de notificación',
  'Causa:Vencimiento': 'Vencimiento', 'Acta:Infracciones': 'Infracciones',
};

export function aplicarCampos(html: string, campos: Record<string, unknown>) {
  return html.replace(/\[((?:Acta|System|Causa|Usuario):[^\]]+)\]/g, (m, k: string) => {
    if (!(k in campos)) return m;
    const val = campos[k];
    // Dato automático que el acta no tiene: pasa a ser un campo a completar por quien redacta.
    if (val === null || val === undefined || val === '') return `[Completar:${ETIQUETA_AUTO[k] ?? k.split(':')[1].replace(/[._]/g, ' ')}]`;
    return esc(val);
  });
}

// ---------------------------------------------------------------------------
// Notificación (fase 1: portal y domicilio electrónico; sin notificación en persona)
// ---------------------------------------------------------------------------
export async function plazoActa(d: Db, c: CausaRow, desde: number) {
  const dias = esContravencional(c.infraccion_tipo_nombre)
    ? await configNum(d, 'plazo_contravencion_dias', PLAZO_CONTRAVENCION)
    : await configNum(d, 'plazo_pago_voluntario_dias', PLAZO_TRANSITO);
  return sumarCorridos(desde, dias);
}

/** Notifica el acta: al abrirla en el portal o por domicilio electrónico (DD.JJ.). */
const VIA_NOTIF = { portal: 'Acceso del infractor al portal', electronica: 'Domicilio electrónico (DD.JJ.)', considerada: 'Considerado notificado por la Dirección de Faltas: tuvo tiempo suficiente para ver el acta digital en el portal' } as const;

export async function notificarActa(d: Db, c: CausaRow, via: 'portal' | 'electronica' | 'considerada', quien: string) {
  if (c.notificada_at) return false;
  if (!['Iniciado', 'En notificación', 'Con Resolución', 'Resolución (medidas preventivas)', 'Reso notificada', 'En notificación de resolución'].includes(c.estado_faltas)) return false;
  const ahora = Date.now();
  const vence = await plazoActa(d, c, ahora);
  await d.from('notificacion').insert({ uuid: uuid(), infraccion_id: c.id, objeto: 'acta', via, estado: 'positiva', fecha_resultado: ahora, registrado_por: quien, date_created: ahora });
  const enMedida = c.estado_faltas !== 'Iniciado' && c.estado_faltas !== 'En notificación';
  if (enMedida) {
    await d.from('infraccion').update({ notificada_at: ahora, vence_plazo_at: vence }).eq('id', c.id);
    await historial(d, c.id, quien, 'Acta notificada', `${VIA_NOTIF[via]}. Vence el plazo el ${fechaCorta(vence)}.`);
    c.notificada_at = ahora;
  } else {
    await cambiarEstado(d, c, 'Notificado', quien, 'Acta notificada', `${VIA_NOTIF[via]}. Vence el plazo el ${fechaCorta(vence)}.`, { notificada_at: ahora, vence_plazo_at: vence });
  }
  return true;
}

/** Busca un ciudadano con domicilio electrónico constituido para el infractor de la causa. */
export async function ciudadanoDeCausa(d: Db, c: CausaRow) {
  const doc = String(c.infractor_cuit || c.infractor_documento_numero || '').replace(/\D/g, '');
  if (!doc) return null;
  const { data } = await d.from('ciudadano').select('*');
  return ((data ?? []) as Record<string, unknown>[]).find((x) => String(x.cuit || x.documento_numero || '').replace(/\D/g, '') === doc) ?? null;
}

export async function notificarElectronicaSiCorresponde(d: Db, c: CausaRow) {
  const ciu = await ciudadanoDeCausa(d, c);
  if (!ciu || Number(ciu.domicilio_electronico) !== 1) return false;
  await enviarCorreo(d, String(ciu.email), `Notificación del Acta ${c.legajo_numero_acta}`, `Se le notifica el Acta ${c.legajo_numero_acta}. Puede verla y gestionarla en el portal de infractores.`, c.id);
  return notificarActa(d, c, 'electronica', 'Sistema');
}

/** Notificación de un escrito definitivo (resolución, disposición, fallo). */
export async function notificarDocumento(d: Db, docId: number, quien: string) {
  const { data } = await d.from('documento').select('*, plantilla(*)').eq('id', docId).single();
  const doc = data as Record<string, unknown> & { plantilla: Record<string, unknown> | null };
  check(doc && ['firmado', 'definitivo'].includes(String(doc.estado)), 'Solo se notifican escritos definitivos o firmados');
  const c = await causaPorId(d, Number(doc.infraccion_id));
  const cat = String(doc.plantilla?.categoria ?? '');
  const objeto = cat === 'Fallo' ? 'fallo' : cat === 'Resolución' ? 'resolucion' : cat === 'Disposición' ? 'disposicion' : 'escrito';
  const ciu = await ciudadanoDeCausa(d, c);
  const electronica = ciu && Number(ciu.domicilio_electronico) === 1;
  const ahora = Date.now();
  await d.from('notificacion').insert({
    uuid: uuid(), infraccion_id: c.id, documento_id: docId, objeto, via: electronica ? 'electronica' : 'portal',
    estado: electronica ? 'positiva' : 'pendiente', fecha_resultado: electronica ? ahora : null, registrado_por: quien, date_created: ahora,
  });
  if (electronica) {
    await enviarCorreo(d, String(ciu!.email), `Notificación: ${doc.titulo}`, `Se le notifica ${doc.titulo} del Acta ${c.legajo_numero_acta}. Puede descargarlo desde el portal.`, c.id);
    await efectoNotificacionPositiva(d, c, objeto, quien);
  } else {
    const pend = objeto === 'fallo' ? 'En notificación de fallo' : objeto === 'resolucion' ? 'En notificación de resolución' : objeto === 'disposicion' ? 'En notificación de disposición' : null;
    if (pend) await cambiarEstado(d, c, pend, quien, `Notificación de ${String(doc.titulo).toLowerCase()} pendiente`, 'El infractor queda notificado al abrir el documento en el portal.');
    else await historial(d, c.id, quien, 'Escrito disponible en el portal', String(doc.titulo));
  }
  return { electronica: Boolean(electronica) };
}

export async function efectoNotificacionPositiva(d: Db, c: CausaRow, objeto: string, quien: string) {
  const ahora = Date.now();
  if (objeto === 'fallo') {
    if (c.estado_faltas === 'Archivo absolución') return;
    const dias = await configNum(d, 'plazo_post_fallo_habiles', 5);
    const vence = sumarHabiles(ahora, dias, await feriados(d));
    await cambiarEstado(d, c, 'Fallo notificado', quien, 'Fallo notificado', `Corre el plazo de ${dias} días hábiles para pagar o apelar: vence el ${fechaCorta(vence)}.`, { vence_plazo_at: vence });
  } else if (objeto === 'resolucion') {
    await cambiarEstado(d, c, c.notificada_at ? c.estado_faltas : 'Reso notificada', quien, 'Resolución notificada', null);
  } else if (objeto === 'disposicion') {
    await historial(d, c.id, quien, 'Disposición de levantamiento notificada', null);
  }
}

/** El infractor abrió en el portal un documento pendiente de notificación. */
export async function notificarPendientesAlVer(d: Db, c: CausaRow, documentoId: number, quien: string) {
  const { data } = await d.from('notificacion').select('*').eq('infraccion_id', c.id).eq('documento_id', documentoId).eq('estado', 'pendiente');
  for (const n of (data ?? []) as Record<string, unknown>[]) {
    await d.from('notificacion').update({ estado: 'positiva', fecha_resultado: Date.now() }).eq('id', n.id as number);
    await efectoNotificacionPositiva(d, c, String(n.objeto), quien);
  }
}

// ---------------------------------------------------------------------------
// Escritos
// ---------------------------------------------------------------------------
/**
 * Precarga los campos [Completar:…] que la causa ya conoce (N° de acta, titular, dominio, montos, números de
 * fallo/resolución…). Quedan como texto común del escrito, editable como siempre; los que no se conocen siguen
 * como campos a completar.
 */
export async function precargarCompletar(d: Db, c0: CausaRow, html: string) {
  const c = await causaVigente(d, c0);
  const v = await valorizacion(d, c);
  const descuento = await configNum(d, 'descuento_pago_voluntario', 50);
  let meta: Record<string, string> = {};
  try { meta = JSON.parse(String(c.metadata_json ?? '{}')) as Record<string, string>; } catch { /* sin metadata */ }
  const moneda = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const { data: docs } = await d.from('documento').select('numero, date_created, plantilla(categoria)').eq('infraccion_id', c.id).not('numero', 'is', null).order('date_created', { ascending: false });
  const numeroDe = (cat: string) => ((docs ?? []) as { numero: string; plantilla: { categoria?: string } | null }[]).find((x) => x.plantilla?.categoria === cat)?.numero ?? '';
  const { data: cuotas } = await d.from('presentacion').select('cuotas_otorgadas').eq('infraccion_id', c.id).eq('tipo', 'cuotas').eq('estado', 'aceptada').maybeSingle();
  const acarreo = Number(c.acarreo) === 1 ? await tarifaAcarreo(d, claseVehiculo(c.vehiculo_tipo_nombre as string | null)) : 0;
  const norm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/nº/g, 'n°').replace(/\s+/g, ' ').trim();
  const valores: Record<string, string> = {
    'n° de acta': String(c.legajo_numero_acta ?? ''),
    'nombre y apellido': String(c.infractor_razon_social || c.infractor_nombre || ''),
    'n° de legajo': `${c.legajo_number ?? ''}/${c.legajo_anio ?? ''}`,
    'n° de expediente': `${c.legajo_number ?? ''}/${c.legajo_anio ?? ''}`,
    'n° de licencia': String(c.vehiculo_numero_licencia ?? ''),
    'tipo marca modelo': [c.vehiculo_tipo_nombre, meta.marca, meta.modelo].filter(Boolean).join(' '),
    monto: moneda(v.multa),
    'monto pago voluntario': moneda(v.multa * (1 - descuento / 100)),
    'monto acarreo': acarreo ? moneda(acarreo) : '',
    'fecha de vencimiento': c.vence_plazo_at ? fechaCorta(Number(c.vence_plazo_at)) : '',
    municipalidad: 'Malvinas Argentinas',
    'n° de fallo': numeroDe('Fallo'),
    'n° de resolucion': numeroDe('Resolución'),
    'n° de disposicion': numeroDe('Disposición'),
    'cantidad de cuotas': cuotas ? String((cuotas as { cuotas_otorgadas: number | null }).cuotas_otorgadas ?? '') : '',
  };
  return html.replace(/\[Completar:([^\]:]+)(?::(?:texto|numero|fecha|moneda))?\]/g, (m, label: string, off: number, todo: string) => {
    const k = norm(label);
    // «Técnico / Ingeniero [Nombre y apellido]» es quien hizo la medición, no el infractor.
    if (k === 'nombre y apellido' && /(ingenier|tecnic|técnic|perito)[^<\[]{0,15}$/i.test(todo.slice(Math.max(0, off - 40), off).replace(/<[^>]*>/g, ''))) return m;
    const val = valores[k];
    return val ? esc(val) : m;
  });
}

export async function generarEscrito(d: Db, user: UsuarioRow, c: CausaRow, plantillaId: number) {
  const { data: p } = await d.from('plantilla').select('*').eq('id', plantillaId).maybeSingle();
  check(p, 'Plantilla inexistente', 404);
  const pl = p as Record<string, unknown>;
  const html = await precargarCompletar(d, c, aplicarCampos(normalizarHtml(String(pl.contenido_html)), await camposDeCausa(d, c, user)));
  const row = {
    uuid: uuid(), infraccion_id: c.id, tipo: 'escrito', plantilla_id: plantillaId, titulo: String(pl.titulo),
    contenido_html: html, estado: 'borrador', creado_por: nombreUsuario(user), date_created: Date.now(), date_updated: Date.now(),
  };
  const { data, error } = await d.from('documento').insert(row).select('uuid').single();
  if (error) throw new HttpError(500, error.message);
  await historial(d, c.id, nombreUsuario(user), 'Escrito generado', String(pl.titulo));
  return data as { uuid: string };
}

/** Efectos al quedar definitivo/firmado: numeración, cambio de estado, levantamiento de medida. */
export async function efectosDefinitivo(d: Db, user: UsuarioRow, docUuid: string, firmado: boolean) {
  const { data } = await d.from('documento').select('*, plantilla(*)').eq('uuid', docUuid).single();
  const doc = data as Record<string, unknown> & { plantilla: Record<string, unknown> | null };
  const c = await causaPorId(d, Number(doc.infraccion_id));
  const pl = doc.plantilla ?? {};
  const ahora = Date.now();
  let html = String(doc.contenido_html ?? '');
  let numero: string | null = (doc.numero as string | null) ?? null;
  if (Number(pl.numerable) === 1 && !numero) {
    const serie = `${String(pl.categoria).slice(0, 3).toUpperCase()}-${new Date().getFullYear()}`;
    numero = `${await reservar(d, serie)}/${new Date().getFullYear()}`;
  }
  html = html.replace(/\[Documento:Numero\]/g, numero ?? '').replace(/\[Documento:Fecha\]/g, fechaCorta(ahora));
  const quien = nombreUsuario(user);
  const hash = sha(`${html}|${quien}|${ahora}`);
  await d.from('documento').update({
    contenido_html: html, numero, fecha_numero: numero ? ahora : null, estado: firmado ? 'firmado' : 'definitivo',
    hash, firmado_por: firmado ? quien : null, firmado_at: firmado ? ahora : null, date_updated: ahora,
  }).eq('id', doc.id as number);
  await historial(d, c.id, quien, firmado ? 'Escrito firmado digitalmente' : 'Escrito definitivo', `${doc.titulo}${numero ? ` N° ${numero}` : ''} · código ${hash.slice(0, 12)}`);

  if (pl.codigo === 'DISPOSICION_LEVANTAMIENTO') {
    await d.from('infraccion').update({ medida_vigente: 0 }).eq('id', c.id);
    c.medida_vigente = 0;
    await historial(d, c.id, quien, 'Medida preventiva levantada', `Disposición N° ${numero}`);
    await evaluarArchivoPorPago(d, c, quien);
  }
  const destino = pl.estado_resultante ? String(pl.estado_resultante) : null;
  if (destino && destino !== c.estado_faltas && !(destino === 'Esp. Acreditar Pago' && c.estado_faltas === 'Cuotas')) {
    if (destino === 'Con Fallo') {
      const v = await valorizacion(d, c);
      await cambiarEstado(d, c, destino, quien, `Estado por escrito: ${doc.titulo}`, `Multa fijada: ${pesos(v.multa)}`, { monto_estimado: v.multa });
    } else {
      await cambiarEstado(d, c, destino, quien, `Estado por escrito: ${doc.titulo}`, null);
    }
  }
  return { numero, hash };
}

// ---------------------------------------------------------------------------
// Boletas y pagos (emisión y acreditación de Malvinas 2000 simuladas)
// ---------------------------------------------------------------------------
export async function emitirBoletas(
  d: Db, c: CausaRow, modo: 'voluntario' | 'total' | 'cuotas', cuotas: number, aNombre: string, quien: string,
) {
  const v = await valorizacion(d, c);
  const descuento = await configNum(d, 'descuento_pago_voluntario', 50);
  const derecho = await configNum(d, 'finanza_derecho_oficina', 5000);
  const { count } = await d.from('boleta').select('*', { count: 'exact', head: true }).eq('infraccion_id', c.id).neq('estado', 'anulada');
  const yaCobroDerecho = (count ?? 0) > 0; // derecho de oficina: una vez por acta
  const multa = modo === 'voluntario' ? v.multa * (1 - descuento / 100) : v.multa;
  const acarreoMonto = Number(c.acarreo) === 1 ? await tarifaAcarreo(d, claseVehiculo(c.vehiculo_tipo_nombre as string | null)) : 0;
  const total = multa + acarreoMonto + (yaCobroDerecho ? 0 : derecho);
  const detalle = { multa, acarreo: acarreoMonto, derecho_oficina: yaCobroDerecho ? 0 : derecho, unidades: v.unidades, uf: v.uf, modo };
  const n = modo === 'cuotas' ? Math.max(1, cuotas) : 1;
  const ahora = Date.now();
  const fer = await feriados(d);
  const filas = [];
  for (let i = 1; i <= n; i++) {
    const num = await reservar(d, `BOL-${new Date().getFullYear()}`);
    filas.push({
      uuid: uuid(), infraccion_id: c.id, numero: `M2000-${String(num).padStart(7, '0')}`,
      concepto: `${modo === 'voluntario' ? 'Pago voluntario (50 %)' : modo === 'cuotas' ? `Cuota ${i} de ${n}` : 'Multa'} · Acta ${c.legajo_numero_acta}`,
      detalle_json: JSON.stringify(detalle), monto: Math.round((total / n) * 100) / 100,
      vencimiento: i === 1 ? sumarHabiles(ahora, 10, fer) : sumarCorridos(ahora, 30 * (i - 1) + 10),
      cuota_nro: modo === 'cuotas' ? i : null, total_cuotas: modo === 'cuotas' ? n : null, a_nombre_de: aNombre,
      estado: 'emitida', date_created: ahora,
    });
  }
  // Estadía: boleta separada, se cobra al retirar el vehículo (fecha de ingreso la carga Faltas).
  await d.from('boleta').insert(filas);
  await cambiarEstado(d, c, modo === 'cuotas' ? 'Cuotas' : 'Esp. Acreditar Pago', quien, `Boleta${n > 1 ? 's' : ''} emitida${n > 1 ? 's' : ''}`, `${n} boleta(s) por ${pesos(total)} a nombre de ${aNombre}.`);
  return { total, cuotas: n, detalle };
}

export async function evaluarArchivoPorPago(d: Db, c: CausaRow, quien: string) {
  const { data } = await d.from('boleta').select('estado').eq('infraccion_id', c.id).neq('estado', 'anulada');
  const bol = (data ?? []) as { estado: string }[];
  if (!bol.length || bol.some((b) => b.estado !== 'definitiva')) return false;
  if (Number(c.medida_vigente) === 1) {
    await historial(d, c.id, quien, 'Pago total acreditado', 'La causa no se archiva: tiene una medida preventiva vigente hasta su levantamiento.');
    return false;
  }
  if (['Esp. Acreditar Pago', 'Cuotas', 'Fallo notificado', 'Con Fallo', 'Notificado', 'Descargo', 'Iniciado'].includes(c.estado_faltas)) {
    await cambiarEstado(d, c, 'Archivo por pago', quien, 'Archivo por pago', 'Pago total acreditado y sin medida vigente. La causa deja de verse en el portal.', { visible_portal: 0 });
    return true;
  }
  return false;
}

export async function textoConfig(d: Db, llave: string) {
  return config(d, llave, '');
}
