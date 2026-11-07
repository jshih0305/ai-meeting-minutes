"use client";

import { upload as uploadToBlob } from "@vercel/blob/client";
import { useRef, useState } from "react";
import type { TranscribeResponse } from "@/app/api/transcribe/route";
import { Waveform } from "@/app/components/brand";
import { CARD } from "@/app/components/meeting-view";
import { audioContentType, audioPathname, checkAudioFile, MAX_AUDIO_BYTES } from "@/lib/audio";

const MAX_MB = MAX_AUDIO_BYTES / 1024 / 1024;
const ACCEPT = ".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,.ogg,.flac,audio/*";
const STEPS = ["上傳錄音", "轉成逐字稿", "AI 整理重點"];
// 要跟 Blob store 的設定一致：目前是 public store；換成 private store 時設 NEXT_PUBLIC_BLOB_ACCESS=private
const BLOB_ACCESS = process.env.NEXT_PUBLIC_BLOB_ACCESS === "private" ? "private" : "public";

type Phase = "idle" | "uploading" | "processing";

/** 上傳錄音：瀏覽器直傳 Blob → 請伺服器轉文字與整理 → 結果交給外層 */
export default function AudioUpload({
  onDone,
  onUnauthorized,
  userId,
}: {
  onDone: (result: TranscribeResponse) => void;
  onUnauthorized: () => void;
  userId: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0); // 上傳百分比（真實進度）
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [dragging, setDragging] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function pick(f: File | null) {
    setError("");
    const invalid = f && checkAudioFile(f.name, f.size);
    if (invalid) {
      setFile(null);
      setError(invalid);
      return;
    }
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setError("");
    setProgress(0);
    setElapsed(0);
    setPhase("uploading");
    const abort = new AbortController();
    abortRef.current = abort;
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      // 1. 直接傳到 Vercel Blob（不經過我們的伺服器，不受 4.5MB 限制）
      const blob = await uploadToBlob(audioPathname(userId, file.name), file, {
        access: BLOB_ACCESS,
        handleUploadUrl: "/api/upload",
        contentType: audioContentType(file.name, file.type),
        abortSignal: abort.signal,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });

      // 2. 請伺服器轉文字、AI 整理、存進資料庫
      setPhase("processing");
      const started = Date.now();
      timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pathname: blob.pathname, fileName: file.name, title: title.trim() }),
      });
      if (res.status === 401) return onUnauthorized();
      const data = await res.json().catch(() => ({ error: `伺服器回應錯誤（HTTP ${res.status}）` }));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      onDone(data as TranscribeResponse);
      setFile(null);
      setTitle("");
    } catch (e) {
      if (abort.signal.aborted) {
        setError("已取消上傳");
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        // Blob 套件不會把我們伺服器的錯誤訊息傳回來，只說拿不到許可
        setError(
          msg.includes("client token")
            ? "無法取得上傳許可：可能是登入已過期，請重新整理頁面後再試"
            : msg.startsWith("Vercel Blob")
              ? `上傳失敗：${msg.replace("Vercel Blob: ", "")}`
              : msg,
        );
      }
    } finally {
      clearInterval(timer);
      abortRef.current = null;
      setPhase("idle");
    }
  }

  // 上傳中 / 處理中：整張卡片換成進度畫面
  if (phase !== "idle") {
    const uploading = phase === "uploading";
    const current = uploading ? 0 : 1; // 處理中時，轉文字和 AI 整理在同一個請求裡，無法分開顯示
    return (
      <section className={`${CARD} flex flex-col items-center py-14 text-center sm:py-20`} aria-live="polite">
        <Waveform bars={28} className="h-14 text-accent" />
        <p className="mt-8 font-serif text-2xl font-black text-ink">
          {uploading ? "正在上傳錄音" : "正在整理你的會議"}
        </p>
        <p className="mt-2 max-w-full truncate px-4 text-sm text-ink-2">{title.trim() || file?.name}</p>

        {uploading ? (
          <>
            <p className="mt-6 font-mono text-4xl text-ink tabular-nums">{progress}%</p>
            <div className="mt-6 h-1 w-full max-w-xs overflow-hidden rounded-full bg-paper-2">
              <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <>
            <p className="mt-6 font-mono text-4xl text-ink tabular-nums">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
            </p>
            <div className="mt-6 h-1 w-full max-w-xs overflow-hidden rounded-full bg-paper-2">
              <div className="animate-indeterminate h-full w-2/5 rounded-full bg-accent" />
            </div>
          </>
        )}

        <ol className="mt-8 flex flex-wrap justify-center gap-x-2 gap-y-2 text-sm">
          {STEPS.map((s, i) => {
            // 上傳完成才打勾；轉文字與整理是同一段，一起標示為進行中
            const done = i < current;
            const active = uploading ? i === 0 : i >= 1;
            return (
              <li key={s} className={`flex items-center gap-2 ${active ? "text-ink" : done ? "text-ok" : "text-ink-3"}`}>
                <span className="font-mono text-xs">{done ? "✓" : i + 1}</span>
                {s}
                {i < STEPS.length - 1 && <span className="text-ink-3">→</span>}
              </li>
            );
          })}
        </ol>

        {uploading ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="mt-8 rounded-full border border-line-2 px-5 py-2 text-sm text-ink-2 transition hover:border-ink hover:text-ink"
          >
            取消上傳
          </button>
        ) : (
          <p className="mt-8 text-xs text-ink-3">長的錄音可能要幾分鐘，請不要關閉這個頁面</p>
        )}
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
