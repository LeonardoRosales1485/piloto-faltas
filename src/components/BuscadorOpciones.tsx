'use client';

import { useMemo, useRef, useState } from 'react';

export type OpcionBuscable = { v: string; t: string; sub?: string; extra?: string };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Puntaje de coincidencia: todas las palabras buscadas deben aparecer en algún dato de la opción.
 * Suma más si la palabra coincide con el inicio de una palabra, si está en el título o si la frase entera aparece.
 */
export function puntaje(q: string, o: OpcionBuscable): number {
  const consulta = norm(q).trim();
  if (!consulta) return 1;
  const titulo = norm(o.t);
  const todo = `${titulo} ${norm(o.sub ?? '')} ${norm(o.extra ?? '')}`;
  let p = 0;
  for (const w of consulta.split(/\s+/)) {
    const i = todo.indexOf(w);
    if (i < 0) return 0;
    const inicioPalabra = i === 0 || /[^a-z0-9]/.test(todo[i - 1]);
    p += (inicioPalabra ? 3 : 1) + (titulo.includes(w) ? 2 : 0);
  }
  if (titulo.includes(consulta)) p += 5;
  if (titulo.startsWith(consulta)) p += 5;
  return p;
}

/** Buscador con lista de mejores coincidencias (reemplaza a un <select> largo). */
export function BuscadorOpciones({ id, opciones, valor, onChange, placeholder = 'Escriba para buscar…', max = 8, libre = false }: {
  id: string; opciones: OpcionBuscable[]; valor: string; onChange: (v: string) => void; placeholder?: string; max?: number;
  /** Permite usar el texto escrito aunque no esté en la lista. */
  libre?: boolean;
}) {
  const elegida = opciones.find((o) => o.v === valor) ?? (libre && valor ? { v: valor, t: valor, sub: 'Ingreso libre' } : undefined);
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const lista = useRef<HTMLUListElement>(null);

  const resultados = useMemo(
    // Sin texto se respeta el orden recibido (y se muestran todas); con texto, las mejores coincidencias.
    () => (!q.trim() ? opciones : opciones.map((o) => ({ o, p: puntaje(q, o) })).filter((x) => x.p > 0).sort((a, b) => b.p - a.p || a.o.t.localeCompare(b.o.t)).slice(0, max).map((x) => x.o)),
    [opciones, q, max],
  );
  const texto = q.trim();
  const usarLibre = libre && texto && !opciones.some((o) => norm(o.t) === norm(texto));
  const items: OpcionBuscable[] = usarLibre ? [...resultados, { v: texto, t: `Usar «${texto}»`, sub: 'No está en la lista: se carga tal cual' }] : resultados;

  function elegir(o: OpcionBuscable) {
    onChange(o.v);
    setQ('');
    setAbierto(false);
  }

  function tecla(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActivo((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && abierto && items[activo]) { e.preventDefault(); elegir(items[activo]); }
    else if (e.key === 'Escape' && abierto) { e.stopPropagation(); setAbierto(false); }
    requestAnimationFrame(() => lista.current?.querySelector('.activo')?.scrollIntoView({ block: 'nearest' }));
  }

  return (
    <div className="buscador-opciones">
      {elegida && !abierto ? (
        <button type="button" className="buscador-elegida" onClick={() => { setAbierto(true); setActivo(0); setTimeout(() => document.getElementById(id)?.focus(), 0); }}>
          <span><strong>{elegida.t}</strong>{elegida.sub ? <small>{elegida.sub}</small> : null}</span>
          <span className="cambiar">Cambiar</span>
        </button>
      ) : (
        <div className="buscador-input">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            id={id} className="form-control" autoComplete="off" role="combobox" aria-expanded={abierto} aria-controls={`${id}-lista`}
            placeholder={placeholder} value={q} autoFocus={abierto}
            onChange={(e) => { setQ(e.target.value); setAbierto(true); setActivo(0); }}
            onFocus={() => setAbierto(true)}
            onBlur={() => setTimeout(() => { setAbierto(false); if (usarLibre) { onChange(texto); setQ(''); } }, 150)}
            onKeyDown={tecla}
          />
        </div>
      )}
      {abierto ? (
        <ul id={`${id}-lista`} ref={lista} className="buscador-lista" role="listbox">
          {items.length ? items.map((o, i) => (
            <li key={o.v} role="option" aria-selected={o.v === valor} className={`${i === activo ? 'activo' : ''} ${o.v === valor ? 'elegida' : ''}`} onMouseDown={(e) => { e.preventDefault(); elegir(o); }} onMouseEnter={() => setActivo(i)}>
              <strong>{o.t}</strong>{o.sub ? <small>{o.sub}</small> : null}
            </li>
          )) : <li className="vacio">Sin coincidencias para «{q}»</li>}
        </ul>
      ) : null}
    </div>
  );
}
