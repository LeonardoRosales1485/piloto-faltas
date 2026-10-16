'use client';

import { TablaVista } from './TablaVista';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderLogo } from './LoaderLogo';
import { useCarga } from '@/lib/use-carga';
import { http } from '@/lib/api-client';
import { fechaCorta, MODULOS_ACTA, modulosDe, ROL_ETIQUETA, TIPOS_ACTA, tiposPermitidos } from '@/lib/dominio';
import { useAuthUser } from '@/lib/use-auth-user';
import { ModalForm, type CampoModal } from './ModalForm';
import { useNotify } from './NotifyProvider';
import Link from 'next/link';
import { PermisosPorTipo } from './AdminPermisos';

type U = { uuid: string; username: string; nombre: string; apellido: string; email: string | null; sector: string | null; legajo?: string | null; modulos_acta?: string | null; rol: string; activo: boolean; date_created: number };

const ROLES = Object.entries(ROL_ETIQUETA).map(([v, t]) => ({ v, t }));

/** ABM de usuarios del back office: alta, edición, cambio de contraseña y baja lógica. */
export function AdminUsuarios() {
  const notify = useNotify();
  const yo = useAuthUser();
  const [items, setItems] = useState<U[]>([]);
  const [texto, setTexto] = useState('');
  const [rol, setRol] = useState('');
  const [verBajas, setVerBajas] = useState(false);
  const [modal, setModal] = useState<{ u?: U } | null>(null);
  const [pestana, setPestana] = useState<'usuarios' | 'tipos'>('usuarios');

  const [cargando, seguir] = useCarga();
  const cargar = useCallback(() => { void seguir(http.get<U[]>('/api/admin/usuarios').then(setItems)).catch((e: Error) => notify.error('Error', e.message)); }, [notify, seguir]);
  useEffect(cargar, [cargar]);

  const lista = useMemo(() => {
    const t = texto.toLowerCase().trim();
    return items.filter((u) => (verBajas || u.activo !== false) && (!rol || u.rol === rol) && (!t || [u.username, u.nombre, u.apellido, u.email, u.sector].some((v) => String(v ?? '').toLowerCase().includes(t))));
  }, [items, texto, rol, verBajas]);

  const guardar = (b: Record<string, unknown>, ok: string) => http.post('/api/admin/usuarios', b).then(() => { notify.success(ok); setModal(null); cargar(); }).catch((e: Error) => notify.error('No se pudo guardar', e.message));

  const campos = (u?: U): CampoModal[] => [
    ...(u ? [] : [{ k: 'username', t: 'Usuario', tipo: 'texto' as const, req: true, ayuda: 'Minúsculas, sin espacios. No se puede cambiar después.' }]),
    { k: 'nombre', t: 'Nombre', tipo: 'texto', req: true, valor: u?.nombre },
    { k: 'apellido', t: 'Apellido', tipo: 'texto', req: true, valor: u?.apellido },
    { k: 'email', t: 'Correo', tipo: 'texto', valor: u?.email ?? '' },
    { k: 'sector', t: 'Sector', tipo: 'texto', valor: u?.sector ?? '', ayuda: 'Para inspectores: «Inspecciones Generales» los lleva al acta de contravención; si no, al acta de tránsito.' },
    { k: 'legajo', t: 'N° de legajo', tipo: 'texto', valor: u?.legajo ?? '', ayuda: 'Se imprime debajo de la firma del inspector en el acta.' },
    { k: 'modulos_acta', t: 'Tipos de acta (inspector: los que labra; directora, responsable y agente: los que gestiona)', tipo: 'multi', opciones: MODULOS_ACTA.map((m) => ({ v: m.v, t: m.t })), valor: u?.modulos_acta ?? (u?.rol === 'Inspector' ? modulosDe(u).join(',') : ''), ayuda: 'Inspector: módulos que puede labrar. Directora, Responsable y Agente: solo ven causas, escritos y pagos de esos tipos (vacío: Directora tránsito, Responsable contravenciones, Agente todos). No aplica a los demás roles.' },
    { k: 'rol', t: 'Rol', tipo: 'select', opciones: ROLES, req: true, valor: u?.rol },
    { k: 'password', t: u ? 'Nueva contraseña (opcional)' : 'Contraseña', tipo: 'clave', req: !u, ayuda: 'Mínimo 6 caracteres.' },
  ];

  return (
    <div className="pagina">
      <div className="bandeja-tabs mb-3">
        <button type="button" className={`bandeja-tab ${pestana === 'usuarios' ? 'activa' : ''}`} onClick={() => setPestana('usuarios')}><i className="fa-solid fa-users" aria-hidden="true" /> Usuarios</button>
        <button type="button" className={`bandeja-tab ${pestana === 'tipos' ? 'activa' : ''}`} onClick={() => setPestana('tipos')}><i className="fa-solid fa-user-shield" aria-hidden="true" /> Tipos de usuario y permisos</button>
      </div>
      {pestana === 'tipos' ? <PermisosPorTipo /> : (<>
      <div className="card-step mb-3"><div className="card-step-body">
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-5"><label className="form-label-v2" htmlFor="u-t">Buscar</label><input id="u-t" className="form-control" placeholder="Usuario, nombre, correo o sector" value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
          <div className="col-6 col-md-3"><label className="form-label-v2" htmlFor="u-r">Rol</label><select id="u-r" className="form-select" value={rol} onChange={(e) => setRol(e.target.value)}><option value="">Todos</option>{ROLES.map((r) => <option key={r.v} value={r.v}>{r.t}</option>)}</select></div>
          <div className="col-6 col-md-2"><label className="form-check mb-2"><input type="checkbox" className="form-check-input" checked={verBajas} onChange={(e) => setVerBajas(e.target.checked)} /> Ver bajas</label></div>
          <div className="col-12 col-md-2"><button type="button" className="btn btn-primary w-100" onClick={() => setModal({})}><i className="fa-solid fa-user-plus" aria-hidden="true" /> Nuevo usuario</button></div>
        </div>
      </div></div>

      <div className="card-step"><div className="card-step-body"><TablaVista>
        <table className="table align-middle mb-0">
          <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Sector</th><th>Legajo</th><th>Correo</th><th>Alta</th><th>Estado</th><th aria-label="Acciones" /></tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={9}><LoaderLogo tam={56} texto="Cargando…" /></td></tr> : lista.map((u) => (
              <tr key={u.uuid} className={u.activo === false ? 'text-muted' : ''}>
                <td><Link href={`/private/usuarios/${u.uuid}`}><strong>{u.username}</strong></Link>{u.username === yo?.username ? <span className="texto-ayuda"> (vos)</span> : null}</td>
                <td>{u.nombre} {u.apellido}</td>
                <td>{ROL_ETIQUETA[u.rol] ?? u.rol}{u.rol === 'Inspector' ? <div className="texto-ayuda">{modulosDe(u).map((m) => MODULOS_ACTA.find((x) => x.v === m)?.t).join(', ')}</div> : ['Directora', 'Responsable', 'Usuario'].includes(u.rol) ? <div className="texto-ayuda">{(tiposPermitidos(u) ?? []).map((id) => MODULOS_ACTA.find((x) => TIPOS_ACTA[x.v].id === id)?.t).join(', ') || 'Todos los tipos'}</div> : null}</td>
                <td>{u.sector ?? '-'}</td><td>{u.legajo ?? '-'}</td>
                <td>{u.email ?? '-'}</td>
                <td>{fechaCorta(u.date_created)}</td>
                <td>{u.activo === false ? <span className="badge bg-secondary">Baja</span> : <span className="badge bg-success">Activo</span>}</td>
                <td className="text-end text-nowrap">
                  <Link className="btn btn-sm btn-outline-primary me-1" href={`/private/usuarios/${u.uuid}`}><i className="fa-solid fa-pen" aria-hidden="true" /> Editar</Link>
                  {u.username !== yo?.username ? (
                    u.activo === false
                      ? <button type="button" className="btn btn-sm btn-outline-success" onClick={() => void guardar({ ...u, activo: true }, 'Usuario reactivado')}>Reactivar</button>
                      : <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void guardar({ ...u, activo: false }, 'Usuario dado de baja')}>Dar de baja</button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!cargando && !lista.length ? <tr><td colSpan={9} className="text-center texto-ayuda py-4">No hay usuarios con ese filtro.</td></tr> : null}
          </tbody>
        </table>
      </TablaVista></div></div>
      <p className="texto-ayuda mt-2">Las bajas no borran al usuario: queda inactivo, no puede ingresar y su historial se conserva.</p>
      </>)}

      {modal ? (
        <ModalForm
          titulo={modal.u ? `Editar ${modal.u.username}` : 'Nuevo usuario'}
          icono="fa-solid fa-user"
          campos={campos(modal.u)}
          textoOk={modal.u ? 'Guardar cambios' : 'Crear usuario'}
          onCancel={() => setModal(null)}
          onOk={(v) => guardar(modal.u ? { ...v, uuid: modal.u.uuid, activo: modal.u.activo } : v, modal.u ? 'Usuario actualizado' : 'Usuario creado')}
        />
      ) : null}
    </div>
  );
}
