# App del inspector para el POS Senraise H10S

App Android mínima (Flutter) que abre el Sistema de Faltas a pantalla completa y le agrega la impresión
**nativa** del ticket con la impresora térmica de 80 mm del Senraise H10S, usando
[`senraise_printer`](https://pub.dev/packages/senraise_printer).

## Cómo funciona

1. La app abre la web (`APP_URL`) en un WebView con GPS y cámara habilitados (labrado, fotos).
2. Al tocar «Imprimir ticket», la web (`printTicket` en `src/lib/print.ts`) detecta la app
   (`window.flutter_inappwebview`) y le pasa los datos del ticket (`datosTicket`).
3. La app imprime con el SDK de Senraise: texto con la fuente de la impresora, en negrita y tamaños grandes,
   y el **QR nativo** (nítido). Sin diálogo de impresión.
4. Fuera de la app (navegador común) o si la impresora falla, la web usa el ticket HTML de 80 mm.

## Otros POS (ej. Symcode MJ-Q50)

`lib/impresoras.dart` elige la vía según el equipo:

- **Senraise** (tiene instalado `recieptservice.com.recieptservice` o el modelo dice Senraise/H10): SDK de Senraise, como siempre.
- **Nyx** (servicio `net.nyx.printerservice` o `com.incar.printerservice`; el **Symcode MJ-Q50** reporta fabricante «NB55»):
  `lib/impresora_nyx.dart` arma el ticket y `android-extra/MainActivity.kt` lo imprime llamando al servicio por Binder
  (interfaz del fabricante, github.com/yzzzdev/NyxPrinterClient; el plugin nyx_printer_v2 1.2.2 no compila).
- **Otros:** impresora interna vinculada por **Bluetooth** (dirección `00:11:22:33:44:55` o un nombre tipo
  «InnerPrinter»/«Printer»), con comandos **ESC/POS** armados en `lib/ticket_escpos.dart` (logo, textos, QR nativo,
  tildes con la tabla WPC1252). El canal nativo está en `android-extra/MainActivity.kt` (se copia al compilar).
- Si no hay impresora, la app devuelve el error y la web lo muestra y ofrece la impresión del sistema
  (antes, en un POS sin Senraise, el plugin no respondía nunca y no pasaba nada).

**Prueba de impresora:** en el login, mantener apretado «App POS v…» 1,5 s. Muestra el equipo, los Bluetooth
vinculados y la vía automática; permite forzar la vía, elegir el dispositivo, el papel (58/80 mm), el tamaño del QR,
imprimir sin tildes o sin logo, e imprimir un ticket de prueba. Los ajustes se guardan en ese equipo.

## Compilar sin instalar nada (recomendado): GitHub Actions

1. Hacer `git push` (o en GitHub: **Actions → APK del POS → Run workflow**, donde se puede cambiar la URL).
2. Cuando termine (unos 5–8 minutos), entrar a la ejecución y descargar el artifact **faltas-pos-apk** (un .zip con `app-release.apk`).
3. Pasar el APK al H10S (cable, Drive o WhatsApp) e instalarlo (habilitar «Instalar apps desconocidas»).

El workflow genera la carpeta `android/`, agrega los permisos y compila. Está en `.github/workflows/pos-apk.yml`.

## Compilar en la PC (opcional)

Requiere Flutter 3.24+ y Android SDK. En Windows: instalar [Android Studio](https://developer.android.com/studio) y
[Flutter](https://docs.flutter.dev/get-started/install/windows/mobile) (descomprimir, agregar `flutter\bin` al PATH y
correr `flutter doctor --android-licenses`). Verificar con `flutter doctor`.

```bash
cd pos-app
flutter create --platforms=android --org ar.gob.malvinasargentinas .   # genera la carpeta android/ (una sola vez)
flutter pub get
flutter build apk --release --dart-define=APP_URL=https://piloto-faltas.vercel.app
# APK: build/app/outputs/flutter-apk/app-release.apk  → instalar en el H10S
```

En `android/app/src/main/AndroidManifest.xml` agregar (antes de `<application>`):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

y en `android/app/build.gradle` usar `minSdkVersion 21` o mayor.

## Ajustes en el equipo

- **Oscuridad de impresión:** `setDark(3)` en `lib/impresora_ticket.dart` (bajar a 2 si el papel se mancha).
- **Tamaño del QR:** `printQRCode(url, 8, 2)`: el 8 es el tamaño del módulo (subir a 9–10 si se quiere más grande).
- **Separador:** 48 guiones = ancho de 80 mm con la letra de 24; ajustar si queda corto o largo.

> Probado solo a nivel de código: los valores de tamaño de letra, oscuridad y QR deben afinarse con el equipo en mano.

## Firma del APK

Todos los APK se firman con `firma/debug.keystore` (alias `androiddebugkey`, clave `android`), así cada versión nueva
actualiza la instalada. Si Android muestra «Cancelando...» al instalar, la app instalada tiene otra firma
(versiones anteriores a este cambio): desinstalarla una vez y volver a instalar. Para producción conviene una clave propia guardada como secreto de GitHub.

## Compilar en la PC con `compilar-apk.bat`

Doble click en `pos-app\compilar-apk.bat` (opcional: `compilar-apk.bat https://otra-url`). Verifica Flutter
(si falta, ofrece descargar la 3.32.8 en `C:\flutter`; requiere Git), el Android SDK (instalar Android Studio y
abrirlo una vez) y Java (usa el de Android Studio). Hace los mismos pasos que GitHub Actions, firma con
`firma\debug.keystore` (respalda y restaura la clave debug propia de la PC) y deja `pos-app\faltas-pos.apk`; si hay un POS conectado por USB con depuración activada, lo instala con adb (lo descarga si falta) y abre la app.
La primera compilación tarda; las siguientes, 1–2 minutos.

## Actualizaciones automáticas

Al abrir la app consulta `version.json` en Supabase Storage (bucket público `pos-app`). Si hay una versión
más nueva muestra una pantalla dedicada: descarga con barra de progreso, luego Android pide confirmar
«Actualizar» y la app se reinicia con la versión nueva. Sin conexión, la app sigue con la versión instalada.

- Se publican solo dos versiones: la **actual** y la **anterior** (las demás se borran del bucket).
- Con la versión anterior se puede elegir «Seguir con la versión actual»; con una más vieja la actualización es obligatoria.
- Publicar: `compilar-apk.bat` pregunta al final (usa `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
  del `.env.local` y necesita Node). En GitHub Actions publica si existen los secretos `SUPABASE_URL` y
  `SUPABASE_SERVICE_ROLE_KEY` (Settings → Secrets and variables → Actions). También a mano:
  `node pos-app/publicar.mjs <apk> <build>`.
- Número de versión: minutos desde el 1/1/2026 (UTC), igual en la PC y en GitHub, así siempre crece.
- La primera vez Android pide permitir «Instalar apps desconocidas» para Faltas.

## Instalar sin compilar: `instalar-apk.bat`

Instala en el POS por USB (adb) el último APK compilado (`pos-app\faltas-pos.apk` o el de `build\`), o el que se
indique: `instalar-apk.bat "C:\ruta\app-release.apk"`. Útil si la compilación terminó pero falló la instalación,
o para instalar un APK descargado de GitHub.
