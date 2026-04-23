import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useContratos } from "../../store/useContratos";
import { useInquilinos } from "../../store/useInquilinos";
import type { Contrato, Habitacion } from "../../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  habitacion: Habitacion;
  editing?: Contrato;
  modeloReparto?: "por_habitacion" | "por_tope_casa";
}

export const ContratoModal: React.FC<Props> = ({ open, onClose, habitacion, editing, modeloReparto = "por_habitacion" }) => {
  const { create, update } = useContratos();
  const { inquilinos } = useInquilinos();

  const [inquilinoId, setInquilinoId] = useState<number | "">("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [tope, setTope] = useState("0");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setInquilinoId(editing?.inquilino_id ?? "");
      setFechaInicio(editing?.fecha_inicio ?? new Date().toISOString().slice(0, 10));
      setFechaFin(editing?.fecha_fin ?? "");
      setTope(String(editing?.suministros_incluidos ?? 0));
      setNotas(editing?.notas ?? "");
      setErrors({});
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    if (!inquilinoId) e.inquilino = "Selecciona un inquilino";
    if (!fechaInicio) e.fechaInicio = "La fecha de inicio es obligatoria";
    const topeNum = parseFloat(tope);
    if (isNaN(topeNum) || topeNum < 0) e.tope = "Introduce un importe válido (≥ 0)";
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    try {
      if (editing) {
        await update(editing.id, {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin || undefined,
          suministros_incluidos: topeNum,
          notas: notas.trim() || undefined,
        });
      } else {
        await create({
          habitacion_id: habitacion.id,
          inquilino_id: inquilinoId as number,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin || undefined,
          suministros_incluidos: topeNum,
          notas: notas.trim() || undefined,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Editar contrato — ${habitacion.nombre}` : `Asignar inquilino — ${habitacion.nombre}`}
      width={480}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Selector de inquilino */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="label-section">Inquilino</label>
          <select
            value={inquilinoId}
            onChange={(e) => { setInquilinoId(e.target.value ? Number(e.target.value) : ""); setErrors((p) => ({ ...p, inquilino: "" })); }}
            disabled={!!editing}
            style={selectStyle}
          >
            <option value="">— Selecciona un inquilino —</option>
            {inquilinos.map((i) => (
              <option key={i.id} value={i.id}>{i.nombre}{i.email ? ` · ${i.email}` : ""}</option>
            ))}
          </select>
          {errors.inquilino && <Err msg={errors.inquilino} />}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <Input
              label="Fecha inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => { setFechaInicio(e.target.value); setErrors((p) => ({ ...p, fechaInicio: "" })); }}
            />
            {errors.fechaInicio && <Err msg={errors.fechaInicio} />}
          </div>
          <div>
            <Input
              label="Fecha fin (vacío = vigente)"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
        </div>

        {/* Tope de suministros — Solo si modelo es "por_habitacion" */}
        {modeloReparto === "por_habitacion" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <Input
              label="Suministros incluidos (€/mes)"
              type="number"
              min="0"
              step="0.01"
              value={tope}
              onChange={(e) => { setTope(e.target.value); setErrors((p) => ({ ...p, tope: "" })); }}
              placeholder="0.00"
            />
            {errors.tope && <Err msg={errors.tope} />}
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
              Máximo que cubre el contrato en suministros. El exceso se repercute al inquilino.
            </span>
          </div>
        )}

        <Input
          label="Notas (opcional)"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Condiciones especiales, acuerdos..."
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Guardando..." : editing ? "Guardar cambios" : "Asignar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const selectStyle: React.CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: "14px",
  color: "var(--text-primary)",
  background: "transparent",
  border: "none",
  borderBottom: "1px solid var(--border)",
  borderRadius: 0,
  padding: "6px 0",
  outline: "none",
  width: "100%",
  cursor: "pointer",
};

const Err: React.FC<{ msg: string }> = ({ msg }) => (
  <span style={{ fontSize: "11px", color: "var(--status-excess)", marginTop: "2px" }}>{msg}</span>
);
