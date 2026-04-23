#!/usr/bin/env node

/**
 * Script para configurar el sistema de actualizaciones de Tauri
 * Genera claves de firma y actualiza tauri.conf.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tauriConfPath = path.join(__dirname, '../src-tauri/tauri.conf.json');

try {
  console.log('🔐 Configurando sistema de actualizaciones...\n');

  // Leer tauri.conf.json
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));

  // Configurar endpoint de GitHub
  const githubUser = process.env.GITHUB_USER || 'tu-usuario';
  const githubRepo = process.env.GITHUB_REPO || 'repsum';

  tauriConf.plugins.updater.endpoints = [
    `https://github.com/${githubUser}/${githubRepo}/releases/download/v_VERSION_/update-v_VERSION_.json`
  ];

  // Actualizar con endpoint
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2));

  console.log(`✅ Endpoint configurado: ${tauriConf.plugins.updater.endpoints[0]}`);
  console.log('⚠️  Reemplaza "tu-usuario" y "repsum" con tus valores de GitHub');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
