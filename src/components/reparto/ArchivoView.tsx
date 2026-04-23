/**
 * Modo Archivo — Fase 6
 * Histórico de todas las facturas y repartos con filtros y exportación CSV/PDF.
 */

import React, { useEffect, useState, useMemo } from "react";
import { useInmuebles } from "../../store/useInmuebles";
import { useFacturas } from "../../store/useFacturas";
import { useToast } from "../ui/Toast";
import { exportarCSV } from "../../lib/csv-export";
import { FacturaEditModal } from "../facturas/FacturaEditModal";
import { BulkOperationsBar } from "./BulkOperationsBar";
import type { Factura } from "../../lib/types";

function fmt(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TIPOS_SUMINISTRO = ["luz", "agua", "gas", "internet", "comunidad", "otro"];

const TIPO_ICON: Record<string, string> = {
  luz: "⚡", agua: "●", gas: "▲", internet: "◉", comunidad: "⬡", otro: "•",
};

export const ArchivoView: React.FC = () => {
  const { inmuebles, load: loadInm } = useInmuebles();
  const { byInmueble, loadForInmueble, remove: removeFactura, setVerificada } = useFacturas();
  const { showToast } = useToast();

  const [filtroInmueble, setFiltroInmueble] = useState<number | "todos">("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroPeriodoDesde, setFiltroPeriodoDesde] = useState("");
  const [filtroPeriodoHasta, setFiltroPeriodoHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargado, setCargado] = useState(false);
  const [editingFactura, setEditingFactura] = useState<Factura | null>(null);
  const [selectedFacturas, setSelectedFacturas] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadInm();
  }, []);

  // Cargar todas las facturas de todos los inmuebles (sin filtro de periodo)
  useEffect(() => {
    if (inmuebles.length > 0 && !cargado) {
      Promise.all(inmuebles.map((inm) => loadForInmueble(inm.id))).then(() => setCargado(true));
    }
  }, [inmuebles, cargado]);

  // Todas las facturas con nombre de inmueble adjunto
  const todasFacturas: (Factura & { inmueble_nombre: string })[] = useMemo(() => {
    const inmMap: Record<number, string> = {};
    for (const inm of inmuebles) inmMap[inm.id] = inm.nombre;
    return Object.entries(byInmueble).flatMap(([inmId, facturas]) =>
      (facturas as Factura[]).map((f) => ({
        ...f,
        inmueble_nombre: inmMap[Number(inmId)] ?? String(inmId),
      }))
    ).sort((a, b) => b.periodo_inicio.localeCompare(a.periodo_inicio));
  }, [byInmueble, inmuebles]);

  const filtradas = useMemo(() => {
    return todasFacturas.filter((f) => {
      if (filtroInmueble !== "todos" && f.inmueble_id !== filtroInmueble) return false;
      if (filtroTipo !== "todos" && f.tipo_suministro !== filtroTipo) return false;
      if (filtroPeriodoDesde && f.periodo_fin < filtroPeriodoDesde) return false;
      if (filtroPeriodoHasta && f.periodo_inicio > filtroPeriodoHasta) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        if (!f.tipo_suministro.includes(q) &&
            !f.comercializadora?.toLowerCase().includes(q) &&
            !f.inmueble_nombre.toLowerCase().includes(q) &&
            !String(f.importe).includes(q)) return false;
      }
      return true;
    });
  }, [todasFacturas, filtroInmueble, filtroTipo, filtroPeriodoDesde, filtroPeriodoHasta, busqueda]);

  const totalFiltrado = filtradas.reduce((s, f) => s + f.importe, 0);

  const handleExportCSV = () => {
    exportarCSV(
      ["Inmueble", "Tipo", "Comercializadora", "Periodo inicio", "Periodo fin", "Importe (€)", "Verificada"],
      filtradas.map((f) => [
        f.inmueble_nombre,
        f.tipo_suministro,
        f.comercializadora ?? "",
        f.periodo_inicio,
        f.periodo_fin,
        fmt(f.importe),
        f.verificada ? "Sí" : "No",
      ]),
      `repsum_facturas_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const handleSelectFactura = (facturaId: number) => {
    setSelectedFacturas((prev) => {
      const next = new Set(prev);
      if (next.has(facturaId)) {
        next.delete(facturaId);
      } else {
        next.add(facturaId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedFacturas.size === filtradas.length) {
      setSelectedFacturas(new Set());
    } else {
      setSelectedFacturas(new Set(filtradas.map((f) => f.id)));
    }
  };

  const handleMarkAsVerified = async (facturaIds: number[]) => {
    try {
      await Promise.all(
        facturaIds.map((id) => {
          const factura = filtradas.find((f) => f.id === id);
          if (factura) {
            return setVerificada(id, factura.inmueble_id, true);
          }
          return Promise.resolve();
        })
      );
      setSelectedFacturas(new Set());
      showToast(`${facturaIds.length} factura${facturaIds.length !== 1 ? "s" : ""} verificada${facturaIds.length !== 1 ? "s" : ""}`, "ok");
    } catch (e) {
      showToast("Error al marcar como verificadas", "pending");
    }
  };

  const handleMarkAsReview = async (facturaIds: number[]) => {
    try {
      await Promise.all(
        facturaIds.map((id) => {
          const factura = filtradas.find((f) => f.id === id);
          if (factura) {
            return setVerificada(id, factura.inmueble_id, false);
          }
          return Promise.resolve();
        })
      );
      setSelectedFacturas(new Set());
      showToast(`${facturaIds.length} factura${facturaIds.length !== 1 ? "s" : ""} marcada${facturaIds.length !== 1 ? "s" : ""} para revisar`, "ok");
    } catch (e) {
      showToast("Error al marcar como revisar", "pending");
    }
  };

  const handleDeleteFacturas = async (facturaIds: number[]) => {
    try {
      await Promise.all(
        facturaIds.map((id) => {
          const factura = filtradas.find((f) => f.id === id);
          if (factura) {
            return removeFactura(id, factura.inmueble_id);
          }
          return Promise.resolve();
        })
      );
      setSelectedFacturas(new Set());
      showToast(`${facturaIds.length} factura${facturaIds.length !== 1 ? "s" : ""} eliminada${facturaIds.length !== 1 ? "s" : ""}`, "ok");
    } catch (e) {
      showToast("Error al eliminar facturas", "pending");
    }
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "24px", background: "var(--bg-primary)" }}>
      {/* Filtros */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px", alignItems: "flex-end" }}>
        {/* Búsqueda */}
        <div style={{ flex: "1 1 200px" }}>
          <div className="label-section" style={{ marginBottom: "6px" }}>Buscar</div>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Suministro, comercializadora, inmueble..."
            style={{ width: "100%", padding: "7px 10px", fontSize: "13px", background: "var(--bg-secondary)", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text-primary)", boxSizing: "border-box" }}
          />
        </div>

        {/* Inmueble */}
        <div>
          <div className="label-section" style={{ marginBottom: "6px" }}>Inmueble</div>
          <select
            value={filtroInmueble}
            onChange={(e) => setFiltroInmueble(e.target.value === "todos" ? "todos" : Number(e.target.value))}
            style={{ padding: "7px 10px", fontSize: "13px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "2px" }}
          >
            <option value="todos">Todos los inmuebles</option>
            {inmuebles.map((inm) => (
              <option key={inm.id} value={inm.id}>{inm.nombre}</option>
            ))}
          </select>
        </div>

        {/* Tipo */}
        <div>
          <div className="label-section" style={{ marginBottom: "6px" }}>Tipo</div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            style={{ padding: "7px 10px", fontSize: "13px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "2px" }}
          >
            <option value="todos">Todos los tipos</option>
            {TIPOS_SUMINISTRO.map((t) => (
              <option key={t} value={t} style={{ textTransform: "capitalize" }}>{t}</option>
            ))}
          </select>
        </div>

        {/* Periodo desde */}
        <div>
          <div className="label-section" style={{ marginBottom: "6px" }}>Desde</div>
          <input
            type="month"
            value={filtroPeriodoDesde}
            onChange={(e) => setFiltroPeriodoDesde(e.target.value ? e.target.value + "-01" : "")}
            style={{ padding: "7px 10px", fontSize: "13px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "2px" }}
          />
        </div>

        {/* Periodo hasta */}
        <div>
          <div className="label-section" style={{ marginBottom: "6px" }}>Hasta</div>
          <input
            type="month"
            value={filtroPeriodoHasta}
            onChange={(e) => setFiltroPeriodoHasta(e.target.value ? e.target.value + "-31" : "")}
            style={{ padding: "7px 10px", fontSize: "13px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "2px" }}
          />
        </div>

        {/* Botones */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <button
            onClick={() => { setFiltroInmueble("todos"); setFiltroTipo("todos"); setFiltroPeriodoDesde(""); setFiltroPeriodoHasta(""); setBusqueda(""); }}
            style={{ padding: "7px 12px", fontSize: "12px", color: "var(--text-secondary)", background: "transparent", border: "1px solid var(--border)", borderRadius: "2px", cursor: "pointer" }}
          >
            Limpiar
          </button>
          <button
            onClick={handleExportCSV}
            style={{ padding: "7px 14px", fontSize: "12px", fontWeight: 500, color: "var(--accent)", background: "transparent", border: "1px solid var(--accent)", borderRadius: "2px", cursor: "pointer" }}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "16px", padding: "12px 16px", background: "var(--bg-secondary)", fontSize: "12px", color: "var(--text-tertiary)" }}>
        <span>{filtradas.length} facturas</span>
        <span style={{ color: "var(--border)" }}>|</span>
        <span>Total: <strong style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)", fontSize: "14px" }}>{fmt(totalFiltrado)}€</strong></span>
        <span style={{ color: "var(--border)" }}>|</span>
        <span>{filtradas.filter((f) => f.verificada).length} verificadas · {filtradas.filter((f) => !f.verificada).length} sin verificar</span>
      </div>

      {/* Tabla */}
      <div style={{ position: "relative", marginBottom: selectedFacturas.size > 0 ? "120px" : "0", transition: "margin-bottom 0.2s ease" }}>
        {!cargado ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-tertiary)", fontStyle: "italic", fontFamily: "var(--font-body)" }}>
            Cargando historial...
          </div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-tertiary)", fontStyle: "italic", fontFamily: "var(--font-body)" }}>
            No se encontraron facturas con los filtros aplicados.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "15px" }}>
            <thead>
              <tr>
                <th style={{ padding: "10px 12px", textAlign: "center", fontFamily: "var(--font-heading)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-tertiary)", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={selectedFacturas.size === filtradas.length && filtradas.length > 0}
                    onChange={handleSelectAll}
                    style={{ accentColor: "var(--accent)", cursor: "pointer", width: "16px", height: "16px" }}
                  />
                </th>
                {["Estado", "Inmueble", "Tipo", "Comercializadora", "Periodo", "Importe", ""].map((h) => (
                  <th key={h || "acciones"} style={{ padding: "10px 12px", textAlign: h === "Importe" ? "right" : "left", fontFamily: "var(--font-heading)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-tertiary)", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", width: h === "" ? "80px" : "auto" }}>
                    {h || "Acciones"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => {
                const isSelected = selectedFacturas.has(f.id);
                return (
                  <tr
                    key={f.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: isSelected ? "var(--accent-subtle)" : "transparent",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--hover-overlay)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectFactura(f.id)}
                        style={{ accentColor: "var(--accent)", cursor: "pointer", width: "16px", height: "16px" }}
                      />
                    </td>

                    {/* Estado (clickeable) */}
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        onClick={() => setVerificada(f.id, f.inmueble_id, !f.verificada)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: f.verificada ? "var(--status-ok)" : "var(--status-pending)",
                          cursor: "pointer",
                          padding: "4px 8px",
                          borderRadius: "2px",
                          transition: "all 0.15s ease",
                          border: "1px solid transparent",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = f.verificada ? "var(--status-ok-bg)" : "var(--status-pending-bg)";
                          (e.currentTarget as HTMLElement).style.border = `1px solid ${f.verificada ? "var(--status-ok)" : "var(--status-pending)"}`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                          (e.currentTarget as HTMLElement).style.border = "1px solid transparent";
                        }}
                        title="Click para cambiar estado"
                      >
                        {f.verificada ? "✓ Verificada" : "◉ Revisar"}
                      </span>
                    </td>

                    {/* Inmueble */}
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{f.inmueble_nombre}</td>

                    {/* Tipo */}
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ marginRight: "6px" }}>{TIPO_ICON[f.tipo_suministro] ?? "•"}</span>
                      <span style={{ textTransform: "capitalize" }}>{f.tipo_suministro}</span>
                    </td>

                    {/* Comercializadora */}
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{f.comercializadora ?? "—"}</td>

                    {/* Periodo */}
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)", fontFamily: "var(--font-display)", fontSize: "13px" }}>
                      {f.periodo_inicio} – {f.periodo_fin}
                    </td>

                    {/* Importe */}
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--font-display)", fontWeight: 500 }}>
                      {fmt(f.importe)}€
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <button
                        onClick={() => setEditingFactura(f)}
                        style={{
                          fontSize: "13px",
                          color: "var(--accent)",
                          background: "none",
                          border: "1px solid var(--accent)",
                          borderRadius: "2px",
                          padding: "5px 10px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "none";
                        }}
                        title="Editar periodo y importe"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ padding: "12px 12px", fontWeight: 600, fontSize: "14px", borderTop: "2px solid var(--border)" }}>Total ({filtradas.length} facturas)</td>
                <td colSpan={3} />
                <td style={{ padding: "12px 12px", textAlign: "right", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "16px", borderTop: "2px solid var(--border)" }}>{fmt(totalFiltrado)}€</td>
                <td style={{ borderTop: "2px solid var(--border)" }} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Bulk Operations Bar */}
      <BulkOperationsBar
        selectedFacturas={selectedFacturas}
        facturas={filtradas}
        onMarkAsVerified={handleMarkAsVerified}
        onMarkAsReview={handleMarkAsReview}
        onDelete={handleDeleteFacturas}
      />

      {/* Modal de edición */}
      <FacturaEditModal
        factura={editingFactura}
        open={editingFactura !== null}
        onClose={() => setEditingFactura(null)}
      />
    </div>
  );
};
