import { getSessionUser, unauthorized } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { toDetail, type MeetingDetail } from "@/lib/meetings";
import { Meeting } from "@/lib/models/Meeting";
import { deleteAudio, uploadAudio, type StoredAudio } from "@/lib/storage";
import { summarizeTranscript, type MeetingMinutes } from "@/lib/summarize";
import {
  AUDIO_EXTENSIONS,
  MAX_AUDIO_BYTES,
  transcribeAudio,
  type TranscribeResult,
} from "@/lib/transcribe";

/**
 * API 回傳格式：跟 GET /api/meetings/[id] 一樣的會議紀錄，前端可以共用同一個畫面。
 * 存檔失敗時 id 是 null、saveError 有訊息，但逐字稿和整理結果照樣回傳，不會白跑。
 */
export type TranscribeResponse = Omit<MeetingDetail, "id"> & {
  id: string | null;
  saveError: string | null;
};

// 長的會議錄音轉文字 + AI 整理 + 上傳要花不少時間，給到 5 分鐘
export const maxDuration = 300;

// POST /api/transcribe   body: multipart/form-data，欄位 file = 音檔、title = 會議名稱（選填）
// 流程：語音轉文字 → AI 整理 → 錄音檔存 Vercel Blob → 全部存進 MongoDB（記錄是哪個使用者）
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "伺服器沒有設定 OPENAI_API_KEY" }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "請用 multipart/form-data 上傳，欄位名稱為 file" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "沒有收到音檔" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!AUDIO_EXTENSIONS.includes(ext)) {
    return Response.json(
      { error: `不支援 .${ext} 格式，請上傳 ${AUDIO_EXTENSIONS.join("、")}` },
      { status: 400 },
    );
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return Response.json(
      { error: `音檔 ${(file.size / 1024 / 1024).toFixed(1)}MB，超過 25MB 上限` },
      { status: 413 },
    );
  }

  const rawTitle = form.get("title");
  const title =
    (typeof rawTitle === "string" && rawTitle.trim().slice(0, 100)) ||
    file.name.replace(/\.[^.]+$/, "") ||
    "未命名會議";

  // 1. 語音轉文字。失敗就整個失敗，什麼都不存
  let transcript: TranscribeResult;
  try {
    transcript = await transcribeAudio(file);
  } catch (e) {
    console.error("轉文字失敗", e);
    return Response.json({ error: `轉文字失敗：${errorMessage(e)}` }, { status: 502 });
  }

  // 2. AI 整理。失敗的話逐字稿照樣保存，狀態記成 failed
  let minutes: MeetingMinutes | null = null;
  let minutesError: string | null = null;
  if (transcript.text.trim()) {
    try {
      minutes = await summarizeTranscript(transcript.text);
    } catch (e) {
      console.error("AI 整理失敗", e);
      minutesError = `AI 整理失敗：${errorMessage(e)}`;
    }
  } else {
    minutesError = "逐字稿是空的，沒有內容可以整理";
  }

  const result: TranscribeResponse = {
    id: null,
    title,
    createdAt: new Date().toISOString(),
    audioFileName: file.name,
    hasAudio: false,
    durationSec: transcript.durationSec,
    transcribeModel: transcript.model,
    transcript: { text: transcript.text, segments: transcript.segments },
    status: minutes ? "done" : "failed",
    minutes,
    minutesError,
    saveError: null,
  };

  // 3. 錄音檔存到 Vercel Blob
  let audio: StoredAudio | undefined;
  try {
    audio = await uploadAudio(user.userId, file);
  } catch (e) {
    console.error("錄音檔上傳 Blob 失敗", e);
    result.saveError = `錄音檔儲存失敗：${errorMessage(e)}`;
  }

  // 4. 存進 MongoDB
  try {
    await connectDB();
    const meeting = await Meeting.create({
      userId: user.userId,
      title,
      source: "audio",
      audioFileName: file.name,
      audio,
      durationSec: transcript.durationSec ?? undefined,
      transcribeModel: transcript.model,
      transcript: { text: transcript.text, segments: transcript.segments },
      status: result.status,
      error: minutesError ?? undefined,
      ai: minutes
        ? {
            summary: minutes.summary,
            keyPoints: minutes.keyPoints,
            actionItems: minutes.actionItems,
            aiModel: minutes.model,
            generatedAt: new Date(),
          }
        : undefined,
    });
    return Response.json({ ...toDetail(meeting), saveError: result.saveError } satisfies TranscribeResponse);
  } catch (e) {
    console.error("會議紀錄存檔失敗", e);
    // 資料庫沒存成功，剛上傳的錄音檔就沒有紀錄指向它，刪掉避免變成孤兒檔案
    if (audio) await deleteAudio(audio.url).catch((err) => console.error("刪除孤兒錄音檔失敗", err));
    result.saveError = `會議紀錄存檔失敗：${errorMessage(e)}`;
    return Response.json(result);
  }
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
