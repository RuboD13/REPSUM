import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import type { Factura, Inmueble } from "../../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  inmueble: Inmueble;
  facturas: Factura[];
}

type FiltroEstado = "todas" | "verificadas" | "sin-verificar";

const TIPO_LABEL: Record<string, string> = {
  luz: "Luz",
  agua: "Agua",
  gas: "Gas",
  internet: "Internet",
  comunidad: "Comunidad",
  otro: "Otro",
};

const TIPO_COLOR: Record<string, string> = {
  luz: "#B07D1A",
  agua: "#4A6B7C",
  gas: "#8B4A2E",
  internet: "#567349",
  comunidad: "#6B6860",
  otro: "#9C9890",
};

export const FacturasListModal: React.FC<Props> = ({ open, onClose, inmueble, facturas }) => {
  const [filtro, setFiltro] = useState<FiltroEstado>("todas");
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [descargando, setDescargando] = useState(false);

  const facturasFiltradas = facturas.filter((f) => {
    if (filtro === "verificadas") return f.verificada;
    if (filtro === "sin-verificar") return !f.verificada;
    return true;
  });

  const isImage = selectedFactura?.archivo_original && /\.(jpe?g|png|tiff?|bmp|webp)$/i.test(selectedFactura.archivo_original);
  const isPdf = selectedFactura?.archivo_original && /\.pdf$/i.test(selectedFactura.archivo_original);

  const handleDescargar = async (factura: Factura) => {
    if (!factura.archivo_original) return;

    setDescargando(true);
    try {
      // Invocar función backend para descargar archivo
      await invoke("download_factura", {
        path: factura.archivo_original,
        fileName: `factura_${factura.tipo_suministro}_${factura.periodo_inicio}.pdf`,
      });
    } catch (e) {
      console.error("Error descargando factura:", e);
      alert("Error al descargar la factura");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Facturas — ${inmueble.nombre}`} width={1200}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", height: "700px" }}>
        {/* Columna izquierda: Lista de facturas */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", paddingRight: "12px" }}>
          {/* Filtros */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
            <button
              onClick={() => setFiltro("todas")}
              style={{
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: filtro === "todas" ? 600 : 400,
                border: filtro === "todas" ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: filtro === "todas" ? "var(--accent-subtle)" : "transparent",
                color: filtro === "todas" ? "var(--accent)" : "var(--text-secondary)",
                borderRadius: "2px",
                cursor: "pointer",
              }}
            >
              Todas ({facturas.length})
            </button>
            <button
              onClick={() => setFiltro("verificadas")}
              style={{
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: filtro === "verificadas" ? 600 : 400,
                border: filtro === "verificadas" ? "1px solid var(--status-ok)" : "1px solid var(--border)",
                background: filtro === "verificadas" ? "var(--bg-secondary)" : "transparent",
                color: filtro === "verificadas" ? "var(--status-ok)" : "var(--text-secondary)",
                borderRadius: "2px",
                cursor: "pointer",
              }}
            >
              Verificadas ({facturas.filter((f) => f.verificada).length})
            </button>
            <button
              onClick={() => setFiltro("sin-verificar")}
              style={{
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: filtro === "sin-verificar" ? 600 : 400,
                border: filtro === "sin-verificar" ? "1px solid var(--status-pending)" : "1px solid var(--border)",
                background: filtro === "sin-verificar" ? "var(--bg-secondary)" : "transparent",
                color: filtro === "sin-verificar" ? "var(--status-pending)" : "var(--text-secondary)",
                borderRadius: "2px",
                cursor: "pointer",
              }}
            >
              Sin verificar ({facturas.filter((f) => !f.verificada).length})
            </button>
          </div>

          {/* Lista */}
          {facturasFiltradas.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px", fontStyle: "italic" }}>
              Sin facturas para este filtro
            </div>
          ) : (
            facturasFiltradas.map((f) => (
              <div
                key={f.id}
                onClick={() => setSelectedFactura(f)}
                style={{
                  padding: "12px",
                  border: selectedFactura?.id === f.id ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: selectedFactura?.id === f.id ? "var(--accent-subtle)" : "var(--bg-secondary)",
                  borderRadius: "2px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (selectedFactura?.id !== f.id) {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                    (e.currentTarget as HTMLElement).style.background = "var(--hover-overlay)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedFactura?.id !== f.id) {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "2px",
                      background: TIPO_COLOR[f.tipo_suministro] || "#999",
                    }}
                  />
                  <span style={{ fontWeight: 600, fontSize: "13px", textTransform: "capitalize" }}>
                    {TIPO_LABEL[f.tipo_suministro] || f.tipo_suministro}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      padding: "2px 8px",
                      background: f.verificada ? "var(--status-ok)" : "var(--status-pending)",
                      color: "white",
                      fontSize: "10px",
                      fontWeight: 600,
                      borderRadius: "2px",
                    }}
                  >
                    {f.verificada ? "✓" : "?"}
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  {f.periodo_inicio} → {f.periodo_fin}
                </div>
                {f.comercializadora && (
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                    {f.comercializadora}
                  </div>
                )}
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent)" }}>
                  {f.importe.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </div>
              </div>
            ))
          )}
        </div>

        {/* Columna derecha: Detalles y preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflow: "hidden" }}>
          {selectedFactura ? (
            <>
              {/* Detalles */}
              <div style={{ background: "var(--bg-secondary)", padding: "12px", borderRadius: "2px" }}>
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                    Tipo
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 500 }}>
                    {TIPO_LABEL[selectedFactura.tipo_suministro] || selectedFactura.tipo_suministro}
                  </div>
                </div>

                {selectedFactura.comercializadora && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                      Comercializadora
                    </div>
                    <div style={{ fontSize: "13px" }}>
                      {selectedFactura.comercializadora}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                    Período
                  </div>
                  <div style={{ fontSize: "13px" }}>
                    {selectedFactura.periodo_inicio} → {selectedFactura.periodo_fin}
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                    Importe
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--accent)" }}>
                    {selectedFactura.importe.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                    Estado
                  </div>
                  <span
                    style={{
                      padding: "4px 10px",
                      background: selectedFactura.verificada ? "var(--status-ok)" : "var(--status-pending)",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: 600,
                      borderRadius: "2px",
                      display: "inline-block",
                    }}
                  >
                    {selectedFactura.verificada ? "✓ Verificada" : "Pendiente verificar"}
                  </span>
                </div>

                {selectedFactura.archivo_original && (
                  <Button
                    variant="secondary"
                    onClick={() => handleDescargar(selectedFactura)}
                    disabled={descargando}
                    style={{ width: "100%", fontSize: "12px" }}
                  >
                    {descargando ? "Descargando..." : "⬇ Descargar"}
                  </Button>
                )}
              </div>

              {/* Preview del documento */}
              {selectedFactura.archivo_original ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--bg-inset)",
                    border: "1px solid var(--border)",
                    borderRadius: "2px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {isImage ? (
                    <img
                      src={`file://${selectedFactura.archivo_original}`}
                      alt="Document preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : isPdf ? (
                    <embed
                      src={`file://${selectedFactura.archivo_original}`}
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
                        {selectedFactura.archivo_original.split(/[/\\]/).pop()}
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
                    background: "var(--bg-inset)",
                    border: "1px solid var(--border)",
                    borderRadius: "2px",
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-body)",
                    fontSize: "12px",
                    fontStyle: "italic",
                  }}
                >
                  Sin documento
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                fontStyle: "italic",
              }}
            >
              Selecciona una factura para ver detalles
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "16px", borderTop: "1px solid var(--border)", marginTop: "16px" }}>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
};
