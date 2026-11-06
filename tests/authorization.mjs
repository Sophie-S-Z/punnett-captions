import assert from "node:assert/strict";

const origin = process.env.PUNNETT_TEST_URL ?? "http://localhost:3000";
for (const path of ["/profile", "/history", "/history/created", "/discover"]) {
  const response = await fetch(new URL(path, origin), {
    method: "POST", redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "first_name=Anonymous&last_name=Rejected",
  });
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location"), origin).pathname, "/");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(url && key, "Load the existing Supabase environment before testing.");
for (const [path, body] of [
  ["punnett_create_generation", { image_data_url: "", prompt_input: "", model_input: "" }],
  ["punnett_create_generation_v2", { image_path_input: "", prompt_input: "", model_input: "" }],
  ["punnett_creation_history", { offset_input: 0 }],
  ["punnett_legacy_image_page", {}],
  ["punnett_migrate_image", { image_id_input: "954a0308-1972-40ba-8e22-8299c57777fd", image_path_input: "" }],
  ["punnett_complete_generation", { generation_id_input: "954a0308-1972-40ba-8e22-8299c57777fd", captions_input: [] }],
  ["punnett_fail_generation", { generation_id_input: "954a0308-1972-40ba-8e22-8299c57777fd" }],
  ["punnett_select_vote", { winner_id_input: "954a0308-1972-40ba-8e22-8299c57777fd", loser_id_input: "954a0308-1972-40ba-8e22-8299c57777fe" }],
  ["punnett_voted_ids", { offset_input: 0 }],
  ["punnett_vote_history", { offset_input: 0 }],
  ["punnett_rate_specimen", {caption_id_input:"954a0308-1972-40ba-8e22-8299c57777fd",vote_input:1}],
  ["punnett_begin_discovery", {prompt_input:"Anonymous discovery must be rejected",model_input:"gemini-test"}],
  ["punnett_discovery_proposal", {discovery_id_input:"954a0308-1972-40ba-8e22-8299c57777fd"}],
  ["punnett_prepare_discovery", {discovery_id_input:"954a0308-1972-40ba-8e22-8299c57777fd",label_input:"",notes_input:"",gbif_key_input:1,kingdom_input:"Animalia",wikipedia_url_input:"",revision_input:"1"}],
  ["punnett_fail_discovery", {discovery_id_input:"954a0308-1972-40ba-8e22-8299c57777fd"}],
  ["punnett_claim_discovery", {discovery_id_input:"954a0308-1972-40ba-8e22-8299c57777fd"}],
  ["punnett_publish_discovery", {discovery_id_input:"954a0308-1972-40ba-8e22-8299c57777fd",image_data_url:"",prompt_input:"",model_input:"",captions_input:[]}],
  ["punnett_get_profile", {}],
  ["punnett_save_profile", { first_name_input: "Anonymous", last_name_input: "Rejected", avatar_path_input: null }],
  ["punnett_list_bench", {}],
  ["punnett_save_bench", { id_input: "954a0308-1972-40ba-8e22-8299c57777fd", label_input: "Anonymous", notes_input: "", revision_input: 0 }],
  ["punnett_delete_bench", { id_input: "954a0308-1972-40ba-8e22-8299c57777fd", revision_input: 1 }],
]) {
  const response = await fetch(`${url}/rest/v1/rpc/${path}`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "42501");
}
const table = await fetch(`${url}/rest/v1/punnett_bench_specimens?select=id`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
assert.equal(table.status, 401);
assert.equal((await table.json()).code, "42501");
console.log("Anonymous page submissions, private bench table reads, and all profile/bench functions are rejected.");
for (const name of ["punnett_images", "punnett_generations", "punnett_captions", "punnett_caption_votes", "punnett_discoveries"]) {
  const response = await fetch(`${url}/rest/v1/${name}?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "42501");
}
const catalog = await fetch(`${url}/rest/v1/rpc/punnett_caption_page`, {
  method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ offset_input: 0 }),
});
assert.equal(catalog.status, 200);
const publicPage = await catalog.json();
assert.ok(Array.isArray(publicPage.captions));
assert.equal(typeof publicPage.hasMore, "boolean");
console.log("Public caption RPC works; anonymous rating mutations, vote history, and direct rating-table access are rejected.");
