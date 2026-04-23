import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../ui/Button";
import { useInmuebles } from "../../store/useInmuebles";
import { useHabitaciones } from "../../store/useHabitaciones";
import { useInquilinos } from "../../store/useInquilinos";
import { useContratos } from "../../store/useContratos";
import { InmuebleCard } from "./InmuebleCard";
import { InmuebleConfigModal } from "./InmuebleConfigModal";
import { InmuebleModal } from "./InmuebleModal";
import { InquilinoModal } from "./InquilinoModal";
import { ContratoModal } from "./ContratoModal";
import type { Inmueble, Habitacion, Inquilino, Contrato } from "../../lib/types";

export const InmueblesView: React.FC = () => {
  const { inmuebles, load: loadInm, remove: removeInm } = useInmuebles();
  const { byInmueble, load: loadHabs } = useHabitaciones();
  const { inquilinos, load: loadInqs } = useInquilinos();
  const { byHabitacion, loadForInmueble } = useContratos();

  // Modales
  const [inmModal, setInmModal] = useState<{ open: boolean; editing?: Inmueble }>({
    open: false,
  });
  const [inqModal, setInqModal] = useState<{ open: boolean; editing?: Inquilino }>({
    open: false,
  });
  const [contratoModal, setContratoModal] = useState<{
    open: boolean;
    habitacion?: Habitacion;
    editing?: Contrato;
    modeloReparto?: "por_habitacion" | "por_tope_casa";
  }>({ open: false });
  const [configModal, setConfigModal] = useState<{
    open: boolean;
    inmuebleId?: number;
  }>({ open: false });

  // Backup
  const [backupStatus, setBackupStatus] = useState<{
    msg: string;
    ok: boolean;
  } | null>(null);

  const handleBackup = async () => {
    setBackupStatus(null);
    try {
      const path = await invoke<string>("backup_db");
      setBackupStatus({
        msg: `Copia guardada en: ${path}`,
        ok: true,
      });
    } catch (e) {
      setBackupStatus({ msg: String(e), ok: false });
    }
    setTimeout(() => setBackupStatus(null), 8000);
  };

  // Actualizaciones
  const [updateStatus, setUpdateStatus] = useState<{
    msg: string;
    ok: boolean;
  } | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const info = await invoke<{
        available: boolean;
        version?: string;
        body?: string;
      }>("check_for_updates");
      if (info.available) {
        setUpdateStatus({
          msg: `Nueva versión disponible: ${info.version}. ${info.body ?? ""}`,
          ok: true,
        });
      } else {
        setUpdateStatus({
          msg: "Ya tienes la versión más reciente.",
          ok: true,
        });
      }
    } catch (e) {
      setUpdateStatus({ msg: String(e), ok: false });
    }
    setCheckingUpdate(false);
    setTimeout(() => setUpdateStatus(null), 8000);
  };

  // Carga inicial
  useEffect(() => {
    loadInm();
    loadInqs();
  }, []);

  // Cargar habitaciones y contratos cuando se abre un inmueble config modal
  useEffect(() => {
    if (configModal.inmuebleId) {
      loadHabs(configModal.inmuebleId);
      loadForInmueble(configModal.inmuebleId);
    }
  }, [configModal.inmuebleId]);

  const handleDeleteInm = async (inm: Inmueble) => {
    if (
      !confirm(
        `¿Eliminar "${inm.nombre}"? Se eliminarán todas sus habitaciones y facturas.`
      )
    )
      return;
    await removeInm(inm.id);
  };


  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: "24px",
        background: "var(--bg-primary)",
      }}
    >
      {/* HEADER: INMUEBLES */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <span style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.01em" }}>
          INMUEBLES
        </span>
        <Button
          variant="secondary"
          onClick={() => setInmModal({ open: true })}
          style={{ fontSize: "12px", padding: "6px 12px" }}
        >
          + Nuevo inmueble
        </Button>
      </div>

      {/* TARJETAS DE INMUEBLES */}
      {inmuebles.length === 0 ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            fontStyle: "italic",
          }}
        >
          No hay inmuebles aún. Crea el primero con el botón + Nuevo inmueble.
        </div>
      ) : (
        <div style={{ marginBottom: "40px" }}>
          {inmuebles.map((inm) => {
            const habs = byInmueble[inm.id] ?? [];
            const activas = habs.filter((h) => h.activa);

            return (
              <InmuebleCard
                key={inm.id}
                nombre={inm.nombre}
                direccion={inm.direccion}
                foto_url={inm.foto_url}
                habitaciones={activas}
                byHabitacion={byHabitacion}
                modeloReparto={inm.modelo_reparto}
                onConfiguracion={() =>
                  setConfigModal({ open: true, inmuebleId: inm.id })
                }
                onEliminar={() => handleDeleteInm(inm)}
                onAsignarInquilino={(hab) =>
                  setContratoModal({ open: true, habitacion: hab, modeloReparto: inm.modelo_reparto })
                }
                onEditarContrato={(hab, contrato, modeloReparto) =>
                  setContratoModal({
                    open: true,
                    habitacion: hab,
                    editing: contrato,
                    modeloReparto,
                  })
                }
              />
            );
          })}
        </div>
      )}

      {/* SECCIÓN UTILIDADES */}
      <section
        style={{
          border: "1px solid var(--border)",
          background: "var(--bg-surface)",
          padding: "16px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span className="label-section">Copia de seguridad</span>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-tertiary)",
                marginTop: "4px",
              }}
            >
              Guarda una copia de la base de datos en %APPDATA%\REPSUM\backups\
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={handleBackup}
            style={{ fontSize: "12px" }}
          >
            Hacer copia ahora
          </Button>
        </div>
        {backupStatus && (
          <div
            style={{
              marginTop: "10px",
              fontSize: "12px",
              padding: "8px 12px",
              background: backupStatus.ok
                ? "var(--bg-secondary)"
                : "var(--status-pending-bg)",
              color: backupStatus.ok
                ? "var(--status-ok)"
                : "var(--status-pending)",
              borderLeft: `3px solid ${
                backupStatus.ok ? "var(--status-ok)" : "var(--status-pending)"
              }`,
            }}
          >
            {backupStatus.ok ? "✓ " : "✕ "}
            {backupStatus.msg}
          </div>
        )}

        {/* Actualizaciones */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-heading)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-tertiary)",
              }}
            >
              Actualizaciones
            </span>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-tertiary)",
                marginTop: "4px",
              }}
            >
              Versión actual:{" "}
              <span style={{ fontFamily: "var(--font-display)" }}>0.1.0</span>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={handleCheckUpdate}
            style={{ fontSize: "12px" }}
            disabled={checkingUpdate}
          >
            {checkingUpdate ? "Comprobando..." : "Buscar actualizaciones"}
          </Button>
        </div>
        {updateStatus && (
          <div
            style={{
              marginTop: "10px",
              fontSize: "12px",
              padding: "8px 12px",
              background: "var(--bg-secondary)",
              color: updateStatus.ok
                ? "var(--status-ok)"
                : "var(--status-pending)",
              borderLeft: `3px solid ${
                updateStatus.ok ? "var(--status-ok)" : "var(--status-pending)"
              }`,
            }}
          >
            {updateStatus.ok ? "✓ " : "✕ "}
            {updateStatus.msg}
          </div>
        )}
      </section>

      {/* MODALES */}
      <InmuebleModal
        open={inmModal.open}
        editing={inmModal.editing}
        onClose={() => setInmModal({ open: false })}
      />
      <InquilinoModal
        open={inqModal.open}
        editing={inqModal.editing}
        onClose={() => setInqModal({ open: false })}
      />
      {contratoModal.habitacion && (
        <ContratoModal
          open={contratoModal.open}
          habitacion={contratoModal.habitacion}
          editing={contratoModal.editing}
          modeloReparto={contratoModal.modeloReparto}
          onClose={() => setContratoModal({ open: false })}
        />
      )}
      {configModal.inmuebleId && (
        <InmuebleConfigModal
          open={configModal.open}
          inmueble={inmuebles.find((i) => i.id === configModal.inmuebleId) ?? null}
          inquilinos={inquilinos}
          habitaciones={byInmueble[configModal.inmuebleId] ?? []}
          contratos={byHabitacion}
          onClose={() => setConfigModal({ open: false })}
        />
      )}
    </div>
  );
};
