/**
 * Genera un .docx real (Office Open XML) en el navegador, sin dependencias: un ZIP sin compresión con los
 * cuatro archivos mínimos. Alcanza para escritos de texto (título en negrita + párrafos) que se abren en Word,
 * LibreOffice, Google Docs y en el celular.
 */
export type ParrafoDocx = { texto: string; negrita?: boolean; centrado?: boolean; tamano?: number };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function parrafoXml(p: ParrafoDocx) {
  const rpr = `<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>${p.negrita ? '<w:b/>' : ''}<w:sz w:val="${(p.tamano ?? 12) * 2}"/></w:rPr>`;
  const ppr = `<w:pPr><w:spacing w:after="200" w:line="360" w:lineRule="auto"/>${p.centrado ? '<w:jc w:val="center"/>' : '<w:jc w:val="both"/>'}</w:pPr>`;
  return `<w:p>${ppr}<w:r>${rpr}<w:t xml:space="preserve">${esc(p.texto)}</w:t></w:r></w:p>`;
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(b: Uint8Array) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

function zip(archivos: { nombre: string; datos: string }[]): Uint8Array {
  const enc = new TextEncoder();
  const locales: Uint8Array[] = []; const centrales: Uint8Array[] = []; let offset = 0;
  for (const a of archivos) {
    const nombre = enc.encode(a.nombre); const datos = enc.encode(a.datos); const crc = crc32(datos);
    const loc = new DataView(new ArrayBuffer(30));
    loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true); loc.setUint16(8, 0, true);
    loc.setUint16(10, 0, true); loc.setUint16(12, 0x21, true); loc.setUint32(14, crc, true); loc.setUint32(18, datos.length, true);
    loc.setUint32(22, datos.length, true); loc.setUint16(26, nombre.length, true); loc.setUint16(28, 0, true);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true); cen.setUint16(12, 0, true); cen.setUint16(14, 0x21, true); cen.setUint32(16, crc, true);
    cen.setUint32(20, datos.length, true); cen.setUint32(24, datos.length, true); cen.setUint16(28, nombre.length, true);
    cen.setUint32(42, offset, true);
    locales.push(new Uint8Array(loc.buffer), nombre, datos);
    centrales.push(new Uint8Array(cen.buffer), nombre);
    offset += 30 + nombre.length + datos.length;
  }
  const tamCentral = centrales.reduce((s, x) => s + x.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentral, true); fin.setUint32(16, offset, true);
  const partes = [...locales, ...centrales, new Uint8Array(fin.buffer)];
  const out = new Uint8Array(partes.reduce((s, x) => s + x.length, 0)); let p = 0;
  for (const x of partes) { out.set(x, p); p += x.length; }
  return out;
}

export function crearDocx(parrafos: ParrafoDocx[]): Blob {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const archivos = [
    { nombre: '[Content_Types].xml', datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
    { nombre: '_rels/.rels', datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { nombre: 'word/_rels/document.xml.rels', datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>' },
    { nombre: 'word/document.xml', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${parrafos.map(parrafoXml).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>` },
  ];
  return new Blob([zip(archivos) as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
