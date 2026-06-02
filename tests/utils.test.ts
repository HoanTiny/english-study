import { describe, it, expect } from "vitest";
import { countSentences } from "@/lib/store";
import { parseJsonLoose } from "@/lib/server/generateText";

describe("countSentences", () => {
  it("đếm theo dấu kết câu . ! ?", () => {
    expect(countSentences("Hello. How are you? I am fine!")).toBe(3);
  });

  it("chuỗi rỗng / chỉ khoảng trắng → 0", () => {
    expect(countSentences("")).toBe(0);
    expect(countSentences("   ")).toBe(0);
  });

  it("văn bản không có dấu kết câu vẫn tính là 1 câu", () => {
    expect(countSentences("hello there")).toBe(1);
  });

  it("nhiều dấu kết liên tiếp tính là một câu", () => {
    expect(countSentences("Really?! Yes...")).toBe(2);
  });
});

describe("parseJsonLoose", () => {
  it("phân tích JSON thuần", () => {
    expect(parseJsonLoose<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("bóc JSON bị bọc trong ```json ... ```", () => {
    const wrapped = '```json\n{"ok":true,"n":2}\n```';
    expect(parseJsonLoose<{ ok: boolean; n: number }>(wrapped)).toEqual({ ok: true, n: 2 });
  });

  it("trích object khi có chữ thừa trước/sau", () => {
    const messy = 'Đây là kết quả: {"word":"hello"} hết.';
    expect(parseJsonLoose<{ word: string }>(messy)).toEqual({ word: "hello" });
  });

  it("trả null khi không có JSON hợp lệ", () => {
    expect(parseJsonLoose("không có gì ở đây")).toBeNull();
  });
});
