# Acarreos/Retenciones hiper sencillo, con cálculo al liberar

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

Agregar una sección **«Retenciones»** (acarreos/depósito) tan simple como la de stg: https://stg.blueopendata.com/faltas/private/retenciones.

Lo que tiene stg: tarjetas de estadísticas (vehículos retenidos, liberados, totales; monto pendiente, recaudado, total), filtro por fechas y listado de retenciones.

Qué hacer:
1. Listado de vehículos retenidos a partir de las actas con `retencion_de_vehiculo = 1`: acta, dominio, tipo de vehículo (auto/moto/camión), fecha de ingreso al depósito (`estadia_ingreso_at`, por defecto la fecha del acta), días en depósito, estado (Retenido/Liberado).
2. Estadísticas arriba como en stg, con filtro de período.
3. Acción **«Liberar»**: muestra el **total a pagar** = acarreo según tipo de vehículo + estadía según días (tramos 3–7, 8–30 y +31 por día, por tipo de vehículo, tomados de Valores y tarifas — ver prompt 18), con el desglose; al confirmar emite la(s) boleta(s) correspondientes (`emitirBoletas`/`emitir_estadia` existentes), registra la liberación y la disposición de levantamiento si corresponde.
4. Permisos: Directora/Abogada/Admin/Agente (gestión).
5. Nota: en el labrado de tránsito se quitó «acarreo» (`docs/pendientes-acta-transito.md`); acá el acarreo se calcula al liberar según el tipo de vehículo.
