"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
        color: "rgba(255,255,255,0.7)", borderRadius: "6px",
        padding: "7px 14px", fontSize: "12px", fontWeight: "600", cursor: "pointer",
        fontFamily: "system-ui",
      }}
    >
      Export as PDF
    </button>
  );
}
