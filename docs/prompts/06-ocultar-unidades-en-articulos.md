# Ocultar «unidades» en la lista de artículos

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

En el paso «Artículos y medidas» del labrado, la lista de artículos muestra las **unidades fijas (UF)** de cada artículo y el total («Total: N unidades fijas»). La Dirección pide **ocultar las unidades** en esa lista: el inspector no valoriza.

Qué hacer:
1. En `CrearEditarInfraccion.tsx` quitar la columna/etiqueta de unidades y el texto «Total: N unidades fijas…».
2. Mantener las unidades en el back office (detalle de la causa, «Artículos y valorización», ordenanzas, boletas): solo se ocultan para el inspector en el labrado.
3. Verificar también que el ticket y el acta impresa no muestren unidades ni importes.
