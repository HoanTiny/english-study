import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), single: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: mocks.from } }));
import { setOnboarding } from "@/lib/profileRepo";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.update.mockReturnValue({ eq: () => ({ select: () => ({ single: mocks.single }) }) });
  mocks.from.mockReturnValue({ update: mocks.update });
});
it("rejects levels outside the curriculum", async () => {
  await expect(setOnboarding("user", 5)).rejects.toThrow("Trình độ không hợp lệ");
  expect(mocks.from).not.toHaveBeenCalled();
});
it("propagates failed placement saves rather than reporting success", async () => {
  mocks.single.mockResolvedValue({ error: new Error("offline") });
  await expect(setOnboarding("user", 2)).rejects.toThrow("offline");
});
it("persists the chosen level together with onboarding status", async () => {
  mocks.single.mockResolvedValue({ data: { id: "user" }, error: null });
  await setOnboarding("user", 3);
  expect(mocks.update).toHaveBeenCalledWith({ current_stage: 3, onboarded: true });
});
