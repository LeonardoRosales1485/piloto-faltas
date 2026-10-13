'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { CSS_HOJA, membreteHtml, pieHtml } from '@/lib/membrete';
import { fechaCorta, fechaHora, pesos } from '@/lib/dominio';
import { partesLegajo } from './Impresion';

type R = Record<string, any>;
export type ExportApremios = { lote: string; fecha: number; usuario: string; causas: { uuid: string; multa: number; pagado: number; saldo: number; uf: number; unidades: number; derivada: boolean }[] };
export const claveExport = (lote: string) => `faltas:apremios:${lote}`;

const e = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tabla = (filas: [string, string][]) => `<table class="apr-datos">${filas.map(([k, v]) => `<tr><th>${e(k)}</th><td>${v || '-'}</td></tr>`).join('')}</table>`;

/** Datos del fallo firmado y su notificación (para la carátula de cada causa). */
function falloDe(d: R) {
  const fallo = (d.documentos as R[]).find((x) => x.plantilla?.categoria === 'Fallo' && ['firmado', 'definitivo'].includes(x.estado));
  const notif = fallo ? (d.notificaciones as R[]).find((n) => n.documento_id === fallo.id && n.estado === 'positiva') : null;
  return { fallo, notif };
}

function caratula(d: R, x: ExportApremios['causas'][number], lote: string) {
  const a = d.actaVigente ?? d.acta;
  const { fallo, notif } = falloDe(d);
  const titular = a.infractorRazonSocial || a.infractorNombre || 'NN';
  const docu = a.infractorCuit ? `CUIT ${a.infractorCuit}` : `${a.infractorDocumentoTipoNombre || 'DNI'} ${a.infractorDocumentoNumero ?? ''}`;
  const dom = [a.infractorDomicilio, a.infractorCalleAltura, a.infractorDepartamento, a.infractorLocalidadNombre, a.infractorPartidoNombre, a.infractorProvinciaNombre].filter(Boolean).join(', ');
  const leyes = (d.valorizacion?.leyes ?? []) as R[];
  const pagos = (d.boletas as R[]).filter((b) => b.estado === 'definitiva');
  return `<section class="hoja">${membreteHtml()}
    <p class="apr-titulo">CAUSA ${e(a.legajoNumeroActa)} · REMITIDA A APREMIOS</p>
    <p class="apr-sub">Lote ${e(lote)} · Legajo ${e(a.legajoNumber)}/${e(a.legajoAnio)}</p>
    <h3>Deudor</h3>
    ${tabla([['Nombre / razón social', e(titular)], ['Documento', e(docu)], ['Domicilio', e(dom)], ['Correo', e(a.infractorEmail)]])}
    <h3>Acta</h3>
    ${tabla([['N.° de acta', e(a.legajoNumeroActa)], ['Fecha y hora', e(String(a.legajoFecha ?? '').replace('T', ' '))], ['Lugar', e([a.domicilioInfraccionCalle, a.domicilioInfraccionNumero, a.domicilioInfraccionLocalidadNombre].filter(Boolean).join(' '))], ['Dominio', e(a.vehiculoNumeroDominio)], ['Inspector', e(a.inspectorUsername)], ['Notificada', d.acta.notificadaAt ? fechaCorta(d.acta.notificadaAt) : '']])}
    <h3>Fallo</h3>
    ${tabla([['Fallo', fallo ? `${e(fallo.titulo)}${fallo.numero ? ` N.° ${e(fallo.numero)}` : ''}` : 'Sin fallo firmado'], ['Firmado', fallo?.firmado_at ? `${fechaCorta(fallo.firmado_at)} por ${e(fallo.firmado_por)}` : ''], ['Notificado', notif?.fecha_resultado ? `${fechaCorta(notif.fecha_resultado)} (${e(notif.via)})` : '']])}
    <h3>Artículos y monto</h3>
    <table class="apr-tabla"><thead><tr><th>Norma</th><th>Artículo</th><th>Descripción</th><th class="r">Subtotal</th></tr></thead><tbody>
      ${leyes.map((l) => `<tr><td>${e(l.nombre)}</td><td>${e(l.articulo)}</td><td>${e(l.descripcion)}</td><td class="r">${pesos(Number(l.subtotal ?? 0))}</td></tr>`).join('')}
      <tr><td colspan="3" class="r">Multa${d.valorizacion?.ajustado != null ? ' (valorización ajustada)' : ''}</td><td class="r"><strong>${pesos(x.multa)}</strong></td></tr>
      ${pagos.map((b) => `<tr><td colspan="3" class="r">Pago acreditado · boleta ${e(b.numero)} (${b.pagado_at ? fechaCorta(b.pagado_at) : '-'})</td><td class="r">− ${pesos(Number(b.monto))}</td></tr>`).join('')}
      <tr class="apr-total"><td colspan="3" class="r">SALDO ADEUDADO al ${fechaCorta(Date.now())}</td><td class="r">${pesos(x.saldo)}</td></tr>
    </tbody></table>
    <p class="apr-nota">Monto calculado al momento de la exportación. Siguen el acta, los escritos y las constancias de la causa, y su historial.</p>
    ${pieHtml()}</section>`;
}

function remito(ex: ExportApremios, ds: R[]) {
  const total = ex.causas.reduce((s, c) => s + c.saldo, 0);
  const filas = ex.causas.map((c, i) => {
    const a = ds[i].actaVigente ?? ds[i].acta;
    return `<tr><td>${i + 1}</td><td>${e(a.legajoNumeroActa)}</td><td>${e(a.legajoNumber)}/${e(a.legajoAnio)}</td><td>${e(a.infractorRazonSocial || a.infractorNombre || 'NN')}</td><td>${e(a.infractorCuit || a.infractorDocumentoNumero)}</td><td class="r">${pesos(c.saldo)}</td></tr>`;
  }).join('');
  return `<section class="hoja">${membreteHtml()}
    <p class="apr-titulo">REMITO A LA DIRECCIÓN DE APREMIOS</p>
    <p class="apr-sub">Lote ${e(ex.lote)} · ${fechaHora(ex.fecha)} · ${ex.causas.length} causa(s)</p>
    <p>Se remiten las causas detalladas, con fallo firme, vencido el plazo sin pago ni apelación, para su cobro por vía de apremio. Cada causa se acompaña con su carátula de deuda y el legajo completo.</p>
    <table class="apr-tabla"><thead><tr><th>#</th><th>Acta</th><th>Legajo</th><th>Deudor</th><th>Documento</th><th class="r">Saldo</th></tr></thead>
      <tbody>${filas}<tr class="apr-total"><td colspan="5" class="r">TOTAL</td><td class="r">${pesos(total)}</td></tr></tbody></table>
    <div class="apr-firmas"><div>Preparó: ${e(ex.usuario)}</div><div>________________________<br/>Directora de Faltas</div></div>
    ${pieHtml()}</section>`;
}

/** PDF para Apremios: remito del lote + por cada causa, carátula de deuda y legajo (sin memos internos). */
export function ImpresionApremios({ lote }: { lote: string }) {
  const [html, setHtml] = useState('<p style="padding:2rem">Preparando el informe para Apremios...</p>');
  useEffect(() => {
    (async () => {
      let ex: ExportApremios | null = null;
      try { ex = JSON.parse(localStorage.getItem(claveExport(lote)) ?? 'null'); } catch { ex = null; }
      if (!ex) throw new Error('No se encontraron los datos de la exportación en este navegador. Vuelva a exportar desde las causas.');
      const ds: R[] = [];
      for (const c of ex.causas) ds.push(await http.get<R>(`/api/causa/${c.uuid}`));
      const partes = [remito(ex, ds)];
      for (let i = 0; i < ex.causas.length; i++) {
        partes.push(caratula(ds[i], ex.causas[i], ex.lote));
        partes.push(...(await partesLegajo(ds[i], { memos: false })));
      }
      setHtml(partes.join(''));
      document.title = `Apremios ${ex.lote}`;
      setTimeout(() => window.print(), 700);
    })().catch((err) => setHtml(`<p style="padding:2rem">${(err as Error).message}</p>`));
  }, [lote]);
  return (
    <div className="impresion">
      <style>{`${CSS_HOJA} body{background:#fff !important} .impresion{max-width:180mm;margin:0 auto;padding:10mm 0;font-family:'Times New Roman',Times,serif;font-size:11pt;color:#000} @media print{.impresion{padding:0}}
        .apr-titulo{text-align:center;font-weight:bold;font-size:13pt;margin:4mm 0 1mm} .apr-sub{text-align:center;margin:0 0 4mm}
        .impresion h3{font-size:11pt;margin:4mm 0 1mm;border-bottom:1px solid #000}
        .apr-datos{width:100%;border-collapse:collapse;font-size:10pt} .apr-datos th{width:38%;text-align:left;font-weight:normal;color:#333;padding:1px 4px} .apr-datos td{padding:1px 4px}
        .apr-tabla{width:100%;border-collapse:collapse;font-size:9.5pt;margin-top:2mm} .apr-tabla th,.apr-tabla td{border:1px solid #000;padding:2px 4px} .apr-tabla .r{text-align:right} .apr-total td{font-weight:bold}
        .apr-nota{font-size:9pt;font-style:italic;margin-top:3mm} .apr-firmas{display:flex;justify-content:space-between;margin-top:18mm;text-align:center}`}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
