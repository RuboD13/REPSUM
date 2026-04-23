import React from "react";
import { Modal } from "../ui/Modal";
import type { Inmueble, Habitacion } from "../../lib/types";

interface InmueblesSelectorModalProps {
  open: boolean;
  inmuebles: Inmueble[];
  habitaciones: Record<number, Habitacion[]>;
  selectedInmuebleId: number | null;
  onSelect: (inmuebleId: number) => void;
  onClose: () => void;
}

export const InmueblesSelectorModal: React.FC<InmueblesSelectorModalProps> = ({
  open,
  inmuebles,
  habitaciones,
  selectedInmuebleId,
  onSelect,
  onClose,
}) => {
  const getInitials = (name: string): { text: string; bg: string } => {
    const parts = name.trim().split(/\s+/);
    const initials = parts
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
    const colors = ["#8B4A2E", "#567349", "#4A6B7C", "#B07D1A", "#6B6860"];
    const bgColor = colors[Math.abs(name.charCodeAt(0)) % colors.length];
    return { text: initials, bg: bgColor };
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="" width={720}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
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
            Cambiar propiedad
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
            Selecciona una propiedad
          </h2>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "15px",
              color: "var(--text-secondary)",
              marginTop: "8px",
            }}
          >
            {inmuebles.length} inmueble{inmuebles.length !== 1 ? "s" : ""} disponible{inmuebles.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Grid de tarjetas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "14px",
            maxHeight: "500px",
            overflowY: "auto",
            paddingRight: "8px",
          }}
        >
          {inmuebles.map((inm) => {
            const habs = habitaciones[inm.id] ?? [];
            const habitacionesActivas = habs.filter((h) => h.activa).length;
            const vacantes = habs.filter((h) => h.activa && !h.nombre.includes("Vacante")).length;
            const isSelected = inm.id === selectedInmuebleId;
            const initials = getInitials(inm.nombre);

            return (
              <div
                key={inm.id}
                onClick={() => {
                  onSelect(inm.id);
                  onClose();
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  padding: "14px",
                  border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                  background: isSelected ? "var(--accent-subtle)" : "var(--bg-surface)",
                  borderRadius: "2px",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                    (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }
                }}
              >
                {/* Foto/Iniciales */}
                <div
                  style={{
                    width: "100%",
                    height: "80px",
                    background: inm.foto_url ? "transparent" : initials.bg,
                    borderRadius: "2px",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--border)",
                  }}
                >
                  {inm.foto_url ? (
                    <img
                      src={inm.foto_url}
                      alt={inm.nombre}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: "20px",
                        fontWeight: 600,
                        color: "white",
                        textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        fontFamily: "var(--font-heading)",
                      }}
                    >
                      {initials.text}
                    </span>
                  )}
                </div>

                {/* Nombre */}
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {inm.nombre}
                </div>

                {/* Dirección */}
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {inm.direccion}
                </div>

                {/* Stats */}
                <div style={{ display: "flex", gap: "8px", fontSize: "12px", color: "var(--text-tertiary)" }}>
                  <span>🏠 {habitacionesActivas}</span>
                  <span>✓ {vacantes}</span>
                </div>

                {/* Checkmark si está seleccionado */}
                {isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      width: "20px",
                      height: "20px",
                      background: "var(--accent)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
