# Schema verification

## W2

The local Supabase URL and anon key are configured in ignored `.env.local`.
A read-only request to `public.lab_specimens` first returned HTTP 200 with `[]`.
After the owner saved a public read policy, the same select returned six rows.
The page shows `LAB-001` through `LAB-006`.

Query used by `/specimens`:

```ts
supabase.from("lab_specimens").select("id, code, label, notes").order("id")
```

The API accepted `id`, `code`, `label`, and `notes`.
The response contains `id`, `code`, `label`, and `notes` for each row.
No RLS policies were created or changed by this repository.

## W3 (2026-10-01)

The owner ran `docs/w3-profiles.sql` in the existing staging database.
The final diagnostic confirmed `profiles`, the signup trigger, and the photo bucket.
Both name columns are nullable.
The creation script defines `id` as a UUID linked to `auth.users.id`.
Photo contents live in the private `profile-photos` Storage bucket.
The relational row stores only `avatar_path`.
The application uses `punnett_get_profile()` and `punnett_save_profile(first_name_input, last_name_input, avatar_path_input)`.
Both functions use the authenticated caller's `auth.uid()`.
The name fields are limited to 100 characters.
Direct table privileges are revoked from anonymous and authenticated API roles.
An anonymous table read returned HTTP 401 with PostgreSQL code 42501.
An anonymous profile-function call also returned HTTP 401 with code 42501.
The public Storage object endpoint returned `NoSuchBucket` for the private bucket.
The owner configured Storage policies.
No policies were created or changed by the agent.
The owner verified Google login and confirmed that names and a photo persist after reload.

Google Auth settings now report `external.google: true`.
The Google client secret is configured in the provider dashboard only, as explicitly authorized by the owner.
OAuth uses PKCE and the app redirect is exactly `/auth/callback`.
The callback exchanges the code and redirects to `/`.
Home then redirects incomplete profiles to `/profile`.

Next.js 16 uses `src/proxy.ts` for session refresh and route interception.
The helper remains at `src/lib/supabase/middleware.ts`.
Each protected page and the profile-save action check authentication on the server.

The current assignment's gated UI opens the private notebook.
The notebook reads existing `lab_specimens` data.
Caption duels and vote history remain separate W4 work and are not simulated.

## W3 extension: personal bench (2026-10-01)

The owner ran `docs/personal-bench.sql`.
The diagnostic confirmed `punnett_bench_specimens` and the list, save, and delete functions.
The bench stores independent personal rows with UUID ids, `owner_id`, `label`, `notes`, revision, and timestamps.
Copies contain a snapshot of a real shared specimen's label and notes.
No bench mutation writes to `lab_specimens`.
The owner approved an empty add-specimen state for this personal table only.
Every function checks `auth.uid()`.
List, update, and delete use an owner predicate.
Creation derives the owner from the session.
Revision checks reject concurrent changes.
Direct table privileges are revoked from API roles.
Live anonymous table and RPC requests returned HTTP 401 / 42501.
Actual signed-in add, copy, edit, reload, and delete tests passed.
All 11 shared rows remained identical to the baseline after those tests.
The owner saved the immutable deployment's exact callback URL and confirmed the deployed signed-in test passed.
No policies were created or modified.

## W4 preflight (2026-10-08)

Read-only REST probes used the configured URL and anon key from ignored `.env.local`.
Each probe requested `select=*&limit=1`.
No row values or credentials were printed.

| Table | HTTP | Result |
| --- | --- | --- |
| `captions` | 404 | `PGRST205`: table not found in schema cache |
| `caption_votes` | 404 | `PGRST205`: table not found in schema cache |
| `images` | 404 | `PGRST205`: table not found in schema cache |
| `caption_requests` | 404 | `PGRST205`: table not found in schema cache |

The REST OpenAPI request returned HTTP 401.
These results do not establish whether the tables are absent or unexposed.
The vote columns, values, audit fields, foreign keys, and unique constraints remain unverified.
The owner must confirm the intended course database and provide the schema findings.
`docs/w4-preflight.sql` contains read-only column, constraint, and RLS-flag diagnostics.
The caption API documentation is absent from this checkout.
No API endpoints, payloads, prompt storage, or generation persistence have been assumed.
No RLS settings or policies were changed.

## W4 intended app-owned contract (2026-10-08)

The owner selected new app-owned tables in the existing Supabase project.
The owner selected Gemini for caption generation instead of the course caption API.
The authoritative proposed schema is `docs/w4-rating.sql`.
This contract is authored, not verified as deployed until the owner runs that file and diagnostics pass.
No course table is modified by this migration.
The migration creates no policies.
The owner-run migration enables RLS on its four new tables and revokes direct table access from public, anonymous, and authenticated API roles.
Narrow security-definer functions use an empty search path and explicit schema qualification.
Private functions derive ownership from `auth.uid()` and reject unauthenticated callers.
Generation creation permits at most ten attempts per owner over a rolling 24-hour window.
Pending, completed, and failed attempts all count.
A per-owner transaction advisory lock prevents concurrent requests from exceeding the quota.
Quota exhaustion returns `22023` with the message prefix `daily_limit`.

### Tables

| Table | Contract |
| --- | --- |
| `punnett_images` | UUID id, authenticated owner id, image data URL, MIME type, creation timestamp. Raster JPEG, PNG, WebP, or GIF only. Decoded upload limit: 2 MiB. |
| `punnett_generations` | UUID id, unique image id, owner id, exact generation prompt, model, pending/completed/failed status, creation and completion timestamps. |
| `punnett_captions` | UUID id, generation id, image id, caption content, creation timestamp. Completion atomically publishes 2 to 10 unique caption texts. |
| `punnett_caption_votes` | UUID id, owner id, caption id, smallint vote restricted to +1/-1, creation timestamp. Unique constraint on `(owner_id, caption_id)`. |

The image payload is stored with the new image row to avoid requiring a new Storage access policy.
Profile photographs remain in their existing private Storage bucket.
Only completed generations expose images and captions through public read functions.
Generation prompts and owner ids are not included in public catalog responses.

### RPC names and payloads

| RPC | Inputs | Output and access |
| --- | --- | --- |
| `punnett_create_generation` | `image_data_url` text, `prompt_input` text, `model_input` text | `{id, image_id}`. Authenticated owner. Saves the prompt before the model call. |
| `punnett_complete_generation` | `generation_id_input` UUID, `captions_input` JSON array of strings | `{id, image_id, captions: [{id, imageId, text}]}`. Pending generation owner. Inserts captions and completes status in one transaction. |
| `punnett_fail_generation` | `generation_id_input` UUID | Void. Marks only the caller's pending generation failed. |
| `punnett_caption_page` | `offset_input` integer, default 0 | `{captions: [{id, imageId, text}], hasMore}`. Public. Completed captions only. |
| `punnett_read_image` | `image_id_input` UUID | Text data URL, or null. Public. Completed image only. |
| `punnett_voted_ids` | `offset_input` integer, default 0 | `{ids: [UUID], hasMore}`. Caller only. |
| `punnett_vote_history` | `offset_input` integer, default 0 | `{votes: [{id, captionId, imageId, text, vote, createdAt}], hasMore}`. Caller only. Newest first. |
| `punnett_select_vote` | `winner_id_input` UUID, `loser_id_input` UUID | `{winner_id, loser_id}`. Authenticated. Both published captions must share an image and differ. Inserts +1 and -1 atomically. |

All three page functions return at most 500 rows.
Offsets must be integers from 0 through 1,000,000.
Ordering includes UUID id as a deterministic tiebreaker.
Duplicate selection fails with PostgreSQL `23505` and writes neither row.
Invalid input fails with `22023`; an unauthenticated private function fails with `42501` when execution reaches the function.
Anonymous private RPC calls are also denied at the privilege boundary.

### Required live verification after owner setup

Confirm all four new tables exist and report RLS enabled.
Confirm direct anonymous and authenticated table operations are denied.
Confirm public catalog and completed-image reads work without login.
Confirm private RPCs reject anonymous users and another user's generation.
Confirm completion persists the prompt and real generated captions.
Confirm selection writes exactly two opposing votes and duplicate retries write neither.
Confirm vote history and judged-id reads contain only the current user's votes.
Verify first, middle, last, and partial pages against seeded owner-authorized test data.
Do not mark these live checks complete from source inspection alone.

## W4 live verification (2026-10-08)

The owner ran `docs/w4-rating.sql` successfully in the existing Supabase project.
The owner confirmed all four new tables report RLS enabled.
The public catalog RPC returned HTTP 200 after setup.
Anonymous creation, vote, and vote-history RPC requests returned HTTP 401 with PostgreSQL code `42501`.
The exact migration also passed six isolated PostgreSQL integration tests in PGlite.
Those tests verify direct table denials, caller ownership, private pending images, atomic completion and voting, duplicate rollback, quota enforcement, and 500-row pagination.

The parent agent found an actual signed-in Google session in the local app through the browser UI.
Gemini configuration was completed.
A real UI generation returned four captions for an actual image captured from the app.
The generation used real Gemini output and persisted a completed culture.
An initial Gemini REST enum error was corrected to `APPLICATION_JSON` and covered by a red/green regression test.
An actual paired selection created two new persisted vote rows.
Both selections appeared in the user's history after reload.
The next pair excluded the judged captions.
The public catalog now contains a real pair for visitor verification.

These signed-in live findings were reported by the parent agent.
No authenticated browser session was exported by the verification agent.
The generation action sends the exact constructed model prompt to the creation RPC.
The isolated PostgreSQL test verifies that the RPC persists the supplied prompt.
Prompt contents were not independently read back from the live database.
Deployment-specific public and signed-in acceptance remains a separate check.

The separate production acceptance check passed on source commit 23da9a40f41a7d230018ace69761657af48fe012.
The immutable deployment completed real Gemini generation and persisted a paired vote after reload.
Deployed anonymous operations remain denied; public completed captions and images are readable.
See docs/deployment.md for the exact URL and evidence.

## Flora/fauna correction live readback (2026-10-08)

The owner confirmed the correction transaction succeeded.
All 11 live public labels and notes exactly match `docs/flora-fauna-content.json`.
The public caption RPC returns eight active captions about the named organisms and no website captions.
The dead man's fingers culture uses image `c6da54f1-df9e-48e4-9e40-c1e2e954975b`.
The sea cucumber culture uses image `44bbda39-860a-4631-b51d-b33718d3ebd5`.
The owner confirmed the corrected immutable deployment's exact callback is allowlisted.
Private bench correction is covered by the exact SQL integration test but still requires signed-in live readback.
No RLS policy statements were created or changed.

## Ecosystem extension schema contract (2026-10-08)

`ecosystem-rating.sql` adds narrow survival voting and public aggregate-page functions.
Each survival vote writes one existing `punnett_caption_votes` row with `auth.uid()` and -1 or +1.
The original paired voting function and shared unique constraint remain unchanged.
Only captions from completed cultures are eligible or counted.
The aggregate response exposes caption identity, image identity, text, and up/down counts; it exposes no owner IDs.
Stable pages contain at most 500 rows.

`ecosystem-discovery.sql` adds private `punnett_discoveries` rows with saved prompts, model, source excerpt, taxonomy key, source revision, status, and published catalog/culture linkage.
Direct table access is revoked.
RPCs derive ownership from `auth.uid()` and restrict proposal reads and publication to that owner.
Catalog insertion and completed generation creation commit atomically.
Publication retries reuse the saved culture.
The owner enables RLS on the new table; no policies are created or changed.
Live owner application is not inferred from isolated PostgreSQL test success.

The owner subsequently confirmed all finalized extension scripts were executed in order.
Live public readback returned 44 completed captions across 11 organisms on 2026-10-08.
The new public aggregate RPC and deployed UI show those actual counts.
Live anonymous survival/discovery mutation RPC calls were rejected, and private proposal table reads were denied.
Editorial starter cultures have an owner-only `is_catalog_seed` flag; quota calculations exclude those cultures but count pending and failed user attempts.
The exact seed migration's isolated PostgreSQL test verifies idempotence, preservation of votes, and ten user attempts after eleven starter cultures.
Signed-in live publication and owner-specific readback are still separate pending acceptance checks.

## Caption-first TA revision (2026-10-10)

The primary UI uses existing app-owned image/caption/vote RPCs for general humor.
`punnett_vote_history(offset_input)` already returns imageId, captionId, text, vote, and createdAt.
History renders `/media/{imageId}` for each selected or rejected caption without a migration.
`punnett_read_image(image_id_input)` exposes completed images through the existing media route.
The generation RPC accepts an image and prompt; it does not require a catalog specimen or taxon-prefixed captions.
The full prompt stays below the existing 2,000-character database limit for 1,000 characters of tone/context.
The primary server action requires a valid session and real image bytes before contacting Gemini.
Legacy discovery continues to use source-bound scientific validation.
Existing private collections are preserved at `/lab/notebook/collection` with server authentication and owner RPCs.
Live anonymous security checks passed on 2026-10-10. No schema or RLS policy changes are part of this revision.
The official provider contract was rechecked: https://ai.google.dev/api/generate-content.

## W5 selective caption and Storage cutover (2026-10-10)

The active app no longer reads shared species facts, discovery proposals, survival ratings, or organism collections. Historical tables remain for audit; the cutover revokes obsolete endpoint execution and archives old generations.

Live public catalog audit found 68 captions across 17 images: 64 biology captions and four recent general-humor captions. Google Auth settings still report enabled. New Storage/creation-history RPCs were not installed at the time of the probe (`PGRST202`).

`w5-caption-storage.sql` adds `archived` and `storage_path`, filters public captions, images and owner vote history, preserves atomic paired voting, and exposes owner-only creation history. Creation v2 requires an uploaded object in `caption-images` whose path starts with `auth.uid()`; it stores the exact prompt and model and maintains the rolling quota.

Pre-cutover general-humor images are identified from the exact generation prompt prefix authored by this app. Their bytes remain private only until the image owner's server-side Storage transfer succeeds. Irrelevant species image bytes are cleared. `w5-finish-storage.sql` aborts if any bytes remain and then drops `data_url`.

The exact migration/finish scripts pass isolated PostgreSQL tests for preservation, archive filtering, owner isolation, public/private boundaries, prompt storage, paired-vote rollback, and pagination. This is not live setup confirmation. Storage policies are provided under the owner's explicit narrow R1 exception and applied only by the owner. No live RLS policy change was performed by the agent.

## Studio deployment preparation (2026-10-15)

The owner confirmed the selective migration, private caption-images bucket, four Storage policies, existing-policy audit, and RLS audit. Live anonymous mutation/private-read checks pass. Actual-session local production acceptance restored the recent general-humor image/four captions, loaded all images, persisted a paired vote after reload, and exercised history search and Chosen filtering. An anonymous image GET returned HTTP 200 JPEG. The finish script remains owner-run after transfer verification.

## Owner finish confirmation — 2026-10-15

After the recent meme image transferred successfully and fresh deployed generation/voting/export passed, the owner ran w5-finish-storage.sql and confirmed success. The owner confirmed storage_path remains and data_url is removed. This completes the owner-managed three-step Storage cutover. No live schema-owner credential or browser session was exported to the agent. No live RLS policy change was performed by the agent.


## 2026-11-06 release verification

Inspected the actual public caption/generation and private studio/history tables. The owner-approved 2026-11-05 content retirement remains applied. The reviewed text fields contain no retired vocabulary; 28 real captions remain public. All 153 originals remain in the owner-only private archive with no client grants. No schema, row-security policy, or auth permission changed during this release. `/history` is the canonical history route; old history URLs redirect.
