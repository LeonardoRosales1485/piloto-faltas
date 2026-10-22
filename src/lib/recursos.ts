/** Recursos (apelaciones): constantes compartidas entre el navegador y el servidor. */
export const INSTANCIAS_RECURSO = ['Juzgado de Paz Letrado', 'Juzgado Correccional', 'Cámara de Apelación', 'Suprema Corte'] as const;
export const RESULTADOS_RECURSO: Record<string, string> = {
  confirma: 'Confirma el fallo',
  modifica: 'Modifica el monto',
  revoca: 'Revoca el fallo (absolución)',
  nulidad: 'Declara la nulidad',
};
export const ESTADO_RECURSO: Record<string, string> = { elevado: 'Elevado', en_tramite: 'En trámite', resuelto: 'Resuelto' };
export type Movimiento = { fecha: number; texto: string; usuario: string };

export function movimientosDe(r: { movimientos_json?: string | null }): Movimiento[] {
  try { return JSON.parse(r.movimientos_json || '[]') as Movimiento[]; } catch { return []; }
}
