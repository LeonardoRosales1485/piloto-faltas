'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { pesos } from '@/lib/dominio';

type Ley = { clave: string; nombre: string; articulo: string; descripcion: string; multiplicador: number; multiploCatalogo?: number; subtotal?: number; manual?: boolean; ajustada?: boolean };
type Fila = { multiplo: string; manual: boolean; monto: string };

/**
 * Artículos de la causa con su valorización (como «Artículos» de stg): múltiplo editable y, con «Manual»,
 * un subtotal fijo para casos puntuales. Los cambios valen solo para esta causa; el catálogo no cambia.
 */
export function ArticulosValorizacion({ leyes, uf, subtotal, multa, ajustado, motivoAjuste, editable, onGuardar }: {
  leyes: Ley[]; uf: number; subtotal?: number; multa: number; ajustado: number | null; motivoAjuste: string | null;
  editable: boolean;
  onGuardar: (items: { clave: string; multiplo: string; montoManual: string | null }[], motivo: string) => Promise<boolean>;
}) {
  const inicial = () => Object.fromEntries(leyes.map((l) => [l.clave, { multiplo: String(l.multiplicador ?? 0), manual: Boolean(l.manual), monto: l.manual ? String(l.subtotal ?? '') : '' }])) as Record<string, Fila>;
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState<Record<string, Fila>>(inicial);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!editando) setF(inicial()); }, [leyes, editando]);

  const num = (s: string) => Number(String(s).replace(',', '.')) || 0;
  const subDe = (l: Ley) => {
    const r = f[l.clave];
    if (!editando || !r) return Number(l.subtotal ?? l.multiplicador * uf);
    return r.manual ? num(r.monto) : num(r.multiplo) * uf;
  };
  const sumaSub = leyes.reduce((s, l) => s + subDe(l), 0);
  const set = (k: string, p: Partial<Fila>) => setF((x) => ({ ...x, [k]: { ...x[k], ...p } }));
  const soloNumero = (v: string) => v.replace(/[^\d.,]/g, '');

  async function guardar() {
    setGuardando(true);
    const ok = await onGuardar(leyes.map((l) => ({ clave: l.clave, multiplo: f[l.clave].multiplo, montoManual: f[l.clave].manual ? f[l.clave].monto : null })), motivo);
    setGuardando(false);
    if (ok) { setEditando(false); setMotivo(''); }
  }

  return (
    <>
      <div className="table-responsive">
        <table className="table custom-table align-middle">
          <thead><tr><th>Norma</th><th>Artículo</th><th>Descripción</th><th className="text-end" style={{ minWidth: 110 }}>Múltiplo (UF)</th><th className="text-end" style={{ minWidth: 150 }}>Subtotal</th>{editando ? <th className="text-center">Manual</th> : null}</tr></thead>
          <tbody>
            {leyes.map((l) => {
              const r = f[l.clave];
              return (
                <tr key={l.clave}>
                  <td>{l.nombre}</td><td>{l.articulo}</td><td>{l.descripcion}</td>
                  <td className="text-end">
                    {editando && r ? <input className="form-control form-control-sm text-end" inputMode="decimal" value={r.multiplo} disabled={r.manual} onChange={(e) => set(l.clave, { multiplo: soloNumero(e.target.value) })} aria-label={`Múltiplo ${l.nombre} ${l.articulo}`} />
                      : <>{l.multiplicador}{l.ajustada && !l.manual ? <span className="dato-subsanado ms-1" title={`Catálogo: ${l.multiploCatalogo}`}>ajustado</span> : null}</>}
                  </td>
                  <td className="text-end">
                    {editando && r ? <input className="form-control form-control-sm text-end" inputMode="decimal" value={r.manual ? r.monto : String(num(r.multiplo) * uf)} disabled={!r.manual} onChange={(e) => set(l.clave, { monto: soloNumero(e.target.value) })} aria-label={`Subtotal ${l.nombre} ${l.articulo}`} />
                      : <>{pesos(subDe(l))}{l.manual ? <span className="dato-subsanado ms-1">manual</span> : null}</>}
                  </td>
                  {editando && r ? <td className="text-center"><input type="checkbox" className="form-check-input" checked={r.manual} onChange={(e) => set(l.clave, { manual: e.target.checked, monto: e.target.checked ? String(r.monto || num(r.multiplo) * uf) : '' })} aria-label="Monto manual" /></td> : null}
                </tr>
              );
            })}
            <tr><td colSpan={4} className="text-end fw-semibold">Subtotal artículos{!editando ? ` (UF ${pesos(uf)})` : ''}</td><td className="text-end fw-bold">{pesos(editando ? sumaSub : (subtotal ?? sumaSub))}</td>{editando ? <td /> : null}</tr>
            {ajustado != null && !editando ? <tr><td colSpan={4} className="text-end">Valorización ajustada{motivoAjuste ? `: ${motivoAjuste}` : ''}</td><td className="text-end fw-bold">{pesos(multa)}</td></tr> : null}
          </tbody>
        </table>
      </div>
      {editable && !editando ? <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setEditando(true)}><i className="fa-solid fa-pen" aria-hidden="true" /> Editar montos por artículo</button> : null}
      {editando ? (
        <div className="d-flex gap-2 flex-wrap align-items-end">
          <div style={{ flex: '1 1 260px' }}><label htmlFor="aj-motivo" className="texto-ayuda">Motivo (queda en el historial)</label><input id="aj-motivo" className="form-control form-control-sm" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditando(false)}>Cancelar</button>
          <button type="button" className="btn btn-sm btn-success" disabled={guardando} onClick={() => void guardar()}><i className={`fa-solid ${guardando ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} aria-hidden="true" /> Guardar</button>
        </div>
      ) : null}
      {editando && ajustado != null ? <p className="texto-ayuda mt-1">La causa tiene un ajuste global de la valorización ({pesos(ajustado)}), que sigue mandando sobre esta suma hasta que se cambie.</p> : null}
    </>
  );
}
