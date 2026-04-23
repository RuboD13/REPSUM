import React, { useEffect, useState } from "react";
import { useCorreos } from "../../store/useCorreos";
import { Button } from "../ui/Button";
import { copiarAlPortapapeles, abrirEnGmail } from "../../lib/gmail-integration";
import { useToast } from "../ui/Toast";
import type { Correo } from "../../lib/types";

// ── Vista historial de correos ────────────────────────────────────────────────

export const CorreosView: React.FC = () => {
  const { correos, loading, load, marcarEnviado, remove } = useCorreos();
  const { showToast } = useToast();
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "propietario" | "inquilino">("todos");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  const filtrados = filtroTipo === "todos"
    ? correos
    : correos.filter((c) => c.destinatario_tipo === filtroTipo);

  const handleCopiar = async (c: Correo) => {
    await copiarAlPortapapeles(`${c.asunto}\n\n${c.cuerpo}`);
    showToast("Correo copiado al portapapeles", "ok");
  };

  const handleGmail = async (c: Correo) => {
    await abrirEnGmail(c.asunto, c.cuerpo);
    showToast("Abriendo Gmail en el navegador...", "ok");
  };

  const handleEnviado = async (c: Correo) => {
    await marcarEnviado(c.id);
    showToast("Marcado como enviado", "ok");
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "24px", background: "var(--bg-primary)" }}>
      {/* Cabecera */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>
            Historial de correos
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: "4px 0 0" }}>
            {correos.length} {correos.length === 1 ? "correo guardado" : "correos guardados"}
          </p>
        </div>
        {/* Filtro */}
        <div style={{ display: "flex", gap: "4px" }}>
          {(["todos", "propietario", "inquilino"] as const).map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              style={{
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: filtroTipo === tipo ? 600 : 400,
                color: filtroTipo === tipo ? "var(--accent)" : "var(--text-secondary)",
                background: filtroTipo === tipo ? "var(--accent-subtle)" : "transparent",
                border: `1px solid ${filtroTipo === tipo ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "2px",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Estado vacío */}
      {!loading && filtrados.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-tertiary)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
          {correos.length === 0
            ? "No hay correos guardados. Genera uno desde el menú contextual en la pestaña Reparto."
            : "No hay correos de este tipo."}
        </div>
      )}

      {/* Lista */}
      {filtrados.map((c) => (
        <CorreoItem
          key={c.id}
          correo={c}
          expanded={expandedId === c.id}
          onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
          onCopiar={() => handleCopiar(c)}
          onGmail={() => handleGmail(c)}
          onEnviado={() => handleEnviado(c)}
          onDelete={() => remove(c.id)}
        />
      ))}
    </div>
  );
};

// ── CorreoItem ────────────────────────────────────────────────────────────────

interface CorreoItemProps {
  correo: Correo;
  expanded: boolean;
  onToggle: () => void;
  onCopiar: () => void;
  onGmail: () => void;
  onEnviado: () => void;
  onDelete: () => void;
}

const CorreoItem: React.FC<CorreoItemProps> = ({
  correo, expanded, onToggle, onCopiar, onGmail, onEnviado, onDelete,
}) => {
  const esPropietario = correo.destinatario_tipo === "propietario";
  const fecha = correo.created_at
    ? new Date(correo.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  return (
    <div style={{ marginBottom: "12px", border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
      {/* Header del item */}
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", cursor: "pointer", borderBottom: expanded ? "1px solid var(--border-subtle)" : "none" }}
      >
        {/* Tipo badge */}
        <span style={{
          fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em",
          color: esPropietario ? "var(--accent)" : "var(--status-excess)",
          background: esPropietario ? "var(--accent-subtle)" : "var(--status-excess-bg)",
          padding: "2px 8px", borderRadius: "2px", flexShrink: 0,
          textTransform: "uppercase",
        }}>
          {esPropietario ? "Propietario" : "Inquilino"}
        </span>

        {/* Asunto */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {correo.asunto}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
            {correo.destinatario_nombre ?? "—"} · Plantilla {correo.plantilla_usada} · {fecha}
          </div>
        </div>

        {/* Estado enviado */}
        <span style={{ fontSize: "11px", color: correo.enviado ? "var(--status-ok)" : "var(--text-tertiary)", flexShrink: 0 }}>
          {correo.enviado ? "● Enviado" : "○ No enviado"}
        </span>
      </div>

      {/* Cuerpo expandido */}
      {expanded && (
        <div style={{ padding: "16px" }}>
          <pre style={{
            fontFamily: "var(--font-body)",
            fontSize: "12px",
            lineHeight: 1.7,
            color: "var(--text-secondary)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            margin: "0 0 16px",
            padding: "12px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
          }}>
            {correo.cuerpo}
          </pre>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Button variant="secondary" onClick={onCopiar}>Copiar</Button>
            <Button variant="primary" onClick={onGmail}>✉ Abrir en Gmail</Button>
            {!correo.enviado && (
              <Button variant="secondary" onClick={onEnviado}>Marcar como enviado</Button>
            )}
            <Button variant="destructive" onClick={onDelete}>Eliminar</Button>
          </div>
        </div>
      )}
    </div>
  );
};
