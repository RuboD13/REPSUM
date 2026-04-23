import React, { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { useCorreos } from "../../store/useCorreos";
import { useCorreoEditor } from "../../components/correos/CorreoEditorModal";
import type { Inmueble } from "../../lib/types";

interface CorreosSubsectionProps {
  inmueble: Inmueble;
}

export const CorreosSubsection: React.FC<CorreosSubsectionProps> = ({ inmueble }) => {
  const { correos, load } = useCorreos();
  const { config: editorConfig, abrirPropietario, abrirInquilino, cerrar } = useCorreoEditor();
  const [modo, setModo] = useState<"historial" | "componer">("historial");

  useEffect(() => {
    load();
  }, [load]);

  const correosInmueble = correos.slice(0, 5); // TODO: filtrar por inmueble

  return (
    <section
      style={{
        marginTop: "24px",
        paddingTop: "20px",
        borderTop: "1px solid var(--border-subtle)",
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
            }}
          >
            II.
          </span>
          <h3
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "16px",
              fontStyle: "italic",
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            Correos
          </h3>
        </div>

        {/* Segmented control */}
        <div
          style={{
            display: "flex",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          {(["historial", "componer"] as const).map((m) => {
            const active = modo === m;
            return (
              <button
                key={m}
                onClick={() => setModo(m)}
                style={{
                  padding: "5px 14px",
                  background: active ? "var(--text-primary)" : "transparent",
                  border: "none",
                  borderRight: m === "historial" ? "1px solid var(--border)" : "none",
                  color: active ? "var(--bg-surface)" : "var(--text-secondary)",
                  fontFamily: "var(--font-heading)",
                  fontSize: "10px",
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                }}
              >
                {m === "historial" ? `Historial (${correosInmueble.length})` : "Componer"}
              </button>
            );
          })}
        </div>
      </div>

      {/* HISTORIAL */}
      {modo === "historial" && (
        <div
          style={{
            border: "1px solid var(--border)",
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          {correosInmueble.length === 0 ? (
            <div
              style={{
                padding: "28px",
                textAlign: "center",
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                fontStyle: "italic",
                color: "var(--text-tertiary)",
              }}
            >
              Sin correos registrados aún
            </div>
          ) : (
            <div>
              {correosInmueble.map((correo, idx) => (
                <div
                  key={correo.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "12px",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: idx < correosInmueble.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    background: idx % 2 === 0 ? "var(--bg-surface)" : "var(--bg-primary)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        marginBottom: "3px",
                      }}
                    >
                      {correo.asunto}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "10px",
                        color: "var(--text-tertiary)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {correo.destinatario_tipo === "propietario" ? "→ Propietario" : "→ Inquilino"}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontFamily: "var(--font-display)",
                      fontSize: "10px",
                      color: correo.enviado ? "var(--status-ok)" : "var(--text-tertiary)",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: correo.enviado ? "var(--status-ok)" : "var(--border-strong)",
                        flexShrink: 0,
                      }}
                    />
                    {correo.enviado ? "enviado" : "borrador"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMPONER */}
      {modo === "componer" && (
        <div
          style={{
            padding: "20px",
            border: "1px solid var(--border)",
            background: "var(--bg-secondary)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              fontStyle: "italic",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginBottom: "16px",
            }}
          >
            Redacta un correo dirigido al propietario o a un inquilino
            del inmueble <strong style={{ fontStyle: "normal" }}>{inmueble.nombre}</strong>.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              variant="secondary"
              onClick={() => abrirPropietario(inmueble.nombre, inmueble.direccion, "", [])}
              style={{ fontSize: "11px", padding: "7px 14px" }}
            >
              Para propietario
            </Button>
            <Button
              variant="secondary"
              onClick={() => abrirInquilino(inmueble.nombre, inmueble.direccion, "", [], "", "")}
              style={{ fontSize: "11px", padding: "7px 14px" }}
            >
              Para inquilino
            </Button>
          </div>
        </div>
      )}

      {/* Editor modal overlay */}
      {editorConfig && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(26,26,24,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={cerrar}
        />
      )}
    </section>
  );
};
