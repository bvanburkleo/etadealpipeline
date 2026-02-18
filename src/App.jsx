import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import DealForm from "./DealForm";
import Dashboard from "./Dashboard";
import DealScreener from "./DealScreener";
import ActivityLog from "./ActivityLog";
import Contacts from "./Contacts";
import Scorecard from "./Scorecard";

// ─── CONSTANTS ──────────────────────────────────────────────
const STAGES = [
  { id: "identified", label: "Identified", color: "#64748b" },
  { id: "initial_review", label: "Initial Review", color: "#6366f1" },
  { id: "outreach", label: "Outreach", color: "#0ea5e9" },
  { id: "diligence", label: "Due Diligence", color: "#f59e0b" },
  { id: "loi", label: "LOI / Negotiation", color: "#e879f9" },
  { id: "closed", label: "Closed", color: "#22c55e" },
  { id: "passed", label: "Passed", color: "#ef4444" },
];

const SECTORS = [
  "B2B Services",
  "Equipment Repair / Maintenance",
  "Equipment Rental / Leasing",
  "Industrial Services",
  "Field Services",
  "Environmental Services",
  "Facilities Management",
  "Logistics / Fleet Services",
  "Testing / Inspection / Calibration",
  "Industrial Distribution",
  "Manufacturing",
  "Other",
];

const SOURCES = [
  "Broker",
  "Direct Outreach",
  "BizBuySell",
  "Referral",
  "SearchFunder",
  "Other",
];

const EMPTY_DEAL = {
  id: "",
  company: "",
  sector: "B2B Services",
  location: "",
  source: "Broker",
  stage: "identified",
  revenue: "",
  ebitda: "",
  asking_price: "",
  multiple: "",
  ebitda_margin: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  broker: "",
  notes: "",
  next_step: "",
  next_step_date: "",
  rating: 3,
  created_at: "",
  updated_at: "",
};

const uid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const fmt = (v) => {
  if (!v && v !== 0) return "—";
  const n = parseFloat(v);
  if (isNaN(n) || n === 0) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};

// ─── DATABASE HELPERS ───────────────────────────────────────
const dbToLocal = (row) => ({
  ...row,
  revenue: row.revenue || "",
  ebitda: row.ebitda || "",
  asking_price: row.asking_price || "",
  next_step_date: row.next_step_date || "",
});

const localToDb = (deal) => {
  const d = { ...deal };
  // Compute derived fields
  if (d.revenue && d.ebitda && parseFloat(d.revenue) > 0) {
    d.ebitda_margin = (parseFloat(d.ebitda) / parseFloat(d.revenue) * 100).toFixed(1);
  }
  if (d.asking_price && d.ebitda && parseFloat(d.ebitda) > 0) {
    d.multiple = (parseFloat(d.asking_price) / parseFloat(d.ebitda)).toFixed(1) + "x";
  }
  // Clean numeric fields
  d.revenue = parseFloat(d.revenue) || 0;
  d.ebitda = parseFloat(d.ebitda) || 0;
  d.asking_price = parseFloat(d.asking_price) || 0;
  // Clean date
  if (!d.next_step_date) d.next_step_date = null;
  return d;
};

// ─── MAIN APP ───────────────────────────────────────────────
export default function App() {
  const [deals, setDeals] = useState([]);
  const [view, setView] = useState("pipeline");
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_DEAL });
  const [filterStage, setFilterStage] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ─── LOAD DEALS ─────────────────────────────────────────
  useEffect(() => {
    const fetchDeals = async () => {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from("deals")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchErr) {
        setError("Failed to load deals: " + fetchErr.message);
        console.error(fetchErr);
      } else {
        setDeals((data || []).map(dbToLocal));
      }
      setLoading(false);
    };
    fetchDeals();
  }, []);

  // ─── CRUD OPERATIONS ───────────────────────────────────
  const openNew = () => {
    const now = new Date().toISOString();
    setFormData({ ...EMPTY_DEAL, id: uid(), created_at: now, updated_at: now });
    setShowForm(true);
  };

  const openEdit = (deal) => {
    setFormData({ ...deal });
    setShowForm(true);
  };

  const saveDeal = async () => {
    saveDealFromForm(formData);
  };

  const saveDealFromForm = async (formInput) => {
    setSaving(true);
    setError(null);
    const dbDeal = localToDb({ ...formInput, updated_at: new Date().toISOString() });
    const isEdit = deals.some((d) => d.id === dbDeal.id);

    const { data, error: saveErr } = await supabase
      .from("deals")
      .upsert(dbDeal, { onConflict: "id" })
      .select()
      .single();

    if (saveErr) {
      setError("Failed to save: " + saveErr.message);
      console.error(saveErr);
    } else {
      const localDeal = dbToLocal(data);
      setDeals((prev) => {
        const idx = prev.findIndex((d) => d.id === localDeal.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = localDeal;
          return next;
        }
        return [localDeal, ...prev];
      });
      if (view === "detail") setSelectedDeal(localDeal);
    }
    setSaving(false);
    setShowForm(false);
  };

  const deleteDeal = async (id) => {
    const { error: delErr } = await supabase.from("deals").delete().eq("id", id);
    if (delErr) {
      setError("Failed to delete: " + delErr.message);
      console.error(delErr);
    } else {
      setDeals((prev) => prev.filter((d) => d.id !== id));
      if (view === "detail") {
        setView("pipeline");
        setSelectedDeal(null);
      }
    }
    setShowForm(false);
  };

  // ─── FILTERS ────────────────────────────────────────────
  const filteredDeals = deals.filter((d) => {
    if (filterStage !== "all" && d.stage !== filterStage) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (d.company || "").toLowerCase().includes(q) ||
        (d.sector || "").toLowerCase().includes(q) ||
        (d.location || "").toLowerCase().includes(q) ||
        (d.broker || "").toLowerCase().includes(q) ||
        (d.contact_name || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stageCount = (stageId) => deals.filter((d) => d.stage === stageId).length;
  const activeDeals = deals.filter((d) => d.stage !== "passed" && d.stage !== "closed");
  const totalPipelineValue = activeDeals.reduce((s, d) => s + (parseFloat(d.ebitda) || 0), 0);
  const stageMeta = (id) => STAGES.find((s) => s.id === id) || STAGES[0];

  // ─── SMALL COMPONENTS ──────────────────────────────────
  const Stars = ({ value, onChange }) => (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => onChange && onChange(n)}
          style={{
            cursor: onChange ? "pointer" : "default",
            fontSize: 18,
            color: n <= value ? "#f59e0b" : "#334155",
            transition: "color 0.15s",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );

  const ErrorBanner = () =>
    error ? (
      <div
        style={{
          background: "#7f1d1d",
          color: "#fca5a5",
          padding: "10px 20px",
          fontSize: 13,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{error}</span>
        <button
          style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 16 }}
          onClick={() => setError(null)}
        >
          ✕
        </button>
      </div>
    ) : null;

  // ─── STYLES ─────────────────────────────────────────────
  const root = {
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    background: "#0c0f1a",
    color: "#e2e8f0",
    minHeight: "100vh",
  };

  const headerStyle = {
    background: "linear-gradient(135deg, #0f172a 0%, #1a1f3a 100%)",
    borderBottom: "1px solid #1e293b",
    padding: "20px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  };

  const btn = (bg = "#6366f1", small = false) => ({
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: small ? "6px 14px" : "10px 20px",
    fontSize: small ? 13 : 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    letterSpacing: 0.3,
  });

  const cardStyle = {
    background: "#141829",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: 16,
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: 10,
  };

  const inputStyle = {
    background: "#0f1322",
    border: "1px solid #2a3150",
    borderRadius: 8,
    color: "#e2e8f0",
    padding: "10px 12px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    display: "block",
  };

  const badgeStyle = (color) => ({
    display: "inline-block",
    background: color + "20",
    color: color,
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 20,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  });

  // ─── PIPELINE VIEW ─────────────────────────────────────
  const PipelineView = () => (
    <div style={{ padding: "20px 24px", overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 14, minWidth: STAGES.filter((s) => s.id !== "passed").length * 220 }}>
        {STAGES.filter((s) => s.id !== "passed").map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.id);
          return (
            <div key={stage.id} style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "0 4px" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: stage.color }} />
                <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase", color: "#94a3b8" }}>
                  {stage.label}
                </span>
                <span
                  style={{
                    background: "#1e293b", color: "#64748b", fontSize: 11, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 10, marginLeft: "auto",
                  }}
                >
                  {stageDeals.length}
                </span>
              </div>
              <div style={{ minHeight: 120 }}>
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    style={{ ...cardStyle, borderLeft: `3px solid ${stage.color}` }}
                    onClick={() => { setSelectedDeal(deal); setView("detail"); }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = stage.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.borderLeftColor = stage.color; e.currentTarget.style.transform = "none"; }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{deal.company || "Untitled"}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{deal.sector} · {deal.location || "—"}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#22c55e" }}>{fmt(deal.ebitda)} EBITDA</span>
                      <Stars value={deal.rating} />
                    </div>
                    {deal.multiple && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{deal.multiple} multiple</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {deals.filter((d) => d.stage === "passed").length > 0 && (
        <div style={{ marginTop: 20, padding: "12px 16px", background: "#141829", borderRadius: 10, border: "1px solid #1e293b" }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>PASSED ({deals.filter((d) => d.stage === "passed").length}): </span>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>
            {deals.filter((d) => d.stage === "passed").map((d) => d.company).join(", ")}
          </span>
        </div>
      )}
    </div>
  );

  // ─── LIST VIEW ──────────────────────────────────────────
  const ListView = () => (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          style={{ ...inputStyle, maxWidth: 280 }}
          placeholder="Search companies, sectors, contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select style={{ ...inputStyle, maxWidth: 180, cursor: "pointer" }} value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
          <option value="all">All Stages</option>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e293b", textAlign: "left" }}>
              {["Company", "Sector", "Location", "Stage", "Revenue", "EBITDA", "Multiple", "Source", "Rating"].map((h) => (
                <th key={h} style={{ ...labelStyle, padding: "10px 12px", fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredDeals.map((deal) => {
              const sm = stageMeta(deal.stage);
              return (
                <tr
                  key={deal.id}
                  style={{ borderBottom: "1px solid #111827", cursor: "pointer", transition: "background 0.15s" }}
                  onClick={() => { setSelectedDeal(deal); setView("detail"); }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1a1f3a")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px", fontWeight: 600 }}>{deal.company || "—"}</td>
                  <td style={{ padding: "12px", color: "#94a3b8" }}>{deal.sector}</td>
                  <td style={{ padding: "12px", color: "#94a3b8" }}>{deal.location || "—"}</td>
                  <td style={{ padding: "12px" }}><span style={badgeStyle(sm.color)}>{sm.label}</span></td>
                  <td style={{ padding: "12px", color: "#94a3b8" }}>{fmt(deal.revenue)}</td>
                  <td style={{ padding: "12px", fontWeight: 600, color: "#22c55e" }}>{fmt(deal.ebitda)}</td>
                  <td style={{ padding: "12px", color: "#94a3b8" }}>{deal.multiple || "—"}</td>
                  <td style={{ padding: "12px", color: "#64748b" }}>{deal.source}</td>
                  <td style={{ padding: "12px" }}><Stars value={deal.rating} /></td>
                </tr>
              );
            })}
            {filteredDeals.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#475569" }}>No deals found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── DETAIL VIEW ────────────────────────────────────────
  const DetailView = () => {
    if (!selectedDeal) return null;
    const deal = selectedDeal;
    const sm = stageMeta(deal.stage);
    return (
      <div style={{ padding: "24px 28px", maxWidth: 820, margin: "0 auto" }}>
        <button style={{ ...btn("transparent", true), color: "#6366f1", padding: 0, marginBottom: 16, fontSize: 13 }} onClick={() => setView("pipeline")}>
          ← Back to Pipeline
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{deal.company || "Untitled Deal"}</h2>
          <span style={badgeStyle(sm.color)}>{sm.label}</span>
          <Stars value={deal.rating} />
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button style={btn("#6366f1", true)} onClick={() => openEdit(deal)}>Edit</button>
            <button style={btn("#dc2626", true)} onClick={() => { if (window.confirm("Delete this deal?")) deleteDeal(deal.id); }}>Delete</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: "#141829", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
            <div style={{ ...labelStyle, marginBottom: 14, fontSize: 13 }}>Financials</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                ["Revenue", fmt(deal.revenue)],
                ["EBITDA", fmt(deal.ebitda)],
                ["Asking Price", fmt(deal.asking_price)],
                ["Multiple", deal.multiple || "—"],
                ["EBITDA Margin", deal.ebitda_margin ? deal.ebitda_margin + "%" : "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>{k}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: k === "EBITDA" ? "#22c55e" : "#e2e8f0", marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#141829", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
            <div style={{ ...labelStyle, marginBottom: 14, fontSize: 13 }}>Details</div>
            {[["Sector", deal.sector], ["Location", deal.location || "—"], ["Source", deal.source], ["Broker", deal.broker || "—"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #111827" }}>
                <span style={{ color: "#64748b", fontSize: 13 }}>{k}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "#141829", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
            <div style={{ ...labelStyle, marginBottom: 14, fontSize: 13 }}>Contact</div>
            {[["Name", deal.contact_name || "—"], ["Email", deal.contact_email || "—"], ["Phone", deal.contact_phone || "—"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #111827" }}>
                <span style={{ color: "#64748b", fontSize: 13 }}>{k}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "#141829", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
            <div style={{ ...labelStyle, marginBottom: 14, fontSize: 13 }}>Next Step</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{deal.next_step || "None set"}</div>
            {deal.next_step_date && <div style={{ fontSize: 13, color: "#f59e0b" }}>Due: {new Date(deal.next_step_date).toLocaleDateString()}</div>}
          </div>
        </div>

        {deal.notes && (
          <div style={{ background: "#141829", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginTop: 20 }}>
            <div style={{ ...labelStyle, marginBottom: 10, fontSize: 13 }}>Notes</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: "#cbd5e1", whiteSpace: "pre-wrap" }}>{deal.notes}</div>
          </div>
        )}

        <div style={{ fontSize: 11, color: "#334155", marginTop: 16 }}>
          Created {new Date(deal.created_at).toLocaleDateString()} · Updated {new Date(deal.updated_at).toLocaleDateString()}
        </div>
      </div>
    );
  };

  // ─── FORM MODAL ─────────────────────────────────────────
  const renderFormModal = () => {
    if (!showForm) return null;
    const isEdit = deals.some((d) => d.id === formData.id);
    return (
      <DealForm
        initialData={formData}
        isEdit={isEdit}
        saving={saving}
        onSave={(data) => {
          setFormData(data);
          saveDealFromForm(data);
        }}
        onDelete={deleteDeal}
        onClose={() => setShowForm(false)}
      />
    );
  };

  // ─── EXPORT TO CSV/EXCEL ─────────────────────────────────
  const exportToExcel = () => {
    if (deals.length === 0) return;

    const headers = [
      "Company", "Sector", "Location", "Stage", "Source", "Rating",
      "Revenue", "EBITDA", "EBITDA Margin %", "Asking Price", "Multiple",
      "Contact Name", "Contact Email", "Contact Phone", "Broker",
      "Next Step", "Next Step Date", "Notes", "Created", "Updated"
    ];

    const stageLabel = (id) => {
      const s = STAGES.find((st) => st.id === id);
      return s ? s.label : id;
    };

    const escCsv = (val) => {
      const str = String(val || "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const rows = deals.map((d) => [
      d.company,
      d.sector,
      d.location,
      stageLabel(d.stage),
      d.source,
      d.rating,
      d.revenue || "",
      d.ebitda || "",
      d.ebitda_margin || "",
      d.asking_price || "",
      d.multiple || "",
      d.contact_name,
      d.contact_email,
      d.contact_phone,
      d.broker,
      d.next_step,
      d.next_step_date || "",
      d.notes,
      d.created_at ? new Date(d.created_at).toLocaleDateString() : "",
      d.updated_at ? new Date(d.updated_at).toLocaleDateString() : "",
    ].map(escCsv));

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ETA_Deal_Pipeline_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  if (loading) {
    return (
      <div style={{ ...root, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 16, color: "#94a3b8" }}>Loading your pipeline...</div>
        </div>
      </div>
    );
  }

  // ─── MAIN RENDER ────────────────────────────────────────
  return (
    <div style={root}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <ErrorBanner />

      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: "#f1f5f9" }}>ETA Deal Pipeline</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            {activeDeals.length} active deal{activeDeals.length !== 1 ? "s" : ""} · {fmt(totalPipelineValue.toString())} pipeline EBITDA
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", background: "#141829", borderRadius: 8, border: "1px solid #1e293b", overflow: "hidden" }}>
            {[
              { id: "pipeline", label: "Pipeline" },
              { id: "list", label: "List" },
              { id: "dashboard", label: "Dashboard" },
              { id: "screener", label: "Screener" },
              { id: "activities", label: "Activities" },
              { id: "scorecard", label: "Scorecard" },
              { id: "contacts", label: "Contacts" },
            ].map((v) => (
              <button
                key={v.id}
                style={{
                  ...btn(view === v.id ? "#6366f1" : "transparent", true),
                  borderRadius: 0,
                  color: view === v.id ? "#fff" : "#64748b",
                  fontWeight: view === v.id ? 700 : 500,
                }}
                onClick={() => setView(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button style={btn("#334155", true)} onClick={exportToExcel} disabled={deals.length === 0}>⬇ Export</button>
          <button style={btn("#6366f1")} onClick={openNew}>+ New Deal</button>
        </div>
      </div>

      <div
        style={{
          display: "flex", gap: 0, padding: "0 24px", background: "#0f1322",
          borderBottom: "1px solid #111827", flexWrap: "wrap",
        }}
      >
        {STAGES.filter((s) => s.id !== "passed").map((stage) => (
          <div
            key={stage.id}
            style={{
              padding: "10px 16px", display: "flex", alignItems: "center", gap: 6,
              borderBottom: `2px solid ${stageCount(stage.id) > 0 ? stage.color : "transparent"}`,
              transition: "border-color 0.2s",
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: stage.color, opacity: stageCount(stage.id) > 0 ? 1 : 0.3 }} />
            <span style={{ fontSize: 12, color: stageCount(stage.id) > 0 ? "#e2e8f0" : "#475569", fontWeight: 600 }}>{stageCount(stage.id)}</span>
          </div>
        ))}
      </div>

      {view === "pipeline" && <PipelineView />}
      {view === "list" && <ListView />}
      {view === "detail" && <DetailView />}
      {view === "dashboard" && <Dashboard deals={deals} />}
      {view === "screener" && <DealScreener />}
      {view === "activities" && <ActivityLog deals={deals} />}
      {view === "scorecard" && <Scorecard deals={deals} />}
      {view === "contacts" && <Contacts deals={deals} />}
      {renderFormModal()}

      {deals.length === 0 && view !== "detail" && (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#475569" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#94a3b8", marginBottom: 8 }}>No deals yet</div>
          <div style={{ fontSize: 14, marginBottom: 20 }}>Start building your acquisition pipeline</div>
          <button style={btn("#6366f1")} onClick={openNew}>+ Add Your First Deal</button>
        </div>
      )}
    </div>
  );
}
