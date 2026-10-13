'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { TablaVista } from './TablaVista';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { fechaCorta, pesos } from '@/lib/dominio';
import { useCarga } from '@/lib/use-carga';
import { LoaderLogo } from './LoaderLogo';
import { useNotify } from './NotifyProvider';

type R = Record<string, any>;
const RANGOS = [{ v: '30', t: 'Últimos 30 días' }, { v: 'anio', t: 'Este año' }, { v: 'todo', t: 'Todo' }];
const aFecha = (ms: number) => new Date(ms - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/** Retenciones de vehículos (acarreo y depósito), simple como en stg: estadísticas, filtro por fechas y listado. */
export function Retenciones() {
  const notify = useNotify();
  const router = useRouter();
  const [rango, setRango] = useState('30');
  const [desde, setDesde] = useState(() => aFecha(Date.now() - 30 * 86400000));
  const [hasta, setHasta] = useState(() => aFecha(Date.now()));
  const [d, setD] = useState<R | null>(null);
  const [liberar, setLiberar] = useState<R | null>(null);
  const [ingreso, setIngreso] = useState('');
  const [aNombre, setANombre] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargando, seguir] = useCarga();

  const cargar = useCallback(() => {
    const q = new URLSearchParams();
    if (desde) q.set('desde', String(new Date(`${desde}T00:00`).getTime()));
    if (hasta) q.set('hasta', String(new Date(`${hasta}T23:59:59`).getTime()));
    void seguir(http.get<R>(`/api/retenciones?${q}`).then(setD));
  }, [desde, hasta, seguir]);
  useEffect(cargar, [cargar]);

  function elegirRango(v: string) {
    setRango(v);
    if (v === '30') { setDesde(aFecha(Date.now() - 30 * 86400000)); setHasta(aFecha(Date.now())); }
    else if (v === 'anio') { setDesde(`${new Date().getFullYear()}-01-01`); setHasta(aFecha(Date.now())); }
    else { setDesde(''); setHasta(''); }
  }

  async function confirmarLiberacion() {
    if (!liberar) return;
    setEnviando(true);
    try {
      const r = await http.post<R>('/api/causa/accion', { uuid: liberar.uuid, accion: 'liberar_vehiculo', datos: { ingresoAt: new Date(`${ingreso}T12:00`).getTime(), aNombre } });
      notify.success('Vehículo liberado', `Boleta por ${pesos(r.total)} emitida.${r.disposicion ? ' La disposición de levantamiento quedó en borrador.' : ''}`, r.disposicion ? { texto: 'Ver disposición', href: `/private/escrito/${r.disposicion}` } : undefined);
      setLiberar(null);
      cargar();
    } catch (e) {
      notify.error('No se pudo liberar', (e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const e = d?.estadisticas ?? {};
  const tarjetas = [
    { t: 'Vehículos retenidos', v: e.retenidos ?? 0, i: 'fa-solid fa-lock', c: 'aviso' },
    { t: 'Vehículos liberados', v: e.liberados ?? 0, i: 'fa-solid fa-lock-open', c: 'ok' },
    { t: 'Vehículos totales', v: e.totales ?? 0, i: 'fa-solid fa-car', c: 'info' },
    { t: 'Monto pendiente', v: pesos(e.pendiente ?? 0), i: 'fa-solid fa-hourglass-half', c: 'aviso' },
    { t: 'Monto recaudado', v: pesos(e.recaudado ?? 0), i: 'fa-solid fa-sack-dollar', c: 'ok' },
    { t: 'Monto total', v: pesos(e.total ?? 0), i: 'fa-solid fa-coins', c: 'info' },
  ];

  return (
    <div className="pagina">
      <div className="card-step mb-3">
        <div className="card-step-header"><h2>Estadísticas</h2><p>Según la fecha de ingreso al depósito. Los montos pendientes son estimados a hoy.</p></div>
        <div className="card-step-body">
          <div className="retenciones-stats">
            {tarjetas.map((x) => (
              <div key={x.t} className={`ret-stat ret-${x.c}`}>
                <i className={x.i} aria-hidden="true" />
                <span>{x.t}</span>
                <strong>{x.v}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-step mb-3">
        <div className="card-step-body d-flex flex-wrap gap-2 align-items-end">
          <div className="bandeja-tabs m-0">
            {RANGOS.map((r) => <button key={r.v} type="button" className={`bandeja-tab ${rango === r.v ? 'activa' : ''}`} onClick={() => elegirRango(r.v)}>{r.t}</button>)}
          </div>
          <label className="form-group mb-0">Desde<input type="date" className="form-control" value={desde} onChange={(ev) => { setDesde(ev.target.value); setRango(''); }} /></label>
          <label className="form-group mb-0">Hasta<input type="date" className="form-control" value={hasta} onChange={(ev) => { setHasta(ev.target.value); setRango(''); }} /></label>
        </div>
      </div>

      <div className="card-step">
        <div className="card-step-header"><h2>Listado de retenciones</h2><p>Actas con retención de vehículo. Al liberar se cobra el acarreo según el tipo de vehículo y la estadía según los días en depósito.</p></div>
        <div className="card-step-body">
          {cargando && !d ? <LoaderLogo tam={56} texto="Cargando…" /> : (
            <TablaVista>
              <table className="table custom-table align-middle">
                <thead><tr><th>Acta</th><th>Dominio</th><th>Vehículo</th><th>Ingreso</th><th className="text-end">Días</th><th>Estado</th><th className="text-end">A pagar</th><th /></tr></thead>
                <tbody>
                  {(d?.lista ?? []).map((x: R) => (
                    <tr key={x.uuid}>
                      <td><Link href={`/private/causa/${x.uuid}`} className="fw-semibold">{x.acta}</Link><div className="texto-ayuda">{x.infractor ?? 'NN'}</div></td>
                      <td>{x.dominio || '-'}</td>
                      <td>{x.tipoVehiculo || '-'}<div className="texto-ayuda">{x.clase}</div></td>
                      <td>{fechaCorta(x.ingreso)}</td>
                      <td className="text-end">{x.dias}</td>
                      <td><span className={`chip-ret ${x.estado === 'Liberado' ? 'liberado' : 'retenido'}`}>{x.estado}</span>{x.liberadoAt ? <div className="texto-ayuda">{fechaCorta(x.liberadoAt)}{x.pagado ? ' · pagado' : ''}</div> : null}</td>
                      <td className="text-end" title={`Acarreo ${pesos(x.calculo.acarreo)} + estadía ${pesos(x.calculo.estadia)} (${x.calculo.tramo})`}>{pesos(x.calculo.total)}</td>
                      <td className="text-end">
                        {x.estado === 'Retenido' ? (
                          <button type="button" className="btn btn-sm btn-success" onClick={() => { setLiberar(x); setIngreso(aFecha(x.ingreso)); setANombre(x.infractor ?? ''); }}>
                            <i className="fa-solid fa-lock-open" aria-hidden="true" /> Liberar
                          </button>
                        ) : <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => router.push(`/private/causa/${x.uuid}`)}>Ver causa</button>}
                      </td>
                    </tr>
                  ))}
                  {d && !d.lista.length ? <tr><td colSpan={8}><div className="sin-resultados py-3"><p className="mb-0">Sin retenciones en el período.</p></div></td></tr> : null}
                </tbody>
              </table>
            </TablaVista>
          )}
        </div>
      </div>

      {liberar ? (
        <div className="modal-fake-overlay" onClick={(ev) => ev.target === ev.currentTarget && setLiberar(null)}>
          <div className="modal-fake" role="dialog" aria-modal="true" aria-label="Liberar vehículo">
            <div className="modal-fake-header">
              <i className="fa-solid fa-lock-open" aria-hidden="true" />
              <h2>Liberar vehículo · {liberar.dominio || liberar.acta}</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setLiberar(null)}>&times;</button>
            </div>
            <div className="modal-fake-body">
              <div className="form-group mb-3">
                <label htmlFor="ret-ingreso">Fecha de ingreso al depósito</label>
                <input id="ret-ingreso" type="date" className="form-control" value={ingreso} max={aFecha(Date.now())} onChange={(ev) => setIngreso(ev.target.value)} />
              </div>
              <div className="form-group mb-3">
                <label htmlFor="ret-nombre">Boleta a nombre de</label>
                <input id="ret-nombre" className="form-control" value={aNombre} onChange={(ev) => setANombre(ev.target.value)} />
              </div>
              {(() => {
                const dias = Math.max(1, Math.ceil((Date.now() - new Date(`${ingreso}T12:00`).getTime()) / 86400000));
                const mismo = dias === liberar.calculo.dias;
                return (
                  <table className="table table-sm mb-0">
                    <tbody>
                      <tr><td>Acarreo ({liberar.calculo.claseNombre})</td><td className="text-end">{pesos(liberar.calculo.acarreo)}</td></tr>
                      <tr><td>Estadía: {mismo ? `${liberar.calculo.dias} días · ${liberar.calculo.tramo}` : `${dias} días (se recalcula al confirmar)`}</td><td className="text-end">{mismo ? pesos(liberar.calculo.estadia) : '—'}</td></tr>
                      <tr className="fw-bold"><td>Total a pagar</td><td className="text-end">{mismo ? pesos(liberar.calculo.total) : 'se calcula al confirmar'}</td></tr>
                    </tbody>
                  </table>
                );
              })()}
              <p className="texto-ayuda mt-2 mb-0">Se emite la boleta (Malvinas 2000 simulado) y se registra la liberación. Si la retención es la medida vigente, queda la disposición de levantamiento en borrador.</p>
            </div>
            <div className="modal-fake-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setLiberar(null)}>Cancelar</button>
              <button type="button" className="btn btn-success" disabled={enviando || !ingreso} onClick={() => void confirmarLiberacion()}>Liberar y emitir boleta</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
