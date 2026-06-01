"use client";

// Parser cho định dạng "khối" bài tập nghe (dán hàng loạt trong CMS).
// Mỗi bài bắt đầu bằng dòng: === EXERCISE ===
// Header: key: value (unit, section, activity, level, type, audio, instructions)
// Câu hỏi: dòng "- ..." (mc/truefalse/fill/speaking) hoặc "N. ..." (ordering)
// transcript: phần sau dòng "transcript:" tới hết khối.

export type ParsedItem = {
  prompt?: string;
  options?: string[];
  answer?: number | string | boolean;
  label?: string;
  text?: string;
};
export type ParsedExercise = {
  unit: number | null;
  section: string;
  activity: number | null;
  level: string;
  type: "mc" | "fill" | "truefalse" | "ordering" | "speaking";
  audio_path: string | null;
  instructions: string;
  title: string;
  items: ParsedItem[];
  transcript: string;
  visible: boolean;
};

const TYPES = ["mc", "fill", "truefalse", "ordering", "speaking"];
const KNOWN_KEYS = ["unit", "section", "activity", "level", "type", "audio", "instructions", "title"];

function parseMcLine(rest: string): ParsedItem {
  // "[prompt ::] opt | opt | *opt"
  let prompt = "";
  let optsPart = rest;
  const dd = rest.split("::");
  if (dd.length >= 2) {
    prompt = dd[0].trim();
    optsPart = dd.slice(1).join("::");
  }
  const options: string[] = [];
  let answer = 0;
  optsPart.split("|").forEach((o, i) => {
    let t = o.trim();
    if (t.startsWith("*")) {
      answer = i;
      t = t.slice(1).trim();
    }
    options.push(t);
  });
  return { prompt, options, answer };
}

function parseBlock(
  block: string,
  idx: number,
  transcriptMode = false,
): { ex?: ParsedExercise; errors: string[] } {
  const errors: string[] = [];
  const lines = block.split(/\r?\n/);
  const header: Record<string, string> = {};
  const itemLines: string[] = [];
  let transcript = "";
  let mode: "head" | "transcript" = "head";

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (mode === "transcript") {
      transcript += (transcript ? "\n" : "") + raw;
      continue;
    }
    if (/^transcript:/i.test(line.trim())) {
      mode = "transcript";
      transcript = line.trim().replace(/^transcript:\s*/i, "");
      continue;
    }
    if (!line.trim()) {
      // giữ dòng trống trong transcript-mode để xuống dòng tự nhiên
      if (transcriptMode && transcript) transcript += "\n";
      continue;
    }
    // Chỉ coi là header khi key thuộc danh sách đã biết (tránh nuốt "A: ...", "B: ...").
    const m = line.match(/^([A-Za-z_ ]+):\s*(.*)$/);
    if (m && KNOWN_KEYS.includes(m[1].trim().toLowerCase())) {
      header[m[1].trim().toLowerCase()] = m[2].trim();
      continue;
    }
    // Transcript-mode: mọi dòng còn lại là transcript (không parse câu hỏi).
    if (transcriptMode) {
      transcript += (transcript ? "\n" : "") + line.trim();
      continue;
    }
    if (/^\s*([-•]|\d+[.)])\s+/.test(line)) itemLines.push(line.trim());
  }

  const type = (header["type"] || "mc").toLowerCase() as ParsedExercise["type"];
  if (!TYPES.includes(type)) errors.push(`Bài #${idx}: type không hợp lệ "${type}"`);

  const items: ParsedItem[] = [];
  if (type === "ordering") {
    // giữ theo số thứ tự
    const numbered = itemLines
      .map((l) => {
        const mm = l.match(/^(\d+)[.)]\s+(.*)$/);
        return mm ? { n: parseInt(mm[1], 10), label: mm[2].trim() } : null;
      })
      .filter(Boolean) as { n: number; label: string }[];
    numbered.sort((a, b) => a.n - b.n);
    for (const x of numbered) items.push({ label: x.label });
  } else {
    for (const l of itemLines) {
      const rest = l.replace(/^([-•]|\d+[.)])\s+/, "");
      if (type === "mc") items.push(parseMcLine(rest));
      else if (type === "truefalse") {
        const dd = rest.split("::");
        const prompt = dd.length >= 2 ? dd[0].trim() : rest.trim();
        const ans = (dd[1] ?? "").trim().toLowerCase();
        items.push({ prompt, answer: /^(right|true|đúng|t|đ)$/i.test(ans) });
      } else if (type === "fill") {
        const dd = rest.split("::");
        items.push({ prompt: (dd[0] ?? "").trim(), answer: (dd[1] ?? "").trim() });
      } else if (type === "speaking") {
        items.push({ text: rest.trim() });
      }
    }
  }

  // Cho phép khối CHỈ có transcript (để khớp/cập nhật vào bài có sẵn).
  if (items.length === 0 && !transcript.trim())
    errors.push(`Bài #${idx}: không có câu hỏi và cũng không có transcript.`);

  const unit = header["unit"] ? parseInt(header["unit"], 10) : null;
  const activity = header["activity"] ? parseInt(header["activity"], 10) : null;
  const section = header["section"] || "";
  const level = header["level"] || "A2";
  const title =
    header["title"] ||
    [unit ? `Unit ${unit}` : null, section || null, activity ? `Activity ${activity}` : null]
      .filter(Boolean)
      .join(" · ") ||
    `Bài tập ${idx}`;

  const ex: ParsedExercise = {
    unit,
    activity,
    section,
    level,
    type,
    audio_path: header["audio"] ? header["audio"] : null,
    instructions: header["instructions"] || "",
    title,
    items,
    transcript: transcript.trim(),
    visible: true,
  };
  return { ex, errors };
}

export function parseExercises(
  text: string,
  transcriptMode = false,
): { exercises: ParsedExercise[]; errors: string[] } {
  const blocks = text
    .split(/^===\s*EXERCISE\s*===\s*$/im)
    .map((b) => b.trim())
    .filter(Boolean);
  const exercises: ParsedExercise[] = [];
  const errors: string[] = [];
  blocks.forEach((b, i) => {
    const { ex, errors: errs } = parseBlock(b, i + 1, transcriptMode);
    errors.push(...errs);
    if (ex && (ex.items.length > 0 || ex.transcript.trim())) exercises.push(ex);
  });
  if (exercises.length === 0 && errors.length === 0) errors.push("Không tìm thấy khối nào. Mỗi bài bắt đầu bằng dòng: === EXERCISE ===");
  return { exercises, errors };
}

// ── Parser cho ANSWER KEY ────────────────────────────────────
// Mỗi khối: header unit/section/activity + danh sách dòng "<n> <đáp án>".
export type ParsedKey = {
  unit: number | null;
  section: string;
  activity: number | null;
  answers: { n: number; value: string }[];
};

export function parseKeys(text: string): { keys: ParsedKey[]; errors: string[] } {
  const blocks = text
    .split(/^===\s*(?:EXERCISE|KEY)\s*===\s*$/im)
    .map((b) => b.trim())
    .filter(Boolean);
  const keys: ParsedKey[] = [];
  const errors: string[] = [];

  blocks.forEach((block, bi) => {
    const header: Record<string, string> = {};
    const answers: { n: number; value: string }[] = [];
    for (const raw of block.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || /^key:?$/i.test(line)) continue;
      const hm = line.match(/^([A-Za-z_ ]+):\s*(.*)$/);
      if (hm && KNOWN_KEYS.includes(hm[1].trim().toLowerCase())) {
        header[hm[1].trim().toLowerCase()] = hm[2].trim();
        continue;
      }
      // dòng đáp án: "<số> <giá trị>"  (giá trị có thể chứa dấu cách/số)
      const am = line.match(/^(\d+)[\s.):\-]+(.+)$/);
      if (am) answers.push({ n: parseInt(am[1], 10), value: am[2].trim() });
    }
    if (answers.length === 0) {
      errors.push(`Khối #${bi + 1}: không có dòng đáp án "<số> <giá trị>".`);
      return;
    }
    keys.push({
      unit: header["unit"] ? parseInt(header["unit"], 10) : null,
      section: header["section"] || "",
      activity: header["activity"] ? parseInt(header["activity"], 10) : null,
      answers,
    });
  });
  if (keys.length === 0 && errors.length === 0) errors.push("Không tìm thấy khối key nào (=== EXERCISE === + dòng số đáp án).");
  return { keys, errors };
}
