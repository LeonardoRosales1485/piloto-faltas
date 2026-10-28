'use client';

import { InputClave } from './InputClave';
import { useState } from 'react';
import { BuscadorOpciones, type OpcionBuscable } from './BuscadorOpciones';
import { ACCEPT_ADJUNTOS, leerAdjunto } from '@/lib/adjuntos';

/** `si`: el campo se muestra (y se exige) solo cuando la condición se cumple con los valores actuales. */
type Base = { k: string; t: string; req?: boolean; ayuda?: string; valor?: string; si?: (v: Record<string, string>) => boolean };
export type CampoModal =
  | (Base & { tipo: 'texto' | 'area' | 'numero' | 'fecha' | 'clave' })
  | (Base & { tipo: 'select'; opciones: { v: string; t: string }[] })
  | (Base & { tipo: 'buscar'; opciones: OpcionBuscable[]; placeholder?: string })
  | (Base & { tipo: 'multi'; opciones: { v: string; t: string }[] })
  | (Base & { tipo: 'archivo' })
  | (Base & { tipo: 'check' }); // valor '1' / ''

/** Formulario modal genérico para las acciones de la causa. */
export function ModalForm({
  titulo, icono = 'fa-solid fa-pen', campos, textoOk = 'Confirmar', textoCancelar = 'Cancelar', onNo, peligro, aviso, onCancel, onOk,
}: {
  titulo: string; icono?: string; campos: CampoModal[]; textoOk?: string; textoCancelar?: string;
  /** Si se indica, el botón de cancelar ejecuta esta respuesta «No» (además de cerrar). */
  onNo?: () => Promise<void> | void; peligro?: boolean; aviso?: string;
  onCancel: () => void; onOk: (valores: Record<string, string>) => Promise<void> | void;
}) {
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(campos.map((c) => [c.k, c.valor ?? (c.tipo === 'select' ? c.opciones[0]?.v ?? '' : '')])));
  const [enviando, setEnviando] = useState(false);
  const visibles = campos.filter((c) => !c.si || c.si(v));
  const faltan = visibles.some((c) => c.req && !String(v[c.k] ?? '').trim());

  async function archivo(k: string, f?: File) {
    if (!f) return;
    const raw = await leerAdjunto(f); // las fotos se achican para respetar el límite de tamaño
    setV((p) => ({ ...p, [k]: raw, [`${k}Nombre`]: f.name }));
  }

  return (
    <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-fake" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-fake-header">
          <i className={icono} aria-hidden="true" />
          <h2>{titulo}</h2>
          <button type="button" aria-label="Cerrar" onClick={onCancel}>&times;</button>
        </div>
        <div className="modal-fake-body">
          {aviso ? <div className="aviso aviso-info">{aviso}</div> : null}
          {visibles.map((c) => (
            <div key={c.k} className="form-group mb-3">
              {c.tipo === 'check' ? null : <label htmlFor={`m-${c.k}`}>{c.t} {c.req ? <span className="requerido">*</span> : null}</label>}
              {c.tipo === 'check' ? (
                <label className="form-check mb-0"><input id={`m-${c.k}`} type="checkbox" className="form-check-input" checked={v[c.k] === '1'} onChange={(e) => setV({ ...v, [c.k]: e.target.checked ? '1' : '' })} /> <span className="form-check-label">{c.t}</span></label>
              ) : c.tipo === 'area' ? (
                <textarea id={`m-${c.k}`} className="form-control" rows={4} value={v[c.k]} onChange={(e) => setV({ ...v, [c.k]: e.target.value })} />
              ) : c.tipo === 'select' ? (
                <select id={`m-${c.k}`} className="form-select" value={v[c.k]} onChange={(e) => setV({ ...v, [c.k]: e.target.value })}>
                  {c.opciones.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
                </select>
              ) : c.tipo === 'buscar' ? (
                <BuscadorOpciones id={`m-${c.k}`} opciones={c.opciones} valor={v[c.k]} placeholder={c.placeholder} onChange={(x) => setV((p) => ({ ...p, [c.k]: x }))} />
              ) : c.tipo === 'multi' ? (
                <div className="multi-opciones" id={`m-${c.k}`} role="group" aria-label={c.t}>
                  {c.opciones.map((o) => {
                    const sel = String(v[c.k] ?? '').split(',').filter(Boolean);
                    const on = sel.includes(o.v);
                    return (
                      <label key={o.v} className={`multi-opcion ${on ? 'activa' : ''}`}>
                        <input type="checkbox" checked={on} onChange={() => setV({ ...v, [c.k]: (on ? sel.filter((x) => x !== o.v) : [...sel, o.v]).join(',') })} /> {o.t}
                      </label>
                    );
                  })}
                </div>
              ) : c.tipo === 'archivo' ? (
                <input id={`m-${c.k}`} type="file" className="form-control" accept={ACCEPT_ADJUNTOS} onChange={(e) => void archivo(c.k, e.target.files?.[0])} />
              ) : (
                c.tipo === 'clave' ? <InputClave id={`m-${c.k}`} autoComplete="new-password" value={v[c.k]} onChange={(e) => setV({ ...v, [c.k]: e.target.value })} /> : <input id={`m-${c.k}`} className="form-control" type={c.tipo === 'numero' ? 'number' : c.tipo === 'fecha' ? 'date' : 'text'} value={v[c.k]} onChange={(e) => setV({ ...v, [c.k]: e.target.value })} />
              )}
              {c.ayuda ? <p className="texto-ayuda">{c.ayuda}</p> : null}
            </div>
          ))}
        </div>
        <div className="modal-fake-footer">
          <button type="button" className="btn btn-outline-secondary" disabled={enviando} onClick={async () => { if (!onNo) return onCancel(); setEnviando(true); try { await onNo(); } finally { setEnviando(false); } }}>{textoCancelar}</button>
          <button type="button" className={`btn ${peligro ? 'btn-danger' : 'btn-primary'}`} disabled={faltan || enviando} onClick={async () => { setEnviando(true); try { await onOk(Object.fromEntries(Object.entries(v).filter(([k]) => { const c = campos.find((x) => x.k === k || `${x.k}Nombre` === k); return !c || !c.si || c.si(v); }))); } finally { setEnviando(false); } }}>
            {enviando ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> : null} {textoOk}
          </button>
        </div>
      </div>
    </div>
  );
}
