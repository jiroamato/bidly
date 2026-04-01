"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { MarkdownMessage } from "@/components/markdown-message";
import { AgentState } from "@/hooks/use-agent";

interface WriterViewProps {
  agent: AgentState;
  externalValue?: string;
  externalActiveSection?: SectionId;
}

type SectionId = "exec_summary" | "technical" | "team" | "project_mgmt" | "safety" | "pricing" | "forms" | "preview";
type SectionStatus = "done" | "draft" | "empty";

interface SectionDef {
  id: SectionId;
  label: string;
  group: "sections" | "forms" | "export";
}

const SECTION_DEFS: SectionDef[] = [
  { id: "exec_summary", label: "Executive Summary", group: "sections" },
  { id: "technical", label: "Technical Approach", group: "sections" },
  { id: "team", label: "Team & Experience", group: "sections" },
  { id: "project_mgmt", label: "Project Management", group: "sections" },
  { id: "safety", label: "Safety Plan", group: "sections" },
  { id: "pricing", label: "Pricing Schedule", group: "forms" },
  { id: "forms", label: "Form Guidance", group: "forms" },
  { id: "preview", label: "Preview Full Bid", group: "export" },
];

const STATUS_ICONS: Record<SectionStatus, { icon: string; color: string }> = {
  done: { icon: "\u2713", color: "var(--success)" },
  draft: { icon: "\u25CF", color: "var(--agent-writer)" },
  empty: { icon: "\u25CB", color: "var(--text-hint)" },
};

// TODO: "done" status will be set when user explicitly approves a section
function getSectionStatus(sectionId: string, draftSections: Record<string, string>): SectionStatus {
  if (sectionId === "preview") {
    // Preview is available if any section has content
    const hasAnyContent = Object.values(draftSections).some((v) => v && v.trim().length > 0);
    return hasAnyContent ? "draft" : "empty";
  }
  const content = draftSections[sectionId];
  if (!content || content.trim().length === 0) return "empty";
  return "draft";
}

function BidPreview({ draftSections }: { draftSections: Record<string, string> }) {
  const hasContent = Object.values(draftSections).some((v) => v && v.trim().length > 0);

  if (!hasContent) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center" style={{ background: "#e5e7eb" }}>
        <div className="text-center">
          <div
            className="text-[12px] tracking-[2px] uppercase mb-2"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-hint)" }}
          >
            No content to preview
          </div>
          <div className="text-[14px]" style={{ color: "var(--text-muted)" }}>
            Draft some sections first, then preview the full bid here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#e5e7eb" }}>
      <div className="py-8 px-6 flex justify-center">
        <div
          style={{
            width: 816,
            minHeight: 1056,
            background: "#fff",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
            fontFamily: "'Times New Roman', 'Georgia', serif",
            color: "#1a1a1a",
            position: "relative",
            padding: "72px 72px 48px 72px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 14, letterSpacing: "4px", textTransform: "uppercase", color: "#888", fontFamily: "Arial, sans-serif", marginBottom: 16 }}>
              BID PROPOSAL DRAFT
            </div>
          </div>

          {SECTION_DEFS.filter((s) => s.id !== "preview" && draftSections[s.id]).map((section, idx) => (
            <div key={section.id} style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 10, color: "#aaa", fontFamily: "Arial, sans-serif", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>
                Section {idx + 1}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, paddingBottom: 8, borderBottom: "1px solid #ddd" }}>
                {section.label}
              </h2>
              <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                <MarkdownMessage content={draftSections[section.id]} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WriterView({ agent, externalValue, externalActiveSection }: WriterViewProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("exec_summary");
  const [draftSections, setDraftSections] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const profileId = agent.profile?.id;
  const tenderId = agent.selectedTender?.id;

  // Override active section from external source (e.g., demo script)
  useEffect(() => {
    if (externalActiveSection) {
      setActiveSection(externalActiveSection);
    }
  }, [externalActiveSection]);

  const refreshDrafts = useCallback(() => {
    if (!profileId || !tenderId) return;
    fetch(`/api/drafts?profile_id=${profileId}&tender_id=${tenderId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.sections) {
          setDraftSections(data.sections);
        }
      })
      .catch((err) => { if (process.env.NODE_ENV !== 'production') console.warn('Failed to fetch drafts:', err); });
  }, [profileId, tenderId]);

  // Fetch existing drafts on mount
  useEffect(() => {
    if (!profileId || !tenderId) return;

    setIsLoading(true);
    fetch(`/api/drafts?profile_id=${profileId}&tender_id=${tenderId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.sections) {
          setDraftSections(data.sections);
        }
      })
      .catch((err) => { if (process.env.NODE_ENV !== 'production') console.warn('Failed to fetch drafts:', err); })
      .finally(() => setIsLoading(false));
  }, [profileId, tenderId]);

  const sectionConfig = SECTION_DEFS.find((s) => s.id === activeSection)!;
  const sectionStatus = getSectionStatus(activeSection, draftSections);
  const sectionContent = draftSections[activeSection] || "";

  const isPreview = activeSection === "preview";

  const sections = SECTION_DEFS.map((def) => ({
    ...def,
    status: getSectionStatus(def.id, draftSections),
  }));

  const handleSaveDraft = useCallback(async () => {
    if (!profileId || !tenderId) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: profileId,
          tender_id: tenderId,
          sections: draftSections,
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save draft";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }, [profileId, tenderId, draftSections]);

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Section Tabs */}
      <div
        className="w-[200px] border-r flex flex-col flex-shrink-0 overflow-y-auto"
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--bidly-border)" }}
      >
        {(["sections", "forms", "export"] as const).map((group) => {
          const groupSections = sections.filter((s) => s.group === group);
          const groupLabels: Record<string, string> = { sections: "Bid Sections", forms: "Forms & Pricing", export: "Export" };

          return (
            <div key={group}>
              <div
                className="px-5 pt-5 pb-2 text-[10px] font-medium tracking-[2px] uppercase"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
              >
                {groupLabels[group]}
              </div>
              {groupSections.map((section) => {
                const isActive = section.id === activeSection;
                const statusStyle = STATUS_ICONS[section.status];

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className="w-full text-left px-5 py-2.5 flex items-center gap-2.5 text-[12px] transition-colors"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: isActive ? "var(--white)" : "transparent",
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      fontWeight: isActive ? 600 : 400,
                      cursor: "pointer",
                      borderLeft: isActive ? "3px solid var(--agent-writer)" : "3px solid transparent",
                    }}
                  >
                    <span className="text-[11px]" style={{ color: statusStyle.color }}>{statusStyle.icon}</span>
                    {section.label}
                  </button>
                );
              })}
              {group !== "export" && (
                <div className="mx-5 my-3 border-b" style={{ borderColor: "var(--bidly-border)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Editor / Preview Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isPreview ? (
          <BidPreview draftSections={draftSections} />
        ) : (
          <>
            {/* Toolbar */}
            <div
              className="px-8 py-4 flex items-center justify-between border-b flex-shrink-0"
              style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="text-[14px] font-semibold"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
                >
                  {sectionConfig.label}
                </div>
                <span
                  className="text-[9px] tracking-[1.5px] uppercase px-2 py-0.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: sectionStatus === "empty" ? "var(--bg)" : "#f0ecff",
                    color: sectionStatus === "empty" ? "var(--text-hint)" : "var(--agent-writer)",
                  }}
                >
                  {sectionStatus}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 text-[10px] tracking-[1px] uppercase border"
                  style={{
                    fontFamily: "var(--font-mono)",
                    borderColor: "var(--bidly-border)",
                    background: "var(--white)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  Copy
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="px-4 py-2 text-[10px] tracking-[1px] uppercase"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: saveSuccess ? "var(--success, #16a34a)" : "var(--text-primary)",
                    color: "var(--white)",
                    border: "none",
                    cursor: isSaving ? "not-allowed" : "pointer",
                    opacity: isSaving ? 0.6 : 1,
                  }}
                >
                  {isSaving ? "Saving..." : saveSuccess ? "Saved" : "Save Draft"}
                </button>
                {saveError && (
                  <span
                    className="text-[10px] self-center"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--destructive, #dc2626)" }}
                  >
                    {saveError}
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {isLoading ? (
                <div className="text-center py-16">
                  <div
                    className="text-[12px] tracking-[2px] uppercase mb-2"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-hint)" }}
                  >
                    Loading draft...
                  </div>
                </div>
              ) : sectionContent ? (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[10px] font-medium tracking-[1.5px] uppercase"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                    >
                      {sectionConfig.label}
                    </span>
                    <span
                      className="text-[8px] tracking-[1px] uppercase px-2 py-0.5"
                      style={{
                        fontFamily: "var(--font-mono)",
                        background: "#f0ecff",
                        color: "var(--agent-writer)",
                      }}
                    >
                      AI Draft
                    </span>
                  </div>
                  <div
                    className="border p-5 text-[14px] leading-relaxed"
                    style={{
                      background: "var(--white)",
                      borderColor: "var(--bidly-border)",
                      color: "var(--text-primary)",
                      minHeight: 80,
                    }}
                  >
                    <MarkdownMessage content={sectionContent} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div
                    className="text-[12px] tracking-[2px] uppercase mb-2"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-hint)" }}
                  >
                    No content yet
                  </div>
                  <div className="text-[14px]" style={{ color: "var(--text-muted)" }}>
                    Use the chat below to have the Writer agent draft this section
                  </div>
                </div>
              )}
            </div>

            {/* Chat Panel */}
            <div className="flex-shrink-0">
              <ChatPanel agentId="writer" selectedTender={agent.selectedTender} profile={agent.profile} externalValue={externalValue} onResponseComplete={refreshDrafts} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
