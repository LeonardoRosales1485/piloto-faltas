import { estadoFinal, fechaCorta } from '@/lib/dominio';

/** Contador de plazo: muestra la fecha de vencimiento y los días que faltan. */
export function Plazo({ vence, estado, ocultarSinPlazo = false }: { vence: number | null | undefined; estado?: string | null; ocultarSinPlazo?: boolean }) {
  // Causa cerrada (archivada, pagada, etc.): no hay plazo que corra aunque haya quedado una fecha guardada.
  if (!vence || estadoFinal(estado)) return ocultarSinPlazo ? null : <span className="texto-ayuda">-</span>;
  const dias = Math.ceil((vence - Date.now()) / 86400000);
  const vencido = dias < 0;
  return (
    <span className={`plazo-chip ${vencido ? 'vencido' : ''}`} title={`Vence el ${fechaCorta(vence)}`}>
      <i className="fa-regular fa-clock" aria-hidden="true" /> {vencido ? `Venció ${fechaCorta(vence)}` : `Vence ${fechaCorta(vence)} (${dias} d)`}
    </span>
  );
}
