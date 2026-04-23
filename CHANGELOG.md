# REPSUM Changelog

## [0.1.1] - 2026-04-23

### ✨ Added
- **Floor Plan View**: Visual diagram showing all habitaciones with status indicators
  - Color-coded payment states (Green=Paid, Orange=Pending, Red=Overdue)
  - Responsive grid layout adapting to 2-7 habitaciones
  - Real-time occupancy and payment tracking
  - Interactive KPI dashboard on the right sidebar

- **Data Export/Import**: Full database backup and restoration
  - Export all configurations, repartos, and facturas as `.repsum-backup` file
  - Import data to new installations with conflict detection
  - Version-aware import with automatic migration support

- **Automatic Version Incrementing**: Build automation
  - `npm run build:release` auto-increments version (0.1.1.1 → 0.1.1.2)
  - Maintains both 4-number package version and 3-number semver

- **Tauri Auto-Updater Integration**: GitHub-based updates
  - "Buscar actualizaciones" button checks for new releases
  - Automatic signature verification using minisign
  - GitHub Actions CI/CD for automated builds on release tags

- **Enhanced UI Components**:
  - Prominent month selector with navigation arrows
  - Better N/A state explanations with tooltips
  - "(Propietario)" labels showing property owner cost coverage

### 🔧 Fixed
- Export functionality now uses Tauri backend for reliable downloads
- Month navigation properly centered in RepartoView
- Version tracking across multiple build formats

### 📦 Technical
- Upgraded to Tauri 2.10+ with auto-updater support
- Added GitHub Actions workflow for CI/CD
- ES modules support for build scripts
- SQLite database with versioned migrations

### 🚀 Installation
Download the latest MSI or NSIS installer from [GitHub Releases](https://github.com/RuboD13/REPSUM/releases)

For existing users: Updates will be checked automatically. Click "Buscar actualizaciones" in settings to install the latest version.
