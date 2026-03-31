export interface BusinessProfile {
  id: number;
  company_name: string;
  naics_codes: string[];
  location: string;
  province: string;
  capabilities: string;
  keywords: string[];
  keyword_synonyms: Record<string, string[]>;
  embedding: number[] | null;
  insurance_amount: string;
  bonding_limit: number | null;
  certifications: string[];
  years_in_business: number | null;
  past_gov_experience: string;
  pbn: string;
  is_canadian: boolean | null;
  security_clearance: string;
  project_size_min: number | null;
  project_size_max: number | null;
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

export interface TenderSelection {
  id: number;
  profile_id: number;
  tender_id: number;
  match_score: number;
  matched_keywords: string[];
  match_reasoning: string;
  created_at: string;
}

export interface TenderAnalysisData {
  whatTheyWant: string[];
  deadlines: { label: string; value: string; urgent: boolean }[];
  forms: string[];
  evaluation: { criteria: string; weight: string }[];
  risks: { level: "high" | "medium" | "low"; text: string }[];
}

export interface TenderAnalysis {
  id: number;
  profile_id: number;
  tender_id: number;
  analysis: TenderAnalysisData;
  created_at: string;
}

export interface ComplianceItem {
  name: string;
  description: string;
  status: "pass" | "fail" | "warn" | "pending";
  statusLabel: string;
  action: string | null;
}

export interface ComplianceSection {
  title: string;
  items: ComplianceItem[];
}

export interface ComplianceAssessment {
  overallResult: "eligible" | "conditionally_eligible" | "not_eligible";
  overallLabel: string;
  summaryNote: string;
  sections: ComplianceSection[];
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
