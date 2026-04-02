"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useAgent } from "@/hooks/use-agent";
import { useDemoScript } from "@/hooks/use-demo-script";
import { apiFetch } from "@/lib/api-fetch";
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
  const [autoDemo, setAutoDemo] = useState(false);
  const autoDemoRef = useRef(autoDemo);
  autoDemoRef.current = autoDemo;

  const fillDemoInput = useCallback((text: string) => {
    setDemoInputValue(text);
  }, []);
  const handleDemoAction = useCallback((command: { action: string }) => {
    if (command.action === "switch-to-preview") {
      setWriterPreviewSection("preview");
    }
  }, []);
  const handleTypewriterDone = useCallback(() => {
    if (autoDemoRef.current) {
      // Small delay so the input value is synced before submitting
      setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      }, 300);
    }
  }, []);
  const demoScript = useDemoScript(agent.activeAgent, fillDemoInput, handleDemoAction, handleTypewriterDone);

  // Clear external value when switching agents; auto-advance if auto-demo is on
  const prevAgentRef = useRef(agent.activeAgent);
  useEffect(() => {
    setDemoInputValue(undefined);
    setWriterPreviewSection(undefined);
    if (autoDemoRef.current && prevAgentRef.current !== agent.activeAgent && hasMoreScriptsRef.current) {
      setTimeout(() => advanceScriptRef.current(), 500);
    }
    prevAgentRef.current = agent.activeAgent;
  }, [agent.activeAgent]);

  const handleDemoReset = useCallback(async () => {
    try {
      if (agent.profileId) {
        await apiFetch(`/api/profile?id=${agent.profileId}`, { method: "DELETE" });
      }
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

  // Auto-demo: advance script after AI response completes
  const advanceScriptRef = useRef(demoScript.advanceScript);
  advanceScriptRef.current = demoScript.advanceScript;
  const hasMoreScriptsRef = useRef(demoScript.hasMoreScripts);
  hasMoreScriptsRef.current = demoScript.hasMoreScripts;

  // Kick off the first entry when auto-demo is toggled on
  const prevAutoDemoRef = useRef(false);
  useEffect(() => {
    if (autoDemo && !prevAutoDemoRef.current && hasMoreScriptsRef.current) {
      advanceScriptRef.current();
    }
    prevAutoDemoRef.current = autoDemo;
  }, [autoDemo]);

  useEffect(() => {
    if (!autoDemo) return;
    const onResponseComplete = () => {
      if (autoDemoRef.current && hasMoreScriptsRef.current) {
        advanceScriptRef.current();
      }
    };
    window.addEventListener("bidly:response-complete", onResponseComplete);
    return () => window.removeEventListener("bidly:response-complete", onResponseComplete);
  }, [autoDemo]);

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
        <MainHeader
          activeAgent={agent.activeAgent}
          autoDemo={autoDemo}
          onToggleAutoDemo={() => setAutoDemo((prev) => !prev)}
        />
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
