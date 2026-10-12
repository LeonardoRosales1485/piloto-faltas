'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { http } from '@/lib/api-client';
import { MODULOS_ACTA, PERMISO_INFO, PERMISOS, ROL_ETIQUETA, fechaCorta, modulosDe, permisosEfectivos, type Permiso } from '@/lib/dominio';
import { useAuthUser } from '@/lib/use-auth-user';
import { useMatrizPermisos } from './AdminPermisos';
import { LoaderLogo } from './LoaderLogo';
import { useNotify } from './NotifyProvider';

type U = { uuid: string; username: string; nombre: string; apellido: string; email: string | null; sector: string | null; legajo?: string | null; modulos_acta?: string | null; rol: string; activo: boolean; date_created: number };
const LISTA = Object.keys(PERMISOS) as Permiso[];
const GRUPOS = [...new Set(LISTA.map((p) => PERMISO_INFO[p].g))];

/** Vista dedicada de un usuario: datos, tipo de inspector y todos sus permisos (con prioridad sobre su tipo de usuario). */
export function UsuarioDetalle() {
  const { uuid } = useParams() as { uuid: string };
  const notify = useNotify();
  const yo = useAuthUser();
  const { m, fijar, delRol, delUsuario } = useMatrizPermisos();
  const [u, setU] = useState<U | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');

  const cargar = useCallback(() => {
    http.get<U[]>('/api/admin/usuarios').then((lista) => {
      const x = lista.find((y) => y.uuid === uuid) ?? null;
      setU(x);
      if (x) setF({ nombre: x.nombre, apellido: x.apellido, email: x.email ?? '', sector: x.sector ?? '', legajo: x.legajo ?? '', rol: x.rol, modulos_acta: x.modulos_acta ?? (x.rol === 'Inspector' ? modulosDe(x).join(',') : 'multas'), password: '' });
    }).catch((e: Error) => notify.error('No se pudo cargar el usuario', e.message));
  }, [uuid, notify]);
  useEffect(cargar, [cargar]);

  const rol = f.rol || u?.rol || '';
  const ovRol = delRol(rol);
  const ovUsr = u ? delUsuario(u.username) : {};
  const efectivos = useMemo(() => permisosEfectivos(rol, ovRol, ovUsr), [rol, ovRol, ovUsr]);
  const personalizados = Object.keys(ovUsr).length;

  if (!u || !m) return <LoaderLogo texto="Cargando usuario…" pantalla />;
  const propio = u.username === yo?.username;

  async function guardar(extra: Record<string, unknown> = {}, ok = 'Usuario actualizado') {
    setGuardando(true);
    try {
      await http.post('/api/admin/usuarios', { ...f, uuid: u!.uuid, activo: u!.activo, ...extra });
      notify.success(ok);
      cargar();
    } catch (e) {
      notify.error('No se pudo guardar', (e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function restablecerTodo() {
    for (const p of Object.keys(ovUsr) as Permiso[]) await fijar('usuario', u!.username, p, null);
    notify.success('Permisos restablecidos', 'El usuario vuelve a tener los permisos de su tipo.');
  }

  const campo = (k: string, t: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="col-12 col-md-6">
      <label className="form-label-v2" htmlFor={`u-${k}`}>{t}</label>
      <input id={`u-${k}`} className="form-control" value={f[k] ?? ''} onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))} {...props} />
    </div>
  );
  const q = filtro.toLowerCase().trim();

  return (
    <div className="pagina">
      <div className="usuario-cabecera card-step mb-3">
        <Link href="/private/usuarios" className="btn btn-outline-secondary btn-sm"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Usuarios</Link>
        <div className="usuario-avatar"><i className="fa-solid fa-user" aria-hidden="true" /></div>
        <div className="flex-grow-1">
          <h1>{u.nombre} {u.apellido} {propio ? <span className="texto-ayuda">(vos)</span> : null}</h1>
          <span className="texto-ayuda">{u.username} · {ROL_ETIQUETA[u.rol] ?? u.rol} · alta {fechaCorta(u.date_created)}</span>
        </div>
        {u.activo === false ? <span className="badge bg-secondary">Baja</span> : <span className="badge bg-success">Activo</span>}
        {!propio ? (u.activo === false
          ? <button type="button" className="btn btn-outline-success" onClick={() => void guardar({ activo: true }, 'Usuario reactivado')}>Reactivar</button>
          : <button type="button" className="btn btn-outline-danger" onClick={() => void guardar({ activo: false }, 'Usuario dado de baja')}>Dar de baja</button>) : null}
      </div>

      <div className="usuario-layout">
        <div className="card-step">
          <div className="card-step-header"><h2>Datos</h2><p>Datos de acceso y del usuario</p></div>
          <div className="card-step-body">
            <div className="row g-3">
              {campo('nombre', 'Nombre')}
              {campo('apellido', 'Apellido')}
              {campo('email', 'Correo', { type: 'email' })}
              {campo('sector', 'Sector')}
              {campo('legajo', 'N° de legajo')}
              <div className="col-12 col-md-6">
                <label className="form-label-v2" htmlFor="u-rol">Tipo de usuario</label>
                <select id="u-rol" className="form-select" value={f.rol} disabled={propio} onChange={(e) => setF((p) => ({ ...p, rol: e.target.value }))}>
                  {Object.entries(ROL_ETIQUETA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
                {propio ? <small className="texto-ayuda">No puede cambiar su propio tipo de usuario.</small> : null}
              </div>
              {f.rol === 'Inspector' ? (
                <div className="col-12">
                  <label className="form-label-v2">Tipos de acta que puede labrar</label>
                  <div className="d-flex gap-2 flex-wrap">
                    {MODULOS_ACTA.map((mo) => {
                      const sel = (f.modulos_acta ?? '').split(',').filter(Boolean);
                      const on = sel.includes(mo.v);
                      return (
                        <label key={mo.v} className={`opcion-grande ${on ? 'activa' : ''}`} style={{ width: 'auto', minHeight: 44 }}>
                          <input type="checkbox" checked={on} onChange={() => setF((p) => ({ ...p, modulos_acta: (on ? sel.filter((x) => x !== mo.v) : [...sel, mo.v]).join(',') }))} />
                          <span>{mo.t}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {campo('password', 'Nueva contraseña (opcional)', { type: 'password', autoComplete: 'new-password', placeholder: 'Mínimo 6 caracteres' })}
            </div>
            <button type="button" className="btn btn-primary mt-3" disabled={guardando} onClick={() => void guardar()}>
              <i className={`fa-solid ${guardando ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} aria-hidden="true" /> Guardar datos
            </button>
          </div>
        </div>

        <div className="card-step">
          <div className="card-step-header d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <h2>Permisos</h2>
              <p>{efectivos.length} de {LISTA.length} permisos activos · {personalizados ? `${personalizados} personalizado(s)` : 'todos según su tipo'}. Lo personalizado tiene prioridad sobre el tipo «{ROL_ETIQUETA[rol] ?? rol}».</p>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <input className="form-control form-control-sm" style={{ width: 200 }} placeholder="Buscar permiso…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
              {personalizados ? <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void restablecerTodo()}><i className="fa-solid fa-arrows-rotate" aria-hidden="true" /> Restablecer todo</button> : null}
            </div>
          </div>
          <div className="card-step-body">
            {f.rol !== u.rol ? <div className="aviso aviso-info">Guarde los datos para aplicar el nuevo tipo de usuario; la vista ya muestra lo heredado de «{ROL_ETIQUETA[f.rol]}».</div> : null}
            {GRUPOS.map((g) => {
              const items = LISTA.filter((p) => PERMISO_INFO[p].g === g && (!q || `${PERMISO_INFO[p].t} ${PERMISO_INFO[p].d}`.toLowerCase().includes(q)));
              if (!items.length) return null;
              return (
                <section key={g} className="permisos-grupo">
                  <h3>{g}</h3>
                  {items.map((p) => {
                    const heredado = permisosEfectivos(rol, ovRol).includes(p);
                    const ov = ovUsr[p];
                    const activo = efectivos.includes(p);
                    const bloqueado = (rol === 'Administrador' && p === 'parametrizar') || (propio && p === 'parametrizar');
                    return (
                      <div key={p} className={`permiso-fila ${ov !== undefined ? 'permiso-cambiado' : ''}`}>
                        <span className={`permiso-estado ${activo ? 'si' : 'no'}`} title={activo ? 'Tiene el permiso' : 'No tiene el permiso'}><i className={`fa-solid ${activo ? 'fa-check' : 'fa-xmark'}`} aria-hidden="true" /></span>
                        <div className="permiso-texto"><strong>{PERMISO_INFO[p].t}</strong><span>{PERMISO_INFO[p].d}</span></div>
                        <div className="btn-group btn-group-sm permiso-control" role="group" aria-label={PERMISO_INFO[p].t}>
                          <button type="button" disabled={bloqueado} className={`btn ${ov === undefined ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => void fijar('usuario', u.username, p, null)}>Según su tipo ({heredado ? 'sí' : 'no'})</button>
                          <button type="button" disabled={bloqueado} className={`btn ${ov === true ? 'btn-success' : 'btn-outline-success'}`} onClick={() => void fijar('usuario', u.username, p, true)}>Permitir</button>
                          <button type="button" disabled={bloqueado} className={`btn ${ov === false ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => void fijar('usuario', u.username, p, false)}>Denegar</button>
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}
            <p className="texto-ayuda mb-0">Los cambios de permisos se guardan al instante. El usuario los ve al volver a entrar o recargar la página.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
