'use client';

import { useEffect, useState } from 'react';
import { LoaderLogo } from './LoaderLogo';
import { apiClient } from '@/lib/api-client';
import { useNotify } from './NotifyProvider';

/**
 * Valores y tarifas, calcado de «Finanzas» de stg: Unidad Tributaria, Acarreo (autos/motos/camiones), Medio Salario,
 * Derecho de Oficina y Estadías por tipo de vehículo con tres tramos. Todo editable con un único botón «Editar».
 * Las claves son las de `configuracion` que leen la valorización, las boletas y la liberación de vehículos.
 */
const CLAVES = [
  'finanza_unidad_fija', 'finanza_acarreo_auto', 'finanza_acarreo_moto', 'finanza_acarreo_camion', 'finanza_medio_salario', 'finanza_derecho_oficina',
  'finanza_estadia_auto_3a7', 'finanza_estadia_auto_8a30', 'finanza_estadia_auto_mas31_por_dia',
  'finanza_estadia_moto_3a7', 'finanza_estadia_moto_8a30', 'finanza_estadia_moto_mas31_por_dia',
  'finanza_estadia_camion_3a7', 'finanza_estadia_camion_8a30', 'finanza_estadia_camion_mas31_por_dia',
] as const;
type Clave = (typeof CLAVES)[number];
type Valores = Record<Clave, string>;

const SIMPLES: { k: Clave; t: string; sub: string; i: string }[] = [
  { k: 'finanza_unidad_fija', t: 'Unidad Tributaria', sub: 'Valor base para cálculos', i: 'fa-solid fa-sack-dollar' },
  { k: 'finanza_medio_salario', t: 'Medio Salario', sub: 'Costo base diario', i: 'fa-solid fa-wallet' },
  { k: 'finanza_derecho_oficina', t: 'Derecho de Oficina', sub: 'Trámite administrativo', i: 'fa-solid fa-stamp' },
];
const ACARREO: { k: Clave; t: string }[] = [
  { k: 'finanza_acarreo_auto', t: 'Autos' }, { k: 'finanza_acarreo_moto', t: 'Motos' }, { k: 'finanza_acarreo_camion', t: 'Camiones' },
];
const ESTADIAS: { t: string; base: 'auto' | 'moto' | 'camion'; i: string }[] = [
  { t: 'Automóviles', base: 'auto', i: 'fa-solid fa-car' },
  { t: 'Motovehículos', base: 'moto', i: 'fa-solid fa-motorcycle' },
  { t: 'Camiones', base: 'camion', i: 'fa-solid fa-truck' },
];
const TRAMOS: { sufijo: '3a7' | '8a30' | 'mas31_por_dia'; t: string }[] = [
  { sufijo: '3a7', t: '3 a 7 días' }, { sufijo: '8a30', t: '8 a 30 días' }, { sufijo: 'mas31_por_dia', t: '+31 por día' },
];

const vacias = (): Valores => Object.fromEntries(CLAVES.map((k) => [k, ''])) as Valores;
const pesos = (v: string) => `$ ${(Number(v) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function FinanzasView() {
  const notify = useNotify();
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [v, setV] = useState<Valores>(vacias);

  const cargar = () => {
    setCargando(true);
    apiClient.configAll().then((items) => {
      const next = vacias();
      for (const it of items ?? []) if ((CLAVES as readonly string[]).includes(it.llave)) next[it.llave as Clave] = String(it.valor ?? '');
      setV(next);
      setCargando(false);
    });
  };
  useEffect(cargar, []);

  async function guardar() {
    setGuardando(true);
    try {
      await Promise.all(CLAVES.map((llave) => apiClient.configSave({ llave, valor: v[llave] || '0', publico: '1' })));
      notify.success('Costos guardados', 'Se actualizaron los valores y tarifas.');
      setEditando(false);
    } catch {
      notify.error('No se pudo guardar', 'Intente nuevamente.');
    } finally {
      setGuardando(false);
    }
  }

  const valor = (k: Clave, grande = false) => (editando ? (
    <div className="fin-input"><span>$</span><input type="number" min={0} inputMode="decimal" className="form-control" value={v[k]} onChange={(e) => setV((p) => ({ ...p, [k]: e.target.value }))} aria-label={k} /></div>
  ) : <strong className={grande ? 'fin-valor grande' : 'fin-valor'}>{pesos(v[k])}</strong>);

  if (cargando) return <div className="pagina"><LoaderLogo /></div>;

  return (
    <div className="pagina">
      <div className="card-step">
        <div className="card-step-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div><h2>Costos</h2><p>Valores que usan la valorización de las causas, las boletas y la liberación de vehículos.</p></div>
          {editando ? (
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={() => { cargar(); setEditando(false); }}>Cancelar</button>
              <button type="button" className="btn btn-success" disabled={guardando} onClick={() => void guardar()}>
                <i className={`fa-solid ${guardando ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} aria-hidden="true" /> Guardar
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setEditando(true)}><i className="fa-solid fa-pen" aria-hidden="true" /> Editar</button>
          )}
        </div>
        <div className="card-step-body">
          <div className="fin-grid">
            <div className="fin-card">
              <div className="fin-cab"><div><h3>{SIMPLES[0].t}</h3><span>{SIMPLES[0].sub}</span></div><i className={SIMPLES[0].i} aria-hidden="true" /></div>
              {valor(SIMPLES[0].k, true)}
            </div>
            <div className="fin-card">
              <div className="fin-cab"><div><h3>Acarreo de Vehículo</h3><span>Traslado a depósito</span></div><i className="fa-solid fa-truck-pickup" aria-hidden="true" /></div>
              {ACARREO.map((a) => <div key={a.k} className="fin-fila"><span>{a.t}</span>{valor(a.k)}</div>)}
            </div>
            {SIMPLES.slice(1).map((x) => (
              <div key={x.k} className="fin-card">
                <div className="fin-cab"><div><h3>{x.t}</h3><span>{x.sub}</span></div><i className={x.i} aria-hidden="true" /></div>
                {valor(x.k, true)}
              </div>
            ))}
            {ESTADIAS.map((e) => (
              <div key={e.base} className="fin-card">
                <div className="fin-cab"><div><h3>Estadía {e.t}</h3><span>Costo por día en depósito</span></div><i className={e.i} aria-hidden="true" /></div>
                {TRAMOS.map((t) => <div key={t.sufijo} className="fin-fila"><span>{t.t}</span>{valor(`finanza_estadia_${e.base}_${t.sufijo}` as Clave)}</div>)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
