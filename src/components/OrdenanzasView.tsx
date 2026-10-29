'use client';

import { TablaVista } from './TablaVista';
import Link from 'next/link';
import { LoaderLogo } from './LoaderLogo';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLayout } from '@/lib/layout-context';
import type { FiltrosLey, Ley, OpcionCatalogo, Paginado } from '@/lib/types';
import { useNotify } from './NotifyProvider';

const SIZE = 10;
const vacios = (): FiltrosLey => ({ articulo: '', nombre: '', categoria: '' });

function leyVacia(tipo: string): Ley {
  return {
    uuid: crypto.randomUUID(),
    nombre: '',
    articulo: '',
    descripcion: '',
    categoriaNombre: '',
    multiplicador: 1,
    infraccionTipoNombre: tipo,
  };
}

export function OrdenanzasView({ uuidProp }: { uuidProp?: string }) {
  const params = useParams();
  const router = useRouter();
  const notify = useNotify();
  const layout = useLayout();

  const tipo = (params.tipo as string) ?? 'multas';
  const uuid = uuidProp ?? (params.uuid as string | undefined);
  const esEdicion = Boolean(uuid);

  const [leyes, setLeyes] = useState<Ley[]>([]);
  const [paginado, setPaginado] = useState<Paginado<Ley> | null>(null);
  const [cargando, setCargando] = useState(!esEdicion);
  const [mostrarNueva, setMostrarNueva] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [filtros, setFiltros] = useState(vacios);
  const [aplicados, setAplicados] = useState(vacios);
  const [form, setForm] = useState<Ley>(() => leyVacia(tipo));
  const [categorias, setCategorias] = useState<OpcionCatalogo[]>([]);
  const [eliminar, setEliminar] = useState<Ley | null>(null);

  const cargar = (page: number, f: FiltrosLey) => {
    setCargando(true);
    apiClient
      .leyes(tipo, f, page, SIZE)
      .then((res) => {
        setLeyes(res.content ?? []);
        setPaginado(res);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  };

  useEffect(() => {
    apiClient.constantes().then((c) => {
      setCategorias([...(c.leyCategorias ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    });
  }, []);

  useEffect(() => {
    setFiltros(vacios());
    setAplicados(vacios());
    if (uuid) {
      apiClient.getLey(uuid).then(
        (ley) => setForm(ley),
        () => {
          notify.error('No encontrada', 'La ordenanza solicitada no existe.');
          router.push(`/private/ordenanzas/${tipo}`);
        },
      );
    } else {
      setForm(leyVacia(tipo));
      cargar(0, vacios());
    }
  }, [tipo, uuid, router, notify]);

  function guardar() {
    if (!form.nombre.trim() || !form.articulo.trim()) {
      notify.error('Datos incompletos', 'Complete el nombre de la ordenanza y el artículo.');
      return;
    }
    const dto = { ...form, infraccionTipoNombre: tipo };
    setGuardando(true);
    apiClient
      .saveLey(dto)
      .then(() => {
        setGuardando(false);
        notify.success(esEdicion ? 'Ordenanza actualizada' : 'Ordenanza creada', `${form.nombre} · ${form.articulo}`);
        setMostrarNueva(false);
        router.push(`/private/ordenanzas/${tipo}`);
        if (!esEdicion) setForm(leyVacia(tipo));
      })
      .catch(() => {
        setGuardando(false);
        notify.error('No se pudo guardar', 'Revise los datos e intente nuevamente.');
      });
  }

  if (esEdicion) {
    return (
      <div className="pagina">
        <div className="card-seccion">
          <div className="card-seccion-header">
            <h2><i className="fa-solid fa-pen-to-square" aria-hidden="true" /> Editar Ordenanza</h2>
          </div>
          <div className="card-seccion-body">
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="form-group">
                  <label htmlFor="leyNombre">Nombre / Ordenanza</label>
                  <input id="leyNombre" className="form-control" placeholder="Ej.: Ordenanza 261/2022" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </div>
              </div>
              <div className="col-12 col-md-3">
                <div className="form-group">
                  <label htmlFor="leyArticulo">Artículo</label>
                  <input id="leyArticulo" className="form-control" placeholder="Ej.: Art. 45" value={form.articulo} onChange={(e) => setForm({ ...form, articulo: e.target.value })} />
                </div>
              </div>
              <div className="col-12 col-md-3">
                <div className="form-group">
                  <label htmlFor="leyMultiplicador">Unidades</label>
                  <input id="leyMultiplicador" type="number" className="form-control" min={1} step={1} value={form.multiplicador ?? 1} onChange={(e) => setForm({ ...form, multiplicador: Number(e.target.value) })} />
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-group">
                  <label htmlFor="leyCategoria">Categoría</label>
                  <select id="leyCategoria" className="form-select" value={form.categoriaNombre ?? ''} onChange={(e) => setForm({ ...form, categoriaNombre: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {categorias.map((c) => (
                      <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-12">
                <label className="form-check">
                  <input id="leyRequiereFoto" type="checkbox" className="form-check-input" checked={Boolean(form.requiereFoto)} onChange={(e) => setForm({ ...form, requiereFoto: e.target.checked })} />
                  <span className="form-check-label">Requiere foto (si el acta tiene este artículo, la foto es obligatoria en el POS)</span>
                </label>
              </div>
              <div className="col-12">
                <div className="form-group">
                  <label htmlFor="leyDescripcion">Descripción</label>
                  <textarea id="leyDescripcion" className="form-control" rows={4} value={form.descripcion ?? ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
          <footer className="footer-acciones">
            <Link className="btn btn-outline-secondary" href={`/private/ordenanzas/${tipo}`}>
              <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Volver
            </Link>
            <button type="button" className="btn btn-success" disabled={guardando} onClick={guardar}>
              {guardando ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> : <i className="fa-solid fa-floppy-disk" aria-hidden="true" />}
              Guardar
            </button>
          </footer>
        </div>
      </div>
    );
  }

  const buscar = () => { setAplicados({ ...filtros }); cargar(0, filtros); };

  return (
    <div className="pagina">
      <div className="card-seccion">
        <button type="button" className="seccion-colapsable-header" aria-expanded={mostrarNueva} onClick={() => setMostrarNueva((v) => !v)}>
          <span>Nueva Ordenanza</span>
          <i className={`fa-solid ${mostrarNueva ? 'fa-chevron-up' : 'fa-chevron-down'}`} aria-hidden="true" />
        </button>
        {mostrarNueva ? (
          <div className="card-seccion-body">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <div className="form-group">
                  <label htmlFor="nuevaNombre">Nombre / Ordenanza</label>
                  <input id="nuevaNombre" className="form-control" placeholder="Ej.: Ordenanza 261/2022" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </div>
              </div>
              <div className="col-12 col-md-2">
                <div className="form-group">
                  <label htmlFor="nuevaArticulo">Artículo</label>
                  <input id="nuevaArticulo" className="form-control" placeholder="Ej.: Art. 45" value={form.articulo} onChange={(e) => setForm({ ...form, articulo: e.target.value })} />
                </div>
              </div>
              <div className="col-12 col-md-3">
                <div className="form-group">
                  <label htmlFor="nuevaCategoria">Categoría</label>
                  <select id="nuevaCategoria" className="form-select" value={form.categoriaNombre ?? ''} onChange={(e) => setForm({ ...form, categoriaNombre: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {categorias.map((c) => (
                      <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-12">
                <label className="form-check">
                  <input id="nuevaRequiereFoto" type="checkbox" className="form-check-input" checked={Boolean(form.requiereFoto)} onChange={(e) => setForm({ ...form, requiereFoto: e.target.checked })} />
                  <span className="form-check-label">Requiere foto (si el acta tiene este artículo, la foto es obligatoria en el POS)</span>
                </label>
              </div>
              <div className="col-12 col-md-3 d-flex align-items-end">
                <button type="button" className="btn btn-success w-100" disabled={guardando} onClick={guardar}>
                  <i className="fa-solid fa-plus" aria-hidden="true" /> Agregar
                </button>
              </div>
              <div className="col-12">
                <div className="form-group">
                  <label htmlFor="nuevaDescripcion">Descripción</label>
                  <textarea id="nuevaDescripcion" className="form-control" rows={3} value={form.descripcion ?? ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="filtros-card">
        <div className="filtros-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-3">
              <label htmlFor="fley-articulo">Artículo</label>
              <input id="fley-articulo" className="form-control" value={filtros.articulo} onChange={(e) => setFiltros({ ...filtros, articulo: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && buscar()} />
            </div>
            <div className="col-12 col-md-3">
              <label htmlFor="fley-nombre">Nombre</label>
              <input id="fley-nombre" className="form-control" value={filtros.nombre} onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && buscar()} />
            </div>
            <div className="col-12 col-md-3">
              <label htmlFor="fley-categoria">Categoría</label>
              <select id="fley-categoria" className="form-select" value={filtros.categoria} onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}>
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-3 d-flex gap-2">
              <button type="button" className="btn btn-outline-secondary flex-fill" title="Quitar filtros" onClick={() => { setFiltros(vacios()); setAplicados(vacios()); cargar(0, vacios()); }}>
                <i className="fa-solid fa-arrows-rotate" aria-hidden="true" /> Quitar filtros
              </button>
              <button type="button" className="btn btn-primary flex-fill" onClick={buscar}>
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> Buscar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card-seccion">
        <div className="card-seccion-header">
          <h2><i className="fa-solid fa-scale-balanced" aria-hidden="true" /> Listado de Ordenanzas</h2>
        </div>
        {cargando ? (
          <LoaderLogo />
        ) : layout.isMobile ? (
          <>
            {!leyes.length ? (
              <div className="sin-resultados"><i className="fa-solid fa-inbox" aria-hidden="true" /><p>No se encontraron ordenanzas.</p></div>
            ) : null}
            <div className="row g-2 p-2">
              {leyes.map((l) => (
                <div key={l.uuid} className="col-12">
                  <div className="card">
                    <div className="card-header">
                      <div className="d-flex justify-content-between align-items-center">
                        <span style={{ fontSize: '0.875rem' }}><strong>Artículo:</strong> {l.articulo}</span>
                        <div className="d-flex gap-2">
                          <Link className="btn btn-outline-primary btn-accion" href={`/private/ordenanzas/${tipo}/${l.uuid}`} title="Editar">
                            <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                          </Link>
                          <button type="button" className="btn btn-outline-danger btn-accion" title="Eliminar" onClick={() => setEliminar(l)}>
                            <i className="fa-solid fa-trash-can" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="card-body">
                      <ul className="list-unstyled mb-0" style={{ fontSize: '0.875rem' }}>
                        <li><strong>Nombre:</strong> {l.nombre}</li>
                        <li><strong>Categoría:</strong> {l.categoriaNombre}</li>
                        <li><strong>Unidades (UF):</strong> {l.multiplicador}</li>
                        {l.requiereFoto ? <li><i className="fa-solid fa-camera" aria-hidden="true" /> Requiere foto</li> : null}
                        <li>
                          <strong>Descripción:</strong>
                          <textarea className="form-control mt-1" rows={2} value={l.descripcion ?? ''} disabled readOnly />
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <TablaVista>
            <table className="table custom-table">
              <thead className="table-dark">
                <tr>
                  <th>Artículo</th><th>Nombre</th><th>Descripción</th><th>Categoría</th><th title="Unidades fijas: multa = unidades × Unidad Tributaria (Valores y tarifas)">Unidades (UF)</th><th className="th-acciones">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {leyes.map((l) => (
                  <tr key={l.uuid}>
                    <td><strong>{l.articulo}</strong></td>
                    <td>{l.nombre}</td>
                    <td>{l.descripcion}{l.requiereFoto ? <div className="texto-ayuda"><i className="fa-solid fa-camera" aria-hidden="true" /> Requiere foto</div> : null}</td>
                    <td><span className="chip-categoria">{l.categoriaNombre}</span></td>
                    <td><strong>{l.multiplicador}</strong></td>
                    <td className="td-acciones">
                      <Link className="btn btn-outline-primary btn-accion" href={`/private/ordenanzas/${tipo}/${l.uuid}`} title="Editar">
                        <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                      </Link>
                      <button type="button" className="btn btn-outline-danger btn-accion" title="Eliminar" onClick={() => setEliminar(l)}>
                        <i className="fa-solid fa-trash-can" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!leyes.length ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="sin-resultados"><i className="fa-solid fa-inbox" aria-hidden="true" /><p>No se encontraron ordenanzas.</p></div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </TablaVista>
        )}
        {paginado ? (
          <div className="paginado-footer">
            <span>Cantidad de resultados: {paginado.totalElements}</span>
            <div className="paginacion">
              <div className="paginacion-botones">
                <button type="button" className="btn btn-sm btn-outline-secondary" disabled={paginado.page === 0} onClick={() => cargar(paginado.page - 1, aplicados)}>Anterior</button>
                <button type="button" className="btn btn-sm btn-outline-secondary" disabled={paginado.page >= paginado.totalPages - 1} onClick={() => cargar(paginado.page + 1, aplicados)}>Siguiente</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {eliminar ? (
        <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && setEliminar(null)}>
          <div className="modal-fake modal-fake-sm" role="dialog" aria-modal="true" aria-label="Eliminar Ordenanza">
            <div className="modal-fake-header">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
              <h2>Eliminar Ordenanza</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setEliminar(null)}>&times;</button>
            </div>
            <div className="modal-fake-body">
              <p className="mb-0">¿Está seguro que desea eliminar {eliminar.nombre} ({eliminar.articulo})?</p>
            </div>
            <div className="modal-fake-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEliminar(null)}>Cancelar</button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  if (!eliminar.uuid) return;
                  await apiClient.deleteLey(eliminar.uuid);
                  notify.success('Ordenanza eliminada', `${eliminar.nombre} · ${eliminar.articulo}`);
                  setEliminar(null);
                  cargar(paginado?.page ?? 0, aplicados);
                }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
