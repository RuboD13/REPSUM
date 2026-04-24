/**
 * DeudaDetalleModal — Modal completo de gestión de deuda viva por inquilino
 *
 * Muestra todos los repartos con exceso pendiente/comunicado de un inquilino,
 * permite cambiar estados, agregar pagos parciales, ver historial de correos
 * y navegar entre periodos.
 */

import React, { useEffect, useState, useCallback } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useRepartos } from "../../store/useRepartos";
import type { DeudaVivaSummary } from "../../store/useRepartos";
import type { RepartoExtended, PagoParcial, Correo, EstadoCobro } from "../../lib/types";

function fmt(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function periodoLabel(ym: string): string {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${meses[m - 1]} ${y}`;
}

function fechaLabel(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const ESTADO_COLOR: Record<EstadoCobro, string> = {
  pendiente:  "var(--status-excess)",
  comunicado: "var(--status-pending)",
  cobrado:    "var(--status-ok)",
  pagado:     "#22c55e",
  incidencia: "var(--text-tertiary)",
};

const ESTADO_LABEL: Record<EstadoCobro, string> = {
  pendiente:  "Pendiente",
  comunicado: "Comunicado",
  cobrado:    "Cobrado",
  pagado:     "Pagado",
  incidencia: "Incidencia",
};

const ESTADO_CYCLE: Record<EstadoCobro, EstadoCobro> = {
  pendiente:  "comunicado",
  comunicado: "cobrado",
  cobrado:    "pagado",
  pagado:     "pendiente",
  incidencia: "pendiente",
};

const TIPO_ICON: Record<string, string> = {
  luz: "⚡", agua: "●", gas: "▲", internet: "◉", comunidad: "⬡", otro: "•",
};

interface Props {
  deuda: DeudaVivaSummary;
  periodoActual: string; // YYYY-MM del período que el usuario está viendo
  onClose: () => void;
}

type TabDetalle = "repartos" | "pagos" | "historialPagos" | "correos";

export const DeudaDetalleModal: React.FC<Props> = ({ deuda, periodoActual, onClose }) => {
  const { loadRepartosDeudaInquilino, setEstadoCobro, addPagoParcial, loadPagosParciales, deletePagoParcial, updatePagoParcialConfirmado, loadCorreosDeuda } = useRepartos();

  const [repartos, setRepartos] = useState<RepartoExtended[]>([]);
  const [pagos, setPagos] = useState<PagoParcial[]>([]);
  const [correos, setCorreos] = useState<Correo[]>([]);
  const [tab, setTab] = useState<TabDetalle>("repartos");
  const [loading, setLoading] = useState(true);

  // Filter for pagos/historial tabs
  const [pagoFilter, setPagoFilter] = useState<"todos" | "confirmados" | "pendientes">("todos");

  // Filtro de período (para destacar el período actual)
  const [periodoFiltro, setPeriodoFiltro] = useState<string | null>(null);

  // Estado del formulario de pago parcial
  const [showPagoForm, setShowPagoForm] = useState<number | null>(null); // reparto_id
  const [pagoFecha, setPagoFecha] = useState(new Date().toISOString().split("T")[0]);
  const [pagoImporte, setPagoImporte] = useState("");
  const [pagoNotas, setPagoNotas] = useState("");
  const [savingPago, setSavingPago] = useState(false);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [reps, corrs] = await Promise.all([
        loadRepartosDeudaInquilino(deuda.inquilino_id, deuda.habitacion_id),
        loadCorreosDeuda(deuda.inquilino_nombre),
      ]);
      setRepartos(reps);
      setCorreos(corrs);
      if (reps.length > 0) {
        const ids = reps.map((r) => r.id);
        const pags = await loadPagosParciales(ids);
        setPagos(pags);
      }
    } finally {
      setLoading(false);
    }
  }, [deuda.inquilino_id, deuda.habitacion_id, deuda.inquilino_nombre]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Repartos filtrados por período si hay filtro activo
  const repartosFiltrados = periodoFiltro
    ? repartos.filter((r) => r.periodo_inicio.startsWith(periodoFiltro) || r.periodo_fin.startsWith(periodoFiltro))
    : repartos;

  // Periodos disponibles (únicos)
  const periodosDisponibles = [...new Set(repartos.map((r) => r.periodo_inicio.slice(0, 7)))].sort().reverse();

  const handleCambiarEstado = async (r: RepartoExtended, next: EstadoCobro) => {
    // inmueble_id no está en RepartoExtended directamente — lo obtenemos de deuda
    // Usamos -1 como placeholder ya que setEstadoCobro refresca deudaViva de todos modos
    await setEstadoCobro(r.id, -1, next);
    await cargarDatos();
  };

  const handleAddPago = async (repartoId: number) => {
    if (!pagoImporte || Number(pagoImporte) <= 0) return;
    setSavingPago(true);
    try {
      await addPagoParcial(repartoId, pagoFecha, Number(pagoImporte), pagoNotas || null);
      setPagoImporte("");
      setPagoNotas("");
      setShowPagoForm(null);
      await cargarDatos();
    } finally {
      setSavingPago(false);
    }
  };

  const handleDeletePago = async (pagoId: number) => {
    await deletePagoParcial(pagoId);
    await cargarDatos();
  };

  const handleTogglePagoConfirmado = async (pagoId: number, confirmado: boolean) => {
    await updatePagoParcialConfirmado(pagoId, !confirmado);
    // Update UI immediately without reloading all data
    setPagos((prev) =>
      prev.map((p) => (p.id === pagoId ? { ...p, confirmado: !confirmado } : p))
    );
  };

  const totalPagado = pagos.reduce((s, p) => s + p.importe, 0);
  const totalConfirmado = pagos.filter((p) => p.confirmado).reduce((s, p) => s + p.importe, 0);
  const totalPendiente = deuda.total_exceso - totalPagado;

  // Pagos filtrados por estado
  const pagosFiltrados =
    pagoFilter === "confirmados"
      ? pagos.filter((p) => p.confirmado)
      : pagoFilter === "pendientes"
        ? pagos.filter((p) => !p.confirmado)
        : pagos;

  return (
    <Modal open onClose={onClose} title="" width={900}>
      <div style={{ display: "flex", flexDirection: "column", maxHeight: "85vh", overflow: "hidden" }}>

        {/* Cabecera */}
        <div style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border)", marginBottom: "0" }}>
          <div style={{ fontSize: "11px", fontFamily: "var(--font-heading)", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "4px" }}>
            Deuda viva — {deuda.inmueble_nombre} · {deuda.habitacion_nombre}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <h2 style={{ fontFamily: "var(--font-body)", fontSize: "22px", fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.01em", color: "var(--text-primary)", margin: 0 }}>
              {deuda.inquilino_nombre}
              {deuda.inquilino_email && (
                <span style={{ fontSize: "13px", fontStyle: "normal", color: "var(--text-tertiary)", marginLeft: "12px", fontWeight: 400 }}>
                  {deuda.inquilino_email}
                </span>
              )}
            </h2>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 500, color: "var(--status-excess)" }}>
                {fmt(totalPendiente)}€
              </div>
              {totalPagado > 0 && (
                <div style={{ fontSize: "11px", color: "var(--status-ok)", marginTop: "2px" }}>
                  {fmt(totalPagado)}€ ya abonado
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg-primary)" }}>
          {([
            { id: "repartos", label: "Repartos pendientes", count: repartos.length },
            { id: "pagos", label: "Pagos parciales", count: pagos.length },
            { id: "historialPagos", label: "Historial de pagos", count: pagos.length },
            { id: "correos", label: "Historial correos", count: correos.length },
          ] as const).map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "12px 16px",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: tab === id ? "2px solid var(--accent)" : "2px solid transparent",
                color: tab === id ? "var(--text-primary)" : "var(--text-tertiary)",
                fontFamily: "var(--font-heading)", fontSize: "12px", fontWeight: tab === id ? 600 : 400,
                letterSpacing: "0.04em", transition: "all 0.18s ease",
              }}
            >
              {label}
              {count > 0 && (
                <span style={{
                  background: tab === id ? "var(--accent)" : "var(--border-strong)",
                  color: tab === id ? "white" : "var(--text-tertiary)",
                  fontSize: "10px", borderRadius: "10px", padding: "1px 6px", fontWeight: 600,
                }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Contenido */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
              Cargando...
            </div>
          ) : (

            <>
              {/* ── TAB: REPARTOS ── */}
              {tab === "repartos" && (
                <div>
                  {/* Filtro por período */}
                  <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)", fontFamily: "var(--font-heading)", letterSpacing: "0.1em" }}>
                      PERÍODO
                    </span>
                    <button
                      onClick={() => setPeriodoFiltro(null)}
                      style={{
                        padding: "3px 10px", fontSize: "11px", border: "1px solid var(--border)",
                        background: periodoFiltro === null ? "var(--accent)" : "transparent",
                        color: periodoFiltro === null ? "white" : "var(--text-secondary)",
                        cursor: "pointer", borderRadius: "2px", fontFamily: "var(--font-heading)",
                      }}
                    >
                      Todos
                    </button>
                    {periodosDisponibles.map((p) => {
                      const esCurrent = p === periodoActual;
                      const esActivo = periodoFiltro === p;
                      return (
                        <button
                          key={p}
                          onClick={() => setPeriodoFiltro(esActivo ? null : p)}
                          style={{
                            padding: "3px 10px", fontSize: "11px",
                            border: `1px solid ${esCurrent ? "var(--accent)" : "var(--border)"}`,
                            background: esActivo ? "var(--accent)" : esCurrent ? "var(--accent-subtle)" : "transparent",
                            color: esActivo ? "white" : esCurrent ? "var(--accent)" : "var(--text-secondary)",
                            cursor: "pointer", borderRadius: "2px", fontFamily: "var(--font-heading)",
                            fontWeight: esCurrent ? 600 : 400,
                          }}
                        >
                          {periodoLabel(p + "-01")}
                          {esCurrent && <span style={{ marginLeft: "4px", fontSize: "9px" }}>●</span>}
                        </button>
                      );
                    })}
                  </div>

                  {repartosFiltrados.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
                      Sin repartos pendientes en este período
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {repartosFiltrados.map((r) => {
                        const pagosDe = pagos.filter((p) => p.reparto_id === r.id);
                        const pagadoDe = pagosDe.reduce((s, p) => s + p.importe, 0);
                        const excesoPendiente = r.exceso - pagadoDe;
                        const esCurrent = r.periodo_inicio.startsWith(periodoActual) || r.periodo_fin.startsWith(periodoActual);
                        const nextEstado = ESTADO_CYCLE[r.estado_cobro];

                        return (
                          <div
                            key={r.id}
                            style={{
                              border: `1px solid ${esCurrent ? "var(--accent)" : "var(--border)"}`,
                              background: esCurrent ? "var(--accent-subtle)" : "var(--bg-surface)",
                              padding: "14px 16px",
                              borderRadius: "2px",
                            }}
                          >
                            {/* Header tarjeta */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "14px" }}>{TIPO_ICON[r.tipo_suministro] ?? "•"}</span>
                                  <span style={{ fontFamily: "var(--font-heading)", fontSize: "12px", fontWeight: 600, textTransform: "capitalize", letterSpacing: "0.05em" }}>
                                    {r.tipo_suministro}
                                  </span>
                                  {esCurrent && (
                                    <span style={{ fontSize: "10px", background: "var(--accent)", color: "white", padding: "1px 6px", borderRadius: "2px", fontFamily: "var(--font-heading)" }}>
                                      Período actual
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "3px" }}>
                                  {fechaLabel(r.periodo_inicio)} – {fechaLabel(r.periodo_fin)} · {r.dias_en_periodo} días
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600, color: "var(--status-excess)" }}>
                                  {fmt(excesoPendiente)}€
                                </div>
                                {pagadoDe > 0 && (
                                  <div style={{ fontSize: "11px", color: "var(--status-ok)" }}>
                                    {fmt(pagadoDe)}€ abonado
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Desglose */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px", fontSize: "11px", color: "var(--text-tertiary)" }}>
                              <div>Bruto: <strong style={{ color: "var(--text-primary)" }}>{fmt(r.importe_bruto)}€</strong></div>
                              <div>Tope: <strong style={{ color: "var(--status-ok)" }}>-{fmt(r.tope_aplicado)}€</strong></div>
                              <div>Exceso total: <strong style={{ color: "var(--status-excess)" }}>{fmt(r.exceso)}€</strong></div>
                            </div>

                            {/* Pagos parciales de este reparto */}
                            {pagosDe.length > 0 && (
                              <div style={{ marginBottom: "10px", paddingTop: "8px", borderTop: "1px solid var(--border-subtle)" }}>
                                {pagosDe.map((p) => (
                                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: "11px" }}>
                                    <span style={{ color: "var(--text-tertiary)" }}>
                                      {fechaLabel(p.fecha)} {p.notas && `· ${p.notas}`}
                                    </span>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <span style={{ color: "var(--status-ok)", fontWeight: 600 }}>+{fmt(p.importe)}€</span>
                                      <button
                                        onClick={() => handleDeletePago(p.id)}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: "12px", padding: "0 2px" }}
                                        title="Eliminar pago"
                                      >×</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Formulario pago parcial */}
                            {showPagoForm === r.id ? (
                              <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "10px", background: "var(--bg-secondary)", borderRadius: "2px", marginBottom: "8px" }}>
                                <input
                                  type="date"
                                  value={pagoFecha}
                                  onChange={(e) => setPagoFecha(e.target.value)}
                                  style={{ padding: "5px 8px", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "12px", fontFamily: "var(--font-body)" }}
                                />
                                <input
                                  type="number"
                                  placeholder="Importe €"
                                  value={pagoImporte}
                                  onChange={(e) => setPagoImporte(e.target.value)}
                                  style={{ width: "100px", padding: "5px 8px", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "12px", fontFamily: "var(--font-body)" }}
                                  min="0.01" step="0.01" max={excesoPendiente}
                                />
                                <input
                                  type="text"
                                  placeholder="Nota (opcional)"
                                  value={pagoNotas}
                                  onChange={(e) => setPagoNotas(e.target.value)}
                                  style={{ flex: 1, padding: "5px 8px", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "12px", fontFamily: "var(--font-body)" }}
                                />
                                <Button variant="primary" onClick={() => handleAddPago(r.id)} disabled={savingPago} style={{ fontSize: "11px", padding: "5px 12px" }}>
                                  Guardar
                                </Button>
                                <button onClick={() => setShowPagoForm(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: "14px" }}>×</button>
                              </div>
                            ) : null}

                            {/* Acciones */}
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <span
                                onClick={() => handleCambiarEstado(r, nextEstado)}
                                style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", color: ESTADO_COLOR[r.estado_cobro], cursor: "pointer", userSelect: "none" }}
                                title={`Cambiar a ${ESTADO_LABEL[nextEstado]}`}
                              >
                                <span style={{ fontSize: "7px" }}>●</span>
                                {ESTADO_LABEL[r.estado_cobro]}
                                <span style={{ color: "var(--text-tertiary)", fontSize: "10px" }}>→ {ESTADO_LABEL[nextEstado]}</span>
                              </span>
                              <div style={{ flex: 1 }} />
                              {excesoPendiente > 0 && showPagoForm !== r.id && (
                                <button
                                  onClick={() => { setShowPagoForm(r.id); setPagoImporte(""); setPagoNotas(""); }}
                                  style={{ fontSize: "11px", color: "var(--accent)", background: "none", border: "1px solid var(--accent)", borderRadius: "2px", padding: "3px 10px", cursor: "pointer" }}
                                >
                                  + Pago parcial
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: PAGOS PARCIALES ── */}
              {tab === "pagos" && (
                <div>
                  {pagos.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
                      No se han registrado pagos parciales
                    </div>
                  ) : (
                    <>
                      {/* Filter buttons */}
                      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", paddingTop: "12px" }}>
                        {(["todos", "confirmados", "pendientes"] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setPagoFilter(filter)}
                            style={{
                              padding: "6px 12px",
                              background: pagoFilter === filter ? "var(--accent)" : "var(--bg-secondary)",
                              color: pagoFilter === filter ? "white" : "var(--text-secondary)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: pagoFilter === filter ? 600 : 400,
                              transition: "all 0.18s ease",
                            }}
                          >
                            {filter === "todos" && "Todos"}
                            {filter === "confirmados" && `Confirmados (${pagos.filter((p) => p.confirmado).length})`}
                            {filter === "pendientes" && `Pendientes (${pagos.filter((p) => !p.confirmado).length})`}
                          </button>
                        ))}
                      </div>

                      {/* Summary */}
                      <div style={{ marginBottom: "16px", padding: "12px 16px", background: "var(--bg-secondary)", borderLeft: "3px solid var(--status-ok)", fontSize: "13px" }}>
                        <strong style={{ color: "var(--status-ok)" }}>{pagos.filter((p) => p.confirmado).length} de {pagos.length}</strong> pagos confirmados
                        <span style={{ marginLeft: "16px", color: "var(--text-tertiary)" }}>
                          Confirmado: <strong style={{ color: "var(--status-ok)" }}>{fmt(totalConfirmado)}€</strong>
                        </span>
                      </div>

                      {/* Payment list */}
                      {pagosFiltrados.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "20px", color: "var(--text-tertiary)", fontStyle: "italic", fontSize: "12px" }}>
                          No hay pagos {pagoFilter === "confirmados" ? "confirmados" : pagoFilter === "pendientes" ? "pendientes" : ""}
                        </div>
                      ) : (
                        <div style={{ border: "1px solid var(--border)", overflow: "hidden" }}>
                          {pagosFiltrados.map((p, i) => {
                            const reparto = repartos.find((r) => r.id === p.reparto_id);
                            return (
                              <div
                                key={p.id}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "32px 100px 1fr 100px 100px 32px",
                                  gap: "12px",
                                  alignItems: "center",
                                  padding: "10px 16px",
                                  borderBottom: i < pagosFiltrados.length - 1 ? "1px solid var(--border-subtle)" : "none",
                                  background: p.confirmado ? "rgba(34, 197, 94, 0.05)" : "transparent",
                                  transition: "background-color 0.18s ease",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={p.confirmado}
                                  onChange={() => handleTogglePagoConfirmado(p.id, p.confirmado)}
                                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                  title={p.confirmado ? "Marcar como pendiente" : "Confirmar pago"}
                                />
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{fechaLabel(p.fecha)}</div>
                                <div>
                                  <div style={{ fontSize: "12px" }}>{p.notas ?? "—"}</div>
                                  {reparto && (
                                    <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                                      {TIPO_ICON[reparto.tipo_suministro] || "•"} {reparto.tipo_suministro} · {fechaLabel(reparto.periodo_inicio)} – {fechaLabel(reparto.periodo_fin)}
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: "13px", fontWeight: 500, color: p.confirmado ? "var(--status-ok)" : "var(--text-secondary)" }}>
                                  {fmt(p.importe)}€
                                </div>
                                <div style={{ fontSize: "10px", color: "var(--text-tertiary)", textAlign: "right" }}>
                                  {p.confirmado ? (
                                    <span style={{ color: "var(--status-ok)", fontWeight: 500 }}>✓ Confirmado</span>
                                  ) : (
                                    <span>Pendiente</span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleDeletePago(p.id)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: "14px", textAlign: "center", padding: "0" }}
                                  title="Eliminar"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── TAB: HISTORIAL DE PAGOS (TIMELINE) ── */}
              {tab === "historialPagos" && (
                <div>
                  {pagos.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
                      No se han registrado pagos parciales
                    </div>
                  ) : (
                    <>
                      {/* Timeline */}
                      <div style={{ padding: "16px", position: "relative" }}>
                        {pagos
                          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                          .map((p, idx, sorted) => {
                            const reparto = repartos.find((r) => r.id === p.reparto_id);
                            const isLast = idx === sorted.length - 1;
                            return (
                              <div
                                key={p.id}
                                style={{
                                  display: "flex",
                                  gap: "16px",
                                  marginBottom: isLast ? "0" : "20px",
                                  position: "relative",
                                }}
                              >
                                {/* Timeline line */}
                                <div
                                  style={{
                                    position: "absolute",
                                    left: "11px",
                                    top: "32px",
                                    bottom: isLast ? "0" : "-20px",
                                    width: "2px",
                                    background: p.confirmado ? "var(--status-ok)" : "var(--border-strong)",
                                    zIndex: 0,
                                  }}
                                />

                                {/* Timeline marker circle */}
                                <div
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    background: p.confirmado ? "var(--status-ok)" : "var(--bg-secondary)",
                                    border: `2px solid ${p.confirmado ? "var(--status-ok)" : "var(--border-strong)"}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "12px",
                                    color: "white",
                                    fontWeight: 600,
                                    marginTop: "4px",
                                    zIndex: 1,
                                    flexShrink: 0,
                                  }}
                                >
                                  {p.confirmado ? "✓" : ""}
                                </div>

                                {/* Payment details card */}
                                <div
                                  style={{
                                    flex: 1,
                                    padding: "12px 16px",
                                    background: p.confirmado ? "rgba(34, 197, 94, 0.08)" : "var(--bg-secondary)",
                                    border: `1px solid ${p.confirmado ? "rgba(34, 197, 94, 0.2)" : "var(--border-subtle)"}`,
                                    borderRadius: "6px",
                                    transition: "all 0.18s ease",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                    <div>
                                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                                        {fechaLabel(p.fecha)}
                                      </div>
                                      {reparto && (
                                        <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                                          {TIPO_ICON[reparto.tipo_suministro] || "•"} {reparto.tipo_suministro}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: "16px", fontWeight: 600, color: p.confirmado ? "var(--status-ok)" : "var(--text-primary)" }}>
                                          {fmt(p.importe)}€
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "10px",
                                            fontWeight: 500,
                                            color: p.confirmado ? "var(--status-ok)" : "var(--text-secondary)",
                                            marginTop: "2px",
                                          }}
                                        >
                                          {p.confirmado ? "✓ Confirmado" : "⏳ Pendiente"}
                                        </div>
                                      </div>
                                      <input
                                        type="checkbox"
                                        checked={p.confirmado}
                                        onChange={() => handleTogglePagoConfirmado(p.id, p.confirmado)}
                                        style={{ cursor: "pointer", width: "18px", height: "18px", marginTop: "8px" }}
                                      />
                                    </div>
                                  </div>
                                  {p.notas && (
                                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border-subtle)" }}>
                                      {p.notas}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {/* Totals summary */}
                      <div
                        style={{
                          marginTop: "16px",
                          padding: "12px 16px",
                          background: "var(--bg-secondary)",
                          borderTop: "1px solid var(--border)",
                          fontSize: "12px",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "16px",
                        }}
                      >
                        <div>
                          <div style={{ color: "var(--text-tertiary)", marginBottom: "4px" }}>Total confirmado</div>
                          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--status-ok)" }}>
                            {fmt(totalConfirmado)}€
                          </div>
                        </div>
                        <div>
                          <div style={{ color: "var(--text-tertiary)", marginBottom: "4px" }}>Total pendiente confirmación</div>
                          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--status-excess)" }}>
                            {fmt(totalPagado - totalConfirmado)}€
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── TAB: HISTORIAL CORREOS ── */}
              {tab === "correos" && (
                <div>
                  {correos.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
                      No se han registrado comunicaciones con este inquilino
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {correos.map((c) => (
                        <div key={c.id} style={{ border: "1px solid var(--border)", padding: "14px 16px", background: "var(--bg-surface)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                            <div>
                              <div style={{ fontSize: "13px", fontWeight: 500 }}>{c.asunto}</div>
                              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                                {c.destinatario_tipo === "propietario" ? "Propietario" : "Inquilino"} · {fechaLabel(c.created_at?.slice(0, 10) ?? "")}
                                {c.plantilla_usada && <span style={{ marginLeft: "8px" }}>· Plantilla {c.plantilla_usada}</span>}
                              </div>
                            </div>
                            <span style={{ fontSize: "11px", color: c.enviado ? "var(--status-ok)" : "var(--text-tertiary)" }}>
                              {c.enviado ? "✓ Enviado" : "Borrador"}
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: "80px", overflow: "hidden", maskImage: "linear-gradient(to bottom, black 60%, transparent)" }}>
                            {c.cuerpo}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  );
};
