'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { fechaCorta, pesos } from '@/lib/dominio';
import { useCarga } from '@/lib/use-carga';
import { LoaderLogo } from './LoaderLogo';
import { TablaVista } from './TablaVista';

type R = Record<string, any>;
const COLS = [
  { k: 'multas', t: 'Multas' },
  { k: 'derechoOficina', t: 'Derecho de oficina' },
  { k: 'acarreo', t: 'Acarreo' },
  { k: 'estadia', t: 'Estadía' },
  { k: 'total', t: 'Total' },
] as const;

const mesAnterior = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const nombreMes = (m: string) => { const [a, n] = m.split('-').map(Number); return new Date(a, n - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }); };
const num = (n: number) => n.toFixed(2).replace('.', ',');
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Informe mensual para el Tribunal de Cuentas (minuta 20/10): por fecha de acreditación, por concepto. Exportable. */
export function InformeTribunal() {
  const [mes, setMes] = useState(mesAnterior);
  const [r, setR] = useState<R | null>(null);
  const [error, setError] = useState('');
  const [cargando, seguir] = useCarga();
  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(mes)) return;
    setError('');
    void seguir(http.get<R>(`/api/reportes/tribunal?mes=${mes}`).then(setR).catch((e: Error) => { setR(null); setError(e.message); }));
  }, [mes, seguir]);

  function csv() {
    if (!r) return;
    const filas = ['Fecha de acreditación;Boleta;Acta;Tipo;A nombre de;Multas;Derecho de oficina;Acarreo;Estadía;Total;Observación'];
    for (const f of r.filas) filas.push([fechaCorta(f.fecha), f.boleta, f.acta, f.tipo, String(f.aNombre ?? '').replace(/;/g, ','), num(f.multas), num(f.derechoOficina), num(f.acarreo), num(f.estadia), num(f.total), f.aConciliar ? 'Confirmado a mano, a conciliar' : ''].join(';'));
    const t = r.totales;
    filas.push(['TOTAL', `${t.cantidad} pagos`, '', '', '', num(t.multas), num(t.derechoOficina), num(t.acarreo), num(t.estadia), num(t.total), ''].join(';'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + filas.join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = `tribunal-de-cuentas-${mes}.csv`;
    a.click();
  }

  function imprimir() {
    if (!r) return;
    const w = window.open('', '_blank', 'width=1000,height=700');
    if (!w) return;
    const fila = (c: R) => COLS.map((x) => `<td class="n">${pesos(c[x.k])}</td>`).join('');
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Tribunal de Cuentas ${mes}</title><style>
      body{font-family:Arial,sans-serif;font-size:9pt;margin:12mm} h1{font-size:13pt;margin:0} h2{font-size:10pt;margin:10px 0 4px}
      table{width:100%;border-collapse:collapse} th,td{border:1px solid #999;padding:3px 4px} th{background:#eee} .n{text-align:right;white-space:nowrap} tfoot td{font-weight:700}
    </style></head><body>
      <h1>Municipalidad de Malvinas Argentinas · Dirección de Faltas</h1>
      <p>Informe mensual de recaudación para el Tribunal de Cuentas · <strong>${esc(nombreMes(mes))}</strong> · por fecha de acreditación. Emitido el ${new Date().toLocaleString('es-AR')}.</p>
      <h2>Resumen por tipo de acta</h2>
      <table><thead><tr><th>Tipo</th><th>Pagos</th>${COLS.map((c) => `<th>${c.t}</th>`).join('')}</tr></thead>
      <tbody>${r.porTipo.map((p: R) => `<tr><td>${esc(p.tipo)}</td><td class="n">${p.cantidad}</td>${fila(p)}</tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="n">${r.totales.cantidad}</td>${fila(r.totales)}</tr></tfoot></table>
      <h2>Detalle</h2>
      <table><thead><tr><th>Fecha</th><th>Boleta</th><th>Acta</th><th>Tipo</th>${COLS.map((c) => `<th>${c.t}</th>`).join('')}</tr></thead>
      <tbody>${r.filas.map((f: R) => `<tr><td>${fechaCorta(f.fecha)}</td><td>${esc(f.boleta)}${f.aConciliar ? ' *' : ''}</td><td>${esc(f.acta)}</td><td>${esc(f.tipo)}</td>${fila(f)}</tr>`).join('')}</tbody></table>
      ${r.aConciliar ? '<p>* Pago confirmado a mano por demora del clearing, pendiente de conciliación.</p>' : ''}
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  return (
    <div className="card-step mt-3">
      <div className="card-step-header">
        <h2>Informe mensual · Tribunal de Cuentas</h2>
        <p>Pagos acreditados en el mes, discriminados por multas, derecho de oficina, acarreo y estadía.</p>
      </div>
      <div className="card-step-body">
        <div className="d-flex flex-wrap gap-2 align-items-end mb-3 no-print">
          <div><label className="form-label-v2" htmlFor="tc-mes">Mes</label><input id="tc-mes" type="month" className="form-control form-control-sm" value={mes} onChange={(e) => setMes(e.target.value)} /></div>
          <button type="button" className="btn btn-sm btn-outline-success" disabled={!r?.filas?.length} onClick={csv}><i className="fa-solid fa-file-excel" aria-hidden="true" /> Exportar Excel (CSV)</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!r} onClick={imprimir}><i className="fa-solid fa-file-pdf" aria-hidden="true" /> Imprimir / PDF</button>
        </div>
        {error ? <div className="aviso aviso-peligro">{error}</div> : null}
        {cargando ? <LoaderLogo tam={48} texto="Cargando…" /> : r ? (
          <>
            <dl className="ficha mb-3">
              <div><dt>Pagos acreditados</dt><dd>{r.totales.cantidad}</dd></div>
              {COLS.map((c) => <div key={c.k}><dt>{c.t}</dt><dd>{pesos(r.totales[c.k])}</dd></div>)}
            </dl>
            {r.aConciliar ? <div className="aviso aviso-alerta mb-2">{r.aConciliar} pago(s) confirmados a mano siguen a conciliar.</div> : null}
            <TablaVista>
              <table className="table custom-table align-middle">
                <thead><tr><th>FECHA</th><th>BOLETA</th><th>ACTA</th><th>TIPO</th>{COLS.map((c) => <th key={c.k} className="text-end">{c.t.toUpperCase()}</th>)}</tr></thead>
                <tbody>
                  {r.filas.map((f: R) => (
                    <tr key={f.boleta}>
                      <td>{fechaCorta(f.fecha)}</td>
                      <td>{f.boleta}{f.aConciliar ? <span className="chip-ret retenido ms-1">A conciliar</span> : null}</td>
                      <td>{f.causaUuid ? <Link href={`/private/causa/${f.causaUuid}`}>{f.acta}</Link> : f.acta}</td>
                      <td>{f.tipo}</td>
                      {COLS.map((c) => <td key={c.k} className="text-end">{pesos(f[c.k])}</td>)}
                    </tr>
                  ))}
                  {!r.filas.length ? <tr><td colSpan={9}><div className="sin-resultados py-3"><p className="mb-0">No hay pagos acreditados en {nombreMes(mes)}.</p></div></td></tr> : null}
                </tbody>
              </table>
            </TablaVista>
          </>
        ) : null}
      </div>
    </div>
  );
}
