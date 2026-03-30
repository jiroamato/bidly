import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Tender } from "@/lib/types";
import { createServerClient } from "@/lib/supabase";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { tender, profileId } = (await request.json()) as {
      tender: Tender;
      profileId?: number;
    };

    if (!tender) {
      return NextResponse.json({ error: "No tender provided" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch profile context if profileId is provided
    let profileContext = "";
    if (profileId) {
      const { data: profile } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (profile) {
        profileContext = `\n\nCOMPANY PROFILE (analyze risks and requirements relative to this bidder):
Company: ${profile.company_name}
Location: ${profile.location || profile.province}
Capabilities: ${profile.capabilities}
Keywords: ${profile.keywords?.join(", ") || "N/A"}
Insurance: ${profile.insurance_amount || "Unknown"}
Certifications: ${profile.certifications?.join(", ") || "None listed"}
Years in Business: ${profile.years_in_business || "Unknown"}
Government Experience: ${profile.past_gov_experience || "None listed"}`;
      }

      // Fetch match context from tender_selections
      const { data: matchData } = await supabase
        .from("tender_selections")
        .select("*")
        .eq("profile_id", profileId)
        .eq("tender_id", tender.id)
        .single();

      if (matchData) {
        profileContext += `\n\nMATCH CONTEXT:
Match Score: ${matchData.match_score}%
Matched Keywords: ${matchData.matched_keywords?.join(", ") || "N/A"}
Match Reasoning: ${matchData.match_reasoning || "N/A"}`;
      }
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `You are Bidly's Analyst Agent. You analyze Canadian government tender/RFP documents and extract key information for bidders.

You MUST respond with valid JSON only — no markdown, no explanation, no wrapping. The JSON must match this exact schema:

{
  "whatTheyWant": ["string array of 3-5 bullet points describing the scope in plain language"],
  "deadlines": [{"label": "string", "value": "string date", "urgent": true/false}],
  "forms": ["string array of required forms/documents"],
  "evaluation": [{"criteria": "string", "weight": "string percentage"}],
  "risks": [{"level": "high"|"medium"|"low", "text": "string description"}]
}

Rules:
- Extract real information from the tender data provided. Do not invent details.
- For deadlines: mark anything within 14 days as urgent. Always include the closing date.
- For forms: infer standard Canadian procurement requirements based on the tender category and description.
- For evaluation: extract criteria if mentioned; otherwise infer reasonable weights based on procurement type.
- For risks: identify real disqualification risks based on the tender requirements. If a company profile is provided, tailor risks to that specific bidder's situation.
- Keep bullet points concise but specific to THIS tender.`,
      messages: [
        {
          role: "user",
          content: `Analyze this tender and return the structured JSON:\n\n${JSON.stringify(tender, null, 2)}${profileContext}`,
        },
      ],
    });

    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Parse the JSON response
    const analysis = JSON.parse(textContent);

    // Persist analysis to tender_analyses if we have a profileId
    if (profileId && tender.id) {
      const { error: upsertError } = await supabase
        .from("tender_analyses")
        .upsert(
          { profile_id: profileId, tender_id: tender.id, analysis },
          { onConflict: "profile_id,tender_id" }
        )
        .select()
        .single();

      if (upsertError) {
        console.error("Failed to persist analysis:", upsertError);
      }
    }

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("Analyze tender error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
