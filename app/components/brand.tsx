import Link from "next/link";

/** 品牌標誌：一張紙上畫了聲波 */
export function LogoMark({ className = "size-8", inverted = false }: { className?: string; inverted?: boolean }) {
  const [bg, fg] = inverted ? ["var(--night-ink)", "var(--night)"] : ["var(--ink)", "var(--paper)"];
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill={bg} />
      <g stroke={fg} strokeWidth="2.4" strokeLinecap="round">
        <line x1="9" y1="13" x2="9" y2="19" />
        <line x1="13.5" y1="9.5" x2="13.5" y2="22.5" />
        <line x1="18" y1="12" x2="18" y2="20" />
      </g>
      <circle cx="23.5" cy="16" r="2.6" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ href = "/", inverted = false }: { href?: string; inverted?: boolean }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label="會記 首頁">
      <LogoMark inverted={inverted} />
      <span className={`font-serif text-xl font-black tracking-wide ${inverted ? "text-night-ink" : "text-ink"}`}>會記</span>
    </Link>
  );
}

/** 跳動的聲波條 */
export function Waveform({ bars = 24, className = "" }: { bars?: number; className?: string }) {
  // 固定的高度序列，伺服器與瀏覽器輸出一致（不用 Math.random 避免 hydration 不一致）
  const heights = [0.35, 0.6, 0.9, 0.5, 0.75, 1, 0.55, 0.3, 0.7, 0.95, 0.45, 0.8];
  return (
    <div className={`flex h-10 items-center gap-[3px] ${className}`} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className="animate-wave block w-[3px] rounded-full bg-current"
          style={{ height: `${heights[i % heights.length] * 100}%`, animationDelay: `${(i % 7) * -0.15}s` }}
        />
      ))}
    </div>
  );
}
