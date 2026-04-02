import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/components/sidebar";
import { MainHeader } from "@/components/main-header";
import { ChatInput } from "@/components/chat-input";
import type { AgentId, AgentStatus, BusinessProfile } from "@/lib/types";

function makeProfile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    id: 1, company_name: "Test", naics_codes: [], location: "", province: "",
    capabilities: "", keywords: [], keyword_synonyms: {}, embedding: null,
    insurance_amount: "", bonding_limit: null, certifications: [],
    years_in_business: null, past_gov_experience: "", pbn: "",
    is_canadian: null, security_clearance: "", project_size_min: null,
    project_size_max: null, created_at: "", ...overrides,
  };
}

describe("Sidebar", () => {
  const defaultStatuses: Record<AgentId, AgentStatus> = {
    profile: "active",
    scout: "locked",
    analyst: "locked",
    compliance: "locked",
    writer: "locked",
  };

  it("renders all 5 agent names", () => {
    render(
      <Sidebar activeAgent="profile" statuses={defaultStatuses} profile={null} onAgentClick={() => {}} />
    );
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Scout")).toBeInTheDocument();
    expect(screen.getByText("Analyst")).toBeInTheDocument();
    expect(screen.getByText("Compliance")).toBeInTheDocument();
    expect(screen.getByText("Writer")).toBeInTheDocument();
  });

  it("renders 'No profile yet' when profile is null", () => {
    render(
      <Sidebar activeAgent="profile" statuses={defaultStatuses} profile={null} onAgentClick={() => {}} />
    );
    expect(screen.getByText("No profile yet")).toBeInTheDocument();
  });

  it("renders company name when profile is set", () => {
    const profile = makeProfile({ company_name: "Acme Corp", naics_codes: ["238220"], location: "Toronto", province: "Ontario" });
    render(
      <Sidebar activeAgent="profile" statuses={defaultStatuses} profile={profile} onAgentClick={() => {}} />
    );
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders province and first NAICS code in footer", () => {
    const profile = makeProfile({ company_name: "Test", naics_codes: ["238220", "999999"], province: "Ontario" });
    const { container } = render(
      <Sidebar activeAgent="profile" statuses={defaultStatuses} profile={profile} onAgentClick={() => {}} />
    );
    // Check that province and first NAICS appear (they're in one element with bullet)
    expect(container.textContent).toContain("Ontario");
    expect(container.textContent).toContain("238220");
  });

  it("handles profile with empty naics_codes (edge case)", () => {
    const profile = makeProfile({ company_name: "Test", province: "BC" });
    // Should not crash
    render(
      <Sidebar activeAgent="profile" statuses={defaultStatuses} profile={profile} onAgentClick={() => {}} />
    );
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("disables locked agent buttons", () => {
    render(
      <Sidebar activeAgent="profile" statuses={defaultStatuses} profile={null} onAgentClick={() => {}} />
    );
    const scoutBtn = screen.getByText("Scout").closest("button");
    expect(scoutBtn).toBeDisabled();
  });

  it("calls onAgentClick when clicking an unlocked agent", () => {
    const onClick = vi.fn();
    const statuses: Record<AgentId, AgentStatus> = {
      ...defaultStatuses,
      scout: "active",
    };
    render(
      <Sidebar activeAgent="profile" statuses={statuses} profile={null} onAgentClick={onClick} />
    );
    fireEvent.click(screen.getByText("Scout"));
    expect(onClick).toHaveBeenCalledWith("scout");
  });

  it("does NOT call onAgentClick when clicking a locked agent", () => {
    const onClick = vi.fn();
    render(
      <Sidebar activeAgent="profile" statuses={defaultStatuses} profile={null} onAgentClick={onClick} />
    );
    const analystBtn = screen.getByText("Analyst").closest("button")!;
    fireEvent.click(analystBtn);
    // Button is disabled so click doesn't fire the handler
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders Bidly branding", () => {
    render(
      <Sidebar activeAgent="profile" statuses={defaultStatuses} profile={null} onAgentClick={() => {}} />
    );
    expect(screen.getByText("Bidly")).toBeInTheDocument();
    // "Bidly v1.0" and "© 2026 Hackathon Build" are split by <br/>, so use container text
    const { container } = render(
      <Sidebar activeAgent="profile" statuses={defaultStatuses} profile={null} onAgentClick={() => {}} />
    );
    expect(container.textContent).toContain("Bidly v1.0");
    expect(container.textContent).toContain("2026 Hackathon Build");
  });

  it("renders all 3 category headers", () => {
    render(
      <Sidebar activeAgent="profile" statuses={defaultStatuses} profile={null} onAgentClick={() => {}} />
    );
    expect(screen.getByText("Setup")).toBeInTheDocument();
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Execute")).toBeInTheDocument();
  });

  it("shows checkmark for completed agents", () => {
    const statuses: Record<AgentId, AgentStatus> = {
      profile: "completed",
      scout: "active",
      analyst: "locked",
      compliance: "locked",
      writer: "locked",
    };
    const { container } = render(
      <Sidebar activeAgent="scout" statuses={statuses} profile={null} onAgentClick={() => {}} />
    );
    // Checkmark character should appear
    expect(container.textContent).toContain("\u2713");
  });
});

describe("MainHeader", () => {
  it("renders agent name and breadcrumb label", () => {
    render(<MainHeader activeAgent="profile" />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Company Setup")).toBeInTheDocument();
  });

  it("renders correct breadcrumb for each agent", () => {
    const cases: { id: AgentId; label: string }[] = [
      { id: "profile", label: "Company Setup" },
      { id: "scout", label: "Tender Search" },
      { id: "analyst", label: "RFP Analysis" },
      { id: "compliance", label: "Eligibility Check" },
      { id: "writer", label: "Bid Workspace" },
    ];
    for (const { id, label } of cases) {
      const { unmount } = render(<MainHeader activeAgent={id} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it("renders Demo Mode badge", () => {
    render(<MainHeader activeAgent="profile" />);
    expect(screen.getByText("Demo Mode")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});

describe("ChatInput", () => {
  it("renders with correct agent label", () => {
    render(<ChatInput agentId="profile" onSend={() => {}} />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("shows 'Send' button for all agents", () => {
    const { unmount } = render(<ChatInput agentId="profile" onSend={() => {}} />);
    expect(screen.getByText("Send")).toBeInTheDocument();
    unmount();

    render(<ChatInput agentId="scout" onSend={() => {}} />);
    expect(screen.getByText("Send")).toBeInTheDocument();
  });

  it("calls onSend with trimmed text on Enter", () => {
    const onSend = vi.fn();
    render(<ChatInput agentId="profile" onSend={onSend} />);
    const input = screen.getByPlaceholderText(/Tell the Profile Agent/);
    fireEvent.change(input, { target: { value: "  hello world  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("hello world");
  });

  it("does NOT call onSend for empty/whitespace input (edge case)", () => {
    const onSend = vi.fn();
    render(<ChatInput agentId="profile" onSend={onSend} />);
    const input = screen.getByPlaceholderText(/Tell the Profile Agent/);
    // Empty
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
    // Whitespace only
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("clears input after successful send", () => {
    render(<ChatInput agentId="profile" onSend={() => {}} />);
    const input = screen.getByPlaceholderText(/Tell the Profile Agent/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test message" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("");
  });

  it("does NOT send when disabled (edge case)", () => {
    const onSend = vi.fn();
    render(<ChatInput agentId="profile" onSend={onSend} disabled />);
    const input = screen.getByPlaceholderText(/Tell the Profile Agent/);
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("calls onSend on button click", () => {
    const onSend = vi.fn();
    render(<ChatInput agentId="profile" onSend={onSend} />);
    const input = screen.getByPlaceholderText(/Tell the Profile Agent/);
    fireEvent.change(input, { target: { value: "click test" } });
    fireEvent.click(screen.getByText("Send"));
    expect(onSend).toHaveBeenCalledWith("click test");
  });

  it("does not trigger on non-Enter keys (edge case)", () => {
    const onSend = vi.fn();
    render(<ChatInput agentId="profile" onSend={onSend} />);
    const input = screen.getByPlaceholderText(/Tell the Profile Agent/);
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.keyDown(input, { key: "Tab" });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.keyDown(input, { key: "a" });
    expect(onSend).not.toHaveBeenCalled();
  });
});
