import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), result: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: mocks.from } }));
import { fetchLesson, fetchLessonList } from "@/lib/lessonsRepo";

beforeEach(() => {
  vi.clearAllMocks();
  const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), maybeSingle: mocks.result, returns: mocks.result };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  mocks.from.mockReturnValue(chain);
});
it("does not expose a hidden static lesson through its direct slug", async () => {
  mocks.result.mockResolvedValue({ data: null, error: null });
  expect(await fetchLesson("greetings")).toBeUndefined();
});
it("does not fall back to static content on DB errors", async () => {
  mocks.result.mockResolvedValue({ data: null, error: new Error("offline") });
  await expect(fetchLesson("greetings")).rejects.toThrow("offline");
});
it("treats an empty published CMS as an authoritative empty list", async () => {
  mocks.result.mockResolvedValue({ data: [], error: null });
  expect(await fetchLessonList()).toEqual([]);
});
