import { useState, useEffect } from "react";

// Styles shared with parent
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

const STAGES = [
  { id: "identified", label: "Identified" },
  { id: "initial_review", label: "Initial Review" },
  { id: "outreach", label: "Outreach" },
  { id: "diligence", label: "Due Diligence" },
  { id: "loi", label: "LOI / Negotiation" },
  { id: "closed", label: "Closed" },
  { id: "passed", label: "Passed" },
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

export default function DealForm({ initialData, isEdit, saving, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(initialData);

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  const Field = (lbl, field, type = "text", half = false) => (
    <div style={{ gridColumn: half ? "span 1" : "span 2" }}>
      <label style={labelStyle}>{lbl}</label>
      <input
        style={inputStyle}
        type={type}
        value={form[field] || ""}
        onChange={(e) => update(field, e.target.value)}
      />
    </div>
  );

  const Select = (lbl, field, options, half = false) => (
    <div style={{ gridColumn: half ? "span 1" : "span 2" }}>
      <label style={labelStyle}>{lbl}</label>
      <select
        style={{ ...inputStyle, cursor: "pointer" }}
        value={form[field] || ""}
        onChange={(e) => update(field, e.target.value)}
      >
        {options.map((o) => {
          const val = typeof o === "object" ? o.value : o;
          const lab = typeof o === "object" ? o.label : o;
          return <option key={val} value={val}>{lab}</option>;
        })}
      </select>
    </div>
  );

  const TextArea = (lbl, field) => (
    <div style={{ gridColumn: "span 2" }}>
      <label style={labelStyle}>{lbl}</label>
      <textarea
        style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
        value={form[field] || ""}
        onChange={(e) => update(field, e.target.value)}
      />
    </div>
  );

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0f1322", border: "1px solid #1e293b", borderRadius: 16,
          padding: 28, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, color: "#e2e8f0" }}>
          {isEdit ? "Edit Deal" : "New Deal"}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {Field("Company Name", "company", "text", true)}
          {Field("Location", "location", "text", true)}
          {Select("Sector", "sector", SECTORS, true)}
          {Select("Source", "source", SOURCES, true)}
          {Select("Stage", "stage", STAGES.map((s) => ({ value: s.id, label: s.label })), true)}
          <div style={{ gridColumn: "span 1" }}>
            <label style={labelStyle}>Rating</label>
            <Stars value={form.rating || 3} onChange={(v) => update("rating", v)} />
          </div>
          {Field("Revenue ($)", "revenue", "number", true)}
          {Field("EBITDA ($)", "ebitda", "number", true)}
          {Field("Asking Price ($)", "asking_price", "number", true)}
          <div />
          <div style={{ gridColumn: "span 2", borderTop: "1px solid #1e293b", margin: "4px 0" }} />
          {Field("Contact Name", "contact_name", "text", true)}
          {Field("Contact Email", "contact_email", "email", true)}
          {Field("Contact Phone", "contact_phone", "tel", true)}
          {Field("Broker", "broker", "text", true)}
          <div style={{ gridColumn: "span 2", borderTop: "1px solid #1e293b", margin: "4px 0" }} />
          {Field("Next Step", "next_step")}
          {Field("Next Step Date", "next_step_date", "date", true)}
          <div />
          {TextArea("Notes", "notes")}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button style={btn("#334155", true)} onClick={onClose}>Cancel</button>
          {isEdit && (
            <button style={btn("#dc2626", true)} onClick={() => { if (window.confirm("Delete this deal?")) onDelete(form.id); }}>
              Delete
            </button>
          )}
          <button style={btn("#6366f1")} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Deal"}
          </button>
        </div>
      </div>
    </div>
  );
}
