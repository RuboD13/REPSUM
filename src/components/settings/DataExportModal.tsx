import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import type {
  Inmueble,
  Habitacion,
  Inquilino,
  Contrato,
  Factura,
  Reparto,
  PagoParcial,
  Correo,
} from "../../lib/types";
import { formatFileSize } from "../../lib/data-export";

interface Props {
  open: boolean;
  onClose: () => void;
  // Data to export
  inmuebles: Inmueble[];
  habitaciones: Habitacion[];
  inquilinos: Inquilino[];
  contratos: Contrato[];
  facturas: Factura[];
  repartos: Reparto[];
  pagosParciales: PagoParcial[];
  correos: Correo[];
}

export const DataExportModal: React.FC<Props> = ({
  open,
  onClose,
  inmuebles,
  habitaciones,
  inquilinos,
  contratos,
  facturas,
  repartos,
  pagosParciales,
  correos,
}) => {
  const [exporting, setExporting] = useState(false);

  // Debug: log received data when modal opens
  React.useEffect(() => {
    if (open) {
      console.log("📊 Export Modal opened with data:", {
        inmuebles: inmuebles.length,
        habitaciones: habitaciones.length,
        inquilinos: inquilinos.length,
        contratos: contratos.length,
        facturas: facturas.length,
        repartos: repartos.length,
        pagosParciales: pagosParciales.length,
        correos: correos.length,
      });
    }
  }, [open, inmuebles, habitaciones, inquilinos, contratos, facturas, repartos, pagosParciales, correos]);

  const handleExport = async () => {
    console.log("🔄 Export started via Tauri backend...");
    setExporting(true);
    try {
      // Call Tauri backend to export all data from database
      const exportDataJson = await invoke<string>("export_data");
      console.log("✅ Export data received from backend");

      const exportData = JSON.parse(exportDataJson);
      console.log("📊 Export data parsed:", {
        version: exportData.version,
        timestamp: exportData.timestamp,
        dbVersion: exportData.dbVersion,
        checksum: exportData.checksum,
        totalRecords: Object.values(exportData.data).reduce((sum: number, arr: unknown) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
      });

      // Format with nice indentation
      const finalStr = JSON.stringify(exportData, null, 2);
      console.log("📦 Final JSON length:", finalStr.length, "bytes");

      // Save file using Tauri native command
      const filePath = await invoke<string>("save_export_file", { data: finalStr });
      console.log("💾 File saved to:", filePath);

      alert(`✅ Datos exportados correctamente.\n\nArchivo guardado en:\n${filePath}`);
      console.log("✅ Export completed successfully!");
      onClose();
    } catch (e) {
      console.error("❌ Error exporting data:", e);
      alert(`Error exportando datos: ${String(e)}`);
    } finally {
      setExporting(false);
    }
  };

  const totalRecords =
    inmuebles.length +
    habitaciones.length +
    inquilinos.length +
    contratos.length +
    facturas.length +
    repartos.length +
    pagosParciales.length +
    correos.length;

  const estimatedSize = Math.ceil(totalRecords * 500); // Rough estimate: 500 bytes per record
  const hasData = totalRecords > 0;

  return (
    <Modal open={open} onClose={onClose} title="Exportar datos" width={500}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Info */}
        <div
          style={{
            background: "var(--bg-secondary)",
            padding: "16px",
            borderRadius: "2px",
            fontSize: "13px",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          {!hasData ? (
            <>
              <span style={{ color: "var(--text-warning)" }}>Cargando datos...</span>
              <div style={{ marginTop: "12px", color: "var(--text-tertiary)", fontSize: "12px" }}>
                Se está leyendo la información de la base de datos. Por favor espere.
              </div>
            </>
          ) : (
            <>
              Se exportarán todos los datos actuales (propiedades, contratos, facturas, repartos,
              pagos y correos) en un archivo comprimido con integridad verificable.
              <div style={{ marginTop: "12px", color: "var(--text-tertiary)", fontSize: "12px" }}>
                Este archivo podrá importarse en otra instalación de REPSUM sin perder datos existentes.
              </div>
            </>
          )}
        </div>

        {/* Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            padding: "12px",
            background: "var(--bg-inset)",
            borderRadius: "2px",
            fontSize: "12px",
          }}
        >
          <div>
            <div style={{ color: "var(--text-tertiary)", fontSize: "11px", marginBottom: "4px" }}>
              Registros
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600 }}>
              {totalRecords}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--text-tertiary)", fontSize: "11px", marginBottom: "4px" }}>
              Tamaño estimado
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600 }}>
              {formatFileSize(estimatedSize)}
            </div>
          </div>
        </div>

        {/* Details */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            fontSize: "12px",
            color: "var(--text-tertiary)",
          }}
        >
          <div>Propiedades: {inmuebles.length}</div>
          <div>Habitaciones: {habitaciones.length}</div>
          <div>Inquilinos: {inquilinos.length}</div>
          <div>Contratos: {contratos.length}</div>
          <div>Facturas: {facturas.length}</div>
          <div>Repartos: {repartos.length}</div>
          <div>Pagos parciales: {pagosParciales.length}</div>
          <div>Correos: {correos.length}</div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose} disabled={exporting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleExport} disabled={exporting || !hasData}>
            {exporting ? "Exportando..." : !hasData ? "Cargando datos..." : "✓ Exportar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
