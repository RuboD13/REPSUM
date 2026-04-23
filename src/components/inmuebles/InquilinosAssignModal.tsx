import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import type { Habitacion, Contrato, Inquilino } from "../../lib/types";

interface InquilinosAssignModalProps {
  open: boolean;
  habitaciones: Habitacion[];
  contratos: Record<number, Contrato | null>;
  inquilinos: Inquilino[];
  onClose: () => void;
  onAssign: (habitacionId: number, inquilinoId: number) => void;
  onAddInquilino?: () => void;
}

export const InquilinosAssignModal: React.FC<InquilinosAssignModalProps> = ({
  open,
  habitaciones,
  contratos,
  inquilinos,
  onClose,
  onAssign,
  onAddInquilino,
}) => {
  const [draggedInquilino, setDraggedInquilino] = useState<number | null>(null);

  // Habitaciones activas sin contrato (vacantes)
  const habitacionesVacantes = habitaciones.filter(
    (h) => h.activa && !contratos[h.id]
  );

  // Inquilinos disponibles (que no tienen contrato en ninguna habitación activa)
  const inquilinosDisponibles = inquilinos.filter((inq) => {
    const tieneContrato = Object.values(contratos).some(
      (c) => c && c.inquilino_id === inq.id
    );
    return !tieneContrato;
  });

  const handleDragStart = (e: React.DragEvent, inquilinoId: number) => {
    setDraggedInquilino(inquilinoId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (
    e: React.DragEvent,
    habitacionId: number
  ) => {
    e.preventDefault();
    if (draggedInquilino !== null) {
      onAssign(habitacionId, draggedInquilino);
      setDraggedInquilino(null);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="">
      <div style={{ width: "640px", display: "flex", flexDirection: "column", gap: "0", overflow: "hidden" }}>
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-surface)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "18px",
              fontWeight: 500,
              fontStyle: "italic",
              margin: "0 0 4px 0",
              color: "var(--text-primary)",
            }}
          >
            👥 Asignar inquilinos a habitaciones
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "11px",
              color: "var(--text-tertiary)",
              margin: "0",
              fontStyle: "italic",
            }}
          >
            Arrastra inquilinos a habitaciones vacantes
          </p>
        </div>

        {/* Contenido */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "20px 24px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
          }}
        >
          {/* Panel izquierdo: Inquilinos disponibles */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                marginBottom: "12px",
              }}
            >
              Inquilinos disponibles ({inquilinosDisponibles.length})
            </div>

            {inquilinosDisponibles.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  border: "1px dashed var(--border)",
                  borderRadius: "2px",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-body)",
                  fontSize: "12px",
                }}
              >
                <p style={{ margin: "0 0 12px 0" }}>No hay inquilinos disponibles</p>
                {onAddInquilino && (
                  <Button
                    variant="secondary"
                    onClick={onAddInquilino}
                    style={{ fontSize: "10px", padding: "5px 10px" }}
                  >
                    + Agregar inquilino
                  </Button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {inquilinosDisponibles.map((inq) => (
                  <div
                    key={inq.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, inq.id)}
                    style={{
                      padding: "12px",
                      background: draggedInquilino === inq.id ? "var(--accent-subtle)" : "var(--bg-secondary)",
                      border: `2px solid ${draggedInquilino === inq.id ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "2px",
                      cursor: "grab",
                      transition: "all 0.2s",
                      opacity: draggedInquilino === inq.id ? 0.7 : 1,
                    }}
                    onDragEnd={() => setDraggedInquilino(null)}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={inq.nombre}
                    >
                      👤 {inq.nombre}
                    </div>
                    {inq.email && (
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "10px",
                          color: "var(--text-tertiary)",
                          marginTop: "3px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={inq.email}
                      >
                        {inq.email}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {onAddInquilino && inquilinosDisponibles.length > 0 && (
              <Button
                variant="secondary"
                onClick={onAddInquilino}
                style={{ fontSize: "10px", padding: "6px 12px", marginTop: "12px", width: "100%" }}
              >
                + Agregar inquilino
              </Button>
            )}
          </div>

          {/* Panel derecho: Habitaciones vacantes */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                marginBottom: "12px",
              }}
            >
              Habitaciones vacantes ({habitacionesVacantes.length})
            </div>

            {habitacionesVacantes.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  border: "1px dashed var(--border)",
                  borderRadius: "2px",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-body)",
                  fontSize: "12px",
                }}
              >
                ✓ Todas las habitaciones están ocupadas
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {habitacionesVacantes.map((hab) => (
                  <div
                    key={hab.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, hab.id)}
                    style={{
                      padding: "16px",
                      background: draggedInquilino !== null ? "var(--bg-secondary)" : "var(--bg-primary)",
                      border: `2px dashed ${draggedInquilino !== null ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "2px",
                      cursor: "copy",
                      transition: "all 0.2s",
                      minHeight: "80px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={hab.nombre}
                    >
                      🛏️ {hab.nombre}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        fontSize: "11px",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {hab.superficie && <span>📐 {hab.superficie}m²</span>}
                      <span>⚖️ Peso {hab.criterio_reparto}</span>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "10px",
                        color: "var(--text-secondary)",
                        fontStyle: "italic",
                        marginTop: "4px",
                      }}
                    >
                      {draggedInquilino !== null ? "Suelta aquí" : "Arrastra un inquilino"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Listo
          </Button>
        </div>
      </div>
    </Modal>
  );
};
