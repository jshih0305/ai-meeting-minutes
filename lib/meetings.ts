import { isValidObjectId, type HydratedDocument } from "mongoose";
import { connectDB } from "@/lib/db";
import { Meeting, type MeetingDoc } from "@/lib/models/Meeting";
import type { ActionItem, MeetingMinutes } from "@/lib/summarize";
import type { TranscriptSegment } from "@/lib/transcribe";

/** 給前端的會議紀錄（不含錄音檔真實網址） */
export type MeetingDetail = {
  id: string;
  title: string;
  createdAt: string;
  audioFileName: string | null;
  hasAudio: boolean;
  durationSec: number | null;
  transcribeModel: string | null;
  transcript: { text: string; segments: TranscriptSegment[] };
  status: "pending" | "processing" | "done" | "failed";
  minutes: MeetingMinutes | null;
  minutesError: string | null;
};

/** 歷史列表的一筆（不帶整份逐字稿，列表才輕） */
export type MeetingListItem = {
  id: string;
  title: string;
  createdAt: string;
  durationSec: number | null;
  status: MeetingDetail["status"];
  summary: string;
  actionItemCount: number;
};

type MeetingLean = MeetingDoc & { _id: unknown; createdAt: Date };

export function toDetail(m: MeetingLean | HydratedDocument<MeetingDoc>): MeetingDetail {
  const ai = m.ai;
  return {
    id: String(m._id),
    title: m.title,
    createdAt: new Date(m.createdAt as Date).toISOString(),
    audioFileName: m.audioFileName ?? null,
    hasAudio: Boolean(m.audio?.url),
    durationSec: m.durationSec ?? null,
    transcribeModel: m.transcribeModel ?? null,
    transcript: {
      text: m.transcript?.text ?? "",
      segments: (m.transcript?.segments ?? []).map((s) => ({
        speaker: s.speaker ?? "",
        start: s.start ?? 0,
        end: s.end ?? 0,
        text: s.text,
      })),
    },
    status: m.status,
    minutes:
      ai && m.status === "done"
        ? {
            summary: ai.summary ?? "",
            keyPoints: ai.keyPoints ?? [],
            actionItems: (ai.actionItems ?? []).map(
              (a): ActionItem => ({ task: a.task, owner: a.owner ?? "", due: a.due ?? "" }),
            ),
            model: ai.aiModel ?? "",
          }
        : null,
    minutesError: m.status === "failed" ? (m.error ?? "AI 整理失敗") : null,
  };
}

/** 只找「這個使用者」的會議；id 格式錯、不存在或不是他的，一律回 null（不透露是否存在） */
export async function findOwnMeeting(userId: string, id: string) {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  return Meeting.findOne({ _id: id, userId }).lean<MeetingLean>();
}
