'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Dibuja su contenido a la derecha del título de la barra superior de la vista. */
export function BarraSuperior({ children }: { children: ReactNode }) {
  const [destino, setDestino] = useState<HTMLElement | null>(null);
  useEffect(() => setDestino(document.getElementById('topbar-extra')), []);
  return destino ? createPortal(children, destino) : null;
}
