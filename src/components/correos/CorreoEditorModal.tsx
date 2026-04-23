import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useCorreos } from "../../store/useCorreos";
import { useToast } from "../ui/Toast";
import {
  PLANTILLAS_PROPIETARIO,
  PLANTILLAS_INQUILINO,
  buildPropietarioVars,
  buildInquilinoVars,
  type CorreoContext,
} from "../../lib/email-templates";
import { abrirEnGmail, copiarAlPortapapeles } from "../../lib/gmail-integration";
import type { RepartoExtended } from "../../lib/types";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface CorreoEditorConfig {
  tipo: "propietario" | "inquilino";
  inmueble_nombre: string;
  inmueble_direccion: string;
  periodo: string;         // YYYY-MM
  repartos: RepartoExtended[];
  // Solo para inquilino
  inquilino_nombre?: string;
  inquilino_email?: string;
  habitacion_nombre?: string;
}

interface Props {
  config: CorreoEditorConfig;
  onClose: () => void;
}

// ── Componente ────────────────────────────────────────────────────────────────

export const CorreoEditorModal: React.FC<Props> = ({ config, onClose }) => {
  const { guardar } = useCorreos();
  const { showToast } = useToast();

  const isPropietario = config.tipo === "propietario";
  const plantillas = isPropietario ? PLANTILLAS_PROPIETARIO : PLANTILLAS_INQUILINO;

  const [plantillaId, setPlantillaId] = useState(plantillas[0].id);
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [guardado, setGuardado] = useState(false);

  // Recalcular cuando cambia plantilla
  useEffect(() => {
    const ctx: CorreoContext = {
      inmueble_nombre: config.inmueble_nombre,
      inmueble_direccion: config.inmueble_direccion,
      periodo: config.periodo,
      repartos: config.repartos,
    };

    const plantilla = plantillas.find((p) => p.id === plantillaId) ?? plantillas[0];

    if (isPropietario) {
      const vars = buildPropietarioVars(ctx);
      const generado = plantilla.generar(vars as never);
      setAsunto(generado.asunto);
      setCuerpo(generado.cuerpo);
    } else {
      const vars = buildInquilinoVars(
        ctx,
        config.inquilino_nombre ?? "",
        config.habitacion_nombre ?? ""
      );
      const generado = plantilla.generar(vars as never);
      setAsunto(generado.asunto);
      setCuerpo(generado.cuerpo);
    }
    setGuardado(false);
  }, [plantillaId]);

  const handleCopiar = async () => {
    await copiarAlPortapapeles(`${asunto}\n\n${cuerpo}`);
    showToast("Correo copiado al portapapeles", "ok");
  };

  const handleGmail = async () => {
    await abrirEnGmail(asunto, cuerpo, config.inquilino_email);
    showToast("Abriendo Gmail en el navegador...", "ok");
  };

  const handleGuardar = async () => {
    const repartoIds = config.repartos.map((r) => r.id);
    const plantillaActual = plantillas.find((p) => p.id === plantillaId) ?? plantillas[0];
    await guardar({
      reparto_ids: repartoIds,
      destinatario_tipo: config.tipo,
      destinatario_nombre: isPropietario
        ? `Propietario — ${config.inmueble_nombre}`
        : (config.inquilino_nombre ?? null),
      asunto,
      cuerpo,
      plantilla_usada: plantillaActual.id,
    });
    setGuardado(true);
    showToast("Correo guardado en historial", "ok");
  };

  const titulo = isPropietario
    ? `Informe propietario — ${config.inmueble_nombre}`
    : `Correo a ${config.inquilino_nombre ?? "inquilino"} (${config.habitacion_nombre})`;

  const excesosInquilino = config.repartos
    .filter((r) => !isPropietario && r.inquilino_nombre === config.inquilino_nombre)
    .reduce((s, r) => s + r.exceso, 0);

  return (
    <Modal open={true} title={titulo} onClose={onClose} width={680}>
      {/* Info rápida */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", padding: "12px 16px", background: "var(--bg-secondary)", fontSize: "12px", color: "var(--text-secondary)" }}>
        <span>{config.periodo}</span>
        {!isPropietario && (
          <>
            <span style={{ color: "var(--border)" }}>|</span>
            <span>Exceso: <strong style={{ color: "var(--status-excess)", fontFamily: "var(--font-display)" }}>
              {excesosInquilino.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
            </strong></span>
            {config.inquilino_email && (
              <>
                <span style={{ color: "var(--border)" }}>|</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "11px" }}>{config.inquilino_email}</span>
              </>
            )}
          </>
        )}
      </div>

      {/* Selector de modelo */}
      <div style={{ marginBottom: "16px" }}>
        <div className="label-section" style={{ marginBottom: "10px" }}>Modelo de plantilla</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {plantillas.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlantillaId(p.id)}
              style={{
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: plantillaId === p.id ? 600 : 400,
                color: plantillaId === p.id ? "var(--accent)" : "var(--text-secondary)",
                background: plantillaId === p.id ? "var(--accent-subtle)" : "transparent",
                border: `1px solid ${plantillaId === p.id ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "2px",
                cursor: "pointer",
              }}
            >
              {p.id} — {p.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Asunto */}
      <div style={{ marginBottom: "12px" }}>
        <div className="label-section" style={{ marginBottom: "6px" }}>Asunto</div>
        <input
          value={asunto}
          onChange={(e) => setAsunto(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            fontSize: "13px",
            background: "var(--bg-secondary)",
            border: "none",
            borderBottom: "1px solid var(--border)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-heading)",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Cuerpo */}
      <div style={{ marginBottom: "20px" }}>
        <div className="label-section" style={{ marginBottom: "6px" }}>Cuerpo</div>
        <textarea
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          rows={16}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "12px",
            lineHeight: 1.7,
            fontFamily: "var(--font-body)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Botones */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" onClick={handleCopiar}>
            Copiar
          </Button>
          <Button variant="primary" onClick={handleGmail}>
            ✉ Abrir en Gmail
          </Button>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {guardado && (
            <span style={{ fontSize: "12px", color: "var(--status-ok)" }}>✓ Guardado</span>
          )}
          {!guardado && (
            <Button variant="secondary" onClick={handleGuardar}>
              Guardar en historial
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Hook de estado del modal ──────────────────────────────────────────────────

export function useCorreoEditor() {
  const [config, setConfig] = useState<CorreoEditorConfig | null>(null);

  const abrirPropietario = (
    inmueble_nombre: string,
    inmueble_direccion: string,
    periodo: string,
    repartos: RepartoExtended[]
  ) => {
    setConfig({ tipo: "propietario", inmueble_nombre, inmueble_direccion, periodo, repartos });
  };

  const abrirInquilino = (
    inmueble_nombre: string,
    inmueble_direccion: string,
    periodo: string,
    repartos: RepartoExtended[],
    inquilino_nombre: string,
    habitacion_nombre: string,
    inquilino_email?: string
  ) => {
    setConfig({
      tipo: "inquilino",
      inmueble_nombre,
      inmueble_direccion,
      periodo,
      repartos,
      inquilino_nombre,
      habitacion_nombre,
      inquilino_email,
    });
  };

  const cerrar = () => setConfig(null);

  return { config, abrirPropietario, abrirInquilino, cerrar };
}
