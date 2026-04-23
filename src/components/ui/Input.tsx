import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, style, onFocus, onBlur, ...props }) => {
  const [focused, setFocused] = React.useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {label && (
        <label
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {label}
        </label>
      )}
      <input
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "14px",
          color: "var(--text-primary)",
          background: "transparent",
          border: "none",
          borderBottom: focused
            ? "2px solid var(--accent)"
            : "1px solid var(--border)",
          borderRadius: 0,
          padding: "6px 0",
          outline: "none",
          transition: "border-color 0.15s",
          width: "100%",
          ...style,
        }}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
    </div>
  );
};
