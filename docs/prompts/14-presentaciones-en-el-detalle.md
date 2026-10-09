# Mostrar el descargo/presentación dentro del detalle de la causa

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

Hoy las presentaciones (descargo, pago voluntario, cuotas, apelación) se resuelven desde la bandeja «Presentaciones» y en el detalle de la causa solo aparecen en un tab con datos básicos. La Dirección pide **ver y resolver el descargo/presentación en la misma vista del detalle de la causa**.

Qué hacer:
1. En `CausaDetalle.tsx`, si hay una presentación pendiente, mostrar arriba (antes de los tabs o como primer bloque del tab «Acta») una tarjeta destacada con: tipo, fecha, origen (portal/mesa), texto completo, adjuntos (con vista previa de imágenes/PDF), plazo y los botones Aceptar / Observar / Rechazar (con el mismo modal que usa `Presentaciones.tsx` → `/api/presentacion/resolver`).
2. En el tab «Presentaciones» mostrar el historial completo con la respuesta de cada una.
3. Reutilizar la lógica de `Presentaciones.tsx` (extraer un componente `TarjetaPresentacion`) para no duplicar.
4. La bandeja «Presentaciones» sigue existiendo y enlaza a la causa.
