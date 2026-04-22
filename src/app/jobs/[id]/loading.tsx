export default function JobLoading() {
  return (
    <div style={{ background: "#09090b", minHeight: "100vh", fontFamily: "'Inter','Open Sans',sans-serif", WebkitFontSmoothing: "antialiased" }}>

      {/* Nav skeleton */}
      <nav style={{ position: "fixed", inset: "0 0 auto", zIndex: 100, height: 58, display: "flex", alignItems: "center", padding: "0 24px", background: "rgba(9,9,11,0.92)", borderBottom: "1px solid #1e293b", backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.01em" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(31,191,159,0.10)", border: "1px solid rgba(31,191,159,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#1fbf9f", fontFamily: "monospace" }}>BA</div>
            The<span style={{ color: "#1fbf9f" }}>BA</span>Portal
          </div>
        </div>
      </nav>

      {/* Loading state */}
      <div style={{ paddingTop: 58, minHeight: "calc(100vh - 58px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>

          {/* AR avatar */}
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#a78bfa", fontFamily: "'Inter', sans-serif", margin: "0 auto 20px" }}>
            AR
          </div>

          <p style={{ fontSize: 17, fontWeight: 600, color: "#f0f0f4", letterSpacing: "-0.01em", margin: "0 0 8px" }}>
            Alex is reviewing this role
            <span style={{ display: "inline-flex", gap: 3, marginLeft: 4, verticalAlign: "middle" }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#1fbf9f", display: "inline-block", animation: "dot 1.2s ease-in-out infinite" }} />
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#1fbf9f", display: "inline-block", animation: "dot 1.2s ease-in-out 0.2s infinite" }} />
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#1fbf9f", display: "inline-block", animation: "dot 1.2s ease-in-out 0.4s infinite" }} />
            </span>
          </p>

          <p style={{ fontSize: 13, color: "#505060", margin: 0 }}>
            Pulling the breakdown for you now.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
