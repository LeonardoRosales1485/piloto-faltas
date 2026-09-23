'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLayout } from '@/lib/layout-context';
import type { ImgModel, Infraccion, Ley, OpcionCatalogo } from '@/lib/types';
import {
  MAX_IMAGENES,
  PASOS,
  TOTAL_PASOS,
  readImageFile,
  toDateInput,
  toDateTimeLocal,
  vacia,
} from './crear-editar-utils';
import { useNotify } from './NotifyProvider';

const PERSONAS = [
  { v: 0, t: 'Persona Física' },
  { v: 1, t: 'Persona Jurídica' },
  { v: 2, t: 'Otro' },
];

function WizardNav({
  paso,
  totalPasos,
  edicionHabilitada,
  guardando,
  irAPaso,
  guardar,
}: {
  paso: number;
  totalPasos: number;
  edicionHabilitada: boolean;
  guardando: boolean;
  irAPaso: (n: number) => void;
  guardar: () => void;
}) {
  return (
    <div className="wizard-nav">
      <button type="button" className="btn btn-lg btn-secondary" disabled={paso === 1} onClick={() => irAPaso(paso - 1)}>
        Anterior
      </button>
      {paso === totalPasos ? (
        <button type="button" className="btn btn-lg btn-primary" disabled={!edicionHabilitada || guardando} onClick={guardar}>
          {guardando ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> : null}
          Guardar
        </button>
      ) : (
        <button type="button" className="btn btn-lg btn-primary" onClick={() => irAPaso(paso + 1)}>
          Siguiente
        </button>
      )}
    </div>
  );
}

export function CrearEditarInfraccion({ uuidProp }: { uuidProp?: string }) {
  const params = useParams();
  const router = useRouter();
  const notify = useNotify();
  const { setOcultarTopbar } = useLayout();

  const tipo = (params.tipo as string) ?? 'multas';
  const uuid = uuidProp ?? (params.uuid as string | undefined);

  const [cargando, setCargando] = useState(Boolean(uuid));
  const [esEdicion] = useState(Boolean(uuid));
  const [edicionHabilitada, setEdicionHabilitada] = useState(!uuid);
  const [guardando, setGuardando] = useState(false);
  const [mostrarLeyes, setMostrarLeyes] = useState(false);
  const [paso, setPaso] = useState(1);
  const [busquedaLey, setBusquedaLey] = useState('');
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [form, setForm] = useState<Infraccion>(() => vacia(tipo));
  const [leyes, setLeyes] = useState<Ley[]>([]);
  const [imagenes, setImagenes] = useState<ImgModel[]>([]);
  const [dependencias, setDependencias] = useState<OpcionCatalogo[]>([]);
  const [documentoTipos, setDocumentoTipos] = useState<OpcionCatalogo[]>([]);
  const [localidades, setLocalidades] = useState<OpcionCatalogo[]>([]);
  const [partidos, setPartidos] = useState<OpcionCatalogo[]>([]);
  const [provincias, setProvincias] = useState<OpcionCatalogo[]>([]);
  const [vehiculoTipos, setVehiculoTipos] = useState<OpcionCatalogo[]>([]);

  const patchForm = useCallback((partial: Partial<Infraccion>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const irAPaso = useCallback(
    (n: number) => {
      const next = Math.min(TOTAL_PASOS, Math.max(1, n));
      setPaso(next);
      setOcultarTopbar(next > 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setOcultarTopbar],
  );

  useEffect(() => {
    return () => setOcultarTopbar(false);
  }, [setOcultarTopbar]);

  useEffect(() => {
    setPaso(1);
    setOcultarTopbar(false);
    setBusquedaLey('');
    apiClient.constantes().then((c) => {
      setDocumentoTipos(c.documentoTipos ?? []);
      setLocalidades(c.localidades ?? []);
      setPartidos(c.partidos ?? []);
      setProvincias(c.provincias ?? []);
      setVehiculoTipos(c.vehiculoTipos ?? []);
      setDependencias(c.dependencias ?? []);
    });
    apiClient.leyes(tipo, { articulo: '', nombre: '', categoria: '' }, 0, 200).then((res) => {
      setLeyes(res.content ?? []);
    });

    if (uuid) {
      setEdicionHabilitada(false);
      setCargando(true);
      apiClient
        .getInfraccion(uuid)
        .then((inf) => {
          setForm({
            ...vacia(tipo),
            ...inf,
            legajoFecha: toDateTimeLocal(inf.legajoFecha),
            infractorFechaNacimiento: toDateInput(inf.infractorFechaNacimiento),
            dependenciasNombre: inf.dependenciasNombre ?? [],
            leyesNombre: inf.leyesNombre ?? [],
          });
          setCargando(false);
        })
        .catch(() => {
          notify.error('No encontrada', 'La infracción solicitada no existe.');
          router.push(`/private/lista-infracciones/${tipo}`);
          setCargando(false);
        });
      apiClient.imagenes(uuid).then((res) => {
        setImagenes(res.content ?? []);
        setIndiceImagen(0);
      });
    } else {
      setEdicionHabilitada(true);
      setCargando(false);
      setForm(vacia(tipo));
      setImagenes([]);
      setIndiceImagen(0);
    }
  }, [tipo, uuid, router, notify, setOcultarTopbar]);

  const leyesSeleccionadas = useMemo(
    () =>
      (form.leyesNombre ?? []).map(
        (nombre) =>
          leyes.find((l) => l.nombre === nombre) ?? {
            uuid: nombre,
            nombre,
            articulo: '',
            descripcion: '',
            categoriaNombre: '',
            multiplicador: 0,
            infraccionTipoNombre: tipo,
          },
      ),
    [form.leyesNombre, leyes, tipo],
  );

  const leyesVisibles = useMemo(() => {
    const q = busquedaLey.toLowerCase().trim();
    if (!q) return leyes;
    return leyes.filter(
      (ley) =>
        (ley.articulo ?? '').toLowerCase().includes(q) ||
        ley.nombre.toLowerCase().includes(q) ||
        (ley.descripcion ?? '').toLowerCase().includes(q),
    );
  }, [busquedaLey, leyes]);

  function dependenciaMarcada(id: number) {
    return (form.dependenciasNombre ?? []).includes(String(id));
  }

  function todasDependencias() {
    return dependencias.length > 0 && dependencias.every((d) => dependenciaMarcada(d.id));
  }

  function toggleDependencia(id: number) {
    const key = String(id);
    const actual = form.dependenciasNombre ?? [];
    patchForm({
      dependenciasNombre: actual.includes(key) ? actual.filter((v) => v !== key) : [...actual, key],
    });
  }

  function toggleTodasDependencias() {
    patchForm({
      dependenciasNombre: todasDependencias() ? [] : dependencias.map((d) => String(d.id)),
    });
  }

  function leyMarcada(ley: Ley) {
    return (form.leyesNombre ?? []).includes(ley.nombre);
  }

  function toggleLey(ley: Ley) {
    const actual = form.leyesNombre ?? [];
    patchForm({
      leyesNombre: actual.includes(ley.nombre) ? actual.filter((n) => n !== ley.nombre) : [...actual, ley.nombre],
    });
  }

  function quitarLey(nombre: string) {
    patchForm({ leyesNombre: (form.leyesNombre ?? []).filter((n) => n !== nombre) });
  }

  function srcImagen(img?: ImgModel) {
    return img?.previewRaw || img?.fullRaw || '';
  }

  function quitarImagen() {
    setImagenes((prev) => prev.filter((_, i) => i !== indiceImagen));
    setIndiceImagen(0);
  }

  async function onImagenes(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;
    const disponibles = MAX_IMAGENES - imagenes.length;
    if (files.length > disponibles) {
      notify.warning('Límite de imágenes', `Solo se pueden cargar hasta ${MAX_IMAGENES} imágenes en total.`);
    }
    const nuevos = [...imagenes];
    for (const file of Array.from(files).slice(0, Math.max(0, disponibles))) {
      const dataUrl = await readImageFile(file);
      nuevos.push({
        uuid: '',
        status: 1,
        dateCreated: Date.now(),
        infraccionUuid: form.uuid,
        previewRaw: dataUrl,
        fullRaw: dataUrl,
      });
    }
    setImagenes(nuevos);
    event.target.value = '';
  }

  async function guardar() {
    if (!form.infractorNombre?.trim() || !form.infractorDocumentoNumero?.trim()) {
      notify.error('Datos incompletos', 'Complete nombre y documento del infractor.');
      return;
    }
    if (!(form.leyesNombre ?? []).length) {
      notify.error('Datos incompletos', 'Seleccione al menos un artículo.');
      return;
    }
    setGuardando(true);
    try {
      const guardada = await apiClient.saveInfraccion(form);
      const persistidas = await apiClient.imagenes(guardada.uuid ?? '');
      const keep = new Set(imagenes.filter((img) => img.uuid).map((img) => img.uuid));
      for (const previa of persistidas.content) {
        if (previa.uuid && !keep.has(previa.uuid)) {
          await apiClient.deleteImagen(previa.uuid);
        }
      }
      for (const img of imagenes) {
        if (!img.uuid) {
          await apiClient.saveImagen({ ...img, infraccionUuid: guardada.uuid });
        }
      }
      notify.success(
        esEdicion ? 'Infracción actualizada' : 'Infracción creada',
        `Acta N.° ${guardada.legajoNumeroActa}`,
      );
      router.push(`/private/lista-infracciones/${tipo}`);
    } catch {
      notify.error('No se pudo guardar', 'Revise los datos e intente nuevamente.');
    } finally {
      setGuardando(false);
    }
  }

  function cancelar() {
    setForm(vacia(tipo));
    setImagenes([]);
    setIndiceImagen(0);
    irAPaso(1);
    notify.success('Formulario reiniciado');
  }

  const imagenActual = imagenes[Math.min(indiceImagen, Math.max(0, imagenes.length - 1))];

  if (cargando) {
    return (
      <div className="pagina pagina-steps">
        <div className="card-step">
          <div className="celda-cargando">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pagina pagina-steps">
      <nav className="wizard-pasos" aria-label="Pasos del formulario">
        {PASOS.map((p) => (
          <button
            key={p.numero}
            type="button"
            className={`wizard-paso ${p.numero === paso ? 'activo' : ''} ${p.numero < paso ? 'completado' : ''}`}
            onClick={() => irAPaso(p.numero)}
          >
            <span className="wizard-paso-num">{p.numero}</span>
            <span className="wizard-paso-label">{p.corto}</span>
          </button>
        ))}
      </nav>

      <WizardNav paso={paso} totalPasos={TOTAL_PASOS} edicionHabilitada={edicionHabilitada} guardando={guardando} irAPaso={irAPaso} guardar={guardar} />

      {paso === 1 ? (
        <article className="card-step card-step-wizard">
          <div className="card-step-header">
            <h2>1. Datos Del Expediente/Legajo</h2>
            <p>Información básica del expediente</p>
          </div>
          <div className="card-step-body">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <div className="form-group">
                  <label htmlFor="legajoNumber">Legajo</label>
                  <input id="legajoNumber" className="form-control" maxLength={10} disabled={!edicionHabilitada} value={form.legajoNumber ?? ''} onChange={(e) => patchForm({ legajoNumber: e.target.value })} />
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group">
                  <label htmlFor="legajoAnio">Año</label>
                  <input id="legajoAnio" className="form-control" maxLength={4} disabled={!edicionHabilitada} value={form.legajoAnio ?? ''} onChange={(e) => patchForm({ legajoAnio: e.target.value })} />
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group">
                  <label htmlFor="legajoCaratula">Caratula</label>
                  <input id="legajoCaratula" className="form-control" disabled={!edicionHabilitada} value={form.legajoCaratula ?? ''} onChange={(e) => patchForm({ legajoCaratula: e.target.value })} />
                </div>
              </div>
              <div className="col-12">
                <div className="checkbox-list">
                  <label className="checkbox-list-titulo">
                    <input type="checkbox" className="form-check-input form-check-input-lg" checked={todasDependencias()} disabled={!edicionHabilitada} onChange={toggleTodasDependencias} />
                    <span>Marcar todo</span>
                  </label>
                  <div className="row">
                    {dependencias.map((d) => (
                      <div key={d.id} className="col-6">
                        <label className="checkbox-list-item">
                          <input type="checkbox" className="form-check-input form-check-input-lg" checked={dependenciaMarcada(d.id)} disabled={!edicionHabilitada} onChange={() => toggleDependencia(d.id)} />
                          <span>{d.nombre}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group">
                  <label htmlFor="legajoNumeroActa">Numero de Acta *</label>
                  <input id="legajoNumeroActa" className="form-control" maxLength={10} disabled={!edicionHabilitada} value={form.legajoNumeroActa ?? ''} onChange={(e) => patchForm({ legajoNumeroActa: e.target.value })} />
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group">
                  <label htmlFor="legajoFecha">Fecha *</label>
                  <input id="legajoFecha" type="datetime-local" className="form-control" disabled={!edicionHabilitada} value={form.legajoFecha ?? ''} onChange={(e) => patchForm({ legajoFecha: e.target.value })} />
                </div>
              </div>
              <div className="col-12">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="legajoObservada" checked={form.legajoObservada === 1} disabled={!edicionHabilitada} onChange={(e) => patchForm({ legajoObservada: e.target.checked ? 1 : 0 })} />
                  <label className="form-check-label" htmlFor="legajoObservada">Observada</label>
                </div>
              </div>
            </div>
          </div>
        </article>
      ) : null}

      {paso === 2 ? (
        <article className="card-step card-step-wizard">
          <div className="card-step-header">
            <h2>2. Datos del Infractor</h2>
            <p>Información personal del infractor (opcional)</p>
          </div>
          <div className="card-step-body">
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="form-group">
                  <label htmlFor="infractorNombre">* Nombre <span className="requerido">*</span></label>
                  <input id="infractorNombre" className="form-control" required disabled={!edicionHabilitada} value={form.infractorNombre ?? ''} onChange={(e) => patchForm({ infractorNombre: e.target.value })} />
                </div>
              </div>
              <div className="col-12 col-md-6">
                <fieldset className="form-group" disabled={!edicionHabilitada}>
                  <legend>Tipo de persona</legend>
                  <div className="d-flex gap-3 flex-wrap">
                    {PERSONAS.map((op) => (
                      <div key={op.v} className="form-check">
                        <input className="form-check-input" type="radio" name="infractorPersonaTipo" id={`tipoP-${op.v}`} checked={form.infractorPersonaTipo === op.v} onChange={() => patchForm({ infractorPersonaTipo: op.v })} />
                        <label className="form-check-label" htmlFor={`tipoP-${op.v}`}>{op.t}</label>
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group">
                  <label htmlFor="infractorDocumentoTipoNombre">Tipo Documento</label>
                  <select id="infractorDocumentoTipoNombre" className="form-select" disabled={!edicionHabilitada} value={form.infractorDocumentoTipoNombre ?? ''} onChange={(e) => patchForm({ infractorDocumentoTipoNombre: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {documentoTipos.map((o) => (
                      <option key={o.nombre} value={o.nombre}>{o.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group">
                  <label htmlFor="infractorDocumentoNumero">Número Documento <span className="requerido">*</span></label>
                  <input id="infractorDocumentoNumero" className="form-control" required disabled={!edicionHabilitada} value={form.infractorDocumentoNumero ?? ''} onChange={(e) => patchForm({ infractorDocumentoNumero: e.target.value })} />
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group">
                  <label htmlFor="infractorFechaNacimiento">Fecha Nacimiento</label>
                  <input id="infractorFechaNacimiento" type="date" className="form-control" disabled={!edicionHabilitada} value={form.infractorFechaNacimiento ?? ''} onChange={(e) => patchForm({ infractorFechaNacimiento: e.target.value })} />
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-group">
                  <label htmlFor="infractorDomicilio">Domicilio</label>
                  <input id="infractorDomicilio" className="form-control" disabled={!edicionHabilitada} value={form.infractorDomicilio ?? ''} onChange={(e) => patchForm({ infractorDomicilio: e.target.value })} />
                </div>
              </div>
              <div className="col-12 col-md-3">
                <div className="form-group">
                  <label htmlFor="infractorDepartamento">Piso/Departamento</label>
                  <input id="infractorDepartamento" className="form-control" disabled={!edicionHabilitada} value={form.infractorDepartamento ?? ''} onChange={(e) => patchForm({ infractorDepartamento: e.target.value })} />
                </div>
              </div>
              <div className="col-12 col-md-3">
                <div className="form-group">
                  <label htmlFor="infractorCodigoPostal">Codigo Postal</label>
                  <input id="infractorCodigoPostal" className="form-control" maxLength={8} disabled={!edicionHabilitada} value={form.infractorCodigoPostal ?? ''} onChange={(e) => patchForm({ infractorCodigoPostal: e.target.value })} />
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group">
                  <label htmlFor="infractorProvinciaNombre">Provincia</label>
                  <select id="infractorProvinciaNombre" className="form-select" disabled={!edicionHabilitada} value={form.infractorProvinciaNombre ?? ''} onChange={(e) => patchForm({ infractorProvinciaNombre: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {provincias.map((o) => (
                      <option key={o.nombre} value={o.nombre}>{o.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group">
                  <label htmlFor="infractorLocalidadNombre">Localidad</label>
                  <select id="infractorLocalidadNombre" className="form-select" disabled={!edicionHabilitada} value={form.infractorLocalidadNombre ?? ''} onChange={(e) => patchForm({ infractorLocalidadNombre: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {localidades.map((o) => (
                      <option key={o.nombre} value={o.nombre}>{o.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group">
                  <label htmlFor="infractorPartidoNombre">Partido</label>
                  <select id="infractorPartidoNombre" className="form-select" disabled={!edicionHabilitada} value={form.infractorPartidoNombre ?? ''} onChange={(e) => patchForm({ infractorPartidoNombre: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {partidos.map((o) => (
                      <option key={o.nombre} value={o.nombre}>{o.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-12">
                <div className="form-group">
                  <label htmlFor="infractorActividadEconomica">Actividad Economica</label>
                  <input id="infractorActividadEconomica" className="form-control" disabled={!edicionHabilitada} value={form.infractorActividadEconomica ?? ''} onChange={(e) => patchForm({ infractorActividadEconomica: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        </article>
      ) : null}

      {paso === 3 ? (
        <article className="card-step card-step-wizard">
          <div className="card-step-header">
            <h2>3. Datos del Vehículo</h2>
            <p>Información del vehículo involucrado</p>
          </div>
          <div className="card-step-body">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <div className="form-group"><label htmlFor="vehiculoNumeroDominio">Numero de Dominio</label>
                  <input id="vehiculoNumeroDominio" className="form-control" disabled={!edicionHabilitada} value={form.vehiculoNumeroDominio ?? ''} onChange={(e) => patchForm({ vehiculoNumeroDominio: e.target.value })} /></div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group"><label htmlFor="vehiculoNumeroControlInterno">Numero Control Interno</label>
                  <input id="vehiculoNumeroControlInterno" className="form-control" disabled={!edicionHabilitada} value={form.vehiculoNumeroControlInterno ?? ''} onChange={(e) => patchForm({ vehiculoNumeroControlInterno: e.target.value })} /></div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group"><label htmlFor="vehiculoTipoNombre">Tipo Vehículo</label>
                  <select id="vehiculoTipoNombre" className="form-select" disabled={!edicionHabilitada} value={form.vehiculoTipoNombre ?? ''} onChange={(e) => patchForm({ vehiculoTipoNombre: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {vehiculoTipos.map((o) => (
                      <option key={o.nombre} value={o.nombre}>{o.nombre}</option>
                    ))}
                  </select></div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group"><label htmlFor="vehiculoNumeroLicencia">Numero Licencia</label>
                  <input id="vehiculoNumeroLicencia" className="form-control" disabled={!edicionHabilitada} value={form.vehiculoNumeroLicencia ?? ''} onChange={(e) => patchForm({ vehiculoNumeroLicencia: e.target.value })} /></div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group"><label htmlFor="vehiculoMunicipalidadEmisora">Municipalidad Emisora</label>
                  <input id="vehiculoMunicipalidadEmisora" className="form-control" disabled={!edicionHabilitada} value={form.vehiculoMunicipalidadEmisora ?? ''} onChange={(e) => patchForm({ vehiculoMunicipalidadEmisora: e.target.value })} /></div>
              </div>
            </div>
          </div>
        </article>
      ) : null}

      {paso === 4 ? (
        <article className="card-step card-step-wizard">
          <div className="card-step-header">
            <h2>4. Domicilio de Infracción</h2>
            <p>Lugar donde ocurrió la infracción</p>
          </div>
          <div className="card-step-body">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <div className="form-group"><label htmlFor="domicilioInfraccionCalle">Calle</label>
                  <input id="domicilioInfraccionCalle" className="form-control" disabled={!edicionHabilitada} value={form.domicilioInfraccionCalle ?? ''} onChange={(e) => patchForm({ domicilioInfraccionCalle: e.target.value })} /></div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group"><label htmlFor="domicilioInfraccionNumero">Numero</label>
                  <input id="domicilioInfraccionNumero" className="form-control" disabled={!edicionHabilitada} value={form.domicilioInfraccionNumero ?? ''} onChange={(e) => patchForm({ domicilioInfraccionNumero: e.target.value })} /></div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group"><label htmlFor="domicilioInfraccionLocalidadNombre">Localidad</label>
                  <select id="domicilioInfraccionLocalidadNombre" className="form-select" disabled={!edicionHabilitada} value={form.domicilioInfraccionLocalidadNombre ?? ''} onChange={(e) => patchForm({ domicilioInfraccionLocalidadNombre: e.target.value })}>
                    <option value="">Misma que el infractor</option>
                    {localidades.map((o) => (
                      <option key={o.nombre} value={o.nombre}>{o.nombre}</option>
                    ))}
                  </select></div>
              </div>
            </div>
          </div>
        </article>
      ) : null}

      {paso === 5 ? (
        <article className="card-step card-step-wizard">
          <div className="card-step-header">
            <h2>5. Artículos (Leyes de Ordenanza) *</h2>
            <p>Seleccione los artículos y leyes infringidos</p>
          </div>
          <div className="card-step-body">
            <button type="button" className="btn btn-primary mb-3" disabled={!edicionHabilitada} onClick={() => setMostrarLeyes(true)}>
              <i className="fa-solid fa-plus me-2" aria-hidden="true" /> Agregar Articulo
            </button>
            <div className="table-responsive">
              <table className="table custom-table align-middle tabla-articulos">
                <thead>
                  <tr>
                    <th>Ley</th><th>Artículo</th><th>Descripción</th><th>Categoría</th><th className="text-end">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {leyesSeleccionadas.map((ley) => (
                    <tr key={ley.nombre}>
                      <td>{ley.nombre}</td>
                      <td>{ley.articulo || '-'}</td>
                      <td>{ley.descripcion || '-'}</td>
                      <td>{ley.categoriaNombre || '-'}</td>
                      <td className="text-end">
                        <button type="button" className="btn btn-danger btn-sm" disabled={!edicionHabilitada} onClick={() => quitarLey(ley.nombre)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                  {!leyesSeleccionadas.length ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="sin-resultados py-3"><p className="mb-0">No hay artículos seleccionados.</p></div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </article>
      ) : null}

      {paso === 6 ? (
        <article className="card-step card-step-wizard">
          <div className="card-step-header">
            <h2>6. Imagenes y observaciones de la infracción</h2>
            <p>se pueden agregar hasta 5 imagenes.</p>
          </div>
          <div className="card-step-body">
            <div className="row g-3">
              <div className="col-12">
                {!imagenes.length ? (
                  <div className="img-carrousel-vacio">
                    <i className="fa-solid fa-image" aria-hidden="true" />
                    <p>No hay imágenes cargadas en esta infracción.</p>
                  </div>
                ) : (
                  <div className="img-carrousel">
                    <div className="img-carrousel-principal">
                      <img src={srcImagen(imagenActual)} alt={`Imagen ${indiceImagen + 1}`} />
                      <div className="img-carrousel-contador">{indiceImagen + 1} / {imagenes.length}</div>
                    </div>
                    <div className="img-carrousel-miniaturas">
                      {imagenes.map((img, idx) => (
                        <button key={idx} type="button" className={`img-carrousel-miniatura ${idx === indiceImagen ? 'activa' : ''}`} onClick={() => setIndiceImagen(idx)}>
                          <img src={srcImagen(img)} alt={`Miniatura ${idx + 1}`} />
                        </button>
                      ))}
                    </div>
                    {edicionHabilitada ? (
                      <button type="button" className="btn btn-sm btn-outline-danger mt-2" onClick={quitarImagen}>
                        <i className="fa-solid fa-trash-can" aria-hidden="true" /> Quitar imagen
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
              {edicionHabilitada && imagenes.length < MAX_IMAGENES ? (
                <div className="col-12">
                  <label className="btn btn-outline-primary btn-subir-imagen">
                    <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" /> Subir imágenes
                    <input type="file" accept="image/*" multiple hidden onChange={onImagenes} />
                  </label>
                </div>
              ) : null}
              <div className="col-12 col-md-4">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="retencionDeLicencia" checked={form.retencionDeLicencia === 1} disabled={!edicionHabilitada} onChange={(e) => patchForm({ retencionDeLicencia: e.target.checked ? 1 : 0 })} />
                  <label className="form-check-label" htmlFor="retencionDeLicencia">Retención de licencia</label>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="retencionDeVehiculo" checked={form.retencionDeVehiculo === 1} disabled={!edicionHabilitada} onChange={(e) => patchForm({ retencionDeVehiculo: e.target.checked ? 1 : 0 })} />
                  <label className="form-check-label" htmlFor="retencionDeVehiculo">Retención de vehículo</label>
                </div>
              </div>
              <div className="col-12">
                <div className="form-group">
                  <label htmlFor="observaciones">Observaciones</label>
                  <textarea id="observaciones" className="form-control" rows={3} disabled={!edicionHabilitada} value={form.observaciones ?? ''} onChange={(e) => patchForm({ observaciones: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        </article>
      ) : null}

      <WizardNav paso={paso} totalPasos={TOTAL_PASOS} edicionHabilitada={edicionHabilitada} guardando={guardando} irAPaso={irAPaso} guardar={guardar} />
      {esEdicion && !edicionHabilitada ? (
        <button type="button" className="btn btn-warning" onClick={() => setEdicionHabilitada(true)}>Editar</button>
      ) : null}
      {edicionHabilitada && esEdicion ? (
        <button type="button" className="btn btn-outline-secondary" onClick={cancelar}>Cancelar</button>
      ) : null}

      {mostrarLeyes ? (
        <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && setMostrarLeyes(false)}>
          <div className="modal-fake modal-fake-xl" role="dialog" aria-modal="true" aria-label="Seleccionar artículos">
            <div className="modal-fake-header">
              <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
              <h2>Seleccionar artículos</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setMostrarLeyes(false)}>&times;</button>
            </div>
            <div className="modal-fake-body">
              <div className="form-group mb-3">
                <label htmlFor="busquedaLey"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> Buscar por artículo / nombre / descripción</label>
                <input id="busquedaLey" className="form-control" placeholder="Ej.: Art. 45" value={busquedaLey} onChange={(e) => setBusquedaLey(e.target.value)} />
              </div>
              <div className="row g-3">
                {leyesVisibles.map((ley) => (
                  <div key={ley.uuid} className="col-12 col-md-6">
                    <button type="button" className={`card-ley ${leyMarcada(ley) ? 'card-ley-seleccionada' : ''}`} disabled={!edicionHabilitada} onClick={() => toggleLey(ley)}>
                      <div className="card-ley-articulo">{ley.nombre} · {ley.articulo}</div>
                      <div className="card-ley-descripcion">{ley.descripcion}</div>
                      <div className="card-ley-footer">
                        <span>{ley.categoriaNombre}</span>
                        <span className="card-ley-multiplicador">Unidades: <strong>{ley.multiplicador}</strong></span>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-fake-footer">
              <span>Seleccionados: <strong>{form.leyesNombre?.length ?? 0}</strong></span>
              <button type="button" className="btn btn-outline-danger" onClick={() => patchForm({ leyesNombre: [] })}>Limpiar selección</button>
              <button type="button" className="btn btn-success" onClick={() => setMostrarLeyes(false)}>Listo</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
