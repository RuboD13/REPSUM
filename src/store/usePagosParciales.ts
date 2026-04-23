import { create } from "zustand";
import { getDb } from "../lib/db";
import type { PagoParcial } from "../lib/types";

interface PagosParcialosState {
  pagosParciales: PagoParcial[];
  loading: boolean;

  /** Carga todos los pagos parciales */
  load: () => Promise<void>;
}

export const usePagosParciales = create<PagosParcialosState>((set) => ({
  pagosParciales: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const db = await getDb();
    const rows = await db.select<PagoParcial[]>(
      "SELECT * FROM pagos_parciales ORDER BY fecha DESC",
      []
    );
    set({ pagosParciales: rows, loading: false });
  },
}));
