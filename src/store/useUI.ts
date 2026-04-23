import { create } from "zustand";

export type AppTab = "reparto" | "inmuebles";

interface UIState {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  // Data export/import modals
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  showImportModal: boolean;
  setShowImportModal: (show: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  activeTab: "reparto",
  setActiveTab: (tab) => set({ activeTab: tab }),
  showExportModal: false,
  setShowExportModal: (show) => set({ showExportModal: show }),
  showImportModal: false,
  setShowImportModal: (show) => set({ showImportModal: show }),
}));
