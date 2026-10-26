# ticofit landing — design handoff

Drop this whole folder at the repo root as `design/landing/`, then run the prompt in
`PROMPT.md` from Claude Code.

## `images/` → `public/img/landing/`

| File | Where it goes |
|---|---|
| `hero.jpg` | Home hero (1536×768) |
| `barra.jpg` | Home tile "ENTRENÁ" |
| `numa.jpg` | Home tile "COMÉ" · Numa ProteinBar page |
| `sauna.jpg` | Home tile "RECUPERATE" · Membresías recovery block |
| `cowork.jpg` | Home tile "TRABAJÁ" · sede Parque del Café card |
| `funcional.jpg` | Home classes band · Clases → Funcional |
| `opengym.jpg` | Home sede Pavas card · Sedes page Pavas · Clases → Open gym |
| `pilates.jpg` | Sedes page Café · Clases → Pilates reformer |
| `yoga.jpg` | Clases → Yoga |
| `barre.jpg` | Clases → Barre |
| `baile.jpg` | Clases → Baile |
| `recovery.jpg` | Clases → Recovery |
| `personal.jpg` | Clases → Entrenamiento personal |
| `comunidad.jpg` | Home wide CTA · Comunidad page |

All images are AI-generated placeholders in the brand's visual language. They get
replaced with real ticofit photography when the client supplies it.

## `reference/` — the approved design

Six artboards, one per page. They are plain HTML with inline styles, plus three
non-standard tags from the design tool:

- `<x-dc>` / `<helmet>` — wrappers. Ignore them; `<helmet><style>` holds the page's
  base CSS.
- `<sc-for list="{{items}}" as="x">…</sc-for>` — a loop. Becomes `items.map(...)`.
- `<sc-if value="{{cond}}">…</sc-if>` — a conditional. Becomes `{cond && ...}`.
- `{{hole}}` — a value from the `renderVals()` method in the `<script type="text/x-dc">`
  block at the bottom of each file. That block holds all the page data (plans, classes,
  prices); read it, it is the content source.

| File | Route |
|---|---|
| `Main.dc.html` | `/` |
| `Sedes.dc.html` | `/sedes` |
| `Clases.dc.html` | `/clases` |
| `Numa.dc.html` | `/numa` |
| `Membresias.dc.html` | `/membresias` |
| `Comunidad.dc.html` | `/comunidad` |

Take the layout, spacing, type scale, colours and copy from these files exactly.
Do not redesign them.
