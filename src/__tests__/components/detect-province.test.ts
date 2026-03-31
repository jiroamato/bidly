import { describe, it, expect } from "vitest";
import { detectProvince } from "@/components/views/profile-view";

describe("detectProvince", () => {
  it("detects full province name in a sentence", () => {
    expect(detectProvince("We're based in Ottawa, Ontario")).toBe("Ontario");
  });

  it("detects province name case-insensitively", () => {
    expect(detectProvince("headquartered in ALBERTA")).toBe("Alberta");
  });

  it("detects British Columbia", () => {
    expect(detectProvince("Our office is in Vancouver, British Columbia")).toBe("British Columbia");
  });

  it("detects BC abbreviation", () => {
    expect(detectProvince("We operate out of BC")).toBe("British Columbia");
  });

  it("detects Quebec with accent", () => {
    expect(detectProvince("Basé à Montréal, Québec")).toBe("Quebec");
  });

  it("detects PEI full name", () => {
    expect(detectProvince("Located in Prince Edward Island")).toBe("PEI");
  });

  it("detects NWT full name", () => {
    expect(detectProvince("We work in the Northwest Territories")).toBe("NWT");
  });

  it("returns null when no province is mentioned", () => {
    expect(detectProvince("Our company is Northpoint Digital Solutions")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(detectProvince("")).toBeNull();
  });

  it("detects province embedded in longer text", () => {
    expect(
      detectProvince("Our company is Northpoint Digital Solutions, and we're based in Ottawa, Ontario.")
    ).toBe("Ontario");
  });

  it("detects Saskatchewan", () => {
    expect(detectProvince("We are from Saskatchewan")).toBe("Saskatchewan");
  });

  it("detects Manitoba abbreviation MB", () => {
    expect(detectProvince("Our HQ is in MB")).toBe("Manitoba");
  });

  it("returns first match when multiple provinces mentioned", () => {
    const result = detectProvince("We operate in Ontario and Alberta");
    expect(result).toBe("Ontario");
  });
});
