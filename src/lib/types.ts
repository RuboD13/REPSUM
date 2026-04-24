// Tipos que mapean 1:1 con las tablas SQLite

export interface Inmueble {
  id: number;
  nombre: string;
  direccion: string;
  num_habitaciones: number;
  notas: string | null;
  foto_url: string | null;
  suministros_imputables: string;
  modelo_reparto: "por_habitacion" | "por_tope_casa";
  tope_global: number | null;
  gastos_vacantes_los_paga_propiedad?: boolean;
  created_at: string;
}

export interface Habitacion {
  id: number;
  inmueble_id: number;
  nombre: string;
  criterio_reparto: number;
  activa: number;
  foto_url: string | null;
  superficie: number | null;
  descripcion: string | null;
}

export interface Inquilino {
  id: number;
  nombre: string;
  email: string | null;
}

export interface Contrato {
  id: number;
  habitacion_id: number;
  inquilino_id: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  suministros_incluidos: number;
  notas: string | null;
  // JOIN fields (opcionales, cargados junto al contrato)
  inquilino_nombre?: string;
  inquilino_email?: string;
}

export interface Factura {
  id: number;
  inmueble_id: number;
  tipo_suministro: "luz" | "agua" | "gas" | "internet" | "comunidad" | "otro";
  comercializadora: string | null;
  periodo_inicio: string;
  periodo_fin: string;
  importe: number;
  archivo_original: string | null;
  datos_extraidos: string | null;
  verificada: number;
  estado_edicion: "bloqueado" | "revisar" | "editado";
  created_at: string;
}

export type EstadoCobro = "pendiente" | "comunicado" | "cobrado" | "pagado" | "incidencia";

export interface Reparto {
  id: number;
  factura_id: number;
  contrato_id: number;
  dias_en_periodo: number;
  proporcion: number;
  importe_bruto: number;
  tope_aplicado: number;
  importe_neto: number;
  exceso: number;
  estado_cobro: EstadoCobro;
}

/** Reparto con campos JOIN para mostrar en tabla */
export interface RepartoExtended extends Reparto {
  tipo_suministro: string;
  periodo_inicio: string;
  periodo_fin: string;
  habitacion_id: number;
  habitacion_nombre: string;
  inquilino_id: number;
  inquilino_nombre: string;
  suministros_incluidos: number;
  criterio_reparto: number;
}

export interface PagoParcial {
  id: number;
  reparto_id: number;
  fecha: string;
  importe: number;
  notas: string | null;
  confirmado: boolean;
  created_at: string;
}

export interface Correo {
  id: number;
  reparto_ids: string;
  destinatario_tipo: "propietario" | "inquilino";
  destinatario_nombre: string | null;
  asunto: string;
  cuerpo: string;
  plantilla_usada: string | null;
  enviado: number;
  created_at: string;
}
