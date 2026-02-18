import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const card = {
  background: "#141829", border: "1px solid #1e293b", borderRadius: 12, padding: 20,
};
const metricLabel = {
  fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4,
};
const metricValue = { fontSize: 28, fontWeight: 800, letterSpacing: -0.5 };

// Get date ranges
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });
const quarterNum = Math.floor(now.getMonth() / 3) + 1;
const quarterLabel = `Q${quarterNum} ${now.getFullYear()}`;

const inRange = (dateStr, start) => {
  if (!dateStr) return false;
  return new Date(dateStr) >= start;
};

const ProgressBar = ({ value, target, color = "#6366f1", label, unit = "" }) => {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const status = pct >= 100 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: status }}>
          {value}{unit} / {target}{unit}
        </span>
      </div>
      <div style={{ background: "#0f1322", borderRadius: 6, height: 10, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", background: status,
          borderRadius: 6, transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
};

const StatusDot = ({ status }) => {
  const colors = { green: "#22c55e", yellow: "#f59e0b", red: "#ef4444" };
  const labels = { green: "On Track", yellow: "At Risk", red: "Behind" };
  const c = colors[status] || colors.red;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: c, background: c + "15",
      padding: "3px 8px", borderRadius: 8, textTransform: "uppercase",
      border: `1px solid ${c}30`,
    }}>
      ● {labels[status] || "Behind"}
    </span>
  );
};

const getStatus = (value, target) => {
  if (target === 0) return "green";
  const pct = value / target;
  if (pct >= 1) return "green";
  // Proportional to time elapsed in period
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const timePct = dayOfMonth / daysInMonth;
  if (pct >= timePct * 0.8) return "yellow";
  return "red";
};

const getQStatus = (value, target) => {
  if (target === 0) return "green";
  const pct = value / target;
  if (pct >= 1) return "green";
  const monthInQ = now.getMonth() % 3;
  const timePct = (monthInQ + now.getDate() / 30) / 3;
  if (pct >= timePct * 0.7) return "yellow";
  return "red";
};

export default function Scorecard({ deals }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>Loading scorecard...</div>;
  }

  // ─── COMPUTE KPIs ─────────────────────────────────────────

  // Monthly activities
  const monthActs = activities.filter((a) => inRange(a.activity_date, startOfMonth));
  const quarterActs = activities.filter((a) => inRange(a.activity_date, startOfQuarter));

  // 1. Outbound contacts (target: 3/month)
  const outboundThisMonth = monthActs.filter((a) => a.is_outbound && !a.deal_id).length;
  const outboundTarget = 3;

  // 2. Response rate on outreach (target: 40%)
  const outboundTotal = activities.filter((a) => a.is_outbound && !a.deal_id);
  const responsesTotal = outboundTotal.filter((a) => a.got_response).length;
  const responseRate = outboundTotal.length > 0 ? Math.round((responsesTotal / outboundTotal.length) * 100) : 0;
  const responseRateTarget = 40;

  // 3. New contacts by type this month
  const newBrokerContacts = monthActs.filter((a) => !a.deal_id && (
    a.contact_type === "Broker / Intermediary" || a.contact_type === "M&A Advisor" || a.contact_type === "Banker / Lender"
  )).length;
  const newBrokerTarget = 3;

  // 4. Meetings scheduled/completed this quarter (target: 3/quarter)
  const meetingsThisQ = quarterActs.filter((a) =>
    !a.deal_id && (a.activity_type === "meeting" || a.activity_type === "coffee")
  ).length;
  const meetingsTarget = 3;

  // 5. Criteria shared publicly this month (target: 3 instances/month from goal)
  const criteriaSharedMonth = monthActs.filter((a) => a.is_public_share).length;
  const criteriaSharedTarget = 3;

  // 6. Give-first actions (intros made) this month (target: 1/month)
  const introsMadeMonth = monthActs.filter((a) => a.activity_type === "intro_made").length;
  const introsTarget = 1;

  // 7. Qualified CIMs received this quarter (target: 1/quarter)
  const cimsThisQ = quarterActs.filter((a) => a.activity_type === "cim_review").length;
  const cimsTarget = 1;

  // 8. Inbound leads this quarter (target: 2/quarter)
  const leadsThisQ = quarterActs.filter((a) => a.generated_lead).length;
  const leadsTarget = 2;

  // 9. Warm intros this quarter (target: 1/quarter)
  const warmIntrosQ = quarterActs.filter((a) =>
    a.activity_type === "intro_made" && a.generated_lead
  ).length;
  const warmIntrosTarget = 1;

  // 10. CIM logging discipline: all CIM reviews
  const allCims = activities.filter((a) => a.activity_type === "cim_review");
  const cimsWithDecision = allCims.filter((a) => a.description && a.description.length > 20);
  const cimLogRate = allCims.length > 0 ? Math.round((cimsWithDecision.length / allCims.length) * 100) : 100;

  // Deal pipeline stats
  const activeDeals = deals.filter((d) => d.stage !== "passed" && d.stage !== "closed");
  const totalDealsReviewed = deals.length;
  const totalPassed = deals.filter((d) => d.stage === "passed").length;

  // Activity breakdown by contact type
  const contactTypeCounts = {};
  activities.filter((a) => !a.deal_id && a.contact_type).forEach((a) => {
    contactTypeCounts[a.contact_type] = (contactTypeCounts[a.contact_type] || 0) + 1;
  });
  const contactTypeData = Object.entries(contactTypeCounts).sort((a, b) => b[1] - a[1]);

  // Activity breakdown by venue
  const venueCounts = {};
  activities.filter((a) => a.venue).forEach((a) => {
    venueCounts[a.venue] = (venueCounts[a.venue] || 0) + 1;
  });
  const venueData = Object.entries(venueCounts).sort((a, b) => b[1] - a[1]);

  // Overall health score
  const scores = [
    outboundThisMonth >= outboundTarget ? 1 : outboundThisMonth / outboundTarget,
    responseRate >= responseRateTarget ? 1 : responseRate / responseRateTarget,
    meetingsThisQ >= meetingsTarget ? 1 : meetingsThisQ / meetingsTarget,
    criteriaSharedMonth >= criteriaSharedTarget ? 1 : criteriaSharedMonth / criteriaSharedTarget,
    leadsThisQ >= leadsTarget ? 1 : leadsThisQ / leadsTarget,
  ];
  const overallScore = Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 100);
  const overallColor = overallScore >= 80 ? "#22c55e" : overallScore >= 50 ? "#f59e0b" : "#ef4444";
  const overallLabel = overallScore >= 80 ? "STRONG" : overallScore >= 50 ? "ON PACE" : "NEEDS ATTENTION";

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>Search Scorecard</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
          Track your ETA search progress against goals · {monthLabel}
        </p>
      </div>

      {/* Overall Score + Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ ...card, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ ...metricLabel, fontSize: 12 }}>Overall Score</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: overallColor }}>{overallScore}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: overallColor, letterSpacing: 1 }}>{overallLabel}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {[
            { label: "Total Activities", value: activities.length, color: "#e2e8f0" },
            { label: "This Month", value: monthActs.length, color: "#6366f1" },
            { label: "Networking", value: activities.filter((a) => !a.deal_id).length, color: "#0ea5e9" },
            { label: "Deals Reviewed", value: totalDealsReviewed, color: "#f59e0b" },
            { label: "Active Pipeline", value: activeDeals.length, color: "#22c55e" },
            { label: "Response Rate", value: responseRate + "%", color: responseRate >= 40 ? "#22c55e" : "#ef4444" },
          ].map((m) => (
            <div key={m.label} style={card}>
              <div style={metricLabel}>{m.label}</div>
              <div style={{ ...metricValue, fontSize: 24, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly & Quarterly Goals */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Monthly Goals */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ ...metricLabel, fontSize: 13, margin: 0 }}>Monthly Goals — {monthLabel}</div>
          </div>

          <ProgressBar
            label="New Outbound Contacts (Brokers/Bankers)"
            value={outboundThisMonth} target={outboundTarget}
          />
          <ProgressBar
            label="New Broker/Banker/Advisor Contacts"
            value={newBrokerContacts} target={newBrokerTarget}
          />
          <ProgressBar
            label="Criteria Shared Publicly"
            value={criteriaSharedMonth} target={criteriaSharedTarget}
          />
          <ProgressBar
            label="Give-First Actions (Intros Made)"
            value={introsMadeMonth} target={introsTarget}
          />

          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 12, marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: "#94a3b8" }}>Response Rate (all-time)</span>
              <span style={{ fontWeight: 700, color: responseRate >= 40 ? "#22c55e" : "#ef4444" }}>
                {responseRate}% <span style={{ color: "#64748b", fontWeight: 400 }}>target: 40%</span>
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "#94a3b8" }}>CIM Log Compliance</span>
              <span style={{ fontWeight: 700, color: cimLogRate >= 90 ? "#22c55e" : "#f59e0b" }}>
                {cimLogRate}% <span style={{ color: "#64748b", fontWeight: 400 }}>target: 100%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quarterly Goals */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ ...metricLabel, fontSize: 13, margin: 0 }}>Quarterly Goals — {quarterLabel}</div>
          </div>

          <ProgressBar
            label="Meetings Completed (Coffee/Virtual)"
            value={meetingsThisQ} target={meetingsTarget}
          />
          <ProgressBar
            label="Qualified CIMs Received"
            value={cimsThisQ} target={cimsTarget}
          />
          <ProgressBar
            label="Inbound Leads Generated"
            value={leadsThisQ} target={leadsTarget}
          />
          <ProgressBar
            label="Warm Intros to Sellers/Brokers"
            value={warmIntrosQ} target={warmIntrosTarget}
          />

          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 12, marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: "#94a3b8" }}>Deals Passed (w/ reason logged)</span>
              <span style={{ fontWeight: 700, color: "#e2e8f0" }}>{totalPassed}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "#94a3b8" }}>Active in Pipeline</span>
              <span style={{ fontWeight: 700, color: "#22c55e" }}>{activeDeals.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* By Contact Type */}
        <div style={card}>
          <div style={{ ...metricLabel, fontSize: 13, marginBottom: 14 }}>Networking by Contact Type</div>
          {contactTypeData.length === 0 ? (
            <div style={{ color: "#475569", fontSize: 13 }}>No networking activities yet</div>
          ) : (
            contactTypeData.map(([type, count]) => {
              const maxC = contactTypeData[0][1];
              return (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 130, fontSize: 11, color: "#94a3b8", textAlign: "right", flexShrink: 0 }}>{type}</div>
                  <div style={{ flex: 1, background: "#0f1322", borderRadius: 4, height: 20, position: "relative", overflow: "hidden" }}>
                    <div style={{
                      width: `${(count / maxC) * 100}%`, height: "100%",
                      background: "#6366f1", borderRadius: 4, minWidth: 2,
                    }} />
                    <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>
                      {count}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* By Venue */}
        <div style={card}>
          <div style={{ ...metricLabel, fontSize: 13, marginBottom: 14 }}>Activities by Venue / Channel</div>
          {venueData.length === 0 ? (
            <div style={{ color: "#475569", fontSize: 13 }}>No venue data yet</div>
          ) : (
            venueData.map(([venue, count]) => {
              const maxV = venueData[0][1];
              return (
                <div key={venue} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 130, fontSize: 11, color: "#94a3b8", textAlign: "right", flexShrink: 0 }}>{venue}</div>
                  <div style={{ flex: 1, background: "#0f1322", borderRadius: 4, height: 20, position: "relative", overflow: "hidden" }}>
                    <div style={{
                      width: `${(count / maxV) * 100}%`, height: "100%",
                      background: "#0ea5e9", borderRadius: 4, minWidth: 2,
                    }} />
                    <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>
                      {count}
                    </span>
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
