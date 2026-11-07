"use client";

import { useState } from "react";
import type { TranscribeResponse } from "@/app/api/transcribe/route";
import { Waveform } from "@/app/components/brand";
import { CARD } from "@/app/components/meeting-view";

const MAX_MB = 25;
const ACCEPT = ".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,.ogg,.flac,audio/*";
const STEPS = ["轉成逐字稿", "AI 整理重點", "存進你的紀錄"];

/** 上傳錄音：完成後把結果交給外層（顯示內容、加進歷史紀錄） */
export default function AudioUpload({
  onDone,
  onUnauthorized,
}: {
  onDone: (result: TranscribeResponse) => void;
  onUnauthorized: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [dragging, setDragging] = useState(false);

  function pick(f: File | null) {
    setError("");
    if (f && f.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      setError(`音檔 ${(f.size / 1024 / 1024).toFixed(1)}MB，超過 ${MAX_MB}MB 上限`);
      return;
    }
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setLoading(true);
    setError("");
    setElapsed(0);
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    try {
      const body = new FormData();
      body.append("file", file);
      if (title.trim()) body.append("title", title.trim());
      const res = await fetch("/api/transcribe", { method: "POST", body });
      if (res.status === 401) return onUnauthorized();
      const data = await res.json().catch(() => ({ error: `伺服器回應錯誤（HTTP ${res.status}）` }));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      onDone(data as TranscribeResponse);
      setFile(null);
      setTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  // 處理中：整張卡片換成進度畫面
  if (loading) {
    return (
      <section className={`${CARD} flex flex-col items-center py-14 text-center sm:py-20`} aria-live="polite">
        <Waveform bars={28} className="h-14 text-accent" />
        <p className="mt-8 font-serif text-2xl font-black text-ink">正在整理你的會議</p>
        <p className="mt-2 max-w-full truncate px-4 text-sm text-ink-2">{title.trim() || file?.name}</p>
        <p className="mt-6 font-mono text-4xl text-ink tabular-nums">
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </p>
        <div className="mt-6 h-1 w-full max-w-xs overflow-hidden rounded-full bg-paper-2">
          <div className="animate-indeterminate h-full w-2/5 rounded-full bg-accent" />
        </div>
        <ol className="mt-8 flex flex-wrap justify-center gap-x-2 gap-y-2 text-sm text-ink-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className="font-mono text-xs text-ink-3">{i + 1}</span>
              {s}
              {i < STEPS.length - 1 && <span className="text-ink-3">→</span>}
            </li>
          ))}
        </ol>
        <p className="mt-8 text-xs text-ink-3">長的錄音可能要幾分鐘，請不要關閉這個頁面</p>
      </section>
    );
  }

  return (
    <section className={CARD}>
      <p className="font-mono text-xs tracking-[0.25em] text-accent uppercase">New meeting</p>
      <h1 className="mt-2 font-serif text-3xl font-black text-ink">新增一場會議</h1>
      <p className="mt-2 text-ink-2">上傳錄音，拿回逐字稿、摘要、重點和待辦事項。</p>

      <label
        className={`mt-7 flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-5 py-10 text-center transition sm:py-14 ${
          dragging
            ? "border-accent bg-accent-soft/60"
            : file
              ? "border-ink/40 bg-paper-2/60"
              : "border-line-2 hover:border-ink/40 hover:bg-paper-2/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0] ?? null);
        }}
      >
        <span
          className={`grid size-14 place-items-center rounded-2xl ${file ? "bg-ink text-paper" : "bg-accent-soft text-accent"}`}
        >
          {file ? <FileIcon /> : <UploadIcon />}
        </span>
        {file ? (
          <>
            <span className="max-w-full font-medium break-all text-ink">{file.name}</span>
            <span className="font-mono text-sm text-ink-3">
              {(file.size / 1024 / 1024).toFixed(1)} MB・點這裡換一個檔案
            </span>
          </>
        ) : (
          <>
            <span className="font-medium text-ink">
              <span className="hidden sm:inline">把錄音檔拖到這裡，或</span>
              <span className="text-accent underline underline-offset-4">選擇檔案</span>
            </span>
            <span className="text-sm text-ink-3">mp3、m4a、wav、webm、mp4 等，最大 {MAX_MB}MB</span>
          </>
        )}
        <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
      </label>

      <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-ink">
        會議名稱 <span className="-mt-1 text-xs font-normal text-ink-3">選填，沒填就用檔名</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="例如：11 月產品週會"
          className="w-full rounded-2xl border border-line-2 bg-card px-4 py-3 text-base font-normal text-ink outline-none transition placeholder:text-ink-3 focus:border-ink focus:ring-4 focus:ring-ink/5"
        />
      </label>

      {error && (
        <p role="alert" className="mt-5 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={upload}
        disabled={!file}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 font-medium text-paper transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35"
      >
        產生會議紀錄 <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </svg>
  );
}
