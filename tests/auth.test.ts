import assert from "node:assert/strict";
import test from "node:test";
import { authCallbackUrl, isProtectedPath } from "../src/lib/punnett/auth.ts";

test("gates nested protected routes without gating similarly named public paths", () => {
  for (const path of ["/profile", "/profile/edit", "/history", "/discover", "/discover/private"]) assert.equal(isProtectedPath(path), true);
  for (const path of ["/", "/create", "/auth/callback", "/profiles", "/incubators", "/discoveries"]) assert.equal(isProtectedPath(path), false);
});

test("OAuth callback uses the current origin and exact path without query parameters", () => {
  assert.equal(authCallbackUrl("https://punnett-selection.vercel.app"), "https://punnett-selection.vercel.app/auth/callback");
  assert.equal(authCallbackUrl("http://localhost:3000/?next=https://example.com"), "http://localhost:3000/auth/callback");
});
