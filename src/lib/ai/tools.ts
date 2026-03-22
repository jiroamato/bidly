import Anthropic from "@anthropic-ai/sdk";

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "searchTenders",
    description:
      "Search for tenders matching a query. Uses vector similarity if query provided, otherwise filters by criteria.",
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
    name: "checkEligibility",
    description:
      "Check if a business profile is eligible for a specific tender. Returns pass/fail with explanation.",
    input_schema: {
      type: "object" as const,
      properties: {
        profile_id: { type: "number" },
        tender_id: { type: "number" },
        questionnaire_responses: {
          type: "object",
          description: "User responses to eligibility questions",
        },
      },
      required: ["profile_id", "tender_id"],
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
    name: "draftBidSection",
    description: "Draft a section of the bid proposal",
    input_schema: {
      type: "object" as const,
      properties: {
        section_type: {
          type: "string",
          enum: ["exec_summary", "technical", "team", "project_mgmt", "safety"],
        },
        tender_id: { type: "number" },
        profile_id: { type: "number" },
      },
      required: ["section_type", "tender_id", "profile_id"],
    },
  },
  {
    name: "calculatePricing",
    description: "Calculate pricing schedule with GST/HST",
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
    name: "getCompanyProfile",
    description: "Get the business profile",
    input_schema: {
      type: "object" as const,
      properties: {
        profile_id: { type: "number" },
      },
      required: ["profile_id"],
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
];
