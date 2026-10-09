# Marcas y modelos de vehículo como dropdowns configurables

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

Hoy «Marca» y «Modelo» del vehículo (paso vehículo del labrado de tránsito) son inputs de texto que se guardan en `metadata.marca` / `metadata.modelo`. Deben ser **dropdowns dependientes** (primero marca, después modelo de esa marca) **administrables por el Administrador**.

Qué hacer:
1. Base: tabla `vehiculo_marca (id, nombre, activa)` y `vehiculo_modelo (id, marca_id, nombre, tipo_vehiculo NULL, activa)`; seed con las marcas y modelos más comunes en Argentina (Toyota, Ford, Volkswagen, Fiat, Chevrolet, Renault, Peugeot, Honda, Motomel, Mercedes-Benz, Iveco, Scania, etc., con varios modelos cada una).
2. API de lectura para el labrado (filtrable por tipo de vehículo si el modelo lo tiene) y API de ABM con permiso `parametrizar`.
3. Pantalla nueva en Configuración: «Marcas y modelos» (solo admin): alta, edición, baja lógica, búsqueda; modelos agrupados por marca.
4. En el labrado: dropdown con buscador (reutilizar `src/components/BuscadorOpciones.tsx`). Incluir opción «Otra / no se describe»: las observaciones de la Dirección (`Fuentes/Obs. acta digital.pdf`) aceptan que no se describa marca/modelo.
5. Seguir guardando el texto elegido en `metadata.marca`/`metadata.modelo` (así el acta impresa y los datos viejos siguen funcionando) y opcionalmente los ids.
6. Ajustar el generador dummy si hace falta.
