'use client';

import { ALCANCE } from '@/lib/alcance';
import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import type { ConfiguracionItem } from '@/lib/types';
import { useNotify } from './NotifyProvider';

type Item = { id: number; nombre: string };
const PLAZOS = [
  { llave: 'labrado_plazo_horas_multas', t: 'Tránsito', def: '1' },
  { llave: 'labrado_plazo_horas_contravenciones', t: 'Contravenciones', def: '24' },
  { llave: 'labrado_plazo_horas_sustancias', t: 'Sustancias alimenticias', def: '24' },
];

/**
 * Configuración › Labrado en el POS (reunión 27/10): plazo de labrado por tipo de acta (vencido
 * sin firmar, el acta queda abandonada) y las listas de marcas y modelos de alcoholímetros.
 */
export function LabradoConfig() {
  const notify = useNotify();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [marcas, setMarcas] = useState<Item[]>([]);
  const [modelos, setModelos] = useState<Item[]>([]);
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [nuevoModelo, setNuevoModelo] = useState('');
  const [marcaModelo, setMarcaModelo] = useState('');

  const cargar = useCallback(() => {
    http.get<ConfiguracionItem[]>('/api/configuracion/all').then((l) => setValores(Object.fromEntries(l.map((c) => [c.llave, String(c.valor ?? '')])))).catch(() => undefined);
    http.get<Item[]>('/api/admin/catalogo?tipo=alcoholimetro_marca').then(setMarcas).catch(() => undefined);
    http.get<Item[]>('/api/admin/catalogo?tipo=alcoholimetro_modelo').then(setModelos).catch(() => undefined);
  }, []);
  useEffect(cargar, [cargar]);

  async function guardarPlazo(llave: string, valor: string) {
    const n = Number(valor.replace(',', '.'));
    if (!(n > 0)) { notify.error('Plazo inválido', 'Indique las horas (por ejemplo 1 o 24).'); return; }
    try {
      await http.post('/api/configuracion/save', { llave, valor: String(n), publico: '1' });
      notify.success('Plazo guardado', `${n} h. Rige para las actas que se abran desde ahora y para cada extensión.`);
      cargar();
    } catch (e) { notify.error('No se pudo guardar', (e as Error).message); }
  }
  async function agregar(tipo: string, nombre: string, limpiar: () => void) {
    try { await http.post('/api/admin/catalogo', { tipo, nombre }); limpiar(); cargar(); } catch (e) { notify.error('No se pudo agregar', (e as Error).message); }
  }
  async function quitar(tipo: string, id: number) {
    try { await http.del(`/api/admin/catalogo?tipo=${tipo}&id=${id}`); cargar(); } catch (e) { notify.error('No se pudo quitar', (e as Error).message); }
  }

  return (
    <div className="pagina">
      <article className="card-step mb-3">
        <div className="card-step-header">
          <h2>Plazo de labrado</h2>
          <p>Tiempo que tiene el inspector para terminar un acta abierta. Si vence sin firmarse, el acta queda como «Acta abandonada» (número anulado).</p>
        </div>
        <div className="card-step-body">
          <div className="row g-3">
            {PLAZOS.map((p) => (
              <div key={p.llave} className="col-12 col-md-4">
                <label className="form-label-v2" htmlFor={p.llave}>{p.t} (horas)</label>
                <div className="d-flex gap-2">
                  <input id={p.llave} className="form-control" inputMode="decimal" value={valores[p.llave] ?? p.def} onChange={(e) => setValores((v) => ({ ...v, [p.llave]: e.target.value }))} />
                  <button type="button" className="btn btn-primary" onClick={() => void guardarPlazo(p.llave, valores[p.llave] ?? p.def)}>Guardar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
      <article className="card-step" hidden={!ALCANCE.alcoholimetroLista}>
        <div className="card-step-header">
          <h2>Alcoholímetros</h2>
          <p>Marcas y modelos que el inspector elige en el control de alcoholemia.</p>
        </div>
        <div className="card-step-body">
          <div className="row g-4">
            <div className="col-12 col-md-5">
              <h3 className="subtitulo-paso">Marcas</h3>
              <div className="d-flex gap-2 mb-2">
                <input className="form-control" placeholder="Nueva marca" aria-label="Nueva marca" value={nuevaMarca} onChange={(e) => setNuevaMarca(e.target.value)} />
                <button type="button" className="btn btn-outline-primary" disabled={!nuevaMarca.trim()} onClick={() => void agregar('alcoholimetro_marca', nuevaMarca.trim(), () => setNuevaMarca(''))}>Agregar</button>
              </div>
              <ul className="lista-items">
                {marcas.map((m) => (
                  <li key={m.id}><span>{m.nombre}</span><button type="button" className="btn btn-sm btn-outline-danger" aria-label={`Quitar ${m.nombre}`} onClick={() => void quitar('alcoholimetro_marca', m.id)}><i className="fa-solid fa-trash" aria-hidden="true" /></button></li>
                ))}
              </ul>
            </div>
            <div className="col-12 col-md-7">
              <h3 className="subtitulo-paso">Modelos</h3>
              <div className="d-flex gap-2 mb-2 flex-wrap">
                <select className="form-select" style={{ maxWidth: 200 }} aria-label="Marca del modelo" value={marcaModelo} onChange={(e) => setMarcaModelo(e.target.value)}>
                  <option value="">Marca…</option>
                  {marcas.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                </select>
                <input className="form-control" style={{ flex: 1, minWidth: 160 }} placeholder="Nuevo modelo" aria-label="Nuevo modelo" value={nuevoModelo} onChange={(e) => setNuevoModelo(e.target.value)} />
                <button type="button" className="btn btn-outline-primary" disabled={!marcaModelo || !nuevoModelo.trim()} onClick={() => void agregar('alcoholimetro_modelo', `${marcaModelo} · ${nuevoModelo.trim()}`, () => setNuevoModelo(''))}>Agregar</button>
              </div>
              <ul className="lista-items">
                {modelos.map((m) => (
                  <li key={m.id}><span>{m.nombre}</span><button type="button" className="btn btn-sm btn-outline-danger" aria-label={`Quitar ${m.nombre}`} onClick={() => void quitar('alcoholimetro_modelo', m.id)}><i className="fa-solid fa-trash" aria-hidden="true" /></button></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
