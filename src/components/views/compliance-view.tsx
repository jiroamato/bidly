"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChatInput } from "@/components/chat-input";
import { ChatMessage } from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";
import { AgentState } from "@/hooks/use-agent";
import { MarkdownMessage } from "@/components/markdown-message";
import { consumeSSEStream } from "@/lib/sse";
import { useChatHistory } from "@/contexts/chat-history-context";

interface ComplianceViewProps {
  agent: AgentState;
  externalValue?: string;
}

type CheckStatus = "pass" | "fail" | "warn" | "pending";

interface CheckItem {
  name: string;
  description: string;
  status: CheckStatus;
  statusLabel: string;
  action?: string | null;
}

interface CheckSection {
  title: string;
  items: CheckItem[];
}

interface ComplianceAssessment {
  overallResult: "eligible" | "conditionally_eligible" | "not_eligible";
  overallLabel: string;
  summaryNote: string;
  sections: CheckSection[];
}

const STATUS_STYLES: Record<CheckStatus, { icon: string; bg: string; color: string }> = {
  pass: { icon: "\u2713", bg: "#ecfdf5", color: "var(--success)" },
  fail: { icon: "\u2717", bg: "#fef3f2", color: "var(--accent-red)" },
  warn: { icon: "!", bg: "#fffbeb", color: "var(--agent-profile)" },
  pending: { icon: "\u2014", bg: "var(--bg)", color: "var(--text-muted)" },
};

const RESULT_STYLES: Record<string, { border: string; color: string }> = {
  eligible: { border: "var(--success)", color: "var(--success)" },
  conditionally_eligible: { border: "var(--agent-profile)", color: "var(--agent-profile)" },
  not_eligible: { border: "var(--accent-red)", color: "var(--accent-red)" },
};

export function ComplianceView({ agent, externalValue }: ComplianceViewProps) {
  const tender = agent.selectedTender;
  const profile = agent.profile;

  const initialMessage = tender
    ? `I'll check your eligibility for "${tender.title}". I need to verify a few things about your company. Let's start — can you confirm that your company is 100% Canadian-owned and operated?`
    : "I'll help check your eligibility. First, go back and select a tender to assess.";

  const [messages, setMessages] = useChatHistory("compliance");
  const [isTyping, setIsTyping] = useState(false);
  const [assessment, setAssessment] = useState<ComplianceAssessment | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Seed initial welcome message on first visit (context starts empty)
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: "assistant", content: initialMessage, timestamp: Date.now() }]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, assessment, isGenerating]);

  // Step progress based on topics covered in user messages
  const completedSteps = useMemo(() => {
    const userText = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content.toLowerCase())
      .join(" ");
    if (!messages.some((m) => m.role === "user")) return 0;

    let steps = 0;

    // Insurance: Canadian ownership, PBN, insurance, bonding mentioned
    if (/\b(canadian|insur|liabil|pbn|procurement business|bonding|bond)\b/.test(userText))
      steps = 1;

    // Certifications: security clearance, ISO, WSIB, certs mentioned
    if (steps >= 1 && /\b(clearance|secret|iso|wsib|certif|designated)\b/.test(userText))
      steps = 2;

    // Requirements: subcontracting, SA holder, supply arrangement
    if (steps >= 2 && /\b(subcontract|sa holder|supply arrangement|proservices?|standing offer)\b/.test(userText))
      steps = 3;

    // Review: user confirmed for assessment
    if (steps >= 3 && /\b(yes.*accurate|run.*assessment|looks?\s*good|that'?s?\s*correct|please\s*run)\b/.test(userText))
      steps = 4;

    return steps;
  }, [messages]);

  const runComplianceAssessment = useCallback(
    async (conversation: ChatMessage[]) => {
      if (!tender || !profile) return;
      setIsGenerating(true);

      try {
        const res = await apiFetch("/api/check-compliance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tender,
            profile,
            conversation,
          }),
        });

        if (!res.ok) throw new Error("Compliance check failed");
        const data = await res.json();
        setAssessment(data.assessment);
        agent.completeAgent("compliance");
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I had trouble generating the assessment. Could you try confirming your details again?",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsGenerating(false);
      }
    },
    [tender, profile, agent]
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (assessment) return;

      const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
      const updated = [...messagesRef.current, userMsg];
      setMessages(updated);
      setIsTyping(true);

      try {
        const res = await apiFetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: "compliance",
            messages: updated,
            profileId: profile?.id,
            tenderId: tender?.id,
          }),
        });

        if (!res.ok) throw new Error("AI request failed");

        const reader = res.body!.getReader();

        // Add placeholder assistant message for streaming — keep isTyping true so cursor shows
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "", timestamp: Date.now() },
        ]);

        const fullText = await consumeSSEStream(reader, (accumulated) => {
          setMessages((prev) => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = {
              ...msgs[msgs.length - 1],
              content: accumulated,
            };
            return msgs;
          });
        });
        setIsTyping(false);
        window.dispatchEvent(new CustomEvent("bidly:response-complete"));

        // Check if the agent's response signals the interview is complete
        // by including the COMPLIANCE_READY marker
        if (fullText.includes("COMPLIANCE_READY")) {
          // Remove marker from displayed message
          setMessages((prev) => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = {
              ...msgs[msgs.length - 1],
              content: msgs[msgs.length - 1].content.replace("COMPLIANCE_READY", "").trim(),
            };
            return msgs;
          });
          await runComplianceAssessment(updated);
        }
      } catch {
        setIsTyping(false);
        window.dispatchEvent(new CustomEvent("bidly:response-complete"));
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I had trouble processing that. Could you try again?",
            timestamp: Date.now(),
          },
        ]);
      }
    },
    [assessment, profile, tender, runComplianceAssessment]
  );

  const handleBeginDraft = () => {
    agent.completeAgent("compliance");
    agent.setActiveAgent("writer");
  };

  return (
    <div className="flex flex-col flex-1 h-full" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="flex-shrink-0 border-b"
        style={{ background: "var(--white)", borderColor: "var(--border-light)" }}
      >
        <div className="max-w-[860px] mx-auto px-10 py-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2
                className="mb-1"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 28,
                  fontWeight: 400,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                Eligibility Check
              </h2>
              {tender && (
                <p
                  className="text-[11px] tracking-[0.5px]"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                >
                  {tender.title} &mdash;{" "}
                  <span style={{ color: "var(--agent-compliance)" }}>{tender.reference_number}</span>
                </p>
              )}
            </div>
            {assessment && (
              <button
                onClick={handleBeginDraft}
                className="px-5 py-2.5 text-[11px] font-semibold tracking-[1.5px] uppercase cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "var(--agent-writer)",
                  color: "var(--white)",
                  border: "none",
                }}
              >
                Begin Bid Draft &rarr;
              </button>
            )}
          </div>

          {/* Progress dots */}
          {!assessment && (
            <div className="flex items-center gap-3">
              {["Insurance", "Certifications", "Requirements", "Review"].map((label, i) => {
                const isDone = i < completedSteps;
                const isCurrent = i === completedSteps;
                return (
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div
                      className="w-2 h-2 flex-shrink-0 transition-all duration-300"
                      style={{
                        borderRadius: "50%",
                        background: isDone
                          ? "var(--agent-compliance)"
                          : isCurrent
                            ? "var(--agent-compliance)"
                            : "var(--border-light)",
                        opacity: isCurrent ? 0.5 : 1,
                        boxShadow: isCurrent ? "0 0 0 3px rgba(16, 185, 129, 0.15)" : "none",
                      }}
                    />
                    <span
                      className="text-[9px] tracking-[1.5px] uppercase hidden sm:inline"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: isDone
                          ? "var(--agent-compliance)"
                          : isCurrent
                            ? "var(--text-secondary)"
                            : "var(--text-hint)",
                      }}
                    >
                      {label}
                    </span>
                    {i < 3 && (
                      <div
                        className="h-px flex-1 min-w-4 transition-all duration-500"
                        style={{
                          background: isDone ? "var(--agent-compliance)" : "var(--border-light)",
                          opacity: isDone ? 0.4 : 1,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[860px] mx-auto px-10 py-8 space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              style={{
                animation: i > 0 ? "profileReveal 0.35s ease-out forwards" : undefined,
              }}
            >
              {msg.role === "assistant" ? (
                <div className="max-w-[680px] flex gap-4">
                  <div
                    className="w-0.5 flex-shrink-0 mt-1"
                    style={{
                      background: "var(--agent-compliance)",
                      borderRadius: 1,
                      minHeight: 20,
                    }}
                  />
                  <div>
                    <div
                      className="text-[9px] tracking-[2px] uppercase mb-2"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--agent-compliance)",
                      }}
                    >
                      Compliance Agent
                    </div>
                    <div
                      className="text-[15px]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <MarkdownMessage
                        content={msg.content}
                        isStreaming={isTyping && i === messages.length - 1}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-[520px]">
                  <div
                    className="text-[9px] tracking-[2px] uppercase mb-2 text-right"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                  >
                    You
                  </div>
                  <div
                    className="text-[15px] leading-[1.7] px-5 py-3"
                    style={{
                      background: "var(--white)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--bidly-border)",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator — only show before first token arrives */}
          {isTyping && (!messages.length || messages[messages.length - 1].role !== "assistant" || !messages[messages.length - 1].content) && (
            <div className="flex justify-start">
              <div className="flex gap-4">
                <div
                  className="w-0.5 flex-shrink-0"
                  style={{
                    background: "var(--agent-compliance)",
                    borderRadius: 1,
                    minHeight: 20,
                  }}
                />
                <div className="flex items-center gap-1.5 py-3 px-1">
                  {[0, 0.2, 0.4].map((delay) => (
                    <div
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: "var(--agent-compliance)",
                        animation: `typingDot 1.4s infinite`,
                        animationDelay: `${delay}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Generating assessment indicator */}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="flex gap-4">
                <div
                  className="w-0.5 flex-shrink-0"
                  style={{
                    background: "var(--agent-compliance)",
                    borderRadius: 1,
                    minHeight: 20,
                  }}
                />
                <div>
                  <div
                    className="text-[9px] tracking-[2px] uppercase mb-2"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--agent-compliance)" }}
                  >
                    Compliance Agent
                  </div>
                  <div
                    className="text-[13px]"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                  >
                    Generating eligibility assessment...
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assessment Card */}
          {assessment && (
            <div
              className="pt-4"
              style={{ animation: "profileReveal 0.6s ease-out forwards" }}
            >
              <div
                className="overflow-hidden"
                style={{
                  background: "var(--white)",
                  border: "1px solid var(--bidly-border)",
                }}
              >
                <div className="h-1" style={{ background: "var(--agent-compliance)" }} />

                <div className="p-8">
                  {/* Result Banner */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div
                      className="border-l-4 p-5"
                      style={{
                        background: "var(--white)",
                        borderColor: (RESULT_STYLES[assessment.overallResult] || RESULT_STYLES.conditionally_eligible).border,
                        borderRight: "1px solid var(--bidly-border)",
                        borderTop: "1px solid var(--bidly-border)",
                        borderBottom: "1px solid var(--bidly-border)",
                      }}
                    >
                      <div
                        className="text-[10px] tracking-[2px] uppercase mb-1"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                      >
                        Overall Eligibility
                      </div>
                      <div
                        className="text-lg font-semibold"
                        style={{
                          color: (RESULT_STYLES[assessment.overallResult] || RESULT_STYLES.conditionally_eligible).color,
                        }}
                      >
                        {assessment.overallLabel}
                      </div>
                      <div className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
                        {assessment.summaryNote}
                      </div>
                    </div>
                    <div
                      className="border p-5"
                      style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
                    >
                      <div
                        className="text-[10px] tracking-[2px] uppercase mb-1"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                      >
                        Requirements Met
                      </div>
                      <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
                        {assessment.sections.reduce((a, s) => a + s.items.filter((i) => i.status === "pass").length, 0)} /{" "}
                        {assessment.sections.reduce((a, s) => a + s.items.length, 0)}
                      </div>
                    </div>
                    <div
                      className="border p-5"
                      style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
                    >
                      <div
                        className="text-[10px] tracking-[2px] uppercase mb-1"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                      >
                        Action Required
                      </div>
                      <div
                        className="text-2xl font-semibold"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--agent-profile)",
                        }}
                      >
                        {assessment.sections.reduce(
                          (a, s) => a + s.items.filter((i) => i.status === "warn" || i.status === "fail").length,
                          0
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Checklist Sections */}
                  {assessment.sections.map((section) => {
                    const sectionPassed = section.items.filter((i) => i.status === "pass").length;
                    return (
                      <div key={section.title} className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                          <div
                            className="text-[12px] font-semibold tracking-[0.5px]"
                            style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
                          >
                            {section.title}
                          </div>
                          <div
                            className="text-[11px]"
                            style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                          >
                            {sectionPassed} / {section.items.length} passed
                          </div>
                        </div>
                        <div className="space-y-2">
                          {section.items.map((item) => {
                            const style = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
                            return (
                              <div
                                key={item.name}
                                className="border flex items-start gap-4 p-4"
                                style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
                              >
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-semibold mt-0.5"
                                  style={{ background: style.bg, color: style.color }}
                                >
                                  {style.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div
                                    className="text-[14px] font-medium mb-0.5"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {item.name}
                                  </div>
                                  <div
                                    className="text-[13px] leading-relaxed"
                                    style={{ color: "var(--text-secondary)" }}
                                  >
                                    {item.description}
                                  </div>
                                  {item.action && (
                                    <div
                                      className="mt-1.5 text-[10px] tracking-[1px] uppercase"
                                      style={{ fontFamily: "var(--font-mono)", color: "var(--agent-compliance)" }}
                                    >
                                      {item.action}
                                    </div>
                                  )}
                                </div>
                                <span
                                  className="text-[9px] tracking-[1px] uppercase px-2.5 py-1 flex-shrink-0"
                                  style={{
                                    fontFamily: "var(--font-mono)",
                                    background: style.bg,
                                    color: style.color,
                                  }}
                                >
                                  {item.statusLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleBeginDraft}
                className="mt-5 w-full px-6 py-4 text-[11px] font-semibold tracking-[1.5px] uppercase cursor-pointer transition-all hover:opacity-90"
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "var(--agent-writer)",
                  color: "var(--white)",
                  border: "none",
                }}
              >
                Begin Bid Draft &rarr;
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom bar */}
      {!assessment && (
        <div
          className="flex-shrink-0 border-t"
          style={{ background: "var(--white)", borderColor: "var(--border-light)" }}
        >
          <div className="max-w-[860px] mx-auto px-10 py-5">
            <ChatInput
              agentId="compliance"
              onSend={handleSend}
              disabled={isTyping || isGenerating}
              externalValue={externalValue}
            />
          </div>
        </div>
      )}
    </div>
  );
}
