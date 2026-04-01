"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatInput } from "@/components/chat-input";
import { ChatMessage, BusinessProfile } from "@/lib/types";
import { AgentState } from "@/hooks/use-agent";
import { consumeSSEStream } from "@/lib/sse";
import { MarkdownMessage } from "@/components/markdown-message";

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

const PROVINCE_ALIASES: Record<string, string[]> = {
  "Ontario": ["ontario", "\\bon\\b"],
  "British Columbia": ["british columbia", "\\bbc\\b"],
  "Alberta": ["alberta", "\\bab\\b"],
  "Quebec": ["quebec", "québec", "\\bqc\\b"],
  "Manitoba": ["manitoba", "\\bmb\\b"],
  "Saskatchewan": ["saskatchewan", "\\bsk\\b"],
  "Nova Scotia": ["nova scotia", "\\bns\\b"],
  "New Brunswick": ["new brunswick", "\\bnb\\b"],
  "Newfoundland": ["newfoundland", "\\bnl\\b"],
  "PEI": ["prince edward island", "\\bpei\\b"],
  "Yukon": ["yukon", "\\byt\\b"],
  "NWT": ["northwest territories", "\\bnwt\\b"],
  "Nunavut": ["nunavut", "\\bnu\\b"],
};

/** Check if text mentions a Canadian province. Returns the province name or null. */
export function detectProvince(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [province, aliases] of Object.entries(PROVINCE_ALIASES)) {
    for (const alias of aliases) {
      if (new RegExp(alias, "i").test(lower)) return province;
    }
  }
  return null;
}

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

  const formatCurrency = (val: number | null) => {
    if (!val) return null;
    return val >= 1_000_000
      ? `$${(val / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
      : `$${(val / 1_000).toFixed(0)}K`;
  };

  const projectRange =
    profile.project_size_min || profile.project_size_max
      ? `${formatCurrency(profile.project_size_min) || "—"} – ${formatCurrency(profile.project_size_max) || "—"}`
      : null;

  const stats = [
    { label: "Province", value: profile.province },
    { label: "Years Active", value: profile.years_in_business ? `${profile.years_in_business} yrs` : null },
    { label: "Project Range", value: projectRange },
    { label: "Bonding Limit", value: formatCurrency(profile.bonding_limit) },
  ].filter((s) => s.value);

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
        {/* Top accent bar */}
        <div className="h-1" style={{ background: "var(--agent-profile)" }} />

        {/* Header */}
        <div className="px-8 pt-7 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <div
                className="text-[9px] tracking-[2px] uppercase mb-2"
                style={{ fontFamily: "var(--font-mono)", color: "var(--agent-profile)" }}
              >
                Business Profile
              </div>
              <div
                className="text-[26px] mb-0.5"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--text-primary)",
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                {profile.company_name}
              </div>
              <div
                className="text-[13px] flex items-center gap-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {profile.location || profile.province}
                {profile.is_canadian && (
                  <span
                    className="text-[9px] tracking-[1px] uppercase px-2 py-0.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: "rgba(230, 126, 34, 0.08)",
                      color: "var(--agent-profile)",
                    }}
                  >
                    Canadian
                  </span>
                )}
              </div>
            </div>
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-[10px] tracking-[1px] uppercase px-4 py-2 border transition-all hover:border-[var(--agent-profile)] hover:text-[var(--agent-profile)]"
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

        {/* Stats row */}
        {stats.length > 0 && (
          <div
            className="mx-8 mt-5 grid gap-0"
            style={{
              gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
              border: "1px solid var(--border-light)",
            }}
          >
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="px-4 py-3.5"
                style={{
                  borderRight: i < stats.length - 1 ? "1px solid var(--border-light)" : "none",
                }}
              >
                <div
                  className="text-[9px] tracking-[1.5px] uppercase mb-1"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                >
                  {stat.label}
                </div>
                <div
                  className="text-[14px] font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="px-8 pt-6 pb-7">
          {/* NAICS Codes */}
          {profile.naics_codes?.length > 0 && (
            <div className="mb-5">
              <div
                className="text-[9px] tracking-[2px] uppercase mb-2.5"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
              >
                NAICS Classifications
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.naics_codes.map((code) => (
                  <span
                    key={code}
                    className="text-[10px] tracking-[0.5px] px-2.5 py-1"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: "var(--bg)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-light)",
                    }}
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          {parsed.services.length > 0 && (
            <div className="mb-5">
              <div
                className="text-[9px] tracking-[2px] uppercase mb-2.5"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
              >
                Core Services
              </div>
              <div
                className="text-[13.5px] leading-[1.75]"
                style={{ color: "var(--text-primary)" }}
              >
                {parsed.services.join(". ")}.
              </div>
            </div>
          )}

          {/* Two-column: Certifications + Experience */}
          <div className="grid grid-cols-2 gap-6">
            {/* Certifications & Insurance */}
            {(parsed.certifications.length > 0 || profile.insurance_amount || profile.security_clearance) && (
              <div>
                <div
                  className="text-[9px] tracking-[2px] uppercase mb-2.5"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                >
                  Certifications & Insurance
                </div>
                <div className="space-y-1.5">
                  {parsed.certifications.map((cert, i) => (
                    <div
                      key={i}
                      className="text-[13px] flex items-start gap-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <span className="mt-0.5 text-[10px]" style={{ color: "var(--success)" }}>&#10003;</span>
                      {cert}
                    </div>
                  ))}
                  {profile.insurance_amount && (
                    <div
                      className="text-[13px] flex items-start gap-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <span className="mt-0.5 text-[10px]" style={{ color: "var(--success)" }}>&#10003;</span>
                      Liability: {profile.insurance_amount}
                    </div>
                  )}
                  {profile.security_clearance && (
                    <div
                      className="text-[13px] flex items-start gap-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <span className="mt-0.5 text-[10px]" style={{ color: "var(--success)" }}>&#10003;</span>
                      {profile.security_clearance}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Government Experience */}
            {(parsed.experience.length > 0 || profile.past_gov_experience) && (
              <div>
                <div
                  className="text-[9px] tracking-[2px] uppercase mb-2.5"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                >
                  Government Experience
                </div>
                <div
                  className="text-[13px] leading-[1.75]"
                  style={{ color: "var(--text-primary)" }}
                >
                  {parsed.experience.length > 0
                    ? `${parsed.experience.join(". ")}.`
                    : profile.past_gov_experience}
                </div>
              </div>
            )}
          </div>

          {/* Keywords */}
          {profile.keywords?.length > 0 && (
            <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--border-light)" }}>
              <div
                className="text-[9px] tracking-[2px] uppercase mb-2.5"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
              >
                Search Keywords
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="text-[10px] px-2.5 py-1"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: "rgba(230, 126, 34, 0.06)",
                      color: "var(--agent-profile)",
                      border: "1px solid rgba(230, 126, 34, 0.15)",
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
  const [isGenerating, setIsGenerating] = useState(false);
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
  }, [messages, showProfile, isTyping, isGenerating]);

  // Create an empty profile row on mount for new users so we have a profile_id
  // for updateProfile tool calls during the conversation
  useEffect(() => {
    if (agent.profile?.id) return; // already have one
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_name: "" }),
        });
        if (res.ok && !cancelled) {
          const saved = await res.json();
          if (saved?.id) agent.setProfile(saved);
        }
      } catch {
        // non-critical — extraction fallback still works
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track whether province was already mentioned in first message
  const [provinceFromInput, setProvinceFromInput] = useState<string | null>(null);

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
      let updated = [...messagesRef.current, userMsg];
      setMessages(updated);

      // If this is the first message, check if the user mentioned a province
      const currentUserCount = updated.filter((m) => m.role === "user").length;
      if (currentUserCount === 1) {
        const detected = detectProvince(text);
        if (detected) {
          setProvinceFromInput(detected);
          // Auto-inject province as the second user message to skip the picker
          const provinceMsg: ChatMessage = { role: "user", content: detected, timestamp: Date.now() };
          updated = [...updated, provinceMsg];
          setMessages(updated);
        }
      }

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

        // Stream the response — keep isTyping true so the cursor shows
        const reader = res.body?.getReader();

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "", timestamp: Date.now() },
        ]);

        let streamedText = "";
        if (reader) {
          await consumeSSEStream(reader, (accumulated) => {
            streamedText = accumulated;
            setMessages((prev) => {
              const msgs = [...prev];
              msgs[msgs.length - 1] = {
                ...msgs[msgs.length - 1],
                content: accumulated.replace("PROFILE_COMPLETE", "").trim(),
              };
              return msgs;
            });
          });
        }
        setIsTyping(false);

        // Check if the assistant's streamed response signals the profile is complete.
        // Profile data was already saved to Supabase via updateProfile tool calls
        // during the conversation — just fetch it directly instead of making
        // another Claude call to extract JSON.
        if (streamedText.includes("PROFILE_COMPLETE")) {
          // Remove the final assistant message (just an acknowledgment)
          // and show the generating indicator instead
          setMessages((prev) => prev.slice(0, -1));
          setIsGenerating(true);
          try {
            const minDelay = new Promise((r) => setTimeout(r, 2000));
            await Promise.all([finalizeProfile(), minDelay]);
          } finally {
            setIsGenerating(false);
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

  const finalizeProfile = useCallback(async () => {
    // Always try fetching from Supabase first — updateProfile tool calls
    // during the conversation should have already created/updated the row.
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const profile = await res.json();
        if (profile?.id && profile.company_name) {
          agent.setProfile(profile);
          setIsComplete(true);
          setEditMode(false);
          agent.completeAgent("profile");
          setTimeout(() => setShowProfile(true), 400);
          return;
        }
      }
    } catch (err) {
      console.error("Profile fetch failed, falling back to extraction:", err);
    }
    // Fallback: no profile in DB yet — extract from conversation and create it
    await extractAndSaveProfile(messagesRef.current);
  }, [agent]);

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

      // Extract JSON from anywhere in the response — AI may wrap it in markdown or add text
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Profile extraction: no JSON found in response:", fullText.slice(0, 200));
        return;
      }
      const profileData = JSON.parse(jsonMatch[0]);
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
                      className="text-[15px]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <MarkdownMessage
                        content={msg.content}
                        isStreaming={isTyping && i === messages.length - 1}
                      />
                    </div>

                    {/* Province buttons — step 1, hidden if province already mentioned */}
                    {completedSteps === 1 &&
                      !provinceFromInput &&
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

          {/* Typing indicator — only show before first token arrives */}
          {isTyping && (!messages.length || messages[messages.length - 1].role !== "assistant" || !messages[messages.length - 1].content) && (
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

          {/* Generating profile indicator */}
          {isGenerating && (
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
                <div>
                  <div
                    className="text-[9px] tracking-[2px] uppercase mb-2"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--agent-profile)" }}
                  >
                    Profile Agent
                  </div>
                  <div
                    className="text-[13px]"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                  >
                    Creating your profile card...
                  </div>
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
