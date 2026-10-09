# Stepper que marca en rojo los pasos con datos faltantes

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

En el labrado, el stepper (círculos en escritorio; barra «n/7» con lista desplegable en móvil) solo indica paso actual y completados. La Dirección pide que **si en un paso falta un dato importante, el stepper lo indique en rojo**.

Qué hacer:
1. Definir por paso qué campos son obligatorios para poder firmar (los mismos que valida `firmarActa` en `src/lib/acta-srv.ts`: nombre/razón social y documento/CUIT salvo NN, domicilio si está presente o se niega, lugar del hecho, al menos un artículo, firma del infractor si está presente, etc.). Centralizar esa lista en una función compartida (ej. `faltantesPorPaso(form)` en `crear-editar-utils.ts`) para no duplicar reglas.
2. En el stepper de escritorio: el círculo del paso con faltantes se pinta en rojo (borde y número), con un ícono de alerta y tooltip «Faltan: …».
3. En móvil: en la lista desplegable, el paso con faltantes se ve en rojo con el detalle; la barra superior muestra un punto rojo si hay algún faltante.
4. Mostrar el estado rojo recién cuando el inspector ya pasó por el paso (o intentó firmar), para no llenar de rojo un acta recién iniciada.
5. En el paso de firma, el botón «Firmar» lista los faltantes y permite saltar al paso.
