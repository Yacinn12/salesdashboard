import { useState } from "react";

const COLORS = {
  success: "#27ae60",
  error:   "#e74c3c",
  info:    "#3a7bd5",
  warning: "#e8a020",
};

const ICONS = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
  warning: "⚠",
};

export function useToast() {
  const [toasts, setToasts] = useState([]);

  function show(msg, type = "success") {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }

  return { toasts, show };
}

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10,
      pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <div key={t.id} className="toast-item" style={{
          background: COLORS[t.type] || COLORS.success,
          color: "#fff",
          padding: "12px 18px",
          borderRadius: 12,
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
          maxWidth: 320,
          lineHeight: 1.4,
        }}>
          {ICONS[t.type] || "✓"} {t.msg}
        </div>
      ))}
    </div>
  );
}
