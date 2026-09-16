// XLSX export for Requirements, User Stories, and Testing — parses the exact
// markdown structure each workstream's AI prompt is instructed to produce
// (see src/app/api/workspace/{requirements,user-stories,testing}/route.ts)
// into professional, editable BA working registers.
//
// This intentionally does not introduce a parallel requirements/story/test
// data model — it reads the same artifact content the DOCX/TXT export and the
// chat UI already render, and the Testing workbook's Traceability Matrix
// reuses the exact same coverage logic as the in-app RTM panel (src/lib/rtm.ts).

import ExcelJS from "exceljs";
import { buildRTM, type RTMArtifact } from "./rtm";

// ── Shared styling ──────────────────────────────────────────────────────────

const HEADER_FILL = "FF1F3040";   // matches the DOCX H2 color for brand consistency
const HEADER_FONT = "FFFFFFFF";
const BAND_FILL = "FFF4F6F7";
const PRIORITY_COLOR: Record<string, string> = { HIGH: "FFB3261E", MEDIUM: "FF9A6700", LOW: "FF3B6E52" };

function styleHeaderAndFreeze(ws: ExcelJS.Worksheet) {
  const headerRow = ws.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });
  headerRow.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const lastCol = ws.columnCount;
  if (ws.rowCount >= 1 && lastCol >= 1) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(ws.rowCount, 1), column: lastCol } };
  }
}

function styleDataRows(ws: ExcelJS.Worksheet, opts?: { zebra?: boolean }) {
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    row.eachCell({ includeEmpty: true }, cell => {
      cell.alignment = { vertical: "top", wrapText: true, horizontal: cell.alignment?.horizontal ?? "left" };
    });
    if (opts?.zebra && r % 2 === 1) {
      row.eachCell({ includeEmpty: true }, cell => {
        if (!cell.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_FILL } };
      });
    }
  }
}

function colorizeColumn(ws: ExcelJS.Worksheet, key: string, colorMap: Record<string, string>) {
  const col = ws.getColumn(key);
  const colNumber = col.number;
  for (let r = 2; r <= ws.rowCount; r++) {
    const cell = ws.getRow(r).getCell(colNumber);
    const value = String(cell.value ?? "").toUpperCase();
    if (colorMap[value]) cell.font = { ...(cell.font ?? {}), bold: true, color: { argb: colorMap[value] } };
  }
}

// ── Requirements ─────────────────────────────────────────────────────────────

export interface RequirementRow { id: string; type: string; statement: string; source: string; }
export interface OpenQuestionRow { id: string; question: string; relatedItems: string; }

const REQ_ITEM_RE = /^(CAP|BR|FR|NFR)-(\d+):\s*(.+)$/;
const REQ_ID_REF_RE = /\b(CAP|BR|FR|NFR)-\d+\b/g;

export function parseRequirements(content: string): { requirements: RequirementRow[]; openQuestions: OpenQuestionRow[] } {
  const lines = content.split("\n");
  const requirements: RequirementRow[] = [];
  const oqLines: string[] = [];
  let inOpenQuestions = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (/^##\s+Open Questions/i.test(line)) { inOpenQuestions = true; continue; }
    if (/^##\s+/.test(line)) { inOpenQuestions = false; continue; }

    const m = line.match(REQ_ITEM_RE);
    if (m) {
      const [, prefix, num, rest] = m;
      const statement = rest.trim();
      const source = /\bAssumed\s*:/i.test(statement) ? "Assumed" : "Stated";
      requirements.push({ id: `${prefix}-${num}`, type: prefix, statement, source });
      continue;
    }
    if (inOpenQuestions && line) oqLines.push(line);
  }

  const questionTexts = oqLines.map(l => {
    if (l.startsWith("- ") || l.startsWith("* ")) return l.slice(2).trim();
    if (/^\d+\.\s/.test(l)) return l.replace(/^\d+\.\s/, "").trim();
    return l;
  }).filter(Boolean);

  const openQuestions: OpenQuestionRow[] = questionTexts.map((q, idx) => {
    const related = [...new Set([...q.matchAll(REQ_ID_REF_RE)].map(mm => mm[0]))];
    return { id: `OQ-${String(idx + 1).padStart(3, "0")}`, question: q.replace(/\*\*/g, ""), relatedItems: related.join(", ") };
  });

  return { requirements, openQuestions };
}

export async function buildRequirementsWorkbook(content: string): Promise<ExcelJS.Buffer> {
  const { requirements, openQuestions } = parseRequirements(content);
  const wb = new ExcelJS.Workbook();
  wb.creator = "The BA Portal";
  wb.created = new Date();

  const ws1 = wb.addWorksheet("Requirements Register");
  ws1.columns = [
    { header: "ID", key: "id", width: 12 },
    { header: "Type", key: "type", width: 10 },
    { header: "Statement", key: "statement", width: 75 },
    { header: "Source", key: "source", width: 12 },
    { header: "Status", key: "status", width: 18 },
  ];
  requirements.forEach(r => ws1.addRow({ id: r.id, type: r.type, statement: r.statement, source: r.source, status: "" }));
  styleHeaderAndFreeze(ws1);
  styleDataRows(ws1, { zebra: true });

  const ws2 = wb.addWorksheet("Open Questions");
  ws2.columns = [
    { header: "ID", key: "id", width: 12 },
    { header: "Question", key: "question", width: 85 },
    { header: "Related Items", key: "related", width: 22 },
  ];
  openQuestions.forEach(q => ws2.addRow({ id: q.id, question: q.question, related: q.relatedItems }));
  styleHeaderAndFreeze(ws2);
  styleDataRows(ws2, { zebra: true });

  return wb.xlsx.writeBuffer();
}

// ── User Stories ────────────────────────────────────────────────────────────

export interface UserStoryRow {
  epicId: string; epicName: string; featureId: string; featureName: string;
  storyId: string; priority: string; asA: string; iWant: string; soThat: string;
  acceptanceCriteria: string; satisfies: string;
}

export function parseUserStories(content: string): UserStoryRow[] {
  const epicMap = new Map<string, string>();
  for (const m of content.matchAll(/^EPIC-(\d+):\s*([^\n—–]+)/gm)) {
    epicMap.set(`EPIC-${m[1]}`, m[2].trim());
  }
  // A feature can span more than one epic ("(Epics: EPIC-001, EPIC-002)"), so
  // each feature keeps every epic id it references rather than assuming one.
  const featureMap = new Map<string, { name: string; epicIds: string[] }>();
  for (const m of content.matchAll(/^FEAT-(\d+):\s*([^\n—–(]+)(?:[^\n]*?\(Epics?:\s*([^)]+)\))?/gm)) {
    const epicIds = m[3] ? [...new Set([...m[3].matchAll(/EPIC-\d+/g)].map(mm => mm[0]))] : [];
    featureMap.set(`FEAT-${m[1]}`, { name: m[2].trim(), epicIds });
  }

  const blocks = content.split(/(?=\*\*US-\d+)/);
  const rows: UserStoryRow[] = [];

  for (const block of blocks) {
    const idMatch = block.match(/\*\*(US-\d+)/);
    if (!idMatch) continue;
    const storyId = idMatch[1];

    const prioMatch = block.match(/US-\d+\s*·\s*(HIGH|MEDIUM|LOW)/i);
    const priority = prioMatch ? prioMatch[1].toUpperCase() : "";

    // A story can also cite more than one feature ("(Feature: FEAT-001, FEAT-003)")
    // — capture every id in the tag, not just the first, and union the epics
    // those features belong to rather than picking one arbitrarily.
    const featParenMatch = block.match(/\(Features?:\s*([^)]+)\)/i);
    const featureIds = featParenMatch ? [...new Set([...featParenMatch[1].matchAll(/FEAT-\d+/g)].map(m => m[0]))] : [];
    const featureId = featureIds.join(", ");
    const featureName = [...new Set(featureIds.map(fid => featureMap.get(fid)?.name).filter((n): n is string => !!n))].join("; ");
    const epicIds = [...new Set(featureIds.flatMap(fid => featureMap.get(fid)?.epicIds ?? []))];
    const epicId = epicIds.join(", ");
    const epicName = [...new Set(epicIds.map(eid => epicMap.get(eid)).filter((n): n is string => !!n))].join("; ");

    let asA = "", iWant = "", soThat = "";
    const tight = block.match(/As a\s*\*\*([\s\S]+?)\*\*,?\s*I want to\s*\*\*([\s\S]+?)\*\*\s*so that\s*\*\*([\s\S]+?)\*\*/i);
    if (tight) {
      [, asA, iWant, soThat] = tight.map(s => (s ?? "").trim());
    } else {
      const loose = block.match(/As an?\s+([\s\S]+?),\s*I want(?: to)?\s+([\s\S]+?)\s+so that\s+([\s\S]+?)[.\n]/i);
      if (loose) {
        asA = loose[1].replace(/\*\*/g, "").trim();
        iWant = loose[2].replace(/\*\*/g, "").trim();
        soThat = loose[3].replace(/\*\*/g, "").trim();
      }
    }

    const acLines = [...block.matchAll(/^-\s*(US-\d+-AC-\d+):\s*(.+)$/gm)].map(m => `${m[1]}: ${m[2].trim()}`);
    const acceptanceCriteria = acLines.join("\n");

    // The prompt's own template shows "(Satisfies: FR-003)" but real output
    // often writes it as prose inside Notes without a colon, e.g. "Satisfies
    // FR-001, FR-012, BR-001." — capture just the id list either way, not the
    // colon literally, and never swallow the sentence that follows it.
    const satisfiesMatch = block.match(/Satisfies:?\s*((?:[A-Z]+-\d+(?:,\s*)?)+)/i);
    const satisfies = satisfiesMatch ? satisfiesMatch[1].replace(/,\s*$/, "").trim() : "";

    rows.push({ epicId, epicName, featureId, featureName, storyId, priority, asA, iWant, soThat, acceptanceCriteria, satisfies });
  }

  return rows;
}

export async function buildUserStoriesWorkbook(content: string): Promise<ExcelJS.Buffer> {
  const rows = parseUserStories(content);
  const wb = new ExcelJS.Workbook();
  wb.creator = "The BA Portal";
  wb.created = new Date();

  const ws = wb.addWorksheet("User Story Backlog");
  ws.columns = [
    { header: "Epic ID", key: "epicId", width: 10 },
    { header: "Epic Name", key: "epicName", width: 22 },
    { header: "Feature ID", key: "featureId", width: 11 },
    { header: "Feature Name", key: "featureName", width: 24 },
    { header: "Story ID", key: "storyId", width: 10 },
    { header: "Priority", key: "priority", width: 10 },
    { header: "As a", key: "asA", width: 22 },
    { header: "I want", key: "iWant", width: 34 },
    { header: "So that", key: "soThat", width: 34 },
    { header: "Acceptance Criteria", key: "ac", width: 58 },
    { header: "Satisfies", key: "satisfies", width: 16 },
  ];
  rows.forEach(r => ws.addRow({
    epicId: r.epicId, epicName: r.epicName, featureId: r.featureId, featureName: r.featureName,
    storyId: r.storyId, priority: r.priority, asA: r.asA, iWant: r.iWant, soThat: r.soThat,
    ac: r.acceptanceCriteria, satisfies: r.satisfies,
  }));
  styleHeaderAndFreeze(ws);
  styleDataRows(ws, { zebra: true });
  colorizeColumn(ws, "priority", PRIORITY_COLOR);

  return wb.xlsx.writeBuffer();
}

// ── Testing ──────────────────────────────────────────────────────────────────

export interface TestCaseRow {
  id: string; scenario: string; covers: string; preconditions: string;
  steps: string; expectedResult: string; priority: string;
}

function captureField(block: string, label: string, nextLabels: string[]): string {
  const boundary = nextLabels.length ? `(?:\\n\\s*(?:${nextLabels.join("|")}):|$)` : "$";
  const re = new RegExp(`${label}:\\s*([\\s\\S]*?)${boundary}`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

export function parseTestCases(content: string): TestCaseRow[] {
  const blocks = content.split(/(?=\*\*TC-\d+)/);
  const rows: TestCaseRow[] = [];

  for (const block of blocks) {
    const idMatch = block.match(/\*\*(TC-\d+)/);
    if (!idMatch) continue;
    const id = idMatch[1];

    const scenarioMatch = block.match(/TC-\d+\s*·\s*([^\n*]+)\*\*/);
    const scenario = scenarioMatch ? scenarioMatch[1].trim() : "";

    const covers = captureField(block, "Covers", ["Preconditions"]);
    const preconditions = captureField(block, "Preconditions", ["Steps"]);
    const steps = captureField(block, "Steps", ["Expected Result"]);
    const expectedResult = captureField(block, "Expected Result", ["Priority"]);
    const prioMatch = block.match(/Priority:\s*(HIGH|MEDIUM|LOW)/i);
    const priority = prioMatch ? prioMatch[1].toUpperCase() : "";

    rows.push({ id, scenario, covers, preconditions, steps, expectedResult, priority });
  }

  return rows;
}

export async function buildTestingWorkbook(content: string, rtmArtifacts: RTMArtifact[]): Promise<ExcelJS.Buffer> {
  const rows = parseTestCases(content);
  const rtmRows = buildRTM(rtmArtifacts);

  const wb = new ExcelJS.Workbook();
  wb.creator = "The BA Portal";
  wb.created = new Date();

  const ws1 = wb.addWorksheet("Test Cases");
  ws1.columns = [
    { header: "Test Case ID", key: "id", width: 13 },
    { header: "Scenario", key: "scenario", width: 26 },
    { header: "Covers", key: "covers", width: 18 },
    { header: "Preconditions", key: "preconditions", width: 32 },
    { header: "Steps", key: "steps", width: 48 },
    { header: "Expected Result", key: "expected", width: 36 },
    { header: "Priority", key: "priority", width: 10 },
  ];
  rows.forEach(r => ws1.addRow({
    id: r.id, scenario: r.scenario, covers: r.covers, preconditions: r.preconditions,
    steps: r.steps, expected: r.expectedResult, priority: r.priority,
  }));
  styleHeaderAndFreeze(ws1);
  styleDataRows(ws1, { zebra: true });
  colorizeColumn(ws1, "priority", PRIORITY_COLOR);

  const ws2 = wb.addWorksheet("Traceability Matrix");
  ws2.columns = [
    { header: "Requirement / Story ID", key: "id", width: 22 },
    { header: "Covered By", key: "coveredBy", width: 32 },
    { header: "Status", key: "status", width: 16 },
  ];
  rtmRows.forEach(r => ws2.addRow({
    id: r.id, coveredBy: r.coveredBy.join(", "), status: r.coveredBy.length > 0 ? "Covered" : "Not covered",
  }));
  styleHeaderAndFreeze(ws2);
  styleDataRows(ws2, { zebra: true });
  colorizeColumn(ws2, "status", { COVERED: "FF3B6E52", "NOT COVERED": "FFB3261E" });

  return wb.xlsx.writeBuffer();
}
