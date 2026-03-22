import { AgentId } from "@/lib/types";
import { getAgent } from "@/lib/agents";

interface MainHeaderProps {
  activeAgent: AgentId;
}

export function MainHeader({ activeAgent }: MainHeaderProps) {
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
        className="flex items-center gap-2 text-[12px]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}
      >
        <span>Demo Mode</span>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[12px]"
          style={{ background: "var(--bidly-border)", color: "var(--text-secondary)" }}
        >
          A
        </div>
      </div>
    </div>
  );
}
