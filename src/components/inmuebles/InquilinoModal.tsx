import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useInquilinos } from "../../store/useInquilinos";
import type { Inquilino } from "../../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Inquilino;
}

export const InquilinoModal: React.FC<Props> = ({ open, onClose, editing }) => {
  const { create, update } = useInquilinos();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setNombre(editing?.nombre ?? "");
      setEmail(editing?.email ?? "");
      setErrors({});
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    if (!nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (errors.nombre) { setErrors(e); return; }
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      if (editing) {
        await update(editing.id, { nombre: nombre.trim(), email: email.trim() || null });
      } else {
        await create({ nombre: nombre.trim(), email: email.trim() || undefined });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar inquilino" : "Nuevo inquilino"}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <Input
          label="Nombre completo"
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); setErrors({}); }}
          placeholder="Ana García"
          autoFocus
        />
        {errors.nombre && (
          <span style={{ fontSize: "11px", color: "var(--status-excess)" }}>{errors.nombre}</span>
        )}

        <Input
          label="Email (opcional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ana@ejemplo.com"
          type="email"
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear inquilino"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
