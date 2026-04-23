import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import type { Habitacion } from "../../lib/types";

interface HabitacionEditModalProps {
  open: boolean;
  habitacion: Habitacion | null;
  onClose: () => void;
  onSave: (nombre: string, criterio_reparto: number, superficie: number | null, descripcion: string | null) => void;
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

export const HabitacionEditModal: React.FC<HabitacionEditModalProps> = ({
  open,
  habitacion,
  onClose,
  onSave,
}) => {
  const [nombre, setNombre] = useState("");
  const [criterioReparto, setCriterioReparto] = useState<number>(1);
  const [superficie, setSuperficie] = useState<string>("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (habitacion && open) {
      setNombre(habitacion.nombre);
      setCriterioReparto(habitacion.criterio_reparto);
      setSuperficie(habitacion.superficie ? String(habitacion.superficie) : "");
      setDescripcion(habitacion.descripcion ?? "");
    }
  }, [habitacion, open]);

  if (!habitacion || !open) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(
        nombre,
        criterioReparto,
        superficie ? Number(superficie) : null,
        descripcion || null
      );
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
            Editar habitación
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
        </div>

        {/* Campos */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Nombre */}
          <div>
            <label style={labelStyle}>Nombre de habitación</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={inputBaseStyle}
              placeholder="Ej: Habitación principal"
            />
          </div>

          {/* Criterio de reparto (peso) */}
          <div>
            <label style={labelStyle}>Peso (criterio reparto)</label>
            <input
              type="number"
              value={criterioReparto}
              onChange={(e) => setCriterioReparto(Number(e.target.value) || 1)}
              style={inputBaseStyle}
              min="0.1"
              step="0.1"
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
              Multiplicador para el reparto de gastos. Mayor valor = mayor proporción de gastos
            </div>
          </div>

          {/* Superficie */}
          <div>
            <label style={labelStyle}>Superficie (m²)</label>
            <input
              type="number"
              value={superficie}
              onChange={(e) => setSuperficie(e.target.value)}
              style={inputBaseStyle}
              placeholder="Ej: 14.5"
              min="0"
              step="0.1"
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
              Opcional. Se utiliza para referencia y cálculos
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              style={{
                ...inputBaseStyle,
                minHeight: "60px",
                resize: "none",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                lineHeight: 1.6,
              }}
              placeholder="Notas sobre la habitación, características especiales…"
            />
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
