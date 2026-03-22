"use client";

import { useState } from "react";
import { Tender } from "@/lib/types";
import { ChatInput } from "@/components/chat-input";
import { AgentState } from "@/hooks/use-agent";

interface ScoutViewProps {
  agent: AgentState;
}

const MOCK_TENDERS: (Tender & { match_score: number })[] = [
  {
    id: 1, reference_number: "PW-2026-0847", solicitation_number: "PW-2026-0847",
    title: "Water Main Replacement \u2014 City of Toronto",
    description: "Replacement of aging water mains in downtown core including excavation, pipe installation, and road restoration.",
    publication_date: "2026-03-01", closing_date: "2026-04-15", status: "Open",
    procurement_category: "CNST", notice_type: "Tender Notice", procurement_method: "Competitive",
    selection_criteria: "Lowest price compliant", gsin_codes: [], unspsc_codes: [],
    regions_of_opportunity: ["Ontario"], regions_of_delivery: ["Ontario"],
    trade_agreements: ["CFTA"], contracting_entity: "City of Toronto",
    notice_url: "", attachment_urls: [], match_score: 94,
  },
  {
    id: 2, reference_number: "W8486-26-0293", solicitation_number: "W8486-26-0293",
    title: "Plumbing Retrofit \u2014 DND Base Petawawa",
    description: "Complete plumbing retrofit of barracks buildings including fixture replacement and pipe upgrades.",
    publication_date: "2026-03-05", closing_date: "2026-04-22", status: "Open",
    procurement_category: "CNST", notice_type: "Tender Notice", procurement_method: "Competitive",
    selection_criteria: "Best value", gsin_codes: [], unspsc_codes: [],
    regions_of_opportunity: ["Ontario"], regions_of_delivery: ["Ontario"],
    trade_agreements: ["CFTA"], contracting_entity: "DND",
    notice_url: "", attachment_urls: [], match_score: 91,
  },
  {
    id: 3, reference_number: "PEEL-2026-1134", solicitation_number: "PEEL-2026-1134",
    title: "Storm Sewer Rehabilitation \u2014 Region of Peel",
    description: "Rehabilitation of storm sewer infrastructure including lining, replacement, and manhole repairs.",
    publication_date: "2026-03-02", closing_date: "2026-04-10", status: "Open",
    procurement_category: "CNST", notice_type: "Tender Notice", procurement_method: "Competitive",
    selection_criteria: "Lowest price compliant", gsin_codes: [], unspsc_codes: [],
    regions_of_opportunity: ["Ontario"], regions_of_delivery: ["Ontario"],
    trade_agreements: ["CFTA"], contracting_entity: "Region of Peel",
    notice_url: "", attachment_urls: [], match_score: 87,
  },
  {
    id: 4, reference_number: "EN578-26-4401", solicitation_number: "EN578-26-4401",
    title: "HVAC & Plumbing Maintenance \u2014 PSPC Ottawa",
    description: "Standing offer for HVAC and plumbing maintenance services for federal buildings in the NCR.",
    publication_date: "2026-03-10", closing_date: "2026-05-01", status: "Open",
    procurement_category: "SRV", notice_type: "Tender Notice", procurement_method: "Competitive",
    selection_criteria: "Best value", gsin_codes: [], unspsc_codes: [],
    regions_of_opportunity: ["Ontario", "Quebec"], regions_of_delivery: ["Ontario", "Quebec"],
    trade_agreements: ["CFTA"], contracting_entity: "PSPC",
    notice_url: "", attachment_urls: [], match_score: 78,
  },
  {
    id: 5, reference_number: "HAM-2026-0562", solicitation_number: "HAM-2026-0562",
    title: "Fire Hydrant Installation Program \u2014 City of Hamilton",
    description: "Installation of new fire hydrants and connection to existing water distribution network.",
    publication_date: "2026-03-08", closing_date: "2026-04-28", status: "Open",
    procurement_category: "CNST", notice_type: "Tender Notice", procurement_method: "Competitive",
    selection_criteria: "Lowest price compliant", gsin_codes: [], unspsc_codes: [],
    regions_of_opportunity: ["Ontario"], regions_of_delivery: ["Ontario"],
    trade_agreements: ["CFTA"], contracting_entity: "City of Hamilton",
    notice_url: "", attachment_urls: [], match_score: 72,
  },
];

const FILTERS = ["All Matches", "High Match", "Closing Soon", "Ontario", "Federal"];

export function ScoutView({ agent }: ScoutViewProps) {
  const [activeFilter, setActiveFilter] = useState("All Matches");

  const filtered = MOCK_TENDERS.filter((t) => {
    if (activeFilter === "High Match") return t.match_score >= 80;
    if (activeFilter === "Closing Soon") {
      const d = new Date(t.closing_date);
      const now = new Date();
      const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 14;
    }
    if (activeFilter === "Ontario") return t.regions_of_opportunity.includes("Ontario");
    if (activeFilter === "Federal") return ["DND", "PSPC", "PWGSC"].some((e) => t.contracting_entity.includes(e));
    return true;
  });

  const highMatch = MOCK_TENDERS.filter((t) => t.match_score >= 80).length;
  const closingSoon = MOCK_TENDERS.filter((t) => {
    const d = new Date(t.closing_date);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 14;
  }).length;
  const avgScore = Math.round(MOCK_TENDERS.reduce((s, t) => s + t.match_score, 0) / MOCK_TENDERS.length);

  const handleAnalyze = (tender: Tender) => {
    agent.setSelectedTender(tender);
    agent.completeAgent("scout");
    agent.setActiveAgent("analyst");
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-10 py-8">
        {/* Title */}
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400 }}>
          Matching Tenders
        </h1>
        <p
          className="mt-1 text-[13px]"
          style={{ color: "var(--text-muted)" }}
        >
          Based on your profile{agent.profile ? `: ${agent.profile.capabilities || agent.profile.company_name}, ${agent.profile.province}` : ""}
        </p>

        {/* Filters */}
        <div className="flex gap-0 mt-6 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="text-[11px] tracking-[0.8px] uppercase px-4 py-2.5 border transition-colors"
              style={{
                fontFamily: "var(--font-mono)",
                borderColor: "var(--bidly-border)",
                background: activeFilter === f ? "var(--text-primary)" : "var(--white)",
                color: activeFilter === f ? "var(--white)" : "var(--text-secondary)",
                cursor: "pointer",
                marginLeft: f === FILTERS[0] ? 0 : -1,
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total Matches", value: MOCK_TENDERS.length.toString(), color: "var(--agent-scout)", detail: "from 312 open tenders" },
            { label: "High Match (>80%)", value: highMatch.toString(), color: "var(--text-primary)" },
            { label: "Closing This Week", value: closingSoon.toString(), color: "var(--accent-red)" },
            { label: "Avg Match Score", value: `${avgScore}%`, color: "var(--text-primary)" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="border p-5"
              style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
            >
              <div
                className="text-[10px] tracking-[2px] uppercase mb-2"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
              >
                {stat.label}
              </div>
              <div
                className="text-2xl font-semibold"
                style={{ fontFamily: "var(--font-mono)", color: stat.color }}
              >
                {stat.value}
              </div>
              {stat.detail && (
                <div className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                  {stat.detail}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tender List */}
        <div className="space-y-3">
          {filtered.map((tender) => {
            const isHigh = tender.match_score >= 80;
            const closingDate = new Date(tender.closing_date);
            const daysLeft = Math.ceil((closingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const isUrgent = daysLeft <= 14;

            return (
              <div
                key={tender.id}
                className="border flex items-center gap-6 p-5"
                style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
              >
                {/* Match Score */}
                <div className="text-center flex-shrink-0 w-14">
                  <div
                    className="text-xl font-semibold"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: isHigh ? "var(--success)" : "var(--agent-profile)",
                    }}
                  >
                    {tender.match_score}%
                  </div>
                  <div
                    className="text-[8px] tracking-[1.5px] uppercase"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                  >
                    Match
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {tender.title}
                  </div>
                  <div
                    className="flex gap-4 mt-1 text-[11px]"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                  >
                    <span>{tender.reference_number}</span>
                    <span style={isUrgent ? { color: "var(--accent-red)", fontWeight: 500 } : {}}>
                      Closes {closingDate.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                    </span>
                    <span>{tender.contracting_entity}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex gap-1.5 flex-shrink-0">
                  <span
                    className="text-[9px] tracking-[0.8px] uppercase px-2.5 py-1"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: isHigh ? "#ecfdf5" : "var(--bg)",
                      color: isHigh ? "var(--success)" : "var(--text-muted)",
                    }}
                  >
                    {tender.procurement_category}
                  </span>
                  {tender.regions_of_delivery[0] && (
                    <span
                      className="text-[9px] tracking-[0.8px] uppercase px-2.5 py-1"
                      style={{
                        fontFamily: "var(--font-mono)",
                        background: "var(--bg)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {tender.regions_of_delivery[0]}
                    </span>
                  )}
                </div>

                {/* Action */}
                <button
                  onClick={() => handleAnalyze(tender)}
                  className="text-[11px] tracking-[1px] uppercase px-4 py-2 border flex-shrink-0 transition-colors hover:border-[var(--agent-scout)] hover:text-[var(--agent-scout)]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    borderColor: "var(--bidly-border)",
                    background: "var(--white)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  Analyze &rarr;
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Input */}
      <ChatInput agentId="scout" onSend={() => {}} disabled />
    </div>
  );
}
