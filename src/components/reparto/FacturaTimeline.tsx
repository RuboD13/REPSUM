import React, { useState } from "react";
import type { Factura } from "../../lib/types";

interface FacturaTimelineProps {
  facturas: Factura[];
  periodo: string; // "YYYY-MM" format
  onSelectFactura?: (factura: Factura) => void;
}

// Muted editorial palette — tonal, paper-friendly, no rainbow garish hues
const TIPO_COLOR: Record<string, { fill: string; ink: string; tint: string }> = {
  luz:       { fill: "#B07D1A", ink: "#8A6014", tint: "#FBF3E2" }, // amber
  agua:      { fill: "#4A6B7C", ink: "#2F4957", tint: "#EEF2F5" }, // steel
  gas:       { fill: "#8B4A2E", ink: "#6B3721", tint: "#F7EDE7" }, // terra
  internet:  { fill: "#567349", ink: "#3D5431", tint: "#EEF3EB" }, // sage
  comunidad: { fill: "#6B6860", ink: "#4A4842", tint: "#F2F0EC" }, // warm gray
  otro:      { fill: "#9C9890", ink: "#6B6860", tint: "#F2F0EC" },
};

const TIPO_GLYPH: Record<string, string> = {
  luz:       "I",
  agua:      "II",
  gas:       "III",
  internet:  "IV",
  comunidad: "V",
  otro:      "—",
};

function parseYM(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m };
}

function dateToYM(dateStr: string): string {
  const [y, m] = dateStr.split("-");
  return `${y}-${m}`;
}

function yearMonthToDate(ym: string): Date {
  const { year, month } = parseYM(ym);
  return new Date(year, month - 1, 1);
}

function formatMonthLabel(ym: string): string {
  const { year, month } = parseYM(ym);
  const meses = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  return `${meses[month - 1]} '${year.toString().slice(2)}`;
}

function getMonthRange(facturas: Factura[]): { min: string; max: string } {
  const dates = facturas.flatMap((f) => [f.periodo_inicio, f.periodo_fin]);
  const yms = dates.map((d) => dateToYM(d)).sort();
  return { min: yms[0] ?? "", max: yms[yms.length - 1] ?? "" };
}

function addMonths(ym: string, n: number): string {
  const { year, month } = parseYM(ym);
  const date = new Date(year, month - 1 + n, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthsBetween(ym1: string, ym2: string): number {
  const d1 = yearMonthToDate(ym1);
  const d2 = yearMonthToDate(ym2);
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

function fmtEur(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Detecta gaps (meses faltantes) para cada tipo de suministro
function detectGaps(facturas: Factura[]): Map<string, string[]> {
  const gaps = new Map<string, string[]>();

  // Agrupar por tipo_suministro
  const porTipo = new Map<string, Factura[]>();
  facturas.forEach((f) => {
    if (!porTipo.has(f.tipo_suministro)) {
      porTipo.set(f.tipo_suministro, []);
    }
    porTipo.get(f.tipo_suministro)!.push(f);
  });

  // Para cada tipo, detectar gaps
  porTipo.forEach((facturasDeTipo, tipo) => {
    const sorted = facturasDeTipo.sort((a, b) => a.periodo_fin.localeCompare(b.periodo_fin));
    const gapMeses: string[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      // Obtener el siguiente mes después de current.periodo_fin
      const [cy, cm] = current.periodo_fin.split("-").map(Number);
      let nextMonth = new Date(cy, cm, 1); // mes siguiente

      const [ny, nm] = next.periodo_inicio.split("-").map(Number);
      const nextStart = new Date(ny, nm - 1, 1);

      // Si hay diferencia > 0 días, hay un gap
      while (nextMonth < nextStart) {
        const ym = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
        gapMeses.push(ym);
        nextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1);
      }
    }

    if (gapMeses.length > 0) {
      gaps.set(tipo, gapMeses);
    }
  });

  return gaps;
}

// Detecta solapamientos (mismo tipo de suministro, mismo período)
function detectOverlaps(facturas: Factura[]): Map<string, Factura[][]> {
  const overlaps = new Map<string, Factura[][]>();

  const porTipo = new Map<string, Factura[]>();
  facturas.forEach((f) => {
    if (!porTipo.has(f.tipo_suministro)) {
      porTipo.set(f.tipo_suministro, []);
    }
    porTipo.get(f.tipo_suministro)!.push(f);
  });

  porTipo.forEach((facturasDeTipo, tipo) => {
    const overlappingGroups: Factura[][] = [];

    for (let i = 0; i < facturasDeTipo.length; i++) {
      for (let j = i + 1; j < facturasDeTipo.length; j++) {
        const f1 = facturasDeTipo[i];
        const f2 = facturasDeTipo[j];

        // Verificar si se solapan
        const f1Start = new Date(f1.periodo_inicio);
        const f1End = new Date(f1.periodo_fin);
        const f2Start = new Date(f2.periodo_inicio);
        const f2End = new Date(f2.periodo_fin);

        if (f1Start <= f2End && f2Start <= f1End) {
          // Hay solapamiento
          const existing = overlappingGroups.find((group) =>
            group.some((f) => f.id === f1.id || f.id === f2.id)
          );
          if (existing) {
            if (!existing.find((f) => f.id === f1.id)) existing.push(f1);
            if (!existing.find((f) => f.id === f2.id)) existing.push(f2);
          } else {
            overlappingGroups.push([f1, f2]);
          }
        }
      }
    }

    if (overlappingGroups.length > 0) {
      overlaps.set(tipo, overlappingGroups);
    }
  });

  return overlaps;
}

export const FacturaTimeline: React.FC<FacturaTimelineProps> = ({ facturas, onSelectFactura }) => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  if (facturas.length === 0) return null;

  const { min, max } = getMonthRange(facturas);
  if (!min || !max) return null;

  const months: string[] = [];
  let current = min;
  while (monthsBetween(current, max) >= 0) {
    months.push(current);
    current = addMonths(current, 1);
  }

  const rowHeight = 40;
  const labelWidth = 148;
  const monthWidth = Math.max(88, 960 / months.length);

  // Unique tipos present for legend
  const tiposPresentes = Array.from(new Set(facturas.map((f) => f.tipo_suministro)));

  // Detectar gaps y overlaps
  const gaps = detectGaps(facturas);
  const overlaps = detectOverlaps(facturas);

  return (
    <section style={{ marginBottom: "32px" }}>
      {/* Editorial header */}
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "14px",
          paddingBottom: "10px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "14px" }}>
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
            }}
          >
            § Timeline
          </span>
          <h3
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "18px",
              fontWeight: 500,
              fontStyle: "italic",
              letterSpacing: "-0.01em",
              color: "var(--text-primary)",
            }}
          >
            Facturas en el período
          </h3>
        </div>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "11px",
            color: "var(--text-tertiary)",
            letterSpacing: "0.04em",
          }}
        >
          {facturas.length.toString().padStart(2, "0")} / {months.length} meses
        </span>
      </header>

      <div
        style={{
          overflowX: "auto",
          border: "1px solid var(--border)",
          background:
            "repeating-linear-gradient(0deg, var(--bg-surface) 0px, var(--bg-surface) 39px, var(--border-subtle) 39px, var(--border-subtle) 40px)",
          borderRadius: "2px",
        }}
      >
        {/* Month ruler */}
        <div
          style={{
            display: "flex",
            height: "44px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-primary)",
          }}
        >
          <div
            style={{
              width: `${labelWidth}px`,
              flexShrink: 0,
              borderRight: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              fontFamily: "var(--font-heading)",
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
            }}
          >
            Suministro
          </div>
          {months.map((ym, idx) => (
            <div
              key={ym}
              style={{
                width: `${monthWidth}px`,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                borderRight: idx < months.length - 1 ? "1px solid var(--border-subtle)" : "none",
                fontFamily: "var(--font-display)",
                fontSize: "10px",
                color: "var(--text-secondary)",
                letterSpacing: "0.04em",
              }}
            >
              {formatMonthLabel(ym)}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div>
          {facturas.map((f) => {
            const startYM = dateToYM(f.periodo_inicio);
            const endYM = dateToYM(f.periodo_fin);
            const startIdx = months.indexOf(startYM);
            const endIdx = months.indexOf(endYM);
            const palette = TIPO_COLOR[f.tipo_suministro] ?? TIPO_COLOR.otro;
            const glyph = TIPO_GLYPH[f.tipo_suministro] ?? TIPO_GLYPH.otro;
            const isHovered = hoveredId === f.id;

            // Detectar si hay overlap con esta factura
            const hasOverlap = overlaps.has(f.tipo_suministro) &&
              overlaps.get(f.tipo_suministro)!.some((group) =>
                group.some((fac) => fac.id === f.id)
              );

            // Detectar si hay gap después de esta factura
            const hasGapAfter = gaps.has(f.tipo_suministro) &&
              gaps.get(f.tipo_suministro)!.length > 0;

            return (
              <div
                key={f.id}
                onMouseEnter={() => setHoveredId(f.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectFactura?.(f)}
                style={{
                  display: "flex",
                  height: `${rowHeight}px`,
                  background: isHovered ? "var(--hover-overlay)" : "transparent",
                  transition: "background 0.18s ease",
                  cursor: "pointer",
                }}
              >
                {/* Row label */}
                <div
                  style={{
                    width: `${labelWidth}px`,
                    flexShrink: 0,
                    padding: "0 16px",
                    borderRight: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    borderLeft: (hasGapAfter || hasOverlap) ? "3px solid var(--status-excess)" : "none",
                  }}
                  title={hasOverlap ? "⚠ Solapamiento detectado con otra factura del mismo tipo" : hasGapAfter ? "⚠ Hay meses faltantes después" : ""}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "9px",
                      color: palette.ink,
                      fontWeight: 500,
                      minWidth: "18px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {glyph}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        textTransform: "capitalize",
                        lineHeight: 1.1,
                      }}
                    >
                      {f.tipo_suministro}
                      {(hasGapAfter || hasOverlap) && (
                        <span style={{ marginLeft: "6px", color: "var(--status-excess)", fontSize: "14px" }}>
                          ⚠
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "10px",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {fmtEur(f.importe)} €
                    </span>
                  </div>
                </div>

                {/* Timeline track */}
                <div style={{ display: "flex", flex: 1, position: "relative" }}>
                  {months.map((ym, idx) => {
                    const isInRange = idx >= startIdx && idx <= endIdx;
                    const isStart = idx === startIdx;
                    const isEnd = idx === endIdx;

                    return (
                      <div
                        key={ym}
                        style={{
                          width: `${monthWidth}px`,
                          flexShrink: 0,
                          borderRight: idx < months.length - 1 ? "1px solid var(--border-subtle)" : "none",
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          padding: "0 2px",
                        }}
                      >
                        {isInRange && (
                          <div
                            title={`${f.tipo_suministro} · ${f.periodo_inicio} → ${f.periodo_fin} · ${fmtEur(f.importe)} €`}
                            style={{
                              position: "absolute",
                              left: isStart ? "6px" : "0",
                              right: isEnd ? "6px" : "0",
                              height: "14px",
                              background: f.verificada ? palette.fill : palette.tint,
                              borderTop: `1px solid ${palette.fill}`,
                              borderBottom: `1px solid ${palette.fill}`,
                              borderLeft: isStart ? `1px solid ${palette.fill}` : "none",
                              borderRight: isEnd ? `1px solid ${palette.fill}` : "none",
                              borderStyle: f.verificada ? "solid" : "dashed",
                              transition: "all 0.2s ease",
                              transform: isHovered ? "translateY(-1px)" : "translateY(0)",
                              boxShadow: isHovered
                                ? `0 2px 0 ${palette.ink}22`
                                : "none",
                              cursor: "pointer",
                            }}
                          />
                        )}
                        {isStart && isInRange && (
                          <div
                            style={{
                              position: "absolute",
                              left: "4px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: "5px",
                              height: "5px",
                              borderRadius: "50%",
                              background: palette.ink,
                              zIndex: 2,
                            }}
                          />
                        )}
                        {isEnd && isInRange && (
                          <div
                            style={{
                              position: "absolute",
                              right: "4px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: "5px",
                              height: "5px",
                              borderRadius: "50%",
                              background: palette.ink,
                              zIndex: 2,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginTop: "14px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          Leyenda —
        </span>
        {tiposPresentes.map((tipo) => {
          const palette = TIPO_COLOR[tipo] ?? TIPO_COLOR.otro;
          const glyph = TIPO_GLYPH[tipo] ?? TIPO_GLYPH.otro;
          return (
            <div
              key={tipo}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--font-heading)",
                fontSize: "11px",
                color: "var(--text-secondary)",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "14px",
                  height: "8px",
                  background: palette.fill,
                  border: `1px solid ${palette.ink}`,
                }}
              />
              <span style={{ textTransform: "capitalize" }}>{tipo}</span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "9px",
                  color: "var(--text-tertiary)",
                }}
              >
                {glyph}
              </span>
            </div>
          );
        })}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: "var(--font-heading)",
            fontSize: "11px",
            color: "var(--text-tertiary)",
            fontStyle: "italic",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "14px",
              height: "8px",
              background: "var(--bg-secondary)",
              border: "1px dashed var(--text-tertiary)",
            }}
          />
          sin verificar
        </div>
      </div>
    </section>
  );
};
