import OpenAI from "openai";
import { Converter } from "opencc-js";
import type { TranscriptionDiarized } from "openai/resources/audio/transcriptions";

// 上限與格式定義在 lib/audio.ts（瀏覽器也要用），這裡轉出去給舊的 import 用
export { AUDIO_EXTENSIONS, MAX_AUDIO_BYTES } from "@/lib/audio";

// 有講者辨識（誰說的）和時間軸，最適合會議紀錄；可用環境變數換模型
const MODEL = process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-transcribe-diarize";

export type TranscriptSegment = {
  speaker: string;
  start: number; // 秒
  end: number; // 秒
  text: string;
};

export type TranscribeResult = {
  text: string; // 完整逐字稿
  segments: TranscriptSegment[];
  durationSec: number | null;
  model: string;
  fileName: string;
};

export async function transcribeAudio(file: File): Promise<TranscribeResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  if (MODEL.includes("diarize")) {
    // SDK 沒有替 diarized_json 寫專屬型別的多載，自己標成 TranscriptionDiarized
    const r = (await client.audio.transcriptions.create({
      file,
      model: MODEL,
      response_format: "diarized_json",
      chunking_strategy: "auto", // 超過 30 秒的音檔必填
      language: "zh",
    })) as unknown as TranscriptionDiarized;
    const segments = mergeSameSpeaker(
      r.segments.map((s) => ({
        speaker: s.speaker,
        start: round2(s.start),
        end: round2(s.end),
        text: toTW(s.text.trim()),
      })),
    );
    return {
      // 完整逐字稿用「講者：內容」一行一段，後面交給 AI 整理時才看得出誰說的
      text: segments.map((s) => `${s.speaker}：${s.text}`).join("\n"),
      segments,
      durationSec: r.duration != null ? round2(r.duration) : null,
      model: MODEL,
      fileName: file.name,
    };
  }

  // 其他模型沒有講者辨識，只回完整文字
  const r = await client.audio.transcriptions.create({
    file,
    model: MODEL,
    response_format: "json",
    language: "zh",
    prompt: "以下是一場會議的錄音，請使用繁體中文。",
  });
  return { text: toTW(r.text), segments: [], durationSec: null, model: MODEL, fileName: file.name };
}

// 講者辨識模型不吃 prompt，常輸出簡體字；用 OpenCC 轉成繁體（台灣用語，例如 软件→軟體）
const cn2tw = Converter({ from: "cn", to: "twp" });

const CJK = "\\u3400-\\u9fff\\uf900-\\ufaff";
const FULL_WIDTH: Record<string, string> = { ",": "，", "!": "！", "?": "？", ":": "：", ";": "；" };

/** 簡轉繁，並把中文旁的半形標點換成全形、拿掉中文字之間多餘的空格 */
function toTW(s: string): string {
  return cn2tw(s)
    .replace(new RegExp(`(?<=[${CJK}])\\s+(?=[${CJK}])`, "g"), "")
    .replace(new RegExp(`(?<=[${CJK}])[,!?:;]|[,!?:;](?=[${CJK}])`, "g"), (p) => FULL_WIDTH[p]);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** 同一位講者連續、中間停頓不到 2 秒的句子合成一段，比較好讀 */
function mergeSameSpeaker(segments: TranscriptSegment[]): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  for (const s of segments) {
    const last = out.at(-1);
    if (last && last.speaker === s.speaker && s.start - last.end < 2) {
      last.end = s.end;
      last.text += s.text;
    } else {
      out.push({ ...s });
    }
  }
  return out;
}
