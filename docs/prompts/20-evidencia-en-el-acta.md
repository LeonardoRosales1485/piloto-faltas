# Fotos de los inspectores en la vista del acta y opción de mostrar evidencia

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

Dos cosas sobre la **visualización del acta**:

1. **Corroborar** que en la vista del acta (detalle de la causa → «Ver acta (PDF)», legajo completo, portal del infractor y link público del acta) se ven las **fotos que tomaron los inspectores**. Hoy el acta de tránsito (`actaTransitoHtml` en `src/lib/acta-oficial.ts`) recibe `imagenes` desde `printActa(..., { imagenes })` en `CausaDetalle`, `CrearEditarInfraccion` e `Impresion`; verificar que también lleguen en el portal (`PortalCausa` → `printActa(d.acta)` hoy **no** pasa imágenes), en el link público y en el acta de contravención/sustancias (`actaOficialHtml`, que no tiene bloque de imágenes).
2. **Sumar al modelo del acta la opción de mostrar o no la evidencia**, como hace el desarrollo anterior: en stg, la vista pública del acta (`/faltas/acta-digital/:uuid`) tiene un botón **«Evidencias»** y otro **«Descargar PDF»**. Implementar un interruptor «Mostrar evidencia» en la vista del acta: activado → el acta incluye la sección «Imágenes de la infracción»; desactivado → el acta se imprime sin fotos. Recordar la preferencia por usuario (localStorage) y, si se define, un valor por defecto configurable por el admin.
3. Galería con vista ampliada de cada foto (como «Ver imagen ampliada» de stg).
