"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo, Waveform } from "@/app/components/brand";

const MIN_PASSWORD = 8;

/** 登入、註冊共用的表單 */
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (isRegister && password.length < MIN_PASSWORD) {
      setError(`密碼至少 ${MIN_PASSWORD} 個字元`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(isRegister ? { email, password, name } : { email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      // 登入前想去的頁面（proxy 帶過來的 ?next=），只接受站內路徑
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next?.startsWith("/") && !next.startsWith("//") ? next : "/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-2xl border border-line-2 bg-card px-4 py-3 text-base text-ink outline-none transition placeholder:text-ink-3 focus:border-ink focus:ring-4 focus:ring-ink/5";
  const label = "flex flex-col gap-2 text-sm font-medium text-ink";

  return (
    <div className="grid flex-1 bg-paper lg:grid-cols-[1fr_1.1fr]">
      {/* 左：品牌面板（桌機才顯示） */}
      <aside className="relative hidden overflow-hidden bg-night p-12 text-night-ink lg:flex lg:flex-col lg:justify-between">
        <Logo inverted />
        <div className="relative">
          <Waveform bars={32} className="h-16 text-accent" />
          <p className="mt-10 font-serif text-4xl leading-snug font-black">
            專心開會，
            <br />
            紀錄交給會記。
          </p>
          <p className="mt-5 max-w-sm leading-7 text-night-ink/65">
            上傳錄音，拿回逐字稿、摘要、重點與待辦。每一份紀錄都只屬於你。
          </p>
        </div>
        <ul className="space-y-2 text-sm text-night-ink/60">
          <li>・自動分辨講者與時間軸</li>
          <li>・待辦事項標出負責人與期限</li>
          <li>・隨時回來查看、重聽錄音</li>
        </ul>
      </aside>

      {/* 右：表單 */}
      <main className="flex flex-col px-4 py-6 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <form onSubmit={submit} className="w-full max-w-sm">
            <h1 className="font-serif text-4xl font-black text-ink">{isRegister ? "建立帳號" : "歡迎回來"}</h1>
            <p className="mt-3 text-ink-2">
              {isRegister ? "免費註冊，上傳你的第一場會議。" : "登入後繼續整理你的會議紀錄。"}
            </p>

            <div className="mt-9 flex flex-col gap-5">
              {isRegister && (
                <label className={label}>
                  怎麼稱呼你 <span className="-mt-1 text-xs font-normal text-ink-3">選填</span>
                  <input
                    className={input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={50}
                    autoComplete="name"
                    placeholder="例如：小美"
                  />
                </label>
              )}
              <label className={label}>
                Email
                <input
                  className={input}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
              <label className={label}>
                <span className="flex items-baseline justify-between">
                  密碼
                  {isRegister && <span className="text-xs font-normal text-ink-3">至少 {MIN_PASSWORD} 個字元</span>}
                </span>
                <span className="relative">
                  <input
                    className={`${input} pr-16`}
                    type={showPassword ? "text" : "password"}
                    aria-label="密碼"
                    required
                    minLength={isRegister ? MIN_PASSWORD : undefined}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
                    className="absolute inset-y-0 right-2 my-auto h-8 rounded-xl px-3 text-xs font-medium text-ink-2 hover:bg-paper-2"
                  >
                    {showPassword ? "隱藏" : "顯示"}
                  </button>
                </span>
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-5 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-3.5 font-medium text-paper transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
            >
              {loading && <span className="size-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />}
              {loading ? "請稍候…" : isRegister ? "註冊並開始使用" : "登入"}
            </button>

            <p className="mt-8 text-center text-sm text-ink-2">
              {isRegister ? "已經有帳號了？" : "還沒有帳號？"}
              <Link
                href={isRegister ? "/login" : "/register"}
                className="ml-1 font-medium text-accent underline-offset-4 hover:underline"
              >
                {isRegister ? "登入" : "免費註冊"}
              </Link>
            </p>
          </form>
        </div>
        <Link href="/" className="text-center text-sm text-ink-3 hover:text-ink">
          ← 回到首頁
        </Link>
      </main>
    </div>
  );
}
