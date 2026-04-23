/**
 * Modal de Tendencias — Fase 6
 * Evolución del coste de cada suministro (últimos 12 meses),
 * alertas de incremento >15%, y predicción por media móvil.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { useFacturas } from "../../store/useFacturas";
import type { Factura, Inmueble } from "../../lib/types";

// ── Utilidades ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function periodoLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${meses[m - 1]} ${String(y).slice(2)}`;
}

function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentPeriodo(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const TIPO_COLOR: Record<string, string> = {
  luz:       "var(--status-pending)",
  agua:      "var(--accent)",
  gas:       "var(--status-excess)",
  internet:  "var(--status-ok)",
  comunidad: "var(--text-tertiary)",
  otro:      "var(--text-tertiary)",
};

// ── Componente ────────────────────────────────────────────────────────────────

interface Props {
  inmueble: Inmueble;
  onClose: () => void;
}

export const TendenciasModal: React.FC<Props> = ({ inmueble, onClose }) => {
  const { byInmueble, loadForInmueble } = useFacturas();

  useEffect(() => {
    loadForInmueble(inmueble.id); // sin periodo → carga todo el histórico
  }, [inmueble.id]);

  const todasFacturas: Factura[] = byInmueble[inmueble.id] ?? [];

  // Últimos 12 meses
  const periodos = useMemo(() => {
    const actual = currentPeriodo();
    return Array.from({ length: 12 }, (_, i) => addMonths(actual, -(11 - i)));
  }, []);

  // Por cada tipo de suministro, agrega importes por mes
  const tiposSuministro = useMemo(() =>
    [...new Set(todasFacturas.map((f) => f.tipo_suministro))],
    [todasFacturas]
  );

  const seriesPorTipo = useMemo(() => {
    const result: Record<string, (number | null)[]> = {};
    for (const tipo of tiposSuministro) {
      result[tipo] = periodos.map((mes) => {
        const mesFin = `${mes}-31`;
        const mesInicio = `${mes}-01`;
        const facturasMes = todasFacturas.filter(
          (f) => f.tipo_suministro === tipo &&
                 f.periodo_inicio <= mesFin && f.periodo_fin >= mesInicio
        );
        if (facturasMes.length === 0) return null;
        return facturasMes.reduce((s, f) => s + f.importe, 0);
      });
    }
    return result;
  }, [todasFacturas, tiposSuministro, periodos]);

  // Alertas: variación >15% respecto al mes anterior
  const alertas: { tipo: string; mes: string; variacion: number; actual: number; anterior: number }[] = [];
  for (const tipo of tiposSuministro) {
    const serie = seriesPorTipo[tipo];
    for (let i = 1; i < serie.length; i++) {
      const ant = serie[i - 1];
      const act = serie[i];
      if (ant !== null && act !== null && ant > 0) {
        const variacion = ((act - ant) / ant) * 100;
        if (variacion > 15) {
          alertas.push({ tipo, mes: periodos[i], variacion, actual: act, anterior: ant });
        }
      }
    }
  }

  // Predicción: media móvil de los últimos 3 meses conocidos
  const predicciones: Record<string, number | null> = {};
  for (const tipo of tiposSuministro) {
    const serie = seriesPorTipo[tipo];
    const conocidos = serie.filter((v) => v !== null) as number[];
    const ultimos3 = conocidos.slice(-3);
    if (ultimos3.length >= 2) {
      predicciones[tipo] = ultimos3.reduce((s, v) => s + v, 0) / ultimos3.length;
    } else {
      predicciones[tipo] = null;
    }
  }

  const [tabActiva, setTabActiva] = useState(tiposSuministro[0] ?? "");

  // Valores para escalar las barras
  const serieActiva = tabActiva ? seriesPorTipo[tabActiva] ?? [] : [];
  const maxValor = Math.max(...serieActiva.filter((v) => v !== null) as number[], 0.01);
  const predActiva = predicciones[tabActiva] ?? null;

  return (
    <Modal open={true} title={`Tendencias — ${inmueble.nombre}`} onClose={onClose} width={720}>
      {todasFacturas.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
          No hay facturas históricas para este inmueble.
        </div>
      ) : (
        <>
          {/* Alertas */}
          {alertas.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              {alertas.slice(0, 3).map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "var(--status-pending-bg)", borderLeft: "3px solid var(--status-pending)", marginBottom: "6px", fontSize: "12px" }}>
                  <span style={{ color: "var(--status-pending)", fontSize: "14px" }}>⚠</span>
                  <span>
                    <strong style={{ textTransform: "capitalize" }}>{a.tipo}</strong> en {periodoLabel(a.mes)}:
                    {" "}+{a.variacion.toFixed(0)}% respecto al mes anterior
                    ({fmt(a.anterior)}€ → {fmt(a.actual)}€)
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Selector de tipo */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "20px", flexWrap: "wrap" }}>
            {tiposSuministro.map((tipo) => (
              <button
                key={tipo}
                onClick={() => setTabActiva(tipo)}
                style={{
                  padding: "5px 14px",
                  fontSize: "12px",
                  fontWeight: tabActiva === tipo ? 600 : 400,
                  color: tabActiva === tipo ? TIPO_COLOR[tipo] ?? "var(--accent)" : "var(--text-secondary)",
                  background: tabActiva === tipo ? "var(--bg-secondary)" : "transparent",
                  border: `1px solid ${tabActiva === tipo ? TIPO_COLOR[tipo] ?? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "2px",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {tipo}
              </button>
            ))}
          </div>

          {/* Gráfica de barras */}
          <div style={{ marginBottom: "24px" }}>
            <div className="label-section" style={{ marginBottom: "12px" }}>
              Evolución mensual — últimos 12 meses
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "140px", padding: "0 4px" }}>
              {periodos.map((mes, i) => {
                const valor = serieActiva[i];
                const anterior = i > 0 ? serieActiva[i - 1] : null;
                const alerta = valor !== null && anterior !== null && anterior > 0 && ((valor - anterior) / anterior) > 0.15;
                const barHeight = valor !== null ? Math.max(4, (valor / maxValor) * 120) : 0;
                const color = alerta
                  ? "var(--status-excess)"
                  : TIPO_COLOR[tabActiva] ?? "var(--accent)";

                return (
                  <div key={mes} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    {/* Valor encima */}
                    {valor !== null && (
                      <span style={{ fontSize: "9px", color: alerta ? "var(--status-excess)" : "var(--text-tertiary)", fontFamily: "var(--font-display)", whiteSpace: "nowrap" }}>
                        {fmt(valor)}€
                      </span>
                    )}
                    {/* Barra */}
                    <div style={{ width: "100%", display: "flex", alignItems: "flex-end", height: "120px" }}>
                      <div style={{
                        width: "100%",
                        height: `${barHeight}px`,
                        background: valor !== null ? color : "var(--border)",
                        opacity: valor !== null ? 0.85 : 0.3,
                        borderRadius: "1px 1px 0 0",
                        transition: "height 0.3s",
                      }} />
                    </div>
                    {/* Etiqueta mes */}
                    <span style={{ fontSize: "9px", color: "var(--text-tertiary)", textAlign: "center" }}>
                      {periodoLabel(mes)}
                    </span>
                  </div>
                );
              })}

              {/* Barra de predicción */}
              {predActiva !== null && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", opacity: 0.6 }}>
                  <span style={{ fontSize: "9px", color: "var(--text-tertiary)", fontFamily: "var(--font-display)", whiteSpace: "nowrap" }}>
                    ~{fmt(predActiva)}€
                  </span>
                  <div style={{ width: "100%", display: "flex", alignItems: "flex-end", height: "120px" }}>
                    <div style={{
                      width: "100%",
                      height: `${Math.max(4, (predActiva / maxValor) * 120)}px`,
                      background: TIPO_COLOR[tabActiva] ?? "var(--accent)",
                      opacity: 0.35,
                      borderRadius: "1px 1px 0 0",
                      border: `1px dashed ${TIPO_COLOR[tabActiva] ?? "var(--accent)"}`,
                    }} />
                  </div>
                  <span style={{ fontSize: "9px", color: "var(--text-tertiary)", textAlign: "center" }}>
                    Prev.
                  </span>
                </div>
              )}
            </div>

            {predActiva !== null && (
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "8px" }}>
                * Predicción basada en media móvil de los últimos {Math.min(3, (serieActiva.filter((v) => v !== null)).length)} periodos.
              </div>
            )}
          </div>

          {/* Tabla resumen por tipo */}
          <div>
            <div className="label-section" style={{ marginBottom: "10px" }}>Resumen por suministro</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr>
                  {["Tipo", "Facturas", "Total acumulado", "Media mensual", "Último periodo", "Tendencia"].map((h) => (
                    <th key={h} style={{ padding: "6px 10px", textAlign: h === "Tipo" ? "left" : "right", fontFamily: "var(--font-heading)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-tertiary)", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tiposSuministro.map((tipo) => {
                  const facturasTipo = todasFacturas.filter((f) => f.tipo_suministro === tipo);
                  const total = facturasTipo.reduce((s, f) => s + f.importe, 0);
                  const media = total / Math.max(1, facturasTipo.length);
                  const serie = seriesPorTipo[tipo];
                  const valores = serie.filter((v) => v !== null) as number[];
                  const ultimo = valores[valores.length - 1] ?? null;
                  const penultimo = valores[valores.length - 2] ?? null;
                  const variacion = ultimo !== null && penultimo !== null && penultimo > 0
                    ? ((ultimo - penultimo) / penultimo) * 100
                    : null;

                  return (
                    <tr key={tipo} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "7px 10px", fontWeight: 500, textTransform: "capitalize" }}>
                        <span style={{ color: TIPO_COLOR[tipo], marginRight: "6px", fontSize: "10px" }}>●</span>
                        {tipo}
                      </td>
                      <td style={{ padding: "7px 10px", textAlign: "right", color: "var(--text-secondary)" }}>{facturasTipo.length}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "var(--font-display)" }}>{fmt(total)}€</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "var(--font-display)", color: "var(--text-secondary)" }}>{fmt(media)}€</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "var(--font-display)" }}>{ultimo !== null ? fmt(ultimo) + "€" : "—"}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 600, color: variacion === null ? "var(--text-tertiary)" : variacion > 15 ? "var(--status-excess)" : variacion > 0 ? "var(--status-pending)" : "var(--status-ok)" }}>
                        {variacion !== null ? `${variacion > 0 ? "+" : ""}${variacion.toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
};
