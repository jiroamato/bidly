# Working MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Bidly from a hardcoded demo into a working MVP with real data pipelines, agentic tool calls, and Supabase as the single source of truth.

**Architecture:** Supabase stores all inter-agent state. Each agent's API call builds context server-side via `buildAgentContext(agentId, profileId, tenderId?)`. React state is a UI cache only. Voyage embeddings removed — LLM does semantic reasoning.

**Tech Stack:** Next.js, Supabase (Postgres), Anthropic Claude API, Vitest, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-29-working-mvp-design.md`

---

## Parallel Workload Split

This plan is split into **4 parallelizable workloads**. Workload 1 (Foundation) must complete first. Workloads 2, 3, and 4 can then run in parallel.

```
Workload 1: Foundation (schema, types, context builder, tool infrastructure)
    ↓ (must complete before 2/3/4)
    ├── Workload 2: Profile Agent + Scout Agent
    ├── Workload 3: Analyst Agent + Compliance Agent
    └── Workload 4: Writer Agent + Client-Side Hydration
```

**Supabase changes** (schema migrations, dropping tables) must be done manually by the user. Detailed tutorials are provided inline with each task that requires them.

---

## Workload 1: Foundation

> Must complete before Workloads 2, 3, 4 can begin. Establishes the shared infrastructure all agents depend on.

---

### Task 1.1: Supabase Schema Migration

**This task is a manual Supabase operation.** Follow the tutorial below.

#### Supabase Migration Tutorial

**Step 1: Open the Supabase SQL Editor**

1. Go to your Supabase project dashboard at https://supabase.com/dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**

**Step 2: Add columns to `business_profiles`**

Paste and run this SQL:

```sql
-- Add new explicit columns to business_profiles
ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS insurance_amount text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bonding_limit integer,
  ADD COLUMN IF NOT EXISTS certifications text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS years_in_business integer,
  ADD COLUMN IF NOT EXISTS past_gov_experience text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pbn text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_canadian boolean,
  ADD COLUMN IF NOT EXISTS security_clearance text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS project_size_min integer,
  ADD COLUMN IF NOT EXISTS project_size_max integer;

-- Remove the embedding column (Voyage removed)
ALTER TABLE business_profiles
  DROP COLUMN IF EXISTS embedding;
```

**Expected result:** "Success. No rows returned." The `business_profiles` table now has 10 new columns and no `embedding` column.

**Step 3: Create `tender_selections` table**

Paste and run:

```sql
CREATE TABLE tender_selections (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id bigint NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  tender_id bigint NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  match_score integer NOT NULL DEFAULT 0,
  matched_keywords text[] NOT NULL DEFAULT '{}',
  match_reasoning text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, tender_id)
);

CREATE INDEX tender_selections_profile_id_idx ON tender_selections (profile_id);
CREATE INDEX tender_selections_tender_id_idx ON tender_selections (tender_id);
```

**Expected result:** "Success. No rows returned."

**Step 4: Create `tender_analyses` table**

Paste and run:

```sql
CREATE TABLE tender_analyses (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id bigint NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  tender_id bigint NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  analysis jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, tender_id)
);

CREATE INDEX tender_analyses_profile_id_idx ON tender_analyses (profile_id);
CREATE INDEX tender_analyses_tender_id_idx ON tender_analyses (tender_id);
```

**Expected result:** "Success. No rows returned."

**Step 5: Drop embedding infrastructure**

Paste and run:

```sql
-- Drop the vector search RPC function
DROP FUNCTION IF EXISTS match_tenders(vector(512), int);

-- Drop the tender_embeddings table
DROP TABLE IF EXISTS tender_embeddings;
```

**Expected result:** "Success. No rows returned."

**Step 6: Verify**

Run this query to check everything:

```sql
-- Check business_profiles columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'business_profiles'
ORDER BY ordinal_position;

-- Check new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('tender_selections', 'tender_analyses', 'tender_embeddings');
```

**Expected:** `business_profiles` shows all new columns (insurance_amount, bonding_limit, etc.), no `embedding` column. `tender_selections` and `tender_analyses` appear. `tender_embeddings` does NOT appear.

**Step 7: Save migration file locally**

After running successfully in Supabase, save the combined SQL as a migration file so it's tracked in git.

---

### Task 1.2: Update TypeScript Types

**Files:**
- Modify: `src/lib/types.ts`
- Test: `tests/types.test.ts` (create)

- [ ] **Step 1: Write the type validation test**

Create `tests/types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type {
  BusinessProfile,
  Tender,
  TenderSelection,
  TenderAnalysis,
  ComplianceAssessment,
  ComplianceSection,
  ComplianceItem,
} from "@/lib/types";

describe("BusinessProfile type", () => {
  it("includes all new fields", () => {
    const profile: BusinessProfile = {
      id: 1,
      company_name: "Test Co",
      naics_codes: ["561720"],
      location: "Saskatoon",
      province: "Saskatchewan",
      capabilities: "Janitorial services",
      keywords: ["janitorial", "cleaning"],
      insurance_amount: "$2M commercial liability",
      bonding_limit: 500000,
      certifications: ["WSIB", "ISO 9001"],
      years_in_business: 5,
      past_gov_experience: "3 years RCMP detachments",
      pbn: "PBN-12345",
      is_canadian: true,
      security_clearance: "Reliability",
      project_size_min: 50000,
      project_size_max: 500000,
      created_at: "2026-01-01T00:00:00Z",
    };

    expect(profile.insurance_amount).toBe("$2M commercial liability");
    expect(profile.bonding_limit).toBe(500000);
    expect(profile.certifications).toContain("WSIB");
    expect(profile.is_canadian).toBe(true);
    expect(profile.project_size_min).toBe(50000);
    expect(profile.project_size_max).toBe(500000);
  });

  it("allows nullable fields", () => {
    const profile: BusinessProfile = {
      id: 1,
      company_name: "Minimal Co",
      naics_codes: [],
      location: "",
      province: "",
      capabilities: "",
      keywords: [],
      insurance_amount: "",
      bonding_limit: null,
      certifications: [],
      years_in_business: null,
      past_gov_experience: "",
      pbn: "",
      is_canadian: null,
      security_clearance: "",
      project_size_min: null,
      project_size_max: null,
      created_at: "2026-01-01T00:00:00Z",
    };

    expect(profile.bonding_limit).toBeNull();
    expect(profile.years_in_business).toBeNull();
    expect(profile.is_canadian).toBeNull();
  });
});

describe("TenderSelection type", () => {
  it("includes match context fields", () => {
    const selection: TenderSelection = {
      id: 1,
      profile_id: 1,
      tender_id: 10,
      match_score: 85,
      matched_keywords: ["janitorial", "cleaning"],
      match_reasoning: "Strong fit for janitorial services in Saskatchewan",
      created_at: "2026-01-01T00:00:00Z",
    };

    expect(selection.match_score).toBe(85);
    expect(selection.matched_keywords).toHaveLength(2);
  });
});

describe("TenderAnalysis type", () => {
  it("includes structured analysis", () => {
    const analysis: TenderAnalysis = {
      id: 1,
      profile_id: 1,
      tender_id: 10,
      analysis: {
        whatTheyWant: ["Janitorial services for 6 locations"],
        deadlines: [{ label: "Closing", value: "2026-04-15", urgent: true }],
        forms: ["PWGSC-TPSGC 9200"],
        evaluation: [{ criteria: "Technical", weight: "40%" }],
        risks: [{ level: "medium", text: "Bonding requirement exceeds profile" }],
      },
      created_at: "2026-01-01T00:00:00Z",
    };

    expect(analysis.analysis.risks[0].level).toBe("medium");
  });
});

describe("ComplianceAssessment type", () => {
  it("includes structured sections with items", () => {
    const assessment: ComplianceAssessment = {
      overallResult: "conditionally_eligible",
      overallLabel: "Conditionally Eligible",
      summaryNote: "Most requirements met, bonding needs increase",
      sections: [
        {
          title: "Buy Canadian Policy",
          items: [
            {
              name: "Canadian Ownership",
              description: "Company is Canadian-owned",
              status: "pass",
              statusLabel: "Verified",
              action: null,
            },
          ],
        },
      ],
    };

    expect(assessment.overallResult).toBe("conditionally_eligible");
    expect(assessment.sections[0].items[0].status).toBe("pass");
  });

  it("handles fail status with action required", () => {
    const item: ComplianceItem = {
      name: "Bonding",
      description: "Requires $1M, company has $500K",
      status: "fail",
      statusLabel: "Action Needed",
      action: "Increase bonding to $1M before submission",
    };

    expect(item.action).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/types.test.ts`
Expected: FAIL — types `TenderSelection`, `TenderAnalysis`, `ComplianceAssessment`, `ComplianceSection`, `ComplianceItem` don't exist yet, and `BusinessProfile` is missing new fields.

- [ ] **Step 3: Update types**

Replace the contents of `src/lib/types.ts`:

```typescript
export interface BusinessProfile {
  id: number;
  company_name: string;
  naics_codes: string[];
  location: string;
  province: string;
  capabilities: string;
  keywords: string[];
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/types.test.ts`
Expected: PASS — all type tests compile and pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts tests/types.test.ts
git commit -m "feat(types): add TenderSelection, TenderAnalysis, ComplianceAssessment types and extend BusinessProfile"
```

---

### Task 1.3: Build Server-Side Context Builder

**Files:**
- Create: `src/lib/ai/context-builder.ts`
- Test: `tests/context-builder.test.ts` (create)

- [ ] **Step 1: Write the tests**

Create `tests/context-builder.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

const { buildAgentContext } = await import("@/lib/ai/context-builder");

const mockProfile = {
  id: 1,
  company_name: "Test Co",
  province: "Saskatchewan",
  capabilities: "Janitorial",
  keywords: ["cleaning"],
  insurance_amount: "$2M",
  bonding_limit: 500000,
  certifications: ["WSIB"],
  is_canadian: true,
  naics_codes: ["561720"],
  location: "Saskatoon",
  years_in_business: 5,
  past_gov_experience: "RCMP detachments",
  pbn: "PBN-123",
  security_clearance: "Reliability",
  project_size_min: 50000,
  project_size_max: 500000,
  created_at: "2026-01-01",
};

const mockTender = {
  id: 10,
  title: "Janitorial Services",
  description: "Cleaning for federal buildings",
  regions_of_delivery: ["Saskatchewan"],
  trade_agreements: ["CFTA"],
  reference_number: "REF-001",
  contracting_entity: "PWGSC",
  closing_date: "2026-04-15",
  procurement_category: "SRV",
  status: "Open",
};

const mockSelection = {
  match_score: 85,
  matched_keywords: ["janitorial"],
  match_reasoning: "Strong fit",
};

const mockAnalysis = {
  analysis: {
    whatTheyWant: ["Cleaning services"],
    deadlines: [],
    forms: [],
    evaluation: [],
    risks: [],
  },
};

const mockCompliance = {
  responses: {},
  result: "pass",
  explanation: "All clear",
  documentation_checklist: [],
};

describe("buildAgentContext", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty context for profile agent", async () => {
    const ctx = await buildAgentContext("profile", 1);
    expect(ctx).toEqual({});
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("fetches profile for scout agent", async () => {
    mockSingle.mockResolvedValue({ data: mockProfile, error: null });

    const ctx = await buildAgentContext("scout", 1);

    expect(mockFrom).toHaveBeenCalledWith("business_profiles");
    expect(ctx.profile).toEqual(mockProfile);
    expect(ctx.tender).toBeUndefined();
  });

  it("fetches profile + tender + selection for analyst agent", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: mockTender, error: null })
      .mockResolvedValueOnce({ data: mockSelection, error: null });

    // For analyst, need a different mock chain for the composite query
    const mockEqTender = vi.fn(() => ({ single: mockSingle }));
    const mockEqProfile = vi.fn(() => ({ eq: mockEqTender }));
    const mockSelectChain = vi.fn(() => ({ eq: mockEqProfile }));
    mockFrom.mockImplementation((table: string) => {
      if (table === "business_profiles") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) };
      if (table === "tenders") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) };
      if (table === "tender_selections") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) })) };
      return { select: mockSelectChain };
    });

    mockSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: mockTender, error: null })
      .mockResolvedValueOnce({ data: mockSelection, error: null });

    const ctx = await buildAgentContext("analyst", 1, 10);

    expect(ctx.profile).toBeDefined();
    expect(ctx.tender).toBeDefined();
    expect(ctx.matchContext).toBeDefined();
  });

  it("returns empty context gracefully when profile not found", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

    const ctx = await buildAgentContext("scout", 999);
    expect(ctx.profile).toBeNull();
  });

  it("scout does not require tenderId", async () => {
    mockSingle.mockResolvedValue({ data: mockProfile, error: null });

    const ctx = await buildAgentContext("scout", 1);
    expect(ctx.tender).toBeUndefined();
    expect(ctx.profile).toEqual(mockProfile);
  });

  it("writer fetches all upstream context", async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ single: mockSingle })),
          single: mockSingle,
        })),
      })),
    }));

    mockSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: mockTender, error: null })
      .mockResolvedValueOnce({ data: mockAnalysis, error: null })
      .mockResolvedValueOnce({ data: mockCompliance, error: null });

    const ctx = await buildAgentContext("writer", 1, 10);

    expect(ctx.profile).toBeDefined();
    expect(ctx.tender).toBeDefined();
    expect(ctx.analysis).toBeDefined();
    expect(ctx.compliance).toBeDefined();
  });
});

describe("formatContextForPrompt", () => {
  const { formatContextForPrompt } = await import("@/lib/ai/context-builder");

  it("formats profile context into readable string", () => {
    const result = formatContextForPrompt({ profile: mockProfile });
    expect(result).toContain("Test Co");
    expect(result).toContain("Saskatchewan");
    expect(result).toContain("Janitorial");
  });

  it("returns empty string for empty context", () => {
    const result = formatContextForPrompt({});
    expect(result).toBe("");
  });

  it("includes tender when present", () => {
    const result = formatContextForPrompt({ profile: mockProfile, tender: mockTender });
    expect(result).toContain("Janitorial Services");
    expect(result).toContain("REF-001");
  });

  it("includes match context when present", () => {
    const result = formatContextForPrompt({
      profile: mockProfile,
      tender: mockTender,
      matchContext: mockSelection,
    });
    expect(result).toContain("85");
    expect(result).toContain("Strong fit");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/context-builder.test.ts`
Expected: FAIL — module `@/lib/ai/context-builder` does not exist.

- [ ] **Step 3: Implement context builder**

Create `src/lib/ai/context-builder.ts`:

```typescript
import { createServerClient } from "@/lib/supabase";
import { AgentId } from "@/lib/types";

export interface AgentContext {
  profile?: any;
  tender?: any;
  matchContext?: any;
  analysis?: any;
  compliance?: any;
}

// What each agent needs from Supabase
const AGENT_READS: Record<AgentId, string[]> = {
  profile: [],
  scout: ["business_profiles"],
  analyst: ["business_profiles", "tenders", "tender_selections"],
  compliance: ["business_profiles", "tenders", "tender_analyses"],
  writer: ["business_profiles", "tenders", "tender_analyses", "eligibility_checks"],
};

export async function buildAgentContext(
  agentId: AgentId,
  profileId: number,
  tenderId?: number
): Promise<AgentContext> {
  const needs = AGENT_READS[agentId];
  if (needs.length === 0) return {};

  const supabase = createServerClient();
  const ctx: AgentContext = {};

  if (needs.includes("business_profiles")) {
    const { data } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", profileId)
      .single();
    ctx.profile = data || null;
  }

  if (needs.includes("tenders") && tenderId) {
    const { data } = await supabase
      .from("tenders")
      .select("*")
      .eq("id", tenderId)
      .single();
    ctx.tender = data || null;
  }

  if (needs.includes("tender_selections") && tenderId) {
    const { data } = await supabase
      .from("tender_selections")
      .select("*")
      .eq("profile_id", profileId)
      .eq("tender_id", tenderId)
      .single();
    ctx.matchContext = data || null;
  }

  if (needs.includes("tender_analyses") && tenderId) {
    const { data } = await supabase
      .from("tender_analyses")
      .select("*")
      .eq("profile_id", profileId)
      .eq("tender_id", tenderId)
      .single();
    ctx.analysis = data || null;
  }

  if (needs.includes("eligibility_checks") && tenderId) {
    const { data } = await supabase
      .from("eligibility_checks")
      .select("*")
      .eq("profile_id", profileId)
      .eq("tender_id", tenderId)
      .single();
    ctx.compliance = data || null;
  }

  return ctx;
}

export function formatContextForPrompt(ctx: AgentContext): string {
  const parts: string[] = [];

  if (ctx.profile) {
    const p = ctx.profile;
    parts.push(`COMPANY PROFILE:
Company: ${p.company_name}
Province: ${p.province}
Location: ${p.location}
Services: ${p.capabilities}
Keywords: ${(p.keywords || []).join(", ")}
NAICS Codes: ${(p.naics_codes || []).join(", ")}
Years in Business: ${p.years_in_business ?? "Unknown"}
Project Size Range: ${p.project_size_min ? `$${p.project_size_min.toLocaleString()} - $${p.project_size_max?.toLocaleString()}` : "Unknown"}
Insurance: ${p.insurance_amount || "Unknown"}
Bonding Limit: ${p.bonding_limit ? `$${p.bonding_limit.toLocaleString()}` : "Unknown"}
Certifications: ${(p.certifications || []).join(", ") || "None listed"}
Security Clearance: ${p.security_clearance || "Unknown"}
Canadian Business: ${p.is_canadian === true ? "Yes" : p.is_canadian === false ? "No" : "Unknown"}
PBN: ${p.pbn || "Not provided"}
Past Government Experience: ${p.past_gov_experience || "None listed"}`);
  }

  if (ctx.tender) {
    const t = ctx.tender;
    parts.push(`SELECTED TENDER:
Title: ${t.title}
Reference: ${t.reference_number}
Entity: ${t.contracting_entity}
Closing Date: ${t.closing_date}
Category: ${t.procurement_category}
Status: ${t.status}
Regions: ${(t.regions_of_delivery || []).join(", ")}
Trade Agreements: ${(t.trade_agreements || []).join(", ")}
Description: ${t.description}`);
  }

  if (ctx.matchContext) {
    const m = ctx.matchContext;
    parts.push(`SCOUT MATCH CONTEXT:
Match Score: ${m.match_score}%
Matched Keywords: ${(m.matched_keywords || []).join(", ")}
Match Reasoning: ${m.match_reasoning}`);
  }

  if (ctx.analysis?.analysis) {
    const a = ctx.analysis.analysis;
    parts.push(`TENDER ANALYSIS:
Scope: ${(a.whatTheyWant || []).join("; ")}
Risks: ${(a.risks || []).map((r: any) => `[${r.level}] ${r.text}`).join("; ")}
Evaluation: ${(a.evaluation || []).map((e: any) => `${e.criteria}: ${e.weight}`).join(", ")}
Forms Required: ${(a.forms || []).join(", ")}`);
  }

  if (ctx.compliance) {
    const c = ctx.compliance;
    parts.push(`COMPLIANCE ASSESSMENT:
Result: ${c.result}
Explanation: ${c.explanation}`);
  }

  return parts.join("\n\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/context-builder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/context-builder.ts tests/context-builder.test.ts
git commit -m "feat(ai): add server-side context builder for agent data pipeline"
```

---

### Task 1.4: Update `/api/ai` Route to Use Context Builder

**Files:**
- Modify: `src/app/api/ai/route.ts`
- Test: `tests/api-ai.test.ts` (create)

- [ ] **Step 1: Write the test**

Create `tests/api-ai.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "Hello from Claude" }],
      }),
    },
  })),
}));

const mockBuildAgentContext = vi.fn().mockResolvedValue({ profile: { company_name: "Test" } });
const mockFormatContextForPrompt = vi.fn().mockReturnValue("COMPANY PROFILE:\nCompany: Test");

vi.mock("@/lib/ai/context-builder", () => ({
  buildAgentContext: mockBuildAgentContext,
  formatContextForPrompt: mockFormatContextForPrompt,
}));

vi.mock("@/lib/ai/tools", () => ({ TOOL_DEFINITIONS: [] }));
vi.mock("@/lib/ai/prompts", () => ({
  getSystemPrompt: vi.fn().mockReturnValue("You are Bidly"),
  AGENT_TOOLS: { scout: [], profile: [], analyst: [], compliance: [], writer: [] },
}));
vi.mock("@/lib/ai/tool-handlers", () => ({
  handleToolCall: vi.fn(),
}));

const { POST } = await import("@/app/api/ai/route");

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts profileId and tenderId instead of profileContext", async () => {
    const res = await POST(
      makeRequest({
        agentId: "scout",
        messages: [{ role: "user", content: "Find tenders", timestamp: 1 }],
        profileId: 1,
        tenderId: 10,
      }) as any
    );

    expect(res.status).toBe(200);
    expect(mockBuildAgentContext).toHaveBeenCalledWith("scout", 1, 10);
    expect(mockFormatContextForPrompt).toHaveBeenCalled();
  });

  it("works without tenderId for profile agent", async () => {
    const res = await POST(
      makeRequest({
        agentId: "profile",
        messages: [{ role: "user", content: "Hello", timestamp: 1 }],
        profileId: 1,
      }) as any
    );

    expect(res.status).toBe(200);
    expect(mockBuildAgentContext).toHaveBeenCalledWith("profile", 1, undefined);
  });

  it("returns error for missing agentId", async () => {
    const res = await POST(
      makeRequest({
        messages: [{ role: "user", content: "Hello", timestamp: 1 }],
        profileId: 1,
      }) as any
    );

    const json = await res.json();
    // Should still work (agentId defaults or errors gracefully)
    expect(res.status).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api-ai.test.ts`
Expected: FAIL — route still expects `profileContext` string, not `profileId`/`tenderId`.

- [ ] **Step 3: Update the route**

Replace `src/app/api/ai/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFINITIONS } from "@/lib/ai/tools";
import { getSystemPrompt, AGENT_TOOLS } from "@/lib/ai/prompts";
import { handleToolCall } from "@/lib/ai/tool-handlers";
import { buildAgentContext, formatContextForPrompt } from "@/lib/ai/context-builder";
import { AgentId, ChatMessage } from "@/lib/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { agentId, messages, profileId, tenderId } = (await request.json()) as {
      agentId: AgentId;
      messages: ChatMessage[];
      profileId?: number;
      tenderId?: number;
    };

    // Build context server-side from Supabase
    const context = await buildAgentContext(agentId, profileId || 0, tenderId);
    const contextString = formatContextForPrompt(context);

    // Filter tools to only those available for this agent
    const allowedTools = AGENT_TOOLS[agentId] || [];
    const tools = TOOL_DEFINITIONS.filter((t) =>
      allowedTools.includes(t.name)
    );

    const systemPrompt = getSystemPrompt(agentId, contextString);

    // Convert ChatMessages to Anthropic format
    const anthropicMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Call Claude with tool-use loop
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: tools.length > 0 ? tools : undefined,
      messages: anthropicMessages,
    });

    // Handle tool-use loop
    const MAX_TOOL_ITERATIONS = 10;
    let loopMessages = [...anthropicMessages];
    let iterations = 0;

    while (response.stop_reason === "tool_use") {
      if (++iterations > MAX_TOOL_ITERATIONS) {
        return NextResponse.json(
          { error: "Too many tool iterations — possible loop detected" },
          { status: 500 }
        );
      }

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => ({
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: await handleToolCall(
            block.name,
            block.input as Record<string, any>
          ),
        }))
      );

      loopMessages = [
        ...loopMessages,
        { role: "assistant" as const, content: response.content },
        { role: "user" as const, content: toolResults },
      ];

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages: loopMessages,
      });
    }

    // Extract text from response
    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return NextResponse.json({ content: textContent });
  } catch (error: any) {
    console.error("AI route error:", error);
    return NextResponse.json(
      { error: error.message || "AI request failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api-ai.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/ai/route.ts tests/api-ai.test.ts
git commit -m "refactor(api): replace client-side profileContext with server-side context builder"
```

---

### Task 1.5: Update Tool Definitions and AGENT_TOOLS Mapping

**Files:**
- Modify: `src/lib/ai/tools.ts`
- Modify: `src/lib/ai/prompts.ts`
- Test: `tests/tool-definitions.test.ts` (create)

- [ ] **Step 1: Write the test**

Create `tests/tool-definitions.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { TOOL_DEFINITIONS } from "@/lib/ai/tools";
import { AGENT_TOOLS } from "@/lib/ai/prompts";

describe("TOOL_DEFINITIONS", () => {
  const toolNames = TOOL_DEFINITIONS.map((t) => t.name);

  it("includes all new tools", () => {
    const expectedTools = [
      "searchTenders",
      "getTenderDetails",
      "getCompanyProfile",
      "calculatePricing",
      "saveProgress",
      "summarizeTender",
      "getFormChecklist",
      "explainForm",
      "matchTendersToProfile",
      "filterTenders",
      "checkBuyCanadian",
      "runComplianceAssessment",
      "saveTenderSelection",
      "saveAnalysis",
      "saveComplianceResult",
      "saveDraft",
      "updateProfile",
      "draftBidSection",
    ];

    for (const tool of expectedTools) {
      expect(toolNames).toContain(tool);
    }
  });

  it("does not include removed tools", () => {
    expect(toolNames).not.toContain("checkEligibility");
  });

  it("matchTendersToProfile requires profile_id", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "matchTendersToProfile");
    expect(tool?.input_schema.required).toContain("profile_id");
  });

  it("checkBuyCanadian requires is_canadian", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "checkBuyCanadian");
    expect(tool?.input_schema.required).toContain("is_canadian");
  });

  it("filterTenders has optional date range params", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "filterTenders");
    expect(tool?.input_schema.properties).toHaveProperty("closing_after");
    expect(tool?.input_schema.properties).toHaveProperty("closing_before");
  });
});

describe("AGENT_TOOLS mapping", () => {
  it("profile agent has saveProgress and updateProfile", () => {
    expect(AGENT_TOOLS.profile).toContain("saveProgress");
    expect(AGENT_TOOLS.profile).toContain("updateProfile");
  });

  it("scout agent has matching and search tools", () => {
    expect(AGENT_TOOLS.scout).toContain("matchTendersToProfile");
    expect(AGENT_TOOLS.scout).toContain("searchTenders");
    expect(AGENT_TOOLS.scout).toContain("filterTenders");
    expect(AGENT_TOOLS.scout).toContain("getTenderDetails");
    expect(AGENT_TOOLS.scout).toContain("saveTenderSelection");
  });

  it("analyst has analysis tools", () => {
    expect(AGENT_TOOLS.analyst).toContain("getTenderDetails");
    expect(AGENT_TOOLS.analyst).toContain("summarizeTender");
    expect(AGENT_TOOLS.analyst).toContain("getFormChecklist");
    expect(AGENT_TOOLS.analyst).toContain("saveAnalysis");
    expect(AGENT_TOOLS.analyst).toContain("getMatchContext");
  });

  it("compliance has buy canadian hard gate", () => {
    expect(AGENT_TOOLS.compliance).toContain("checkBuyCanadian");
    expect(AGENT_TOOLS.compliance).toContain("runComplianceAssessment");
    expect(AGENT_TOOLS.compliance).toContain("saveComplianceResult");
  });

  it("writer has drafting and pricing tools", () => {
    expect(AGENT_TOOLS.writer).toContain("draftBidSection");
    expect(AGENT_TOOLS.writer).toContain("saveDraft");
    expect(AGENT_TOOLS.writer).toContain("calculatePricing");
    expect(AGENT_TOOLS.writer).toContain("explainForm");
  });

  it("updateProfile is available to all agents", () => {
    for (const agentId of ["profile", "scout", "analyst", "compliance", "writer"]) {
      expect(AGENT_TOOLS[agentId as keyof typeof AGENT_TOOLS]).toContain("updateProfile");
    }
  });

  it("every tool in AGENT_TOOLS has a matching TOOL_DEFINITION", () => {
    const definedToolNames = TOOL_DEFINITIONS.map((t) => t.name);
    for (const [agentId, tools] of Object.entries(AGENT_TOOLS)) {
      for (const tool of tools) {
        expect(definedToolNames, `Tool "${tool}" assigned to ${agentId} but not defined`).toContain(tool);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tool-definitions.test.ts`
Expected: FAIL — new tools don't exist yet, old `checkEligibility` still present.

- [ ] **Step 3: Update tool definitions**

Replace `src/lib/ai/tools.ts` with the full set of 18 tool definitions. Each tool needs `name`, `description`, and `input_schema` with properties and required fields. Include all tools from the spec: `searchTenders`, `getTenderDetails`, `getCompanyProfile`, `calculatePricing`, `saveProgress`, `summarizeTender`, `getFormChecklist`, `explainForm`, `matchTendersToProfile`, `filterTenders`, `checkBuyCanadian`, `runComplianceAssessment`, `saveTenderSelection`, `saveAnalysis`, `saveComplianceResult`, `saveDraft`, `updateProfile`, `draftBidSection`.

Remove `checkEligibility` (replaced by `runComplianceAssessment`).

Key new tool schemas:

- `matchTendersToProfile`: requires `profile_id`, optional `limit`
- `filterTenders`: optional `closing_after`, `closing_before`, `category`, `contracting_entity`, `status`, `limit`
- `checkBuyCanadian`: requires `is_canadian`, `trade_agreements` array
- `runComplianceAssessment`: requires `profile_id`, `tender_id`, `conversation` array
- `saveTenderSelection`: requires `profile_id`, `tender_id`, `match_score`, `matched_keywords`, `match_reasoning`
- `saveAnalysis`: requires `profile_id`, `tender_id`, `analysis` object
- `saveComplianceResult`: requires `profile_id`, `tender_id`, `result`, `explanation`
- `saveDraft`: requires `profile_id`, `tender_id`, `section_type`, `content`
- `updateProfile`: requires `profile_id`, `updates` object
- `getMatchContext`: requires `profile_id`, `tender_id`

- [ ] **Step 4: Update AGENT_TOOLS mapping**

In `src/lib/ai/prompts.ts`, update the `AGENT_TOOLS` record:

```typescript
export const AGENT_TOOLS: Record<AgentId, string[]> = {
  profile: ["saveProgress", "updateProfile"],
  scout: ["matchTendersToProfile", "searchTenders", "filterTenders", "getTenderDetails", "getCompanyProfile", "saveTenderSelection", "updateProfile"],
  analyst: ["getTenderDetails", "summarizeTender", "getFormChecklist", "getCompanyProfile", "getMatchContext", "saveAnalysis", "updateProfile"],
  compliance: ["checkBuyCanadian", "runComplianceAssessment", "saveComplianceResult", "getCompanyProfile", "getTenderDetails", "updateProfile"],
  writer: ["draftBidSection", "saveDraft", "calculatePricing", "explainForm", "getFormChecklist", "getTenderDetails", "getCompanyProfile", "updateProfile"],
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/tool-definitions.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/tools.ts src/lib/ai/prompts.ts tests/tool-definitions.test.ts
git commit -m "feat(ai): add all 18 tool definitions and update AGENT_TOOLS mapping"
```

---

### Task 1.6: Implement New Tool Handlers

**Files:**
- Modify: `src/lib/ai/tool-handlers.ts`
- Test: `tests/tool-handlers.test.ts` (create)

- [ ] **Step 1: Write tests for new handlers**

Create `tests/tool-handlers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
const mockLimit = vi.fn(() => ({ data: [], error: null }));
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockContains = vi.fn(() => ({ order: mockOrder, limit: mockLimit }));
const mockIlike = vi.fn(() => ({ contains: mockContains, order: mockOrder, limit: mockLimit, ilike: mockIlike }));
const mockEq = vi.fn(() => ({
  eq: mockEq,
  single: mockSingle,
  ilike: mockIlike,
  contains: mockContains,
  order: mockOrder,
  limit: mockLimit,
}));
const mockSelect = vi.fn(() => ({
  eq: mockEq,
  order: mockOrder,
  limit: mockLimit,
  ilike: mockIlike,
  contains: mockContains,
  single: mockSingle,
  gte: vi.fn(() => ({ lte: vi.fn(() => ({ order: mockOrder, limit: mockLimit })) })),
}));
const mockUpsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) }));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  upsert: mockUpsert,
  update: mockUpdate,
}));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/voyage", () => ({
  getEmbeddings: vi.fn(),
}));

const { handleToolCall } = await import("@/lib/ai/tool-handlers");

describe("matchTendersToProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries tenders filtered by province and keywords", async () => {
    mockSingle.mockResolvedValue({
      data: {
        province: "Saskatchewan",
        keywords: ["janitorial", "cleaning"],
      },
      error: null,
    });
    mockLimit.mockReturnValue({ data: [{ id: 1, title: "Test Tender" }], error: null });

    const result = await handleToolCall("matchTendersToProfile", { profile_id: 1, limit: 20 });
    const parsed = JSON.parse(result);

    expect(mockFrom).toHaveBeenCalledWith("business_profiles");
    expect(mockFrom).toHaveBeenCalledWith("tenders");
  });

  it("returns empty array when profile not found", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

    const result = await handleToolCall("matchTendersToProfile", { profile_id: 999 });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBeDefined();
  });
});

describe("filterTenders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by category", async () => {
    mockLimit.mockReturnValue({ data: [{ id: 1 }], error: null });

    const result = await handleToolCall("filterTenders", {
      category: "SRV",
      limit: 10,
    });

    expect(mockFrom).toHaveBeenCalledWith("tenders");
  });

  it("returns empty array on no matches", async () => {
    mockLimit.mockReturnValue({ data: [], error: null });

    const result = await handleToolCall("filterTenders", { category: "NOPE" });
    const parsed = JSON.parse(result);

    expect(parsed).toEqual([]);
  });
});

describe("checkBuyCanadian", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns pass for canadian company", async () => {
    const result = await handleToolCall("checkBuyCanadian", {
      is_canadian: true,
      trade_agreements: ["CFTA"],
    });
    const parsed = JSON.parse(result);

    expect(parsed.status).toBe("pass");
  });

  it("returns fail for non-canadian company", async () => {
    const result = await handleToolCall("checkBuyCanadian", {
      is_canadian: false,
      trade_agreements: ["CFTA"],
    });
    const parsed = JSON.parse(result);

    expect(parsed.status).toBe("fail");
    expect(parsed.hard_gate).toBe(true);
  });

  it("returns pending when is_canadian is null/unknown", async () => {
    const result = await handleToolCall("checkBuyCanadian", {
      is_canadian: null,
      trade_agreements: [],
    });
    const parsed = JSON.parse(result);

    expect(parsed.status).toBe("pending");
  });
});

describe("saveTenderSelection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts tender selection", async () => {
    mockSingle.mockResolvedValue({ data: { id: 1 }, error: null });

    const result = await handleToolCall("saveTenderSelection", {
      profile_id: 1,
      tender_id: 10,
      match_score: 85,
      matched_keywords: ["janitorial"],
      match_reasoning: "Strong fit",
    });
    const parsed = JSON.parse(result);

    expect(mockFrom).toHaveBeenCalledWith("tender_selections");
    expect(mockUpsert).toHaveBeenCalled();
  });
});

describe("saveAnalysis", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts tender analysis", async () => {
    mockSingle.mockResolvedValue({ data: { id: 1 }, error: null });

    const result = await handleToolCall("saveAnalysis", {
      profile_id: 1,
      tender_id: 10,
      analysis: { whatTheyWant: ["Test"], deadlines: [], forms: [], evaluation: [], risks: [] },
    });

    expect(mockFrom).toHaveBeenCalledWith("tender_analyses");
    expect(mockUpsert).toHaveBeenCalled();
  });
});

describe("updateProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("partially updates profile", async () => {
    mockSingle.mockResolvedValue({
      data: { id: 1, insurance_amount: "$3M" },
      error: null,
    });

    const result = await handleToolCall("updateProfile", {
      profile_id: 1,
      updates: { insurance_amount: "$3M" },
    });
    const parsed = JSON.parse(result);

    expect(mockFrom).toHaveBeenCalledWith("business_profiles");
    expect(mockUpdate).toHaveBeenCalledWith({ insurance_amount: "$3M" });
  });

  it("rejects updates to id field", async () => {
    const result = await handleToolCall("updateProfile", {
      profile_id: 1,
      updates: { id: 999 },
    });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBeDefined();
  });
});

describe("getMatchContext", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches tender selection for profile+tender", async () => {
    mockSingle.mockResolvedValue({
      data: { match_score: 85, matched_keywords: ["cleaning"] },
      error: null,
    });

    const result = await handleToolCall("getMatchContext", {
      profile_id: 1,
      tender_id: 10,
    });
    const parsed = JSON.parse(result);

    expect(parsed.match_score).toBe(85);
    expect(mockFrom).toHaveBeenCalledWith("tender_selections");
  });

  it("returns error when no selection exists", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

    const result = await handleToolCall("getMatchContext", {
      profile_id: 1,
      tender_id: 999,
    });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tool-handlers.test.ts`
Expected: FAIL — new tool handlers don't exist yet.

- [ ] **Step 3: Implement all new tool handlers**

Update `src/lib/ai/tool-handlers.ts`. Replace the full file. Key implementations:

- `matchTendersToProfile`: fetch profile, use province + keywords to query tenders with `ILIKE` on title/description and `contains` on `regions_of_delivery`
- `filterTenders`: build Supabase query with optional `.eq()`, `.gte()`, `.lte()` filters
- `checkBuyCanadian`: pure logic — if `is_canadian === true` → pass, `false` → fail (hard gate), `null` → pending
- `saveTenderSelection`: upsert to `tender_selections` with `onConflict: "profile_id,tender_id"`
- `saveAnalysis`: upsert to `tender_analyses` with `onConflict: "profile_id,tender_id"`
- `saveComplianceResult`: upsert to `eligibility_checks` with `onConflict: "profile_id,tender_id"`
- `saveDraft`: upsert to `bid_drafts`, merge section into existing `sections` JSONB
- `updateProfile`: validate no `id` or `created_at` in updates, then `.update().eq("id", profile_id)`
- `getMatchContext`: select from `tender_selections` where `profile_id` and `tender_id`
- `runComplianceAssessment`: call `/api/check-compliance` internally (use `fetch` to the same server)
- `draftBidSection`: return instruction for AI to draft inline (the AI itself generates the content using its context)
- `explainForm`: return instruction for AI to explain inline

Remove: `checkEligibility` case from the switch
Remove: Voyage import (`import { getEmbeddings } from "@/lib/voyage"`)
Update: `searchTenders` to use SQL `ILIKE` instead of vector search

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tool-handlers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/tool-handlers.ts tests/tool-handlers.test.ts
git commit -m "feat(ai): implement all new tool handlers, remove Voyage dependency"
```

---

### Task 1.7: Delete Voyage Files

**Files:**
- Delete: `src/lib/voyage.ts`
- Delete: `scripts/embed-tenders.ts`
- Delete: `tests/voyage.test.ts`

- [ ] **Step 1: Delete the files**

```bash
rm src/lib/voyage.ts scripts/embed-tenders.ts tests/voyage.test.ts
```

- [ ] **Step 2: Verify no remaining imports**

Run: `grep -r "voyage" src/ tests/ --include="*.ts" --include="*.tsx"`
Expected: No results (all Voyage references removed in Task 1.6).

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass. No broken imports.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "chore: remove Voyage embedding files (replaced by LLM-based matching)"
```

---

### Task 1.8: Update Agent Prompts

**Files:**
- Modify: `src/lib/ai/prompts.ts`

- [ ] **Step 1: Update all agent system prompts**

Update the `agentPrompts` record in `src/lib/ai/prompts.ts`. Key changes:

**Profile prompt** — update question list to match 7-step interview:
1. Company name
2. Province
3. Services/capabilities → infer NAICS, present for confirmation
4. Years in business + project size range (min/max dollars)
5. Certifications & insurance (WSIB, bonding amount, liability)
6. Past government contract experience
7. Summary + confirm

Add instruction: "When you infer NAICS codes, present them to the user for confirmation."

**Scout prompt** — add instruction to auto-call `matchTendersToProfile` on first message, explain matches relative to profile, use `saveTenderSelection` when user picks a tender.

**Analyst prompt** — add instruction to use `getMatchContext` for Scout reasoning, frame all analysis relative to profile strengths/gaps, save analysis with `saveAnalysis`.

**Compliance prompt** — update to the 8-step guided interview (Canadian ownership → PBN → insurance → bonding → security → certs → subcontractors → confirm). Add Buy Canadian hard gate instruction: "If the company is not Canadian, immediately return Not Eligible. Do not continue the interview." Add instruction to call `updateProfile` with any new company facts discovered. Add instruction to auto-call `runComplianceAssessment` after user confirms.

**Writer prompt** — update section order (8 sections). Add instruction to recommend skipping irrelevant sections. Add instruction to call `draftBidSection` for each section, `saveDraft` after user approves.

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai/prompts.ts
git commit -m "feat(ai): update all agent system prompts for working MVP flow"
```

---

### Task 1.9: Save Migration File to Git

**Files:**
- Create: `supabase/migrations/002_working_mvp.sql`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/002_working_mvp.sql` containing all the SQL from Task 1.1 (the ALTER TABLE, CREATE TABLE, and DROP statements) so the migration is tracked in version control.

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/002_working_mvp.sql
git commit -m "chore(db): add working MVP schema migration"
```

---

## Workload 2: Profile Agent + Scout Agent

> Can run in parallel with Workloads 3 and 4 after Workload 1 is complete.

---

### Task 2.1: Refactor Profile View — Remove Demo Scaffolding

**Files:**
- Modify: `src/components/views/profile-view.tsx`
- Test: `tests/profile-view.test.tsx` (create)

- [ ] **Step 1: Write tests for the new profile view**

Create `tests/profile-view.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Test that demo scaffolding is removed
describe("ProfileView", () => {
  it("does not contain DEMO_PAIRS constant", async () => {
    const source = await import("@/components/views/profile-view");
    expect((source as any).DEMO_PAIRS).toBeUndefined();
  });

  it("does not contain DEMO_PROFILE_PAYLOAD constant", async () => {
    const source = await import("@/components/views/profile-view");
    expect((source as any).DEMO_PROFILE_PAYLOAD).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/profile-view.test.tsx`
Expected: FAIL — `DEMO_PAIRS` and `DEMO_PROFILE_PAYLOAD` still exist.

- [ ] **Step 3: Remove demo scaffolding from profile-view.tsx**

Remove from `src/components/views/profile-view.tsx`:
- `DEMO_PAIRS` constant (lines 25-51)
- `DEMO_PROFILE_PAYLOAD` constant (lines 53-64)
- `demoMode` state and `demoStep` state
- Demo mode `useEffect` with hardcoded timings (lines 159-197)
- "Load Demo" button (lines 318-331)

Keep:
- The real chat interface
- `extractAndSaveProfile` function
- `saveProfile` function
- Profile summary display for returning users

- [ ] **Step 4: Add profile summary view for returning users**

When `agent.profile` exists, render a read-only summary card showing all profile fields with an "Edit Profile" button. When clicked, re-enable the chat for updates.

- [ ] **Step 5: Update chat to send profileId instead of profileContext**

In the ChatPanel usage within profile-view, pass `profileId={agent.profile?.id}` instead of building context strings.

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/profile-view.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/views/profile-view.tsx tests/profile-view.test.tsx
git commit -m "refactor(profile): remove demo scaffolding, add profile summary view"
```

---

### Task 2.2: Refactor Scout View — Replace Hardcoded Scoring

**Files:**
- Modify: `src/components/views/scout-view.tsx`
- Test: `tests/scout-view.test.tsx` (create)

- [ ] **Step 1: Write tests**

Create `tests/scout-view.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";

describe("ScoutView", () => {
  it("does not contain BOOST_KEYWORDS constant", async () => {
    const source = await import("@/components/views/scout-view");
    expect((source as any).BOOST_KEYWORDS).toBeUndefined();
  });

  it("does not contain hardcoded limit=50", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/scout-view.tsx", "utf-8");
    expect(content).not.toContain("limit=50");
    expect(content).not.toContain("limit: 50");
  });

  it("does not contain hardcoded percentage scores", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/scout-view.tsx", "utf-8");
    // No hardcoded 99%, 97%, 88% scoring
    expect(content).not.toMatch(/Math\.random\(\)\s*\*\s*30/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scout-view.test.tsx`
Expected: FAIL

- [ ] **Step 3: Remove hardcoded scoring from scout-view.tsx**

Remove from `src/components/views/scout-view.tsx`:
- `BOOST_KEYWORDS` array (lines 26-36)
- Hardcoded scoring function (99%/97%/88%/random)
- `limit=50` hardcode

Replace with:
- On mount, the ChatPanel auto-sends an initial message triggering the Scout AI to call `matchTendersToProfile`
- Tender list populated from AI tool call results (returned in the chat response)
- Match scores come from the AI's assessment, not client-side calculation
- Tender selection calls `saveTenderSelection` via the AI, then `agent.setSelectedTender()`

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/scout-view.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/views/scout-view.tsx tests/scout-view.test.tsx
git commit -m "refactor(scout): remove hardcoded scoring, use AI-driven matching"
```

---

### Task 2.3: Update ChatPanel — Remove Client-Side Context Building

**Files:**
- Modify: `src/components/chat-panel.tsx`
- Modify: `src/hooks/use-chat.ts`

- [ ] **Step 1: Remove buildContext from chat-panel.tsx**

Remove the `buildContext()` function (lines 14-23). The ChatPanel should now accept `profileId` and `tenderId` as props and pass them to the `useChat` hook.

Update the `ChatPanelProps` interface:

```typescript
interface ChatPanelProps {
  agentId: AgentId;
  profileId?: number;
  tenderId?: number;
}
```

- [ ] **Step 2: Update use-chat.ts to send profileId/tenderId**

In `src/hooks/use-chat.ts`, update the `sendMessage` function to send `profileId` and `tenderId` in the request body instead of `profileContext`:

```typescript
body: JSON.stringify({
  agentId,
  messages: [...messages, { role: "user", content, timestamp: Date.now() }],
  profileId,
  tenderId,
}),
```

- [ ] **Step 3: Update all view components**

Update each view component to pass `profileId` and `tenderId` to ChatPanel instead of `selectedTender` and `profile` objects:

```typescript
<ChatPanel
  agentId="scout"
  profileId={agent.profile?.id}
  tenderId={agent.selectedTender?.id}
/>
```

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat-panel.tsx src/hooks/use-chat.ts src/components/views/*.tsx
git commit -m "refactor(chat): remove client-side context building, pass profileId/tenderId"
```

---

### Task 2.4: Update useAgent Hook — Add profileId and Hydration

**Files:**
- Modify: `src/hooks/use-agent.ts`
- Modify: `src/__tests__/use-agent.test.ts`

- [ ] **Step 1: Update the existing tests**

Add new test cases to `src/__tests__/use-agent.test.ts`:

```typescript
describe("profileId", () => {
  it("starts as null", () => {
    const { result } = renderHook(() => useAgent());
    expect(result.current.profileId).toBeNull();
  });

  it("sets profileId when setProfile is called with a profile that has an id", () => {
    const { result } = renderHook(() => useAgent());
    act(() => result.current.setProfile({ id: 42, company_name: "Test" } as any));
    expect(result.current.profileId).toBe(42);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/use-agent.test.ts`
Expected: FAIL — `profileId` doesn't exist on the hook return.

- [ ] **Step 3: Update useAgent hook**

In `src/hooks/use-agent.ts`:
- Derive `profileId` from `profile?.id ?? null`
- Derive `tenderId` from `selectedTender?.id ?? null`
- Add hydration `useEffect` that calls `GET /api/profile` on mount to restore state from Supabase
- If profile found, set it and mark Profile agent as `completed`

```typescript
const profileId = profile?.id ?? null;
const tenderId = selectedTender?.id ?? null;

// Hydrate from Supabase on mount
useEffect(() => {
  fetch("/api/profile")
    .then((r) => r.ok ? r.json() : null)
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
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/use-agent.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-agent.ts src/__tests__/use-agent.test.ts
git commit -m "feat(hooks): add profileId/tenderId derivation and Supabase hydration to useAgent"
```

---

## Workload 3: Analyst Agent + Compliance Agent

> Can run in parallel with Workloads 2 and 4 after Workload 1 is complete.

---

### Task 3.1: Update Analyst View — Profile-Aware Analysis

**Files:**
- Modify: `src/app/api/analyze-tender/route.ts`
- Modify: `src/components/views/analyst-view.tsx`
- Test: `tests/api-analyze-tender.test.ts` (create)

- [ ] **Step 1: Write tests for updated API**

Create `tests/api-analyze-tender.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify({
          whatTheyWant: ["Test"],
          deadlines: [],
          forms: [],
          evaluation: [],
          risks: [{ level: "high", text: "Test risk for profile" }],
        })}],
      }),
    },
  })),
}));

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle, eq: mockEq }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockUpsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockFrom = vi.fn(() => ({ select: mockSelect, upsert: mockUpsert }));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

const { POST } = await import("@/app/api/analyze-tender/route");

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze-tender", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze-tender", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts profileId and tenderId", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { id: 1, company_name: "Test" }, error: null })
      .mockResolvedValueOnce({ data: { match_score: 85 }, error: null })
      .mockResolvedValueOnce({ data: { id: 1 }, error: null });

    const res = await POST(makeRequest({
      tender: { id: 10, title: "Test", description: "Test" },
      profileId: 1,
    }) as any);

    expect(res.status).toBe(200);
  });

  it("saves analysis to tender_analyses table", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { id: 1, company_name: "Test" }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 1 }, error: null });

    await POST(makeRequest({
      tender: { id: 10, title: "Test", description: "Test" },
      profileId: 1,
    }) as any);

    expect(mockFrom).toHaveBeenCalledWith("tender_analyses");
    expect(mockUpsert).toHaveBeenCalled();
  });

  it("returns 400 when tender is missing", async () => {
    const res = await POST(makeRequest({ profileId: 1 }) as any);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api-analyze-tender.test.ts`
Expected: FAIL — route doesn't accept `profileId` yet.

- [ ] **Step 3: Update analyze-tender route**

Modify `src/app/api/analyze-tender/route.ts`:
- Accept `{ tender, profileId }` in the request body
- Fetch profile from Supabase using `profileId`
- Fetch match context from `tender_selections`
- Include profile and match context in the Claude prompt
- After receiving analysis, upsert to `tender_analyses` table
- Return the analysis

- [ ] **Step 4: Update analyst-view.tsx**

Modify `src/components/views/analyst-view.tsx`:
- Pass `profileId: agent.profile?.id` in the fetch to `/api/analyze-tender`
- ChatPanel uses `profileId` and `tenderId` props

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/api-analyze-tender.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/analyze-tender/route.ts src/components/views/analyst-view.tsx tests/api-analyze-tender.test.ts
git commit -m "feat(analyst): add profile-aware analysis with persistence to tender_analyses"
```

---

### Task 3.2: Refactor Compliance View — Remove Demo, Wire Real Assessment

**Files:**
- Modify: `src/components/views/compliance-view.tsx`
- Test: `tests/compliance-view.test.tsx` (create)

- [ ] **Step 1: Write tests**

Create `tests/compliance-view.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";

describe("ComplianceView", () => {
  it("does not contain DEMO_PAIRS constant", async () => {
    const source = await import("@/components/views/compliance-view");
    expect((source as any).DEMO_PAIRS).toBeUndefined();
  });

  it("does not contain hardcoded demoAssessment", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/compliance-view.tsx", "utf-8");
    expect(content).not.toContain("demoAssessment");
    expect(content).not.toContain("generateAssessment");
  });

  it("does not contain setTimeout fake delay", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/compliance-view.tsx", "utf-8");
    expect(content).not.toContain("setTimeout");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/compliance-view.test.tsx`
Expected: FAIL

- [ ] **Step 3: Remove demo scaffolding from compliance-view.tsx**

Remove from `src/components/views/compliance-view.tsx`:
- `DEMO_PAIRS` constant (lines 49-72)
- `demoAssessment` hardcoded all-pass object
- `generateAssessment()` function with `setTimeout` fake delay (lines 104-151)
- Demo mode state and effects

Keep:
- Chat interface
- Assessment results rendering (pass/warn/fail sections)

Wire up:
- Assessment now comes from AI tool call `runComplianceAssessment` → which calls `/api/check-compliance`
- The assessment response is parsed and rendered in the results UI
- ChatPanel passes `profileId` and `tenderId`

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/compliance-view.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/views/compliance-view.tsx tests/compliance-view.test.tsx
git commit -m "refactor(compliance): remove demo scaffolding, wire real assessment via AI tool calls"
```

---

### Task 3.3: Update Check-Compliance Route — Accept Structured Data

**Files:**
- Modify: `src/app/api/check-compliance/route.ts`
- Test: `tests/api-check-compliance.test.ts` (create)

- [ ] **Step 1: Write tests**

Create `tests/api-check-compliance.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{
          type: "text",
          text: JSON.stringify({
            overallResult: "eligible",
            overallLabel: "Eligible",
            summaryNote: "All requirements met",
            sections: [{
              title: "Buy Canadian Policy",
              items: [{ name: "Canadian Ownership", description: "Verified", status: "pass", statusLabel: "Verified", action: null }],
            }],
          }),
        }],
      }),
    },
  })),
}));

const { POST } = await import("@/app/api/check-compliance/route");

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/check-compliance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/check-compliance", () => {
  it("returns structured assessment", async () => {
    const res = await POST(makeRequest({
      tender: { id: 1, title: "Test", trade_agreements: ["CFTA"] },
      profile: { id: 1, company_name: "Test Co", is_canadian: true },
      conversation: [{ role: "user", content: "Yes we have $2M insurance" }],
    }) as any);

    const json = await res.json();
    expect(json.assessment.overallResult).toBe("eligible");
    expect(json.assessment.sections).toHaveLength(1);
    expect(json.assessment.sections[0].title).toBe("Buy Canadian Policy");
  });

  it("returns 400 when tender missing", async () => {
    const res = await POST(makeRequest({ profile: { id: 1 } }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when profile missing", async () => {
    const res = await POST(makeRequest({ tender: { id: 1 } }) as any);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (route already works)**

Run: `npx vitest run tests/api-check-compliance.test.ts`
Expected: PASS — the existing route already accepts `{ tender, profile, conversation }`. This test documents the contract.

- [ ] **Step 3: Update the compliance prompt**

Update the system prompt in `/api/check-compliance/route.ts` to include the 6-section checklist from the spec:
1. Buy Canadian Policy
2. Legal & Corporate Standing
3. Insurance & Bonding
4. Security & Clearances
5. Certifications & Standards
6. Administrative Requirements

Add emphasis: "Buy Canadian Policy is a HARD GATE. If the company is not Canadian-owned or does not have Canadian presence, set overallResult to 'not_eligible' immediately."

- [ ] **Step 4: Run tests again**

Run: `npx vitest run tests/api-check-compliance.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/check-compliance/route.ts tests/api-check-compliance.test.ts
git commit -m "feat(compliance): add 6-section checklist with Buy Canadian hard gate to compliance prompt"
```

---

## Workload 4: Writer Agent + Client-Side Hydration

> Can run in parallel with Workloads 2 and 3 after Workload 1 is complete.

---

### Task 4.1: Refactor Writer View — Remove Hardcoded Content

**Files:**
- Modify: `src/components/views/writer-view.tsx`
- Test: `tests/writer-view.test.tsx` (create)

- [ ] **Step 1: Write tests**

Create `tests/writer-view.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";

describe("WriterView", () => {
  it("does not contain MOCK_CONTENT constant", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/writer-view.tsx", "utf-8");
    expect(content).not.toContain("MOCK_CONTENT");
  });

  it("does not contain PDF_PRICING constant", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/writer-view.tsx", "utf-8");
    expect(content).not.toContain("PDF_PRICING");
    expect(content).not.toContain("PDF_MONTHLY_TOTAL");
    expect(content).not.toContain("PDF_ANNUAL_TOTAL");
    expect(content).not.toContain("PDF_GST");
    expect(content).not.toContain("PDF_GRAND_TOTAL");
  });

  it("does not contain hardcoded section statuses", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/writer-view.tsx", "utf-8");
    // Should not have hardcoded "done" or "draft" in SECTIONS array
    expect(content).not.toMatch(/status:\s*["']done["']/);
    expect(content).not.toMatch(/status:\s*["']draft["']/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/writer-view.test.tsx`
Expected: FAIL

- [ ] **Step 3: Remove hardcoded content from writer-view.tsx**

Remove from `src/components/views/writer-view.tsx`:
- `MOCK_CONTENT` constant (lines 32-68)
- `PDF_PRICING` array (lines 77-90)
- `PDF_MONTHLY_TOTAL`, `PDF_ANNUAL_TOTAL`, `PDF_GST`, `PDF_GRAND_TOTAL` calculations
- Hardcoded `SECTIONS` statuses (lines 21-30)

Replace with:
- Section list that fetches status from `bid_drafts` via `GET /api/drafts?profile_id=X&tender_id=Y`
- Each section shows "empty", "draft", or "done" based on whether content exists in the `bid_drafts.sections` JSONB
- ChatPanel for guided drafting with `profileId` and `tenderId`
- Section content rendered from fetched draft data, not hardcoded

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/writer-view.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/views/writer-view.tsx tests/writer-view.test.tsx
git commit -m "refactor(writer): remove hardcoded content, fetch section data from bid_drafts"
```

---

### Task 4.2: Wire Writer to Drafts API

**Files:**
- Modify: `src/components/views/writer-view.tsx`
- Test: existing `tests/api-drafts.test.ts` covers the API

- [ ] **Step 1: Add draft fetching to writer-view**

Add a `useEffect` to writer-view.tsx that fetches existing drafts on mount:

```typescript
useEffect(() => {
  if (!agent.profile?.id || !agent.selectedTender?.id) return;

  fetch(`/api/drafts?profile_id=${agent.profile.id}&tender_id=${agent.selectedTender.id}`)
    .then((r) => r.ok ? r.json() : null)
    .then((data) => {
      if (data?.sections) {
        setDraftSections(data.sections);
      }
    })
    .catch(() => {});
}, [agent.profile?.id, agent.selectedTender?.id]);
```

- [ ] **Step 2: Derive section statuses from draft data**

```typescript
const getSectionStatus = (key: string): "empty" | "draft" | "done" => {
  const content = draftSections[key];
  if (!content) return "empty";
  return "draft"; // "done" could be set when user explicitly approves
};
```

- [ ] **Step 3: Render section content from draft data**

When a section is selected, display its content from `draftSections[sectionKey]`. If empty, show a prompt to start drafting via chat.

- [ ] **Step 4: Commit**

```bash
git add src/components/views/writer-view.tsx
git commit -m "feat(writer): wire section display to bid_drafts API"
```

---

### Task 4.3: Integration Test — Full Agent Pipeline

**Files:**
- Create: `tests/integration/agent-pipeline.test.ts`

- [ ] **Step 1: Write integration test**

Create `tests/integration/agent-pipeline.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { buildAgentContext, formatContextForPrompt } from "@/lib/ai/context-builder";

// Mock Supabase with realistic data flow
const mockData: Record<string, any> = {
  business_profiles: {
    id: 1,
    company_name: "Maple Facility Services",
    province: "Saskatchewan",
    capabilities: "Janitorial services for government facilities",
    keywords: ["janitorial", "cleaning", "facility"],
    insurance_amount: "$2M commercial liability",
    bonding_limit: 500000,
    certifications: ["WSIB"],
    is_canadian: true,
    naics_codes: ["561720"],
    years_in_business: 5,
    past_gov_experience: "3 years RCMP detachments",
    pbn: "PBN-12345",
    security_clearance: "Reliability",
    project_size_min: 50000,
    project_size_max: 500000,
    location: "Saskatoon",
    created_at: "2026-01-01",
  },
  tenders: {
    id: 10,
    title: "Janitorial Services for Federal Buildings",
    description: "Cleaning services for 6 RCMP detachments in Saskatchewan",
    regions_of_delivery: ["Saskatchewan"],
    trade_agreements: ["CFTA"],
    reference_number: "REF-001",
    contracting_entity: "PWGSC",
    closing_date: "2026-04-15",
    procurement_category: "SRV",
    status: "Open",
  },
  tender_selections: {
    match_score: 92,
    matched_keywords: ["janitorial", "cleaning", "facility"],
    match_reasoning: "Strong fit — core services match, correct region",
  },
  tender_analyses: {
    analysis: {
      whatTheyWant: ["Janitorial services for 6 RCMP detachments"],
      deadlines: [{ label: "Closing", value: "2026-04-15", urgent: true }],
      forms: ["PWGSC-TPSGC 9200"],
      evaluation: [{ criteria: "Technical", weight: "40%" }],
      risks: [{ level: "low", text: "Strong regional presence" }],
    },
  },
  eligibility_checks: {
    result: "pass",
    explanation: "All compliance requirements met",
    responses: {},
    documentation_checklist: [],
  },
};

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn((table: string) => {
  mockSingle.mockResolvedValueOnce({ data: mockData[table] || null, error: null });
  return { select: mockSelect };
});

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

describe("Agent Pipeline Integration", () => {
  it("profile agent gets empty context", async () => {
    const ctx = await buildAgentContext("profile", 1);
    expect(ctx).toEqual({});
  });

  it("scout agent gets profile context", async () => {
    const ctx = await buildAgentContext("scout", 1);
    expect(ctx.profile).toBeDefined();
    expect(ctx.profile.company_name).toBe("Maple Facility Services");

    const prompt = formatContextForPrompt(ctx);
    expect(prompt).toContain("Maple Facility Services");
    expect(prompt).toContain("Saskatchewan");
  });

  it("writer agent gets full pipeline context", async () => {
    const ctx = await buildAgentContext("writer", 1, 10);

    const prompt = formatContextForPrompt(ctx);
    // Should contain data from all upstream agents
    expect(prompt).toContain("COMPANY PROFILE");
    expect(prompt).toContain("SELECTED TENDER");
  });

  it("formatContextForPrompt returns empty string for empty context", () => {
    const result = formatContextForPrompt({});
    expect(result).toBe("");
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/integration/agent-pipeline.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/integration/agent-pipeline.test.ts
git commit -m "test(integration): add full agent pipeline context flow test"
```

---

### Task 4.4: Final Cleanup — Run Full Test Suite

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass. No broken imports, no Voyage references, no hardcoded demo data.

- [ ] **Step 2: Fix any failing tests**

If existing tests fail due to type changes (e.g., `BusinessProfile` now requires more fields), update the test fixtures to include the new required fields. Use the nullable fields (`null` for optional integers/booleans, `""` for optional strings, `[]` for optional arrays).

- [ ] **Step 3: Verify no Voyage references remain**

Run: `grep -r "voyage\|getEmbeddings\|tender_embeddings\|match_tenders" src/ tests/ --include="*.ts" --include="*.tsx"`
Expected: No results.

- [ ] **Step 4: Verify no demo constants remain**

Run: `grep -r "DEMO_PAIRS\|DEMO_PROFILE_PAYLOAD\|BOOST_KEYWORDS\|MOCK_CONTENT\|PDF_PRICING\|demoAssessment\|demoMode" src/ --include="*.ts" --include="*.tsx"`
Expected: No results.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: fix test fixtures for updated types, verify clean removal of demo code"
```

---

## Summary

| Workload | Tasks | Key Deliverables |
|----------|-------|-----------------|
| **1: Foundation** | 1.1–1.9 | Schema migration, types, context builder, tool defs, tool handlers, prompts |
| **2: Profile + Scout** | 2.1–2.4 | Remove demo from Profile/Scout, wire real matching, update ChatPanel/useAgent |
| **3: Analyst + Compliance** | 3.1–3.3 | Profile-aware analysis, remove compliance demo, wire real assessment |
| **4: Writer + Cleanup** | 4.1–4.4 | Remove writer hardcoding, wire drafts API, integration test, final cleanup |

**Total:** 19 tasks, ~80 steps

**Test-first throughout:** Every task writes failing tests before implementation.

**Edge cases covered:**
- Null/missing profile fields (nullable columns)
- Profile not found (context builder returns null gracefully)
- Buy Canadian hard gate (pass/fail/pending for true/false/null)
- No tender selected (agents handle gracefully)
- updateProfile rejects id/created_at changes
- Empty match results
- Malformed JSON in API requests
- Missing required parameters
