'use client';

import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { CATEGORIAS_MEMBRETE_EXTRA, type Membrete } from '@/lib/membrete';
import { CATEGORIAS_PLANTILLA } from '@/lib/plantillas';
import { useNotify } from './NotifyProvider';

type Form = { id?: number; nombre: string; categorias: string[]; imagenRaw: string | null; titulo: string; subtitulo: string; activo: boolean };
const VACIO: Form = { nombre: '', categorias: [], imagenRaw: null, titulo: 'MUNICIPALIDAD DE MALVINAS ARGENTINAS', subtitulo: 'DIRECCIÓN DE FALTAS', activo: true };
const CATEGORIAS = [...CATEGORIAS_PLANTILLA, ...CATEGORIAS_MEMBRETE_EXTRA];
const LOGO = '/images/Municipio_malvinas_argentinas_logo.png';

function leerImagen(f: File): Promise<string> {
  return new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => mal(new Error('No se pudo leer la imagen')); r.readAsDataURL(f); });
}

/**
 * Configuración › Membretes (reunión 27/10): encabezado (logo, título y subtítulo) por tipo de documento. El que no
 * tiene tipos es el de por defecto. Sin membretes cargados se usa el del municipio.
 */
export function AdminMembretes() {
  const notify = useNotify();
  const [lista, setLista] = useState<Membrete[]>([]);
  const [f, setF] = useState<Form | null>(null);
  const cargar = useCallback(() => { http.get<Membrete[]>('/api/membretes').then(setLista).catch(() => setLista([])); }, []);
  useEffect(cargar, [cargar]);

  const usadas = (exceptoId?: number) => new Set(lista.filter((m) => m.id !== exceptoId && Number(m.activo) === 1).flatMap((m) => String(m.categorias || '').split(',').filter(Boolean)));

  async function guardar() {
    if (!f) return;
    try {
      await http.post('/api/membretes', f);
      notify.success('Membrete guardado', 'Se usa en las impresiones que se generen desde ahora.');
      setF(null);
      cargar();
    } catch (e) { notify.error('No se pudo guardar', (e as Error).message); }
  }
  async function borrar(m: Membrete) {
    try { await http.del(`/api/membretes?id=${m.id}`); cargar(); } catch (e) { notify.error('No se pudo borrar', (e as Error).message); }
  }

  return (
    <div className="pagina">
      <article className="card-step mb-3">
        <div className="card-step-header d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h2>Membretes</h2>
            <p>Encabezado de las impresiones según el tipo de documento (fallos, resoluciones, notas, legajo, Apremios…). El membrete sin tipos es el de por defecto.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setF({ ...VACIO })}><i className="fa-solid fa-plus" aria-hidden="true" /> Nuevo membrete</button>
        </div>
        <div className="card-step-body">
          {!lista.length ? <p className="texto-ayuda">No hay membretes cargados: se usa el del municipio («MUNICIPALIDAD DE MALVINAS ARGENTINAS · DIRECCIÓN DE FALTAS»).</p> : null}
          <div className="lista-membretes">
            {lista.map((m) => (
              <div key={m.id} className={`membrete-item ${Number(m.activo) === 1 ? '' : 'inactivo'}`}>
                <div className="membrete-preview"><img src={m.imagen_raw || LOGO} alt="" /><strong>{m.titulo}</strong><span>{m.subtitulo}</span></div>
                <div className="membrete-datos">
                  <strong>{m.nombre}</strong>{Number(m.activo) === 1 ? null : <span className="badge bg-secondary ms-2">Inactivo</span>}
                  <div className="texto-ayuda">{m.categorias ? m.categorias.split(',').join(' · ') : 'Por defecto (todos los demás documentos)'}</div>
                </div>
                <div className="d-flex gap-1">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setF({ id: m.id, nombre: m.nombre, categorias: String(m.categorias || '').split(',').filter(Boolean), imagenRaw: m.imagen_raw, titulo: m.titulo, subtitulo: m.subtitulo, activo: Number(m.activo) === 1 })}>Editar</button>
                  <button type="button" className="btn btn-sm btn-outline-danger" aria-label={`Borrar ${m.nombre}`} onClick={() => void borrar(m)}><i className="fa-solid fa-trash" aria-hidden="true" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>

      {f ? (
        <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && setF(null)}>
          <div className="modal-fake modal-fake-xl" role="dialog" aria-modal="true" aria-label="Membrete">
            <div className="modal-fake-header"><i className="fa-solid fa-heading" aria-hidden="true" /><h2>{f.id ? 'Editar membrete' : 'Nuevo membrete'}</h2><button type="button" aria-label="Cerrar" onClick={() => setF(null)}>&times;</button></div>
            <div className="modal-fake-body">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label-v2" htmlFor="mb-nombre">Nombre <span className="requerido">*</span></label>
                  <input id="mb-nombre" className="form-control" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej.: Fallos y resoluciones" />
                  <label className="form-label-v2 mt-3" htmlFor="mb-titulo">Título</label>
                  <input id="mb-titulo" className="form-control" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
                  <label className="form-label-v2 mt-3" htmlFor="mb-sub">Subtítulo (repartición)</label>
                  <input id="mb-sub" className="form-control" value={f.subtitulo} onChange={(e) => setF({ ...f, subtitulo: e.target.value })} />
                  <label className="form-label-v2 mt-3" htmlFor="mb-logo">Logo (PNG, JPG o SVG)</label>
                  <div className="d-flex gap-2 align-items-center">
                    <input id="mb-logo" type="file" className="form-control" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={async (e) => { const x = e.target.files?.[0]; if (x) setF({ ...f, imagenRaw: await leerImagen(x) }); }} />
                    {f.imagenRaw ? <button type="button" className="btn btn-sm btn-outline-secondary text-nowrap" onClick={() => setF({ ...f, imagenRaw: null })}>Usar logo del municipio</button> : null}
                  </div>
                  <label className="form-check mt-3"><input type="checkbox" className="form-check-input" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> <span className="form-check-label">Activo</span></label>
                </div>
                <div className="col-12 col-md-6">
                  <span className="form-label-v2">Tipos de documento</span>
                  <p className="texto-ayuda mb-1">Sin tipos marcados, es el membrete por defecto.</p>
                  <div className="multi-opciones" role="group" aria-label="Tipos de documento">
                    {CATEGORIAS.map((c) => {
                      const on = f.categorias.includes(c);
                      const ocupado = !on && usadas(f.id).has(c);
                      return (
                        <label key={c} className={`multi-opcion ${on ? 'activa' : ''}`} title={ocupado ? 'Ya lo usa otro membrete activo: se aplica el primero.' : undefined}>
                          <input type="checkbox" checked={on} onChange={() => setF({ ...f, categorias: on ? f.categorias.filter((x) => x !== c) : [...f.categorias, c] })} /> {c}{ocupado ? ' *' : ''}
                        </label>
                      );
                    })}
                  </div>
                  <span className="form-label-v2 mt-3 d-block">Vista previa</span>
                  <div className="membrete-preview grande"><img src={f.imagenRaw || LOGO} alt="" /><strong>{f.titulo}</strong><span>{f.subtitulo}</span></div>
                </div>
              </div>
            </div>
            <div className="modal-fake-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setF(null)}>Cancelar</button>
              <button type="button" className="btn btn-primary" disabled={!f.nombre.trim()} onClick={() => void guardar()}>Guardar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
