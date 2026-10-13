@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Compilar APK del POS (Faltas)
cd /d "%~dp0"

rem ============================================================
rem  Compila el APK del POS en esta PC (igual que GitHub Actions).
rem  Uso: doble click, o  compilar-apk.bat [URL del sistema]
rem  Resultado: pos-app\faltas-pos.apk
rem ============================================================

set "APP_URL=%~1"
if "%APP_URL%"=="" set "APP_URL=https://piloto-faltas.vercel.app"

echo.
echo === 1/6 Verificando herramientas ===

rem --- Flutter: en el PATH, o en C:\flutter o %USERPROFILE%\flutter
where flutter >nul 2>nul
if errorlevel 1 (
  if exist "C:\flutter\bin\flutter.bat" set "PATH=C:\flutter\bin;!PATH!"
  if exist "%USERPROFILE%\flutter\bin\flutter.bat" set "PATH=%USERPROFILE%\flutter\bin;!PATH!"
)
where flutter >nul 2>nul
if errorlevel 1 (
  echo No se encontro Flutter.
  where git >nul 2>nul
  if errorlevel 1 (
    echo Instale Git ^(https://git-scm.com/download/win^) o Flutter a mano en C:\flutter y vuelva a ejecutar.
    goto :error
  )
  choice /m "Descargar Flutter 3.32.8 en C:\flutter ahora (unos 2 GB)"
  if errorlevel 2 goto :error
  git clone --depth 1 -b 3.32.8 https://github.com/flutter/flutter.git C:\flutter || goto :error
  set "PATH=C:\flutter\bin;!PATH!"
)

rem --- Android SDK (se instala con Android Studio)
if "%ANDROID_HOME%"=="" if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if "%ANDROID_HOME%"=="" (
  echo No se encontro el Android SDK.
  echo Instale Android Studio ^(https://developer.android.com/studio^), abralo una vez para que descargue el SDK
  echo y vuelva a ejecutar este archivo.
  goto :error
)
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"

rem --- Java compatible con Gradle 8 (17 a 21). Java 22+ falla ("25.0.3"), asi que no se usa el del sistema:
rem     Se usa siempre C:\jdk17 (se descarga solo, unos 190 MB). El de Android Studio nuevo tambien es Java 25.
set "JDK="
if exist "C:\jdk17\bin\java.exe" set "JDK=C:\jdk17"
if not defined JDK (
  echo Descargando Java 17 en C:\jdk17 ...
  powershell -NoProfile -ExecutionPolicy Bypass -File preparar.ps1 jdk || goto :error
  set "JDK=C:\jdk17"
)
set "JAVA_HOME=%JDK%"
set "PATH=%JDK%\bin;!PATH!"
echo Java: %JDK%

call flutter config --android-sdk "%ANDROID_HOME%" >nul
call flutter config --jdk-dir "%JDK%" >nul
rem Gradle usa este Java aunque el sistema tenga otro
if exist android\gradle.properties powershell -NoProfile -ExecutionPolicy Bypass -File preparar.ps1 gradlejava "%JDK%"
rem Detiene daemons de Gradle que hayan arrancado con otro Java
if exist android\gradlew.bat call android\gradlew.bat -p android --stop >nul 2>nul
echo Flutter, Android SDK y Java OK.
echo Si es la primera vez y falla por licencias, ejecute:  flutter doctor --android-licenses

echo.
echo === 2/6 Proyecto Android ===
if not exist android (
  call flutter create --platforms=android --org ar.gob.malvinasargentinas --project-name faltas_pos . || goto :error
)

echo.
echo === 3/6 Permisos y nombre visible ===
powershell -NoProfile -ExecutionPolicy Bypass -File preparar.ps1 manifest || goto :error

echo.
echo === 4/6 Dependencias ===
call flutter pub get || goto :error
rem AGP nuevos rechazan proguard-android.txt (flutter_inappwebview)
powershell -NoProfile -ExecutionPolicy Bypass -File preparar.ps1 proguard

echo.
echo === 5/6 Firma fija (para poder actualizar la app instalada) ===
set "KS=%USERPROFILE%\.android\debug.keystore"
if not exist "%USERPROFILE%\.android" mkdir "%USERPROFILE%\.android"
set "RESPALDO="
if exist "%KS%" (
  fc /b "%KS%" "firma\debug.keystore" >nul 2>nul
  if errorlevel 1 ( copy /y "%KS%" "%KS%.respaldo-faltas" >nul & set "RESPALDO=1" )
)
copy /y "firma\debug.keystore" "%KS%" >nul

echo.
echo === 6/6 Compilando (la primera vez tarda; las siguientes, 1-2 minutos) ===
for /f %%i in ('powershell -NoProfile -Command "[int]((Get-Date).ToUniversalTime() - (Get-Date 2026-01-01)).TotalMinutes"') do set "BUILD=%%i"
call flutter build apk --release --build-number=%BUILD% --dart-define=APP_URL=%APP_URL%
set "RES=%errorlevel%"
if defined RESPALDO move /y "%KS%.respaldo-faltas" "%KS%" >nul
if not "%RES%"=="0" goto :error

copy /y "build\app\outputs\flutter-apk\app-release.apk" "faltas-pos.apk" >nul
echo.
echo ============================================================
echo  Listo: %CD%\faltas-pos.apk
echo  Sistema: %APP_URL%   Version: %BUILD%
echo ============================================================
explorer /select,"%CD%\faltas-pos.apk"
pause
exit /b 0

:error
echo.
echo *** No se pudo compilar. Revise el mensaje de arriba. ***
pause
exit /b 1
