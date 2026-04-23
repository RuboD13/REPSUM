import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useFacturas } from "../../store/useFacturas";
import type { Inmueble } from "../../lib/types";

const TIPOS = ["luz", "agua", "gas", "internet", "comunidad", "otro"] as const;
type TipoSuministro = typeof TIPOS[number];

interface ExtractorResult {
  comercializadora: string | null;
  tipo_suministro: string | null;
  periodo_inicio: string | null;
  periodo_fin: string | null;
  importe: number | null;
  confianza: number;
  error: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  inmueble: Inmueble;
  filePath: string;
  extracted: ExtractorResult | null;
  isExtracting: boolean;
}

export const FacturaVerify: React.FC<Props> = ({
  open, onClose, inmueble, filePath, extracted, isExtracting,
}) => {
  const { save } = useFacturas();

  const [tipo, setTipo] = useState<TipoSuministro>("luz");
  const [comercializadora, setComercializadora] = useState("");
  const [periodoIni, setPeriodoIni] = useState("");
  const [periodoFin, setPeriodoFin] = useState("");
  const [importe, setImporte] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && extracted) {
      setTipo((extracted.tipo_suministro as TipoSuministro) ?? "otro");
      setComercializadora(extracted.comercializadora ?? "");
      setPeriodoIni(extracted.periodo_inicio ?? "");
      setPeriodoFin(extracted.periodo_fin ?? "");
      setImporte(extracted.importe != null ? String(extracted.importe) : "");
      setErrors({});
    } else if (open && !extracted) {
      setTipo("luz");
      setComercializadora("");
      setPeriodoIni("");
      setPeriodoFin("");
      setImporte("");
      setErrors({});
    }
  }, [open, extracted]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!periodoIni) e.periodoIni = "Obligatorio";
    if (!periodoFin) e.periodoFin = "Obligatorio";
    const imp = parseFloat(importe);
    if (isNaN(imp) || imp <= 0) e.importe = "Introduce un importe válido";
    return e;
  };

  const handleGuardar = async (verificada: boolean) => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await save({
        inmueble_id: inmueble.id,
        tipo_suministro: tipo as any,
        comercializadora: comercializadora.trim() || null,
        periodo_inicio: periodoIni,
        periodo_fin: periodoFin,
        importe: parseFloat(importe),
        archivo_original: filePath || null,
        datos_extraidos: extracted ? JSON.stringify(extracted) : null,
        verificada: verificada ? 1 : 0,
        estado_edicion: verificada ? "bloqueado" : "revisar",
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const fileName = filePath ? filePath.split(/[/\\]/).pop() : "—";
  const confianza = extracted?.confianza ?? 0;

  const isImage = filePath && /\.(jpe?g|png|tiff?|bmp|webp)$/i.test(filePath);
  const isPdf = filePath && /\.pdf$/i.test(filePath);

  return (
    <Modal open={open} onClose={onClose} title={`Verificar factura — ${inmueble.nombre}`} width={980}>
      {isExtracting ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
          Extrayendo datos del documento...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", height: "600px" }}>
          {/* Columna izquierda: Formulario */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto", paddingRight: "16px" }}>

          {/* Archivo */}
          <div style={{ background: "var(--bg-secondary)", padding: "10px 14px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <strong style={{ fontFamily: "var(--font-heading)" }}>Archivo:</strong> {fileName}
            {extracted?.error && (
              <div style={{ color: "var(--status-pending)", marginTop: "4px" }}>
                ⚠ {extracted.error}
              </div>
            )}
            {extracted && !extracted.error && (
              <div style={{ marginTop: "4px" }}>
                Confianza OCR:{" "}
                <span style={{ fontFamily: "var(--font-display)", color: confianza >= 0.7 ? "var(--status-ok)" : confianza >= 0.4 ? "var(--status-pending)" : "var(--status-excess)" }}>
                  {Math.round(confianza * 100)}%
                </span>
                {" · "}Revisa y corrige los campos antes de guardar.
              </div>
            )}
          </div>

          {/* Tipo de suministro */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label className="label-section">Tipo de suministro</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", paddingTop: "4px" }}>
              {TIPOS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "12px",
                    fontWeight: tipo === t ? 600 : 400,
                    padding: "4px 12px",
                    border: tipo === t ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: tipo === t ? "var(--accent-subtle)" : "transparent",
                    color: tipo === t ? "var(--accent)" : "var(--text-secondary)",
                    borderRadius: "2px",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Comercializadora"
            value={comercializadora}
            onChange={(e) => setComercializadora(e.target.value)}
            placeholder="Endesa, Naturgy, Canal de Isabel II..."
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <Input
                label="Periodo inicio"
                type="date"
                value={periodoIni}
                onChange={(e) => { setPeriodoIni(e.target.value); setErrors((p) => ({ ...p, periodoIni: "" })); }}
              />
              {errors.periodoIni && <Err msg={errors.periodoIni} />}
            </div>
            <div>
              <Input
                label="Periodo fin"
                type="date"
                value={periodoFin}
                onChange={(e) => { setPeriodoFin(e.target.value); setErrors((p) => ({ ...p, periodoFin: "" })); }}
              />
              {errors.periodoFin && <Err msg={errors.periodoFin} />}
            </div>
          </div>

          <div>
            <Input
              label="Importe total (€)"
              type="number"
              min="0"
              step="0.01"
              value={importe}
              onChange={(e) => { setImporte(e.target.value); setErrors((p) => ({ ...p, importe: "" })); }}
              placeholder="0.00"
            />
            {errors.importe && <Err msg={errors.importe} />}
          </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
              <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button variant="secondary" onClick={() => handleGuardar(false)} disabled={saving}>
                Guardar sin verificar
              </Button>
              <Button variant="primary" onClick={() => handleGuardar(true)} disabled={saving}>
                {saving ? "Guardando..." : "✓ Verificada — Guardar"}
              </Button>
            </div>
          </div>

          {/* Columna derecha: Vista previa del documento */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              background: "var(--bg-secondary)",
              padding: "12px",
              overflow: "hidden",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)" }}>
              Previsualización
            </div>

            {filePath ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--bg-inset)",
                  borderRadius: "2px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {isImage ? (
                  <img
                    src={`file://${filePath}`}
                    alt="Document preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : isPdf ? (
                  <embed
                    src={`file://${filePath}`}
                    type="application/pdf"
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-body)",
                      fontSize: "12px",
                      padding: "16px",
                    }}
                  >
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>📄</div>
                    <div>
                      {filePath.split(/[/\\]/).pop()}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-body)",
                  fontSize: "12px",
                  fontStyle: "italic",
                }}
              >
                Sin documento
              </div>
            )}

            {extracted?.error && (
              <div
                style={{
                  padding: "8px 10px",
                  background: "var(--status-pending-bg)",
                  border: "1px solid var(--status-pending)",
                  borderRadius: "2px",
                  fontSize: "11px",
                  color: "var(--status-pending)",
                }}
              >
                ⚠ Error de extracción: {extracted.error}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

const Err: React.FC<{ msg: string }> = ({ msg }) => (
  <span style={{ fontSize: "11px", color: "var(--status-excess)", marginTop: "2px", display: "block" }}>{msg}</span>
);
