'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const MM = 96 / 25.4; // px por milímetro (CSS)
const ALTO = 297 * MM; // hoja A4
const SEPARACION = 12 * MM; // espacio gris entre hojas
const PASO = ALTO + SEPARACION;
const MARGEN_SUP = 25 * MM;
const MARGEN_INF = 28 * MM; // incluye el pie institucional
const UTIL = ALTO - MARGEN_SUP - MARGEN_INF;
const SALTO = 'salto-auto';

/** Quita los separadores de página del HTML (para guardar el texto sin ellos). */
export function sinSaltos(html: string) {
  return html.replace(/<div class="salto-auto"[^>]*><\/div>/g, '');
}

/** Bloques que se reparten entre hojas: hijos directos del flujo y de los contenedores marcados con data-paginar. */
function bloques(flujo: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const el of Array.from(flujo.children) as HTMLElement[]) {
    if (el.classList.contains(SALTO)) continue;
    if (el.dataset.paginar !== undefined) {
      for (const h of Array.from(el.children) as HTMLElement[]) if (!h.classList.contains(SALTO)) out.push(h);
    } else out.push(el);
  }
  return out;
}

/**
 * Muestra el contenido en tantas hojas A4 como necesite. El texto sigue siendo un único flujo (se puede editar
 * igual que antes); cuando un párrafo no entra en lo que queda de la hoja, se inserta un separador invisible que lo
 * pasa a la hoja siguiente. Cada hoja lleva el pie institucional y el número de página.
 */
export function HojasPaginadas({ children, pie, deps = [] }: { children: ReactNode; pie?: string; deps?: unknown[] }) {
  const flujo = useRef<HTMLDivElement>(null);
  const [paginas, setPaginas] = useState(1);
  const [activo, setActivo] = useState(true);
  const calculando = useRef(false);
  const pendiente = useRef(0);

  const paginar = useCallback(() => {
    const f = flujo.current;
    if (!f || calculando.current) return;
    calculando.current = true;
    try {
      f.querySelectorAll(`.${SALTO}`).forEach((s) => s.remove());
      if (!activo) { setPaginas(1); return; }
      const origen = f.getBoundingClientRect().top;
      for (const b of bloques(f)) {
        const r = b.getBoundingClientRect();
        if (!r.height) continue;
        const top = r.top - origen;
        const hoja = Math.floor(top / PASO);
        const finUtil = hoja * PASO + ALTO - MARGEN_INF;
        const empiezaEnMargen = top > finUtil;
        if ((top + r.height > finUtil && r.height <= UTIL) || empiezaEnMargen) {
          const destino = (hoja + 1) * PASO + MARGEN_SUP;
          const s = document.createElement('div');
          s.className = SALTO;
          s.contentEditable = 'false';
          s.setAttribute('aria-hidden', 'true');
          s.style.height = `${destino - top}px`;
          b.parentElement!.insertBefore(s, b);
        }
      }
      const alto = f.scrollHeight + MARGEN_INF;
      setPaginas(Math.max(1, Math.ceil(alto / PASO)));
    } finally {
      calculando.current = false;
    }
  }, [activo]);

  const programar = useCallback(() => {
    cancelAnimationFrame(pendiente.current);
    pendiente.current = requestAnimationFrame(paginar);
  }, [paginar]);

  // En pantallas angostas la hoja ocupa el ancho disponible y no se pagina.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const upd = () => setActivo(mq.matches);
    upd();
    mq.addEventListener('change', upd);
    return () => mq.removeEventListener('change', upd);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { programar(); }, [programar, ...deps]);

  useEffect(() => {
    const f = flujo.current;
    if (!f) return;
    const onInput = () => programar();
    f.addEventListener('input', onInput);
    // Cambios de contenido que no pasan por «input» (texto cargado, campos completados desde el panel, imágenes).
    const mo = new MutationObserver((muts) => {
      if (calculando.current) return;
      if (muts.some((m) => ![...m.addedNodes, ...m.removedNodes].every((n) => n instanceof HTMLElement && n.classList.contains(SALTO)))) programar();
    });
    mo.observe(f, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style', 'value'] });
    void document.fonts?.ready.then(programar);
    return () => { f.removeEventListener('input', onInput); mo.disconnect(); cancelAnimationFrame(pendiente.current); };
  }, [programar]);

  return (
    <div className={`hojas ${activo ? '' : 'hojas-continuas'}`} style={activo ? { height: paginas * PASO - SEPARACION } : undefined}>
      {activo ? Array.from({ length: paginas }, (_, i) => (
        <div key={i} className="hoja-fondo" style={{ top: i * PASO, height: ALTO }} aria-hidden="true">
          {pie ? <div className="hoja-pie">{pie}</div> : null}
          {paginas > 1 ? <span className="hoja-num">Página {i + 1} de {paginas}</span> : null}
        </div>
      )) : null}
      <div ref={flujo} className="hoja-a4 hoja-flujo">
        {children}
        {pie ? <div className={`hoja-pie-continuo ${activo ? 'solo-print' : ''}`}>{pie}</div> : null}
      </div>
    </div>
  );
}
