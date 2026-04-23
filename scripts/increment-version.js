#!/usr/bin/env node

/**
 * Script para incrementar la versión automáticamente en cada build
 * Tauri solo acepta semver (3 números), así que:
 * - tauri.conf.json: 0.1.x (incrementa el patch)
 * - package.json: 0.1.1.x (4 números para versionado detallado)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tauriConfPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
const releaseConfPath = path.join(__dirname, '../src-tauri/tauri.release.conf.json');
const packageJsonPath = path.join(__dirname, '../package.json');

try {
  // Leer package.json (versión maestro con 4 números)
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  let currentVersion = packageJson.version;

  // Parsear versión (0.1.1.2 → [0, 1, 1, 2])
  let parts = currentVersion.split('.');

  // Asegurar que tenga 4 números
  while (parts.length < 4) {
    parts.push('0');
  }

  // Incrementar el 4to número (build number)
  parts[3] = String(parseInt(parts[3], 10) + 1);
  const newFullVersion = parts.join('.');

  // Crear versión semver (primeros 3 números)
  const newSemverVersion = `${parts[0]}.${parts[1]}.${parts[2]}`;

  console.log(`📦 Versión: ${currentVersion} → ${newFullVersion}`);
  console.log(`   Semver para Tauri: ${newSemverVersion}`);

  // Actualizar tauri.conf.json (semver)
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
  tauriConf.version = newSemverVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2));

  // Actualizar tauri.release.conf.json si existe
  if (fs.existsSync(releaseConfPath)) {
    const releaseConf = JSON.parse(fs.readFileSync(releaseConfPath, 'utf-8'));
    releaseConf.version = newSemverVersion;
    fs.writeFileSync(releaseConfPath, JSON.stringify(releaseConf, null, 2));
  }

  // Actualizar package.json (versión completa con 4 números)
  packageJson.version = newFullVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  console.log(`✅ Versión actualizada a ${newFullVersion}`);

} catch (error) {
  console.error('❌ Error al incrementar versión:', error.message);
  process.exit(1);
}
