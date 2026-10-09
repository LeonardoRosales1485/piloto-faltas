# No mostrar el GPS en el bloque de ejido urbano

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

En el paso «Lugar de infracción» del labrado se muestran las coordenadas GPS (latitud/longitud) junto al indicador de ejido urbano. La Dirección pide **no mostrar el GPS** ahí.

Qué hacer:
1. Seguir capturando `gpsLat`/`gpsLng` (se usan para calcular el ejido, para el seguimiento y para el mapa de actas), pero no mostrarlos como texto en el labrado ni en la ficha/acta impresa.
2. El indicador «Dentro / Fuera del ejido urbano» se sigue mostrando, calculado automáticamente (no editable por el inspector, según `Fuentes/Obs. acta digital.pdf` punto 2).
3. Si no hay GPS, mostrar «Ejido: sin determinar» y dejar que Faltas lo corrija desde la causa.
4. (Fuera de alcance del prototipo: la comparación exacta contra la capa de ejido que maneja el equipo de desarrollo.)
