import React, { useState } from "react";
import { useUI, AppTab } from "../../store/useUI";

const tabs: { id: AppTab; label: string }[] = [
  { id: "reparto", label: "Reparto" },
  { id: "inmuebles", label: "Inmuebles" },
];

export const TopBar: React.FC = () => {
  const { activeTab, setActiveTab, setShowExportModal, setShowImportModal } = useUI();
  const [showDataMenu, setShowDataMenu] = useState(false);

  return (
    <header
      style={{
        height: "48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-primary)",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {/* Logo */}
      <span
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 700,
          fontSize: "18px",
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
        }}
      >
        REPSUM
      </span>

      {/* Nav tabs */}
      <nav style={{ display: "flex", height: "100%", gap: 0 }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "15px",
                fontWeight: active ? 600 : 500,
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                padding: "0 20px",
                height: "100%",
                background: "none",
                border: "none",
                borderBottom: active
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
                cursor: "pointer",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Data Management */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowDataMenu(!showDataMenu)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            color: "var(--text-tertiary)",
            padding: "4px 8px",
            borderRadius: "2px",
            transition: "color 0.1s, background 0.1s",
            marginRight: "4px",
          }}
          title="Exportar/Importar datos"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
            (e.currentTarget as HTMLElement).style.background = "var(--hover-overlay)";
          }}
          onMouseLeave={(e) => {
            if (!showDataMenu) {
              (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }
          }}
        >
          📊
        </button>

        {/* Dropdown Menu */}
        {showDataMenu && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "100%",
              marginTop: "4px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              overflow: "hidden",
              zIndex: 1000,
              minWidth: "160px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <button
              onClick={() => {
                setShowExportModal(true);
                setShowDataMenu(false);
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "none",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "13px",
                color: "var(--text-primary)",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--hover-overlay)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              📥 Exportar datos
            </button>
            <button
              onClick={() => {
                setShowImportModal(true);
                setShowDataMenu(false);
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "none",
                border: "none",
                borderTop: "1px solid var(--border)",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "13px",
                color: "var(--text-primary)",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--hover-overlay)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              📤 Importar datos
            </button>
          </div>
        )}
      </div>

      {/* Ajustes (alias Inmuebles) */}
      <button
        onClick={() => setActiveTab("inmuebles")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "16px",
          color: "var(--text-tertiary)",
          padding: "4px 8px",
          borderRadius: "2px",
          transition: "color 0.1s, background 0.1s",
        }}
        title="Ajustes"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          (e.currentTarget as HTMLElement).style.background = "var(--hover-overlay)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        ⚙
      </button>
    </header>
  );
};
