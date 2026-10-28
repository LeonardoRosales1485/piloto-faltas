/** Actas migradas (previas a este sistema): campos compartidos entre la pantalla y el servidor. */

export type ActaMigrada = {
  uuid: string; infraccion_tipo_id: number; numero_acta: string; fecha: string | null; legajo: string | null;
  infractor_nombre: string | null; infractor_documento: string | null; dominio: string | null; articulos: string | null;
  lugar: string | null; inspector: string | null; observaciones: string | null; archivo_nombre: string | null;
  lote: string | null; cargado_por: string; cargado_at: number; correcciones_json?: string; archivo_raw?: string | null;
};

/** Campos de datos (los que se buscan y se pueden corregir). El archivo no se corrige: es el original. */
export const CAMPOS_MIGRADA: { k: keyof ActaMigrada; t: string; csv: string }[] = [
  { k: 'numero_acta', t: 'N.° de acta', csv: 'numero' },
  { k: 'fecha', t: 'Fecha', csv: 'fecha' },
  { k: 'legajo', t: 'Legajo', csv: 'legajo' },
  { k: 'infractor_nombre', t: 'Infractor', csv: 'infractor' },
  { k: 'infractor_documento', t: 'DNI / CUIT', csv: 'documento' },
  { k: 'dominio', t: 'Dominio', csv: 'dominio' },
  { k: 'articulos', t: 'Artículos', csv: 'articulos' },
  { k: 'lugar', t: 'Lugar', csv: 'lugar' },
  { k: 'inspector', t: 'Inspector', csv: 'inspector' },
  { k: 'observaciones', t: 'Observaciones', csv: 'observaciones' },
];

export const TIPOS_MIGRADA = [
  { id: 1, t: 'Tránsito', csv: ['transito', 'tránsito', 't', '1'] },
  { id: 2, t: 'Contravenciones', csv: ['contravencion', 'contravención', 'contravenciones', 'c', '2'] },
  { id: 3, t: 'Sustancias alimenticias', csv: ['sustancias', 'sustancia', 's', '3'] },
];

/** Columnas de la planilla de importación (CSV con «;» o «,»). «archivo» = nombre del escaneo dentro del ZIP. */
export const COLUMNAS_CSV = ['tipo', ...CAMPOS_MIGRADA.map((c) => c.csv), 'archivo'];

export function tipoMigradaDe(v: unknown): number | null {
  const s = String(v ?? '').trim().toLowerCase();
  return TIPOS_MIGRADA.find((t) => t.csv.includes(s))?.id ?? null;
}

/** Fecha en AAAA-MM-DD; acepta DD/MM/AAAA, DD-MM-AAAA y AAAA-MM-DD. null si no se entiende. */
export function fechaMigrada(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
  if (m) {
    const anio = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${anio}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

/** Parte un CSV simple (separador «;» o «,», comillas dobles). La primera fila es el encabezado. */
export function parsearCsv(texto: string): Record<string, string>[] {
  const limpio = texto.replace(/^﻿/, '');
  const primera = limpio.split(/\r?\n/)[0] ?? '';
  const sep = (primera.match(/;/g)?.length ?? 0) >= (primera.match(/,/g)?.length ?? 0) ? ';' : ',';
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i];
    if (comillas) {
      if (ch === '"' && limpio[i + 1] === '"') { campo += '"'; i++; } else if (ch === '"') comillas = false; else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(campo); campo = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && limpio[i + 1] === '\n') i++;
      fila.push(campo); campo = '';
      if (fila.some((x) => x.trim())) filas.push(fila);
      fila = [];
    } else campo += ch;
  }
  fila.push(campo);
  if (fila.some((x) => x.trim())) filas.push(fila);
  if (!filas.length) return [];
  const enc = filas[0].map((h) => h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, ''));
  return filas.slice(1).map((f) => Object.fromEntries(enc.map((h, n) => [h, String(f[n] ?? '').trim()])));
}
