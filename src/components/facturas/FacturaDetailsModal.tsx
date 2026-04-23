import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useFacturas } from "../../store/useFacturas";
import type { Factura } from "../../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  factura: Factura | null;
  inmuebleId?: number;
}

const TIPO_LABEL: Record<string, string> = {
  luz: "Luz",
  agua: "Agua",
  gas: "Gas",
  internet: "Internet",
  comunidad: "Comunidad",
  otro: "Otro",
};

export const FacturaDetailsModal: React.FC<Props> = ({ open, onClose, factura, inmuebleId }) => {
  const { remove } = useFacturas();
  const [deleting, setDeleting] = useState(false);

  if (!factura || !inmuebleId) return null;

  const isImage = factura.archivo_original && /\.(jpe?g|png|tiff?|bmp|webp)$/i.test(factura.archivo_original);
  const isPdf = factura.archivo_original && /\.pdf$/i.test(factura.archivo_original);

  const handleDelete = async () => {
    if (!confirm("¿Eliminar esta factura? No se puede deshacer.")) return;
    setDeleting(true);
    try {
      await remove(factura.id, inmuebleId);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Detalles de factura" width={1000}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", height: "600px" }}>
        {/* Columna izquierda: Detalles */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", paddingRight: "16px" }}>

          {/* Tipo y comercializadora */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", display: "block", marginBottom: "4px" }}>
              Tipo de suministro
            </label>
            <div style={{ fontSize: "16px", fontWeight: 500, color: "var(--text-primary)" }}>
              {TIPO_LABEL[factura.tipo_suministro] || factura.tipo_suministro}
            </div>
          </div>

          {factura.comercializadora && (
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", display: "block", marginBottom: "4px" }}>
                Comercializadora
              </label>
              <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                {factura.comercializadora}
              </div>
            </div>
          )}

          {/* Período */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", display: "block", marginBottom: "4px" }}>
              Período
            </label>
            <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>
              {factura.periodo_inicio} → {factura.periodo_fin}
            </div>
          </div>

          {/* Importe */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", display: "block", marginBottom: "4px" }}>
              Importe total
            </label>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "var(--accent)" }}>
              {factura.importe.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>

          {/* Estado */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", display: "block", marginBottom: "8px" }}>
              Estado
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <span
                style={{
                  padding: "4px 12px",
                  background: factura.verificada ? "var(--status-ok)" : "var(--status-pending)",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: 500,
                  borderRadius: "2px",
                }}
              >
                {factura.verificada ? "✓ Verificada" : "Pendiente verificar"}
              </span>
            </div>
          </div>

          {/* Archivo original */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", display: "block", marginBottom: "4px" }}>
              Archivo original
            </label>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontFamily: "var(--font-display)", wordBreak: "break-all" }}>
              {factura.archivo_original || "—"}
            </div>
          </div>

          {/* Datos extraídos */}
          {factura.datos_extraidos && (
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", display: "block", marginBottom: "4px" }}>
                Confianza OCR
              </label>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                {(() => {
                  try {
                    const datos = JSON.parse(factura.datos_extraidos);
                    const confianza = datos.confianza ?? 0;
                    return `${Math.round(confianza * 100)}%`;
                  } catch {
                    return "—";
                  }
                })()}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "12px", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              Eliminar
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>

        {/* Columna derecha: Vista previa del documento */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            border: "1px solid var(--border)",
            borderRadius: "2px",
            background: "var(--bg-secondary)",
            padding: "12px",
            overflow: "hidden",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)" }}>
            Previsualización
          </div>

          {factura.archivo_original ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-inset)",
                borderRadius: "2px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {isImage ? (
                <img
                  src={`file://${factura.archivo_original}`}
                  alt="Document preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : isPdf ? (
                <embed
                  src={`file://${factura.archivo_original}`}
                  type="application/pdf"
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-body)",
                    fontSize: "12px",
                    padding: "16px",
                  }}
                >
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>📄</div>
                  <div>
                    {factura.archivo_original.split(/[/\\]/).pop()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                fontStyle: "italic",
              }}
            >
              Sin documento
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
