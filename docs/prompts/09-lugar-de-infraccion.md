# Renombrar «Lugar» a «Lugar de infracción»

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

En el stepper y títulos del labrado el paso se llama «Lugar» / «Lugar del hecho». Debe decir **«Lugar de infracción»**.

Qué hacer:
1. Cambiar `corto` y `titulo` del paso `lugar` en `src/components/crear-editar-utils.ts` (`pasosPara`).
2. Unificar el mismo término en la ficha de la causa, el acta impresa (ya dice «Domicilio de la infracción»: dejarlo), el portal y los mensajes de validación («Complete el lugar del hecho» → «Complete el lugar de infracción»).
3. Revisar textos en `como usar la plataforma.md` y `Definiciones para dummies.md`.
