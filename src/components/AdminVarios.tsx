'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { fechaCorta, fechaHora, pesos } from '@/lib/dominio';
import { useNotify } from './NotifyProvider';

type R = Record<string, any>;

/** Textos del portal editables por Faltas (SF-68). */
export function AdminTextos() {
  const notify = useNotify();
  const [items, setItems] = useState<R[]>([]);
  useEffect(() => { http.get<R[]>('/api/admin/textos').then(setItems); }, []);
  return (
    <div className="pagina">
      {items.map((t, i) => (
        <div key={t.llave} className="card-step mb-3">
          <div className="card-step-header"><h2>{t.titulo}</h2></div>
          <div className="card-step-body">
            <textarea className="form-control" rows={4} value={t.texto} aria-label={t.titulo} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))} />
            <div className="botonera"><button type="button" className="btn btn-primary btn-sm" onClick={() => http.post('/api/admin/textos', { llave: t.llave, texto: t.texto }).then(() => notify.success('Texto guardado')).catch((e: Error) => notify.error('Error', e.message))}>Guardar</button></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Feriados para el cálculo de plazos en días hábiles. */
export function AdminFeriados() {
  const notify = useNotify();
  const [items, setItems] = useState<R[]>([]);
  const [fecha, setFecha] = useState('');
  const [desc, setDesc] = useState('');
  const cargar = useCallback(() => { http.get<R[]>('/api/admin/feriados').then(setItems); }, []);
  useEffect(cargar, [cargar]);
  const op = (b: R) => http.post('/api/admin/feriados', b).then(() => { notify.success('Listo'); cargar(); }).catch((e: Error) => notify.error('Error', e.message));
  return (
    <div className="pagina">
      <div className="card-step mb-3"><div className="card-step-body">
        <div className="row g-2 align-items-end">
          <div className="col-6 col-md-3"><label className="form-label-v2" htmlFor="f-f">Fecha</label><input id="f-f" type="date" className="form-control" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div className="col-6 col-md-6"><label className="form-label-v2" htmlFor="f-d">Descripción</label><input id="f-d" className="form-control" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="col-12 col-md-3"><button type="button" className="btn btn-primary w-100" disabled={!fecha} onClick={() => void op({ fecha, descripcion: desc })}>Agregar feriado</button></div>
        </div>
        <p className="texto-ayuda mt-2">El plazo de 5 días posteriores al fallo se cuenta en días hábiles: excluye sábados, domingos y estos feriados.</p>
      </div></div>
      <div className="card-step"><div className="card-step-body"><ul className="lista-items">
        {items.map((f) => <li key={f.fecha}><div><div className="li-titulo">{fechaCorta(`${f.fecha}T12:00`)}</div><div className="li-sub">{f.descripcion}</div></div><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void op({ fecha: String(f.fecha).slice(0, 10), borrar: true })}>Quitar</button></li>)}
      </ul></div></div>
    </div>
  );
}

/** Correos no-reply que envió el sistema (simulados en el piloto). */
export function Correos() {
  const [items, setItems] = useState<R[]>([]);
  useEffect(() => { http.get<R[]>('/api/admin/correos').then(setItems); }, []);
  return (
    <div className="pagina"><div className="card-step">
      <div className="card-step-header"><h2>Correos enviados</h2><p>En el piloto los correos no salen: quedan registrados acá para verificar el circuito.</p></div>
      <div className="card-step-body"><ul className="lista-items">
        {items.map((c) => <li key={c.id}><div><div className="li-titulo">{c.asunto}</div><div className="li-sub">Para {c.para} · {fechaHora(c.date_created)}</div><div className="li-sub">{c.cuerpo}</div></div></li>)}
        {!items.length ? <li><span className="texto-ayuda">Todavía no se enviaron correos.</span></li> : null}
      </ul></div>
    </div></div>
  );
}

/** Auditoría por agente y período (SF-78). */
export function Auditoria() {
  const [usuario, setUsuario] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [items, setItems] = useState<R[]>([]);
  useEffect(() => {
    const t = setTimeout(() => http.get<R[]>(`/api/auditoria?usuario=${encodeURIComponent(usuario)}&desde=${desde}&hasta=${hasta}`).then(setItems), 300);
    return () => clearTimeout(t);
  }, [usuario, desde, hasta]);
  return (
    <div className="pagina">
      <div className="filtros-card filtros-card-compacto mb-2"><div className="row g-2 p-2">
        <div className="col-12 col-md-6"><label className="form-label-v2" htmlFor="a-u">Usuario</label><input id="a-u" className="form-control form-control-sm" value={usuario} onChange={(e) => setUsuario(e.target.value)} /></div>
        <div className="col-6 col-md-3"><label className="form-label-v2" htmlFor="a-d">Desde</label><input id="a-d" type="date" className="form-control form-control-sm" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
        <div className="col-6 col-md-3"><label className="form-label-v2" htmlFor="a-h">Hasta</label><input id="a-h" type="date" className="form-control form-control-sm" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
      </div></div>
      <div className="card-step"><div className="table-responsive"><table className="table custom-table align-middle">
        <thead><tr><th>FECHA</th><th>USUARIO</th><th>CAUSA</th><th>ACCIÓN</th><th>DETALLE</th></tr></thead>
        <tbody>{items.map((h) => <tr key={h.id}><td>{fechaHora(h.fecha)}</td><td>{h.usuario}</td><td><Link href={`/private/causa/${h.infraccion?.uuid}`}>{h.infraccion?.legajo_numero_acta}</Link></td><td>{h.accion}{h.estado_nuevo ? <div className="texto-ayuda">{h.estado_anterior} → {h.estado_nuevo}</div> : null}</td><td className="texto-ayuda">{h.detalle}</td></tr>)}</tbody>
      </table></div></div>
    </div>
  );
}

function Tabla({ titulo, datos, dinero }: { titulo: string; datos: Record<string, number>; dinero?: boolean }) {
  const filas = Object.entries(datos).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...filas.map((f) => f[1]));
  return (
    <div className="card-step mb-3">
      <div className="card-step-header"><h2>{titulo}</h2></div>
      <div className="card-step-body">
        {filas.map(([k, v]) => (
          <div key={k} className="d-flex align-items-center gap-2 mb-1">
            <span style={{ width: '40%', fontSize: '0.85rem' }}>{k}</span>
            <span style={{ flex: 1, background: 'var(--bo-fondo)', borderRadius: 4 }}><span style={{ display: 'block', width: `${(v / max) * 100}%`, height: 14, background: 'var(--bo-azul)', borderRadius: 4 }} /></span>
            <span style={{ width: 110, textAlign: 'right', fontWeight: 600 }}>{dinero ? pesos(v) : v}</span>
          </div>
        ))}
        {!filas.length ? <span className="texto-ayuda">Sin datos en el período.</span> : null}
      </div>
    </div>
  );
}

/** Reportes y estadísticas con exportación a CSV (Excel) y PDF (SF-71 a SF-74). */
export function Reportes() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [r, setR] = useState<R | null>(null);
  useEffect(() => { http.get<R>(`/api/reportes?desde=${desde}&hasta=${hasta}`).then(setR); }, [desde, hasta]);

  function csv() {
    if (!r) return;
    const filas: string[] = ['Sección;Clave;Valor'];
    for (const [sec, obj] of Object.entries({ 'Por tipo': r.porTipo, 'Por estado': r.porEstado, 'Por mes': r.porMes, 'Por artículo': r.porArticulo, 'Medidas': r.medidas, 'Pagos por mes y área': r.pagosPorMes })) {
      for (const [k, v] of Object.entries(obj as Record<string, number>)) filas.push(`${sec};${k};${v}`);
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + filas.join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = `reporte-faltas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="pagina">
      <div className="filtros-card filtros-card-compacto mb-2 no-print"><div className="row g-2 p-2 align-items-end">
        <div className="col-6 col-md-3"><label className="form-label-v2" htmlFor="r-d">Desde</label><input id="r-d" type="date" className="form-control form-control-sm" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
        <div className="col-6 col-md-3"><label className="form-label-v2" htmlFor="r-h">Hasta</label><input id="r-h" type="date" className="form-control form-control-sm" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
        <div className="col-12 col-md-6 d-flex gap-2 justify-content-end"><button type="button" className="btn btn-sm btn-outline-success" onClick={csv}><i className="fa-solid fa-file-excel" aria-hidden="true" /> Exportar Excel (CSV)</button><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => window.print()}><i className="fa-solid fa-file-pdf" aria-hidden="true" /> PDF</button></div>
      </div></div>
      {r ? (
        <>
          <div className="card-step mb-3"><div className="card-step-body"><dl className="ficha">
            <div><dt>Actas en el período</dt><dd>{r.total}</dd></div>
            <div><dt>Recaudado (acreditado)</dt><dd>{pesos(r.recaudado)}</dd></div>
            <div><dt>Licencias retenidas</dt><dd>{r.medidas.licencias}</dd></div>
            <div><dt>Vehículos retenidos</dt><dd>{r.medidas.vehiculos}</dd></div>
            <div><dt>Medidas de contravención</dt><dd>{r.medidas.contravencion}</dd></div>
            <div><dt>Medidas vigentes</dt><dd>{r.medidas.vigentes}</dd></div>
          </dl></div></div>
          <div className="row g-3">
            <div className="col-12 col-lg-6"><Tabla titulo="Actas por tipo" datos={r.porTipo} /><Tabla titulo="Actas por mes" datos={r.porMes} /><Tabla titulo="Informe mensual de pagos por área" datos={r.pagosPorMes} dinero /></div>
            <div className="col-12 col-lg-6"><Tabla titulo="Causas por estado" datos={r.porEstado} /><Tabla titulo="Actas por artículo" datos={r.porArticulo} /></div>
          </div>
        </>
      ) : null}
    </div>
  );
}
