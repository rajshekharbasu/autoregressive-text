"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { AutoregressiveText } from "autoregressive-text";

type Align = "left" | "center" | "right";
type Theme = "system" | "light" | "dark";

const SHIMMERS = [
  "bay", "mint", "twilight", "peach", "spring", "tonic", "bubble", "sunrise",
];

const DEFAULT_POOL = [
  "causal", "decoder", "probability", "sequence", "attention", "weights",
  "latent", "vectors", "inference", "context",
];

export default function Home() {
  // ---- live parameters (drive the component) ----
  const [textInput, setTextInput] = useState("the model predicts each next token");
  const [text, setText] = useState(textInput);
  const [speed, setSpeed] = useState(3);
  const [fontSize, setFontSize] = useState(17);
  const [poolSize, setPoolSize] = useState(5);
  const [align, setAlign] = useState<Align>("center");
  const [lines, setLines] = useState(true);
  const [shimmer, setShimmer] = useState("bay");
  const [theme, setTheme] = useState<Theme>("system");
  const [panelScale, setPanelScale] = useState(1);
  const [loop, setLoop] = useState(true);

  // Debounce text so typing doesn't restart the animation on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setText(textInput.trim() || " "), 500);
    return () => clearTimeout(id);
  }, [textInput]);

  // ---- live generation counter ----
  const [count, setCount] = useState(0);
  const onComplete = () => setCount((c) => c + 1);

  // ---- theme drives the ENTIRE page, not just the component preview ----
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  // ---- copy install command ----
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText("npm i autoregressive-text");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  // ---- pool words (tag input: type a word + comma to add) ----
  const [pool, setPool] = useState<string[]>(DEFAULT_POOL);
  const [poolDraft, setPoolDraft] = useState("");

  const addPoolTokens = (raw: string) => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setPool((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (!next.some((w) => w.toLowerCase() === p.toLowerCase())) next.push(p);
      }
      return next;
    });
  };
  const onPoolChange = (v: string) => {
    if (v.includes(",")) {
      const parts = v.split(",");
      const rest = parts.pop() ?? "";
      addPoolTokens(parts.join(","));
      setPoolDraft(rest);
    } else {
      setPoolDraft(v);
    }
  };
  const onPoolKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (poolDraft.trim()) {
        addPoolTokens(poolDraft);
        setPoolDraft("");
      }
    } else if (e.key === "Backspace" && poolDraft === "") {
      setPool((prev) => prev.slice(0, -1));
    }
  };
  const removeTag = (w: string) =>
    setPool((prev) => prev.filter((x) => x !== w));

  let step = 0; // entrance stagger index
  const i = () => step++;

  return (
    <div className="shell">
      <main className="column">
        {/* ---- header ---- */}
        <header className="enter" style={{ "--i": i() } as CSSProperties}>
          <div className="eyebrow">
            <a
              href="https://www.rajshekhar.me/index.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              rajshekharbasu
            </a>
            <span className="sep">/</span>
            <span>npm</span>
            <span className="sep">/</span>
            <span>v0.1.2</span>
          </div>
          <h1 className="title">autoregressive-text</h1>
          <p className="tagline">
            React text that writes itself — token by token, with a live sampling
            panel and attention brackets. Zero-config, themeable, ~34 kB.
          </p>
        </header>

        {/* ---- install (directly under the title) ---- */}
        <section className="section enter" style={{ "--i": i() } as CSSProperties}>
          <div className="section-head">
            <span className="section-label">Install</span>
          </div>
          <div className="command">
            <code>
              <span className="prompt">$ </span>npm i autoregressive-text
            </code>
            <button
              className={`btn wide ${copied ? "copied" : ""}`}
              onClick={copy}
              aria-label="copy install command"
            >
              <span className="lockable">{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </section>

        {/* ---- live preview (no box — blends into the page) ---- */}
        <section className="section enter" style={{ "--i": i() } as CSSProperties}>
          <div className="preview">
            <span className="count">{String(count).padStart(3, "0")}</span>
            <AutoregressiveText
              text={text}
              pool={pool}
              speed={speed}
              fontSize={fontSize}
              poolSize={poolSize}
              align={align}
              showAttentionLines={lines}
              shimmer={shimmer}
              theme={theme}
              panelScale={panelScale}
              loop={loop}
              onComplete={onComplete}
            />
          </div>
        </section>

        {/* ---- control panel (stylised lil-gui) ---- */}
        <section className="section enter" style={{ "--i": i() } as CSSProperties}>
          <div className="section-head">
            <span className="section-label">Parameters</span>
            <span className="section-meta">live</span>
          </div>
          <div className="panel">
            <div style={{ padding: "12px 14px 8px" }}>
              <input
                className="field"
                value={textInput}
                spellCheck={false}
                aria-label="text"
                onChange={(e) => setTextInput(e.target.value)}
              />
            </div>

            <div className="pool-block">
              <span className="pool-cap">pool</span>
              <div className="tags-field">
                {pool.map((w) => (
                  <span className="tag" key={w}>
                    {w}
                    <button
                      className="tag-x"
                      onClick={() => removeTag(w)}
                      aria-label={`remove ${w}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  className="tag-input"
                  value={poolDraft}
                  placeholder={pool.length ? "+ word," : "word, word,"}
                  spellCheck={false}
                  aria-label="pool words"
                  onChange={(e) => onPoolChange(e.target.value)}
                  onKeyDown={onPoolKeyDown}
                />
              </div>
            </div>

            <div className="row">
              <span className="row-label">speed</span>
              <div className="row-control">
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={1}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                />
                <span className="row-value">{speed}×</span>
              </div>
            </div>

            <div className="row">
              <span className="row-label">fontSize</span>
              <div className="row-control">
                <input
                  type="range"
                  min={12}
                  max={28}
                  step={1}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                />
                <span className="row-value">{fontSize}</span>
              </div>
            </div>

            <div className="row">
              <span className="row-label">poolSize</span>
              <div className="row-control">
                <input
                  type="range"
                  min={2}
                  max={8}
                  step={1}
                  value={poolSize}
                  onChange={(e) => setPoolSize(Number(e.target.value))}
                />
                <span className="row-value">{poolSize}</span>
              </div>
            </div>

            <div className="row">
              <span className="row-label">align</span>
              <div className="seg" role="group" aria-label="align">
                {(["left", "center", "right"] as Align[]).map((a) => (
                  <button
                    key={a}
                    data-active={align === a}
                    onClick={() => setAlign(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="row">
              <span className="row-label">attentionLines</span>
              <input
                type="checkbox"
                className="toggle"
                checked={lines}
                aria-label="attentionLines"
                onChange={(e) => setLines(e.target.checked)}
              />
            </div>

            <div className="row">
              <span className="row-label">shimmer</span>
              <select
                className="select"
                value={shimmer}
                onChange={(e) => setShimmer(e.target.value)}
              >
                {SHIMMERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="row">
              <span className="row-label">theme</span>
              <div className="seg" role="group" aria-label="theme">
                {(["system", "light", "dark"] as Theme[]).map((t) => (
                  <button
                    key={t}
                    data-active={theme === t}
                    onClick={() => setTheme(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="row">
              <span className="row-label">panelScale</span>
              <div className="row-control">
                <input
                  type="range"
                  min={0.6}
                  max={1.6}
                  step={0.1}
                  value={panelScale}
                  onChange={(e) => setPanelScale(Number(e.target.value))}
                />
                <span className="row-value">{panelScale.toFixed(1)}×</span>
              </div>
            </div>

            <div className="row">
              <span className="row-label">loop</span>
              <input
                type="checkbox"
                className="toggle"
                checked={loop}
                aria-label="loop"
                onChange={(e) => setLoop(e.target.checked)}
              />
            </div>
          </div>
        </section>

        {/* ---- usage ---- */}
        <section className="section enter" style={{ "--i": i() } as CSSProperties}>
          <div className="section-head">
            <span className="section-label">Usage</span>
          </div>
          <div className="code">
            <pre>
{`import { `}<span className="k">AutoregressiveText</span>{` } `}<span className="k">from</span>{` `}<span className="s">"autoregressive-text"</span>{`;

<`}<span className="k">AutoregressiveText</span>{`
  text=`}<span className="s">"models predict the next token"</span>{`
  pool={[`}<span className="s">"causal"</span>{`, `}<span className="s">"decoder"</span>{`, `}<span className="s">"vectors"</span>{`]}
/>`}
            </pre>
          </div>
        </section>

        {/* ---- footer ---- */}
        <footer className="footer enter" style={{ "--i": i() } as CSSProperties}>
          <a href="https://www.npmjs.com/package/autoregressive-text">npm</a>
          <a href="https://github.com/rajshekharbasu/autoregressive-text">github</a>
          <span className="spacer" />
          <span>MIT</span>
        </footer>
      </main>
    </div>
  );
}
