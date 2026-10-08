/**
 * Campos a completar en los escritos: [Completar:Etiqueta] o [Completar:Etiqueta:tipo]
 * (tipo: texto | numero | fecha | moneda). Cada aparición es un campo distinto (c1, c2, ...).
 */
export const RE_COMPLETAR = /\[Completar:([^\]:]+)(?::(texto|numero|fecha|moneda))?\]/g;

export type CampoCompletar = { k: string; label: string; tipo: 'texto' | 'numero' | 'fecha' | 'moneda' };

export function camposCompletar(html: string): CampoCompletar[] {
  const out: CampoCompletar[] = [];
  let i = 0;
  for (const m of html.matchAll(RE_COMPLETAR)) {
    i += 1;
    out.push({ k: `c${i}`, label: m[1].trim(), tipo: (m[2] as CampoCompletar['tipo']) ?? 'texto' });
  }
  return out;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatearValor(v: string, tipo: CampoCompletar['tipo']) {
  if (!v) return v;
  if (tipo === 'fecha' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y}`;
  }
  if (tipo === 'moneda' && !Number.isNaN(Number(v))) {
    return Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return v;
}

/**
 * Reemplaza los campos por sus valores. Los vacíos quedan como el marcador original
 * (o resaltados como «............» si se pide para una vista previa).
 */
export function aplicarValores(html: string, valores: Record<string, string>, vacioComo: 'marcador' | 'puntos' = 'marcador') {
  let i = 0;
  return html.replace(RE_COMPLETAR, (m, _label: string, tipo?: string) => {
    i += 1;
    const v = (valores[`c${i}`] ?? '').trim();
    if (!v) return vacioComo === 'puntos' ? '<span class="campo-vacio">............</span>' : m;
    return esc(formatearValor(v, (tipo as CampoCompletar['tipo']) ?? 'texto'));
  });
}

export function faltantes(html: string, valores: Record<string, string>) {
  return camposCompletar(html).filter((c) => !(valores[c.k] ?? '').trim());
}

export function quedanMarcadores(html: string) {
  return new RegExp(RE_COMPLETAR.source).test(html);
}

/**
 * Word parte el texto en varios tramos con el mismo formato («<strong>[</strong><strong>Acta:Numero</strong>…»).
 * Se unen los tramos contiguos y se quitan las etiquetas que quedan dentro de un marcador, para que los
 * campos [Acta:…], [System:…] y [Completar:…] se reconozcan.
 */
export function normalizarHtml(html: string): string {
  let h = html;
  let prev = '';
  while (prev !== h) {
    prev = h;
    h = h.replace(/<\/(strong|u|em|b|i)><\1>/g, '');
  }
  prev = '';
  while (prev !== h) {
    prev = h;
    h = h.replace(/\[((?:Acta|System|Causa|Usuario|Completar|Documento)?[^\[\]<]*)<\/?(?:strong|u|em|b|i)>([^\[\]]*?)\]/g, '[$1$2]');
    h = h.replace(/\[<\/?(?:strong|u|em|b|i)>/g, '[');
  }
  return h;
}
