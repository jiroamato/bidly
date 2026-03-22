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

Rules:
- Assess compliance based on the tender requirements, company profile, AND the conversation answers.
- Include sections for: Buy Canadian Policy, Qualifications & Certifications, Mandatory Steps, Documentation.
- Mark items as "pass" when clearly met, "warn" when action is needed, "fail" when not met, "pending" when unknown.
- Be specific to THIS tender and THIS company — reference actual details from the data.
- If the conversation reveals specific details (insurance amounts, certifications held, etc.), use those in your assessment.`,
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
