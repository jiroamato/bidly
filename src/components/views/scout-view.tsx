"use client";

import { useState, useEffect, useCallback } from "react";
import { Tender } from "@/lib/types";
import { ChatPanel } from "@/components/chat-panel";
import { AgentState } from "@/hooks/use-agent";

interface ScoutViewProps {
  agent: AgentState;
  externalValue?: string;
}

type TenderWithScore = Tender & {
  match_score: number;
  bm25_score: number;
  category_score: number;
  synonym_score: number;
  location_score: number;
  matched_keywords: string[];
};

const FILTERS = ["All Matches", "High Match", "Closing Soon", "Ontario", "Federal"];

export function ScoutView({ agent, externalValue }: ScoutViewProps) {
  const [activeFilter, setActiveFilter] = useState("All Matches");
  const [tenders, setTenders] = useState<TenderWithScore[]>([]);
  const [loading, setLoading] = useState(true);

  const profileId = agent.profile?.id;

  // Fetch scored tenders from match endpoint
  const loadTenders = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenders/match?profileId=${profileId}`);
      if (!res.ok) throw new Error("Failed to load tenders");
      const data: Tender[] = await res.json();
      // Use match_score from the API if available, default to 0
      const scored: TenderWithScore[] = data.map((t) => ({
        ...t,
        match_score: (t as TenderWithScore).match_score ?? 0,
        bm25_score: (t as TenderWithScore).bm25_score ?? 0,
        category_score: (t as TenderWithScore).category_score ?? 0,
        synonym_score: (t as TenderWithScore).synonym_score ?? 0,
        location_score: (t as TenderWithScore).location_score ?? 0,
        matched_keywords: (t as TenderWithScore).matched_keywords ?? [],
      }));
      scored.sort((a, b) => b.match_score - a.match_score);
      setTenders(scored);
    } catch (err) {
      console.error("Failed to load tenders:", err);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  const filtered = tenders.filter((t) => {
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

  const highMatch = tenders.filter((t) => t.match_score >= 80).length;
  const closingSoon = tenders.filter((t) => {
    const d = new Date(t.closing_date);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 14;
  }).length;
  const avgScore = tenders.length > 0
    ? Math.round(tenders.reduce((s, t) => s + t.match_score, 0) / tenders.length)
    : 0;

  const handleAnalyze = (tender: Tender) => {
    agent.setSelectedTender(tender);
    agent.completeAgent("scout");
    agent.setActiveAgent("analyst");
  };

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex-1 overflow-y-auto min-h-0">
      <div className="px-10 py-8">
        {/* Title */}
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 400 }}>
          Matching Tenders
        </h1>
        <p
          className="mt-1 text-[13px]"
          style={{ color: "var(--text-muted)" }}
        >
          Based on your profile{agent.profile ? `: ${agent.profile.capabilities || agent.profile.company_name}, ${agent.profile.province}` : ""}
        </p>

        {loading && (
          <div className="mt-8 text-center py-12" style={{ color: "var(--text-muted)" }}>
            <div className="text-[11px] tracking-[2px] uppercase" style={{ fontFamily: "var(--font-mono)" }}>
              Loading tenders...
            </div>
          </div>
        )}

        {!loading && tenders.length === 0 && (
          <div className="mt-8 text-center py-12" style={{ color: "var(--text-muted)" }}>
            <div className="text-[11px] tracking-[2px] uppercase" style={{ fontFamily: "var(--font-mono)" }}>
              No matching tenders found. Ask the Scout Agent to find matches for your profile.
            </div>
          </div>
        )}

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
            { label: "Total Matches", value: tenders.length.toString(), color: "var(--agent-scout)", detail: `from ${tenders.length} loaded tenders` },
            { label: "High Match (>80%)", value: highMatch.toString(), color: "var(--text-primary)" },
            { label: "Closing Soon", value: closingSoon.toString(), color: "var(--accent-red)" },
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
      </div>

      {/* Chat Panel */}
      <ChatPanel
        agentId="scout"
        profileId={agent.profile?.id}
        tenderId={agent.selectedTender?.id}
        externalValue={externalValue}
      />
    </div>
  );
}
