"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatInput } from "@/components/chat-input";
import { ChatMessage, BusinessProfile } from "@/lib/types";
import { AgentState } from "@/hooks/use-agent";
import { consumeSSEStream } from "@/lib/sse";

interface ProfileViewProps {
  agent: AgentState;
  externalValue?: string;
}

const INITIAL_MESSAGE =
  "Welcome to Bidly! I'll help you find and bid on government contracts. First, what's your company name?";

const STEP_LABELS = ["Company", "Province", "Services", "Certifications", "Confirm"];

const PROVINCE_OPTIONS = [
  "Ontario", "British Columbia", "Alberta", "Quebec",
  "Manitoba", "Saskatchewan", "Nova Scotia", "New Brunswick",
  "Newfoundland", "PEI", "Yukon", "NWT", "Nunavut",
];

/* ---------- PARSE CAPABILITIES INTO SECTIONS ---------- */

function parseCapabilities(text: string) {
  const sentences = text
    .split(/\.\s+/)
    .map((s) => s.replace(/\.$/, "").trim())
    .filter(Boolean);

  const services: string[] = [];
  const experience: string[] = [];
  const certifications: string[] = [];
  const contractRange: string[] = [];

  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (/\$[\d,]+k?|\bcontract|\bbudget|\bproject size/i.test(lower)) {
      contractRange.push(s);
    } else if (/certif|bonded|bonding|insur|wsib|liability|licensed/i.test(lower)) {
      certifications.push(s);
    } else if (/experience|government|federal|municipal|provincial|rcmp|client/i.test(lower)) {
      experience.push(s);
    } else {
      services.push(s);
    }
  }

  return { services, experience, certifications, contractRange };
}

/* ---------- PROFILE CARD (read-only summary) ---------- */

function ProfileCard({
  profile,
  onEdit,
  onContinue,
}: {
  profile: BusinessProfile;
  onEdit?: () => void;
  onContinue?: () => void;
}) {
  const parsed = parseCapabilities(profile.capabilities);
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div
      className="text-[9px] tracking-[2px] uppercase mb-2"
      style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
    >
      {children}
    </div>
  );

  return (
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
        <div className="h-1" style={{ background: "var(--agent-profile)" }} />

        <div className="p-8">
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
                {profile.company_name}
              </div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {profile.location || profile.province}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-1">
              {profile.naics_codes.length > 0 && (
                <div className="flex gap-2">
                  {profile.naics_codes.map((code) => (
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
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="text-[10px] tracking-[1px] uppercase px-4 py-2 border transition-all hover:border-[var(--agent-profile)] hover:text-[var(--agent-profile)] hover:shadow-sm"
                  style={{
                    fontFamily: "var(--font-mono)",
                    borderColor: "var(--bidly-border)",
                    background: "var(--white)",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          <div
            className="mb-6"
            style={{ borderBottom: "1px solid var(--border-light)" }}
          />

          <div className="grid grid-cols-[1fr_220px] gap-8">
            {/* Left column */}
            <div className="space-y-5">
              {parsed.services.length > 0 && (
                <div>
                  <SectionLabel>Core Services</SectionLabel>
                  <div
                    className="text-[14px] leading-[1.8]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {parsed.services.join(". ")}.
                  </div>
                </div>
              )}

              {parsed.experience.length > 0 && (
                <div>
                  <SectionLabel>Experience</SectionLabel>
                  <div
                    className="text-[14px] leading-[1.8]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {parsed.experience.join(". ")}.
                  </div>
                </div>
              )}
            </div>

            {/* Right column */}
            <div
              className="pl-8 space-y-5"
              style={{ borderLeft: "1px solid var(--border-light)" }}
            >
              <div>
                <SectionLabel>Province</SectionLabel>
                <div
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {profile.province}
                </div>
              </div>

              {parsed.contractRange.length > 0 && (
                <div>
                  <SectionLabel>Contract Range</SectionLabel>
                  <div
                    className="text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {parsed.contractRange.join(". ")}.
                  </div>
                </div>
              )}

              {parsed.certifications.length > 0 && (
                <div>
                  <SectionLabel>Certifications</SectionLabel>
                  <div
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {parsed.certifications.join(". ")}.
                  </div>
                </div>
              )}

              {profile.keywords.length > 0 && (
                <div>
                  <SectionLabel>Keywords</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.keywords.map((kw) => (
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

      {onContinue && (
        <button
          onClick={onContinue}
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
      )}
    </div>
  );
}

/* ---------- COMPONENT ---------- */

export function ProfileView({ agent, externalValue }: ProfileViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: INITIAL_MESSAGE, timestamp: Date.now() },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // If agent already has a profile (returning user), show summary immediately
  const hasExistingProfile = agent.profile !== null && !editMode;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showProfile, isTyping]);

  // Step progress based on user message count
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const completedSteps = Math.min(userMessageCount, STEP_LABELS.length);

  /* ---------- SAVE PROFILE ---------- */

  const saveProfile = useCallback(
    async (payload: Record<string, unknown>) => {
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
          } as unknown as BusinessProfile);
        }
      } catch {
        agent.setProfile({
          ...payload,
          id: 0,
          created_at: new Date().toISOString(),
        } as unknown as BusinessProfile);
      }

      setIsComplete(true);
      setEditMode(false);
      agent.completeAgent("profile");
      setTimeout(() => setShowProfile(true), 400);
    },
    [agent]
  );

  /* ---------- NORMAL MODE: AI chatbot ---------- */

  const handleSend = useCallback(
    async (text: string) => {
      if (isComplete) return;

      const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
      const updated = [...messagesRef.current, userMsg];
      setMessages(updated);
      setIsTyping(true);

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: "profile",
            messages: updated,
            profileId: agent.profile?.id,
          }),
        });

        if (!res.ok) throw new Error("AI request failed");

        // Stream the response
        const reader = res.body?.getReader();

        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "", timestamp: Date.now() },
        ]);

        if (reader) {
          await consumeSSEStream(reader, (accumulated) => {
            setMessages((prev) => {
              const msgs = [...prev];
              msgs[msgs.length - 1] = {
                ...msgs[msgs.length - 1],
                content: accumulated,
              };
              return msgs;
            });
          });
        }

        // After 4+ user messages and a confirmation word, extract profile
        const count = updated.filter((m) => m.role === "user").length;
        if (count >= 4) {
          const lower = text.toLowerCase();
          if (
            lower.includes("yes") ||
            lower.includes("confirm") ||
            lower.includes("looks good") ||
            lower.includes("correct") ||
            lower.includes("great")
          ) {
            await extractAndSaveProfile(updated);
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
    [isComplete, saveProfile, agent.profile?.id]
  );

  const extractAndSaveProfile = async (conversation: ChatMessage[]) => {
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "profile",
          messages: [
            ...conversation,
            {
              role: "user",
              content:
                'Extract the company profile from our conversation as JSON: {"company_name":"","naics_codes":[],"location":"","province":"","capabilities":"","keywords":[],"keyword_synonyms":{}}. For keyword_synonyms, map each keyword to an array of 2-4 alternative phrasings or related terms (e.g. "cybersecurity": ["cyber security", "IT security", "infosec"]). Return ONLY valid JSON.',
              timestamp: Date.now(),
            },
          ],
          profileId: agent.profile?.id,
        }),
      });

      // Read SSE stream to collect full text
      const reader = res.body?.getReader();
      let fullText = "";
      if (reader) {
        fullText = await consumeSSEStream(reader, () => {});
      }

      const jsonStr = fullText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const profileData = JSON.parse(jsonStr);
      await saveProfile(profileData);
    } catch (err) {
      console.error("Profile extraction/save failed:", err);
    }
  };

  const handleEditProfile = () => {
    setEditMode(true);
    setIsComplete(false);
    setShowProfile(false);
    setMessages([
      {
        role: "assistant",
        content:
          "I have your existing profile. What would you like to update? You can change your company details, services, certifications, or any other information.",
        timestamp: Date.now(),
      },
    ]);
  };

  /* ---------- RENDER: Returning user with existing profile ---------- */

  if (hasExistingProfile && agent.profile) {
    return (
      <div className="flex flex-col flex-1 h-full" style={{ background: "var(--bg)" }}>
        <div
          className="flex-shrink-0 border-b"
          style={{ background: "var(--white)", borderColor: "var(--border-light)" }}
        >
          <div className="max-w-[860px] mx-auto px-10 py-6">
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
              Your Profile
            </h2>
            <p
              className="text-[11px] tracking-[0.5px]"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              Review your business profile or continue to scout
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[860px] mx-auto px-10 py-8">
            <ProfileCard
              profile={agent.profile}
              onEdit={handleEditProfile}
              onContinue={() => agent.setActiveAgent("scout")}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ---------- RENDER: New user or edit mode — chat interface ---------- */

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
                        boxShadow: isCurrent
                          ? "0 0 0 3px rgba(230, 126, 34, 0.15)"
                          : "none",
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

                    {/* Province buttons — step 1 */}
                    {completedSteps === 1 &&
                      i === messages.length - 1 &&
                      !isTyping && (
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
                    background: "var(--agent-profile)",
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
                        background: "var(--agent-profile)",
                        animation: `typingDot 1.4s infinite`,
                        animationDelay: `${delay}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Profile Card — shown after chat completion */}
          {showProfile && agent.profile && (
            <ProfileCard
              profile={agent.profile}
              onContinue={() => agent.setActiveAgent("scout")}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom bar — hidden after completion */}
      {!isComplete && (
        <div
          className="flex-shrink-0 border-t"
          style={{ background: "var(--white)", borderColor: "var(--border-light)" }}
        >
          <div className="max-w-[860px] mx-auto px-10 py-5">
            <ChatInput
              agentId="profile"
              onSend={handleSend}
              disabled={isTyping}
              externalValue={externalValue}
            />
          </div>
        </div>
      )}
    </div>
  );
}
