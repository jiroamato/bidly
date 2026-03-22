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

  return (
    <div className="flex flex-1 overflow-hidden h-full justify-center">
      <div
        className="w-full max-w-[620px] flex flex-col"
        style={{ background: "var(--white)" }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border-light)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 22,
                  fontWeight: 400,
                }}
              >
                Profile Builder
              </h2>
              <p
                className="mt-1 text-[11px] tracking-[0.5px]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                }}
              >
                Tell me about your business to get started
              </p>
            </div>
            {!demoMode && !isComplete && answers.length === 0 && (
              <button
                onClick={handleDemoClick}
                className="text-[10px] tracking-[1px] uppercase px-3 py-1.5 border transition-colors hover:border-[var(--agent-profile)] hover:text-[var(--agent-profile)]"
                style={{
                  fontFamily: "var(--font-mono)",
                  borderColor: "var(--bidly-border)",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                Load Demo
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "text-right" : ""}>
              <div
                className="text-[10px] tracking-[1.5px] uppercase mb-1.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  color:
                    msg.role === "assistant"
                      ? "var(--agent-profile)"
                      : "var(--text-muted)",
                }}
              >
                {msg.role === "assistant" ? "Profile" : "You"}
              </div>
              <div
                className={`text-sm leading-relaxed ${msg.role === "user" ? "inline-block text-left" : ""}`}
                style={{
                  color: "var(--text-primary)",
                  ...(msg.role === "user"
                    ? { background: "var(--bg)", padding: "10px 16px" }
                    : {}),
                }}
              >
                {msg.content}
              </div>

              {/* Province options on step 1 */}
              {msg.role === "assistant" &&
                step === 1 &&
                i === messages.length - 1 &&
                !demoMode && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {PROVINCE_OPTIONS.map((prov) => (
                      <button
                        key={prov}
                        onClick={() => handleSend(prov)}
                        className="text-[11px] tracking-[0.5px] px-4 py-2 border transition-colors hover:border-[var(--agent-profile)] hover:text-[var(--agent-profile)]"
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
          ))}

          {/* Profile Card — animated in after completion */}
          {showProfile && agent.profile && (
            <div style={{ animation: "profileReveal 0.6s ease-out forwards" }}>
              <div
                className="border p-6 mt-4"
                style={{
                  background: "var(--white)",
                  borderColor: "var(--agent-profile)",
                  borderWidth: 2,
                }}
              >
                <div
                  className="text-[10px] font-medium tracking-[2px] uppercase mb-5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--agent-profile)",
                  }}
                >
                  Business Profile
                </div>

                {/* Company name + location row */}
                <div className="mb-5">
                  <div
                    className="text-xl font-medium mb-1"
                    style={{ color: "var(--text-primary)" }}
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

                {/* Divider */}
                <div
                  className="mb-5"
                  style={{ borderBottom: "1px solid var(--border-light)" }}
                />

                {/* Capabilities */}
                <div className="mb-5">
                  <div
                    className="text-[10px] tracking-[1.5px] uppercase mb-2"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Services & Capabilities
                  </div>
                  <div
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {agent.profile.capabilities}
                  </div>
                </div>

                {/* NAICS + Province row */}
                <div className="flex gap-8 mb-5">
                  {agent.profile.naics_codes.length > 0 && (
                    <div>
                      <div
                        className="text-[10px] tracking-[1.5px] uppercase mb-2"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-muted)",
                        }}
                      >
                        NAICS Codes
                      </div>
                      <div className="flex gap-2">
                        {agent.profile.naics_codes.map((code) => (
                          <span
                            key={code}
                            className="text-xs px-2.5 py-1"
                            style={{
                              fontFamily: "var(--font-mono)",
                              background: "var(--bg)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div
                      className="text-[10px] tracking-[1.5px] uppercase mb-2"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-muted)",
                      }}
                    >
                      Province
                    </div>
                    <div
                      className="text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {agent.profile.province}
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                {agent.profile.keywords.length > 0 && (
                  <div>
                    <div
                      className="text-[10px] tracking-[1.5px] uppercase mb-2"
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
                          className="text-[11px] px-2.5 py-1 border"
                          style={{
                            fontFamily: "var(--font-mono)",
                            borderColor: "var(--bidly-border)",
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

              <button
                onClick={() => agent.setActiveAgent("scout")}
                className="mt-4 w-full px-6 py-3 text-[11px] font-semibold tracking-[1.5px] uppercase cursor-pointer transition-opacity hover:opacity-80"
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

        {/* Chat Input — hidden after completion */}
        {!isComplete && (
          <div
            className="px-6 py-4 border-t"
            style={{ borderColor: "var(--border-light)" }}
          >
            <ChatInput
              agentId="profile"
              onSend={handleSend}
              disabled={isComplete || demoMode}
            />
          </div>
        )}
      </div>
    </div>
  );
}
