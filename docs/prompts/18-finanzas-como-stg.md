# «Valores y tarifas» calcado de Finanzas de stg

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

Rehacer la pantalla **Valores y tarifas** (`/private/finanzas`, `FinanzasView.tsx`) **calcando la de stg**: https://stg.blueopendata.com/faltas/private/finanzas.

Valores que tiene stg (todos editables con un botón «Editar»):
- **Unidad Tributaria** (valor base para cálculos).
- **Acarreo de vehículo** por tipo: Autos, Motos, Camiones.
- **Medio salario** (costo base diario).
- **Derecho de oficina** (trámite administrativo).
- **Estadía** por tipo de vehículo (Automóviles, Motovehículos, Camiones), cada una con tres tramos: **3 a 7 días**, **8 a 30 días**, **+31 por día**.

Qué hacer:
1. Replicar esa estructura y textos (con el estilo del piloto y modo oscuro). Mantener las claves de `configuracion` que ya usa la valorización (`finanza_unidad_fija`, `finanza_acarreo_auto`, derecho de oficina, etc.) y agregar las que falten (acarreo moto/camión, medio salario, estadías por tipo y tramo).
2. Que la valorización de causas, las boletas y el cálculo de liberación (prompt 17) lean estos valores.
3. Permiso `valores` (Tributario y Administrador), como hoy.
4. Quitar la sección «Información de tarifas» solo si stg no la tiene.
