import { describe, it, expect } from "vitest";
import { combineTenderScores } from "@/lib/matching/score-tenders";
import type { Tender, BusinessProfile } from "@/lib/types";

function makeTender(overrides: Partial<Tender> = {}): Tender {
  return {
    id: 1,
    reference_number: "REF-001",
    solicitation_number: "SOL-001",
    title: "Cybersecurity assessment for cloud infrastructure",
    description: "Looking for IT security and cloud migration expertise",
    publication_date: "2026-03-01",
    closing_date: "2026-04-15",
    status: "Open",
    procurement_category: "SRV",
    notice_type: "RFP",
    procurement_method: "Competitive",
    selection_criteria: "",
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
    keywords: ["cybersecurity", "cloud migration", "python"],
    keyword_synonyms: {
      cybersecurity: ["cyber security", "IT security"],
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
  it("combines keyword and embedding scores with correct weights", () => {
    const profile = makeProfile();
    const tenders = [
      makeTender(),
      makeTender({ id: 2, title: "Furniture delivery", description: "office furniture" }),
      makeTender({ id: 3, title: "Plumbing services", description: "pipe repair and maintenance" }),
    ];
    const embeddingSimilarities = new Map([[1, 0.75], [2, 0.1], [3, 0.05]]);

    const result = combineTenderScores(profile, tenders, embeddingSimilarities);

    const cyber = result.find((r) => r.id === 1)!;
    expect(cyber.keyword_score).toBeGreaterThan(0);
    expect(cyber.embedding_score).toBe(75);
    expect(cyber.match_score).toBe(
      Math.round(cyber.keyword_score * 0.4 + 75 * 0.6)
    );
    expect(cyber.matched_keywords).toContain("cybersecurity");
  });

  it("falls back to keyword-only when no embedding similarities", () => {
    const profile = makeProfile();
    const tenders = [
      makeTender(),
      makeTender({ id: 2, title: "Furniture delivery", description: "office furniture" }),
      makeTender({ id: 3, title: "Plumbing services", description: "pipe repair and maintenance" }),
    ];
    const embeddingSimilarities = new Map<number, number>();

    const result = combineTenderScores(profile, tenders, embeddingSimilarities);

    const cyber = result.find((r) => r.id === 1)!;
    expect(cyber.embedding_score).toBe(0);
    expect(cyber.match_score).toBe(Math.round(cyber.keyword_score * 0.4));
  });

  it("sorts by match_score descending", () => {
    const profile = makeProfile();
    const tenders = [
      makeTender({ id: 1, title: "Furniture delivery", description: "office furniture" }),
      makeTender({ id: 2, title: "Cybersecurity audit", description: "IT security assessment" }),
    ];
    const embeddingSimilarities = new Map([[1, 0.1], [2, 0.9]]);

    const result = combineTenderScores(profile, tenders, embeddingSimilarities);

    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(1);
    expect(result[0].match_score).toBeGreaterThan(result[1].match_score);
  });

  it("returns 0 for everything when profile has no keywords and no embedding", () => {
    const profile = makeProfile({ keywords: [], keyword_synonyms: {}, embedding: null });
    const tenders = [makeTender()];

    const result = combineTenderScores(profile, tenders, new Map());

    expect(result[0].match_score).toBe(0);
    expect(result[0].keyword_score).toBe(0);
    expect(result[0].embedding_score).toBe(0);
  });
});
