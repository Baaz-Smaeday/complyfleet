"use client";

// ============================================================
// COMPLYFLEET — Shared Confirm Dialog
// ============================================================

export function ConfirmDialog({ title, message, confirmLabel, confirmColor, onConfirm, onCancel, icon }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px",
    }} onClick={onCancel}>
      <div style={{
        background: "#FFFFFF", borderRadius: "20px", width: "100%", maxWidth: "420px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)", overflow: "hidden",
        animation: "confirmIn 0.2s ease",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 28px 0", textAlign: "center" }}>
          {icon && <div style={{ fontSize: "40px", marginBottom: "12px" }}>{icon}</div>}
          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: "0 0 8px 0" }}>{title}</h3>
          <p style={{ fontSize: "14px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>{message}</p>
        </div>
        <div style={{
          padding: "24px 28px", display: "flex", gap: "12px", justifyContent: "center",
        }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "12px 20px", borderRadius: "12px",
            border: "1px solid #E5E7EB", background: "#FFFFFF",
            fontSize: "14px", fontWeight: 600, color: "#6B7280", cursor: "pointer",
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "12px 20px", borderRadius: "12px",
            border: "none", background: confirmColor || "#DC2626",
            fontSize: "14px", fontWeight: 700, color: "white", cursor: "pointer",
          }}>{confirmLabel || "Confirm"}</button>
        </div>
      </div>
      <style>{`@keyframes confirmIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }`}</style>
    </div>
  );
}

export function Toast({ message, type, onClose }) {
  const colors = {
    success: { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46", icon: "\u2705" },
    error: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", icon: "\u274C" },
    info: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", icon: "\u{1F4A1}" },
  };
  const c = colors[type] || colors.info;

  return (
    <div style={{
      position: "fixed", top: "80px", right: "20px", zIndex: 3000,
      padding: "14px 20px", borderRadius: "12px",
      background: c.bg, border: `1px solid ${c.border}`,
      display: "flex", alignItems: "center", gap: "10px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      animation: "toastIn 0.3s ease",
    }}>
      <span style={{ fontSize: "16px" }}>{c.icon}</span>
      <span style={{ fontSize: "13px", fontWeight: 600, color: c.text }}>{message}</span>
      <button onClick={onClose} style={{
        background: "none", border: "none", cursor: "pointer",
        color: c.text, fontSize: "14px", marginLeft: "8px", padding: "2px",
      }}>{"\u2715"}</button>
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>
  );
}
