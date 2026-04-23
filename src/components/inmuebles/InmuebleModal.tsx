import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useInmuebles } from "../../store/useInmuebles";
import { useHabitaciones } from "../../store/useHabitaciones";
import type { Inmueble } from "../../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Inmueble;
}

export const InmuebleModal: React.FC<Props> = ({ open, onClose, editing }) => {
  const { create, update } = useInmuebles();
  const { ensureCount } = useHabitaciones();

  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [numHab, setNumHab] = useState(3);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setNombre(editing?.nombre ?? "");
      setDireccion(editing?.direccion ?? "");
      setNumHab(editing?.num_habitaciones ?? 3);
      setNotas(editing?.notas ?? "");
      setErrors({});
    }
  }, [open, editing]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (!direccion.trim()) e.direccion = "La dirección es obligatoria";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      if (editing) {
        await update(editing.id, { nombre: nombre.trim(), direccion: direccion.trim(), num_habitaciones: numHab, notas: notas.trim() || undefined });
        await ensureCount(editing.id, numHab);
      } else {
        const inm = await create({ nombre: nombre.trim(), direccion: direccion.trim(), num_habitaciones: numHab, notas: notas.trim() || undefined });
        await ensureCount(inm.id, numHab);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar inmueble" : "Nuevo inmueble"}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <Input
          label="Nombre"
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); setErrors((p) => ({ ...p, nombre: "" })); }}
          placeholder="Piso Calle Mayor 12"
          autoFocus
        />
        {errors.nombre && <ErrorMsg msg={errors.nombre} />}

        <Input
          label="Dirección"
          value={direccion}
          onChange={(e) => { setDireccion(e.target.value); setErrors((p) => ({ ...p, direccion: "" })); }}
          placeholder="Calle Mayor 12, 3ºB, Madrid"
        />
        {errors.direccion && <ErrorMsg msg={errors.direccion} />}

        {/* Stepper habitaciones */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="label-section">Habitaciones</label>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingTop: "4px" }}>
            <button
              style={stepperBtn}
              onClick={() => setNumHab((n) => Math.max(2, n - 1))}
              disabled={numHab <= 2}
            >−</button>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 500, minWidth: "24px", textAlign: "center" }}>
              {numHab}
            </span>
            <button
              style={stepperBtn}
              onClick={() => setNumHab((n) => Math.min(7, n + 1))}
              disabled={numHab >= 7}
            >+</button>
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>(mín. 2, máx. 7)</span>
          </div>
        </div>

        <Input
          label="Notas (opcional)"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Observaciones internas..."
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear inmueble"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const stepperBtn: React.CSSProperties = {
  width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center",
  border: "1px solid var(--border)", background: "transparent", borderRadius: "2px",
  cursor: "pointer", fontSize: "16px", color: "var(--text-primary)",
};

const ErrorMsg: React.FC<{ msg: string }> = ({ msg }) => (
  <span style={{ fontSize: "11px", color: "var(--status-excess)" }}>{msg}</span>
);
