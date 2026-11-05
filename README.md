# Punnett: AI captions

Punnett turns uploaded photos, screenshots, and memes into original funny AI captions. Signed-in users generate captions, compare two captions for the same image, and keep image-based creation and voting histories. Captions can be copied or downloaded as memes.

## Development

Use Node.js 24 or newer. Copy `.env.example` to ignored `.env.local` and configure the existing Supabase project and Gemini credentials. Never commit secrets or use a service role key.

Run `npm run dev`. Run `npm run check` before deploying. This runs lint, strict TypeScript, unit/PostgreSQL tests, and the production build.
Run `npm run test:e2e` against `PUNNETT_TEST_URL`. Authenticated tests need an owner-provided session and explicit authorization for persisted test votes. Skipped tests are not evidence of success.

## Routes

- `/`: image upload and caption creation; Google sign-in for visitors.
- `/?mode=duel`: public image/caption preview; voting requires login.
- `/lab/notebook/created`: own generated captions with images.
- `/lab/notebook`: own paired vote history with images.
- `/profile`: own names and optional private profile photo.
- `/auth/callback`: exact OAuth callback.
- `/media/{id}`: completed, nonarchived images from Storage.

Old `/discover` and collection bookmarks redirect to the home page.

## Database and deployment

Existing owner-run W3/W4 migrations establish profiles, signup trigger, narrow ownership-checked RPCs, and app-owned rating tables. The current storage/archive cutover is `docs/w5-caption-storage.sql`.
**Apply the owner steps in [docs/w5-owner-cutover.md](docs/w5-owner-cutover.md) before deploying this revision.** The cutover archives the old generations and preserves recent general-humor images for an owner-scoped Storage transfer. Run `docs/w5-finish-storage.sql` after transfer to remove the obsolete base64 image field. New files live in the private `caption-images` bucket; rows retain paths and exact prompts.

AGENTS.md prohibits agent changes to RLS policies. The owner must configure Storage access and audit RLS across the existing tables. Keep Vercel deployment protection disabled and allowlist each immutable deployment's exact `/auth/callback`.

Historical species documents are deployment provenance, not active app data or current product instructions. Do not rerun their seeds or migrations.

The 2026-10-15 caption studio adds optional tone presets, a context-length counter, searchable creations, Chosen/Passed vote filters, and reduced-motion-safe upload/selection details. See docs/design-references.md for reviewed components and adaptations.
