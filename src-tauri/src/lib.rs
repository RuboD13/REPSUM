pub mod db;
pub mod commands;

use commands::{backup_db, backup_db_if_needed, check_for_updates, extract_factura, download_factura, export_data, save_export_file};
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "init_schema",
            sql: db::INIT_SQL,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_estado_cobro",
            sql: db::MIGRATION_V2_SQL,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_inmueble_configs_and_factura_edicion",
            sql: db::MIGRATION_V3_SQL,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_tope_global_column",
            sql: db::MIGRATION_V4_SQL,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_gastos_vacantes_los_paga_propiedad",
            sql: db::MIGRATION_V5_SQL,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_fecha_comunicacion_and_pagos_parciales",
            sql: db::MIGRATION_V6_SQL,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "add_payment_confirmation_tracking",
            sql: db::MIGRATION_V7_SQL,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:repsum.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            extract_factura,
            backup_db,
            backup_db_if_needed,
            check_for_updates,
            download_factura,
            export_data,
            save_export_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running REPSUM");
}
