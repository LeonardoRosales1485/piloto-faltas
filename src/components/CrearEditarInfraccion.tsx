'use client';
import Link from 'next/link';
import { LoaderLogo } from './LoaderLogo';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient, http } from '@/lib/api-client';
import { useLayout } from '@/lib/layout-context';
import { printActa, printTicket } from '@/lib/print';
import { puede, SITUACIONES, TIPOS_ACTA, claveLey, fechaHora, tipoActa } from '@/lib/dominio';
import type { ImgModel, Infraccion, Ley, OpcionCatalogo } from '@/lib/types';
import { MAX_IMAGENES, ejidoPorGps, pasosPara, readImageFile, toDateTimeLocal, vacia } from './crear-editar-utils';
import { useNotify } from './NotifyProvider';
import { SignaturePad } from './SignaturePad';
import { BarraSuperior } from './BarraSuperior';
import { BuscadorOpciones } from './BuscadorOpciones';

const NO_DESCRIBE = 'No se describe';
import { useAuthUser } from '@/lib/use-auth-user';

const ALCOHOLEMIA = [
  { v: '', t: 'No realizada' },
  { v: 'negativa', t: 'Negativa' },
  { v: 'positiva', t: 'Positiva' },
];

function Campo({ id, label, children, req }: { id: string; label: string; children: React.ReactNode; req?: boolean }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>
        {label} {req ? <span className="requerido">*</span> : null}
      </label>
      {children}
    </div>
  );
}

export function CrearEditarInfraccion({ uuidProp }: { uuidProp?: string }) {
  const params = useParams();
  const router = useRouter();
  const notify = useNotify();
  const user = useAuthUser();
  const { setOcultarTopbar } = useLayout();
  const tipo = tipoActa((params.tipo as string) ?? 'multas');
  const info = TIPOS_ACTA[tipo];
  const uuid = uuidProp ?? (params.uuid as string | undefined);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarLeyes, setMostrarLeyes] = useState(false);
  const [descartar, setDescartar] = useState(false);
  const [motivoDescarte, setMotivoDescarte] = useState('');
  const [idx, setIdx] = useState(0);
  const [busquedaLey, setBusquedaLey] = useState('');
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [form, setForm] = useState<Infraccion>(() => vacia(tipo));
  const [leyes, setLeyes] = useState<Ley[]>([]);
  const [imagenes, setImagenes] = useState<ImgModel[]>([]);
  const [pasosAbiertos, setPasosAbiertos] = useState(false);
  const [firma, setFirma] = useState<string | null>(null);
  const [gpsEstado, setGpsEstado] = useState<'' | 'buscando' | 'ok' | 'error'>('');
  const [cat, setCat] = useState<Record<string, OpcionCatalogo[]>>({});
  const iniciado = useRef(false);

  const soloLectura = form.estadoFaltas !== undefined && form.estadoFaltas !== 'Borrador';
  const habilitado = !soloLectura && !guardando;
  const pasos = useMemo(() => pasosPara(tipo, form.situacionInfractor), [tipo, form.situacionInfractor]);
  const paso = pasos[Math.min(idx, pasos.length - 1)];

  const patch = useCallback((partial: Partial<Infraccion>) => setForm((prev) => ({ ...prev, ...partial })), []);
  // Marcas y modelos administrables (Configuración → Marcas y modelos).
  const [marcas, setMarcas] = useState<{ nombre: string; modelos: { nombre: string; tipo_vehiculo: string | null }[] }[]>([]);
  useEffect(() => { http.get<typeof marcas>('/api/vehiculos').then(setMarcas).catch(() => setMarcas([])); }, []);
  const opcMarcas = useMemo(() => [...marcas.map((m) => ({ v: m.nombre, t: m.nombre, sub: `${m.modelos.length} modelos` })), { v: NO_DESCRIBE, t: NO_DESCRIBE, sub: 'Marca y modelo no identificables' }], [marcas]);
  const opcModelos = useMemo(() => {
    const m = marcas.find((x) => x.nombre === form.metadata?.marca);
    const lista = (m?.modelos ?? []).filter((x) => !x.tipo_vehiculo || !form.vehiculoTipoNombre || x.tipo_vehiculo === form.vehiculoTipoNombre);
    return [...lista.map((x) => ({ v: x.nombre, t: x.nombre, sub: x.tipo_vehiculo ?? undefined })), { v: NO_DESCRIBE, t: NO_DESCRIBE }];
  }, [marcas, form.metadata?.marca, form.vehiculoTipoNombre]);
  const patchMeta = (k: string, v: string) => setForm((prev) => ({ ...prev, metadata: { ...(prev.metadata ?? {}), [k]: v } }));

  useEffect(() => () => setOcultarTopbar(false), [setOcultarTopbar]);

  useEffect(() => {
    apiClient.constantes().then((c) => {
      const extra = c as unknown as Record<string, OpcionCatalogo[]>;
      setCat({
        documento: c.documentoTipos ?? [],
        localidad: c.localidades ?? [],
        partido: c.partidos ?? [],
        provincia: c.provincias ?? [],
        vehiculo: c.vehiculoTipos ?? [],
        dependencia: c.dependencias ?? [],
        medida: extra.medidasContravencion ?? [],
      });
    });
    apiClient.leyes(tipo, { articulo: '', nombre: '', categoria: '' }, 0, 300).then((res) => setLeyes(res.content ?? []));
  }, [tipo]);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    setCargando(true);
    const carga = uuid ? apiClient.getInfraccion(uuid) : apiClient.iniciarActa(tipo);
    carga
      .then((inf) => {
        setForm({ ...vacia(tipo), ...inf, legajoFecha: toDateTimeLocal(inf.legajoFecha) });
        setFirma(inf.firmaInfractor ?? null);
        if (uuid) apiClient.imagenes(uuid).then((r) => setImagenes(r.content ?? []));
        if (!uuid && inf.uuid) window.history.replaceState(null, '', `/private/crear-editar/${tipo}/${inf.uuid}`);
      })
      .catch((e: Error) => {
        notify.error('No se pudo abrir el acta', e.message);
        router.push(`/private/lista-infracciones/${tipo}`);
      })
      .finally(() => setCargando(false));
  }, [uuid, tipo, notify, router]);

  const leyesSeleccionadas = useMemo(
    () => (form.leyesNombre ?? []).map((n) => leyes.find((l) => claveLey(l) === n) ?? leyes.find((l) => l.nombre === n) ?? ({ uuid: n, nombre: n, articulo: '', multiplicador: 0 } as Ley)),
    [form.leyesNombre, leyes],
  );
  const unidades = leyesSeleccionadas.reduce((a, l) => a + Number(l.multiplicador ?? 0), 0);

  const leyesVisibles = useMemo(() => {
    const q = busquedaLey.toLowerCase().trim();
    if (!q) return leyes;
    return leyes.filter((l) => `${l.articulo} ${l.nombre} ${l.descripcion ?? ''}`.toLowerCase().includes(q));
  }, [busquedaLey, leyes]);

  function toggleLista(campo: 'dependenciasNombre' | 'leyesNombre' | 'medidasPreventivas', valor: string) {
    const actual = (form[campo] as string[] | undefined) ?? [];
    patch({ [campo]: actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor] } as Partial<Infraccion>);
  }

  function usarGps() {
    if (!navigator.geolocation) {
      setGpsEstado('error');
      return;
    }
    setGpsEstado('buscando');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = Number(p.coords.latitude.toFixed(6));
        const lng = Number(p.coords.longitude.toFixed(6));
        patch({ gpsLat: lat, gpsLng: lng, ejido: ejidoPorGps(lat, lng) });
        setGpsEstado('ok');
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`)
          .then((r) => r.json())
          .then((j) => {
            const a = j?.address ?? {};
            setForm((prev) => ({
              ...prev,
              domicilioInfraccionCalle: prev.domicilioInfraccionCalle || a.road || '',
              domicilioInfraccionNumero: prev.domicilioInfraccionNumero || a.house_number || '',
              domicilioInfraccionLocalidadNombre: prev.domicilioInfraccionLocalidadNombre || a.suburb || a.town || a.city || '',
            }));
          })
          .catch(() => undefined);
      },
      () => setGpsEstado('error'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function guardarBorrador(silencioso = true): Promise<Infraccion | null> {
    if (soloLectura) return form;
    try {
      const g = await apiClient.saveInfraccion(form);
      const persistidas = await apiClient.imagenes(g.uuid ?? '');
      const keep = new Set(imagenes.filter((i) => i.uuid).map((i) => i.uuid));
      for (const p of persistidas.content) if (p.uuid && !keep.has(p.uuid)) await apiClient.deleteImagen(p.uuid);
      const nuevas: ImgModel[] = [];
      for (const img of imagenes) nuevas.push(img.uuid ? img : await apiClient.saveImagen({ ...img, infraccionUuid: g.uuid }));
      setImagenes(nuevas);
      if (!silencioso) notify.success('Borrador guardado', `Acta ${g.legajoNumeroActa}`);
      return g;
    } catch (e) {
      notify.error('No se pudo guardar', (e as Error).message);
      return null;
    }
  }

  async function irA(n: number) {
    const next = Math.min(pasos.length - 1, Math.max(0, n));
    if (!soloLectura && next !== idx) void guardarBorrador();
    setIdx(next);
    // La barra «Acta de tránsito» queda visible en todos los pasos (lleva el estado del borrador).
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function firmarYConfirmar() {
    if (form.situacionInfractor === 'presente' && !firma) {
      notify.error('Falta la firma', 'El infractor presente debe firmar el acta. Si se niega, cambie la situación en el paso 1.');
      return;
    }
    setGuardando(true);
    try {
      const g = await guardarBorrador();
      if (!g) return;
      await apiClient.firmarActa(g.uuid!, form.situacionInfractor === 'presente' ? firma : null);
      const final = await apiClient.getInfraccion(g.uuid!);
      setForm({ ...final, legajoFecha: toDateTimeLocal(final.legajoFecha) });
      notify.success('Acta firmada', `${final.legajoNumeroActa} ingresó como causa. Ya puede imprimir el ticket.`);
    } catch (e) {
      notify.error('No se pudo firmar', (e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarDescarte() {
    if (!motivoDescarte.trim()) return;
    try {
      await apiClient.anularActa(form.uuid!, motivoDescarte);
      notify.success('Borrador descartado', `El número ${form.legajoNumeroActa} quedó anulado.`);
      router.push(`/private/lista-infracciones/${tipo}`);
    } catch (e) {
      notify.error('No se pudo descartar', (e as Error).message);
    }
  }

  async function onImagenes(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;
    const disponibles = MAX_IMAGENES - imagenes.length;
    if (files.length > disponibles) notify.warning('Límite de imágenes', `Solo se pueden cargar hasta ${MAX_IMAGENES} imágenes.`);
    const nuevas = [...imagenes];
    for (const file of Array.from(files).slice(0, Math.max(0, disponibles))) {
      const dataUrl = await readImageFile(file);
      nuevas.push({ uuid: '', status: 1, dateCreated: Date.now(), infraccionUuid: form.uuid, previewRaw: dataUrl, fullRaw: dataUrl });
    }
    setImagenes(nuevas);
    event.target.value = '';
  }

  if (cargando) {
    return (
      <LoaderLogo texto={uuid ? 'Cargando acta…' : 'Reservando número de acta…'} pantalla />
    );
  }

  const imagenActual = imagenes[Math.min(indiceImagen, Math.max(0, imagenes.length - 1))];
  const esJuridica = form.infractorPersonaTipo === 1;
  const sel = (lista: OpcionCatalogo[] | undefined, value: string | undefined, onChange: (v: string) => void, id: string, vacioTxt = 'Seleccionar...') => (
    <select id={id} className="form-select" disabled={!habilitado} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{vacioTxt}</option>
      {(lista ?? []).map((o) => (
        <option key={o.nombre} value={o.nombre}>
          {o.nombre}
        </option>
      ))}
    </select>
  );
  const inp = (id: keyof Infraccion, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={String(id)} className="form-control" disabled={!habilitado} value={(form[id] as string | undefined) ?? ''} onChange={(e) => patch({ [id]: e.target.value } as Partial<Infraccion>)} {...props} />
  );

  // ---------------------------------------------------------------- acta firmada
  if (soloLectura) {
    return (
      <div className="pagina pagina-steps">
        <article className="card-step">
          <div className="card-step-header">
            <h2>
              {info.titulo} {form.legajoNumeroActa}
            </h2>
            <p>
              Legajo {form.legajoNumber}/{form.legajoAnio} · {form.estadoFaltas === 'Anulada' ? `Número anulado: ${form.anuladaMotivo ?? ''}` : `Firmada el ${fechaHora(form.firmadaAt ?? undefined)} por ${form.inspectorNombre ?? '-'}`}
            </p>
          </div>
          <div className="card-step-body">
            {form.estadoFaltas === 'Anulada' ? (
              <div className="aviso aviso-alerta">Este número fue anulado y no puede reutilizarse.</div>
            ) : (
              <>
                <div className="aviso aviso-ok">
                  <i className="fa-solid fa-lock" aria-hidden="true" /> El acta está firmada y no se puede modificar. Las correcciones se registran desde la causa como subsanación.
                </div>
                <div className="botonera">
                  <button type="button" className="btn btn-primary btn-lg" onClick={() => void printTicket(form)}>
                    <i className="fa-solid fa-print" aria-hidden="true" /> Imprimir ticket
                  </button>
                  <button type="button" className="btn btn-outline-primary btn-lg" onClick={() => printActa(form, { imagenes: imagenes.map((x) => x.previewRaw ?? "").filter(Boolean) })}>
                    <i className="fa-solid fa-file-pdf" aria-hidden="true" /> Ver acta (PDF)
                  </button>
                  <Link className="btn btn-outline-secondary btn-lg" href={`/private/crear-editar/${tipo}`} onClick={() => (iniciado.current = false)}>
                    <i className="fa-solid fa-plus" aria-hidden="true" /> Labrar otra acta
                  </Link>
                  {puede(user?.rol, 'verCausas') ? (
                    <Link className="btn btn-outline-secondary btn-lg" href={`/private/causa/${form.uuid}`}>
                      <i className="fa-solid fa-folder-open" aria-hidden="true" /> Ver causa
                    </Link>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </article>
      </div>
    );
  }

  // ---------------------------------------------------------------- wizard
  const nav = (
    <div className="wizard-nav">
      <button type="button" className="btn btn-lg btn-secondary" disabled={idx === 0} onClick={() => void irA(idx - 1)}>
        Anterior
      </button>
      {paso.id === 'firma' ? (
        <button type="button" className="btn btn-lg btn-success" disabled={guardando} onClick={() => void firmarYConfirmar()}>
          {guardando ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> : <i className="fa-solid fa-signature" aria-hidden="true" />} Firmar y confirmar
        </button>
      ) : (
        <button type="button" className="btn btn-lg btn-primary" onClick={() => void irA(idx + 1)}>
          Siguiente
        </button>
      )}
    </div>
  );

  return (
    <div className="pagina pagina-steps">
      <BarraSuperior><span className="acta-borrador-chip">Borrador sin firmar</span></BarraSuperior>
      <div className="acta-encabezado-numero">
        <span className="acta-numero-chip">
          <i className="fa-solid fa-hashtag" aria-hidden="true" /> {form.legajoNumeroActa}
        </span>
        <span>Legajo {form.legajoNumber}/{form.legajoAnio}</span>
      </div>

      {/* Móvil: barra compacta con el paso actual; al tocarla se despliegan todos los pasos. */}
      <div className="wizard-movil">
        <button type="button" className="wizard-movil-barra" aria-expanded={pasosAbiertos} aria-controls="wizard-movil-lista" onClick={() => setPasosAbiertos((v) => !v)}>
          <span className="wizard-movil-num">{idx + 1}/{pasos.length}</span>
          <span className="wizard-movil-titulo">{paso.corto}</span>
          <i className={`fa-solid fa-chevron-down wizard-movil-chev ${pasosAbiertos ? 'abierto' : ''}`} aria-hidden="true" />
          <span className="wizard-movil-progreso" aria-hidden="true"><span style={{ width: `${((idx + 1) / pasos.length) * 100}%` }} /></span>
        </button>
        {pasosAbiertos ? (
          <ol id="wizard-movil-lista" className="wizard-movil-lista">
            {pasos.map((p, i) => (
              <li key={p.id}>
                <button type="button" className={`${i === idx ? 'activo' : ''} ${i < idx ? 'completado' : ''}`} onClick={() => { setPasosAbiertos(false); void irA(i); }}>
                  <span className="n">{i < idx ? <i className="fa-solid fa-check" aria-hidden="true" /> : i + 1}</span>
                  <span>{p.titulo}</span>
                  {i === idx ? <span className="actual">Actual</span> : null}
                </button>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      <nav className="wizard-pasos" aria-label="Pasos del formulario">
        {pasos.map((p, i) => (
          <button key={p.id} type="button" className={`wizard-paso ${i === idx ? 'activo' : ''} ${i < idx ? 'completado' : ''}`} onClick={() => void irA(i)}>
            <span className="wizard-paso-num">{i + 1}</span>
            <span className="wizard-paso-label">{p.corto}</span>
          </button>
        ))}
      </nav>

      {nav}

      <article className="card-step card-step-wizard">
        <div className="card-step-header">
          <h2>
            {idx + 1}. {paso.titulo}
          </h2>
          <p>{paso.ayuda}</p>
        </div>
        <div className="card-step-body">
          {paso.id === 'acta' ? (
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <Campo id="nroActa" label="Número de acta">
                  <input id="nroActa" className="form-control" disabled value={form.legajoNumeroActa ?? ''} />
                </Campo>
              </div>
              <div className="col-6 col-md-2">
                <Campo id="nroLegajo" label="Legajo">
                  <input id="nroLegajo" className="form-control" disabled value={form.legajoNumber ?? ''} />
                </Campo>
              </div>
              <div className="col-6 col-md-2">
                <Campo id="anioLegajo" label="Año">
                  <input id="anioLegajo" className="form-control" disabled value={form.legajoAnio ?? ''} />
                </Campo>
              </div>
              <div className="col-12 col-md-4">
                <Campo id="fecha" label="Fecha y hora">
                  <input id="fecha" type="datetime-local" className="form-control" disabled value={form.legajoFecha ?? ''} />
                </Campo>
              </div>
              <div className="col-12">
                <fieldset className="form-group" disabled={!habilitado}>
                  <legend>Situación del infractor</legend>
                  <div className="opciones-grandes">
                    {SITUACIONES.map((s) => (
                      <label key={s.v} className={`opcion-grande ${form.situacionInfractor === s.v ? 'activa' : ''}`}>
                        <input type="radio" name="situacion" checked={form.situacionInfractor === s.v} onChange={() => patch({ situacionInfractor: s.v })} />
                        {s.t}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              {tipo !== 'multas' ? (
                <div className="col-12">
                  <div className="checkbox-list">
                    <span className="checkbox-list-titulo">Dependencia labrante</span>
                    <div className="row">
                      {(cat.dependencia ?? []).map((d) => (
                        <div key={d.id} className="col-12 col-md-6">
                          <label className="checkbox-list-item">
                            <input type="checkbox" className="form-check-input form-check-input-lg" checked={(form.dependenciasNombre ?? []).includes(String(d.id))} disabled={!habilitado} onChange={() => toggleLista('dependenciasNombre', String(d.id))} />
                            <span>{d.nombre}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {paso.id === 'lugar' ? (
            <div className="row g-3">
              <div className="col-12">
                <button type="button" className="btn btn-outline-primary btn-lg w-100" disabled={!habilitado} onClick={usarGps}>
                  <i className={`fa-solid ${gpsEstado === 'buscando' ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'}`} aria-hidden="true" /> Usar mi ubicación (GPS)
                </button>
                {form.gpsLat ? (
                  <p className="texto-ayuda mt-2">
                    GPS: {form.gpsLat}, {form.gpsLng} · Ejido: <strong>{form.ejido === 'dentro' ? 'dentro del ejido urbano' : 'fuera del ejido urbano'}</strong>
                  </p>
                ) : null}
                {gpsEstado === 'error' ? <p className="texto-ayuda texto-error mt-2">No se pudo obtener la ubicación. Complete la dirección a mano.</p> : null}
              </div>
              <div className="col-8 col-md-5">
                <Campo id="domicilioInfraccionCalle" label="Calle" req>
                  {inp('domicilioInfraccionCalle')}
                </Campo>
              </div>
              <div className="col-4 col-md-2">
                <Campo id="domicilioInfraccionNumero" label="Altura">
                  {inp('domicilioInfraccionNumero', { inputMode: 'numeric' })}
                </Campo>
              </div>
              <div className="col-12 col-md-5">
                <Campo id="domicilioInfraccionLocalidadNombre" label="Ciudad / localidad">
                  {sel(cat.localidad, form.domicilioInfraccionLocalidadNombre, (v) => patch({ domicilioInfraccionLocalidadNombre: v }), 'domicilioInfraccionLocalidadNombre')}
                </Campo>
              </div>
              <div className="col-6">
                <Campo id="entreCalle1" label="Entre calle (opcional)">
                  {inp('entreCalle1')}
                </Campo>
              </div>
              <div className="col-6">
                <Campo id="entreCalle2" label="Y calle (opcional)">
                  {inp('entreCalle2')}
                </Campo>
              </div>
              {!form.gpsLat ? (
                <div className="col-12 col-md-4">
                  <Campo id="ejido" label="Ejido urbano">
                    <select id="ejido" className="form-select" disabled={!habilitado} value={form.ejido ?? ''} onChange={(e) => patch({ ejido: e.target.value })}>
                      <option value="">Sin determinar</option>
                      <option value="dentro">Dentro del ejido</option>
                      <option value="fuera">Fuera del ejido</option>
                    </select>
                  </Campo>
                </div>
              ) : null}
              {tipo !== 'multas' ? (
                <div className="col-12 col-md-8">
                  <Campo id="nomenclaturaCatastral" label="Nomenclatura catastral (opcional) · Circ. / Secc. / Manz. / Parc.">
                    {inp('nomenclaturaCatastral', { placeholder: 'Ej.: IV / B / 12 / 7' })}
                  </Campo>
                </div>
              ) : null}
            </div>
          ) : null}

          {paso.id === 'infractor' ? (
            <div className="row g-3">
              {form.situacionInfractor !== 'presente' ? (
                <div className="col-12">
                  <div className="aviso aviso-info">El infractor {form.situacionInfractor === 'ausente' ? 'está ausente' : 'se niega a firmar'}: cargue los datos que pueda constatar (por ejemplo, del titular del vehículo).</div>
                </div>
              ) : null}
              <div className="col-12">
                <fieldset className="form-group" disabled={!habilitado}>
                  <legend>Tipo de persona</legend>
                  <div className="d-flex gap-3 flex-wrap">
                    {[
                      { v: 0, t: 'Persona física' },
                      { v: 1, t: 'Persona jurídica' },
                    ].map((op) => (
                      <div key={op.v} className="form-check">
                        <input className="form-check-input" type="radio" name="persona" id={`p-${op.v}`} checked={(form.infractorPersonaTipo ?? 0) === op.v} onChange={() => patch({ infractorPersonaTipo: op.v })} />
                        <label className="form-check-label" htmlFor={`p-${op.v}`}>
                          {op.t}
                        </label>
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>
              {esJuridica ? (
                <>
                  <div className="col-12 col-md-8">
                    <Campo id="infractorRazonSocial" label="Razón social" req>
                      {inp('infractorRazonSocial')}
                    </Campo>
                  </div>
                  <div className="col-12 col-md-4">
                    <Campo id="infractorCuit" label="CUIT" req>
                      {inp('infractorCuit', { inputMode: 'numeric', placeholder: '30-12345678-9' })}
                    </Campo>
                  </div>
                  <div className="col-12 col-md-8">
                    <Campo id="infractorNombre" label="Nombre de quien atiende (opcional)">
                      {inp('infractorNombre')}
                    </Campo>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-12 col-md-6">
                    <Campo id="infractorNombre" label="Nombre y apellido" req>
                      {inp('infractorNombre')}
                    </Campo>
                  </div>
                  <div className="col-5 col-md-2">
                    <Campo id="infractorDocumentoTipoNombre" label="Tipo doc.">
                      {sel(cat.documento?.filter((d) => d.nombre !== 'CUIT'), form.infractorDocumentoTipoNombre, (v) => patch({ infractorDocumentoTipoNombre: v }), 'infractorDocumentoTipoNombre')}
                    </Campo>
                  </div>
                  <div className="col-7 col-md-4">
                    <Campo id="infractorDocumentoNumero" label="Número de documento" req>
                      {inp('infractorDocumentoNumero', { inputMode: 'numeric' })}
                    </Campo>
                  </div>
                </>
              )}
              <div className="col-8 col-md-6">
                <Campo id="infractorDomicilio" label="Domicilio (calle)" req={form.situacionInfractor !== 'ausente'}>
                  {inp('infractorDomicilio')}
                </Campo>
              </div>
              <div className="col-4 col-md-2">
                <Campo id="infractorCalleAltura" label="Altura">
                  {inp('infractorCalleAltura', { inputMode: 'numeric' })}
                </Campo>
              </div>
              <div className="col-12 col-md-4">
                <Campo id="infractorDepartamento" label="Piso / depto.">
                  {inp('infractorDepartamento')}
                </Campo>
              </div>
              <div className="col-12 col-md-4">
                <Campo id="infractorProvinciaNombre" label="Provincia">
                  {sel(cat.provincia, form.infractorProvinciaNombre, (v) => patch({ infractorProvinciaNombre: v }), 'infractorProvinciaNombre')}
                </Campo>
              </div>
              <div className="col-12 col-md-4">
                <Campo id="infractorPartidoNombre" label="Partido">
                  {sel(cat.partido, form.infractorPartidoNombre, (v) => patch({ infractorPartidoNombre: v }), 'infractorPartidoNombre')}
                </Campo>
              </div>
              <div className="col-12 col-md-4">
                <Campo id="infractorLocalidadNombre" label="Ciudad / localidad">
                  {sel(cat.localidad, form.infractorLocalidadNombre, (v) => patch({ infractorLocalidadNombre: v }), 'infractorLocalidadNombre')}
                </Campo>
              </div>
            </div>
          ) : null}

          {paso.id === 'vehiculo' ? (
            <div className="row g-3">
              <div className="col-6 col-md-4">
                <Campo id="vehiculoNumeroDominio" label="Dominio">
                  {inp('vehiculoNumeroDominio', { style: { textTransform: 'uppercase' } })}
                </Campo>
              </div>
              <div className="col-6 col-md-4">
                <Campo id="vehiculoTipoNombre" label="Tipo de vehículo">
                  {sel(cat.vehiculo, form.vehiculoTipoNombre, (v) => patch({ vehiculoTipoNombre: v }), 'vehiculoTipoNombre')}
                </Campo>
              </div>
              <div className="col-12 col-md-4">
                <Campo id="vehiculoNumeroControlInterno" label="N.° de control interno">
                  {inp('vehiculoNumeroControlInterno')}
                </Campo>
              </div>
              {tipo === 'multas' ? (
                <>
                  <div className="col-6">
                    <Campo id="vehiculoMarca" label="Marca">
                      {habilitado ? (
                        <BuscadorOpciones id="vehiculoMarca" valor={form.metadata?.marca ?? ''} placeholder="Buscar marca…" opciones={opcMarcas}
                          onChange={(v) => setForm((prev) => ({ ...prev, metadata: { ...(prev.metadata ?? {}), marca: v, modelo: v === NO_DESCRIBE ? NO_DESCRIBE : '' } }))} />
                      ) : <input id="vehiculoMarca" className="form-control" disabled value={form.metadata?.marca ?? ''} />}
                    </Campo>
                  </div>
                  <div className="col-6">
                    <Campo id="vehiculoModelo" label="Modelo">
                      {habilitado && form.metadata?.marca && form.metadata.marca !== NO_DESCRIBE ? (
                        <BuscadorOpciones id="vehiculoModelo" valor={form.metadata?.modelo ?? ''} placeholder="Buscar modelo…" opciones={opcModelos} onChange={(v) => patchMeta('modelo', v)} />
                      ) : <input id="vehiculoModelo" className="form-control" disabled value={form.metadata?.modelo ?? ''} placeholder={habilitado ? 'Elija primero la marca' : ''} />}
                    </Campo>
                  </div>
                  <div className="col-6">
                    <Campo id="vehiculoNumeroLicencia" label="N.° de licencia">
                      {inp('vehiculoNumeroLicencia')}
                    </Campo>
                  </div>
                  <div className="col-6">
                    <Campo id="vehiculoMunicipalidadEmisora" label="Municipio emisor">
                      {inp('vehiculoMunicipalidadEmisora')}
                    </Campo>
                  </div>
                </>
              ) : (
                <div className="col-12">
                  <div className="form-group">
                    <label htmlFor="sustanciasDescripcion">Sustancias transportadas</label>
                    <textarea id="sustanciasDescripcion" className="form-control" rows={3} disabled={!habilitado} value={form.sustanciasDescripcion ?? ''} onChange={(e) => patch({ sustanciasDescripcion: e.target.value })} placeholder="Tipo, cantidad, estado de conservación, temperatura..." />
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {paso.id === 'articulos' ? (
            <>
              <button type="button" className="btn btn-primary mb-3" disabled={!habilitado} onClick={() => setMostrarLeyes(true)}>
                <i className="fa-solid fa-plus me-2" aria-hidden="true" /> Agregar artículo
              </button>
              <div className="table-responsive">
                <table className="table custom-table align-middle tabla-articulos">
                  <thead>
                    <tr>
                      <th>Norma</th>
                      <th>Artículo</th>
                      <th>Descripción</th>
                      <th className="text-end">Unidades</th>
                      <th className="text-end">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leyesSeleccionadas.map((l) => (
                      <tr key={claveLey(l)}>
                        <td>{l.nombre}</td>
                        <td>{l.articulo || '-'}</td>
                        <td>{l.descripcion || '-'}</td>
                        <td className="text-end">{l.multiplicador}</td>
                        <td className="text-end">
                          <button type="button" className="btn btn-danger btn-sm" disabled={!habilitado} onClick={() => patch({ leyesNombre: (form.leyesNombre ?? []).filter((k) => k !== claveLey(l) && k !== l.nombre) })}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!leyesSeleccionadas.length ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="sin-resultados py-3">
                            <p className="mb-0">No hay artículos seleccionados.</p>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <p className="texto-ayuda">Total: {unidades} unidades fijas. La valorización la revisa Faltas.</p>

              {tipo === 'multas' ? (
                <div className="row g-3 mt-1">
                  <div className="col-12">
                    <h3 className="subtitulo-paso">Medidas adoptadas</h3>
                  </div>
                  {[
                    { k: 'retencionDeLicencia' as const, t: 'Retención de licencia' },
                    { k: 'retencionDeVehiculo' as const, t: 'Retención de vehículo' },
                    // Acarreo: quitado porque el modelo de acta de tránsito de la Dirección no lo incluye
                    // (ver docs/pendientes-acta-transito.md). El campo sigue en la base y en la valorización.
                  ].map((m) => (
                    <div key={m.k} className="col-12 col-md-4">
                      <label className={`opcion-grande ${form[m.k] === 1 ? 'activa' : ''}`}>
                        <input type="checkbox" checked={form[m.k] === 1} disabled={!habilitado} onChange={(e) => patch({ [m.k]: e.target.checked ? 1 : 0 } as Partial<Infraccion>)} />
                        {m.t}
                      </label>
                    </div>
                  ))}
                  <div className="col-12 col-md-4">
                    <Campo id="alcoholemia" label="Control de alcoholemia">
                      <select id="alcoholemia" className="form-select" disabled={!habilitado} value={form.metadata?.alcoholemia ?? ''} onChange={(e) => patchMeta('alcoholemia', e.target.value)}>
                        {ALCOHOLEMIA.map((a) => (
                          <option key={a.v} value={a.v}>
                            {a.t}
                          </option>
                        ))}
                      </select>
                    </Campo>
                  </div>
                  {form.metadata?.alcoholemia === 'positiva' ? (
                    <>
                      {[
                        ['alcoholimetroValor', 'Valor (g/l)'],
                        ['alcoholimetroMarca', 'Equipo: marca'],
                        ['alcoholimetroModelo', 'Modelo'],
                        ['alcoholimetroSerie', 'N.° de serie'],
                        ['alcoholimetroMedicion', 'N.° de medición'],
                      ].map(([k, t]) => (
                        <div key={k} className="col-6 col-md-4">
                          <Campo id={k} label={t}>
                            <input id={k} className="form-control" disabled={!habilitado} value={form.metadata?.[k] ?? ''} onChange={(e) => patchMeta(k, e.target.value)} />
                          </Campo>
                        </div>
                      ))}
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="row g-3 mt-1">
                  <div className="col-12">
                    <h3 className="subtitulo-paso">Medidas preventivas</h3>
                  </div>
                  {(cat.medida ?? []).map((m) => (
                    <div key={m.id} className="col-12 col-md-6">
                      <label className={`opcion-grande ${(form.medidasPreventivas ?? []).includes(m.nombre) ? 'activa' : ''}`}>
                        <input type="checkbox" checked={(form.medidasPreventivas ?? []).includes(m.nombre)} disabled={!habilitado} onChange={() => toggleLista('medidasPreventivas', m.nombre)} />
                        {m.nombre}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}

          {paso.id === 'fotos' ? (
            <div className="row g-3">
              <div className="col-12">
                {!imagenes.length ? (
                  <div className="img-carrousel-vacio">
                    <i className="fa-solid fa-image" aria-hidden="true" />
                    <p>No hay imágenes cargadas.</p>
                  </div>
                ) : (
                  <div className="img-carrousel">
                    <div className="img-carrousel-principal">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagenActual?.previewRaw || imagenActual?.fullRaw || ''} alt={`Imagen ${indiceImagen + 1}`} />
                      <div className="img-carrousel-contador">
                        {indiceImagen + 1} / {imagenes.length}
                      </div>
                    </div>
                    <div className="img-carrousel-miniaturas">
                      {imagenes.map((img, i) => (
                        <button key={i} type="button" className={`img-carrousel-miniatura ${i === indiceImagen ? 'activa' : ''}`} onClick={() => setIndiceImagen(i)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.previewRaw || img.fullRaw || ''} alt={`Miniatura ${i + 1}`} />
                        </button>
                      ))}
                    </div>
                    <button type="button" className="btn btn-sm btn-outline-danger mt-2" disabled={!habilitado} onClick={() => { setImagenes((p) => p.filter((_, i) => i !== indiceImagen)); setIndiceImagen(0); }}>
                      <i className="fa-solid fa-trash-can" aria-hidden="true" /> Quitar imagen
                    </button>
                  </div>
                )}
              </div>
              {imagenes.length < MAX_IMAGENES ? (
                <div className="col-12">
                  <label className="btn btn-outline-primary btn-subir-imagen">
                    <i className="fa-solid fa-camera" aria-hidden="true" /> Tomar o subir imágenes
                    <input type="file" accept="image/*" capture="environment" multiple hidden onChange={onImagenes} />
                  </label>
                </div>
              ) : null}
              <div className="col-12">
                <div className="form-group">
                  <label htmlFor="observaciones">Observaciones</label>
                  <textarea id="observaciones" className="form-control" rows={4} disabled={!habilitado} value={form.observaciones ?? ''} onChange={(e) => patch({ observaciones: e.target.value })} />
                </div>
              </div>
            </div>
          ) : null}

          {paso.id === 'firma' ? (
            <div className="row g-3">
              <div className="col-12">
                <dl className="resumen-acta">
                  <div><dt>Acta</dt><dd>{form.legajoNumeroActa} · {info.corto}</dd></div>
                  <div><dt>Fecha</dt><dd>{form.legajoFecha?.replace('T', ' ')}</dd></div>
                  <div><dt>Lugar</dt><dd>{[form.domicilioInfraccionCalle, form.domicilioInfraccionNumero].filter(Boolean).join(' ') || <span className="texto-error">Falta</span>}{form.entreCalle1 ? ` (entre ${form.entreCalle1} y ${form.entreCalle2 ?? ''})` : ''}</dd></div>
                  <div><dt>Infractor</dt><dd>{form.situacionInfractor === 'nn' ? 'No identificado (NN)' : (esJuridica ? `${form.infractorRazonSocial ?? ''} · CUIT ${form.infractorCuit ?? ''}` : `${form.infractorNombre || '—'} · ${form.infractorDocumentoTipoNombre ?? ''} ${form.infractorDocumentoNumero ?? ''}`)}</dd></div>
                  {tipo !== 'contravenciones' ? <div><dt>Vehículo</dt><dd>{form.vehiculoNumeroDominio || '-'} {form.vehiculoTipoNombre ?? ''}</dd></div> : null}
                  <div><dt>Artículos</dt><dd>{leyesSeleccionadas.map((l) => claveLey(l)).join(' · ') || <span className="texto-error">Falta</span>}</dd></div>
                  <div><dt>Medidas</dt><dd>{[form.retencionDeLicencia ? 'Retención de licencia' : '', form.retencionDeVehiculo ? 'Retención de vehículo' : '', form.acarreo ? 'Acarreo' : '', ...(form.medidasPreventivas ?? [])].filter(Boolean).join(' · ') || 'Ninguna'}</dd></div>
                  <div><dt>Valor estimado</dt><dd>{unidades} UF</dd></div>
                  <div><dt>Imágenes</dt><dd>{imagenes.length}</dd></div>
                </dl>
              </div>
              {form.situacionInfractor === 'presente' ? (
                <div className="col-12 col-lg-7">
                  <h3 className="subtitulo-paso">1. Firma del infractor</h3>
                  <SignaturePad value={firma} onChange={setFirma} />
                </div>
              ) : (
                <div className="col-12 col-lg-7">
                  <div className="aviso aviso-info">
                    {form.situacionInfractor === 'nn' ? 'Acta NN: firma solo el inspector.' : form.situacionInfractor === 'ausente' ? 'Infractor ausente: firma solo el inspector.' : 'El infractor se negó a firmar: se deja constancia y firma solo el inspector.'}
                  </div>
                </div>
              )}
              <div className="col-12 col-lg-5">
                <h3 className="subtitulo-paso">{form.situacionInfractor === 'presente' ? '2. ' : ''}Firma del inspector</h3>
                <div className="firma-inspector-box">
                  <i className="fa-solid fa-user-shield" aria-hidden="true" />
                  <div>
                    <strong>{form.inspectorNombre}</strong>
                    <span>Se aplica su firma digital vinculada al usuario al presionar «Firmar y confirmar». Firma simulada en el piloto (P-04).</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </article>

      {nav}
      <div className="botonera">
        <button type="button" className="btn btn-outline-secondary" onClick={() => void guardarBorrador(false)}>
          <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Guardar borrador
        </button>
        <button type="button" className="btn btn-outline-danger" onClick={() => setDescartar(true)}>
          <i className="fa-solid fa-ban" aria-hidden="true" /> Descartar acta
        </button>
      </div>

      {descartar ? (
        <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && setDescartar(false)}>
          <div className="modal-fake modal-fake-sm" role="dialog" aria-modal="true" aria-label="Descartar acta">
            <div className="modal-fake-header">
              <i className="fa-solid fa-ban" aria-hidden="true" />
              <h2>Descartar acta {form.legajoNumeroActa}</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setDescartar(false)}>&times;</button>
            </div>
            <div className="modal-fake-body">
              <p>El número quedará anulado y no se volverá a usar.</p>
              <label htmlFor="motivoDescarte">Motivo</label>
              <textarea id="motivoDescarte" className="form-control" rows={3} value={motivoDescarte} onChange={(e) => setMotivoDescarte(e.target.value)} />
            </div>
            <div className="modal-fake-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setDescartar(false)}>Cancelar</button>
              <button type="button" className="btn btn-danger" disabled={!motivoDescarte.trim()} onClick={() => void confirmarDescarte()}>Descartar</button>
            </div>
          </div>
        </div>
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
                <label htmlFor="busquedaLey">
                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> Buscar por número o palabra clave
                </label>
                <input id="busquedaLey" className="form-control" placeholder="Ej.: 45, estacionar, licencia" value={busquedaLey} onChange={(e) => setBusquedaLey(e.target.value)} />
              </div>
              <div className="row g-3">
                {leyesVisibles.map((l) => (
                  <div key={l.uuid} className="col-12 col-md-6">
                    <button type="button" className={`card-ley ${(form.leyesNombre ?? []).includes(claveLey(l)) ? 'card-ley-seleccionada' : ''}`} onClick={() => toggleLista('leyesNombre', claveLey(l))}>
                      <div className="card-ley-articulo">
                        {l.nombre} · {l.articulo}
                      </div>
                      <div className="card-ley-descripcion">{l.descripcion}</div>
                      <div className="card-ley-footer">
                        <span>{l.categoriaNombre}</span>
                        <span className="card-ley-multiplicador">
                          Unidades: <strong>{l.multiplicador}</strong>
                        </span>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-fake-footer">
              <span>
                Seleccionados: <strong>{form.leyesNombre?.length ?? 0}</strong>
              </span>
              <button type="button" className="btn btn-outline-danger" onClick={() => patch({ leyesNombre: [] })}>Limpiar selección</button>
              <button type="button" className="btn btn-success" onClick={() => setMostrarLeyes(false)}>Listo</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
