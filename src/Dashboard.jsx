import { useState } from "react";

const STAGES = [
  { id: "identified", label: "Identified", color: "#64748b" },
  { id: "initial_review", label: "Initial Review", color: "#6366f1" },
  { id: "outreach", label: "Outreach", color: "#0ea5e9" },
  { id: "diligence", label: "Due Diligence", color: "#f59e0b" },
  { id: "loi", label: "LOI / Negotiation", color: "#e879f9" },
  { id: "closed", label: "Closed", color: "#22c55e" },
  { id: "passed", label: "Passed", color: "#ef4444" },
];

const card = {
  background: "#141829",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: 20,
};

const metricLabel = {
  fontSize: 11,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: 0.8,
  marginBottom: 4,
};

const metricValue = {
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: -0.5,
};

const fmt = (v) => {
  const n = parseFloat(v);
  if (isNaN(n) || n === 0) return "$0";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};

// Simple horizontal bar chart
const HBar = ({ data, colorKey }) => {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 120, fontSize: 12, color: "#94a3b8", textAlign: "right", flexShrink: 0 }}>
            {d.label}
          </div>
          <div style={{ flex: 1, background: "#0f1322", borderRadius: 4, height: 24, position: "relative", overflow: "hidden" }}>
            <div
              style={{
                width: `${(d.value / maxVal) * 100}%`,
                height: "100%",
                background: d.color || colorKey || "#6366f1",
                borderRadius: 4,
                transition: "width 0.5s ease",
                minWidth: d.value > 0 ? 2 : 0,
              }}
            />
            <span style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              fontSize: 11, fontWeight: 700, color: "#e2e8f0",
            }}>
              {d.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Funnel visualization
const Funnel = ({ stages }) => {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {stages.map((s) => {
        const width = Math.max((s.count / maxCount) * 100, 8);
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 110, fontSize: 11, color: "#94a3b8", textAlign: "right", flexShrink: 0 }}>
              {s.label}
            </div>
            <div
              style={{
                width: `${width}%`,
                background: `${s.color}30`,
                border: `1px solid ${s.color}`,
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 13,
                fontWeight: 700,
                color: s.color,
                textAlign: "center",
                transition: "width 0.5s ease",
              }}
            >
              {s.count}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function Dashboard({ deals }) {
  const active = deals.filter((d) => d.stage !== "passed" && d.stage !== "closed");
  const closed = deals.filter((d) => d.stage === "closed");
  const passed = deals.filter((d) => d.stage === "passed");

  // Key metrics
  const totalDeals = deals.length;
  const totalPipelineEbitda = active.reduce((s, d) => s + (parseFloat(d.ebitda) || 0), 0);
  const totalPipelineValue = active.reduce((s, d) => s + (parseFloat(d.asking_price) || 0), 0);
  const avgMultiple = (() => {
    const withMultiple = deals.filter((d) => d.multiple && parseFloat(d.multiple));
    if (withMultiple.length === 0) return "—";
    const avg = withMultiple.reduce((s, d) => s + parseFloat(d.multiple), 0) / withMultiple.length;
    return avg.toFixed(1) + "x";
  })();
  const avgRating = (() => {
    if (active.length === 0) return "—";
    return (active.reduce((s, d) => s + (d.rating || 0), 0) / active.length).toFixed(1);
  })();
  const conversionRate = totalDeals > 0 ? ((closed.length / totalDeals) * 100).toFixed(0) + "%" : "—";
  const passRate = totalDeals > 0 ? ((passed.length / totalDeals) * 100).toFixed(0) + "%" : "—";

  // Deals by stage (funnel)
  const stageData = STAGES.filter((s) => s.id !== "passed").map((s) => ({
    ...s,
    count: deals.filter((d) => d.stage === s.id).length,
  }));

  // Deals by sector
  const sectorCounts = {};
  deals.forEach((d) => {
    const sec = d.sector || "Other";
    sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
  });
  const sectorData = Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  // Deals by source
  const sourceCounts = {};
  deals.forEach((d) => {
    const src = d.source || "Other";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  const sourceData = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: "#0ea5e9" }));

  // EBITDA distribution
  const ebitdaBuckets = [
    { label: "< $500K", min: 0, max: 500000 },
    { label: "$500K–$1M", min: 500000, max: 1000000 },
    { label: "$1M–$2M", min: 1000000, max: 2000000 },
    { label: "$2M–$3M", min: 2000000, max: 3000000 },
    { label: "$3M+", min: 3000000, max: Infinity },
  ];
  const ebitdaData = ebitdaBuckets.map((b) => ({
    label: b.label,
    value: deals.filter((d) => {
      const e = parseFloat(d.ebitda) || 0;
      return e >= b.min && e < b.max;
    }).length,
    color: "#22c55e",
  }));

  // Recent activity (deals updated in last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const recentlyActive = deals
    .filter((d) => d.updated_at > weekAgo)
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
    .slice(0, 5);

  // Upcoming next steps
  const upcoming = deals
    .filter((d) => d.next_step && d.next_step_date && d.stage !== "passed" && d.stage !== "closed")
    .sort((a, b) => (a.next_step_date || "").localeCompare(b.next_step_date || ""))
    .slice(0, 5);

  if (deals.length === 0) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center", color: "#475569" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#94a3b8" }}>No data yet</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Add some deals to see your pipeline analytics</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px" }}>
      {/* Key Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Total Deals", value: totalDeals, color: "#e2e8f0" },
          { label: "Active Deals", value: active.length, color: "#6366f1" },
          { label: "Pipeline EBITDA", value: fmt(totalPipelineEbitda), color: "#22c55e" },
          { label: "Pipeline Value", value: fmt(totalPipelineValue), color: "#f59e0b" },
          { label: "Avg Multiple", value: avgMultiple, color: "#e879f9" },
          { label: "Avg Rating", value: avgRating, color: "#f59e0b" },
          { label: "Close Rate", value: conversionRate, color: "#22c55e" },
          { label: "Pass Rate", value: passRate, color: "#ef4444" },
        ].map((m) => (
          <div key={m.label} style={card}>
            <div style={metricLabel}>{m.label}</div>
            <div style={{ ...metricValue, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Pipeline Funnel */}
        <div style={card}>
          <div style={{ ...metricLabel, fontSize: 13, marginBottom: 16 }}>Pipeline Funnel</div>
          <Funnel stages={stageData} />
        </div>

        {/* Deals by Sector */}
        <div style={card}>
          <div style={{ ...metricLabel, fontSize: 13, marginBottom: 16 }}>Deals by Sector</div>
          {sectorData.length > 0 ? <HBar data={sectorData} colorKey="#6366f1" /> : <div style={{ color: "#475569", fontSize: 13 }}>No data</div>}
        </div>

        {/* Deals by Source */}
        <div style={card}>
          <div style={{ ...metricLabel, fontSize: 13, marginBottom: 16 }}>Deals by Source</div>
          {sourceData.length > 0 ? <HBar data={sourceData} /> : <div style={{ color: "#475569", fontSize: 13 }}>No data</div>}
        </div>

        {/* EBITDA Distribution */}
        <div style={card}>
          <div style={{ ...metricLabel, fontSize: 13, marginBottom: 16 }}>EBITDA Distribution</div>
          <HBar data={ebitdaData} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Upcoming Next Steps */}
        <div style={card}>
          <div style={{ ...metricLabel, fontSize: 13, marginBottom: 16 }}>Upcoming Next Steps</div>
          {upcoming.length === 0 ? (
            <div style={{ color: "#475569", fontSize: 13 }}>No upcoming steps</div>
          ) : (
            upcoming.map((d) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #111827" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{d.company}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{d.next_step}</div>
                </div>
                <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, flexShrink: 0 }}>
                  {new Date(d.next_step_date).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recently Updated */}
        <div style={card}>
          <div style={{ ...metricLabel, fontSize: 13, marginBottom: 16 }}>Recently Updated</div>
          {recentlyActive.length === 0 ? (
            <div style={{ color: "#475569", fontSize: 13 }}>No recent activity</div>
          ) : (
            recentlyActive.map((d) => {
              const stage = STAGES.find((s) => s.id === d.stage);
              return (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #111827" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{d.company}</div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: stage?.color || "#94a3b8",
                      background: (stage?.color || "#94a3b8") + "20",
                      padding: "2px 8px", borderRadius: 10, textTransform: "uppercase",
                    }}>
                      {stage?.label || d.stage}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {new Date(d.updated_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
