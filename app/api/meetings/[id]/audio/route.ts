import { getSessionUser, unauthorized } from "@/lib/auth";
import { findOwnMeeting } from "@/lib/meetings";
import { readAudio } from "@/lib/storage";

// 回應給瀏覽器的標頭（其餘 Blob 回應標頭不轉出去）
const PASS_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];

// GET /api/meetings/:id/audio → 串流播放錄音檔（只能聽自己的）
// 錄音檔的真實網址不會給前端，一律從這裡經過擁有者檢查再轉出去
export async function GET(request: Request, ctx: RouteContext<"/api/meetings/[id]/audio">) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const meeting = await findOwnMeeting(user.userId, (await ctx.params).id);
  if (!meeting?.audio?.url) return Response.json({ error: "找不到錄音檔" }, { status: 404 });

  const range = request.headers.get("range");
  const blob = await readAudio(meeting.audio, range);
  if (!blob?.stream) return Response.json({ error: "找不到錄音檔" }, { status: 404 });

  const headers = new Headers({ "cache-control": "private, max-age=3600" });
  for (const h of PASS_HEADERS) {
    const v = blob.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.has("content-type") && meeting.audio.contentType) {
    headers.set("content-type", meeting.audio.contentType);
  }
  return new Response(blob.stream, {
    status: headers.has("content-range") ? 206 : 200,
    headers,
  });
}
