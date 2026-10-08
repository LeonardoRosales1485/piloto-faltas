/** Membrete y pie institucional de los escritos (A4, Times New Roman 12, interlineado sencillo). */
export const PIE_INSTITUCIONAL = 'San Martín 2670. Ciudad de Los Polvorines. C.P.: 1613 - Tel.: 4660-9000 INT. 2079';

export function membreteHtml(origen = '') {
  return `<div class="membrete"><img src="${origen}/images/Municipio_malvinas_argentinas_logo.png" alt="" style="height:48px"/><strong>MUNICIPALIDAD DE MALVINAS ARGENTINAS</strong>DIRECCIÓN DE FALTAS</div>`;
}

export function pieHtml() {
  return `<div class="pie-institucional">${PIE_INSTITUCIONAL}</div>`;
}

export function firmaHtml(doc: { firmado_por?: string | null; firmado_at?: number | null; hash?: string | null; numero?: string | null }) {
  if (!doc.firmado_por) return '';
  const f = doc.firmado_at ? new Date(doc.firmado_at).toLocaleString('es-AR') : '';
  return `<div class="sello-firma"><strong>Firmado digitalmente por ${doc.firmado_por}</strong><br/>Directora de Faltas · ${f}<br/>Código de verificación: ${(doc.hash ?? '').slice(0, 16).toUpperCase()}<br/><em>Firma simulada en el piloto (P-04)</em></div>`;
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
