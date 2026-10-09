'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { http } from '@/lib/api-client';
import { useCarga } from '@/lib/use-carga';
import { LoaderLogo } from './LoaderLogo';
import { ModalForm, type CampoModal } from './ModalForm';
import { useNotify } from './NotifyProvider';

type Modelo = { id: number; nombre: string; tipo_vehiculo: string | null; activa: boolean };
type Marca = { id: number; nombre: string; activa: boolean; modelos: Modelo[] };
const TIPOS = ['', 'Automóvil', 'Camioneta', 'Motocicleta', 'Camión', 'Colectivo'];

/** Marcas y modelos de vehículos que se eligen en el labrado (solo administrador). */
export function AdminMarcasModelos() {
  const notify = useNotify();
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [cargando, seguir] = useCarga();
  const [sel, setSel] = useState<number | null>(null);
  const [texto, setTexto] = useState('');
  const [verBajas, setVerBajas] = useState(false);
  const [modal, setModal] = useState<{ tipo: 'marca' | 'modelo'; m?: Marca | Modelo } | null>(null);

  const cargar = useCallback(() => { void seguir(http.get<Marca[]>('/api/vehiculos?todas=1').then((r) => { setMarcas(r); setSel((s) => s ?? r[0]?.id ?? null); })); }, [seguir]);
  useEffect(cargar, [cargar]);

  const guardar = (b: Record<string, unknown>, ok: string) =>
    http.post('/api/vehiculos', b).then(() => { notify.success(ok); setModal(null); cargar(); }).catch((e: Error) => notify.error('No se pudo guardar', e.message));

  const visibles = useMemo(() => {
    const t = texto.toLowerCase().trim();
    return marcas.filter((m) => (verBajas || m.activa) && (!t || m.nombre.toLowerCase().includes(t) || m.modelos.some((x) => x.nombre.toLowerCase().includes(t))));
  }, [marcas, texto, verBajas]);
  const marca = marcas.find((m) => m.id === sel) ?? null;
  const modelos = (marca?.modelos ?? []).filter((x) => verBajas || x.activa);

  const campos: CampoModal[] = modal?.tipo === 'marca'
    ? [{ k: 'nombre', t: 'Marca', tipo: 'texto', req: true, valor: (modal.m as Marca | undefined)?.nombre ?? '' }]
    : [
        { k: 'nombre', t: 'Modelo', tipo: 'texto', req: true, valor: (modal?.m as Modelo | undefined)?.nombre ?? '' },
        { k: 'tipo_vehiculo', t: 'Tipo de vehículo', tipo: 'select', opciones: TIPOS.map((t) => ({ v: t, t: t || 'Cualquiera' })), valor: (modal?.m as Modelo | undefined)?.tipo_vehiculo ?? '', ayuda: 'Si se indica, el modelo solo se ofrece para ese tipo de vehículo en el labrado.' },
      ];

  return (
    <div className="pagina">
      <div className="card-step mb-3"><div className="card-step-body">
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-6"><label className="form-label-v2" htmlFor="mm-t">Buscar</label><input id="mm-t" className="form-control" placeholder="Marca o modelo" value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
          <div className="col-6 col-md-2"><label className="form-check mb-2"><input type="checkbox" className="form-check-input" checked={verBajas} onChange={(e) => setVerBajas(e.target.checked)} /> Ver bajas</label></div>
          <div className="col-6 col-md-4"><button type="button" className="btn btn-primary w-100" onClick={() => setModal({ tipo: 'marca' })}><i className="fa-solid fa-plus" aria-hidden="true" /> Nueva marca</button></div>
        </div>
      </div></div>
      {cargando && !marcas.length ? <div className="card-step"><LoaderLogo tam={56} /></div> : (
        <div className="mm-grid">
          <div className="card-step"><div className="card-step-header"><h2>Marcas</h2><p>{visibles.length} marca(s)</p></div>
            <ul className="mm-lista">
              {visibles.map((m) => (
                <li key={m.id}><button type="button" className={`${m.id === sel ? 'activo' : ''} ${m.activa ? '' : 'baja'}`} onClick={() => setSel(m.id)}>
                  <span>{m.nombre}</span><small>{m.modelos.filter((x) => x.activa).length} modelos{m.activa ? '' : ' · baja'}</small>
                </button></li>
              ))}
            </ul>
          </div>
          <div className="card-step">
            <div className="card-step-header d-flex justify-content-between align-items-start gap-2 flex-wrap">
              <div><h2>{marca ? marca.nombre : 'Elija una marca'}</h2><p>Modelos que se ofrecen en el labrado</p></div>
              {marca ? (
                <div className="d-flex gap-2 flex-wrap">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setModal({ tipo: 'marca', m: marca })}><i className="fa-solid fa-pen" aria-hidden="true" /> Renombrar</button>
                  <button type="button" className={`btn btn-sm ${marca.activa ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => void guardar({ accion: 'marca', id: marca.id, activa: !marca.activa }, marca.activa ? 'Marca dada de baja' : 'Marca reactivada')}>{marca.activa ? 'Dar de baja' : 'Reactivar'}</button>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setModal({ tipo: 'modelo' })}><i className="fa-solid fa-plus" aria-hidden="true" /> Nuevo modelo</button>
                </div>
              ) : null}
            </div>
            <div className="card-step-body">
              {marca ? (
                <ul className="lista-items">
                  {modelos.map((x) => (
                    <li key={x.id} className={x.activa ? '' : 'text-muted'}>
                      <div><div className="li-titulo">{x.nombre}</div><div className="li-sub">{x.tipo_vehiculo ?? 'Cualquier tipo'}{x.activa ? '' : ' · baja'}</div></div>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setModal({ tipo: 'modelo', m: x })}>Editar</button>
                        <button type="button" className={`btn btn-sm ${x.activa ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => void guardar({ accion: 'modelo', id: x.id, activa: !x.activa }, x.activa ? 'Modelo dado de baja' : 'Modelo reactivado')}>{x.activa ? 'Baja' : 'Reactivar'}</button>
                      </div>
                    </li>
                  ))}
                  {!modelos.length ? <li><span className="texto-ayuda">Esta marca no tiene modelos.</span></li> : null}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      )}
      {modal ? (
        <ModalForm
          titulo={modal.tipo === 'marca' ? (modal.m ? 'Renombrar marca' : 'Nueva marca') : modal.m ? 'Editar modelo' : `Nuevo modelo de ${marca?.nombre ?? ''}`}
          icono="fa-solid fa-car"
          campos={campos}
          onCancel={() => setModal(null)}
          onOk={(v) => guardar(modal.tipo === 'marca' ? { accion: 'marca', id: modal.m?.id, nombre: v.nombre } : { accion: 'modelo', id: modal.m?.id, marca_id: marca?.id, nombre: v.nombre, tipo_vehiculo: v.tipo_vehiculo }, 'Guardado')}
        />
      ) : null}
    </div>
  );
}
