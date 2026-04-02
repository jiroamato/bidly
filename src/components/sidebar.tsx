"use client";

import { AgentId, AgentStatus, BusinessProfile } from "@/lib/types";
import { AGENTS } from "@/lib/agents";

interface SidebarProps {
  activeAgent: AgentId;
  statuses: Record<AgentId, AgentStatus>;
  profile: BusinessProfile | null;
  onAgentClick: (id: AgentId) => void;
}

const CATEGORIES = ["Setup", "Research", "Execute"] as const;
const CATEGORY_ICONS: Record<string, string> = {
  Setup: "\u2699",
  Research: "\u25C6",
  Execute: "\u25FC",
};

export function Sidebar({ activeAgent, statuses, profile, onAgentClick }: SidebarProps) {
  return (
    <aside
      className="w-[220px] flex flex-col flex-shrink-0 border-r"
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--bidly-border)" }}
    >
      {/* Brand */}
      <div className="px-6 pt-6 pb-8 flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: "var(--text-primary)" }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" stroke="none" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <span
          className="text-[15px] font-semibold tracking-wide"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Bidly
        </span>
      </div>

      {/* Agent Groups */}
      {CATEGORIES.map((category) => {
        const agents = AGENTS.filter((a) => a.category === category);
        return (
          <div key={category} className="mb-7">
            <div
              className="px-6 mb-2 flex items-center gap-2 text-[10px] font-medium tracking-[2px] uppercase"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              <span className="text-[13px] opacity-60">{CATEGORY_ICONS[category]}</span>
              {category}
            </div>
            {agents.map((agent) => {
              const status = statuses[agent.id];
              const isActive = agent.id === activeAgent;
              const isLocked = status === "locked";
              const isCompleted = status === "completed";

              return (
                <button
                  key={agent.id}
                  onClick={() => onAgentClick(agent.id)}
                  disabled={isLocked}
                  className="w-full text-left relative flex items-center gap-2 px-6 py-2 text-[12px] font-medium tracking-[0.8px] uppercase transition-colors"
                  style={{
                    fontFamily: "var(--font-mono)",
                    paddingLeft: "28px",
                    color: isCompleted
                      ? "var(--success)"
                      : isActive
                        ? "var(--text-primary)"
                        : isLocked
                          ? "var(--text-hint)"
                          : "var(--text-secondary)",
                    background: isActive ? "var(--white)" : "transparent",
                    fontWeight: isActive ? 600 : 500,
                    cursor: isLocked ? "default" : "pointer",
                  }}
                >
                  {/* Active left border */}
                  {isActive && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ background: agent.color }}
                    />
                  )}

                  {/* Status indicator */}
                  {isCompleted ? (
                    <span className="text-[11px]" style={{ color: "var(--success)" }} aria-label="Completed">
                      &#10003;
                    </span>
                  ) : (
                    <span
                      className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                      aria-label={isLocked ? "Locked" : "Active"}
                      style={{
                        background: agent.color,
                        opacity: isLocked ? 0.25 : 1,
                      }}
                    />
                  )}

                  {agent.name}

                  {/* Blinking cursor for active */}
                  {isActive && (
                    <span
                      className="w-2 h-3.5 animate-pulse"
                      style={{ background: "var(--text-primary)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        );
      })}

      {/* Footer */}
      <div
        className="mt-auto px-6 py-5 border-t"
        style={{ borderColor: "var(--bidly-border)" }}
      >
        {profile ? (
          <>
            <div
              className="text-[11px] font-medium mb-0.5"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}
            >
              {profile.company_name}
            </div>
            <div
              className="text-[10px]"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              {profile.province} &bull; {profile.naics_codes[0] || ""}
            </div>
          </>
        ) : (
          <div
            className="text-[11px] italic"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-hint)" }}
          >
            No profile yet
          </div>
        )}
        <div
          className="mt-4 text-[9px] leading-[1.6] tracking-wide"
          style={{ fontFamily: "var(--font-mono)", color: "var(--text-hint)" }}
        >
          <strong style={{ color: "var(--text-muted)" }}>Proof of concept only.</strong>
          <br />
          All generated content is fictional. Real procurement involves document
          processing and additional steps not shown here &mdash; this demo
          illustrates how AI agents can integrate into the bidding workflow.
        </div>
        <div
          className="mt-2.5 text-[9px] leading-[1.6] tracking-wide"
          style={{ fontFamily: "var(--font-mono)", color: "var(--text-hint)" }}
        >
          Tip: activate <strong style={{ color: "var(--text-muted)" }}>Demo Mode</strong> in the
          header to see the full workflow in action.
        </div>
        <div
          className="mt-3 text-[9px] tracking-wide"
          style={{ fontFamily: "var(--font-mono)", color: "var(--text-hint)" }}
        >
          Bidly v1.0
          <br />&copy; 2026 Hackathon Build
        </div>
      </div>
    </aside>
  );
}
