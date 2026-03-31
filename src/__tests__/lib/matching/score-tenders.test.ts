import { describe, it, expect } from "vitest";
import { combineTenderScores } from "@/lib/matching/score-tenders";
import type { Tender, BusinessProfile } from "@/lib/types";

function makeTender(overrides: Partial<Tender> = {}): Tender {
  return {
    id: 1,
    reference_number: "REF-001",
    solicitation_number: "SOL-001",
    title: "Cybersecurity assessment for cloud infrastructure",
    description:
      "Looking for IT security and cloud migration expertise with software support",
    publication_date: "2026-03-01",
    closing_date: "2026-04-15",
    status: "Open",
    procurement_category: "SRV",
    notice_type: "RFP",
    procurement_method: "Competitive",
    selection_criteria: "cybersecurity experience required",
    gsin_codes: [],
    unspsc_codes: [],
    regions_of_opportunity: ["Ontario"],
    regions_of_delivery: ["Ontario (except NCR)"],
    trade_agreements: [],
    contracting_entity: "DND",
    notice_url: "",
    attachment_urls: [],
    ...overrides,
  };
}

function makeProfile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    id: 1,
    company_name: "Northpoint Digital Solutions",
    naics_codes: ["541510"],
    location: "Ottawa",
    province: "Ontario",
    capabilities: "IT consulting and cybersecurity",
    keywords: ["cybersecurity", "cloud", "migration", "IT", "security", "software", "support"],
    keyword_synonyms: {
      cybersecurity: ["cyber security", "IT security", "infosec"],
    },
    embedding: null,
    insurance_amount: "",
    bonding_limit: null,
    certifications: [],
    years_in_business: null,
    past_gov_experience: "",
    pbn: "",
    is_canadian: true,
    security_clearance: "",
    project_size_min: null,
    project_size_max: null,
    created_at: "2026-03-30",
    ...overrides,
  };
}

describe("combineTenderScores", () => {
  it("scores a highly relevant tender above 80%", () => {
    const profile = makeProfile();
    const tenders = [
      makeTender(),
      makeTender({
        id: 2,
        title: "Furniture delivery",
        description: "office furniture supply",
        procurement_category: "GDS",
        regions_of_delivery: ["Alberta"],
        selection_criteria: "",
      }),
    ];

    const result = combineTenderScores(profile, tenders);

    const cyber = result.find((r) => r.id === 1)!;
    expect(cyber.match_score).toBeGreaterThanOrEqual(80);
    expect(cyber.matched_keywords.length).toBeGreaterThan(0);
  });

  it("scores an irrelevant tender below 25%", () => {
    const profile = makeProfile();
    const tenders = [
      makeTender({
        id: 1,
        title: "Agricultural equipment maintenance",
        description: "tractor repair and farm equipment servicing",
        procurement_category: "GDS",
        regions_of_delivery: ["Saskatchewan"],
        selection_criteria: "farming experience required",
      }),
    ];

    const result = combineTenderScores(profile, tenders);
    expect(result[0].match_score).toBeLessThan(25);
  });

  it("sorts by match_score descending", () => {
    const profile = makeProfile();
    const tenders = [
      makeTender({
        id: 1,
        title: "Furniture delivery",
        description: "office furniture supply",
        procurement_category: "GDS",
        regions_of_delivery: ["Alberta"],
        selection_criteria: "",
      }),
      makeTender({
        id: 2,
        title: "Cybersecurity audit and IT security assessment",
        description: "cloud security migration software support services",
        procurement_category: "SRV",
        regions_of_delivery: ["Ontario"],
        selection_criteria: "cybersecurity certification required",
      }),
    ];

    const result = combineTenderScores(profile, tenders);
    expect(result[0].id).toBe(2);
    expect(result[0].match_score).toBeGreaterThan(result[1].match_score);
  });

  it("gives location bonus to same-province tenders", () => {
    const profile = makeProfile();
    const ontarioTender = makeTender({
      id: 1,
      title: "IT consulting services",
      description: "software development",
      regions_of_delivery: ["Ontario"],
    });
    const albertaTender = makeTender({
      id: 2,
      title: "IT consulting services",
      description: "software development",
      regions_of_delivery: ["Alberta"],
    });

    const result = combineTenderScores(profile, [ontarioTender, albertaTender]);
    const ontario = result.find((r) => r.id === 1)!;
    const alberta = result.find((r) => r.id === 2)!;
    expect(ontario.match_score).toBeGreaterThan(alberta.match_score);
    expect(ontario.location_score).toBe(100);
    expect(alberta.location_score).toBe(0);
  });

  it("returns 0 for everything when profile has no keywords", () => {
    const profile = makeProfile({
      keywords: [],
      keyword_synonyms: {},
      naics_codes: [],
    });
    const tenders = [makeTender()];

    const result = combineTenderScores(profile, tenders);
    expect(result[0].match_score).toBe(0);
  });

  it("includes national (Canada) tenders in location scoring", () => {
    const profile = makeProfile();
    const tender = makeTender({
      regions_of_delivery: ["Canada"],
    });

    const result = combineTenderScores(profile, [tender]);
    expect(result[0].location_score).toBe(100);
  });

  it("redistributes weight when profile has no NAICS codes", () => {
    const profile = makeProfile({ naics_codes: [] });
    const tenders = [makeTender()];

    const result = combineTenderScores(profile, tenders);
    expect(result[0].match_score).toBeGreaterThan(0);
  });
});
