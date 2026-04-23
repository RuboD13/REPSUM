import React, { useState, useCallback } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { FacturaVerify } from "./FacturaVerify";
import type { Inmueble } from "../../lib/types";

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
  inmueble: Inmueble;
  /** Callback cuando se guarda una factura correctamente */
  onSaved?: () => void;
}

export const FacturaImport: React.FC<Props> = ({ inmueble, onSaved }) => {
  const [dragging, setDragging] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [filePath, setFilePath] = useState("");
  const [extracted, setExtracted] = useState<ExtractorResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Escuchar eventos de drag-drop nativos de Tauri
  React.useEffect(() => {
    let unlisten: (() => void) | null = null;
    const appWindow = getCurrentWindow();

    appWindow.onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setDragging(true);
      } else if (event.payload.type === "drop") {
        setDragging(false);
        const paths = event.payload.paths ?? [];
        const valid = paths.filter((p) =>
          /\.(pdf|jpe?g|png|tiff?|bmp|webp)$/i.test(p)
        );
        if (valid.length > 0) {
          handleFile(valid[0]);
        }
      } else {
        setDragging(false);
      }
    }).then((fn) => { unlisten = fn; });

    return () => { unlisten?.(); };
  }, []);

  const handleFile = useCallback(async (path: string) => {
    setFilePath(path);
    setExtracted(null);
    setIsExtracting(true);
    setVerifyOpen(true);
    try {
      const result = await invoke<ExtractorResult>("extract_factura", { path });
      setExtracted(result);
    } catch (e) {
      setExtracted({
        comercializadora: null, tipo_suministro: null,
        periodo_inicio: null, periodo_fin: null,
        importe: null, confianza: 0,
        error: String(e),
      });
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const handlePickFile = async () => {
    const selected = await openDialog({
      multiple: false,
      filters: [
        { name: "Facturas", extensions: ["pdf", "jpg", "jpeg", "png", "tiff", "bmp"] },
      ],
    });
    if (selected && typeof selected === "string") {
      handleFile(selected);
    }
  };

  return (
    <>
      {/* Zona de drop */}
      <div
        onClick={handlePickFile}
        style={{
          marginTop: "12px",
          padding: "12px 16px",
          border: dragging
            ? "2px solid var(--accent)"
            : "1px dashed var(--border)",
          background: dragging ? "var(--accent-subtle)" : "transparent",
          textAlign: "center",
          fontSize: "12px",
          color: dragging ? "var(--accent)" : "var(--text-tertiary)",
          cursor: "pointer",
          transition: "all 0.15s",
          animation: dragging ? "dropzone-pulse 0.8s ease infinite" : "none",
        }}
        onMouseEnter={(e) => {
          if (!dragging) {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "var(--accent)";
            el.style.background = "var(--accent-subtle)";
            el.style.color = "var(--accent)";
          }
        }}
        onMouseLeave={(e) => {
          if (!dragging) {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "var(--border)";
            el.style.background = "transparent";
            el.style.color = "var(--text-tertiary)";
          }
        }}
      >
        {dragging
          ? "Suelta aquí para importar"
          : "+ Importar factura · Clic o arrastra PDF/imagen aquí"}
      </div>

      <style>{`
        @keyframes dropzone-pulse {
          0%, 100% { border-color: var(--accent); opacity: 1; }
          50%       { border-color: var(--accent); opacity: 0.6; }
        }
      `}</style>

      {/* Modal de verificación */}
      <FacturaVerify
        open={verifyOpen}
        onClose={() => {
          setVerifyOpen(false);
          onSaved?.();
        }}
        inmueble={inmueble}
        filePath={filePath}
        extracted={extracted}
        isExtracting={isExtracting}
      />
    </>
  );
};
