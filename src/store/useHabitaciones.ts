import { create } from "zustand";
import { getDb } from "../lib/db";
import type { Habitacion } from "../lib/types";

interface HabitacionesState {
  byInmueble: Record<number, Habitacion[]>;
  load: (inmuebleId: number) => Promise<void>;
  create: (inmuebleId: number, nombre: string) => Promise<Habitacion>;
  update: (id: number, data: Partial<Pick<Habitacion, "nombre" | "criterio_reparto" | "activa" | "foto_url" | "superficie" | "descripcion">>) => Promise<void>;
  ensureCount: (inmuebleId: number, count: number) => Promise<void>;
}

export const useHabitaciones = create<HabitacionesState>((set, get) => ({
  byInmueble: {},

  load: async (inmuebleId) => {
    const db = await getDb();
    const rows = await db.select<Habitacion[]>(
      "SELECT * FROM habitaciones WHERE inmueble_id = ? ORDER BY id ASC",
      [inmuebleId]
    );
    set((s) => ({ byInmueble: { ...s.byInmueble, [inmuebleId]: rows } }));
  },

  create: async (inmuebleId, nombre) => {
    const db = await getDb();
    const result = await db.execute(
      "INSERT INTO habitaciones (inmueble_id, nombre) VALUES (?, ?)",
      [inmuebleId, nombre]
    );
    const rows = await db.select<Habitacion[]>(
      "SELECT * FROM habitaciones WHERE id = ?",
      [result.lastInsertId]
    );
    const hab = rows[0];
    set((s) => ({
      byInmueble: {
        ...s.byInmueble,
        [inmuebleId]: [...(s.byInmueble[inmuebleId] ?? []), hab],
      },
    }));
    return hab;
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
      `UPDATE habitaciones SET ${fields.join(", ")} WHERE id = ?`,
      [...values, id]
    );
    // Reload parent
    const rows = await db.select<Habitacion[]>("SELECT * FROM habitaciones WHERE id = ?", [id]);
    const hab = rows[0];
    set((s) => {
      const list = s.byInmueble[hab.inmueble_id] ?? [];
      return {
        byInmueble: {
          ...s.byInmueble,
          [hab.inmueble_id]: list.map((h) => (h.id === id ? hab : h)),
        },
      };
    });
  },

  // Asegura que un inmueble tenga exactamente `count` habitaciones
  ensureCount: async (inmuebleId, count) => {
    const db = await getDb();
    const existing = await db.select<Habitacion[]>(
      "SELECT * FROM habitaciones WHERE inmueble_id = ? ORDER BY id ASC",
      [inmuebleId]
    );
    const diff = count - existing.length;
    if (diff > 0) {
      for (let i = existing.length + 1; i <= count; i++) {
        await db.execute(
          "INSERT INTO habitaciones (inmueble_id, nombre) VALUES (?, ?)",
          [inmuebleId, `Hab. ${i}`]
        );
      }
    } else if (diff < 0) {
      // Desactivar las sobrantes (no borrar para preservar histórico)
      const toDeactivate = existing.slice(count);
      for (const h of toDeactivate) {
        await db.execute("UPDATE habitaciones SET activa = 0 WHERE id = ?", [h.id]);
      }
    }
    // Recargar
    await get().load(inmuebleId);
  },
}));
