# Quitar el correo electrónico del labrado

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

En el paso «Datos del infractor» del labrado (`CrearEditarInfraccion.tsx`) hay un campo «Correo electrónico» (`infractorEmail`) con la aclaración de que no sirve para notificar. La Dirección pide **quitarlo**.

Qué hacer:
1. Quitar el input y su texto de ayuda del paso infractor y del resumen del paso «Revisión y firma».
2. No mostrar el correo en la ficha del acta (`CausaDetalle`), en el acta impresa ni en el ticket.
3. No borrar la columna `infractor_email` de la base (datos viejos y el generador dummy `scripts/generar_dummy_sandbox.py` pueden seguir completándola); simplemente dejar de pedirla y de mostrarla.
4. Revisar que ninguna validación de firma (`src/lib/acta-srv.ts`, `firmarActa`) lo exija.
5. La notificación electrónica sigue funcionando solo con el domicilio electrónico constituido en el portal (DD.JJ.).
