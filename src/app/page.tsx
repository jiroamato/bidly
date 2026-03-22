"use client";

import { useAgent } from "@/hooks/use-agent";
import { Sidebar } from "@/components/sidebar";
import { MainHeader } from "@/components/main-header";
import { ProfileView } from "@/components/views/profile-view";
import { ScoutView } from "@/components/views/scout-view";
import { AnalystView } from "@/components/views/analyst-view";
import { ComplianceView } from "@/components/views/compliance-view";
import { WriterView } from "@/components/views/writer-view";

export default function Home() {
  const agent = useAgent();

  const views = {
    profile: <ProfileView agent={agent} />,
    scout: <ScoutView agent={agent} />,
    analyst: <AnalystView agent={agent} />,
    compliance: <ComplianceView agent={agent} />,
    writer: <WriterView agent={agent} />,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeAgent={agent.activeAgent}
        statuses={agent.statuses}
        profile={agent.profile}
        onAgentClick={agent.setActiveAgent}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MainHeader activeAgent={agent.activeAgent} />
        <div className="flex-1 overflow-y-auto">
          {views[agent.activeAgent]}
        </div>
      </div>
    </div>
  );
}
