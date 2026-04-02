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
          let calledSaveDraft = false;

          // First call: use .stream() so we can pipe text tokens immediately
          // if no tool use is needed
          const initialStream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
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

          console.log(`[AI] agent=${agentId} stop_reason=${finalMessage.stop_reason} content_types=${finalMessage.content.map(b => b.type).join(",")}`);

          if (finalMessage.stop_reason !== "tool_use") {
            // No tool use — we already streamed all tokens. Close stream first.
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            // Writer agent: force saveDraft in background (don't block the client)
            if (agentId === "writer" && profileId && tenderId) {
              const streamedText = bufferedTokens.join("");
              const messagesWithResponse = [
                ...loopMessages,
                { role: "assistant" as const, content: finalMessage.content },
              ];
              forceSaveDraftIfNeeded(streamedText, messagesWithResponse, systemPrompt, tools, profileId, tenderId);
            }
            return;
          }

          // Tool use detected — the text tokens we already sent were
          // Claude's "thinking out loud" before tool calls (e.g., "Let me
          // look that up for you"). That's fine to show.
          hasToolUse = true;

          const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

            if (toolUseBlocks.some(b => b.name === "saveDraft")) {
              calledSaveDraft = true;
            }

            console.log(`[AI] agent=${agentId} iteration=${iterations} tools=[${toolUseBlocks.map(b => b.name).join(", ")}]`);

            // Tools that can run in the background (fire-and-forget)
            const BACKGROUND_TOOLS = new Set(["saveProgress", "updateProfile", "saveDraft"]);

            const toolResults = await Promise.all(
              toolUseBlocks.map(async (block) => {
                // Override IDs so the AI can't send wrong values
                const input = { ...(block.input as Record<string, any>) };
                if (profileId && "profile_id" in input) input.profile_id = profileId;
                if (tenderId && "tender_id" in input) input.tender_id = tenderId;
                console.log(`[AI] calling tool=${block.name} input=${JSON.stringify(input).slice(0, 200)}`);

                // Fire-and-forget for save/update tools — return instant success
                if (BACKGROUND_TOOLS.has(block.name)) {
                  handleToolCall(block.name, input).then(
                    (r) => console.log(`[AI] bg tool=${block.name} result=${r.slice(0, 200)}`),
                    (e) => console.error(`[AI] bg tool=${block.name} error:`, e)
                  );
                  return {
                    type: "tool_result" as const,
                    tool_use_id: block.id,
                    content: JSON.stringify({ status: "saved" }),
                  };
                }

                const result = await handleToolCall(block.name, input);
                console.log(`[AI] tool=${block.name} result=${result.slice(0, 200)}`);
                return {
                  type: "tool_result" as const,
                  tool_use_id: block.id,
                  content: result,
                };
              })
            );

            loopMessages = [
              ...loopMessages,
              { role: "user" as const, content: toolResults },
            ];

            // Separate text from previous iteration with a newline
            if (bufferedTokens.length > 0) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: "\n\n" })}\n\n`)
              );
              bufferedTokens.push("\n\n");
            }

            // Stream the next response token-by-token
            const iterStream = anthropic.messages.stream({
              model: "claude-sonnet-4-6",
              max_tokens: 4096,
              system: systemPrompt,
              tools,
              messages: loopMessages,
            });

            // Pipe text tokens to client as they arrive
            for await (const event of iterStream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                bufferedTokens.push(event.delta.text);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
                );
              }
            }

            response = await iterStream.finalMessage();

            if (response.stop_reason === "tool_use") {
              // More tools — add to loop messages and continue
              loopMessages = [
                ...loopMessages,
                { role: "assistant" as const, content: response.content },
              ];
            }
          }

          // Close stream first so client gets input back immediately
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          // Writer agent: force saveDraft in background if it wasn't called
          if (agentId === "writer" && !calledSaveDraft && profileId && tenderId) {
            const allText = bufferedTokens.join("");
            const finalMessages = [
              ...loopMessages,
              { role: "assistant" as const, content: response.content },
            ];
            forceSaveDraftIfNeeded(allText, finalMessages, systemPrompt, tools, profileId, tenderId);
          }
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

/**
 * Writer agent safety net: if the AI drafted content but didn't call saveDraft,
 * send a silent follow-up turn forcing it to save.
 */
async function forceSaveDraftIfNeeded(
  draftedText: string,
  conversationMessages: any[],
  systemPrompt: string,
  tools: Anthropic.Tool[],
  profileId: number,
  tenderId: number
) {
  // Skip if the response is too short to be a real draft
  if (draftedText.trim().length < 100) {
    console.log("[AI] writer: skipping force-save — response too short");
    return;
  }

  console.log("[AI] writer: saveDraft not called — forcing follow-up");

  // Sanitize: strip orphaned tool_use blocks from any assistant message
  // that isn't immediately followed by a user message containing matching tool_results.
  const sanitized = conversationMessages.map((msg: any, i: number) => {
    if (msg.role !== "assistant" || !Array.isArray(msg.content)) return msg;
    const hasToolUse = msg.content.some((b: any) => b.type === "tool_use");
    if (!hasToolUse) return msg;

    const next = conversationMessages[i + 1];
    const hasMatchingResults =
      next?.role === "user" &&
      Array.isArray(next.content) &&
      next.content.some((b: any) => b.type === "tool_result");

    if (hasMatchingResults) return msg;

    // No matching tool_results — strip tool_use blocks, keep text
    const textOnly = msg.content.filter((b: any) => b.type !== "tool_use");
    return { ...msg, content: textOnly.length > 0 ? textOnly : "..." };
  });

  try {
    const followUp = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: [
        ...sanitized,
        {
          role: "user" as const,
          content: `You just drafted content but did not call saveDraft. Call saveDraft now for each section you drafted above. Use profile_id=${profileId} and tender_id=${tenderId}. Do not output any text — just call the tool(s).`,
        },
      ],
    });

    // Process any tool calls from the follow-up
    let response = followUp;
    let followUpIterations = 0;
    while (response.stop_reason === "tool_use" && followUpIterations < 5) {
      followUpIterations++;
      const toolBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      console.log(`[AI] writer force-save: tools=[${toolBlocks.map(b => b.name).join(", ")}]`);

      const results = await Promise.all(
        toolBlocks.map(async (block) => {
          const input = { ...(block.input as Record<string, any>) };
          if ("profile_id" in input) input.profile_id = profileId;
          if ("tender_id" in input) input.tender_id = tenderId;
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: await handleToolCall(block.name, input),
          };
        })
      );

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages: [
          ...conversationMessages,
          {
            role: "user" as const,
            content: `You just drafted content but did not call saveDraft. Call saveDraft now for each section you drafted above. Use profile_id=${profileId} and tender_id=${tenderId}. Do not output any text — just call the tool(s).`,
          },
          { role: "assistant" as const, content: response.content },
          { role: "user" as const, content: results },
        ],
      });
    }

    console.log("[AI] writer force-save: complete");
  } catch (err) {
    console.error("[AI] writer force-save failed:", err);
  }
}
