import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const inputStyle = {
  background: "#0f1322", border: "1px solid #2a3150", borderRadius: 8,
  color: "#e2e8f0", padding: "10px 12px", fontSize: 14, width: "100%",
  boxSizing: "border-box", outline: "none", fontFamily: "inherit",
};
const labelStyle = {
  fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase",
  letterSpacing: 1, marginBottom: 4, display: "block",
};
const btn = (bg, small = true) => ({
  background: bg, color: "#fff", border: "none", borderRadius: 8,
  padding: small ? "6px 14px" : "10px 20px", fontSize: small ? 13 : 14,
  fontWeight: 600, cursor: "pointer",
});

const TYPES = [
  { id: "call", label: "📞 Call", color: "#22c55e" },
  { id: "email", label: "📧 Email", color: "#0ea5e9" },
  { id: "meeting", label: "🤝 Meeting", color: "#6366f1" },
  { id: "coffee", label: "☕ Coffee / Virtual", color: "#f97316" },
  { id: "note", label: "📝 Note", color: "#94a3b8" },
  { id: "cim_review", label: "📄 CIM Review", color: "#f59e0b" },
  { id: "site_visit", label: "🏭 Site Visit", color: "#e879f9" },
  { id: "loi_sent", label: "📨 LOI Sent", color: "#ef4444" },
  { id: "conference", label: "🎤 Conference / Event", color: "#14b8a6" },
  { id: "linkedin", label: "💼 LinkedIn Outreach", color: "#0077b5" },
  { id: "intro_made", label: "🔗 Intro Made", color: "#a78bfa" },
  { id: "criteria_shared", label: "📢 Criteria Shared", color: "#fb923c" },
];

const CONTACT_TYPES = [
  "Broker / Intermediary",
  "M&A Advisor",
  "Banker / Lender",
  "Searcher / Peer",
  "Investor",
  "CPA / Accountant",
  "Attorney / Lawyer",
  "Seller / Owner",
  "Former Colleague",
  "Industry Contact",
  "Other",
];

const VENUES = [
  "Email",
  "Phone Call",
  "Video Call / Zoom",
  "Coffee / In-Person",
  "Networking Event",
  "Conference / Trade Show",
  "Alumni Mixer",
  "Cohort Gathering",
  "LinkedIn",
  "Chamber of Commerce",
  "Industry Association",
  "Other",
];

const uid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const EMPTY_FORM = {
  deal_id: "",
  activity_type: "call",
  description: "",
  contact_name: "",
  contact_type: "",
  venue: "",
  is_outbound: true,
  got_response: false,
  is_public_share: false,
  generated_lead: false,
  lead_source: "",
};

export default function ActivityLog({ deals }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState("all");
  const [selectedDeal, setSelectedDeal] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [activityCategory, setActivityCategory] = useState("deal");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("activity_date", { ascending: false });
      if (!error && data) setActivities(data);
      setLoading(false);
    };
    load();
  }, []);

  const openAddForm = (category) => {
    setActivityCategory(category);
    setShowAdd(true);
    setForm({
      ...EMPTY_FORM,
      deal_id: category === "deal" ? (deals.filter((d) => d.stage !== "passed" && d.stage !== "closed")[0]?.id || "") : "",
      activity_type: category === "networking" ? "coffee" : "call",
    });
  };

  const addActivity = async () => {
    if (activityCategory === "deal" && !form.deal_id) return;
    if (!form.description) return;
    setSaving(true);
    const newActivity = {
      id: uid(),
      ...form,
      deal_id: form.deal_id || null,
      activity_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("activities").insert(newActivity).select().single();
    if (!error && data) {
      setActivities((prev) => [data, ...prev]);
    }
    setSaving(false);
    setShowAdd(false);
    setForm({ ...EMPTY_FORM });
  };

  const deleteActivity = async (id) => {
    if (!window.confirm("Delete this activity?")) return;
    await supabase.from("activities").delete().eq("id", id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleFlag = async (id, field) => {
    const act = activities.find((a) => a.id === id);
    if (!act) return;
    const newVal = !act[field];
    await supabase.from("activities").update({ [field]: newVal }).eq("id", id);
    setActivities((prev) => prev.map((a) => a.id === id ? { ...a, [field]: newVal } : a));
  };

  const filtered = activities.filter((a) => {
    if (filterMode === "deal") {
      if (!a.deal_id) return false;
      if (selectedDeal !== "all") return a.deal_id === selectedDeal;
      return true;
    }
    if (filterMode === "networking") return !a.deal_id;
    return true;
  });

  const getDealName = (dealId) => {
    if (!dealId) return null;
    const d = deals.find((dl) => dl.id === dealId);
    return d ? d.company : "Unknown";
  };

  const getType = (typeId) => TYPES.find((t) => t.id === typeId) || TYPES[4];

  const contactTypeBadge = (ct) => {
    if (!ct) return null;
    const colors = {
      "Broker / Intermediary": "#6366f1", "M&A Advisor": "#e879f9", "Banker / Lender": "#f59e0b",
      "Searcher / Peer": "#0ea5e9", "Investor": "#14b8a6", "CPA / Accountant": "#ef4444",
      "Attorney / Lawyer": "#a78bfa", "Seller / Owner": "#22c55e", "Former Colleague": "#f97316",
      "Industry Contact": "#64748b", "Other": "#475569",
    };
    const color = colors[ct] || "#64748b";
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, color, background: color + "20",
        padding: "2px 6px", borderRadius: 8, textTransform: "uppercase", marginLeft: 4,
      }}>
        {ct}
      </span>
    );
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>Activity Log</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            {filtered.length} activit{filtered.length !== 1 ? "ies" : "y"} · {activities.filter((a) => !a.deal_id).length} networking · {activities.filter((a) => !!a.deal_id).length} deal-related
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn("#0ea5e9", false)} onClick={() => openAddForm("networking")}>+ Networking</button>
          <button style={btn("#6366f1", false)} onClick={() => openAddForm("deal")}>+ Deal Activity</button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { id: "all", label: "All", count: activities.length },
          { id: "networking", label: "🌐 Networking", count: activities.filter((a) => !a.deal_id).length },
          { id: "deal", label: "📋 Deal Activities", count: activities.filter((a) => !!a.deal_id).length },
        ].map((f) => (
          <button
            key={f.id}
            style={{
              ...btn(filterMode === f.id ? "#6366f1" : "#1e293b"),
              color: filterMode === f.id ? "#fff" : "#94a3b8",
            }}
            onClick={() => { setFilterMode(f.id); setSelectedDeal("all"); }}
          >
            {f.label} ({f.count})
          </button>
        ))}
        {filterMode === "deal" && (
          <select
            style={{ ...inputStyle, width: 200, cursor: "pointer", marginLeft: 8 }}
            value={selectedDeal}
            onChange={(e) => setSelectedDeal(e.target.value)}
          >
            <option value="all">All Deals</option>
            {deals.map((d) => <option key={d.id} value={d.id}>{d.company}</option>)}
          </select>
        )}
      </div>

      {/* Add Activity Form */}
      {showAdd && (
        <div style={{
          background: "#141829", border: "1px solid #1e293b", borderRadius: 12,
          padding: 20, marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 }}>
            {activityCategory === "networking" ? "🌐 Log Networking Activity" : "📋 Log Deal Activity"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            {activityCategory === "deal" ? (
              <div>
                <label style={labelStyle}>Deal</label>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={form.deal_id} onChange={(e) => setForm({ ...form, deal_id: e.target.value })}>
                  <option value="">Select deal...</option>
                  {deals.map((d) => <option key={d.id} value={d.id}>{d.company}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label style={labelStyle}>Contact Type</label>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={form.contact_type} onChange={(e) => setForm({ ...form, contact_type: e.target.value })}>
                  <option value="">Select type...</option>
                  {CONTACT_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={labelStyle}>Activity Type</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })}>
                {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Contact Name</label>
              <input style={inputStyle} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Who did you connect with?" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Venue / Channel</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}>
                <option value="">Select venue...</option>
                {VENUES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {activityCategory === "deal" && (
              <div>
                <label style={labelStyle}>Contact Type</label>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={form.contact_type} onChange={(e) => setForm({ ...form, contact_type: e.target.value })}>
                  <option value="">Select type...</option>
                  {CONTACT_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Checkboxes */}
          <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
            {[
              ["is_outbound", "Outbound (I initiated)"],
              ["got_response", "Got Response"],
              ["is_public_share", "Shared Criteria Publicly"],
              ["generated_lead", "Generated a Lead / Intro"],
            ].map(([field, label]) => (
              <label key={field} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#cbd5e1", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form[field] || false}
                  onChange={(e) => setForm({ ...form, [field]: e.target.checked })}
                  style={{ accentColor: "#6366f1" }}
                />
                {label}
              </label>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Description / Notes</label>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What happened? Key takeaways, follow-ups, ask documented..."
            />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button style={btn("#334155")} onClick={() => setShowAdd(false)}>Cancel</button>
            <button
              style={btn("#6366f1")}
              onClick={addActivity}
              disabled={saving || (activityCategory === "deal" && !form.deal_id) || !form.description}
            >
              {saving ? "Saving..." : "Log Activity"}
            </button>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading activities...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#94a3b8" }}>No activities yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Log your first call, email, meeting, or networking touchpoint</div>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 15, top: 0, bottom: 0, width: 2, background: "#1e293b" }} />
          {filtered.map((a) => {
            const type = getType(a.activity_type);
            const dealName = getDealName(a.deal_id);
            const isNetworking = !a.deal_id;
            return (
              <div key={a.id} style={{ display: "flex", gap: 16, marginBottom: 14, position: "relative" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: type.color + "20",
                  border: `2px solid ${type.color}`, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 14, flexShrink: 0, zIndex: 1,
                }}>
                  {type.label.split(" ")[0]}
                </div>
                <div style={{
                  flex: 1, background: "#141829", border: `1px solid ${isNetworking ? "#0ea5e920" : "#1e293b"}`,
                  borderRadius: 10, padding: 14,
                  borderLeft: isNetworking ? "3px solid #0ea5e9" : "3px solid #6366f1",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: type.color,
                        background: type.color + "20", padding: "2px 8px",
                        borderRadius: 8, textTransform: "uppercase",
                      }}>
                        {type.label.split(" ").slice(1).join(" ")}
                      </span>
                      {dealName ? (
                        <span style={{ fontSize: 12, color: "#6366f1", fontWeight: 600, marginLeft: 4 }}>{dealName}</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#0ea5e9", background: "#0ea5e920", padding: "2px 8px", borderRadius: 8, marginLeft: 4 }}>NETWORKING</span>
                      )}
                      {contactTypeBadge(a.contact_type)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        {new Date(a.activity_date).toLocaleDateString()} · {new Date(a.activity_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <button style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14 }} onClick={() => deleteActivity(a.id)}>✕</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
                    {a.contact_name && <span style={{ fontSize: 12, color: "#94a3b8" }}>👤 {a.contact_name}</span>}
                    {a.venue && <span style={{ fontSize: 12, color: "#64748b" }}>📍 {a.venue}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 6 }}>
                    {a.description}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {a.is_outbound && (
                      <span style={{ fontSize: 10, color: "#22c55e", background: "#22c55e15", padding: "2px 6px", borderRadius: 6, fontWeight: 600 }}>OUTBOUND</span>
                    )}
                    <button
                      style={{ fontSize: 10, color: a.got_response ? "#f59e0b" : "#334155", background: a.got_response ? "#f59e0b15" : "#0f1322", padding: "2px 6px", borderRadius: 6, fontWeight: 600, border: `1px solid ${a.got_response ? "#f59e0b40" : "#1e293b"}`, cursor: "pointer" }}
                      onClick={() => toggleFlag(a.id, "got_response")}
                    >
                      {a.got_response ? "✓ RESPONSE" : "⬜ NO RESPONSE"}
                    </button>
                    <button
                      style={{ fontSize: 10, color: a.generated_lead ? "#e879f9" : "#334155", background: a.generated_lead ? "#e879f915" : "#0f1322", padding: "2px 6px", borderRadius: 6, fontWeight: 600, border: `1px solid ${a.generated_lead ? "#e879f940" : "#1e293b"}`, cursor: "pointer" }}
                      onClick={() => toggleFlag(a.id, "generated_lead")}
                    >
                      {a.generated_lead ? "✓ LEAD GEN'D" : "⬜ NO LEAD"}
                    </button>
                    {a.is_public_share && (
                      <span style={{ fontSize: 10, color: "#fb923c", background: "#fb923c15", padding: "2px 6px", borderRadius: 6, fontWeight: 600 }}>📢 SHARED CRITERIA</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
