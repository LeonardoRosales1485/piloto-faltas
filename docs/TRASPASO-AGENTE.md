# Traspaso para el próximo agente · Sistema de Faltas (15/10/2026)

## Contexto en 30 segundos
- **Cliente:** Dirección de Faltas, Municipalidad de Malvinas Argentinas. **Usuario:** Leo Rosales (Blue Open Data), escribe en español rioplatense.
- **Producto:** piloto del Sistema de Faltas = acta digital (inspectores, POS Senraise H10S), back office de Faltas, portal de infractores.
- **Stack:** Next.js 15 (App Router) + Supabase (PostgREST, service role en el servidor) + Vercel (`piloto-faltas.vercel.app`). App del POS en Flutter (`pos-app/`).
- **Documento rector:** `Informe de requerimientos para el Sistema de Faltas.pdf` (carpeta conectada `Faltas/Fuentes`).

## Dónde está todo
- **Repo (en la PC de Leo, carpeta conectada):** `~/mnt/piloto-faltas/monorepo` (Windows: `C:\Users\leori\Desktop\Proyectos\piloto-faltas\monorepo`). Trabajar ahí con `device_bash`. La copia en `/home/claude/work/monorepo` del contenedor está **desactualizada**: no usarla.
- **Docs del repo (`docs/`):**
  - `PROGRESO.md` — cambios hechos (tabla de la reunión + «Otros ajustes»). **Actualizar en cada commit.**
  - `PENDIENTES.md` — 23 pendientes técnicos y decisiones.
  - `ANALISIS-REQUERIMIENTOS.md` — cobertura del Informe sección por sección (✅/🟡/❌).
  - `FEATURES-FALTANTES.md` — 37 features faltantes con **preguntas para Leo** (✍️). Es el backlog de trabajo; esperar sus respuestas.
  - `prompts/` — especificación de los 20 cambios de la reunión.
- **`como usar la plataforma.md`** (raíz) — guía de uso. **Actualizar** cuando cambia algo visible.
- **Proyecto claude.ai «Sistema de Faltas»:** copias de los análisis (`claude/*.md`), contexto documental y auditoría de escalabilidad.

## Forma de trabajo acordada
1. Leo pide cambios en el chat; se implementan en la carpeta conectada y se **commitea en su máquina**; él hace `git push` (Vercel despliega).
2. Mensaje de commit descriptivo; si es un lote de tareas, empieza con «Tareas X a la Y:». Terminar con las líneas de atribución del sistema (Co-Authored-By / Claude-Session).
3. Identidad de git: no hay `user.name` configurado → usar la del último commit:
   `A=$(git log -1 --format='%an'); E=$(git log -1 --format='%ae'); git -c user.name="$A" -c user.email="$E" commit ...`
4. La carpeta no permite borrar: git deja `.git/*.lock` y `tmp_obj_*`. Después de cada commit:
   `for f in .git/*.lock .git/objects/*.lock; do [ -e "$f" ] && mv "$f" "$f.stale-$RANDOM"; done` (no borrar locks de un git en curso).
5. Verificar con `node_modules/.bin/tsc --noEmit -p .` (timeout ~170 s) y `npx eslint <archivos>`. No hay navegador para probar: avisar a Leo que no se probó en pantalla.
6. Migraciones SQL nuevas en `sql/NNN_*.sql`; Leo las corre a mano en Supabase. Usar `WHERE TRUE` en DELETE/UPDATE masivos (safeupdate). Última: `023_valores_labrado.sql`. Pendientes de correr por Leo (confirmar): 017–023.
7. Respuestas al usuario: concisas, en español, sin recapitular todo; decir qué cambió, qué debe hacer (push, SQL, APK) y qué no se pudo probar.
8. Indicar siempre si un cambio **requiere nueva APK** (solo cambios en `pos-app/`: impresión, cámara, permisos, actualizador, arranque) o es solo web.

## App del POS (Flutter, `pos-app/`)
- WebView (`flutter_inappwebview`) que abre la web; handlers JS: `imprimirTicket` (senraise_printer, ticket 80 mm con logo) y `tomarFoto` (image_picker). User agent `FaltasPOS/<build>` (la web muestra la versión al pie del login).
- **Actualización automática:** al iniciar consulta `version.json` en Supabase Storage (bucket público `pos-app`), pantalla de progreso con `ota_update` 6.x; solo se publican la versión actual y la anterior (más vieja = obligatoria).
- **Compilar:** `pos-app\compilar-apk.bat` en la PC de Leo (Java 17 en `C:\jdk17`, Flutter 3.32.8 en `C:\flutter`, parches de ProGuard/compileSdk/NDK vía `preparar.ps1` y `android-extra/`), publica con `publicar.mjs` y instala por adb. `instalar-apk.bat` instala un APK ya compilado. También GitHub Actions (`.github/workflows/pos-apk.yml`).
- Firma fija `pos-app/firma/debug.keystore`; build number = minutos desde 2026-01-01 UTC.
- Leo ya tiene instalada en el POS la versión con el actualizador.

## Lo último que se hizo (14–15/10)
Labrado y app: ticket con confirmación, logo y cortes por palabra; dominio en mayúsculas; «Ver acta» en modal en táctiles; buscador de artículos sin teclado automático; modo depuración (7 toques en la lista de borradores) para ver todas las actas.
Back office: quitar escritos; precarga de datos de la causa en plantillas; montos por artículo editables (`causa_ley_ajuste`, sql/022); valores del labrado fijos con botón «Actualizar a valores vigentes» (sql/023); acciones de la causa en «Recomendadas / Más acciones»; «Esperar al infractor» y «Considerar notificado»; exportación para Apremios (lote APR-AAAA-NNNN, PDF con remito, portada, carátula de deuda y legajo, una sección por hoja).
UI: modo Lista/Tarjetas en todas las listas (`TablaVista`, localStorage); sidebar por hover en 1 s alineado al ítem.
Análisis: cobertura del Informe y lista de faltantes con preguntas (ver docs).

## Próximos pasos
- Esperar respuestas de Leo en `docs/FEATURES-FALTANTES.md`. Las que más destraban: **D1** (¿firma el Intendente fuera del sistema o la Directora dentro?), **A8** (URL oficial para el QR del acta), **B4** (casilla/SMTP no-reply), **D10** (API de Malvinas 2000).
- Rápidos sin bloqueo (si Leo lo pide): A1 (10 fotos + rótulo), A2 (medidas de contravención), A3 (textos de identificación), A6 («Sin dominio»), B3 (formulario de descargo en PDF).
- Antes de producción: seguridad del portal (IDOR), límites de 4,5 MB / 1000 filas, índices y transacciones (auditoría 12/10, `claude/auditoria-escalabilidad-piloto.md`).
- El resto del flujo después de «Notificado» lo valida Leo con el cliente.

## Archivos clave del código
- Labrado: `src/components/CrearEditarInfraccion.tsx`, `crear-editar-utils.ts`, `src/lib/acta-srv.ts` (firmarActa).
- Causa: `src/components/CausaDetalle.tsx` (acciones y modales), `src/app/api/causa/accion/route.ts` (switch de acciones), `src/lib/causa-srv.ts` (valorización, plantillas, notificaciones), `src/lib/dominio.ts` (estados, permisos, claveLey).
- Portal: `src/components/PortalCausa.tsx`, `PortalInicio.tsx`, `PortalCuenta.tsx`, `src/lib/portal-srv.ts`.
- Impresión: `src/lib/print.ts` (ticket, puente POS), `src/lib/acta-oficial.ts`, `src/components/Impresion.tsx`, `ImpresionApremios.tsx`.
- Layout/menú: `src/components/Shell.tsx`; estilos `src/styles.scss` + `src/styles-v2.scss`.
