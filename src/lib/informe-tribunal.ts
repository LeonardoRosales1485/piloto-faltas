/**
 * Informe mensual para el Tribunal de Cuentas (minuta 20/10): pagos acreditados en el mes, discriminando multas,
 * derechos de oficina y acarreo/estadía. Las boletas de multa guardan en detalle_json la composición del total
 * (multa + acarreo + derecho de oficina); en las cuotas se prorratea. Las de liberación, acarreo + estadía.
 */
export type BoletaInforme = { monto: number | string; concepto: string | null; detalle_json: string | null };
export type Discriminado = { multas: number; derechoOficina: number; acarreo: number; estadia: number };

const r2 = (n: number) => Math.round(n * 100) / 100;

export function discriminarBoleta(b: BoletaInforme): Discriminado {
  const monto = Number(b.monto) || 0;
  let det: Record<string, unknown> = {};
  try { det = JSON.parse(b.detalle_json || '{}') as Record<string, unknown>; } catch { det = {}; }
  const out: Discriminado = { multas: 0, derechoOficina: 0, acarreo: 0, estadia: 0 };
  if (det.liberacion) {
    // La complementaria cobra solo la estadía adicional (el acarreo ya se pagó).
    if (det.complementaria) { out.estadia = monto; return out; }
    const acarreo = Number(det.acarreo) || 0;
    const total = Number(det.total) || monto;
    out.acarreo = total ? r2((monto * acarreo) / total) : 0;
    out.estadia = r2(monto - out.acarreo);
    return out;
  }
  if (String(b.concepto ?? '').startsWith('Estadía en depósito')) { out.estadia = monto; return out; }
  if (det.multa != null || det.derecho_oficina != null) {
    const multa = Number(det.multa) || 0;
    const acarreo = Number(det.acarreo) || 0;
    const derecho = Number(det.derecho_oficina) || 0;
    const total = multa + acarreo + derecho;
    if (total > 0) {
      out.acarreo = r2((monto * acarreo) / total);
      out.derechoOficina = r2((monto * derecho) / total);
      out.multas = r2(monto - out.acarreo - out.derechoOficina);
      return out;
    }
  }
  out.multas = monto;
  return out;
}

/** Rango [desde, hasta) en ms de un mes «AAAA-MM» en hora argentina (UTC-3). */
export function rangoMes(mes: string): [number, number] {
  const [a, m] = mes.split('-').map(Number);
  return [Date.UTC(a, m - 1, 1, 3), Date.UTC(a, m, 1, 3)];
}
