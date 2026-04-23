import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TopBar } from "./components/layout/TopBar";
import { RepartoView } from "./components/reparto/RepartoView";
import { InmueblesView } from "./components/inmuebles/InmueblesView";
import { DataExportModal } from "./components/settings/DataExportModal";
import { DataImportModal } from "./components/settings/DataImportModal";
import { ToastProvider } from "./components/ui/Toast";
import { useUI } from "./store/useUI";
import { useInmuebles } from "./store/useInmuebles";
import { useHabitaciones } from "./store/useHabitaciones";
import { useInquilinos } from "./store/useInquilinos";
import { useContratos } from "./store/useContratos";
import { useFacturas } from "./store/useFacturas";
import { useRepartos } from "./store/useRepartos";
import { usePagosParciales } from "./store/usePagosParciales";
import { useCorreos } from "./store/useCorreos";
import { getDb } from "./lib/db";
import type { ExportData } from "./lib/data-export";
import type { Contrato } from "./lib/types";

const AppContent: React.FC = () => {
  const { activeTab, showExportModal, setShowExportModal, showImportModal, setShowImportModal } = useUI();
  const [dbReady, setDbReady] = useState(false);

  // Get all data for export
  const { inmuebles, load: loadInmuebles } = useInmuebles();
  const { byInmueble: habsByInm, load: loadHabitaciones } = useHabitaciones();
  const { inquilinos, load: loadInquilinos } = useInquilinos();
  const { byHabitacion } = useContratos();
  const { byInmueble: facturasByInm, loadForInmueble: loadFacturasForInmueble } = useFacturas();
  const { byInmueble: repartosByInm, loadForInmueble: loadRepartosForInmueble } = useRepartos();
  const { pagosParciales, load: loadPagosParciales } = usePagosParciales();
  const { correos, load: loadCorreos } = useCorreos();

  useEffect(() => {
    // En contexto Tauri (app nativa), inicializa la BD real.
    // En browser/preview (sin IPC), omite y renderiza la UI directamente.
    const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
    if (!isTauri) {
      setDbReady(true);
      return;
    }
    getDb()
      .then(() => {
        setDbReady(true);
        // Load main stores
        loadInmuebles();
        loadInquilinos();
        loadCorreos();
        loadPagosParciales();
        invoke("backup_db_if_needed").catch(() => { /* silencioso */ });
      })
      .catch(console.error);
  }, [loadInmuebles, loadInquilinos, loadCorreos, loadPagosParciales]);

  // Flatten data for export
  const allHabitaciones = Object.values(habsByInm).flat();
  const allContratos = Object.values(byHabitacion).filter((c) => c !== null) as Contrato[];
  const allFacturas = Object.values(facturasByInm).flat();
  const allRepartos = Object.values(repartosByInm).flat();

  // Load all data when export modal opens
  useEffect(() => {
    if (showExportModal && inmuebles.length > 0) {
      console.log("🔄 Export modal opened - loading all data for:", inmuebles.length, "inmuebles");
      inmuebles.forEach((inm) => {
        console.log(`  Loading data for inmueble: ${inm.nombre} (id: ${inm.id})`);

        // Load habitaciones for this inmueble
        loadHabitaciones(inm.id);

        // Load facturas for this inmueble
        loadFacturasForInmueble(inm.id);

        // Load repartos for this inmueble - need to load for all months
        // Load last 24 months to be comprehensive
        const now = new Date();
        for (let i = 0; i < 24; i++) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const yearMonth = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
          loadRepartosForInmueble(inm.id, yearMonth).catch((e) => {
            console.warn(`Could not load repartos for ${inm.id} ${yearMonth}:`, e);
          });
        }
      });
    }
  }, [showExportModal, inmuebles, loadHabitaciones, loadFacturasForInmueble, loadRepartosForInmueble]);

  // Also need to load the actual data from stores on app start
  useEffect(() => {
    if (dbReady) {
      loadInmuebles();
      loadInquilinos();
      loadCorreos();
      loadPagosParciales();
    }
  }, [dbReady, loadInmuebles, loadInquilinos, loadCorreos, loadPagosParciales]);

  // Handle import
  const handleImportConfirmed = async (data: ExportData) => {
    try {
      // Call backend command to import data
      // For now, we'll implement a basic import that saves to the stores
      console.log("Importing data:", data);
      // TODO: Implement backend import command
      setShowImportModal(false);
    } catch (error) {
      console.error("Import error:", error);
      throw error;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-primary)",
      }}
    >
      <TopBar />
      <main style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {!dbReady ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
            Iniciando base de datos...
          </div>
        ) : (
          <>
            {activeTab === "reparto" && <RepartoView />}
            {activeTab === "inmuebles" && <InmueblesView />}
          </>
        )}
      </main>

      {/* Export Modal */}
      <DataExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        inmuebles={inmuebles}
        habitaciones={allHabitaciones}
        inquilinos={inquilinos}
        contratos={allContratos}
        facturas={allFacturas}
        repartos={allRepartos}
        pagosParciales={pagosParciales}
        correos={correos}
      />

      {/* Import Modal */}
      <DataImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportConfirmed={handleImportConfirmed}
      />
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
