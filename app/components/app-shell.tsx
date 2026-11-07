"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { TranscribeResponse } from "@/app/api/transcribe/route";
import AudioUpload from "@/app/components/audio-upload";
import { Logo, LogoMark } from "@/app/components/brand";
import MeetingView, { formatDateTime, formatTime } from "@/app/components/meeting-view";
import type { MeetingListItem } from "@/lib/meetings";

type User = { id: string; email: string; name: string };

/** 主畫面：上方使用者列；左邊歷史紀錄，右邊是新增或查看中的會議 */
export default function AppShell() {
  const router = useRouter();
  const goLogin = () => router.replace("/login");
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<MeetingListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState<TranscribeResponse | null>(null); // null = 新增會議畫面
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [detailError, setDetailError] = useState("");

  /** 讀歷史紀錄；cursor 有值代表「載入更多」 */
  async function loadList(cursor?: string) {
    setListLoading(true);
    setListError("");
    try {
      const res = await fetch(`/api/meetings${cursor ? `?before=${cursor}` : ""}`);
      if (res.status === 401) return goLogin();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);
    } catch (e) {
      setListError(`讀取歷史紀錄失敗：${e instanceof Error ? e.message : e}`);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    // 第一次進來：確認登入、讀歷史紀錄
    (async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return goLogin();
      setUser((await res.json()).user);
      await loadList();
    })();
    // 只在第一次進入頁面時執行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openMeeting(id: string) {
    setDetailLoading(id);
    setDetailError("");
    try {
      const res = await fetch(`/api/meetings/${id}`);
      if (res.status === 401) return goLogin();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSelected({ ...data, saveError: null });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setDetailError(`讀取會議紀錄失敗：${e instanceof Error ? e.message : e}`);
    } finally {
      setDetailLoading(null);
    }
  }

  function onUploaded(result: TranscribeResponse) {
    setSelected(result);
    // 有存進資料庫才加進歷史列表
    if (result.id) {
      const item: MeetingListItem = {
        id: result.id,
        title: result.title,
        createdAt: result.createdAt,
        durationSec: result.durationSec,
        status: result.status,
        summary: result.minutes?.summary ?? "",
        actionItemCount: result.minutes?.actionItems.length ?? 0,
      };
      setItems((prev) => [item, ...prev]);
    }
  }


  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/");
  }

  // 手機版：歷史紀錄是可以展開/收合的抽屜
  const [historyOpen, setHistoryOpen] = useState(false);
  const newMeeting = () => {
    setSelected(null);
    setHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!user) {
    return (
      <div className="grid flex-1 place-items-center bg-paper">
        <div className="flex flex-col items-center gap-4 text-ink-3">
          <LogoMark className="size-10 animate-pulse" />
          <span className="text-sm">載入中…</span>
        </div>
      </div>
    );
  }

  const displayName = user.name || user.email.split("@")[0];

  return (
    <div className="flex-1 bg-paper">
      {/* 上方列 */}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo href="/app" />
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="rounded-full border border-line-2 px-3 py-1.5 text-sm text-ink lg:hidden"
              aria-expanded={historyOpen}
            >
              紀錄 <span className="font-mono text-ink-3">{items.length}</span>
            </button>
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft font-medium text-accent">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate text-sm text-ink-2" title={user.email}>
                {displayName}
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm text-ink-2 transition hover:bg-paper-2 hover:text-ink"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-10 lg:py-10">
        {/* 歷史紀錄：桌機固定在左邊；手機是從上方展開的抽屜 */}
        {historyOpen && (
          <div
            className="fixed inset-0 z-20 bg-ink/30 backdrop-blur-[2px] lg:hidden"
            onClick={() => setHistoryOpen(false)}
          />
        )}
        <aside
          className={`${
            historyOpen
              ? "fixed inset-x-3 top-[4.25rem] z-30 max-h-[75dvh] overflow-y-auto rounded-3xl border border-line bg-card p-4 shadow-2xl"
              : "hidden"
          } lg:static lg:block lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
        >
          <div className="lg:sticky lg:top-24">
            <button
              type="button"
              onClick={newMeeting}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition ${
                selected ? "bg-ink text-paper hover:-translate-y-0.5" : "border border-line-2 text-ink-2"
              }`}
            >
              <span aria-hidden="true">＋</span> 新增會議
            </button>

            <div className="mt-8 mb-3 flex items-baseline justify-between">
              <h2 className="font-serif text-lg font-black text-ink">我的會議紀錄</h2>
              <span className="font-mono text-xs text-ink-3">
                {items.length}
                {nextCursor ? "+" : ""}
              </span>
            </div>

            {listError && <p className="mb-3 rounded-2xl bg-danger-soft px-3 py-2 text-sm text-danger">{listError}</p>}
            {!listLoading && !items.length && !listError && (
              <div className="rounded-3xl border border-dashed border-line-2 px-5 py-8 text-center">
                <p className="font-serif text-ink">還沒有紀錄</p>
                <p className="mt-1 text-sm text-ink-3">上傳第一場會議的錄音吧</p>
              </div>
            )}

            <ul className="flex flex-col gap-1.5 lg:max-h-[calc(100dvh-16rem)] lg:overflow-y-auto lg:pr-1">
              {items.map((m) => {
                const active = selected?.id === m.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={async () => {
                        await openMeeting(m.id);
                        setHistoryOpen(false);
                      }}
                      disabled={detailLoading !== null}
                      aria-current={active ? "true" : undefined}
                      className={`group relative w-full rounded-2xl p-3.5 text-left transition ${
                        active
                          ? "bg-card shadow-[0_8px_24px_-16px_rgba(27,24,20,0.5)] ring-1 ring-line"
                          : "hover:bg-card/70"
                      }`}
                    >
                      {active && (
                        <span className="absolute inset-y-3 left-0 w-1 rounded-full bg-accent" aria-hidden="true" />
                      )}
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate font-medium text-ink">
                          {detailLoading === m.id ? "讀取中…" : m.title}
                        </span>
                        {m.status === "failed" && (
                          <span className="shrink-0 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] text-warn">
                            未整理
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-2 font-mono text-[11px] text-ink-3">
                        <span>{formatDateTime(m.createdAt)}</span>
                        {m.durationSec != null && <span>・{formatTime(m.durationSec)}</span>}
                        {m.actionItemCount > 0 && <span>・{m.actionItemCount} 待辦</span>}
                      </div>
                      {m.summary && <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-ink-2">{m.summary}</p>}
                    </button>
                  </li>
                );
              })}
            </ul>

            {listLoading && (
              <div className="mt-2 flex flex-col gap-2" aria-label="載入中">
                {[0, 1].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-paper-2" />
                ))}
              </div>
            )}
            {nextCursor && !listLoading && (
              <button
                type="button"
                onClick={() => loadList(nextCursor)}
                className="mt-3 w-full rounded-full border border-line-2 py-2.5 text-sm text-ink-2 transition hover:border-ink hover:text-ink"
              >
                載入更多
              </button>
            )}
          </div>
        </aside>

        {/* 主要內容：新增或查看會議 */}
        <main className="min-w-0">
          {detailError && (
            <p role="alert" className="mb-5 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {detailError}
            </p>
          )}
          <div className="mx-auto max-w-3xl">
            {selected ? (
              <MeetingView key={selected.id ?? selected.createdAt} meeting={selected} />
            ) : (
              <AudioUpload onDone={onUploaded} onUnauthorized={goLogin} userId={user.id} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
