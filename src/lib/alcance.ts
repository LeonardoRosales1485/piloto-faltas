/**
 * Alcance de la versión congelada (piloto-faltas.vercel.app): solo los cambios de la lista «1ra».
 * Lo de «2da» y «3ra» está desarrollado pero oculto (solo la interfaz; el código queda). Para mostrarlo, poner true.
 */
export const ALCANCE = {
  /** 2da · Marcas y modelos de alcoholímetros desde listas (labrado y Configuración → Labrado). */
  alcoholimetroLista: false,
  /** 2da · Botón «Se dio a la fuga» en el paso final (queda como tipo de identificación, que es de 1ra). */
  botonFugaFinal: false,
  /** 2da · Tickets de retención aparte (van con la licencia / la VTV). Sin esto, solo el ticket del infractor. */
  ticketsRetencion: false,
  /** 3ra · «Requiere foto» por artículo (Ordenanzas y aviso en el labrado). La foto sigue siendo opcional. */
  fotoPorArticulo: false,
  /** 3ra · PIN del inspector para salir de la firma. */
  pinFirma: false,
} as const;
