import { handlePublic, HttpError } from '@/lib/srv';

/**
 * Pedido 22/10/2026: el infractor no paga ni informa pagos desde el portal. Solo solicita el pago (presentación) y la
 * Dirección de Faltas le habilita la boleta y registra el pago («Informar pago» / «Confirmar acreditación»).
 */
export async function POST() {
  return handlePublic(async () => {
    throw new HttpError(410, 'El pago no se informa desde el portal: abone la boleta en los medios habilitados y la Dirección de Faltas lo registra.');
  });
}
