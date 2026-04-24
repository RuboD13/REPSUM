use serde::{Deserialize, Serialize};
use std::io::Write;
use std::process::{Command, Stdio};
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExtractorResult {
    pub comercializadora: Option<String>,
    pub tipo_suministro: Option<String>,
    pub periodo_inicio: Option<String>,
    pub periodo_fin: Option<String>,
    pub importe: Option<f64>,
    pub confianza: f64,
    pub error: Option<String>,
}

/// Extrae datos de una factura (PDF/imagen) invocando el sidecar Python.
/// En producción usa el ejecutable compilado con PyInstaller.
/// En desarrollo usa `python extractor.py` directamente.
#[tauri::command]
pub async fn extract_factura(path: String) -> Result<ExtractorResult, String> {
    let input = serde_json::json!({ "action": "extract", "file": path }).to_string();

    let output_str = run_extractor(&input)?;

    serde_json::from_str::<ExtractorResult>(&output_str)
        .map_err(|e| format!("Error al parsear resultado del extractor: {e}\nSalida: {output_str}"))
}

/// Ejecuta un backup sólo si han pasado más de 23 horas desde el último.
/// Se llama automáticamente al arrancar la app.
#[tauri::command]
pub async fn backup_db_if_needed(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri::Manager;

    let backup_dir = {
        let appdata = std::env::var("APPDATA")
            .map_err(|_| "Variable APPDATA no disponible".to_string())?;
        std::path::PathBuf::from(appdata).join("REPSUM").join("backups")
    };
    std::fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("No se pudo crear el directorio de backups: {e}"))?;

    let marker = backup_dir.join("last_backup.txt");
    let now_secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    // Leer timestamp del último backup
    let needs_backup = if let Ok(contents) = std::fs::read_to_string(&marker) {
        let last: u64 = contents.trim().parse().unwrap_or(0);
        now_secs.saturating_sub(last) >= 23 * 3600
    } else {
        true
    };

    if !needs_backup {
        return Ok(None);
    }

    // Hacer backup
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo determinar el directorio de datos: {e}"))?;
    let db_path = app_data.join("repsum.db");

    if !db_path.exists() {
        return Ok(None); // Primera ejecución, DB aún no creada
    }

    let backup_name = format!("repsum_backup_{now_secs}.db");
    let backup_path = backup_dir.join(&backup_name);
    std::fs::copy(&db_path, &backup_path)
        .map_err(|e| format!("Error al copiar la base de datos: {e}"))?;

    // Actualizar marker
    let _ = std::fs::write(&marker, now_secs.to_string());

    // Limpiar backups de más de 30 días
    let _ = limpiar_backups_antiguos(&backup_dir, now_secs, 30);

    Ok(Some(backup_path.to_string_lossy().to_string()))
}

/// Crea una copia de seguridad de la base de datos SQLite en
/// %APPDATA%\REPSUM\backups\repsum_backup_{timestamp}.db
/// y elimina backups con más de 30 días de antigüedad.
#[tauri::command]
pub async fn backup_db(app: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;

    // Ruta de la base de datos (directorio de datos de la app)
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo determinar el directorio de datos: {e}"))?;
    let db_path = app_data.join("repsum.db");

    if !db_path.exists() {
        return Err("Base de datos no encontrada. Asegúrate de que la app se ha iniciado al menos una vez.".to_string());
    }

    // Directorio de backups: %APPDATA%\REPSUM\backups\
    let backup_dir = {
        let appdata = std::env::var("APPDATA")
            .map_err(|_| "Variable APPDATA no disponible".to_string())?;
        std::path::PathBuf::from(appdata).join("REPSUM").join("backups")
    };
    std::fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("No se pudo crear el directorio de backups: {e}"))?;

    // Nombre del backup con timestamp Unix (único y ordenable)
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let backup_name = format!("repsum_backup_{secs}.db");
    let backup_path = backup_dir.join(&backup_name);

    std::fs::copy(&db_path, &backup_path)
        .map_err(|e| format!("Error al copiar la base de datos: {e}"))?;

    // Limpiar backups de más de 30 días (2592000 segundos)
    let _ = limpiar_backups_antiguos(&backup_dir, secs, 30);

    Ok(backup_path.to_string_lossy().to_string())
}

fn limpiar_backups_antiguos(
    dir: &std::path::Path,
    now_secs: u64,
    dias_max: u64,
) -> Result<(), ()> {
    let limite = now_secs.saturating_sub(dias_max * 86400);
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            // Extraer timestamp del nombre "repsum_backup_{secs}.db"
            if let Some(ts_str) = name_str
                .strip_prefix("repsum_backup_")
                .and_then(|s| s.strip_suffix(".db"))
            {
                if let Ok(ts) = ts_str.parse::<u64>() {
                    if ts < limite {
                        let _ = std::fs::remove_file(entry.path());
                    }
                }
            }
        }
    }
    Ok(())
}

// ── Auto-update ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub body: Option<String>,
}

/// Comprueba si hay una nueva versión disponible.
/// Requiere configurar `app.updater.endpoints` en tauri.conf.json.
/// Devuelve `available: false` si no hay endpoint configurado.
#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    let update = app
        .updater()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?;

    match update {
        Some(u) => Ok(UpdateInfo {
            available: true,
            version: Some(u.version.clone()),
            body: u.body.clone(),
        }),
        None => Ok(UpdateInfo { available: false, version: None, body: None }),
    }
}

// ── Lógica de invocación del extractor ───────────────────────────────────────

fn run_extractor(input: &str) -> Result<String, String> {
    // 1. Producción: buscar binario compilado junto al ejecutable de la app
    if let Some(binary) = find_compiled_sidecar() {
        return run_binary(&binary, input);
    }

    // 2. Desarrollo: usar python extractor.py
    if let Some(script) = find_python_script() {
        let result = try_run_python("python", &script, input)
            .or_else(|_| try_run_python("python3", &script, input));
        if let Ok(out) = result {
            return Ok(out);
        }
    }

    // 3. Ninguno disponible: devolver resultado vacío con mensaje
    let fallback = ExtractorResult {
        comercializadora: None,
        tipo_suministro: None,
        periodo_inicio: None,
        periodo_fin: None,
        importe: None,
        confianza: 0.0,
        error: Some(
            "Extractor no disponible. En desarrollo, instala Python + dependencias. \
             En producción, compila el sidecar con build-sidecar.ps1."
                .to_string(),
        ),
    };
    serde_json::to_string(&fallback).map_err(|e| e.to_string())
}

/// Busca el binario compilado junto al ejecutable de la app (producción).
fn find_compiled_sidecar() -> Option<std::path::PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let exe_dir = exe.parent()?;
    // Nombre con target-triple (generado por build-sidecar.ps1)
    let candidates = [
        "extractor-x86_64-pc-windows-msvc.exe",
        "extractor.exe",
    ];
    for name in &candidates {
        let candidate = exe_dir.join(name);
        if candidate.exists() {
            return Some(candidate);
        }
    }
    None
}

/// Busca el script Python en el árbol de desarrollo.
fn find_python_script() -> Option<std::path::PathBuf> {
    let exe = std::env::current_exe().ok()?;
    // En dev el exe está en target/debug/repsum.exe → subir 4 niveles
    let project_root = exe.ancestors().nth(4)?.to_path_buf();
    let script = project_root
        .join("src-tauri")
        .join("sidecar")
        .join("extractor.py");
    if script.exists() { Some(script) } else { None }
}

fn run_binary(binary: &std::path::Path, input: &str) -> Result<String, String> {
    let mut child = Command::new(binary)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("No se pudo iniciar el extractor: {e}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(input.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Extractor falló: {stderr}"));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn try_run_python(
    python_cmd: &str,
    script: &std::path::Path,
    input: &str,
) -> Result<String, String> {
    let mut child = Command::new(python_cmd)
        .arg(script)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("No se pudo iniciar {python_cmd}: {e}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(input.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Extractor falló (Python): {stderr}"));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Descarga una factura copiándola a la carpeta de descargas del usuario
#[tauri::command]
pub async fn download_factura(path: String, file_name: String) -> Result<String, String> {
    use std::path::PathBuf;

    // Obtener la carpeta de descargas del usuario
    let downloads_dir = if cfg!(windows) {
        // En Windows, usar la carpeta de Descargas
        let home = std::env::var("USERPROFILE")
            .unwrap_or_else(|_| std::env::var("HOME").unwrap_or_default());
        PathBuf::from(home).join("Downloads")
    } else {
        // En macOS/Linux
        let home = std::env::var("HOME").unwrap_or_default();
        PathBuf::from(home).join("Downloads")
    };

    // Crear directorio si no existe
    std::fs::create_dir_all(&downloads_dir)
        .map_err(|e| format!("No se pudo crear el directorio de descargas: {e}"))?;

    // Ruta de destino
    let dest_path = downloads_dir.join(&file_name);

    // Copiar archivo
    std::fs::copy(&path, &dest_path)
        .map_err(|e| format!("Error al copiar archivo: {e}"))?;

    Ok(dest_path.to_string_lossy().to_string())
}

/// Exporta todos los datos de la base de datos como JSON
#[tauri::command]
pub async fn export_data(app: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;

    // Get database path
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo determinar el directorio de datos: {e}"))?;
    let db_path = app_data.join("repsum.db");

    if !db_path.exists() {
        return Err("Base de datos no encontrada.".to_string());
    }

    // Open database
    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Error al abrir la base de datos: {e}"))?;

    // Export all tables
    let inmuebles_json = query_all_as_json(&conn, "SELECT * FROM inmuebles ORDER BY id ASC")
        .map_err(|e| format!("Error al exportar inmuebles: {e}"))?;

    let habitaciones_json = query_all_as_json(&conn, "SELECT * FROM habitaciones ORDER BY id ASC")
        .map_err(|e| format!("Error al exportar habitaciones: {e}"))?;

    let inquilinos_json = query_all_as_json(&conn, "SELECT * FROM inquilinos ORDER BY id ASC")
        .map_err(|e| format!("Error al exportar inquilinos: {e}"))?;

    let contratos_json = query_all_as_json(&conn, "SELECT * FROM contratos ORDER BY id ASC")
        .map_err(|e| format!("Error al exportar contratos: {e}"))?;

    let facturas_json = query_all_as_json(&conn, "SELECT * FROM facturas ORDER BY id ASC")
        .map_err(|e| format!("Error al exportar facturas: {e}"))?;

    let repartos_json = query_all_as_json(&conn, "SELECT * FROM repartos ORDER BY id ASC")
        .map_err(|e| format!("Error al exportar repartos: {e}"))?;

    let pagos_parciales_json = query_all_as_json(&conn, "SELECT * FROM pagos_parciales ORDER BY id ASC")
        .map_err(|e| format!("Error al exportar pagos_parciales: {e}"))?;

    let correos_json = query_all_as_json(&conn, "SELECT * FROM correos ORDER BY id ASC")
        .map_err(|e| format!("Error al exportar correos: {e}"))?;

    // Build export structure
    let export_data = serde_json::json!({
        "version": "0.1.1",
        "timestamp": chrono::Local::now().to_rfc3339(),
        "dbVersion": 6,
        "checksum": "",
        "data": {
            "inmuebles": serde_json::from_str::<Vec<serde_json::Value>>(&inmuebles_json).unwrap_or_default(),
            "habitaciones": serde_json::from_str::<Vec<serde_json::Value>>(&habitaciones_json).unwrap_or_default(),
            "inquilinos": serde_json::from_str::<Vec<serde_json::Value>>(&inquilinos_json).unwrap_or_default(),
            "contratos": serde_json::from_str::<Vec<serde_json::Value>>(&contratos_json).unwrap_or_default(),
            "facturas": serde_json::from_str::<Vec<serde_json::Value>>(&facturas_json).unwrap_or_default(),
            "repartos": serde_json::from_str::<Vec<serde_json::Value>>(&repartos_json).unwrap_or_default(),
            "pagos_parciales": serde_json::from_str::<Vec<serde_json::Value>>(&pagos_parciales_json).unwrap_or_default(),
            "correos": serde_json::from_str::<Vec<serde_json::Value>>(&correos_json).unwrap_or_default(),
        }
    });

    // Calculate checksum
    let data_str = serde_json::to_string(&export_data["data"])
        .map_err(|e| format!("Error al serializar datos: {e}"))?;
    let checksum = calculate_sha256(&data_str);

    // Build final export with checksum
    let mut export_with_checksum = export_data;
    export_with_checksum["checksum"] = serde_json::Value::String(checksum);

    let result = serde_json::to_string(&export_with_checksum)
        .map_err(|e| format!("Error al serializar exportación: {e}"))?;

    Ok(result)
}

/// Helper function to query all rows and return as JSON array
fn query_all_as_json(
    conn: &rusqlite::Connection,
    sql: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let mut stmt = conn.prepare(sql)?;
    let column_names: Vec<String> = (0..stmt.column_count())
        .map(|i| stmt.column_name(i).unwrap_or("unknown").to_string())
        .collect();

    let rows = stmt.query_map([], |row| {
        let mut obj = serde_json::json!({});
        for (i, col_name) in column_names.iter().enumerate() {
            let value: String = row.get(i)?;
            obj[col_name] = serde_json::Value::String(value);
        }
        Ok(obj)
    })?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }

    Ok(serde_json::to_string(&results)?)
}

/// Guarda el archivo de exportación en la carpeta de descargas
#[tauri::command]
pub async fn save_export_file(data: String) -> Result<String, String> {
    use std::path::PathBuf;

    // Get downloads directory
    let downloads_dir = if cfg!(windows) {
        let home = std::env::var("USERPROFILE")
            .unwrap_or_else(|_| std::env::var("HOME").unwrap_or_default());
        PathBuf::from(home).join("Downloads")
    } else {
        let home = std::env::var("HOME").unwrap_or_default();
        PathBuf::from(home).join("Downloads")
    };

    // Create downloads directory if it doesn't exist
    std::fs::create_dir_all(&downloads_dir)
        .map_err(|e| format!("No se pudo crear el directorio de descargas: {e}"))?;

    // Create filename with timestamp
    let timestamp = chrono::Local::now().format("%Y-%m-%d").to_string();
    let filename = format!("REPSUM_backup_{}.repsum-backup", timestamp);
    let file_path = downloads_dir.join(&filename);

    // Write file
    std::fs::write(&file_path, data)
        .map_err(|e| format!("Error al guardar el archivo: {e}"))?;

    Ok(file_path.to_string_lossy().to_string())
}

/// Escribe el archivo de exportación en la ruta elegida por el usuario
/// (el frontend ya mostró el diálogo nativo y obtuvo la ruta)
#[tauri::command]
pub async fn write_export_file(path: String, data: String) -> Result<(), String> {
    use std::path::Path;

    let file_path = Path::new(&path);

    // Create parent directories if needed
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("No se pudo crear el directorio: {e}"))?;
    }

    std::fs::write(file_path, data)
        .map_err(|e| format!("Error al guardar el archivo: {e}"))?;

    Ok(())
}

/// Helper function to calculate SHA256 hash
fn calculate_sha256(data: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    // Simple hash - in production should use proper SHA256
    let mut hasher = DefaultHasher::new();
    data.hash(&mut hasher);
    let hash = hasher.finish();
    format!("{:016x}", hash)
}
