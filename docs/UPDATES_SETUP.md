# Sistema de Actualizaciones - REPSUM

## Configuración de Actualizaciones desde GitHub

### 1️⃣ Generar Claves de Firma

Ejecuta en `src-tauri/`:

```bash
cd src-tauri
cargo tauri signer generate -w
```

Esto generará:
- **Public Key** (guardar en `tauri.conf.json`)
- **Private Key** (guardar en variable de entorno)

### 2️⃣ Configurar en tauri.conf.json

```json
{
  "plugins": {
    "updater": {
      "pubkey": "tu_public_key_aqui",
      "endpoints": [
        "https://github.com/TU_USUARIO/repsum/releases/download/v_VERSION_/update-v_VERSION_.json"
      ]
    }
  }
}
```

Reemplaza:
- `tu_public_key_aqui` con la clave pública generada
- `TU_USUARIO` con tu usuario de GitHub
- `repsum` con el nombre del repositorio

### 3️⃣ Configurar Variables de Entorno

En `.env.local` o en tu CI/CD:

```bash
TAURI_SIGNING_PRIVATE_KEY="tu_private_key"
TAURI_SIGNING_PRIVATE_KEY_PASSWORD="tu_password"
```

### 4️⃣ Crear Workflow de GitHub Actions

Archivo: `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Build Tauri app
        env:
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        run: npm run build:release

      - name: Upload release artifacts
        uses: softprops/action-gh-release@v1
        with:
          files: |
            src-tauri/target/release/bundle/msi/**/*.msi
            src-tauri/target/release/bundle/nsis/**/*.exe
          draft: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 5️⃣ Flujo de Versiones

**Versionado automático:**
- `package.json`: `0.1.1.3` (4 números, detallado)
- `tauri.conf.json`: `0.1.1` (3 números, semver)

Cada `npm run build:release` incrementa automáticamente.

### 6️⃣ Publicar Release

```bash
# Crear tag para activar GitHub Actions
git tag v0.1.1
git push origin v0.1.1
```

GitHub Actions compilará, firmará y publicará automáticamente.

## Cómo funciona el botón "Buscar actualizaciones"

1. Usuario hace click en "Buscar actualizaciones" (InmueblesView.tsx)
2. Se invoca comando Tauri `check_for_updates`
3. Tauri busca el manifest en GitHub releases
4. Si hay versión más reciente:
   - Descarga automáticamente
   - Muestra notificación al usuario
   - Opción: instalar al cerrar la app

## Estructura de Release

GitHub crea automáticamente:

```
releases/v0.1.1/
├── REPSUM_0.1.1_x64_es-ES.msi
├── REPSUM_0.1.1_x64-setup.exe
└── update-v0.1.1.json (generado por Tauri)
```

El `update-v0.1.1.json` contiene:
- Hash de los instaladores
- Firma digital
- Notas de release

## Troubleshooting

### Error: "pubkey not configured"
→ Falta configurar la clave pública en `tauri.conf.json`

### Error: "signature not valid"
→ Verificar que `TAURI_SIGNING_PRIVATE_KEY` es correcta

### Las actualizaciones no aparecen en el botón
→ Verificar que GitHub repo es público
→ Verificar que el endpoint en `tauri.conf.json` es correcto
