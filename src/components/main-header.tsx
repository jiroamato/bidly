import { AgentId } from "@/lib/types";
import { getAgent } from "@/lib/agents";

interface MainHeaderProps {
  activeAgent: AgentId;
  autoDemo?: boolean;
  onToggleAutoDemo?: () => void;
}

export function MainHeader({ activeAgent, autoDemo, onToggleAutoDemo }: MainHeaderProps) {
  const agent = getAgent(activeAgent);

  return (
    <div
      className="px-10 py-5 flex items-center justify-between flex-shrink-0 border-b"
      style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
    >
      <div
        className="text-[11px] tracking-[1.5px] uppercase"
        style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
      >
        {agent.name}
        <span className="mx-1.5" style={{ color: "var(--text-hint)" }}>
          &bull;
        </span>
        <span style={{ color: "var(--text-secondary)" }}>
          {agent.breadcrumbLabel}
        </span>
      </div>
      <div
        className="flex items-center gap-3 text-[12px]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}
      >
        <span>Demo Mode</span>
        {onToggleAutoDemo && (
          <button
            onClick={onToggleAutoDemo}
            className="relative w-9 h-5 rounded-full transition-colors"
            style={{
              background: autoDemo ? "var(--success)" : "var(--bidly-border)",
              border: "none",
              cursor: "pointer",
            }}
            aria-label="Toggle demo mode"
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
              style={{
                background: "var(--white)",
                transform: autoDemo ? "translateX(16px)" : "translateX(0)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            />
          </button>
        )}
      </div>
    </div>
  );
}
