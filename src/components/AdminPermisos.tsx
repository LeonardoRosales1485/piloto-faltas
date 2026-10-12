'use client';

import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { PERMISO_INFO, PERMISOS, ROL_ETIQUETA, permisosEfectivos, type Overrides, type Permiso } from '@/lib/dominio';
import { LoaderLogo } from './LoaderLogo';
import { useNotify } from './NotifyProvider';

type Matriz = { roles: { rol: string; permiso: string; permitido: boolean }[]; usuarios: { username: string; permiso: string; permitido: boolean }[] };
const LISTA = Object.keys(PERMISOS) as Permiso[];
const porDefecto = (rol: string, p: Permiso) => (PERMISOS[p] as readonly string[]).includes(rol);

export function useMatrizPermisos() {
  const notify = useNotify();
  const [m, setM] = useState<Matriz | null>(null);
  const cargar = useCallback(() => { http.get<Matriz>('/api/admin/permisos').then(setM).catch((e: Error) => notify.error('No se pudieron cargar los permisos', e.message)); }, [notify]);
  useEffect(cargar, [cargar]);
  const fijar = async (tipo: 'rol' | 'usuario', clave: string, permiso: Permiso, valor: boolean | null) => {
    try { await http.post('/api/admin/permisos', { tipo, clave, permiso, valor }); cargar(); } catch (e) { notify.error('No se pudo guardar', (e as Error).message); }
  };
  const delRol = (rol: string): Overrides => Object.fromEntries((m?.roles ?? []).filter((x) => x.rol === rol).map((x) => [x.permiso, x.permitido]));
  const delUsuario = (u: string): Overrides => Object.fromEntries((m?.usuarios ?? []).filter((x) => x.username === u).map((x) => [x.permiso, x.permitido]));
  return { m, fijar, delRol, delUsuario };
}

/** Matriz «tipo de usuario × permiso». Cada casilla se puede cambiar; las que difieren del valor por defecto se marcan. */
export function PermisosPorTipo() {
  const { m, fijar, delRol } = useMatrizPermisos();
  if (!m) return <LoaderLogo tam={56} texto="Cargando permisos…" />;
  const roles = Object.keys(ROL_ETIQUETA);
  return (
    <div className="card-step">
      <div className="card-step-header"><h2>Tipos de usuario y permisos</h2><p>Qué secciones ve cada tipo de usuario. Los permisos particulares de un usuario (botón «Permisos» en la lista) tienen prioridad sobre los de su tipo.</p></div>
      <div className="card-step-body table-responsive">
        <table className="table align-middle matriz-permisos mb-0">
          <thead><tr><th>Permiso</th>{roles.map((r) => <th key={r} className="text-center">{ROL_ETIQUETA[r]}</th>)}</tr></thead>
          <tbody>
            {LISTA.map((p) => (
              <tr key={p}>
                <td><strong>{PERMISO_INFO[p].t}</strong><div className="texto-ayuda">{PERMISO_INFO[p].d}</div></td>
                {roles.map((r) => {
                  const ov = delRol(r)[p];
                  const efectivo = permisosEfectivos(r, delRol(r)).includes(p);
                  const fijo = r === 'Administrador' && p === 'parametrizar';
                  return (
                    <td key={r} className={`text-center ${ov !== undefined ? 'permiso-cambiado' : ''}`}>
                      <input type="checkbox" className="form-check-input" checked={efectivo} disabled={fijo} aria-label={`${PERMISO_INFO[p].t} · ${ROL_ETIQUETA[r]}`}
                        onChange={(e) => void fijar('rol', r, p, e.target.checked === porDefecto(r, p) ? null : e.target.checked)} />
                      {ov !== undefined ? <button type="button" className="btn btn-link btn-sm p-0 d-block mx-auto" title="Volver al valor por defecto" onClick={() => void fijar('rol', r, p, null)}>restablecer</button> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="texto-ayuda mt-2 mb-0">Las casillas resaltadas difieren del valor por defecto del sistema. El Administrador conserva siempre «Configuración». Los usuarios ven los cambios al volver a entrar o recargar la página.</p>
      </div>
    </div>
  );
}

/** Permisos particulares de un usuario: por cada permiso, «Según su tipo», «Permitir» o «Denegar». */
export function PermisosDeUsuario({ username, rol, onCerrar }: { username: string; rol: string; onCerrar: () => void }) {
  const { m, fijar, delRol, delUsuario } = useMatrizPermisos();
  return (
    <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal-fake modal-fake-xl" role="dialog" aria-modal="true" aria-label={`Permisos de ${username}`}>
        <div className="modal-fake-header">
          <i className="fa-solid fa-user-lock" aria-hidden="true" />
          <h2>Permisos de {username} · {ROL_ETIQUETA[rol] ?? rol}</h2>
          <button type="button" aria-label="Cerrar" onClick={onCerrar}>&times;</button>
        </div>
        <div className="modal-fake-body">
          {!m ? <LoaderLogo tam={48} /> : (
            <>
              <p className="texto-ayuda">Lo que se elija acá tiene prioridad sobre el tipo de usuario. «Según su tipo» hereda lo configurado para {ROL_ETIQUETA[rol] ?? rol}.</p>
              <ul className="lista-permisos-usuario">
                {LISTA.map((p) => {
                  const heredado = permisosEfectivos(rol, delRol(rol)).includes(p);
                  const ov = delUsuario(username)[p];
                  const valor = ov === undefined ? 'heredar' : ov ? 'si' : 'no';
                  return (
                    <li key={p} className={ov !== undefined ? 'permiso-cambiado' : ''}>
                      <div><strong>{PERMISO_INFO[p].t}</strong><span>{PERMISO_INFO[p].d}</span></div>
                      <div className="btn-group btn-group-sm" role="group" aria-label={PERMISO_INFO[p].t}>
                        <button type="button" className={`btn ${valor === 'heredar' ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => void fijar('usuario', username, p, null)}>Según su tipo ({heredado ? 'sí' : 'no'})</button>
                        <button type="button" className={`btn ${valor === 'si' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => void fijar('usuario', username, p, true)}>Permitir</button>
                        <button type="button" className={`btn ${valor === 'no' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => void fijar('usuario', username, p, false)}>Denegar</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
        <div className="modal-fake-footer"><button type="button" className="btn btn-primary" onClick={onCerrar}>Listo</button></div>
      </div>
    </div>
  );
}
