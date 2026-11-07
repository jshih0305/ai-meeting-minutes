import { BlobNotFoundError, del, get, head, put } from "@vercel/blob";
import { audioContentType, audioPathname, MAX_AUDIO_BYTES, userAudioPrefix } from "@/lib/audio";

/**
 * 目前的 Blob store 是 public（建立時決定、不能改）。public 檔案只要拿到網址就能下載，
 * 所以網址只存在資料庫、播放一律經過 /api/meetings/[id]/audio 檢查擁有者。
 * 之後在 Vercel 建一個 private store、換掉 BLOB_READ_WRITE_TOKEN，並設 NEXT_PUBLIC_BLOB_ACCESS=private
 * （瀏覽器直傳也要知道，所以用 NEXT_PUBLIC_ 開頭；伺服器兩個名稱都認）。
 */
export const BLOB_ACCESS: "public" | "private" =
  (process.env.BLOB_ACCESS ?? process.env.NEXT_PUBLIC_BLOB_ACCESS) === "private" ? "private" : "public";

export type StoredAudio = {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  access: "public" | "private";
};

/** 伺服器端上傳（舊的 multipart 流程用，檔案會受 Vercel 4.5MB 請求限制） */
export async function uploadAudio(userId: string, file: File): Promise<StoredAudio> {
  const blob = await put(audioPathname(userId, file.name), file, {
    access: BLOB_ACCESS,
    addRandomSuffix: true,
    contentType: audioContentType(file.name, file.type),
  });
  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType,
    size: file.size,
    access: BLOB_ACCESS,
  };
}

export class UploadedAudioError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/**
 * 讀回瀏覽器直傳到 Blob 的錄音檔，交給 OpenAI 用。
 * 只收 pathname（不收前端給的網址），而且必須在這個使用者自己的資料夾裡。
 */
export async function readUploadedAudio(
  userId: string,
  pathname: string,
  fileName: string,
): Promise<{ file: File; audio: StoredAudio }> {
  if (!pathname.startsWith(userAudioPrefix(userId)) || pathname.includes("..")) {
    throw new UploadedAudioError("找不到這個錄音檔", 404);
  }

  let meta;
  try {
    meta = await head(pathname);
  } catch (e) {
    if (e instanceof BlobNotFoundError) throw new UploadedAudioError("找不到這個錄音檔，請重新上傳", 404);
    throw e;
  }
  if (meta.size > MAX_AUDIO_BYTES) {
    throw new UploadedAudioError(`音檔超過 ${MAX_AUDIO_BYTES / 1024 / 1024}MB 上限`, 413);
  }

  const blob = await get(meta.url, { access: BLOB_ACCESS, useCache: false });
  if (!blob?.stream) throw new UploadedAudioError("找不到這個錄音檔，請重新上傳", 404);
  const bytes = await new Response(blob.stream).arrayBuffer();

  const contentType = audioContentType(fileName, meta.contentType) ?? meta.contentType;
  return {
    file: new File([bytes], fileName, { type: contentType }),
    audio: { url: meta.url, pathname: meta.pathname, contentType, size: meta.size, access: BLOB_ACCESS },
  };
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
