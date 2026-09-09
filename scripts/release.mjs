import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

const args = new Map(
  process.argv.slice(2).map((entry) => {
    const [key, value = 'true'] = entry.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const projectDir = process.cwd();
const buildDir = args.get('buildDir') || path.join(os.tmpdir(), 'KioscoApp-build');
const publish = args.get('publish') === 'true';
const bump = args.get('bump') || 'none';
const packageJsonPath = path.join(projectDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const runCommand = (command, commandArgs, cwd) => {
  const executable = process.platform === 'win32' ? `${command}.cmd` : command;
  const result = spawnSync(executable, commandArgs, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

const bumpVersion = (version, type) => {
  const [major, minor, patch] = version.split('.').map(Number);
  if (type === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  if (type === 'major') return `${major + 1}.0.0`;
  return version;
};

const copyFilter = (source) => {
  const relative = path.relative(projectDir, source);
  if (!relative) return true;
  if (relative.startsWith('.git')) return false;
  if (relative.startsWith('dist_electron')) return false;
  if (relative.startsWith('tmp-userdata')) return false;
  if (relative.endsWith('.db')) return false;
  if (relative.endsWith('.db-journal')) return false;
  if (relative.endsWith('.db-shm')) return false;
  if (relative.endsWith('.db-wal')) return false;
  return true;
};

const nextVersion = bumpVersion(packageJson.version, bump);
if (nextVersion !== packageJson.version) {
  packageJson.version = nextVersion;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf-8');
  console.log(`Versión actualizada: ${nextVersion}`);
} else {
  console.log(`Versión sin cambios: ${packageJson.version}`);
}

fs.rmSync(buildDir, { recursive: true, force: true });
fs.mkdirSync(buildDir, { recursive: true });
fs.cpSync(projectDir, buildDir, { recursive: true, filter: copyFilter });

console.log(`Proyecto copiado a: ${buildDir}`);
runCommand('npm', ['run', 'build'], buildDir);
runCommand('npx', ['electron-builder', ...(publish ? ['--publish', 'always'] : [])], buildDir);

console.log(`Release completado en: ${path.join(buildDir, 'dist_electron')}`);
