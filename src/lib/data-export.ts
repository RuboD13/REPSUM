import type {
  Inmueble,
  Habitacion,
  Inquilino,
  Contrato,
  Factura,
  Reparto,
  PagoParcial,
  Correo,
} from "./types";

export interface ExportData {
  version: string; // App version (e.g., "0.1.1")
  timestamp: string; // ISO 8601 timestamp
  dbVersion: number; // Database schema version
  checksum: string; // SHA256 hash of content for integrity checking
  data: {
    inmuebles: Inmueble[];
    habitaciones: Habitacion[];
    inquilinos: Inquilino[];
    contratos: Contrato[];
    facturas: Factura[];
    repartos: Reparto[];
    pagos_parciales: PagoParcial[];
    correos: Correo[];
  };
}

export interface ImportValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    appVersion: string;
    dbVersion: number;
    recordCounts: {
      inmuebles: number;
      habitaciones: number;
      inquilinos: number;
      contratos: number;
      facturas: number;
      repartos: number;
      pagos_parciales: number;
      correos: number;
    };
  };
}

/**
 * Validar integridad del archivo de exportación
 */
export async function validateExportFile(
  data: ExportData
): Promise<ImportValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar estructura básica
  if (!data.version || !data.timestamp || data.dbVersion === undefined) {
    errors.push("Estructura de archivo inválida (faltan campos requeridos)");
  }

  // Validar que data.data existe
  if (!data.data) {
    errors.push("Campo 'data' no encontrado");
    return {
      valid: false,
      errors,
      warnings,
      summary: {
        appVersion: data.version || "unknown",
        dbVersion: data.dbVersion || 0,
        recordCounts: {
          inmuebles: 0,
          habitaciones: 0,
          inquilinos: 0,
          contratos: 0,
          facturas: 0,
          repartos: 0,
          pagos_parciales: 0,
          correos: 0,
        },
      },
    };
  }

  // Validar schema version compatibility
  // Current app supports schema version 6, imports must be <= 6
  if (data.dbVersion > 6) {
    errors.push(
      `Versión de schema no compatible. Esta app soporta hasta v6, pero el archivo es v${data.dbVersion}`
    );
  } else if (data.dbVersion < 1) {
    errors.push("Versión de schema inválida");
  }

  // Validar arrays
  const recordCounts = {
    inmuebles: data.data.inmuebles?.length || 0,
    habitaciones: data.data.habitaciones?.length || 0,
    inquilinos: data.data.inquilinos?.length || 0,
    contratos: data.data.contratos?.length || 0,
    facturas: data.data.facturas?.length || 0,
    repartos: data.data.repartos?.length || 0,
    pagos_parciales: data.data.pagos_parciales?.length || 0,
    correos: data.data.correos?.length || 0,
  };

  // Validar integridad referencial básica
  if (
    recordCounts.habitaciones > 0 &&
    recordCounts.inmuebles === 0
  ) {
    warnings.push("Hay habitaciones sin propiedades asociadas");
  }

  if (
    recordCounts.contratos > 0 &&
    recordCounts.inquilinos === 0
  ) {
    warnings.push("Hay contratos sin inquilinos asociados");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      appVersion: data.version,
      dbVersion: data.dbVersion,
      recordCounts,
    },
  };
}

/**
 * Converter para JavaScript Date a formato DATE SQL (YYYY-MM-DD)
 */
export function dateToSQL(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === "string") return d.split("T")[0]; // Handle ISO dates
  if (d instanceof Date) {
    return d.toISOString().split("T")[0];
  }
  return null;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}
