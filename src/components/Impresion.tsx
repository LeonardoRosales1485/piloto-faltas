'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { actaHtmlPorTipo } from '@/lib/acta-oficial';
import { CSS_HOJA, firmaHtml, membreteHtml, pieHtml } from '@/lib/membrete';
import { fechaHora } from '@/lib/dominio';
import { aplicarValores } from '@/lib/campos';

type R = Record<string, any>;

function hoja(doc: R) {
  let v: Record<string, string> = {};
  try { v = JSON.parse(doc.valores_json ?? '{}'); } catch { v = {}; }
  return `<section class="hoja">${membreteHtml()}${aplicarValores(doc.contenido_html ?? '', v, 'puntos')}${firmaHtml(doc)}${pieHtml()}</section>`;
}

/** Vista de impresión: un escrito o el legajo completo en orden cronológico (TR-04, SF-47). */
export function Impresion({ modo, uuid }: { modo: 'documento' | 'legajo'; uuid: string }) {
  const [html, setHtml] = useState('<p style="padding:2rem">Preparando el documento...</p>');

  useEffect(() => {
    (async () => {
      if (modo === 'documento') {
        const r = await http.get<{ documento: R }>(`/api/documento/${uuid}`);
        setHtml(hoja(r.documento));
      } else {
        const d = await http.get<R>(`/api/causa/${uuid}`);
        const partes: string[] = [];
        const acta = actaHtmlPorTipo(d.acta, { imagenes: (d.imagenes ?? []).map((x: R) => x.preview_raw).filter(Boolean) });
        partes.push(`<section class="hoja"><style>${acta.css}</style>${acta.html}</section>`);
        const docs = [...d.documentos].reverse();
        for (const doc of docs) {
          const full = await http.get<{ documento: R }>(`/api/documento/${doc.uuid}`);
          const x = full.documento;
          if (x.tipo === 'escrito') partes.push(hoja(x));
          else if (String(x.archivo_raw ?? '').startsWith('data:image')) partes.push(`<section class="hoja">${membreteHtml()}<p><strong>Adjunto:</strong> ${x.titulo} · ${fechaHora(x.date_created)}</p><img class="adjunto" src="${x.archivo_raw}"/>${pieHtml()}</section>`);
          else partes.push(`<section class="hoja">${membreteHtml()}<p><strong>Adjunto:</strong> ${x.titulo} (${x.archivo_nombre}) · ${fechaHora(x.date_created)}</p>${pieHtml()}</section>`);
        }
        const hist = d.historial.slice().reverse().map((h: R) => `<tr><td>${fechaHora(h.fecha)}</td><td>${h.usuario}</td><td>${h.accion}${h.estado_nuevo ? ` (${h.estado_anterior ?? '-'} → ${h.estado_nuevo})` : ''}</td><td>${h.detalle ?? ''}</td></tr>`).join('');
        partes.push(`<section class="hoja">${membreteHtml()}<p style="text-align:center"><strong>HISTORIAL DE LA CAUSA ${d.acta.legajoNumeroActa}</strong></p><table style="width:100%;border-collapse:collapse;font-size:9pt" border="1" cellpadding="3"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>${hist}</tbody></table>${pieHtml()}</section>`);
        // Legajo interno: incluye los memos (no se muestran en el portal del infractor).
        if ((d.memos ?? []).length) {
          const filas = d.memos.slice().reverse().map((m: R) => `<tr><td>${fechaHora(m.fecha)}</td><td>${m.usuario}</td><td style="white-space:pre-wrap">${String(m.texto).replace(/</g, '&lt;')}</td></tr>`).join('');
          partes.push(`<section class="hoja">${membreteHtml()}<p style="text-align:center"><strong>MEMOS INTERNOS · CAUSA ${d.acta.legajoNumeroActa}</strong></p><table style="width:100%;border-collapse:collapse;font-size:9pt" border="1" cellpadding="3"><thead><tr><th>Fecha</th><th>Usuario</th><th>Memo</th></tr></thead><tbody>${filas}</tbody></table>${pieHtml()}</section>`);
        }
        setHtml(partes.join(''));
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
