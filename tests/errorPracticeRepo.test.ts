import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), single: vi.fn(), event: vi.fn(), streak: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("@/lib/studySession", () => ({ recordStudyEvent: mocks.event }));
vi.mock("@/lib/profileRepo", () => ({ touchStreak: mocks.streak }));
import { practiceError } from "@/lib/errorLogRepo";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  mocks.rpc.mockReturnValue({ single: mocks.single });
  mocks.streak.mockResolvedValue(1);
});
afterEach(() => vi.unstubAllGlobals());

it("does not advance the session or streak when practice cannot be saved", async () => {
  mocks.single.mockResolvedValue({ data: null, error: new Error("offline") });
  await expect(practiceError("user-a", "e1", true)).rejects.toThrow("offline");
  expect(mocks.event).not.toHaveBeenCalled();
  expect(mocks.streak).not.toHaveBeenCalled();
});
it("records practice credit only after the DB has accepted the attempt", async () => {
  const saved = { id: "e1", correct_streak: 1, resolved: false };
  mocks.single.mockResolvedValue({ data: saved, error: null });
  expect(await practiceError("user-a", "e1", true)).toEqual(saved);
  expect(mocks.rpc).toHaveBeenCalledWith("practice_error", { p_id: "e1", p_remembered: true });
  expect(mocks.event).toHaveBeenCalledWith("user-a", { kind: "errors", id: "e1" });
});
it("does not credit a missing result", async () => {
  mocks.single.mockResolvedValue({ data: null, error: null });
  await expect(practiceError("user-a", "e1", false)).rejects.toThrow();
  expect(mocks.event).not.toHaveBeenCalled();
});
