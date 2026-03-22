export interface BusinessProfile {
  id: number;
  company_name: string;
  naics_codes: string[];
  location: string;
  province: string;
  capabilities: string;
  keywords: string[];
  created_at: string;
}

export interface Tender {
  id: number;
  reference_number: string;
  solicitation_number: string;
  title: string;
  description: string;
  publication_date: string;
  closing_date: string;
  status: string;
  procurement_category: string;
  notice_type: string;
  procurement_method: string;
  selection_criteria: string;
  gsin_codes: string[];
  unspsc_codes: string[];
  regions_of_opportunity: string[];
  regions_of_delivery: string[];
  trade_agreements: string[];
  contracting_entity: string;
  notice_url: string;
  attachment_urls: string[];
  match_score?: number;
}

export interface EligibilityCheck {
  id: number;
  profile_id: number;
  tender_id: number;
  responses: Record<string, string>;
  result: "pass" | "fail" | "conditional";
  explanation: string;
  documentation_checklist: { item: string; required: boolean; status: string }[];
  created_at: string;
}

export interface BidDraft {
  id: number;
  profile_id: number;
  tender_id: number;
  sections: {
    exec_summary?: string;
    technical?: string;
    team?: string;
    project_mgmt?: string;
    safety?: string;
    pricing?: string;
  };
  status: "draft" | "complete";
  created_at: string;
  updated_at: string;
}

export interface FormChecklistItem {
  name: string;
  status: "not_started" | "in_progress" | "done";
  guidance?: string;
  download_url?: string;
}

export interface FormChecklist {
  id: number;
  profile_id: number;
  tender_id: number;
  forms: FormChecklistItem[];
  progress_pct: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type AgentId = "profile" | "scout" | "analyst" | "compliance" | "writer";

export type AgentStatus = "locked" | "active" | "completed";
