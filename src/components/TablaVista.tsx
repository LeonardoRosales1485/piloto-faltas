'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

const CLAVE = 'faltas:vista-listas';
type Modo = 'lista' | 'cards';
const EVENTO = 'faltas:vista-listas';

/**
 * Preferencia «Lista / Tarjetas» para todas las listas del sistema (pensada para monitores chicos o viejos).
 * Se guarda en este navegador y queda activa hasta que el usuario la vuelva a cambiar. Si nunca eligió,
 * las pantallas angostas (< 1280 px) arrancan en tarjetas.
 */
export function useVistaListas(): [Modo, (m: Modo) => void] {
  const [modo, setModo] = useState<Modo>('lista');
  useEffect(() => {
    const leer = () => {
      let v: string | null = null;
      try { v = localStorage.getItem(CLAVE); } catch { /* sin almacenamiento */ }
      setModo(v === 'cards' || v === 'lista' ? v : window.innerWidth < 1280 ? 'cards' : 'lista');
    };
    leer();
    window.addEventListener(EVENTO, leer);
    return () => window.removeEventListener(EVENTO, leer);
  }, []);
  const cambiar = (m: Modo) => {
    try { localStorage.setItem(CLAVE, m); } catch { /* sin almacenamiento */ }
    setModo(m);
    window.dispatchEvent(new Event(EVENTO)); // otras listas abiertas en la misma página
  };
  return [modo, cambiar];
}

export function SelectorVista({ modo, onCambiar }: { modo: Modo; onCambiar: (m: Modo) => void }) {
  return (
    <div className="selector-vista" role="group" aria-label="Modo de visualización">
      <button type="button" className={modo === 'lista' ? 'activo' : ''} aria-pressed={modo === 'lista'} title="Ver como lista" onClick={() => onCambiar('lista')}>
        <i className="fa-solid fa-list" aria-hidden="true" /> <span>Lista</span>
      </button>
      <button type="button" className={modo === 'cards' ? 'activo' : ''} aria-pressed={modo === 'cards'} title="Ver como tarjetas" onClick={() => onCambiar('cards')}>
        <i className="fa-solid fa-grip" aria-hidden="true" /> <span>Tarjetas</span>
      </button>
    </div>
  );
}

/**
 * Envuelve una tabla: en modo tarjetas cada fila se muestra como una tarjeta con «Encabezado: valor»
 * (las etiquetas salen del <thead>, no hace falta tocar la tabla). Incluye el selector Lista / Tarjetas.
 */
export function TablaVista({ children, selector = true, className = '' }: { children: ReactNode; selector?: boolean; className?: string }) {
  const [modo, setModo] = useVistaListas();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const etiquetar = () => {
      el.querySelectorAll('table').forEach((t) => {
        const ths = Array.from(t.querySelectorAll('thead th')).map((th) => (th.textContent ?? '').trim());
        t.querySelectorAll('tbody tr').forEach((tr) => {
          let i = 0;
          Array.from(tr.children).forEach((td) => {
            const span = Number((td as HTMLTableCellElement).colSpan || 1);
            const label = span > 1 ? '' : ths[i] ?? '';
            if (td.getAttribute('data-label') !== label) td.setAttribute('data-label', label);
            i += span;
          });
        });
      });
    };
    etiquetar();
    const obs = new MutationObserver(etiquetar);
    obs.observe(el, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  return (
    <div className={`tabla-vista-cont ${className}`}>
      {selector ? <div className="tabla-vista-barra"><SelectorVista modo={modo} onCambiar={setModo} /></div> : null}
      <div ref={ref} className={modo === 'cards' ? 'tabla-cards' : 'table-responsive'}>{children}</div>
    </div>
  );
}
