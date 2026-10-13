# Usado por compilar-apk.bat. Paso "manifest": permisos y nombre. Paso "proguard": parche de flutter_inappwebview.
param([string]$Paso, [string]$Valor)
$ErrorActionPreference = 'Stop'
if ($Paso -eq 'manifest') {
  $m = Join-Path $PSScriptRoot 'android\app\src\main\AndroidManifest.xml'
  $x = [IO.File]::ReadAllText($m)
  foreach ($p in 'INTERNET','CAMERA','ACCESS_FINE_LOCATION','ACCESS_COARSE_LOCATION','REQUEST_INSTALL_PACKAGES') {
    if ($x -notmatch "android\.permission\.$p`"") {
      $x = $x -replace '<application', "<uses-permission android:name=`"android.permission.$p`" />`n    <application"
    }
  }
  $x = $x -replace 'android:label="[^"]*"', 'android:label="Faltas"'
  if ($x -notmatch 'OtaUpdateFileProvider') {
    $prov = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'android-extra\provider.xml'))
    $x = $x -replace '</application>', ($prov + "    </application>")
  }
  [IO.File]::WriteAllText($m, $x)
  $xml = Join-Path $PSScriptRoot 'android\app\src\main\res\xml'
  New-Item -ItemType Directory -Force $xml | Out-Null
  Copy-Item (Join-Path $PSScriptRoot 'android-extra\filepaths.xml') (Join-Path $xml 'filepaths.xml') -Force
}
elseif ($Paso -eq 'gradlejava') {
  $g = Join-Path $PSScriptRoot 'android\gradle.properties'
  $l = Get-Content $g | Where-Object { $_ -notmatch '^org\.gradle\.java\.home=' }
  $l += 'org.gradle.java.home=' + ($Valor -replace '\\', '/')
  Set-Content $g $l
}
elseif ($Paso -eq 'adb') {
  $zip = Join-Path $env:TEMP 'platform-tools.zip'
  Invoke-WebRequest 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip' -OutFile $zip
  Expand-Archive $zip -DestinationPath 'C:\' -Force
}
elseif ($Paso -eq 'jdk') {
  $zip = Join-Path $env:TEMP 'jdk17.zip'
  $tmp = Join-Path $env:TEMP 'jdk17-extraido'
  Invoke-WebRequest 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse' -OutFile $zip
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive $zip -DestinationPath $tmp -Force
  $dir = Get-ChildItem $tmp -Directory | Select-Object -First 1
  Move-Item $dir.FullName 'C:\jdk17'
}
elseif ($Paso -eq 'proguard') {
  $c = if ($env:PUB_CACHE) { $env:PUB_CACHE } else { Join-Path $env:LOCALAPPDATA 'Pub\Cache' }
  Get-ChildItem (Join-Path $c 'hosted') -Recurse -Filter build.gradle -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -like '*flutter_inappwebview*' } |
    ForEach-Object {
      $t = [IO.File]::ReadAllText($_.FullName)
      if ($t -match 'proguard-android\.txt') { [IO.File]::WriteAllText($_.FullName, ($t -replace 'proguard-android\.txt', 'proguard-android-optimize.txt')) }
    }
}
