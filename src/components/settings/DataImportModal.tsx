import React, { useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ExportData, formatFileSize } from "../../lib/data-export";

interface Props {
  open: boolean;
  onClose: () => void;
  onImportConfirmed: (data: ExportData) => Promise<void>;
}

type ImportStep = "select" | "validate" | "confirm" | "importing";

export const DataImportModal: React.FC<Props> = ({
  open,
  onClose,
  onImportConfirmed,
}) => {
  const [step, setStep] = useState<ImportStep>("select");
  const [selectedFile, setSelectedFile] = useState<ExportData | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSelectFile = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [
          { name: "REPSUM Backup", extensions: ["repsum-backup"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (!selected || typeof selected !== "string") return;

      // Leer archivo usando fetch con protocolo file://
      const response = await fetch(`file://${selected}`);
      const fileContent = await response.text();

      // Parsear JSON
      const data: ExportData = JSON.parse(fileContent);
      setSelectedFile(data);
      setFileSize(fileContent.length);
      setStep("validate");
      setError("");
    } catch (e) {
      setError(`Error leyendo archivo: ${String(e)}`);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setStep("importing");
    try {
      await onImportConfirmed(selectedFile);
      setStep("select");
      setSelectedFile(null);
      onClose();
    } catch (e) {
      setError(`Error importando datos: ${String(e)}`);
      setStep("confirm");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Importar datos" width={500}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* STEP: SELECT */}
        {step === "select" && (
          <>
            <div
              style={{
                background: "var(--bg-secondary)",
                padding: "32px 16px",
                borderRadius: "2px",
                textAlign: "center",
                cursor: "pointer",
                border: "2px dashed var(--border)",
                transition: "all 0.2s",
              }}
              onClick={handleSelectFile}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--accent)";
                el.style.background = "var(--accent-subtle)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--border)";
                el.style.background = "var(--bg-secondary)";
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📁</div>
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                Seleccionar archivo de backup
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                Haz clic para elegir un archivo .repsum-backup
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: "12px",
                  background: "var(--status-pending-bg)",
                  border: "1px solid var(--status-pending)",
                  borderRadius: "2px",
                  fontSize: "12px",
                  color: "var(--status-pending)",
                }}
              >
                ⚠ {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </>
        )}

        {/* STEP: VALIDATE */}
        {step === "validate" && selectedFile && (
          <>
            <div
              style={{
                background: "var(--bg-secondary)",
                padding: "16px",
                borderRadius: "2px",
                fontSize: "12px",
              }}
            >
              <div style={{ marginBottom: "12px", color: "var(--text-tertiary)", fontSize: "11px" }}>
                INFORMACIÓN DEL ARCHIVO
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <div style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Versión</div>
                  <div style={{ fontWeight: 600, marginTop: "2px" }}>{selectedFile.version}</div>
                </div>
                <div>
                  <div style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Schema DB</div>
                  <div style={{ fontWeight: 600, marginTop: "2px" }}>v{selectedFile.dbVersion}</div>
                </div>
                <div>
                  <div style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Tamaño</div>
                  <div style={{ fontWeight: 600, marginTop: "2px" }}>{formatFileSize(fileSize)}</div>
                </div>
                <div>
                  <div style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Fecha</div>
                  <div style={{ fontWeight: 600, marginTop: "2px" }}>
                    {new Date(selectedFile.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-inset)",
                padding: "16px",
                borderRadius: "2px",
                fontSize: "12px",
              }}
            >
              <div style={{ marginBottom: "8px", color: "var(--text-tertiary)", fontSize: "11px" }}>
                REGISTROS A IMPORTAR
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  fontSize: "12px",
                }}
              >
                <div>Propiedades: {selectedFile.data.inmuebles.length}</div>
                <div>Habitaciones: {selectedFile.data.habitaciones.length}</div>
                <div>Inquilinos: {selectedFile.data.inquilinos.length}</div>
                <div>Contratos: {selectedFile.data.contratos.length}</div>
                <div>Facturas: {selectedFile.data.facturas.length}</div>
                <div>Repartos: {selectedFile.data.repartos.length}</div>
                <div>Pagos parciales: {selectedFile.data.pagos_parciales.length}</div>
                <div>Correos: {selectedFile.data.correos.length}</div>
              </div>
            </div>

            <div
              style={{
                padding: "12px",
                background: "var(--accent-subtle)",
                border: "1px solid var(--accent)",
                borderRadius: "2px",
                fontSize: "12px",
                color: "var(--accent)",
              }}
            >
              ℹ️ Se importarán solo los registros nuevos. Los datos existentes se preservarán.
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setStep("select");
                  setSelectedFile(null);
                }}
              >
                Atrás
              </Button>
              <Button variant="primary" onClick={() => setStep("confirm")}>
                Continuar
              </Button>
            </div>
          </>
        )}

        {/* STEP: CONFIRM */}
        {step === "confirm" && (
          <>
            <div
              style={{
                background: "var(--status-pending-bg)",
                border: "1px solid var(--status-pending)",
                borderRadius: "2px",
                padding: "16px",
                fontSize: "13px",
                color: "var(--status-pending)",
                lineHeight: 1.6,
              }}
            >
              <strong>⚠️ Importante:</strong> La importación añadirá registros nuevos pero no
              actualizará ni eliminará datos existentes. Se preservarán tus facturas, repartos y
              configuraciones actuales.
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <Button
                variant="secondary"
                onClick={() => setStep("validate")}
                disabled={importing}
              >
                Atrás
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? "Importando..." : "✓ Confirmar importación"}
              </Button>
            </div>
          </>
        )}

        {/* STEP: IMPORTING */}
        {step === "importing" && (
          <div style={{ textAlign: "center", padding: "32px", color: "var(--text-tertiary)" }}>
            <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>
            <div style={{ fontStyle: "italic" }}>Importando datos...</div>
            <div style={{ fontSize: "12px", marginTop: "8px", color: "var(--text-tertiary)" }}>
              Por favor espera mientras se importan los registros
            </div>
          </div>
        )}

        {error && step !== "select" && (
          <div
            style={{
              padding: "12px",
              background: "var(--status-pending-bg)",
              border: "1px solid var(--status-pending)",
              borderRadius: "2px",
              fontSize: "12px",
              color: "var(--status-pending)",
            }}
          >
            ⚠️ {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
