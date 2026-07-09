# autoregressive-text

A self-contained React animation that generates text **token-by-token like an autoregressive
language model** — a candidate-sampling "thinking" panel, attention-span brackets between words, a
subtle per-letter reveal, and a blinking caret.

- **Zero-config** — no Tailwind, no CSS import. Drop it in and it works.
- **Themeable** — light/dark by default (follows the OS), fully overridable via CSS variables.
- **Accessible** — respects `prefers-reduced-motion`.
- **RSC-ready** — ships the `"use client"` directive; works in the Next.js app router.

## Install

```bash
npm i autoregressive-text
```

`react`, `react-dom`, and `framer-motion` are peer dependencies.

## Usage

```tsx
import { AutoregressiveText } from "autoregressive-text";

export default function Demo() {
  return (
    <AutoregressiveText
      text="Autoregressive models predict the next token by feeding previous predictions back into the context."
      pool={["causal", "decoder", "probability", "sequence", "attention", "weights"]}
    />
  );
}
```

That's it — no stylesheet import required.

## Props

| Prop                 | Type                                | Default    | Description                                              |
| -------------------- | ----------------------------------- | ---------- | ------------------------------------------------------- |
| `text`               | `string`                            | —          | The sentence to generate, token by token. **Required.** |
| `pool`               | `string[]`                          | built-in   | Candidate words shown in the "thinking" panel.          |
| `speed`              | `number`                            | `3`        | Playback rate multiplier (higher = faster).             |
| `fontSize`           | `number`                            | `24`       | Font size of the generated sentence, in px.             |
| `wordSpacing`        | `number`                            | `0.36`     | Horizontal space between words, in em.                  |
| `poolSize`           | `number`                            | `6`        | How many candidates to surface per token.               |
| `shimmer`            | `string`                            | `"bay"`    | GradientShimmer preset for highlighted words.           |
| `align`              | `"left" \| "center" \| "right"`     | `"center"` | Text alignment of the generated sentence.               |
| `showAttentionLines` | `boolean`                           | `true`     | Draw the attention-span brackets between words.         |
| `paused`             | `boolean`                           | `false`    | Pause playback.                                         |
| `loop`               | `boolean`                           | `false`    | Restart the animation once it completes.                |
| `theme`              | `"light" \| "dark" \| "system"`     | `"system"` | Color theme. `"system"` follows the OS preference.      |
| `panelScale`         | `number`                            | `1`        | Scale multiplier for the floating "thinking" panel.     |
| `className`          | `string`                            | —          | Extra class on the root element (for layout).           |
| `onComplete`         | `() => void`                        | —          | Fires once the full sentence has been generated.        |

## Theming

Colors are driven by namespaced CSS custom properties on the `.art-root` element. Override any of
them from your own CSS:

```css
.art-root {
  --art-ink: #111;          /* main text */
  --art-green: #2ecc71;     /* highlight / selected */
  --art-weight-gray: #b4b4b4;
  --art-label-gray: #9aa0a6;
  --art-bracket: #c8cacd;   /* attention brackets */
  --art-panel-bg: #ffffff;  /* thinking panel */
  --art-muted: #6b7280;
  --art-border: rgba(0, 0, 0, 0.1);
}
```

Sensible light and dark defaults ship built-in. Force one with `theme="light"` / `theme="dark"`, or
leave it on `"system"` to follow `prefers-color-scheme`.

## License

MIT
