"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { GradientShimmer } from "gradient-shimmer";
import { motion } from "framer-motion";

/* ------------------------------- theming -------------------------------- */
// All colors are driven by namespaced CSS custom properties so consumers can
// re-theme by redefining `--art-*` on `.art-root` (or any ancestor). Defaults
// (light + dark) are injected via the <style> block below — no CSS import
// required.
const INK = "var(--art-ink)";
const GREEN = "var(--art-green)";
const WEIGHT_GRAY = "var(--art-weight-gray)";
const LABEL_GRAY = "var(--art-label-gray)";
const BRACKET = "var(--art-bracket)";
const PANEL_BG = "var(--art-panel-bg)";
const MUTED = "var(--art-muted)";
const BORDER = "var(--art-border)";

const MONO = 'ui-monospace, SFMono-Regular, Menlo, "Liberation Mono", monospace';

// Subtle mint scan applied to any word a connector line is currently touching.
const CONNECT_GRADIENT = [
  { position: 0.35, color: "#4ADE80" },
  { position: 0.65, color: "#BBF7D0" },
];

/* ------------------------------- timing --------------------------------- */
const ROW_H = 16;
const T = {
  START: 500,
  POPULATE: 70,
  FLICKER: 82,
  SETTLE: 90,
  SORT: 240,
  SELECT: 150,
  COMMIT: 180,
  HOLD: 1700,
  FADE: 650,
};

/* ------------------------- the scripted sentence ------------------------ */
type Cand = { word: string; prob: number };
type Step = {
  word: string;
  weight: number;
  attend: number[];
  highlight: number[] | null;
  candidates: Cand[];
};
type Reveal = { idx: number; word: string; weight: number };
type Bracket = { from: number; to: number[] };

function buildCandidates(target: string, seed: number, pool: string[]): Cand[] {
  const count = 5 + (seed % 3);
  const words: string[] = [];
  let k = 0;
  const activePool = pool.length > 0 ? pool : ["signal", "context", "capital"];
  while (words.length < count && k < activePool.length * 2) {
    const w = activePool[(seed * 7 + k * 13) % activePool.length];
    if (w.toLowerCase() !== target.toLowerCase() && !words.includes(w)) {
      words.push(w);
    }
    k++;
  }
  const winner = 0.42 + ((seed * 17) % 18) / 100;
  const cands: Cand[] = [{ word: target, prob: Number(winner.toFixed(2)) }];
  let remaining = 1 - winner;
  words.forEach((w, i) => {
    const p = Math.max(0.02, (remaining * 0.55) / (i + 1));
    remaining -= p;
    cands.push({ word: w, prob: Number(Math.max(0.02, p).toFixed(2)) });
  });
  return cands;
}

function getDeterministicWeight(word: string): number {
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    hash = word.charCodeAt(i) + ((hash << 5) - hash);
  }
  const val = Math.abs(hash % 45) + 5; // between 0.05 and 0.50
  return Number((val / 100).toFixed(2));
}

function getDeterministicAttend(index: number, word: string): number[] {
  if (index === 0) return [];
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    hash = word.charCodeAt(i) + ((hash << 5) - hash);
  }
  const count = Math.min(3, Math.max(1, Math.abs(hash % 3) + 1)); // 1 to 3 connections
  const targets: number[] = [];
  for (let c = 0; c < count; c++) {
    const targetIdx = Math.abs((hash + c * 7) % index);
    if (!targets.includes(targetIdx)) {
      targets.push(targetIdx);
    }
  }
  return targets.sort((a, b) => a - b);
}

function jitter(v: number, amt: number): number {
  return Math.min(0.98, Math.max(0.01, v + (Math.random() - 0.5) * amt));
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function WordBounce({ word }: { word: string }) {
  const letters = word.split("");
  return (
    <span style={{ display: "inline-flex" }}>
      {letters.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 5, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            damping: 24,
            stiffness: 260,
            delay: i * 0.02,
          }}
          style={{ display: "inline-block" }}
        >
          {char === " " ? " " : char}
        </motion.span>
      ))}
    </span>
  );
}

const LIGHT_VARS = `
  --art-ink:#1a1a1a;
  --art-green:#2ecc71;
  --art-weight-gray:#b4b4b4;
  --art-label-gray:#9aa0a6;
  --art-bracket:#c8cacd;
  --art-panel-bg:#ffffff;
  --art-muted:#6B7280;
  --art-border:rgba(0,0,0,0.1);
`;
const DARK_VARS = `
  --art-ink:#F3F4F6;
  --art-green:#4ADE80;
  --art-weight-gray:#6B7280;
  --art-label-gray:#9CA3AF;
  --art-bracket:rgba(255,255,255,0.15);
  --art-panel-bg:#050505;
  --art-muted:#9CA3AF;
  --art-border:rgba(255,255,255,0.1);
`;

const CSS = `
.art-root{${LIGHT_VARS}}
.art-root[data-theme="dark"]{${DARK_VARS}}
.art-root[data-theme="light"]{${LIGHT_VARS}}
@media (prefers-color-scheme: dark){
  .art-root:not([data-theme="light"]){${DARK_VARS}}
}
@keyframes art-word-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.art-word-in{animation:art-word-in .24s cubic-bezier(.22,.61,.36,1) both}
@keyframes art-fade-in{from{opacity:0}to{opacity:1}}
.art-fade-in{animation:art-fade-in .22s ease-out both}
@keyframes art-caret{0%,100%{opacity:0.2}50%{opacity:1}}
.art-caret{animation:art-caret 1.4s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){
  .art-word-in,.art-fade-in{animation-duration:.01ms}
  .art-caret{animation:none}
}
`;

export interface AutoregressiveTextProps {
  /** The sentence to generate, token by token. */
  text: string;
  /** Candidate word pool shown in the "thinking" panel. */
  pool?: string[];
  /** Playback rate multiplier (higher = faster). */
  speed?: number;
  /** Font size of the generated sentence, in px. */
  fontSize?: number;
  /** Horizontal space between words, in em. */
  wordSpacing?: number;
  /** How many candidates to surface per token. */
  poolSize?: number;
  /** GradientShimmer preset applied to highlighted words. */
  shimmer?: string;
  /** Text alignment of the generated sentence. */
  align?: "left" | "center" | "right";
  /** Draw the attention-span brackets between words. */
  showAttentionLines?: boolean;
  /** Pause playback. */
  paused?: boolean;
  /** Restart the animation once it completes. */
  loop?: boolean;
  /** Color theme. `"system"` (default) follows the OS preference. */
  theme?: "light" | "dark" | "system";
  /** Root styling / layout hook. */
  className?: string;
  /** Fires once the full sentence has been generated. */
  onComplete?: () => void;
}

const DEFAULT_POOL = [
  "causal", "decoder", "probability", "recurrence", "feedback", "stochastic",
  "prediction", "sequence", "generation", "preceding", "distribution", "markov",
  "token", "model", "inference", "transformer", "attention", "weights", "latent",
  "layers", "vectors",
];

export default function AutoregressiveText({
  text,
  pool = DEFAULT_POOL,
  speed = 3,
  fontSize = 24,
  wordSpacing = 0.36,
  poolSize = 6,
  shimmer = "bay",
  align = "center",
  showAttentionLines = true,
  paused = false,
  loop = false,
  theme = "system",
  className,
  onComplete,
}: AutoregressiveTextProps) {
  const pausedRef = useRef(paused);
  const [replayTick, setReplayTick] = useState(0);

  const script = React.useMemo(() => {
    const tokens = text.split(/\s+/).filter(Boolean);
    const activePool = pool.map((w) => w.trim()).filter(Boolean);

    return tokens.map((word, i) => {
      const weight = getDeterministicWeight(word);
      const attend = getDeterministicAttend(i, word);
      const highlight = i % 3 === 2 ? attend : null;
      return {
        word,
        weight,
        attend,
        highlight,
        candidates: buildCandidates(word, i, activePool),
      } as Step;
    });
  }, [text, pool]);

  const [revealed, setRevealed] = useState<Reveal[]>([]);
  const [cands, setCands] = useState<Cand[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [label, setLabel] = useState<"THINKING" | "SORTING" | "ASSIGN">("THINKING");
  const [selecting, setSelecting] = useState(false);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [bracketPaths, setBracketPaths] = useState<{ d: string; len: number; key: string }[]>([]);
  const [drawn, setDrawn] = useState(false);
  const [hl, setHl] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const [panelKey, setPanelKey] = useState(0);
  const [resizeTick, setResizeTick] = useState(0);

  const runIdRef = useRef(0);
  const mountedRef = useRef(true);
  const hlGenRef = useRef(0);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const svgWrapRef = useRef<HTMLDivElement | null>(null);
  const prevKeyRef = useRef<string | null>(null);
  const speedRef = useRef(speed);
  const onCompleteRef = useRef(onComplete);
  const loopRef = useRef(loop);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useLayoutEffect(() => {
    if (!bracket || !svgWrapRef.current) {
      setBracketPaths([]);
      return;
    }
    const fromEl = wordRefs.current[bracket.from];
    if (!fromEl) {
      setBracketPaths([]);
      return;
    }
    const wrap = svgWrapRef.current.getBoundingClientRect();
    const f = fromEl.getBoundingClientRect();
    const cx = f.left - wrap.left + f.width / 2;
    const cTop = f.top - wrap.top;

    const paths: { d: string; len: number; key: string }[] = [];
    bracket.to.forEach((toIdx, j) => {
      const toEl = wordRefs.current[toIdx];
      if (!toEl) return;
      const t = toEl.getBoundingClientRect();
      const ex = t.left - wrap.left + t.width / 2;
      const eTop = t.top - wrap.top;
      const apex = Math.min(cTop, eTop) - (20 + j * 10);
      const d = `M ${cx.toFixed(1)} ${cTop.toFixed(1)} L ${cx.toFixed(1)} ${apex.toFixed(
        1
      )} L ${ex.toFixed(1)} ${apex.toFixed(1)} L ${ex.toFixed(1)} ${eTop.toFixed(1)}`;
      const len = Math.abs(cTop - apex) + Math.abs(ex - cx) + Math.abs(eTop - apex);
      paths.push({ d, len, key: `${bracket.from}-${toIdx}` });
    });

    const key = `${bracket.from}->${bracket.to.join(",")}`;
    const changed = prevKeyRef.current !== key;
    prevKeyRef.current = key;
    setBracketPaths(paths);

    if (changed) {
      setDrawn(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    }
  }, [bracket, resizeTick, revealed.length]);

  useEffect(() => {
    const el = svgWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setResizeTick((n) => n + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const intervals = new Set<ReturnType<typeof setInterval>>();
    const wait = (ms: number) =>
      new Promise<void>((res) => {
        let elapsed = 0;
        const interval = 16;
        const id = setInterval(() => {
          if (!mountedRef.current) {
            clearInterval(id);
            intervals.delete(id);
            return;
          }
          if (pausedRef.current) {
            return;
          }
          elapsed += interval * speedRef.current;
          if (elapsed >= ms) {
            clearInterval(id);
            intervals.delete(id);
            res();
          }
        }, interval);
        intervals.add(id);
      });

    async function run() {
      const myRun = ++runIdRef.current;
      const alive = () => runIdRef.current === myRun && mountedRef.current;

      setRevealed([]);
      setBracket(null);
      setBracketPaths([]);
      prevKeyRef.current = null;
      setHl(new Set());
      setDone(false);
      setCands([]);
      setOrder([]);
      setLabel("THINKING");
      setSelecting(false);
      setPanelKey((k) => k + 1);

      await wait(T.START);
      if (!alive()) return;

      const limit = script.length;
      for (let i = 0; i < limit; i++) {
        if (!alive()) return;
        const s = script[i];

        const poolCount = Math.max(2, Math.floor(poolSize));
        const activeCandidates = s.candidates.slice(0, poolCount);

        /* ---- PHASE 1 ---- */
        setLabel("THINKING");
        setSelecting(false);
        setPanelKey((k) => k + 1);

        const initialOrder = shuffle(activeCandidates.map((c) => c.word));
        const initialCands = activeCandidates.map((c) => ({ word: c.word, prob: jitter(c.prob, 0.5) }));

        setOrder([]);
        setCands([]);

        for (let idx = 1; idx <= initialOrder.length; idx++) {
          if (!alive()) return;
          setOrder(initialOrder.slice(0, idx));
          setCands(initialCands.filter(c => initialOrder.slice(0, idx).includes(c.word)));
          await wait(T.POPULATE * 2.2);
        }

        if (!alive()) return;

        /* ---- PHASE 2 ---- */
        const flickers = 2 + (i % 2);
        for (let f = 0; f < flickers; f++) {
          const amt = 0.5 * (1 - f / flickers) + 0.06;
          setCands(activeCandidates.map((c) => ({ word: c.word, prob: jitter(c.prob, amt) })));
          await wait(T.FLICKER);
          if (!alive()) return;
        }
        setCands(activeCandidates.map((c) => ({ ...c })));
        await wait(T.SETTLE);
        if (!alive()) return;

        /* ---- PHASE 3 ---- */
        setLabel("SORTING");
        setOrder(activeCandidates.map((c) => c.word));
        await wait(T.SORT);
        if (!alive()) return;

        /* ---- PHASE 4 ---- */
        setLabel("ASSIGN");
        setSelecting(true);
        await wait(T.SELECT * 1.5);
        if (!alive()) return;

        /* ---- PHASE 5 ---- */
        setRevealed((prev) => [...prev, { idx: i, word: s.word, weight: s.weight }]);
        setSelecting(false);

        /* ---- PHASE 6 ---- */
        setBracket(s.attend.length ? { from: i, to: s.attend } : null);

        /* ---- PHASE 6b ---- */
        if (s.highlight && s.highlight.length) {
          const gen = ++hlGenRef.current;
          setHl(new Set(s.highlight));
          wait(950).then(() => {
            if (alive() && hlGenRef.current === gen) setHl(new Set());
          });
        }
        await wait(T.COMMIT);
        if (!alive()) return;
      }

      setBracket(null);
      setDone(true);
      onCompleteRef.current?.();

      if (loopRef.current) {
        await wait(T.HOLD);
        if (!alive()) return;
        setReplayTick((t) => t + 1);
      }
    }

    run();
    return () => {
      runIdRef.current++;
      mountedRef.current = false;
      intervals.forEach((id) => clearInterval(id));
    };
  }, [script, poolSize, replayTick]);

  const connectedSet = bracket ? new Set(bracket.to) : null;

  return (
    <div
      className={["art-root", className].filter(Boolean).join(" ")}
      data-theme={theme === "system" ? undefined : theme}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={svgWrapRef} style={{ position: "relative", minWidth: 0, width: "100%" }}>
        {/* attention-span bracket overlay */}
        {showAttentionLines && (
          <svg
            style={{
              pointerEvents: "none",
              position: "absolute",
              inset: 0,
              height: "100%",
              width: "100%",
              overflow: "visible",
              zIndex: 5,
            }}
            aria-hidden
          >
            {bracketPaths.map((p) => (
              <path
                key={p.key}
                d={p.d}
                fill="none"
                stroke={BRACKET}
                strokeWidth={1}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: p.len,
                  strokeDashoffset: drawn ? 0 : p.len,
                  transition: "stroke-dashoffset .45s ease-out",
                }}
              />
            ))}
          </svg>
        )}

        {/* the generated sentence */}
        <div
          style={{
            position: "relative",
            lineHeight: 2.8,
            letterSpacing: "-0.01em",
            color: INK,
            fontSize: `${fontSize}px`,
            textAlign: align,
          }}
        >
          {revealed.map((r, idx) => {
            const isHot = hl.has(r.idx);
            const isConnected = !isHot && !!connectedSet?.has(r.idx);
            const isLast = idx === revealed.length - 1;

            const wordContent = isLast ? (
              <WordBounce word={r.word} />
            ) : (
              r.word
            );

            return (
              <span
                key={r.idx}
                className="art-word-in"
                style={{
                  position: "relative",
                  display: "inline-block",
                  transformOrigin: "center center",
                  lineHeight: 1,
                  marginRight: `${wordSpacing}em`,
                }}
              >
                <span
                  ref={(el) => {
                    wordRefs.current[r.idx] = el;
                  }}
                  style={{ display: "inline-block", position: "relative" }}
                >
                  {/* Ghost text to guarantee stable layout bounds */}
                  <span
                    style={{
                      opacity: 0,
                      pointerEvents: "none",
                      userSelect: "none",
                      display: "inline-block",
                    }}
                  >
                    {r.word}
                  </span>

                  {/* Active visible content */}
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isHot ? (
                      <GradientShimmer gradient={shimmer as any} className="art-shimmer">
                        {r.word}
                      </GradientShimmer>
                    ) : isConnected ? (
                      <GradientShimmer
                        gradient={CONNECT_GRADIENT}
                        duration={0.9}
                        pauseBetween={120}
                        spread={4}
                        className="art-shimmer"
                      >
                        {r.word}
                      </GradientShimmer>
                    ) : (
                      wordContent
                    )}
                  </span>
                </span>
                {/* attention weight beneath the word */}
                <span
                  className="art-fade-in"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "100%",
                    marginTop: "4px",
                    fontFamily: MONO,
                    fontSize: "10px",
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                    color: isHot ? GREEN : WEIGHT_GRAY,
                    transition: "color .5s ease",
                  }}
                >
                  {r.weight.toFixed(2)}
                </span>
              </span>
            );
          })}

          {/* generation caret & cursor-anchored box */}
          {!done && (
            <span
              style={{
                position: "relative",
                display: "inline-block",
                width: "2px",
                height: "0.92em",
                verticalAlign: "middle",
                marginLeft: "0.25rem",
              }}
            >
              <span
                className="art-caret"
                style={{ position: "absolute", inset: 0, backgroundColor: INK }}
              />

              {/* Floating thinking panel */}
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "1rem",
                  background: PANEL_BG,
                  padding: "0.75rem",
                  zIndex: 30,
                  width: "10rem",
                  fontFamily: MONO,
                  fontSize: "9px",
                  lineHeight: 1.4,
                  transition: "background-color 0.3s ease",
                }}
              >
                {/* State label */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: `1px solid ${BORDER}`,
                    paddingBottom: "0.375rem",
                    marginBottom: "0.375rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <span
                      style={{
                        fontSize: "8px",
                        textTransform: "uppercase",
                        color: LABEL_GRAY,
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                </div>

                {/* Candidate list */}
                <div
                  key={panelKey}
                  className="art-fade-in"
                  style={{ position: "relative", height: (cands.length || 6) * ROW_H }}
                >
                  {cands.map((c) => {
                    const rank = order.indexOf(c.word);
                    const r = rank < 0 ? 0 : rank;
                    const isTop = r === 0;
                    const color = isTop ? INK : r <= 2 ? LABEL_GRAY : MUTED;
                    return (
                      <div
                        key={c.word}
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          width: "100%",
                          height: ROW_H,
                          transform: `translateY(${r * ROW_H}px)`,
                          transition: "transform .26s cubic-bezier(.22,.61,.36,1)",
                        }}
                      >
                        <div
                          className="art-fade-in"
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            justifyContent: "space-between",
                            width: "100%",
                            fontFamily: MONO,
                            fontSize: "10px",
                            fontWeight: isTop ? 600 : 400,
                            color,
                            backgroundColor: isTop && selecting ? "rgba(74,222,128,0.12)" : "transparent",
                            transition: "color .2s ease, background-color .2s ease",
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.word}
                          </span>
                          <span
                            style={{
                              fontVariantNumeric: "tabular-nums",
                              paddingLeft: "12px",
                              color: isTop ? (selecting ? GREEN : INK) : color,
                            }}
                          >
                            {c.prob.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
