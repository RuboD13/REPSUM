import { create } from "zustand";
import { getDb } from "../lib/db";
import { calcularReparto } from "../lib/reparto";
import type { Factura, Habitacion, Contrato, RepartoExtended, EstadoCobro, PagoParcial, Correo } from "../lib/types";

export interface DeudaVivaSummary {
  inquilino_id: number;
  inquilino_nombre: string;
  inquilino_email: string | null;
  inmueble_id: number;
  inmueble_nombre: string;
  habitacion_id: number;
  habitacion_nombre: string;
  total_exceso: number;
  estado_cobro: EstadoCobro;
  periodo_fin: string;
  fecha_comunicacion: string | null;
  reparto_ids: string; // JSON array de ids de repartos con exceso
}

interface RepartosState {
  byInmueble: Record<number, RepartoExtended[]>;
  loading: boolean;
  calculating: boolean;
  deudaViva: DeudaVivaSummary[];

  loadForInmueble: (inmuebleId: number, periodo: string) => Promise<void>;
  calcularYGuardar: (
    inmuebleId: number,
    periodo: string,
    facturas: Factura[],
    habitaciones: Habitacion[],
    byHabitacion: Record<number, Contrato | null>,
    suministrosImputables?: string,
    gastos_vacantes_los_paga_propiedad?: boolean
  ) => Promise<RepartoExtended[]>;
  setEstadoCobro: (id: number, inmuebleId: number, estado: EstadoCobro) => Promise<void>;
  loadDeudaViva: () => Promise<void>;

  /** Carga todos los repartos con exceso de un inquilino/habitación (todos los periodos) */
  loadRepartosDeudaInquilino: (inquilinoId: number, habitacionId: number) => Promise<RepartoExtended[]>;

  /** Pagos parciales */
  addPagoParcial: (repartoId: number, fecha: string, importe: number, notas: string | null) => Promise<PagoParcial>;
  loadPagosParciales: (repartoIds: number[]) => Promise<PagoParcial[]>;
  deletePagoParcial: (id: number) => Promise<void>;
  updatePagoParcialConfirmado: (pagoId: number, confirmado: boolean) => Promise<void>;

  /** Correos relacionados a una deuda (por inquilino+habitación) */
  loadCorreosDeuda: (inquilinoNombre: string) => Promise<Correo[]>;
}

const LOAD_SQL = `
  SELECT
    r.id, r.factura_id, r.contrato_id, r.dias_en_periodo, r.proporcion,
    r.importe_bruto, r.tope_aplicado, r.importe_neto, r.exceso, r.estado_cobro,
    f.tipo_suministro, f.periodo_inicio, f.periodo_fin,
    c.habitacion_id, c.inquilino_id, c.suministros_incluidos,
    h.nombre  AS habitacion_nombre, h.criterio_reparto,
    i.nombre  AS inquilino_nombre
  FROM repartos r
  JOIN facturas    f ON r.factura_id  = f.id
  JOIN contratos   c ON r.contrato_id = c.id
  JOIN habitaciones h ON c.habitacion_id = h.id
  JOIN inquilinos  i ON c.inquilino_id   = i.id
  WHERE f.inmueble_id = ?
    AND f.periodo_inicio <= ?
    AND f.periodo_fin   >= ?
  ORDER BY f.tipo_suministro, h.nombre
`;

export const useRepartos = create<RepartosState>((set, get) => ({
  byInmueble: {},
  deudaViva: [],
  loading: false,
  calculating: false,

  loadForInmueble: async (inmuebleId, periodo) => {
    set({ loading: true });
    const db = await getDb();
    const mesFin = `${periodo}-31`;
    const mesInicio = `${periodo}-01`;
    const rows = await db.select<RepartoExtended[]>(LOAD_SQL, [inmuebleId, mesFin, mesInicio]);
    set((s) => ({ byInmueble: { ...s.byInmueble, [inmuebleId]: rows }, loading: false }));
  },

  calcularYGuardar: async (inmuebleId, periodo, facturas, habitaciones, byHabitacionRaw, suministrosImputables, gastos_vacantes_los_paga_propiedad) => {
    const byHabitacion: Record<number, Contrato> = {};
    for (const [k, v] of Object.entries(byHabitacionRaw)) {
      if (v !== null) byHabitacion[Number(k)] = v as Contrato;
    }
    set({ calculating: true });
    try {
      const db = await getDb();

      if (facturas.length > 0) {
        const ids = facturas.map((f) => f.id).join(",");
        await db.execute(`DELETE FROM repartos WHERE factura_id IN (${ids})`, []);
      }

      const items = calcularReparto(
        facturas,
        habitaciones,
        byHabitacion,
        suministrosImputables,
        gastos_vacantes_los_paga_propiedad ?? true
      );

      for (const item of items) {
        await db.execute(
          `INSERT INTO repartos
             (factura_id, contrato_id, dias_en_periodo, proporcion,
              importe_bruto, tope_aplicado, importe_neto, exceso, estado_cobro)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
          [item.factura_id, item.contrato_id, item.dias_en_periodo, item.proporcion,
           item.importe_bruto, item.tope_aplicado, item.importe_neto, item.exceso]
        );
      }

      await get().loadForInmueble(inmuebleId, periodo);
      await get().loadDeudaViva();
      return get().byInmueble[inmuebleId] ?? [];
    } finally {
      set({ calculating: false });
    }
  },

  setEstadoCobro: async (id, inmuebleId, estado) => {
    const db = await getDb();
    // Si pasa a "comunicado", guardar la fecha de hoy
    if (estado === "comunicado") {
      const hoy = new Date().toISOString().split("T")[0];
      await db.execute(
        "UPDATE repartos SET estado_cobro = ?, fecha_comunicacion = ? WHERE id = ?",
        [estado, hoy, id]
      );
    } else {
      await db.execute("UPDATE repartos SET estado_cobro = ? WHERE id = ?", [estado, id]);
    }
    set((s) => ({
      byInmueble: {
        ...s.byInmueble,
        [inmuebleId]: (s.byInmueble[inmuebleId] ?? []).map((r) =>
          r.id === id ? { ...r, estado_cobro: estado } : r
        ),
      },
    }));
    await get().loadDeudaViva();
  },

  loadDeudaViva: async () => {
    const db = await getDb();
    type Row = {
      inquilino_id: number;
      inquilino_nombre: string;
      inquilino_email: string | null;
      inmueble_id: number;
      inmueble_nombre: string;
      habitacion_id: number;
      habitacion_nombre: string;
      total_exceso: number;
      estado_cobro: EstadoCobro;
      periodo_fin: string;
      fecha_comunicacion: string | null;
      reparto_ids: string;
    };
    const rows = await db.select<Row[]>(`
      SELECT
        c.inquilino_id,
        i.nombre              AS inquilino_nombre,
        i.email               AS inquilino_email,
        inm.id                AS inmueble_id,
        inm.nombre            AS inmueble_nombre,
        h.id                  AS habitacion_id,
        h.nombre              AS habitacion_nombre,
        SUM(r.exceso)         AS total_exceso,
        r.estado_cobro,
        MAX(f.periodo_fin)    AS periodo_fin,
        MAX(r.fecha_comunicacion) AS fecha_comunicacion,
        json_group_array(r.id) AS reparto_ids
      FROM repartos r
      JOIN facturas     f   ON r.factura_id     = f.id
      JOIN contratos    c   ON r.contrato_id    = c.id
      JOIN habitaciones h   ON c.habitacion_id  = h.id
      JOIN inquilinos   i   ON c.inquilino_id   = i.id
      JOIN inmuebles    inm ON f.inmueble_id     = inm.id
      WHERE r.estado_cobro IN ('pendiente', 'comunicado', 'incidencia', 'cobrado', 'pagado')
      GROUP BY c.inquilino_id, h.id, r.estado_cobro
      ORDER BY total_exceso DESC
    `, []);
    set({ deudaViva: rows });
  },

  loadRepartosDeudaInquilino: async (inquilinoId, habitacionId) => {
    const db = await getDb();
    const rows = await db.select<RepartoExtended[]>(`
      SELECT
        r.id, r.factura_id, r.contrato_id, r.dias_en_periodo, r.proporcion,
        r.importe_bruto, r.tope_aplicado, r.importe_neto, r.exceso, r.estado_cobro,
        f.tipo_suministro, f.periodo_inicio, f.periodo_fin,
        c.habitacion_id, c.inquilino_id, c.suministros_incluidos,
        h.nombre  AS habitacion_nombre, h.criterio_reparto,
        i.nombre  AS inquilino_nombre
      FROM repartos r
      JOIN facturas    f ON r.factura_id  = f.id
      JOIN contratos   c ON r.contrato_id = c.id
      JOIN habitaciones h ON c.habitacion_id = h.id
      JOIN inquilinos  i ON c.inquilino_id   = i.id
      WHERE c.inquilino_id = ? AND c.habitacion_id = ? AND r.exceso > 0
        AND r.estado_cobro IN ('pendiente', 'comunicado', 'incidencia')
      ORDER BY f.periodo_inicio DESC
    `, [inquilinoId, habitacionId]);
    return rows;
  },

  addPagoParcial: async (repartoId, fecha, importe, notas) => {
    const db = await getDb();
    const result = await db.execute(
      "INSERT INTO pagos_parciales (reparto_id, fecha, importe, notas) VALUES (?, ?, ?, ?)",
      [repartoId, fecha, importe, notas]
    );
    const rows = await db.select<PagoParcial[]>(
      "SELECT * FROM pagos_parciales WHERE id = ?",
      [result.lastInsertId]
    );
    await get().loadDeudaViva();
    return rows[0];
  },

  loadPagosParciales: async (repartoIds) => {
    if (repartoIds.length === 0) return [];
    const db = await getDb();
    const rows = await db.select<PagoParcial[]>(
      `SELECT * FROM pagos_parciales WHERE reparto_id IN (${repartoIds.join(",")}) ORDER BY fecha DESC`,
      []
    );
    return rows;
  },

  deletePagoParcial: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM pagos_parciales WHERE id = ?", [id]);
    await get().loadDeudaViva();
  },

  updatePagoParcialConfirmado: async (pagoId, confirmado) => {
    const db = await getDb();
    await db.execute(
      "UPDATE pagos_parciales SET confirmado = ? WHERE id = ?",
      [confirmado ? 1 : 0, pagoId]
    );
    // Refresh debt summary since payment validation might affect calculations
    await get().loadDeudaViva();
  },

  loadCorreosDeuda: async (inquilinoNombre) => {
    const db = await getDb();
    const rows = await db.select<Correo[]>(
      `SELECT * FROM correos WHERE destinatario_nombre LIKE ? ORDER BY created_at DESC`,
      [`%${inquilinoNombre}%`]
    );
    return rows;
  },
}));
