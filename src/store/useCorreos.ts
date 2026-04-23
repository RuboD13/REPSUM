import { create } from "zustand";
import { getDb } from "../lib/db";
import type { Correo } from "../lib/types";

interface CorreosState {
  correos: Correo[];
  loading: boolean;

  /** Carga todos los correos ordenados por fecha descendente */
  load: () => Promise<void>;

  /** Guarda un correo generado en la BD */
  guardar: (data: {
    reparto_ids: number[];
    destinatario_tipo: "propietario" | "inquilino";
    destinatario_nombre: string | null;
    asunto: string;
    cuerpo: string;
    plantilla_usada: string;
  }) => Promise<Correo>;

  /** Marca un correo como enviado */
  marcarEnviado: (id: number) => Promise<void>;

  /** Elimina un correo del historial */
  remove: (id: number) => Promise<void>;
}

export const useCorreos = create<CorreosState>((set) => ({
  correos: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const db = await getDb();
    const rows = await db.select<Correo[]>(
      "SELECT * FROM correos ORDER BY created_at DESC",
      []
    );
    set({ correos: rows, loading: false });
  },

  guardar: async (data) => {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO correos
         (reparto_ids, destinatario_tipo, destinatario_nombre, asunto, cuerpo, plantilla_usada, enviado)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        JSON.stringify(data.reparto_ids),
        data.destinatario_tipo,
        data.destinatario_nombre,
        data.asunto,
        data.cuerpo,
        data.plantilla_usada,
      ]
    );
    const nuevo: Correo = {
      id: result.lastInsertId as number,
      reparto_ids: JSON.stringify(data.reparto_ids),
      destinatario_tipo: data.destinatario_tipo,
      destinatario_nombre: data.destinatario_nombre,
      asunto: data.asunto,
      cuerpo: data.cuerpo,
      plantilla_usada: data.plantilla_usada,
      enviado: 0,
      created_at: new Date().toISOString(),
    };
    set((s) => ({ correos: [nuevo, ...s.correos] }));
    return nuevo;
  },

  marcarEnviado: async (id) => {
    const db = await getDb();
    await db.execute("UPDATE correos SET enviado = 1 WHERE id = ?", [id]);
    set((s) => ({
      correos: s.correos.map((c) => (c.id === id ? { ...c, enviado: 1 } : c)),
    }));
  },

  remove: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM correos WHERE id = ?", [id]);
    set((s) => ({ correos: s.correos.filter((c) => c.id !== id) }));
  },
}));
