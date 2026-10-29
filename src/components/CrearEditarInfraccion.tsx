'use client';
import { ALCANCE } from '@/lib/alcance';
import Link from 'next/link';
import { LoaderLogo } from './LoaderLogo';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient, http } from '@/lib/api-client';
import { useLayout } from '@/lib/layout-context';
import { guardarUltimoTicket, hayImpresoraPos, printTicket, printTicketRetencion, tomarFotosPos } from '@/lib/print';
import { CATEGORIAS_LICENCIA, esDeOficio, ordenarCategoriasLicencia, puede, SENTIDOS_CIRCULACION, SITUACIONES, TIPOS_ACTA, claveLey, fechaHora, textoSituacion, tipoActa } from '@/lib/dominio';
import type { ImgModel, Infraccion, Ley, OpcionCatalogo } from '@/lib/types';
import { type Paso, MAX_IMAGENES, MOTIVOS_INCOMPLETA, NO_COMPLETABLES, completarConDesconocido, ejidoPorGps, faltantesPorPaso, pasosPara, readImageFile, toDateTimeLocal, vacia } from './crear-editar-utils';
import { useNotify } from './NotifyProvider';
import { FirmaPantallaCompleta } from './FirmaPantallaCompleta';
import { BarraSuperior } from './BarraSuperior';
import { BuscadorOpciones } from './BuscadorOpciones';
import { BotonVerActa, GaleriaFotos } from './ActaEvidencia';
import { LOCALIDADES, PARTIDOS, PROVINCIAS_AR, partidosDe } from '@/lib/geo-ba';

const NO_DESCRIBE = 'No se describe';
import { useAuthUser } from '@/lib/use-auth-user';
import { inicioPara } from '@/lib/role-guard';
import { useScrollAlEnfocar } from '@/lib/use-scroll-al-enfocar';
import { registrarGuardiaSalida } from '@/lib/salida-acta';

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

/** PIN del inspector: teclado numérico, oculto. */
function InputPin({ valor, onChange, onEnter }: { valor: string; onChange: (v: string) => void; onEnter: () => void }) {
  return (
    <input className="form-control form-control-lg text-center input-pin" type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={8} autoFocus
      aria-label="PIN" value={valor} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter') onEnter(); }} />
  );
}

// Lugar de infracción precargado entre actas del mismo operativo (por inspector, en este dispositivo).
const CAMPOS_LUGAR = ['domicilioInfraccionCalle', 'domicilioInfraccionNumero', 'domicilioInfraccionLocalidadNombre', 'entreCalle1', 'entreCalle2', 'ejido', 'gpsLat', 'gpsLng', 'nomenclaturaCatastral'] as const;
const claveLugar = (u?: string | null) => `faltas-piloto:ultimo-lugar:${u ?? ''}`;
function leerUltimoLugar(usuario?: string | null): Partial<Infraccion> {
  try { return JSON.parse(localStorage.getItem(claveLugar(usuario)) ?? '{}') as Partial<Infraccion>; } catch { return {}; }
}
function guardarUltimoLugar(f: Partial<Infraccion>) {
  try {
    const lugar = Object.fromEntries(CAMPOS_LUGAR.map((k) => [k, f[k as keyof Infraccion] ?? null]));
    localStorage.setItem(claveLugar(f.inspectorUsername), JSON.stringify(lugar));
  } catch { /* sin almacenamiento */ }
}

export function CrearEditarInfraccion({ uuidProp }: { uuidProp?: string }) {
  const params = useParams();
  const router = useRouter();
  const notify = useNotify();
  const user = useAuthUser();
  useScrollAlEnfocar();
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
  // Pasos que el inspector ya dejó atrás: recién ahí se marcan en rojo sus faltantes (o al intentar firmar).
  const [visitados, setVisitados] = useState<Set<string>>(new Set());
  const [intentoFirma, setIntentoFirma] = useState(false);
  const [recienFirmada, setRecienFirmada] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [padAbierto, setPadAbierto] = useState(false);
  const [gpsEstado, setGpsEstado] = useState<'' | 'buscando' | 'ok' | 'error'>('');
  const [gpsAviso, setGpsAviso] = useState('');
  const [cat, setCat] = useState<Record<string, OpcionCatalogo[]>>({});
  const iniciado = useRef(false);

  const soloLectura = form.estadoFaltas !== undefined && form.estadoFaltas !== 'Borrador';
  // Reunión 27/10: el acta iniciada se termina sí o sí (sin «Inicio» ni abandono manual). Si faltan datos al firmar se
  // completan con «Desconocido» indicando el motivo, y se firma igual. Solo vence (y queda «Acta abandonada») si se
  // pasa el plazo de labrado. Para pruebas, 7 toques en la barra abren «Descartar acta».
  const esInspector = user?.rol === 'Inspector';
  const [salidaBloqueada, setSalidaBloqueada] = useState(false);
  const [motivoModal, setMotivoModal] = useState(false);
  const [motivoSel, setMotivoSel] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  // Aviso breve al dejar un paso incompleto (no bloquea): «Cuidado, faltó: …».
  const [stopper, setStopper] = useState<{ paso: string; faltan: string[] } | null>(null);
  useEffect(() => {
    if (!stopper) return;
    const t = setTimeout(() => setStopper(null), 2800);
    return () => clearTimeout(t);
  }, [stopper]);
  // PIN: una vez que el equipo pasó al infractor para firmar, salir de la firma pide el PIN del inspector.
  const [bloqueoPin, setBloqueoPin] = useState(false);
  const [pidePin, setPidePin] = useState<null | (() => void)>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  async function validarPin() {
    try {
      await http.post('/api/auth/pin', { pin });
      const seguir = pidePin;
      setBloqueoPin(false); setPidePin(null); setPin(''); setPinError('');
      seguir?.();
    } catch (e) {
      setPinError((e as Error).message || 'PIN incorrecto');
    }
  }
  const conPin = (accion: () => void) => (bloqueoPin && esInspector ? setPidePin(() => accion) : accion());
  useEffect(() => {
    if (!esInspector || soloLectura || recienFirmada || !form.uuid) return;
    registrarGuardiaSalida(() => (bloqueoPin ? setPidePin(() => () => setSalidaBloqueada(true)) : setSalidaBloqueada(true)));
    return () => registrarGuardiaSalida(null);
  }, [esInspector, soloLectura, recienFirmada, form.uuid, bloqueoPin]);
  // Descartar (solo pruebas): 7 toques en la barra superior.
  useEffect(() => {
    const f = () => { if (!soloLectura && form.uuid) setDescartar(true); };
    window.addEventListener('faltas:descartar-acta', f);
    return () => window.removeEventListener('faltas:descartar-acta', f);
  }, [soloLectura, form.uuid]);
  // Plazo de labrado: cuenta regresiva y vencimiento (acta abandonada). Sin «Extender tiempo» (se quitó).
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 15000); return () => clearInterval(t); }, []);
  const venceAt = Number(form.labradoVenceAt) || 0;
  const restanMs = venceAt ? venceAt - ahora : null;
  const vencida = esInspector && !soloLectura && !recienFirmada && restanMs !== null && restanMs <= 0;
  const habilitado = !soloLectura && !guardando;
  const pasos = useMemo(() => pasosPara(tipo, form.situacionInfractor), [tipo, form.situacionInfractor]);
  // Artículos que recomiendan foto (Ordenanzas → «Requiere foto»): solo se avisa, la foto es siempre opcional.
  const leyesConFoto = useMemo(() => leyes.filter((l) => ALCANCE.fotoPorArticulo && l.requiereFoto && (form.leyesNombre ?? []).includes(claveLey(l))), [leyes, form.leyesNombre]);
  const faltantes = useMemo(() => faltantesPorPaso(form, firma), [form, firma]);
  const paso = pasos[Math.min(idx, pasos.length - 1)];

  const patch = useCallback((partial: Partial<Infraccion>) => setForm((prev) => ({ ...prev, ...partial })), []);
  // Marcas y modelos administrables (Configuración → Marcas y modelos).
  const [marcas, setMarcas] = useState<{ nombre: string; modelos: { nombre: string; tipo_vehiculo: string | null }[] }[]>([]);
  useEffect(() => { http.get<typeof marcas>('/api/vehiculos').then(setMarcas).catch(() => setMarcas([])); }, []);
  const opcMarcas = useMemo(() => [...[...marcas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map((m) => ({ v: m.nombre, t: m.nombre, sub: `${m.modelos.length} modelos` })), { v: NO_DESCRIBE, t: NO_DESCRIBE, sub: 'Marca y modelo no identificables' }], [marcas]);
  const opcModelos = useMemo(() => {
    const m = marcas.find((x) => x.nombre === form.metadata?.marca);
    // Se muestran todos los modelos de la marca (coincide con «N modelos»); los del tipo de vehículo elegido van primero.
    const tipo = form.vehiculoTipoNombre;
    const lista = [...(m?.modelos ?? [])].sort((x, y) => Number(Boolean(tipo) && y.tipo_vehiculo === tipo) - Number(Boolean(tipo) && x.tipo_vehiculo === tipo) || x.nombre.localeCompare(y.nombre, 'es'));
    return [...lista.map((x) => ({ v: x.nombre, t: x.nombre, sub: x.tipo_vehiculo ?? undefined })), { v: NO_DESCRIBE, t: NO_DESCRIBE }];
  }, [marcas, form.metadata?.marca, form.vehiculoTipoNombre]);
  const opcLocalidades = useMemo(() => LOCALIDADES.map((l) => ({ v: l.nombre, t: l.nombre, sub: l.partidos.join(' · ') })), []);
  const partidosLoc = partidosDe(form.infractorLocalidadNombre ?? '');
  const opcMunicipios = useMemo(() => {
    const base = (cat.municipio ?? []).length ? (cat.municipio ?? []).map((m) => m.nombre) : PARTIDOS;
    // Orden alfabético (el catálogo viene en orden de carga).
    return [...new Set(base)].sort((a, b) => a.localeCompare(b, 'es')).map((n) => ({ v: n, t: n }));
  }, [cat.municipio]);
  const patchMeta = (k: string, v: string) => setForm((prev) => ({ ...prev, metadata: { ...(prev.metadata ?? {}), [k]: v } }));

  useEffect(() => () => setOcultarTopbar(false), [setOcultarTopbar]);
  // Confirmación final: sin la barra «Acta de …» (no es navegable y confundía); las acciones están en la tarjeta.
  useEffect(() => { if (recienFirmada) setOcultarTopbar(true); }, [recienFirmada, setOcultarTopbar]);
  // Pantalla final: siempre desde arriba (reunión 27/10).
  useEffect(() => {
    if (!recienFirmada) return;
    const ir = () => { window.scrollTo({ top: 0 }); document.querySelectorAll('.layout-contenido, .inspector-contenido').forEach((el) => { (el as HTMLElement).scrollTop = 0; }); };
    ir(); const t = setTimeout(ir, 150); return () => clearTimeout(t);
  }, [recienFirmada]);

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
        municipio: extra.municipios ?? [],
        alcMarca: extra.alcoholimetroMarcas ?? [],
        alcModelo: extra.alcoholimetroModelos ?? [],
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
        // Operativo: el lugar de infracción de la última acta firmada queda precargado en la siguiente.
        const lugar = !uuid ? leerUltimoLugar(inf.inspectorUsername) : {};
        setForm({ ...vacia(tipo), ...inf, ...lugar, legajoFecha: toDateTimeLocal(inf.legajoFecha) });
        setFirma(inf.firmaInfractor ?? null);
        if (uuid) apiClient.imagenes(uuid).then((r) => setImagenes(r.content ?? []));
        // Si el inspector tenía un acta abierta (de este u otro tipo), se retoma esa: el acta se termina sí o sí.
        if (!uuid && inf.uuid && inf.infraccionTipoNombre && inf.infraccionTipoNombre !== tipo) { window.location.replace(`/private/crear-editar/${inf.infraccionTipoNombre}/${inf.uuid}`); return; }
        if (!uuid && inf.uuid) {
          window.history.replaceState(null, '', `/private/crear-editar/${tipo}/${inf.uuid}`);
          if ((inf as Infraccion & { retomada?: boolean }).retomada) notify.info('Acta abierta', `Se retomó el acta ${inf.legajoNumeroActa}: hay que terminarla antes de labrar otra.`);
          apiClient.imagenes(inf.uuid).then((r) => setImagenes(r.content ?? [])).catch(() => undefined);
        }
      })
      .catch((e: Error) => {
        notify.error('No se pudo abrir el acta', e.message);
        router.push(user?.rol === 'Inspector' ? '/private/inicio' : `/private/lista-infracciones/${tipo}`);
      })
      .finally(() => setCargando(false));
  }, [uuid, tipo, notify, router]);

  const leyesSeleccionadas = useMemo(
    () => (form.leyesNombre ?? []).map((n) => leyes.find((l) => claveLey(l) === n) ?? leyes.find((l) => l.nombre === n) ?? ({ uuid: n, nombre: n, articulo: '', multiplicador: 0 } as Ley)),
    [form.leyesNombre, leyes],
  );

  // Ticket con la descripción coloquial de cada artículo antes de la cita (minuta 20/10).
  const paraTicket = () => ({ ...form, leyesDetalle: leyesSeleccionadas.map((l) => ({ nombre: l.nombre, articulo: l.articulo ?? '', descripcion: l.descripcion ?? '' })) });

  const leyesVisibles = useMemo(() => {
    const q = busquedaLey.toLowerCase().trim();
    if (!q) return leyes;
    return leyes.filter((l) => `${l.articulo} ${l.nombre} ${l.descripcion ?? ''}`.toLowerCase().includes(q));
  }, [busquedaLey, leyes]);

  function toggleLista(campo: 'dependenciasNombre' | 'leyesNombre' | 'medidasPreventivas', valor: string) {
    const actual = (form[campo] as string[] | undefined) ?? [];
    patch({ [campo]: actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor] } as Partial<Infraccion>);
  }

  function toggleCategoria(v: string) {
    const actual = form.vehiculoLicenciaCategorias ?? [];
    patch({ vehiculoLicenciaCategorias: ordenarCategoriasLicencia(actual.includes(v) ? actual.filter((x) => x !== v) : [...actual, v]) });
  }

  // GPS: primero alta precisión con 25 s (en frío o bajo techo el MJ-Q50 tardaba más de los 10 s de antes y fallaba);
  // si no llega, ubicación aproximada por red (WiFi/antenas). Mensaje según la causa.
  function usarGps() {
    if (!navigator.geolocation) {
      setGpsEstado('error');
      setGpsAviso('Este equipo no permite obtener la ubicación. Complete la dirección a mano.');
      return;
    }
    setGpsEstado('buscando');
    setGpsAviso('');
    const ok = (p: GeolocationPosition) => {
      const lat = Number(p.coords.latitude.toFixed(6));
      const lng = Number(p.coords.longitude.toFixed(6));
      setForm((prev) => { const next = { ...prev, gpsLat: lat, gpsLng: lng, ejido: ejidoPorGps(lat, lng) }; guardarUltimoLugar(next); return next; });
      setGpsEstado('ok');
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=es`)
        .then((r) => r.json())
        .then((j) => {
          const a = j?.address ?? {};
          // El GPS manda: reemplaza el lugar precargado de la acta anterior (y las entre calles, que ya no corresponden)
          // y pasa a ser el lugar que se precarga en la próxima acta.
          setForm((prev) => {
            const next = {
              ...prev,
              domicilioInfraccionCalle: a.road || a.pedestrian || a.footway || '',
              domicilioInfraccionNumero: a.house_number || '',
              domicilioInfraccionLocalidadNombre: a.suburb || a.town || a.city || a.village || '',
              entreCalle1: '',
              entreCalle2: '',
            };
            guardarUltimoLugar(next);
            return next;
          });
          // El mapa (OpenStreetMap) casi nunca tiene los números de puerta en Argentina: avisar en vez de dejarlo vacío sin más.
          if (!a.house_number) setGpsAviso(a.road ? 'El mapa no tiene la altura de esta cuadra: complete la «Altura» a mano.' : 'No se encontró la calle en el mapa: complete la dirección a mano.');
        })
        .catch(() => setGpsAviso('Se tomó la ubicación, pero no se pudo obtener la dirección (sin conexión): complétela a mano.'));
    };
    const fallo = (e: GeolocationPositionError, segundo: boolean) => {
      if (!segundo && e.code !== e.PERMISSION_DENIED) {
        navigator.geolocation.getCurrentPosition(ok, (e2) => fallo(e2, true), { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 });
        return;
      }
      setGpsEstado('error');
      setGpsAviso(
        e.code === e.PERMISSION_DENIED
          ? 'La app no tiene permiso de ubicación: actívelo en Ajustes › Apps › Faltas › Permisos, y vuelva a intentar.'
          : e.code === e.POSITION_UNAVAILABLE
            ? 'La ubicación del equipo está apagada o sin señal: active «Ubicación» en los ajustes rápidos de Android y vuelva a intentar.'
            : 'No hubo señal de GPS a tiempo (puede pasar bajo techo). Salga a cielo abierto y vuelva a intentar, o complete la dirección a mano.',
      );
    };
    navigator.geolocation.getCurrentPosition(ok, (e) => fallo(e, false), { enableHighAccuracy: true, timeout: 25000, maximumAge: 60000 });
  }

  async function guardarBorrador(silencioso = true, datos: Infraccion = form): Promise<Infraccion | null> {
    if (soloLectura) return datos;
    try {
      const g = await apiClient.saveInfraccion(datos);
      const persistidas = await apiClient.imagenes(g.uuid ?? '');
      const keep = new Set(imagenes.filter((i) => i.uuid).map((i) => i.uuid));
      for (const p of persistidas.content) if (p.uuid && !keep.has(p.uuid)) await apiClient.deleteImagen(p.uuid);
      const nuevas: ImgModel[] = [];
      for (const img of imagenes) nuevas.push(img.uuid ? img : await apiClient.saveImagen({ ...img, infraccionUuid: g.uuid }));
      setImagenes(nuevas);
      if (!silencioso) notify.success('Acta en curso guardada', `Acta ${g.legajoNumeroActa}`);
      return g;
    } catch (e) {
      notify.error('No se pudo guardar', (e as Error).message);
      return null;
    }
  }

  async function irA(n: number, sinPin = false) {
    const next = Math.min(pasos.length - 1, Math.max(0, n));
    // Salir de la firma con el equipo en manos del infractor: pide el PIN del inspector.
    if (!sinPin && bloqueoPin && esInspector && paso.id === 'firma' && next !== idx) { setPidePin(() => () => void irA(n, true)); return; }
    // Solo al avanzar el paso cuenta como recorrido (y se marca en rojo si le falta algo): volver con «Anterior» no
    // significa que se terminó ese paso.
    const avanza = next > idx;
    if (avanza) setVisitados((v) => new Set(v).add(paso.id));
    // Al dejar un paso incompleto hacia adelante se avisa qué falta, un momento y sin bloquear (reunión 27/10).
    const faltan = faltantes[paso.id] ?? [];
    if (avanza && !soloLectura && paso.id !== 'firma' && faltan.length) setStopper({ paso: paso.titulo, faltan });
    if (!soloLectura && next !== idx) void guardarBorrador();
    setIdx(next);
    subirArriba();
  }

  /** Lleva la vista al principio (la página puede desplazarse en la ventana o en el contenedor del layout). */
  function subirArriba() {
    const ir = () => {
      window.scrollTo({ top: 0 });
      document.querySelectorAll('.layout-contenido, .inspector-contenido').forEach((el) => { (el as HTMLElement).scrollTop = 0; });
    };
    ir();
    requestAnimationFrame(ir);
    setTimeout(ir, 120);
  }

  async function firmarYConfirmar(motivoIncompleta?: string) {
    setIntentoFirma(true);
    let f = form;
    const pendientes = pasos.filter((p) => p.id !== 'firma' && faltantes[p.id]?.length);
    // El artículo es obligatorio sí o sí.
    const duros = pendientes.flatMap((p) => (faltantes[p.id] ?? []).filter((t) => NO_COMPLETABLES.includes(t)).map((t) => `${p.corto}: ${t}`));
    if (duros.length) { notify.error('Falta completar', duros.join(' · ')); return; }
    if (pendientes.length && !motivoIncompleta) {
      // El resto se completa con «Desconocido», indicando por qué no se pudo cargar.
      setMotivoSel(''); setMotivoOtro(''); setMotivoModal(true);
      return;
    }
    if (motivoIncompleta) {
      const sitMotivo = MOTIVOS_INCOMPLETA.find((m) => m.t === motivoIncompleta)?.v;
      const sit = sitMotivo && sitMotivo !== 'otro' && (!f.situacionInfractor || f.situacionInfractor === 'presente') ? sitMotivo : f.situacionInfractor || 'no_aporta';
      f = completarConDesconocido({ ...f, situacionInfractor: sit, metadata: { ...(f.metadata ?? {}), motivoIncompleta } }) as Infraccion;
      setForm(f);
    }
    if (f.situacionInfractor === 'presente' && !firma) {
      notify.error('Falta la firma', 'El infractor presente debe firmar el acta. Si se niega, marque «Se negó a firmar» debajo del recuadro; si se fue, elija «Se dio a la fuga» en «Datos del infractor».');
      return;
    }
    setGuardando(true);
    try {
      const g = await guardarBorrador(true, f);
      if (!g) return;
      // La firma devuelve el acta final: el inspector no puede volver a abrirla después.
      const r = await apiClient.firmarActa(g.uuid!, f.situacionInfractor === 'presente' ? firma : null);
      const final = r.acta;
      setForm({ ...final, legajoFecha: toDateTimeLocal(final.legajoFecha) });
      setBloqueoPin(false);
      setRecienFirmada(true);
      guardarUltimoLugar(f);
      void guardarUltimoTicket({ ...final, leyesDetalle: leyesSeleccionadas.map((l) => ({ nombre: l.nombre, articulo: l.articulo ?? '', descripcion: l.descripcion ?? '' })) }, user?.username); // «Imprimir último ticket» en el inicio
      subirArriba();
      notify.success('Acta firmada', `${final.legajoNumeroActa} ingresó como causa.`);
    } catch (e) {
      notify.error('No se pudo firmar', (e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  /** «Se dio a la fuga» (paso final): la persona se fue sin firmar; firma solo el inspector. */
  function seDioALaFuga() {
    setFirma(null);
    patch({ situacionInfractor: 'fuga' });
    setBloqueoPin(false);
    notify.info('Se dio a la fuga', 'Firma solo el inspector. Revise los datos y toque «Firmar y confirmar».');
  }

  async function confirmarDescarte() {
    if (!motivoDescarte.trim()) return;
    try {
      await apiClient.anularActa(form.uuid!, motivoDescarte);
      notify.success('Acta en curso descartada', `El número ${form.legajoNumeroActa} quedó anulado.`);
      router.push(user?.rol === 'Inspector' ? '/private/inicio' : `/private/lista-infracciones/${tipo}`);
    } catch (e) {
      notify.error('No se pudo descartar', (e as Error).message);
    }
  }

  async function onImagenes(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files) await agregarImagenes(Array.from(event.target.files));
    event.target.value = '';
  }

  /** En la app del POS la cámara la abre la app (el input file del WebView no devuelve la foto). */
  async function onClickSubirImagen(e: React.MouseEvent) {
    if (!hayImpresoraPos()) return;
    e.preventDefault();
    try {
      const files = await tomarFotosPos(MAX_IMAGENES - imagenes.length);
      if (files?.length) await agregarImagenes(files);
    } catch (err) {
      notify.error('No se pudo tomar la foto', (err as Error).message);
    }
  }

  async function agregarImagenes(files: File[]) {
    if (!files.length) return;
    const disponibles = MAX_IMAGENES - imagenes.length;
    if (files.length > disponibles) notify.warning('Límite de imágenes', `Solo se pueden cargar hasta ${MAX_IMAGENES} imágenes.`);
    const nuevas = [...imagenes];
    for (const file of Array.from(files).slice(0, Math.max(0, disponibles))) {
      const dataUrl = await readImageFile(file);
      nuevas.push({ uuid: '', status: 1, dateCreated: Date.now(), infraccionUuid: form.uuid, previewRaw: dataUrl, fullRaw: dataUrl });
    }
    setImagenes(nuevas);
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
  // Campos numéricos: teclado numérico en el celular y solo dígitos.
  const soloNumeros = (id: keyof Infraccion): React.InputHTMLAttributes<HTMLInputElement> => ({ inputMode: 'numeric', pattern: '[0-9]*', onChange: (e) => patch({ [id]: e.target.value.replace(/\D/g, '') } as Partial<Infraccion>) });
  const inp = (id: keyof Infraccion, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={String(id)} className="form-control" disabled={!habilitado} value={(form[id] as string | undefined) ?? ''} onChange={(e) => patch({ [id]: e.target.value } as Partial<Infraccion>)} {...props} />
  );

  // ---------------------------------------------------------------- confirmación final (recién firmada)
  if (recienFirmada && form.estadoFaltas !== 'Borrador') {
    const fila = (t: string, v: React.ReactNode) => <div><dt>{t}</dt><dd>{v || '-'}</dd></div>;
    const sit = textoSituacion(form.situacionInfractor) || form.situacionInfractor;
    return (
      <div className="pagina pagina-steps acta-confirmada">
        <article className="card-step">
          <div className="acta-confirmada-cabecera">
            <i className="fa-solid fa-circle-check" aria-hidden="true" />
            <div>
              <h2>Acta {form.legajoNumeroActa} firmada</h2>
              <p>{info.titulo} · Legajo {form.legajoNumber}/{form.legajoAnio} · {fechaHora(form.firmadaAt ?? undefined)}<br />Ya ingresó como causa y no se puede modificar.</p>
            </div>
          </div>
          <div className="card-step-body">
            <div className="acta-confirmada-acciones">
            <div className="botonera">
              <BotonVerActa acta={form as Infraccion} imagenes={imagenes.map((x) => x.previewRaw ?? '').filter(Boolean)} texto="Ver acta" className="btn btn-outline-primary btn-lg" />
              <button type="button" className="btn btn-outline-primary btn-lg" onClick={() => void printTicket(paraTicket())}>
                <i className="fa-solid fa-print" aria-hidden="true" /> Imprimir ticket
              </button>
              {ALCANCE.ticketsRetencion && form.retencionDeLicencia ? (
                <button type="button" className="btn btn-outline-warning btn-lg" onClick={() => void printTicketRetencion(paraTicket(), 'licencia')}>
                  <i className="fa-solid fa-id-card" aria-hidden="true" /> Ticket de retención (licencia)
                </button>
              ) : null}
              {ALCANCE.ticketsRetencion && form.retencionDeVehiculo ? (
                <button type="button" className="btn btn-outline-warning btn-lg" onClick={() => void printTicketRetencion(paraTicket(), 'vehiculo')}>
                  <i className="fa-solid fa-car" aria-hidden="true" /> Ticket de retención (vehículo)
                </button>
              ) : null}
            </div>
            <button type="button" className="btn btn-success btn-lg w-100 acta-confirmada-ok" onClick={() => setConfirmarSalida(true)}>
              <i className="fa-solid fa-check" aria-hidden="true" /> Listo, volver al inicio
            </button>
            </div>
            <h3 className="subtitulo-paso">Resumen de lo cargado</h3>
            <dl className="ficha">
              {fila('Fecha y hora', String(form.legajoFecha ?? '').replace('T', ' '))}
              {fila('Situación de la persona', sit)}
              {form.metadata?.motivoIncompleta ? fila('Datos «Desconocido»', `Motivo: ${form.metadata.motivoIncompleta}`) : null}
              {fila('Lugar de infracción', [[form.domicilioInfraccionCalle, form.domicilioInfraccionNumero].filter(Boolean).join(' ') + (form.entreCalle1 ? ` (entre ${form.entreCalle1} y ${form.entreCalle2 ?? ''})` : ''), form.domicilioInfraccionLocalidadNombre].filter(Boolean).join(' · '))}
              {fila('Ejido', form.ejido === 'dentro' ? 'Dentro del ejido urbano' : form.ejido === 'fuera' ? 'Fuera del ejido urbano' : 'Sin determinar')}
              {!esDeOficio(form.situacionInfractor) ? fila('Infractor', esJuridica ? `${form.infractorRazonSocial ?? ''} · CUIT ${form.infractorCuit ?? ''}` : `${form.infractorNombre ?? ''} · ${form.infractorDocumentoTipoNombre ?? ''} ${form.infractorDocumentoNumero ?? ''}`) : null}
              {!esDeOficio(form.situacionInfractor) ? fila('Domicilio', [[form.infractorDomicilio, form.infractorCalleAltura, form.infractorDepartamento].filter(Boolean).join(' '), form.infractorLocalidadNombre, form.infractorPartidoNombre].filter(Boolean).join(' · ')) : null}
              {form.vehiculoNumeroLicencia ? fila('Licencia de conducir', form.vehiculoNumeroLicencia) : null}
              {form.vehiculoLicenciaCategorias?.length ? fila('Categorías de la licencia', ordenarCategoriasLicencia(form.vehiculoLicenciaCategorias).join(' · ')) : null}
              {form.vehiculoMunicipalidadEmisora ? fila('Municipio emisor de la licencia', form.vehiculoMunicipalidadEmisora) : null}
              {tipo !== 'contravenciones' ? fila('Vehículo', [form.vehiculoNumeroDominio, form.vehiculoTipoNombre, form.metadata?.marca, form.metadata?.modelo].filter(Boolean).join(' · ')) : null}
              {form.sustanciasDescripcion ? fila('Sustancias', form.sustanciasDescripcion) : null}
              {fila('Medidas', [form.retencionDeLicencia ? 'Retención de licencia' : '', form.retencionDeVehiculo ? 'Retención de vehículo' : '', ...(form.medidasPreventivas ?? [])].filter(Boolean).join(' · ') || 'Ninguna')}
              {form.metadata?.alcoholemia ? fila('Alcoholemia', form.metadata.alcoholemia) : null}
              {fila('Observaciones', form.observaciones)}
              {fila('Inspector', form.inspectorNombre)}
            </dl>
            <h3 className="subtitulo-paso mt-3">Artículos</h3>
            <ul className="mb-3">{leyesSeleccionadas.map((l) => <li key={claveLey(l)}>{claveLey(l)}{l.descripcion ? ` — ${l.descripcion}` : ''}</li>)}</ul>
            {imagenes.length ? (
              <>
                <h3 className="subtitulo-paso">Fotos</h3>
                <div className="mb-3"><GaleriaFotos imagenes={imagenes.map((im) => im.previewRaw ?? '')} alto={88} /></div>
              </>
            ) : null}
            <h3 className="subtitulo-paso">Firmas</h3>
            <div className="d-flex gap-3 flex-wrap align-items-center mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {form.firmaInfractor ? <img src={form.firmaInfractor} alt="Firma del infractor" style={{ height: 70, background: '#fff', borderRadius: 6 }} /> : <span className="texto-ayuda">{form.situacionInfractor === 'se_niega' ? 'El infractor se negó a firmar.' : 'Sin firma del infractor.'}</span>}
              <span className="texto-ayuda"><i className="fa-solid fa-user-shield" aria-hidden="true" /> Firma digital de {form.inspectorNombre}</span>
            </div>
          </div>
        </article>
        {confirmarSalida ? (
          <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && setConfirmarSalida(false)}>
            <div className="modal-fake" role="dialog" aria-modal="true" aria-label="Salir del acta">
              <div className="modal-fake-header">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                <h2>¿Volver al inicio?</h2>
                <button type="button" aria-label="Cerrar" onClick={() => setConfirmarSalida(false)}>&times;</button>
              </div>
              <div className="modal-fake-body">
                <p className="mb-0">Después <strong>ya no podrá volver a ver esta acta</strong> desde su usuario. El ticket se puede reimprimir desde el inicio con «Imprimir último ticket» (solo el último, en este equipo); el acta completa, imprímala antes de salir.</p>
              </div>
              <div className="modal-fake-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setConfirmarSalida(false)}>Quedarme</button>
                <button type="button" className="btn btn-success" onClick={() => router.push(inicioPara(user?.rol, user?.sector, user?.modulosActa))}>Sí, volver al inicio</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

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
                  <button type="button" className="btn btn-primary btn-lg" onClick={() => void printTicket(paraTicket())}>
                    <i className="fa-solid fa-print" aria-hidden="true" /> Imprimir ticket
                  </button>
                  {ALCANCE.ticketsRetencion && form.retencionDeLicencia ? (
                    <button type="button" className="btn btn-outline-warning btn-lg" onClick={() => void printTicketRetencion(paraTicket(), 'licencia')}>
                      <i className="fa-solid fa-id-card" aria-hidden="true" /> Ticket de retención (licencia)
                    </button>
                  ) : null}
                  {ALCANCE.ticketsRetencion && form.retencionDeVehiculo ? (
                    <button type="button" className="btn btn-outline-warning btn-lg" onClick={() => void printTicketRetencion(paraTicket(), 'vehiculo')}>
                      <i className="fa-solid fa-car" aria-hidden="true" /> Ticket de retención (vehículo)
                    </button>
                  ) : null}
                  <BotonVerActa acta={form as Infraccion} imagenes={imagenes.map((x) => x.previewRaw ?? '').filter(Boolean)} className="btn btn-outline-primary btn-lg" />
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
  // Un paso se marca en rojo después de dejarlo incompleto; mientras se está en él, no (vuelve a marcarse al salir si sigue incompleto).
  const faltaEn = (p: { id: Paso['id'] }) => ((intentoFirma || visitados.has(p.id)) && p.id !== 'firma' && p.id !== paso.id ? faltantes[p.id] ?? [] : []);
  const hayRojo = pasos.some((p) => faltaEn(p).length);
  const pendientesFirma = pasos.filter((p) => p.id !== 'firma' && faltantes[p.id]?.length);
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
      <BarraSuperior><span className="acta-borrador-chip">Acta en curso</span></BarraSuperior>
      <div className="acta-encabezado-numero">
        <span className="acta-numero-chip">
          <i className="fa-solid fa-hashtag" aria-hidden="true" /> {form.legajoNumeroActa}
        </span>
        <span>Legajo {form.legajoNumber}/{form.legajoAnio}</span>
        {/* Plazo de labrado (reunión 27/10): si vence sin firmar, el acta queda abandonada. */}
        {esInspector && restanMs !== null ? (
          <span className={`plazo-labrado ${restanMs < 15 * 60000 ? 'por-vencer' : ''}`}>
            <i className="fa-solid fa-hourglass-half" aria-hidden="true" /> {restanMs > 0 ? `Vence ${fechaHora(venceAt).split(', ').pop()} (${restanMs >= 3600000 ? `${Math.floor(restanMs / 3600000)} h ` : ''}${Math.ceil((restanMs % 3600000) / 60000)} min)` : 'Venció'}
          </span>
        ) : null}
      </div>

      {/* Móvil: barra compacta con el paso actual; al tocarla se despliegan todos los pasos. */}
      <div className="wizard-movil">
        <button type="button" className={`wizard-movil-barra ${hayRojo ? 'con-faltantes' : ''}`} aria-expanded={pasosAbiertos} aria-controls="wizard-movil-lista" onClick={() => setPasosAbiertos((v) => !v)}>
          <span className="wizard-movil-num">{idx + 1}/{pasos.length}{hayRojo ? <span className="wizard-movil-alerta" title="Hay pasos con datos faltantes" /> : null}</span>
          <span className="wizard-movil-titulo">{paso.corto}</span>
          <i className={`fa-solid fa-chevron-down wizard-movil-chev ${pasosAbiertos ? 'abierto' : ''}`} aria-hidden="true" />
          <span className="wizard-movil-progreso" aria-hidden="true"><span style={{ width: `${((idx + 1) / pasos.length) * 100}%` }} /></span>
        </button>
        {pasosAbiertos ? (
          <ol id="wizard-movil-lista" className="wizard-movil-lista">
            {pasos.map((p, i) => (
              <li key={p.id}>
                <button type="button" className={`${i === idx ? 'activo' : ''} ${i < idx ? 'completado' : ''} ${faltaEn(p).length ? 'con-faltantes' : ''}`} onClick={() => { setPasosAbiertos(false); void irA(i); }}>
                  <span className="n">{faltaEn(p).length ? <i className="fa-solid fa-exclamation" aria-hidden="true" /> : i < idx ? <i className="fa-solid fa-check" aria-hidden="true" /> : i + 1}</span>
                  <span>{p.titulo}{faltaEn(p).length ? <small className="faltan">Faltan: {faltaEn(p).join(', ')}</small> : null}</span>
                  {i === idx ? <span className="actual">Actual</span> : null}
                </button>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      <nav className="wizard-pasos" aria-label="Pasos del formulario">
        {pasos.map((p, i) => (
          <button key={p.id} type="button" className={`wizard-paso ${i === idx ? 'activo' : ''} ${i < idx ? 'completado' : ''} ${faltaEn(p).length ? 'con-faltantes' : ''}`} onClick={() => void irA(i)}
            title={faltaEn(p).length ? `Faltan: ${faltaEn(p).join(', ')}` : undefined}>
            <span className="wizard-paso-num">{faltaEn(p).length ? <i className="fa-solid fa-exclamation" aria-hidden="true" /> : i + 1}</span>
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
                {/* Las coordenadas se guardan (ejido, seguimiento, mapa) pero no se muestran. El ejido no lo edita el inspector. */}
                <p className="texto-ayuda mt-2">
                  <i className="fa-solid fa-map-location-dot" aria-hidden="true" /> Ejido:{' '}
                  <strong>{form.ejido === 'dentro' ? 'dentro del ejido urbano' : form.ejido === 'fuera' ? 'fuera del ejido urbano' : 'sin determinar'}</strong>
                </p>
                {gpsEstado === 'buscando' ? <p className="texto-ayuda mt-2" role="status">Buscando la ubicación… puede tardar hasta medio minuto.</p> : null}
                {gpsAviso ? <p className={`texto-ayuda mt-2 ${gpsEstado === 'error' ? 'texto-error' : ''}`} role="status">{gpsAviso}</p> : null}
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
              {tipo === 'multas' ? (
                <div className="col-12 col-md-5">
                  {/* Reunión 27/10: hacia cuál de las avenidas principales circulaba. Opcional. */}
                  <Campo id="sentidoCirculacion" label="Sentido de circulación: hacia (opcional)">
                    <select id="sentidoCirculacion" className="form-select" disabled={!habilitado} value={form.metadata?.sentidoCirculacion ?? ''} onChange={(e) => patchMeta('sentidoCirculacion', e.target.value)}>
                      <option value="">Sin indicar</option>
                      {[...SENTIDOS_CIRCULACION, ...(form.metadata?.sentidoCirculacion && !SENTIDOS_CIRCULACION.includes(form.metadata.sentidoCirculacion) ? [form.metadata.sentidoCirculacion] : [])].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Campo>
                </div>
              ) : null}
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
              {/* Identificación de la persona: define qué datos se piden y quién firma. */}
              <div className="col-12">
                <fieldset className="form-group" disabled={!habilitado}>
                  <legend>Situación de la persona</legend>
                  <div className="opciones-grandes">
                    {SITUACIONES.filter((s) => s.v !== 'se_niega').map((s) => {
                      // «Se niega a firmar» se marca al final, debajo de la firma: acá cuenta como «Presente».
                      const activa = form.situacionInfractor === s.v || (s.v === 'presente' && form.situacionInfractor === 'se_niega');
                      return (
                      <label key={s.v} className={`opcion-grande ${activa ? 'activa' : ''}`}>
                        <input type="radio" name="situacion" checked={activa} onChange={() => patch({ situacionInfractor: s.v })} />
                        <span>{s.t}</span>
                      </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
              {!esDeOficio(form.situacionInfractor) ? (
              <>
              {['ausente', 'se_niega', 'no_aporta', 'fuga'].includes(form.situacionInfractor ?? '') ? (
                <div className="col-12">
                  <div className="aviso aviso-info">{({ ausente: 'La persona está ausente', se_niega: 'La persona se niega a firmar', no_aporta: 'La persona no aporta sus datos', fuga: 'La persona se dio a la fuga' } as Record<string, string>)[form.situacionInfractor ?? '']}: cargue los datos que pueda constatar (por ejemplo, del titular del vehículo). Los que falten quedan como «Desconocido».</div>
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
                    <Campo id="infractorRazonSocial" label="Razón social" req={form.situacionInfractor === 'presente' || form.situacionInfractor === 'se_niega'}>
                      {inp('infractorRazonSocial')}
                    </Campo>
                  </div>
                  <div className="col-12 col-md-4">
                    <Campo id="infractorCuit" label="CUIT" req={form.situacionInfractor === 'presente' || form.situacionInfractor === 'se_niega'}>
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
                    <Campo id="infractorNombre" label="Nombre y apellido" req={form.situacionInfractor === 'presente' || form.situacionInfractor === 'se_niega'}>
                      {inp('infractorNombre')}
                    </Campo>
                  </div>
                  <div className="col-5 col-md-2">
                    <Campo id="infractorDocumentoTipoNombre" label="Tipo doc.">
                      {sel(cat.documento?.filter((d) => d.nombre !== 'CUIT'), form.infractorDocumentoTipoNombre, (v) => patch({ infractorDocumentoTipoNombre: v }), 'infractorDocumentoTipoNombre')}
                    </Campo>
                  </div>
                  <div className="col-7 col-md-4">
                    <Campo id="infractorDocumentoNumero" label="Número de documento" req={form.situacionInfractor === 'presente' || form.situacionInfractor === 'se_niega'}>
                      {/* Reunión 27/10: el DNI completa el N.° de licencia y viceversa (es el mismo número), solo si el otro estaba vacío o era igual. */}
                      {inp('infractorDocumentoNumero', { inputMode: 'numeric', onChange: (e) => { const v = e.target.value; setForm((prev) => ({ ...prev, infractorDocumentoNumero: v, vehiculoNumeroLicencia: tipo === 'multas' && (!prev.vehiculoNumeroLicencia || prev.vehiculoNumeroLicencia === String(prev.infractorDocumentoNumero ?? '').replace(/\D/g, '')) ? v.replace(/\D/g, '') : prev.vehiculoNumeroLicencia })); } })}
                    </Campo>
                  </div>
                </>
              )}
              <div className="col-8 col-md-6">
                <Campo id="infractorDomicilio" label="Domicilio (calle)" req={form.situacionInfractor === 'presente' || form.situacionInfractor === 'se_niega'}>
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
                  {sel(PROVINCIAS_AR.map((n, i) => ({ id: i + 1, nombre: n })), form.infractorProvinciaNombre, (v) => patch({ infractorProvinciaNombre: v }), 'infractorProvinciaNombre')}
                </Campo>
              </div>
              <div className="col-12 col-md-4">
                <Campo id="infractorLocalidadNombre" label="Ciudad / localidad">
                  {habilitado ? (
                    <BuscadorOpciones id="infractorLocalidadNombre" libre valor={form.infractorLocalidadNombre ?? ''} placeholder="Buscar localidad…" opciones={opcLocalidades}
                      onChange={(v) => { const ps = partidosDe(v); patch({ infractorLocalidadNombre: v, infractorPartidoNombre: ps.length === 1 ? ps[0] : ps.includes(form.infractorPartidoNombre ?? '') ? form.infractorPartidoNombre : '' }); }} />
                  ) : <input id="infractorLocalidadNombre" className="form-control" disabled value={form.infractorLocalidadNombre ?? ''} />}
                </Campo>
              </div>
              <div className="col-12 col-md-4">
                <Campo id="infractorPartidoNombre" label="Partido">
                  {!habilitado ? <input id="infractorPartidoNombre" className="form-control" disabled value={form.infractorPartidoNombre ?? ''} />
                    : partidosLoc.length ? (
                      <select id="infractorPartidoNombre" className="form-select" value={form.infractorPartidoNombre ?? ''} onChange={(e) => patch({ infractorPartidoNombre: e.target.value })}>
                        {partidosLoc.length > 1 ? <option value="">Seleccione…</option> : null}
                        {partidosLoc.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : form.infractorLocalidadNombre ? (
                      <input id="infractorPartidoNombre" className="form-control" value={form.infractorPartidoNombre ?? ''} placeholder="Partido / departamento" onChange={(e) => patch({ infractorPartidoNombre: e.target.value })} />
                    ) : <input id="infractorPartidoNombre" className="form-control" disabled value="" placeholder="Elija primero la localidad" />}
                </Campo>
              </div>
              {tipo === 'multas' ? (
                <>
                <div className="col-12 col-md-4">
                  <Campo id="vehiculoNumeroLicencia" label="N.° de licencia de conducir">
                    {inp('vehiculoNumeroLicencia', { ...soloNumeros('vehiculoNumeroLicencia'), onChange: (e) => { const v = e.target.value.replace(/\D/g, ''); setForm((prev) => ({ ...prev, vehiculoNumeroLicencia: v, infractorDocumentoNumero: !prev.infractorDocumentoNumero || String(prev.infractorDocumentoNumero).replace(/\D/g, '') === (prev.vehiculoNumeroLicencia ?? '') ? v : prev.infractorDocumentoNumero })); } })}
                  </Campo>
                </div>
                {/* Municipio que emitió la licencia (minuta 20/10: pasa del paso «Vehículo» a este). */}
                <div className="col-12 col-md-4">
                  <Campo id="vehiculoMunicipalidadEmisora" label="Municipio emisor">
                    {habilitado ? (
                      <BuscadorOpciones id="vehiculoMunicipalidadEmisora" libre valor={form.vehiculoMunicipalidadEmisora ?? ''} placeholder="Buscar municipio… (ej.: Merlo)" opciones={opcMunicipios} onChange={(v) => patch({ vehiculoMunicipalidadEmisora: v })} />
                    ) : <input id="vehiculoMunicipalidadEmisora" className="form-control" disabled value={form.vehiculoMunicipalidadEmisora ?? ''} />}
                  </Campo>
                </div>
                </>
              ) : null}
              {tipo === 'multas' ? (
                <div className="col-12">
                  <fieldset className="form-group mb-0">
                    <legend className="form-label-v2 mb-1">Categorías de la licencia <span className="texto-ayuda">(opcional · marque todas las que figuran en la licencia)</span></legend>
                    <div className="chips-categoria">
                      {CATEGORIAS_LICENCIA.map((cl) => {
                        const on = (form.vehiculoLicenciaCategorias ?? []).includes(cl.v);
                        return (
                          <button key={cl.v} type="button" className={`chip-categoria ${on ? 'activo' : ''}`} aria-pressed={on} title={cl.d} aria-label={`${cl.v}: ${cl.d}`} disabled={!habilitado} onClick={() => toggleCategoria(cl.v)}>
                            {on ? <i className="fa-solid fa-check" aria-hidden="true" /> : null}{cl.v}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>
              ) : null}
              </>
              ) : (
                <div className="col-12">
                  <div className="aviso aviso-info">Acta de oficio: no hace falta cargar datos de la persona. Firma solo el inspector.</div>
                </div>
              )}
            </div>
          ) : null}

          {paso.id === 'vehiculo' ? (
            <div className="row g-3">
              <div className="col-6 col-md-4">
                <Campo id="vehiculoNumeroDominio" label="Dominio">
                  <input id="vehiculoNumeroDominio" className="form-control" disabled={!habilitado} autoCapitalize="characters" autoCorrect="off" spellCheck={false} style={{ textTransform: 'uppercase' }} value={form.vehiculoNumeroDominio ?? ''} onChange={(e) => patch({ vehiculoNumeroDominio: e.target.value.toUpperCase().replace(/\s+/g, '') })} />
                </Campo>
              </div>
              <div className="col-6 col-md-4">
                <Campo id="vehiculoTipoNombre" label="Tipo de vehículo">
                  {sel(cat.vehiculo, form.vehiculoTipoNombre, (v) => patch({ vehiculoTipoNombre: v }), 'vehiculoTipoNombre')}
                </Campo>
              </div>
              {/* Reunión 27/10: se quita el N.° de control interno (las actas viejas lo siguen mostrando en el PDF). */}
              {tipo === 'multas' ? (
                <>
                  <div className="col-6">
                    <Campo id="vehiculoMarca" label="Marca">
                      {habilitado ? (
                        <BuscadorOpciones id="vehiculoMarca" libre valor={form.metadata?.marca ?? ''} placeholder="Buscar marca…" opciones={opcMarcas}
                          onChange={(v) => setForm((prev) => ({ ...prev, metadata: { ...(prev.metadata ?? {}), marca: v, modelo: v === NO_DESCRIBE ? NO_DESCRIBE : '' } }))} />
                      ) : <input id="vehiculoMarca" className="form-control" disabled value={form.metadata?.marca ?? ''} />}
                    </Campo>
                  </div>
                  <div className="col-6">
                    <Campo id="vehiculoModelo" label="Modelo">
                      {habilitado && form.metadata?.marca && form.metadata.marca !== NO_DESCRIBE ? (
                        <BuscadorOpciones id="vehiculoModelo" libre valor={form.metadata?.modelo ?? ''} placeholder="Buscar modelo…" opciones={opcModelos} onChange={(v) => patchMeta('modelo', v)} />
                      ) : <input id="vehiculoModelo" className="form-control" disabled value={form.metadata?.modelo ?? ''} placeholder={habilitado ? 'Elija primero la marca' : ''} />}
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
                      <th>Artículo</th>
                      <th>Norma</th>
                      <th>Descripción</th>
                      <th className="text-end"><span className="visually-hidden">Quitar</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leyesSeleccionadas.map((l) => (
                      <tr key={claveLey(l)}>
                        <td>{l.articulo || '-'}</td>
                        <td>{l.nombre}</td>
                        <td>{l.descripcion || '-'}{ALCANCE.fotoPorArticulo && l.requiereFoto ? <div className="texto-ayuda"><i className="fa-solid fa-camera" aria-hidden="true" /> Requiere foto</div> : null}</td>
                        <td className="text-end">
                          <button type="button" className="btn btn-outline-danger btn-sm" aria-label={`Quitar artículo ${l.articulo}`} title="Quitar artículo" disabled={!habilitado} onClick={() => patch({ leyesNombre: (form.leyesNombre ?? []).filter((k) => k !== claveLey(l) && k !== l.nombre) })}>
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!leyesSeleccionadas.length ? (
                      <tr>
                        <td colSpan={4}>
                          <div className="sin-resultados py-3">
                            <p className="mb-0">No hay artículos seleccionados.</p>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {tipo === 'multas' ? (
                <div className="row g-3 mt-1 align-items-end">
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
                            {ALCANCE.alcoholimetroLista && k === 'alcoholimetroMarca'
                              // Reunión 27/10: marca y modelo del equipo desde listas (Configuración → Labrado en el POS).
                              ? <select id={k} className="form-select" disabled={!habilitado} value={form.metadata?.[k] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, metadata: { ...(prev.metadata ?? {}), alcoholimetroMarca: e.target.value, alcoholimetroModelo: '' } }))}>
                                  <option value="">Seleccionar...</option>
                                  {(cat.alcMarca ?? []).map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                                  {form.metadata?.[k] && !(cat.alcMarca ?? []).some((m) => m.nombre === form.metadata?.[k]) ? <option value={form.metadata[k]}>{form.metadata[k]}</option> : null}
                                </select>
                              : ALCANCE.alcoholimetroLista && k === 'alcoholimetroModelo'
                              ? <select id={k} className="form-select" disabled={!habilitado || !form.metadata?.alcoholimetroMarca} value={form.metadata?.[k] ?? ''} onChange={(e) => patchMeta(k, e.target.value)}>
                                  <option value="">{form.metadata?.alcoholimetroMarca ? 'Seleccionar...' : 'Elija la marca'}</option>
                                  {(cat.alcModelo ?? []).filter((m) => m.nombre.startsWith(`${form.metadata?.alcoholimetroMarca} · `)).map((m) => { const mod = m.nombre.slice(`${form.metadata?.alcoholimetroMarca} · `.length); return <option key={m.id} value={mod}>{mod}</option>; })}
                                  {form.metadata?.[k] && !(cat.alcModelo ?? []).some((m) => m.nombre === `${form.metadata?.alcoholimetroMarca} · ${form.metadata?.[k]}`) ? <option value={form.metadata[k]}>{form.metadata[k]}</option> : null}
                                </select>
                              : k === 'alcoholimetroValor'
                              // g/l admite decimales (ej.: 0,5): solo dígitos y un separador decimal.
                              ? <input id={k} className="form-control" inputMode="decimal" placeholder="Ej.: 0,5" disabled={!habilitado} value={form.metadata?.[k] ?? ''}
                                  onChange={(e) => { const t = e.target.value.replace('.', ',').replace(/[^\d,]/g, ''); const [ent, ...dec] = t.split(','); patchMeta(k, dec.length ? `${ent},${dec.join('').slice(0, 3)}` : ent); }} />
                              : ['alcoholimetroSerie', 'alcoholimetroMedicion'].includes(k)
                              ? <input id={k} className="form-control" inputMode="numeric" pattern="[0-9]*" disabled={!habilitado} value={form.metadata?.[k] ?? ''} onChange={(e) => patchMeta(k, e.target.value.replace(/\D/g, ''))} />
                              : <input id={k} className="form-control" disabled={!habilitado} value={form.metadata?.[k] ?? ''} onChange={(e) => patchMeta(k, e.target.value)} />}
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
                {leyesConFoto.length
                  ? <div className={`aviso ${imagenes.length ? 'aviso-ok' : 'aviso-info'}`}><i className="fa-solid fa-camera" aria-hidden="true" /> Foto recomendada para {leyesConFoto.map((l) => l.descripcion || claveLey(l)).join(', ')}. Es opcional.</div>
                  : <p className="texto-ayuda mb-0">Las fotos son opcionales.</p>}
              </div>
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
                  {/* El input file va oculto: la etiqueta hace de botón y se activa también con Enter o Espacio (A11Y paso 3). */}
                  <label className="btn btn-outline-primary btn-subir-imagen" role="button" tabIndex={0} onClick={(e) => void onClickSubirImagen(e)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}>
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
                  <div><dt>Lugar de infracción</dt><dd>{[form.domicilioInfraccionCalle, form.domicilioInfraccionNumero].filter(Boolean).join(' ') || <span className="texto-error">Falta</span>}{form.entreCalle1 ? ` (entre ${form.entreCalle1} y ${form.entreCalle2 ?? ''})` : ''}</dd></div>
                  <div><dt>Infractor</dt><dd>{esDeOficio(form.situacionInfractor) ? 'De oficio' : (esJuridica ? `${form.infractorRazonSocial ?? ''} · CUIT ${form.infractorCuit ?? ''}` : `${form.infractorNombre || '—'} · ${form.infractorDocumentoTipoNombre ?? ''} ${form.infractorDocumentoNumero ?? ''}`)}</dd></div>
                  {tipo === 'multas' && (form.vehiculoNumeroLicencia || form.vehiculoLicenciaCategorias?.length || form.vehiculoMunicipalidadEmisora) ? <div><dt>Licencia</dt><dd>{[form.vehiculoNumeroLicencia ? `N.° ${form.vehiculoNumeroLicencia}` : '', form.vehiculoLicenciaCategorias?.length ? `Categorías ${ordenarCategoriasLicencia(form.vehiculoLicenciaCategorias).join(', ')}` : '', form.vehiculoMunicipalidadEmisora ? `Emitida por ${form.vehiculoMunicipalidadEmisora}` : ''].filter(Boolean).join(' · ')}</dd></div> : null}
                  {tipo !== 'contravenciones' ? <div><dt>Vehículo</dt><dd>{form.vehiculoNumeroDominio || '-'} {form.vehiculoTipoNombre ?? ''}</dd></div> : null}
                  <div><dt>Artículos</dt><dd>{leyesSeleccionadas.map((l) => claveLey(l)).join(' · ') || <span className="texto-error">Falta</span>}</dd></div>
                  <div><dt>Medidas</dt><dd>{[form.retencionDeLicencia ? 'Retención de licencia' : '', form.retencionDeVehiculo ? 'Retención de vehículo' : '', form.acarreo ? 'Acarreo' : '', ...(form.medidasPreventivas ?? [])].filter(Boolean).join(' · ') || 'Ninguna'}</dd></div>
                  <div><dt>Imágenes</dt><dd>{imagenes.length}</dd></div>
                </dl>
              </div>
              {pendientesFirma.length ? (
                <div className="col-12">
                  <div className="aviso aviso-alerta faltantes-firma">
                    <strong><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Faltan datos:</strong>
                    <ul>
                      {pendientesFirma.map((p) => (
                        <li key={p.id}>
                          <button type="button" className="btn btn-link p-0" onClick={() => void irA(pasos.indexOf(p))}>{p.titulo}</button>: {faltantes[p.id]!.join(', ')}
                        </li>
                      ))}
                    </ul>
                    <span className="texto-ayuda">El artículo es obligatorio. El resto, si no se puede cargar, se completa con «Desconocido» al firmar, indicando el motivo.</span>
                  </div>
                </div>
              ) : null}
              {form.situacionInfractor === 'presente' || form.situacionInfractor === 'se_niega' ? (
                <div className="col-12 col-lg-7">
                  <h3 className="subtitulo-paso">1. Firma del infractor</h3>
                  {/* El infractor firma a pantalla completa (el equipo lo tiene él o lo sostiene el inspector). */}
                  <div className="firma-opciones">
                    <button type="button" className="firma-abrir" disabled={!habilitado || form.situacionInfractor === 'se_niega'} onClick={() => { if (esInspector && ALCANCE.pinFirma) setBloqueoPin(true); setPadAbierto(true); }}>
                      {firma && form.situacionInfractor !== 'se_niega' ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={firma} alt="Firma del infractor" />
                          <span><i className="fa-solid fa-rotate" aria-hidden="true" /> Volver a firmar</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-signature" aria-hidden="true" />
                          <strong>Abrir pad de firma</strong>
                          <span>{form.situacionInfractor === 'se_niega' ? 'El infractor se negó a firmar' : 'La pantalla completa queda para firmar'}</span>
                        </>
                      )}
                    </button>
                    <label className={`opcion-grande firma-niega ${form.situacionInfractor === 'se_niega' ? 'activa' : ''}`}>
                      <input type="checkbox" disabled={!habilitado} checked={form.situacionInfractor === 'se_niega'}
                        onChange={(e) => { if (e.target.checked) setFirma(null); patch({ situacionInfractor: e.target.checked ? 'se_niega' : 'presente' }); }} />
                      <span>El infractor se niega a firmar</span>
                    </label>
                    {/* Reunión 27/10: si la persona se va sin firmar, firma solo el inspector. */}
                    {ALCANCE.botonFugaFinal ? (
                    <button type="button" className="btn btn-outline-danger btn-lg w-100" disabled={!habilitado} onClick={() => conPin(seDioALaFuga)}>
                      <i className="fa-solid fa-person-running" aria-hidden="true" /> Se dio a la fuga
                    </button>
                    ) : null}
                  </div>
                  {/* Al pasar el equipo al infractor para firmar, salir de la firma pide el PIN del inspector. */}
                  {padAbierto ? <FirmaPantallaCompleta onCancelar={() => setPadAbierto(false)} onListo={(f) => { setFirma(f); setPadAbierto(false); }} /> : null}
                </div>
              ) : (
                <div className="col-12 col-lg-7">
                  <div className="aviso aviso-info">
                    {form.situacionInfractor ? `${textoSituacion(form.situacionInfractor)}: firma solo el inspector${form.situacionInfractor === 'no_aporta' ? ' (si la persona quiere firmar, vuelva a «Presente»)' : ''}.` : 'Elija primero la situación de la persona en «Datos del infractor».'}
                  </div>
                </div>
              )}
              <div className="col-12 col-lg-5">
                <h3 className="subtitulo-paso">{form.situacionInfractor === 'presente' || form.situacionInfractor === 'se_niega' ? '2. ' : ''}Firma del inspector</h3>
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
      {/* El inspector no guarda ni descarta a mano: el borrador se guarda al cambiar de paso y, si sale, queda como acta incompleta. */}
      {!esInspector ? (
        <div className="botonera">
          <button type="button" className="btn btn-outline-secondary" onClick={() => void guardarBorrador(false)}>
            <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Guardar borrador
          </button>
          <button type="button" className="btn btn-outline-danger" onClick={() => setDescartar(true)}>
            <i className="fa-solid fa-ban" aria-hidden="true" /> Descartar acta
          </button>
        </div>
      ) : null}

      {stopper ? (
        <div className="stopper-faltantes" role="alert" onClick={() => setStopper(null)}>
          <div>
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            <strong>Cuidado, faltó:</strong> {stopper.faltan.join(', ')}
            <small>{stopper.paso} · se puede completar después</small>
          </div>
        </div>
      ) : null}

      {motivoModal ? (() => {
        const faltan = pasos.filter((p) => p.id !== 'firma').flatMap((p) => (faltantes[p.id] ?? []).map((t) => ({ p, t })));
        const motivo = motivoSel === 'otro' ? motivoOtro.trim() : MOTIVOS_INCOMPLETA.find((m) => m.v === motivoSel)?.t ?? '';
        return (
          <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && setMotivoModal(false)}>
            <div className="modal-fake" role="alertdialog" aria-modal="true" aria-label="Faltan datos">
              <div className="modal-fake-header">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                <h2>Faltan datos</h2>
              </div>
              <div className="modal-fake-body">
                <p>Estos datos se completan con <strong>«Desconocido»</strong> y el acta se firma igual:</p>
                <ul>{faltan.map((x) => <li key={`${x.p.id}-${x.t}`}><strong>{x.p.corto}:</strong> {x.t}</li>)}</ul>
                <fieldset className="form-group">
                  <legend>¿Por qué no se pudieron cargar?</legend>
                  <div className="opciones-grandes">
                    {MOTIVOS_INCOMPLETA.map((m) => (
                      <label key={m.v} className={`opcion-grande ${motivoSel === m.v ? 'activa' : ''}`}>
                        <input type="radio" name="motivo-incompleta" checked={motivoSel === m.v} onChange={() => setMotivoSel(m.v)} />
                        <span>{m.t}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {motivoSel === 'otro' ? <textarea className="form-control" rows={2} placeholder="Explique el motivo" value={motivoOtro} onChange={(e) => setMotivoOtro(e.target.value)} aria-label="Otro motivo" /> : null}
              </div>
              <div className="modal-fake-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setMotivoModal(false)}>Volver a completar</button>
                <button type="button" className="btn btn-success" disabled={!motivo || guardando} onClick={() => { setMotivoModal(false); void firmarYConfirmar(motivo); }}>Completar y firmar</button>
              </div>
            </div>
          </div>
        );
      })() : null}

      {salidaBloqueada ? (
        <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && setSalidaBloqueada(false)}>
          <div className="modal-fake modal-fake-sm" role="alertdialog" aria-modal="true" aria-label="El acta se tiene que terminar">
            <div className="modal-fake-header">
              <i className="fa-solid fa-circle-info" aria-hidden="true" />
              <h2>Termine el acta {form.legajoNumeroActa}</h2>
            </div>
            <div className="modal-fake-body">
              <p className="mb-0">Un acta iniciada se termina sí o sí. Si faltan datos, al firmar se completan con «Desconocido» indicando el motivo.{restanMs !== null ? ` Si no se firma antes de ${fechaHora(venceAt)}, queda como «Acta abandonada».` : ''}</p>
            </div>
            <div className="modal-fake-footer">
              <button type="button" className="btn btn-primary" onClick={() => setSalidaBloqueada(false)}>Seguir con el acta</button>
            </div>
          </div>
        </div>
      ) : null}

      {pidePin ? (
        <div className="modal-fake-overlay">
          <div className="modal-fake modal-fake-sm" role="dialog" aria-modal="true" aria-label="PIN del inspector">
            <div className="modal-fake-header">
              <i className="fa-solid fa-lock" aria-hidden="true" />
              <h2>PIN del inspector</h2>
              <button type="button" aria-label="Cerrar" onClick={() => { setPidePin(null); setPin(''); setPinError(''); }}>&times;</button>
            </div>
            <div className="modal-fake-body">
              <p>El equipo pasó al infractor para firmar. Para salir de la firma, ingrese su PIN.</p>
              <InputPin valor={pin} onChange={(v) => { setPin(v); setPinError(''); }} onEnter={() => void validarPin()} />
              {pinError ? <p className="texto-error mt-2 mb-0" role="alert">{pinError}</p> : null}
            </div>
            <div className="modal-fake-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => { setPidePin(null); setPin(''); setPinError(''); }}>Cancelar</button>
              <button type="button" className="btn btn-primary" disabled={!pin} onClick={() => void validarPin()}>Continuar</button>
            </div>
          </div>
        </div>
      ) : null}

      {vencida ? (
        <div className="modal-fake-overlay">
          <div className="modal-fake modal-fake-sm" role="alertdialog" aria-modal="true" aria-label="Venció el plazo de labrado">
            <div className="modal-fake-header">
              <i className="fa-solid fa-hourglass-end" aria-hidden="true" />
              <h2>Venció el plazo de labrado</h2>
            </div>
            <div className="modal-fake-body">
              <p className="mb-0">El acta {form.legajoNumeroActa} no se firmó a tiempo: queda como <strong>«Acta abandonada»</strong> (número anulado).</p>
            </div>
            <div className="modal-fake-footer">
              <button type="button" className="btn btn-primary" onClick={() => { void apiClient.saveInfraccion(form).catch(() => undefined).finally(() => { registrarGuardiaSalida(null); router.push('/private/inicio'); }); }}>Volver al inicio</button>
            </div>
          </div>
        </div>
      ) : null}

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
                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> Buscar por artículo o nombre
                </label>
                <input id="busquedaLey" className="form-control" placeholder="Ej.: 45, estacionar, licencia" autoFocus={typeof window !== 'undefined' && !window.matchMedia('(pointer: coarse)').matches} value={busquedaLey} onChange={(e) => setBusquedaLey(e.target.value)} />
              </div>
              {/* Como en stg (BOD): cada artículo con su botón «Agregar»; una vez agregado queda «Agregado» (no se repite). */}
              <ul className="lista-agregar-articulos">
                {leyesVisibles.map((l) => {
                  const agregado = (form.leyesNombre ?? []).includes(claveLey(l));
                  return (
                    <li key={l.uuid} className={agregado ? 'agregado' : ''}>
                      <div>
                        <strong>{l.articulo || '-'} · {l.nombre}</strong>
                        {l.descripcion ? <span>{l.descripcion}</span> : null}
                        {ALCANCE.fotoPorArticulo && l.requiereFoto ? <span className="texto-ayuda"><i className="fa-solid fa-camera" aria-hidden="true" /> Requiere foto</span> : null}
                      </div>
                      <button type="button" className={`btn btn-sm ${agregado ? 'btn-secondary' : 'btn-primary'}`} disabled={agregado || !habilitado}
                        onClick={() => patch({ leyesNombre: [...(form.leyesNombre ?? []), claveLey(l)] })}>
                        {agregado ? <><i className="fa-solid fa-check" aria-hidden="true" /> Agregado</> : 'Agregar'}
                      </button>
                    </li>
                  );
                })}
                {!leyesVisibles.length ? <li className="vacio">Sin artículos para «{busquedaLey}»</li> : null}
              </ul>
            </div>
            <div className="modal-fake-footer">
              <span>
                <strong>{form.leyesNombre?.length ?? 0}</strong> agregados
              </span>
              <button type="button" className="btn btn-success" onClick={() => setMostrarLeyes(false)}>Listo</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
