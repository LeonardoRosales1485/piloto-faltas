'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { TablaVista } from './TablaVista';
import Link from 'next/link';
import { LoaderLogo } from './LoaderLogo';
import { useCarga } from '@/lib/use-carga';
import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { fechaCorta, pesos, puede } from '@/lib/dominio';
import { useAuthUser } from '@/lib/use-auth-user';
import { useNotify } from './NotifyProvider';
import { useRefresco } from '@/lib/use-refresco';

type R = Record<string, any>;
const FILTROS = [{ v: 'a_verificar', t: 'A verificar' }, { v: 'emitida', t: 'Emitidas' }, { v: 'vencidas', t: 'Cuotas o boletas vencidas' }, { v: 'definitiva', t: 'Acreditadas' }, { v: 'todas', t: 'Todas' }];
const ESTADO: Record<string, string> = { emitida: 'Emitida', a_verificar: 'A verificar', definitiva: 'Acreditada', vencida: 'Vencida', anulada: 'Anulada' };

/** Control de pagos: «a verificar» → «definitivo» con la acreditación de Malvinas 2000 (simulada). */
export function Pagos() {
  const notify = useNotify();
  const user = useAuthUser();
  const [estado, setEstado] = useState('a_verificar');
  const [items, setItems] = useState<R[]>([]);
  const [cargando, seguir] = useCarga();
  const cargar = useCallback((silencioso = false) => { const p = http.get<R[]>(`/api/pagos?estado=${estado}`).then(setItems); void (silencioso ? p.catch(() => undefined) : seguir(p)); }, [estado, seguir]);
  useEffect(() => cargar(), [cargar]);
  useRefresco(() => cargar(true));

  async function confirmar(b: R) {
    try {
      await http.post('/api/causa/accion', { uuid: b.infraccion.uuid, accion: 'confirmar_pago', datos: { boletaUuid: b.uuid } });
      notify.success('Pago acreditado', b.infraccion.medida_vigente ? 'La causa tiene medida vigente: no se archiva hasta el levantamiento.' : 'Si se pagó el total, la causa pasa a archivo por pago.');
      cargar();
    } catch (e) { notify.error('No se pudo confirmar', (e as Error).message); }
  }

  const total = items.reduce((a, b) => a + Number(b.monto), 0);
  return (
    <div className="pagina">
      <h1 className="visually-hidden">Pagos</h1>
      <div className="bandeja-tabs">{FILTROS.map((f) => <button key={f.v} type="button" className={`bandeja-tab ${estado === f.v ? 'activa' : ''}`} onClick={() => setEstado(f.v)}>{f.t}</button>)}</div>
      <div className="card-step">
        <div className="card-step-header"><h2>Boletas</h2><p>{items.length} boleta(s) · {pesos(total)}</p></div>
        <TablaVista>
          <table className="table custom-table align-middle">
            <thead><tr><th>BOLETA</th><th>CAUSA</th><th>CONCEPTO</th><th>A NOMBRE DE</th><th>VENCE</th><th className="text-end">MONTO</th><th>ESTADO</th><th /></tr></thead>
            <tbody>
              {cargando ? <tr><td colSpan={8}><LoaderLogo tam={56} texto="Cargando…" /></td></tr> : items.map((b) => (
                <tr key={b.uuid}>
                  <td>{b.numero}</td>
                  <td><Link href={`/private/causa/${b.infraccion?.uuid}`}>{b.infraccion?.legajo_numero_acta}</Link></td>
                  <td>{b.concepto}</td>
                  <td>{b.a_nombre_de}</td>
                  <td>{fechaCorta(b.vencimiento)}</td>
                  <td className="text-end">{pesos(Number(b.monto))}</td>
                  <td>{ESTADO[b.estado] ?? b.estado}{b.pagado_at ? <div className="texto-ayuda">pagó {fechaCorta(b.pagado_at)}</div> : null}</td>
                  <td>{b.estado === 'a_verificar' && puede(user?.rol, 'confirmarPagos') ? <button type="button" className="btn btn-sm btn-success" onClick={() => void confirmar(b)}>Confirmar</button> : null}</td>
                </tr>
              ))}
              {!cargando && !items.length ? <tr><td colSpan={8}><div className="sin-resultados py-3"><p className="mb-0">No hay boletas.</p></div></td></tr> : null}
            </tbody>
          </table>
        </TablaVista>
      </div>
    </div>
  );
}
