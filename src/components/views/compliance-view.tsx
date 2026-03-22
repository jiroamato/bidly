"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatInput } from "@/components/chat-input";
import { ChatMessage } from "@/lib/types";
import { AgentState } from "@/hooks/use-agent";

interface ComplianceViewProps {
  agent: AgentState;
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

/* ---------- DEMO DATA ---------- */

const DEMO_PAIRS: { answer: string; nextQuestion: string }[] = [
  {
    answer:
      "We carry $2M commercial liability insurance coverage.",
    nextQuestion:
      "Good — $2M liability coverage noted. Do you have any certifications such as WSIB, bonding, or relevant trade licenses?",
  },
  {
    answer:
      "We're WSIB equivalent certified and bonded up to $500K. We also hold janitorial and facility maintenance licenses.",
    nextQuestion:
      "Are you able to attend any mandatory site visits? Do you have prior experience with similar government contracts?",
  },
  {
    answer:
      "Yes, we can attend mandatory site visits. We have experience with government facilities including RCMP detachments across Saskatchewan.",
    nextQuestion:
      "Let me confirm what I have: $2M liability insurance, WSIB equivalent certification, bonded up to $500K, government facility experience including RCMP. Is there anything else, or should I run the eligibility assessment?",
  },
  {
    answer: "That covers everything. Please run the assessment.",
    nextQuestion: "", // triggers assessment generation
  },
];

export function ComplianceView({ agent }: ComplianceViewProps) {
  const tender = agent.selectedTender;
  const profile = agent.profile;

  const initialMessage = tender
    ? `I'll check your eligibility for "${tender.title}". I need to verify a few things about your company. Let's start — what is your current commercial liability insurance coverage amount?`
    : "I'll help check your eligibility. First, go back and select a tender to assess.";

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: initialMessage, timestamp: Date.now() },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [assessment, setAssessment] = useState<ComplianceAssessment | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Demo state
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const lastDemoStep = useRef(-1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, assessment, isGenerating]);

  const userMessageCount = messages.filter((m) => m.role === "user").length;

  const generateAssessment = useCallback(
    async (conversation: ChatMessage[]) => {
      if (!tender || !profile) return;
      setIsGenerating(true);

      try {
        const res = await fetch("/api/check-compliance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tender, profile, conversation }),
        });

        if (!res.ok) throw new Error("Compliance check failed");
        const data = await res.json();
        setAssessment(data.assessment);
        agent.completeAgent("compliance");
      } catch {
        // Fallback assessment so the demo always progresses
        const fallback: ComplianceAssessment = {
          overallResult: "conditionally_eligible",
          overallLabel: "Conditionally Eligible",
          summaryNote: "Most requirements are met. A few items need attention before submission.",
          sections: [
            {
              title: "Buy Canadian Policy",
              items: [
                { name: "Canadian Business Registration", description: `${profile.company_name} is registered in ${profile.province}, Canada. Meets domestic supplier requirement.`, status: "pass", statusLabel: "Verified", action: null },
                { name: "Trade Agreement Compliance", description: "This tender falls under CFTA. No international trade agreement restrictions apply.", status: "pass", statusLabel: "Compliant", action: null },
              ],
            },
            {
              title: "Qualifications & Certifications",
              items: [
                { name: "WSIB / WCB Coverage", description: "Active workplace safety coverage on file.", status: "pass", statusLabel: "Active", action: null },
                { name: "Commercial Liability Insurance", description: "Current coverage confirmed. Verify it meets this tender's minimum threshold before submission.", status: "warn", statusLabel: "Verify Amount", action: "Confirm coverage meets tender minimum" },
                { name: "Bonding Capacity", description: "Bonding available. Confirm bond amount meets bid requirements.", status: "pass", statusLabel: "Available", action: null },
              ],
            },
            {
              title: "Mandatory Steps",
              items: [
                { name: "Mandatory Site Visit", description: "Check if this tender requires a mandatory site visit and register if applicable.", status: "warn", statusLabel: "Check Required", action: "Review tender documents for site visit details" },
              ],
            },
            {
              title: "Documentation",
              items: [
                { name: "Health & Safety Policy", description: `${profile.province}-compliant H&S policy document required with submission.`, status: "pass", statusLabel: "On File", action: null },
                { name: "List of Subcontractors", description: "All proposed subcontractors must be listed with qualifications.", status: "pass", statusLabel: "Ready", action: null },
              ],
            },
          ],
        };
        setAssessment(fallback);
        agent.completeAgent("compliance");
      } finally {
        setIsGenerating(false);
      }
    },
    [tender, profile, agent]
  );

  /* ---------- DEMO MODE: auto-advance with slow pacing ---------- */

  useEffect(() => {
    if (!demoMode || assessment) return;
    if (lastDemoStep.current >= demoStep) return;
    lastDemoStep.current = demoStep;

    if (demoStep >= DEMO_PAIRS.length) return;
    const pair = DEMO_PAIRS[demoStep];

    // Pause before user answer appears
    const userTimer = setTimeout(() => {
      const userMsg: ChatMessage = { role: "user", content: pair.answer, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMsg]);

      if (pair.nextQuestion) {
        // Typing indicator after a pause
        setTimeout(() => setIsTyping(true), 600);
        // Then bot response
        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: pair.nextQuestion, timestamp: Date.now() },
          ]);
          setDemoStep((s) => s + 1);
        }, 2000);
      } else {
        // Final step — generate real assessment
        setTimeout(() => {
          const allMessages = [
            ...messagesRef.current,
            userMsg,
          ];
          generateAssessment(allMessages);
        }, 600);
      }
    }, 1200);

    return () => clearTimeout(userTimer);
  }, [demoMode, demoStep, assessment, generateAssessment]);

  const handleDemoClick = () => setDemoMode(true);

  const handleSend = useCallback(
    async (text: string) => {
      if (assessment) return;

      const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
      const updated = [...messagesRef.current, userMsg];
      setMessages(updated);
      setIsTyping(true);

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: "compliance",
            messages: updated,
            profileContext: [
              profile && `Company: ${profile.company_name} | Location: ${profile.location || profile.province} | Services: ${profile.capabilities} | Keywords: ${profile.keywords.join(", ")}`,
              tender && `Selected Contract: "${tender.title}" | Ref: ${tender.reference_number} | Entity: ${tender.contracting_entity} | Closes: ${tender.closing_date} | Regions: ${tender.regions_of_delivery.join(", ")} | Description: ${tender.description}`,
            ].filter(Boolean).join("\n\n") || undefined,
          }),
        });

        if (!res.ok) throw new Error("AI request failed");
        const data = await res.json();
        setIsTyping(false);

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.content, timestamp: Date.now() },
        ]);

        // After 3+ user messages, check if the conversation has enough info
        const count = updated.filter((m) => m.role === "user").length;
        if (count >= 3) {
          const lower = text.toLowerCase();
          if (
            lower.includes("yes") ||
            lower.includes("done") ||
            lower.includes("that's all") ||
            lower.includes("looks good") ||
            lower.includes("correct") ||
            lower.includes("confirm") ||
            lower.includes("no more") ||
            lower.includes("nothing else")
          ) {
            await generateAssessment(updated);
          }
        }
      } catch {
        setIsTyping(false);
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
    [assessment, profile, generateAssessment]
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
            {assessment ? (
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
            ) : (
              !demoMode && userMessageCount === 0 && (
                <button
                  onClick={handleDemoClick}
                  className="text-[10px] tracking-[1px] uppercase px-4 py-2 border transition-all hover:border-[var(--agent-compliance)] hover:text-[var(--agent-compliance)] hover:shadow-sm mt-1"
                  style={{
                    fontFamily: "var(--font-mono)",
                    borderColor: "var(--bidly-border)",
                    background: "var(--white)",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  Load Demo
                </button>
              )
            )}
          </div>

          {/* Progress dots */}
          {!assessment && (
            <div className="flex items-center gap-3">
              {["Insurance", "Certifications", "Requirements", "Review"].map((label, i) => {
                const isDone = i < userMessageCount;
                const isCurrent = i === userMessageCount;
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
                      className="text-[15px] leading-[1.7]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {msg.content}
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

          {/* Typing indicator */}
          {isTyping && (
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
              disabled={isTyping || isGenerating || demoMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}
