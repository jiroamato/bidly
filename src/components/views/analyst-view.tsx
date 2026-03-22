"use client";

import { ChatInput } from "@/components/chat-input";

interface AnalystViewProps {
  agent: {
    selectedTender: {
      id: number;
      title: string;
      reference_number: string;
      closing_date: string;
      contracting_entity: string;
      description: string;
    } | null;
    completeAgent: (id: "analyst") => void;
    setActiveAgent: (id: "compliance") => void;
  };
}

const MOCK_ANALYSIS = {
  whatTheyWant: [
    "Replace 2.4 km of aging water mains along Dundas Street West",
    "Full excavation, pipe installation (300mm ductile iron), and road restoration",
    "Service reconnections for 180+ residential and commercial properties",
    "Traffic management plan for major arterial road",
  ],
  deadlines: [
    { label: "Submission Deadline", value: "April 15, 2026 — 2:00 PM EST", urgent: true },
    { label: "Mandatory Site Visit", value: "March 28, 2026 — 10:00 AM", urgent: true },
    { label: "Questions Due", value: "April 1, 2026", urgent: false },
    { label: "Contract Start", value: "May 15, 2026", urgent: false },
  ],
  forms: [
    "Bid Bond (10% of bid price)",
    "WSIB Clearance Certificate",
    "Certificate of Insurance ($5M minimum)",
    "Ontario Health & Safety Policy",
    "List of Subcontractors",
  ],
  evaluation: [
    { criteria: "Technical Approach", weight: "70%" },
    { criteria: "Price", weight: "20%" },
    { criteria: "Past Experience", weight: "10%" },
  ],
  risks: [
    { level: "high", text: "Mandatory site visit on March 28 — missing it disqualifies your bid" },
    { level: "medium", text: "Insurance requirement is $5M — verify your current coverage meets this threshold" },
    { level: "low", text: "Subcontractor list required — ensure all subs are confirmed before submission" },
  ],
};

export function AnalystView({ agent }: AnalystViewProps) {
  const tender = agent.selectedTender;

  if (!tender) {
    return (
      <div className="p-10">
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28 }}>
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-10 py-8">
        {/* Title Row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400 }}>
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
              {MOCK_ANALYSIS.whatTheyWant.map((item, i) => (
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
              {MOCK_ANALYSIS.deadlines.map((d, i) => (
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
              {MOCK_ANALYSIS.forms.map((form, i) => (
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
              {MOCK_ANALYSIS.evaluation.map((ev, i) => (
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
            {MOCK_ANALYSIS.risks.map((risk, i) => (
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

      <ChatInput agentId="analyst" onSend={() => {}} />
    </div>
  );
}
