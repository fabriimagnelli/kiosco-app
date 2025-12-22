@echo off
setlocal
title GENERANDO RESPALDO...
color 1F

echo ==========================================
echo      GENERANDO COPIA DE SEGURIDAD...
echo ==========================================
echo.

:: 1. Obtener fecha y hora de forma segura (Universal)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "anio=%datetime:~0,4%"
set "mes=%datetime:~4,2%"
set "dia=%datetime:~6,2%"
set "hora=%datetime:~8,2%"
set "min=%datetime:~10,2%"

set "nombre_archivo=Respaldo_%anio%-%mes%-%dia%_%hora%-%min%.db"

:: 2. Crear carpeta si no existe
if not exist "Backups" mkdir "Backups"

:: 3. Verificar que exista la base de datos antes de copiar
if not exist "server\kiosco.db" (
    color 4F
    echo ERROR CRITICO: No se encuentra el archivo "server\kiosco.db"
    echo.
    echo Asegurate de que este archivo .bat este en la carpeta KioscoApp.
    pause
    exit
)

:: 4. Copiar
copy "server\kiosco.db" "Backups\%nombre_archivo%"

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo    !COPIA GUARDADA EXITOSAMENTE!
    echo ==========================================
    echo Archivo: %nombre_archivo%
) else (
    color 4F
    echo.
    echo !ERROR AL COPIAR EL ARCHIVO!
)

echo.
pause