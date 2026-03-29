import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Tender } from "@/lib/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { tender } = (await request.json()) as { tender: Tender };

    if (!tender) {
      return NextResponse.json({ error: "No tender provided" }, { status: 400 });
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
- For risks: identify real disqualification risks based on the tender requirements.
- Keep bullet points concise but specific to THIS tender.`,
      messages: [
        {
          role: "user",
          content: `Analyze this tender and return the structured JSON:\n\n${JSON.stringify(tender, null, 2)}`,
        },
      ],
    });

    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Parse the JSON response
    const analysis = JSON.parse(textContent);

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("Analyze tender error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
