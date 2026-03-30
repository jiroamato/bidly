import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { BusinessProfile, Tender, ChatMessage } from "@/lib/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { tender, profile, conversation } = (await request.json()) as {
      tender: Tender;
      profile: BusinessProfile;
      conversation: ChatMessage[];
    };

    if (!tender || !profile) {
      return NextResponse.json({ error: "Tender and profile required" }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `You are Bidly's Compliance Agent. You assess whether a Canadian business is eligible for a government tender based on their profile and the answers they gave during a compliance interview.

You MUST respond with valid JSON only — no markdown, no explanation, no wrapping. The JSON must match this exact schema:

{
  "overallResult": "eligible" | "conditionally_eligible" | "not_eligible",
  "overallLabel": "string (e.g. 'Eligible', 'Conditionally Eligible', 'Not Eligible')",
  "summaryNote": "string (1-2 sentence summary of overall eligibility)",
  "sections": [
    {
      "title": "string (section name)",
      "items": [
        {
          "name": "string (requirement name)",
          "description": "string (explanation of status)",
          "status": "pass" | "fail" | "warn" | "pending",
          "statusLabel": "string (e.g. 'Verified', 'Action Needed', 'Pending')",
          "action": "string | null (action required if warn/fail, null if pass)"
        }
      ]
    }
  ]
}

IMPORTANT — Buy Canadian Policy is a HARD GATE:
If the company is not Canadian-owned or does not have Canadian presence, set overallResult to "not_eligible" immediately. Do not evaluate remaining sections. This is a mandatory disqualifier for Canadian government procurement.

Rules:
- Assess REGULATORY and DOCUMENTATION compliance only — whether the company meets the administrative, legal, and certification requirements to submit a valid bid.
- Do NOT assess whether the company's industry, capabilities, or services match the tender's scope. Business fit is handled by the Scout agent. Your job is strictly regulatory, legal, and documentation compliance.
- You MUST include exactly these 6 sections in order:
  1. Buy Canadian Policy (HARD GATE) — Canadian ownership, domestic supplier requirements, trade agreement compliance (CFTA, CPTPP, etc.)
  2. Legal & Corporate Standing — business registration, good standing, legal capacity to contract with the federal/provincial government
  3. Insurance & Bonding — commercial liability insurance meets tender threshold, bonding capacity, workers compensation (WSIB/WCB)
  4. Security & Clearances — personnel security clearances, facility security, Controlled Goods Program registration if applicable
  5. Certifications & Standards — ISO certifications, industry-specific licenses, professional designations, quality management systems
  6. Administrative Requirements — mandatory site visits, submission format compliance, required forms, Procurement Business Number (PBN)
- Mark items as "pass" when clearly met, "warn" when action is needed but can be resolved before submission, "fail" only for hard regulatory disqualifiers (e.g. not a Canadian business, missing a mandatory legal requirement), "pending" when unknown.
- Be specific to THIS tender and THIS company — reference actual details from the data.
- If the conversation reveals specific details (insurance amounts, certifications held, etc.), use those in your assessment.
- When the company has relevant certifications, insurance, bonding, and government experience, lean toward "pass" or "conditionally_eligible" for the overall result.`,
      messages: [
        {
          role: "user",
          content: `Assess compliance for this company and tender based on their interview answers.

COMPANY PROFILE:
${JSON.stringify(profile, null, 2)}

TENDER:
${JSON.stringify(tender, null, 2)}

COMPLIANCE INTERVIEW CONVERSATION:
${conversation.map((m) => `${m.role === "user" ? "Company" : "Compliance Agent"}: ${m.content}`).join("\n")}

Return the structured compliance JSON.`,
        },
      ],
    });

    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const assessment = JSON.parse(textContent);

    return NextResponse.json({ assessment });
  } catch (error: any) {
    console.error("Compliance check error:", error);
    return NextResponse.json(
      { error: error.message || "Compliance check failed" },
      { status: 500 }
    );
  }
}
