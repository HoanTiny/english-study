"use client";

// Vòng tiến độ tròn (SVG) — track mờ + cung tô màu gold, animate mượt khi value đổi.
export default function ProgressRing({
  value,
  size = 132,
  stroke = 12,
  color = "var(--gold)",
  track = "var(--ring-track)",
  glow = false,
  children,
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  glow?: boolean;
  children?: React.ReactNode;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{
            transition: "stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1)",
            filter: glow ? `drop-shadow(0 2px 8px ${color}80)` : undefined,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

