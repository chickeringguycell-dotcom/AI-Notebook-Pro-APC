# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Published URLs

- **Notepad app (live)**: https://smart-notes-hub--chickeringguy.replit.app/
- Note: `chickeringguy.replit.app` (without prefix) returns 404 — the deployment name is `smart-notes-hub`. To use the shorter URL, rename the deployment to `chickeringguy` in Deployments → Settings.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### My AI Notebook — Mobile (`artifacts/notepad-mobile`)
- **Type**: expo (React Native, Android-first; iOS deferred until funds + Apple device available)
- **Preview path**: `/mobile/`
- **Bundle ID** (iOS + Android): `com.chickeringguy.ainotebook`
- **Auth**: Clerk Expo (email + password + email-code verify); shares Clerk tenant with web so notes sync across devices
- **API**: Hits the same `api-server` on prod URL via `setBaseUrl` + `setAuthTokenGetter` (Clerk session token)
- **Features (this session)**: sign in/up, notes list grouped by category with pin-to-top, pull-to-refresh, create note, plain-text editor with autosave, pin/delete, sign-out
- **Future sessions**: rich text/TipTap parity, voice dictation, OCR scan, AI chat, photos, premium themes
- **Monetization**: RevenueCat (`pro` entitlement, `pro_monthly` $4.99/mo) — see RevenueCat section below

### My AI Notebook (`artifacts/notepad`)
- **Type**: react-vite (web app)
- **Preview path**: `/`
- **Tagline**: A personal lined-paper notepad with AI — voice dictation with auto-cleanup, scan-to-text OCR, AI writing assistant, smart markdown paste, inline photos, 26 languages.
- **Description**: A personal AI notepad with:
  - Notes sidebar with create/delete and pin-to-top (free); pinned notes float to top of their section, sorted by updatedAt within each group; sections containing any pinned note float to top of sidebar
  - Long-press (or right-click) a note title in sidebar to open rename+move dialog (change title and/or move to a different/new section)
  - Long-press (or right-click) a custom section header to rename it (renames category on every note in that section); "General" is locked
  - TipTap rich text editor with auto-save (debounced); plaintext notes auto-migrate to HTML on first edit
  - Inline draggable photos (Pro): tap "Photo" button to insert at cursor, tap any photo to enlarge in lightbox; uploaded to GCS via presigned URL
  - Scan to text (Pro): tap "Scan" button to take a photo (capture="environment") or pick an image; OCR via OpenAI vision (`POST /api/openai/scan-image`), extracted text inserted at cursor
  - Voice dictation via browser's SpeechRecognition API (inserts at cursor in rich editor); when the user stops dictation, the most recent dictated chunk is auto-polished by AI (`POST /api/openai/polish-text`) — adds punctuation/capitalization, fixes mis-heard words using surrounding text as context. Pro-only. Shows "Polishing…" indicator next to mic. Original text restored if polish fails.
  - AI writing assistant (ChatGPT powered, streaming SSE)
  - Smart markdown paste: pasting raw markdown (e.g. from ChatGPT) auto-converts `**bold**`, `*italic*`, `# headings`, `* item` / `- item` lists, `1. item` numbered lists, `[link](url)`, `> quotes`, `` `code` ``, code blocks, AND ChatGPT-style "**Label:** value" consecutive lines (treated as a bulleted list). Heuristic ignores "fake" HTML on the clipboard (mobile browsers wrapping plain text in spans without real `<ul>`/`<strong>`).
  - Print support (window.print() with print-only CSS); inline photos print with page-break-inside: avoid
  - Copy/share use editor.getText() to strip HTML
  - Fonts (Pro): per-note font picker (Type icon in toolbar) — Old English/blackletter (UnifrakturMaguntia), Gothic (Pirata One), Script (Dancing Script), Handwriting (Caveat), Typewriter (Special Elite), Elegant (Playfair Display), Bold Script (Lobster), Roman (Cinzel); "Default" (Inter) is free. The `notes.font` column stores the raw CSS font-family stack ("" = default), applied inline to the writing area + title. Fonts loaded via Google Fonts `<link>` in index.html. FONTS list + FontPicker live in `paper-picker.tsx`.
  - Pro features: photos, ink colors, fonts, custom sections, voice, AI assistant, premium themes
  - Import / Export (free): sidebar footer has Export (downloads all notes as a portable Markdown `.md` file, sentinel-tagged for full-fidelity re-import) and Import (pick a `.md`/`.txt`/`.json` file → `parseImportFile` in `src/lib/notes-io.ts` creates each note). Round-trip safe (the export header is never re-imported as a note).
  - Android share target (installed PWA): manifest declares `share_target` (GET, params title/text/url). Sharing text from another app (e.g. the old "#Notepad" per-note "Share Item") opens the notepad at `/share-target`; `captureSharedImport()` in `App.tsx` stashes the payload in sessionStorage before routing/sign-in, and `useSharedNoteImport()` in `notepad-page.tsx` creates the note once signed in (payload kept on failure so it retries on next load).

### API Server (`artifacts/api-server`)
- **Type**: Express 5 API
- **Preview path**: `/api`
- **Routes**:
  - `GET/POST /api/notes` — list and create notes
  - `GET/PATCH/DELETE /api/notes/:id` — single note operations
  - `GET/POST /api/openai/conversations` — AI chat conversations
  - `GET/DELETE /api/openai/conversations/:id` — single conversation
  - `GET /api/openai/conversations/:id/messages` — list messages
  - `POST /api/openai/conversations/:id/messages` — SSE streaming AI chat
  - `POST /api/openai/scan-image` — OCR a base64-encoded image via OpenAI vision; returns `{ text }`
  - `POST /api/openai/polish-text` — clean up dictated text via gpt-5.2 (punctuation, capitalization, fix homophones/mis-heard words); takes `{ text, context? }`, returns `{ text }`
  - `GET /api/me` — current user's account status `{ isPro }` (Clerk-authed)
  - `POST /api/pro/redeem` — enable Pro on the account: body `{ code }` (invite codes validated SERVER-SIDE) or `{ legacy: true }` (one-time migration of a pre-existing device-only localStorage unlock, only honored before `LEGACY_MIGRATION_DEADLINE` in `routes/me.ts`)
  - `POST /api/storage/uploads/request-url` — presigned GCS upload URL (image-only, max 12MB enforced server-side)
  - `GET /api/storage/objects/*` — serve uploaded objects (note photos)
  - `GET /api/storage/public-objects/*` — serve public assets

## Database Tables

- `notes` — id, title, content, category, paper_theme, line_style, ink_color, font, pinned, created_at, updated_at
- `conversations` — id, title, created_at (AI chat conversations)
- `messages` — id, conversation_id, role, content, created_at
- `users` — id (Clerk user id), claimed_legacy, pro (Pro entitlement — source of truth, persists across reinstalls/devices), created_at

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## RevenueCat (mobile monetization)

- **Project**: "My AI Notebook" (`proj874094bc`) in user's RevenueCat account
- **Apps**: Test Store, App Store (`com.chickeringguy.ainotebook`), Play Store (`com.chickeringguy.ainotebook`)
- **Entitlement**: `pro` (gates photos, AI assistant, voice, premium themes, etc.)
- **Offering**: `default` → `$rc_monthly` package → product `pro_monthly` ($4.99/mo USD, €4.49/mo)
- **Play Store product ID**: `pro_monthly:monthly`
- **Public API keys** (env vars, shared): `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
- **Re-seed**: `pnpm --filter @workspace/scripts run seed-revenuecat` (idempotent)
- **Client code**: `artifacts/notepad-mobile/lib/revenuecat.tsx` exports `initializeRevenueCat`, `SubscriptionProvider`, `useSubscription` (returns `{ isPro, currentOffering, purchase, restore, ... }`)
- **Pricing in client**: NEVER hardcoded; always read from `currentOffering.availablePackages[].product.priceString`

## AI Integration

Uses Replit AI Integrations (OpenAI) — no API key required from user.
- Provider: OpenAI via `@workspace/integrations-openai-ai-server`
- Model: gpt-5.2 for chat completions
- Env vars: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` (auto-provisioned)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
