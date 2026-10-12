'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Pad de firma a pantalla completa: toda la pantalla es el área de dibujo (el infractor firma en el equipo del inspector).
 * Botones flotantes abajo: «Borrar» y «Listo». Devuelve la firma recortada a su contorno, sobre fondo blanco.
 */
export function FirmaPantallaCompleta({ onListo, onCancelar }: { onListo: (dataUrl: string) => void; onCancelar: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const caja = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [vacio, setVacio] = useState(true);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const preparar = () => {
      const c = ref.current;
      if (!c) return;
      const ratio = window.devicePixelRatio || 1;
      c.width = c.offsetWidth * ratio;
      c.height = c.offsetHeight * ratio;
      const ctx = c.getContext('2d')!;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#111827';
      caja.current = null;
      setVacio(true);
    };
    preparar();
    window.addEventListener('resize', preparar);
    return () => { document.body.style.overflow = prev; window.removeEventListener('resize', preparar); };
  }, []);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    const b = caja.current;
    caja.current = b ? { x0: Math.min(b.x0, p.x), y0: Math.min(b.y0, p.y), x1: Math.max(b.x1, p.x), y1: Math.max(b.y1, p.y) } : { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    return p;
  };

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    dibujando.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = e.currentTarget.getContext('2d')!;
    const p = punto(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return;
    const ctx = e.currentTarget.getContext('2d')!;
    const p = punto(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function up() {
    if (!dibujando.current) return;
    dibujando.current = false;
    setVacio(false);
  }

  function borrar() {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    caja.current = null;
    setVacio(true);
  }

  function listo() {
    const c = ref.current!;
    const b = caja.current;
    if (!b) return;
    const ratio = window.devicePixelRatio || 1;
    const pad = 12;
    const x = Math.max(0, (b.x0 - pad) * ratio);
    const y = Math.max(0, (b.y0 - pad) * ratio);
    const w = Math.min(c.width - x, (b.x1 - b.x0 + pad * 2) * ratio);
    const h = Math.min(c.height - y, (b.y1 - b.y0 + pad * 2) * ratio);
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(w));
    out.height = Math.max(1, Math.round(h));
    const o = out.getContext('2d')!;
    o.fillStyle = '#ffffff';
    o.fillRect(0, 0, out.width, out.height);
    o.drawImage(c, x, y, w, h, 0, 0, out.width, out.height);
    onListo(out.toDataURL('image/png'));
  }

  return createPortal(
    <div className="firma-completa" role="dialog" aria-modal="true" aria-label="Firma del infractor">
      <button type="button" className="firma-completa-cerrar" aria-label="Cancelar" onClick={onCancelar}>&times;</button>
      {vacio ? <div className="firma-completa-guia"><i className="fa-solid fa-signature" aria-hidden="true" /> Firme en cualquier lugar de la pantalla</div> : null}
      <div className="firma-completa-linea" aria-hidden="true" />
      <canvas ref={ref} className="firma-completa-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Área de firma" />
      <div className="firma-completa-botones">
        <button type="button" className="btn btn-lg btn-light" onClick={borrar} disabled={vacio}><i className="fa-solid fa-eraser" aria-hidden="true" /> Borrar</button>
        <button type="button" className="btn btn-lg btn-success" onClick={listo} disabled={vacio}><i className="fa-solid fa-check" aria-hidden="true" /> Listo</button>
      </div>
    </div>,
    document.body,
  );
}
