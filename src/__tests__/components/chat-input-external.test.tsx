import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatInput } from "@/components/chat-input";

describe("ChatInput externalValue", () => {
  it("displays externalValue in the input field", () => {
    render(
      <ChatInput agentId="profile" onSend={vi.fn()} externalValue="Hello" />
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("Hello");
  });

  it("updates when externalValue changes", () => {
    const { rerender } = render(
      <ChatInput agentId="profile" onSend={vi.fn()} externalValue="Hel" />
    );
    rerender(
      <ChatInput agentId="profile" onSend={vi.fn()} externalValue="Hello world" />
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("Hello world");
  });

  it("user can still type normally when externalValue is undefined", () => {
    render(
      <ChatInput agentId="profile" onSend={vi.fn()} />
    );
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "manual typing" } });
    expect(input).toHaveValue("manual typing");
  });

  it("sends externalValue content on Enter and clears input", () => {
    const onSend = vi.fn();
    render(
      <ChatInput agentId="profile" onSend={onSend} externalValue="scripted text" />
    );
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("scripted text");
  });
});
