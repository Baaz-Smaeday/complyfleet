"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";
import { Toast } from "../../components/ConfirmDialog";

const TYPES = { HGV: "\u{1F69B}", Van: "\u{1F690}", Trailer: "\u{1F517}" };

export default function MagicLinksPage() {
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [links, setLinks] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [driverName, setDriverName] = useState("");
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState("https://complyfleet.vercel.app");

  const flash = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (typeof window !== "undefined") setBaseUrl(window.location.origin);
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    if (isSupabaseReady()) {
      const { data: cos } = await supabase.from("companies").select("*").is("archived_at", null).order("name");
      const { data: vehs } = await supabase.from("vehicles").select("*").is("archived_at", null).order("reg");
      const { data: mls } = await supabase.from("magic_links").select("*").order("created_at", { ascending: false });
      setCompanies(cos || []);
      if (vehs && cos) {
        const cMap = {};
        (cos || []).forEach(c => { cMap[c.id] = c.name; });
        setVehicles(vehs.map(v => ({ ...v, company_name: cMap[v.company_id] || "" })));
      }
      setLinks(mls || []);
    } else {
      setCompanies([{ id: "c1", name: "Hargreaves Haulage Ltd" }]);
      setVehicles([{ id: "v1", reg: "BD63 XYZ", type: "HGV", company_id: "c1", company_name: "Hargreaves Haulage Ltd" }]);
      setLinks([]);
    }
    setLoading(false);
  }

  function getLinkStatus(link) {
    if (link.revoked_at) return "revoked";
    if (new Date(link.expires_at) < new Date()) return "expired";
    return "active";
  }

  function getTimeRemaining(expiresAt) {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)}m remaining`;
    return `${hours}h remaining`;
  }

  async function createLink() {
    if (!selectedVehicle) return;
    const v = vehicles.find(x => x.id === selectedVehicle);
    if (!v) return;

    const token = Math.random().toString(36).substr(2, 10);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const walkaroundUrl = `${baseUrl}/walkaround?vehicle=${v.id}&company=${v.company_id}`;

    if (isSupabaseReady()) {
      await supabase.from("magic_links").insert({
        vehicle_id: v.id,
        vehicle_reg: v.reg,
        vehicle_type: v.type,
        company_id: v.company_id,
        company_name: v.company_name,
        driver_name: driverName || null,
        token,
        url: walkaroundUrl,
        expires_at: expiresAt,
      });
      await loadData();
    } else {
      setLinks(prev => [{
        id: "ml" + Date.now(), vehicle_reg: v.reg, vehicle_type: v.type, company_name: v.company_name,
        driver_name: driverName, token, url: walkaroundUrl, expires_at: expiresAt, created_at: new Date().toISOString(),
        uses: 0, revoked_at: null,
      }, ...prev]);
    }

    flash("Magic link created!");
    setShowCreate(false); setCreateStep(0); setSelectedCompany(null); setSelectedVehicle(null); setDriverName("");
  }

  async function revokeLink(id) {
    if (isSupabaseReady()) {
      await supabase.from("magic_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
      await loadData();
    } else {
      setLinks(prev => prev.map(l => l.id === id ? { ...l, revoked_at: new Date().toISOString() } : l));
    }
    flash("Link revoked");
  }

  const filteredLinks = links.filter(l => {
    if (filter === "all") return true;
    return getLinkStatus(l) === filter;
  });

  const counts = { all: links.length, active: links.filter(l => getLinkStatus(l) === "active").length, expired: links.filter(l => getLinkStatus(l) === "expired").length, revoked: links.filter(l => getLinkStatus(l) === "revoked").length };
  const STATUS = { active: { bg: "#ECFDF5", text: "#059669", dot: "#10B981", label: "ACTIVE" }, expired: { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF", label: "EXPIRED" }, revoked: { bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444", label: "REVOKED" } };

  const companyVehicles = vehicles.filter(v => v.company_id === selectedCompany);

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }`}</style>

      <header style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{"\u{1F69B}"}</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
        </a>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "13px" }}>JH</div>
      </header>

      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div><h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>{"\u{1F517}"} Magic Links</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Generate time-limited walkaround check links for drivers</p></div>
          <button onClick={() => setShowCreate(true)} style={{ padding: "10px 20px", border: "none", borderRadius: "12px", background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>{"\u2795"} New Magic Link</button>
        </div>

        <div style={{ padding: "16px 20px", borderRadius: "14px", background: "#EFF6FF", border: "1px solid #BFDBFE", marginBottom: "20px", display: "flex", gap: "12px" }}>
          <span style={{ fontSize: "20px" }}>{"\u{1F4A1}"}</span>
          <div style={{ fontSize: "13px", color: "#1E40AF", lineHeight: 1.5 }}>
            <strong>When to use Magic Links:</strong> QR codes in the cab are the primary method. Use magic links when a new vehicle hasn't got its QR printed yet, or a driver needs temporary access from a different device. Links expire after 24 hours.
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {[{ k: "all", l: "All" }, { k: "active", l: "Active" }, { k: "expired", l: "Expired" }, { k: "revoked", l: "Revoked" }].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", background: filter === f.k ? "#0F172A" : "#F1F5F9", color: filter === f.k ? "white" : "#64748B", fontSize: "12px", fontWeight: 700 }}>
              {f.l} <span style={{ opacity: 0.6, marginLeft: "4px" }}>{counts[f.k]}</span></button>))}
        </div>

        {loading ? <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading...</div> :
        filteredLinks.length === 0 ? <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8", background: "#FFF", borderRadius: "16px", border: "1px solid #E5E7EB" }}>No magic links yet. Create one above.</div> :
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredLinks.map(l => {
            const status = getLinkStatus(l);
            const s = STATUS[status];
            const walkaroundUrl = l.url || `${baseUrl}/walkaround?vehicle=${l.vehicle_id}&company=${l.company_id}`;
            return (
              <div key={l.id} style={{ background: "#FFF", borderRadius: "16px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
                <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
                  <span style={{ fontSize: "28px" }}>{TYPES[l.vehicle_type] || "\u{1F69B}"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 800, fontSize: "16px", fontFamily: "monospace", color: "#0F172A" }}>{l.vehicle_reg}</span>
                      <span style={{ padding: "2px 8px", borderRadius: "12px", background: s.bg, fontSize: "10px", fontWeight: 700, color: s.text, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: s.dot }} />{s.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#6B7280" }}>
                      {"\u{1F3E2}"} {l.company_name} {l.driver_name && <>{" \u00B7 "}{"\u{1F464}"} Sent to {l.driver_name}</>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>Created {new Date(l.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} {new Date(l.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
                    {status === "active" && <div style={{ fontSize: "12px", fontWeight: 700, color: "#059669", marginTop: "2px" }}>{"\u23F1\uFE0F"} {getTimeRemaining(l.expires_at)}</div>}
                    {status === "expired" && <div style={{ fontSize: "11px", color: "#94A3B8" }}>Auto-expired</div>}
                  </div>
                </div>
                <div style={{ padding: "0 24px 16px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", background: "#F8FAFC", fontSize: "11px", fontFamily: "monospace", color: status === "active" ? "#2563EB" : "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {walkaroundUrl}
                  </div>
                  {status === "active" && (<>
                    <button onClick={() => { navigator.clipboard.writeText(walkaroundUrl); flash("Link copied!"); }} style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "#FFF", fontSize: "11px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>{"\u{1F4CB}"} Copy</button>
                    <button onClick={() => revokeLink(l.id)} style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #FECACA", background: "#FEF2F2", fontSize: "11px", fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>{"\u{1F6D1}"} Revoke</button>
                  </>)}
                </div>
              </div>
            );
          })}
        </div>}
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => { setShowCreate(false); setCreateStep(0); }}>
          <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "500px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between" }}>
              <div><h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{"\u{1F517}"} Generate Magic Link</h2>
                <p style={{ fontSize: "12px", color: "#64748B", margin: "4px 0 0" }}>Step {createStep + 1} of 3 {"\u2014"} {["Select Company", "Select Vehicle", "Send Link"][createStep]}</p></div>
              <button onClick={() => { setShowCreate(false); setCreateStep(0); }} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94A3B8" }}>{"\u2715"}</button>
            </div>

            <div style={{ padding: "24px 28px" }}>
              {/* Progress */}
              <div style={{ display: "flex", gap: "4px", marginBottom: "24px" }}>
                {[0, 1, 2].map(i => (<div key={i} style={{ flex: 1, height: "4px", borderRadius: "2px", background: i <= createStep ? "#2563EB" : "#E5E7EB", transition: "all 0.3s" }} />))}
              </div>

              {createStep === 0 && (<>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "12px" }}>Select Company</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {companies.map(c => {
                    const vCount = vehicles.filter(v => v.company_id === c.id).length;
                    return (<button key={c.id} onClick={() => { setSelectedCompany(c.id); setCreateStep(1); }} style={{
                      padding: "14px 18px", borderRadius: "12px", border: `2px solid ${selectedCompany === c.id ? "#2563EB" : "#E5E7EB"}`,
                      background: selectedCompany === c.id ? "#EFF6FF" : "#FFF", cursor: "pointer", textAlign: "left", width: "100%",
                    }}><div style={{ fontWeight: 700, fontSize: "14px", color: "#0F172A" }}>{c.name}</div>
                      <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{vCount} vehicles</div></button>);
                  })}
                </div>
              </>)}

              {createStep === 1 && (<>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "12px" }}>Select Vehicle</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {companyVehicles.map(v => (<button key={v.id} onClick={() => { setSelectedVehicle(v.id); setCreateStep(2); }} style={{
                    padding: "14px 18px", borderRadius: "12px", border: `2px solid ${selectedVehicle === v.id ? "#2563EB" : "#E5E7EB"}`,
                    background: selectedVehicle === v.id ? "#EFF6FF" : "#FFF", cursor: "pointer", textAlign: "left", width: "100%",
                    display: "flex", alignItems: "center", gap: "12px",
                  }}><span style={{ fontSize: "24px" }}>{TYPES[v.type]}</span>
                    <div><div style={{ fontWeight: 700, fontSize: "15px", fontFamily: "monospace", color: "#0F172A" }}>{v.reg}</div>
                      <div style={{ fontSize: "12px", color: "#6B7280" }}>{v.type} {"\u00B7"} {v.make} {v.model}</div></div></button>))}
                </div>
              </>)}

              {createStep === 2 && (<>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "12px" }}>Driver Details (optional)</div>
                <input type="text" placeholder="Driver name (optional)" value={driverName} onChange={e => setDriverName(e.target.value)} style={{
                  width: "100%", padding: "12px 16px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", fontFamily: "inherit", background: "#FAFAFA", marginBottom: "16px",
                }} />
                <div style={{ padding: "14px 18px", borderRadius: "12px", background: "#F0F9FF", border: "1px solid #BFDBFE" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#1E40AF", marginBottom: "8px" }}>Link Preview</div>
                  <div style={{ fontSize: "13px", fontFamily: "monospace", color: "#2563EB", wordBreak: "break-all" }}>
                    {baseUrl}/walkaround?vehicle={selectedVehicle}&company={selectedCompany}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "6px" }}>Expires in 24 hours</div>
                </div>
              </>)}
            </div>

            <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => { if (createStep > 0) setCreateStep(createStep - 1); else { setShowCreate(false); setCreateStep(0); } }} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>{createStep > 0 ? "\u2190 Back" : "Cancel"}</button>
              {createStep === 2 && <button onClick={createLink} style={{ padding: "10px 24px", border: "none", borderRadius: "10px", background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>{"\u{1F517}"} Generate Link</button>}
            </div>
          </div>
        </div>
      )}

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>ComplyFleet v1.0 {"\u00B7"} DVSA Compliance Platform {"\u00B7"} {"\u00A9"} 2026</footer>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
