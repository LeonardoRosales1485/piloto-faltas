'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { useState } from 'react';
import { http } from '@/lib/api-client';
import { esContravencional, fechaHora } from '@/lib/dominio';
import { EstadoChip } from './EstadoChip';
import { ModalForm } from './ModalForm';
import { useNotify } from './NotifyProvider';
import { Plazo } from './Plazo';

type R = Record<string, any>;
export const TIPO_PRESENTACION: Record<string, string> = { pago_voluntario: 'Pago voluntario', boleta: 'Boleta sin beneficio', cuotas: 'Plan de cuotas', descargo: 'Descargo', apelacion: 'Apelación' };
const ESTADO: Record<string, string> = { pendiente: 'Pendiente', aceptada: 'Aceptada', observada: 'Observada', rechazada: 'Rechazada' };
type Accion = 'aceptar' | 'rechazar' | 'observar';

/**
 * Una presentación (descargo, pago voluntario, cuotas, boleta, apelación) con sus datos completos y, si está pendiente
 * y el usuario gestiona causas, los botones para resolverla. Se usa en la bandeja «Presentaciones» y en el detalle de la causa.
 */
export function TarjetaPresentacion({ p, causa, adjuntos = [], gestion, destacada, conCausa, onResuelta }: {
  p: R;
  /** Datos de la causa: tipo de acta, estado y plazo. */
  causa: { uuid?: string; legajo_numero_acta?: string; infraccion_tipo_nombre?: string; estado_faltas?: string; vence_plazo_at?: number | null; infractor_nombre?: string; infractor_razon_social?: string };
  adjuntos?: { uuid: string; titulo: string }[];
  gestion: boolean;
  destacada?: boolean;
  /** Muestra el enlace a la causa (en la bandeja). */
  conCausa?: boolean;
  onResuelta: (p: R, accion: Accion) => void;
}) {
  const notify = useNotify();
  const [resolver, setResolver] = useState<Accion | null>(null);
  const quien = p.ciudadano ? (p.ciudadano.razon_social || `${p.ciudadano.nombre} ${p.ciudadano.apellido}`) : (causa.infractor_razon_social || causa.infractor_nombre);

  async function ok(v: Record<string, string>) {
    if (!resolver) return;
    try {
      await http.post('/api/presentacion/resolver', { uuid: p.uuid, accion: resolver, respuesta: v.respuesta, cuotas: v.cuotas ? Number(v.cuotas) : undefined });
      setResolver(null);
      onResuelta(p, resolver);
    } catch (e) {
      notify.error('No se pudo resolver', (e as Error).message);
    }
  }

  return (
    <div className={`tarjeta-presentacion ${destacada ? 'destacada' : ''} estado-${p.estado}`}>
      <div className="tp-cabecera">
        <div>
          <div className="li-titulo">
            {destacada ? <i className="fa-solid fa-inbox me-1" aria-hidden="true" /> : null}
            {TIPO_PRESENTACION[p.tipo] ?? p.tipo}{p.reenvio_de ? ' · reenvío de descargo observado' : ''}
            {conCausa && causa.uuid ? <> · <Link href={`/private/causa/${causa.uuid}`}>{causa.legajo_numero_acta}</Link></> : null}
          </div>
          <div className="li-sub">
            {quien} · {p.origen === 'mesa' ? 'Mesa de entradas' : 'Portal'} · {fechaHora(p.date_created)}
            {p.cuotas_solicitadas ? ` · pide ${p.cuotas_solicitadas} cuotas` : ''}
          </div>
        </div>
        <span className={`tp-estado tp-${p.estado}`}>{ESTADO[p.estado] ?? p.estado}</span>
      </div>
      {conCausa ? <div className="d-flex gap-2 align-items-center flex-wrap mt-1"><EstadoChip estado={causa.estado_faltas ?? ''} /><Plazo vence={causa.vence_plazo_at ?? undefined} estado={causa.estado_faltas} ocultarSinPlazo /></div> : null}
      {p.texto ? <p className="tp-texto">{p.texto}</p> : null}
      {adjuntos.length ? (
        <div className="d-flex gap-2 flex-wrap mt-1">
          {adjuntos.map((a) => <Link key={a.uuid} className="btn btn-sm btn-outline-secondary" href={`/private/escrito/${a.uuid}`} target="_blank"><i className="fa-solid fa-paperclip" aria-hidden="true" /> {a.titulo.split(' · ')[0]}</Link>)}
        </div>
      ) : null}
      {p.respuesta && p.estado !== 'pendiente' ? <div className="li-sub mt-2"><strong>Respuesta</strong> ({p.resuelta_por}{p.resuelta_at ? `, ${fechaHora(p.resuelta_at)}` : ''}): {p.respuesta}</div> : null}
      {p.estado === 'pendiente' && gestion ? (
        <div className="d-flex gap-2 flex-wrap mt-2">
          <button type="button" className="btn btn-sm btn-success" onClick={() => setResolver('aceptar')}>{p.tipo === 'apelacion' ? 'Conceder' : 'Aceptar'}</button>
          {p.tipo === 'descargo' && !p.reenvio_de ? <button type="button" className="btn btn-sm btn-warning" onClick={() => setResolver('observar')}>Observar</button> : null}
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setResolver('rechazar')}>Rechazar</button>
        </div>
      ) : null}
      {resolver ? (
        <ModalForm
          titulo={`${resolver === 'aceptar' ? (p.tipo === 'apelacion' ? 'Conceder' : 'Aceptar') : resolver === 'observar' ? 'Observar' : 'Rechazar'} · ${TIPO_PRESENTACION[p.tipo]}`}
          icono="fa-solid fa-gavel"
          aviso={
            resolver === 'aceptar'
              ? p.tipo === 'descargo' ? 'La causa pasa a «Descargo» y queda lista para dictar el fallo.'
              : p.tipo === 'apelacion' ? 'La causa pasa a «En Juzgado» y se remite el legajo en PDF.'
              : `Se emiten las boletas y el compromiso de pago, y se envían al infractor.${!esContravencional(causa.infraccion_tipo_nombre) && p.tipo === 'pago_voluntario' ? ' En tránsito, el infractor ya no podrá presentar descargo.' : ''}`
              : resolver === 'observar' ? 'El infractor podrá reenviar el descargo una única vez. Indique qué falta.' : undefined
          }
          campos={[
            ...(resolver === 'aceptar' && p.tipo === 'cuotas' ? [{ k: 'cuotas', t: 'Cantidad de cuotas otorgadas', tipo: 'numero' as const, req: true, valor: String(p.cuotas_solicitadas ?? 3) }] : []),
            { k: 'respuesta', t: 'Respuesta al infractor', tipo: 'area' as const, req: resolver !== 'aceptar' },
          ]}
          peligro={resolver === 'rechazar'}
          onCancel={() => setResolver(null)}
          onOk={ok}
        />
      ) : null}
    </div>
  );
}
