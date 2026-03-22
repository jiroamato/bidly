"use client";

import { useState } from "react";
import { ChatInput } from "@/components/chat-input";
import { AgentState } from "@/hooks/use-agent";

interface WriterViewProps {
  agent: AgentState;
}

type SectionId = "exec_summary" | "technical" | "team" | "project_mgmt" | "safety" | "pricing" | "forms" | "preview";
type SectionStatus = "done" | "draft" | "empty";

interface Section {
  id: SectionId;
  label: string;
  status: SectionStatus;
  group: "sections" | "forms" | "export";
}

const SECTIONS: Section[] = [
  { id: "exec_summary", label: "Executive Summary", status: "draft", group: "sections" },
  { id: "technical", label: "Technical Approach", status: "done", group: "sections" },
  { id: "team", label: "Team & Experience", status: "draft", group: "sections" },
  { id: "project_mgmt", label: "Project Management", status: "empty", group: "sections" },
  { id: "safety", label: "Safety Plan", status: "empty", group: "sections" },
  { id: "pricing", label: "Pricing Schedule", status: "empty", group: "forms" },
  { id: "forms", label: "Form Guidance", status: "empty", group: "forms" },
  { id: "preview", label: "Preview Full Bid", status: "empty", group: "export" },
];

const MOCK_CONTENT: Record<string, { blocks: { label: string; content: string; suggestion?: string }[]; pricing?: { items: { desc: string; amount: number }[]; province: string } }> = {
  exec_summary: {
    blocks: [
      {
        label: "Opening Statement",
        content: "Amato Plumbing Inc. is pleased to submit this proposal for the Water Main Replacement project (PW-2026-0847) for the City of Toronto. With over 15 years of experience in municipal water infrastructure across Ontario, we are well-positioned to deliver this critical 2.4km water main replacement along Dundas Street West.",
      },
      {
        label: "Company Qualifications",
        content: "Our team has successfully completed comparable water main replacement projects for the Region of Peel, City of Mississauga, and York Region, consistently delivering on time and within budget. We maintain active WSIB coverage, carry full commercial liability insurance, and employ certified water distribution operators on all municipal projects.\n\nKey differentiators include our proprietary trenchless technology capability for service reconnections, which minimizes surface disruption and reduces road restoration costs by an estimated 15-20%.",
        suggestion: "Consider adding specific project values and completion dates for your references \u2014 the evaluation criteria weights technical experience at 70%. I can pull this from your profile if you've added past projects.",
      },
    ],
  },
  technical: {
    blocks: [
      {
        label: "Methodology",
        content: "Our approach follows a phased methodology designed to minimize disruption to residents and businesses along the Dundas Street West corridor. Phase 1 involves detailed utility locating and pre-construction surveying. Phase 2 covers main installation using open-cut methods with trenchless service reconnections. Phase 3 addresses road restoration and final testing.",
      },
    ],
  },
  pricing: {
    blocks: [],
    pricing: {
      items: [
        { desc: "Mobilization & Site Setup", amount: 45000 },
        { desc: "Water Main Installation (2.4km)", amount: 680000 },
        { desc: "Service Reconnections (180 units)", amount: 270000 },
        { desc: "Road Restoration & Paving", amount: 185000 },
        { desc: "Traffic Management", amount: 65000 },
        { desc: "Testing & Commissioning", amount: 35000 },
      ],
      province: "Ontario",
    },
  },
};

const STATUS_ICONS: Record<SectionStatus, { icon: string; color: string }> = {
  done: { icon: "\u2713", color: "var(--success)" },
  draft: { icon: "\u25CF", color: "var(--agent-writer)" },
  empty: { icon: "\u25CB", color: "var(--text-hint)" },
};

export function WriterView({ agent }: WriterViewProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("exec_summary");
  const content = MOCK_CONTENT[activeSection];
  const sectionConfig = SECTIONS.find((s) => s.id === activeSection)!;
  const _tender = agent.selectedTender;
  const _profile = agent.profile;

  const subtotal = content?.pricing?.items.reduce((a, i) => a + i.amount, 0) || 0;
  const hstRate = 0.13; // Ontario HST
  const hst = Math.round(subtotal * hstRate);
  const total = subtotal + hst;

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Section Tabs */}
      <div
        className="w-[200px] border-r flex flex-col flex-shrink-0 overflow-y-auto"
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--bidly-border)" }}
      >
        {(["sections", "forms", "export"] as const).map((group) => {
          const groupSections = SECTIONS.filter((s) => s.group === group);
          const groupLabels: Record<string, string> = { sections: "Bid Sections", forms: "Forms & Pricing", export: "Export" };

          return (
            <div key={group}>
              <div
                className="px-5 pt-5 pb-2 text-[10px] font-medium tracking-[2px] uppercase"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
              >
                {groupLabels[group]}
              </div>
              {groupSections.map((section) => {
                const isActive = section.id === activeSection;
                const statusStyle = STATUS_ICONS[section.status];

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className="w-full text-left px-5 py-2.5 flex items-center gap-2.5 text-[12px] transition-colors"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: isActive ? "var(--white)" : "transparent",
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      fontWeight: isActive ? 600 : 400,
                      cursor: "pointer",
                      borderLeft: isActive ? "3px solid var(--agent-writer)" : "3px solid transparent",
                    }}
                  >
                    <span className="text-[11px]" style={{ color: statusStyle.color }}>{statusStyle.icon}</span>
                    {section.label}
                  </button>
                );
              })}
              {group !== "export" && (
                <div className="mx-5 my-3 border-b" style={{ borderColor: "var(--bidly-border)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div
          className="px-8 py-4 flex items-center justify-between border-b flex-shrink-0"
          style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
        >
          <div
            className="text-[14px] font-semibold"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
          >
            {sectionConfig.label}
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 text-[10px] tracking-[1px] uppercase border"
              style={{
                fontFamily: "var(--font-mono)",
                borderColor: "var(--agent-writer)",
                background: "var(--white)",
                color: "var(--agent-writer)",
                cursor: "pointer",
              }}
            >
              Regenerate
            </button>
            <button
              className="px-4 py-2 text-[10px] tracking-[1px] uppercase border"
              style={{
                fontFamily: "var(--font-mono)",
                borderColor: "var(--bidly-border)",
                background: "var(--white)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              Copy
            </button>
            <button
              className="px-4 py-2 text-[10px] tracking-[1px] uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                background: "var(--text-primary)",
                color: "var(--white)",
                border: "none",
                cursor: "pointer",
              }}
            >
              Save Draft
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {content?.blocks.map((block, i) => (
            <div key={i} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] font-medium tracking-[1.5px] uppercase"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                >
                  {block.label}
                </span>
                <span
                  className="text-[8px] tracking-[1px] uppercase px-2 py-0.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: "#f0ecff",
                    color: "var(--agent-writer)",
                  }}
                >
                  AI Draft
                </span>
              </div>
              <div
                className="border p-5 text-[14px] leading-relaxed whitespace-pre-wrap"
                style={{
                  background: "var(--white)",
                  borderColor: "var(--bidly-border)",
                  color: "var(--text-primary)",
                  minHeight: 80,
                }}
              >
                {block.content}
              </div>
              {block.suggestion && (
                <div
                  className="mt-2 border-l-2 pl-4 py-2"
                  style={{ borderColor: "var(--agent-writer)" }}
                >
                  <div
                    className="text-[9px] tracking-[1.5px] uppercase mb-1"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--agent-writer)" }}
                  >
                    Writer Suggestion
                  </div>
                  <div className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {block.suggestion}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Pricing Table */}
          {content?.pricing && (
            <div className="mt-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th
                      className="text-left px-4 py-2.5 border-b-2"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        borderColor: "var(--bidly-border)",
                      }}
                    >
                      Item
                    </th>
                    <th
                      className="text-right px-4 py-2.5 border-b-2"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        borderColor: "var(--bidly-border)",
                      }}
                    >
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {content.pricing.items.map((item, i) => (
                    <tr key={i}>
                      <td
                        className="px-4 py-2.5 text-[13px] border-b"
                        style={{ color: "var(--text-primary)", borderColor: "var(--border-light)" }}
                      >
                        {item.desc}
                      </td>
                      <td
                        className="px-4 py-2.5 text-right text-[13px] border-b"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", borderColor: "var(--border-light)" }}
                      >
                        ${item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--text-muted)" }}>Subtotal</td>
                    <td className="px-4 py-2.5 text-right text-[13px]" style={{ fontFamily: "var(--font-mono)" }}>
                      ${subtotal.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--text-muted)" }}>HST (13%)</td>
                    <td className="px-4 py-2.5 text-right text-[13px]" style={{ fontFamily: "var(--font-mono)" }}>
                      ${hst.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td
                      className="px-4 py-2.5 text-[14px] font-semibold border-t-2"
                      style={{ color: "var(--text-primary)", borderColor: "var(--bidly-border)" }}
                    >
                      Total
                    </td>
                    <td
                      className="px-4 py-2.5 text-right text-[14px] font-semibold border-t-2"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", borderColor: "var(--bidly-border)" }}
                    >
                      ${total.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Empty state */}
          {!content && (
            <div className="text-center py-16">
              <div
                className="text-[12px] tracking-[2px] uppercase mb-2"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-hint)" }}
              >
                No content yet
              </div>
              <div className="text-[14px]" style={{ color: "var(--text-muted)" }}>
                Click &ldquo;Regenerate&rdquo; to have the Writer agent draft this section
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="flex-shrink-0">
          <ChatInput agentId="writer" onSend={() => {}} disabled />
        </div>
      </div>
    </div>
  );
}
