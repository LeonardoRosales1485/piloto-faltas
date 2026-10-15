'use client';

import JSZip from 'jszip';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hijos(el: Element, nombre: string): Element[] {
  return Array.from(el.children).filter((c) => c.namespaceURI === W && c.localName === nombre);
}

function hijo(el: Element | undefined, nombre: string): Element | undefined {
  return el ? hijos(el, nombre)[0] : undefined;
}

function activo(el: Element | undefined): boolean {
  if (!el) return false;
  const v = el.getAttributeNS(W, 'val');
  return v === null || !['0', 'false', 'none'].includes(v);
}

/** Texto de una corrida (w:r) con su formato básico. */
function corrida(r: Element): string {
  const pr = hijo(r, 'rPr');
  let txt = '';
  for (const c of Array.from(r.children)) {
    if (c.namespaceURI !== W) continue;
    if (c.localName === 't') txt += esc(c.textContent ?? '');
    else if (c.localName === 'tab') txt += '&emsp;';
    else if (c.localName === 'br' || c.localName === 'cr') txt += '<br/>';
  }
  if (!txt) return '';
  if (activo(hijo(pr, 'b'))) txt = `<strong>${txt}</strong>`;
  if (activo(hijo(pr, 'i'))) txt = `<em>${txt}</em>`;
  if (activo(hijo(pr, 'u'))) txt = `<u>${txt}</u>`;
  return txt;
}

/** Corridas de un párrafo, incluidas las que están dentro de hipervínculos, campos o controles de contenido. */
function contenidoParrafo(el: Element): string {
  let out = '';
  for (const c of Array.from(el.children)) {
    if (c.namespaceURI !== W) continue;
    if (c.localName === 'r') out += corrida(c);
    else if (['hyperlink', 'ins', 'smartTag', 'fldSimple', 'sdt', 'sdtContent'].includes(c.localName)) out += contenidoParrafo(c);
  }
  return out;
}

const ALINEACION: Record<string, string> = { center: 'center', right: 'right', end: 'right', both: 'justify', distribute: 'justify' };

function parrafo(p: Element): string {
  const jc = hijo(hijo(p, 'pPr'), 'jc')?.getAttributeNS(W, 'val') ?? '';
  const al = ALINEACION[jc];
  return `<p${al ? ` style="text-align:${al}"` : ''}>${contenidoParrafo(p)}</p>`;
}

function bloque(el: Element): string {
  if (el.localName === 'p') return parrafo(el);
  if (el.localName === 'tbl') {
    const filas = hijos(el, 'tr').map((tr) => `<tr>${hijos(tr, 'tc').map((tc) => `<td>${Array.from(tc.children).map(bloque).join('')}</td>`).join('')}</tr>`);
    return `<table style="width:100%;border-collapse:collapse" border="1">${filas.join('')}</table>`;
  }
  if (el.localName === 'sdt') return Array.from(hijo(el, 'sdtContent')?.children ?? []).map(bloque).join('');
  return '';
}

/**
 * Convierte un .docx en HTML simple (párrafos, alineación, negrita, cursiva, subrayado y tablas).
 * Se pierde el formato fino de Word a propósito: la hoja del sistema ya define tipografía, márgenes y membrete.
 */
export async function docxAHtml(archivo: File | ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(archivo instanceof File ? await archivo.arrayBuffer() : archivo);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('El archivo no parece un documento de Word (.docx).');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  if (!body) throw new Error('No se encontró el texto del documento.');
  return Array.from(body.children).map(bloque).join('').replace(/<p><\/p>(\s*<p><\/p>)+/g, '<p></p>');
}
