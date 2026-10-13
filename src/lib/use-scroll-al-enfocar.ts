'use client';

import { useEffect } from 'react';

/**
 * Celular: al enfocar un campo de texto (no los select, que no abren teclado), lo lleva a la parte superior de la pantalla para que se vea mientras se escribe
 * con el teclado abierto. Si el campo está muy abajo y no hay recorrido, agrega espacio en blanco temporal al pie
 * (padding del body) y lo quita al salir del campo. En los modales, desplaza el cuerpo del modal.
 */
export function useScrollAlEnfocar(activo = true) {
  useEffect(() => {
    if (!activo || typeof window === 'undefined') return;
    const movil = window.matchMedia('(max-width: 899px)');
    let timer = 0;
    let limpiar = 0;
    const esCampo = (el: EventTarget | null): el is HTMLElement =>
      el instanceof HTMLElement && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'file', 'button', 'submit'].includes((el as HTMLInputElement).type)));

    function alEnfocar(e: FocusEvent) {
      if (!movil.matches || !esCampo(e.target)) return;
      const el = e.target;
      window.clearTimeout(limpiar);
      window.clearTimeout(timer);
      // Esperar a que el teclado termine de abrirse (cambia el alto de la ventana).
      timer = window.setTimeout(() => {
        const bloque = (el.closest('.form-group') as HTMLElement | null) ?? el;
        const modal = el.closest('.modal-fake-body') as HTMLElement | null;
        if (modal) {
          modal.scrollTo({ top: Math.max(0, bloque.getBoundingClientRect().top - modal.getBoundingClientRect().top + modal.scrollTop - 8), behavior: 'smooth' });
          return;
        }
        // Si la barra superior queda fija arriba, se descuenta su alto; si se desplaza con la página, no.
        const barra = document.querySelector('.inspector-topbar, .sidebar-movil-topbar') as HTMLElement | null;
        const fija = barra && ['fixed', 'sticky'].includes(getComputedStyle(barra).position) && barra.getBoundingClientRect().top >= 0 && window.scrollY > 0;
        const margen = (fija ? barra!.offsetHeight : 0) + 8;
        const destino = bloque.getBoundingClientRect().top + window.scrollY - margen;
        const alto = window.visualViewport?.height ?? window.innerHeight;
        const maximo = document.documentElement.scrollHeight - alto;
        if (destino > maximo) document.body.style.paddingBottom = `${Math.ceil(destino - maximo) + 16}px`;
        requestAnimationFrame(() => window.scrollTo({ top: destino, behavior: 'smooth' }));
      }, 280);
    }

    function alSalir(e: FocusEvent) {
      if (esCampo(e.relatedTarget)) return;
      limpiar = window.setTimeout(() => { document.body.style.paddingBottom = ''; }, 250);
    }

    document.addEventListener('focusin', alEnfocar);
    document.addEventListener('focusout', alSalir);
    return () => {
      document.removeEventListener('focusin', alEnfocar);
      document.removeEventListener('focusout', alSalir);
      window.clearTimeout(timer);
      window.clearTimeout(limpiar);
      document.body.style.paddingBottom = '';
    };
  }, [activo]);
}
