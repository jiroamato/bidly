import { describe, it, expect, vi } from "vitest";

// Test that demo scaffolding is removed
describe("ProfileView", () => {
  it("does not contain DEMO_PAIRS constant", async () => {
    const source = await import("@/components/views/profile-view");
    expect((source as any).DEMO_PAIRS).toBeUndefined();
  });

  it("does not contain DEMO_PROFILE_PAYLOAD constant", async () => {
    const source = await import("@/components/views/profile-view");
    expect((source as any).DEMO_PROFILE_PAYLOAD).toBeUndefined();
  });
});
