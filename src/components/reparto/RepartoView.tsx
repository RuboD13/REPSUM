import React, { useEffect, useState, useCallback } from "react";
import { StatusBadge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";
import { FacturaImport } from "../facturas/FacturaImport";
import { FacturaDetailsModal } from "../facturas/FacturaDetailsModal";
import { FacturasListModal } from "../facturas/FacturasListModal";
import { CorreoEditorModal, useCorreoEditor } from "../correos/CorreoEditorModal";
import { DeudaVivaPanel } from "./DeudaVivaPanel";
import { TendenciasModal } from "./TendenciasModal";
import { ArchivoView } from "./ArchivoView";
import { FacturaTimeline } from "./FacturaTimeline";
import { FloorPlanView } from "./FloorPlanView";
import { InmueblePreviewModal } from "./InmueblePreviewModal";
import { InmueblesSelectorModal } from "./InmueblesSelectorModal";
import { InmuebleConfigModal } from "../inmuebles/InmuebleConfigModal";
import { InquilinosAssignModal } from "../inmuebles/InquilinosAssignModal";
import { useInmuebles } from "../../store/useInmuebles";
import { useHabitaciones } from "../../store/useHabitaciones";
import { useContratos } from "../../store/useContratos";
import { useFacturas } from "../../store/useFacturas";
import { useRepartos } from "../../store/useRepartos";
import { useInquilinos } from "../../store/useInquilinos";
import { generarInformePDF } from "../../lib/pdf-export";
import type { Inmueble, Factura, Habitacion, RepartoExtended, EstadoCobro } from "../../lib/types";

// ── Utilidades de periodo ─────────────────────────────────────────────────────

function addMonths(dateStr: string, n: number): string {
  const [y, m] = dateStr.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function periodoLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return `${meses[m - 1]} ${y}`;
}

function currentPeriodo(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ── Iconos de suministro ──────────────────────────────────────────────────────

const TIPO_ICON: Record<string, { icon: string; color: string }> = {
  luz:        { icon: "⚡", color: "var(--status-pending)" },
  agua:       { icon: "●", color: "var(--accent)" },
  gas:        { icon: "▲", color: "var(--status-excess)" },
  internet:   { icon: "◉", color: "var(--status-ok)" },
  comunidad:  { icon: "⬡", color: "var(--text-tertiary)" },
  otro:       { icon: "•", color: "var(--text-tertiary)" },
};

const ESTADO_LABELS: Record<EstadoCobro, string> = {
  pendiente:   "Pendiente",
  comunicado:  "Comunicado",
  cobrado:     "Cobrado",
  pagado:      "Pagado",
  incidencia:  "Incidencia",
};

const ESTADO_CYCLE: Record<EstadoCobro, EstadoCobro> = {
  pendiente:  "comunicado",
  comunicado: "cobrado",
  cobrado:    "pagado",
  pagado:     "pendiente",
  incidencia: "pendiente",
};

// ── Componente principal ──────────────────────────────────────────────────────

export const RepartoView: React.FC = () => {
  const { inmuebles, load: loadInm } = useInmuebles();
  const [periodo, setPeriodo] = useState(currentPeriodo());
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [contextMenu, setContextMenu] = useState<number | null>(null);
  const [modo, setModo] = useState<"actual" | "archivo" | "plano">("actual");
  const [selectedInmuebleId, setSelectedInmuebleId] = useState<number | null>(null);
  const [showInmuebleMenu, setShowInmuebleMenu] = useState(false);
  const [showInmueblePreview, setShowInmueblePreview] = useState(false);
  const [showInmuebleSelector, setShowInmuebleSelector] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showInquilinosAssignModal, setShowInquilinosAssignModal] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [showFacturaDetailsModal, setShowFacturaDetailsModal] = useState(false);
  const correoEditor = useCorreoEditor();

  // Datos para el modal de configuración
  const { byInmueble: habsByInm, load: loadHabs } = useHabitaciones();
  const { byHabitacion, loadForInmueble: loadContratos, create: createContrato } = useContratos();
  const { inquilinos, load: loadInquilinos } = useInquilinos();

  useEffect(() => { loadInm(); }, []);
  useEffect(() => {
    if (inmuebles.length > 0) {
      // Si no hay inmueble seleccionado, selecciona el primero
      if (selectedInmuebleId === null) {
        setSelectedInmuebleId(inmuebles[0].id);
        setExpandedIds(new Set([inmuebles[0].id]));
      } else if (expandedIds.size === 0) {
        setExpandedIds(new Set([selectedInmuebleId]));
      }
    }
  }, [inmuebles, selectedInmuebleId]);

  // Inmueble seleccionado (DECLARADO AQUI antes de usarlo en useEffect)
  const inmuebleSeleccionado = selectedInmuebleId ? (inmuebles.find((i) => i.id === selectedInmuebleId) ?? null) : null;

  // Cargar datos cuando se abre el modal de config
  useEffect(() => {
    if (showConfigModal && inmuebleSeleccionado) {
      loadHabs(inmuebleSeleccionado.id);
      loadContratos(inmuebleSeleccionado.id);
      loadInquilinos();
    }
  }, [showConfigModal, inmuebleSeleccionado]);

  // Cargar datos cuando se abre el modal de asignación de inquilinos
  useEffect(() => {
    if (showInquilinosAssignModal && inmuebleSeleccionado) {
      loadHabs(inmuebleSeleccionado.id);
      loadContratos(inmuebleSeleccionado.id);
      loadInquilinos();
    }
  }, [showInquilinosAssignModal, inmuebleSeleccionado]);

  // Habitaciones del inmueble seleccionado
  const habitacionesDelInmueble = inmuebleSeleccionado ? (habsByInm[inmuebleSeleccionado.id] ?? []).filter((h) => h.activa) : [];

  // Handler para asignar inquilino a habitación
  const handleAssignInquilino = async (habitacionId: number, inquilinoId: number) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      await createContrato({
        habitacion_id: habitacionId,
        inquilino_id: inquilinoId,
        fecha_inicio: today,
        suministros_incluidos: 0, // 0 = no incluye suministros extras
      });
      // Recargar contratos
      if (inmuebleSeleccionado) {
        await loadContratos(inmuebleSeleccionado.id);
      }
    } catch (e) {
      console.error("Error al asignar inquilino:", e);
    }
  };

  useEffect(() => {
    const close = () => {
      setContextMenu(null);
      setShowInmuebleMenu(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const toggleExpand = (id: number) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Modo de selección
  const modoSeleccion = selectedInmuebleId !== null && inmuebleSeleccionado;

  // KPIs desde datos cargados (filtrados por inmueble seleccionado si está en modo selección)
  const facturaState = useFacturas.getState();
  const repartoState = useRepartos.getState();

  const allFacturas = modoSeleccion && inmuebleSeleccionado
    ? (facturaState.byInmueble[inmuebleSeleccionado.id] ?? [])
    : Object.values(facturaState.byInmueble).flat();

  const allRepartos = modoSeleccion && inmuebleSeleccionado
    ? (repartoState.byInmueble[inmuebleSeleccionado.id] ?? [])
    : Object.values(repartoState.byInmueble).flat();

  const totalFacturado = allFacturas.reduce((s, f) => s + f.importe, 0);
  const totalExcesos = allRepartos.reduce((s, r) => s + r.exceso, 0);
  const totalCubierto = allRepartos.reduce((s, r) => s + r.tope_aplicado, 0);
  const sinVerificar = allFacturas.filter((f) => !f.verificada).length;
  const facturasPendientes = allRepartos.filter((r) => r.estado_cobro === "pendiente" || r.estado_cobro === "comunicado").length;
  const totalAbsorbidoPropiedad = totalFacturado - totalExcesos - totalCubierto;

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--bg-primary)" }}>

      {/* Archivo mode */}
      {modo === "archivo" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 24px 0", flexShrink: 0 }}>
            <button onClick={() => setModo("actual")} style={{ fontSize: "12px", color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
              ← Volver a Actual
            </button>
            <div style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.01em" }}>Archivo de facturas</div>
          </div>
          <ArchivoView />
        </>
      )}

      {/* Plano mode */}
      {modo === "plano" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 24px 0", flexShrink: 0 }}>
            <button onClick={() => setModo("actual")} style={{ fontSize: "12px", color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
              ← Volver a Tabla
            </button>
            <div style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.01em" }}>Plano del inmueble</div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <FloorPlanView inmuebleId={selectedInmuebleId ?? undefined} />
          </div>
        </>
      )}

      {modo === "actual" && (
      <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>

      {/* Header con selector de inmueble y periodo */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "24px" }}>
        {/* Selector de inmueble */}
        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInmuebleSelector(true);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowInmuebleMenu(!showInmuebleMenu);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 14px",
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              borderRadius: "2px",
              cursor: "pointer",
              transition: "all 0.15s",
              color: "var(--text-primary)",
              fontSize: "13px",
              fontFamily: "var(--font-heading)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
              (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
            }}
            onMouseLeave={(e) => {
              if (!showInmuebleMenu) {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
              }
            }}
          >
            {inmuebleSeleccionado ? (
              <>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "2px",
                    overflow: "hidden",
                    background: inmuebleSeleccionado.foto_url ? "transparent" : "#8B4A2E",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    position: "relative",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {inmuebleSeleccionado.foto_url ? (
                    <img
                      src={inmuebleSeleccionado.foto_url}
                      alt={inmuebleSeleccionado.nombre}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "white",
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                        fontFamily: "var(--font-heading)",
                      }}
                    >
                      {inmuebleSeleccionado.nombre
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left" }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {inmuebleSeleccionado.nombre}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
                    {inmuebleSeleccionado.direccion}
                  </div>
                </div>
                <span style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>▼</span>
              </>
            ) : (
              <span>Selecciona un inmueble</span>
            )}
          </button>

          {/* Panel de mini-tarjetas */}
          {showInmuebleMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "8px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                padding: "16px",
                zIndex: 1000,
                minWidth: "360px",
                maxWidth: "1000px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                overflowY: "auto",
                overflowX: "hidden",
                maxHeight: "400px",
              }}
            >
              {/* Botón "Ver todos" */}
              <button
                onClick={() => {
                  setSelectedInmuebleId(null);
                  setShowInmuebleMenu(false);
                  setExpandedIds(new Set(inmuebles.map((i) => i.id)));
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "10px 12px",
                  marginBottom: "12px",
                  background: selectedInmuebleId === null ? "var(--accent-subtle)" : "var(--bg-secondary)",
                  border: `1px solid ${selectedInmuebleId === null ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "2px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: selectedInmuebleId === null ? 600 : 500,
                  color: selectedInmuebleId === null ? "var(--accent)" : "var(--text-primary)",
                  fontFamily: "var(--font-heading)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (selectedInmuebleId !== null) {
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--text-tertiary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedInmuebleId !== null) {
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  }
                }}
              >
                <span style={{ fontSize: "14px" }}>👁</span>
                <span>Ver todos ({inmuebles.length})</span>
              </button>

              {/* Grid de mini-tarjetas */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: "12px",
                }}
              >
                {inmuebles.map((inm) => (
                  <button
                    key={inm.id}
                    onClick={() => {
                      setSelectedInmuebleId(inm.id);
                      setShowInmuebleMenu(false);
                      setExpandedIds(new Set([inm.id]));
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      padding: "12px",
                      background: selectedInmuebleId === inm.id ? "var(--accent-subtle)" : "var(--bg-secondary)",
                      border: `1px solid ${selectedInmuebleId === inm.id ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "2px",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      textAlign: "left",
                      alignItems: "flex-start",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedInmuebleId !== inm.id) {
                        (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)";
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedInmuebleId !== inm.id) {
                        (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      }
                    }}
                  >
                    {/* Foto */}
                    <div
                      style={{
                        width: "100%",
                        height: "80px",
                        borderRadius: "2px",
                        overflow: "hidden",
                        background: inm.foto_url ? "transparent" : "#8B4A2E",
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
                            fontSize: "28px",
                            fontWeight: 600,
                            color: "white",
                            textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                            fontFamily: "var(--font-heading)",
                          }}
                        >
                          {inm.nombre
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((p) => p[0])
                            .join("")
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Texto */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                      <div
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: selectedInmuebleId === inm.id ? "var(--accent)" : "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={inm.nombre}
                      >
                        {inm.nombre}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "9px",
                          color: "var(--text-tertiary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={inm.direccion}
                      >
                        {inm.direccion}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={{ width: "1px", height: "24px", background: "var(--border-subtle)" }} />

        {/* Selector de periodo - MEJORADO */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto" }}>
          {/* Toggle Actual / Plano / Archivo */}
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "2px", overflow: "hidden" }}>
            {(["actual", "plano", "archivo"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                style={{ padding: "4px 12px", fontSize: "12px", fontWeight: modo === m ? 600 : 400, color: modo === m ? "var(--bg-primary)" : "var(--text-secondary)", background: modo === m ? "var(--accent)" : "transparent", border: "none", cursor: "pointer", textTransform: "capitalize" }}
              >
                {m === "actual" ? "Tabla" : m === "plano" ? "Plano" : "Archivo"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Periodo Navigator - CENTERED & PROMINENT */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", marginBottom: "32px", padding: "32px 0 0 0" }}>
        {/* Month Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", justifyContent: "center" }}>
          {/* Previous Month */}
          <button
            onClick={() => setPeriodo((p) => addMonths(p, -1))}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.6";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
            }}
          >
            <span style={{ fontSize: "16px", color: "var(--text-tertiary)" }}>◀</span>
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
              {periodoLabel(addMonths(periodo, -1))}
            </span>
          </button>

          {/* Current Month - BIG & BOLD */}
          <div style={{ textAlign: "center", minWidth: "200px" }}>
            <div style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--accent)", marginBottom: "4px" }}>
              {periodoLabel(periodo)}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Período actual
            </div>
          </div>

          {/* Next Month */}
          <button
            onClick={() => setPeriodo((p) => addMonths(p, 1))}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.6";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
            }}
          >
            <span style={{ fontSize: "16px", color: "var(--text-tertiary)" }}>▶</span>
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
              {periodoLabel(addMonths(periodo, 1))}
            </span>
          </button>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            style={{ fontSize: "12px", fontWeight: 500, color: "var(--accent)", padding: "6px 16px", border: "1px solid var(--accent)", borderRadius: "2px", background: "transparent", cursor: "pointer" }}
            onClick={() => setPeriodo(currentPeriodo())}
          >
            📅 Mes actual
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1px", background: "var(--border)", marginBottom: "32px" }}>
        {[
          { label: "Total facturado", value: fmt(totalFacturado), sub: modoSeleccion ? `${inmuebleSeleccionado?.nombre}` : `${inmuebles.length} inmuebles` },
          {
            label: "Cubierto por contratos",
            value: totalCubierto > 0 ? fmt(totalCubierto) : "—",
            sub: totalCubierto > 0 ? "incluido en contrato" : "Calcula el reparto",
          },
          {
            label: "Excesos",
            value: totalExcesos > 0 ? fmt(totalExcesos) : "—",
            sub: totalExcesos > 0 ? "a reclamar a inquilinos" : "Sin excesos",
            excess: totalExcesos > 0,
          },
          {
            label: "Sin abonar",
            value: totalFacturado - totalExcesos > 0 ? fmt(totalFacturado - totalExcesos) : "—",
            sub: totalFacturado - totalExcesos > 0 ? "absorbe la propiedad" : "Sin gastos",
            warning: totalFacturado - totalExcesos > 0,
          },
          {
            label: "Facturas con pagos pendientes",
            value: facturasPendientes > 0 ? String(facturasPendientes) : "—",
            sub: facturasPendientes > 0 ? `${facturasPendientes === 1 ? "reparto" : "repartos"} sin cobrar` : "Todo cobrado",
            excess: facturasPendientes > 0,
            noEuro: true,
          },
          {
            label: "Cubierto por la propiedad",
            value: totalAbsorbidoPropiedad > 0 ? fmt(totalAbsorbidoPropiedad) : "—",
            sub: totalAbsorbidoPropiedad > 0 ? "vacantes + dentro de tope" : "Sin coste propio",
            warning: totalAbsorbidoPropiedad > 0,
          },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "var(--bg-primary)", padding: "20px 24px" }}>
            <div className="label-section" style={{ marginBottom: "8px" }}>{kpi.label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 500, letterSpacing: "-0.02em", color: kpi.excess ? "var(--status-excess)" : (kpi.warning ? "var(--text-secondary)" : "var(--text-primary)") }}>
              {kpi.value}{!kpi.noEuro && kpi.value !== "—" && <span style={{ fontSize: "16px", color: "var(--text-tertiary)" }}>€</span>}
            </div>
            <div style={{ fontSize: "12px", color: kpi.excess ? "var(--status-excess)" : (kpi.warning ? "var(--text-secondary)" : "var(--text-tertiary)"), marginTop: "4px" }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {sinVerificar > 0 && (
        <div style={{ padding: "12px 24px", background: "var(--status-pending-bg)", borderLeft: "3px solid var(--status-pending)", fontSize: "12px", color: "var(--status-pending)", marginBottom: "32px" }}>
          {sinVerificar} {sinVerificar === 1 ? "factura sin verificar" : "facturas sin verificar"} — verifica antes de calcular el reparto
        </div>
      )}

      {/* Estado vacío */}
      {inmuebles.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-tertiary)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
          No hay inmuebles configurados. Ve a Configuración para crear el primero.
        </div>
      )}

      {/* Panel Deuda Viva */}
      <DeudaVivaPanel />

      {/* Tarjetas de inmueble */}
      {(modoSeleccion && inmuebleSeleccionado
        ? [inmuebleSeleccionado]
        : inmuebles
      ).map((inm) => (
        <InmuebleCard
          key={inm.id}
          inmueble={inm}
          periodo={periodo}
          expanded={expandedIds.has(inm.id)}
          onToggle={() => toggleExpand(inm.id)}
          contextMenuOpen={contextMenu === inm.id}
          onContextMenu={(e) => {
            e.stopPropagation();
            setContextMenu(contextMenu === inm.id ? null : inm.id);
          }}
          onAbrirCorreoPropietario={correoEditor.abrirPropietario}
          onAbrirCorreoInquilino={correoEditor.abrirInquilino}
          onSelectFactura={(f) => {
            setSelectedFactura(f);
            setShowFacturaDetailsModal(true);
          }}
        />
      ))}

      {/* Modal editor de correo */}
      {correoEditor.config && (
        <CorreoEditorModal config={correoEditor.config} onClose={correoEditor.cerrar} />
      )}

      {/* Modal de vista previa del inmueble */}
      <InmueblePreviewModal
        open={showInmueblePreview}
        inmueble={inmuebleSeleccionado}
        onClose={() => setShowInmueblePreview(false)}
        onEdit={() => setShowConfigModal(true)}
      />

      {/* Modal de selector de inmuebles */}
      <InmueblesSelectorModal
        open={showInmuebleSelector}
        inmuebles={inmuebles}
        habitaciones={habsByInm}
        selectedInmuebleId={selectedInmuebleId}
        onSelect={(inmuebleId) => {
          setSelectedInmuebleId(inmuebleId);
          setExpandedIds(new Set([inmuebleId]));
        }}
        onClose={() => setShowInmuebleSelector(false)}
      />

      {/* Modal de configuración del inmueble */}
      {showConfigModal && inmuebleSeleccionado && (
        <InmuebleConfigModal
          open={showConfigModal}
          inmueble={inmuebleSeleccionado}
          inquilinos={inquilinos}
          habitaciones={habsByInm[inmuebleSeleccionado.id] ?? []}
          contratos={byHabitacion}
          onClose={() => setShowConfigModal(false)}
        />
      )}

      {/* Modal de asignación de inquilinos a habitaciones */}
      {showInquilinosAssignModal && inmuebleSeleccionado && (
        <InquilinosAssignModal
          open={showInquilinosAssignModal}
          habitaciones={habitacionesDelInmueble}
          contratos={byHabitacion}
          inquilinos={inquilinos}
          onClose={() => setShowInquilinosAssignModal(false)}
          onAssign={handleAssignInquilino}
          onAddInquilino={() => {
            // TODO: Abrir modal para agregar nuevo inquilino
          }}
        />
      )}

      {/* Modal detalles de factura */}
      <FacturaDetailsModal
        open={showFacturaDetailsModal}
        onClose={() => {
          setShowFacturaDetailsModal(false);
          setSelectedFactura(null);
        }}
        factura={selectedFactura}
        inmuebleId={selectedInmuebleId ?? undefined}
      />
      </div>
      )}
    </div>
  );
};

// ── InmuebleCard ──────────────────────────────────────────────────────────────

interface InmuebleCardProps {
  inmueble: Inmueble;
  periodo: string;
  expanded: boolean;
  onToggle: () => void;
  contextMenuOpen: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onAbrirCorreoPropietario: (nombre: string, dir: string, periodo: string, repartos: RepartoExtended[]) => void;
  onAbrirCorreoInquilino: (nombre: string, dir: string, periodo: string, repartos: RepartoExtended[], inqNombre: string, habNombre: string, email?: string) => void;
  onSelectFactura?: (factura: Factura) => void;
}

const InmuebleCard: React.FC<InmuebleCardProps> = ({
  inmueble, periodo, expanded, onToggle, contextMenuOpen, onContextMenu,
  onAbrirCorreoPropietario, onAbrirCorreoInquilino, onSelectFactura,
}) => {
  const { byInmueble: habsByInm, load: loadHabs } = useHabitaciones();
  const { byHabitacion, loadForInmueble: loadContratos } = useContratos();
  const { byInmueble: factsByInm, loadForInmueble: loadFacturas } = useFacturas();
  const { byInmueble: repartosByInm, loadForInmueble: loadRepartos,
          calcularYGuardar, calculating } = useRepartos();
  const [mostrarTendencias, setMostrarTendencias] = useState(false);
  const [mostrarFacturasModal, setMostrarFacturasModal] = useState(false);

  const load = useCallback(async () => {
    await Promise.all([
      loadHabs(inmueble.id),
      loadContratos(inmueble.id),
      loadFacturas(inmueble.id, periodo),
    ]);
    await loadRepartos(inmueble.id, periodo);
  }, [inmueble.id, periodo]);

  useEffect(() => {
    if (expanded) load();
  }, [expanded, load]);

  const facturas = factsByInm[inmueble.id] ?? [];
  const habitaciones = (habsByInm[inmueble.id] ?? []).filter((h) => h.activa);
  const repartos = repartosByInm[inmueble.id] ?? [];

  const handleCalcular = async () => {
    await calcularYGuardar(
      inmueble.id,
      periodo,
      facturas,
      habitaciones,
      byHabitacion,
      inmueble.suministros_imputables,
      inmueble.gastos_vacantes_los_paga_propiedad
    );
  };

  const tieneRepartos = repartos.length > 0;
  const totalInmueble = facturas.reduce((s, f) => s + f.importe, 0);
  const totalExcesos = repartos.reduce((s, r) => s + r.exceso, 0);

  const CTX_ITEMS: (string | null)[] = [
    "Recalcular reparto", null,
    "Generar correo propietario", "Generar correos inquilinos", "Ver correos enviados", null,
    "Exportar PDF liquidación", "Ver resumen anual",
  ];

  return (
    <div style={{ marginBottom: "24px", border: "1px solid var(--border)", background: "var(--bg-surface)", opacity: expanded ? 1 : 0.75 }}>
      {/* Header */}
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: expanded ? "1px solid var(--border-subtle)" : "none", cursor: "pointer" }}
      >
        <div>
          <div style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.01em" }}>{inmueble.nombre}</div>
          <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
            {inmueble.num_habitaciones} hab.
            {tieneRepartos && totalExcesos > 0 && (
              <span style={{ marginLeft: "8px", color: "var(--status-excess)", fontWeight: 500 }}>
                · {fmt(totalExcesos)}€ exceso
              </span>
            )}
          </div>
          {/* Botón Facturas */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMostrarFacturasModal(true);
            }}
            style={{
              marginTop: "8px",
              padding: "6px 12px",
              fontSize: "12px",
              fontFamily: "var(--font-heading)",
              fontWeight: 500,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              border: "1px solid var(--accent)",
              background: "var(--accent-subtle)",
              color: "var(--accent)",
              borderRadius: "2px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--accent)";
              (e.currentTarget as HTMLElement).style.color = "white";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)";
              (e.currentTarget as HTMLElement).style.color = "var(--accent)";
            }}
          >
            📋 Facturas ({facturas.length})
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {!expanded && <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Clic para expandir</span>}
          <div style={{ position: "relative" }} onClick={onContextMenu}>
            <button style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: "2px", cursor: "pointer", fontSize: "18px", color: "var(--text-tertiary)" }}>⋮</button>
            {contextMenuOpen && (
              <div style={{ position: "absolute", top: "36px", right: 0, background: "var(--bg-surface)", border: "1px solid var(--border)", minWidth: "220px", zIndex: 100, padding: "4px 0" }}>
                {CTX_ITEMS.map((item, i) =>
                  item === null ? (
                    <div key={i} style={{ height: "1px", background: "var(--border-subtle)", margin: "4px 0" }} />
                  ) : (
                    <div
                      key={i}
                      style={{ padding: "8px 16px", fontSize: "13px", cursor: "pointer", color: "var(--text-primary)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--hover-overlay)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item === "Recalcular reparto") {
                          handleCalcular();
                        } else if (item === "Generar correo propietario") {
                          onAbrirCorreoPropietario(inmueble.nombre, inmueble.direccion, periodo, repartos);
                        } else if (item === "Generar correos inquilinos") {
                          const conExceso = repartos.filter((r) => r.exceso > 0);
                          const primerInq = conExceso[0];
                          if (primerInq) {
                            onAbrirCorreoInquilino(
                              inmueble.nombre, inmueble.direccion, periodo, repartos,
                              primerInq.inquilino_nombre, primerInq.habitacion_nombre
                            );
                          }
                        } else if (item === "Exportar PDF liquidación") {
                          generarInformePDF({
                            inmueble_nombre: inmueble.nombre,
                            inmueble_direccion: inmueble.direccion,
                            periodo,
                            repartos,
                            total_facturado: facturas.reduce((s, f) => s + f.importe, 0),
                            total_cubierto: repartos.reduce((s, r) => s + r.tope_aplicado, 0),
                            total_excesos: repartos.reduce((s, r) => s + r.exceso, 0),
                          });
                        } else if (item === "Ver resumen anual") {
                          setMostrarTendencias(true);
                        }
                      }}
                    >{item}</div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cuerpo expandido */}
      {expanded && (
        <div style={{ padding: "0 24px 24px" }}>
          {/* Lista de facturas */}
          <div style={{ paddingTop: "16px", marginBottom: "20px" }}>
            <div className="label-section" style={{ marginBottom: "12px" }}>Facturas del periodo</div>

            {facturas.length === 0 ? (
              <div style={{ padding: "12px 0", fontSize: "13px", color: "var(--text-tertiary)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
                No hay facturas para este periodo. Importa la primera arrastrando un archivo.
              </div>
            ) : (
              facturas.map((f) => (
                <FacturaRow
                  key={f.id}
                  factura={f}
                  inmuebleId={inmueble.id}
                  onSelect={onSelectFactura}
                />
              ))
            )}

            <FacturaImport inmueble={inmueble} onSaved={() => loadFacturas(inmueble.id, periodo)} />
          </div>

          {/* Timeline de facturas */}
          {facturas.length > 0 && (
            <FacturaTimeline
              facturas={facturas}
              periodo={periodo}
            />
          )}

          {/* Tabla de reparto */}
          {habitaciones.length > 0 && facturas.length > 0 && (
            <RepartoTable
              inmuebleId={inmueble.id}
              habitaciones={habitaciones}
              facturas={facturas}
              repartos={repartos}
              onCalcular={handleCalcular}
              calculating={calculating}
              onCorreoInquilino={(inqNombre, habNombre) =>
                onAbrirCorreoInquilino(inmueble.nombre, inmueble.direccion, periodo, repartos, inqNombre, habNombre)
              }
              modeloReparto={inmueble.modelo_reparto}
            />
          )}

          {/* Footer */}
          {facturas.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "16px", marginTop: "16px", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Total inmueble: <strong style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>{fmt(totalInmueble)}€</strong>
                {totalExcesos > 0 && (
                  <span style={{ marginLeft: "16px", color: "var(--status-excess)" }}>
                    Excesos: <strong style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>{fmt(totalExcesos)}€</strong>
                  </span>
                )}
                {totalInmueble - totalExcesos > 0 && (
                  <span style={{ marginLeft: "16px", color: "var(--text-tertiary)" }}>
                    Sin abonar: <strong style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--text-secondary)" }}>{fmt(totalInmueble - totalExcesos)}€</strong>
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="secondary" onClick={() => onAbrirCorreoPropietario(inmueble.nombre, inmueble.direccion, periodo, repartos)}>
                  Informe propietario
                </Button>
                <Button variant="secondary" onClick={() => setMostrarTendencias(true)}>Ver tendencias</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal tendencias */}
      {mostrarTendencias && (
        <TendenciasModal inmueble={inmueble} onClose={() => setMostrarTendencias(false)} />
      )}

      {/* Modal lista de facturas */}
      <FacturasListModal
        open={mostrarFacturasModal}
        onClose={() => setMostrarFacturasModal(false)}
        inmueble={inmueble}
        facturas={facturas}
      />
    </div>
  );
};

// ── FacturaRow ────────────────────────────────────────────────────────────────

interface FacturaRowProps {
  factura: Factura;
  inmuebleId: number;
  onSelect?: (factura: Factura) => void;
}

const FacturaRow: React.FC<FacturaRowProps> = ({ factura, inmuebleId, onSelect }) => {
  const { setVerificada, remove } = useFacturas();
  const icon = TIPO_ICON[factura.tipo_suministro] ?? TIPO_ICON.otro;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr 140px 100px 110px 32px",
        alignItems: "center",
        gap: "12px",
        padding: "8px 0",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "13px",
        cursor: "pointer",
        borderRadius: "2px",
        transition: "background 0.1s",
      }}
      onClick={() => onSelect?.(factura)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--hover-overlay)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <span style={{ color: icon.color, textAlign: "center" }}>{icon.icon}</span>
      <div>
        <div style={{ fontWeight: 500, textTransform: "capitalize" }}>{factura.tipo_suministro}</div>
        {factura.comercializadora && <div style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>{factura.comercializadora}</div>}
      </div>
      <div style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{factura.periodo_inicio} – {factura.periodo_fin}</div>
      <div style={{ fontFamily: "var(--font-display)", textAlign: "right", fontWeight: 500 }}>{fmt(factura.importe)}€</div>
      <div
        style={{ cursor: "pointer" }}
        onClick={(e) => {
          e.stopPropagation();
          setVerificada(factura.id, inmuebleId, !factura.verificada);
        }}
        title={factura.verificada ? "Marcar como no verificada" : "Marcar como verificada"}
      >
        <StatusBadge variant={factura.verificada ? "ok" : "pending"} label={factura.verificada ? "Verificada" : "Revisar"} />
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          remove(factura.id, inmuebleId);
        }}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: "13px", borderRadius: "2px", width: "28px", height: "28px" }}
        title="Eliminar factura"
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--status-excess)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}
      >✕</button>
    </div>
  );
};

// ── RepartoTable ──────────────────────────────────────────────────────────────

interface RepartoTableProps {
  inmuebleId: number;
  habitaciones: Habitacion[];
  facturas: Factura[];
  repartos: RepartoExtended[];
  onCalcular: () => void;
  calculating: boolean;
  onCorreoInquilino: (inquilinoNombre: string, habitacionNombre: string) => void;
  modeloReparto?: "por_habitacion" | "por_tope_casa";
}

const RepartoTable: React.FC<RepartoTableProps> = ({
  inmuebleId, habitaciones, facturas, repartos, onCalcular, calculating, onCorreoInquilino, modeloReparto,
}) => {
  const { byHabitacion } = useContratos();
  const { setEstadoCobro } = useRepartos();

  // Habitaciones activas con contrato (o solo para tabla si hay repartos con propiedad)
  const activas = habitaciones.filter((h) => byHabitacion[h.id]);
  const tieneRepartos = repartos.length > 0;

  // Si no hay habitaciones activas pero hay repartos de propiedad, aún mostrar tabla
  if (activas.length === 0 && !tieneRepartos) return null;

  // Helper: build period breakdown text
  const buildPeriodBreakdown = (periodoInicio: string, periodoFin: string): string => {
    const [yi, mi, di] = periodoInicio.split("-").map(Number);
    const [yf, mf, df] = periodoFin.split("-").map(Number);

    if (yi === yf && mi === mf) {
      return `${di}/${mi}-${df}/${mf} (${df - di + 1} días)`;
    }

    const startDate = new Date(yi, mi - 1, di);
    const endDate = new Date(yf, mf - 1, df);
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return `${di}/${mi} a ${df}/${mf} (${totalDays} días)`;
  };

  // Helper: get tooltip explanation for a reparto cell
  const getCellTooltip = (r: RepartoExtended | undefined, f: Factura, h: Habitacion): string => {
    const periodBreakdown = buildPeriodBreakdown(f.periodo_inicio, f.periodo_fin);

    if (!r) {
      const contrato = byHabitacion[h.id];
      if (!contrato) {
        return `Vacante sin contrato\nHabitación: ${h.nombre}\nPeríodo: ${periodBreakdown}\nLa propiedad absorbe estos gastos`;
      }
      // Contract exists but room not in reparto (dates don't overlap)
      if (contrato.fecha_fin) {
        return `Habitación: ${h.nombre}\nNo ocupada en este período\nContrato: ${contrato.fecha_inicio} a ${contrato.fecha_fin}\nPeríodo factura: ${periodBreakdown}`;
      } else {
        return `Habitación: ${h.nombre}\nNo aplica al cálculo de esta factura\nPeríodo: ${periodBreakdown}`;
      }
    }
    return `Habitación: ${h.nombre}\n${fmt(r.importe_bruto)}€ × ${r.dias_en_periodo} días\n${periodBreakdown}`;
  };

  // Agrupar repartos por factura_id y por habitacion_id para lookup rápido
  const repartoMap: Record<number, Record<number, RepartoExtended>> = {};
  for (const r of repartos) {
    if (!repartoMap[r.factura_id]) repartoMap[r.factura_id] = {};
    repartoMap[r.factura_id][r.habitacion_id] = r;
  }

  // Totales por habitacion
  const totalesPorHab: Record<number, { bruto: number; tope: number; exceso: number; neto: number }> = {};
  for (const h of activas) {
    totalesPorHab[h.id] = { bruto: 0, tope: 0, exceso: 0, neto: 0 };
  }
  for (const r of repartos) {
    const t = totalesPorHab[r.habitacion_id];
    if (t) {
      t.bruto += r.importe_bruto;
      t.tope += r.tope_aplicado;
      t.exceso += r.exceso;
      t.neto += r.importe_neto;
    }
  }

  // Estado de cobro por habitación: el peor estado de todos sus repartos
  const estadoPorHab: Record<number, EstadoCobro> = {};
  for (const h of activas) {
    const rs = repartos.filter((r) => r.habitacion_id === h.id);
    if (rs.length === 0) { estadoPorHab[h.id] = "pendiente"; continue; }
    if (rs.some((r) => r.estado_cobro === "pendiente")) estadoPorHab[h.id] = "pendiente";
    else if (rs.some((r) => r.estado_cobro === "comunicado")) estadoPorHab[h.id] = "comunicado";
    else estadoPorHab[h.id] = "cobrado";
  }

  const cycleEstado = async (habId: number) => {
    const current = estadoPorHab[habId] ?? "pendiente";
    const next = ESTADO_CYCLE[current];
    const ids = repartos.filter((r) => r.habitacion_id === habId).map((r) => r.id);
    for (const id of ids) {
      await setEstadoCobro(id, inmuebleId, next);
    }
    // Recalcular reparto después de cambiar estado
    await onCalcular();
  };

  return (
    <>
      {/* Header de sección con botón calcular */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div className="label-section">Reparto del periodo</div>
        <Button variant={tieneRepartos ? "secondary" : "primary"} onClick={onCalcular} disabled={calculating}>
          {calculating ? "Calculando..." : tieneRepartos ? "Recalcular" : "Calcular reparto"}
        </Button>
      </div>

      {!tieneRepartos ? (
        <div style={{ padding: "16px 0", fontSize: "13px", color: "var(--text-tertiary)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
          Pulsa "Calcular reparto" para distribuir las facturas entre los inquilinos según días de ocupación y topes de contrato.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left", width: "120px" }}></th>
              {activas.map((h) => {
                const contrato = byHabitacion[h.id];
                return (
                  <th key={h.id} style={thStyle}>
                    <span style={{ display: "block", fontSize: "13px", fontWeight: 500, textTransform: "none", letterSpacing: "normal", color: "var(--text-primary)" }}>
                      {contrato?.inquilino_nombre ?? h.nombre}
                    </span>
                    <span style={{ display: "block", fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 400 }}>
                      {h.nombre}
                      {modeloReparto === "por_habitacion" && (
                        <> · tope {fmt(contrato?.suministros_incluidos ?? 0)}€</>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Filas por factura */}
            {facturas.map((f) => {
              const icon = TIPO_ICON[f.tipo_suministro] ?? TIPO_ICON.otro;
              return (
                <tr key={f.id}>
                  <td style={tdLabelStyle}>
                    <span style={{ color: icon.color, marginRight: "6px" }}>{icon.icon}</span>
                    <span style={{ textTransform: "capitalize" }}>{f.tipo_suministro}</span>
                    <span style={{ display: "block", fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>{fmt(f.importe)}€ total</span>
                  </td>
                  {activas.map((h) => {
                    const r = repartoMap[f.id]?.[h.id];
                    const tooltip = getCellTooltip(r, f, h);
                    return (
                      <td key={h.id} style={tdMonoStyle} title={tooltip}>
                        {r ? (
                          <>
                            <span>{fmt(r.importe_bruto)}€</span>
                            {r.dias_en_periodo < 30 && (
                              <span style={{ fontSize: "11px", color: "var(--text-tertiary)", marginLeft: "4px" }}>
                                ({r.dias_en_periodo}d)
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ color: "var(--text-tertiary)", cursor: "help", fontSize: "11px", fontStyle: "italic" }}>
                            {(() => {
                              const contrato = byHabitacion[h.id];
                              return !contrato ? "Vacante" : "N/A";
                            })()}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Fila total */}
            <tr>
              <td style={{ ...tdLabelStyle, borderTop: "2px solid var(--border-strong)", fontWeight: 600 }}>Total bruto</td>
              {activas.map((h) => (
                <td key={h.id} style={{ ...tdMonoStyle, borderTop: "2px solid var(--border-strong)", fontWeight: 600 }}>
                  {fmt(totalesPorHab[h.id]?.bruto ?? 0)}€
                </td>
              ))}
            </tr>

            {/* Fila tope — solo si modelo es "por_habitacion" */}
            {modeloReparto === "por_habitacion" && (
              <tr>
                <td style={{ ...tdLabelStyle, color: "var(--status-ok)", fontWeight: 500 }}>Tope contrato</td>
                {activas.map((h) => (
                  <td key={h.id} style={{ ...tdMonoStyle, color: "var(--status-ok)" }}>
                    -{fmt(totalesPorHab[h.id]?.tope ?? 0)}€
                  </td>
                ))}
              </tr>
            )}

            {/* Fila exceso */}
            <tr>
              <td style={{ ...tdLabelStyle, background: "var(--status-excess-bg)", color: "var(--status-excess)", fontWeight: 600, padding: "12px", borderBottom: "none" }}>
                Exceso
              </td>
              {activas.map((h) => {
                const exceso = totalesPorHab[h.id]?.exceso ?? 0;
                const bruto = totalesPorHab[h.id]?.bruto ?? 0;
                return (
                  <td key={h.id} style={{ ...tdMonoStyle, background: "var(--status-excess-bg)", color: exceso > 0 ? "var(--status-excess)" : "var(--text-tertiary)", fontWeight: exceso > 0 ? 600 : 400, fontSize: exceso > 0 ? "15px" : "13px", padding: "12px", borderBottom: "none" }}>
                    {exceso > 0 ? (
                      <>
                        {fmt(exceso)}€
                        <div style={{ height: "4px", background: "var(--status-excess)", opacity: 0.35, marginTop: "4px", borderRadius: "1px", width: `${Math.min(100, bruto > 0 ? (exceso / bruto) * 100 : 0)}%` }} />
                      </>
                    ) : (
                      <span style={{ fontSize: "11px", fontStyle: "italic" }}>Cubierto por tope</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Fila estado de cobro */}
            <tr>
              <td style={{ ...tdLabelStyle, color: "var(--text-tertiary)", fontSize: "12px", borderTop: "1px solid var(--border)", borderBottom: "none" }}>Estado cobro</td>
              {activas.map((h) => {
                const estado = estadoPorHab[h.id] ?? "pendiente";
                const exceso = totalesPorHab[h.id]?.exceso ?? 0;
                const r0 = repartos.find((r) => r.habitacion_id === h.id);

                // No hay repartos para esta habitación = no hay exceso que cobrar
                if (!r0 && exceso <= 0) {
                  return (
                    <td
                      key={h.id}
                      style={{ ...tdMonoStyle, borderTop: "1px solid var(--border)", borderBottom: "none", color: "var(--text-tertiary)", fontSize: "11px", fontStyle: "italic" }}
                      title="Propiedad cubre todos los gastos (sin exceso)"
                    >
                      (Propietario)
                    </td>
                  );
                }

                if (exceso <= 0) {
                  return (
                    <td
                      key={h.id}
                      style={{ ...tdMonoStyle, borderTop: "1px solid var(--border)", borderBottom: "none", color: "var(--text-tertiary)", fontSize: "11px", fontStyle: "italic" }}
                      title="No hay exceso a cobrar en este período"
                    >
                      N/A
                    </td>
                  );
                }

                const colorMap: Record<EstadoCobro, string> = {
                  pendiente:  "var(--status-excess)",
                  comunicado: "var(--status-pending)",
                  cobrado:    "var(--status-ok)",
                  pagado:     "#22c55e", // bright green for "fully paid"
                  incidencia: "var(--text-tertiary)",
                };
                return (
                  <td
                    key={h.id}
                    style={{ ...tdMonoStyle, borderTop: "1px solid var(--border)", borderBottom: "none" }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                      <span
                        style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: colorMap[estado], cursor: "pointer" }}
                        onClick={() => cycleEstado(h.id)}
                        title="Clic para cambiar estado"
                      >
                        <span style={{ fontSize: "8px" }}>●</span>
                        {ESTADO_LABELS[estado]}
                      </span>
                      {estado !== "cobrado" && estado !== "pagado" && r0 && (
                        <button
                          onClick={() => onCorreoInquilino(r0.inquilino_nombre, r0.habitacion_nombre)}
                          style={{ fontSize: "11px", color: "var(--accent)", background: "none", border: "1px solid var(--accent)", borderRadius: "2px", padding: "2px 8px", cursor: "pointer" }}
                        >
                          ✉ Correo
                        </button>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      )}
    </>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const thStyle: React.CSSProperties = {
  fontFamily: "var(--font-heading)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em",
  textTransform: "uppercase", color: "var(--text-tertiary)", padding: "10px 12px", textAlign: "right",
  background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)",
};

const tdLabelStyle: React.CSSProperties = {
  padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border-subtle)",
  fontFamily: "var(--font-heading)", fontWeight: 500, color: "var(--text-secondary)",
};

const tdMonoStyle: React.CSSProperties = {
  padding: "8px 12px", textAlign: "right", borderBottom: "1px solid var(--border-subtle)",
  fontFamily: "var(--font-display)",
};
