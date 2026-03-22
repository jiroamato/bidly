"use client";

import { ChatInput } from "@/components/chat-input";

interface ComplianceViewProps {
  agent: {
    selectedTender: { title: string; reference_number: string } | null;
    completeAgent: (id: "compliance") => void;
    setActiveAgent: (id: "writer") => void;
  };
}

type CheckStatus = "pass" | "fail" | "warn" | "pending";

interface CheckItem {
  name: string;
  description: string;
  status: CheckStatus;
  statusLabel: string;
  action?: string;
}

interface CheckSection {
  title: string;
  items: CheckItem[];
}

const MOCK_SECTIONS: CheckSection[] = [
  {
    title: "Buy Canadian Policy",
    items: [
      { name: "Canadian Business Registration", description: "Company is registered in Ontario, Canada. Meets domestic supplier requirement.", status: "pass", statusLabel: "Verified" },
      { name: "Trade Agreement Compliance", description: "This tender is under CFTA (Canadian Free Trade Agreement). No international trade agreement restrictions apply.", status: "pass", statusLabel: "Compliant" },
    ],
  },
  {
    title: "Qualifications & Certifications",
    items: [
      { name: "WSIB Coverage", description: "Active Workplace Safety and Insurance Board clearance on file.", status: "pass", statusLabel: "Active" },
      { name: "Commercial Liability Insurance", description: "Current policy is $2M. This tender requires $5M minimum coverage.", status: "warn", statusLabel: "Action Needed", action: "Contact insurer for increase" },
      { name: "Water Distribution Operator License", description: "Required for municipal water main work under Ontario Regulation 128/04.", status: "pass", statusLabel: "Valid" },
    ],
  },
  {
    title: "Mandatory Steps",
    items: [
      { name: "Mandatory Site Visit", description: "Scheduled for March 28, 2026 at 10:00 AM. Missing this disqualifies your bid.", status: "warn", statusLabel: "Not Confirmed", action: "Register by March 25" },
      { name: "Bid Bond Procurement", description: "10% bid bond required. Contact your surety company.", status: "pass", statusLabel: "Available" },
    ],
  },
  {
    title: "Documentation",
    items: [
      { name: "Health & Safety Policy", description: "Ontario-compliant H&S policy document required with submission.", status: "pass", statusLabel: "On File" },
      { name: "List of Subcontractors", description: "All proposed subcontractors must be listed with qualifications.", status: "pending", statusLabel: "Pending" },
    ],
  },
];

const STATUS_STYLES: Record<CheckStatus, { icon: string; bg: string; color: string }> = {
  pass: { icon: "\u2713", bg: "#ecfdf5", color: "var(--success)" },
  fail: { icon: "\u2717", bg: "#fef3f2", color: "var(--accent-red)" },
  warn: { icon: "!", bg: "#fffbeb", color: "var(--agent-profile)" },
  pending: { icon: "\u2014", bg: "var(--bg)", color: "var(--text-muted)" },
};

export function ComplianceView({ agent }: ComplianceViewProps) {
  const tender = agent.selectedTender;
  const totalItems = MOCK_SECTIONS.reduce((a, s) => a + s.items.length, 0);
  const passedItems = MOCK_SECTIONS.reduce((a, s) => a + s.items.filter((i) => i.status === "pass").length, 0);
  const actionItems = MOCK_SECTIONS.reduce((a, s) => a + s.items.filter((i) => i.status === "warn" || i.status === "fail").length, 0);

  const handleBeginDraft = () => {
    agent.completeAgent("compliance");
    agent.setActiveAgent("writer");
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-10 py-8">
        {/* Title */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400 }}>
              Eligibility Assessment
            </h1>
            {tender && (
              <div className="mt-1 text-[13px]" style={{ color: "var(--text-muted)" }}>
                {tender.title} &mdash;{" "}
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--agent-compliance)" }}>
                  {tender.reference_number}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2.5 text-[11px] tracking-[1px] uppercase border transition-colors"
              style={{
                fontFamily: "var(--font-mono)",
                borderColor: "var(--bidly-border)",
                background: "var(--white)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              Export Checklist
            </button>
            <button
              onClick={handleBeginDraft}
              className="px-5 py-2.5 text-[11px] font-semibold tracking-[1.5px] uppercase cursor-pointer transition-opacity hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                background: "var(--agent-writer)",
                color: "var(--white)",
                border: "none",
              }}
            >
              Begin Bid Draft &rarr;
            </button>
          </div>
        </div>

        {/* Result Banner */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div
            className="border-l-4 p-5"
            style={{ background: "var(--white)", borderColor: "var(--success)", borderRight: "1px solid var(--bidly-border)", borderTop: "1px solid var(--bidly-border)", borderBottom: "1px solid var(--bidly-border)" }}
          >
            <div
              className="text-[10px] tracking-[2px] uppercase mb-1"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              Overall Eligibility
            </div>
            <div className="text-lg font-semibold" style={{ color: "var(--success)" }}>
              Conditionally Eligible
            </div>
            <div className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
              {actionItems} items need attention before submission
            </div>
          </div>
          <div
            className="border p-5"
            style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
          >
            <div
              className="text-[10px] tracking-[2px] uppercase mb-1"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              Requirements Met
            </div>
            <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
              {passedItems} / {totalItems}
            </div>
          </div>
          <div
            className="border p-5"
            style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
          >
            <div
              className="text-[10px] tracking-[2px] uppercase mb-1"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              Action Required
            </div>
            <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-mono)", color: "var(--agent-profile)" }}>
              {actionItems}
            </div>
            <div className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
              Insurance + site visit
            </div>
          </div>
        </div>

        {/* Checklist Sections */}
        {MOCK_SECTIONS.map((section) => {
          const sectionPassed = section.items.filter((i) => i.status === "pass").length;
          return (
            <div key={section.title} className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <div
                  className="text-[12px] font-semibold tracking-[0.5px]"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
                >
                  {section.title}
                </div>
                <div
                  className="text-[11px]"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                >
                  {sectionPassed} / {section.items.length} passed
                </div>
              </div>
              <div className="space-y-2">
                {section.items.map((item) => {
                  const style = STATUS_STYLES[item.status];
                  return (
                    <div
                      key={item.name}
                      className="border flex items-start gap-4 p-4"
                      style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-semibold mt-0.5"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium mb-0.5" style={{ color: "var(--text-primary)" }}>
                          {item.name}
                        </div>
                        <div className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                          {item.description}
                        </div>
                        {item.action && (
                          <div
                            className="mt-1.5 text-[10px] tracking-[1px] uppercase cursor-pointer hover:underline"
                            style={{ fontFamily: "var(--font-mono)", color: "var(--agent-compliance)" }}
                          >
                            {item.action}
                          </div>
                        )}
                      </div>
                      <span
                        className="text-[9px] tracking-[1px] uppercase px-2.5 py-1 flex-shrink-0"
                        style={{
                          fontFamily: "var(--font-mono)",
                          background: style.bg,
                          color: style.color,
                        }}
                      >
                        {item.statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <ChatInput agentId="compliance" onSend={() => {}} />
    </div>
  );
}
