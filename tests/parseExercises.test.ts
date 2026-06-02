import { describe, it, expect } from "vitest";
import { parseExercises, parseKeys } from "@/lib/parseExercises";

describe("parseExercises — trắc nghiệm (mc)", () => {
  it("bóc prompt qua '::' và đánh dấu đáp án đúng bằng '*'", () => {
    const { exercises, errors } = parseExercises(
      `=== EXERCISE ===
type: mc
level: A2
- What color is the sky? :: red | *blue | green`,
    );
    expect(errors).toEqual([]);
    expect(exercises).toHaveLength(1);
    const ex = exercises[0];
    expect(ex.type).toBe("mc");
    expect(ex.level).toBe("A2");
    expect(ex.items[0]).toEqual({
      prompt: "What color is the sky?",
      options: ["red", "blue", "green"],
      answer: 1,
    });
  });
});

describe("parseExercises — truefalse / fill / ordering", () => {
  it("truefalse: 'right'/'đúng' → true, còn lại → false", () => {
    const { exercises } = parseExercises(
      `=== EXERCISE ===
type: truefalse
- The earth is flat. :: false
- Water is wet. :: right`,
    );
    expect(exercises[0].items.map((i) => i.answer)).toEqual([false, true]);
  });

  it("fill: tách prompt và đáp án qua '::'", () => {
    const { exercises } = parseExercises(
      `=== EXERCISE ===
type: fill
- I ___ to school. :: go`,
    );
    expect(exercises[0].items[0]).toEqual({ prompt: "I ___ to school.", answer: "go" });
  });

  it("ordering: sắp xếp các dòng theo số thứ tự", () => {
    const { exercises } = parseExercises(
      `=== EXERCISE ===
type: ordering
2. second
1. first
3. third`,
    );
    expect(exercises[0].items.map((i) => i.label)).toEqual(["first", "second", "third"]);
  });
});

describe("parseExercises — transcript & nhiều khối", () => {
  it("thu transcript sau dòng 'transcript:'", () => {
    const { exercises } = parseExercises(
      `=== EXERCISE ===
type: mc
- Q :: *a | b
transcript: Hello there.
Second line.`,
    );
    expect(exercises[0].transcript).toBe("Hello there.\nSecond line.");
  });

  it("tách nhiều bài theo '=== EXERCISE ==='", () => {
    const { exercises } = parseExercises(
      `=== EXERCISE ===
type: mc
- Q1 :: *a | b
=== EXERCISE ===
type: fill
- Q2 :: x`,
    );
    expect(exercises).toHaveLength(2);
    expect(exercises[0].type).toBe("mc");
    expect(exercises[1].type).toBe("fill");
  });

  it("báo lỗi khi không có khối nào", () => {
    const { exercises, errors } = parseExercises("không có gì");
    expect(exercises).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("type không hợp lệ → có lỗi", () => {
    const { errors } = parseExercises(
      `=== EXERCISE ===
type: bogus
- Q :: *a | b`,
    );
    expect(errors.some((e) => e.includes("type không hợp lệ"))).toBe(true);
  });
});

describe("parseKeys", () => {
  it("bóc đáp án dạng '<số> <giá trị>' kèm header", () => {
    const { keys, errors } = parseKeys(
      `=== KEY ===
unit: 3
section: A
1. blue
2 go`,
    );
    expect(errors).toEqual([]);
    expect(keys).toHaveLength(1);
    expect(keys[0].unit).toBe(3);
    expect(keys[0].section).toBe("A");
    expect(keys[0].answers).toEqual([
      { n: 1, value: "blue" },
      { n: 2, value: "go" },
    ]);
  });

  it("khối không có dòng đáp án → lỗi", () => {
    const { errors } = parseKeys(`=== KEY ===
unit: 1`);
    expect(errors.length).toBeGreaterThan(0);
  });
});
