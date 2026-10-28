/**
 * Guardia de salida del labrado (inspector). Mientras hay un acta sin firmar abierta, los botones «Inicio» de la
 * barra (Shell) no navegan directo: le avisan al labrado, que recuerda que el acta se termina sí o sí (reunión 27/10).
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

/**
 * Botón «atrás» de Android en la app del POS: la app llama a window.faltasAtras() antes de volver atrás.
 * true = lo manejó la web (con un acta sin firmar, muestra el aviso de que hay que terminarla); false = la app vuelve atrás.
 */
if (typeof window !== 'undefined') {
  (window as unknown as { faltasAtras?: () => boolean }).faltasAtras = () => interceptarSalida('/private/inicio');
}
