# Subsanar datos: edición de varios campos con motivo, acta original intacta

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

**Croquis:** `croquis-subsanacion.png` (en esta carpeta).

Hoy «Subsanar datos» en el detalle de la causa solo genera una constancia de texto libre. Debe permitir **corregir varios campos del acta indicando el motivo**, sin modificar el acta original firmada.

Qué hacer (interpretación actual):
1. Modal/pantalla «Subsanar datos» con los campos corregibles del acta (infractor, documento, domicilio, vehículo, dominio, marca/modelo, lugar de infracción, artículos, observaciones…), precargados con los valores del acta, y un campo obligatorio «Motivo de la subsanación».
2. **Una sola subsanación por causa**: si ya existe, la acción se muestra como «Ver subsanación» (no se puede hacer otra).
3. Guardar la subsanación aparte (tabla `subsanacion` con `infraccion_id`, `campos_json` {campo: {antes, despues}}, `motivo`, `usuario`, `fecha`), generar la constancia en documentos y registrar en el historial. **El acta original (tabla `infraccion` y su PDF/firma) no se modifica.**
4. Vista (según el croquis): dentro del tab **«Acta»** del detalle de la causa, arriba de la ficha, un selector de dos pestañas a todo el ancho: **«Acta subsanada» | «Acta original»**.
   - Solo aparece si la causa tiene subsanación; si no, la ficha se ve como hoy.
   - «Acta subsanada» (seleccionada por defecto): la ficha con los datos vigentes; los campos corregidos se resaltan y muestran el valor anterior tachado o en un tooltip, más un aviso con el motivo, quién y cuándo subsanó.
   - «Acta original»: la ficha tal como se firmó, en solo lectura, con su PDF original («Ver acta (PDF)» imprime la original en esta pestaña y la subsanada en la otra).
   - El panel «Acciones» de la derecha no cambia; «Subsanar datos» pasa a «Ver subsanación» cuando ya existe.
5. Los escritos, boletas y notificaciones posteriores usan los datos subsanados (resolver «dato vigente» = subsanado si existe, si no el original).
6. El portal del infractor muestra los datos vigentes y la constancia de subsanación.
