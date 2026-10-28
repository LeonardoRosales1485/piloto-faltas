/** Membrete y pie institucional de los escritos (A4, Times New Roman 12, interlineado sencillo). */
export const PIE_INSTITUCIONAL = 'San Martín 2670. Ciudad de Los Polvorines. C.P.: 1613 - Tel.: 4660-9000 INT. 2079';

/** Membrete configurable (Configuración → Membretes, reunión 27/10). `categorias` vacío = el de por defecto. */
export type Membrete = { id: number; nombre: string; categorias: string; imagen_raw: string | null; titulo: string; subtitulo: string; activo: number };

/** Categorías extra (además de las de plantilla) para las hojas que no son escritos. */
export const CATEGORIAS_MEMBRETE_EXTRA = ['Legajo (adjuntos e historial)', 'Apremios (remito y carátula)', 'Juzgado de Paz (carátula)'];

let cache: Membrete[] | null = null;

/** Carga los membretes una vez por página (las hojas se arman de forma sincrónica después). */
export async function cargarMembretes(force = false): Promise<Membrete[]> {
  if (cache && !force) return cache;
  try {
    const { http } = await import('./api-client');
    cache = await http.get<Membrete[]>('/api/membretes');
  } catch {
    cache = [];
  }
  return cache;
}

function elegir(categoria?: string): Membrete | null {
  const activos = (cache ?? []).filter((m) => Number(m.activo) === 1);
  const cats = (m: Membrete) => String(m.categorias ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  return (categoria ? activos.find((m) => cats(m).includes(categoria)) : undefined) ?? activos.find((m) => !cats(m).length) ?? null;
}

const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function membreteHtml(origen = '', categoria?: string) {
  const m = elegir(categoria);
  if (!m) return `<div class="membrete"><img src="${origen}/images/Municipio_malvinas_argentinas_logo.png" alt="" style="height:48px"/><strong>MUNICIPALIDAD DE MALVINAS ARGENTINAS</strong>DIRECCIÓN DE FALTAS</div>`;
  const img = m.imagen_raw || `${origen}/images/Municipio_malvinas_argentinas_logo.png`;
  return `<div class="membrete"><img src="${img}" alt="" style="height:48px"/><strong>${esc(m.titulo || '')}</strong>${esc(m.subtitulo || '')}</div>`;
}

export function pieHtml() {
  return `<div class="pie-institucional">${PIE_INSTITUCIONAL}</div>`;
}

export function firmaHtml(doc: { firmado_cargo?: string | null; firmado_por?: string | null; firmado_at?: number | null; hash?: string | null; numero?: string | null; hash_por?: string | null; hash_at?: number | null }) {
  const fecha = (ms?: number | null) => (ms ? new Date(Number(ms)).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '');
  const codigo = (doc.hash ?? '').slice(0, 16).toUpperCase();
  if (!doc.firmado_por) {
    // Escrito definitivo sin firma: igual lleva el código, quién lo generó y cuándo (trazabilidad, minuta 20/10).
    return doc.hash && doc.hash_por ? `<div class="sello-firma"><strong>Documento definitivo</strong><br/>Generado por ${doc.hash_por} · ${fecha(doc.hash_at)}<br/>Código de verificación: ${codigo}</div>` : '';
  }
  return `<div class="sello-firma"><strong>Firmado digitalmente por ${doc.firmado_por}</strong><br/>${doc.firmado_cargo || 'Directora de Faltas'} · ${fecha(doc.firmado_at)}<br/>Código de verificación: ${codigo}<br/><em>Firma simulada en el piloto (P-04)</em></div>`;
}

export const CSS_HOJA = `
  @page { size: A4; margin: 20mm 20mm 20mm 25mm; }
  body { margin: 0; font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.15; color: #000; }
  .hoja { page-break-after: always; position: relative; }
  .hoja:last-child { page-break-after: auto; }
  p { margin: 0 0 8pt; }
  .membrete { text-align: center; border-bottom: 1px solid #000; padding-bottom: 6pt; margin-bottom: 14pt; font-size: 10pt; }
  .membrete img { display: block; margin: 0 auto 4pt; }
  .membrete strong { display: block; font-size: 12pt; }
  .pie-institucional { border-top: 1px solid #000; margin-top: 18pt; padding-top: 4pt; font-size: 9pt; text-align: center; }
  .sello-firma { margin-top: 24pt; margin-left: auto; width: 70%; border: 1px solid #000; padding: 6pt 8pt; font-size: 10pt; }
  .campo-vacio { background: transparent; }
  img.adjunto { max-width: 100%; }
`;
