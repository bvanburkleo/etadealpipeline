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
  { id: "note", label: "📝 Note", color: "#94a3b8" },
  { id: "cim_review", label: "📄 CIM Review", color: "#f59e0b" },
  { id: "site_visit", label: "🏭 Site Visit", color: "#e879f9" },
  { id: "loi_sent", label: "📨 LOI Sent", color: "#ef4444" },
];

const uid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export default function ActivityLog({ deals }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ deal_id: "", activity_type: "call", description: "", contact_name: "" });
  const [saving, setSaving] = useState(false);

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

  const addActivity = async () => {
    if (!form.deal_id || !form.description) return;
    setSaving(true);
    const newActivity = {
      id: uid(),
      ...form,
      activity_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("activities").insert(newActivity).select().single();
    if (!error && data) {
      setActivities((prev) => [data, ...prev]);
    }
    setSaving(false);
    setShowAdd(false);
    setForm({ deal_id: "", activity_type: "call", description: "", contact_name: "" });
  };

  const deleteActivity = async (id) => {
    if (!window.confirm("Delete this activity?")) return;
    await supabase.from("activities").delete().eq("id", id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const filtered = selectedDeal === "all"
    ? activities
    : activities.filter((a) => a.deal_id === selectedDeal);

  const getDealName = (dealId) => {
    const d = deals.find((dl) => dl.id === dealId);
    return d ? d.company : "Unknown";
  };

  const getType = (typeId) => TYPES.find((t) => t.id === typeId) || TYPES[3];

  const activeDeals = deals.filter((d) => d.stage !== "passed" && d.stage !== "closed");

  return (
    <div style={{ padding: "20px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>Activity Log</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            {filtered.length} activit{filtered.length !== 1 ? "ies" : "y"} logged
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            style={{ ...inputStyle, width: 200, cursor: "pointer" }}
            value={selectedDeal}
            onChange={(e) => setSelectedDeal(e.target.value)}
          >
            <option value="all">All Deals</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>{d.company}</option>
            ))}
          </select>
          <button style={btn("#6366f1", false)} onClick={() => { setShowAdd(true); setForm({ deal_id: activeDeals[0]?.id || "", activity_type: "call", description: "", contact_name: "" }); }}>
            + Log Activity
          </button>
        </div>
      </div>

      {/* Add Activity Form */}
      {showAdd && (
        <div style={{
          background: "#141829", border: "1px solid #1e293b", borderRadius: 12,
          padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Deal</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.deal_id} onChange={(e) => setForm({ ...form, deal_id: e.target.value })}>
                <option value="">Select deal...</option>
                {deals.map((d) => <option key={d.id} value={d.id}>{d.company}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })}>
                {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Contact Name</label>
              <input style={inputStyle} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Who did you speak with?" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What happened? Key takeaways, next steps..."
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button style={btn("#334155")} onClick={() => setShowAdd(false)}>Cancel</button>
            <button style={btn("#6366f1")} onClick={addActivity} disabled={saving || !form.deal_id || !form.description}>
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
          <div style={{ fontSize: 13, marginTop: 4 }}>Log your first call, email, or meeting</div>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {/* Timeline line */}
          <div style={{ position: "absolute", left: 15, top: 0, bottom: 0, width: 2, background: "#1e293b" }} />
          {filtered.map((a) => {
            const type = getType(a.activity_type);
            return (
              <div key={a.id} style={{ display: "flex", gap: 16, marginBottom: 16, position: "relative" }}>
                {/* Dot */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: type.color + "20",
                  border: `2px solid ${type.color}`, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 14, flexShrink: 0, zIndex: 1,
                }}>
                  {type.label.split(" ")[0]}
                </div>
                {/* Content */}
                <div style={{
                  flex: 1, background: "#141829", border: "1px solid #1e293b",
                  borderRadius: 10, padding: 14,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: type.color,
                        background: type.color + "20", padding: "2px 8px",
                        borderRadius: 10, textTransform: "uppercase",
                      }}>
                        {type.label.split(" ").slice(1).join(" ")}
                      </span>
                      <span style={{ fontSize: 12, color: "#6366f1", fontWeight: 600, marginLeft: 8 }}>
                        {getDealName(a.deal_id)}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        {new Date(a.activity_date).toLocaleDateString()} · {new Date(a.activity_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <button
                        style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14 }}
                        onClick={() => deleteActivity(a.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {a.contact_name && (
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
                      with {a.contact_name}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {a.description}
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
