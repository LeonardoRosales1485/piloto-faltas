/**
 * Aviso de «cambiaron datos»: después de una acción que modifica algo (POST que no es solo lectura), las pantallas
 * abiertas se vuelven a cargar solas, en esta pestaña y en las otras del mismo navegador (back office y portal).
 */
export const EVENTO_DATOS = 'faltas:datos-cambiados';
const CANAL = 'faltas-datos';

/** POST que solo leen (listas, paginados, vista previa, login): no avisan. */
const SOLO_LECTURA = /^\/api\/(causas|auth\/.*|.*\/paginate|plantillas\/vista-previa|portal\/(login|buscar|registro).*)$/;

let canal: BroadcastChannel | null = null;
export function canalDatos(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  try { canal ??= new BroadcastChannel(CANAL); } catch { canal = null; }
  return canal;
}

export function avisarCambio(path: string) {
  if (typeof window === 'undefined' || SOLO_LECTURA.test(path.split('?')[0])) return;
  window.dispatchEvent(new Event(EVENTO_DATOS));
  try { canalDatos()?.postMessage(Date.now()); } catch { /* sin canal */ }
}
