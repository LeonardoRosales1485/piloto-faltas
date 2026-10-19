'use client';

import { useEffect } from 'react';

/**
 * Ayudas de teclado globales (A11Y paso 3), montadas una sola vez en el layout raíz:
 *
 * 1. Regiones scrolleables (A11Y-007): cada `.table-responsive` que desborda recibe `tabindex="0"`,
 *    `role="region"` y un `aria-label` («Tabla: <título de la tarjeta>»), así se puede desplazar con
 *    las flechas. Si deja de desbordar, o pasa a la vista Tarjetas, se le quitan esos atributos.
 *    Un componente puede fijar el nombre con `data-region-label`.
 * 2. Diálogos modales (`[role="dialog"][aria-modal="true"]`): al abrirse llevan el foco adentro
 *    (respeta `autoFocus`), Tab / Shift+Tab no se escapan del diálogo de arriba, Escape cierra los
 *    `.modal-fake` igual que un clic afuera (respeta las guardas de cada pantalla) y, al cerrarse,
 *    el foco vuelve al control que lo abrió.
 */

const FOCUSABLES = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
].join(', ');

const visible = (el: Element) => (el as HTMLElement).getClientRects().length > 0;

function enfocables(cont: HTMLElement): HTMLElement[] {
  return Array.from(cont.querySelectorAll<HTMLElement>(FOCUSABLES)).filter((el) => !el.hidden && visible(el) && !el.closest('[inert]'));
}

function dialogosAbiertos(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')).filter(visible);
}

function dialogoArriba(): HTMLElement | null {
  const d = dialogosAbiertos();
  return d.length ? d[d.length - 1] : null;
}

function nombreRegion(el: HTMLElement): string {
  const propio = el.getAttribute('data-region-label');
  if (propio) return propio;
  const caption = el.querySelector('caption')?.textContent?.trim();
  if (caption) return `Tabla: ${caption}`;
  const cont = el.closest('.card-step, .card-seccion, .portal-card, .modal-fake, section');
  const titulo = cont?.querySelector('h1, h2, h3, h4')?.textContent?.trim();
  return titulo ? `Tabla: ${titulo}` : 'Tabla';
}

function quitarRegion(el: HTMLElement) {
  el.removeAttribute('data-a11y-region');
  el.removeAttribute('tabindex');
  el.removeAttribute('role');
  el.removeAttribute('aria-label');
}

function actualizarRegiones() {
  document.querySelectorAll<HTMLElement>('[data-a11y-region]').forEach((el) => {
    if (!el.classList.contains('table-responsive')) quitarRegion(el);
  });
  document.querySelectorAll<HTMLElement>('.table-responsive').forEach((el) => {
    const nuestra = el.hasAttribute('data-a11y-region');
    if (!nuestra && el.hasAttribute('tabindex')) return; // el componente ya lo resolvió
    const desborda = visible(el) && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    if (desborda) {
      if (!nuestra) {
        el.setAttribute('data-a11y-region', '1');
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'region');
      }
      const nombre = nombreRegion(el);
      if (el.getAttribute('aria-label') !== nombre) el.setAttribute('aria-label', nombre);
    } else if (nuestra && document.activeElement !== el) {
      quitarRegion(el);
    }
  });
}

export function AccesibilidadTeclado() {
  useEffect(() => {
    const conocidos = new Set<HTMLElement>();
    const origen = new WeakMap<HTMLElement, HTMLElement | null>();
    let ultimoFuera: HTMLElement | null = null;

    const recordar = (t: EventTarget | null) => {
      const el = t instanceof Element ? t.closest<HTMLElement>(FOCUSABLES) : null;
      if (el && !el.closest('[role="dialog"][aria-modal="true"]')) ultimoFuera = el;
    };
    const onFocusIn = (e: FocusEvent) => recordar(e.target);
    const onPointerDown = (e: PointerEvent) => recordar(e.target);

    const enfocarInicial = (d: HTMLElement) => {
      if (d.contains(document.activeElement)) return; // autoFocus o foco puesto por el componente
      const campo = enfocables(d).find((el) => el.closest('.modal-fake-body') && el.matches('input, select, textarea'));
      if (campo) { campo.focus(); return; }
      if (!d.hasAttribute('tabindex')) d.setAttribute('tabindex', '-1');
      d.focus({ preventScroll: true });
    };

    const actualizarDialogos = () => {
      const abiertos = dialogosAbiertos();
      for (const d of abiertos) {
        if (conocidos.has(d)) continue;
        conocidos.add(d);
        origen.set(d, ultimoFuera);
        enfocarInicial(d);
      }
      for (const d of Array.from(conocidos)) {
        if (abiertos.includes(d)) continue;
        conocidos.delete(d);
        const volver = origen.get(d);
        const act = document.activeElement;
        const perdido = !act || act === document.body || !act.isConnected;
        if (!perdido) continue;
        const otro = dialogoArriba();
        if (otro) enfocarInicial(otro);
        else if (volver && volver.isConnected && visible(volver)) volver.focus({ preventScroll: true });
      }
    };

    let pendiente = 0;
    const programar = () => {
      if (pendiente) return;
      pendiente = requestAnimationFrame(() => {
        pendiente = 0;
        actualizarDialogos();
        actualizarRegiones();
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const d = dialogoArriba();
        if (!d) return;
        const lista = enfocables(d);
        const act = document.activeElement as HTMLElement | null;
        if (!lista.length) { e.preventDefault(); d.focus(); return; }
        const primero = lista[0];
        const ultimo = lista[lista.length - 1];
        if (!act || !d.contains(act)) { e.preventDefault(); (e.shiftKey ? ultimo : primero).focus(); }
        else if (e.shiftKey && (act === primero || act === d)) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && act === ultimo) { e.preventDefault(); primero.focus(); }
        return;
      }
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const d = dialogoArriba();
      if (!d || !d.classList.contains('modal-fake')) return;
      // Se espera un ciclo: si la pantalla ya cierra su modal con Escape, no se cierra dos veces.
      window.setTimeout(() => {
        if (!d.isConnected || !visible(d)) return;
        const overlay = d.parentElement;
        if (overlay?.classList.contains('modal-fake-overlay')) {
          overlay.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return;
        }
        d.querySelector<HTMLButtonElement>('.modal-fake-header button[aria-label="Cerrar"]')?.click();
      }, 0);
    };

    const obs = new MutationObserver(programar);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', programar);
    programar();
    return () => {
      obs.disconnect();
      if (pendiente) cancelAnimationFrame(pendiente);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', programar);
    };
  }, []);
  return null;
}
