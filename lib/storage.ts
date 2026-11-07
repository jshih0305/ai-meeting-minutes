import { del, get, put } from "@vercel/blob";

/**
 * 目前的 Blob store 是 public（建立時決定、不能改）。public 檔案只要拿到網址就能下載，
 * 所以網址只存在資料庫、絕不傳給前端，播放一律經過 /api/meetings/[id]/audio 檢查擁有者。
 * 之後在 Vercel 建一個 private store、換掉 BLOB_READ_WRITE_TOKEN，並設 BLOB_ACCESS=private 即可。
 */
export const BLOB_ACCESS: "public" | "private" =
  process.env.BLOB_ACCESS === "private" ? "private" : "public";

export type StoredAudio = {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  access: "public" | "private";
};

/** 存錄音檔，路徑依使用者分資料夾：meetings/<userId>/<時間>-<檔名>（加隨機字尾，網址猜不到） */
export async function uploadAudio(userId: string, file: File): Promise<StoredAudio> {
  const safeName = file.name.replace(/[^\w.\-一-鿿]+/g, "_").slice(-80) || "audio";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const blob = await put(`meetings/${userId}/${stamp}-${safeName}`, file, {
    access: BLOB_ACCESS,
    addRandomSuffix: true,
    contentType: audioContentType(file),
  });
  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType,
    size: file.size,
    access: BLOB_ACCESS,
  };
}

const AUDIO_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  mpeg: "audio/mpeg",
  mpga: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  wav: "audio/wav",
  webm: "audio/webm",
  ogg: "audio/ogg",
  flac: "audio/flac",
};

/** 瀏覽器有時給空字串或 application/octet-stream，播放器會認不出來，改依副檔名判斷 */
function audioContentType(file: File): string | undefined {
  if (file.type.startsWith("audio/") || file.type.startsWith("video/")) return file.type;
  return AUDIO_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? (file.type || undefined);
}

export async function deleteAudio(url: string) {
  await del(url);
}

/** 讀取錄音檔（支援 Range，播放器才能拖曳進度條） */
export async function readAudio(audio: { url: string; access: "public" | "private" }, range: string | null) {
  return get(audio.url, {
    access: audio.access,
    headers: range ? { range } : undefined,
  });
}
