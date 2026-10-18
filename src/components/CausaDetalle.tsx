'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { exportarApremios } from '@/lib/apremios-client';
import { ArticulosValorizacion } from './ArticulosValorizacion';
import Link from 'next/link';
import { LoaderLogo } from './LoaderLogo';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { http } from '@/lib/api-client';
import { printTicket } from '@/lib/print';
import { ESTADOS_CAUSA, TIPOS_ACTA, claveLey, estadoFinal, fechaCorta, fechaHora, infoEstado, pesos, puede, tipoActa } from '@/lib/dominio';
import { useAuthUser } from '@/lib/use-auth-user';
import type { Infraccion } from '@/lib/types';
import { RoadmapCausa } from './RoadmapCausa';
import { BotonVerActa, GaleriaFotos } from './ActaEvidencia';
import { EstadoChip } from './EstadoChip';
import { ModalForm, type CampoModal } from './ModalForm';
import { useNotify } from './NotifyProvider';
import { Plazo } from './Plazo';
import { TarjetaPresentacion } from './TarjetaPresentacion';
import { caminoInfractor, descargoPendiente } from '@/lib/camino';
import { estadosOrigen, previstaPara, tiposDePlantilla } from '@/lib/plantillas';
import { proximoPaso, type AccionPaso } from '@/lib/proximo-paso';
import { useRefresco } from '@/lib/use-refresco';

type R = Record<string, any>;
type Detalle = {
  acta: Infraccion; actaVigente: Infraccion | null; subsanacion: R | null; subsanables: { k: string; t: string; grupo: string; valor: string }[]; memos: R[]; historial: R[]; documentos: R[]; presentaciones: R[]; boletas: R[]; notificaciones: R[]; imagenes: R[];
  valorizacion: { uf: number; unidades: number; subtotal?: number; multa: number; valores?: { fijados: boolean; fecha: number | null; ufVigente: number; difiere: boolean }; leyes: R[]; ajustado: number | null; motivoAjuste: string | null };
};
type Modal = { titulo: string; icono?: string; campos: CampoModal[]; accion: string; textoOk?: string; textoCancelar?: string; onNo?: () => Promise<void> | void; peligro?: boolean; aviso?: string; extra?: R } | null;

const TABS = [
  { id: 'resumen', t: 'Acta' },
  { id: 'historial', t: 'Historial' },
  { id: 'documentos', t: 'Escritos y documentos' },
  { id: 'presentaciones', t: 'Presentaciones' },
  { id: 'pagos', t: 'Boletas y pagos' },
  { id: 'notificaciones', t: 'Notificaciones' },
  { id: 'memos', t: 'Memos internos' },
] as const;

const TIPO_PRES: Record<string, string> = { pago_voluntario: 'Pago voluntario', boleta: 'Boleta', cuotas: 'Plan de cuotas', descargo: 'Descargo', apelacion: 'Apelación' };
const ESTADO_DOC: Record<string, string> = { borrador: 'Borrador', en_revision: 'En revisión', devuelto: 'Devuelto', firmado: 'Firmado', definitivo: 'Definitivo' };
const ESTADO_BOL: Record<string, string> = { emitida: 'Emitida', a_verificar: 'A verificar', definitiva: 'Pagada (definitiva)', vencida: 'Vencida', anulada: 'Anulada' };

export function CausaDetalle() {
  const { uuid } = useParams() as { uuid: string };
  const router = useRouter();
  const notify = useNotify();
  const user = useAuthUser();
  const [d, setD] = useState<Detalle | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('resumen');
  const [modal, setModal] = useState<Modal>(null);
  const [plantillas, setPlantillas] = useState<R[]>([]);
  const [motivos, setMotivos] = useState<string[]>([]);
  const [leyesCat, setLeyesCat] = useState<R[]>([]);
  const [vista, setVista] = useState<'subsanada' | 'original'>('subsanada');
  const [memo, setMemo] = useState('');

  // Si la primera carga falla (causa inexistente o de un tipo de acta fuera del alcance del usuario) se muestra el
  // error en pantalla en lugar de quedar «Cargando causa…», y no se reintenta solo hasta que el usuario lo pida.
  const [error, setError] = useState<string | null>(null);
  const cargadaDe = useRef<string | null>(null);
  const falloDe = useRef<string | null>(null);
  const cargar = useCallback(() => {
    if (falloDe.current === uuid) return;
    http.get<Detalle>(`/api/causa/${uuid}`)
      .then((x) => { cargadaDe.current = uuid; setError(null); setD(x); })
      .catch((e: Error) => {
        if (cargadaDe.current === uuid) { notify.error('No se pudo cargar la causa', e.message); return; }
        falloDe.current = uuid;
        setError(e.message);
      });
  }, [uuid, notify]);
  const reintentar = () => { falloDe.current = null; setError(null); cargar(); };

  // Sin F5: se recarga sola tras cualquier acción, al volver a la pestaña y cada 20 s (portal, otros usuarios).
  useRefresco(cargar);

  useEffect(() => {
    cargar();
    http.get<R[]>('/api/plantillas').then(setPlantillas).catch(() => undefined);
    http.get<R>('/api/constantes/all').then((c) => { setMotivos((c.motivosArchivo ?? []).map((m: R) => m.nombre)); setLeyesCat(c.leyes ?? []); }).catch(() => undefined);
  }, [cargar]);

  async function accion(nombre: string, datos: R = {}, ok = 'Listo') {
    try {
      const r = await http.post<R>('/api/causa/accion', { uuid, accion: nombre, datos });
      notify.success(ok);
      setModal(null);
      cargar();
      return r;
    } catch (e) {
      notify.error('No se pudo completar', (e as Error).message);
      return null;
    }
  }

  const c = d?.acta;
  const estado = c?.estadoFaltas ?? '';
  const tipo = tipoActa(c?.infraccionTipoNombre);
  const gestion = puede(user?.rol, 'gestionarCausas');
  const final = estadoFinal(estado);
  const pendientes = (d?.presentaciones ?? []).filter((p) => p.estado === 'pendiente');
  // Plantillas del tipo de acta; primero las previstas para el estado actual de la causa (SF-36).
  const plantillasTipo = useMemo(() => {
    const delTipo = plantillas.filter((p) => tiposDePlantilla(p.tipo_acta).includes(tipo));
    const rec = (p: R) => Boolean(estadosOrigen(p.estados_origen)?.includes(estado));
    return [...delTipo.filter(rec), ...delTipo.filter((p) => !rec(p))].map((p): R => ({ ...p, recomendada: rec(p), prevista: previstaPara(p.estados_origen, estado) }));
  }, [plantillas, tipo, estado]);
  const cuotasVencidas = (d?.boletas ?? []).some((b) => b.estado === 'emitida' && Number(b.vencimiento) < Date.now());
  const busqueda = useSearchParams();
  const [falloPedido, setFalloPedido] = useState(busqueda.get('fallo') === '1');

  if (error && falloDe.current === uuid) {
    return (
      <div className="pagina">
        <div className="card-step mb-3 text-center">
          <h1>No se pudo abrir la causa</h1>
          <p className="texto-ayuda">
            {error === 'Causa no encontrada' ? 'La causa no existe o corresponde a un tipo de acta que su usuario no gestiona.' : error}
          </p>
          <div className="d-flex gap-2 justify-content-center">
            <button type="button" className="btn btn-outline-primary" onClick={() => router.back()}>Volver</button>
            <button type="button" className="btn btn-primary" onClick={reintentar}>Reintentar</button>
          </div>
        </div>
      </div>
    );
  }

  if (!d || !c) {
    return <LoaderLogo texto="Cargando causa…" pantalla />;
  }

  const abrirEscrito = () =>
    setModal({
      titulo: 'Generar escrito desde plantilla', icono: 'fa-solid fa-file-circle-plus', accion: 'generar_escrito', textoOk: 'Generar y editar',
      aviso: 'El escrito se completa con los datos del acta. Después lo puede editar antes de dejarlo definitivo.',
      campos: [{ k: 'plantillaId', t: 'Plantilla', tipo: 'buscar', req: true, placeholder: 'Buscar por nombre, categoría, estado o texto (ej.: «compromiso pago», «fallo», «cuotas»)', ayuda: 'Se muestran las mejores coincidencias. Use ↑ ↓ y Enter para elegir.', opciones: plantillasTipo.map((p) => ({ v: String(p.id), t: p.titulo, sub: `${p.recomendada ? '★ Recomendada · ' : p.prevista ? '' : `No prevista para «${estado}» · `}${p.categoria}${p.estado_resultante ? ` · la causa pasa a «${p.estado_resultante}»` : ''}`, extra: `${p.codigo ?? ''} ${String(p.contenido_html ?? '').replace(/<[^>]+>/g, ' ').slice(0, 600)}` })) }],
    });

  const plantillaPorCodigo = (codigo: string) => plantillas.find((p) => p.codigo === codigo);
  const generarDesde = async (codigo: string) => {
    const pl = plantillaPorCodigo(codigo);
    if (!pl) return notify.error('Plantilla inexistente', codigo);
    const r = await accion('generar_escrito', { plantillaId: pl.id }, 'Escrito generado');
    if (r?.uuid) router.push(`/private/escrito/${r.uuid}`);
  };
  const tieneEscrito = (codigo: string) => d.documentos.some((x) => x.plantilla?.codigo === codigo);

  const presT = d.presentaciones as { tipo: string; estado: string; date_created?: number }[];
  const descPend = descargoPendiente(presT);
  const camino = caminoInfractor({ estado_faltas: estado, notificada_at: c.notificadaAt, vence_plazo_at: c.vencePlazoAt }, presT);
  const abrirFallo = () => setModal({ titulo: 'Dictar fallo', icono: 'fa-solid fa-scale-balanced', accion: 'generar_escrito', textoOk: 'Generar y editar', aviso: 'El fallo se genera desde plantilla, va a revisión y firma de la Directora y después se notifica.', campos: [{ k: 'plantillaId', t: 'Tipo de fallo', tipo: 'select', opciones: ['FALLO_CONDENATORIO', 'FALLO_ABSOLUTORIO'].map((cod) => plantillaPorCodigo(cod)).filter(Boolean).map((p) => ({ v: String(p!.id), t: p!.titulo })) }] });
  const puedeFallo = gestion && ['Descargo', 'Notificado', 'Cuotas', 'Esp. Acreditar Pago'].includes(estado) && !tieneEscrito('FALLO_CONDENATORIO') && !tieneEscrito('FALLO_ABSOLUTORIO');
  if (falloPedido && plantillas.length) { setFalloPedido(false); if (puedeFallo && !descPend) abrirFallo(); }
  const presentacionResuelta = (p: R, acc: string) => {
    notify.success('Presentación resuelta', 'Se notificó la respuesta al infractor.', p.tipo === 'descargo' && acc === 'aceptar' ? { texto: 'Dictar fallo', on: abrirFallo } : undefined);
    cargar();
  };
  const adjuntosDe = (p: R) => d.documentos.filter((x) => x.presentacion_id === p.id).map((x) => ({ uuid: x.uuid, titulo: x.titulo }));
  const causaTarjeta = { uuid, legajo_numero_acta: c.legajoNumeroActa, infraccion_tipo_nombre: c.infraccionTipoNombre, estado_faltas: estado, vence_plazo_at: c.vencePlazoAt, infractor_nombre: c.infractorNombre, infractor_razon_social: c.infractorRazonSocial };

  // rec: acción que corresponde al estado actual de la causa → «Acciones recomendadas». El resto, «Más acciones».
  const noEspera = d.historial.some((h) => h.accion === 'No se espera al infractor');
  const botones: { t: string; i: string; on: () => void; ver: boolean; peligro?: boolean; destacado?: boolean; deshabilitado?: string; rec?: boolean }[] = [
    { t: 'Esperar al infractor', i: 'fa-solid fa-hourglass-half', rec: true, ver: gestion && estado === 'Iniciado' && !noEspera && !c.notificadaAt, on: () => setModal({
      titulo: 'Esperar al infractor', icono: 'fa-solid fa-hourglass-half', accion: 'esperar_infractor', textoOk: 'Sí', textoCancelar: 'No', campos: [], extra: { esperar: 'si' },
      aviso: 'Esta causa acaba de abrirse, y el infractor aún no visualizó el acta digital, ¿desea pasar la causa al siguiente estado para esperar al infractor?',
      onNo: async () => { await accion('esperar_infractor', { esperar: 'no' }, 'Listo: puede considerarlo notificado cuando corresponda'); },
    }) },
    { t: 'Considerar notificado', i: 'fa-solid fa-envelope-circle-check', rec: true, ver: gestion && !c.notificadaAt && ((estado === 'Iniciado' && noEspera) || estado === 'En notificación'), on: () => setModal({
      titulo: 'Considerar notificado', icono: 'fa-solid fa-envelope-circle-check', accion: 'considerar_notificado', textoOk: 'Sí', textoCancelar: 'No', campos: [],
      aviso: 'Considera usted que el infractor tuvo el tiempo suficiente de acceder al sitio web de infractores para visualizar su acta digital, por lo tanto, se lo considera notificado y procederá a trabajar en la causa, ¿decide proceder?',
    }) },
    { t: 'Resolución de medida preventiva', rec: true, i: 'fa-solid fa-gavel', ver: gestion && c.medidaVigente === 1 && !tieneEscrito('RESOLUCION_MEDIDA_PREVENTIVA') && !final, destacado: true, on: () => void generarDesde('RESOLUCION_MEDIDA_PREVENTIVA') },
    { t: 'Disposición de levantamiento', rec: true, i: 'fa-solid fa-lock-open', ver: gestion && c.medidaVigente === 1 && !tieneEscrito('DISPOSICION_LEVANTAMIENTO'), on: () => void generarDesde('DISPOSICION_LEVANTAMIENTO') },
    { t: 'Dictar fallo', rec: true, i: 'fa-solid fa-scale-balanced', ver: puedeFallo, deshabilitado: descPend ? 'Hay un descargo sin resolver: resuélvalo primero (aceptar, observar o rechazar).' : undefined, on: abrirFallo },
    { t: 'Generar escrito', i: 'fa-solid fa-file-circle-plus', on: abrirEscrito, ver: puede(user?.rol, 'redactarEscritos') && !final, destacado: true },
    { t: 'Emitir boleta', rec: ['Notificado', 'Fallo notificado'].includes(estado), i: 'fa-solid fa-receipt', ver: puede(user?.rol, 'emitirBoletas') && !final && !['Esp. Acreditar Pago', 'Cuotas', 'En Juzgado', 'En Apremios'].includes(estado), on: () => setModal({
      titulo: 'Emitir boleta (Malvinas 2000 simulado)', icono: 'fa-solid fa-receipt', accion: 'emitir_boleta', textoOk: 'Emitir',
      campos: [
        { k: 'modo', t: 'Tipo', tipo: 'select', opciones: [{ v: 'voluntario', t: 'Pago voluntario (50 %)' }, { v: 'total', t: 'Sin beneficio (100 %)' }, { v: 'cuotas', t: 'Plan de cuotas' }] },
        { k: 'cuotas', t: 'Cantidad de cuotas (solo plan de cuotas)', tipo: 'numero', valor: '3' },
        { k: 'aNombre', t: 'A nombre de (quien firma el compromiso)', tipo: 'texto', valor: String(c.infractorRazonSocial || c.infractorNombre || '') },
      ],
    }) },
    { t: 'Boleta de estadía', rec: true, i: 'fa-solid fa-warehouse', ver: puede(user?.rol, 'emitirBoletas') && c.retencionDeVehiculo === 1 && !final, on: () => setModal({ titulo: 'Boleta de estadía', accion: 'emitir_estadia', icono: 'fa-solid fa-warehouse', aviso: 'Se cobra al retirar el vehículo. La fecha de ingreso al depósito la carga Faltas.', campos: [{ k: 'ingreso', t: 'Fecha de ingreso al depósito', tipo: 'fecha', req: true }], extra: { conv: 'ingreso' } }) },
    { t: 'Ajustar valorización', i: 'fa-solid fa-scale-unbalanced', ver: gestion && !final, on: () => setModal({ titulo: 'Ajustar valorización', accion: 'ajustar_monto', icono: 'fa-solid fa-scale-unbalanced', campos: [{ k: 'monto', t: 'Monto de la multa ($)', tipo: 'numero', req: true, valor: String(d.valorizacion.multa) }, { k: 'motivo', t: 'Motivo', tipo: 'area', req: true, ayuda: 'Por ejemplo: falta de exhibición de documentación acreditada luego.' }] }) },
    { t: 'Continuar procedimiento', rec: true, i: 'fa-solid fa-forward', ver: gestion && estado === 'Cuotas' && cuotasVencidas, peligro: true, on: () => setModal({ titulo: 'Caducidad del plan de cuotas', accion: 'continuar_procedimiento', campos: [], aviso: 'Hay cuotas vencidas sin pagar. La causa sigue a fallo, o a Apremios si las cuotas eran de un fallo.', textoOk: 'Continuar' }) },
    { t: 'Derivar a Apremios', rec: true, i: 'fa-solid fa-building-columns', ver: gestion && ['Fallo notificado', 'Cuotas'].includes(estado), on: () => setModal({ titulo: 'Derivar a Apremios', accion: 'derivar', extra: { destino: 'apremios' }, campos: [{ k: 'detalle', t: 'Detalle', tipo: 'area', valor: 'Vencido el plazo de 5 días hábiles sin pago ni apelación. Se remite el legajo completo en PDF.' }] }) },
    { t: 'Derivar a Juzgado de Paz', rec: true, i: 'fa-solid fa-landmark', ver: gestion && estado === 'Fallo notificado', on: () => setModal({ titulo: 'Derivar al Juzgado de Paz', accion: 'derivar', extra: { destino: 'juzgado' }, campos: [{ k: 'detalle', t: 'Detalle', tipo: 'area', valor: 'Apelación concedida. Se remite el legajo completo en PDF.' }] }) },
    { t: 'Exportar para Apremios', i: 'fa-solid fa-file-export', rec: ['Fallo notificado', 'En Apremios'].includes(estado), ver: gestion && !['Borrador', 'Anulada'].includes(estado), on: () => setModal({ titulo: 'Exportar para Apremios', icono: 'fa-solid fa-file-export', accion: 'exportar_apremios', textoOk: 'Generar PDF', aviso: 'Se genera un PDF con el remito, la carátula con el saldo adeudado a hoy y el legajo completo (sin memos internos), para enviarlo a Apremios por correo. Queda constancia en el historial.', campos: estado === 'En Apremios' ? [] : [{ k: 'derivar', t: 'Pasar la causa a «En Apremios»', tipo: 'select', opciones: [{ v: 'si', t: 'Sí, derivarla ahora' }, { v: 'no', t: 'No, solo generar el PDF' }] }] }) },
    { t: 'Registrar resultado externo', rec: true, i: 'fa-solid fa-flag-checkered', ver: gestion && infoEstado(estado).familia === 'externo', on: () => setModal({ titulo: 'Resultado informado por Juzgado de Paz o Apremios', accion: 'resultado_externo', campos: [{ k: 'estado', t: 'Resultado', tipo: 'select', opciones: ['Pago en Apremios', 'Archivo judicial', 'Archivo absolución', 'Archivo nulidad', 'Archivo prescripción'].map((x) => ({ v: x, t: x })) }, { k: 'detalle', t: 'Detalle', tipo: 'area' }] }) },
    { t: 'Presentación en mesa', i: 'fa-solid fa-person-walking', ver: gestion && !final, on: () => setModal({ titulo: 'Registrar presentación en mesa', accion: 'presentacion_mesa', campos: [{ k: 'tipo', t: 'Tipo', tipo: 'select', opciones: Object.entries(TIPO_PRES).map(([v, t]) => ({ v, t })) }, { k: 'texto', t: 'Detalle', tipo: 'area', req: true }, { k: 'cuotas', t: 'Cuotas solicitadas', tipo: 'numero' }] }) },
    { t: 'Adjuntar documento', i: 'fa-solid fa-paperclip', ver: puede(user?.rol, 'redactarEscritos'), on: () => setModal({ titulo: 'Adjuntar documento escaneado', accion: 'adjuntar', icono: 'fa-solid fa-paperclip', campos: [{ k: 'titulo', t: 'Título', tipo: 'texto', req: true }, { k: 'archivo', t: 'Archivo (imagen o PDF)', tipo: 'archivo', req: true }], extra: { conv: 'archivo' } }) },
    { t: d.subsanacion ? 'Ver subsanación' : 'Subsanar datos', i: 'fa-solid fa-pen-to-square', ver: puede(user?.rol, 'subsanar') || Boolean(d.subsanacion), on: () => (d.subsanacion ? (setTab('resumen'), setVista('subsanada'), window.scrollTo({ top: 0, behavior: 'smooth' })) : setModal({
      titulo: 'Subsanar datos del acta', accion: 'subsanar', icono: 'fa-solid fa-pen-to-square', textoOk: 'Guardar subsanación', extra: { conv: 'subsanar' },
      aviso: 'Corrija solo los datos que correspondan. El acta firmada no se modifica: la corrección se guarda aparte, se genera una constancia y se usa en adelante. Solo se puede subsanar una vez.',
      campos: [
        ...d.subsanables.filter((f) => f.k !== 'leyes' && !(tipo === 'contravenciones' && f.grupo === 'Vehículo')).map((f) => ({ k: f.k, t: `${f.grupo} · ${f.t}`, tipo: 'texto' as const, valor: f.valor })),
        { k: 'leyes', t: 'Artículos', tipo: 'multi' as const, valor: (d.subsanables.find((f) => f.k === 'leyes')?.valor ?? '').split(' | ').filter(Boolean).join(','), opciones: leyesCat.filter((l) => tipoActa(l.infraccionTipoNombre) === tipo).map((l) => ({ v: claveLey(l as { nombre: string; articulo?: string }), t: `${claveLey(l as { nombre: string; articulo?: string })} — ${l.descripcion ?? ''}` })) },
        { k: 'motivo', t: 'Motivo de la subsanación', tipo: 'area' as const, req: true },
      ],
    })) },
    { t: 'Memo interno', i: 'fa-solid fa-note-sticky', ver: puede(user?.rol, 'memos'), on: () => { setTab('memos'); setTimeout(() => document.getElementById('memo-nuevo')?.focus(), 50); } },
    { t: 'Cambiar estado', i: 'fa-solid fa-arrows-rotate', ver: puede(user?.rol, 'cambiarEstadoManual'), on: () => setModal({ titulo: 'Cambiar estado manualmente', accion: 'cambiar_estado', campos: [{ k: 'estado', t: 'Nuevo estado', tipo: 'select', opciones: ESTADOS_CAUSA.map((e) => ({ v: e.nombre, t: e.nombre })) }, { k: 'motivo', t: 'Motivo', tipo: 'area', req: true }] }) },
    { t: 'Archivar', i: 'fa-solid fa-box-archive', ver: puede(user?.rol, 'archivar') && !final, on: () => setModal({ titulo: 'Archivar causa', accion: 'archivar', campos: [{ k: 'motivo', t: 'Tipo de archivo', tipo: 'select', opciones: motivos.map((m) => ({ v: m, t: m })) }, { k: 'detalle', t: 'Detalle', tipo: 'area' }], aviso: c.medidaVigente === 1 ? 'La causa tiene una medida vigente: el archivo por pago no procede hasta su levantamiento.' : undefined }) },
    { t: 'Reingresar', rec: true, i: 'fa-solid fa-rotate-left', ver: puede(user?.rol, 'archivar') && final, on: () => setModal({ titulo: 'Reingresar causa archivada', accion: 'reingresar', campos: [{ k: 'motivo', t: 'Motivo', tipo: 'area', req: true }] }) },
    { t: 'Desestimar', i: 'fa-solid fa-ban', ver: puede(user?.rol, 'archivar') && !final, peligro: true, on: () => setModal({ titulo: 'Desestimar causa', accion: 'desestimar', peligro: true, textoOk: 'Desestimar', aviso: 'La causa se cierra sin eliminarse: queda el registro completo.', campos: [{ k: 'motivo', t: 'Motivo', tipo: 'area', req: true }] }) },
  ];

  // Próximo paso: qué falta, quién actúa y con qué acción se avanza (arriba de la causa).
  const paso = proximoPaso({
    estado, vencePlazoAt: c.vencePlazoAt, notificadaAt: c.notificadaAt, medidaVigente: c.medidaVigente === 1,
    documentos: d.documentos, notificaciones: d.notificaciones, presentaciones: d.presentaciones, boletas: d.boletas, cuotasVencidas,
    botones: botones.filter((b) => b.ver && !b.deshabilitado).map((b) => b.t),
  });
  const considerarDoc = (docUuid: string, titulo?: string) => setModal({
    titulo: 'Considerar notificado', icono: 'fa-solid fa-envelope-circle-check', accion: 'considerar_notificado_documento', textoOk: 'Sí, considerar notificado', campos: [], extra: { documentoUuid: docUuid },
    aviso: `El infractor no abrió ${titulo ? `«${titulo}»` : 'el documento'} en el portal. ¿Considera que tuvo tiempo suficiente para verlo? Se lo da por notificado y empieza a correr el plazo que corresponda.`,
  });
  const ejecutarPaso = (a: AccionPaso) => {
    if (a.tipo === 'boton') return botones.find((b) => b.t === a.boton)?.on();
    if (a.tipo === 'notificar') return void accion('notificar_documento', { documentoUuid: a.uuid }, 'Notificación iniciada');
    if (a.tipo === 'considerarDoc') return considerarDoc(a.uuid, d.documentos.find((x) => x.uuid === a.uuid)?.titulo);
    if (a.tipo === 'tab') { setTab(a.tab as (typeof TABS)[number]['id']); return; }
    router.push(a.href);
  };
  const QUIEN_ICONO: Record<string, string> = { Agente: 'fa-solid fa-user-tie', 'Directora / Responsable': 'fa-solid fa-signature', Infractor: 'fa-solid fa-user', 'Organismo externo': 'fa-solid fa-landmark', Nadie: 'fa-solid fa-check' };

  const subCampos = (d.subsanacion?.campos ?? {}) as Record<string, { antes: string; despues: string }>;
  const verSubsanada = Boolean(d.subsanacion && d.actaVigente && vista === 'subsanada');
  const cf: Infraccion = verSubsanada ? d.actaVigente! : c;
  const marcaCambio = (ks: string[]) => {
    const hay = verSubsanada ? ks.filter((k) => subCampos[k]) : [];
    return hay.length ? { className: 'dato-subsanado', title: `Antes: ${hay.map((k) => `${d.subsanables.find((f) => f.k === k)?.t ?? k}: ${subCampos[k].antes || '—'}`).join(' · ')}` } : {};
  };

  async function confirmarModal(v: Record<string, string>) {
    if (!modal) return;
    const datos: R = { ...v, ...(modal.extra ?? {}) };
    if (modal.extra?.conv === 'archivo') { datos.archivoRaw = v.archivo; datos.archivoNombre = v.archivoNombre; }
    if (modal.extra?.conv === 'ingreso') datos.ingresoAt = new Date(`${v.ingreso}T12:00`).getTime();
    if (modal.extra?.conv === 'subsanar') {
      const { motivo, ...campos } = v;
      await accion('subsanar', { motivo, campos: { ...campos, leyes: (campos.leyes ?? '').split(',').filter(Boolean).join(' | ') } }, 'Subsanación guardada');
      return;
    }
    if (modal.accion === 'exportar_apremios') {
      try {
        await exportarApremios([uuid], v.derivar !== 'no');
        setModal(null);
        cargar();
      } catch (e) {
        notify.error('No se pudo exportar', (e as Error).message);
      }
      return;
    }
    if (modal.accion === 'generar_escrito') {
      const r = await accion('generar_escrito', { plantillaId: Number(v.plantillaId) }, 'Escrito generado');
      if (r?.uuid) router.push(`/private/escrito/${r.uuid}`);
      return;
    }
    await accion(modal.accion, datos);
  }

  return (
    <div className="pagina">
      <RoadmapCausa estado={estado} historial={d.historial} medidaVigente={c.medidaVigente === 1} camino={camino} />
      <div className="card-step mb-3">
        <div className="causa-cabecera">
          <h1>{c.legajoNumeroActa}</h1>
          <EstadoChip estado={estado} medida={c.medidaVigente === 1} />
          <Plazo vence={c.vencePlazoAt} estado={estado} ocultarSinPlazo />
          <span className="sub">
            {TIPOS_ACTA[tipo].titulo} · Legajo {c.legajoNumber}/{c.legajoAnio} · {c.infractorRazonSocial || c.infractorNombre || 'NN'} · En el portal se ve como «{infoEstado(estado).portal}»
          </span>
        </div>
        <div className="tabs-causa" role="tablist">
          {TABS.map((t) => {
            const n = t.id === 'historial' ? d.historial.length : t.id === 'documentos' ? d.documentos.length : t.id === 'presentaciones' ? d.presentaciones.length : t.id === 'pagos' ? d.boletas.length : t.id === 'notificaciones' ? d.notificaciones.length : t.id === 'memos' ? d.memos.length : 0;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`tab-causa ${tab === t.id ? 'activa' : ''}`} onClick={() => setTab(t.id)}>
                {t.t} {n ? <span className="n">{n}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <section className={`proximo-paso proximo-${paso.tono}`} aria-label="Próximo paso">
        <div className="proximo-paso-icono" aria-hidden="true"><i className={paso.tono === 'fin' ? 'fa-solid fa-flag-checkered' : paso.tono === 'alerta' ? 'fa-solid fa-triangle-exclamation' : paso.tono === 'espera' ? 'fa-solid fa-hourglass-half' : 'fa-solid fa-arrow-right'} /></div>
        <div className="proximo-paso-texto">
          <span className="proximo-paso-etiqueta">Próximo paso</span>
          <strong>{paso.titulo}</strong>
          {paso.detalle ? <span className="proximo-paso-detalle">{paso.detalle}</span> : null}
          <span className="proximo-paso-quien"><i className={QUIEN_ICONO[paso.quien]} aria-hidden="true" /> {paso.quien === 'Nadie' ? 'Sin pendientes' : `Le toca: ${paso.quien}`}</span>
        </div>
        {paso.acciones.length ? (
          <div className="proximo-paso-acciones">
            {paso.acciones.map((a, i) => (
              <button key={`${a.tipo}-${i}`} type="button" className={`btn ${i === 0 ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => ejecutarPaso(a)}>
                {a.tipo === 'boton' ? (a.t ?? a.boton) : a.t}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <div className="causa-layout">
        <div className="card-step">
          <div className="card-step-body">
            {pendientes.map((p) => (
              <TarjetaPresentacion key={p.uuid} p={p} causa={causaTarjeta} adjuntos={adjuntosDe(p)} gestion={puede(user?.rol, 'resolverPresentaciones')} destacada onResuelta={presentacionResuelta} />
            ))}

            {tab === 'resumen' ? (
              <>
                {camino.id !== 'sin_notificar' ? (
                  <div className={`camino-infractor camino-${camino.id}`}>
                    <i className={`fa-solid ${camino.id === 'pago' ? 'fa-money-bill-wave' : camino.id === 'descargo' ? 'fa-comment-dots' : camino.id === 'ignorado' ? 'fa-hourglass-end' : 'fa-signs-post'}`} aria-hidden="true" />
                    <span>Camino del infractor: <strong>{camino.titulo}</strong>{camino.fecha && camino.id !== 'pendiente' ? ` · ${fechaHora(camino.fecha)}` : ''}{camino.id === 'pendiente' && camino.fecha ? ` · vence ${fechaCorta(camino.fecha)}` : ''}</span>
                    {camino.detalle ? <span className="texto-ayuda">{camino.detalle}</span> : null}
                  </div>
                ) : null}
                {d.subsanacion ? (
                  <>
                    <div className="selector-acta" role="tablist" aria-label="Versión del acta">
                      <button type="button" role="tab" aria-selected={vista === 'subsanada'} className={vista === 'subsanada' ? 'activa' : ''} onClick={() => setVista('subsanada')}><i className="fa-solid fa-pen-to-square" aria-hidden="true" /> Acta subsanada</button>
                      <button type="button" role="tab" aria-selected={vista === 'original'} className={vista === 'original' ? 'activa' : ''} onClick={() => setVista('original')}><i className="fa-solid fa-file-signature" aria-hidden="true" /> Acta original</button>
                    </div>
                    {vista === 'subsanada' ? (
                      <div className="aviso aviso-info">
                        <strong>Datos subsanados</strong> por {d.subsanacion.usuario} el {fechaHora(d.subsanacion.date_created)}. Motivo: {d.subsanacion.motivo}. Los datos corregidos están resaltados (pase el mouse para ver el valor anterior).
                      </div>
                    ) : <div className="aviso aviso-alerta">Acta tal como se firmó (solo lectura).</div>}
                  </>
                ) : null}
                <dl className="ficha">
                  <div><dt>Fecha y hora</dt><dd>{String(cf.legajoFecha ?? '').replace('T', ' ')}</dd></div>
                  <div {...marcaCambio(["domicilio_infraccion_calle", "domicilio_infraccion_numero", "domicilio_infraccion_localidad_nombre"])}><dt>Lugar de infracción</dt><dd>{[[cf.domicilioInfraccionCalle, cf.domicilioInfraccionNumero].filter(Boolean).join(' ') + (cf.entreCalle1 ? ` (entre ${cf.entreCalle1} y ${cf.entreCalle2 ?? ''})` : ''), cf.domicilioInfraccionLocalidadNombre].filter(Boolean).join(' · ')}</dd></div>
                  <div><dt>Legajo</dt><dd>{cf.legajoNumber || '-'}</dd></div>
                  <div><dt>Año</dt><dd>{cf.legajoAnio || '-'}</dd></div>
                  <div><dt>Ejido</dt><dd>{cf.ejido === 'dentro' ? 'Dentro del ejido urbano' : cf.ejido === 'fuera' ? 'Fuera del ejido urbano' : 'Sin determinar'}{gestion && !final ? <button type="button" className="btn btn-link btn-sm py-0" onClick={() => setModal({ titulo: 'Ejido urbano', icono: 'fa-solid fa-map-location-dot', accion: 'corregir_ejido', textoOk: 'Guardar', campos: [{ k: 'ejido', t: 'Ejido', tipo: 'select', req: true, valor: cf.ejido ?? '', opciones: [{ v: 'dentro', t: 'Dentro del ejido urbano' }, { v: 'fuera', t: 'Fuera del ejido urbano' }] }] })}><i className="fa-solid fa-pen" aria-hidden="true" /> Corregir</button> : null}</dd></div>
                  <div {...marcaCambio(["infractor_nombre", "infractor_razon_social", "infractor_documento_numero", "infractor_cuit"])}><dt>Infractor</dt><dd>{cf.situacionInfractor === 'nn' ? 'No identificado (NN)' : `${cf.infractorRazonSocial || cf.infractorNombre || '-'} · ${cf.infractorCuit ? `CUIT ${cf.infractorCuit}` : `${cf.infractorDocumentoTipoNombre ?? ''} ${cf.infractorDocumentoNumero ?? ''}`}`}</dd></div>
                  <div {...marcaCambio(["infractor_domicilio", "infractor_calle_altura", "infractor_departamento", "infractor_localidad_nombre", "infractor_partido_nombre"])}><dt>Domicilio</dt><dd>{[[cf.infractorDomicilio, cf.infractorCalleAltura, cf.infractorDepartamento].filter(Boolean).join(' '), cf.infractorLocalidadNombre, cf.infractorPartidoNombre].filter(Boolean).join(' · ') || '-'}</dd></div>
                  <div><dt>Correo electrónico</dt><dd>{cf.infractorEmail || <span className="texto-ayuda">Sin dato</span>}{gestion && !final ? <button type="button" className="btn btn-link btn-sm py-0" onClick={() => setModal({ titulo: 'Correo del infractor', icono: 'fa-solid fa-at', accion: 'correo_infractor', textoOk: 'Guardar', aviso: 'Completar solo si se conoce el dato. No forma parte del acta.', campos: [{ k: 'correo', t: 'Correo electrónico', tipo: 'texto', valor: cf.infractorEmail ?? '' }] })}><i className="fa-solid fa-pen" aria-hidden="true" /> {cf.infractorEmail ? 'Editar' : 'Agregar'}</button> : null}</dd></div>
                  {tipo !== 'contravenciones' ? <div {...marcaCambio(["vehiculo_numero_dominio", "vehiculo_tipo_nombre", "vehiculo_numero_licencia", "meta.marca", "meta.modelo"])}><dt>Vehículo</dt><dd>{cf.vehiculoNumeroDominio || '-'} {cf.vehiculoTipoNombre ?? ''} {[cf.metadata?.marca, cf.metadata?.modelo].filter(Boolean).join(' ')} {cf.vehiculoNumeroLicencia ? `· Lic. ${cf.vehiculoNumeroLicencia}` : ''}</dd></div> : null}
                  {cf.sustanciasDescripcion ? <div><dt>Sustancias</dt><dd>{cf.sustanciasDescripcion}</dd></div> : null}
                  <div><dt>Medidas</dt><dd>{[cf.retencionDeLicencia ? 'Retención de licencia' : '', cf.retencionDeVehiculo ? 'Retención de vehículo' : '', cf.acarreo ? 'Acarreo' : '', ...(cf.medidasPreventivas ?? [])].filter(Boolean).join(' · ') || 'Ninguna'}{cf.medidaVigente === 1 ? ' (vigente)' : ''}</dd></div>
                  {cf.metadata?.alcoholemia ? <div><dt>Alcoholemia</dt><dd>{cf.metadata.alcoholemia}{cf.metadata.alcoholimetroValor ? ` · ${cf.metadata.alcoholimetroValor} g/l` : ''}</dd></div> : null}
                  <div><dt>Inspector</dt><dd>{cf.inspectorNombre || '-'} · firmó {fechaHora(cf.firmadaAt ?? undefined)}</dd></div>
                  <div><dt>Situación del infractor</dt><dd>{cf.situacionInfractor}</dd></div>
                  <div><dt>Notificada</dt><dd>{cf.notificadaAt ? fechaHora(cf.notificadaAt) : 'Todavía no'}</dd></div>
                  <div {...marcaCambio(["observaciones"])}><dt>Observaciones</dt><dd>{cf.observaciones || '-'}</dd></div>
                </dl>
                {d.subsanacion && vista === 'original' ? (
                  <>
                    <h3 className="subtitulo-paso mt-3">Artículos del acta original</h3>
                    <ul>{(c.leyesNombre ?? []).map((l) => <li key={l}>{l}</li>)}</ul>
                  </>
                ) : (<>
                <h3 className="subtitulo-paso mt-3">Artículos y valorización{subCampos.leyes && verSubsanada ? <span className="dato-subsanado ms-2" title={`Antes: ${subCampos.leyes.antes}`}>subsanados</span> : null}</h3>
                <ArticulosValorizacion
                  leyes={d.valorizacion.leyes as never}
                  uf={d.valorizacion.uf}
                  subtotal={d.valorizacion.subtotal}
                  multa={d.valorizacion.multa}
                  ajustado={d.valorizacion.ajustado}
                  motivoAjuste={d.valorizacion.motivoAjuste}
                  editable={gestion && !final}
                  onGuardar={async (items, motivo) => Boolean(await accion('ajustar_articulos', { items, motivo }, 'Montos por artículo guardados'))}
                  valores={d.valorizacion.valores}
                  onActualizarValores={() => setModal({ titulo: 'Actualizar a valores vigentes', icono: 'fa-solid fa-rotate', accion: 'actualizar_valores', textoOk: 'Actualizar', aviso: `La causa pasa de los valores del labrado (UF ${pesos(d.valorizacion.uf)}) a los vigentes (UF ${pesos(d.valorizacion.valores?.ufVigente ?? 0)}) y a los múltiplos actuales del catálogo. Los montos manuales y los múltiplos ajustados en la causa se mantienen. Queda en el historial.`, campos: [] })}
                />
                </>)}
                {d.imagenes.length ? <div className="mt-2"><GaleriaFotos imagenes={d.imagenes.map((x) => x.preview_raw)} /></div> : null}
                {c.firmaInfractor ? (
                  <div className="mt-2"><span className="texto-ayuda">Firma del infractor:</span><br />{/* eslint-disable-next-line @next/next/no-img-element */}<img src={c.firmaInfractor} alt="Firma del infractor" style={{ height: 70, background: '#fff', borderRadius: 6 }} /></div>
                ) : null}
                <div className="botonera">
                  <BotonVerActa acta={cf} imagenes={(d.imagenes ?? []).map((x) => x.preview_raw).filter(Boolean)} />
                  <button type="button" className="btn btn-outline-secondary" onClick={() => void printTicket(c)}><i className="fa-solid fa-print" aria-hidden="true" /> Ticket</button>
                  <a className="btn btn-outline-secondary" href={`/imprimir/legajo/${uuid}`} target="_blank" rel="noreferrer"><i className="fa-solid fa-book" aria-hidden="true" /> Legajo completo (PDF)</a>
                </div>
              </>
            ) : null}

            {tab === 'historial' ? (
              <ul className="timeline">
                {d.historial.map((h) => (
                  <li key={h.id}>
                    <div className="t-fecha">{fechaHora(h.fecha)} · {h.usuario}</div>
                    <div className="t-accion">{h.accion} {h.estado_nuevo ? <span className="texto-ayuda">({h.estado_anterior ?? '-'} → {h.estado_nuevo})</span> : null}</div>
                    {h.detalle ? <div className="t-detalle">{h.detalle}</div> : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {tab === 'documentos' ? (
              <ul className="lista-items">
                {d.documentos.map((doc) => (
                  <li key={doc.uuid}>
                    <div>
                      <div className="li-titulo"><i className={`fa-solid ${doc.tipo === 'adjunto' ? 'fa-paperclip' : 'fa-file-lines'} me-1`} aria-hidden="true" /> {doc.titulo}{doc.numero ? ` N° ${doc.numero}` : ''}</div>
                      <div className="li-sub">{ESTADO_DOC[doc.estado] ?? doc.estado} · {doc.creado_por} · {fechaHora(doc.date_created)}{doc.firmado_por ? ` · firmado por ${doc.firmado_por}` : ''}{doc.observacion ? ` · Observación: ${doc.observacion}` : ''}</div>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
                      {doc.tipo === 'escrito' ? <Link className="btn btn-sm btn-outline-primary" href={`/private/escrito/${doc.uuid}`}>{['borrador', 'devuelto'].includes(doc.estado) ? 'Editar' : 'Ver'}</Link> : <a className="btn btn-sm btn-outline-primary" href={`/private/escrito/${doc.uuid}`}>Ver</a>}
                      {doc.tipo === 'escrito' && ['firmado', 'definitivo'].includes(doc.estado) && ['Fallo', 'Resolución', 'Disposición'].includes(doc.plantilla?.categoria) && gestion && !d.notificaciones.some((n) => n.documento_id === doc.id) ? (
                        <button type="button" className="btn btn-sm btn-success" onClick={() => void accion('notificar_documento', { documentoUuid: doc.uuid }, 'Notificación iniciada')}>Notificar</button>
                      ) : null}
                      {gestion && d.notificaciones.some((n) => n.documento_id === doc.id && n.estado === 'pendiente') ? (
                        <button type="button" className="btn btn-sm btn-outline-success" title="El infractor no lo abrió en el portal" onClick={() => considerarDoc(doc.uuid, doc.titulo)}>Considerar notificado</button>
                      ) : null}
                      {puede(user?.rol, 'redactarEscritos') && !doc.presentacion_id && (doc.tipo === 'adjunto' || ['borrador', 'devuelto', 'en_revision'].includes(doc.estado)) && !d.notificaciones.some((n) => n.documento_id === doc.id) ? (
                        <button type="button" className="btn btn-sm btn-outline-danger" title="Quitar de la causa" aria-label="Quitar de la causa" onClick={() => setModal({ titulo: `Quitar «${doc.titulo}»`, icono: 'fa-solid fa-trash', accion: 'quitar_documento', textoOk: 'Quitar', peligro: true, aviso: 'Se elimina de la causa y queda constancia en el historial. No se puede deshacer.', campos: [{ k: 'motivo', t: 'Motivo (opcional)', tipo: 'texto' }], extra: { documentoUuid: doc.uuid } })}>
                          <i className="fa-solid fa-trash" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
                {!d.documentos.length ? <li><span className="texto-ayuda">Todavía no hay escritos ni adjuntos.</span></li> : null}
              </ul>
            ) : null}

            {tab === 'presentaciones' ? (
              <ul className="lista-items">
                {d.presentaciones.map((p) => (
                  <li key={p.uuid} className="d-block">
                    <TarjetaPresentacion p={p} causa={causaTarjeta} adjuntos={adjuntosDe(p)} gestion={puede(user?.rol, 'resolverPresentaciones')} onResuelta={presentacionResuelta} />
                  </li>
                ))}
                {!d.presentaciones.length ? <li><span className="texto-ayuda">Sin presentaciones.</span></li> : null}
              </ul>
            ) : null}

            {tab === 'pagos' ? (
              <ul className="lista-items">
                {d.boletas.map((b) => (
                  <li key={b.uuid}>
                    <div>
                      <div className="li-titulo">{b.numero} · {b.concepto}</div>
                      <div className="li-sub">{pesos(Number(b.monto))} · vence {fechaCorta(b.vencimiento)} · a nombre de {b.a_nombre_de} · <strong>{ESTADO_BOL[b.estado] ?? b.estado}</strong>{b.confirmado_por ? ` por ${b.confirmado_por}` : ''}</div>
                    </div>
                    <div className="d-flex gap-2">
                      {b.estado === 'emitida' && gestion ? <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void accion('informar_pago', { boletaUuid: b.uuid }, 'Pago informado')}>Informar pago</button> : null}
                      {b.estado === 'a_verificar' && puede(user?.rol, 'confirmarPagos') ? <button type="button" className="btn btn-sm btn-success" onClick={() => void accion('confirmar_pago', { boletaUuid: b.uuid }, 'Pago acreditado')}>Confirmar acreditación</button> : null}
                    </div>
                  </li>
                ))}
                {!d.boletas.length ? <li><span className="texto-ayuda">Sin boletas emitidas.</span></li> : null}
              </ul>
            ) : null}

            {tab === 'memos' ? (
              <div className="memos">
                <p className="texto-ayuda">Notas internas del personal de Faltas. No cambian el estado de la causa y no se ven en el portal del infractor.</p>
                {puede(user?.rol, 'memos') ? (
                  <div className="memo-nuevo">
                    <textarea id="memo-nuevo" className="form-control" rows={3} placeholder="Escriba un memo interno…" value={memo} onChange={(e) => setMemo(e.target.value)} />
                    <button type="button" className="btn btn-primary mt-2" disabled={!memo.trim()} onClick={async () => { const r = await accion('memo', { texto: memo }, 'Memo agregado'); if (r) setMemo(''); }}>
                      <i className="fa-solid fa-paper-plane" aria-hidden="true" /> Agregar memo
                    </button>
                  </div>
                ) : null}
                <ul className="timeline mt-3">
                  {d.memos.map((m) => (
                    <li key={m.uuid}>
                      <div className="t-fecha">{fechaHora(m.fecha)} · {m.usuario}</div>
                      <div className="t-detalle" style={{ whiteSpace: 'pre-wrap' }}>{m.texto}</div>
                    </li>
                  ))}
                  {!d.memos.length ? <li><span className="texto-ayuda">Todavía no hay memos.</span></li> : null}
                </ul>
              </div>
            ) : null}

            {tab === 'notificaciones' ? (
              <ul className="lista-items">
                {d.notificaciones.map((n) => (
                  <li key={n.uuid}>
                    <div>
                      <div className="li-titulo">{n.objeto === 'acta' ? 'Acta' : n.objeto} · {n.via === 'portal' ? 'Acceso al portal' : n.via === 'electronica' ? 'Domicilio electrónico (DD.JJ.)' : n.via}</div>
                      <div className="li-sub">{n.estado === 'positiva' ? `Notificada el ${fechaHora(n.fecha_resultado)}` : 'Pendiente: se notifica cuando el infractor abra el documento en el portal'}</div>
                    </div>
                  </li>
                ))}
                {!d.notificaciones.length ? <li><span className="texto-ayuda">El acta todavía no fue notificada. Se notifica cuando el infractor la abre en el portal, o por correo si constituyó domicilio electrónico.</span></li> : null}
              </ul>
            ) : null}
          </div>
        </div>

        <aside className="panel-acciones">
          <div className="card-step">
            <div className="card-step-header"><h2>Acciones</h2><p>Según el estado de la causa y su rol</p></div>
            <div className="card-step-body acciones-lista">
              {(() => {
                const boton = (b: (typeof botones)[number], principal: boolean) => (
                  <div key={b.t}>
                    <button type="button" className={`btn ${principal ? 'btn-primary' : b.peligro ? 'btn-outline-danger' : 'btn-outline-secondary'} btn-accion-causa w-100`} onClick={b.on} disabled={Boolean(b.deshabilitado)} title={b.deshabilitado}>
                      <i className={b.i} aria-hidden="true" /> {b.t}
                    </button>
                    {b.deshabilitado ? <div className="texto-ayuda small mt-1">{b.deshabilitado}</div> : null}
                  </div>
                );
                const visibles = botones.filter((b) => b.ver);
                const recomendadas = visibles.filter((b) => b.rec);
                const mas = visibles.filter((b) => !b.rec);
                return (
                  <>
                    <div className="acciones-titulo">Acciones recomendadas</div>
                    {recomendadas.length ? recomendadas.map((b) => boton(b, true)) : <p className="texto-ayuda small mb-1">No hay acciones pendientes para el estado «{estado}».</p>}
                    {mas.length ? (
                      <details className="acciones-mas" open={!recomendadas.length}>
                        <summary className="acciones-mas-boton"><span><i className="fa-solid fa-ellipsis" aria-hidden="true" /> Más acciones <span className="acciones-mas-n">{mas.length}</span></span><i className="fa-solid fa-chevron-down chev" aria-hidden="true" /></summary>
                        <div className="acciones-lista mt-1">{mas.map((b) => boton(b, false))}</div>
                      </details>
                    ) : null}
                  </>
                );
              })()}
            </div>
          </div>
        </aside>
      </div>

      {modal ? <ModalForm titulo={modal.titulo} icono={modal.icono} campos={modal.campos} textoOk={modal.textoOk} textoCancelar={modal.textoCancelar} onNo={modal.onNo} peligro={modal.peligro} aviso={modal.aviso} onCancel={() => setModal(null)} onOk={confirmarModal} /> : null}
    </div>
  );
}
