import Link from "next/link";
import { Logo, LogoMark, Waveform } from "@/app/components/brand";

// 首頁：產品介紹（不用登入）。已登入的人會被 proxy.ts 直接帶到 /app

const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-base font-medium text-paper transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_var(--ink)] active:translate-y-0";
const GHOST_BTN =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line-2 px-6 py-3.5 text-base font-medium text-ink transition hover:border-ink hover:bg-card";

export default function Landing() {
  return (
    <div className="flex-1 overflow-x-clip bg-paper">
      <Nav />
      <Hero />
      <WhatItDoes />
      <WhoItsFor />
      <HowToStart />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <a href="#how" className="hidden rounded-full px-3 py-2 text-sm text-ink-2 hover:text-ink md:inline">
            使用方式
          </a>
          <a href="#who" className="hidden rounded-full px-3 py-2 text-sm text-ink-2 hover:text-ink md:inline">
            適合誰
          </a>
          <Link href="/login" className="rounded-full px-3 py-2 text-sm font-medium text-ink hover:bg-paper-2 sm:px-4">
            登入
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition hover:bg-accent-hover"
          >
            免費註冊
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative">
      <div className="paper-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-24 lg:pb-28">
        <div className="animate-rise">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line-2 bg-card px-3 py-1 text-sm text-ink-2">
            <span className="size-1.5 rounded-full bg-accent" />
            錄音進來，會議紀錄出去
          </p>
          <h1 className="font-serif text-[2.6rem] leading-[1.15] font-black tracking-tight text-ink sm:text-6xl sm:leading-[1.1]">
            開完會，
            <br />
            <span className="marker">紀錄</span>就寫好了。
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-ink-2">
            上傳會議錄音，會記會分辨誰在說話、整理成逐字稿，再幫你寫好
            <strong className="font-medium text-ink">摘要、討論重點和待辦事項</strong>
            ——連誰負責、什麼時候要交都標出來。
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className={PRIMARY_BTN}>
              免費註冊，上傳第一場會議
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/login" className={GHOST_BTN}>
              我已經有帳號
            </Link>
          </div>
          <p className="mt-5 text-sm text-ink-3">支援 mp3、m4a、wav 等常見格式・每個人只看得到自己的紀錄</p>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

/** 首頁右側的示意：錄音 → 逐字稿 → 會議紀錄 */
function HeroPreview() {
  return (
    <div className="animate-rise relative mx-auto w-full max-w-md [animation-delay:150ms] lg:max-w-none">
      {/* 底下那張：逐字稿 */}
      <div className="rotate-[-2deg] rounded-3xl border border-line bg-card p-5 shadow-[0_30px_60px_-30px_rgba(27,24,20,0.35)] sm:p-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <MicIcon />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">產品週會.m4a</p>
            <p className="font-mono text-xs text-ink-3">42:18・3 位講者</p>
          </div>
          <Waveform bars={14} className="h-7 text-accent" />
        </div>
        <ol className="mt-5 space-y-3 pb-8 text-sm leading-6 sm:pb-10">
          {[
            ["A", "0:12", "這週先對齊官網改版的上線時程。"],
            ["B", "0:31", "設計稿完成八成，會員中心下週三交。"],
            ["C", "1:04", "那前端就從下週四開始接手。"],
          ].map(([sp, t, text], i) => (
            <li key={sp} className="flex gap-3">
              <span className={`speaker-${i} h-6 shrink-0 rounded-md px-2 text-xs leading-6 font-medium`}>講者 {sp}</span>
              <span className="font-mono text-xs leading-6 text-ink-3">{t}</span>
              <span className="text-ink-2">{text}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 上面那張：整理好的會議紀錄 */}
      <div className="relative -mt-8 ml-6 rotate-[1.5deg] rounded-3xl border border-line bg-card p-5 shadow-[0_40px_80px_-30px_rgba(27,24,20,0.45)] sm:-mt-10 sm:ml-12 sm:p-6">
        <p className="text-xs font-medium tracking-[0.2em] text-accent">會議紀錄・AI 整理</p>
        <p className="mt-2 font-serif text-lg leading-7 font-semibold text-ink">
          官網改版 12/15 上線，前端下週四開工。
        </p>
        <ul className="mt-4 space-y-2.5">
          {[
            ["交付會員中心設計稿", "小美", "下週三"],
            ["寫信請行銷確認首頁文案", "小美", "未定"],
          ].map(([task, owner, due]) => (
            <li key={task} className="flex items-center gap-3 rounded-xl bg-paper-2/70 px-3 py-2.5 text-sm">
              <span className="size-4 shrink-0 rounded-[5px] border-2 border-line-2" />
              <span className="min-w-0 flex-1 truncate text-ink">{task}</span>
              <span className="shrink-0 text-xs text-ink-3">
                {owner}・{due}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, desc }: { eyebrow: string; title: React.ReactNode; desc?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-xs tracking-[0.25em] text-accent uppercase">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-3xl leading-tight font-black text-ink sm:text-4xl">{title}</h2>
      {desc && <p className="mt-4 text-lg leading-8 text-ink-2">{desc}</p>}
    </div>
  );
}

function WhatItDoes() {
  const outputs = [
    {
      icon: "≡",
      title: "逐字稿",
      desc: "自動分辨不同講者，每段話都標上時間點，想回頭確認原話一找就到。",
    },
    {
      icon: "◎",
      title: "摘要與重點",
      desc: "幾句話說清楚這場會在談什麼、決定了什麼；日期和數字不會漏。",
    },
    {
      icon: "✓",
      title: "待辦事項",
      desc: "只列真正要做的事，標出負責人和期限。沒人認領的，不會亂塞給誰。",
    },
  ];
  return (
    <section className="border-y border-line bg-card">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <SectionHeading
          eyebrow="What it does"
          title={
            <>
              一份錄音，換回<span className="marker">三樣東西</span>
            </>
          }
          desc="不用邊開會邊打字，也不用會後重聽一小時。專心討論，剩下的交給會記。"
        />
        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-3">
          {outputs.map((o, i) => (
            <div key={o.title} className="bg-card p-7 sm:p-8">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-2xl bg-paper-2 font-serif text-xl text-ink">
                  {o.icon}
                </span>
                <span className="font-mono text-xs text-ink-3">0{i + 1}</span>
              </div>
              <h3 className="mt-6 font-serif text-xl font-black text-ink">{o.title}</h3>
              <p className="mt-2 leading-7 text-ink-2">{o.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhoItsFor() {
  const people = [
    { who: "專案經理", line: "週會、站會一場接一場，進度和分工一眼看清，追進度不用再翻聊天紀錄。" },
    { who: "新創與小團隊", line: "沒有專職會議記錄，決策和待辦也能留下書面紀錄，新同事一看就懂。" },
    { who: "業務與顧問", line: "客戶會議專心聽需求，會後拿到重點與承諾事項，跟進不漏接。" },
    { who: "研究者與學生", line: "訪談、討論課的錄音快速變成文字稿，標好講者，整理分析省一半時間。" },
  ];
  return (
    <section id="who" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <SectionHeading eyebrow="Who it's for" title="給每個要開會、又不想做紀錄的人" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {people.map((p, i) => (
            <article
              key={p.who}
              className="group relative overflow-hidden rounded-3xl border border-line bg-card p-7 transition hover:-translate-y-1 hover:border-line-2 hover:shadow-[0_20px_40px_-25px_rgba(27,24,20,0.35)]"
            >
              <span className={`speaker-${i} inline-block rounded-full px-3 py-1 text-xs font-medium`}>
                講者 {"ABCD"[i]}
              </span>
              <h3 className="mt-5 font-serif text-2xl font-black text-ink">{p.who}</h3>
              <p className="mt-3 leading-7 text-ink-2">{p.line}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowToStart() {
  const steps = [
    { title: "註冊帳號", desc: "只要 Email 和密碼，十秒完成。你的紀錄只有你自己看得到。" },
    { title: "上傳錄音", desc: "把手機或會議軟體錄下的檔案拖進來，最大 25MB，幫會議取個名字。" },
    { title: "拿到會議紀錄", desc: "幾十秒到幾分鐘後，逐字稿、摘要、重點、待辦一次到齊，隨時回來查看與重聽。" },
  ];
  return (
    <section id="how" className="scroll-mt-20 border-t border-line bg-paper-2/60">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <SectionHeading eyebrow="How to start" title="三個步驟，現在就能開始" />
        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
          {steps.map((s, i) => (
            <li key={s.title} className="relative">
              <div className="flex items-center gap-4">
                <span className="font-serif text-6xl leading-none font-black text-accent">{i + 1}</span>
                {i < steps.length - 1 && <span className="hidden h-px flex-1 bg-line-2 md:block" />}
              </div>
              <h3 className="mt-5 font-serif text-xl font-black text-ink">{s.title}</h3>
              <p className="mt-2 leading-7 text-ink-2">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-night px-6 ring-1 ring-night-ink/10 py-14 text-center sm:px-12 sm:py-20">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center text-night-ink/10">
          <Waveform bars={48} className="h-28" />
        </div>
        <h2 className="relative font-serif text-3xl leading-tight font-black text-night-ink sm:text-5xl">
          下一場會議，
          <br className="sm:hidden" />
          讓會記幫你記。
        </h2>
        <p className="relative mx-auto mt-5 max-w-md text-lg leading-8 text-night-ink/70">
          註冊免費，上傳一段錄音，看看它整理得好不好。
        </p>
        <Link
          href="/register"
          className="relative mt-9 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-4 text-base font-medium text-accent-ink transition hover:-translate-y-0.5 hover:bg-accent-hover"
        >
          建立免費帳號 <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-ink-3 sm:flex-row sm:px-6">
        <span className="inline-flex items-center gap-2">
          <LogoMark className="size-5" />
          會記・AI 會議紀錄
        </span>
        <span>逐字稿由 OpenAI 語音辨識產生，AI 整理內容請自行確認</span>
      </div>
    </footer>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}
