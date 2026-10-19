'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { http } from '@/lib/api-client';
import { fechaHora, MODULOS_ACTA, modulosDe, puede } from '@/lib/dominio';
import { useAuthUser } from '@/lib/use-auth-user';
import { useCarga } from '@/lib/use-carga';
import { LoaderLogo } from './LoaderLogo';
import { ModalForm, type CampoModal } from './ModalForm';
import { useNotify } from './NotifyProvider';

type I = {
  uuid: string; username: string; nombre: string; apellido: string; email: string | null; sector: string | null; legajo: string | null;
  terminal: string | null; firma_activa: boolean; activo: boolean; modulos_acta: string | null; actas: number; ultima_acta: number | null;
};

const DEPENDENCIAS = ['Inspección de Tránsito', 'Inspecciones Generales', 'Bromatología', 'Seguridad Ciudadana'];

/** ABM de inspectores: legajo, dependencia, terminal asignada y firma digital activa o inactiva. */
export function AdminInspectores() {
  const user = useAuthUser();
  const notify = useNotify();
  const [items, setItems] = useState<I[]>([]);
  const [cargando, seguir] = useCarga();
  const [texto, setTexto] = useState('');
  const [verBajas, setVerBajas] = useState(false);
  const [modal, setModal] = useState<{ i?: I } | null>(null);

  const cargar = useCallback(() => { void seguir(http.get<I[]>('/api/inspectores').then(setItems).catch((e: Error) => notify.error('Error', e.message))); }, [seguir, notify]);
  useEffect(cargar, [cargar]);

  const lista = useMemo(() => {
    const t = texto.toLowerCase().trim();
    return items.filter((i) => (verBajas || i.activo !== false) && (!t || [i.username, i.nombre, i.apellido, i.legajo, i.sector, i.terminal].some((v) => String(v ?? '').toLowerCase().includes(t))));
  }, [items, texto, verBajas]);

  const guardar = (b: Record<string, unknown>, ok: string) =>
    http.post('/api/inspectores', b).then(() => { notify.success(ok); setModal(null); cargar(); }).catch((e: Error) => notify.error('No se pudo guardar', e.message));

  const campos = (i?: I): CampoModal[] => [
    ...(i ? [] : [{ k: 'username', t: 'Usuario', tipo: 'texto' as const, req: true, ayuda: 'Con este usuario ingresa al labrado. No se puede cambiar después.' }]),
    { k: 'nombre', t: 'Nombre', tipo: 'texto', req: true, valor: i?.nombre },
    { k: 'apellido', t: 'Apellido', tipo: 'texto', req: true, valor: i?.apellido },
    { k: 'legajo', t: 'N° de legajo', tipo: 'texto', req: true, valor: i?.legajo ?? '', ayuda: 'Se imprime debajo de la firma en el acta.' },
    { k: 'modulos_acta', t: 'Tipo de inspector (módulos autorizados)', tipo: 'multi', req: true, opciones: MODULOS_ACTA.map((m) => ({ v: m.v, t: m.t })), valor: i ? modulosDe({ rol: 'Inspector', modulos_acta: i.modulos_acta, sector: i.sector }).join(',') : 'multas', ayuda: 'Solo puede labrar y ver los borradores de los tipos de acta marcados.' },
    { k: 'sector', t: 'Dependencia', tipo: 'select', req: true, opciones: DEPENDENCIAS.map((d) => ({ v: d, t: d })), valor: i?.sector ?? DEPENDENCIAS[0] },
    { k: 'terminal', t: 'Terminal asignada', tipo: 'texto', valor: i?.terminal ?? '', ayuda: 'Identificador del dispositivo (ej.: T-03). Vacío = sin terminal.' },
    { k: 'email', t: 'Correo', tipo: 'texto', valor: i?.email ?? '' },
    { k: 'password', t: i ? 'Nueva contraseña (opcional)' : 'Contraseña', tipo: 'clave', req: !i, ayuda: 'Mínimo 6 caracteres.' },
  ];

  const activos = items.filter((i) => i.activo !== false);

  return (
    <div className="pagina">
      <div className="insp-resumen">
        <div><span>Inspectores activos</span><strong>{activos.length}</strong></div>
        <div><span>Con firma activa</span><strong>{activos.filter((i) => i.firma_activa !== false).length}</strong></div>
        <div><span>Con terminal</span><strong>{activos.filter((i) => i.terminal).length}</strong></div>
        <div><span>Actas firmadas</span><strong>{items.reduce((a, i) => a + i.actas, 0)}</strong></div>
      </div>

      <div className="card-step mb-3"><div className="card-step-body">
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-7"><label className="form-label-v2" htmlFor="i-t">Buscar inspector</label><input id="i-t" className="form-control" placeholder="Nombre, usuario, legajo, dependencia o terminal" value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
          <div className="col-6 col-md-2"><label className="form-check mb-2"><input type="checkbox" className="form-check-input" checked={verBajas} onChange={(e) => setVerBajas(e.target.checked)} /> Ver bajas</label></div>
          <div className="col-6 col-md-3"><button type="button" className="btn btn-primary w-100" onClick={() => setModal({})}><i className="fa-solid fa-user-plus" aria-hidden="true" /> Nuevo inspector</button></div>
        </div>
      </div></div>

      <div className="card-step"><div className="card-step-header"><h2>Listado de inspectores</h2><p>Gestione legajos, terminales y firmas activas o inactivas. Con la firma inactiva, el inspector no puede firmar actas.</p></div>
        <div className="card-step-body">
          {cargando ? <LoaderLogo tam={56} texto="Cargando inspectores…" /> : (
            <div className="insp-grid">
              {lista.map((i) => (
                <article key={i.uuid} className={`insp-card ${i.activo === false ? 'baja' : ''}`}>
                  <div className="insp-cab">
                    <span className="insp-avatar">{(i.nombre[0] ?? '') + (i.apellido.split(' ').pop()?.[0] ?? '')}</span>
                    <div><strong>{i.nombre} {i.apellido}</strong><span>{i.username} · Legajo {i.legajo ?? '-'}</span></div>
                  </div>
                  <dl>
                    <div><dt>Tipo</dt><dd className="insp-modulos">{modulosDe({ rol: 'Inspector', modulos_acta: i.modulos_acta, sector: i.sector }).map((m) => <span key={m}>{MODULOS_ACTA.find((x) => x.v === m)?.t}</span>)}</dd></div>
                    <div><dt>Dependencia</dt><dd>{i.sector ?? '-'}</dd></div>
                    <div><dt>Terminal</dt><dd>{i.terminal ?? 'No asignada'}</dd></div>
                    <div><dt>Firma</dt><dd><span className={`insp-firma ${i.firma_activa !== false ? 'si' : 'no'}`}>{i.firma_activa !== false ? 'Activa' : 'Inactiva'}</span></dd></div>
                    <div><dt>Actas firmadas</dt><dd>{i.actas}{i.ultima_acta ? <span className="texto-ayuda"> · última {fechaHora(i.ultima_acta)}</span> : null}</dd></div>
                  </dl>
                  <div className="insp-acciones">
                    {i.activo === false ? (
                      <button type="button" className="btn btn-sm btn-outline-success" onClick={() => void guardar({ ...i, activo: true }, 'Inspector reactivado')}>Reactivar</button>
                    ) : (
                      <>
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setModal({ i })}><i className="fa-solid fa-pen" aria-hidden="true" /> Editar</button>
                        <button type="button" className={`btn btn-sm ${i.firma_activa !== false ? 'btn-outline-warning' : 'btn-outline-success'}`} onClick={() => void guardar({ ...i, firma_activa: i.firma_activa === false }, i.firma_activa !== false ? 'Firma desactivada' : 'Firma activada')}>
                          <i className="fa-solid fa-signature" aria-hidden="true" /> {i.firma_activa !== false ? 'Desactivar firma' : 'Activar firma'}
                        </button>
                        {puede(user, 'seguimientoGps') ? <Link className="btn btn-sm btn-outline-secondary" href={`/private/seguimiento-gps?inspector=${i.username}`}><i className="fa-solid fa-location-dot" aria-hidden="true" /> GPS</Link> : null}
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void guardar({ ...i, activo: false }, 'Inspector dado de baja')}>Dar de baja</button>
                      </>
                    )}
                  </div>
                </article>
              ))}
              {!lista.length ? <p className="texto-ayuda">No hay inspectores con ese filtro.</p> : null}
            </div>
          )}
        </div>
      </div>

      {modal ? (
        <ModalForm
          titulo={modal.i ? `Editar ${modal.i.nombre} ${modal.i.apellido}` : 'Nuevo inspector'}
          icono="fa-solid fa-id-badge"
          campos={campos(modal.i)}
          textoOk={modal.i ? 'Guardar cambios' : 'Crear inspector'}
          onCancel={() => setModal(null)}
          onOk={(v) => guardar(modal.i ? { ...v, uuid: modal.i.uuid, activo: modal.i.activo, firma_activa: modal.i.firma_activa } : v, modal.i ? 'Inspector actualizado' : 'Inspector creado')}
        />
      ) : null}
    </div>
  );
}
