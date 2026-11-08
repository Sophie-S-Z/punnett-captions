## Milestone

Complete the clear repository/project names and verify all advertised image formats.

## What changed

The GitHub repository, Vercel project and package names now match the clear application name. Existing project/repository IDs are retained. Old repository URLs redirect to the renamed repository. Existing stable aliases are preserved for ungraded submissions. Historical reports and local checkout folder names retain their original identifiers.

The upload action uses a tested decoder for JPEG, PNG, WebP and GIF. Every input becomes a size-bounded, correctly oriented JPEG without original EXIF metadata. Transparency flattens onto white consistently. Animated images use one still frame, stated beside the upload controls. The browser upload contract retains the caller-owned flat JPEG path; no storage policy changes.

## How I verified it

Run npm run check locally. New tests cover seven valid format/alpha/animation cases, orientation/dimensions/metadata, and rejected corrupt/empty/oversized/unsupported inputs. The Prompt Chain Tool's actual-action browser suite covers the same seven format cases through upload, selection, reload and run initiation. Browser fixtures do not call Gemini or modify live user data. The owner confirmed a successful signed-in JPEG production upload before this update.

## VERIFY findings (schema, API)

The previous storage correction is retained. No RLS policy, service-role key, credential or provider endpoint changed. New deployment names need new scoped callback patterns; old patterns stay for ungraded links.

## HUMAN tasks needed

Keep deployment protection off. Save the three new callback patterns requested in chat. No GitHub Actions allowance or paid testing service is required.

## Open questions

Real-image format coverage is automated through browser and server processing. That is distinct from asking the external provider to generate captions separately for every format in a fresh production Google session.
