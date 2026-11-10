# Intro animation — the ticofit logo writes itself

Replaces the earlier version of this file. Two things were wrong before and both are
fixed here: the logo was a typographic stand-in instead of the real wordmark, and the
write-on wasted its first 400ms showing nothing.

Total runtime: **2.2s** to the logo landing, **2.7s** to the hero settling.

---

## 1. Use the real logo, inline

`ticofit-logo.svg` ships beside this file. Put it in `src/components/brand/` and
**inline it as a React component** — do not load it through `next/image`, an `<img>`,
or a CSS background.

Inline matters for three reasons:

- **No load race.** An external image can arrive 200–400ms late, by which point the
  write-on has already run against a zero-height box and the logo simply pops in
  finished. That is the bug you are looking at right now.
- **Sharp at every size.** It is drawn at 560px wide and shrinks to 190px.
- **Recolourable.** `fill: currentColor` on the path lets the same component serve the
  cream header and the deep-green footer. Do not ship one file per colour.

The viewBox is `0 0 1379 585`. The lockup already contains `WELLNESS CLUB` and the `®`
— there is no separate subtitle element and no separate subtitle animation.

**Never typeset the wordmark.** Not in Instrument Serif, not in anything. `tico` is a
custom geometric sans and `fit` is a connected script with a long f-swash. No font
reproduces it.

## 2. CSS only

No motion/framer-motion, no GSAP. The logo is the first paint; it cannot wait for a JS
bundle to hydrate. The only JavaScript is the once-per-session check.

---

## The sequence

| ms | What happens |
|---|---|
| 0 → 1100 | **The wordmark writes on**, left to right, at a steady pace. |
| 1100 → 1400 | Hold. The logo sits complete and centred. |
| 1400 → 2220 | **The logo shrinks and travels** into its navbar slot. |
| 1750 → 2370 | Navbar links rise in. |
| 1820 → 2740 | Headline, image, paragraph, buttons — 80ms apart. |

### The write-on

```css
@keyframes tf-write {
  0%   { clip-path: inset(0 100% -8% 0); }
  100% { clip-path: inset(0 -2% -8% 0); }
}
.logo svg { animation: tf-write 1100ms cubic-bezier(0.22, 0.62, 0.28, 1) both; }
```

**The easing is the whole trick.** The earlier `cubic-bezier(0.76, 0, 0.24, 1)` was
slow-fast-slow, so the mask crawled across the thin stem of the `t` for 400ms while
the screen looked empty, then dumped the rest in a rush. `cubic-bezier(0.22, 0.62,
0.28, 1)` is near-constant with a gentle landing — it reads like a hand moving at
writing speed.

1100ms is also deliberate. At 1500ms the mask finished the `®` around 1000ms and spent
the remaining 500ms wiping empty canvas to the right of it. Dead time.

### The travel

```css
@keyframes tf-travel {
  0%   { transform: translate(calc(50vw - var(--nav-x) - 50%),
                              calc(45vh - var(--nav-y) - 50%)) scale(1); }
  100% { transform: translate(0, 0) scale(var(--end-scale)); }
}
.logo { animation: tf-travel 820ms cubic-bezier(0.65, 0, 0.35, 1) 1400ms both; }
```

`transform-origin: left top`.

Give the travel its own `animation-delay`. Do not fake the hold with a `0%, 54%`
keyframe pair — the easing then applies across the hold too and the motion starts
drifting early.

**Drawn at full size, scaled DOWN.** Drawing at 190px and scaling up 3× renders a
blurry wordmark for the whole shot. Draw at 560px, scale to 0.34.

Animate `transform` only — never `top`/`left`/`width`.

### Sizes

| | Desktop (≥760px) | Mobile (<760px) |
|---|---|---|
| Drawn width | `560px` | `300px` |
| `--end-scale` | `0.34` | `0.433` |
| Navbar width | 190px (owner decision) | 130px |
| Share of viewport while centred | ~41% | ~77% |

### The hero behind

`opacity 0 → 1`, `translateY(18px) → 0`, `cubic-bezier(0.16, 1, 0.3, 1)`.

| Element | Duration | Delay |
|---|---|---|
| Navbar links | 620ms | 1750ms |
| Headline | 760ms | 1820ms |
| Hero image | 900ms | 1860ms |
| Paragraph | 760ms | 1900ms |
| Buttons | 760ms | 1980ms |

---

## Rules that are not optional

**One element, not two.** The logo that writes is the same node that ends up in the
header. On the home page's first load the header renders without its logo and this one
lands in the empty slot. Two separate elements cross-fading always shows a 1px jump at
the end.

**Once per session.** `sessionStorage` key `ticofit:intro`. If set, render the finished
hero with no animation and a normal header. Read it inside `useEffect`, never during
render — it does not exist on the server and will break hydration.

**`prefers-reduced-motion`.** Wrap every keyframe rule in
`@media (prefers-reduced-motion: no-preference)`. A large object crossing the viewport
can trigger vestibular symptoms; this is a requirement, not a nicety.

**No layout shift.** The hero holds its final height from first paint. Only `opacity`
and `transform` change. CLS must be 0.

---

## Definition of done

Beyond `AGENTS.md`:

1. Record the intro at 1440px and 390px and **watch both**. Do not report this done
   from a static screenshot — every bug in this animation so far was a timing bug that
   a screenshot cannot show.
2. Step through the recording. By 200ms part of the wordmark must already be visible.
   If the first frames are empty, the easing or the asset loading is wrong.
3. Confirm the logo lands exactly on the navbar slot — no jump. Compare the last frame
   against a normal load of `/clases`.
4. Confirm the wordmark is sharp through the whole travel, not only at rest.
5. Reload with `prefers-reduced-motion: reduce` and confirm nothing animates.
6. Navigate away and back: the intro must not replay.
7. Lighthouse on `/`: CLS 0, LCP no worse than before.
