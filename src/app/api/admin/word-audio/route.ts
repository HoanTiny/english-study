import { NextRequest, NextResponse } from "next/server";
import { adminConfigured, checkCms } from "@/lib/server/supabaseAdmin";
import { audioDatabase, storedPronunciation } from "@/lib/server/storedPronunciation";
import { importWordAudio, listWordAudio, removeWordAudio, saveWordAudio } from "@/lib/server/wordAudioStore.mjs";
import { audioFormat, MAX_AUDIO_BYTES, normalizeAudioWord, validAccent, validAudioWord } from "@/lib/server/wordAudioSource.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const failure = (error: unknown) => json({ error: error instanceof Error ? error.message : "Không xử lý được audio." }, 503);
async function authorize(req: Request) {
  if (!adminConfigured()) return json({ error: "Chưa cấu hình kho audio." }, 503);
  if (!(await checkCms(req))) return json({ error: "Cần quyền admin hoặc biên tập viên." }, 403);
}

export async function GET(req: NextRequest) {
  const denied = await authorize(req); if (denied) return denied;
  try {
    const word = req.nextUrl.searchParams.get("word");
    if (word !== null) {
      if (!validAudioWord(word)) return json({ error: "Từ không hợp lệ." }, 400);
      return json(await storedPronunciation(normalizeAudioWord(word)) ?? { found: false });
    }
    return json({ rows: await listWordAudio(audioDatabase()) });
  } catch (error) { return failure(error); }
}

export async function POST(req: NextRequest) {
  const denied = await authorize(req); if (denied) return denied;
  if (Number(req.headers.get("content-length") ?? 0) > MAX_AUDIO_BYTES + 65536) return json({ error: "Audio tối đa 2 MB." }, 413);
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json();
      if (body.action !== "import" || !validAudioWord(body.word)) return json({ error: "Yêu cầu nhập audio không hợp lệ." }, 400);
      return json(await importWordAudio(audioDatabase(), body.word));
    }
    const form = await req.formData();
    const word = String(form.get("word") ?? "").trim(), accent = form.get("accent");
    const ipa = String(form.get("ipa") ?? "").trim().slice(0, 200) || null;
    const file = form.get("file");
    if (!validAudioWord(word) || !validAccent(accent) || !(file instanceof File)) return json({ error: "Chọn từ, giọng và file audio." }, 400);
    if (!file.size || file.size > MAX_AUDIO_BYTES) return json({ error: "Audio phải từ 1 byte đến 2 MB." }, 413);
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!audioFormat(bytes)) return json({ error: "Chỉ nhận file MP3, OGG hoặc WAV hợp lệ." }, 400);
    await saveWordAudio(audioDatabase(), { word, accent: String(accent), bytes, ipa });
    return json({ ok: true });
  } catch (error) { return failure(error); }
}

export async function DELETE(req: NextRequest) {
  const denied = await authorize(req); if (denied) return denied;
  const word = req.nextUrl.searchParams.get("word"), accent = req.nextUrl.searchParams.get("accent");
  if (!validAudioWord(word) || !validAccent(accent)) return json({ error: "Từ hoặc giọng không hợp lệ." }, 400);
  try { await removeWordAudio(audioDatabase(), word, accent); return json({ ok: true }); }
  catch (error) { return failure(error); }
}
