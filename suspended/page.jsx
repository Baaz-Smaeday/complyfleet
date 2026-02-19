"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SuspendedPage() {
  const [reason, setReason] = useState("inactive");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReason(params.get("reason") || "inactive");
    // Get user email for display
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email);
    });
  }, []);

  const isExpired = reason === "expired";

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
      `}</style>

      <div style={{ width: "100%", maxWidth: "480px", animation: "fadeUp 0.4s ease both" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "28px", marginBottom: "12px" }}>🚛</div>
          <h1 style={{ color: "white", fontSize: "22px", fontWeight: 800 }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></h1>
        </div>

        {/* Main card */}
        <div style={{ background: "white", borderRadius: "24px", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>

          {/* Red top bar */}
          <div style={{ height: "6px", background: isExpired ? "linear-gradient(90deg, #F59E0B, #D97706)" : "linear-gradient(90deg, #EF4444, #DC2626)" }} />

          <div style={{ padding: "36px 32px", textAlign: "center" }}>
            <div style={{
              width: "72px", height: "72px", borderRadius: "50%", margin: "0 auto 20px",
              background: isExpired ? "#FFFBEB" : "#FEF2F2",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px",
              border: `2px solid ${isExpired ? "#FDE68A" : "#FECACA"}`,
            }}>
              {isExpired ? "⏰" : "🔒"}
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0F172A", marginBottom: "10px" }}>
              {isExpired ? "Subscription Expired" : "Account Deactivated"}
            </h2>

            <p style={{ fontSize: "14px", color: "#64748B", lineHeight: 1.6, marginBottom: "28px" }}>
              {isExpired
                ? "Your ComplyFleet subscription has expired. To continue accessing your compliance records and dashboards, please renew your subscription."
                : "Your ComplyFleet account has been deactivated by the platform administrator. Please contact support if you believe this is an error."}
            </p>

            {email && (
              <div style={{ padding: "12px 16px", borderRadius: "12px", background: "#F8FAFC", border: "1px solid #E5E7EB", marginBottom: "24px", fontSize: "13px", color: "#64748B" }}>
                Logged in as <strong style={{ color: "#0F172A" }}>{email}</strong>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {isExpired ? (
                <a
                  href="mailto:support@complyfleet.co.uk?subject=Subscription Renewal"
                  style={{
                    display: "block", padding: "14px 24px", borderRadius: "14px",
                    background: "linear-gradient(135deg, #D97706, #F59E0B)",
                    color: "white", fontSize: "14px", fontWeight: 700,
                    textDecoration: "none", textAlign: "center",
                  }}>
                  ✉️ Contact Us to Renew
                </a>
              ) : (
                <a
                  href="mailto:support@complyfleet.co.uk?subject=Account Reactivation Request"
                  style={{
                    display: "block", padding: "14px 24px", borderRadius: "14px",
                    background: "linear-gradient(135deg, #0F172A, #1E293B)",
                    color: "white", fontSize: "14px", fontWeight: 700,
                    textDecoration: "none", textAlign: "center",
                  }}>
                  ✉️ Contact Support
                </a>
              )}

              <button
                onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
                style={{
                  padding: "12px 24px", borderRadius: "14px",
                  border: "1px solid #E5E7EB", background: "white",
                  fontSize: "13px", fontWeight: 700, color: "#64748B",
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                🚪 Sign Out
              </button>
            </div>
          </div>

          {/* Footer note */}
          <div style={{ padding: "16px 32px", background: "#F8FAFC", borderTop: "1px solid #F1F5F9", textAlign: "center" }}>
            <p style={{ fontSize: "11px", color: "#94A3B8" }}>
              ComplyFleet · DVSA Compliance Platform · © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
