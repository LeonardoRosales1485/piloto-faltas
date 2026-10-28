'use client';

import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { fechaHora } from '@/lib/dominio';
import { EstadoChip } from './EstadoChip';

type Fila = {
  uuid: string; acta: string; tipo: string; fecha: string | null; firmadaAt: number | null; estado: string; inspector: string | null; legajoInspector: string | null;
  dominio: string | null; vehiculo: string | null; licencia: string | null; infractor: string; documento: string | null; lugar: string;
  retieneLicencia: boolean; retieneVehiculo: boolean; medidaVigente: boolean; ingreso?: number; dias?: number; liberacion?: string; vigenteHasta?: number | null;
};
type Vista = 'actas' | 'retenciones' | 'playon';

const VISTAS: { v: Vista; t: string; i: string }[] = [
  { v: 'actas', t: 'Actas labradas', i: 'fa-solid fa-file-signature' },
  { v: 'retenciones', t: 'Retenciones', i: 'fa-solid fa-id-card' },
  { v: 'playon', t: 'Playón', i: 'fa-solid fa-warehouse' },
];

const LIBERACION: Record<string, { t: string; c: string }> = {
  retenido: { t: 'Retenido · sin boleta', c: 'bg-secondary' },
  pendiente_pago: { t: 'Boleta emitida · falta el pago', c: 'bg-warning text-dark' },
  autorizar: { t: 'Pagado · falta la disposición', c: 'bg-info text-dark' },
  vigente: { t: 'Liberación vigente: puede retirarse', c: 'bg-success' },
  vencida: { t: 'Liberación vencida', c: 'bg-danger' },
  entregado: { t: 'Entregado', c: 'bg-dark' },
};

const aMs = (d: string, fin = false) => (d ? new Date(`${d}T${fin ? '23:59:59' : '00:00:00'}-03:00`).getTime() : 0);

/**
 * Portal de inspectores (reunión 27/10): consulta de solo lectura. Actas labradas, retenciones de licencias y
 * vehículos, y el playón (vehículos en el depósito y el estado de su liberación). Busca por acta, dominio, DNI,
 * licencia o inspector.
 */
export function PortalInspectores() {
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
            <input id="pi-q" className="form-control" placeholder="Acta, dominio, DNI, licencia o inspector" value={q} onChange={(e) => setQ(e.target.value)} />
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
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Acta</th><th>Fecha</th><th>Inspector</th>
                  {vista === 'actas' ? <><th>Infractor</th><th>Dominio</th><th>Lugar</th><th>Estado</th></> : null}
                  {vista === 'retenciones' ? <><th>Infractor</th><th>Retuvo</th><th>Licencia / Dominio</th><th>Medida</th></> : null}
                  {vista === 'playon' ? <><th>Dominio</th><th>Vehículo</th><th>Días</th><th>Liberación</th></> : null}
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.uuid}>
                    <td><strong>{f.acta}</strong><div className="texto-ayuda">{f.tipo}</div></td>
                    <td>{fechaHora(f.firmadaAt)}</td>
                    <td>{f.inspector ?? '-'}{f.legajoInspector ? <div className="texto-ayuda">Leg. {f.legajoInspector}</div> : null}</td>
                    {vista === 'actas' ? <><td>{f.infractor}{f.documento ? <div className="texto-ayuda">DNI {f.documento}</div> : null}</td><td>{f.dominio ?? '-'}</td><td>{f.lugar || '-'}</td><td><EstadoChip estado={f.estado} medida={f.medidaVigente} /></td></> : null}
                    {vista === 'retenciones' ? (
                      <>
                        <td>{f.infractor}</td>
                        <td>{[f.retieneLicencia ? 'Licencia' : '', f.retieneVehiculo ? 'Vehículo' : ''].filter(Boolean).join(' y ')}</td>
                        <td>{f.retieneLicencia ? <div>Lic. {f.licencia ?? '-'}</div> : null}{f.retieneVehiculo ? <div>{f.dominio ?? '-'}</div> : null}</td>
                        <td>{f.medidaVigente ? <span className="badge bg-danger">Vigente</span> : <span className="badge bg-success">Levantada</span>}</td>
                      </>
                    ) : null}
                    {vista === 'playon' ? (
                      <>
                        <td><strong>{f.dominio ?? '-'}</strong></td>
                        <td>{f.vehiculo ?? '-'}</td>
                        <td>{f.dias ?? '-'}</td>
                        <td><span className={`badge ${LIBERACION[f.liberacion ?? '']?.c ?? 'bg-secondary'}`}>{LIBERACION[f.liberacion ?? '']?.t ?? f.liberacion}</span>{f.liberacion === 'vigente' && f.vigenteHasta ? <div className="texto-ayuda">Hasta {fechaHora(f.vigenteHasta)}</div> : null}</td>
                      </>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="texto-ayuda mt-2">Consulta de solo lectura. Las acciones sobre las causas se hacen desde la Dirección de Faltas.</p>
    </div>
  );
}
