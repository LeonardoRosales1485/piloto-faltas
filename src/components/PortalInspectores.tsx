'use client';

import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { fechaHora } from '@/lib/dominio';
import { useAuthUser } from '@/lib/use-auth-user';
import { printTicketsDelActa } from '@/lib/print';
import type { Infraccion } from '@/lib/types';
import { useNotify } from './NotifyProvider';
import { TablaVista } from './TablaVista';

type Fila = {
  uuid: string; acta: string; tipo: string; fecha: string | null; firmadaAt: number | null; inspector: string | null; legajoInspector: string | null;
  dominio: string | null; vehiculo: string | null; licencia: string | null; infractor: string; documento: string | null; lugar: string;
  retieneLicencia: boolean; retieneVehiculo: boolean; ingreso?: number; dias?: number; liberacion?: string; vigenteHasta?: number | null;
};
type Vista = 'actas' | 'retenciones' | 'playon';

const VISTAS: { v: Vista; t: string; i: string }[] = [
  { v: 'actas', t: 'Actas labradas', i: 'fa-solid fa-file-signature' },
  { v: 'retenciones', t: 'Retenciones', i: 'fa-solid fa-id-card' },
  { v: 'playon', t: 'Playón', i: 'fa-solid fa-warehouse' },
];

const LIBERACION: Record<string, { t: string; c: string }> = {
  retenido: { t: 'Retenido · sin boleta', c: 'retenido' },
  pendiente_pago: { t: 'Boleta emitida · falta el pago', c: 'retenido' },
  autorizar: { t: 'Pagado · falta la disposición', c: 'retenido' },
  vigente: { t: 'Liberación vigente: puede retirarse', c: 'liberado' },
  vencida: { t: 'Liberación vencida', c: 'retenido' },
  entregado: { t: 'Entregado', c: 'liberado' },
};

const aMs = (d: string, fin = false) => (d ? new Date(`${d}T${fin ? '23:59:59' : '00:00:00'}-03:00`).getTime() : 0);

/**
 * Portal de inspectores (reunión 27/10): consulta de solo lectura. Actas labradas, retenciones de licencias y
 * vehículos, y el playón (vehículos en el depósito y el estado de su liberación). Busca por acta, dominio, DNI,
 * licencia o inspector.
 */
export function PortalInspectores() {
  const user = useAuthUser();
  const soloPropias = user?.rol === 'Inspector';
  const notify = useNotify();
  const [imprimiendo, setImprimiendo] = useState('');

  /** Reimprime el ticket del acta y, si hubo retenciones, también sus tickets de retención (van con lo retenido). */
  async function imprimir(f: Fila) {
    setImprimiendo(f.uuid);
    try {
      const acta = await http.get<Infraccion>(`/api/inspeccion/ticket?uuid=${encodeURIComponent(f.uuid)}`);
      await printTicketsDelActa(acta);
    } catch (e) {
      notify.error('No se pudo imprimir', (e as Error).message);
    } finally {
      setImprimiendo('');
    }
  }
  const botonTicket = (f: Fila) => {
    const n = 1 + Number(f.retieneLicencia) + Number(f.retieneVehiculo);
    return (
      <button type="button" className="btn btn-sm btn-outline-primary text-nowrap" disabled={imprimiendo === f.uuid} onClick={() => void imprimir(f)} title={n > 1 ? 'Ticket del infractor y tickets de retención (van con lo retenido)' : 'Ticket del infractor'}>
        {imprimiendo === f.uuid ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> : <i className="fa-solid fa-print" aria-hidden="true" />} {n > 1 ? `Imprimir tickets (${n})` : 'Imprimir ticket'}
      </button>
    );
  };
  const [vista, setVista] = useState<Vista>('actas');
  const [q, setQ] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tipoRet, setTipoRet] = useState<'todas' | 'licencia' | 'vehiculo'>('todas');
  const [lista, setLista] = useState<Fila[] | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    setLista(null);
    setError('');
    const p = new URLSearchParams({ vista });
    if (q.trim()) p.set('q', q.trim());
    if (desde) p.set('desde', String(aMs(desde)));
    if (hasta) p.set('hasta', String(aMs(hasta, true)));
    http.get<{ lista: Fila[] }>(`/api/inspeccion?${p}`).then((r) => setLista(r.lista)).catch((e: Error) => { setError(e.message); setLista([]); });
  }, [vista, q, desde, hasta]);
  useEffect(() => { cargar(); }, [vista]); // eslint-disable-line react-hooks/exhaustive-deps

  const filas = (lista ?? []).filter((f) => vista !== 'retenciones' || tipoRet === 'todas' || (tipoRet === 'licencia' ? f.retieneLicencia : f.retieneVehiculo));

  return (
    <div className="pagina">
      <div className="card-step mb-3">
        <div className="tabs-causa" role="tablist">
          {VISTAS.map((x) => (
            <button key={x.v} type="button" role="tab" aria-selected={vista === x.v} className={`tab-causa ${vista === x.v ? 'activa' : ''}`} onClick={() => setVista(x.v)}>
              <i className={x.i} aria-hidden="true" /> {x.t}
            </button>
          ))}
        </div>
        <form className="d-flex flex-wrap gap-2 align-items-end p-3" onSubmit={(e) => { e.preventDefault(); cargar(); }}>
          <div style={{ flex: '1 1 220px' }}>
            <label className="form-label-v2" htmlFor="pi-q">Buscar</label>
            <input id="pi-q" className="form-control" placeholder={soloPropias ? 'Acta, dominio, DNI o licencia' : 'Acta, dominio, DNI, licencia o inspector'} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <label className="form-label-v2" htmlFor="pi-desde">Labrada desde</label>
            <input id="pi-desde" type="date" className="form-control" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="form-label-v2" htmlFor="pi-hasta">Hasta</label>
            <input id="pi-hasta" type="date" className="form-control" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          {vista === 'retenciones' ? (
            <div>
              <label className="form-label-v2" htmlFor="pi-ret">Qué se retuvo</label>
              <select id="pi-ret" className="form-select" value={tipoRet} onChange={(e) => setTipoRet(e.target.value as typeof tipoRet)}>
                <option value="todas">Licencias y vehículos</option>
                <option value="licencia">Licencias</option>
                <option value="vehiculo">Vehículos</option>
              </select>
            </div>
          ) : null}
          <button type="submit" className="btn btn-primary"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> Buscar</button>
        </form>
      </div>

      {error ? <div className="aviso aviso-peligro">{error}</div> : null}
      {lista === null ? <p className="texto-ayuda">Cargando…</p> : !filas.length ? <p className="texto-ayuda">No hay resultados.</p> : (
        <div className="card-step">
          <div className="card-step-body">
            <TablaVista>
              <table className="table custom-table align-middle">
                <thead>
                  <tr>
                    <th>Acta</th><th>Fecha</th><th>Inspector</th>
                    {vista === 'actas' ? <><th>Infractor</th><th>Dominio</th><th>Lugar</th></> : null}
                    {vista === 'retenciones' ? <><th>Infractor</th><th>Retuvo</th><th>Licencia / Dominio</th></> : null}
                    {vista === 'playon' ? <><th>Dominio</th><th>Vehículo</th><th>Días</th><th>Liberación</th></> : null}
                    <th className="th-acciones">Tickets</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.uuid}>
                      <td><span className="fw-semibold">{f.acta}</span><div className="texto-ayuda">{f.tipo}</div></td>
                      <td>{fechaHora(f.firmadaAt)}</td>
                      <td>{f.inspector ?? '-'}{f.legajoInspector ? <div className="texto-ayuda">Leg. {f.legajoInspector}</div> : null}</td>
                      {vista === 'actas' ? <><td>{f.infractor}{f.documento ? <div className="texto-ayuda">DNI {f.documento}</div> : null}</td><td>{f.dominio ?? '-'}</td><td>{f.lugar || '-'}</td></> : null}
                      {vista === 'retenciones' ? (
                        <>
                          <td>{f.infractor}</td>
                          <td>{[f.retieneLicencia ? 'Licencia' : '', f.retieneVehiculo ? 'Vehículo' : ''].filter(Boolean).join(' y ')}</td>
                          <td>{f.retieneLicencia ? <div>Lic. {f.licencia ?? '-'}</div> : null}{f.retieneVehiculo ? <div>{f.dominio ?? '-'}</div> : null}</td>
                        </>
                      ) : null}
                      {vista === 'playon' ? (
                        <>
                          <td><strong>{f.dominio ?? '-'}</strong></td>
                          <td>{f.vehiculo ?? '-'}</td>
                          <td>{f.dias ?? '-'}</td>
                          <td><span className={`chip-ret ${LIBERACION[f.liberacion ?? '']?.c ?? 'retenido'}`}>{LIBERACION[f.liberacion ?? '']?.t ?? f.liberacion}</span>{f.liberacion === 'vigente' && f.vigenteHasta ? <div className="texto-ayuda">Hasta {fechaHora(f.vigenteHasta)}</div> : null}</td>
                        </>
                      ) : null}
                      <td className="td-acciones">{botonTicket(f)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TablaVista>
          </div>
        </div>
      )}
      <p className="texto-ayuda mt-2">{soloPropias ? 'Solo se muestran las actas que labró usted, sus retenciones y los vehículos que retuvo. ' : ''}Consulta de solo lectura. Las acciones sobre las causas se hacen desde la Dirección de Faltas.</p>
    </div>
  );
}
