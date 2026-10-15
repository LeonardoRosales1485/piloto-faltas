'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { LoaderLogo } from './LoaderLogo';
import { useCarga } from '@/lib/use-carga';
import { useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { fechaHora, puede } from '@/lib/dominio';
import { useAuthUser } from '@/lib/use-auth-user';

type R = Record<string, any>;
const ESTADOS = [
  { v: 'en_revision', t: 'En revisión (para firmar)' },
  { v: 'borrador', t: 'Borradores' },
  { v: 'devuelto', t: 'Devueltos' },
  { v: 'firmado', t: 'Firmados' },
  { v: 'definitivo', t: 'Definitivos' },
  { v: 'todos', t: 'Todos' },
];

/** Bandeja de escritos; para la Directora, separada por tipo de escrito (SF-38). */
export function BandejaEscritos() {
  const user = useAuthUser();
  const [estado, setEstado] = useState('en_revision');
  const [texto, setTexto] = useState('');
  const [r, setR] = useState<{ items: R[]; conteos: Record<string, number> } | null>(null);

  const [cargando, seguir] = useCarga();
  useEffect(() => {
    const t = setTimeout(() => seguir(http.get<{ items: R[]; conteos: Record<string, number> }>(`/api/escritos?estado=${estado}&texto=${encodeURIComponent(texto)}`)).then(setR), 250);
    return () => clearTimeout(t);
  }, [estado, texto, seguir]);

  const grupos = (r?.items ?? []).reduce<Record<string, R[]>>((acc, x) => { const k = x.plantilla?.categoria ?? 'Otros'; (acc[k] ??= []).push(x); return acc; }, {});

  return (
    <div className="pagina">
      <div className="bandeja-tabs">
        {(puede(user?.rol, 'verPlantillas') || puede(user?.rol, 'plantillas')) ? <Link href="/private/plantillas" className="bandeja-tab ms-auto order-last" title="Consultar las plantillas de escritos"><i className="fa-solid fa-file-lines" aria-hidden="true" /> Plantillas</Link> : null}
        {ESTADOS.map((e) => <button key={e.v} type="button" className={`bandeja-tab ${estado === e.v ? 'activa' : ''}`} onClick={() => setEstado(e.v)}>{e.t} {e.v !== 'todos' ? <span className="n">{r?.conteos?.[e.v] ?? 0}</span> : null}</button>)}
      </div>
      <div className="filtros-card filtros-card-compacto mb-2"><div className="p-2">
        <label className="form-label-v2" htmlFor="esc-t">Buscar escrito por título</label>
        <input id="esc-t" className="form-control form-control-sm" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Fallo, resolución, compromiso..." />
      </div></div>
      {puede(user?.rol, 'firmar') && estado === 'en_revision' ? <div className="aviso aviso-info">Revise cada escrito: puede corregirlo, devolverlo con observación o firmarlo digitalmente.</div> : null}
      {cargando ? <div className="card-step"><LoaderLogo tam={56} texto="Cargando…" /></div> : null}
      {!cargando && Object.entries(grupos).map(([cat, items]) => (
        <div key={cat} className="card-step mb-3">
          <div className="card-step-header"><h2>{cat}</h2><p>{items.length} escrito(s)</p></div>
          <div className="card-step-body">
            <ul className="lista-items">
              {items.map((x) => (
                <li key={x.uuid}>
                  <div>
                    <div className="li-titulo">{x.titulo}{x.numero ? ` N° ${x.numero}` : ''}</div>
                    <div className="li-sub">Causa {x.infraccion?.legajo_numero_acta} · {x.infraccion?.infractor_razon_social || x.infraccion?.infractor_nombre} · {x.creado_por} · {fechaHora(x.date_updated ?? x.date_created)}{x.firmado_por ? ` · firmado por ${x.firmado_por}` : ''}{x.observacion ? ` · Obs.: ${x.observacion}` : ''}</div>
                  </div>
                  <Link className="btn btn-sm btn-primary" href={`/private/escrito/${x.uuid}`}>{estado === 'en_revision' && puede(user?.rol, 'firmar') ? 'Revisar y firmar' : 'Abrir'}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
      {!cargando && r && !r.items.length ? <div className="card-step"><div className="card-step-body"><span className="texto-ayuda">No hay escritos en esta bandeja.</span></div></div> : null}
    </div>
  );
}
