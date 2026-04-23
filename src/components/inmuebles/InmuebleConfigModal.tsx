import React, { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { ContratoEditModal } from "./ContratoEditModal";
import { HabitacionEditModal } from "./HabitacionEditModal";
import { RoomDiagram } from "./RoomDiagram";
import { useInmuebles } from "../../store/useInmuebles";
import { useCorreos } from "../../store/useCorreos";
import { useHabitaciones } from "../../store/useHabitaciones";
import { useContratos } from "../../store/useContratos";
import { useToast } from "../ui/Toast";
import type { Inmueble, Habitacion, Contrato, Inquilino } from "../../lib/types";

interface InmuebleConfigModalProps {
  open: boolean;
  inmueble: Inmueble | null;
  inquilinos: Inquilino[];
  habitaciones: Habitacion[];
  contratos: Record<number, Contrato | null>;
  onClose: () => void;
}

type Tab = "inmueble" | "habitaciones" | "inquilinos" | "historico";

const TAB_LABELS: Record<Tab, string> = {
  inmueble:     "Inmueble",
  habitaciones: "Habitaciones",
  inquilinos:   "Inquilinos",
  historico:    "Histórico",
};

const TAB_NUMERALS: Record<Tab, string> = {
  inmueble:     "I",
  habitaciones: "II",
  inquilinos:   "III",
  historico:    "IV",
};

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  inmueble:     "Información básica del inmueble, fotografía, modelo de reparto y suministros imputables.",
  habitaciones: "Resumen de habitaciones registradas y sus características de peso y superficie.",
  inquilinos:   "Gestión de inquilinos y contratos por habitación. Asigna inquilinos a espacios.",
  historico:    "Archivo de facturas y contratos históricos con duraciones y montos de tope.",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-heading)",
  fontSize: "14px",
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--text-tertiary)",
  marginBottom: "8px",
};

const inputBaseStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 0",
  border: "none",
  borderBottom: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-primary)",
  fontSize: "18px",
  fontFamily: "var(--font-body)",
  outline: "none",
  letterSpacing: "-0.01em",
};

const SUMINISTROS = ["luz", "agua", "gas", "internet", "comunidad"] as const;

const TIPO_COLOR: Record<string, string> = {
  luz:       "#B07D1A",
  agua:      "#4A6B7C",
  gas:       "#8B4A2E",
  internet:  "#567349",
  comunidad: "#6B6860",
};

export const InmuebleConfigModal: React.FC<InmuebleConfigModalProps> = ({
  open,
  inmueble,
  habitaciones,
  contratos,
  onClose,
}) => {
  const [tab, setTab] = useState<Tab>("inmueble");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [suministrosStr, setSuministrosStr] = useState(
    '["luz","agua","gas","internet","comunidad"]'
  );
  const [modeloReparto, setModeloReparto] = useState<"por_habitacion" | "por_tope_casa">(
    "por_habitacion"
  );
  const [topeGlobal, setTopeGlobal] = useState<number | string>("");
  const [gastosVacantesPaga, setGastosVacantesPaga] = useState<boolean>(true);
  const [habitacionesEditadas, setHabitacionesEditadas] = useState<
    Array<{
      id: number;
      nombre: string;
      criterio_reparto: number;
      superficie?: number | null;
    }>
  >([]);
  const [contratoEditando, setContratoEditando] = useState<{ habitacionId: number; contrato: Contrato } | null>(null);
  const [habitacionEditando, setHabitacionEditando] = useState<Habitacion | null>(null);

  const { update: updateInmueble } = useInmuebles();
  const { update: updateHabitacion } = useHabitaciones();
  const { update: updateContrato } = useContratos();
  const { correos, load: loadCorreos } = useCorreos();
  const { showToast } = useToast();

  useEffect(() => {
    if (inmueble && open) {
      setNombre(inmueble.nombre);
      setDireccion(inmueble.direccion);
      setNotas(inmueble.notas ?? "");
      setFotoUrl(inmueble.foto_url);
      setSuministrosStr(inmueble.suministros_imputables);
      setModeloReparto(inmueble.modelo_reparto);
      setTopeGlobal(inmueble.tope_global ?? "");
      setGastosVacantesPaga(inmueble.gastos_vacantes_los_paga_propiedad ?? true);
      // Cargar habitaciones para editar pesos
      setHabitacionesEditadas(
        habitaciones.map((h) => ({
          id: h.id,
          nombre: h.nombre,
          criterio_reparto: h.criterio_reparto,
          superficie: h.superficie,
        }))
      );
      loadCorreos();
    }
  }, [open, inmueble, habitaciones]);

  const handleSaveContrato = async (fechaInicio: string, fechaFin: string | null) => {
    if (!contratoEditando) return;
    try {
      await updateContrato(contratoEditando.contrato.id, {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      showToast("Contrato actualizado", "ok");
    } catch (e) {
      console.error("Error al guardar contrato:", e);
      showToast("Error al guardar contrato", "pending");
    }
  };

  const handleSaveHabitacion = async (
    nombre: string,
    criterio_reparto: number,
    superficie: number | null,
    descripcion: string | null
  ) => {
    if (!habitacionEditando) return;
    try {
      await updateHabitacion(habitacionEditando.id, {
        nombre,
        criterio_reparto,
        superficie,
        descripcion,
      });
      // Update local state
      setHabitacionesEditadas((prev) =>
        prev.map((h) =>
          h.id === habitacionEditando.id
            ? { ...h, nombre, criterio_reparto, superficie }
            : h
        )
      );
      showToast("Habitación actualizada", "ok");
    } catch (e) {
      console.error("Error al guardar habitación:", e);
      showToast("Error al guardar habitación", "pending");
    }
  };

  const handleGuardar = async () => {
    if (!inmueble) return;
    try {
      // Actualizar inmueble
      await updateInmueble(inmueble.id, {
        nombre,
        direccion,
        notas: notas || null,
        foto_url: fotoUrl,
        suministros_imputables: suministrosStr,
        modelo_reparto: modeloReparto,
        tope_global: modeloReparto === "por_tope_casa" ? (Number(topeGlobal) || 0) : null,
        gastos_vacantes_los_paga_propiedad: gastosVacantesPaga,
      });

      // Actualizar habitaciones si fueron editadas
      for (const hab of habitacionesEditadas) {
        const original = habitaciones.find((h) => h.id === hab.id);
        if (
          original &&
          (original.criterio_reparto !== hab.criterio_reparto ||
            original.superficie !== hab.superficie)
        ) {
          await updateHabitacion(hab.id, {
            criterio_reparto: hab.criterio_reparto,
            superficie: hab.superficie,
          });
        }
      }

      showToast("Cambios guardados correctamente", "ok");
      onClose();
    } catch (error) {
      showToast("Error al guardar cambios: " + String(error), "pending");
    }
  };

  if (!inmueble || !open) return null;

  const checkedSuministros = (() => {
    try { return JSON.parse(suministrosStr) as string[]; }
    catch { return [...SUMINISTROS]; }
  })();

  const toggleSuministro = (tipo: string) => {
    const arr = checkedSuministros.includes(tipo)
      ? checkedSuministros.filter((s) => s !== tipo)
      : [...checkedSuministros, tipo];
    setSuministrosStr(JSON.stringify(arr));
  };

  // Helper to get initials from name + number
  const getInitials = (name: string, index?: number): { text: string; bg: string } => {
    const parts = name.trim().split(/\s+/);
    const initials = parts
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
    const colors = ["#8B4A2E", "#567349", "#4A6B7C", "#B07D1A", "#6B6860"];
    const bgColor = colors[index ?? 0] ?? colors[0];
    return { text: initials, bg: bgColor };
  };

  // Filter correos for this inmueble
  const inmueblesCorreos = correos.filter(
    (c) => c.destinatario_nombre?.includes(inmueble?.nombre)
  );

  return (
    <Modal open={open} onClose={onClose} title="" width={1200}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
          overflow: "hidden",
        }}
      >
        {/* Modal header */}
        <header style={{ paddingBottom: "18px", borderBottom: "1px solid var(--border)", marginBottom: "0" }}>
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Configuración
          </span>
          <h2
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "24px",
              fontWeight: 500,
              fontStyle: "italic",
              letterSpacing: "-0.015em",
              color: "var(--text-primary)",
              lineHeight: 1.1,
            }}
          >
            {inmueble.nombre}
          </h2>
        </header>

        {/* Tab bar — editorial numeral tabs */}
        <nav
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-primary)",
          }}
        >
          {(["inmueble", "habitaciones", "inquilinos", "historico"] as const).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "8px",
                  padding: "14px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    color: active ? "var(--accent)" : "var(--text-tertiary)",
                  }}
                >
                  {TAB_NUMERALS[t]}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "13px",
                    fontWeight: active ? 600 : 400,
                    letterSpacing: "0.04em",
                  }}
                >
                  {TAB_LABELS[t]}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 24px" }}>

          {/* Contextual description */}
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "15px",
              fontStyle: "italic",
              color: "var(--text-secondary)",
              marginBottom: "18px",
              lineHeight: 1.6,
              padding: "0 0 12px 0",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            {TAB_DESCRIPTIONS[tab]}
          </div>

          {/* ── TAB: INMUEBLE ── */}
          {tab === "inmueble" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {/* Nombre + Dirección side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "20px" }}>
                <div>
                  <label style={labelStyle}>Nombre</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    style={inputBaseStyle}
                    placeholder="Ej: Piso Berlín 42"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Dirección</label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    style={inputBaseStyle}
                    placeholder="Calle, número, ciudad"
                  />
                </div>
              </div>

              {/* Foto */}
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Fotografía del inmueble</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: fotoUrl || true ? "100px 1fr" : "1fr",
                    gap: "16px",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "100px",
                      height: "80px",
                      border: "1px solid var(--border)",
                      overflow: "hidden",
                      background: fotoUrl ? "transparent" : getInitials(nombre).bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    {fotoUrl ? (
                      <img
                        src={fotoUrl}
                        alt="Vista previa"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "100%",
                          height: "100%",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "18px",
                            fontWeight: 600,
                            color: "white",
                            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                          }}
                        >
                          {getInitials(nombre).text}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "7px 14px",
                          border: "1px solid var(--border)",
                          fontFamily: "var(--font-heading)",
                          fontSize: "11px",
                          cursor: "pointer",
                          color: "var(--text-secondary)",
                          background: "var(--bg-surface)",
                          transition: "background 0.18s ease",
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.currentTarget.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                setFotoUrl(evt.target?.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        Subir foto desde archivo
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="o pegar URL de imagen…"
                      value={fotoUrl || ""}
                      onChange={(e) => setFotoUrl(e.target.value || null)}
                      style={{
                        ...inputBaseStyle,
                        fontFamily: "var(--font-display)",
                        fontSize: "11px",
                        color: "var(--text-tertiary)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Modelo de reparto */}
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Modelo de reparto</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1px",
                    background: "var(--border)",
                    border: "1px solid var(--border)",
                    marginTop: "10px",
                  }}
                >
                  {(["por_habitacion", "por_tope_casa"] as const).map((m) => {
                    const active = modeloReparto === m;
                    return (
                      <label
                        key={m}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "12px 12px",
                          background: active ? "var(--accent-subtle)" : "var(--bg-surface)",
                          cursor: "pointer",
                          transition: "background 0.18s ease",
                        }}
                      >
                        <input
                          type="radio"
                          name="modelo"
                          value={m}
                          checked={active}
                          onChange={() => setModeloReparto(m)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        <div>
                          <div
                            style={{
                              fontFamily: "var(--font-heading)",
                              fontSize: "11px",
                              fontWeight: active ? 600 : 400,
                              color: active ? "var(--accent)" : "var(--text-primary)",
                            }}
                          >
                            {m === "por_habitacion" ? "Por habitación" : "Tope por casa"}
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--font-body)",
                              fontSize: "10px",
                              fontStyle: "italic",
                              color: "var(--text-tertiary)",
                              marginTop: "2px",
                            }}
                          >
                            {m === "por_habitacion"
                              ? "Reparte según pesos"
                              : "Tope global"}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Configuración dinámica según modelo de reparto */}
              {modeloReparto === "por_tope_casa" && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={labelStyle}>Tope global del inmueble</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="number"
                      value={topeGlobal}
                      onChange={(e) => setTopeGlobal(e.target.value)}
                      placeholder="Ej: 500"
                      style={{
                        ...inputBaseStyle,
                        flex: 1,
                      }}
                    />
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "14px", color: "var(--text-primary)" }}>€</span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "11px",
                      color: "var(--text-tertiary)",
                      marginTop: "6px",
                      fontStyle: "italic",
                    }}
                  >
                    Cantidad máxima a imputar a inquilinos. El exceso será a cargo de la propiedad.
                  </div>
                </div>
              )}

              {modeloReparto === "por_habitacion" && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={labelStyle}>Pesos y configuración de habitaciones</label>
                  {habitacionesEditadas.length === 0 ? (
                    <div
                      style={{
                        padding: "16px",
                        textAlign: "center",
                        fontFamily: "var(--font-body)",
                        fontSize: "12px",
                        color: "var(--text-tertiary)",
                        background: "var(--bg-secondary)",
                        border: "1px dashed var(--border)",
                        marginTop: "8px",
                      }}
                    >
                      Sin habitaciones configuradas
                    </div>
                  ) : (
                    <div style={{ border: "1px solid var(--border)", overflow: "hidden", marginTop: "8px" }}>
                      {habitacionesEditadas.map((hab, idx) => {
                        const contratoInfo = contratos[hab.id];
                        return (
                          <div
                            key={hab.id}
                            style={{
                              padding: "12px",
                              borderBottom: idx < habitacionesEditadas.length - 1 ? "1px solid var(--border-subtle)" : "none",
                              background: idx % 2 === 0 ? "var(--bg-surface)" : "var(--bg-primary)",
                              display: "grid",
                              gridTemplateColumns: "1fr auto auto",
                              gap: "12px",
                              alignItems: "center",
                            }}
                          >
                            {/* Nombre y contrato */}
                            <div>
                              <div style={{ fontFamily: "var(--font-heading)", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)", textTransform: "uppercase" }}>
                                {hab.nombre}
                              </div>
                              {contratoInfo && (
                                <div style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "var(--text-tertiary)", marginTop: "3px" }}>
                                  {contratoInfo.inquilino_nombre} • {contratoInfo.fecha_inicio}
                                </div>
                              )}
                            </div>

                            {/* Campo de peso */}
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontFamily: "var(--font-heading)", fontSize: "9px", color: "var(--text-tertiary)" }}>Peso:</span>
                              <input
                                type="number"
                                value={hab.criterio_reparto}
                                onChange={(e) => {
                                  const newVal = Number(e.target.value) || 1;
                                  setHabitacionesEditadas((prev) =>
                                    prev.map((h) => (h.id === hab.id ? { ...h, criterio_reparto: newVal } : h))
                                  );
                                }}
                                style={{
                                  width: "50px",
                                  padding: "4px 6px",
                                  border: "1px solid var(--border)",
                                  background: "var(--bg-secondary)",
                                  fontSize: "12px",
                                  color: "var(--text-primary)",
                                  borderRadius: "2px",
                                }}
                                min="1"
                              />
                            </div>

                            {/* Campo de superficie */}
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontFamily: "var(--font-heading)", fontSize: "9px", color: "var(--text-tertiary)" }}>m²:</span>
                              <input
                                type="number"
                                value={hab.superficie ?? ""}
                                onChange={(e) => {
                                  const newVal = e.target.value ? Number(e.target.value) : null;
                                  setHabitacionesEditadas((prev) =>
                                    prev.map((h) => (h.id === hab.id ? { ...h, superficie: newVal } : h))
                                  );
                                }}
                                placeholder="—"
                                style={{
                                  width: "50px",
                                  padding: "4px 6px",
                                  border: "1px solid var(--border)",
                                  background: "var(--bg-secondary)",
                                  fontSize: "12px",
                                  color: "var(--text-primary)",
                                  borderRadius: "2px",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "11px",
                      color: "var(--text-tertiary)",
                      marginTop: "6px",
                      fontStyle: "italic",
                    }}
                  >
                    Los cambios en pesos y superficie se guardarán automáticamente.
                  </div>
                </div>
              )}

              {/* Suministros imputables */}
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Suministros imputables</label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginTop: "10px",
                  }}
                >
                  {SUMINISTROS.map((tipo) => {
                    const checked = checkedSuministros.includes(tipo);
                    const color = TIPO_COLOR[tipo];
                    return (
                      <label
                        key={tipo}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "7px",
                          padding: "6px 12px",
                          border: `1px solid ${checked ? color : "var(--border)"}`,
                          background: checked ? `${color}18` : "var(--bg-surface)",
                          cursor: "pointer",
                          transition: "all 0.18s ease",
                          fontFamily: "var(--font-heading)",
                          fontSize: "11px",
                          color: checked ? color : "var(--text-secondary)",
                          fontWeight: checked ? 600 : 400,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSuministro(tipo)}
                          style={{ display: "none" }}
                        />
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: checked ? color : "var(--border-strong)",
                            flexShrink: 0,
                          }}
                        />
                        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Gastos de habitaciones vacantes */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={gastosVacantesPaga}
                    onChange={(e) => setGastosVacantesPaga(e.target.checked)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "11px",
                        fontWeight: 600,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--text-primary)",
                      }}
                    >
                      La propiedad paga gastos de habitaciones vacantes
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "10px",
                        color: "var(--text-tertiary)",
                        marginTop: "4px",
                        fontStyle: "italic",
                      }}
                    >
                      Si está activado, los gastos de días sin inquilino se cargan a la propiedad, no a otros inquilinos.
                    </div>
                  </div>
                </label>
              </div>

              {/* Notas */}
              <div style={{ marginBottom: "0" }}>
                <label style={labelStyle}>Notas internas</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas sobre el inmueble, acuerdos especiales…"
                  style={{
                    ...inputBaseStyle,
                    minHeight: "60px",
                    padding: "8px 0",
                    resize: "none",
                    borderBottom: "1px solid var(--border)",
                    lineHeight: 1.6,
                  }}
                />
              </div>

              {/* Correos button */}
              <div style={{ marginTop: "20px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    // This would open correos list or compose modal
                    setTab("historico"); // As a placeholder, navigate to historico where correos list would be
                  }}
                  style={{ fontSize: "11px", padding: "6px 12px" }}
                >
                  ✉ Correos ({inmueblesCorreos.length})
                </Button>
              </div>
            </div>
          )}

          {/* ── TAB: HABITACIONES ── */}
          {tab === "habitaciones" && (
            <div>
              {habitaciones.length === 0 ? (
                <div
                  style={{
                    padding: "28px",
                    textAlign: "center",
                    fontFamily: "var(--font-body)",
                    fontStyle: "italic",
                    color: "var(--text-tertiary)",
                    border: "1px dashed var(--border)",
                  }}
                >
                  Sin habitaciones registradas
                </div>
              ) : (
                <>
                  {/* Visual room diagram */}
                  <div style={{ marginBottom: "32px", padding: "20px", background: "var(--bg-secondary)", borderRadius: "4px", border: "1px solid var(--border)" }}>
                    <RoomDiagram
                      habitaciones={habitaciones}
                      inmuebleNombre={inmueble.nombre}
                      byHabitacion={contratos}
                    />
                  </div>

                  {/* Room cards grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "16px",
                    }}
                  >
                  {habitaciones.map((hab) => {
                    const contratoInfo = contratos[hab.id];
                    return (
                      <div
                        key={hab.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                          padding: "18px",
                          border: "1px solid var(--border)",
                          background: hab.activa ? "var(--bg-surface)" : "var(--bg-secondary)",
                          borderRadius: "3px",
                          opacity: hab.activa ? 1 : 0.65,
                          transition: "all 0.2s ease",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        }}
                        onMouseEnter={(e) => {
                          if (hab.activa) {
                            (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)";
                          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                        }}
                      >
                        {/* Etiqueta habitación */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span
                            style={{
                              fontFamily: "var(--font-heading)",
                              fontSize: "11px",
                              fontWeight: 700,
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            {hab.nombre.split(/\s+/)[0]}
                          </span>
                          <span style={{ color: hab.activa ? "var(--status-ok)" : "var(--text-tertiary)", fontSize: "14px" }}>
                            {hab.activa ? "✓" : "○"}
                          </span>
                        </div>

                        {/* Nombre completo - GRANDE */}
                        <div
                          style={{
                            fontFamily: "var(--font-body)",
                            fontSize: "18px",
                            fontWeight: 500,
                            color: hab.activa ? "var(--text-primary)" : "var(--text-tertiary)",
                            textDecoration: hab.activa ? "none" : "line-through",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: 1.2,
                          }}
                          title={hab.nombre}
                        >
                          {hab.nombre}
                        </div>

                        {/* Información inquilino si existe */}
                        {contratoInfo && (
                          <div style={{ paddingBottom: "4px", borderBottom: "1px solid var(--border-subtle)" }}>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                              {contratoInfo.inquilino_nombre}
                            </div>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                              desde {contratoInfo.fecha_inicio}
                            </div>
                          </div>
                        )}

                        {/* Métricas */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {/* Superficie */}
                          {hab.superficie && (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "var(--text-secondary)" }}>
                              <span>📐</span>
                              <span style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>{hab.superficie}m²</span>
                            </div>
                          )}

                          {/* Peso - destacado */}
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "15px", fontWeight: 600, color: "var(--accent)" }}>
                            <span>⚖️</span>
                            <span style={{ fontFamily: "var(--font-display)" }}>{hab.criterio_reparto}</span>
                          </div>
                        </div>

                        {/* Botón Editar */}
                        <Button
                          variant="secondary"
                          style={{ fontSize: "14px", padding: "10px", width: "100%", marginTop: "auto" }}
                          onClick={() => setHabitacionEditando(hab)}
                        >
                          Editar
                        </Button>
                      </div>
                    );
                  })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB: INQUILINOS ── */}
          {tab === "inquilinos" && (
            <div>
              {habitaciones.length === 0 ? (
                <div style={{ padding: "28px", textAlign: "center", fontFamily: "var(--font-body)", fontStyle: "italic", color: "var(--text-tertiary)", border: "1px dashed var(--border)" }}>
                  Sin habitaciones asignadas
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "18px",
                  }}
                >
                  {habitaciones.map((hab, idx) => {
                    const contrato = contratos[hab.id];

                    return (
                      <div
                        key={hab.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "16px",
                          padding: "20px",
                          border: "1px solid var(--border)",
                          background: contrato ? "var(--bg-surface)" : "var(--bg-secondary)",
                          borderRadius: "2px",
                        }}
                      >
                        {/* Label habitación */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                            HAB. {idx + 1}
                          </div>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "9px", color: "var(--text-tertiary)" }}>
                            {hab.superficie ? `${hab.superficie}m²` : "—"}
                          </div>
                        </div>

                        {contrato ? (
                          <>
                            {/* Nombre inquilino - GRANDE */}
                            <div style={{ fontFamily: "var(--font-body)", fontSize: "16px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.3 }}>
                              {contrato.inquilino_nombre}
                            </div>

                            {/* Email */}
                            {contrato.inquilino_email && (
                              <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={contrato.inquilino_email}>
                                {contrato.inquilino_email}
                              </div>
                            )}

                            {/* Fechas */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-secondary)" }}>
                                <strong>desde</strong> {contrato.fecha_inicio}
                              </div>
                              <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-secondary)" }}>
                                <strong>hasta</strong> {contrato.fecha_fin ? contrato.fecha_fin : "vigente"}
                              </div>
                            </div>

                            {/* Suministros */}
                            {modeloReparto === "por_habitacion" && (
                              <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                                tope {contrato.suministros_incluidos}€
                              </div>
                            )}

                            {/* Botón Editar */}
                            <Button
                              variant="secondary"
                              style={{ fontSize: "12px", padding: "10px", width: "100%", marginTop: "8px" }}
                              onClick={() => {
                                setContratoEditando({ habitacionId: hab.id, contrato });
                              }}
                            >
                              Editar
                            </Button>
                          </>
                        ) : (
                          <>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontStyle: "italic", color: "var(--text-tertiary)", textAlign: "center", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              📭 Vacante
                            </div>
                            <Button
                              variant="secondary"
                              style={{ fontSize: "12px", padding: "10px", width: "100%" }}
                              onClick={() => {
                                // Abrir modal de asignación
                              }}
                            >
                              + Asignar inquilino
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: HISTÓRICO ── */}
          {tab === "historico" && (
            <div>
              {/* Facturas */}
              <div style={{ marginBottom: "18px" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "10px" }}>
                  Facturas almacenadas
                </div>
                <div style={{ border: "1px solid var(--border)", overflow: "hidden" }}>
                  <div style={{ padding: "20px", textAlign: "center", fontFamily: "var(--font-body)", fontStyle: "italic", color: "var(--text-tertiary)", fontSize: "12px" }}>
                    Sin facturas registradas
                  </div>
                </div>
              </div>

              {/* Correos */}
              <div style={{ marginBottom: "18px" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "10px" }}>
                  Correos guardados
                </div>
                {inmueblesCorreos.length === 0 ? (
                  <div style={{ border: "1px solid var(--border)", overflow: "hidden" }}>
                    <div style={{ padding: "20px", textAlign: "center", fontFamily: "var(--font-body)", fontStyle: "italic", color: "var(--text-tertiary)", fontSize: "12px" }}>
                      Sin correos guardados
                    </div>
                  </div>
                ) : (
                  <div style={{ border: "1px solid var(--border)", overflow: "hidden" }}>
                    {inmueblesCorreos.map((c, idx) => {
                      const fecha = c.created_at
                        ? new Date(c.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
                        : "";
                      return (
                        <div
                          key={c.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "auto 1fr auto",
                            gap: "10px",
                            alignItems: "center",
                            padding: "9px 12px",
                            borderBottom: idx < inmueblesCorreos.length - 1 ? "1px solid var(--border-subtle)" : "none",
                            background: idx % 2 === 0 ? "var(--bg-surface)" : "var(--bg-primary)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "8px",
                              fontWeight: 600,
                              color: c.destinatario_tipo === "propietario" ? "var(--accent)" : "var(--text-tertiary)",
                              background: c.destinatario_tipo === "propietario" ? "var(--accent-subtle)" : "transparent",
                              padding: "2px 6px",
                              borderRadius: "1px",
                              textTransform: "uppercase",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {c.destinatario_tipo === "propietario" ? "P" : "I"}
                          </span>
                          <div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {c.asunto}
                            </div>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: "9px", color: "var(--text-tertiary)" }}>
                              {fecha} • {c.plantilla_usada}
                            </div>
                          </div>
                          <span style={{ fontSize: "9px", color: c.enviado ? "var(--status-ok)" : "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                            {c.enviado ? "✓" : "○"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Contratos históricos */}
              <div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "10px" }}>
                  Contratos históricos
                </div>
                <div style={{ border: "1px solid var(--border)", overflow: "hidden" }}>
                  {habitaciones.map((hab, idx) => {
                    const contrato = contratos[hab.id];
                    if (!contrato) return null;
                    const start = new Date(contrato.fecha_inicio);
                    const end = contrato.fecha_fin ? new Date(contrato.fecha_fin) : null;
                    const days = end ? Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : null;
                    const months = days ? Math.floor(days / 30) : "—";
                    return (
                      <div
                        key={hab.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr auto",
                          gap: "12px",
                          alignItems: "center",
                          padding: "10px 12px",
                          borderBottom: idx < habitaciones.length - 1 ? "1px solid var(--border-subtle)" : "none",
                          background: idx % 2 === 0 ? "var(--bg-surface)" : "var(--bg-primary)",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: "9px", fontWeight: 600, color: "var(--text-secondary)" }}>
                          {hab.nombre}
                        </span>
                        <div>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                            {contrato.inquilino_nombre}
                          </div>
                          <div style={{ fontFamily: "var(--font-display)", fontSize: "9px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                            {contrato.fecha_inicio} → {contrato.fecha_fin ?? "vigente"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "var(--font-display)", fontSize: "10px", color: "var(--text-primary)", fontWeight: 500 }}>
                            {months}m
                          </div>
                          {modeloReparto === "por_habitacion" && (
                            <div style={{ fontFamily: "var(--font-display)", fontSize: "9px", color: "var(--text-secondary)" }}>
                              {contrato.suministros_incluidos}€
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {habitaciones.every((h) => !contratos[h.id]) && (
                    <div style={{ padding: "20px", textAlign: "center", fontFamily: "var(--font-body)", fontStyle: "italic", color: "var(--text-tertiary)", fontSize: "12px" }}>
                      Sin contratos
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
            paddingTop: "14px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGuardar}>
            Guardar cambios
          </Button>
        </footer>

        {/* Modal de edición de contrato */}
        {contratoEditando && (
          <ContratoEditModal
            open={true}
            contrato={contratoEditando.contrato}
            habitacion={habitaciones.find((h) => h.id === contratoEditando.habitacionId) ?? null}
            onClose={() => setContratoEditando(null)}
            onSave={handleSaveContrato}
          />
        )}

        {/* Modal de edición de habitación */}
        {habitacionEditando && (
          <HabitacionEditModal
            open={true}
            habitacion={habitacionEditando}
            onClose={() => setHabitacionEditando(null)}
            onSave={handleSaveHabitacion}
          />
        )}
      </div>
    </Modal>
  );
};
