/**
 * Plantillas de escritos: catálogo de campos automáticos, validación, reglas fijas del sistema y comparación
 * de versiones. Se usa en el navegador (editor) y en el servidor (validación al publicar).
 */
import { ESTADOS, TIPOS_ACTA, type TipoActa } from './dominio';

export const CATEGORIAS_PLANTILLA = ['Notificación', 'Resolución', 'Disposición', 'Fallo', 'Pago', 'Nota interna', 'Nota externa', 'Documentación', 'General'];

/** Datos publicados (o en borrador) de una plantilla. */
export type DatosPlantilla = {
  titulo: string;
  categoria: string;
  tipo_acta: string; // 'todas' o lista separada por coma: 'multas,contravenciones'
  contenido_html: string;
  estado_resultante: string | null;
  estados_origen: string[] | null; // null = se puede usar en cualquier estado
  requiere_revision: number;
  numerable: number;
};

export type CampoAuto = { tk: string; label: string; ayuda?: string };

/** Campos que el sistema completa solo al generar el escrito, agrupados como los piensa quien redacta. */
export const GRUPOS_CAMPOS: { g: string; i: string; campos: CampoAuto[] }[] = [
  {
    g: 'Acta', i: 'fa-solid fa-file-lines', campos: [
      { tk: 'Acta:Numero', label: 'Número de acta' },
      { tk: 'Acta:Expediente', label: 'Legajo / expediente', ayuda: 'Número/año' },
      { tk: 'Acta:Fecha', label: 'Fecha del acta' },
      { tk: 'Acta:Hora', label: 'Hora del acta' },
      { tk: 'Acta:Dependencia', label: 'Dependencia que labró' },
      { tk: 'Acta:Infracciones', label: 'Infracciones (artículos)', ayuda: 'Ordenanza, artículo y descripción' },
    ],
  },
  {
    g: 'Infractor', i: 'fa-solid fa-user', campos: [
      { tk: 'Acta:Titular', label: 'Nombre o razón social' },
      { tk: 'Acta:TipoDocumento', label: 'Tipo de documento', ayuda: 'DNI, CUIT, …' },
      { tk: 'Acta:Nro.Documento', label: 'Número de documento / CUIT' },
      { tk: 'Acta:Calle', label: 'Domicilio: calle' },
      { tk: 'Acta:Nro.Puerta', label: 'Domicilio: altura' },
      { tk: 'Acta:Localidad', label: 'Domicilio: localidad' },
      { tk: 'Acta:Partido', label: 'Domicilio: partido' },
      { tk: 'Acta:Provincia.Infractor', label: 'Domicilio: provincia' },
    ],
  },
  {
    g: 'Lugar de la infracción', i: 'fa-solid fa-location-dot', campos: [
      { tk: 'Acta:Calle.Infraccion', label: 'Calle' },
      { tk: 'Acta:Nro.Puerta.Infraccion', label: 'Altura' },
      { tk: 'Acta:Localidad_Infraccion', label: 'Localidad' },
      { tk: 'Acta:Partido.Infraccion', label: 'Partido', ayuda: 'Malvinas Argentinas' },
      { tk: 'Acta:Provincia.Infraccion', label: 'Provincia', ayuda: 'Buenos Aires' },
    ],
  },
  { g: 'Vehículo', i: 'fa-solid fa-car', campos: [{ tk: 'Acta:Dominio.Vehiculo', label: 'Dominio (patente)' }] },
  {
    g: 'Causa', i: 'fa-solid fa-scale-balanced', campos: [
      { tk: 'Causa:Monto', label: 'Monto de la multa' },
      { tk: 'Causa:Unidades', label: 'Unidades de multa' },
      { tk: 'Causa:Medidas', label: 'Medidas preventivas' },
      { tk: 'Causa:FechaNotificacion', label: 'Fecha de notificación' },
      { tk: 'Causa:Vencimiento', label: 'Vencimiento del plazo' },
    ],
  },
  {
    g: 'Este escrito', i: 'fa-solid fa-hashtag', campos: [
      { tk: 'Documento:Numero', label: 'Número del escrito', ayuda: 'Se asigna al quedar definitivo o firmado' },
      { tk: 'Documento:Fecha', label: 'Fecha del número' },
    ],
  },
  {
    g: 'Fecha y usuario', i: 'fa-solid fa-calendar-day', campos: [
      { tk: 'System:TEXTOFECHA', label: 'Fecha de hoy en letras', ayuda: '15 de octubre de 2026' },
      { tk: 'System:FECHA', label: 'Fecha de hoy', ayuda: '15/10/2026' },
      { tk: 'System:HORA', label: 'Hora actual' },
      { tk: 'Usuario:Nombre', label: 'Quien genera el escrito' },
    ],
  },
];

const CAMPOS_AUTO = new Map(GRUPOS_CAMPOS.flatMap((g) => g.campos.map((c) => [c.tk, { ...c, grupo: g.g }] as const)));
/** Campos que existen pero no se ofrecen (compatibilidad con modelos viejos). */
const CAMPOS_OCULTOS = new Set(['Acta:Actividad']);

export const TIPOS_CAMPO_COMPLETAR = [
  { v: 'texto', t: 'Texto' },
  { v: 'numero', t: 'Número' },
  { v: 'fecha', t: 'Fecha' },
  { v: 'moneda', t: 'Monto en pesos' },
] as const;

/** Cualquier marcador entre corchetes con prefijo conocido. */
export const RE_MARCADOR = /\[(Acta|System|Causa|Usuario|Documento|Completar):([^\[\]<>]+)\]/g;

export type InfoMarcador =
  | { clase: 'auto'; tk: string; label: string; grupo: string }
  | { clase: 'completar'; tk: string; label: string; tipo: string }
  | { clase: 'error'; tk: string; label: string };

/** Describe un marcador ya sin corchetes («Acta:Numero», «Completar:Monto:moneda»). */
export function infoMarcador(tk: string): InfoMarcador {
  if (tk.startsWith('Completar:')) {
    const [, label = '', tipo = 'texto'] = tk.split(':');
    return { clase: 'completar', tk, label: label.trim(), tipo };
  }
  const c = CAMPOS_AUTO.get(tk);
  if (c) return { clase: 'auto', tk, label: c.label, grupo: c.grupo };
  if (CAMPOS_OCULTOS.has(tk)) return { clase: 'auto', tk, label: tk.split(':')[1], grupo: 'Otros' };
  return { clase: 'error', tk, label: `[${tk}]` };
}

export function marcadores(html: string): InfoMarcador[] {
  return Array.from(html.matchAll(RE_MARCADOR)).map((m) => infoMarcador(`${m[1]}:${m[2]}`));
}

// ---------------------------------------------------------------------------
// Tipo de acta (uno o varios) y estados de origen
// ---------------------------------------------------------------------------
export const TIPOS_PLANTILLA = Object.keys(TIPOS_ACTA) as TipoActa[];

export function tiposDePlantilla(tipoActa: string | null | undefined): TipoActa[] {
  const v = String(tipoActa ?? 'todas').split(',').map((x) => x.trim()).filter((x): x is TipoActa => (TIPOS_PLANTILLA as string[]).includes(x));
  return !v.length || tipoActa === 'todas' ? TIPOS_PLANTILLA : v;
}

export function tipoActaTexto(tipoActa: string | null | undefined): string {
  const t = tiposDePlantilla(tipoActa);
  return t.length === TIPOS_PLANTILLA.length ? 'Todos los tipos' : t.map((x) => TIPOS_ACTA[x].corto).join(' y ');
}

/** Guarda la lista de tipos: «todas» si están todos. */
export function tipoActaValor(tipos: string[]): string {
  const v = TIPOS_PLANTILLA.filter((t) => tipos.includes(t));
  return !v.length || v.length === TIPOS_PLANTILLA.length ? 'todas' : v.join(',');
}

export function estadosOrigen(raw: unknown): string[] | null {
  if (Array.isArray(raw)) return raw.length ? raw.map(String) : null;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) && v.length ? v.map(String) : null;
  } catch { return null; }
}

/** ¿La plantilla está prevista para una causa en ese estado? (sin estados de origen = cualquiera) */
export function previstaPara(estadosOrigenRaw: unknown, estado: string): boolean {
  const e = estadosOrigen(estadosOrigenRaw);
  return !e || e.includes(estado);
}

// ---------------------------------------------------------------------------
// Comportamientos fijos del sistema (no se configuran desde la pantalla)
// ---------------------------------------------------------------------------
const USOS_SISTEMA: Record<string, string[]> = {
  FALLO_CONDENATORIO: ['La usa el botón «Dictar fallo» de la causa.'],
  FALLO_ABSOLUTORIO: ['La usa el botón «Dictar fallo» de la causa.'],
  RESOLUCION_MEDIDA_PREVENTIVA: ['La usa la acción «Resolución de medida preventiva» de la causa.'],
  DISPOSICION_LEVANTAMIENTO: [
    'La usan la acción «Disposición de levantamiento» y la liberación del vehículo (queda en borrador).',
    'Al quedar firmada levanta la medida preventiva y, si la deuda está paga, archiva la causa por pago.',
  ],
  COMPROMISO_TRANSITO_INFRACTOR_PV: ['Se genera sola al aceptar un pedido de pago voluntario de tránsito.'],
  COMPROMISO_FALLO_TRANSITO: ['Se genera sola al aceptar un pedido de boleta o de cuotas de tránsito.'],
  COMPROMISO_CONTRAVENCION_PV: ['Se genera sola al aceptar un pedido de pago de una contravención sin fallo.'],
  COMPROMISO_FALLO_CONTRAVENCION: ['Se genera sola al aceptar un pedido de pago de una contravención con fallo notificado.'],
};

export function esDelSistema(codigo: string | null | undefined): boolean {
  return Boolean(codigo && USOS_SISTEMA[codigo]);
}

/** Lo que hace el sistema con esta plantilla además de su regla de estado. */
export function comportamientosFijos(codigo: string | null | undefined, estadoResultante: string | null | undefined): string[] {
  const out = [...(codigo ? USOS_SISTEMA[codigo] ?? [] : [])];
  if (estadoResultante === 'Con Fallo') out.push('Al pasar a «Con Fallo» se fija el monto de la multa de la causa.');
  if (estadoResultante === 'Esp. Acreditar Pago') out.push('Si la causa está en «Cuotas», no la pasa a «Esp. Acreditar Pago».');
  return out;
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------
export type Observacion = { nivel: 'error' | 'aviso'; texto: string };

export function textoPlano(html: string): string {
  return html
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

/** Errores (impiden publicar) y avisos sobre la plantilla. */
export function validarPlantilla(p: DatosPlantilla): Observacion[] {
  const out: Observacion[] = [];
  const html = p.contenido_html ?? '';
  const texto = textoPlano(html);
  if (!p.titulo.trim()) out.push({ nivel: 'error', texto: 'Falta el título.' });
  if (!texto.trim()) out.push({ nivel: 'error', texto: 'La plantilla no tiene texto.' });
  if (p.estado_resultante && !ESTADOS.some((e) => e.nombre === p.estado_resultante)) out.push({ nivel: 'error', texto: `El estado «${p.estado_resultante}» no existe.` });
  const ms = marcadores(html);
  const desconocidos = [...new Set(ms.filter((m) => m.clase === 'error').map((m) => m.label))];
  if (desconocidos.length) out.push({ nivel: 'error', texto: `Campo desconocido: ${desconocidos.join(', ')}. Quítelo o elija uno de la lista de campos.` });
  const resto = texto.replace(RE_MARCADOR, '');
  const malformados = resto.match(/\[\s*(acta|system|causa|usuario|documento|completar)\b[^\]\n]*\]?/gi) ?? [];
  const sinCerrar = resto.split('\n').filter((l) => /\[[^\]]*$/.test(l)).map((l) => l.slice(l.lastIndexOf('['), l.lastIndexOf('[') + 30));
  const sueltos = [...new Set([...malformados, ...sinCerrar])];
  if (sueltos.length) out.push({ nivel: 'aviso', texto: `Hay corchetes que no forman un campo: «${sueltos.slice(0, 3).join('», «')}». Si es un campo, insértelo desde la lista.` });
  const usaNumero = ms.some((m) => m.tk === 'Documento:Numero');
  // Un campo «N° de disposición» en una disposición (o resolución / fallo): el número propio lo asigna el sistema.
  const propio = ({ Disposición: 'disposici', Resolución: 'resoluci', Fallo: 'fallo' } as Record<string, string>)[p.categoria];
  const numeroCompletar = propio ? ms.find((m) => m.clase === 'completar' && new RegExp(`^(n\\s*[°º.]?|nro\\.?|n[uú]mero)\\s*(de\\s+(la\\s+)?)?${propio}`, 'i').test(m.label)) : undefined;
  if (Number(p.numerable) === 1 && !usaNumero) out.push({ nivel: 'aviso', texto: 'Lleva número y fecha, pero el texto no muestra el número: inserte «Número del escrito».' });
  if (Number(p.numerable) !== 1 && usaNumero) out.push({ nivel: 'aviso', texto: 'El texto usa «Número del escrito», pero la plantilla no lleva número: va a quedar vacío.' });
  if (numeroCompletar) out.push({ nivel: 'aviso', texto: `El número se pide como campo a completar («${numeroCompletar.label}»). Si lo asigna el sistema, use «Número del escrito».` });
  // Número del documento escrito a mano con un campo a completar que no corresponde (ej.: «DISPOSICIÓN N° [Completar:DNI]»).
  const tramo = html.replace(/<[^>]+>/g, '').match(/(DISPOSICI[ÓO]N|RESOLUCI[ÓO]N|FALLO)\s+N\s*[°º]\s*\[Completar:([^\]:]+)/i);
  if (tramo && !/n[°º]|n[uú]mero|nro/i.test(tramo[2])) out.push({ nivel: 'aviso', texto: `Después de «${tramo[1]} N°» hay un campo «${tramo[2]}»: revise si corresponde «Número del escrito».` });
  if (p.estado_resultante && Number(p.requiere_revision) !== 1) out.push({ nivel: 'aviso', texto: `Cambia la causa a «${p.estado_resultante}» sin revisión ni firma de la Directora.` });
  if (p.estado_resultante && p.estados_origen?.includes(p.estado_resultante) && p.estados_origen.length === 1) out.push({ nivel: 'aviso', texto: 'Solo se recomienda en el mismo estado al que lleva la causa.' });
  const vacios = ms.filter((m) => m.clase === 'completar' && !m.label);
  if (vacios.length) out.push({ nivel: 'error', texto: 'Hay un campo a completar sin nombre.' });
  return out;
}

// ---------------------------------------------------------------------------
// Comparación de versiones (por párrafo y, dentro de los cambiados, por palabra)
// ---------------------------------------------------------------------------
export type Tramo = { t: '=' | '+' | '-'; s: string };

function lcs<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean): Tramo[] | null {
  const n = a.length, m = b.length;
  if (n * m > 4_000_000) return null;
  const dp = new Uint32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i * (m + 1) + j] = eq(a[i], b[j]) ? dp[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(dp[(i + 1) * (m + 1) + j], dp[i * (m + 1) + j + 1]);
  }
  const out: Tramo[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (eq(a[i], b[j])) { out.push({ t: '=', s: String(a[i]) }); i++; j++; }
    else if (dp[(i + 1) * (m + 1) + j] >= dp[i * (m + 1) + j + 1]) { out.push({ t: '-', s: String(a[i]) }); i++; }
    else { out.push({ t: '+', s: String(b[j]) }); j++; }
  }
  while (i < n) out.push({ t: '-', s: String(a[i++]) });
  while (j < m) out.push({ t: '+', s: String(b[j++]) });
  return out;
}

/** Diferencias entre dos textos: una lista de párrafos, cada uno con sus tramos iguales / agregados / quitados. */
export function diferencias(antes: string, despues: string): Tramo[][] {
  const pa = textoPlano(antes).split('\n');
  const pb = textoPlano(despues).split('\n');
  const parrafos = lcs(pa, pb, (x, y) => x === y) ?? [...pa.map((s) => ({ t: '-' as const, s })), ...pb.map((s) => ({ t: '+' as const, s }))];
  const out: Tramo[][] = [];
  for (let k = 0; k < parrafos.length; k++) {
    const p = parrafos[k];
    if (p.t === '=') { out.push([p]); continue; }
    // Un párrafo quitado seguido de uno agregado: se comparan por palabra.
    const sig = parrafos[k + 1];
    if (p.t === '-' && sig?.t === '+') {
      const w = lcs(p.s.split(/(\s+)/), sig.s.split(/(\s+)/), (x, y) => x === y);
      if (w) { out.push(w); k++; continue; }
    }
    out.push([p]);
  }
  return out;
}

export function datosDe(p: Record<string, unknown>): DatosPlantilla {
  return {
    titulo: String(p.titulo ?? ''),
    categoria: String(p.categoria ?? 'General'),
    tipo_acta: String(p.tipo_acta ?? 'todas'),
    contenido_html: String(p.contenido_html ?? ''),
    estado_resultante: p.estado_resultante ? String(p.estado_resultante) : null,
    estados_origen: estadosOrigen(p.estados_origen),
    requiere_revision: Number(p.requiere_revision ?? 1) === 1 ? 1 : 0,
    numerable: Number(p.numerable ?? 0) === 1 ? 1 : 0,
  };
}
