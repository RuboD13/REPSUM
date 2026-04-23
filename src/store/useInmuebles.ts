import { create } from "zustand";
import { getDb } from "../lib/db";
import type { Inmueble } from "../lib/types";

interface InmueblesState {
  inmuebles: Inmueble[];
  loading: boolean;
  error: string | null;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  load: () => Promise<void>;
  create: (data: { nombre: string; direccion: string; num_habitaciones: number; notas?: string; foto_url?: string | null; suministros_imputables?: string; modelo_reparto?: "por_habitacion" | "por_tope_casa"; tope_global?: number | null }) => Promise<Inmueble>;
  update: (id: number, data: Partial<Pick<Inmueble, "nombre" | "direccion" | "num_habitaciones" | "notas" | "foto_url" | "suministros_imputables" | "modelo_reparto" | "tope_global" | "gastos_vacantes_los_paga_propiedad">>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useInmuebles = create<InmueblesState>((set, get) => ({
  inmuebles: [],
  loading: false,
  error: null,
  selectedId: null,

  setSelectedId: (id) => set({ selectedId: id }),

  load: async () => {
    set({ loading: true, error: null });
    try {
      const db = await getDb();
      const rows = await db.select<Inmueble[]>(
        "SELECT * FROM inmuebles ORDER BY created_at ASC"
      );
      set({ inmuebles: rows, loading: false });
      // Seleccionar el primero si no hay selección
      if (!get().selectedId && rows.length > 0) {
        set({ selectedId: rows[0].id });
      }
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  create: async (data) => {
    const db = await getDb();
    const result = await db.execute(
      "INSERT INTO inmuebles (nombre, direccion, num_habitaciones, notas, foto_url, suministros_imputables, modelo_reparto) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        data.nombre,
        data.direccion,
        data.num_habitaciones,
        data.notas ?? null,
        data.foto_url ?? null,
        data.suministros_imputables ?? '["luz","agua","gas","internet","comunidad"]',
        data.modelo_reparto ?? "por_habitacion",
      ]
    );
    const newId = result.lastInsertId as number;
    const rows = await db.select<Inmueble[]>("SELECT * FROM inmuebles WHERE id = ?", [newId]);
    const newInmueble = rows[0];
    set((s) => ({ inmuebles: [...s.inmuebles, newInmueble], selectedId: newId }));
    return newInmueble;
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
      `UPDATE inmuebles SET ${fields.join(", ")} WHERE id = ?`,
      [...values, id]
    );
    const rows = await db.select<Inmueble[]>("SELECT * FROM inmuebles WHERE id = ?", [id]);
    set((s) => ({
      inmuebles: s.inmuebles.map((i) => (i.id === id ? rows[0] : i)),
    }));
  },

  remove: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM inmuebles WHERE id = ?", [id]);
    set((s) => ({
      inmuebles: s.inmuebles.filter((i) => i.id !== id),
      selectedId: s.selectedId === id ? (s.inmuebles[0]?.id ?? null) : s.selectedId,
    }));
  },
}));
