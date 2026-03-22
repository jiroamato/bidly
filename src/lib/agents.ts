import { AgentId } from "./types";

export interface AgentConfig {
  id: AgentId;
  name: string;
  color: string;
  category: "Setup" | "Research" | "Execute";
  breadcrumbLabel: string;
  chatPlaceholder: string;
}

export const AGENTS: AgentConfig[] = [
  {
    id: "profile",
    name: "Profile",
    color: "#e67e22",
    category: "Setup",
    breadcrumbLabel: "Company Setup",
    chatPlaceholder: "Tell the Profile Agent about your business...",
  },
  {
    id: "scout",
    name: "Scout",
    color: "#3b82f6",
    category: "Research",
    breadcrumbLabel: "Tender Search",
    chatPlaceholder:
      "Ask Scout to refine results — 'show me federal contracts only' or 'anything closing this month?'",
  },
  {
    id: "analyst",
    name: "Analyst",
    color: "#06b6d4",
    category: "Research",
    breadcrumbLabel: "RFP Analysis",
    chatPlaceholder:
      "Ask about this RFP — requirements, risks, evaluation details...",
  },
  {
    id: "compliance",
    name: "Compliance",
    color: "#10b981",
    category: "Execute",
    breadcrumbLabel: "Eligibility Check",
    chatPlaceholder:
      "Ask about requirements — 'what insurance do I need?' or 'explain Buy Canadian policy'",
  },
  {
    id: "writer",
    name: "Writer",
    color: "#8b5cf6",
    category: "Execute",
    breadcrumbLabel: "Bid Workspace",
    chatPlaceholder:
      "'Make this more concise', 'add our traffic management experience', 'regenerate pricing'...",
  },
];

export const AGENT_ORDER: AgentId[] = ["profile", "scout", "analyst", "compliance", "writer"];

export function getAgent(id: AgentId): AgentConfig {
  return AGENTS.find((a) => a.id === id)!;
}
