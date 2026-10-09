# Selección de artículos infringidos como en stg (BOD)

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

La selección de artículos del labrado debe funcionar **como en el desarrollo anterior de BOD**: https://stg.blueopendata.com/faltas/private/faltas/crear-editar/multas (y `/contravencion`). Hoy el piloto usa su propia lista con checkboxes.

Qué hacer:
1. Antes de programar, recorrer el labrado de stg (usuario con acceso) y documentar en este archivo, debajo, cómo se agregan los artículos: buscador por número/nombre/descripción, cómo se listan (artículo, ley/ordenanza, descripción), si se puede repetir un artículo, cómo se quitan, si se ve la categoría, etc. Ojo con no guardar ni borrar datos en stg.
2. Replicar ese comportamiento en `CrearEditarInfraccion.tsx` (paso artículos), manteniendo la clave `Ordenanza X · Art. N` (`claveLey` en `dominio.ts`) para no romper la valorización ni el acta impresa, y sin mostrar unidades (ver prompt 06).
3. Mantener el filtrado por tipo de acta (tránsito / contravención / sustancias) y el modo solo lectura cuando el acta está firmada.

Pregunta abierta para confirmar con Leo si algo del comportamiento de stg no aplica (por ejemplo, artículos repetidos).
