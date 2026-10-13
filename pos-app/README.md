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
`firma\debug.keystore` (respalda y restaura la clave debug propia de la PC) y deja `pos-app\faltas-pos.apk`.
La primera compilación tarda; las siguientes, 1–2 minutos.
