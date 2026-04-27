# TheBAPortal Dev Log

This file is a running log of decisions, discussions, and open questions across sessions.
It exists because Claude sessions can be lost mid-conversation. Paste this file back into a new session to restore context.

---

## Session: 2026-04-23 (continuation / new session)

### Context restored from memory
- Last session built: Practice Area filter for Simulation Lab, exam dropdown fix, scenario file split, 7 new scenarios (24 total, target 60)
- All changes were pushed at end of last session as an exception (laptop issue)
- Open strategic question from last session: new scenario format built around Business Rules, Process Ownership, Stakeholder Psychology — **live conversation format vs written case study format?** Not yet decided.

---

### Competitive analysis received this session

Someone did a full external analysis of TheBAPortal. Key findings:

**Pros (confirmed strengths):**
- Strong for stuck BAs and career changers
- Practical, focused feedback — not a wall of text
- Active learning / muscle memory for stakeholder meetings
- Job-ready focus — translates skills into resume bullets and interview stories

**Cons (critical gaps):**
- Perceived as tech-centric / software lane
- SDLC focus means non-tech BAs (process, strategy, consulting, government) don't see themselves in the product
- No official certification (CBAP etc.) — skill builder only, not accredited
- Price may feel high for students vs free YouTube/LinkedIn Learning

**The core problem identified:**
The platform unintentionally signals "this is for software BAs." Scenarios, SDLC learning modules, and interview prep all read "tech BA." A BA doing process improvement in a bank or strategic analysis in consulting looks at this and thinks "this isn't for me."

**The BA landscape framing from the analysis:**
Business analysis is broader than software. Areas the platform currently underserves:
- Business Process Re-engineering (factory ops, hospital admissions)
- Strategic Analysis (M&A, executive decision support)
- Change Management (people side, training, culture)
- Heavily regulated industries (government, defense) using non-Agile frameworks

The analysis specifically noted: "The SDLC usually implies a specific way of working (Agile, Scrum, Waterfall). If simulations are built around Agile/SDLC, they might not prepare you for a role in a heavily regulated industry."

**User's response to this feedback:**
"No BA should ever feel the need to use another material." The platform must serve ALL BA types, not just software BAs. This is the north star.

---

### The evaluator problem (raised end of last session — NOT YET BUILT)

Current evaluator prompt grades every scenario through a requirements/SDLC lens:
- Problem Framing
- Root Cause
- Evidence Use
- Recommendation Quality

**The problem:** A BA who does excellent process analysis or stakeholder strategy work will get mediocre scores because the evaluator is grading them like a software BA. Same four dimensions, but the lens is wrong for non-SDLC scenarios.

**What needs to change:**
The evaluator prompt must be tied to scenario type. For a process scenario, the evaluator should look for:
- Did they identify the handoff points?
- Did they clarify who owns the decision?
- Did they distinguish symptom from root cause in the process?

This is a backend change in the evaluate route, tied to scenario type. Not yet built.

---

### CBAP alignment opportunity (raised end of last session — NOT YET BUILT)

Non-SDLC scenarios map directly to BABOK knowledge areas:
- Current state analysis
- Future state definition
- Stakeholder engagement
- Business case development

If scenario briefs are written with BABOK language alignment from the start, a UI hook can be added later: "This scenario maps to BABOK 4.2." 

This is a content strategy decision, not a build task yet. Keep in mind when writing new scenario briefs so the language aligns now rather than requiring a rewrite later.

---

### Open questions going into next build

1. **Evaluator prompt per scenario type** — backend change needed. How do we structure it? Options:
   - A lookup object: `scenarioType -> evaluatorPrompt`
   - Dynamic prompt construction that injects type-specific criteria
   - New field on the scenario object: `evaluationDimensions[]`

2. **New scenario format decision** — Business Rules / Process Ownership / Stakeholder Psychology scenarios. Live conversation format (like existing simulations) or written case study format? User wants to answer this before building.

3. **Interview Lab revision** — people want direction, not grammar polish. What does that look like in practice?

4. **Industry representation** — every new scenario should pass the test: "Does a consulting BA or finance BA see themselves in this?"

---

### Scenario count as of last session
- Product & Technical: 8
- Process & Operations: 5
- Enterprise & Strategy: 4
- Change & Stakeholder: 4
- Enterprise Systems: 3
- **Total: 24 | Target: 60**

---

---

## Session: 2026-05-31 (continued)

### Built: Process Flow Builder

New route: `/tools/process-flow`

Files created:
- `src/app/tools/process-flow/page.tsx` — server component, auth gated
- `src/app/tools/process-flow/ProcessFlowClient.tsx` — full UI

Files modified:
- `src/components/AppSidebar.tsx` — added "Tools" section with Process Flow as first item

What it does:
- Left panel: structured form — process title, steps (actor + action + decision toggle + branch labels)
- Right panel: live Mermaid diagram that builds as you type
- Steps can be reordered (up/down) and deleted
- Decision points toggle a diamond node with Yes/No branch labels
- Export to PNG button
- "View diagram code" collapsible for debugging
- Tip at the bottom of the form reminding BAs that handoffs are where processes break down

Package installed: `mermaid`

**Not yet pushed** — bank with other changes before pushing.

### Strategic decisions made this session
- Process flow tool architecture: structured form → auto-rendered diagram (not drag-and-drop canvas)
- Drag-and-drop (React Flow) is the Phase 2 "Advanced Mode" — not built yet
- BABOK alignment: outcome-first framing ("You're practising Process Analysis"), BABOK reference quietly underneath
- Evaluator prompt must be tied to scenario type — backend change not yet built

### Still open
- Evaluator prompt per scenario type (backend change to evaluate route)
- Hospital ED Bottleneck scenario (`hospital-ed-bottleneck-001`) — user hasn't reviewed yet, laptop died before feedback
- Interview Lab revision: direction not grammar
- 36 more scenarios needed to reach target of 60

---

## How to use this file

When starting a new session after a laptop shutdown:
1. Open this file
2. Copy the full contents
3. Paste into the new Claude Code session as your first message with: "Here's the devlog, pick up from here"
