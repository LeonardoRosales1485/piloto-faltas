# «Presente, se niega a firmar» debajo del recuadro de firma

**Contexto del proyecto.** Piloto del Sistema de Faltas (Municipalidad de Malvinas Argentinas). Next.js 15 (App Router) + Supabase (supabase-js con service role) en `monorepo/`. Las APIs devuelven `{data,status,message}` y usan `handle(req, fn, permiso)` de `src/lib/srv.ts`. Roles y permisos en `src/lib/dominio.ts` (`PERMISOS`, `puede`), guardas de ruta en `src/lib/role-guard.ts`, menú en `src/components/Shell.tsx`. Los cambios de base van en un SQL nuevo numerado en `sql/` (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, terminar con `NOTIFY pgrst, 'reload schema';`). Respetar modo claro/oscuro (`[data-theme='dark']` en `src/styles-v2.scss`) y móvil. Al terminar: `npx tsc --noEmit`, probar en el navegador y actualizar `como usar la plataforma.md` si cambia algo visible. No hacer commit ni push salvo que se pida.

## Pedido

Hoy la situación del infractor («Presente», «Ausente», «Presente, se niega a firmar», «No identificado (NN)») se elige en el **paso 1** del labrado. Según las observaciones de la Dirección (`Fuentes/Obs. acta digital.pdf`, punto 4) en el inicio solo se sabe si el infractor está **presente o no**; la negativa a firmar ocurre **al final**, cuando se le muestra el acta.

Qué hacer:
1. En el paso 1 dejar solo «Presente» / «Ausente» / «No identificado (NN)».
2. En el paso «Revisión y firma», **debajo del recuadro de firma del infractor**, agregar la opción «El infractor está presente pero se negó a firmar». Al marcarla: se deshabilita y limpia el recuadro de firma y `situacionInfractor` pasa a `se_niega`; al desmarcarla vuelve a `presente`.
3. Ajustar las validaciones de `firmarActa` (`src/lib/acta-srv.ts`): con `presente` se exige firma; con `se_niega` no, pero sí los datos del infractor.
4. El acta impresa ya muestra «Se negó a firmar» en el lugar de la firma; verificar.
