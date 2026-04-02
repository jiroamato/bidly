import Anthropic from "@anthropic-ai/sdk";

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "searchTenders",
    description:
      "Search for tenders matching a query. Filters by keyword, category, or region using SQL ILIKE.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Natural language search query (optional)",
        },
        category: {
          type: "string",
          description: "Filter by procurement category: CNST, GD, SRV, SRVTGD",
        },
        region: {
          type: "string",
          description: "Filter by region",
        },
        limit: {
          type: "number",
          description: "Max results to return (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "getTenderDetails",
    description: "Get full details for a specific tender by ID",
    input_schema: {
      type: "object" as const,
      properties: {
        tender_id: { type: "number", description: "The tender ID" },
      },
      required: ["tender_id"],
    },
  },
  {
    name: "getCompanyProfile",
    description: "Get the business profile by ID",
    input_schema: {
      type: "object" as const,
      properties: {
        profile_id: { type: "number" },
      },
      required: ["profile_id"],
    },
  },
  {
    name: "matchTendersToProfile",
    description:
      "Match tenders to a business profile based on province, keywords, and NAICS codes. Returns ranked matches.",
    input_schema: {
      type: "object" as const,
      properties: {
        profile_id: {
          type: "number",
          description: "The business profile ID to match against",
        },
        limit: {
          type: "number",
          description: "Max results to return (default 20)",
        },
      },
      required: ["profile_id"],
    },
  },
  {
    name: "filterTenders",
    description:
      "Filter tenders by category, date range, contracting entity, or status.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description: "Procurement category filter",
        },
        contracting_entity: {
          type: "string",
          description: "Filter by contracting entity",
        },
        status: {
          type: "string",
          description: "Filter by tender status (e.g., Open)",
        },
        closing_after: {
          type: "string",
          description: "ISO date — only tenders closing after this date",
        },
        closing_before: {
          type: "string",
          description: "ISO date — only tenders closing before this date",
        },
        limit: {
          type: "number",
          description: "Max results to return (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "getMatchContext",
    description:
      "Get the Scout's match context (score, keywords, reasoning) for a profile+tender pair.",
    input_schema: {
      type: "object" as const,
      properties: {
        profile_id: { type: "number" },
        tender_id: { type: "number" },
      },
      required: ["profile_id", "tender_id"],
    },
  },
  {
    name: "summarizeTender",
    description:
      "Generate a plain-language summary of a tender. Returns: what they want, deadlines, forms, evaluation criteria, risks.",
    input_schema: {
      type: "object" as const,
      properties: {
        tender_id: { type: "number", description: "The tender ID to summarize" },
      },
      required: ["tender_id"],
    },
  },
  {
    name: "getFormChecklist",
    description: "Get required forms for a tender",
    input_schema: {
      type: "object" as const,
      properties: {
        tender_id: { type: "number" },
      },
      required: ["tender_id"],
    },
  },
  {
    name: "explainForm",
    description: "Explain a specific form in plain language",
    input_schema: {
      type: "object" as const,
      properties: {
        form_name: { type: "string" },
        tender_context: { type: "string" },
      },
      required: ["form_name"],
    },
  },
  {
    name: "checkBuyCanadian",
    description:
      "Hard gate: Check if company meets Buy Canadian policy. Returns pass/fail/pending. If fail, company is not eligible.",
    input_schema: {
      type: "object" as const,
      properties: {
        is_canadian: {
          type: ["boolean", "null"],
          description: "Whether the company is Canadian-owned",
        },
        trade_agreements: {
          type: "array",
          items: { type: "string" },
          description: "Trade agreements that apply to this tender",
        },
      },
      required: ["is_canadian"],
    },
  },
  {
    name: "runComplianceAssessment",
    description:
      "Run a full 6-section compliance assessment based on the interview conversation.",
    input_schema: {
      type: "object" as const,
      properties: {
        profile_id: { type: "number" },
        tender_id: { type: "number" },
        conversation: {
          type: "array",
          items: { type: "object" },
          description: "The compliance interview conversation messages",
        },
      },
      required: ["profile_id", "tender_id", "conversation"],
    },
  },
  {
    name: "calculatePricing",
    description: "Calculate pricing schedule with GST/HST for a province",
    input_schema: {
      type: "object" as const,
      properties: {
        line_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              amount: { type: "number" },
            },
          },
        },
        province: { type: "string" },
      },
      required: ["line_items", "province"],
    },
  },
  {
    name: "saveProgress",
    description: "Save progress for eligibility, drafts, or forms",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["profile", "eligibility", "draft", "forms"],
        },
        data: { type: "object" },
      },
      required: ["type", "data"],
    },
  },
  {
    name: "saveTenderSelection",
    description: "Save a tender selection (match) for a profile+tender pair.",
    input_schema: {
      type: "object" as const,
      properties: {
        profile_id: { type: "number" },
        tender_id: { type: "number" },
        match_score: { type: "number", description: "Match score 0-100" },
        matched_keywords: {
          type: "array",
          items: { type: "string" },
          description: "Keywords that matched",
        },
        match_reasoning: {
          type: "string",
          description: "Why this tender matches the profile",
        },
      },
      required: ["profile_id", "tender_id", "match_score", "matched_keywords", "match_reasoning"],
    },
  },
  {
    name: "saveAnalysis",
    description: "Save a structured tender analysis for a profile+tender pair.",
    input_schema: {
      type: "object" as const,
      properties: {
        profile_id: { type: "number" },
        tender_id: { type: "number" },
        analysis: {
          type: "object",
          description: "Structured analysis with whatTheyWant, deadlines, forms, evaluation, risks",
        },
      },
      required: ["profile_id", "tender_id", "analysis"],
    },
  },
  {
    name: "saveComplianceResult",
    description: "Save the compliance assessment result.",
    input_schema: {
      type: "object" as const,
      properties: {
        profile_id: { type: "number" },
        tender_id: { type: "number" },
        result: {
          type: "string",
          enum: ["pass", "fail", "conditional"],
          description: "The compliance result",
        },
        explanation: { type: "string" },
      },
      required: ["profile_id", "tender_id", "result", "explanation"],
    },
  },
  {
    name: "saveDraft",
    description: "Save a bid draft section for a profile+tender pair.",
    input_schema: {
      type: "object" as const,
      properties: {
        profile_id: { type: "number" },
        tender_id: { type: "number" },
        section_type: {
          type: "string",
          enum: ["exec_summary", "technical", "team", "project_mgmt", "safety", "pricing", "forms"],
          description: "Which section to save",
        },
        content: { type: "string", description: "The draft content" },
      },
      required: ["profile_id", "tender_id", "section_type", "content"],
    },
  },
  {
    name: "updateProfile",
    description: "Partially update a business profile with new fields discovered during conversation.",
    input_schema: {
      type: "object" as const,
      properties: {
        profile_id: { type: "number" },
        updates: {
          type: "object",
          description: "Fields to update (e.g., insurance_amount, bonding_limit, certifications)",
        },
      },
      required: ["profile_id", "updates"],
    },
  },
  {
    name: "draftBidSection",
    description: "Draft a section of the bid proposal using profile and tender context.",
    input_schema: {
      type: "object" as const,
      properties: {
        section_type: {
          type: "string",
          enum: ["exec_summary", "technical", "team", "project_mgmt", "safety", "pricing", "forms"],
        },
        tender_id: { type: "number" },
        profile_id: { type: "number" },
      },
      required: ["section_type", "tender_id", "profile_id"],
    },
  },
];
