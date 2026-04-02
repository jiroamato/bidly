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
      keyword_synonyms: { janitorial: ["custodial", "cleaning"] },
      embedding: null,
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
      keyword_synonyms: {},
      embedding: null,
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
