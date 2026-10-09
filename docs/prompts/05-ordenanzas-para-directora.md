# Ordenanzas visibles para la Directora y el admin

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

Hoy la administración de ordenanzas/artículos (`/private/ordenanzas/multas` y `/private/ordenanzas/contravenciones`, componente `OrdenanzasView`) está bajo Configuración y exige el permiso `parametrizar` (solo Administrador). La Dirección pide que **la Directora (y la Abogada, que tiene los mismos permisos) también puedan administrar ordenanzas**, además del admin.

Qué hacer:
1. Crear un permiso nuevo `ordenanzas: ['Directora', 'Abogada', 'Administrador']` en `dominio.ts` y usarlo en las APIs de leyes/ordenanzas (alta, edición, baja) y en `role-guard.ts` para `/private/ordenanzas`.
2. Agregar en el menú una sección propia «Ordenanzas» (visible para esos roles) con las dos entradas (tránsito y contravención), y sacarlas de Configuración para no duplicarlas.
3. Respetar el alcance por tipo: la Directora administra las de tránsito y la Abogada las de contravención/sustancias (usar `tiposPermitidos(rol)`); el admin ve todas.
4. Registrar en auditoría/historial quién modificó un artículo, ya que afecta la valorización.
