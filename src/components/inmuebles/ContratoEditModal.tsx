import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import type { Contrato, Habitacion } from "../../lib/types";

interface ContratoEditModalProps {
  open: boolean;
  contrato: Contrato | null;
  habitacion: Habitacion | null;
  onClose: () => void;
  onSave: (fechaInicio: string, fechaFin: string | null) => void;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-heading)",
  fontSize: "14px",
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--text-tertiary)",
  marginBottom: "8px",
};

const inputBaseStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 0",
  border: "none",
  borderBottom: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-primary)",
  fontSize: "18px",
  fontFamily: "var(--font-body)",
  outline: "none",
  letterSpacing: "-0.01em",
  transition: "border-color 0.18s ease",
};

export const ContratoEditModal: React.FC<ContratoEditModalProps> = ({
  open,
  contrato,
  habitacion,
  onClose,
  onSave,
}) => {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (contrato && open) {
      setFechaInicio(contrato.fecha_inicio);
      setFechaFin(contrato.fecha_fin ?? "");
    }
  }, [contrato, open]);

  if (!contrato || !habitacion || !open) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(fechaInicio, fechaFin || null);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="">
      <div
        style={{
          width: "480px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Header */}
        <div>
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Editar contrato
          </span>
          <h2
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "24px",
              fontWeight: 500,
              fontStyle: "italic",
              letterSpacing: "-0.015em",
              color: "var(--text-primary)",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {habitacion.nombre}
          </h2>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "15px",
              color: "var(--text-secondary)",
              marginTop: "6px",
            }}
          >
            {contrato.inquilino_nombre}
          </div>
        </div>

        {/* Campos de fecha */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Fecha Inicio */}
          <div>
            <label style={labelStyle}>Fecha de inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={inputBaseStyle}
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label style={labelStyle}>Fecha de finalización (opcional)</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={inputBaseStyle}
            />
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "11px",
                color: "var(--text-tertiary)",
                marginTop: "6px",
                fontStyle: "italic",
              }}
            >
              Dejar vacío si el contrato sigue vigente
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
            paddingTop: "16px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            style={{ opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
