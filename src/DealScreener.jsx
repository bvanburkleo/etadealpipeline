import { useState } from "react";

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

const card = {
  background: "#141829",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: 20,
};

const fmt = (v) => {
  const n = parseFloat(v);
  if (isNaN(n) || n === 0) return "$0";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};

const pct = (v) => (v * 100).toFixed(1) + "%";

export default function DealScreener() {
  const [form, setForm] = useState({
    revenue: "",
    ebitda: "",
    askingPrice: "",
    downPayment: "10",
    sbaRate: "10.5",
    sbaTerm: "10",
    sellerNoteRate: "6",
    sellerNoteTerm: "5",
    sellerNotePercent: "10",
  });

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const rev = parseFloat(form.revenue) || 0;
  const ebitda = parseFloat(form.ebitda) || 0;
  const asking = parseFloat(form.askingPrice) || 0;

  // Derived metrics
  const ebitdaMargin = rev > 0 ? ebitda / rev : 0;
  const multiple = ebitda > 0 ? asking / ebitda : 0;

  // SBA eligibility checks
  const sbaMaxLoan = 5000000;
  const sbaEligible = asking <= sbaMaxLoan;
  const downPct = parseFloat(form.downPayment) / 100 || 0.1;
  const sellerNotePct = parseFloat(form.sellerNotePercent) / 100 || 0.1;

  // Deal structure
  const equityInjection = asking * downPct;
  const sellerNote = asking * sellerNotePct;
  const sbaLoan = asking - equityInjection - sellerNote;

  // SBA monthly payment
  const sbaRateMonthly = (parseFloat(form.sbaRate) / 100) / 12;
  const sbaMonths = parseFloat(form.sbaTerm) * 12;
  const sbaPayment = sbaRateMonthly > 0 && sbaMonths > 0
    ? (sbaLoan * sbaRateMonthly * Math.pow(1 + sbaRateMonthly, sbaMonths)) / (Math.pow(1 + sbaRateMonthly, sbaMonths) - 1)
    : 0;

  // Seller note monthly payment
  const snRateMonthly = (parseFloat(form.sellerNoteRate) / 100) / 12;
  const snMonths = parseFloat(form.sellerNoteTerm) * 12;
  const snPayment = snRateMonthly > 0 && snMonths > 0
    ? (sellerNote * snRateMonthly * Math.pow(1 + snRateMonthly, snMonths)) / (Math.pow(1 + snRateMonthly, snMonths) - 1)
    : 0;

  const totalAnnualDebt = (sbaPayment + snPayment) * 12;
  const dscr = totalAnnualDebt > 0 ? ebitda / totalAnnualDebt : 0;
  const freeCashFlow = ebitda - totalAnnualDebt;
  const cashOnCash = equityInjection > 0 ? freeCashFlow / equityInjection : 0;

  // Scoring
  const getScore = () => {
    let score = 0;
    let notes = [];
    if (multiple > 0 && multiple <= 3) { score += 25; notes.push("✅ Attractive multiple (≤3x)"); }
    else if (multiple <= 4) { score += 15; notes.push("⚠️ Moderate multiple (3-4x)"); }
    else if (multiple > 4) { score += 5; notes.push("🔴 High multiple (>4x)"); }
    if (ebitdaMargin >= 0.2) { score += 25; notes.push("✅ Strong margins (≥20%)"); }
    else if (ebitdaMargin >= 0.1) { score += 15; notes.push("⚠️ Moderate margins (10-20%)"); }
    else if (ebitdaMargin > 0) { score += 5; notes.push("🔴 Thin margins (<10%)"); }
    if (dscr >= 1.5) { score += 25; notes.push("✅ Strong DSCR (≥1.5x)"); }
    else if (dscr >= 1.25) { score += 15; notes.push("⚠️ Adequate DSCR (1.25-1.5x)"); }
    else if (dscr > 0) { score += 5; notes.push("🔴 Weak DSCR (<1.25x)"); }
    if (sbaEligible) { score += 15; notes.push("✅ SBA eligible (≤$5M)"); }
    else { score += 0; notes.push("🔴 Exceeds SBA limit"); }
    if (cashOnCash >= 0.5) { score += 10; notes.push("✅ Strong cash-on-cash (≥50%)"); }
    else if (cashOnCash >= 0.25) { score += 5; notes.push("⚠️ Moderate cash-on-cash (25-50%)"); }
    else { score += 0; notes.push("🔴 Low cash-on-cash (<25%)"); }
    return { score, notes };
  };

  const hasData = rev > 0 || ebitda > 0 || asking > 0;
  const { score, notes } = hasData ? getScore() : { score: 0, notes: [] };
  const scoreColor = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
  const scoreLabel = score >= 70 ? "STRONG" : score >= 45 ? "MODERATE" : "WEAK";

  return (
    <div style={{ padding: "20px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>Quick Deal Screener</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
          Enter deal financials for instant valuation analysis and SBA eligibility check
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Input Section */}
        <div>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ ...labelStyle, fontSize: 13, marginBottom: 14 }}>Deal Financials</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Revenue ($)</label>
                <input style={inputStyle} type="number" value={form.revenue} onChange={(e) => update("revenue", e.target.value)} placeholder="5000000" />
              </div>
              <div>
                <label style={labelStyle}>EBITDA ($)</label>
                <input style={inputStyle} type="number" value={form.ebitda} onChange={(e) => update("ebitda", e.target.value)} placeholder="1000000" />
              </div>
              <div>
                <label style={labelStyle}>Asking Price ($)</label>
                <input style={inputStyle} type="number" value={form.askingPrice} onChange={(e) => update("askingPrice", e.target.value)} placeholder="3500000" />
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{ ...labelStyle, fontSize: 13, marginBottom: 14 }}>Deal Structure</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Down Payment %</label>
                <input style={inputStyle} type="number" value={form.downPayment} onChange={(e) => update("downPayment", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Seller Note %</label>
                <input style={inputStyle} type="number" value={form.sellerNotePercent} onChange={(e) => update("sellerNotePercent", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>SBA Rate %</label>
                <input style={inputStyle} type="number" step="0.1" value={form.sbaRate} onChange={(e) => update("sbaRate", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>SBA Term (yrs)</label>
                <input style={inputStyle} type="number" value={form.sbaTerm} onChange={(e) => update("sbaTerm", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Seller Note Rate %</label>
                <input style={inputStyle} type="number" step="0.1" value={form.sellerNoteRate} onChange={(e) => update("sellerNoteRate", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Seller Note Term (yrs)</label>
                <input style={inputStyle} type="number" value={form.sellerNoteTerm} onChange={(e) => update("sellerNoteTerm", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div>
          {/* Score */}
          {hasData && (
            <div style={{ ...card, marginBottom: 16, textAlign: "center", borderColor: scoreColor + "40" }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: scoreColor }}>{score}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: scoreColor, letterSpacing: 1 }}>{scoreLabel}</div>
              <div style={{ marginTop: 12, textAlign: "left" }}>
                {notes.map((n, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#cbd5e1", padding: "3px 0" }}>{n}</div>
                ))}
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ ...labelStyle, fontSize: 13, marginBottom: 14 }}>Key Metrics</div>
            {[
              ["EBITDA Margin", ebitdaMargin > 0 ? pct(ebitdaMargin) : "—", ebitdaMargin >= 0.2 ? "#22c55e" : ebitdaMargin >= 0.1 ? "#f59e0b" : "#ef4444"],
              ["Multiple", multiple > 0 ? multiple.toFixed(1) + "x" : "—", multiple <= 3 ? "#22c55e" : multiple <= 4 ? "#f59e0b" : "#ef4444"],
              ["DSCR", dscr > 0 ? dscr.toFixed(2) + "x" : "—", dscr >= 1.5 ? "#22c55e" : dscr >= 1.25 ? "#f59e0b" : "#ef4444"],
              ["Annual Debt Service", totalAnnualDebt > 0 ? fmt(totalAnnualDebt) : "—", "#e2e8f0"],
              ["Free Cash Flow", hasData ? fmt(freeCashFlow) : "—", freeCashFlow > 0 ? "#22c55e" : "#ef4444"],
              ["Cash-on-Cash Return", cashOnCash > 0 ? pct(cashOnCash) : "—", cashOnCash >= 0.5 ? "#22c55e" : cashOnCash >= 0.25 ? "#f59e0b" : "#ef4444"],
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #111827" }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>{k}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: c }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Sources & Uses */}
          {hasData && (
            <div style={card}>
              <div style={{ ...labelStyle, fontSize: 13, marginBottom: 14 }}>Sources & Uses</div>
              <div style={{ display: "flex", gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>Sources</div>
                  {[
                    ["Equity (Down Payment)", equityInjection, "#6366f1"],
                    ["SBA Loan", sbaLoan, "#0ea5e9"],
                    ["Seller Note", sellerNote, "#f59e0b"],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: 12, color }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{fmt(val)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #1e293b", marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>Total</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{fmt(asking)}</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>Monthly Payments</div>
                  {[
                    ["SBA Payment", sbaPayment, "#0ea5e9"],
                    ["Seller Note Payment", snPayment, "#f59e0b"],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: 12, color }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{fmt(val)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #1e293b", marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>Total Monthly</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{fmt(sbaPayment + snPayment)}</span>
                  </div>
                </div>
              </div>
              {/* SBA Badge */}
              <div style={{
                marginTop: 12, padding: "8px 12px", borderRadius: 8, textAlign: "center",
                background: sbaEligible ? "#22c55e15" : "#ef444415",
                border: `1px solid ${sbaEligible ? "#22c55e40" : "#ef444440"}`,
                color: sbaEligible ? "#22c55e" : "#ef4444",
                fontSize: 12, fontWeight: 700,
              }}>
                {sbaEligible ? "✅ SBA 7(a) ELIGIBLE — Loan amount within $5M limit" : "❌ EXCEEDS SBA 7(a) LIMIT — Loan would exceed $5M"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
