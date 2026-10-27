# Fit CRM — white-label base

Portal de clientes para gimnasios / entrenadores personales: roster de
clientes, rutinas y programas, biblioteca de ejercicios, visitas, medidas,
progreso, evidencias y pagos.

Esta es la **base white-label**: no lleva marca. Todo lo específico de un
cliente se configura en un solo archivo, [`src/config/brand.ts`](src/config/brand.ts).

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (tokens CSS-first vía `@theme inline`)
- **Supabase** (`@supabase/ssr`) para autenticación y base de datos
- **framer-motion**, **gsap**, **lucide-react**, **sonner**
- **yarn** · desplegable en **AWS Amplify** o **Vercel**

## Desarrollo local

```bash
yarn install
cp .env.example .env.local   # completá con tus llaves de Supabase
cp .mcp.json.example .mcp.json   # opcional: MCP de Supabase para agentes
yarn dev                     # http://localhost:3000
```

`.mcp.json` apunta a **un** proyecto de Supabase (`project_ref`), así que es
por instancia y está en `.gitignore` — igual que `.env.local`. El archivo
versionado es `.mcp.json.example`.

El sitio público (`/`, `/sedes`, `/clases`, `/numa`, `/membresias`,
`/comunidad`) no necesita Supabase; el login y `/portal` sí requieren las
variables de entorno.

### Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave pública `anon` |

Nunca comitás `.env.local` ni la `service_role` key.

## Marca (theming por cliente)

Todo se configura en [`src/config/brand.ts`](src/config/brand.ts):

| Campo | Qué controla |
|---|---|
| `name` | Wordmark del portal, título del tab, metadata, OG |
| `tagline` / `description` | Título y descripción de metadata |
| `url` | `metadataBase` (dominio de producción) |
| `logoSrc` | `null` → wordmark de texto; `"/logo.png"` → imagen |
| `accent.color` / `.rgb` / `.ink` | El único color de acento (tokens, glows, focus ring) |
| `contact.whatsapp` / `.email` | Links de WhatsApp y correo |
| `mapsUrl` / `wordmark` | Link de Google Maps y wordmark tipográfico del sitio |
| `palette` / `site` | Colores del sitio público (tokens `--tf-*` → clases Tailwind) |
| `fonts` | Instrument Serif + Figtree (cargadas en `src/app/(site)/layout.tsx`) |

El acento se inyecta como variables CSS inline en `<html>` desde
`src/app/layout.tsx`; los valores en `globals.css` son solo el fallback. La
base monocroma oscura no cambia — solo el acento.

### Sitio público

Las seis páginas viven en el grupo de rutas `src/app/(site)/`, con su propio
layout (fuentes y colores de la marca). Todo el texto, precios y clases están
en [`src/content/landing.ts`](src/content/landing.ts); los componentes, en
`src/components/site/`. El diseño aprobado está en `design/landing/`.

Ningún botón del sitio lleva a `/login`: solo clientes y empleados ya
registrados entran al portal, así que "Reservar" y "Comprar" abren WhatsApp.

### Assets

No se incluye ningún archivo de marca. Ver [`public/README.md`](public/README.md)
para la lista de archivos opcionales (`logo.png`, videos, OG image) y
`src/app/icon.svg` para el favicon.

## Base de datos (Supabase)

Ejecutá las migraciones de `supabase/migrations/` en orden en el SQL editor
de Supabase (o `supabase db push`). Crean el enum `user_role`, la tabla
`profiles`, el esquema completo del portal (finanzas, ejercicios, programas,
rutinas, visitas, medidas, evidencias), el bucket privado `evidence` y las
políticas RLS.

Por defecto un usuario nuevo es `client`; para volver a alguien `coach`,
actualizá su fila en `profiles` desde el dashboard.

## Estructura

```
src/
├─ app/(site)/     # sitio público: /, sedes, clases, numa, membresias, comunidad
├─ app/            # login, portal, auth/callback
├─ config/brand.ts # ⭐ marca: nombre, acento, contacto, logo
├─ components/
│  ├─ site/        # header, footer y secciones del sitio público
│  ├─ portal/      # sidebar, formularios, listas del portal
│  ├─ ui/          # Logo, Button (cva), Card, Badge, …
│  └─ motion/      # Reveal (scroll-in)
├─ content/landing.ts # todo el copy y precios del sitio público
├─ lib/supabase/   # clientes browser/server/middleware
└─ middleware.ts   # refresco de sesión + guard de /portal
```

## Despliegue

- **Amplify**: usa `amplify.yml`. Definí las dos variables `NEXT_PUBLIC_*` en
  la consola de Amplify.
- **Vercel**: importá el repo, agregá las mismas variables de entorno. Sin
  configuración adicional.

## Notas de diseño / costo

- Biblioteca de ejercicios = **videos enlazados** (YouTube/Vimeo), nunca
  subidas alojadas — mantiene el costo bajo.
- Imágenes optimizadas; sin video pesado en el repo.
