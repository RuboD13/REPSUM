import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useFacturas } from "../../store/useFacturas";
import type { Factura } from "../../lib/types";

interface FacturaEditModalProps {
  factura: Factura | null;
  open: boolean;
  onClose: () => void;
}

function fmt(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TIPO_INK: Record<string, string> = {
  luz:       "#B07D1A",
  agua:      "#4A6B7C",
  gas:       "#8B4A2E",
  internet:  "#567349",
  comunidad: "#6B6860",
  otro:      "#9C9890",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 0",
  border: "none",
  borderBottom: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-primary)",
  fontSize: "15px",
  fontFamily: "var(--font-body)",
  outline: "none",
  letterSpacing: "-0.01em",
  transition: "border-color 0.18s ease",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-heading)",
  fontSize: "9px",
  fontWeight: 600,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--text-tertiary)",
  marginBottom: "4px",
};

export const FacturaEditModal: React.FC<FacturaEditModalProps> = ({ factura, open, onClose }) => {
  const { update: updateFactura } = useFacturas();
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFin, setPeriodoFin] = useState("");
  const [importe, setImporte] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (factura && open) {
      setPeriodoInicio(factura.periodo_inicio);
      setPeriodoFin(factura.periodo_fin);
      setImporte(factura.importe.toString());
      setError(null);
    }
  }, [factura, open]);

  if (!factura || !open) return null;

  const tipoColor = TIPO_INK[factura.tipo_suministro] ?? TIPO_INK.otro;

  const handleGuardar = async () => {
    setError(null);
    if (!periodoInicio || !periodoFin || !importe) {
      setError("Completa todos los campos");
      return;
    }
    const importeNum = parseFloat(importe);
    if (isNaN(importeNum) || importeNum <= 0) {
      setError("El importe debe ser mayor que 0");
      return;
    }
    if (periodoInicio > periodoFin) {
      setError("La fecha de inicio debe ser anterior a la fecha de fin");
      return;
    }

    setSaving(true);
    try {
      await updateFactura(factura.id, {
        periodo_inicio: periodoInicio,
        periodo_fin: periodoFin,
        importe: importeNum,
        estado_edicion: "editado",
      });
      onClose();
    } catch (e) {
      setError("Error al guardar: " + String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="">
      <div style={{ width: "440px", display: "flex", flexDirection: "column", gap: "0" }}>
        {/* Editorial header */}
        <header
          style={{
            paddingBottom: "20px",
            borderBottom: "1px solid var(--border)",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "10px",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: tipoColor,
                flexShrink: 0,
                position: "relative",
                top: "-1px",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              Editar factura
            </span>
          </div>
          <h2
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "26px",
              fontWeight: 500,
              fontStyle: "italic",
              letterSpacing: "-0.015em",
              color: "var(--text-primary)",
              lineHeight: 1.1,
            }}
          >
            {factura.tipo_suministro.charAt(0).toUpperCase() + factura.tipo_suministro.slice(1)}
            {factura.comercializadora && (
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "13px",
                  fontStyle: "normal",
                  fontWeight: 400,
                  color: "var(--text-secondary)",
                  marginLeft: "12px",
                }}
              >
                {factura.comercializadora}
              </span>
            )}
          </h2>
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              alignItems: "baseline",
              gap: "4px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "22px",
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              {fmt(factura.importe)}
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "12px",
                color: "var(--text-tertiary)",
              }}
            >
              €
            </span>
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "10px",
                color: "var(--text-tertiary)",
                marginLeft: "8px",
                fontStyle: "italic",
              }}
            >
              importe original
            </span>
          </div>
        </header>

        {/* Form fields */}
        <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Inicio del período</label>
            <input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Fin del período</label>
            <input
              type="date"
              value={periodoFin}
              onChange={(e) => setPeriodoFin(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: "28px" }}>
          <label style={labelStyle}>Importe (€)</label>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              step="0.01"
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              style={{
                ...inputStyle,
                fontFamily: "var(--font-display)",
                fontSize: "18px",
                letterSpacing: "0.02em",
                paddingRight: "24px",
              }}
            />
            <span
              style={{
                position: "absolute",
                right: "4px",
                bottom: "12px",
                fontFamily: "var(--font-display)",
                fontSize: "11px",
                color: "var(--text-tertiary)",
              }}
            >
              €
            </span>
          </div>
        </div>

        {/* Notice */}
        <div
          style={{
            padding: "10px 14px",
            background: "var(--status-pending-bg)",
            borderLeft: "2px solid var(--status-pending)",
            fontFamily: "var(--font-body)",
            fontSize: "12px",
            fontStyle: "italic",
            color: "var(--status-pending)",
            lineHeight: 1.5,
            marginBottom: "28px",
          }}
        >
          Al guardar, el período se actualizará y los repartos existentes se recalcularán
          automáticamente.
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "10px 14px",
              background: "var(--status-excess-bg)",
              borderLeft: "2px solid var(--status-excess)",
              fontFamily: "var(--font-heading)",
              fontSize: "12px",
              color: "var(--status-excess)",
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
            paddingTop: "16px",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGuardar} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
