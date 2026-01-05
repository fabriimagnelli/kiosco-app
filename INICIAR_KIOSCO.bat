@echo off
title SISTEMA DE KIOSCO - NO CERRAR ESTA VENTANA
color 0A

echo ==========================================
echo      INICIANDO SISTEMA DE GESTION
echo ==========================================
echo.
echo 1. Iniciando Servidor y Base de Datos...
echo 2. Abriendo el Sistema en el Navegador...
echo.
echo POR FAVOR NO CIERRE ESTA VENTANA NEGRA MIENTRAS USE EL SISTEMA.
echo.

REM Matar procesos node anteriores
taskkill /IM node.exe /F 2>nul
timeout /t 1 /nobreak >nul

cd server

echo Iniciando servidor...
start "Servidor Kiosco" cmd /k "npm start"

REM Esperar 5 segundos a que el servidor arranque
timeout /t 5 /nobreak >nul

echo Abriendo navegador...
start http://localhost:3001