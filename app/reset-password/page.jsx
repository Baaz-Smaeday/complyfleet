"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseReady()) return;
    // Supabase will auto-detect the recovery token from the URL hash
    // and establish a session. We listen for that.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if already in a session (user clicked link and session is active)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // Fallback — give Supabase a moment to process the hash
    setTimeout(() => setReady(true), 2000);

    return () => subscription?.unsubscribe();
  }, []);

  async function handleReset(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords don't match"); return; }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Redirect to dashboard after 2 seconds
    setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
  }

  const inputStyle = { width: "100%", padding: "14px 18px", border: "1px solid #E5E7EB", borderRadius: "12px", fontSize: "15px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }`}</style>

      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>{"\u{1F69B}"}</div>
            <span style={{ fontSize: "28px", fontWeight: 800, color: "#0F172A" }}>Comply<span style={{ color: "#2563EB" }}>Fleet</span></span>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: "white", borderRadius: "20px", padding: "36px 32px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid #E5E7EB" }}>
          {success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>{"\u2705"}</div>
              <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0F172A", marginBottom: "8px" }}>Password Updated!</h1>
              <p style={{ fontSize: "14px", color: "#6B7280" }}>Redirecting to dashboard...</p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>{"\u{1F510}"}</div>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0F172A", marginBottom: "4px" }}>Set New Password</h1>
                <p style={{ fontSize: "14px", color: "#6B7280" }}>Enter your new password below</p>
              </div>

              <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>New Password *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    placeholder="Min 6 characters"
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Confirm Password *</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(""); }}
                    placeholder="Confirm your password"
                    required
                    style={inputStyle}
                  />
                </div>

                {error && (
                  <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#FEF2F2", border: "1px solid #FECACA", fontSize: "13px", color: "#DC2626", fontWeight: 600 }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !ready}
                  style={{
                    padding: "14px", border: "none", borderRadius: "12px",
                    background: ready ? "linear-gradient(135deg, #2563EB, #3B82F6)" : "#94A3B8",
                    color: "white", fontSize: "15px", fontWeight: 700, cursor: ready ? "pointer" : "wait",
                    fontFamily: "inherit", marginTop: "4px"
                  }}
                >
                  {loading ? "Updating..." : !ready ? "Verifying link..." : "Update Password"}
                </button>
              </form>

              <div style={{ textAlign: "center", marginTop: "20px" }}>
                <a href="/login" style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>
                  {"\u2190"} Back to Login
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
