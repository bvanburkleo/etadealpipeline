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

const ROLES = ["Broker", "Seller / Owner", "Advisor", "Lender", "Attorney", "CPA", "Investor", "Other"];

const uid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const EMPTY_CONTACT = {
  id: "", name: "", company: "", role: "Broker", email: "", phone: "", linkedin: "", notes: "",
};

export default function Contacts({ deals }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_CONTACT });
  const [saving, setSaving] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [linkedDeals, setLinkedDeals] = useState([]);
  const [linkDealId, setLinkDealId] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("name", { ascending: true });
      if (!error && data) setContacts(data);
      setLoading(false);
    };
    load();
  }, []);

  const loadLinkedDeals = async (contactId) => {
    const { data } = await supabase
      .from("deal_contacts")
      .select("deal_id")
      .eq("contact_id", contactId);
    if (data) {
      setLinkedDeals(data.map((d) => d.deal_id));
    }
  };

  const linkDeal = async (contactId, dealId) => {
    if (!dealId) return;
    const { error } = await supabase.from("deal_contacts").insert({ deal_id: dealId, contact_id: contactId });
    if (!error) {
      setLinkedDeals((prev) => [...prev, dealId]);
      setLinkDealId("");
    }
  };

  const unlinkDeal = async (contactId, dealId) => {
    await supabase.from("deal_contacts").delete().eq("deal_id", dealId).eq("contact_id", contactId);
    setLinkedDeals((prev) => prev.filter((id) => id !== dealId));
  };

  const saveContact = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const contactData = {
      ...form,
      id: form.id || uid(),
      created_at: form.created_at || now,
      updated_at: now,
    };
    const { data, error } = await supabase
      .from("contacts")
      .upsert(contactData, { onConflict: "id" })
      .select()
      .single();
    if (!error && data) {
      setContacts((prev) => {
        const idx = prev.findIndex((c) => c.id === data.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = data; return next; }
        return [...prev, data].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      });
    }
    setSaving(false);
    setShowForm(false);
  };

  const deleteContact = async (id) => {
    if (!window.confirm("Delete this contact?")) return;
    await supabase.from("contacts").delete().eq("id", id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (selectedContact?.id === id) setSelectedContact(null);
  };

  const openNew = () => {
    setForm({ ...EMPTY_CONTACT, id: uid() });
    setShowForm(true);
  };

  const openEdit = (contact) => {
    setForm({ ...contact });
    setShowForm(true);
  };

  const openDetail = (contact) => {
    setSelectedContact(contact);
    loadLinkedDeals(contact.id);
  };

  const filtered = contacts.filter((c) => {
    if (filterRole !== "all" && c.role !== filterRole) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.name || "").toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q);
    }
    return true;
  });

  const roleBadge = (role) => {
    const colors = {
      "Broker": "#6366f1", "Seller / Owner": "#22c55e", "Advisor": "#0ea5e9",
      "Lender": "#f59e0b", "Attorney": "#e879f9", "CPA": "#ef4444",
      "Investor": "#14b8a6", "Other": "#64748b",
    };
    const color = colors[role] || "#64748b";
    return {
      display: "inline-block", background: color + "20", color,
      fontSize: 11, fontWeight: 700, padding: "2px 8px",
      borderRadius: 10, textTransform: "uppercase",
    };
  };

  // Detail view
  if (selectedContact) {
    const c = selectedContact;
    const dealNames = linkedDeals.map((did) => {
      const d = deals.find((dl) => dl.id === did);
      return d ? { id: d.id, name: d.company, stage: d.stage } : null;
    }).filter(Boolean);
    const availableDeals = deals.filter((d) => !linkedDeals.includes(d.id));

    return (
      <div style={{ padding: "24px 28px", maxWidth: 700, margin: "0 auto" }}>
        <button
          style={{ ...btn("transparent"), color: "#6366f1", padding: 0, marginBottom: 16, fontSize: 13 }}
          onClick={() => setSelectedContact(null)}
        >
          ← Back to Contacts
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#f1f5f9" }}>{c.name}</h2>
          <span style={roleBadge(c.role)}>{c.role}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button style={btn("#6366f1")} onClick={() => openEdit(c)}>Edit</button>
            <button style={btn("#dc2626")} onClick={() => deleteContact(c.id)}>Delete</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div style={{ background: "#141829", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
            <div style={{ ...labelStyle, fontSize: 13, marginBottom: 14 }}>Contact Info</div>
            {[
              ["Company", c.company || "—"],
              ["Email", c.email || "—"],
              ["Phone", c.phone || "—"],
              ["LinkedIn", c.linkedin || "—"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #111827" }}>
                <span style={{ color: "#64748b", fontSize: 13 }}>{k}</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: "#e2e8f0" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "#141829", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
            <div style={{ ...labelStyle, fontSize: 13, marginBottom: 14 }}>Linked Deals</div>
            {dealNames.length === 0 ? (
              <div style={{ color: "#475569", fontSize: 13 }}>No linked deals</div>
            ) : (
              dealNames.map((d) => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #111827" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{d.name}</span>
                  <button style={{ ...btn("#334155"), fontSize: 11 }} onClick={() => unlinkDeal(c.id, d.id)}>Unlink</button>
                </div>
              ))
            )}
            {availableDeals.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <select style={{ ...inputStyle, flex: 1, cursor: "pointer" }} value={linkDealId} onChange={(e) => setLinkDealId(e.target.value)}>
                  <option value="">Link a deal...</option>
                  {availableDeals.map((d) => <option key={d.id} value={d.id}>{d.company}</option>)}
                </select>
                <button style={btn("#6366f1")} onClick={() => linkDeal(c.id, linkDealId)} disabled={!linkDealId}>Link</button>
              </div>
            )}
          </div>
        </div>
        {c.notes && (
          <div style={{ background: "#141829", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
            <div style={{ ...labelStyle, fontSize: 13, marginBottom: 10 }}>Notes</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: "#cbd5e1", whiteSpace: "pre-wrap" }}>{c.notes}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>Contacts</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button style={btn("#6366f1", false)} onClick={openNew}>+ New Contact</button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input style={{ ...inputStyle, maxWidth: 280 }} placeholder="Search name, company, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={{ ...inputStyle, maxWidth: 160, cursor: "pointer" }} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="all">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Contacts Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading contacts...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b", textAlign: "left" }}>
                {["Name", "Company", "Role", "Email", "Phone"].map((h) => (
                  <th key={h} style={{ ...labelStyle, padding: "10px 12px", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: "1px solid #111827", cursor: "pointer", transition: "background 0.15s" }}
                  onClick={() => openDetail(c)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1a1f3a")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px", fontWeight: 600, color: "#e2e8f0" }}>{c.name || "—"}</td>
                  <td style={{ padding: "12px", color: "#94a3b8" }}>{c.company || "—"}</td>
                  <td style={{ padding: "12px" }}><span style={roleBadge(c.role)}>{c.role}</span></td>
                  <td style={{ padding: "12px", color: "#94a3b8" }}>{c.email || "—"}</td>
                  <td style={{ padding: "12px", color: "#94a3b8" }}>{c.phone || "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#475569" }}>
                  {contacts.length === 0 ? "No contacts yet — add your first broker or seller" : "No contacts match your search"}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowForm(false)}>
          <div style={{ background: "#0f1322", border: "1px solid #1e293b", borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, color: "#e2e8f0" }}>
              {contacts.some((c) => c.id === form.id) ? "Edit Contact" : "New Contact"}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Company</label>
                <input style={inputStyle} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>LinkedIn URL</label>
                <input style={inputStyle} value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Notes</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button style={btn("#334155")} onClick={() => setShowForm(false)}>Cancel</button>
              <button style={btn("#6366f1")} onClick={saveContact} disabled={saving || !form.name}>
                {saving ? "Saving..." : "Save Contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
