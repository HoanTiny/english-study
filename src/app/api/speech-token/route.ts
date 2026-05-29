export const runtime = "nodejs";

// Cấp token Azure Speech ngắn hạn (~10 phút) cho client dùng SDK chấm phát âm.
// Key gốc (AZURE_SPEECH_KEY) chỉ nằm ở server, không bao giờ gửi xuống client.
export async function GET() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    return Response.json({ configured: false });
  }

  try {
    const res = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Length": "0",
        },
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("speech-token error", res.status, detail.slice(0, 200));
      return Response.json({ configured: false, error: "token_failed" });
    }
    const token = await res.text();
    return Response.json({ configured: true, token, region });
  } catch (e) {
    console.error("speech-token exception", e);
    return Response.json({ configured: false, error: "exception" });
  }
}
