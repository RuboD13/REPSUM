import React from "react";

type ButtonVariant = "primary" | "secondary" | "destructive" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

const styles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    fontFamily: "var(--font-heading)",
    fontSize: "15px",
    fontWeight: 500,
    padding: "9px 18px",
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  secondary: {
    fontFamily: "var(--font-heading)",
    fontSize: "14px",
    fontWeight: 500,
    padding: "8px 16px",
    background: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "2px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  destructive: {
    fontFamily: "var(--font-heading)",
    fontSize: "15px",
    fontWeight: 500,
    padding: "9px 18px",
    background: "transparent",
    color: "var(--status-excess)",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  icon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    background: "transparent",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    color: "var(--text-tertiary)",
    transition: "background 0.1s, color 0.1s",
    padding: 0,
  },
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  const [hovered, setHovered] = React.useState(false);

  const hoverStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: "var(--accent-hover)" },
    secondary: {
      borderColor: "var(--accent)",
      color: "var(--accent)",
      background: "var(--accent-subtle)",
    },
    destructive: { background: "var(--status-excess-bg)" },
    icon: { background: "var(--hover-overlay)", color: "var(--text-primary)" },
  };

  return (
    <button
      style={{
        ...styles[variant],
        ...(hovered ? hoverStyles[variant] : {}),
        ...style,
      }}
      onMouseEnter={(e) => {
        setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        onMouseLeave?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
};
