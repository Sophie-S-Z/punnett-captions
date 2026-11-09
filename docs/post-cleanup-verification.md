## Milestone

Week 8 post-cleanup verification, November 9, 2026.

## What changed

Removed the two documented computer-and-coffee-mug QA illustrations from the shared database and Storage. The cleanup removed two image files, two image records, two generations, eight captions, eight votes, two examples, two responses and two archived test-generation entries. All 28 non-target image records passed unchanged checksums. The three recent manual uploads (quokka hug, smug cat and handsy cat) remain. No application code, prompt chain, access policy or user profile changed.

## How I verified it

The three current production deployments return HTTP 200 with the correct application titles and no Vercel authentication screen. Eighteen live HTTP checks passed for public pages/icons, protected routes, anonymous mutation rejection, private-image denial and failed-OAuth recovery. The two deleted media URLs return 404; a preserved image returns 200 image/jpeg.

Database checks confirm zero target image records or Storage objects, zero orphan captions, generations, votes or Studio runs, nine remaining stored images and zero visible catalog-seed generations. There are 28 total image records, including archived legacy metadata; this is not a claim that every historical row was personally uploaded by the owner. The two known generated test images are absent. No additional production images were uploaded or generated for this verification.

Local lint, application/test TypeScript and all 110 unit/database tests passed across the suite (Captions 44, Admin 40, Prompt Chain Tool 26). All three production builds passed. Admin initially encountered a Windows sandbox EPERM creating generated build output; its production build passed when rerun outside the sandbox.

## VERIFY findings (schema, API)

The three apps share one database. Image-backed records use foreign keys, and the cleanup left no orphaned records. Storage objects were deleted through the Storage dashboard, not by deleting Storage metadata with SQL. These checks used real live data and HTTP responses. Unit/database tests use isolated fixtures and do not write live test images.

## HUMAN tasks needed

Keep Vercel deployment protection off. The existing project-scoped OAuth callback patterns cover new commit deployments. The review browser timed out while attaching to the signed-in editor, so fresh authenticated UI, upload, voting and generation checks could not be completed in this pass. Existing user sessions were not extracted or exported.

## Open questions

A fresh signed-in browser check remains unverified in this pass. Local tests and anonymous HTTP checks are not presented as authenticated end-to-end acceptance. GitHub Actions workflows remain manual-only; no hosted Actions minutes are used by this verification.
