# Si hay descargo, resolverlo antes del fallo

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

Regla: **si el infractor presentó un descargo, primero hay que resolverlo (aceptar/rechazar/observar) y recién después se puede dictar el fallo.**

Qué hacer:
1. En `CausaDetalle.tsx`, la acción «Dictar fallo» debe estar deshabilitada (con explicación) mientras exista una presentación de tipo descargo en estado `pendiente` (o reenviada tras observación).
2. Validarlo también del lado del servidor: `generar_escrito` con plantillas de categoría «Fallo» (`FALLO_CONDENATORIO`, `FALLO_ABSOLUTORIO`, etc.) debe rechazar con 409 «Resuelva primero el descargo presentado».
3. En la bandeja «Para fallo», las causas con descargo pendiente se muestran en «Presentaciones» y no en «Para fallo» (o con la marca «Descargo a resolver»).
4. Al resolver el descargo, dejar un acceso directo «Dictar fallo» en el aviso de éxito.
