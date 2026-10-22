'use client';

import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { FUNCIONES_OPCIONALES, SOLO_TRANSITO } from '@/lib/dominio';
import type { ConfiguracionItem } from '@/lib/types';
import { useCarga } from '@/lib/use-carga';
import { LoaderLogo } from './LoaderLogo';
import { useNotify } from './NotifyProvider';

/** Configuración › Funciones opcionales (solo administrador): muestra u oculta funciones fuera del alcance del piloto. */
export function FuncionesOpcionales() {
  const notify = useNotify();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [cargando, seguir] = useCarga();
  const [guardando, setGuardando] = useState<string | null>(null);

  const cargar = useCallback(() => {
    void seguir(http.get<ConfiguracionItem[]>('/api/configuracion/all').then((lista) => setValores(Object.fromEntries(lista.map((c) => [c.llave, String(c.valor ?? '')])))));
  }, [seguir]);
  useEffect(cargar, [cargar]);

  async function alternar(llave: string, activa: boolean) {
    setGuardando(llave);
    try {
      await http.post('/api/configuracion/save', { llave, valor: activa ? '1' : '0', publico: '0' });
      setValores((v) => ({ ...v, [llave]: activa ? '1' : '0' }));
      notify.success(llave === SOLO_TRANSITO ? (activa ? 'Solo Tránsito activado' : 'Todas las áreas habilitadas') : activa ? 'Función visible' : 'Función oculta', 'Se recarga la página para aplicar el cambio en el menú.');
      // Los permisos se calculan al cargar la sesión: recargar aplica el cambio en el menú.
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      notify.error('No se pudo guardar', e instanceof Error ? e.message : '');
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="pagina">
      <article className="card-step">
        <div className="card-step-header">
          <h2>Funciones opcionales</h2>
          <p>Funciones que no forman parte de los requerimientos del piloto. Están ocultas por defecto; al activarlas aparecen en el menú para quienes tengan el permiso.</p>
        </div>
        <div className="card-step-body">
          {cargando ? <LoaderLogo tam={56} /> : (
            <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
              <li className="d-flex align-items-start gap-3">
                <div className="form-check form-switch m-0 pt-1">
                  <input id={SOLO_TRANSITO} type="checkbox" role="switch" className="form-check-input" style={{ transform: 'scale(1.3)' }} checked={valores[SOLO_TRANSITO] === '1'} disabled={guardando !== null} onChange={(e) => void alternar(SOLO_TRANSITO, e.target.checked)} />
                </div>
                <label htmlFor={SOLO_TRANSITO}>
                  <strong>Solo Tránsito (prueba piloto)</strong> <span className={`badge ${valores[SOLO_TRANSITO] === '1' ? 'text-bg-warning' : 'text-bg-secondary'}`}>{valores[SOLO_TRANSITO] === '1' ? 'Activo' : 'Inactivo'}</span>
                  <div className="texto-ayuda">Oculta contravenciones y sustancias alimenticias en el back office y en la app de inspectores (labrado, causas, ordenanzas y reportes). No borra nada: al desactivarlo vuelve todo. Los usuarios lo ven al volver a entrar o recargar.</div>
                </label>
              </li>
              {FUNCIONES_OPCIONALES.map((f) => {
                const activa = valores[f.llave] === '1';
                return (
                  <li key={f.llave} className="d-flex align-items-start gap-3">
                    <div className="form-check form-switch m-0 pt-1">
                      <input id={f.llave} type="checkbox" role="switch" className="form-check-input" style={{ transform: 'scale(1.3)' }} checked={activa} disabled={guardando !== null} onChange={(e) => void alternar(f.llave, e.target.checked)} />
                    </div>
                    <label htmlFor={f.llave}>
                      <strong>{f.titulo}</strong> <span className={`badge ${activa ? 'text-bg-success' : 'text-bg-secondary'}`}>{activa ? 'Visible' : 'Oculta'}</span>
                      <div className="texto-ayuda">{f.detalle}</div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </article>
    </div>
  );
}
