"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminAuth } from "@/lib/adminAuth";
import { parseExercises, parseKeys, type ParsedExercise, type ParsedKey } from "@/lib/parseExercises";

const IMPORT_HINT = `=== EXERCISE ===
unit: 1
section: Telephone numbers
activity: 2
level: A2
type: mc
audio: exercise/cd1-track-02.mp3
instructions: Nghe và chọn đáp án đúng.
- The price :: *twelve | twenty | twenty-two
- The address :: 890 Main St | *89 Main St | 819 Main St
transcript:
(dán transcript nếu có)`;

type Item = {
  prompt?: string;
  options?: string[];
  answer?: number | string | boolean;
  label?: string;
  text?: string;
  image?: string; // path ảnh trong bucket (tuỳ chọn)
};
type Exercise = {
  id?: string;
  unit: number | null;
  section: string;
  activity: number | null;
  title: string;
  level: string;
  cd: number | null;
  track: number | null;
  audio_path: string | null;
  instructions: string;
  type: "mc" | "fill" | "truefalse" | "ordering" | "speaking";
  items: Item[];
  transcript: string;
  visible: boolean;
  sort_order: number;
};
type Row = { id: string; unit: number | null; activity: number | null; title: string; type: string; level: string; visible: boolean; audio_path: string | null; created_at?: string };
type SortKey = "created_desc" | "created_asc" | "title" | "unit";

const TYPES = [
  { v: "mc", label: "Trắc nghiệm" },
  { v: "truefalse", label: "Đúng / Sai" },
  { v: "fill", label: "Điền" },
  { v: "ordering", label: "Đánh số / thứ tự" },
  { v: "speaking", label: "Nói (không chấm)" },
] as const;

function blankExercise(): Exercise {
  return {
    unit: 1, section: "", activity: 1, title: "", level: "A2",
    cd: null, track: null, audio_path: null, instructions: "",
    type: "mc", items: [], transcript: "", visible: true, sort_order: 0,
  };
}

export default function AdminListeningExercisesPage() {
  const { key } = useAdminAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [titleAuto, setTitleAuto] = useState(true); // tiêu đề tự điền theo Unit·Section·Activity
  const [quickKey, setQuickKey] = useState(""); // dán đáp án nhanh cho bài đang sửa
  const [quickKeyOpen, setQuickKeyOpen] = useState(false);
  const [quickOcrBusy, setQuickOcrBusy] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [gridCols, setGridCols] = useState(4);
  const [gridRows, setGridRows] = useState(3);
  const [gridBusy, setGridBusy] = useState(false);
  const [gridSrc, setGridSrc] = useState<string | null>(null); // dataURL ảnh đang căn
  const [gm, setGm] = useState({ top: 0, right: 0, bottom: 0, left: 0 }); // lề % để loại tiêu đề/mép
  const gridImgRef = useRef<HTMLImageElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);

  async function uploadBlob(blob: Blob): Promise<string> {
    const fd = new FormData();
    fd.append("file", new File([blob], "tile.png", { type: "image/png" }));
    fd.append("folder", "exercise-img");
    const res = await fetch("/api/admin/upload", { method: "POST", headers: { "x-admin-key": key }, body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "upload lỗi");
    return data.path as string;
  }

  function loadGridFile(file: File) {
    const r = new FileReader();
    r.onload = () => {
      const src = String(r.result);
      const im = new window.Image();
      im.onload = () => { gridImgRef.current = im; setGridSrc(src); };
      im.src = src;
    };
    r.readAsDataURL(file);
  }

  function onPasteGrid(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData?.items ?? []).find((it) => it.type.startsWith("image/"));
    if (item) {
      const file = item.getAsFile();
      if (file) { e.preventDefault(); loadGridFile(file); }
    }
  }

  // Vùng lưới (theo px ảnh gốc) sau khi trừ lề.
  const gridRegion = useCallback(
    (img: HTMLImageElement) => {
      const x = (img.naturalWidth * gm.left) / 100;
      const y = (img.naturalHeight * gm.top) / 100;
      const w = img.naturalWidth * (1 - (gm.left + gm.right) / 100);
      const h = img.naturalHeight * (1 - (gm.top + gm.bottom) / 100);
      return { x, y, w, h };
    },
    [gm],
  );

  // Vẽ xem trước + kẻ lưới.
  useEffect(() => {
    const cv = previewRef.current, img = gridImgRef.current;
    if (!cv || !img || !gridSrc) return;
    const maxW = 460;
    const scale = Math.min(1, maxW / img.naturalWidth);
    cv.width = img.naturalWidth * scale;
    cv.height = img.naturalHeight * scale;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    const reg = gridRegion(img);
    const rx = reg.x * scale, ry = reg.y * scale, rw = reg.w * scale, rh = reg.h * scale;
    ctx.strokeStyle = "#14b8a6";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.strokeStyle = "rgba(20,184,166,0.7)";
    ctx.lineWidth = 1;
    for (let c = 1; c < gridCols; c++) { const x = rx + (rw * c) / gridCols; ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry + rh); ctx.stroke(); }
    for (let r = 1; r < gridRows; r++) { const y = ry + (rh * r) / gridRows; ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx + rw, y); ctx.stroke(); }
  }, [gridSrc, gridCols, gridRows, gridRegion]);

  // Cắt theo vùng đã căn → upload từng ô → thêm câu.
  async function doGridCut() {
    const img = gridImgRef.current;
    if (!img) return;
    setGridBusy(true);
    setErr("");
    try {
      const cols = Math.max(1, gridCols), rows = Math.max(1, gridRows);
      const reg = gridRegion(img);
      const tw = Math.floor(reg.w / cols), th = Math.floor(reg.h / rows);
      const canvas = document.createElement("canvas");
      canvas.width = tw; canvas.height = th;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Không tạo được canvas.");
      const paths: string[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.clearRect(0, 0, tw, th);
          ctx.drawImage(img, reg.x + c * tw, reg.y + r * th, tw, th, 0, 0, tw, th);
          const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), "image/png"));
          paths.push(await uploadBlob(blob));
        }
      }
      const newItems: Item[] = paths.map((p) => ({ image: p, text: "" }));
      setEditing((prev) => (prev ? { ...prev, items: [...prev.items, ...newItems] } : prev));
      setGridSrc(null);
      gridImgRef.current = null;
      setGridOpen(false);
      flash(`Đã cắt ${paths.length} ảnh → thêm ${paths.length} câu`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cắt ảnh thất bại.");
    } finally {
      setGridBusy(false);
    }
  }

  const imgSrc = (path: string) => `/api/lesson-audio?path=${encodeURIComponent(path)}`;

  // OCR ảnh đáp án → điền các dòng "<số> <đáp án>" vào ô dán nhanh.
  async function ocrQuickKey(file: File) {
    setQuickOcrBusy(true);
    setErr("");
    try {
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1] ?? "";
      const resp = await fetch("/api/admin/ocr-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({
          mimeType: file.type || "image/png",
          data: base64,
          hint: "Ảnh là ĐÁP ÁN (KEY) của 1 activity. CHỈ trả về các dòng dạng '<số> <đáp án>', mỗi đáp án một dòng, gộp các cột theo số tăng dần. Không header, không '::', không '*'.",
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "OCR lỗi");
      const lines = String(data.block || "")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => /^\d+[\s.):\-]+/.test(l));
      const text = lines.join("\n");
      if (!text) throw new Error("Không đọc được dòng đáp án nào từ ảnh.");
      setQuickKey((prev) => (prev.trim() ? prev.trim() + "\n" + text : text));
      flash(`Đã đọc ${lines.length} đáp án từ ảnh → kiểm tra rồi Áp`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Đọc ảnh thất bại.");
    } finally {
      setQuickOcrBusy(false);
    }
  }

  function onPasteQuickKey(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData?.items ?? []).find((it) => it.type.startsWith("image/"));
    if (item) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        ocrQuickKey(file);
      }
    }
  }

  function autoTitle(unit: number | null, section: string, activity: number | null): string {
    return [unit != null ? `Unit ${unit}` : null, section || null, activity != null ? `Activity ${activity}` : null]
      .filter(Boolean)
      .join(" · ");
  }

  // Cập nhật field; nếu đang ở chế độ tự điền và đổi unit/section/activity → cập nhật tiêu đề.
  function setEx(patch: Partial<Exercise>) {
    setEditing((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (titleAuto && ("unit" in patch || "section" in patch || "activity" in patch)) {
        next.title = autoTitle(next.unit, next.section, next.activity);
      }
      return next;
    });
  }

  // Nhập hàng loạt
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [preview, setPreview] = useState<{ exercises: ParsedExercise[]; errors: string[] } | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [mergeByKey, setMergeByKey] = useState(false);
  const [importMode, setImportMode] = useState<"questions" | "transcript" | "key">("questions");
  const [keyPreview, setKeyPreview] = useState<{ keys: ParsedKey[]; errors: string[] } | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("created_desc");

  // Transcript-mode luôn khớp theo Unit·Activity (ghép vào bài có sẵn).
  const effectiveMerge = importMode === "transcript" ? true : mergeByKey;
  const doPreview = () => {
    if (importMode === "key") setKeyPreview(parseKeys(importText));
    else setPreview(parseExercises(importText, importMode === "transcript"));
  };

  const sortedRows = [...rows].sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "unit") return (a.unit ?? 0) - (b.unit ?? 0) || (a.activity ?? 0) - (b.activity ?? 0);
    const ta = a.created_at ?? "";
    const tb = b.created_at ?? "";
    return sortBy === "created_asc" ? ta.localeCompare(tb) : tb.localeCompare(ta);
  });

  function onPasteImage(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData?.items ?? []).find((it) => it.type.startsWith("image/"));
    if (item) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault(); // chặn dán nhị phân vào ô text
        ocrImage(file);
      }
    }
  }

  async function ocrImage(file: File) {
    setOcrBusy(true);
    setErr("");
    try {
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1] ?? "";
      const resp = await fetch("/api/admin/ocr-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ mimeType: file.type || "image/png", data: base64 }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "OCR lỗi");
      // nối vào ô (giữ nội dung cũ nếu có)
      setImportText((prev) => (prev.trim() ? prev.trim() + "\n\n" + data.block : data.block));
      setPreview(null);
      const fb = Array.isArray(data.fellBackFrom) && data.fellBackFrom.length
        ? ` (đã chuyển từ ${data.fellBackFrom.join("→")} sang ${data.provider})`
        : ` · ${data.provider}`;
      flash(`Đã đọc ảnh${fb} → kiểm tra lại rồi Import`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Đọc ảnh thất bại.");
    } finally {
      setOcrBusy(false);
    }
  }

  const api = useCallback(
    async (method: string, body?: unknown, qs = "") => {
      const res = await fetch(`/api/admin/listening-exercises${qs}`, {
        method,
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
      return data;
    },
    [key],
  );

  const load = useCallback(async () => {
    const data = await api("GET");
    setRows(data.exercises ?? []);
  }, [api]);

  useEffect(() => {
    if (key) load().catch((e) => setErr(e instanceof Error ? e.message : "Lỗi tải."));
  }, [key, load]);

  // Tự ẩn thông báo lỗi sau 5s.
  useEffect(() => {
    if (!err) return;
    const t = setTimeout(() => setErr(""), 5000);
    return () => clearTimeout(t);
  }, [err]);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(""), 2500);
  }

  async function openEdit(id: string) {
    setErr("");
    try {
      const data = await api("GET", undefined, `?id=${id}`);
      const e = data.exercise;
      const loaded = {
        ...blankExercise(),
        ...e,
        section: e.section ?? "",
        instructions: e.instructions ?? "",
        transcript: e.transcript ?? "",
        items: e.items ?? [],
      };
      setEditing(loaded);
      // Nếu tiêu đề hiện tại đang đúng mẫu (hoặc trống) → giữ chế độ tự điền.
      setTitleAuto(!loaded.title || loaded.title === autoTitle(loaded.unit, loaded.section, loaded.activity));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tải được.");
    }
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api("POST", { action: "save", exercise: editing });
      flash("Đã lưu ✓");
      await load();
      await openEdit(r.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lưu thất bại.");
    } finally {
      setBusy(false);
    }
  }

  // Áp đáp án từ key vào 1 bài theo dạng câu hỏi của nó.
  function applyKey(type: string, items: Item[], answers: { n: number; value: string }[]): { items: Item[]; type?: string; misses: number } {
    const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[.,'"]/g, "").replace(/\s+/g, " ").trim();
    const sorted = [...answers].sort((a, b) => a.n - b.n);
    let misses = 0;
    if (type === "ordering") {
      // key: <vị trí> <tên> → dựng lại danh sách theo thứ tự đúng
      return { items: sorted.map((e) => ({ label: e.value })), misses: 0 };
    }
    const next = items.map((it) => ({ ...it }));
    for (const { n, value } of sorted) {
      const it = next[n - 1];
      if (!it) { misses++; continue; }
      if (type === "mc") {
        const opts = it.options ?? [];
        let idx = opts.findIndex((o) => norm(o) === norm(value));
        if (idx < 0) idx = opts.findIndex((o) => norm(o).includes(norm(value)) || norm(value).includes(norm(o)));
        if (idx >= 0) it.answer = idx; else misses++;
      } else if (type === "truefalse") {
        it.answer = /^(right|true|đúng|t|đ)$/i.test(value.trim());
      } else if (type === "fill") {
        it.answer = value.trim();
      }
    }
    return { items: next, misses };
  }

  // Dán đáp án nhanh cho bài đang sửa: "1 22 / 2 190" hoặc mỗi dòng một đáp án theo thứ tự.
  function applyQuickKey() {
    if (!editing) return;
    const lines = quickKey.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const numbered = lines.map((l) => l.match(/^(\d+)[\s.):\-]+(.+)$/)).filter(Boolean) as RegExpMatchArray[];
    const answers =
      numbered.length === lines.length
        ? numbered.map((m) => ({ n: parseInt(m[1], 10), value: m[2].trim() }))
        : lines.map((l, idx) => ({ n: idx + 1, value: l }));
    const { items, misses } = applyKey(editing.type, editing.items, answers);
    setEditing((p) => (p ? { ...p, items } : p));
    setQuickKey("");
    setQuickKeyOpen(false);
    flash(`Đã áp ${answers.length} đáp án${misses ? ` · ${misses} chưa khớp` : ""}`);
  }

  async function importKeys() {
    if (!keyPreview || keyPreview.keys.length === 0) return;
    setBusy(true);
    setErr("");
    try {
      type Full = { id: string; unit: number | null; section: string | null; activity: number | null; type: string; items: Item[]; transcript: string | null; audio_path: string | null; instructions: string | null; level: string };
      const data = await api("GET");
      const existing = (data.exercises ?? []) as Full[];
      const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
      let updated = 0, notFound = 0, totalMiss = 0;
      const skipped: string[] = [];
      for (const k of keyPreview.keys) {
        const match = existing.find(
          (e) => e.unit === k.unit && e.activity === k.activity && k.unit != null && k.activity != null && (!k.section || !e.section || norm(e.section) === norm(k.section)),
        );
        if (!match) { notFound++; skipped.push(`U${k.unit}·A${k.activity}`); continue; }
        const { items, misses } = applyKey(match.type, match.items ?? [], k.answers);
        totalMiss += misses;
        await api("POST", { action: "save", exercise: { ...match, items } });
        updated++;
      }
      flash(`Đáp án: cập nhật ${updated} bài${notFound ? `, ${notFound} không khớp` : ""}${totalMiss ? `, ${totalMiss} đáp án chưa khớp lựa chọn` : ""}`);
      if (skipped.length) setErr(`Không tìm thấy bài: ${skipped.join(", ")} (hãy tạo bài câu hỏi trước).`);
      setImportText("");
      setKeyPreview(null);
      setImportOpen(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cập nhật đáp án lỗi.");
    } finally {
      setBusy(false);
    }
  }

  async function importAll() {
    if (importMode === "key") return importKeys();
    if (!preview || preview.exercises.length === 0) return;
    setBusy(true);
    setErr("");
    let created = 0;
    let updated = 0;
    let done = 0;
    try {
      // Lấy danh sách hiện có (đủ trường) để khớp theo Unit·Activity nếu cần.
      type Full = { id: string; unit: number | null; section: string | null; activity: number | null; type: string; items: Item[]; transcript: string | null; audio_path: string | null; instructions: string | null; level: string };
      let existing: Full[] = [];
      if (effectiveMerge) {
        const data = await api("GET");
        existing = (data.exercises ?? []) as Full[];
      }
      const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
      const findMatch = (b: ParsedExercise): Full | undefined =>
        existing.find(
          (e) =>
            e.unit === b.unit &&
            e.activity === b.activity &&
            b.unit != null &&
            b.activity != null &&
            (!b.section || !e.section || norm(e.section) === norm(b.section)),
        );

      for (let i = 0; i < preview.exercises.length; i++) {
        const b = preview.exercises[i];
        const match = effectiveMerge ? findMatch(b) : undefined;
        if (match) {
          // Cập nhật bài có sẵn: ghép transcript; chỉ thay items/type khi khối có câu hỏi.
          await api("POST", {
            action: "save",
            exercise: {
              ...match,
              transcript: b.transcript || match.transcript,
              instructions: b.instructions || match.instructions,
              items: b.items.length ? b.items : match.items,
              type: b.items.length ? b.type : match.type,
            },
          });
          updated++;
        } else {
          await api("POST", { action: "save", exercise: { ...b, sort_order: i } });
          created++;
        }
        done++;
      }
      flash(`Xong: tạo mới ${created}, cập nhật ${updated} bài ✓`);
      setImportText("");
      setPreview(null);
      setImportOpen(false);
      await load();
    } catch (e) {
      setErr(`Import dừng ở bài ${done + 1}: ${e instanceof Error ? e.message : "lỗi"}`);
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisible(r: Row) {
    try {
      await api("POST", { action: "toggleVisible", id: r.id, visible: !r.visible });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi.");
    }
  }

  async function del(r: Row) {
    if (!confirm(`Xoá "${r.title}"?`)) return;
    try {
      await api("POST", { action: "delete", id: r.id });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi.");
    }
  }

  async function uploadAudio(file: File) {
    if (!editing?.id) {
      setErr("Lưu bài trước rồi mới tải audio.");
      return;
    }
    setUploadingAudio(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("target", "exercise");
      fd.append("id", editing.id);
      const res = await fetch("/api/admin/lesson-audio", { method: "POST", headers: { "x-admin-key": key }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload lỗi");
      flash("Đã tải audio ✓");
      await openEdit(editing.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload thất bại.");
    } finally {
      setUploadingAudio(false);
    }
  }

  async function deleteAudio() {
    if (!editing?.id || !editing.audio_path) return;
    if (!confirm("Xoá audio của bài này?")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/lesson-audio?target=exercise&id=${editing.id}&path=${encodeURIComponent(editing.audio_path)}`,
        { method: "DELETE", headers: { "x-admin-key": key } },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xoá lỗi");
      flash("Đã xoá audio ✓");
      await openEdit(editing.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xoá thất bại.");
    } finally {
      setBusy(false);
    }
  }

  // ── items helpers ───────────────────────────────
  const setItems = (items: Item[]) => setEditing((p) => (p ? { ...p, items } : p));
  const upd = (i: number, patch: Partial<Item>) =>
    setEditing((p) => (p ? { ...p, items: p.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) } : p));
  function addItem() {
    if (!editing) return;
    const t = editing.type;
    const blank: Item =
      t === "mc" ? { prompt: "", options: ["", "", ""], answer: 0 }
      : t === "truefalse" ? { prompt: "", answer: true }
      : t === "fill" ? { prompt: "", answer: "" }
      : t === "ordering" ? { label: "" }
      : { text: "" };
    setItems([...editing.items, blank]);
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Toast nổi — luôn thấy dù đang cuộn ở đâu */}
      {(msg || err) && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 px-4">
          <div className={`rounded-xl px-4 py-2.5 text-sm font-black shadow-2xl border ${err ? "bg-rose-600 border-rose-400 text-white" : "bg-teal-600 border-teal-400 text-white"}`}>
            {err ? `✕ ${err}` : `✓ ${msg}`}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <p className="text-sm font-bold text-zinc-400">{rows.length} bài tập nghe</p>
        <div className="flex items-center gap-2">
          {!editing && (
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200">
              <option value="created_desc">Mới tạo trước</option>
              <option value="created_asc">Cũ trước</option>
              <option value="title">Tên (A→Z)</option>
              <option value="unit">Theo Unit · Activity</option>
            </select>
          )}
          {!editing && <button onClick={() => { setEditing(blankExercise()); setTitleAuto(true); }} className="rounded-xl bg-primary text-primary-fg px-4 py-2 text-xs font-black active:scale-95">+ Bài tập mới</button>}
        </div>
      </div>

      {!editing && (
        <div className="mb-5 rounded-2xl border border-white/10 bg-zinc-900/40">
          <button onClick={() => setImportOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-left">
            <span className="text-sm font-black text-zinc-100">⬇ Nhập hàng loạt (dán text)</span>
            <span className="text-xs font-bold text-zinc-500">{importOpen ? "▲" : "▼"}</span>
          </button>
          {importOpen && (
            <div className="border-t border-white/10 p-4 space-y-3">
              {/* Tab chế độ */}
              <div className="flex gap-1 rounded-xl bg-zinc-800/60 p-1 w-fit">
                {(["questions", "transcript", "key"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setImportMode(m); setPreview(null); setKeyPreview(null); }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-black transition-colors ${importMode === m ? "bg-primary text-primary-fg" : "text-zinc-400 hover:text-zinc-100"}`}
                  >
                    {m === "questions" ? "📝 Câu hỏi" : m === "transcript" ? "📄 Transcript" : "🔑 Đáp án"}
                  </button>
                ))}
              </div>

              <p className="text-[11px] font-semibold text-zinc-400">
                {importMode === "questions" ? (
                  <>Mỗi bài bắt đầu bằng <code className="text-primary">=== EXERCISE ===</code>. Dán nhiều bài, hoặc <b className="text-primary">dán ảnh (Ctrl+V)</b> để AI tự đọc.</>
                ) : importMode === "transcript" ? (
                  <>Dán <b className="text-primary">trang transcript</b> (mỗi Activity một khối). Mọi dòng được coi là lời thoại — <b>không</b> bị hiểu nhầm thành câu hỏi. Tự khớp vào bài cùng <b>Unit·Activity</b>.</>
                ) : (
                  <>Dán <b className="text-primary">trang Answer Key</b>. Mỗi khối là 1 Activity + danh sách <code className="text-primary">&lt;số&gt; &lt;đáp án&gt;</code>. Tự khớp vào bài cùng <b>Unit·Activity</b> và điền đáp án đúng theo dạng câu hỏi (bài câu hỏi phải tạo trước).</>
                )}
              </p>
              <textarea
                value={importText}
                onChange={(e) => { setImportText(e.target.value); setPreview(null); setKeyPreview(null); }}
                onPaste={onPasteImage}
                placeholder={importMode === "transcript"
                  ? `Dán ảnh trang transcript (Ctrl+V), hoặc gõ:\n\n=== EXERCISE ===\nunit: 1\nsection: Numbers\nactivity: 1\n(toàn bộ lời thoại của Activity 1…)`
                  : importMode === "key"
                  ? `Dán ảnh trang KEY (Ctrl+V), hoặc gõ:\n\n=== EXERCISE ===\nunit: 1\nsection: Numbers\nactivity: 2\n1 22\n2 190\n3 13`
                  : `Dán ảnh trang sách bằng Ctrl+V, hoặc gõ theo mẫu:\n\n${IMPORT_HINT}`}
                rows={10}
                className="le-inp font-mono !text-[11px]"
                style={{ whiteSpace: "pre" }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className={`rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-black cursor-pointer ${ocrBusy ? "text-zinc-500" : "text-primary"}`}>
                  {ocrBusy ? "Đang đọc ảnh…" : "📷 Ảnh → khối (AI)"}
                  <input type="file" accept="image/*" hidden disabled={ocrBusy} onChange={(e) => e.target.files?.[0] && ocrImage(e.target.files[0])} />
                </label>
                <button onClick={doPreview} disabled={!importText.trim()} className="rounded-xl border border-white/15 px-4 py-2 text-xs font-black text-zinc-200 disabled:opacity-40">Xem trước</button>
                {importMode === "key" ? (
                  <button onClick={importAll} disabled={busy || !keyPreview || keyPreview.keys.length === 0} className="rounded-xl bg-primary text-primary-fg px-4 py-2 text-xs font-black disabled:opacity-40">
                    {busy ? "Đang cập nhật…" : `Cập nhật đáp án ${keyPreview?.keys.length ?? 0} bài`}
                  </button>
                ) : (
                  <button onClick={importAll} disabled={busy || !preview || preview.exercises.length === 0} className="rounded-xl bg-primary text-primary-fg px-4 py-2 text-xs font-black disabled:opacity-40">
                    {busy ? "Đang import…" : `Import ${preview?.exercises.length ?? 0} bài`}
                  </button>
                )}
                <button onClick={() => setImportText(importMode === "transcript" ? "=== EXERCISE ===\nunit: 1\nsection: Numbers\nactivity: 1\n(dán lời thoại của Activity 1 ở đây)" : importMode === "key" ? "=== EXERCISE ===\nunit: 1\nsection: Numbers\nactivity: 2\n1 22\n2 190\n3 13" : IMPORT_HINT)} className="text-[11px] font-bold text-primary">Chèn mẫu</button>
              </div>
              {importMode === "questions" ? (
                <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-300 cursor-pointer">
                  <input type="checkbox" checked={mergeByKey} onChange={(e) => setMergeByKey(e.target.checked)} />
                  Khớp & cập nhật theo Unit·Activity (khi sửa bài đã có)
                </label>
              ) : importMode === "transcript" ? (
                <p className="text-[11px] font-bold text-teal-400">↪ Tự khớp vào bài có cùng Unit·Activity (chỉ cập nhật transcript, giữ nguyên câu hỏi & audio).</p>
              ) : (
                <p className="text-[11px] font-bold text-teal-400">↪ Tự khớp vào bài cùng Unit·Activity & điền đáp án theo dạng (trắc nghiệm→chọn đúng, Đúng/Sai, điền, đánh số).</p>
              )}
              {preview && (
                <div className="text-xs">
                  <p className="font-black text-teal-400">✓ Đọc được {preview.exercises.length} bài</p>
                  {preview.errors.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-rose-400">
                      {preview.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                  {preview.exercises.length > 0 && (
                    <ul className="mt-1.5 list-disc pl-5 text-zinc-400">
                      {preview.exercises.slice(0, 8).map((e, i) => <li key={i}>{e.title} <span className="text-zinc-600">({e.type}, {e.items.length} câu)</span></li>)}
                      {preview.exercises.length > 8 && <li>…và {preview.exercises.length - 8} bài nữa</li>}
                    </ul>
                  )}
                </div>
              )}
              {keyPreview && (
                <div className="text-xs">
                  <p className="font-black text-teal-400">✓ Đọc được {keyPreview.keys.length} bộ đáp án</p>
                  {keyPreview.errors.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-rose-400">
                      {keyPreview.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                  {keyPreview.keys.length > 0 && (
                    <ul className="mt-1.5 list-disc pl-5 text-zinc-400">
                      {keyPreview.keys.slice(0, 8).map((k, i) => <li key={i}>U{k.unit ?? "?"}·A{k.activity ?? "?"} {k.section && <span className="text-zinc-600">{k.section}</span>} <span className="text-zinc-600">({k.answers.length} đáp án)</span></li>)}
                      {keyPreview.keys.length > 8 && <li>…và {keyPreview.keys.length - 8} bộ nữa</li>}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!editing && (
        <div className="space-y-2">
          {sortedRows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-3">
              <span className="text-[10px] font-black text-zinc-500 w-12">U{r.unit ?? "?"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate text-zinc-100">{r.title}</p>
                <p className="text-[10px] text-zinc-500">{TYPES.find((t) => t.v === r.type)?.label} · {r.level} {r.audio_path ? "· 🔊" : ""}</p>
              </div>
              <button onClick={() => toggleVisible(r)} className={`text-[10px] font-black px-2 py-1 rounded-lg ${r.visible ? "bg-teal-500/15 text-teal-400" : "bg-white/5 text-zinc-500"}`}>{r.visible ? "Hiện" : "Ẩn"}</button>
              <button onClick={() => openEdit(r.id)} className="text-xs font-black text-primary">Sửa →</button>
              <button onClick={() => del(r)} className="text-xs font-black text-rose-400">✕</button>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-zinc-500">Chưa có bài tập. Bấm “+ Bài tập mới”.</p>}
        </div>
      )}

      {editing && (
        <div className="space-y-4">
          {/* Thanh hành động dính ở đầu — Lưu luôn trong tầm tay */}
          <div className="sticky top-0 z-20 -mx-5 md:-mx-8 flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/90 px-5 md:px-8 py-3 backdrop-blur">
            <button onClick={() => setEditing(null)} className="text-xs font-black text-zinc-400 hover:text-zinc-100">← Danh sách</button>
            <span className="hidden sm:block flex-1 truncate text-center text-xs font-bold text-zinc-500">{editing.title || "Bài tập mới"}</span>
            <button onClick={save} disabled={busy} className="rounded-xl bg-primary px-5 py-2 text-xs font-black text-primary-fg active:scale-95 disabled:opacity-40">
              {busy ? "Đang lưu…" : "💾 Lưu bài tập"}
            </button>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <L label="Unit"><input type="number" className="le-inp" value={editing.unit ?? ""} onChange={(e) => setEx({ unit: e.target.value ? +e.target.value : null })} /></L>
            <L label="Activity"><input type="number" className="le-inp" value={editing.activity ?? ""} onChange={(e) => setEx({ activity: e.target.value ? +e.target.value : null })} /></L>
            <L label="CD"><input type="number" className="le-inp" value={editing.cd ?? ""} onChange={(e) => setEditing({ ...editing, cd: e.target.value ? +e.target.value : null })} /></L>
            <L label="Track"><input type="number" className="le-inp" value={editing.track ?? ""} onChange={(e) => setEditing({ ...editing, track: e.target.value ? +e.target.value : null })} /></L>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <L label="Section"><input className="le-inp" value={editing.section} onChange={(e) => setEx({ section: e.target.value })} /></L>
            <L label={titleAuto ? "Tiêu đề (tự điền)" : "Tiêu đề"}>
              <div className="flex gap-1.5">
                <input className="le-inp" value={editing.title} onChange={(e) => { setEditing({ ...editing, title: e.target.value }); setTitleAuto(false); }} placeholder="Unit 1 · Telephone numbers · Activity 1" />
                {!titleAuto && (
                  <button type="button" title="Tự điền lại theo Unit·Section·Activity"
                    onClick={() => { setTitleAuto(true); setEditing((p) => (p ? { ...p, title: autoTitle(p.unit, p.section, p.activity) } : p)); }}
                    className="shrink-0 rounded-lg border border-white/15 px-2 text-xs font-black text-primary">↻</button>
                )}
              </div>
            </L>
            <L label="Cấp độ"><input className="le-inp" value={editing.level} onChange={(e) => setEditing({ ...editing, level: e.target.value })} /></L>
            <L label="Dạng câu hỏi">
              <select className="le-inp" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as Exercise["type"], items: [] })}>
                {TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
            </L>
          </div>
          <L label="Đề bài (instructions)"><textarea rows={2} className="le-inp" value={editing.instructions} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} /></L>

          {/* Audio */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎧</span>
              <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Audio bài tập</span>
              {editing.audio_path ? (
                <span className="ml-auto rounded-full bg-teal-500/15 px-2.5 py-0.5 text-[10px] font-black text-teal-400">Đã có</span>
              ) : (
                <span className="ml-auto rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-black text-zinc-500">Chưa có</span>
              )}
            </div>

            {!editing.id ? (
              <p className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[11px] font-bold text-amber-400">
                ⚠ Bấm “Lưu bài tập” trước, rồi mới tải audio.
              </p>
            ) : (
              <>
                {editing.audio_path && (
                  <audio
                    controls
                    src={`/api/lesson-audio?path=${encodeURIComponent(editing.audio_path)}`}
                    className="w-full mb-3"
                  />
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`rounded-xl border px-4 py-2 text-xs font-black cursor-pointer transition-colors ${uploadingAudio ? "border-white/10 text-zinc-500" : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"}`}>
                    {uploadingAudio ? "Đang tải…" : editing.audio_path ? "🔁 Đổi audio" : "⬆ Tải audio"}
                    <input type="file" accept="audio/*" hidden disabled={uploadingAudio} onChange={(e) => e.target.files?.[0] && uploadAudio(e.target.files[0])} />
                  </label>
                  {editing.audio_path && (
                    <button onClick={deleteAudio} disabled={busy} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-black text-rose-400 hover:bg-rose-500/15 disabled:opacity-40">
                      🗑 Xoá audio
                    </button>
                  )}
                  {editing.audio_path && (
                    <span className="text-[10px] font-mono text-zinc-600 truncate max-w-[40%]">{editing.audio_path}</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Items theo dạng */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Câu hỏi ({editing.items.length})</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setGridOpen((v) => !v)} className="text-xs font-black text-amber-400">🖼 Cắt ảnh lưới</button>
                {editing.type !== "speaking" && editing.items.length > 0 && (
                  <button onClick={() => setQuickKeyOpen((v) => !v)} className="text-xs font-black text-teal-400">🔑 Dán đáp án nhanh</button>
                )}
                <button onClick={addItem} className="text-xs font-black text-primary">+ Thêm</button>
              </div>
            </div>

            {gridOpen && (
              <div className="mb-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-3">
                <p className="text-[11px] font-bold text-zinc-300">
                  Dán/tải <b className="text-amber-400">ảnh lưới</b> → căn lưới teal trùng các hình rồi bấm Cắt. Chỉnh <b>lề</b> để bỏ tiêu đề/mép thừa.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-[11px] font-bold text-zinc-300">Cột <input type="number" min={1} value={gridCols} onChange={(e) => setGridCols(+e.target.value || 1)} className="le-inp !w-16 ml-1 inline-block" /></label>
                  <label className="text-[11px] font-bold text-zinc-300">Hàng <input type="number" min={1} value={gridRows} onChange={(e) => setGridRows(+e.target.value || 1)} className="le-inp !w-16 ml-1 inline-block" /></label>
                  <span className="text-[11px] font-black text-amber-400">= {gridCols * gridRows} ô</span>
                </div>

                {!gridSrc ? (
                  <div
                    onPaste={onPasteGrid}
                    tabIndex={0}
                    className="rounded-xl border-2 border-dashed border-amber-500/40 bg-black/20 p-4 text-center text-[11px] font-bold text-zinc-400 outline-none focus:border-amber-400"
                  >
                    Bấm vào đây rồi <b className="text-amber-400">Ctrl+V</b> để dán ảnh lưới
                    <div className="mt-2">
                      <label className="inline-block rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-amber-400 cursor-pointer">
                        hoặc chọn file
                        <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && loadGridFile(e.target.files[0])} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <>
                    <canvas ref={previewRef} className="max-w-full rounded-lg border border-white/10 bg-white" />
                    {/* Lề (top/right/bottom/left) % */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(["top", "right", "bottom", "left"] as const).map((side) => (
                        <label key={side} className="text-[10px] font-bold text-zinc-400">
                          Lề {side === "top" ? "trên" : side === "right" ? "phải" : side === "bottom" ? "dưới" : "trái"}: {gm[side]}%
                          <input type="range" min={0} max={40} value={gm[side]} onChange={(e) => setGm({ ...gm, [side]: +e.target.value })} className="w-full accent-amber-500" />
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={doGridCut} disabled={gridBusy} className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40">
                        {gridBusy ? "Đang cắt & tải…" : `✂️ Cắt ${gridCols * gridRows} ô → thêm câu`}
                      </button>
                      <button onClick={() => { setGridSrc(null); gridImgRef.current = null; setGm({ top: 0, right: 0, bottom: 0, left: 0 }); }} className="text-[11px] font-bold text-zinc-400">Chọn ảnh khác</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {quickKeyOpen && editing.type !== "speaking" && (
              <div className="mb-3 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-3 space-y-2">
                <p className="text-[11px] font-bold text-zinc-300">
                  Dán đáp án theo thứ tự câu (mỗi dòng 1 đáp án, hoặc dạng <code className="text-teal-400">1 đáp_án</code>),
                  hoặc <b className="text-teal-400">dán ảnh đáp án (Ctrl+V)</b> để AI tự đọc. Áp vào {editing.items.length} câu hiện có.
                </p>
                <textarea
                  value={quickKey}
                  onChange={(e) => setQuickKey(e.target.value)}
                  onPaste={onPasteQuickKey}
                  rows={Math.min(8, Math.max(3, editing.items.length))}
                  placeholder={quickOcrBusy ? "Đang đọc ảnh…" : editing.type === "truefalse" ? "Dán ảnh (Ctrl+V) hoặc gõ:\nright\nwrong\nright" : editing.type === "mc" ? "Dán ảnh (Ctrl+V) hoặc gõ:\n22\n190\n13" : "Dán ảnh (Ctrl+V) hoặc gõ:\nOxford 64711\n021 930 2738"}
                  className="le-inp font-mono !text-[11px]"
                  style={{ whiteSpace: "pre" }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`rounded-xl border border-teal-500/40 bg-teal-500/10 px-3 py-2 text-[11px] font-black cursor-pointer ${quickOcrBusy ? "text-zinc-500" : "text-teal-400"}`}>
                    {quickOcrBusy ? "Đang đọc ảnh…" : "📷 Ảnh đáp án"}
                    <input type="file" accept="image/*" hidden disabled={quickOcrBusy} onChange={(e) => e.target.files?.[0] && ocrQuickKey(e.target.files[0])} />
                  </label>
                  <button onClick={applyQuickKey} disabled={!quickKey.trim()} className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40">Áp vào câu hỏi</button>
                  <button onClick={() => { setQuickKey(""); setQuickKeyOpen(false); }} className="text-[11px] font-bold text-zinc-400">Đóng</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {editing.items.map((it, i) => {
                const answered =
                  editing.type === "mc" ? typeof it.answer === "number" && (it.options ?? [])[it.answer as number]?.trim()
                  : editing.type === "truefalse" ? typeof it.answer === "boolean"
                  : editing.type === "fill" ? !!(it.answer as string)?.trim()
                  : editing.type === "ordering" ? !!it.label?.trim()
                  : true;
                return (
                <div key={i} className="rounded-2xl border border-white/10 bg-zinc-900/40 p-3 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[10px] font-black text-zinc-400">{i + 1}</span>
                    {!answered && editing.type !== "speaking" && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-black text-amber-400">chưa có đáp án</span>
                    )}
                    <button onClick={() => setItems(editing.items.filter((_, idx) => idx !== i))} className="ml-auto text-xs text-rose-400 font-black">✕</button>
                  </div>

                  {/* Ảnh của câu (nếu có) */}
                  {it.image && (
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgSrc(it.image)} alt="" className="h-16 w-16 rounded-lg object-cover border border-white/10 bg-white" />
                      <button onClick={() => upd(i, { image: undefined })} className="text-[10px] font-black text-rose-400">Gỡ ảnh</button>
                    </div>
                  )}

                  {/* phần CÂU HỎI */}
                  {editing.type === "mc" && (
                    <input className="le-inp" placeholder="Câu / nhãn (vd: The price)" value={it.prompt ?? ""} onChange={(e) => upd(i, { prompt: e.target.value })} />
                  )}
                  {editing.type === "truefalse" && (
                    <input className="le-inp" placeholder="Mệnh đề cần xác định Đúng/Sai" value={it.prompt ?? ""} onChange={(e) => upd(i, { prompt: e.target.value })} />
                  )}
                  {editing.type === "fill" && (
                    <input className="le-inp" placeholder="Câu / nhãn (vd: John Radcliffe Hospital)" value={it.prompt ?? ""} onChange={(e) => upd(i, { prompt: e.target.value })} />
                  )}
                  {editing.type === "ordering" && (
                    <input className="le-inp" placeholder={`Mục thứ ${i + 1}`} value={it.label ?? ""} onChange={(e) => upd(i, { label: e.target.value })} />
                  )}
                  {editing.type === "speaking" && (
                    <input className="le-inp" placeholder="Câu/cụm để nói" value={it.text ?? ""} onChange={(e) => upd(i, { text: e.target.value })} />
                  )}

                  {/* phần ĐÁP ÁN riêng */}
                  {editing.type !== "speaking" && (
                    <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-2.5">
                      <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-teal-400">✅ Đáp án</p>

                      {editing.type === "mc" && (
                        <div className="space-y-1.5">
                          {(it.options ?? []).map((opt, oi) => {
                            const correct = it.answer === oi;
                            return (
                              <div key={oi} className="flex items-center gap-2">
                                <button type="button" title="Đặt làm đáp án đúng" onClick={() => upd(i, { answer: oi })}
                                  className={`h-5 w-5 shrink-0 rounded-full border text-[10px] font-black flex items-center justify-center ${correct ? "border-teal-400 bg-teal-500 text-white" : "border-white/20 text-transparent hover:border-teal-400/60"}`}>✓</button>
                                <input className={`le-inp ${correct ? "!border-teal-500/50" : ""}`} placeholder={`Lựa chọn ${oi + 1}`} value={opt} onChange={(e) => upd(i, { options: (it.options ?? []).map((o, k) => (k === oi ? e.target.value : o)) })} />
                                <button onClick={() => upd(i, { options: (it.options ?? []).filter((_, k) => k !== oi), answer: it.answer === oi ? 0 : it.answer })} className="text-rose-400 text-xs shrink-0">✕</button>
                              </div>
                            );
                          })}
                          <button onClick={() => upd(i, { options: [...(it.options ?? []), ""] })} className="text-[10px] font-black text-primary">+ lựa chọn</button>
                          <p className="text-[9px] text-zinc-500">Bấm dấu ✓ bên trái lựa chọn để chọn đáp án đúng.</p>
                        </div>
                      )}

                      {editing.type === "truefalse" && (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => upd(i, { answer: true })} className={`rounded-lg px-4 py-1.5 text-xs font-black ${it.answer === true ? "bg-teal-500 text-white" : "bg-white/5 text-zinc-300"}`}>Đúng (right)</button>
                          <button type="button" onClick={() => upd(i, { answer: false })} className={`rounded-lg px-4 py-1.5 text-xs font-black ${it.answer === false ? "bg-rose-500 text-white" : "bg-white/5 text-zinc-300"}`}>Sai (wrong)</button>
                        </div>
                      )}

                      {editing.type === "fill" && (
                        <input className="le-inp" placeholder="Nhập đáp án đúng (vd: Oxford 64711)" value={(it.answer as string) ?? ""} onChange={(e) => upd(i, { answer: e.target.value })} />
                      )}

                      {editing.type === "ordering" && (
                        <p className="text-[10px] font-bold text-zinc-400">Thứ tự nghe đúng = <span className="text-teal-400">vị trí {i + 1}</span> (sắp các mục đúng thứ tự là xong).</p>
                      )}
                    </div>
                  )}
                </div>
              );})}
            </div>
          </div>

          <L label="Transcript (tuỳ chọn)"><textarea rows={3} className="le-inp" value={editing.transcript} onChange={(e) => setEditing({ ...editing, transcript: e.target.value })} /></L>

          <button onClick={save} disabled={busy} className="w-full rounded-xl bg-primary text-primary-fg py-3 text-sm font-black disabled:opacity-40">{busy ? "Đang lưu…" : "Lưu bài tập"}</button>
        </div>
      )}

      <style jsx>{`
        :global(.le-inp) {
          width: 100%;
          border-radius: 0.6rem;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
          color: #f4f4f5;
          padding: 0.45rem 0.7rem;
          font-size: 0.8rem;
          font-weight: 600;
        }
        :global(.le-inp::placeholder) { color: #71717a; }
        :global(.le-inp:focus) { outline: none; border-color: var(--primary, #2b788b); }
        :global(select.le-inp) { background: #18181b; }
        :global(.le-inp option) { background: #18181b; color: #f4f4f5; }
      `}</style>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
