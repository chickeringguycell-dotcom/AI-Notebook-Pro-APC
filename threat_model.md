# Threat Model

## Project Overview

This project is a personal AI notepad built as a pnpm monorepo. The production application consists of a React/Vite web client in `artifacts/notepad` and an Express 5 API in `artifacts/api-server`, backed by PostgreSQL via Drizzle ORM and Replit-managed OpenAI integrations. Users create and edit notes, upload note images, and use AI-powered chat, OCR, and dictation cleanup features.

Production assumptions for this scan: the deployed app runs with `NODE_ENV=production`; TLS is handled by the platform; `artifacts/mockup-sandbox` is dev-only and out of scope unless production reachability is proven.

## Assets

- **User notes and note metadata** — titles, note bodies, categories, themes, pin state, timestamps. This is the application's primary confidential data.
- **AI conversation history** — conversation titles and message contents. These can contain sensitive drafts, prompts, and personal information.
- **Uploaded note images** — photos embedded in notes, including handwritten notes or documents. These are sensitive user content even when stored in object storage.
- **Application resources with direct cost impact** — OpenAI API usage, storage capacity, and database capacity. Abuse can create operator cost and service degradation.
- **Application secrets and internal service access** — database credentials, Replit sidecar-backed object-storage signing, and OpenAI integration credentials exposed only server-side.

## Trust Boundaries

- **Browser to API** — every `/api/*` request crosses from an untrusted client into trusted server code. Authentication, authorization, validation, and quotas must be enforced here.
- **API to PostgreSQL** — route handlers can read and mutate all persisted notes, conversations, messages, and analytics events. Any broken access control here exposes all tenant data.
- **API to OpenAI** — server endpoints trigger paid model calls. Unauthenticated or unbounded access directly creates billing and availability risk.
- **API to object storage / Replit sidecar** — the API can mint signed upload URLs and proxy private object downloads. Path secrecy alone is not an authorization boundary.
- **Public vs authenticated user data** — the app includes public-facing web delivery, but user notes, chats, and uploaded images are private content and must not be globally readable or writable.
- **Production vs dev-only code** — `artifacts/mockup-sandbox`, generated `dist` outputs, and unused helper code should usually be ignored unless they are reachable from production entry points.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*`, `artifacts/notepad/src/*`.
- Highest-risk areas: `artifacts/api-server/src/routes/notes.ts`, `artifacts/api-server/src/routes/openai/index.ts`, `artifacts/api-server/src/routes/storage.ts`, `artifacts/api-server/src/lib/objectStorage.ts`.
- Public surfaces: `/api/healthz`, `/api/events`, static frontend assets.
- Sensitive authenticated surfaces that should exist server-side: notes CRUD, OpenAI conversations/messages, OCR/polish endpoints, and `/api/storage/objects/*`.
- Usually dev-only / lower priority: `artifacts/mockup-sandbox`, `artifacts/landing`, shared audio helpers unless a production route imports them.

## Threat Categories

### Spoofing

This project handles private note content but currently relies on the browser as if it were a trusted single-user client. The API must positively identify the caller before granting access to notes, conversations, uploads, or paid AI features. Any route that accepts anonymous requests for private content effectively lets an attacker impersonate a legitimate user.

Required guarantees:
- All routes that read or mutate private note, conversation, message, or uploaded-object data MUST require a valid server-verified identity.
- Server-side identity MUST be bound to stored records so ownership can be enforced in database queries and object ACL checks.

### Tampering

The client can issue arbitrary API requests and choose arbitrary object paths, note IDs, or conversation IDs. Business rules such as who may edit a note, append a chat message, or fetch a private object must be enforced server-side rather than inferred from the client UI.

Required guarantees:
- Note, conversation, and message mutations MUST be scoped to records owned by the authenticated user.
- Private object fetches MUST verify authorization explicitly; opaque object paths alone are insufficient.
- Upload endpoints MUST constrain file type, size, and who is allowed to mint upload URLs.

### Information Disclosure

The application's core value is storing private text, images, and AI conversation history. If list/get routes are global or object fetches lack ACL checks, one user can read another user's notes, chat history, or uploaded photos. Error handling and logging must also avoid leaking secrets or credentials.

Required guarantees:
- List/get endpoints for notes, conversations, messages, and uploaded objects MUST return only data authorized for the caller.
- Uploaded images stored under private object paths MUST remain unreadable without an authorization check.
- Logs MUST continue redacting authorization headers and cookies and MUST not include sensitive payloads unnecessarily.

### Denial of Service

The API exposes paid OpenAI operations and accepts large JSON request bodies. Without authentication, quotas, or rate limiting, an internet attacker can repeatedly invoke OCR, text-polishing, or streaming chat to consume model budget, fill storage, or degrade service.

Required guarantees:
- Paid AI endpoints MUST enforce authentication and per-user / per-IP rate limits or quotas.
- Request body sizes and high-cost input fields MUST have route-appropriate caps, not just a broad global JSON limit.
- Upload and analytics endpoints MUST be bounded to prevent anonymous storage or database abuse.

### Elevation of Privilege

Because the current schemas do not appear to bind notes or conversations to a user, any future authentication layer would still be incomplete unless ownership is represented and enforced consistently. Missing authorization on object storage routes is another privilege boundary failure: anyone who can reach the route can read data intended to be private.

Required guarantees:
- Every private record type MUST carry an owner or equivalent authorization principal.
- Database reads/writes MUST combine identity checks with record ownership checks.
- Object storage ACL helpers MUST be wired into production routes wherever private media is served.
