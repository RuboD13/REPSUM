import { create } from "zustand";
import { getDb } from "../lib/db";
import type { Inquilino } from "../lib/types";

interface InquilinosState {
  inquilinos: Inquilino[];
  load: () => Promise<void>;
  create: (data: { nombre: string; email?: string }) => Promise<Inquilino>;
  update: (id: number, data: Partial<Pick<Inquilino, "nombre" | "email">>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useInquilinos = create<InquilinosState>((set) => ({
  inquilinos: [],

  load: async () => {
    const db = await getDb();
    const rows = await db.select<Inquilino[]>(
      "SELECT * FROM inquilinos ORDER BY nombre ASC"
    );
    set({ inquilinos: rows });
  },

  create: async (data) => {
    const db = await getDb();
    const result = await db.execute(
      "INSERT INTO inquilinos (nombre, email) VALUES (?, ?)",
      [data.nombre, data.email ?? null]
    );
    const rows = await db.select<Inquilino[]>(
      "SELECT * FROM inquilinos WHERE id = ?",
      [result.lastInsertId]
    );
    const inq = rows[0];
    set((s) => ({ inquilinos: [...s.inquilinos, inq].sort((a, b) => a.nombre.localeCompare(b.nombre)) }));
    return inq;
  },

  update: async (id, data) => {
    const db = await getDb();
    const fields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => `${k} = ?`);
    const values = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([, v]) => v);
    if (!fields.length) return;
    await db.execute(
      `UPDATE inquilinos SET ${fields.join(", ")} WHERE id = ?`,
      [...values, id]
    );
    const rows = await db.select<Inquilino[]>("SELECT * FROM inquilinos WHERE id = ?", [id]);
    set((s) => ({
      inquilinos: s.inquilinos
        .map((i) => (i.id === id ? rows[0] : i))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    }));
  },

  remove: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM inquilinos WHERE id = ?", [id]);
    set((s) => ({ inquilinos: s.inquilinos.filter((i) => i.id !== id) }));
  },
}));
