"use client";

import { useState, useCallback } from "react";
import { AgentId, AgentStatus, BusinessProfile, Tender } from "@/lib/types";
import { AGENT_ORDER } from "@/lib/agents";

interface AgentState {
  activeAgent: AgentId;
  statuses: Record<AgentId, AgentStatus>;
  profile: BusinessProfile | null;
  selectedTender: Tender | null;
  setActiveAgent: (id: AgentId) => void;
  completeAgent: (id: AgentId) => void;
  setProfile: (p: BusinessProfile) => void;
  setSelectedTender: (t: Tender) => void;
}

export function useAgent(): AgentState {
  const [activeAgent, setActiveAgentRaw] = useState<AgentId>("profile");
  const [statuses, setStatuses] = useState<Record<AgentId, AgentStatus>>({
    profile: "active",
    scout: "locked",
    analyst: "locked",
    compliance: "locked",
    writer: "locked",
  });
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);

  const setActiveAgent = useCallback(
    (id: AgentId) => {
      if (statuses[id] === "locked") return;
      setActiveAgentRaw(id);
      setStatuses((prev) => {
        const next = { ...prev };
        if (next[id] !== "completed") {
          next[id] = "active";
        }
        return next;
      });
    },
    [statuses]
  );

  const completeAgent = useCallback((id: AgentId) => {
    setStatuses((prev) => {
      const next = { ...prev };
      next[id] = "completed";
      const idx = AGENT_ORDER.indexOf(id);
      if (idx < AGENT_ORDER.length - 1) {
        const nextId = AGENT_ORDER[idx + 1];
        if (next[nextId] === "locked") {
          next[nextId] = "active";
        }
      }
      return next;
    });
  }, []);

  return {
    activeAgent,
    statuses,
    profile,
    selectedTender,
    setActiveAgent,
    completeAgent,
    setProfile,
    setSelectedTender,
  };
}
