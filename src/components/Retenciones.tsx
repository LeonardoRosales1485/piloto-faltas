'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { TablaVista } from './TablaVista';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { fechaCorta, fechaHora, pesos, REQUISITOS_LIBERACION } from '@/lib/dominio';
import { printConstanciaLiberacion } from '@/lib/print';
import { useCarga } from '@/lib/use-carga';
import { LoaderLogo } from './LoaderLogo';
import { ModalForm } from './ModalForm';
import { useNotify } from './NotifyProvider';
import { useRefresco } from '@/lib/use-refresco';

type R = Record<string, any>;
const RANGOS = [{ v: '30', t: 'Últimos 30 días' }, { v: 'anio', t: 'Este año' }, { v: 'todo', t: 'Todo' }];
/** Fase de la liberación (Informe 6.c): boleta de acarreo y estadía → pago → disposición firmada → liberación. */
const FASE: Record<string, { t: string; ayuda: string }> = {
  retenido: { t: 'Retenido', ayuda: 'Falta emitir la boleta de acarreo y estadía' },
  boleta: { t: 'Boleta emitida', ayuda: 'Esperando el pago de acarreo y estadía' },
  disposicion: { t: 'Falta disposición', ayuda: 'Pagado: falta la disposición de levantamiento firmada' },
  listo: { t: 'Listo para liberar', ayuda: 'Pagado y con disposición firmada' },
  liberado: { t: 'Liberado', ayuda: '' },
};
/** Control en el corralón (QR): si la liberación registrada sigue vigente, venció o ya se entregó el vehículo. */
const CONTROL: Record<string, { t: string; c: string }> = {
  vigente: { t: 'Vigente para retirar', c: 'liberado' },
  vencida: { t: 'Liberación vencida', c: 'retenido' },
  entregado: { t: 'Entregado', c: 'liberado' },
};
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
  const [entrega, setEntrega] = useState<R | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [registrar, setRegistrar] = useState<R | null>(null);
  const [detalleLib, setDetalleLib] = useState('');
  // Requisitos de la entrega presencial (minuta 20/10): todos tildados para registrar la liberación.
  const [requisitos, setRequisitos] = useState<string[]>([]);
  const [cargando, seguir] = useCarga();

  const cargar = useCallback((silencioso = false) => {
    const q = new URLSearchParams();
    if (desde) q.set('desde', String(new Date(`${desde}T00:00`).getTime()));
    if (hasta) q.set('hasta', String(new Date(`${hasta}T23:59:59`).getTime()));
    const p = http.get<R>(`/api/retenciones?${q}`).then(setD);
    void (silencioso ? p.catch(() => undefined) : seguir(p));
  }, [desde, hasta, seguir]);
  useEffect(() => cargar(), [cargar]);
  useRefresco(() => cargar(true));

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
      notify.success('Boleta emitida', `Acarreo y estadía por ${pesos(r.total)}. La liberación se registra cuando esté paga y con la disposición de levantamiento firmada.${r.disposicion ? ' La disposición quedó en borrador.' : ''}`, r.disposicion ? { texto: 'Ver disposición', href: `/private/escrito/${r.disposicion}` } : undefined);
      setLiberar(null);
      cargar();
    } catch (e) {
      notify.error('No se pudo emitir la boleta', (e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarRegistro() {
    if (!registrar) return;
    setEnviando(true);
    try {
      await http.post<R>('/api/causa/accion', { uuid: registrar.uuid, accion: 'registrar_liberacion', datos: { detalle: detalleLib, sinBoleta: !registrar.boletaEmitida, requisitos } });
      notify.success('Vehículo liberado', `Se registró la liberación del acta ${registrar.acta}.`);
      setRegistrar(null);
      cargar();
    } catch (e) {
      notify.error('No se pudo registrar la liberación', (e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function accionSimple(x: R, accion: string, ok: string, datos: R = {}) {
    setEnviando(true);
    try {
      const r = await http.post<R>('/api/causa/accion', { uuid: x.uuid, accion, datos });
      notify.success(ok, accion === 'boleta_complementaria' ? (r.diferencia > 0 ? `Diferencia a cobrar: ${pesos(r.diferencia)}. Con la boleta paga vuelve a estar vigente.` : 'Sin diferencia: la liberación vuelve a estar vigente.') : undefined);
      cargar();
    } catch (err) {
      notify.error('No se pudo completar', (err as Error).message);
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
        <div className="card-step-header"><h2>Listado de retenciones</h2><p>Actas con retención de vehículo. Primero se emite la boleta de acarreo (según el tipo de vehículo) y estadía (según los días en depósito); con la boleta paga y la disposición de levantamiento firmada por la Directora, se registra la liberación.</p></div>
        <div className="card-step-body">
          {cargando && !d ? <LoaderLogo tam={56} texto="Cargando…" /> : (
            <TablaVista>
              <table className="table custom-table align-middle">
                <thead><tr><th>Acta</th><th>Dominio</th><th>Vehículo</th><th>Ingreso</th><th className="text-end">Días</th><th>Estado</th><th className="text-end">A pagar</th><th /></tr></thead>
                <tbody>
                  {(d?.lista ?? []).map((x: R) => (
                    <tr key={x.uuid}>
                      <td><Link href={`/private/causa/${x.uuid}`} className="fw-semibold">{x.acta}</Link><div className="texto-ayuda">{x.infractor ?? 'No identificado'}</div></td>
                      <td>{x.dominio || '-'}</td>
                      <td>{x.tipoVehiculo || '-'}<div className="texto-ayuda">{x.clase}</div></td>
                      <td>{fechaCorta(x.ingreso)}</td>
                      <td className="text-end">{x.dias}</td>
                      <td><span className={`chip-ret ${x.estado === 'Liberado' ? 'liberado' : 'retenido'}`}>{FASE[x.fase]?.t ?? x.estado}</span>{x.liberadoAt ? <div className="texto-ayuda">{fechaCorta(x.liberadoAt)}{x.pagado ? ' · pagado' : ''}</div> : FASE[x.fase]?.ayuda ? <div className="texto-ayuda">{FASE[x.fase].ayuda}</div> : null}
                        {CONTROL[x.control] && (x.liberadoAt || x.control === 'vencida') ? <div><span className={`chip-ret ${CONTROL[x.control].c}`}>{CONTROL[x.control].t}</span>{x.control === 'vigente' && x.vigenteHasta ? <div className="texto-ayuda">hasta {fechaHora(x.vigenteHasta)}</div> : x.control === 'entregado' ? <div className="texto-ayuda">{fechaHora(x.entregadoAt)}</div> : null}</div> : null}</td>
                      <td className="text-end" title={`Acarreo ${pesos(x.calculo.acarreo)} + estadía ${pesos(x.calculo.estadia)} (${x.calculo.tramo})`}>{pesos(x.calculo.total)}</td>
                      <td className="text-end">
                        <div className="d-inline-flex flex-wrap gap-1 justify-content-end">
                          {x.fase === 'retenido' ? (
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => { setLiberar(x); setIngreso(aFecha(x.ingreso)); setANombre(x.infractor ?? ''); }}>
                              <i className="fa-solid fa-receipt" aria-hidden="true" /> Emitir boleta
                            </button>
                          ) : null}
                          {x.control === 'vencida' || (x.control === 'pendiente_pago' && x.boletaVencida) ? (
                            <button type="button" className="btn btn-sm btn-warning" disabled={enviando} onClick={() => void accionSimple(x, 'boleta_complementaria', 'Boleta complementaria')}>
                              <i className="fa-solid fa-receipt" aria-hidden="true" /> Boleta complementaria
                            </button>
                          ) : null}
                          {x.control === 'vigente' ? (
                            <>
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => printConstanciaLiberacion({ uuid: x.uuid, acta: x.acta, dominio: x.dominio, vehiculo: x.tipoVehiculo, vigenteHasta: x.vigenteHasta })}>
                                <i className="fa-solid fa-qrcode" aria-hidden="true" /> Constancia QR
                              </button>
                              <button type="button" className="btn btn-sm btn-success" disabled={enviando} onClick={() => setEntrega(x)}>
                                <i className="fa-solid fa-key" aria-hidden="true" /> Registrar entrega
                              </button>
                            </>
                          ) : null}
                          {x.control !== 'vencida' && (x.fase === 'listo' || (x.fase === 'retenido' && x.disposicion === 'firmada')) ? (
                            <button type="button" className={`btn btn-sm ${x.fase === 'listo' ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => { setRegistrar(x); setDetalleLib(''); setRequisitos([]); }}>
                              <i className="fa-solid fa-lock-open" aria-hidden="true" /> Registrar liberación
                            </button>
                          ) : null}
                          {['boleta', 'disposicion', 'liberado'].includes(x.fase) ? <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => router.push(`/private/causa/${x.uuid}`)}>Ver causa</button> : null}
                        </div>
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
          <div className="modal-fake" role="dialog" aria-modal="true" aria-label="Boleta de acarreo y estadía">
            <div className="modal-fake-header">
              <i className="fa-solid fa-receipt" aria-hidden="true" />
              <h2>Boleta de acarreo y estadía · {liberar.dominio || liberar.acta}</h2>
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
              <p className="texto-ayuda mt-2 mb-0">Se emite la boleta (Malvinas 2000 simulado). El vehículo sigue retenido: la liberación se registra cuando la boleta esté acreditada y la Directora haya firmado la disposición de levantamiento (si la retención es la medida vigente, la disposición queda en borrador).</p>
            </div>
            <div className="modal-fake-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setLiberar(null)}>Cancelar</button>
              <button type="button" className="btn btn-primary" disabled={enviando || !ingreso} onClick={() => void confirmarLiberacion()}>Emitir boleta</button>
            </div>
          </div>
        </div>
      ) : null}

      {registrar ? (
        <div className="modal-fake-overlay" onClick={(ev) => ev.target === ev.currentTarget && setRegistrar(null)}>
          <div className="modal-fake" role="dialog" aria-modal="true" aria-label="Registrar liberación">
            <div className="modal-fake-header">
              <i className="fa-solid fa-lock-open" aria-hidden="true" />
              <h2>Registrar liberación · {registrar.dominio || registrar.acta}</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setRegistrar(null)}>&times;</button>
            </div>
            <div className="modal-fake-body">
              {registrar.boletaEmitida
                ? <p>La boleta de acarreo y estadía está acreditada y la disposición de levantamiento está firmada. Se registra la entrega del vehículo con fecha y hora de hoy.</p>
                : <div className="aviso aviso-alerta mb-3"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> No se emitió la boleta de acarreo y estadía. Confirme solo si corresponde liberar el vehículo sin cobrarla (la disposición de levantamiento ya está firmada).</div>}
              <fieldset className="mb-3">
                <legend className="fs-6 fw-semibold mb-1">Entrega presencial: el interesado acreditó</legend>
                {REQUISITOS_LIBERACION.map((r) => (
                  <label key={r} className="form-check d-block">
                    <input type="checkbox" className="form-check-input" checked={requisitos.includes(r)} onChange={(ev) => setRequisitos((p) => (ev.target.checked ? [...p, r] : p.filter((x) => x !== r)))} /> {r}
                  </label>
                ))}
              </fieldset>
              <div className="form-group mb-0">
                <label htmlFor="ret-detalle">Constancia o detalle (opcional)</label>
                <input id="ret-detalle" className="form-control" value={detalleLib} placeholder="Ej.: retiró el titular con DNI y cédula" onChange={(ev) => setDetalleLib(ev.target.value)} />
              </div>
            </div>
            <div className="modal-fake-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setRegistrar(null)}>Cancelar</button>
              <button type="button" className="btn btn-success" disabled={enviando || requisitos.length < REQUISITOS_LIBERACION.length} onClick={() => void confirmarRegistro()}>{registrar.boletaEmitida ? 'Registrar liberación' : 'Liberar sin boleta'}</button>
            </div>
          </div>
        </div>
      ) : null}
      {entrega ? (
        <ModalForm titulo={`Entrega en el corralón · ${entrega.dominio || entrega.acta}`} icono="fa-solid fa-key" textoOk="Registrar entrega"
          aviso={`Liberación vigente hasta ${fechaHora(entrega.vigenteHasta)}. Verifique la identidad de quien retira.`}
          campos={[{ k: 'retiro', t: 'Quién retira (nombre y documento)', tipo: 'texto' }]}
          onCancel={() => setEntrega(null)}
          onOk={async (v) => { await accionSimple(entrega, 'entrega_corralon', 'Entrega registrada', { retiro: v.retiro }); setEntrega(null); }} />
      ) : null}
    </div>
  );
}
