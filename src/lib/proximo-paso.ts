/**
 * «Próximo paso» de la causa: qué falta, quién tiene que actuar y con qué acción se avanza. Es una lectura del
 * estado y de los escritos, notificaciones, presentaciones y boletas; no cambia nada por sí misma.
 */
import { estadoFinal, fechaCorta, infoEstado } from './dominio';

type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Acción sugerida: un botón del panel de la causa (por título), notificar o considerar notificado un escrito, una pestaña o un enlace. */
export type AccionPaso =
  | { tipo: 'boton'; boton: string; t?: string }
  | { tipo: 'notificar'; uuid: string; t: string }
  | { tipo: 'considerarDoc'; uuid: string; t: string }
  | { tipo: 'tab'; tab: string; t: string }
  | { tipo: 'link'; href: string; t: string };

export type ProximoPaso = {
  titulo: string;
  detalle?: string;
  /** Quién tiene que actuar. */
  quien: 'Agente' | 'Directora / Responsable' | 'Infractor' | 'Organismo externo' | 'Nadie';
  tono: 'accion' | 'espera' | 'alerta' | 'fin';
  acciones: AccionPaso[];
};

type Ctx = {
  estado: string;
  vencePlazoAt?: number | null;
  notificadaAt?: number | null;
  medidaVigente?: boolean;
  documentos: R[];
  notificaciones: R[];
  presentaciones: R[];
  boletas: R[];
  cuotasVencidas: boolean;
  /** Botones visibles del panel (títulos), para no sugerir algo que el usuario no puede hacer. */
  botones: string[];
  ahora?: number;
};

const CAT_NOTIFICABLE = ['Fallo', 'Resolución', 'Disposición'];
const QUE: Record<string, string> = { Fallo: 'el fallo', Resolución: 'la resolución', Disposición: 'la disposición' };

function dias(desde: number, ahora: number) {
  return Math.max(0, Math.floor((ahora - desde) / 86_400_000));
}

export function proximoPaso(x: Ctx): ProximoPaso {
  const ahora = x.ahora ?? Date.now();
  const hay = (b: string) => x.botones.includes(b);
  const boton = (b: string, t?: string): AccionPaso[] => (hay(b) ? [{ tipo: 'boton', boton: b, t }] : []);
  const vencido = Boolean(x.vencePlazoAt && x.vencePlazoAt < ahora);
  const plazoTxt = x.vencePlazoAt ? (vencido ? `El plazo venció el ${fechaCorta(x.vencePlazoAt)}.` : `El plazo vence el ${fechaCorta(x.vencePlazoAt)}.`) : '';

  if (estadoFinal(x.estado)) {
    return { titulo: `Causa cerrada: ${x.estado}`, detalle: 'No hay pasos pendientes. Si hace falta, se puede reingresar.', quien: 'Nadie', tono: 'fin', acciones: boton('Reingresar') };
  }

  // 1. Presentaciones del infractor sin resolver (descargo, pago, cuotas, apelación).
  const pend = x.presentaciones.filter((p) => p.estado === 'pendiente');
  if (pend.length) {
    return {
      titulo: pend.length === 1 ? 'Resolver la presentación del infractor' : `Resolver ${pend.length} presentaciones del infractor`,
      detalle: 'Acéptela, obsérvela o recházela. Hasta resolverla no se puede dictar el fallo.',
      quien: 'Agente', tono: 'accion', acciones: [{ tipo: 'tab', tab: 'presentaciones', t: 'Ver presentaciones' }],
    };
  }

  // 2. Escritos de fallo, resolución o disposición: en revisión, en borrador, sin notificar o esperando al infractor.
  const escritos = x.documentos.filter((d) => d.tipo === 'escrito' && CAT_NOTIFICABLE.includes(d.plantilla?.categoria));
  const enRevision = escritos.find((d) => d.estado === 'en_revision');
  if (enRevision) {
    return {
      titulo: `Firmar ${QUE[enRevision.plantilla.categoria] ?? 'el escrito'}: ${enRevision.titulo}`,
      detalle: 'Está en la bandeja «Escritos y firma». Al firmarse, se notifica al infractor.',
      quien: 'Directora / Responsable', tono: 'espera', acciones: [{ tipo: 'link', href: `/private/escrito/${enRevision.uuid}`, t: 'Abrir el escrito' }],
    };
  }
  const borrador = escritos.find((d) => ['borrador', 'devuelto'].includes(d.estado));
  if (borrador) {
    return {
      titulo: `Terminar ${QUE[borrador.plantilla.categoria] ?? 'el escrito'}: ${borrador.titulo}`,
      detalle: borrador.estado === 'devuelto' ? `La Directora lo devolvió${borrador.observacion ? `: «${borrador.observacion}»` : ''}. Corríjalo y vuelva a enviarlo.` : 'Complete los campos y envíelo a firma (o déjelo definitivo).',
      quien: 'Agente', tono: 'accion', acciones: [{ tipo: 'link', href: `/private/escrito/${borrador.uuid}`, t: 'Abrir el escrito' }],
    };
  }
  const sinNotificar = escritos.find((d) => ['firmado', 'definitivo'].includes(d.estado) && !x.notificaciones.some((n) => n.documento_id === d.id));
  if (sinNotificar && hay('Generar escrito')) {
    const que = QUE[sinNotificar.plantilla.categoria] ?? 'el escrito';
    return {
      titulo: `Notificar ${que}`,
      detalle: `${sinNotificar.titulo}${sinNotificar.numero ? ` N° ${sinNotificar.numero}` : ''} está firmado. Se publica en el portal (o se envía al domicilio electrónico) y el infractor queda notificado al abrirlo.`,
      quien: 'Agente', tono: 'accion', acciones: [{ tipo: 'notificar', uuid: sinNotificar.uuid, t: `Notificar ${que}` }],
    };
  }
  const notifPend = x.notificaciones.find((n) => n.estado === 'pendiente' && n.documento_id);
  if (notifPend) {
    const doc = x.documentos.find((d) => d.id === notifPend.documento_id);
    const n = dias(Number(notifPend.date_created), ahora);
    return {
      titulo: `Esperando que el infractor abra ${doc ? `«${doc.titulo}»` : 'el documento'} en el portal`,
      detalle: `Notificación pendiente desde hace ${n} ${n === 1 ? 'día' : 'días'}. Si ya tuvo tiempo suficiente, puede considerarlo notificado y empieza a correr el plazo.`,
      quien: 'Infractor', tono: n >= 5 ? 'alerta' : 'espera',
      acciones: doc ? [{ tipo: 'considerarDoc', uuid: doc.uuid, t: 'Considerar notificado' }] : [],
    };
  }

  // 3. Según el estado.
  const fam = infoEstado(x.estado).familia;
  switch (x.estado) {
    case 'Iniciado':
      return {
        titulo: 'Notificar el acta al infractor', detalle: 'Puede esperar a que el infractor vea el acta en el portal o considerarlo notificado.',
        quien: 'Agente', tono: 'accion', acciones: [...boton('Esperar al infractor'), ...boton('Considerar notificado')],
      };
    case 'En notificación':
      return {
        titulo: 'Esperando que el infractor vea el acta en el portal', detalle: 'Si ya tuvo tiempo suficiente, puede considerarlo notificado.',
        quien: 'Infractor', tono: 'espera', acciones: boton('Considerar notificado'),
      };
    case 'Notificado':
      return vencido
        ? { titulo: 'Dictar el fallo', detalle: `${plazoTxt} El infractor no pagó ni presentó descargo.`, quien: 'Agente', tono: 'alerta', acciones: boton('Dictar fallo') }
        : { titulo: 'Plazo del infractor para pagar o presentar descargo', detalle: `${plazoTxt} Al vencer, corresponde dictar el fallo.`, quien: 'Infractor', tono: 'espera', acciones: [...boton('Emitir boleta', 'Emitir boleta (si lo pide en mesa)'), ...boton('Dictar fallo', 'Dictar fallo igual')] };
    case 'Descargo':
      return { titulo: 'Dictar el fallo', detalle: 'El descargo ya está resuelto.', quien: 'Agente', tono: 'accion', acciones: boton('Dictar fallo') };
    case 'Causa observada':
      return { titulo: 'Esperando que el infractor corrija su descargo', detalle: plazoTxt || 'Se le pidió que lo reenvíe.', quien: 'Infractor', tono: vencido ? 'alerta' : 'espera', acciones: vencido ? boton('Dictar fallo') : [] };
    case 'Esp. Acreditar Pago':
      return { titulo: 'Esperando la acreditación del pago', detalle: 'Cuando Malvinas 2000 confirme el pago, la causa se archiva sola (si no hay medida vigente).', quien: 'Organismo externo', tono: 'espera', acciones: [{ tipo: 'tab', tab: 'pagos', t: 'Ver boletas y pagos' }] };
    case 'Cuotas':
      return x.cuotasVencidas
        ? { titulo: 'Hay cuotas vencidas sin pagar', detalle: 'Corresponde continuar el procedimiento (fallo o Apremios).', quien: 'Agente', tono: 'alerta', acciones: boton('Continuar procedimiento') }
        : { titulo: 'Plan de cuotas al día', detalle: 'Se archiva sola al acreditarse la última cuota.', quien: 'Infractor', tono: 'espera', acciones: [{ tipo: 'tab', tab: 'pagos', t: 'Ver cuotas' }] };
    case 'Con Fallo':
      return { titulo: 'Notificar el fallo', detalle: 'El fallo está firmado pero no se encontró su notificación. Notifíquelo desde «Escritos y documentos».', quien: 'Agente', tono: 'alerta', acciones: [{ tipo: 'tab', tab: 'documentos', t: 'Ver escritos' }] };
    case 'Fallo notificado':
      return vencido
        ? { titulo: 'Derivar a Apremios', detalle: `${plazoTxt} No pagó ni apeló.`, quien: 'Agente', tono: 'alerta', acciones: [...boton('Derivar a Apremios'), ...boton('Exportar para Apremios')] }
        : { titulo: 'Plazo del infractor para pagar o apelar', detalle: `${plazoTxt} Si apela, se deriva al Juzgado de Paz; si no paga, a Apremios.`, quien: 'Infractor', tono: 'espera', acciones: [...boton('Emitir boleta'), ...boton('Derivar a Juzgado de Paz')] };
    case 'En Apremios':
    case 'En Juzgado':
      return { titulo: `Esperando el resultado ${x.estado === 'En Juzgado' ? 'del Juzgado de Paz' : 'de Apremios'}`, detalle: 'Cuando lo informen, regístrelo para cerrar la causa.', quien: 'Organismo externo', tono: 'espera', acciones: boton('Registrar resultado externo') };
    case 'Espera respuesta':
    case 'Despacho Directora':
      return { titulo: x.estado === 'Espera respuesta' ? 'Esperando la respuesta del área consultada' : 'En despacho de la Directora', detalle: 'Cuando se resuelva, cambie el estado para retomar la causa.', quien: x.estado === 'Espera respuesta' ? 'Organismo externo' : 'Directora / Responsable', tono: 'espera', acciones: boton('Cambiar estado') };
    default:
      break;
  }
  if (fam === 'medida') {
    return x.medidaVigente
      ? { titulo: 'Medida preventiva vigente', detalle: 'Cuando corresponda, dicte la disposición de levantamiento. El acta sigue su curso (notificación, pago o fallo).', quien: 'Agente', tono: 'espera', acciones: [...boton('Disposición de levantamiento'), ...boton('Considerar notificado')] }
      : { titulo: 'Continuar con la causa', detalle: 'La medida ya no está vigente: siga con la notificación del acta, el pago o el fallo.', quien: 'Agente', tono: 'accion', acciones: [...boton('Considerar notificado'), ...boton('Dictar fallo')] };
  }
  return { titulo: 'Elija la próxima acción', detalle: 'Use las acciones del panel de la derecha.', quien: 'Agente', tono: 'accion', acciones: [] };
}
