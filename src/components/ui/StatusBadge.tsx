import React from "react";

type StatusVariant = "ok" | "pending" | "excess" | "inactive";

interface StatusBadgeProps {
  variant: StatusVariant;
  label: string;
}

const variantStyles: Record<StatusVariant, { color: string }> = {
  ok:       { color: "var(--status-ok)" },
  pending:  { color: "var(--status-pending)" },
  excess:   { color: "var(--status-excess)" },
  inactive: { color: "var(--status-inactive)" },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, label }) => {
  const { color } = variantStyles[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontFamily: "var(--font-heading)",
        fontSize: "11px",
        fontWeight: 500,
        color,
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
};
