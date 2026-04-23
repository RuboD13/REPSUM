import { create } from "zustand";
import { getDb } from "../lib/db";
import type { Factura } from "../lib/types";

interface FacturasState {
  // Facturas indexadas por inmueble_id → periodo (YYYY-MM)
  byInmueble: Record<number, Factura[]>;
  loading: boolean;

  loadForInmueble: (inmuebleId: number, periodo?: string) => Promise<void>;
  save: (data: Omit<Factura, "id" | "created_at">) => Promise<Factura>;
  update: (id: number, data: Partial<Pick<Factura, "tipo_suministro" | "comercializadora" | "periodo_inicio" | "periodo_fin" | "importe" | "verificada" | "datos_extraidos" | "estado_edicion">>) => Promise<void>;
  remove: (id: number, inmuebleId: number) => Promise<void>;
  setVerificada: (id: number, inmuebleId: number, verificada: boolean) => Promise<void>;
}

export const useFacturas = create<FacturasState>((set, get) => ({
  byInmueble: {},
  loading: false,

  loadForInmueble: async (inmuebleId, periodo) => {
    set({ loading: true });
    const db = await getDb();
    let rows: Factura[];
    if (periodo) {
      // Filtrar por mes: facturas cuyo periodo solapa con el mes dado (YYYY-MM)
      const mesInicio = `${periodo}-01`;
      const mesFin = `${periodo}-31`;
      rows = await db.select<Factura[]>(
        `SELECT * FROM facturas
         WHERE inmueble_id = ?
           AND periodo_inicio <= ? AND periodo_fin >= ?
         ORDER BY periodo_inicio DESC`,
        [inmuebleId, mesFin, mesInicio]
      );
    } else {
      rows = await db.select<Factura[]>(
        "SELECT * FROM facturas WHERE inmueble_id = ? ORDER BY periodo_inicio DESC",
        [inmuebleId]
      );
    }
    set((s) => ({ byInmueble: { ...s.byInmueble, [inmuebleId]: rows }, loading: false }));
  },

  save: async (data) => {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO facturas
         (inmueble_id, tipo_suministro, comercializadora, periodo_inicio, periodo_fin,
          importe, archivo_original, datos_extraidos, verificada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.inmueble_id,
        data.tipo_suministro,
        data.comercializadora ?? null,
        data.periodo_inicio,
        data.periodo_fin,
        data.importe,
        data.archivo_original ?? null,
        data.datos_extraidos ?? null,
        data.verificada ? 1 : 0,
      ]
    );
    const rows = await db.select<Factura[]>(
      "SELECT * FROM facturas WHERE id = ?",
      [result.lastInsertId]
    );
    const factura = rows[0];
    set((s) => ({
      byInmueble: {
        ...s.byInmueble,
        [data.inmueble_id]: [factura, ...(s.byInmueble[data.inmueble_id] ?? [])],
      },
    }));
    return factura;
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
      `UPDATE facturas SET ${fields.join(", ")} WHERE id = ?`,
      [...values, id]
    );
    // Recargar todas las facturas del mismo inmueble
    const rows = await db.select<Factura[]>("SELECT * FROM facturas WHERE id = ?", [id]);
    const updated = rows[0];
    set((s) => ({
      byInmueble: {
        ...s.byInmueble,
        [updated.inmueble_id]: (s.byInmueble[updated.inmueble_id] ?? []).map((f) =>
          f.id === id ? updated : f
        ),
      },
    }));
  },

  remove: async (id, inmuebleId) => {
    const db = await getDb();
    await db.execute("DELETE FROM facturas WHERE id = ?", [id]);
    set((s) => ({
      byInmueble: {
        ...s.byInmueble,
        [inmuebleId]: (s.byInmueble[inmuebleId] ?? []).filter((f) => f.id !== id),
      },
    }));
  },

  setVerificada: async (id, inmuebleId, verificada) => {
    await get().update(id, { verificada: verificada ? 1 : 0 });
    // Optimistic update
    set((s) => ({
      byInmueble: {
        ...s.byInmueble,
        [inmuebleId]: (s.byInmueble[inmuebleId] ?? []).map((f) =>
          f.id === id ? { ...f, verificada: verificada ? 1 : 0 } : f
        ),
      },
    }));
  },
}));
