'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { LoaderLogo } from './LoaderLogo';
import { useCarga } from '@/lib/use-carga';
import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { esContravencional, fechaHora, puede } from '@/lib/dominio';
import { useAuthUser } from '@/lib/use-auth-user';
import { EstadoChip } from './EstadoChip';
import { ModalForm } from './ModalForm';
import { useNotify } from './NotifyProvider';
import { Plazo } from './Plazo';

type R = Record<string, any>;
const TIPO: Record<string, string> = { pago_voluntario: 'Pago voluntario', boleta: 'Boleta sin beneficio', cuotas: 'Plan de cuotas', descargo: 'Descargo', apelacion: 'Apelación' };
const FILTROS = [{ v: 'pendiente', t: 'Pendientes' }, { v: 'aceptada', t: 'Aceptadas' }, { v: 'observada', t: 'Observadas' }, { v: 'rechazada', t: 'Rechazadas' }, { v: 'todas', t: 'Todas' }];

/** Bandeja única de presentaciones (SF-26 a SF-31). */
export function Presentaciones() {
  const notify = useNotify();
  const user = useAuthUser();
  const [estado, setEstado] = useState('pendiente');
  const [tipo, setTipo] = useState('');
  const [items, setItems] = useState<R[] | null>(null);
  const [resolver, setResolver] = useState<{ p: R; accion: 'aceptar' | 'rechazar' | 'observar' } | null>(null);

  const [cargando, seguir] = useCarga();
  const cargar = useCallback(() => { void seguir(http.get<R[]>(`/api/presentaciones?estado=${estado}`).then(setItems)); }, [estado, seguir]);
  useEffect(cargar, [cargar]);

  async function ok(v: Record<string, string>) {
    if (!resolver) return;
    try {
      await http.post('/api/presentacion/resolver', { uuid: resolver.p.uuid, accion: resolver.accion, respuesta: v.respuesta, cuotas: v.cuotas ? Number(v.cuotas) : undefined });
      notify.success('Presentación resuelta', 'Se notificó la respuesta al infractor.');
      setResolver(null);
      cargar();
    } catch (e) {
      notify.error('No se pudo resolver', (e as Error).message);
    }
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
              <li key={p.uuid}>
                <div style={{ flex: '1 1 420px' }}>
                  <div className="li-titulo">{TIPO[p.tipo]}{p.reenvio_de ? ' · reenvío de descargo observado' : ''} · <Link href={`/private/causa/${p.infraccion?.uuid}`}>{p.infraccion?.legajo_numero_acta}</Link></div>
                  <div className="li-sub">
                    {p.ciudadano ? (p.ciudadano.razon_social || `${p.ciudadano.nombre} ${p.ciudadano.apellido}`) : (p.infraccion?.infractor_razon_social || p.infraccion?.infractor_nombre)} · {p.origen === 'mesa' ? 'Mesa' : 'Portal'} · {fechaHora(p.date_created)}
                    {p.cuotas_solicitadas ? ` · pide ${p.cuotas_solicitadas} cuotas` : ''}
                  </div>
                  <div className="d-flex gap-2 align-items-center flex-wrap mt-1"><EstadoChip estado={p.infraccion?.estado_faltas} /><Plazo vence={p.infraccion?.vence_plazo_at} /></div>
                  {p.texto ? <p className="mb-1 mt-2" style={{ whiteSpace: 'pre-wrap' }}>{p.texto}</p> : null}
                  {p.adjuntos?.length ? <div className="d-flex gap-2 flex-wrap mt-1">{p.adjuntos.map((a: R) => <Link key={a.uuid} className="btn btn-sm btn-outline-secondary" href={`/private/escrito/${a.uuid}`} target="_blank"><i className="fa-solid fa-paperclip" aria-hidden="true" /> {a.titulo.split(' · ')[0]}</Link>)}</div> : null}
                  {p.respuesta && p.estado !== 'pendiente' ? <div className="li-sub mt-1">Respuesta ({p.resuelta_por}): {p.respuesta}</div> : null}
                </div>
                {p.estado === 'pendiente' && gestion ? (
                  <div className="d-flex gap-2 flex-wrap">
                    <button type="button" className="btn btn-sm btn-success" onClick={() => setResolver({ p, accion: 'aceptar' })}>{p.tipo === 'apelacion' ? 'Conceder' : 'Aceptar'}</button>
                    {p.tipo === 'descargo' && !p.reenvio_de ? <button type="button" className="btn btn-sm btn-warning" onClick={() => setResolver({ p, accion: 'observar' })}>Observar</button> : null}
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setResolver({ p, accion: 'rechazar' })}>Rechazar</button>
                  </div>
                ) : <span className="texto-ayuda text-capitalize">{p.estado}</span>}
              </li>
            ))}
            {!cargando && items && !lista.length ? <li><span className="texto-ayuda">No hay presentaciones en esta bandeja.</span></li> : null}
          </ul>
        </div>
      </div>
      {resolver ? (
        <ModalForm
          titulo={`${resolver.accion === 'aceptar' ? (resolver.p.tipo === 'apelacion' ? 'Conceder' : 'Aceptar') : resolver.accion === 'observar' ? 'Observar' : 'Rechazar'} · ${TIPO[resolver.p.tipo]}`}
          icono="fa-solid fa-gavel"
          aviso={
            resolver.accion === 'aceptar'
              ? resolver.p.tipo === 'descargo' ? 'La causa pasa a «Descargo» y queda en la bandeja para fallo.'
              : resolver.p.tipo === 'apelacion' ? 'La causa pasa a «En Juzgado» y se remite el legajo en PDF.'
              : `Se emiten las boletas y el compromiso de pago, y se envían al infractor.${!esContravencional(resolver.p.infraccion?.infraccion_tipo_nombre) && resolver.p.tipo === 'pago_voluntario' ? ' En tránsito, el infractor ya no podrá presentar descargo.' : ''}`
              : resolver.accion === 'observar' ? 'El infractor podrá reenviar el descargo una única vez. Indique qué falta.' : undefined
          }
          campos={[
            ...(resolver.accion === 'aceptar' && resolver.p.tipo === 'cuotas' ? [{ k: 'cuotas', t: 'Cantidad de cuotas otorgadas', tipo: 'numero' as const, req: true, valor: String(resolver.p.cuotas_solicitadas ?? 3) }] : []),
            { k: 'respuesta', t: 'Respuesta al infractor', tipo: 'area' as const, req: resolver.accion !== 'aceptar' },
          ]}
          peligro={resolver.accion === 'rechazar'}
          onCancel={() => setResolver(null)}
          onOk={ok}
        />
      ) : null}
    </div>
  );
}
