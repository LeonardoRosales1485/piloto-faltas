'use client';

import { http } from './api-client';

/**
 * Exporta causas para Apremios: el servidor reserva el lote, fija los montos y (si se pide) deriva las causas;
 * después se abre el PDF (remito + carátula de deuda + legajo por causa) para guardarlo y enviarlo por correo.
 */
export async function exportarApremios(uuids: string[], derivar: boolean, piezas?: Record<string, string[]>) {
  // La ventana se abre en el click (si se abre después del await, el navegador la bloquea).
  const ventana = window.open('', '_blank');
  try {
    const r = await http.post<{ lote: string; fecha: number; usuario: string; causas: unknown[] }>('/api/apremios/exportar', { uuids, derivar });
    try { localStorage.setItem(`faltas:apremios:${r.lote}`, JSON.stringify({ ...r, piezas })); } catch { /* sin almacenamiento */ }
    const url = `/imprimir/apremios/${encodeURIComponent(r.lote)}`;
    if (ventana) ventana.location.href = url; else window.location.href = url;
    return r;
  } catch (e) {
    ventana?.close();
    throw e;
  }
}
