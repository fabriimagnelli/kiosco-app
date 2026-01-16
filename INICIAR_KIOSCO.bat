@echo off
title SISTEMA DE KIOSCO
color 0A

REM ==========================================
REM      INICIANDO SISTEMA (MODO RAPIDO)
REM ==========================================

REM 1. Matar procesos anteriores por si quedaron colgados
taskkill /IM node.exe /F 2>nul
timeout /t 1 /nobreak >nul

cd server

REM 2. Iniciar servidor en SEGUNDO PLANO (Sin ventana extra)
REM Usamos /b para que no abra otra terminal. Al lanzarlo desde el VBS, todo queda oculto.
start /b npm start

REM 3. Esperar solo un momento para asegurar que el servidor arranque
timeout /t 2 /nobreak >nul

REM 4. Abrir el navegador
start http://localhost:3001