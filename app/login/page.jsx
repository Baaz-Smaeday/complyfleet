"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // login, signup, forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Redirect based on role
        redirectByRole(session.user.id);
      }
    });
  }, []);

  async function redirectByRole(userId) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
    if (!profile) { window.location.href = "/dashboard"; return; }
    switch (profile.role) {
      case "platform_owner": window.location.href = "/admin"; break;
      case "tm": window.location.href = "/dashboard"; break;
      case "company_admin":
      case "company_viewer": window.location.href = "/portal"; break;
      default: window.location.href = "/dashboard";
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data.user) redirectByRole(data.user.id);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true); setError("");
    if (password !== confirmPassword) { setError("Passwords don't match"); setLoading(false); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
    if (!fullName.trim()) { setError("Please enter your full name"); setLoading(false); return; }

    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: "tm" } }
    });
    if (err) { setError(err.message); setLoading(false); return; }

    if (data.user && !data.user.identities?.length) {
      setError("An account with this email already exists");
      setLoading(false); return;
    }

    setMessage("Check your email to confirm your account. Then come back and log in.");
    setMode("login"); setLoading(false);
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login"
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setMessage("Password reset link sent to your email");
    setLoading(false);
  }

  const inputStyle = {
    width: "100%", padding: "12px 16px", border: "1px solid #E5E7EB", borderRadius: "12px",
    fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };
  const labelStyle = { display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" };
  const btnStyle = {
    width: "100%", padding: "14px", border: "none", borderRadius: "12px",
    background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white",
    fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    transition: "opacity 0.15s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }`}</style>

      <div style={{ width: "100%", maxWidth: "440px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "18px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "32px", marginBottom: "16px", boxShadow: "0 8px 32px rgba(37,99,235,0.3)" }}>{"\u{1F69B}"}</div>
          <h1 style={{ color: "white", fontSize: "28px", fontWeight: 800 }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></h1>
          <p style={{ color: "#94A3B8", fontSize: "13px", marginTop: "8px" }}>DVSA Compliance Platform for Transport Managers</p>
        </div>

        {/* Card */}
        <div style={{ background: "white", borderRadius: "20px", padding: "32px", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", marginBottom: "4px" }}>
            {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password"}
          </h2>
          <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "24px" }}>
            {mode === "login" ? "Sign in to your account" : mode === "signup" ? "Sign up as a Transport Manager" : "Enter your email to reset your password"}
          </p>

          {error && (
            <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#FEF2F2", border: "1px solid #FECACA", marginBottom: "16px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#DC2626" }}>{"\u26A0\uFE0F"} {error}</span>
            </div>
          )}

          {message && (
            <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#ECFDF5", border: "1px solid #A7F3D0", marginBottom: "16px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#059669" }}>{"\u2705"} {message}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" required style={inputStyle} />
              </div>
              <div style={{ marginBottom: "8px" }}>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="Your password" required style={inputStyle} />
              </div>
              <div style={{ textAlign: "right", marginBottom: "20px" }}>
                <button type="button" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", fontSize: "12px", color: "#2563EB", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Forgot password?</button>
              </div>
              <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}

          {/* SIGNUP FORM */}
          {mode === "signup" && (
            <form onSubmit={handleSignup}>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Full Name</label>
                <input type="text" value={fullName} onChange={e => { setFullName(e.target.value); setError(""); }} placeholder="James Henderson" required style={inputStyle} />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" required style={inputStyle} />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="Minimum 6 characters" required style={inputStyle} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(""); }} placeholder="Repeat password" required style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword}>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" required style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          {/* Toggle login/signup */}
          <div style={{ textAlign: "center", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #F3F4F6" }}>
            {mode === "login" && (
              <span style={{ fontSize: "13px", color: "#64748B" }}>
                Don't have an account?{" "}
                <button onClick={() => { setMode("signup"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "#2563EB", fontWeight: 700, cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>Sign Up</button>
              </span>
            )}
            {(mode === "signup" || mode === "forgot") && (
              <span style={{ fontSize: "13px", color: "#64748B" }}>
                Already have an account?{" "}
                <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "#2563EB", fontWeight: 700, cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>Sign In</button>
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "24px", color: "#64748B", fontSize: "11px" }}>
          ComplyFleet {"\u00B7"} DVSA Compliance Platform {"\u00B7"} {"\u00A9"} 2026
        </div>
      </div>
    </div>
  );
}
