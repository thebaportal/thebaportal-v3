// Requirements Traceability Matrix — the single source of truth for coverage
// logic, shared by the in-app RTM panel (ProjectWorkspaceClient.tsx) and the
// Testing XLSX export. Do not fork this logic — both callers must agree on
// what "covered" means.
//
// Computed entirely from existing artifact content — no new table, no new
// route. Only approved requirements, user stories, and test case artifacts
// are considered, consistent with "approved is the current truth" everywhere
// else in this system.

export const ITEM_ID_PATTERN = /\b(CAP|BR|FR|NFR|US)-\d+\b/g;

export interface RTMArtifact { type: string; status: string; content: string; }
export interface RTMRow { id: string; coveredBy: string[]; }

export function extractItemIds(content: string): string[] {
  return [...new Set([...content.matchAll(ITEM_ID_PATTERN)].map(m => m[0]))];
}

export function parseTestCaseCoverage(content: string): { tcId: string; covers: string[] }[] {
  const blocks = content.split(/(?=\*\*TC-\d+)/);
  const results: { tcId: string; covers: string[] }[] = [];
  for (const block of blocks) {
    const tcMatch = block.match(/\bTC-\d+\b/);
    if (!tcMatch) continue;
    const coversLine = block.match(/Covers:\s*([^\n]+)/i);
    const covers = coversLine ? [...new Set([...coversLine[1].matchAll(ITEM_ID_PATTERN)].map(m => m[0]))] : [];
    results.push({ tcId: tcMatch[0], covers });
  }
  return results;
}

export function buildRTM(artifacts: RTMArtifact[]): RTMRow[] {
  const approved = (type: string) => artifacts.filter(a => a.type === type && a.status === "approved");
  const requirementIds = approved("requirements").flatMap(a => extractItemIds(a.content));
  const storyIds = approved("user_stories").flatMap(a => extractItemIds(a.content));
  const allIds = [...new Set([...requirementIds, ...storyIds])];

  const coverage = new Map<string, string[]>();
  for (const tc of approved("test_case").flatMap(a => parseTestCaseCoverage(a.content))) {
    for (const id of tc.covers) {
      if (!coverage.has(id)) coverage.set(id, []);
      coverage.get(id)!.push(tc.tcId);
    }
  }

  return allIds
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map(id => ({ id, coveredBy: coverage.get(id) ?? [] }));
}
