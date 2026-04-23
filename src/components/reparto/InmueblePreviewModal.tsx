import React from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import type { Inmueble } from "../../lib/types";

interface InmueblePreviewModalProps {
  open: boolean;
  inmueble: Inmueble | null;
  onClose: () => void;
  onEdit: () => void;
}

export const InmueblePreviewModal: React.FC<InmueblePreviewModalProps> = ({
  open,
  inmueble,
  onClose,
  onEdit,
}) => {
  if (!inmueble || !open) return null;

  // Helper para iniciales
  const getInitials = (name: string): { text: string; bg: string } => {
    const parts = name.trim().split(/\s+/);
    const initials = parts
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
    const colors = ["#8B4A2E", "#567349", "#4A6B7C", "#B07D1A", "#6B6860"];
    const bgColor = colors[0];
    return { text: initials, bg: bgColor };
  };

  const initials = getInitials(inmueble.nombre);
  const suministros = (() => {
    try {
      return JSON.parse(inmueble.suministros_imputables) as string[];
    } catch {
      return [];
    }
  })();

  return (
    <Modal open={open} onClose={onClose} title="">
      <div
        style={{
          width: "480px",
          display: "flex",
          flexDirection: "column",
          gap: "0",
        }}
      >
        {/* Header con foto y nombre */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            padding: "24px",
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {/* Foto grande */}
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "4px",
              overflow: "hidden",
              background: inmueble.foto_url ? "transparent" : initials.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              border: "1px solid var(--border)",
            }}
          >
            {inmueble.foto_url ? (
              <img
                src={inmueble.foto_url}
                alt={inmueble.nombre}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  color: "white",
                  textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  fontFamily: "var(--font-heading)",
                }}
              >
                {initials.text}
              </span>
            )}
          </div>

          {/* Nombre y dirección */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  marginBottom: "4px",
                }}
              >
                Inmueble
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "20px",
                  fontWeight: 500,
                  fontStyle: "italic",
                  color: "var(--text-primary)",
                  lineHeight: 1.1,
                  margin: "0",
                }}
              >
                {inmueble.nombre}
              </h2>
            </div>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                fontStyle: "italic",
                color: "var(--text-secondary)",
              }}
            >
              {inmueble.direccion}
            </div>
          </div>
        </div>

        {/* Información */}
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Fila 1: Modelo + Notas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Modelo de reparto */}
            <div>
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "9px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  marginBottom: "6px",
                }}
              >
                Modelo de reparto
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  fontWeight: 500,
                }}
              >
                {inmueble.modelo_reparto === "por_habitacion"
                  ? "Por habitación"
                  : "Tope por casa"}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "10px",
                  color: "var(--text-tertiary)",
                  marginTop: "3px",
                }}
              >
                {inmueble.modelo_reparto === "por_habitacion"
                  ? "Reparte según pesos definidos"
                  : `Tope: ${inmueble.tope_global ?? "—"}€`}
              </div>
            </div>

            {/* Num. Habitaciones */}
            <div>
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "9px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  marginBottom: "6px",
                }}
              >
                Habitaciones
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "18px",
                  color: "var(--text-primary)",
                  fontWeight: 500,
                }}
              >
                {inmueble.num_habitaciones}
              </div>
            </div>
          </div>

          {/* Suministros imputables */}
          {suministros.length > 0 && (
            <div>
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "9px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  marginBottom: "8px",
                }}
              >
                Suministros imputables
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                {suministros.map((s) => (
                  <span
                    key={s}
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontFamily: "var(--font-heading)",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: "2px",
                      color: "var(--text-secondary)",
                      textTransform: "capitalize",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {inmueble.notas && (
            <div>
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "9px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  marginBottom: "6px",
                }}
              >
                Notas
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                  padding: "10px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "2px",
                }}
              >
                {inmueble.notas}
              </div>
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-primary)",
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              onEdit();
            }}
          >
            ✎ Editar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
