# Usado por compilar-apk.bat. Paso "manifest": permisos y nombre. Paso "proguard": parche de flutter_inappwebview.
param([string]$Paso)
$ErrorActionPreference = 'Stop'
if ($Paso -eq 'manifest') {
  $m = Join-Path $PSScriptRoot 'android\app\src\main\AndroidManifest.xml'
  $x = [IO.File]::ReadAllText($m)
  foreach ($p in 'INTERNET','CAMERA','ACCESS_FINE_LOCATION','ACCESS_COARSE_LOCATION') {
    if ($x -notmatch "android\.permission\.$p`"") {
      $x = $x -replace '<application', "<uses-permission android:name=`"android.permission.$p`" />`n    <application"
    }
  }
  $x = $x -replace 'android:label="[^"]*"', 'android:label="Faltas"'
  [IO.File]::WriteAllText($m, $x)
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
