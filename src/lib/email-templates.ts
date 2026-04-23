/**
 * Plantillas de correo — Fase 5
 * 5 modelos para propietario (P1–P5) y 5 para inquilino (I1–I5).
 */

import type { RepartoExtended } from "./types";

// ── Tipos de variables ────────────────────────────────────────────────────────

export interface PropietarioVars {
  inmueble_nombre: string;
  inmueble_direccion: string;
  periodo: string;           // "Marzo 2026"
  periodo_inicio: string;
  periodo_fin: string;
  mes_anterior: string;
  tabla_resumen: string;
  tabla_reparto: string;
  tabla_comparativa: string;
  estado_ocupacion: string;
  desglose_habitaciones: string;
  desglose_facturas: string;
  total_facturado: string;
  total_excesos: string;
  total_cubierto: string;
}

export interface InquilinoVars {
  inquilino_nombre: string;
  inmueble_nombre: string;
  inmueble_direccion: string;
  habitacion_nombre: string;
  periodo: string;
  tope: string;
  tope_periodo: string;
  importe_bruto: string;
  exceso: string;
  dias: string;
  tabla_suministros: string;
  tabla_detalle: string;
}

export interface CorreoGenerado {
  asunto: string;
  cuerpo: string;
  plantilla_usada: string;
}

// ── Helpers de formato ────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function periodoLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return `${meses[m - 1]} ${y}`;
}

function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Construcción de variables ─────────────────────────────────────────────────

export interface CorreoContext {
  inmueble_nombre: string;
  inmueble_direccion: string;
  periodo: string;          // YYYY-MM
  repartos: RepartoExtended[];
  // Para inquilino: filtrar solo los repartos del inquilino específico
  inquilino_nombre?: string;
  habitacion_nombre?: string;
}

export function buildPropietarioVars(ctx: CorreoContext): PropietarioVars {
  const { repartos, periodo } = ctx;

  // Agrupaciones útiles
  const habNombres = [...new Set(repartos.map((r) => r.habitacion_nombre))];
  const tiposSuministro = [...new Set(repartos.map((r) => r.tipo_suministro))];

  // Tabla resumen: suministro | importe_total | periodo
  const porTipo: Record<string, { bruto: number; inicio: string; fin: string }> = {};
  for (const r of repartos) {
    if (!porTipo[r.tipo_suministro]) {
      porTipo[r.tipo_suministro] = { bruto: 0, inicio: r.periodo_inicio, fin: r.periodo_fin };
    }
    porTipo[r.tipo_suministro].bruto += r.importe_bruto;
  }
  const tablaResumen = tiposSuministro.map((t) => {
    const row = porTipo[t];
    return `  ${t.padEnd(12)} ${fmt(row.bruto).padStart(9)}€   ${row.inicio} – ${row.fin}`;
  }).join("\n");

  // Tabla reparto completa (habitaciones × suministros)
  const headerHabs = habNombres.map((h) => h.slice(0, 14).padEnd(14)).join("  ");
  let tablaReparto = `  ${"Suministro".padEnd(12)}  ${headerHabs}\n`;
  tablaReparto += "  " + "─".repeat(12 + habNombres.length * 16) + "\n";
  for (const tipo of tiposSuministro) {
    const row = habNombres.map((hab) => {
      const r = repartos.find((x) => x.tipo_suministro === tipo && x.habitacion_nombre === hab);
      return r ? fmt(r.importe_bruto).padStart(10) + "€" : "          —".padEnd(11);
    }).join("  ");
    tablaReparto += `  ${tipo.padEnd(12)}  ${row}\n`;
  }
  tablaReparto += "  " + "─".repeat(12 + habNombres.length * 16) + "\n";
  const totalesRow = habNombres.map((hab) => {
    const total = repartos.filter((r) => r.habitacion_nombre === hab).reduce((s, r) => s + r.importe_bruto, 0);
    return fmt(total).padStart(10) + "€";
  }).join("  ");
  tablaReparto += `  ${"TOTAL".padEnd(12)}  ${totalesRow}`;

  // Tabla comparativa simplificada (sin datos de mes anterior reales)
  const tablaComparativa = tiposSuministro.map((t) => {
    const row = porTipo[t];
    return `  ${t.padEnd(12)} ${fmt(row.bruto).padStart(9)}€   —           —`;
  }).join("\n");

  // Estado de ocupación
  const estadoOcupacion = habNombres.map((h) => {
    const r = repartos.find((x) => x.habitacion_nombre === h);
    if (!r) return `  · ${h}: Vacía`;
    return `  · ${h}: ${r.inquilino_nombre}\n    Días ocupados: ${r.dias_en_periodo} · Tope: ${fmt(r.suministros_incluidos)}€/mes`;
  }).join("\n");

  // Desglose por habitación (para P1)
  const desgloseHabitaciones = habNombres.map((h) => {
    const rs = repartos.filter((r) => r.habitacion_nombre === h);
    if (rs.length === 0) return `  · ${h}: Sin reparto`;
    const r0 = rs[0];
    const totalBruto = rs.reduce((s, r) => s + r.importe_bruto, 0);
    const totalTope = rs.reduce((s, r) => s + r.tope_aplicado, 0);
    const totalExceso = rs.reduce((s, r) => s + r.exceso, 0);
    return `  · ${h} (${r0.inquilino_nombre}):\n    Parte proporcional: ${fmt(totalBruto)}€ · Tope contrato: ${fmt(totalTope)}€ · Exceso a reclamar: ${fmt(totalExceso)}€`;
  }).join("\n");

  // Desglose por factura (para P2)
  const desgloseFacturas = tiposSuministro.map((tipo) => {
    const rs = repartos.filter((r) => r.tipo_suministro === tipo);
    if (rs.length === 0) return "";
    const r0 = rs[0];
    const total = rs.reduce((s, r) => s + r.importe_bruto, 0);
    const lineas = rs.map((r) =>
      `      – ${r.inquilino_nombre}: tope ${fmt(r.suministros_incluidos)}€/mes · parte ${fmt(r.importe_bruto)}€ → exceso ${fmt(r.exceso)}€`
    ).join("\n");
    return `  ${tipo.toUpperCase()}:\n    Importe: ${fmt(total)}€ · Periodo: ${r0.periodo_inicio} – ${r0.periodo_fin}\n${lineas}`;
  }).join("\n");

  const totalFacturado = repartos.reduce((s, r) => s + r.importe_bruto, 0);
  const totalExcesos = repartos.reduce((s, r) => s + r.exceso, 0);
  const totalCubierto = repartos.reduce((s, r) => s + r.tope_aplicado, 0);

  // Periodo inicio/fin estimado a partir de los repartos
  const inicios = repartos.map((r) => r.periodo_inicio).sort();
  const fines = repartos.map((r) => r.periodo_fin).sort();

  return {
    inmueble_nombre: ctx.inmueble_nombre,
    inmueble_direccion: ctx.inmueble_direccion,
    periodo: periodoLabel(periodo),
    periodo_inicio: inicios[0] ?? `${periodo}-01`,
    periodo_fin: fines[fines.length - 1] ?? `${periodo}-30`,
    mes_anterior: periodoLabel(addMonths(periodo, -1)),
    tabla_resumen: tablaResumen,
    tabla_reparto: tablaReparto,
    tabla_comparativa: tablaComparativa,
    estado_ocupacion: estadoOcupacion,
    desglose_habitaciones: desgloseHabitaciones,
    desglose_facturas: desgloseFacturas,
    total_facturado: fmt(totalFacturado),
    total_excesos: fmt(totalExcesos),
    total_cubierto: fmt(totalCubierto),
  };
}

export function buildInquilinoVars(
  ctx: CorreoContext,
  inquilinoNombre: string,
  habitacionNombre: string
): InquilinoVars {
  const { repartos, periodo } = ctx;
  const rs = repartos.filter(
    (r) => r.inquilino_nombre === inquilinoNombre && r.habitacion_nombre === habitacionNombre
  );
  const r0 = rs[0];

  const totalBruto = rs.reduce((s, r) => s + r.importe_bruto, 0);
  const totalExceso = rs.reduce((s, r) => s + r.exceso, 0);
  const totalTope = rs.reduce((s, r) => s + r.tope_aplicado, 0);
  const diasOcupados = r0?.dias_en_periodo ?? 30;
  const topeMensual = r0?.suministros_incluidos ?? 0;

  // Tabla suministros
  const tablaSuministros = rs.map((r) =>
    `  ${r.tipo_suministro.padEnd(12)} ${fmt(r.importe_bruto).padStart(9)}€`
  ).join("\n");

  // Tabla detallada (para I5)
  const tablaDetalle = rs.map((r) =>
    `  ${r.tipo_suministro.padEnd(12)} ${fmt(r.importe_bruto).padStart(9)}€   ${fmt(r.tope_aplicado).padStart(9)}€   ${fmt(r.exceso).padStart(9)}€`
  ).join("\n");

  return {
    inquilino_nombre: inquilinoNombre,
    inmueble_nombre: ctx.inmueble_nombre,
    inmueble_direccion: ctx.inmueble_direccion,
    habitacion_nombre: habitacionNombre,
    periodo: periodoLabel(periodo),
    tope: fmt(topeMensual),
    tope_periodo: fmt(totalTope),
    importe_bruto: fmt(totalBruto),
    exceso: fmt(totalExceso),
    dias: String(diasOcupados),
    tabla_suministros: tablaSuministros,
    tabla_detalle: tablaDetalle,
  };
}

// ── Plantillas propietario ────────────────────────────────────────────────────

export const PLANTILLAS_PROPIETARIO: Array<{
  id: string;
  nombre: string;
  generar: (v: PropietarioVars) => CorreoGenerado;
}> = [
  {
    id: "P1",
    nombre: "Resumen ejecutivo",
    generar: (v) => ({
      plantilla_usada: "P1",
      asunto: `Informe de suministros — ${v.inmueble_nombre} — ${v.periodo}`,
      cuerpo: `Estimado/a propietario/a,

Le remito el desglose de suministros correspondiente al periodo ${v.periodo_inicio} – ${v.periodo_fin} del inmueble sito en ${v.inmueble_direccion}.

RESUMEN DE SUMINISTROS:
${v.tabla_resumen}

  Total facturado: ${v.total_facturado}€
  Cubierto por contratos: ${v.total_cubierto}€
  Excesos a reclamar: ${v.total_excesos}€

DESGLOSE POR HABITACIÓN:
${v.desglose_habitaciones}

Importe total a reclamar a inquilinos: ${v.total_excesos}€

Quedo a su disposición para cualquier aclaración.

Un cordial saludo.`,
    }),
  },
  {
    id: "P2",
    nombre: "Detalle analítico",
    generar: (v) => ({
      plantilla_usada: "P2",
      asunto: `Desglose detallado de consumos — ${v.inmueble_nombre}`,
      cuerpo: `Estimado/a propietario/a,

A continuación encontrará el análisis detallado de los suministros de su inmueble en ${v.inmueble_direccion} para el periodo comprendido entre ${v.periodo_inicio} y ${v.periodo_fin}.

ANÁLISIS POR SUMINISTRO:
${v.desglose_facturas}

TABLA DE REPARTO:
${v.tabla_reparto}

RESUMEN ECONÓMICO:
  · Total facturado: ${v.total_facturado}€
  · Cubierto por topes de contrato: ${v.total_cubierto}€
  · Excesos reclamables: ${v.total_excesos}€

Reciba un cordial saludo.`,
    }),
  },
  {
    id: "P3",
    nombre: "Comparativo mensual",
    generar: (v) => ({
      plantilla_usada: "P3",
      asunto: `Suministros ${v.periodo} vs ${v.mes_anterior} — ${v.inmueble_nombre}`,
      cuerpo: `Estimado/a propietario/a,

Le comparto la información de suministros de ${v.inmueble_nombre} con una comparativa respecto al periodo anterior.

COMPARATIVA ${v.mes_anterior} → ${v.periodo}:
  Concepto           Mes anterior   Mes actual    Variación
  ─────────────────────────────────────────────────────────
${v.tabla_comparativa}

REPARTO ACTUAL:
${v.tabla_reparto}

  Total del periodo: ${v.total_facturado}€
  Excesos a reclamar: ${v.total_excesos}€

Un saludo.`,
    }),
  },
  {
    id: "P4",
    nombre: "Informe con ocupación",
    generar: (v) => ({
      plantilla_usada: "P4",
      asunto: `Gastos y ocupación — ${v.inmueble_nombre} — ${v.periodo}`,
      cuerpo: `Estimado/a propietario/a,

Le informo sobre los suministros del inmueble ${v.inmueble_direccion} teniendo en cuenta la situación de ocupación durante este periodo.

ESTADO DE OCUPACIÓN (${v.periodo}):
${v.estado_ocupacion}

DISTRIBUCIÓN DE GASTOS:
${v.tabla_reparto}

  · Total facturado: ${v.total_facturado}€
  · Cubierto por contratos: ${v.total_cubierto}€
  · Exceso total: ${v.total_excesos}€

El reparto se ha realizado ponderando los días de ocupación efectiva en el período de cada factura.

Quedo a su disposición.`,
    }),
  },
  {
    id: "P5",
    nombre: "Formato tabla limpia",
    generar: (v) => ({
      plantilla_usada: "P5",
      asunto: `Liquidación de suministros — ${v.inmueble_nombre} — ${v.periodo}`,
      cuerpo: `Adjunto la liquidación de suministros del periodo ${v.periodo}:

┌──────────────────────────────────────────────┐
│ INMUEBLE: ${v.inmueble_nombre.padEnd(34)} │
│ PERIODO:  ${(v.periodo_inicio + " – " + v.periodo_fin).padEnd(34)} │
└──────────────────────────────────────────────┘

SUMINISTROS:
${v.tabla_resumen}

REPARTO POR HABITACIÓN:
${v.tabla_reparto}

─────────────────────────────────────────────
  Total facturado:       ${v.total_facturado}€
  Cubierto (contratos):  ${v.total_cubierto}€
  Excesos a reclamar:    ${v.total_excesos}€
─────────────────────────────────────────────`,
    }),
  },
];

// ── Plantillas inquilino ──────────────────────────────────────────────────────

export const PLANTILLAS_INQUILINO: Array<{
  id: string;
  nombre: string;
  generar: (v: InquilinoVars) => CorreoGenerado;
}> = [
  {
    id: "I1",
    nombre: "Cordial informativo",
    generar: (v) => ({
      plantilla_usada: "I1",
      asunto: `Información sobre suministros — ${v.inmueble_nombre}`,
      cuerpo: `Hola ${v.inquilino_nombre},

Espero que te encuentres bien. Te escribo para compartirte la información relativa a los suministros del piso durante el periodo ${v.periodo}.

Tu contrato incluye hasta ${v.tope}€ mensuales en concepto de suministros. Este periodo, el desglose ha sido el siguiente:

${v.tabla_suministros}

  Tu parte proporcional: ${v.importe_bruto}€
  Incluido en contrato (tope): ${v.tope_periodo}€
  Diferencia a abonar: ${v.exceso}€

Te agradeceríamos que pudieras abonar esta diferencia de ${v.exceso}€ a la mayor brevedad.

Muchas gracias por tu comprensión. Cualquier duda, no dudes en consultarnos.

Un saludo.`,
    }),
  },
  {
    id: "I2",
    nombre: "Directo y transparente",
    generar: (v) => ({
      plantilla_usada: "I2",
      asunto: `Ajuste de suministros — ${v.periodo}`,
      cuerpo: `Buenos días, ${v.inquilino_nombre}:

Te informo del ajuste de suministros correspondiente a ${v.periodo} en ${v.inmueble_direccion}.

DETALLE:
${v.tabla_suministros}

  Tu parte proporcional: ${v.importe_bruto}€
  Suministros incluidos en tu contrato: ${v.tope_periodo}€
  Importe pendiente: ${v.exceso}€

Por favor, procede con el abono cuando puedas.

Gracias. Un saludo.`,
    }),
  },
  {
    id: "I3",
    nombre: "Con contexto educativo",
    generar: (v) => ({
      plantilla_usada: "I3",
      asunto: `Detalle de consumos del piso — ${v.periodo}`,
      cuerpo: `Hola ${v.inquilino_nombre},

Te escribo con el detalle de los suministros de ${v.inmueble_nombre} para el periodo ${v.periodo}.

¿Cómo funciona el reparto?
El coste total de cada suministro se divide entre las habitaciones ocupadas del piso. Como tu contrato incluye ${v.tope}€/mes en suministros, solo se te requiere la diferencia cuando el consumo supera ese tope.

TU PARTE EN ${v.periodo}:
${v.tabla_suministros}

  Parte proporcional total: ${v.importe_bruto}€
  Cubierto por contrato: ${v.tope_periodo}€
  Pendiente de abonar: ${v.exceso}€

Ocupación considerada: ${v.dias} días en este periodo.

Gracias por tu comprensión. Cualquier pregunta, estoy disponible.

Un saludo.`,
    }),
  },
  {
    id: "I4",
    nombre: "Breve y amable",
    generar: (v) => ({
      plantilla_usada: "I4",
      asunto: `Suministros ${v.periodo} — ${v.inmueble_nombre}`,
      cuerpo: `Hola ${v.inquilino_nombre},

Te paso los datos de suministros de ${v.periodo}:

${v.tabla_suministros}

  Incluido en contrato: ${v.tope_periodo}€
  Diferencia: ${v.exceso}€

El consumo de este periodo ha superado el tope incluido en tu contrato. La diferencia de ${v.exceso}€ quedaría pendiente de regularización.

Gracias, un saludo.`,
    }),
  },
  {
    id: "I5",
    nombre: "Detallado con comparativa",
    generar: (v) => ({
      plantilla_usada: "I5",
      asunto: `Consumos y ajuste de suministros — ${v.periodo}`,
      cuerpo: `Estimado/a ${v.inquilino_nombre},

Te adjunto la información completa sobre los suministros de tu vivienda en ${v.inmueble_direccion} correspondientes al periodo ${v.periodo}.

DESGLOSE COMPLETO:
  Suministro        Tu parte    Tope contrato   Exceso
  ────────────────────────────────────────────────────
${v.tabla_detalle}
  ────────────────────────────────────────────────────

RESUMEN:
  · Suministros incluidos (contrato): ${v.tope_periodo}€
  · Ajuste resultante: ${v.exceso}€

El importe de ${v.exceso}€ puede abonarse por transferencia a la cuenta habitual.

Quedo a tu disposición para cualquier consulta.

Un cordial saludo.`,
    }),
  },
];
