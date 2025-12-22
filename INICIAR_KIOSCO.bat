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

cd server
start http://localhost:3001
npm start