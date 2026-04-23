# REPSUM - Tesseract Setup for Bundling
# Descarga Tesseract OCR portable para bundlear en el instalador

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$SidecarDir = Join-Path $ProjectRoot "repsum\src-tauri\sidecar"
$TesseractDir = Join-Path $SidecarDir "tesseract"
$TempDir = [System.IO.Path]::GetTempPath()
$ZipFile = Join-Path $TempDir "tesseract-portable.zip"

$TesseractUrl = "https://github.com/UB-Mannheim/tesseract/releases/download/v5.3.3/tesseract-ocr-w64-portable-v5.3.3.zip"

Write-Host ""
Write-Host "=== REPSUM Tesseract Setup ===" -ForegroundColor Cyan
Write-Host "Descargando Tesseract OCR (~150MB)..."
Write-Host ""

try {
    if (Test-Path $TesseractDir) {
        Remove-Item -Path $TesseractDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $TesseractDir | Out-Null

    $ProgressPreference = 'SilentlyContinue'
    Write-Host "Descargando desde: $TesseractUrl"
    Invoke-WebRequest -Uri $TesseractUrl -OutFile $ZipFile -UseBasicParsing
    Write-Host "Descarga completada. Extrayendo..."

    $ExtractDir = Join-Path $TempDir "tesseract-extract"
    if (Test-Path $ExtractDir) {
        Remove-Item -Path $ExtractDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $ExtractDir | Out-Null
    Expand-Archive -Path $ZipFile -DestinationPath $ExtractDir -Force

    $TesseractPortable = Get-ChildItem -Path $ExtractDir -Filter "tesseract-ocr*" -Directory | Select-Object -First 1
    if (-not $TesseractPortable) {
        throw "No se encontro tesseract-ocr en el zip"
    }

    $SourcePath = $TesseractPortable.FullName
    Write-Host "Copiando archivos desde: $SourcePath"

    # Copiar exe
    $ExeSource = Join-Path $SourcePath "tesseract.exe"
    if (Test-Path $ExeSource) {
        Copy-Item -Path $ExeSource -Destination (Join-Path $TesseractDir "tesseract.exe")
        Write-Host "OK: tesseract.exe"
    }

    # Copiar DLLs
    Get-ChildItem -Path $SourcePath -Filter "*.dll" | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination (Join-Path $TesseractDir $_.Name)
    }
    Write-Host "OK: DLLs copiadas"

    # Copiar tessdata
    $TessdataSource = Join-Path $SourcePath "tessdata"
    if (Test-Path $TessdataSource) {
        Copy-Item -Path $TessdataSource -Destination (Join-Path $TesseractDir "tessdata") -Recurse
        Write-Host "OK: tessdata"
    }

    Remove-Item -Path $ZipFile -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $ExtractDir -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host "Tesseract listo en: $TesseractDir" -ForegroundColor Green
    Write-Host ""
    Write-Host "Proximos pasos:"
    Write-Host "  1. .\scripts\build-sidecar.ps1"
    Write-Host "  2. cd repsum"
    Write-Host "  3. npm run tauri build"
    Write-Host ""

} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}
