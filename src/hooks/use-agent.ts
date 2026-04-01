"use client";

import { useState, useCallback, useRef } from "react";
import { AgentId, AgentStatus, BusinessProfile, Tender, TenderWithScore, TenderAnalysisData } from "@/lib/types";
import { AGENT_ORDER } from "@/lib/agents";

export interface AgentState {
  activeAgent: AgentId;
  statuses: Record<AgentId, AgentStatus>;
  profile: BusinessProfile | null;
  profileId: number | null;
  selectedTender: Tender | null;
  tenderId: number | null;
  matchedTenders: TenderWithScore[];
  tenderAnalysis: TenderAnalysisData | null;
  setActiveAgent: (id: AgentId) => void;
  completeAgent: (id: AgentId) => void;
  setProfile: (p: BusinessProfile) => void;
  setSelectedTender: (t: Tender) => void;
  setMatchedTenders: (tenders: TenderWithScore[]) => void;
  setTenderAnalysis: (analysis: TenderAnalysisData | null) => void;
  resetDemo: () => void;
}

const INITIAL_STATUSES: Record<AgentId, AgentStatus> = {
  profile: "active",
  scout: "locked",
  analyst: "locked",
  compliance: "locked",
  writer: "locked",
};

export function useAgent(): AgentState {
  const [activeAgent, setActiveAgentRaw] = useState<AgentId>("profile");
  const [statuses, setStatuses] = useState<Record<AgentId, AgentStatus>>({ ...INITIAL_STATUSES });
  const statusesRef = useRef(statuses);
  statusesRef.current = statuses;
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [matchedTenders, setMatchedTendersRaw] = useState<TenderWithScore[]>([]);
  const [tenderAnalysis, setTenderAnalysisRaw] = useState<TenderAnalysisData | null>(null);

  // Derived IDs for passing to API calls
  const profileId = profile?.id ?? null;
  const tenderId = selectedTender?.id ?? null;

  const setActiveAgent = useCallback(
    (id: AgentId) => {
      if (statusesRef.current[id] === "locked") return;
      setActiveAgentRaw(id);
      setStatuses((prev) => {
        const next = { ...prev };
        if (next[id] !== "completed") {
          next[id] = "active";
        }
        return next;
      });
    },
    []
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

  const setProfileWithClear = useCallback((p: BusinessProfile) => {
    setProfile(p);
    setMatchedTendersRaw([]);
  }, []);

  const setSelectedTenderWithClear = useCallback((t: Tender) => {
    setSelectedTender(t);
    setTenderAnalysisRaw(null);
  }, []);

  const resetDemo = useCallback(() => {
    setActiveAgentRaw("profile");
    setStatuses({ ...INITIAL_STATUSES });
    setProfile(null);
    setSelectedTender(null);
    setMatchedTendersRaw([]);
    setTenderAnalysisRaw(null);
  }, []);

  return {
    activeAgent,
    statuses,
    profile,
    profileId,
    selectedTender,
    tenderId,
    matchedTenders,
    tenderAnalysis,
    setActiveAgent,
    completeAgent,
    setProfile: setProfileWithClear,
    setSelectedTender: setSelectedTenderWithClear,
    setMatchedTenders: setMatchedTendersRaw,
    setTenderAnalysis: setTenderAnalysisRaw,
    resetDemo,
  };
}
