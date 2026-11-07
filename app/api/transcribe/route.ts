import { checkAudioFile } from "@/lib/audio";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { toDetail, type MeetingDetail } from "@/lib/meetings";
import { Meeting } from "@/lib/models/Meeting";
import {
  deleteAudio,
  readUploadedAudio,
  UploadedAudioError,
  uploadAudio,
  type StoredAudio,
} from "@/lib/storage";
import { summarizeTranscript, type MeetingMinutes } from "@/lib/summarize";
import { transcribeAudio, type TranscribeResult } from "@/lib/transcribe";
import { readJson } from "@/lib/validation";

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

/**
 * POST /api/transcribe，兩種送法：
 * 1. JSON { pathname, fileName, title? }：錄音檔已經由瀏覽器直傳到 Blob（/api/upload），不受 4.5MB 限制。前端用這個。
 * 2. multipart/form-data：file = 音檔、title = 會議名稱（選填）。檔案經過伺服器，在 Vercel 上限 4.5MB。
 * 流程：語音轉文字 → AI 整理 →（方法 2 才需要）錄音檔存 Blob → 全部存進 MongoDB（記錄是哪個使用者）
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "伺服器沒有設定 OPENAI_API_KEY" }, { status: 500 });
  }

  // ---------- 0. 取得錄音檔 ----------
  let file: File;
  let rawTitle: unknown;
  let audio: StoredAudio | undefined; // 已經在 Blob 上的錄音（方法 1）
  const isJson = request.headers.get("content-type")?.includes("application/json");

  if (isJson) {
    const body = await readJson(request);
    const pathname = typeof body?.pathname === "string" ? body.pathname : "";
    const fileName = typeof body?.fileName === "string" && body.fileName.trim() ? body.fileName.trim() : "";
    if (!pathname || !fileName) {
      return Response.json({ error: "缺少 pathname 或 fileName" }, { status: 400 });
    }
    const invalid = checkAudioFile(fileName, 0);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });

    await connectDB();
    // 同一個檔案不能重複建立會議紀錄
    if (await Meeting.exists({ userId: user.userId, "audio.pathname": pathname })) {
      return Response.json({ error: "這個錄音檔已經建立過會議紀錄了" }, { status: 409 });
    }
    try {
      ({ file, audio } = await readUploadedAudio(user.userId, pathname, fileName));
    } catch (e) {
      if (e instanceof UploadedAudioError) return Response.json({ error: e.message }, { status: e.status });
      console.error("讀取 Blob 錄音檔失敗", e);
      return Response.json({ error: `讀取錄音檔失敗：${errorMessage(e)}` }, { status: 502 });
    }
    rawTitle = body?.title;
  } else {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return Response.json(
        { error: "請用 JSON（pathname、fileName）或 multipart/form-data（file）送出" },
        { status: 400 },
      );
    }
    const f = form.get("file");
    if (!(f instanceof File) || f.size === 0) {
      return Response.json({ error: "沒有收到音檔" }, { status: 400 });
    }
    const invalid = checkAudioFile(f.name, f.size);
    if (invalid) return Response.json({ error: invalid }, { status: invalid.includes("上限") ? 413 : 400 });
    file = f;
    rawTitle = form.get("title");
  }

  const title =
    (typeof rawTitle === "string" && rawTitle.trim().slice(0, 100)) ||
    file.name.replace(/\.[^.]+$/, "") ||
    "未命名會議";

  // 沒建立會議紀錄就結束時，把已經在 Blob 上的錄音刪掉，避免留下沒人用的檔案
  const discardAudio = async () => {
    if (audio) await deleteAudio(audio.url).catch((err) => console.error("刪除孤兒錄音檔失敗", err));
  };

  // ---------- 1. 語音轉文字。失敗就整個失敗，什麼都不存 ----------
  let transcript: TranscribeResult;
  try {
    transcript = await transcribeAudio(file);
  } catch (e) {
    console.error("轉文字失敗", e);
    await discardAudio();
    return Response.json({ error: `轉文字失敗：${errorMessage(e)}` }, { status: 502 });
  }

  // ---------- 2. AI 整理。失敗的話逐字稿照樣保存，狀態記成 failed ----------
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

  // ---------- 3. 錄音檔存到 Vercel Blob（只有 multipart 需要；直傳的已經在 Blob 上了） ----------
  if (!audio) {
    try {
      audio = await uploadAudio(user.userId, file);
    } catch (e) {
      console.error("錄音檔上傳 Blob 失敗", e);
      result.saveError = `錄音檔儲存失敗：${errorMessage(e)}`;
    }
  }

  // ---------- 4. 存進 MongoDB ----------
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
    // 資料庫沒存成功，錄音檔就沒有紀錄指向它，刪掉避免變成孤兒檔案
    await discardAudio();
    result.saveError = `會議紀錄存檔失敗：${errorMessage(e)}`;
    return Response.json(result);
  }
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
