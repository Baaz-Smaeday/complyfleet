"use client";
import { useState, useRef, useEffect } from "react";

export default function ExportDropdown({ onCSV, onPDF, label = "Export" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        padding: "8px 16px", borderRadius: "10px", border: "1px solid #E5E7EB",
        background: open ? "#F8FAFC" : "#FFF", fontSize: "12px", fontWeight: 700,
        color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
      }}>
        {"\u{1F4E5}"} {label} <span style={{ fontSize: "10px", opacity: 0.5 }}>{"\u25BC"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "110%", right: 0, background: "#FFF",
          borderRadius: "12px", border: "1px solid #E5E7EB",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 50, minWidth: "180px",
          overflow: "hidden",
        }}>
          {onCSV && <button onClick={() => { onCSV(); setOpen(false); }} style={{
            width: "100%", padding: "12px 16px", border: "none", background: "none",
            cursor: "pointer", textAlign: "left", fontSize: "13px", fontWeight: 500,
            color: "#374151", display: "flex", alignItems: "center", gap: "10px",
          }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
             onMouseLeave={e => e.currentTarget.style.background = ""}>
            {"\u{1F4C4}"} <div><div style={{ fontWeight: 600 }}>Export CSV</div><div style={{ fontSize: "10px", color: "#94A3B8" }}>Spreadsheet format</div></div>
          </button>}
          {onPDF && <button onClick={() => { onPDF(); setOpen(false); }} style={{
            width: "100%", padding: "12px 16px", border: "none", background: "none",
            cursor: "pointer", textAlign: "left", fontSize: "13px", fontWeight: 500,
            color: "#374151", display: "flex", alignItems: "center", gap: "10px",
            borderTop: "1px solid #F3F4F6",
          }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
             onMouseLeave={e => e.currentTarget.style.background = ""}>
            {"\u{1F5A8}\uFE0F"} <div><div style={{ fontWeight: 600 }}>Print / PDF</div><div style={{ fontSize: "10px", color: "#94A3B8" }}>Print or save as PDF</div></div>
          </button>}
        </div>
      )}
    </div>
  );
}
