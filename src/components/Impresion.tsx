'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { actaHtmlPorTipo } from '@/lib/acta-oficial';
import { textosLeyendas } from '@/lib/leyendas';
import { cargarMembretes, CSS_HOJA, firmaHtml, membreteHtml, pieHtml } from '@/lib/membrete';
import { fechaHora } from '@/lib/dominio';
import { aplicarValores, mostrarDocumento } from '@/lib/campos';
import { svgQr } from '@/lib/acta-oficial';
import { liberacionUrl } from '@/lib/print';

type R = Record<string, any>;

export function hoja(doc: R, causaUuid?: string) {
  let v: Record<string, string> = {};
  try { v = JSON.parse(doc.valores_json ?? '{}'); } catch { v = {}; }
  // Disposición de levantamiento firmada: lleva el QR que el corralón escanea para ver si la liberación sigue vigente.
  const qr = causaUuid && doc.plantilla?.codigo === 'DISPOSICION_LEVANTAMIENTO' && ['firmado', 'definitivo'].includes(doc.estado)
    ? `<div style="display:flex;align-items:center;gap:4mm;margin-top:6mm;font-size:9pt">${svgQr(liberacionUrl(causaUuid), '28mm')}<p>Control en el depósito municipal: escanee el código para verificar que la liberación está vigente antes de entregar el vehículo.</p></div>`
    : '';
  return `<section class="hoja">${membreteHtml('', doc.plantilla?.categoria)}${mostrarDocumento(aplicarValores(doc.contenido_html ?? '', v, 'puntos'), 'texto')}${firmaHtml(doc)}${qr}${pieHtml()}</section>`;
}

/**
 * Hojas del legajo de una causa (acta, escritos y adjuntos en orden, historial y, si se pide, memos internos).
 * Reunión 27/10: `piezas` elige y ordena qué va (ids «acta», «doc:<uuid>», «historial», «memos»); sin ella, todo
 * en el orden de siempre.
 */
export async function partesLegajo(d: R, { memos, piezas }: { memos: boolean; piezas?: string[] }): Promise<string[]> {
  await cargarMembretes();
  const orden = piezas ?? ['acta', ...[...d.documentos].reverse().map((x: R) => `doc:${x.uuid}`), 'historial', ...(memos ? ['memos'] : [])];
  const partes: string[] = [];
  for (const pz of orden) {
    if (pz === 'acta') {
      const acta = actaHtmlPorTipo(d.acta, { imagenes: (d.imagenes ?? []).map((x: R) => x.preview_raw).filter(Boolean), textos: await textosLeyendas() });
      partes.push(`<section class="hoja"><style>${acta.css}</style>${acta.html}</section>`);
    } else if (pz.startsWith('doc:')) {
      const doc = d.documentos.find((x: R) => x.uuid === pz.slice(4));
      if (!doc) continue;
      const full = await http.get<{ documento: R }>(`/api/documento/${doc.uuid}`);
      const x = full.documento;
      if (x.tipo === 'escrito') partes.push(hoja(x, d.acta?.uuid));
      else if (String(x.archivo_raw ?? '').startsWith('data:image')) partes.push(`<section class="hoja">${membreteHtml('', 'Legajo (adjuntos e historial)')}<p><strong>Adjunto:</strong> ${x.titulo} · ${fechaHora(x.date_created)}</p><img class="adjunto" src="${x.archivo_raw}"/>${pieHtml()}</section>`);
      else partes.push(`<section class="hoja">${membreteHtml('', 'Legajo (adjuntos e historial)')}<p><strong>Adjunto:</strong> ${x.titulo} (${x.archivo_nombre}) · ${fechaHora(x.date_created)}</p>${pieHtml()}</section>`);
    } else if (pz === 'historial') {
      const hist = d.historial.slice().reverse().map((h: R) => `<tr><td>${fechaHora(h.fecha)}</td><td>${h.usuario}</td><td>${h.accion}${h.estado_nuevo ? ` (${h.estado_anterior ?? '-'} → ${h.estado_nuevo})` : ''}</td><td>${h.detalle ?? ''}</td></tr>`).join('');
      partes.push(`<section class="hoja">${membreteHtml('', 'Legajo (adjuntos e historial)')}<p style="text-align:center"><strong>HISTORIAL DE LA CAUSA ${d.acta.legajoNumeroActa}</strong></p><table style="width:100%;border-collapse:collapse;font-size:9pt" border="1" cellpadding="3"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>${hist}</tbody></table>${pieHtml()}</section>`);
    } else if (pz === 'memos' && (d.memos ?? []).length) {
      // Legajo interno: incluye los memos (no se muestran en el portal del infractor).
      const filas = d.memos.slice().reverse().map((m: R) => `<tr><td>${fechaHora(m.fecha)}</td><td>${m.usuario}</td><td style="white-space:pre-wrap">${String(m.texto).replace(/</g, '&lt;')}</td></tr>`).join('');
      partes.push(`<section class="hoja">${membreteHtml('', 'Legajo (adjuntos e historial)')}<p style="text-align:center"><strong>MEMOS INTERNOS · CAUSA ${d.acta.legajoNumeroActa}</strong></p><table style="width:100%;border-collapse:collapse;font-size:9pt" border="1" cellpadding="3"><thead><tr><th>Fecha</th><th>Usuario</th><th>Memo</th></tr></thead><tbody>${filas}</tbody></table>${pieHtml()}</section>`);
    }
  }
  return partes;
}

/** Carátula de la remisión al Juzgado de Paz (exportación «Juzgado de Paz»). */
function caratulaJuzgado(d: R): string {
  const a = d.actaVigente ?? d.acta;
  const rec = (d.recursos ?? []).find((r: R) => r.estado !== 'resuelto') ?? (d.recursos ?? [])[0];
  return `<section class="hoja">${membreteHtml('', 'Juzgado de Paz (carátula)')}<p style="text-align:center;font-size:14pt"><strong>REMISIÓN AL JUZGADO DE PAZ</strong></p>
    <p><strong>Acta:</strong> ${a.legajoNumeroActa} · <strong>Legajo:</strong> ${a.legajoNumber}/${a.legajoAnio}</p>
    <p><strong>Imputado:</strong> ${a.infractorRazonSocial || a.infractorNombre || 'Sin identificar'} · ${a.infractorCuit ? `CUIT ${a.infractorCuit}` : `${a.infractorDocumentoTipoNombre || 'DNI'} ${a.infractorDocumentoNumero ?? ''}`}</p>
    ${rec ? `<p><strong>Recurso:</strong> ${rec.tipo ?? 'apelación'} · ${rec.instancia ?? ''}${rec.expediente ? ` · Expte. ${rec.expediente}` : ''}</p>` : ''}
    <p>Se remiten las actuaciones en el orden que sigue.</p>${pieHtml()}</section>`;
}

/** Vista de impresión: un escrito o el legajo completo en orden cronológico (TR-04, SF-47). */
export function Impresion({ modo, uuid }: { modo: 'documento' | 'legajo'; uuid: string }) {
  const [html, setHtml] = useState('<p style="padding:2rem">Preparando el documento...</p>');

  useEffect(() => {
    (async () => {
      await cargarMembretes();
      if (modo === 'documento') {
        const r = await http.get<{ documento: R; causa?: R }>(`/api/documento/${uuid}`);
        setHtml(hoja(r.documento, r.causa?.uuid));
      } else {
        const d = await http.get<R>(`/api/causa/${uuid}`);
        // Exportar (reunión 27/10): piezas elegidas y ordenadas, y carátula si va al Juzgado de Paz.
        const q = new URLSearchParams(window.location.search);
        const piezas = q.get('piezas') ? q.get('piezas')!.split(',').filter(Boolean) : undefined;
        const partes = await partesLegajo(d, { memos: !piezas, piezas });
        setHtml((q.get('destino') === 'juzgado' ? [caratulaJuzgado(d), ...partes] : partes).join(''));
      }
      setTimeout(() => window.print(), 600);
    })().catch((e) => setHtml(`<p style="padding:2rem">No se pudo preparar el documento: ${e.message}</p>`));
  }, [modo, uuid]);

  return (
    <div className="impresion">
      <style>{`${CSS_HOJA} body{background:#fff !important} .impresion{max-width:180mm;margin:0 auto;padding:10mm 0;font-family:'Times New Roman',Times,serif;font-size:12pt;color:#000} @media print{.impresion{padding:0}}`}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
