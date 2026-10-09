# Municipio emisor de la licencia autocompletable

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

El campo «Municipio emisor» de la licencia (`vehiculoMunicipalidadEmisora`, paso vehículo del labrado de tránsito) hoy es texto libre. Debe ser **completable**: un input con autocompletado sobre un listado de municipios.

Qué hacer:
1. Cargar (SQL seed) la lista de los 135 partidos/municipios de la Provincia de Buenos Aires más CABA, y permitir también municipios de otras provincias escribiendo libremente (el autocompletado sugiere, no obliga).
2. Usar un componente tipo combobox con sugerencias mientras se escribe (puede reutilizarse `BuscadorOpciones` en modo «permite texto libre» o un `<datalist>` si alcanza).
3. Si conviene, guardar el listado en `catalogo` (tipo `municipio`) para que el admin pueda editarlo desde la configuración existente.
4. Valor por defecto sugerido: «Malvinas Argentinas».
