/**
 * Exportación a PDF — Fase 6
 * Genera un informe HTML y abre el diálogo de impresión del sistema
 * (el usuario puede "Imprimir → Guardar como PDF").
 */

import type { RepartoExtended } from "./types";

function fmt(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function periodoLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return `${meses[m - 1]} ${y}`;
}

export interface InformePDFData {
  inmueble_nombre: string;
  inmueble_direccion: string;
  periodo: string;  // YYYY-MM
  repartos: RepartoExtended[];
  total_facturado: number;
  total_cubierto: number;
  total_excesos: number;
}

export function generarInformePDF(data: InformePDFData): void {
  const { repartos, periodo } = data;

  const habNombres = [...new Set(repartos.map((r) => r.habitacion_nombre))];
  const tiposSuministro = [...new Set(repartos.map((r) => r.tipo_suministro))];

  // Cabecera de columnas
  const thStyle = `padding: 8px 12px; text-align: right; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #888; background: #f5f5f3; border-bottom: 1px solid #e0e0d8;`;
  const tdStyle = `padding: 8px 12px; text-align: right; font-size: 13px; border-bottom: 1px solid #eee; font-family: 'Courier New', monospace;`;
  const tdLabelStyle = `padding: 8px 12px; text-align: left; font-size: 13px; border-bottom: 1px solid #eee; font-weight: 500;`;

  const headerCols = habNombres.map((h) => {
    const r0 = repartos.find((r) => r.habitacion_nombre === h);
    return `<th style="${thStyle}">${r0?.inquilino_nombre ?? h}<br><span style="font-size:10px;font-weight:400;color:#aaa">${h}</span></th>`;
  }).join("");

  const filasSuministros = tiposSuministro.map((tipo) => {
    const celdas = habNombres.map((h) => {
      const r = repartos.find((x) => x.tipo_suministro === tipo && x.habitacion_nombre === h);
      return `<td style="${tdStyle}">${r ? fmt(r.importe_bruto) + "€" : "—"}</td>`;
    }).join("");
    return `<tr><td style="${tdLabelStyle}">${tipo}</td>${celdas}</tr>`;
  }).join("");

  const filaTotales = habNombres.map((h) => {
    const total = repartos.filter((r) => r.habitacion_nombre === h).reduce((s, r) => s + r.importe_bruto, 0);
    return `<td style="${tdStyle}; font-weight: 700; border-top: 2px solid #ccc;">${fmt(total)}€</td>`;
  }).join("");

  const filaTopes = habNombres.map((h) => {
    const tope = repartos.filter((r) => r.habitacion_nombre === h).reduce((s, r) => s + r.tope_aplicado, 0);
    return `<td style="${tdStyle}; color: #2a7a2a;">${tope > 0 ? `-${fmt(tope)}€` : "—"}</td>`;
  }).join("");

  const filaExcesos = habNombres.map((h) => {
    const exceso = repartos.filter((r) => r.habitacion_nombre === h).reduce((s, r) => s + r.exceso, 0);
    return `<td style="${tdStyle}; font-weight: 700; font-size: 14px; background: #fdf3f0; color: ${exceso > 0 ? "#c4421a" : "#aaa"};">${exceso > 0 ? fmt(exceso) + "€" : "—"}</td>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Liquidación — ${data.inmueble_nombre} — ${periodoLabel(periodo)}</title>
  <style>
    @media print { body { margin: 0; } }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a18; background: #fff; margin: 0; padding: 32px; }
    h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 4px; }
    .subtitle { font-size: 13px; color: #888; margin: 0 0 32px; }
    .kpi-grid { display: flex; gap: 1px; background: #e0e0d8; margin-bottom: 32px; }
    .kpi { background: #fff; padding: 16px 20px; flex: 1; }
    .kpi-label { font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #888; margin-bottom: 6px; }
    .kpi-value { font-size: 24px; font-weight: 500; font-family: 'Courier New', monospace; }
    .kpi-excess .kpi-value { color: #c4421a; }
    .section-label { font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #888; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; }
    .footer { margin-top: 40px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 16px; }
    .logo { font-size: 13px; font-weight: 700; color: #2C4A6E; letter-spacing: -0.01em; }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
    <div>
      <h1>${data.inmueble_nombre}</h1>
      <p class="subtitle">${data.inmueble_direccion} · Liquidación de suministros · ${periodoLabel(periodo)}</p>
    </div>
    <div class="logo">REPSUM</div>
  </div>

  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Total facturado</div>
      <div class="kpi-value">${fmt(data.total_facturado)}€</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Cubierto por contratos</div>
      <div class="kpi-value">${fmt(data.total_cubierto)}€</div>
    </div>
    <div class="kpi kpi-excess">
      <div class="kpi-label">Excesos a reclamar</div>
      <div class="kpi-value">${fmt(data.total_excesos)}€</div>
    </div>
  </div>

  <p class="section-label">Reparto por habitación</p>
  <table>
    <thead>
      <tr>
        <th style="${thStyle}; text-align:left;">Suministro</th>
        ${headerCols}
      </tr>
    </thead>
    <tbody>
      ${filasSuministros}
      <tr>
        <td style="${tdLabelStyle}; font-weight:700; border-top:2px solid #ccc;">Total bruto</td>
        ${filaTotales}
      </tr>
      <tr>
        <td style="${tdLabelStyle}; color:#2a7a2a;">Tope contrato</td>
        ${filaTopes}
      </tr>
      <tr>
        <td style="${tdLabelStyle}; background:#fdf3f0; font-weight:700; color:#c4421a;">Exceso</td>
        ${filaExcesos}
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <strong>REPSUM</strong> · Generado el ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
    · Datos 100% locales — sin conexión a servicios externos.
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}
