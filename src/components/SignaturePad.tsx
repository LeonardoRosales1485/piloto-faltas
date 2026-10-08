'use client';

import { useEffect, useRef, useState } from 'react';

/** Panel de firma en pantalla (el infractor firma con el dedo o el mouse). */
export function SignaturePad({ value, onChange, disabled }: { value?: string | null; onChange: (dataUrl: string | null) => void; disabled?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const [vacio, setVacio] = useState(!value);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const w = c.offsetWidth;
    const h = c.offsetHeight;
    c.width = w * ratio;
    c.height = h * ratio;
    const ctx = c.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, h);
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    dibujando.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = e.currentTarget.getContext('2d')!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return;
    const ctx = e.currentTarget.getContext('2d')!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function up() {
    if (!dibujando.current) return;
    dibujando.current = false;
    setVacio(false);
    onChange(ref.current!.toDataURL('image/png'));
  }

  function limpiar() {
    const c = ref.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setVacio(true);
    onChange(null);
  }

  return (
    <div className="firma-pad">
      <canvas
        ref={ref}
        className="firma-pad-canvas"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        aria-label="Área de firma"
      />
      <div className="firma-pad-pie">
        <span>{vacio ? 'Firme dentro del recuadro' : 'Firma registrada'}</span>
        {!disabled ? (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={limpiar}>
            <i className="fa-solid fa-eraser" aria-hidden="true" /> Borrar
          </button>
        ) : null}
      </div>
    </div>
  );
}
