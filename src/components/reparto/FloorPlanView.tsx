/**
 * FloorPlanView — Vista visual tipo plano arquitectónico del inmueble
 * Muestra habitaciones como cards en un layout de plano, con estado de pago,
 * suministros del mes y KPIs a la derecha. Conectado a los stores reales.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useInmuebles } from "../../store/useInmuebles";
import { useHabitaciones } from "../../store/useHabitaciones";
import { useContratos } from "../../store/useContratos";
import { useFacturas } from "../../store/useFacturas";
import { useRepartos } from "../../store/useRepartos";
import type { EstadoCobro } from "../../lib/types";

// ── Utilidades ────────────────────────────────────────────────────────────────

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function periodoLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
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

function fmtEur(n: number): string {
  return `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

// Icono por suministro
const SUMINISTRO_META: Record<string, { icon: string; color: string }> = {
  luz:       { icon: "⚡", color: "#B07D1A" },
  agua:      { icon: "💧", color: "#2C4A6E" },
  gas:       { icon: "🔥", color: "#C4421A" },
  internet:  { icon: "📡", color: "#2D7A4F" },
  comunidad: { icon: "🏢", color: "#6B6860" },
  otro:      { icon: "•",  color: "#9C9890" },
};

// Estado → color + label
const ESTADO_META: Record<EstadoCobro, { color: string; bg: string; label: string; icon: string }> = {
  pagado:     { color: "#2D7A4F", bg: "#EEF7F1", label: "Pagado",     icon: "✓" },
  cobrado:    { color: "#2D7A4F", bg: "#EEF7F1", label: "Cobrado",    icon: "✓" },
  comunicado: { color: "#B07D1A", bg: "#FFF8E8", label: "Comunicado", icon: "⏱" },
  pendiente:  { color: "#B07D1A", bg: "#FFF8E8", label: "Pendiente",  icon: "⏱" },
  incidencia: { color: "#C4421A", bg: "#FDF2EE", label: "Incidencia", icon: "⚠" },
};

// ── Componente principal ──────────────────────────────────────────────────────

interface FloorPlanViewProps {
  inmuebleId?: number;
}

export const FloorPlanView: React.FC<FloorPlanViewProps> = ({ inmuebleId }) => {
  const [periodo, setPeriodo] = useState(currentPeriodo());
  const [hovered, setHovered] = useState<number | null>(null);

  const { inmuebles, load: loadInmuebles } = useInmuebles();
  const { byInmueble: habsByInm, load: loadHabs } = useHabitaciones();
  const { byHabitacion, loadForInmueble: loadContratos } = useContratos();
  const { byInmueble: facturasByInm, loadForInmueble: loadFacturas } = useFacturas();
  const { byInmueble: repartosByInm, loadForInmueble: loadRepartos } = useRepartos();

  // Inmueble actual
  const inmueble = useMemo(() => {
    if (inmuebleId) return inmuebles.find((i) => i.id === inmuebleId) ?? null;
    return inmuebles[0] ?? null;
  }, [inmuebles, inmuebleId]);

  // Cargar datos
  useEffect(() => { loadInmuebles(); }, []);
  useEffect(() => {
    if (!inmueble) return;
    loadHabs(inmueble.id);
    loadContratos(inmueble.id);
    loadFacturas(inmueble.id, periodo);
    loadRepartos(inmueble.id, periodo);
  }, [inmueble?.id, periodo]);

  // Habitaciones activas
  const habitaciones = useMemo(() => {
    if (!inmueble) return [];
    return (habsByInm[inmueble.id] ?? []).filter((h) => h.activa);
  }, [habsByInm, inmueble]);

  // Facturas del período
  const facturas = useMemo(() => {
    if (!inmueble) return [];
    return facturasByInm[inmueble.id] ?? [];
  }, [facturasByInm, inmueble]);

  // Repartos del período
  const repartos = useMemo(() => {
    if (!inmueble) return [];
    return repartosByInm[inmueble.id] ?? [];
  }, [repartosByInm, inmueble]);

  // Suministros agregados del mes
  const suministrosDelMes = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const f of facturas) {
      agg[f.tipo_suministro] = (agg[f.tipo_suministro] ?? 0) + f.importe;
    }
    return agg;
  }, [facturas]);

  const totalFacturado = Object.values(suministrosDelMes).reduce((s, v) => s + v, 0);

  // Reparto por habitación (cada habitación → total de repartos + estado cobro agregado)
  const repartoPorHabitacion = useMemo(() => {
    return habitaciones.map((hab) => {
      const contrato = byHabitacion[hab.id];
      const repartosDeHab = repartos.filter((r) => r.contrato_id === contrato?.id);
      const totalHab = repartosDeHab.reduce((s, r) => s + r.importe_neto + r.exceso, 0);

      // Estado agregado: si todos pagado/cobrado → pagado; si alguno incidencia → incidencia; si hay pendiente → pendiente
      let estado: EstadoCobro = "pagado";
      if (repartosDeHab.length === 0) {
        estado = "pendiente";
      } else if (repartosDeHab.some((r) => r.estado_cobro === "incidencia")) {
        estado = "incidencia";
      } else if (repartosDeHab.some((r) => r.estado_cobro === "pendiente")) {
        estado = "pendiente";
      } else if (repartosDeHab.some((r) => r.estado_cobro === "comunicado")) {
        estado = "comunicado";
      } else if (repartosDeHab.every((r) => r.estado_cobro === "pagado" || r.estado_cobro === "cobrado")) {
        estado = "pagado";
      }

      return {
        habitacion: hab,
        contrato,
        inquilino: contrato?.inquilino_nombre ?? null,
        total: totalHab,
        estado,
        numRepartos: repartosDeHab.length,
      };
    });
  }, [habitaciones, byHabitacion, repartos]);

  // KPIs
  const kpis = useMemo(() => {
    const pagados     = repartoPorHabitacion.filter((r) => r.estado === "pagado").length;
    const pendientes  = repartoPorHabitacion.filter((r) => r.estado === "pendiente" || r.estado === "comunicado").length;
    const retrasados  = repartoPorHabitacion.filter((r) => r.estado === "incidencia").length;
    const total       = repartoPorHabitacion.length;
    const porcentaje  = total > 0 ? Math.round((pagados / total) * 100) : 0;
    return { pagados, pendientes, retrasados, total, porcentaje };
  }, [repartoPorHabitacion]);

  // Layout dinámico según número de habitaciones (tipologías reales)
  const getGridTemplate = (count: number): string => {
    if (count <= 0) return "1fr";
    if (count === 1) return "1fr";
    if (count === 2) return "repeat(2, 1fr)";
    if (count === 3) return "repeat(3, 1fr)";
    if (count === 4) return "repeat(2, 1fr)"; // 2x2
    if (count === 5) return "repeat(3, 1fr)"; // 3+2 desigual
    if (count === 6) return "repeat(3, 1fr)"; // 3x2
    return "repeat(3, 1fr)"; // 7+ → 3 columnas
  };

  const getGridAreas = (count: number): string => {
    // Define grid-template-areas para layouts asimétricos realistas
    if (count === 1) return '"hab1"';
    if (count === 2) return '"hab1 hab2"';
    if (count === 3) return '"hab1 hab2 hab3"';
    if (count === 4) return '"hab1 hab2" "hab3 hab4"';
    if (count === 5) return '"hab1 hab2 hab3" "hab4 hab5 hab5"'; // hab5 más grande
    if (count === 6) return '"hab1 hab2 hab3" "hab4 hab5 hab6"';
    return '"hab1 hab2 hab3" "hab4 hab5 hab6" "hab7 hab7 hab7"'; // 7+ simétrico
  };

  const cols = getGridTemplate(habitaciones.length);

  if (!inmueble) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>🏢</div>
        <div style={styles.emptyText}>No hay ningún inmueble seleccionado</div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* ─── CENTRO: Plano arquitectónico ─── */}
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <div style={styles.inmuebleNombre}>{inmueble.nombre.toUpperCase()}</div>
            <div style={styles.inmuebleDir}>{inmueble.direccion}</div>
          </div>

          <div style={styles.monthSelector}>
            <button style={styles.monthBtn} onClick={() => setPeriodo((p) => addMonths(p, -1))} aria-label="Mes anterior">
              ◀
            </button>
            <div style={styles.monthDisplay}>
              <span style={styles.monthIcon}>📅</span>
              <span style={styles.monthText}>{periodoLabel(periodo)}</span>
            </div>
            <button style={styles.monthBtn} onClick={() => setPeriodo((p) => addMonths(p, 1))} aria-label="Mes siguiente">
              ▶
            </button>
          </div>
        </header>

        {/* Floor plan canvas */}
        <div style={styles.floorCanvas}>
          {/* Grid background pattern */}
          <div style={styles.gridPattern} />

          {habitaciones.length === 0 ? (
            <div style={styles.noHabs}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🚪</div>
              <div>No hay habitaciones configuradas para este inmueble</div>
            </div>
          ) : (
            <div style={{ ...styles.roomGrid, gridTemplateColumns: cols, gridTemplateAreas: getGridAreas(habitaciones.length) }}>
              {repartoPorHabitacion.map((item, idx) => {
                const meta = ESTADO_META[item.estado];
                const progreso = item.estado === "pagado" ? 100
                               : item.estado === "comunicado" ? 60
                               : item.estado === "pendiente" ? 30
                               : item.estado === "incidencia" ? 10 : 0;

                return (
                  <div
                    key={item.habitacion.id}
                    style={{
                      ...styles.room,
                      gridArea: `hab${idx + 1}`,
                      borderColor: hovered === item.habitacion.id ? meta.color : "var(--border-strong)",
                      boxShadow: hovered === item.habitacion.id
                        ? `0 4px 20px ${meta.color}33, inset 0 0 0 1px ${meta.color}`
                        : "0 1px 2px rgba(0,0,0,0.04)",
                      transform: hovered === item.habitacion.id ? "translateY(-2px)" : "translateY(0)",
                      animationDelay: `${idx * 60}ms`,
                    }}
                    onMouseEnter={() => setHovered(item.habitacion.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* Room tag (top-left corner, architectural style) */}
                    <div style={styles.roomTag}>
                      <span style={styles.roomTagNumber}>{String(idx + 1).padStart(2, "0")}</span>
                    </div>

                    {/* Inquilino */}
                    <div style={styles.inquilinoRow}>
                      <div style={{ ...styles.avatar, background: meta.bg, color: meta.color }}>
                        {item.inquilino ? item.inquilino.charAt(0).toUpperCase() : "—"}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={styles.roomLabel}>{item.habitacion.nombre}</div>
                        <div style={styles.inquilinoName}>
                          {item.inquilino ?? <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>Vacante</span>}
                        </div>
                      </div>
                    </div>

                    {/* Estado badge */}
                    <div style={{ ...styles.estadoBadge, color: meta.color, background: meta.bg }}>
                      <span>{meta.icon}</span>
                      <span>{item.inquilino ? meta.label : "Propietario"}</span>
                    </div>

                    {/* Progress */}
                    <div style={styles.progressRow}>
                      <div style={styles.progressTrack}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${progreso}%`,
                            background: meta.color,
                          }}
                        />
                      </div>
                      <div style={styles.progressLabel}>{progreso}%</div>
                    </div>

                    {/* Monto del mes */}
                    <div style={styles.roomFooter}>
                      <span style={styles.montoLabel}>Este mes</span>
                      <span style={styles.montoValue}>{fmtEur(item.total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leyenda */}
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: "#2D7A4F" }} /> Pagado
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: "#B07D1A" }} /> Pendiente
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: "#C4421A" }} /> Incidencia
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: "var(--text-tertiary)" }} /> Vacante
          </div>
        </div>
      </main>

      {/* ─── DERECHA: Panel de suministros + KPIs ─── */}
      <aside style={styles.aside}>
        {/* Suministros */}
        <section style={styles.panelSection}>
          <div style={styles.panelHeader}>
            <span style={styles.panelIcon}>⚡</span>
            <div>
              <div style={styles.panelTitle}>Suministros</div>
              <div style={styles.panelSubtitle}>{periodoLabel(periodo)}</div>
            </div>
          </div>

          <div style={styles.suministrosList}>
            {Object.entries(suministrosDelMes).length === 0 ? (
              <div style={styles.emptyInline}>Sin facturas este mes</div>
            ) : (
              Object.entries(suministrosDelMes).map(([tipo, monto]) => {
                const meta = SUMINISTRO_META[tipo] ?? SUMINISTRO_META.otro;
                return (
                  <div key={tipo} style={styles.suministroRow}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ ...styles.suministroIcon, color: meta.color }}>{meta.icon}</span>
                      <span style={styles.suministroNombre}>{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</span>
                    </div>
                    <span style={styles.suministroMonto}>{fmtEur(monto)}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Total */}
          <div style={styles.totalBox}>
            <span style={styles.totalLabel}>Total</span>
            <span style={styles.totalValue}>{fmtEur(totalFacturado)}</span>
          </div>
        </section>

        {/* Reparto por habitación */}
        <section style={styles.panelSection}>
          <div style={styles.miniHeader}>Reparto por habitación</div>
          <div style={styles.repartoList}>
            {repartoPorHabitacion.map((item) => {
              const meta = ESTADO_META[item.estado];
              return (
                <div key={item.habitacion.id} style={styles.repartoItem}>
                  <div style={{ ...styles.miniAvatar, background: meta.bg, color: meta.color }}>
                    {item.inquilino ? item.inquilino.charAt(0).toUpperCase() : "·"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.repartoNombre}>
                      {item.inquilino ?? "Vacante"}
                    </div>
                    <div style={styles.repartoSub}>{item.habitacion.nombre}</div>
                  </div>
                  <div style={styles.repartoMonto}>{fmtEur(item.total)}</div>
                  <div
                    style={{
                      ...styles.estadoPill,
                      color: meta.color,
                      background: meta.bg,
                      borderColor: meta.color,
                    }}
                    title={meta.label}
                  >
                    {meta.icon}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* KPIs */}
        <section style={styles.kpiSection}>
          <div style={{ ...styles.kpiCard, background: "#EEF7F1", borderColor: "#2D7A4F" }}>
            <div style={{ ...styles.kpiNumber, color: "#2D7A4F" }}>
              {kpis.pagados}<span style={styles.kpiDen}>/{kpis.total}</span>
            </div>
            <div style={styles.kpiLabel}>Pagados</div>
            <div style={{ ...styles.kpiIcon, color: "#2D7A4F" }}>✓</div>
          </div>

          <div style={{ ...styles.kpiCard, background: "#FFF8E8", borderColor: "#B07D1A" }}>
            <div style={{ ...styles.kpiNumber, color: "#B07D1A" }}>{kpis.pendientes}</div>
            <div style={styles.kpiLabel}>Pendientes</div>
            <div style={{ ...styles.kpiIcon, color: "#B07D1A" }}>⏱</div>
          </div>

          <div style={{ ...styles.kpiCard, background: "#FDF2EE", borderColor: "#C4421A" }}>
            <div style={{ ...styles.kpiNumber, color: "#C4421A" }}>{kpis.retrasados}</div>
            <div style={styles.kpiLabel}>Incidencias</div>
            <div style={{ ...styles.kpiIcon, color: "#C4421A" }}>⚠</div>
          </div>

          {/* Gauge circular */}
          <div style={styles.gaugeCard}>
            <CircularGauge percent={kpis.porcentaje} />
            <div style={styles.gaugeLabel}>Cobrado</div>
          </div>
        </section>
      </aside>

      {/* Keyframes inyectados */}
      <style>{animations}</style>
    </div>
  );
};

// ── Gauge circular ────────────────────────────────────────────────────────────

const CircularGauge: React.FC<{ percent: number }> = ({ percent }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const color = percent >= 80 ? "#2D7A4F" : percent >= 50 ? "#B07D1A" : "#C4421A";

  return (
    <div style={{ position: "relative", width: "88px", height: "88px" }}>
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--bg-inset)" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: 700,
          color,
          fontFamily: "var(--font-display)",
        }}
      >
        {percent}%
      </div>
    </div>
  );
};

// ── Animaciones inyectadas ────────────────────────────────────────────────────

const animations = `
  @keyframes roomFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes progressGrow {
    from { width: 0; }
  }
`;

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "grid",
    gridTemplateColumns: "1fr 380px",
    gap: "0",
    height: "100%",
    width: "100%",
    background: "var(--bg-primary)",
    overflow: "hidden",
  },

  // ── EMPTY STATE ──
  emptyState: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "80px", color: "var(--text-tertiary)", gap: "12px",
  },
  emptyIcon:  { fontSize: "48px", opacity: 0.5 },
  emptyText:  { fontSize: "14px", fontStyle: "italic" },
  emptyInline: { fontSize: "13px", color: "var(--text-tertiary)", fontStyle: "italic", padding: "12px 4px" },

  // ── MAIN (izquierda) ──
  main: {
    display: "flex", flexDirection: "column", padding: "24px 28px",
    overflow: "auto", minWidth: 0,
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    paddingBottom: "20px", marginBottom: "24px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  inmuebleNombre: {
    fontSize: "22px", fontWeight: 700, letterSpacing: "0.01em",
    color: "var(--text-primary)", fontFamily: "var(--font-display)",
  },
  inmuebleDir: {
    fontSize: "12px", color: "var(--text-tertiary)",
    marginTop: "4px", letterSpacing: "0.02em",
  },
  monthSelector: {
    display: "flex", alignItems: "center", gap: "0",
    background: "var(--bg-surface)", border: "1px solid var(--border)",
    borderRadius: "3px", padding: "0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  },
  monthBtn: {
    background: "none", border: "none", padding: "10px 14px",
    cursor: "pointer", color: "var(--text-tertiary)", fontSize: "11px",
    transition: "all 0.15s",
  },
  monthDisplay: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 18px", minWidth: "150px", justifyContent: "center",
    borderLeft: "1px solid var(--border-subtle)",
    borderRight: "1px solid var(--border-subtle)",
  },
  monthIcon:  { fontSize: "14px" },
  monthText:  { fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" },

  // ── FLOOR CANVAS ──
  floorCanvas: {
    flex: 1, position: "relative", padding: "24px",
    background: "var(--bg-surface)", border: "1px solid var(--border)",
    borderRadius: "2px", minHeight: "400px",
  },
  gridPattern: {
    position: "absolute", inset: 0,
    backgroundImage:
      "linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)",
    backgroundSize: "20px 20px", opacity: 0.4, pointerEvents: "none",
  },
  noHabs: {
    position: "relative", textAlign: "center", padding: "80px 20px",
    color: "var(--text-tertiary)", fontSize: "13px", fontStyle: "italic",
  },
  roomGrid: {
    position: "relative", display: "grid", gap: "16px",
  },

  // ── ROOM CARD ──
  room: {
    position: "relative", padding: "16px", background: "var(--bg-surface)",
    border: "2px solid var(--border-strong)", borderRadius: "4px",
    cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    animation: "roomFadeIn 0.4s ease backwards",
    display: "flex", flexDirection: "column", gap: "12px",
  },
  roomTag: {
    position: "absolute", top: "-1px", left: "12px",
    background: "var(--accent)", color: "var(--bg-surface)",
    padding: "2px 8px", fontSize: "10px", fontWeight: 700,
    letterSpacing: "0.1em", fontFamily: "var(--font-display)",
  },
  roomTagNumber: { letterSpacing: "0.1em" },
  inquilinoRow: {
    display: "flex", alignItems: "center", gap: "10px", marginTop: "10px",
  },
  avatar: {
    width: "36px", height: "36px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "14px", fontWeight: 700, flexShrink: 0,
    fontFamily: "var(--font-display)",
  },
  roomLabel: {
    fontSize: "10px", color: "var(--text-tertiary)",
    textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
  },
  inquilinoName: {
    fontSize: "13px", fontWeight: 600, color: "var(--text-primary)",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  estadoBadge: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    padding: "4px 10px", borderRadius: "2px",
    fontSize: "11px", fontWeight: 600, alignSelf: "flex-start",
  },
  progressRow: {
    display: "flex", alignItems: "center", gap: "8px",
  },
  progressTrack: {
    flex: 1, height: "4px", background: "var(--bg-inset)",
    borderRadius: "2px", overflow: "hidden",
  },
  progressFill: {
    height: "100%", borderRadius: "2px",
    animation: "progressGrow 0.6s ease-out",
    transition: "width 0.4s ease, background 0.3s",
  },
  progressLabel: {
    fontSize: "10px", color: "var(--text-tertiary)",
    fontWeight: 600, fontFamily: "var(--font-display)", minWidth: "28px", textAlign: "right",
  },
  roomFooter: {
    display: "flex", justifyContent: "space-between", alignItems: "baseline",
    paddingTop: "8px", borderTop: "1px dashed var(--border-subtle)",
  },
  montoLabel: {
    fontSize: "10px", color: "var(--text-tertiary)",
    textTransform: "uppercase", letterSpacing: "0.05em",
  },
  montoValue: {
    fontSize: "14px", fontWeight: 700, color: "var(--text-primary)",
    fontFamily: "var(--font-display)",
  },

  // ── LEYENDA ──
  legend: {
    display: "flex", gap: "20px", marginTop: "16px", padding: "12px",
    background: "var(--bg-secondary)", borderRadius: "2px",
    fontSize: "11px", color: "var(--text-secondary)",
  },
  legendItem: {
    display: "flex", alignItems: "center", gap: "6px", fontWeight: 500,
  },
  legendDot: {
    width: "8px", height: "8px", borderRadius: "50%", display: "inline-block",
  },

  // ── ASIDE (derecha) ──
  aside: {
    borderLeft: "1px solid var(--border)",
    background: "var(--bg-secondary)",
    display: "flex", flexDirection: "column", padding: "24px 20px",
    gap: "24px", overflow: "auto",
  },
  panelSection: { display: "flex", flexDirection: "column", gap: "12px" },
  panelHeader: {
    display: "flex", alignItems: "center", gap: "12px",
    paddingBottom: "12px", borderBottom: "1px solid var(--border-subtle)",
  },
  panelIcon: {
    fontSize: "20px", width: "36px", height: "36px",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--accent-subtle)", borderRadius: "2px",
  },
  panelTitle: {
    fontSize: "14px", fontWeight: 700, color: "var(--text-primary)",
    fontFamily: "var(--font-display)",
  },
  panelSubtitle: {
    fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px",
  },
  miniHeader: {
    fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "var(--text-tertiary)",
    paddingBottom: "8px", borderBottom: "1px solid var(--border-subtle)",
    fontFamily: "var(--font-heading)",
  },

  // ── SUMINISTROS ──
  suministrosList: { display: "flex", flexDirection: "column", gap: "4px" },
  suministroRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 4px", fontSize: "13px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  suministroIcon: { fontSize: "16px" },
  suministroNombre: {
    color: "var(--text-secondary)", fontWeight: 500, textTransform: "capitalize",
  },
  suministroMonto: {
    fontWeight: 600, color: "var(--text-primary)",
    fontFamily: "var(--font-display)",
  },
  totalBox: {
    display: "flex", justifyContent: "space-between", alignItems: "baseline",
    padding: "14px 12px", marginTop: "4px",
    background: "var(--accent)", color: "var(--bg-surface)", borderRadius: "2px",
  },
  totalLabel: {
    fontSize: "11px", letterSpacing: "0.08em",
    textTransform: "uppercase", fontWeight: 600,
  },
  totalValue: {
    fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-display)",
  },

  // ── REPARTO LIST ──
  repartoList: { display: "flex", flexDirection: "column", gap: "4px" },
  repartoItem: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "8px 4px", borderBottom: "1px solid var(--border-subtle)",
  },
  miniAvatar: {
    width: "28px", height: "28px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: 700, flexShrink: 0,
    fontFamily: "var(--font-display)",
  },
  repartoNombre: {
    fontSize: "13px", fontWeight: 600, color: "var(--text-primary)",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  repartoSub: {
    fontSize: "10px", color: "var(--text-tertiary)", marginTop: "1px",
  },
  repartoMonto: {
    fontSize: "12px", fontWeight: 700, color: "var(--text-primary)",
    fontFamily: "var(--font-display)",
  },
  estadoPill: {
    width: "22px", height: "22px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: 700, border: "1px solid",
  },

  // ── KPIs ──
  kpiSection: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px",
    paddingTop: "16px", borderTop: "1px solid var(--border-subtle)",
  },
  kpiCard: {
    position: "relative", padding: "14px", borderRadius: "2px",
    border: "1px solid", overflow: "hidden",
  },
  kpiNumber: {
    fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-display)",
    lineHeight: 1, letterSpacing: "-0.02em",
  },
  kpiDen: {
    fontSize: "14px", fontWeight: 500, opacity: 0.6, marginLeft: "2px",
  },
  kpiLabel: {
    fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "var(--text-secondary)",
    marginTop: "4px",
  },
  kpiIcon: {
    position: "absolute", top: "10px", right: "12px",
    fontSize: "14px", opacity: 0.4,
  },
  gaugeCard: {
    gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "14px",
    padding: "14px", background: "var(--bg-surface)",
    border: "1px solid var(--border)", borderRadius: "2px",
  },
  gaugeLabel: {
    fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "var(--text-secondary)",
  },
};
