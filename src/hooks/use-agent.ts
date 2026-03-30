"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AgentId, AgentStatus, BusinessProfile, Tender } from "@/lib/types";
import { AGENT_ORDER } from "@/lib/agents";

export interface AgentState {
  activeAgent: AgentId;
  statuses: Record<AgentId, AgentStatus>;
  profile: BusinessProfile | null;
  profileId: number | null;
  selectedTender: Tender | null;
  tenderId: number | null;
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
  const statusesRef = useRef(statuses);
  statusesRef.current = statuses;
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);

  // Derived IDs for passing to API calls
  const profileId = profile?.id ?? null;
  const tenderId = selectedTender?.id ?? null;

  // Hydrate from Supabase on mount
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) {
          setProfile(data);
          setStatuses((prev) => ({
            ...prev,
            profile: "completed",
            scout: prev.scout === "locked" ? "active" : prev.scout,
          }));
        }
      })
      .catch(() => {}); // No profile yet — that's fine
  }, []);

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

  return {
    activeAgent,
    statuses,
    profile,
    profileId,
    selectedTender,
    tenderId,
    setActiveAgent,
    completeAgent,
    setProfile,
    setSelectedTender,
  };
}
