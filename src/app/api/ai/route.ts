import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFINITIONS } from "@/lib/ai/tools";
import { getSystemPrompt, AGENT_TOOLS } from "@/lib/ai/prompts";
import { handleToolCall } from "@/lib/ai/tool-handlers";
import { buildAgentContext, formatContextForPrompt } from "@/lib/ai/context-builder";
import { AgentId, ChatMessage } from "@/lib/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { agentId, messages, profileId, tenderId, profileContext } = (await request.json()) as {
      agentId: AgentId;
      messages: ChatMessage[];
      profileId?: number;
      tenderId?: number;
      profileContext?: string;
    };

    // Build context server-side from Supabase when profileId is provided
    let contextString = "";
    if (profileId) {
      const context = await buildAgentContext(agentId, profileId, tenderId);
      contextString = formatContextForPrompt(context);
    } else if (profileContext) {
      contextString = profileContext;
    }

    // Filter tools to only those available for this agent
    const allowedTools = AGENT_TOOLS[agentId] || [];
    const tools = TOOL_DEFINITIONS.filter((t) =>
      allowedTools.includes(t.name)
    );

    const systemPrompt = getSystemPrompt(agentId, contextString);

    // Convert ChatMessages to Anthropic format
    const anthropicMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const encoder = new TextEncoder();
    const MAX_TOOL_ITERATIONS = 10;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let loopMessages = [...anthropicMessages];
          let iterations = 0;

          // First call: use .stream() so we can pipe text tokens immediately
          // if no tool use is needed
          const initialStream = anthropic.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            tools: tools.length > 0 ? tools : undefined,
            messages: loopMessages,
          });

          // Collect text tokens as they arrive — we'll emit them if no tool use
          const bufferedTokens: string[] = [];
          let hasToolUse = false;

          for await (const event of initialStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              bufferedTokens.push(event.delta.text);
              // Emit immediately — if tool_use follows, we won't reach the client
              // because we haven't returned the Response yet... actually we have,
              // since this runs inside ReadableStream.start(). So emit tokens now.
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
          }

          // Check the final message to see if tool use was requested
          const finalMessage = await initialStream.finalMessage();

          if (finalMessage.stop_reason !== "tool_use") {
            // No tool use — we already streamed all tokens. Done!
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          // Tool use detected — the text tokens we already sent were
          // Claude's "thinking out loud" before tool calls (e.g., "Let me
          // look that up for you"). That's fine to show.
          hasToolUse = true;

          // Enter tool-use loop with .create() for remaining iterations
          let response = finalMessage;
          loopMessages = [
            ...loopMessages,
            { role: "assistant" as const, content: response.content },
          ];

          while (response.stop_reason === "tool_use") {
            if (++iterations > MAX_TOOL_ITERATIONS) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: "Too many tool iterations" })}\n\n`)
              );
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
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
              { role: "user" as const, content: toolResults },
            ];

            // For subsequent iterations, use .stream() on the last one
            // if we can detect it's the final iteration. Since we can't
            // predict that, use .create() for tool iterations.
            response = await anthropic.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 4096,
              system: systemPrompt,
              tools,
              messages: loopMessages,
            });

            if (response.stop_reason === "tool_use") {
              // More tools — add to loop messages and continue
              loopMessages = [
                ...loopMessages,
                { role: "assistant" as const, content: response.content },
              ];
            }
          }

          // Tool loop done — stream the final text response
          // We already have the response from .create(), but we need to
          // stream it. Extract text and send as SSE chunks.
          const textBlocks = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map((b) => b.text);

          for (const text of textBlocks) {
            // Send in small chunks for smooth streaming feel
            const chunkSize = 8;
            for (let i = 0; i < text.length; i += chunkSize) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: text.slice(i, i + chunkSize) })}\n\n`)
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("AI route error:", error);
    return NextResponse.json(
      { error: error.message || "AI request failed" },
      { status: 500 }
    );
  }
}
