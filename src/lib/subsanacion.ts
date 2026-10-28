import type { CausaRow, Db } from './srv';

/**
 * Subsanación de datos (varias por causa desde la reunión 27/10: p. ej. transferencias sucesivas del vehículo). El acta firmada no se toca: las correcciones se guardan aparte
 * ({campo: {antes, despues}}) y se aplican al «dato vigente» que usan escritos, boletas, notificaciones y el portal.
 */
export type CampoSub = { k: string; t: string; grupo: string };

/**
 * Campos corregibles. `meta.x` = dato dentro de metadata_json; `leyes` = artículos (lista de claves).
 * Inalterables (minuta 20/10): dominio, lugar de la falta y ejido no se subsanan.
 */
export const CAMPOS_SUBSANABLES: CampoSub[] = [
  { k: 'infractor_nombre', t: 'Nombre y apellido', grupo: 'Infractor' },
  { k: 'infractor_razon_social', t: 'Razón social', grupo: 'Infractor' },
  { k: 'infractor_documento_numero', t: 'N.° de documento', grupo: 'Infractor' },
  { k: 'infractor_cuit', t: 'CUIT', grupo: 'Infractor' },
  { k: 'infractor_domicilio', t: 'Domicilio (calle)', grupo: 'Infractor' },
  { k: 'infractor_calle_altura', t: 'Altura', grupo: 'Infractor' },
  { k: 'infractor_departamento', t: 'Piso / depto.', grupo: 'Infractor' },
  { k: 'infractor_localidad_nombre', t: 'Localidad', grupo: 'Infractor' },
  { k: 'infractor_partido_nombre', t: 'Partido', grupo: 'Infractor' },
  { k: 'vehiculo_tipo_nombre', t: 'Tipo de vehículo', grupo: 'Vehículo' },
  { k: 'meta.marca', t: 'Marca', grupo: 'Vehículo' },
  { k: 'meta.modelo', t: 'Modelo', grupo: 'Vehículo' },
  { k: 'vehiculo_numero_licencia', t: 'N.° de licencia', grupo: 'Vehículo' },
  { k: 'leyes', t: 'Artículos', grupo: 'Artículos' },
  { k: 'observaciones', t: 'Observaciones', grupo: 'Otros' },
];

export type Cambio = { antes: string; despues: string };
export type SubsanacionFila = { id: number; uuid: string; infraccion_id: number; campos: Record<string, Cambio>; motivo: string; usuario: string; documento_id: number | null; date_created: number };
/** Subsanaciones acumuladas: `campos` = del acta original («antes») al dato vigente («despues»); `lista` = cada una. */
export type Subsanacion = SubsanacionFila & { lista: SubsanacionFila[] };

function meta(row: { metadata_json?: string | null }): Record<string, string> {
  try { return JSON.parse(String(row.metadata_json ?? '{}')) as Record<string, string>; } catch { return {}; }
}

/** Valor actual (original) de un campo en la fila del acta. Para «leyes» se pasa la lista aparte. */
export function valorDe(row: Record<string, unknown>, k: string, leyes: string[] = []): string {
  if (k === 'leyes') return leyes.join(' | ');
  if (k.startsWith('meta.')) return String(meta(row as { metadata_json?: string })[k.slice(5)] ?? '');
  return String(row[k] ?? '');
}

export async function subsanacionDe(d: Db, infraccionId: number): Promise<Subsanacion | null> {
  const { data } = await d.from('subsanacion').select('*').eq('infraccion_id', infraccionId).order('date_created', { ascending: true });
  const filas = ((data ?? []) as Record<string, unknown>[]).map((r) => {
    let campos: Record<string, Cambio> = {};
    try { campos = JSON.parse(String(r.campos_json)) as Record<string, Cambio>; } catch { /* vacío */ }
    return { ...(r as unknown as SubsanacionFila), campos };
  });
  if (!filas.length) return null;
  // Acumula: el «antes» es el del acta original (primera vez que se tocó el campo); el «despues», el último.
  const campos: Record<string, Cambio> = {};
  for (const f of filas) {
    for (const [k, c] of Object.entries(f.campos)) campos[k] = { antes: campos[k]?.antes ?? c.antes, despues: c.despues };
  }
  for (const k of Object.keys(campos)) if (campos[k].antes.trim() === campos[k].despues.trim()) delete campos[k];
  const ultima = filas[filas.length - 1];
  return { ...ultima, campos, lista: filas.slice().reverse() };
}

/** Fila del acta con los datos subsanados aplicados (dato vigente). No se guarda: es solo lectura. */
export function aplicarSubsanacion<T extends Record<string, unknown>>(row: T, sub: Subsanacion | null): T {
  if (!sub) return row;
  const out: Record<string, unknown> = { ...row };
  const m = meta(row as { metadata_json?: string });
  let tocoMeta = false;
  for (const [k, c] of Object.entries(sub.campos)) {
    if (k === 'leyes') continue;
    if (k.startsWith('meta.')) { m[k.slice(5)] = c.despues; tocoMeta = true; } else out[k] = c.despues;
  }
  if (tocoMeta) out.metadata_json = JSON.stringify(m);
  return out as T;
}

/** Claves de artículos vigentes (subsanados si corresponde). */
export function leyesVigentes(originales: string[], sub: Subsanacion | null): string[] {
  const c = sub?.campos.leyes;
  return c ? c.despues.split(' | ').map((x) => x.trim()).filter(Boolean) : originales;
}

export async function causaVigente(d: Db, c: CausaRow): Promise<CausaRow> {
  return aplicarSubsanacion(c as unknown as Record<string, unknown>, await subsanacionDe(d, c.id)) as unknown as CausaRow;
}
