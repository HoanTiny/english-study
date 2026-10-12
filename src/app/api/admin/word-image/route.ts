import { NextRequest, NextResponse } from "next/server";
import { adminConfigured, checkCms, supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { manualImageKey, validImagePath, WORD_IMAGE_BUCKET } from "@/lib/server/wordImages";

export const runtime = "nodejs";
const MAX_BYTES = 2 * 1024 * 1024;
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const validWord = (word: string, meaning: string) => word.length > 0 && word.length <= 160 && meaning.length <= 300 && /[a-z]/i.test(word);
async function authorize(req: Request) {
  if (!adminConfigured()) return fail("Chưa cấu hình lưu ảnh.", 503);
  if (!(await checkCms(req))) return fail("Cần quyền admin hoặc biên tập viên.", 403);
}
async function previousPath(key: string) {
  const { data, error } = await supabaseAdmin().from("word_images").select("payload").eq("cache_key", key).maybeSingle();
  if (error) throw new Error("Không đọc được dữ liệu ảnh. Kiểm tra bảng word_images.");
  return data?.payload?.origin === "upload" && validImagePath(data.payload.path) ? data.payload.path as string : null;
}

export async function POST(req: NextRequest) {
  const denied = await authorize(req); if (denied) return denied;
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 65536) return fail("Ảnh tối đa 2 MB.", 413);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const word = String(form?.get("word") ?? "").trim(), meaning = String(form?.get("meaning") ?? "").trim();
  if (!validWord(word, meaning) || !(file instanceof File)) return fail("Chọn từ, nghĩa và một file ảnh.");
  if (!file.size || file.size > MAX_BYTES) return fail("Ảnh phải nhỏ hơn hoặc bằng 2 MB.", 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "png"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "jpg"
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "webp" : null;
  const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  if (!ext || file.type !== mime) return fail("Chỉ nhận ảnh PNG, JPG hoặc WebP hợp lệ.");
  const db = supabaseAdmin(), key = manualImageKey(word, meaning);
  const path = `vocab-images/${key}/${crypto.randomUUID()}.${ext}`;
  try {
    const oldPath = await previousPath(key);
    const { error: uploadError } = await db.storage.from(WORD_IMAGE_BUCKET).upload(path, bytes, { contentType: mime, cacheControl: "31536000", upsert: false });
    if (uploadError) return fail("Không tải được ảnh. Kiểm tra bucket lesson-audio trong Supabase.", 503);
    const { error } = await db.from("word_images").upsert({ cache_key: key, word, meaning, payload: { origin: "upload", path, results: [] }, expires_at: "2100-01-01T00:00:00Z", updated_at: new Date().toISOString() });
    if (error) {
      await db.storage.from(WORD_IMAGE_BUCKET).remove([path]);
      return fail("Không lưu được ảnh cho từ này. Vui lòng thử lại.", 503);
    }
    if (oldPath) await db.storage.from(WORD_IMAGE_BUCKET).remove([oldPath]).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch { return fail("Không lưu được ảnh. Kiểm tra bảng word_images và thử lại.", 503); }
}

export async function DELETE(req: NextRequest) {
  const denied = await authorize(req); if (denied) return denied;
  const word = (req.nextUrl.searchParams.get("word") ?? "").trim(), meaning = (req.nextUrl.searchParams.get("meaning") ?? "").trim();
  if (!validWord(word, meaning)) return fail("Từ hoặc nghĩa không hợp lệ.");
  try {
    const key = manualImageKey(word, meaning), path = await previousPath(key), db = supabaseAdmin();
    const { error } = await db.from("word_images").delete().eq("cache_key", key);
    if (error) return fail("Không gỡ được ảnh. Vui lòng thử lại.", 503);
    if (path) await db.storage.from(WORD_IMAGE_BUCKET).remove([path]).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch { return fail("Không gỡ được ảnh. Vui lòng thử lại.", 503); }
}
