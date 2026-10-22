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
export const TIPO_PRESENTACION: Record<string, string> = { pago_voluntario: 'Pedido de pago (en plazo)', boleta: 'Pedido de pago (fuera de plazo)', cuotas: 'Plan de cuotas', descargo: 'Descargo', apelacion: 'Apelación' };
// Términos procesales (minuta 20/10): «Observada / pase a subsanar» y «No admitida» en lugar de «Rechazada».
const ESTADO: Record<string, string> = { pendiente: 'Pendiente', aceptada: 'Aceptada', observada: 'Observada (pase a subsanar)', rechazada: 'No admitida' };
/** Pedidos de documentación frecuentes al observar un descargo (se suman a la respuesta). */
const PEDIDOS_DOC = [
  'Falta el poder que acredite la representación del apoderado.',
  'Falta copia legible del DNI (frente y dorso).',
  'Falta documentación del vehículo (cédula o título).',
  'Falta la firma del escrito de descargo.',
  'Faltan las pruebas que menciona en el descargo.',
];
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
      const respuesta = [...String(v.pedido ?? '').split(',').filter(Boolean), (v.respuesta ?? '').trim()].filter(Boolean).join(' ');
      if (resolver === 'observar' && !respuesta) { notify.error('Falta la respuesta', 'Indique qué documentación falta o escriba la respuesta.'); return; }
      await http.post('/api/presentacion/resolver', { uuid: p.uuid, accion: resolver, respuesta, cuotas: v.cuotas ? Number(v.cuotas) : undefined, conDescuento: v.descuento ? v.descuento === 'si' : undefined });
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
          {p.tipo === 'descargo' && !p.reenvio_de ? <button type="button" className="btn btn-sm btn-warning" onClick={() => setResolver('observar')}>Observar (pase a subsanar)</button> : null}
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setResolver('rechazar')}>No admitir</button>
        </div>
      ) : null}
      {resolver ? (
        <ModalForm
          titulo={`${resolver === 'aceptar' ? (p.tipo === 'apelacion' ? 'Conceder' : 'Aceptar') : resolver === 'observar' ? 'Observar (pase a subsanar)' : 'No admitir'} · ${TIPO_PRESENTACION[p.tipo]}`}
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
            // Pedido de pago (minuta 20/10): la Dirección define si concede el beneficio del pago voluntario o exige el monto pleno.
            ...(resolver === 'aceptar' && (p.tipo === 'pago_voluntario' || p.tipo === 'boleta') ? [{ k: 'descuento', t: 'Monto a cobrar', tipo: 'select' as const, req: true, valor: p.tipo === 'pago_voluntario' ? 'si' : 'no', opciones: [{ v: 'si', t: 'Con el descuento del pago voluntario' }, { v: 'no', t: 'Monto pleno (sin descuento)' }], ayuda: p.tipo === 'boleta' ? 'Lo pidió fuera de plazo: puede conceder igual el beneficio.' : undefined }] : []),
            ...(resolver === 'observar' ? [{ k: 'pedido', t: 'Documentación que falta', tipo: 'multi' as const, opciones: PEDIDOS_DOC.map((x) => ({ v: x, t: x })), ayuda: 'Se agrega a la respuesta. Opcional.' }] : []),
            { k: 'respuesta', t: 'Respuesta al infractor', tipo: 'area' as const, req: resolver !== 'aceptar' && resolver !== 'observar' },
          ]}
          peligro={resolver === 'rechazar'}
          onCancel={() => setResolver(null)}
          onOk={ok}
        />
      ) : null}
    </div>
  );
}
