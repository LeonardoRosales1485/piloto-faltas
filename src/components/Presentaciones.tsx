'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { LoaderLogo } from './LoaderLogo';
import { useCarga } from '@/lib/use-carga';
import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { puede } from '@/lib/dominio';
import { useAuthUser } from '@/lib/use-auth-user';
import { TarjetaPresentacion, TIPO_PRESENTACION as TIPO } from './TarjetaPresentacion';
import { useNotify } from './NotifyProvider';

type R = Record<string, any>;
const FILTROS = [{ v: 'pendiente', t: 'Pendientes' }, { v: 'aceptada', t: 'Aceptadas' }, { v: 'observada', t: 'Observadas' }, { v: 'rechazada', t: 'Rechazadas' }, { v: 'todas', t: 'Todas' }];

/** Bandeja única de presentaciones (SF-26 a SF-31). */
export function Presentaciones() {
  const notify = useNotify();
  const user = useAuthUser();
  const [estado, setEstado] = useState('pendiente');
  const [tipo, setTipo] = useState('');
  const [items, setItems] = useState<R[] | null>(null);

  const [cargando, seguir] = useCarga();
  const cargar = useCallback(() => { void seguir(http.get<R[]>(`/api/presentaciones?estado=${estado}`).then(setItems)); }, [estado, seguir]);
  useEffect(cargar, [cargar]);

  function resuelta(p: R, accion: string) {
    notify.success('Presentación resuelta', 'Se notificó la respuesta al infractor.', p.tipo === 'descargo' && accion === 'aceptar' && p.infraccion?.uuid
      ? { texto: 'Dictar fallo', href: `/private/causa/${p.infraccion.uuid}?fallo=1` } : undefined);
    cargar();
  }

  const lista = (items ?? []).filter((p) => !tipo || p.tipo === tipo);
  const gestion = puede(user?.rol, 'gestionarCausas');

  return (
    <div className="pagina">
      <div className="bandeja-tabs">
        {FILTROS.map((f) => <button key={f.v} type="button" className={`bandeja-tab ${estado === f.v ? 'activa' : ''}`} onClick={() => setEstado(f.v)}>{f.t}</button>)}
        <select className="form-select form-select-sm" style={{ width: 'auto' }} value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de presentación">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="card-step">
        <div className="card-step-header"><h2>Presentaciones</h2><p>Llegan del portal de infractores o se registran en mesa. Se atienden por orden de llegada.</p></div>
        <div className="card-step-body">
          <ul className="lista-items">
            {cargando ? <li className="d-block"><LoaderLogo tam={56} texto="Cargando…" /></li> : lista.map((p) => (
              <li key={p.uuid} className="d-block">
                <TarjetaPresentacion p={p} causa={p.infraccion ?? {}} adjuntos={p.adjuntos} gestion={gestion} conCausa onResuelta={resuelta} />
              </li>
            ))}
            {!cargando && items && !lista.length ? <li><span className="texto-ayuda">No hay presentaciones en esta bandeja.</span></li> : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
