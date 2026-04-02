"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { AgentState } from "@/hooks/use-agent";
import { apiFetch } from "@/lib/api-fetch";
import { TenderAnalysisData } from "@/lib/types";

interface AnalystViewProps {
  agent: AgentState;
  externalValue?: string;
}

export function AnalystView({ agent, externalValue }: AnalystViewProps) {
  const tender = agent.selectedTender;
  const [analysis, setAnalysis] = useState<TenderAnalysisData | null>(agent.tenderAnalysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tender) return;

    // Tier 1: In-memory cache — already set via useState initializer
    if (agent.tenderAnalysis) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Tier 2: Supabase lookup, then Tier 3: AI fallback
    const profileId = agent.profile?.id;

    const doAiCall = () => {
      apiFetch("/api/analyze-tender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tender, profileId }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (!cancelled) {
            setAnalysis(data.analysis);
            agent.setTenderAnalysis(data.analysis);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    if (!profileId) {
      doAiCall();
      return () => { cancelled = true; };
    }

    apiFetch(`/api/analyze-tender?profile_id=${profileId}&tender_id=${tender.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("cache-miss");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setAnalysis(data.analysis);
          agent.setTenderAnalysis(data.analysis);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Supabase lookup failed, falling back to AI:", err.message);
        doAiCall();
      });

    return () => {
      cancelled = true;
    };
  }, [tender?.id, agent.profile?.id]);

  if (!tender) {
    return (
      <div className="p-10">
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 28 }}>
          No tender selected
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Go back to Scout and select a tender to analyze.
        </p>
      </div>
    );
  }

  const handleBeginCompliance = () => {
    agent.completeAgent("analyst");
    agent.setActiveAgent("compliance");
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="px-10 py-8">
          {/* Title Row */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 400 }}>
                {tender.title}
              </h1>
              <div
                className="mt-1 text-[13px] flex items-center gap-3"
                style={{ color: "var(--text-muted)" }}
              >
                <span
                  className="text-[11px] tracking-[0.8px]"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--agent-analyst)" }}
                >
                  {tender.reference_number}
                </span>
                <span>{tender.contracting_entity}</span>
              </div>
            </div>
          </div>

          {/* Loading skeleton */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="border p-5 animate-pulse"
                style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
              >
                <div className="h-3 w-28 mb-4 rounded" style={{ background: "var(--border-light)" }} />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded" style={{ background: "var(--border-light)" }} />
                  <div className="h-3 w-4/5 rounded" style={{ background: "var(--border-light)" }} />
                  <div className="h-3 w-3/5 rounded" style={{ background: "var(--border-light)" }} />
                </div>
              </div>
            ))}
          </div>
          <div
            className="border p-5 animate-pulse"
            style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
          >
            <div className="h-3 w-36 mb-4 rounded" style={{ background: "var(--border-light)" }} />
            <div className="space-y-2">
              <div className="h-3 w-full rounded" style={{ background: "var(--border-light)" }} />
              <div className="h-3 w-3/4 rounded" style={{ background: "var(--border-light)" }} />
            </div>
          </div>
          <p className="mt-6 text-center text-[13px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Analyzing tender...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="px-10 py-8">
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 400 }}>
            {tender.title}
          </h1>
          <div className="mt-6 border p-5" style={{ background: "#fef3f2", borderColor: "var(--accent-red)" }}>
            <p className="text-[13px]" style={{ color: "var(--accent-red)" }}>
              Failed to analyze tender: {error}
            </p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                apiFetch("/api/analyze-tender", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tender, profileId: agent.profile?.id }),
                })
                  .then((res) => {
                    if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
                    return res.json();
                  })
                  .then((data) => {
                    setAnalysis(data.analysis);
                    agent.setTenderAnalysis(data.analysis);
                  })
                  .catch((err) => setError(err.message))
                  .finally(() => setLoading(false));
              }}
              className="mt-3 px-4 py-2 text-[11px] font-semibold tracking-[1.5px] uppercase cursor-pointer"
              style={{
                fontFamily: "var(--font-mono)",
                background: "var(--agent-analyst)",
                color: "var(--white)",
                border: "none",
              }}
            >
              Retry
            </button>
          </div>
        </div>
        <ChatPanel agentId="analyst" selectedTender={agent.selectedTender} profile={agent.profile} externalValue={externalValue} />
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex-1 overflow-y-auto min-h-0">
      <div className="px-10 py-8">
        {/* Title Row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 400 }}>
              {tender.title}
            </h1>
            <div
              className="mt-1 text-[13px] flex items-center gap-3"
              style={{ color: "var(--text-muted)" }}
            >
              <span
                className="text-[11px] tracking-[0.8px]"
                style={{ fontFamily: "var(--font-mono)", color: "var(--agent-analyst)" }}
              >
                {tender.reference_number}
              </span>
              <span>{tender.contracting_entity}</span>
            </div>
          </div>
          <button
            onClick={handleBeginCompliance}
            className="px-5 py-2.5 text-[11px] font-semibold tracking-[1.5px] uppercase cursor-pointer transition-opacity hover:opacity-80"
            style={{
              fontFamily: "var(--font-mono)",
              background: "var(--agent-compliance)",
              color: "var(--white)",
              border: "none",
            }}
          >
            Begin Compliance &rarr;
          </button>
        </div>

        {/* 2x2 Card Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* What They Want */}
          <div
            className="border p-5"
            style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
          >
            <div
              className="text-[10px] font-medium tracking-[2px] uppercase mb-3"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              What They Want
            </div>
            <ul className="space-y-2">
              {analysis.whatTheyWant.map((item, i) => (
                <li key={i} className="text-[13px] leading-relaxed flex gap-2" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--agent-analyst)" }}>&bull;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Key Deadlines */}
          <div
            className="border p-5"
            style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
          >
            <div
              className="text-[10px] font-medium tracking-[2px] uppercase mb-3"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              Key Deadlines
            </div>
            <div className="space-y-3">
              {analysis.deadlines.map((d, i) => (
                <div key={i} className="flex justify-between items-baseline">
                  <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{d.label}</span>
                  <span
                    className="text-[12px] font-medium"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: d.urgent ? "var(--accent-red)" : "var(--text-primary)",
                    }}
                  >
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mandatory Forms */}
          <div
            className="border p-5"
            style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
          >
            <div
              className="text-[10px] font-medium tracking-[2px] uppercase mb-3"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              Mandatory Forms
            </div>
            <ul className="space-y-2">
              {analysis.forms.map((form, i) => (
                <li key={i} className="text-[13px] flex gap-2" style={{ color: "var(--text-secondary)" }}>
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{i + 1}.</span>
                  {form}
                </li>
              ))}
            </ul>
          </div>

          {/* Evaluation Criteria */}
          <div
            className="border p-5"
            style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
          >
            <div
              className="text-[10px] font-medium tracking-[2px] uppercase mb-3"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              Evaluation Criteria
            </div>
            <div className="space-y-3">
              {analysis.evaluation.map((ev, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{ev.criteria}</span>
                    <span
                      className="text-[12px] font-semibold"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
                    >
                      {ev.weight}
                    </span>
                  </div>
                  <div className="h-1" style={{ background: "var(--border-light)" }}>
                    <div
                      className="h-full"
                      style={{
                        width: ev.weight,
                        background: "var(--agent-analyst)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Disqualification Risks */}
        <div
          className="border p-5"
          style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
        >
          <div
            className="text-[10px] font-medium tracking-[2px] uppercase mb-3"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
          >
            Disqualification Risks
          </div>
          <div className="space-y-3">
            {analysis.risks.map((risk, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="text-[9px] tracking-[1px] uppercase px-2.5 py-1 flex-shrink-0 mt-0.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: risk.level === "high" ? "#fef3f2" : risk.level === "medium" ? "#fffbeb" : "#ecfdf5",
                    color: risk.level === "high" ? "var(--accent-red)" : risk.level === "medium" ? "var(--agent-profile)" : "var(--success)",
                  }}
                >
                  {risk.level}
                </span>
                <span className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {risk.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>

      <ChatPanel agentId="analyst" selectedTender={agent.selectedTender} profile={agent.profile} externalValue={externalValue} />
    </div>
  );
}
