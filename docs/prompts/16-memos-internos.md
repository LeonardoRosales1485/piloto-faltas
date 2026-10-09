# Memos internos en lugar de «Nota a un área»

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

Reemplazar la acción «Nota a un área (espera respuesta)» del detalle de la causa por **Memos internos**: una nota interna simple, de texto libre, visible solo para el personal de Faltas.

Qué hacer:
1. Tabla `memo (id, infraccion_id, texto, usuario, fecha)`.
2. En `CausaDetalle.tsx`: nuevo tab **«Memos internos»** con la lista (más recientes arriba, autor y fecha) y un cuadro para escribir uno nuevo.
3. El botón de acciones donde estaba «Nota a un área» pasa a **«Memo interno»** y abre el mismo formulario (al guardar, lleva al tab).
4. Un memo **no cambia el estado** de la causa. Dejar disponible el estado «Espera respuesta» solo vía «Cambiar estado» manual si se sigue necesitando.
5. Los memos no se ven en el portal ni en el legajo completo para el infractor; sí en el legajo interno.
6. Registrar en el historial «Memo interno agregado» (sin el texto, o con un extracto).
