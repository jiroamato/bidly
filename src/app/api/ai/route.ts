import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFINITIONS } from "@/lib/ai/tools";
import { getSystemPrompt, AGENT_TOOLS } from "@/lib/ai/prompts";
import { handleToolCall } from "@/lib/ai/tool-handlers";
import { AgentId, ChatMessage } from "@/lib/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { agentId, messages, profileContext } = (await request.json()) as {
      agentId: AgentId;
      messages: ChatMessage[];
      profileContext?: string;
    };

    // Filter tools to only those available for this agent
    const allowedTools = AGENT_TOOLS[agentId] || [];
    const tools = TOOL_DEFINITIONS.filter((t) =>
      allowedTools.includes(t.name)
    );

    const systemPrompt = getSystemPrompt(agentId, profileContext || "");

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

    // Handle tool-use loop — accumulate messages across iterations
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
