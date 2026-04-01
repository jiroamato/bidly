import { describe, it, expect } from "vitest";
import * as fs from "fs";

describe("page.tsx — ChatHistoryProvider integration", () => {
  const content = fs.readFileSync("src/app/page.tsx", "utf-8");

  it("imports ChatHistoryProvider", () => {
    expect(content).toContain("ChatHistoryProvider");
  });

  it("imports useChatHistoryActions", () => {
    expect(content).toContain("useChatHistoryActions");
  });

  it("wraps the app in ChatHistoryProvider", () => {
    expect(content).toMatch(/<ChatHistoryProvider>/);
  });

  it("calls clearAllMessages in handleDemoReset", () => {
    expect(content).toContain("clearAllMessages");
  });
});
