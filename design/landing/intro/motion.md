# Intro animation — the ticofit logo writes itself

The first thing a visitor sees. The screen opens on the brand cream, the wordmark
writes itself on, then shrinks and travels into its navbar position while the rest
of the hero rises in behind it.

Approved against the prototype in `design/landing/reference/Intro.dc.html` — read that
file, it is the working implementation. This document is the spec; where the two
disagree, this document wins.

Total runtime: **1.68s**. Nothing here blocks the page: the hero markup is in the DOM
from the first paint, just transparent.

---

## Build it with CSS only

No motion/framer-motion, no GSAP, no animation library for this piece.

The logo is the first thing on screen, so it must not wait for a JS bundle to
hydrate. A JS-driven intro shows a blank cream screen for the first few hundred
milliseconds on a mid-range Android, which is exactly the impression we are trying
not to make. Put the keyframes in the global stylesheet and let the browser start
them at first paint.

The only JavaScript is the once-per-session check below.

## Component

`src/components/landing/IntroHero.tsx` — a Server Component holding the markup, with a
tiny Client Component wrapper only for the session check.

The logo is **one element** that exists once. It is not a big logo that fades out and
a separate navbar logo that fades in — it is the same node travelling from the centre
to the navbar. The site header therefore renders *without* its logo on the home page's
first load, and the intro logo lands in that empty slot. On every other route, and on
repeat visits, the header renders its logo normally.

---

## The sequence

| ms | What happens |
|---|---|
| 0 | Cream `#FFFEE1` fills the viewport. Logo centred, not yet revealed. Hero present but `opacity: 0`. |
| 0 → 760 | **The wordmark writes on.** |
| 340 → 860 | `WELLNESS CLUB` writes on, same way. |
| 860 → 1000 | Hold. The logo sits complete and centred. |
| 772 → 1680 | **The logo shrinks and travels** to its navbar slot. |
| 1180 → 1800 | Navbar links fade and rise in. |
| 1240 → 2170 | Headline, paragraph, buttons, image — staggered 80ms apart. |

### 1. The write-on

A `clip-path` inset wipes left to right across the wordmark.

```css
@keyframes tf-write {
  0%   { clip-path: inset(0 100% -20% 0); }
  100% { clip-path: inset(0 -6% -20% 0); }
}
```

- Wordmark: `760ms cubic-bezier(0.76, 0, 0.24, 1) both`
- Subtitle: `520ms cubic-bezier(0.76, 0, 0.24, 1) 340ms both`

The `-20%` bottom and `-6%` right keep descenders and the `®` from being clipped — the
italic `f` in *fit* overhangs its box.

That easing is deliberate: slow in, fast through the middle, slow out. It reads like a
hand moving. A linear wipe reads like a loading bar.

### 2. The travel

```css
@keyframes tf-travel {
  0%, 46% { transform: translate(calc(50vw - var(--nav-x) - 50%),
                                 calc(45vh - var(--nav-y) - 50%)) scale(1); }
  100%    { transform: translate(0, 0) scale(var(--end-scale)); }
}
```

`1680ms cubic-bezier(0.16, 1, 0.3, 1) both`, `transform-origin: left top`.

**The logo is drawn at full size and scales DOWN.** This matters. Drawing it at 28px
and scaling it up 5.6× renders a blurry wordmark for the whole animation. Drawing it
at 157px and scaling to 0.178 stays crisp at every frame.

The `0%, 46%` pair is what creates the hold — the element sits still for the first 772ms
while the write-on runs, then moves. One animation, no chaining, no JS timers.

Animate `transform` only. Never `top`/`left`/`width`/`font-size` — those relayout every
frame and will judder on mobile.

### 3. Sizes

| | Desktop (≥760px) | Mobile (<760px) |
|---|---|---|
| Drawn size (`font-size` on the logo) | `157px` | `68px` |
| `--end-scale` | `48/157` (0.306) | `34/68` (0.5) |
| Resulting navbar size | 48px | 34px |
| Width on screen while centred | ~41% of viewport | ~78% of viewport |

Everything inside the logo is sized in `em` so it scales with the parent:

```css
.wordmark { font-size: 1em;     line-height: 1.05; letter-spacing: -0.014em; }
.sub      { font-size: 0.268em; letter-spacing: 0.111em; margin-top: 0.107em; }
```

Navbar size was raised from 28/24px to 48/34px on 2026-11-09 (owner feedback: the
logo read too small next to reference sites); the header row grows to fit it.

41% of the viewport is the number we settled on. 19% looked like a postage stamp and
52% crowded the margins and blew the `®` out of proportion.

### 4. The hero behind

Each element: `opacity 0 → 1`, `translateY(18px) → 0`,
`cubic-bezier(0.16, 1, 0.3, 1)`.

| Element | Duration | Delay |
|---|---|---|
| Navbar links | 620ms | 1180ms |
| Headline | 760ms | 1240ms |
| Paragraph | 760ms | 1330ms |
| Buttons | 760ms | 1410ms |
| Hero image | 900ms | 1300ms |

---

## Rules that are not optional

**Once per session.** Check `sessionStorage` for `ticofit:intro`. If present, render the
hero in its final state with no animation and the header with its own logo. If absent,
run the intro and set the key. An intro that replays on every navigation turns from
charming into an obstacle by the third time.

Read `sessionStorage` inside `useEffect` in the client wrapper, never during render —
it does not exist on the server and will break hydration.

**`prefers-reduced-motion`.** Wrap every keyframe rule in
`@media (prefers-reduced-motion: no-preference)`. Users with the setting on see the
finished hero immediately. This is an accessibility requirement, not a nicety: this
animation moves a large object across the viewport, which can trigger vestibular
symptoms.

**No layout shift.** The hero occupies its final height from the first paint. The intro
only changes `opacity` and `transform`. CLS must stay at 0 — verify it.

**The logo must survive with JS disabled.** If the session check never runs, the user
should still get a usable page: the default CSS state is the finished hero, and the
intro classes are added, not removed.

---

## Definition of done

Beyond the standard checklist in `AGENTS.md`:

1. Record the intro at 1440px and at 390px and watch both.
2. Confirm the logo lands exactly on the navbar slot — no jump, no 1px shift at the end.
   Compare the last frame against a normal page load of `/clases`.
3. Confirm the wordmark is sharp during the whole travel, not just at rest.
4. Reload with `prefers-reduced-motion: reduce` on and confirm nothing animates.
5. Navigate away and back, confirm the intro does not replay.
6. Lighthouse on `/`: CLS 0, and LCP no worse than before this change.
