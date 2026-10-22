import type { Infraccion } from './types';

/**
 * Leyendas legales del acta (minuta 20/10/2026, A): boleta de inculpado y advertencia de compactación.
 * PROVISORIAS: redactadas por BOD hasta que la Dirección / Prensa pasen el texto definitivo. Se editan en
 * «Textos del portal» (llaves `leyenda_boleta_inculpado` y `leyenda_compactacion`); estos valores son el respaldo
 * cuando la llave no existe o no se pudo leer.
 */
let cache: Promise<Record<string, string>> | null = null;
/** Últimos textos leídos (para armar el acta sin esperar: la ventana de impresión se abre en el mismo clic). */
let cargados: Record<string, string> = {};

export const LEYENDAS_DEFECTO = {
  leyenda_boleta_inculpado:
    'BOLETA DE CITACIÓN DEL INCULPADO: la presente acta reemplaza a la licencia de conducir retenida y habilita a su titular a conducir en forma provisoria por el plazo de treinta (30) días corridos desde su confección (art. 72, Ley 24.449).',
  leyenda_compactacion:
    'ADVERTENCIA: el vehículo retenido que no sea retirado del depósito municipal dentro de los seis (6) meses de su ingreso será sometido a compactación, conforme a la normativa vigente.',
} as const;

export type LlaveLeyenda = keyof typeof LEYENDAS_DEFECTO;

/** Leyendas que corresponden al acta: inculpado si se retuvo la licencia (tránsito); compactación si se retuvo el vehículo. */
export function leyendasDelActa(i: Pick<Infraccion, 'infraccionTipoNombre' | 'retencionDeLicencia' | 'retencionDeVehiculo'>, textos: Partial<Record<string, string>> = cargados): string[] {
  const t = (k: LlaveLeyenda) => (textos[k] ?? '').trim() || LEYENDAS_DEFECTO[k];
  const out: string[] = [];
  const transito = (i.infraccionTipoNombre ?? 'multas') === 'multas';
  if (transito && Number(i.retencionDeLicencia) === 1) out.push(t('leyenda_boleta_inculpado'));
  if (Number(i.retencionDeVehiculo) === 1) out.push(t('leyenda_compactacion'));
  return out;
}

/** Textos del portal (públicos), una vez por página. Si fallan, quedan las leyendas por defecto. */
export function textosLeyendas(): Promise<Record<string, string>> {
  cache ??= fetch('/api/portal/textos')
    .then((r) => r.json() as Promise<{ data?: { textos?: Record<string, string> } }>)
    .then((b) => (cargados = b.data?.textos ?? {}))
    .catch(() => ({}));
  return cache;
}
