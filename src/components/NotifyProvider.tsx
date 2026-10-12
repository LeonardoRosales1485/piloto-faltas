'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type Notificacion = {
  id: number;
  titulo: string;
  detalle?: string;
  tipo: 'success' | 'error' | 'info' | 'warning';
  accion?: AccionToast;
};

/** Acceso directo dentro del aviso (por ejemplo «Dictar fallo»). */
export type AccionToast = { texto: string; href?: string; on?: () => void };

type NotifyContextValue = {
  success: (titulo: string, detalle?: string, accion?: AccionToast) => void;
  error: (titulo: string, detalle?: string) => void;
  warning: (titulo: string, detalle?: string) => void;
  info: (titulo: string, detalle?: string) => void;
  close: (id: number) => void;
};

const NotifyContext = createContext<NotifyContextValue | null>(null);

function icono(tipo: Notificacion['tipo']) {
  if (tipo === 'success') return 'fa-solid fa-circle-check';
  if (tipo === 'error') return 'fa-solid fa-circle-xmark';
  if (tipo === 'warning') return 'fa-solid fa-triangle-exclamation';
  return 'fa-solid fa-circle-info';
}

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notificacion[]>([]);
  const nextId = useRef(1);

  const close = useCallback((id: number) => {
    setItems((list) => list.filter((n) => n.id !== id));
  }, []);

  const push = useCallback(
    (titulo: string, detalle: string | undefined, tipo: Notificacion['tipo'], accion?: AccionToast) => {
      const id = nextId.current++;
      setItems((list) => [...list, { id, titulo, detalle, tipo, accion }]);
      window.setTimeout(() => close(id), accion ? 9000 : 4200);
    },
    [close],
  );

  const value = useMemo<NotifyContextValue>(
    () => ({
      success: (t, d, a) => push(t, d, 'success', a),
      error: (t, d) => push(t, d, 'error'),
      warning: (t, d) => push(t, d, 'warning'),
      info: (t, d) => push(t, d, 'info'),
      close,
    }),
    [push, close],
  );

  return (
    <NotifyContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((n) => (
          <div
            key={n.id}
            className={`toast-app toast-app-${n.tipo}`}
            role="status"
            onClick={() => close(n.id)}
          >
            <i className={icono(n.tipo)} aria-hidden="true" />
            <div>
              <strong>{n.titulo}</strong>
              {n.detalle ? <p>{n.detalle}</p> : null}
              {n.accion ? (
                n.accion.href
                  ? <a className="toast-accion" href={n.accion.href} onClick={(e) => e.stopPropagation()}>{n.accion.texto} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></a>
                  : <button type="button" className="toast-accion" onClick={(e) => { e.stopPropagation(); n.accion?.on?.(); close(n.id); }}>{n.accion.texto} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Cerrar notificación"
              onClick={(e) => {
                e.stopPropagation();
                close(n.id);
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </NotifyContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error('useNotify must be used within NotifyProvider');
  return ctx;
}
