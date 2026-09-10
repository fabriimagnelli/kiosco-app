import fs from 'fs';
import path from 'path';

const files = [
  'REDISEÑO-CIGARRILLOS-2026-02-06.txt',
  'VISUAL-GUIA-SOLUCION.txt',
  'CAMBIOS-REALIZADOS.txt',
  'SISTEMA-INSTALABLE-LISTO.txt',
  'GUIA-INSTALL.txt',
  'INSTALL.bat',
  'GUIA-RAPIDA-CIGARRILLOS-NUEVO.txt',
];

const rootDir = process.cwd();
let removed = 0;

for (const file of files) {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) continue;
  fs.rmSync(filePath, { force: true });
  removed += 1;
  console.log(`Eliminado: ${file}`);
}

console.log(`Limpieza completada. Archivos eliminados: ${removed}`);
