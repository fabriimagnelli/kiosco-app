# ============================================================================
# SCRIPT DE PUBLICACION - SACWare Kiosco
# ============================================================================
# USO: Abrir PowerShell en la carpeta del proyecto y ejecutar:
#   .\publicar.ps1
#   .\publicar.ps1 -Notas "Descripcion de cambios"
#   .\publicar.ps1 -SinPublicar        (solo buildea, no sube a GitHub)
#
# IMPORTANTE: El proyecto esta en OneDrive, que bloquea archivos .asar.
# Este script buildea en C:\temp\KioscoApp-build para evitar ese problema.
# ============================================================================

param(
    [string]$Notas = "",
    [switch]$SinPublicar
)

$ErrorActionPreference = "Stop"
$ProjectDir = "C:\Users\Fabri\OneDrive\Desktop\KioscoApp"
$BuildDir = "C:\temp\KioscoApp-build"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SACWare Kiosco - Publicar Release" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Paso 1: Verificar requisitos ---
Write-Host "[1/7] Verificando requisitos..." -ForegroundColor Yellow

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  ERROR: Node.js no esta instalado." -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js OK" -ForegroundColor Green

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "  ERROR: GitHub CLI (gh) no esta instalado." -ForegroundColor Red
    Write-Host ""
    Write-Host "  SOLUCION: Ejecuta este comando e intenta de nuevo:" -ForegroundColor Yellow
    Write-Host "    winget install GitHub.cli" -ForegroundColor White
    exit 1
}

$ErrorActionPreference = "Continue"
gh auth status 2>&1 | Out-Null
$ghAuthExit = $LASTEXITCODE
$ErrorActionPreference = "Stop"
if ($ghAuthExit -ne 0) {
    Write-Host "  ERROR: No estas autenticado en GitHub." -ForegroundColor Red
    Write-Host ""
    Write-Host "  SOLUCION: Ejecuta este comando e intenta de nuevo:" -ForegroundColor Yellow
    Write-Host "    gh auth login" -ForegroundColor White
    Write-Host "    (Elegir: GitHub.com > HTTPS > Login with browser)" -ForegroundColor Gray
    exit 1
}
Write-Host "  GitHub CLI autenticado OK" -ForegroundColor Green

$env:GH_TOKEN = (gh auth token)

# --- Paso 2: Bump de version automatico ---
Write-Host "[2/8] Gestion de version..." -ForegroundColor Yellow

$packageJsonPath = Join-Path $ProjectDir "package.json"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version

Write-Host "  Version actual: v$currentVersion" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Selecciona el tipo de cambio:" -ForegroundColor White
Write-Host "    [1] patch  (bug fixes, ajustes menores)   -> ej: 1.3.5 -> 1.3.6" -ForegroundColor Gray
Write-Host "    [2] minor  (nuevas funciones)              -> ej: 1.3.5 -> 1.4.0" -ForegroundColor Gray  
Write-Host "    [3] major  (cambios grandes/incompatibles) -> ej: 1.3.5 -> 2.0.0" -ForegroundColor Gray
Write-Host "    [4] sin cambio (publicar con v$currentVersion)" -ForegroundColor Gray
Write-Host ""

$bumpChoice = Read-Host "  Opcion (1/2/3/4) [default=1]"
if (-not $bumpChoice) { $bumpChoice = "1" }

switch ($bumpChoice) {
    "1" { $bumpType = "patch" }
    "2" { $bumpType = "minor" }
    "3" { $bumpType = "major" }
    "4" { $bumpType = $null }
    default { 
        Write-Host "  Opcion invalida. Usando patch." -ForegroundColor Yellow
        $bumpType = "patch"
    }
}

if ($bumpType) {
    # Calcular nueva version manualmente (sin npm version para evitar git tags)
    $parts = $currentVersion.Split('.')
    $vMajor = [int]$parts[0]
    $vMinor = [int]$parts[1]
    $vPatch = [int]$parts[2]
    
    switch ($bumpType) {
        "patch" { $vPatch++ }
        "minor" { $vMinor++; $vPatch = 0 }
        "major" { $vMajor++; $vMinor = 0; $vPatch = 0 }
    }
    
    $newVersion = "$vMajor.$vMinor.$vPatch"
    
    # Actualizar package.json
    $packageJson.version = $newVersion
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -Encoding UTF8
    
    Write-Host "  Bump: v$currentVersion -> v$newVersion ($bumpType)" -ForegroundColor Green
    $version = $newVersion
} else {
    Write-Host "  Sin cambio de version: v$currentVersion" -ForegroundColor Green  
    $version = $currentVersion
}

Write-Host ""

# --- Paso 3: Cerrar procesos que bloquean ---
Write-Host "[3/8] Cerrando procesos que bloquean archivos..." -ForegroundColor Yellow

@("SACWare Kiosco", "electron") | ForEach-Object {
    $p = Get-Process -Name $_ -ErrorAction SilentlyContinue
    if ($p) {
        Write-Host "  Cerrando: $_" -ForegroundColor Gray
        $p | Stop-Process -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 1
Write-Host "  OK" -ForegroundColor Green
Write-Host ""

# --- Paso 4: Copiar proyecto a C:\temp (fuera de OneDrive) ---
Write-Host "[4/8] Preparando carpeta de build fuera de OneDrive..." -ForegroundColor Yellow

if (Test-Path $BuildDir) {
    Remove-Item $BuildDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null

Write-Host "  Copiando proyecto a $BuildDir..." -ForegroundColor Gray
robocopy $ProjectDir $BuildDir /mir /xd "dist_electron" ".git" /xf "*.db" /njh /njs /np /ndl /nfl | Out-Null

if (-not (Test-Path "$BuildDir\package.json")) {
    Write-Host "  ERROR: No se pudo copiar el proyecto." -ForegroundColor Red
    exit 1
}
Write-Host "  Proyecto copiado OK" -ForegroundColor Green
Write-Host ""

# --- Paso 5: Buildear ---
Write-Host "[5/8] Buildeando aplicacion (1-3 minutos)..." -ForegroundColor Yellow
Write-Host ""

Set-Location $BuildDir

Write-Host "  [Vite] Compilando frontend..." -ForegroundColor Gray
$ErrorActionPreference = "Continue"
cmd /c "npm run build 2>&1"
$viteExit = $LASTEXITCODE
$ErrorActionPreference = "Stop"
if ($viteExit -ne 0) {
    Write-Host ""
    Write-Host "  ERROR: Fallo la compilacion de Vite." -ForegroundColor Red
    Write-Host ""
    Write-Host "  SOLUCION: Revisa errores de sintaxis en tus archivos .jsx/.js" -ForegroundColor Yellow
    Set-Location $ProjectDir
    exit 1
}
Write-Host "  [Vite] OK" -ForegroundColor Green
Write-Host ""

Write-Host "  [Electron] Empaquetando y publicando..." -ForegroundColor Gray
if ($SinPublicar) {
    $ErrorActionPreference = "Continue"
    cmd /c "npx electron-builder 2>&1"
    $ebExit = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
} else {
    # --publish always hace que electron-builder suba los archivos a GitHub
    # con los nombres correctos que coinciden con latest.yml
    $ErrorActionPreference = "Continue"
    cmd /c "npx electron-builder --publish always 2>&1"
    $ebExit = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
}
if ($ebExit -ne 0) {
    Write-Host ""
    Write-Host "  ERROR: Fallo electron-builder." -ForegroundColor Red
    Write-Host ""
    Write-Host "  SOLUCIONES COMUNES:" -ForegroundColor Yellow
    Write-Host "    - 'Cannot find module': Ejecuta 'npm install' y reintenta" -ForegroundColor White
    Write-Host "    - 'EPERM': Ejecuta PowerShell como Administrador" -ForegroundColor White
    Write-Host "    - 'icon not found': Verifica que build/icon.ico existe" -ForegroundColor White
    Write-Host "    - 'HttpError: Bad credentials': Ejecuta 'gh auth login'" -ForegroundColor White
    Set-Location $ProjectDir
    exit 1
}
Write-Host ""
Write-Host "  [Electron] OK" -ForegroundColor Green
Write-Host ""

# --- Paso 6: Verificar archivos generados ---
Write-Host "[6/8] Verificando archivos generados..." -ForegroundColor Yellow

$distDir = Join-Path $BuildDir "dist_electron"
$setupExe = Get-ChildItem $distDir -Filter "SACWare Kiosco Setup $version.exe" -ErrorAction SilentlyContinue
$blockmap = Get-ChildItem $distDir -Filter "SACWare Kiosco Setup $version.exe.blockmap" -ErrorAction SilentlyContinue
$latestYml = Join-Path $distDir "latest.yml"

if (-not $setupExe) {
    Write-Host "  ERROR: No se genero el instalador .exe" -ForegroundColor Red
    Write-Host "  Archivos encontrados:" -ForegroundColor Gray
    Get-ChildItem $distDir -File | ForEach-Object { Write-Host "    $($_.Name)" -ForegroundColor Gray }
    Set-Location $ProjectDir
    exit 1
}
if (-not $blockmap) {
    Write-Host "  ERROR: No se genero el .blockmap" -ForegroundColor Red
    Set-Location $ProjectDir
    exit 1
}
if (-not (Test-Path $latestYml)) {
    Write-Host "  ERROR: No se genero latest.yml" -ForegroundColor Red
    Set-Location $ProjectDir
    exit 1
}

$sizeMB = [math]::Round($setupExe.Length / 1MB, 1)
Write-Host "  $($setupExe.Name) ($sizeMB MB)" -ForegroundColor Green
Write-Host "  $($blockmap.Name)" -ForegroundColor Green
Write-Host "  latest.yml" -ForegroundColor Green
Write-Host ""

if ($SinPublicar) {
    Write-Host "  Build completo (sin publicar). Archivos en: $distDir" -ForegroundColor Cyan
    Set-Location $ProjectDir
    exit 0
}

# --- Paso 7: Git commit + tag + push ---
Write-Host "[7/8] Subiendo cambios a Git..." -ForegroundColor Yellow

Set-Location $ProjectDir
$ErrorActionPreference = "Continue"
cmd /c "git add -A 2>&1" | Out-Null
$changes = cmd /c "git status --porcelain 2>&1"
if ($changes) {
    cmd /c "git commit -m `"v$version`" 2>&1" | Out-Null
    Write-Host "  Commit creado" -ForegroundColor Green
} else {
    Write-Host "  Sin cambios nuevos" -ForegroundColor Green
}

# Crear git tag para la version
$ErrorActionPreference = "Continue"
cmd /c "git tag -a `"v$version`" -m `"Release v$version`" 2>&1" | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Tag v$version creado" -ForegroundColor Green
} else {
    Write-Host "  Tag v$version ya existia (omitido)" -ForegroundColor Gray
}

cmd /c "git push origin main 2>&1" | Out-Null
cmd /c "git push origin --tags 2>&1" | Out-Null
$ErrorActionPreference = "Stop"
Write-Host "  Push OK (codigo + tags)" -ForegroundColor Green
Write-Host ""

# --- Paso 8: Verificar release en GitHub ---
Write-Host "[8/8] Verificando release en GitHub..." -ForegroundColor Yellow

# electron-builder --publish always ya creo la release y subio los archivos
# Solo verificamos que exista y editamos las notas si se proporcionaron
Start-Sleep -Seconds 3
$ErrorActionPreference = "Continue"
gh release view "v$version" 2>&1 | Out-Null
$releaseExists = $LASTEXITCODE
$ErrorActionPreference = "Stop"

if ($releaseExists -ne 0) {
    Write-Host "  ADVERTENCIA: La release no se encontro en GitHub." -ForegroundColor Yellow
    Write-Host "  electron-builder puede haberla creado como draft." -ForegroundColor Gray
    Write-Host "  Verificar manualmente en: https://github.com/fabriimagnelli/kiosco-app/releases" -ForegroundColor Gray
} else {
    # electron-builder crea releases como draft, hay que publicarlas
    $isDraft = gh release view "v$version" --json isDraft --jq ".isDraft" 2>&1
    if ($isDraft -eq "true") {
        gh release edit "v$version" --draft=false 2>&1 | Out-Null
        Write-Host "  Release v$version publicada (quitado draft)" -ForegroundColor Green
    } else {
        Write-Host "  Release v$version ya estaba publicada" -ForegroundColor Green
    }
    
    if ($Notas) {
        gh release edit "v$version" --notes "$Notas" 2>&1 | Out-Null
        Write-Host "  Notas actualizadas" -ForegroundColor Green
    }
}

# Verificar que los nombres de archivos coincidan con latest.yml
Write-Host ""
Write-Host "  Verificando nombres de archivos..." -ForegroundColor Gray
$assets = gh release view "v$version" --json assets --jq ".assets[].name" 2>&1
$ymlContent = Get-Content $latestYml -Raw
if ($ymlContent -match 'url: (.+\.exe)') {
    $expectedName = $Matches[1].Trim()
    if ($assets -match [regex]::Escape($expectedName)) {
        Write-Host "  NOMBRES OK: latest.yml coincide con los assets" -ForegroundColor Green
    } else {
        Write-Host "  ADVERTENCIA: Posible mismatch de nombres" -ForegroundColor Yellow
        Write-Host "  latest.yml espera: $expectedName" -ForegroundColor Gray
        Write-Host "  GitHub tiene: $assets" -ForegroundColor Gray
    }
}

Write-Host ""

Set-Location $ProjectDir

Write-Host "========================================" -ForegroundColor Green
Write-Host "  PUBLICACION COMPLETA! v$version" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URL: https://github.com/fabriimagnelli/kiosco-app/releases/tag/v$version" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Los clientes recibiran la actualizacion:" -ForegroundColor White
Write-Host "    - En 10 seg si reinician la app" -ForegroundColor Gray
Write-Host "    - En max 30 min si la tienen abierta" -ForegroundColor Gray
Write-Host ""
