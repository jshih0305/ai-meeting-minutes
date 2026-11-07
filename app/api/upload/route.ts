import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { ALLOWED_UPLOAD_TYPES, MAX_AUDIO_BYTES, extensionOf, AUDIO_EXTENSIONS, userAudioPrefix } from "@/lib/audio";

// POST /api/upload
// 瀏覽器直傳 Blob 的第一步：發一張「只能上傳一個錄音檔到自己資料夾」的臨時許可（client token）。
// 檔案本身不經過這台伺服器，所以不受 Vercel 4.5MB 請求大小限制。
export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "請用 JSON 格式送出" }, { status: 400 });
  }

  // 只處理「要上傳許可」；上傳完成通知我們用不到（之後由瀏覽器呼叫 /api/transcribe）
  if (body.type !== "blob.generate-client-token") {
    return Response.json({ error: "不支援的請求" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // 只能上傳到自己的資料夾，而且副檔名要是支援的音檔
        if (!pathname.startsWith(userAudioPrefix(user.userId)) || pathname.includes("..")) {
          throw new Error("上傳路徑不正確");
        }
        if (!AUDIO_EXTENSIONS.includes(extensionOf(pathname))) {
          throw new Error(`不支援的格式，請上傳 ${AUDIO_EXTENSIONS.join("、")}`);
        }
        return {
          allowedContentTypes: ALLOWED_UPLOAD_TYPES,
          maximumSizeInBytes: MAX_AUDIO_BYTES, // Blob 端也會擋，超過直接拒絕
          addRandomSuffix: true, // 網址加隨機字尾，猜不到
          validUntil: Date.now() + 10 * 60 * 1000, // 許可 10 分鐘內有效
        };
      },
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
