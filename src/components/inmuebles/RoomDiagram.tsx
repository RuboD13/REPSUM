/**
 * RoomDiagram — Visualización espacial de habitaciones en una propiedad
 * Muestra un layout de habitaciones con información de ocupación y estado
 */

import React from "react";
import type { Habitacion, Contrato } from "../../lib/types";

interface RoomDiagramProps {
  habitaciones: Habitacion[];
  inmuebleNombre: string;
  byHabitacion?: Record<number, Contrato | null>;
  hoveredHabitacion?: number | null;
  onHover?: (habId: number | null) => void;
  onClick?: (habId: number) => void;
}

const colors = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#06b6d4", // cyan
];

export const RoomDiagram: React.FC<RoomDiagramProps> = ({
  habitaciones,
  inmuebleNombre,
  byHabitacion,
  hoveredHabitacion,
  onHover,
  onClick,
}) => {
  if (habitaciones.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "var(--text-tertiary)" }}>
        No hay habitaciones activas
      </div>
    );
  }

  const cols = Math.ceil(Math.sqrt(habitaciones.length));
  const roomWidth = 140;
  const roomHeight = 100;
  const gap = 16;

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
          {inmuebleNombre}
        </h3>
        <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: "0" }}>
          {habitaciones.length} {habitaciones.length === 1 ? "habitación" : "habitaciones"}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${roomWidth}px)`,
          gap: `${gap}px`,
          justifyContent: "start",
        }}
      >
        {habitaciones.map((hab, idx) => {
          const contrato = byHabitacion?.[hab.id];
          const inquilinoNombre = contrato?.inquilino_nombre ?? null;
          const isOccupied = !!contrato && !contrato.fecha_fin;
          const isHovered = hoveredHabitacion === hab.id;
          const color = colors[idx % colors.length];

          return (
            <div
              key={hab.id}
              onClick={() => onClick?.(hab.id)}
              onMouseEnter={() => onHover?.(hab.id)}
              onMouseLeave={() => onHover?.(null)}
              style={{
                width: `${roomWidth}px`,
                height: `${roomHeight}px`,
                border: `2px solid ${color}`,
                borderRadius: "8px",
                padding: "12px",
                background: isOccupied ? "var(--bg-secondary)" : "var(--bg-inset)",
                cursor: onClick ? "pointer" : "default",
                transition: "all 0.2s ease",
                transform: isHovered ? "scale(1.05)" : "scale(1)",
                boxShadow: isHovered ? `0 4px 12px ${color}33` : "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {/* Header with room name and status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {hab.nombre}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                    {hab.superficie ? `${hab.superficie}m²` : "—"}
                  </div>
                </div>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: isOccupied ? "#22c55e" : "#94a3b8",
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Tenant info or vacant status */}
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "8px" }}>
                {inquilinoNombre ? (
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 500 }}>
                      {inquilinoNombre}
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                      Ocupado
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
                    Vacante
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: "8px" }}>
          ESTADOS
        </div>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e" }} />
            <span>Ocupada</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#94a3b8" }} />
            <span>Vacante</span>
          </div>
        </div>
      </div>
    </div>
  );
};
