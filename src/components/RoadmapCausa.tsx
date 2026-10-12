'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fechaHora, infoEstado } from '@/lib/dominio';
import type { Camino } from '@/lib/camino';

type Etapa = { id: string; t: string; i: string };

const BASE: Etapa[] = [
  { id: 'labrada', t: 'Labrada', i: 'fa-solid fa-pen-to-square' },
  { id: 'notificacion', t: 'Notificación', i: 'fa-solid fa-envelope' },
  { id: 'presentacion', t: 'Descargo / pago', i: 'fa-solid fa-inbox' },
  { id: 'fallo', t: 'Fallo', i: 'fa-solid fa-scale-balanced' },
];
const EXTERNO: Etapa = { id: 'externo', t: 'Externo', i: 'fa-solid fa-landmark' };
const CIERRE: Etapa = { id: 'cierre', t: 'Cierre', i: 'fa-solid fa-box-archive' };

/** Etapa del recorrido a la que pertenece un estado. null = estado que no mueve la etapa (medida, pausa). */
export function etapaDe(estado?: string | null): string | null {
  if (!estado) return null;
  if (estado === 'Iniciado') return 'labrada';
  const f = infoEstado(estado);
  if (f.final || estado === 'Anulada') return 'cierre';
  switch (f.familia) {
    case 'inicio': return 'notificacion';
    case 'presentacion': return 'presentacion';
    case 'fallo': return 'fallo';
    case 'externo': return 'externo';
    default: return null;
  }
}

const PAUSAS: Record<string, string> = { 'Espera respuesta': 'Espera respuesta del área', 'Despacho Directora': 'En despacho de la Directora' };

type Props = { estado: string; historial: any[]; medidaVigente?: boolean; camino?: Camino };

/** Roadmap de la causa: etapas del ciclo de vida, la actual resaltada. Se dibuja en la barra superior. */
export function RoadmapCausa({ estado, historial, medidaVigente, camino }: Props) {
  const [destino, setDestino] = useState<HTMLElement | null>(null);
  useEffect(() => setDestino(document.getElementById('topbar-extra')), []);

  // Historial en orden cronológico; primera fecha en que se entró a cada etapa.
  const crono = [...historial].sort((a, b) => Number(a.fecha) - Number(b.fecha) || Number(a.id) - Number(b.id));
  const entrada: Record<string, number> = {};
  if (crono[0]) entrada.labrada = Number(crono[0].fecha);
  let ultimaEtapa = 'labrada';
  for (const h of crono) {
    const e = etapaDe(h.estado_nuevo);
    if (!e) continue;
    entrada[e] ??= Number(h.fecha);
    ultimaEtapa = e;
  }
  const actual = etapaDe(estado) ?? ultimaEtapa;
  const etapas = [...BASE, ...(entrada.externo || actual === 'externo' ? [EXTERNO] : []), CIERRE];
  const idx = Math.max(0, etapas.findIndex((e) => e.id === actual));
  const pausa = PAUSAS[estado];
  const enMedida = infoEstado(estado).familia === 'medida';

  const contenido = (
    <div className="roadmap" aria-label={`Etapa ${idx + 1} de ${etapas.length}: ${etapas[idx].t}`}>
      <ol className="roadmap-pasos">
        {etapas.map((e, i) => {
          const hecho = i < idx || (e.id === 'cierre' && actual === 'cierre');
          const salteado = i < idx && i > 0 && !entrada[e.id];
          const clase = e.id === actual && actual !== 'cierre' ? 'actual' : hecho ? (salteado ? 'salteado' : 'hecho') : 'futuro';
          const fecha = entrada[e.id];
          // La etapa de presentación muestra el camino elegido: pago voluntario, descargo o sin presentación.
          const etiquetaCamino = camino && ['pago', 'descargo', 'ignorado'].includes(camino.id) ? (camino.id === 'ignorado' ? 'Sin presentación' : camino.titulo) : null;
          const etiqueta = e.id === 'cierre' && actual === 'cierre' ? infoEstado(estado).portal : e.id === 'presentacion' && etiquetaCamino ? etiquetaCamino : e.t;
          const titulo = salteado ? `${e.t}: no corresponde en esta causa` : fecha ? `${e.t} · ${fechaHora(fecha)}` : e.t;
          return (
            <li key={e.id} className={`roadmap-paso ${clase}`} title={titulo}>
              <span className="roadmap-punto">
                <i className={hecho && !salteado ? 'fa-solid fa-check' : salteado ? 'fa-solid fa-minus' : e.i} aria-hidden="true" />
              </span>
              <span className="roadmap-txt">{etiqueta}</span>
              {clase === 'actual' ? (
                <span className="roadmap-sub">
                  {pausa ? <><i className="fa-solid fa-hourglass-half" aria-hidden="true" /> {pausa}</> : estado}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {medidaVigente || enMedida ? (
        <span className="roadmap-medida" title={enMedida ? estado : 'Medida preventiva vigente'}>
          <i className="fa-solid fa-lock" aria-hidden="true" /> Medida vigente
        </span>
      ) : null}
      <span className="roadmap-compacto">Etapa {idx + 1} de {etapas.length} · {etapas[idx].t}</span>
    </div>
  );
  return destino ? createPortal(contenido, destino) : null;
}
