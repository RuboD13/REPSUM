pub const MIGRATION_V2_SQL: &str = r#"
ALTER TABLE repartos ADD COLUMN estado_cobro TEXT NOT NULL DEFAULT 'pendiente';
"#;

pub const MIGRATION_V3_SQL: &str = r#"
ALTER TABLE inmuebles ADD COLUMN foto_url TEXT;
ALTER TABLE inmuebles ADD COLUMN suministros_imputables TEXT DEFAULT '["luz","agua","gas","internet","comunidad"]';
ALTER TABLE inmuebles ADD COLUMN modelo_reparto TEXT DEFAULT 'por_habitacion';
ALTER TABLE habitaciones ADD COLUMN foto_url TEXT;
ALTER TABLE habitaciones ADD COLUMN superficie REAL;
ALTER TABLE habitaciones ADD COLUMN descripcion TEXT;
ALTER TABLE facturas ADD COLUMN estado_edicion TEXT DEFAULT 'bloqueado';
"#;

pub const MIGRATION_V4_SQL: &str = r#"
ALTER TABLE inmuebles ADD COLUMN tope_global REAL;
"#;

pub const MIGRATION_V5_SQL: &str = r#"
ALTER TABLE inmuebles ADD COLUMN gastos_vacantes_los_paga_propiedad BOOLEAN DEFAULT 1;
"#;

pub const MIGRATION_V6_SQL: &str = r#"
ALTER TABLE repartos ADD COLUMN fecha_comunicacion DATE;
CREATE TABLE IF NOT EXISTS pagos_parciales (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    reparto_id  INTEGER NOT NULL REFERENCES repartos(id) ON DELETE CASCADE,
    fecha       DATE    NOT NULL,
    importe     REAL    NOT NULL,
    notas       TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
"#;

pub const INIT_SQL: &str = r#"
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS inmuebles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT    NOT NULL,
    direccion   TEXT    NOT NULL,
    num_habitaciones INTEGER NOT NULL CHECK(num_habitaciones BETWEEN 2 AND 7),
    notas       TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS habitaciones (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    inmueble_id INTEGER NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,
    nombre      TEXT    NOT NULL,
    criterio_reparto REAL DEFAULT 1.0,
    activa      BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS inquilinos (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre  TEXT NOT NULL,
    email   TEXT
);

CREATE TABLE IF NOT EXISTS contratos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    habitacion_id   INTEGER NOT NULL REFERENCES habitaciones(id) ON DELETE CASCADE,
    inquilino_id    INTEGER NOT NULL REFERENCES inquilinos(id),
    fecha_inicio    DATE    NOT NULL,
    fecha_fin       DATE,
    suministros_incluidos REAL DEFAULT 0.0,
    notas           TEXT
);

CREATE TABLE IF NOT EXISTS facturas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    inmueble_id     INTEGER NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,
    tipo_suministro TEXT    NOT NULL,
    comercializadora TEXT,
    periodo_inicio  DATE    NOT NULL,
    periodo_fin     DATE    NOT NULL,
    importe         REAL    NOT NULL,
    archivo_original TEXT,
    datos_extraidos TEXT,
    verificada      BOOLEAN DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repartos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id      INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
    contrato_id     INTEGER NOT NULL REFERENCES contratos(id),
    dias_en_periodo INTEGER NOT NULL,
    proporcion      REAL    NOT NULL,
    importe_bruto   REAL    NOT NULL,
    tope_aplicado   REAL    DEFAULT 0.0,
    importe_neto    REAL    NOT NULL,
    exceso          REAL    DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS correos (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    reparto_ids         TEXT    NOT NULL,
    destinatario_tipo   TEXT    NOT NULL CHECK(destinatario_tipo IN ('propietario','inquilino')),
    destinatario_nombre TEXT,
    asunto              TEXT    NOT NULL,
    cuerpo              TEXT    NOT NULL,
    plantilla_usada     TEXT,
    enviado             BOOLEAN DEFAULT 0,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);
"#;
