# public/ — per-client assets

The white-label base ships with **no brand media**. Everything here is
optional: drop a client's files in with these exact names and the app picks
them up. Nothing breaks if you skip them.

| File | Used by | Notes |
|---|---|---|
| `logo.png` | `<Logo />` (portal sidebar, login, landing) | Transparent PNG/SVG, white wordmark, ~2185×302. Also set `logoSrc: "/logo.png"` in `src/config/brand.ts` — while it is `null` the wordmark renders as text. |
| `hero-loop.mp4` | landing `Hero` (opt-in vía `BRAND.showLanding`) | Muted, looping background clip. |
| `hero-poster.jpg` | landing `Hero` poster | First frame of the loop, 864×496. |
| `about-reel.mp4` | landing `SobreAndres` (opt-in vía `BRAND.showLanding`) | Short "about us" clip. |
| `og.jpg` | social preview | Add it, then declare `openGraph.images` / `twitter.images` in `src/app/layout.tsx`. |

The browser tab icon is **not** here — it's `src/app/icon.svg` (Next.js
metadata convention). Replace that file to change the favicon.
