import React, { useState } from "react";
import { Button } from "../ui/Button";
import type { Habitacion, Contrato } from "../../lib/types";

interface InmuebleCardProps {
  nombre: string;
  direccion: string;
  foto_url: string | null;
  fotoUrl?: string;
  habitaciones: Habitacion[];
  byHabitacion: Record<number, Contrato | null>;
  modeloReparto?: "por_habitacion" | "por_tope_casa";
  onConfiguracion: () => void;
  onEliminar: () => void;
  onAsignarInquilino: (hab: Habitacion) => void;
  onEditarContrato: (hab: Habitacion, contrato: Contrato, modeloReparto?: "por_habitacion" | "por_tope_casa") => void;
}

export const InmuebleCard: React.FC<InmuebleCardProps> = ({
  nombre,
  direccion: dir,
  foto_url,
  fotoUrl,
  habitaciones,
  byHabitacion,
  modeloReparto,
  onConfiguracion,
  onEliminar,
  onAsignarInquilino,
  onEditarContrato,
}) => {
  const [expandido, setExpandido] = useState(false);
  const [headerHover, setHeaderHover] = useState(false);
  const activas = habitaciones.filter((h) => h.activa);
  const imagePath = foto_url || fotoUrl;

  const numVacantes = activas.filter((h) => !byHabitacion[h.id]).length;
  const numOcupadas = activas.length - numVacantes;

  return (
    <article
      style={{
        border: "1px solid var(--border)",
        background: "var(--bg-surface)",
        marginBottom: "20px",
        borderRadius: "2px",
        overflow: "hidden",
        transition: "border-color 0.2s ease, transform 0.2s ease",
        borderColor: expandido ? "var(--border-strong)" : "var(--border)",
      }}
    >
      {/* HEADER — Editorial masthead */}
      <div
        onClick={() => setExpandido(!expandido)}
        onMouseEnter={() => setHeaderHover(true)}
        onMouseLeave={() => setHeaderHover(false)}
        style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr auto",
          gap: "16px",
          padding: "12px 16px",
          cursor: "pointer",
          userSelect: "none",
          background: headerHover ? "var(--hover-overlay)" : "transparent",
          transition: "background 0.18s ease",
          alignItems: "center",
        }}
      >
        {/* Photo — square portrait frame */}
        <div
          style={{
            width: "80px",
            height: "80px",
            position: "relative",
            background: "var(--bg-inset)",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          {imagePath ? (
            <img
              src={imagePath}
              alt={nombre}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: headerHover ? "none" : "saturate(0.88)",
                transition: "filter 0.3s ease",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-body)",
                fontStyle: "italic",
                fontSize: "11px",
                color: "var(--text-tertiary)",
                letterSpacing: "0.04em",
              }}
            >
              sin foto
            </div>
          )}
          {/* Corner numeral */}
          <div
            style={{
              position: "absolute",
              top: "6px",
              left: "6px",
              fontFamily: "var(--font-display)",
              fontSize: "9px",
              color: imagePath ? "rgba(255,255,255,0.9)" : "var(--text-tertiary)",
              letterSpacing: "0.08em",
              mixBlendMode: imagePath ? "normal" : "normal",
              textShadow: imagePath ? "0 1px 2px rgba(0,0,0,0.4)" : "none",
            }}
          >
            №
          </div>
        </div>

        {/* Title block */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "8px",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: "3px",
            }}
          >
            Inmueble
          </div>
          <h2
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "18px",
              fontWeight: 500,
              letterSpacing: "-0.015em",
              lineHeight: 1.1,
              color: "var(--text-primary)",
              marginBottom: "4px",
            }}
          >
            {nombre}
          </h2>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "11px",
              fontStyle: "italic",
              color: "var(--text-secondary)",
              marginBottom: "6px",
            }}
          >
            {dir}
          </div>
          {/* Stats row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--font-display)",
              fontSize: "9px",
              color: "var(--text-tertiary)",
              letterSpacing: "0.04em",
            }}
          >
            <span>
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                {activas.length.toString().padStart(2, "0")}
              </span>{" "}
              hab.
            </span>
            <span style={{ color: "var(--border-strong)" }}>│</span>
            <span>
              <span style={{ color: "var(--status-ok)", fontWeight: 500 }}>
                {numOcupadas.toString().padStart(2, "0")}
              </span>{" "}
              ocupadas
            </span>
            {numVacantes > 0 && (
              <>
                <span style={{ color: "var(--border-strong)" }}>│</span>
                <span>
                  <span style={{ color: "var(--status-pending)", fontWeight: 500 }}>
                    {numVacantes.toString().padStart(2, "0")}
                  </span>{" "}
                  vacantes
                </span>
              </>
            )}
            <span style={{ color: "var(--border-strong)" }}>│</span>
            <span style={{ color: "var(--accent)", fontWeight: 500 }}>
              {modeloReparto === "por_tope_casa" ? "tope global" : "tope/hab"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "6px",
          }}
        >
          <div style={{ display: "flex", gap: "4px" }}>
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onConfiguracion();
              }}
              style={{ fontSize: "10px", padding: "4px 8px" }}
            >
              Config
            </Button>
            <Button
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onEliminar();
              }}
              style={{ fontSize: "10px", padding: "4px 6px" }}
            >
              ×
            </Button>
          </div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "8px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "color 0.2s ease",
              color: headerHover ? "var(--accent)" : "var(--text-tertiary)",
            }}
          >
            {expandido ? "✕" : "▾"}
            <span
              style={{
                display: "inline-block",
                transition: "transform 0.25s ease",
                transform: expandido ? "rotate(0deg)" : "rotate(0deg)",
                fontSize: "9px",
              }}
            >
              ▾
            </span>
          </div>
        </div>
      </div>

      {/* EXPANDED BODY */}
      {expandido && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--bg-primary)",
            padding: "14px 16px",
          }}
        >
          {/* Section header */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: "12px",
              paddingBottom: "6px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "8px",
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                }}
              >
                I.
              </span>
              <h3
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  fontStyle: "italic",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Habitaciones
              </h3>
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "9px",
                color: "var(--text-tertiary)",
              }}
            >
              {activas.length.toString().padStart(2, "0")} total
            </span>
          </div>

          {activas.length === 0 ? (
            <div
              style={{
                padding: "12px 0",
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                fontStyle: "italic",
                color: "var(--text-tertiary)",
                textAlign: "center",
              }}
            >
              Sin habitaciones.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
                marginBottom: "8px",
              }}
            >
              <style>
                {`
                  @keyframes carpetaSlide {
                    0% {
                      opacity: 0;
                      transform: translateY(20px) rotateX(-15deg) scale(0.92);
                    }
                    60% {
                      opacity: 0.95;
                      transform: translateY(-3px) rotateX(2deg) scale(1.02);
                    }
                    100% {
                      opacity: 1;
                      transform: translateY(0) rotateX(0) scale(1);
                    }
                  }

                  .tarjeta-habitacion {
                    animation: carpetaSlide 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                  }
                `}
              </style>
              {activas.map((hab, idx) => {
                const contrato = byHabitacion[hab.id];
                const vacante = !contrato;
                return (
                  <div
                    className="tarjeta-habitacion"
                    key={hab.id}
                    style={{
                      background: vacante
                        ? "var(--bg-secondary)"
                        : "var(--bg-surface)",
                      padding: "14px",
                      border: "1px solid var(--border)",
                      borderRadius: "2px",
                      position: "relative",
                      minHeight: "140px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      transition: "all 0.2s ease",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      animationDelay: `${idx * 0.08}s`,
                      transformStyle: "preserve-3d",
                      perspective: "1000px",
                    }}
                    onMouseEnter={(e) => {
                      if (!vacante) {
                        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    }}
                  >
                    {/* Room label */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
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
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: vacante ? "var(--status-pending)" : "var(--accent)",
                        }}
                      >
                        {(idx + 1).toString().padStart(2, "0")}
                      </span>
                    </div>

                    {vacante ? (
                      <>
                        <div
                          style={{
                            flex: 1,
                            fontFamily: "var(--font-body)",
                            fontSize: "14px",
                            fontStyle: "italic",
                            color: "var(--text-tertiary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                          }}
                        >
                          📭 Vacante
                        </div>
                        <Button
                          variant="secondary"
                          style={{ fontSize: "12px", padding: "6px 8px", width: "100%" }}
                          onClick={() => onAsignarInquilino(hab)}
                        >
                          + Asignar
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* Inquilino name - GRANDE */}
                        <div
                          style={{
                            fontFamily: "var(--font-body)",
                            fontSize: "15px",
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            lineHeight: 1.2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                          title={contrato.inquilino_nombre}
                        >
                          {contrato.inquilino_nombre}
                        </div>

                        {/* Dates */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            fontFamily: "var(--font-display)",
                            fontSize: "11px",
                            color: "var(--text-tertiary)",
                            paddingBottom: "6px",
                            borderBottom: "1px solid var(--border-subtle)",
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 500 }}>desde</span> {contrato.fecha_inicio}
                          </div>
                          {contrato.fecha_fin ? (
                            <div>
                              <span style={{ fontWeight: 500 }}>hasta</span> {contrato.fecha_fin}
                            </div>
                          ) : (
                            <div style={{ color: "var(--status-ok)", fontWeight: 600 }}>
                              ✓ Vigente
                            </div>
                          )}
                        </div>

                        {/* Tope — Solo si modelo es "por_habitacion" */}
                        {modeloReparto === "por_habitacion" && (
                          <div
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "var(--accent)",
                            }}
                          >
                            tope <span style={{ color: "var(--text-primary)" }}>{contrato.suministros_incluidos}€</span>
                          </div>
                        )}

                        <Button
                          variant="secondary"
                          style={{ fontSize: "12px", padding: "6px 8px", width: "100%", marginTop: "auto" }}
                          onClick={() => onEditarContrato(hab, contrato, modeloReparto)}
                        >
                          Editar
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
    </article>
  );
};
