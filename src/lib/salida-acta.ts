/**
 * Guardia de salida del labrado (inspector). Mientras hay un acta sin firmar abierta, los botones «Inicio» de la
 * barra (Shell) no navegan directo: le avisan al labrado, que pregunta y, si confirma, la da por «acta abandonada»
 * (número anulado) antes de volver al inicio.
 */
type Guardia = (destino: string) => void;
let guardia: Guardia | null = null;

export function registrarGuardiaSalida(g: Guardia | null) {
  guardia = g;
}

/** true si hay un acta abierta y la guardia tomó el control (mostrará su aviso); false para navegar normalmente. */
export function interceptarSalida(destino: string): boolean {
  if (!guardia) return false;
  guardia(destino);
  return true;
}
