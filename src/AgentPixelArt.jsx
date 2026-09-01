// ═══════════════════════════════════════════════════════════════
// AgentPixelArt.jsx — 8-bit Pixel Art Characters
// สไตล์: Harvest Moon / Pokémon GBC ─ Art Phase Only
//
// Agent 1 (Scout)    — Thief/Rogue      — น้ำเงิน/เทา
// Agent 2 (Wizard)   — High Wizard/Sage — ม่วง/ทอง
// Agent 3 (Watcher)  — Assassin/Shadow  — ดำ/แดง
// Agent 4 (Evaluator)— Professor        — เขียว/ทอง
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';

// ─── Canvas Constants ────────────────────────────────────────
const PX = 4; // 1 logical pixel = 4 screen pixels
const W = 12; // sprite width  (logical pixels)
const H = 20; // sprite height (logical pixels)

// ─── SVG Renderer ───────────────────────────────────────────
const PixelLayer = ({ grid, palette }) =>
  grid.flatMap((row, r) =>
    row.split('').map((k, c) => {
      if (k === '.' || !palette[k]) return null;
      return (
        <rect
          key={`${r}-${c}`}
          x={c * PX} y={r * PX}
          width={PX} height={PX}
          fill={palette[k]}
          shapeRendering="crispEdges"
        />
      );
    })
  ).filter(Boolean);

// ═══════════════════════════════════════════════════════════════
// ❶  AGENT 1 — THE SCOUT  (Thief/Rogue · Navy/Steel Blue)
// ═══════════════════════════════════════════════════════════════
// K=outline  N=darkNavy  n=navy  S=skin  s=darkSkin
// e=eyes     W=white     G=gray  g=ltGray  B=boot
const SCOUT_PALETTE = {
  K: '#0f172a',
  N: '#1e3a5f',
  n: '#2d5986',
  S: '#f5c8a0',
  s: '#d4956a',
  e: '#1e293b',
  W: '#f8fafc',
  G: '#475569',
  g: '#94a3b8',
  B: '#1e293b',
  R: '#dc2626', // scarf red accent
};

// 12×20 grid. 2 walk frames (legs swap).
const SCOUT_FRAMES = [
  // ── Frame 0 · left leg forward ──────────────────
  [
    '....KNNNNK..',   // hat brim top
    '...KNNNNNNk..',  // hat body    (k unused → use N)
    '...KNNNNNNk..',
    '..KnnnnnnnnK.',  // hat shadow row
    '..KSSSSSSSSk.',  // face top
    '..KSeKKeSK..',   // eyes (K as dark pupil center)
    '..KSSSsSSK..',   // nose shadow
    '..KSSSSSK...',   // chin
    '.KWnnnnnnnWK',   // collar
    '.KNNNNNNNNNk',   // jacket
    '.KNRRnnnnNNk',   // scarf stripe
    '.KNNNNNNNNNk',   // jacket
    '.KNNNNNNNNNk',   // jacket
    '..KGGKKGGk..',   // pants top
    '..KGGKKGGk..',   // pants
    '..KGGkKGGk..',   // pants lower
    '..KGGk...k..',   // left shin forward
    '..KBBk.KGGk.',   // boots · right leg back
    '..KBBk.KBBk.',   // boots
    '..eBBe..BBe.',   // foot flat
  ],
  // ── Frame 1 · right leg forward ─────────────────
  [
    '....KNNNNK..',
    '...KNNNNNNk..',
    '...KNNNNNNk..',
    '..KnnnnnnnnK.',
    '..KSSSSSSSSk.',
    '..KSeKKeSK..',
    '..KSSSsSSK..',
    '..KSSSSSK...',
    '.KWnnnnnnnWK',
    '.KNNNNNNNNNk',
    '.KNRRnnnnNNk',
    '.KNNNNNNNNNk',
    '.KNNNNNNNNNk',
    '..KGGKKGGk..',
    '..KGGKKGGk..',
    '...KGGkKGGk.',  // right shin forward
    '.KGGk..KGGk.',  // left leg back
    '.KBBk..KBBk.',
    '.KBBk..KBBk.',
    '..BBe...BBe.',
  ],
];

// ═══════════════════════════════════════════════════════════════
// ❷  AGENT 2 — THE WIZARD  (High Wizard/Sage · Purple/Gold)
// ═══════════════════════════════════════════════════════════════
// V=darkViolet  v=violet  L=lavender  Y=gold  y=darkGold
// S=skin  e=eyes  W=white  K=outline  M=magenta star
const WIZARD_PALETTE = {
  K: '#1e1b4b',
  V: '#4c1d95',
  v: '#7c3aed',
  L: '#c4b5fd',
  Y: '#f59e0b',
  y: '#d97706',
  S: '#f5c8a0',
  s: '#d4956a',
  e: '#4c1d95',
  W: '#faf5ff',
  M: '#ec4899',
  m: '#be185d',
};

const WIZARD_FRAMES = [
  // ── Frame 0 · idle / floating ───────────────────
  [
    '....KVVVVk..',   // hat tip
    '...KVVVVVVk.',   // hat upper
    '..KVVVVVVVk.',   // hat mid
    '.KVVyYYyVVk.',   // hat band (gold stripe)
    '..KSSSSSSk..',   // face top
    '..KSeSeSk..',    // eyes — friendly dots
    '..KSSsSSSk..',   // face lower
    '..KSSSSSK..',    // chin
    '.KLvvvvvvLK',   // collar shawl
    '.KVvvYyvvVK',   // robe top + belt buckle
    '.KVVVvVVVVK',   // robe
    '.KVVvvVvVVK',   // robe shimmer
    '.KVVVVVVVVk',   // robe lower
    '.KVVVVVVVVk',   // robe lower
    '..KVVKKVVk.',   // leg openings in robe
    '..KVVKKVVk.',
    '..KVVk.KVVk',   // feet peek out
    '..KVVk.KVVk',
    '..KYYe.KYYe',   // gold tipped boots
    '..eYYe..YYe',
  ],
  // ── Frame 1 · slight bob (head up 1px, hem sways) ──
  [
    '....KVVVVk..',
    '...KVVVVVVk.',
    '..KVVVVVVVk.',
    '.KVVyYYyVVk.',
    '..KSSSSSSk..',
    '..KSeSeSk..',
    '..KSSsSSSk..',
    '..KSSSSSK..',
    '.KLvvvvvvLK',
    '.KVvvYyvvVK',
    '.KVVVvVVVVK',
    '.KVVvvVvVVK',
    '.KVVVVVVVVk',
    '.KVVVVVVVVk',
    '..KVVKKVVk.',
    '..KVVKKVVk.',
    '..KVVk.KVVk',
    '..KYYe.KVVk',   // left boot forward
    '..KYYe.KYYe',
    '...YYe..YYe',
  ],
];

// ═══════════════════════════════════════════════════════════════
// ❸  AGENT 3 — THE WATCHER  (Assassin/Shadow · Black/Red)
// ═══════════════════════════════════════════════════════════════
// D=darkest  d=dark  r=darkRed  R=red  O=redOrange(warning glow)
// K=outline  G=darkGray  g=gray  S=skin(hidden)
const WATCHER_PALETTE = {
  K: '#000000',
  D: '#0d0d0d',
  d: '#1c1917',
  G: '#292524',
  g: '#44403c',
  r: '#7f1d1d',
  R: '#dc2626',
  O: '#f97316',
  S: '#f5c8a0', // barely visible skin
  W: '#fafafa',
};

const WATCHER_FRAMES = [
  // ── Frame 0 · silent patrol ─────────────────────
  [
    '....KDDDDk..',   // hood tip
    '...KDDDDDDk.',   // hood
    '..KDDDDDDDk.',   // hood deep
    '..KDDDDDDDk.',   // hood shadow
    '..KDDDDDDDk.',   // masked face — no skin
    '..KDRrKrRDk',   // glowing eyes (red!)
    '..KDDDDDDDk.',   // face lower hidden
    '..KDDDDDDDk.',   // chin wrap
    '.KGDDdddDDGK',  // shoulder wrap
    '.KGDDDgDDDGK',  // body
    '.KDDDDgDDDDK',  // body
    '.KrDDDgDDDrK',  // dark red trim sides
    '.KDDDDgDDDDK',  // body
    '.KDDDDgDDDDK',  // body lower
    '..KDDkKDDk..',  // leg shadows
    '..KDDkKDDk..',
    '..KDDk.KDDk.',  // feet
    '..KDDk.KDDk.',
    '..KDDe..KDDe',  // shadow boots
    '..eDDe...DDe',
  ],
  // ── Frame 1 · step ──────────────────────────────
  [
    '....KDDDDk..',
    '...KDDDDDDk.',
    '..KDDDDDDDk.',
    '..KDDDDDDDk.',
    '..KDDDDDDDk.',
    '..KDRrKrRDk',
    '..KDDDDDDDk.',
    '..KDDDDDDDk.',
    '.KGDDdddDDGK',
    '.KGDDDgDDDGK',
    '.KDDDDgDDDDK',
    '.KrDDDgDDDrK',
    '.KDDDDgDDDDK',
    '.KDDDDgDDDDK',
    '..KDDkKDDk..',
    '..KDDkKDDk..',
    '.KDDk..KDDk.',  // step swap
    '.KDDk..KDDk.',
    '.KDDe..KDDe.',
    '..DDe...DDe.',
  ],
];

// ═══════════════════════════════════════════════════════════════
// ❹  AGENT 4 — THE EVALUATOR  (Professor/Alchemist · Green/Gold)
// ═══════════════════════════════════════════════════════════════
// E=darkEmerald  e=emerald  t=teal  Y=gold  y=darkGold
// A=white coat  a=ltGray  S=skin  H=grayHair  K=outline
// c=glassFrame  P=paper/scroll
const EVALUATOR_PALETTE = {
  K: '#14532d',
  E: '#166534',
  e: '#16a34a',
  t: '#0d9488',
  Y: '#f59e0b',
  y: '#d97706',
  A: '#f8fafc',
  a: '#e2e8f0',
  S: '#f5c8a0',
  s: '#d4956a',
  H: '#94a3b8', // silver hair
  h: '#64748b', // dark silver
  c: '#1e293b', // glasses dark frame
  P: '#fef9c3', // paper yellow
  p: '#fde68a',
};

const EVALUATOR_FRAMES = [
  // ── Frame 0 · writing ───────────────────────────
  [
    '....KHHHHk..',   // silver hair top
    '...KHHHHHHk.',   // hair
    '...KHhHhHHk.',   // hair streaks
    '..KHHHHHHHk.',   // hair wide
    '..KSSSSSSSk.',   // face
    '..KcScKcSck.',   // glasses frames over eyes
    '..KSSsSSSk..',   // face lower
    '..KSSSSSSK..',   // chin
    '.KAAAAAAAAAk',   // white coat collar
    '.KAEeEEeEAk',   // coat + green vest
    '.KAEeYyeEAk',   // coat + gold button
    '.KAEeEEeEAk',   // coat
    '.KAEEEEEEAk',   // coat lower
    '.KAEEEEEEAk',
    '..KaAkKAak.',   // trouser legs (off-white)
    '..KaAkKAak.',
    '..KaAk.KAak',   // feet
    '..KtAk.KAak',   // teal shoes
    '..KtAe..Ate',   // shoes
    '..etAe..Ate',
  ],
  // ── Frame 1 · arm raises slightly (writing) ────
  [
    '....KHHHHk..',
    '...KHHHHHHk.',
    '...KHhHhHHk.',
    '..KHHHHHHHk.',
    '..KSSSSSSSk.',
    '..KcScKcSck.',
    '..KSSsSSSk..',
    '..KSSSSSSK..',
    '.KAAAAAAAAAk',
    '.KAEeEEeEAk',
    '.KAEeYyeEAk',
    'PAEEEEEEEAk.',  // P=paper held left, arm raised
    'PPAEEEEEEAk.',  // paper
    '.KAEEEEEEAk',
    '..KaAkKAak.',
    '..KaAkKAak.',
    '..KaAk.KAak',
    '..KtAk.KAak',
    '..KtAe..Ate',
    '..etAe..Ate',
  ],
];

// ═══════════════════════════════════════════════════════════════
// AGENT REGISTRY
// ═══════════════════════════════════════════════════════════════
const AGENTS = {
  scout:     { frames: SCOUT_FRAMES,     palette: SCOUT_PALETTE,     label: '🕵️ Scout',     glow: '#38bdf8' },
  wizard:    { frames: WIZARD_FRAMES,    palette: WIZARD_PALETTE,    label: '🧠 Wizard',    glow: '#c084fc' },
  watcher:   { frames: WATCHER_FRAMES,   palette: WATCHER_PALETTE,   label: '⏱️ Watcher',   glow: '#ef4444' },
  evaluator: { frames: EVALUATOR_FRAMES, palette: EVALUATOR_PALETTE, label: '📊 Evaluator', glow: '#34d399' },
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
/**
 * AgentPixelArt — renders a single 8-bit pixel art agent.
 *
 * Props:
 *   type    : 'scout' | 'wizard' | 'watcher' | 'evaluator'
 *   scale   : pixel multiplier (default 4)
 *   flip    : boolean — mirror horizontally when walking left
 *   fps     : animation frames per second (default 4)
 *   showGlow: boolean — ambient glow ring under feet
 */
export const AgentPixelArt = ({
  type = 'scout',
  scale = 4,
  flip = false,
  fps = 4,
  showGlow = true,
  style = {},
  className = '',
}) => {
  const [frame, setFrame] = useState(0);
  const agent = AGENTS[type] || AGENTS.scout;
  const totalFrames = agent.frames.length;

  // Walk cycle animation
  useEffect(() => {
    const id = setInterval(() => {
      setFrame(f => (f + 1) % totalFrames);
    }, 1000 / fps);
    return () => clearInterval(id);
  }, [fps, totalFrames]);

  const svgW = W * PX;
  const svgH = H * PX;

  return (
    <div
      className={`relative inline-flex flex-col items-center select-none ${className}`}
      style={style}
    >
      {/* Ambient glow under feet */}
      {showGlow && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full blur-md opacity-60"
          style={{
            width: svgW * 0.8,
            height: 6,
            background: agent.glow,
            boxShadow: `0 0 12px 4px ${agent.glow}`,
          }}
        />
      )}

      {/* Pixel Sprite SVG */}
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{
          imageRendering: 'pixelated',
          transform: flip ? 'scaleX(-1)' : 'scaleX(1)',
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <PixelLayer
          grid={agent.frames[frame]}
          palette={agent.palette}
        />
      </svg>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PREVIEW GALLERY  (dev-only, ใช้ทดสอบดูหน้าตาก่อน integrate)
// ═══════════════════════════════════════════════════════════════
export default function AgentPixelArtGallery() {
  const types = ['scout', 'wizard', 'watcher', 'evaluator'];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-12 p-8"
      style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0d1b2a 50%, #0a1628 100%)' }}
    >
      {/* Stars background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-60"
            style={{
              width: Math.random() > 0.7 ? 2 : 1,
              height: Math.random() > 0.7 ? 2 : 1,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `pulse ${2 + Math.random() * 3}s infinite`,
            }}
          />
        ))}
      </div>

      <h1 className="text-amber-400 font-black text-3xl tracking-widest uppercase drop-shadow-lg z-10">
        ⚔️ LH Guild — Agent Roster ⚔️
      </h1>

      <div className="flex flex-wrap justify-center gap-16 z-10">
        {types.map(type => {
          const agent = AGENTS[type];
          return (
            <div key={type} className="flex flex-col items-center gap-4">
              {/* Agent card */}
              <div
                className="relative p-6 rounded-xl border-2 flex flex-col items-center gap-3"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  borderColor: agent.glow,
                  boxShadow: `0 0 20px ${agent.glow}44, inset 0 0 20px rgba(0,0,0,0.5)`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* Pixel sprite × 2 size for showcase */}
                <AgentPixelArt type={type} scale={4} fps={3} />

                {/* Name plate */}
                <div
                  className="px-4 py-1 rounded text-xs font-bold tracking-wider uppercase"
                  style={{
                    background: `${agent.glow}22`,
                    border: `1px solid ${agent.glow}88`,
                    color: agent.glow,
                  }}
                >
                  {agent.label}
                </div>
              </div>

              {/* Role description */}
              <div className="text-center max-w-[130px]">
                <p className="text-stone-400 text-[10px] leading-relaxed">
                  {{
                    scout:     'สำรวจนอกกิลด์\nดึงข้อมูลใหม่',
                    wizard:    'วางระบบเควสต์\nแปะกระดาน',
                    watcher:   'ลาดตระเวน\nตรวจจับงานล่าช้า',
                    evaluator: 'เขียนรายงาน\nสรุปสถิติรายวัน',
                  }[type]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-stone-600 text-xs z-10">Art Preview · Logic phase coming next</p>
    </div>
  );
}

