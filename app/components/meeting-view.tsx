"use client";

import { useState } from "react";
import type { TranscribeResponse } from "@/app/api/transcribe/route";
import type { MeetingMinutes } from "@/lib/summarize";

export const CARD = "rounded-3xl border border-line bg-card p-5 sm:p-7";

/** 秒數 → 「m:ss」或「h:mm:ss」 */
export function formatTime(sec: number) {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function SectionTitle({ index, children, aside }: { index: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-accent">{index}</span>
        <span className="font-serif text-xl font-black text-ink">{children}</span>
      </h2>
      {aside}
    </div>
  );
}

/** 一場會議的完整內容：標題、錄音、摘要、重點、待辦、逐字稿 */
export default function MeetingView({ meeting }: { meeting: TranscribeResponse }) {
  const { transcript, minutes } = meeting;
  const speakers = [...new Set(transcript.segments.map((s) => s.speaker))];
  const speakerClass = (sp: string) => `speaker-${speakers.indexOf(sp) % 5}`;

  return (
    <article className="flex flex-col gap-5">
      {/* 標題與錄音 */}
      <header className={`${CARD} relative overflow-hidden`}>
        <p className="font-mono text-xs tracking-wider text-ink-3">{formatDateTime(meeting.createdAt)}</p>
        <h1 className="mt-2 font-serif text-2xl leading-snug font-black break-words text-ink sm:text-3xl">
          {meeting.title}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {meeting.durationSec != null && <Chip>長度 {formatTime(meeting.durationSec)}</Chip>}
          {speakers.length > 0 && <Chip>{speakers.length} 位講者</Chip>}
          {minutes && <Chip>{minutes.actionItems.length} 項待辦</Chip>}
          {meeting.audioFileName && <Chip title={meeting.audioFileName}>🎧 {meeting.audioFileName}</Chip>}
        </div>
        {meeting.id && meeting.hasAudio && (
          // 錄音檔透過自己的 API 播放，伺服器會先確認是本人的會議
          <div className="mt-5 rounded-2xl bg-paper-2 p-2">
            <audio controls preload="metadata" src={`/api/meetings/${meeting.id}/audio`} className="block h-10 w-full" />
          </div>
        )}
        {meeting.saveError && (
          <p role="alert" className="mt-5 rounded-2xl bg-danger-soft px-4 py-3 text-sm leading-6 text-danger">
            ⚠️ {meeting.saveError}
            {!meeting.id && "。這次的結果不會出現在歷史紀錄，請先自行複製保存。"}
          </p>
        )}
      </header>

      {/* AI 整理：摘要、重點、待辦事項 */}
      {minutes && <Minutes minutes={minutes} />}
      {meeting.minutesError && (
        <p className="rounded-2xl bg-warn-soft px-5 py-4 text-sm leading-6 text-warn">
          {meeting.minutesError}（逐字稿仍然可以在下方查看）
        </p>
      )}

      {/* 逐字稿 */}
      <section className={CARD}>
        <SectionTitle
          index="04"
          aside={transcript.text ? <CopyButton text={transcript.text} label="複製逐字稿" /> : undefined}
        >
          逐字稿
        </SectionTitle>

        {transcript.segments.length > 0 ? (
          <ol className="flex flex-col">
            {transcript.segments.map((s, i) => (
              <li
                key={i}
                className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[5.5rem_1fr] sm:gap-x-5"
              >
                <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1.5">
                  <span className={`${speakerClass(s.speaker)} rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap`}>
                    講者 {s.speaker}
                  </span>
                  <span className="font-mono text-xs text-ink-3">{formatTime(s.start)}</span>
                </div>
                <p className="col-span-2 min-w-0 leading-8 break-words text-ink sm:col-span-1">{s.text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="leading-8 whitespace-pre-wrap text-ink">{transcript.text || "（沒有辨識出任何內容）"}</p>
        )}
        {meeting.transcribeModel && (
          <p className="mt-6 border-t border-line pt-4 font-mono text-xs text-ink-3">
            語音辨識：{meeting.transcribeModel}
            {minutes?.model && `・整理：${minutes.model}`}
          </p>
        )}
      </section>
    </article>
  );
}

function Chip({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className="max-w-full truncate rounded-full border border-line bg-paper px-3 py-1 text-ink-2">
      {children}
    </span>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // 瀏覽器不允許存取剪貼簿時就不顯示成功
        }
      }}
      className="shrink-0 rounded-full border border-line-2 px-3 py-1.5 text-xs font-medium text-ink-2 transition hover:border-ink hover:text-ink"
    >
      {copied ? "已複製 ✓" : label}
    </button>
  );
}

/** AI 整理結果：摘要、重點、待辦事項各一區 */
function Minutes({ minutes }: { minutes: MeetingMinutes }) {
  return (
    <>
      <section className={`${CARD} relative overflow-hidden`}>
        <span className="absolute inset-y-0 left-0 w-1.5 bg-accent" aria-hidden="true" />
        <SectionTitle index="01">會議摘要</SectionTitle>
        <p className="text-lg leading-9 text-ink">{minutes.summary}</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className={CARD}>
          <SectionTitle index="02">討論重點</SectionTitle>
          {minutes.keyPoints.length ? (
            <ol className="flex flex-col gap-4">
              {minutes.keyPoints.map((p, i) => (
                <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-2 leading-7 text-ink">
                  <span className="font-mono text-sm leading-7 text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 break-words">{p}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-ink-3">沒有整理出重點</p>
          )}
        </section>

        <section className={CARD}>
          <SectionTitle index="03">待辦事項</SectionTitle>
          {minutes.actionItems.length ? (
            <ul className="flex flex-col gap-2.5">
              {minutes.actionItems.map((a, i) => (
                <li key={i} className="flex gap-3 rounded-2xl bg-paper-2/70 p-4">
                  <span className="mt-1 size-[18px] shrink-0 rounded-md border-2 border-line-2 bg-card" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="leading-7 break-words text-ink">{a.task}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full px-2.5 py-1 ${a.owner ? "bg-card text-ink" : "bg-card text-ink-3"}`}>
                        負責　{a.owner || "未指定"}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 ${a.due ? "bg-accent-soft text-accent" : "bg-card text-ink-3"}`}>
                        期限　{a.due || "未定"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-3">這場會議沒有待辦事項 🎉</p>
          )}
        </section>
      </div>
    </>
  );
}
