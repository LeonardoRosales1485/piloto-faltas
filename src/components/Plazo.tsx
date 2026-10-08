import { fechaCorta } from '@/lib/dominio';

/** Contador de plazo: muestra la fecha de vencimiento y los días que faltan. */
export function Plazo({ vence }: { vence: number | null | undefined }) {
  if (!vence) return <span className="texto-ayuda">-</span>;
  const dias = Math.ceil((vence - Date.now()) / 86400000);
  const vencido = dias < 0;
  return (
    <span className={`plazo-chip ${vencido ? 'vencido' : ''}`} title={`Vence el ${fechaCorta(vence)}`}>
      <i className="fa-regular fa-clock" aria-hidden="true" /> {vencido ? `Venció ${fechaCorta(vence)}` : `Vence ${fechaCorta(vence)} (${dias} d)`}
    </span>
  );
}
