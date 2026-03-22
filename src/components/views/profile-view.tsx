"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatInput } from "@/components/chat-input";
import { ChatMessage, BusinessProfile } from "@/lib/types";
import { AgentState } from "@/hooks/use-agent";

interface ProfileViewProps {
  agent: AgentState;
}

const QUESTIONS = [
  "Welcome to Bidly! I'll help you find and bid on government contracts. First, what's your company name?",
  "Great! What province are you based in?",
  "What services does your company provide? (e.g., IT consulting, construction, environmental services)",
  "What's your typical project size range and do you have certifications like WSIB or bonding?",
  "Here's your profile — does everything look right? Type 'yes' to confirm or tell me what to change.",
];

const STEP_LABELS = ["Company", "Province", "Services", "Certifications", "Confirm"];

const PROVINCE_OPTIONS = [
  "Ontario", "British Columbia", "Alberta", "Quebec",
  "Manitoba", "Saskatchewan", "Nova Scotia", "New Brunswick",
  "Newfoundland", "PEI", "Yukon", "NWT", "Nunavut",
];

const DEMO_ANSWERS = [
  "Maple Facility Services Inc.",
  "Saskatchewan",
  "Commercial janitorial and facility cleaning services, HVAC cleaning, general office cleaning, floor care, window cleaning, post-construction cleanup",
  "Typical contracts $50K-$500K. Bonded, WSIB equivalent certified, $2M liability insurance. Government facility experience including RCMP detachments.",
  "Yes, looks great!",
];

const DEMO_PROFILE_PAYLOAD = {
  company_name: "Maple Facility Services Inc.",
  naics_codes: ["561720", "561210"],
  location: "Regina, Saskatchewan",
  province: "Saskatchewan",
  capabilities:
    "Commercial janitorial and facility cleaning services. HVAC system cleaning, general office cleaning, floor care, window cleaning, post-construction cleanup. Government facility experience including RCMP detachments. Typical contracts $50K-$500K. Bonded, WSIB equivalent certified, $2M liability insurance.",
  keywords: [
    "janitorial",
    "cleaning",
    "HVAC cleaning",
    "facility maintenance",
    "custodial",
    "commercial cleaning",
    "government facilities",
  ],
};

export function ProfileView({ agent }: ProfileViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: QUESTIONS[0], timestamp: Date.now() },
  ]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const demoModeRef = useRef(false);
  const lastDemoStep = useRef(-1);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showProfile]);

  const handleSend = useCallback(
    (text: string) => {
      if (isComplete) return;

      const newAnswers = [...answers, text];
      setAnswers(newAnswers);

      const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMsg]);

      const nextStep = step + 1;

      if (nextStep < QUESTIONS.length) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: QUESTIONS[nextStep], timestamp: Date.now() },
          ]);
          setStep(nextStep);
        }, 500);
      }

      if (nextStep === QUESTIONS.length) {
        setTimeout(async () => {
          const profileData = {
            company_name: newAnswers[0] || "My Company",
            naics_codes: [] as string[],
            location: newAnswers[1] || "Ontario",
            province: newAnswers[1] || "Ontario",
            capabilities: newAnswers[2] || "",
            keywords: (newAnswers[2] || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          };

          const payload = demoModeRef.current ? DEMO_PROFILE_PAYLOAD : profileData;

          try {
            const res = await fetch("/api/profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            const saved = await res.json();
            if (res.ok && saved.id) {
              agent.setProfile(saved);
            } else {
              agent.setProfile({
                ...payload,
                id: 0,
                created_at: new Date().toISOString(),
              } as BusinessProfile);
            }
          } catch {
            agent.setProfile({
              ...payload,
              id: 0,
              created_at: new Date().toISOString(),
            } as BusinessProfile);
          }

          setIsComplete(true);
          agent.completeAgent("profile");

          setTimeout(() => setShowProfile(true), 400);
        }, 600);
      }
    },
    [answers, step, isComplete, agent]
  );

  // Demo auto-fill: advance one answer each time step changes
  useEffect(() => {
    if (!demoMode || isComplete) return;
    if (lastDemoStep.current >= step) return;
    lastDemoStep.current = step;
    const timer = setTimeout(() => {
      handleSend(DEMO_ANSWERS[step]);
    }, 800);
    return () => clearTimeout(timer);
  }, [demoMode, step, isComplete, handleSend]);

  const handleDemoClick = () => {
    demoModeRef.current = true;
    setDemoMode(true);
  };

  const completedSteps = Math.min(answers.length, STEP_LABELS.length);

  return (
    <div className="flex flex-col flex-1 h-full" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="flex-shrink-0 border-b"
        style={{ background: "var(--white)", borderColor: "var(--border-light)" }}
      >
        <div className="max-w-[860px] mx-auto px-10 py-6">
          <div className="flex items-start justify-between mb-5">
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
                Profile Builder
              </h2>
              <p
                className="text-[11px] tracking-[0.5px]"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
              >
                Tell me about your business to get started
              </p>
            </div>
            {!demoMode && !isComplete && answers.length === 0 && (
              <button
                onClick={handleDemoClick}
                className="text-[10px] tracking-[1px] uppercase px-4 py-2 border transition-all hover:border-[var(--agent-profile)] hover:text-[var(--agent-profile)] hover:shadow-sm mt-1"
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
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {STEP_LABELS.map((label, i) => {
              const isDone = i < completedSteps;
              const isCurrent = i === completedSteps && !isComplete;
              return (
                <div key={label} className="flex items-center gap-1 flex-1">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-2 h-2 flex-shrink-0 transition-all duration-300"
                      style={{
                        borderRadius: "50%",
                        background: isDone
                          ? "var(--agent-profile)"
                          : isCurrent
                            ? "var(--agent-profile)"
                            : "var(--border-light)",
                        opacity: isCurrent ? 0.5 : 1,
                        boxShadow: isCurrent ? "0 0 0 3px rgba(230, 126, 34, 0.15)" : "none",
                      }}
                    />
                    <span
                      className="text-[9px] tracking-[1.5px] uppercase hidden sm:inline"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: isDone
                          ? "var(--agent-profile)"
                          : isCurrent
                            ? "var(--text-secondary)"
                            : "var(--text-hint)",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className="h-px flex-1 min-w-4 transition-all duration-500"
                      style={{
                        background: isDone ? "var(--agent-profile)" : "var(--border-light)",
                        opacity: isDone ? 0.4 : 1,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
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
                /* Assistant message */
                <div className="max-w-[680px] flex gap-4">
                  <div
                    className="w-0.5 flex-shrink-0 mt-1"
                    style={{
                      background: "var(--agent-profile)",
                      borderRadius: 1,
                      minHeight: 20,
                    }}
                  />
                  <div>
                    <div
                      className="text-[9px] tracking-[2px] uppercase mb-2"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--agent-profile)",
                      }}
                    >
                      Profile Agent
                    </div>
                    <div
                      className="text-[15px] leading-[1.7]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {msg.content}
                    </div>

                    {/* Province options */}
                    {step === 1 && i === messages.length - 1 && !demoMode && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {PROVINCE_OPTIONS.map((prov) => (
                          <button
                            key={prov}
                            onClick={() => handleSend(prov)}
                            className="text-[11px] tracking-[0.5px] px-4 py-2.5 border transition-all hover:border-[var(--agent-profile)] hover:text-[var(--agent-profile)] hover:shadow-sm"
                            style={{
                              fontFamily: "var(--font-mono)",
                              borderColor: "var(--bidly-border)",
                              background: "var(--white)",
                              color: "var(--text-secondary)",
                              cursor: "pointer",
                            }}
                          >
                            {prov}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* User message */
                <div className="max-w-[520px]">
                  <div
                    className="text-[9px] tracking-[2px] uppercase mb-2 text-right"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                    }}
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

          {/* Profile Card */}
          {showProfile && agent.profile && (
            <div
              className="pt-4"
              style={{ animation: "profileReveal 0.6s ease-out forwards" }}
            >
              {/* Card */}
              <div
                className="overflow-hidden"
                style={{
                  background: "var(--white)",
                  border: "1px solid var(--bidly-border)",
                }}
              >
                {/* Orange top accent */}
                <div className="h-1" style={{ background: "var(--agent-profile)" }} />

                <div className="p-8">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div
                        className="text-[9px] tracking-[2px] uppercase mb-2"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--agent-profile)",
                        }}
                      >
                        Business Profile
                      </div>
                      <div
                        className="text-2xl mb-1"
                        style={{
                          fontFamily: "var(--font-heading)",
                          color: "var(--text-primary)",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {agent.profile.company_name}
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {agent.profile.location || agent.profile.province}
                      </div>
                    </div>

                    {/* NAICS badges */}
                    {agent.profile.naics_codes.length > 0 && (
                      <div className="flex gap-2 mt-1">
                        {agent.profile.naics_codes.map((code) => (
                          <span
                            key={code}
                            className="text-[10px] tracking-[0.5px] px-3 py-1.5"
                            style={{
                              fontFamily: "var(--font-mono)",
                              background: "var(--bg)",
                              color: "var(--text-secondary)",
                              border: "1px solid var(--border-light)",
                            }}
                          >
                            NAICS {code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className="mb-6"
                    style={{ borderBottom: "1px solid var(--border-light)" }}
                  />

                  {/* Two column: Capabilities + Details */}
                  <div className="grid grid-cols-[1fr_200px] gap-8">
                    {/* Capabilities */}
                    <div>
                      <div
                        className="text-[9px] tracking-[2px] uppercase mb-3"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-muted)",
                        }}
                      >
                        Services & Capabilities
                      </div>
                      <div
                        className="text-[14px] leading-[1.8]"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {agent.profile.capabilities}
                      </div>
                    </div>

                    {/* Right column: Province + Keywords */}
                    <div
                      className="pl-8"
                      style={{ borderLeft: "1px solid var(--border-light)" }}
                    >
                      <div className="mb-5">
                        <div
                          className="text-[9px] tracking-[2px] uppercase mb-2"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: "var(--text-muted)",
                          }}
                        >
                          Province
                        </div>
                        <div
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {agent.profile.province}
                        </div>
                      </div>

                      {agent.profile.keywords.length > 0 && (
                        <div>
                          <div
                            className="text-[9px] tracking-[2px] uppercase mb-2"
                            style={{
                              fontFamily: "var(--font-mono)",
                              color: "var(--text-muted)",
                            }}
                          >
                            Keywords
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {agent.profile.keywords.map((kw) => (
                              <span
                                key={kw}
                                className="text-[10px] px-2 py-0.5"
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  background: "var(--bg)",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Continue button */}
              <button
                onClick={() => agent.setActiveAgent("scout")}
                className="mt-5 w-full px-6 py-4 text-[11px] font-semibold tracking-[1.5px] uppercase cursor-pointer transition-all hover:opacity-90"
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "var(--agent-scout)",
                  color: "var(--white)",
                  border: "none",
                }}
              >
                Continue to Scout &rarr;
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input — pinned to bottom */}
      {!isComplete && (
        <div
          className="flex-shrink-0 border-t"
          style={{ background: "var(--white)", borderColor: "var(--border-light)" }}
        >
          <div className="max-w-[860px] mx-auto px-10 py-5">
            <ChatInput
              agentId="profile"
              onSend={handleSend}
              disabled={isComplete || demoMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}
