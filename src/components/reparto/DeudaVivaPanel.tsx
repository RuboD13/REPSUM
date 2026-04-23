/**
 * Panel de Deuda Viva — Muestra excesos pendientes/comunicados agrupados por inquilino.
 * Filas clickeables que abren DeudaDetalleModal.
 */

import React, { useEffect, useState } from "react";
import { useRepartos } from "../../store/useRepartos";
import type { DeudaVivaSummary } from "../../store/useRepartos";
import { DeudaDetalleModal } from "./DeudaDetalleModal";
import type { EstadoCobro } from "../../lib/types";

function fmt(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function diasDesde(fechaISO: string): number {
  const ref = new Date(fechaISO);
  const hoy = new Date();
  return Math.floor((hoy.getTime() - ref.getTime()) / 86400000);
}

function currentPeriodo(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const ESTADO_COLOR: Record<EstadoCobro, string> = {
  pendiente:  "var(--status-excess)",
  comunicado: "var(--status-pending)",
  cobrado:    "var(--status-ok)",
  pagado:     "#22c55e", // bright green for "fully paid"
  incidencia: "var(--text-tertiary)",
};

const ESTADO_LABEL: Record<EstadoCobro, string> = {
  pendiente:  "Pendiente",
  comunicado: "Comunicado",
  cobrado:    "Cobrado",
  pagado:     "Pagado",
  incidencia: "Incidencia",
};

export const DeudaVivaPanel: React.FC = () => {
  const { deudaViva, loadDeudaViva } = useRepartos();
  const [deudaSeleccionada, setDeudaSeleccionada] = useState<DeudaVivaSummary | null>(null);
  const periodo = currentPeriodo();

  useEffect(() => { loadDeudaViva(); }, []);

  if (deudaViva.length === 0) return null;

  // Separate deudas with outstanding debt and those without
  const conDeuda = deudaViva.filter((d) => d.total_exceso > 0);
  const sinDeuda = deudaViva.filter((d) => d.total_exceso <= 0);

  const totalDeuda = conDeuda.reduce((s, d) => s + d.total_exceso, 0);

  return (
    <>
      <div style={{ marginBottom: "32px", border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        {/* Cabecera */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="label-section" style={{ margin: 0 }}>Deuda viva</span>
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
              {conDeuda.length} {conDeuda.length === 1 ? "inquilino" : "inquilinos"} con exceso
              {sinDeuda.length > 0 && ` • ${sinDeuda.length} cobrado`}
            </span>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 500, color: conDeuda.length > 0 ? "var(--status-excess)" : "var(--status-ok)" }}>
            {fmt(totalDeuda)}€
          </span>
        </div>

        {/* Filas con deuda */}
        <div>
          {conDeuda.map((d, i) => {
            // Días desde comunicación (si está comunicado) o desde fin de período
            const fechaRef = d.estado_cobro === "comunicado" && d.fecha_comunicacion
              ? d.fecha_comunicacion
              : d.periodo_fin;
            const dias = diasDesde(fechaRef);
            const esComunicado = d.estado_cobro === "comunicado" && !!d.fecha_comunicacion;
            const alerta = esComunicado && dias > 14;

            return (
              <div
                key={i}
                onClick={() => setDeudaSeleccionada(d)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 200px 100px 90px 90px",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 20px",
                  borderBottom: i < conDeuda.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  background: alerta ? "var(--status-pending-bg)" : "transparent",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!alerta) (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = alerta ? "var(--status-pending-bg)" : "transparent";
                }}
              >
                {/* Inquilino */}
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500 }}>{d.inquilino_nombre}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "1px" }}>
                    {d.inmueble_nombre} · {d.habitacion_nombre}
                  </div>
                </div>

                {/* Tiempo transcurrido con etiqueta contextual */}
                <div style={{ fontSize: "12px", color: alerta ? "var(--status-pending)" : "var(--text-tertiary)" }}>
                  {alerta && <span style={{ marginRight: "4px" }}>⚠</span>}
                  {esComunicado
                    ? <>{dias} {dias === 1 ? "día" : "días"} sin cobrar</>
                    : <span style={{ fontStyle: "italic" }}>Desde el final del período de facturación</span>
                  }
                </div>

                {/* Exceso */}
                <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 600, textAlign: "right", color: "var(--status-excess)" }}>
                  {fmt(d.total_exceso)}€
                </div>

                {/* Estado */}
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "11px", fontWeight: 500, color: ESTADO_COLOR[d.estado_cobro] }}>
                    ● {ESTADO_LABEL[d.estado_cobro]}
                  </span>
                </div>

                {/* Indicador de antigüedad */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(100, (dias / 60) * 100)}%`,
                      background: dias > 30 ? "var(--status-excess)" : dias > 14 ? "var(--status-pending)" : "var(--accent)",
                      borderRadius: "2px",
                      transition: "width 0.3s",
                    }} />
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "2px", textAlign: "right" }}>
                    Ver detalle →
                  </div>
                </div>
              </div>
            );
          })}

          {/* Separator line if there are entries without debt */}
          {sinDeuda.length > 0 && conDeuda.length > 0 && (
            <div style={{ borderTop: "2px solid var(--border)", marginTop: "0px" }} />
          )}

          {/* Filas sin deuda */}
          {sinDeuda.map((d, i) => (
            <div
              key={`sin-deuda-${i}`}
              onClick={() => setDeudaSeleccionada(d)}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 200px 100px 90px 90px",
                alignItems: "center",
                gap: "12px",
                padding: "10px 20px",
                borderBottom: i < sinDeuda.length - 1 ? "1px solid var(--border-subtle)" : "none",
                background: "transparent",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {/* Inquilino */}
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500 }}>{d.inquilino_nombre}</div>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "1px" }}>
                  {d.inmueble_nombre} · {d.habitacion_nombre}
                </div>
              </div>

              {/* Status */}
              <div style={{ fontSize: "12px", color: "var(--status-ok)", fontStyle: "italic" }}>
                Sin deuda pendiente
              </div>

              {/* Exceso (0) */}
              <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 600, textAlign: "right", color: "var(--status-ok)" }}>
                0€
              </div>

              {/* Estado */}
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--status-ok)" }}>
                  ● {ESTADO_LABEL[d.estado_cobro]}
                </span>
              </div>

              {/* Indicador */}
              <div style={{ textAlign: "right" }}>
                <div style={{ height: "4px", background: "var(--status-ok)", borderRadius: "2px", opacity: 0.6 }} />
                <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "2px", textAlign: "right" }}>
                  Completado ✓
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de detalle */}
      {deudaSeleccionada && (
        <DeudaDetalleModal
          deuda={deudaSeleccionada}
          periodoActual={periodo}
          onClose={() => {
            setDeudaSeleccionada(null);
            loadDeudaViva();
          }}
        />
      )}
    </>
  );
};
