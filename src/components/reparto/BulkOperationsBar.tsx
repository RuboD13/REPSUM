import React from "react";
import { Button } from "../ui/Button";
import type { Factura } from "../../lib/types";

interface BulkOperationsBarProps {
  selectedFacturas: Set<number>;
  facturas?: Factura[];
  onMarkAsVerified: (facturaIds: number[]) => void;
  onMarkAsReview: (facturaIds: number[]) => void;
  onDelete: (facturaIds: number[]) => void;
}

export const BulkOperationsBar: React.FC<BulkOperationsBarProps> = ({
  selectedFacturas,
  onMarkAsVerified,
  onMarkAsReview,
  onDelete,
}) => {
  if (selectedFacturas.size === 0) return null;

  const selectedCount = selectedFacturas.size;
  const selectedIds = Array.from(selectedFacturas);

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--accent-subtle)",
        borderTop: "2px solid var(--accent)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        zIndex: 100,
        boxShadow: "0 -2px 8px rgba(0,0,0,0.08)",
        animation: "slideUp 0.2s ease-out",
      }}
    >
      <style>
        {`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}
      </style>

      {/* Contador */}
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--accent)",
        }}
      >
        {selectedCount} factura{selectedCount !== 1 ? "s" : ""} seleccionada{selectedCount !== 1 ? "s" : ""}
      </div>

      {/* Separador */}
      <div style={{ width: "1px", height: "24px", background: "var(--border)" }} />

      {/* Botones de acción */}
      <div style={{ display: "flex", gap: "8px", flex: 1 }}>
        <Button
          variant="primary"
          onClick={() => onMarkAsVerified(selectedIds)}
          style={{
            fontSize: "14px",
            padding: "8px 16px",
          }}
        >
          ✓ Marcar como Verificadas
        </Button>

        <Button
          variant="secondary"
          onClick={() => onMarkAsReview(selectedIds)}
          style={{
            fontSize: "14px",
            padding: "8px 16px",
          }}
        >
          ◉ Marcar como Revisar
        </Button>

        <Button
          variant="destructive"
          onClick={() => {
            if (confirm(`¿Eliminar ${selectedCount} factura${selectedCount !== 1 ? "s" : ""}?`)) {
              onDelete(selectedIds);
            }
          }}
          style={{
            fontSize: "14px",
            padding: "8px 16px",
          }}
        >
          🗑 Eliminar
        </Button>
      </div>
    </div>
  );
};
