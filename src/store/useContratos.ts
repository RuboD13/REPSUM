import { create } from "zustand";
import { getDb } from "../lib/db";
import type { Contrato } from "../lib/types";

interface ContratosState {
  // Contratos activos indexados por habitacion_id
  byHabitacion: Record<number, Contrato | null>;
  // Histórico por habitacion_id
  historialByHabitacion: Record<number, Contrato[]>;
  loadForInmueble: (inmuebleId: number) => Promise<void>;
  create: (data: {
    habitacion_id: number;
    inquilino_id: number;
    fecha_inicio: string;
    fecha_fin?: string;
    suministros_incluidos: number;
    notas?: string;
  }) => Promise<Contrato>;
  update: (id: number, data: Partial<Pick<Contrato, "fecha_inicio" | "fecha_fin" | "suministros_incluidos" | "notas">>) => Promise<void>;
  cerrar: (id: number, fecha_fin: string) => Promise<void>;
}

const WITH_INQUILINO = `
  SELECT c.*, i.nombre as inquilino_nombre, i.email as inquilino_email
  FROM contratos c
  JOIN inquilinos i ON i.id = c.inquilino_id
`;

export const useContratos = create<ContratosState>((set, get) => ({
  byHabitacion: {},
  historialByHabitacion: {},

  loadForInmueble: async (inmuebleId) => {
    const db = await getDb();
    const todos = await db.select<Contrato[]>(
      `${WITH_INQUILINO}
       WHERE c.habitacion_id IN (
         SELECT id FROM habitaciones WHERE inmueble_id = ?
       )
       ORDER BY c.fecha_inicio DESC`,
      [inmuebleId]
    );
    const byHab: Record<number, Contrato | null> = {};
    const historial: Record<number, Contrato[]> = {};
    for (const c of todos) {
      const hid = c.habitacion_id;
      if (!historial[hid]) historial[hid] = [];
      historial[hid].push(c);
      // El activo es el que no tiene fecha_fin o fecha_fin futura
      if (!c.fecha_fin || c.fecha_fin > new Date().toISOString().slice(0, 10)) {
        if (!byHab[hid]) byHab[hid] = c; // el primero (más reciente) es el activo
      } else {
        if (byHab[hid] === undefined) byHab[hid] = null;
      }
    }
    set((s) => ({
      byHabitacion: { ...s.byHabitacion, ...byHab },
      historialByHabitacion: { ...s.historialByHabitacion, ...historial },
    }));
  },

  create: async (data) => {
    const db = await getDb();
    // Cerrar cualquier contrato activo previo en esta habitación
    await db.execute(
      `UPDATE contratos SET fecha_fin = ? WHERE habitacion_id = ? AND (fecha_fin IS NULL OR fecha_fin > ?)`,
      [data.fecha_inicio, data.habitacion_id, data.fecha_inicio]
    );
    const result = await db.execute(
      `INSERT INTO contratos (habitacion_id, inquilino_id, fecha_inicio, fecha_fin, suministros_incluidos, notas)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.habitacion_id,
        data.inquilino_id,
        data.fecha_inicio,
        data.fecha_fin ?? null,
        data.suministros_incluidos,
        data.notas ?? null,
      ]
    );
    const rows = await db.select<Contrato[]>(
      `${WITH_INQUILINO} WHERE c.id = ?`,
      [result.lastInsertId]
    );
    const nuevo = rows[0];
    set((s) => ({
      byHabitacion: { ...s.byHabitacion, [nuevo.habitacion_id]: nuevo },
      historialByHabitacion: {
        ...s.historialByHabitacion,
        [nuevo.habitacion_id]: [nuevo, ...(s.historialByHabitacion[nuevo.habitacion_id] ?? [])],
      },
    }));
    return nuevo;
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
      `UPDATE contratos SET ${fields.join(", ")} WHERE id = ?`,
      [...values, id]
    );
    const rows = await db.select<Contrato[]>(`${WITH_INQUILINO} WHERE c.id = ?`, [id]);
    const updated = rows[0];
    set((s) => ({
      byHabitacion: {
        ...s.byHabitacion,
        [updated.habitacion_id]:
          s.byHabitacion[updated.habitacion_id]?.id === id ? updated : s.byHabitacion[updated.habitacion_id],
      },
      historialByHabitacion: {
        ...s.historialByHabitacion,
        [updated.habitacion_id]: (s.historialByHabitacion[updated.habitacion_id] ?? []).map((c) =>
          c.id === id ? updated : c
        ),
      },
    }));
  },

  cerrar: async (id, fecha_fin) => {
    await get().update(id, { fecha_fin });
  },
}));
