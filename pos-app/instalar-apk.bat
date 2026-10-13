@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Instalar APK en el POS (Faltas)
cd /d "%~dp0"

rem ============================================================
rem  Instala en el POS (USB + adb) un APK ya compilado, sin volver a compilar.
rem  Uso: doble click (instala pos-app\faltas-pos.apk o, si no existe, el ultimo build)
rem       o  instalar-apk.bat "C:\ruta\al\archivo.apk"
rem ============================================================

set "APK=%~1"
if "%APK%"=="" if exist "faltas-pos.apk" set "APK=%CD%\faltas-pos.apk"
if "%APK%"=="" if exist "build\app\outputs\flutter-apk\app-release.apk" set "APK=%CD%\build\app\outputs\flutter-apk\app-release.apk"
if "%APK%"=="" (
  echo No se encontro ningun APK. Compile con compilar-apk.bat o indique la ruta:  instalar-apk.bat "ruta\al.apk"
  goto :fin
)
if not exist "%APK%" (
  echo No existe: %APK%
  goto :fin
)
echo APK: %APK%
if "%ANDROID_HOME%"=="" if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
echo.
echo === Instalando en el POS por USB (adb) ===
set "ADB="
if exist "%ANDROID_HOME%\platform-tools\adb.exe" set "ADB=%ANDROID_HOME%\platform-tools\adb.exe"
if not defined ADB if exist "C:\platform-tools\adb.exe" set "ADB=C:\platform-tools\adb.exe"
if not defined ADB (
  echo Descargando adb en C:\platform-tools ...
  powershell -NoProfile -ExecutionPolicy Bypass -File preparar.ps1 adb
  if exist "C:\platform-tools\adb.exe" set "ADB=C:\platform-tools\adb.exe"
)
if not defined ADB (
  echo No se pudo obtener adb. Instale el APK copiandolo al POS.
  goto :fin
)
"%ADB%" start-server >nul 2>nul
set "HAY="
for /f "skip=1 tokens=1,2" %%a in ('"%ADB%" devices') do if "%%b"=="device" set "HAY=%%a"
if not defined HAY (
  echo No hay ningun POS conectado y autorizado.
  echo Conecte el POS por USB con "Depuracion USB" activada, acepte el aviso en su pantalla
  echo y presione una tecla para reintentar, o cierre la ventana para terminar.
  pause >nul
  for /f "skip=1 tokens=1,2" %%a in ('"%ADB%" devices') do if "%%b"=="device" set "HAY=%%a"
)
if not defined HAY (
  echo Sigue sin detectarse. El APK queda en %APK%
  goto :fin
)
echo POS detectado: %HAY%
"%ADB%" -s %HAY% install -r "%APK%" > "%TEMP%\faltas-adb.txt" 2>&1
type "%TEMP%\faltas-adb.txt"
findstr /c:"Success" "%TEMP%\faltas-adb.txt" >nul && goto :instalado
findstr /i /c:"UPDATE_INCOMPATIBLE" /c:"SIGNATURES" /c:"VERSION_DOWNGRADE" "%TEMP%\faltas-adb.txt" >nul
if not errorlevel 1 (
  echo La app instalada tiene otra firma o una version mayor.
  choice /m "Desinstalarla (se borran sus datos) e instalar esta"
  if errorlevel 2 goto :fin
  "%ADB%" -s %HAY% uninstall ar.gob.malvinasargentinas.faltas_pos
  "%ADB%" -s %HAY% install "%APK%" > "%TEMP%\faltas-adb.txt" 2>&1
  type "%TEMP%\faltas-adb.txt"
  findstr /c:"Success" "%TEMP%\faltas-adb.txt" >nul && goto :instalado
)
echo *** No se pudo instalar. Copie el mensaje de arriba. ***
goto :fin

:instalado
echo Instalada. Abriendo la app en el POS...
"%ADB%" -s %HAY% shell monkey -p ar.gob.malvinasargentinas.faltas_pos -c android.intent.category.LAUNCHER 1 >nul 2>nul

:fin
pause
exit /b 0
