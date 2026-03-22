"use client";

import { useState, useRef, useEffect } from "react";
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

const CARD_LABELS = [
  "Company Name",
  "Location",
  "Services & Capabilities",
  "Certifications & Scale",
];

export function ProfileView({ agent }: ProfileViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: QUESTIONS[0], timestamp: Date.now() },
  ]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const progressPct = Math.min((answers.length / 4) * 100, 100);

  const handleSend = (text: string) => {
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
      // Profile confirmed
      setTimeout(() => {
        setIsComplete(true);
        const profile: BusinessProfile = {
          id: 1,
          company_name: newAnswers[0] || "My Company",
          naics_codes: [],
          location: newAnswers[1] || "Ontario",
          province: newAnswers[1] || "Ontario",
          capabilities: newAnswers[2] || "",
          keywords: (newAnswers[2] || "").split(",").map((s) => s.trim()).filter(Boolean),
          created_at: new Date().toISOString(),
        };
        agent.setProfile(profile);
        agent.completeAgent("profile");

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Profile saved! Scout is now unlocked — let's find tenders that match your business.",
            timestamp: Date.now(),
          },
        ]);
      }, 600);
    }
  };

  const handleOptionClick = (option: string) => {
    handleSend(option);
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Chat Column */}
      <div
        className="w-[420px] border-r flex flex-col flex-shrink-0"
        style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
      >
        {/* Chat Header */}
        <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border-light)" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400 }}>
            Profile Builder
          </h2>
          <p
            className="mt-1 text-[11px] tracking-[0.5px]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
          >
            Tell me about your business to get started
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "text-right" : ""}>
              <div
                className="text-[10px] tracking-[1.5px] uppercase mb-1.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: msg.role === "assistant" ? "var(--agent-profile)" : "var(--text-muted)",
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
              {msg.role === "assistant" && step === 1 && i === messages.length - 1 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {PROVINCE_OPTIONS.map((prov) => (
                    <button
                      key={prov}
                      onClick={() => handleOptionClick(prov)}
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
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="px-6 py-4 border-t" style={{ borderColor: "var(--border-light)" }}>
          <ChatInput agentId="profile" onSend={handleSend} disabled={isComplete} />
        </div>
      </div>

      {/* Profile Cards Panel */}
      <div className="flex-1 overflow-y-auto p-8">
        <div
          className="text-[10px] font-medium tracking-[2px] uppercase mb-5"
          style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
        >
          Business Profile
        </div>

        {/* Progress */}
        <div
          className="border p-5 mb-6"
          style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
        >
          <div
            className="text-[10px] tracking-[2px] uppercase mb-2.5"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
          >
            Profile Progress
          </div>
          <div
            className="h-1 mb-2"
            style={{ background: "var(--border-light)" }}
          >
            <div
              className="h-full transition-all duration-600"
              style={{ width: `${progressPct}%`, background: "var(--agent-profile)" }}
            />
          </div>
          <div
            className="text-[11px]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}
          >
            {answers.length} of 4 fields completed
          </div>
        </div>

        {/* Cards */}
        {CARD_LABELS.map((label, i) => {
          const hasAnswer = i < answers.length;
          const isBuilding = i === answers.length && !isComplete;

          if (isBuilding) {
            return (
              <div
                key={label}
                className="border border-dashed p-5 mb-3"
                style={{
                  background: "var(--white)",
                  borderColor: "var(--agent-profile)",
                  opacity: 0.7,
                }}
              >
                <div
                  className="text-[10px] font-medium tracking-[2px] uppercase mb-2"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--agent-profile)" }}
                >
                  {label}
                </div>
                <div className="text-sm" style={{ color: "var(--text-hint)" }}>
                  Waiting for your answer...
                </div>
              </div>
            );
          }

          if (hasAnswer) {
            return (
              <div
                key={label}
                className="border p-5 mb-3"
                style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
              >
                <div
                  className="text-[10px] font-medium tracking-[2px] uppercase mb-2"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                >
                  {label}
                </div>
                <div className="text-[15px] font-medium" style={{ color: "var(--text-primary)" }}>
                  {answers[i]}
                </div>
              </div>
            );
          }

          return (
            <div
              key={label}
              className="border border-dashed p-5 mb-3 text-center"
              style={{ borderColor: "var(--bidly-border)" }}
            >
              <div
                className="text-[10px] tracking-[2px] uppercase"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-hint)" }}
              >
                {label}
              </div>
            </div>
          );
        })}

        {/* Continue button after completion */}
        {isComplete && (
          <button
            onClick={() => agent.setActiveAgent("scout")}
            className="mt-6 px-6 py-3 text-[11px] font-semibold tracking-[1.5px] uppercase cursor-pointer transition-opacity hover:opacity-80"
            style={{
              fontFamily: "var(--font-mono)",
              background: "var(--agent-scout)",
              color: "var(--white)",
              border: "none",
            }}
          >
            Continue to Scout &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
