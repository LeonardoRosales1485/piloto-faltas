# Legajo y año en inputs separados

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

En el paso 1 del labrado (`src/components/CrearEditarInfraccion.tsx`, paso `acta`) hoy se muestra «Legajo» como un solo campo `2014/2026`. La Dirección pide **dos inputs separados: «Legajo» (número) y «Año»**, como en el desarrollo anterior (https://stg.blueopendata.com/faltas, paso «Datos del expediente/legajo»).

Qué hacer:
1. Mostrar `legajoNumber` y `legajoAnio` en dos campos contiguos (ambos de solo lectura, porque se asignan solos al iniciar el acta con el talonario `LEG`).
2. Aplicar el mismo criterio en todos los lugares donde se muestra el legajo combinado y haya espacio para separarlo: ficha del acta en `CausaDetalle.tsx`, acta impresa (`src/lib/acta-oficial.ts`, `actaTransitoHtml` ya muestra «Legajo»), filtros de listados (`CausasBandeja`, `ListaInfracciones`: permitir filtrar por número y por año por separado).
3. En listados y chips donde el espacio es chico se puede seguir mostrando `número/año`.
4. Búsquedas por texto deben seguir encontrando `2014/2026`, `2014` o el año.

Criterio de aceptación: el inspector ve «Legajo: 2014» y «Año: 2026» en dos inputs; el filtro de causas permite buscar por año.
