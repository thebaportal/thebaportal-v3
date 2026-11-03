// Static guard: every Anthropic Messages API call goes through src/lib/anthropic.ts,
// and that helper always pins inference to the United States.
// Run: node --test tests/anthropicHelper.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const HELPER = path.join("src", "lib", "anthropic.ts");

function sourceFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name)) out.push(rel);
  }
  return out;
}
const files = sourceFiles("src");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

// Anything that could reach Anthropic without the helper.
const BYPASS = [
  [/from\s+["']@anthropic-ai\/sdk|import\(\s*["']@anthropic-ai\/sdk|require\(\s*["']@anthropic-ai\/sdk/, "imports the Anthropic SDK (only `import type` is allowed outside the helper)"],
  [/new\s+Anthropic\w*\s*\(/, "constructs an Anthropic client"],
  [/\.messages\s*\.\s*(create|stream|countTokens|batches)\b/, "calls the Messages API directly"],
  [/api\.anthropic\.com/, "calls the Anthropic HTTP API directly"],
  [/@ai-sdk\/anthropic/, "uses another Anthropic client library"],
];

test("no file outside src/lib/anthropic.ts calls Anthropic directly", () => {
  const offenders = [];
  for (const f of files) {
    if (path.normalize(f) === path.normalize(HELPER)) continue;
    const src = read(f).replace(/^\s*import\s+type\s+[^;]*["']@anthropic-ai\/sdk["'];?/gm, "");
    for (const [re, why] of BYPASS) if (re.test(src)) offenders.push(`${f}: ${why}`);
  }
  assert.deepEqual(offenders, [], "Use createMessage() from @/lib/anthropic instead:\n" + offenders.join("\n"));
});

test("the helper pins every request to US inference and callers cannot override it", () => {
  const src = read(HELPER);
  assert.match(src, /export const ANTHROPIC_INFERENCE_GEO = "us";/);
  // geo is applied AFTER the caller's params, so a caller-supplied value can never win
  assert.match(src, /messages\.create\(\{\s*\.\.\.params,\s*inference_geo:\s*ANTHROPIC_INFERENCE_GEO\s*\}\)/);
  assert.match(src, /Omit<Anthropic\.MessageCreateParamsNonStreaming,\s*"inference_geo"/);
  assert.equal((src.match(/messages\.create\(/g) || []).length, 1, "exactly one Messages API call, in createMessage()");
});

test("every route that generates AI output uses createMessage()", () => {
  const users = files.filter(f => /createMessage\(/.test(read(f)) && path.normalize(f) !== path.normalize(HELPER));
  // 11 AI routes at the time of writing; a drop means a route stopped using the helper (or was removed — update the list).
  const expected = [
    "ba-intelligence/analyze", "decision-lab/analyze", "decision-lab/suggest-alternatives", "decision-lab/thought-buddy",
    "workspace/analyze", "workspace/documents", "workspace/process", "workspace/requirements", "workspace/stakeholders",
    "workspace/testing", "workspace/user-stories",
  ];
  const got = users.map(f => f.split(path.sep).join("/").replace(/^src\/app\/api\//, "").replace(/\/route\.ts$/, "")).sort();
  assert.deepEqual(got, [...expected].sort());
});
