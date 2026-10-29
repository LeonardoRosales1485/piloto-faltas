'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { puede, TIPOS_ACTA, modulosDe, type ModuloActa } from '@/lib/dominio';
import { useAuthUser } from '@/lib/use-auth-user';
import { imprimirTickets, leerUltimoTicket } from '@/lib/print';
import { fechaHora } from '@/lib/dominio';
import { useNotify } from './NotifyProvider';

const ICONO: Record<ModuloActa, string> = { multas: 'fa-solid fa-car', contravenciones: 'fa-solid fa-store', sustancias: 'fa-solid fa-truck' };

/**
 * Inicio de los inspectores: dos botones grandes a pantalla completa («Crear nueva acta» e «Imprimir último ticket»).
 * Sin listado de borradores (minuta 20/10): los tickets de la última acta firmada en este equipo se pueden reimprimir;
 * si hay más de uno (infractor y retenciones), se elige cuál.
 * Si tiene más de un tipo de acta autorizado, el siguiente paso pide elegir el tipo (solo los permitidos).
 */
export function InicioInspector() {
  const router = useRouter();
  const user = useAuthUser();
  const modulos = modulosDe(user);
  const notify = useNotify();
  const [elegir, setElegir] = useState<'crear' | 'ticket' | null>(null);
  const destino = (m: ModuloActa) => `/private/crear-editar/${m}`;

  function ir() {
    if (modulos.length === 1) router.push(destino(modulos[0]));
    else setElegir('crear');
  }

  const ultimo = leerUltimoTicket(user?.username);
  function reimprimir() {
    if (!ultimo) notify.info('No hay ticket para reimprimir', 'En este equipo todavía no se firmó ningún acta con su usuario.');
    else if (ultimo.tickets.length === 1) void imprimirTickets(ultimo.tickets);
    else setElegir('ticket');
  }
  const retenciones = (ultimo?.tickets.length ?? 1) - 1;

  if (!user) return null;

  return (
    <div className="inicio-inspector">
      {elegir === 'ticket' && ultimo ? (
        <>
          <p className="inicio-inspector-titulo">¿Qué ticket del acta {ultimo.tickets[0].numero} imprime?</p>
          {ultimo.tickets.map((t, n) => (
            <button key={n} type="button" className="inicio-inspector-boton" onClick={() => void imprimirTickets([t])}>
              <i className={t.retencion === 'vehiculo' ? 'fa-solid fa-car' : t.retencion ? 'fa-solid fa-id-card' : 'fa-solid fa-receipt'} aria-hidden="true" />
              <span>{t.etiqueta ?? t.titulo}</span>
              {t.retencion ? <small>{t.retencion === 'licencia' ? 'Va adjunto con la licencia retenida' : 'Va adjunto con la VTV'}</small> : null}
            </button>
          ))}
          <button type="button" className="inicio-inspector-boton principal" onClick={() => void imprimirTickets(ultimo.tickets)}>
            <i className="fa-solid fa-print" aria-hidden="true" />
            <span>Imprimir todos ({ultimo.tickets.length})</span>
          </button>
          <button type="button" className="inicio-inspector-volver" onClick={() => setElegir(null)}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Volver
          </button>
        </>
      ) : elegir === 'crear' ? (
        <>
          <p className="inicio-inspector-titulo">¿Qué acta va a generar?</p>
          {modulos.map((m) => (
            <button key={m} type="button" className="inicio-inspector-boton" onClick={() => router.push(destino(m))}>
              <i className={ICONO[m]} aria-hidden="true" />
              <span>{TIPOS_ACTA[m].titulo}</span>
            </button>
          ))}
          <button type="button" className="inicio-inspector-volver" onClick={() => setElegir(null)}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Volver
          </button>
        </>
      ) : (
        <>
          <button type="button" className="inicio-inspector-boton principal" onClick={ir}>
            <i className="fa-solid fa-file-circle-plus" aria-hidden="true" />
            <span>{modulos.length > 1 ? 'Generar un acta' : 'Crear nueva acta'}</span>
            {modulos.length === 1 ? <small>{TIPOS_ACTA[modulos[0]].titulo}</small> : null}
          </button>
          <button type="button" className="inicio-inspector-boton" onClick={reimprimir}>
            <i className="fa-solid fa-print" aria-hidden="true" />
            <span>Imprimir último ticket</span>
            {ultimo ? <small>{ultimo.tickets[0].numero} · {fechaHora(ultimo.at)}{retenciones ? ` · con ${retenciones === 1 ? 'ticket' : `${retenciones} tickets`} de retención` : ''}</small> : null}
          </button>
          {puede(user, 'portalInspectores') ? (
            <button type="button" className="inicio-inspector-boton" onClick={() => router.push('/private/inspeccion')}>
              <i className="fa-solid fa-binoculars" aria-hidden="true" />
              <span>Consultar actas, retenciones y playón</span>
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
