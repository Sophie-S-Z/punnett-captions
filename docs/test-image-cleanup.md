## Milestone

Remove the two disposable computer-and-coffee-mug QA illustrations from the shared Punnett dataset.

## What changed

Deleted image records `6ce9c7c2-b0e3-4257-bf60-c56971d874a6` and `2dfa2c8c-3e26-43a5-b028-7a2229fc49b3`, their two Storage files, two generations, eight captions, eight votes, two examples, two response records, and two historical test-generation archive entries. The cleanup applies to Captions, Admin, and Prompt Chain Tool through their shared database. No application code or deployment changed.

## How I verified it

Visually matched both images to the documented QA uploads before removal. A guarded transaction checked the exact IDs and Storage paths, and verified checksums of all 28 other image records remained unchanged. There were no Studio runs, Studio uploads, or discovery records referencing either target. The Storage dashboard confirmed deletion of exactly two files, leaving the other two files in that folder intact. Independent database checks confirmed zero target images, generations, and Storage objects. All three recent manual uploads remain. Both deleted public media URLs return HTTP 404; a preserved image returns HTTP 200 with image/jpeg.

## VERIFY findings (schema, API)

The shared project is `ralfwrckxnaieamlttmm`. Generations cascade to captions and votes. Examples and response records require explicit scoped removal. Actual Storage files were deleted through the dashboard; Storage metadata was not deleted with SQL. Private application tables are in the `punnett_private` schema.

## HUMAN tasks needed

None. Refresh any already-open image lists to discard content rendered before the cleanup.

## Open questions

None for this cleanup. Other images and prompt chains were preserved.
