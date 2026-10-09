# Mecánica Pago voluntario vs. Descargo vs. Ignorar

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

Una vez notificada el acta, el infractor tiene tres caminos excluyentes y el sistema debe modelarlos explícitamente:

- **Pago voluntario** (50 % dentro del plazo): renuncia a defenderse. Al elegirlo ya no puede presentar descargo.
- **Descargo**: se defiende. Al presentarlo **ya no puede hacer el pago voluntario** (igual que en stg: «Al optar por generar un descargo, no será posible hacer un pago voluntario»), y no puede presentar otro mientras haya uno pendiente.
- **Ignorar**: no hace nada. Vencido el plazo, la causa pasa automáticamente a la bandeja de «Para fallo» (rebeldía) para que Faltas dicte el fallo; ya no hay pago voluntario.

Qué hacer:
1. Revisar las reglas actuales de `accionesDisponibles` (`src/lib/portal-srv.ts`), `presentaciones`, `bandejas.ts` y el detalle de la causa, y dejar las tres opciones mutuamente excluyentes, tanto en el portal como en «Presentación en mesa» del back office.
2. Mostrar al infractor (portal) una explicación clara de las tres opciones antes de elegir, con el plazo que le queda.
3. Implementar el vencimiento: al pasar `vence_plazo_at` sin pago ni descargo, la causa aparece en «Para fallo» con la marca «Sin presentación (vencido el plazo)». Se puede calcular al listar (no hace falta un cron) y registrar en el historial la primera vez que se detecta.
4. Mostrar en el detalle de la causa qué camino eligió el infractor y cuándo.
5. Actualizar el roadmap de la causa (`RoadmapCausa.tsx`) para que refleje el camino.
