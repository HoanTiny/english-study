import Link from "next/link";
import { Dela_Gothic_One, Montserrat } from "next/font/google";

// Font đúng design Figma
const dela = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dela",
  display: "swap",
});
const montserrat = Montserrat({
  weight: ["500", "600", "700"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-montserrat",
  display: "swap",
});

// Bảng màu rút từ Figma (Colors & Shadows)
const C = {
  teal: "#2B788B",
  tealLight: "#C3DCE3",
  pinkDark: "#945069",
  pinkLight: "#F2D4DC",
  greyBg: "#F6F5F4",
  greyLine: "#E0E0E0",
  greyText: "#757575",
  black: "#000000",
};

// Thẻ placeholder thay cho ảnh 3D template (bản quyền) — giữ đúng vị trí/tỉ lệ.
function Art({ emoji, tint }: { emoji: string; tint: string }) {
  return (
    <div
      className="flex aspect-[4/3] w-full items-center justify-center rounded-[28px]"
      style={{ background: `radial-gradient(circle at 50% 40%, ${tint} 0%, transparent 70%)` }}
    >
      <span className="text-[120px] leading-none drop-shadow-sm">{emoji}</span>
    </div>
  );
}

function Pill({
  children,
  bg,
  fg,
  href,
}: {
  children: React.ReactNode;
  bg: string;
  fg: string;
  href?: string;
}) {
  const cls =
    "inline-flex items-center justify-center rounded-full px-[22px] py-[14px] text-[16px] font-bold transition-transform hover:scale-[1.03] active:scale-95";
  const style = { background: bg, color: fg, fontFamily: "var(--font-montserrat)" };
  return href ? (
    <Link href={href} className={cls} style={style}>
      {children}
    </Link>
  ) : (
    <span className={cls} style={style}>
      {children}
    </span>
  );
}

const sections = [
  {
    bg: "#ffffff",
    title: "Learn a language in a playful way",
    desc: "Make learning words more fun with mini-games",
    emoji: "🧘",
    tint: C.pinkLight,
    reverse: false,
    cards: [
      { label: "Sprint →", bg: C.pinkLight, fg: C.pinkDark, href: "/" },
      { label: "Audio-call →", bg: C.tealLight, fg: C.teal, href: "/roleplay" },
    ] as { label: string; bg: string; fg: string; href: string }[],
    button: null as null | { label: string; href: string },
  },
  {
    bg: C.greyBg,
    title: "Increase your vocabulary",
    desc: "Traditional and new effective approaches to word study",
    emoji: "🎒",
    tint: C.tealLight,
    reverse: true,
    cards: [],
    button: { label: "Textbook →", href: "/notes" },
  },
  {
    bg: "#ffffff",
    title: "Watch your progress every day",
    desc: "Save statistics on your achievements, words learned, and mistakes",
    emoji: "📊",
    tint: C.pinkLight,
    reverse: false,
    cards: [],
    button: { label: "Statistics →", href: "/today" },
  },
];

export default function PreviewPage() {
  return (
    <div
      className={`${dela.variable} ${montserrat.variable}`}
      style={{ background: C.greyBg, fontFamily: "var(--font-montserrat), system-ui, sans-serif", color: C.black }}
    >
      {/* Ẩn nav kính + blob nền của app để khớp bản design phẳng */}
      <style>{`header{display:none!important}.fluid-blob-container{display:none!important}body{background:${C.greyBg}!important}`}</style>

      {/* ===== TOP NAV (theo design) ===== */}
      <nav style={{ background: C.greyBg, borderBottom: `1px solid ${C.greyLine}` }}>
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-7">
            <span style={{ fontFamily: "var(--font-dela)", fontSize: 21 }}>SpeakUp</span>
            <span className="h-4 w-px" style={{ background: C.greyLine }} />
            <Link href="/" className="text-[16px] font-semibold">Home</Link>
            <Link href="/notes" className="text-[16px] font-semibold" style={{ color: C.greyText }}>Textbook</Link>
            <Link href="/today" className="text-[16px] font-semibold" style={{ color: C.greyText }}>Statistics</Link>
            <span className="text-[16px] font-semibold" style={{ color: C.greyText }}>Games ▾</span>
          </div>
          <div className="flex items-center gap-7">
            <span className="flex items-center gap-2.5">
              <span
                className="flex h-8 items-center justify-center rounded-full px-3 text-[14px] font-bold"
                style={{ background: C.tealLight, color: C.teal }}
              >
                A
              </span>
              <span className="text-[16px] font-semibold" style={{ color: C.greyText }}>Alex</span>
            </span>
            <span className="text-[16px] font-bold">Sign Out →</span>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section style={{ background: C.greyBg }}>
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-20">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-6">
              <p className="text-[16px] font-bold uppercase tracking-[0.14em]" style={{ color: C.teal }}>
                E-Course Platform
              </p>
              <h1
                className="text-[44px] text-black sm:text-[56px]"
                style={{ fontFamily: "var(--font-dela)", lineHeight: 1.2, letterSpacing: "-0.02em" }}
              >
                Learning and teaching online, made easy.
              </h1>
              <p className="max-w-[400px] text-[18px] font-semibold leading-[1.4]" style={{ color: C.greyText }}>
                Practice your English and learn new things with the platform.
              </p>
            </div>
            <div>
              <Pill bg={C.tealLight} fg={C.teal} href="/today">About platform</Pill>
            </div>
            {/* Stats */}
            <div className="mt-2 flex items-center gap-[48px]">
              <div className="flex flex-col items-start gap-1">
                <p style={{ fontFamily: "var(--font-dela)", fontSize: 40, lineHeight: 1, letterSpacing: "-0.02em" }}>
                  600<span style={{ color: C.teal }}>+</span>
                </p>
                <p className="text-[16px] font-semibold" style={{ color: "#585858" }}>Popular words</p>
              </div>
              <span className="h-[48px] w-px" style={{ background: C.greyLine }} />
              <div className="flex flex-col items-start gap-1">
                <p style={{ fontFamily: "var(--font-dela)", fontSize: 40, lineHeight: 1, letterSpacing: "-0.02em" }}>
                  2<span style={{ color: C.teal }}>+</span>
                </p>
                <p className="text-[16px] font-semibold" style={{ color: "#585858" }}>Mini-games</p>
              </div>
            </div>
          </div>
          <Art emoji="🧒" tint={C.tealLight} />
        </div>
      </section>

      {/* ===== FEATURE SECTIONS ===== */}
      {sections.map((s) => (
        <section key={s.title} style={{ background: s.bg }}>
          <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 py-20 md:grid-cols-2">
            {/* cột chữ */}
            <div className={`flex flex-col gap-7 ${s.reverse ? "md:order-2" : ""}`}>
              <h2
                className="text-[40px] text-black"
                style={{ fontFamily: "var(--font-dela)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
              >
                {s.title}
              </h2>
              <p className="max-w-[400px] text-[18px] font-semibold leading-[1.4]" style={{ color: C.greyText }}>
                {s.desc}
              </p>
              {s.cards.length > 0 && (
                <div className="flex flex-wrap gap-4">
                  {s.cards.map((c) => (
                    <Link
                      key={c.label}
                      href={c.href}
                      className="flex h-[112px] w-[150px] items-end justify-center rounded-[14px] px-[22px] py-[14px] text-[16px] font-bold transition-transform hover:scale-[1.03]"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
              {s.button && (
                <div>
                  <Pill bg={C.tealLight} fg={C.teal} href={s.button.href}>
                    {s.button.label}
                  </Pill>
                </div>
              )}
            </div>
            {/* cột ảnh */}
            <div className={s.reverse ? "md:order-1" : ""}>
              <Art emoji={s.emoji} tint={s.tint} />
            </div>
          </div>
        </section>
      ))}

      {/* ===== FOOTER ===== */}
      <footer style={{ background: C.greyBg, borderTop: `1px solid ${C.greyLine}` }}>
        <div className="mx-auto max-w-[1180px] px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4 text-[14px] font-semibold" style={{ color: C.greyText }}>
            <div className="flex gap-[30px]">
              <span>Home</span><span>Textbook</span><span>Statistics</span><span>Sprint</span><span>Audio-call</span>
            </div>
            <div className="flex gap-[30px]">
              <span>Alex</span><span>Gabriel</span><span>Marcus</span>
            </div>
          </div>
          <div className="my-6 h-px w-full" style={{ background: C.greyLine }} />
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-2xl opacity-60">
              <span>📘</span><span>🐦</span><span>▶️</span>
            </div>
            <p className="text-[12px] font-semibold" style={{ color: C.greyText }}>
              ©2026 SpeakUp. Hybrid demo theo Figma.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
