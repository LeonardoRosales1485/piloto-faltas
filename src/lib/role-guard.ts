const PERMITIDO = [
  '/private/lista-infracciones/multas',
  '/private/lista-infracciones/contravenciones',
  '/private/crear-editar/multas',
  '/private/crear-editar/contravenciones',
];

export function rutaPermitidaInspector(url: string): boolean {
  const path = url.split('?')[0];
  return PERMITIDO.some((base) => path === base || path.startsWith(`${base}/`));
}

export function inspectorForbidden(pathname: string, rol?: string): boolean {
  return rol === 'Inspector' && !rutaPermitidaInspector(pathname);
}
