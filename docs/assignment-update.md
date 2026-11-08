## Milestone

Week 8 rubric and naming update, November 7, 2026.

## What changed

The application name is Punnett Captions. Existing repository identifiers and deployment domains remain intact to preserve submission links. Hosted GitHub validation is manual-only while monthly Actions minutes are exhausted. Local lint, application/test type checking, database/unit tests, isolated browser tests, and Vercel production builds provide free validation.

## How I verified it

Run `npm run check` locally. See the workspace release report for exact results, deployed commits, and browser evidence. No hosted workflow success is fabricated.

## VERIFY findings (schema, API)

The prompt-chain tool uses server-checked Google login and profiles.is_superadmin. Existing chain/step CRUD, reorder, chain-specific saved outputs, and dark/light/system themes remain in place. Direct image uploads use guarded registration and the same run/checkpoint path as saved images. No RLS policy is changed.

## HUMAN tasks needed

Keep Vercel deployment protection off. Scoped callback allowlist patterns already cover new deployment URLs. Completing fresh authenticated browser/provider acceptance requires a real Google session.

## Open questions

An external provider can reject or rate-limit a request; the UI reports these errors and preserves completed steps. No claim of zero possible failures or a guaranteed grade is made.
