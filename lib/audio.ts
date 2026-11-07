// 錄音檔規則：瀏覽器和伺服器共用（這個檔案不能 import 只能在伺服器跑的東西）

/** OpenAI 語音轉文字單檔上限 25MB；瀏覽器直傳 Blob 雖然沒有 Vercel 4.5MB 的限制，這個上限還在 */
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/** 副檔名 → 音訊格式。也是 OpenAI 支援的格式清單 */
export const AUDIO_TYPES: Record<string, string> = {
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

export const AUDIO_EXTENSIONS = Object.keys(AUDIO_TYPES);

/** 允許上傳到 Blob 的格式（瀏覽器給的 type 五花八門，例如 audio/x-m4a，所以用萬用字元） */
export const ALLOWED_UPLOAD_TYPES = ["audio/*", "video/mp4", "video/webm", "video/mpeg"];

export const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/** 瀏覽器有時給空字串或 application/octet-stream，播放器會認不出來，改依副檔名判斷 */
export function audioContentType(name: string, type = ""): string | undefined {
  if (type.startsWith("audio/") || type.startsWith("video/")) return type;
  return AUDIO_TYPES[extensionOf(name)] ?? (type || undefined);
}

/** 檢查檔名與大小，回傳錯誤訊息或 null */
export function checkAudioFile(name: string, size: number): string | null {
  const ext = extensionOf(name);
  if (!AUDIO_EXTENSIONS.includes(ext)) {
    return `不支援 .${ext} 格式，請上傳 ${AUDIO_EXTENSIONS.join("、")}`;
  }
  if (size > MAX_AUDIO_BYTES) {
    return `音檔 ${(size / 1024 / 1024).toFixed(1)}MB，超過 ${MAX_AUDIO_BYTES / 1024 / 1024}MB 上限`;
  }
  return null;
}

/** 每個使用者的錄音都放在自己的資料夾，伺服器靠這個前綴確認檔案是誰的 */
export const userAudioPrefix = (userId: string) => `meetings/${userId}/`;

/** 上傳路徑：meetings/<userId>/<時間>-<檔名>（Blob 會再加隨機字尾，網址猜不到） */
export function audioPathname(userId: string, fileName: string, now = new Date()): string {
  const safeName = fileName.replace(/[^\w.\-一-鿿]+/g, "_").slice(-80) || "audio";
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return `${userAudioPrefix(userId)}${stamp}-${safeName}`;
}
