/**
 * Motor de cálculo de reparto — Fase 4 (Corregido)
 *
 * Algoritmo:
 *   Para cada factura:
 *     1. Identificar habitaciones activas en el período
 *     2. Calcular días de solapamiento para cada una
 *     3. Repartir la factura proporcionalmente por peso × días
 *     4. Aplicar tope (individual o global según modelo)
 *     5. Calcular exceso = max(0, bruto - tope)
 *     6. Neto = exceso (lo que paga el inquilino)
 */

import type { Factura, Habitacion, Contrato } from "./types";

export interface RepartoInput {
  factura_id: number;
  contrato_id: number | null;
  dias_en_periodo: number;
  proporcion: number;
  importe_bruto: number;
  tope_aplicado: number;
  importe_neto: number;
  exceso: number;
}

// ── Utilidades de fecha ───────────────────────────────────────────────────────

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a: string, b: string): number {
  const ms = parseDate(b).getTime() - parseDate(a).getTime();
  return Math.round(ms / 86400000) + 1; // inclusive
}

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Cálculo principal (CORREGIDO) ─────────────────────────────────────────────

/**
 * Calcula los repartos para una lista de facturas dado el estado actual de
 * habitaciones y contratos activos.
 *
 * @param facturas    Facturas del período (ya filtradas por inmueble y período)
 * @param habitaciones Habitaciones activas del inmueble
 * @param byHabitacion Contratos activos indexados por habitacion_id
 * @param suministrosImputables JSON string array of suministro types
 * @param gastos_vacantes_los_paga_propiedad Si true, gastos de habitaciones vacantes los paga la propiedad
 * @returns Array de objetos listos para insertar en la tabla `repartos`
 */
export function calcularReparto(
  facturas: Factura[],
  habitaciones: Habitacion[],
  byHabitacion: Record<number, Contrato>,
  suministrosImputables?: string,
  gastos_vacantes_los_paga_propiedad: boolean = true
): RepartoInput[] {
  // Parse suministros imputables
  let suministrosSet: Set<string> | null = null;
  if (suministrosImputables) {
    try {
      suministrosSet = new Set(JSON.parse(suministrosImputables));
    } catch {
      suministrosSet = null;
    }
  }

  // Filter facturas based on suministros imputables
  const facturasValidas = suministrosSet
    ? facturas.filter((f) => suministrosSet!.has(f.tipo_suministro))
    : facturas;

  // Número de tipos distintos de suministro (para dividir el tope)
  const tiposDistintos = new Set(facturasValidas.map((f) => f.tipo_suministro)).size;
  const numTipos = Math.max(1, tiposDistintos);

  const resultado: RepartoInput[] = [];

  for (const factura of facturasValidas) {
    // ── PASO 1: Identificar habitaciones activas en este período de factura ──
    const habitacionesActivas = habitaciones.map((hab) => {
      const contrato = byHabitacion[hab.id] ?? null;
      const isActive = contrato && (
        contrato.fecha_inicio <= factura.periodo_fin &&
        (contrato.fecha_fin ?? "2099-12-31") >= factura.periodo_inicio
      );

      if (!isActive) {
        return { hab, contrato: null, diasSol: 0, isActive: false };
      }

      // Calcular solapamiento
      const cFin = contrato.fecha_fin ?? "2099-12-31";
      const solInicio = maxDate(contrato.fecha_inicio, factura.periodo_inicio);
      const solFin = minDate(cFin, factura.periodo_fin);
      const diasSol = Math.max(0, daysBetween(solInicio, solFin));

      return { hab, contrato, diasSol, isActive: diasSol > 0 };
    }).filter((x) => x.isActive); // Solo activas con días > 0

    if (habitacionesActivas.length === 0) {
      // Si no hay habitaciones activas, la factura no se distribuye
      continue;
    }

    // ── PASO 1.5: Calcular días vacantes de cada habitación (si el flag está activo) ──
    let importeADistribuir = factura.importe;
    if (gastos_vacantes_los_paga_propiedad) {
      // Calcular período total de la factura
      const diasPeriodo = daysBetween(factura.periodo_inicio, factura.periodo_fin);

      // Calcular peso de habitaciones vacantes en este período
      let pesoVacantes = 0;
      for (const hab of habitaciones) {
        const contrato = byHabitacion[hab.id] ?? null;
        const isActive = contrato && (
          contrato.fecha_inicio <= factura.periodo_fin &&
          (contrato.fecha_fin ?? "2099-12-31") >= factura.periodo_inicio
        );

        if (!isActive) {
          // Habitación sin contrato = vacante todo el período
          pesoVacantes += hab.criterio_reparto * diasPeriodo;
        }
      }

      // Si hay habitaciones vacantes, ajustar el importe a distribuir
      // El costo de días vacantes lo paga la propiedad, no los inquilinos
      if (pesoVacantes > 0) {
        let totalPeso = 0;
        for (const { hab, diasSol } of habitacionesActivas) {
          totalPeso += hab.criterio_reparto * diasSol;
        }
        totalPeso += pesoVacantes;

        if (totalPeso > 0) {
          importeADistribuir = round2(factura.importe * (totalPeso - pesoVacantes) / totalPeso);
        }
      }
    }

    // ── PASO 2: Calcular peso total × días para proporción justa ──
    let totalPesoXDias = 0;
    for (const { hab, diasSol } of habitacionesActivas) {
      totalPesoXDias += hab.criterio_reparto * diasSol;
    }

    if (totalPesoXDias <= 0) continue;

    // ── PASO 3: Repartir factura entre habitaciones activas ──
    for (const { hab, contrato, diasSol } of habitacionesActivas) {
      const pesoXDias = hab.criterio_reparto * diasSol;
      const proporcion = pesoXDias / totalPesoXDias;
      const importeBruto = round2(importeADistribuir * proporcion);

      // ── PASO 4: Aplicar tope (individual por habitación) ──
      const topeMensual = contrato?.suministros_incluidos ?? 0;
      const topePeriodo = round2(topeMensual / numTipos * (diasSol / 30));

      const exceso = round2(Math.max(0, importeBruto - topePeriodo));
      const topeAplicado = round2(Math.min(importeBruto, topePeriodo));

      resultado.push({
        factura_id: factura.id,
        contrato_id: contrato?.id ?? null,
        dias_en_periodo: diasSol,
        proporcion: round2(proporcion),
        importe_bruto: importeBruto,
        tope_aplicado: topeAplicado,
        importe_neto: exceso,
        exceso,
      });
    }
  }

  return resultado;
}
