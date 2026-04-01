"use client";

import { useEffect, useCallback, useState } from "react";
import { useAgent } from "@/hooks/use-agent";
import { useDemoScript } from "@/hooks/use-demo-script";
import { ChatHistoryProvider, useChatHistoryActions } from "@/contexts/chat-history-context";
import { Sidebar } from "@/components/sidebar";
import { MainHeader } from "@/components/main-header";
import { ProfileView } from "@/components/views/profile-view";
import { ScoutView } from "@/components/views/scout-view";
import { AnalystView } from "@/components/views/analyst-view";
import { ComplianceView } from "@/components/views/compliance-view";
import { WriterView } from "@/components/views/writer-view";

function HomeContent() {
  const agent = useAgent();
  const { clearAllMessages } = useChatHistoryActions();

  const [demoInputValue, setDemoInputValue] = useState<string | undefined>(undefined);
  const [writerPreviewSection, setWriterPreviewSection] = useState<"preview" | undefined>(undefined);
  const fillDemoInput = useCallback((text: string) => {
    setDemoInputValue(text);
  }, []);
  const handleDemoAction = useCallback((command: { action: string }) => {
    if (command.action === "switch-to-preview") {
      setWriterPreviewSection("preview");
    }
  }, []);
  const demoScript = useDemoScript(agent.activeAgent, fillDemoInput, handleDemoAction);

  // Clear external value when switching agents
  useEffect(() => {
    setDemoInputValue(undefined);
    setWriterPreviewSection(undefined);
  }, [agent.activeAgent]);

  const handleDemoReset = useCallback(async () => {
    try {
      await fetch("/api/profile", { method: "DELETE" });
    } catch {
      // Server delete failed — still reset client state
    }
    agent.resetDemo();
    clearAllMessages();
    demoScript.resetScripts();
    setDemoInputValue(undefined);
    setWriterPreviewSection(undefined);
  }, [agent.resetDemo, clearAllMessages, demoScript.resetScripts]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "K") {
        e.preventDefault();
        handleDemoReset();
      }
      if (e.ctrlKey && e.shiftKey && e.key === "J") {
        e.preventDefault();
        demoScript.advanceScript();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDemoReset, demoScript.advanceScript]);

  const views = {
    profile: <ProfileView agent={agent} externalValue={demoInputValue} />,
    scout: <ScoutView agent={agent} externalValue={demoInputValue} />,
    analyst: <AnalystView agent={agent} externalValue={demoInputValue} />,
    compliance: <ComplianceView agent={agent} externalValue={demoInputValue} />,
    writer: <WriterView agent={agent} externalValue={demoInputValue} externalActiveSection={writerPreviewSection} />,
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
        <div className="flex-1 flex flex-col min-h-0">
          {views[agent.activeAgent]}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ChatHistoryProvider>
      <HomeContent />
    </ChatHistoryProvider>
  );
}
