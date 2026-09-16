# Decision Lab Engine Specification

## Purpose

Decision Lab is a structured, multi-lens decision analysis engine. Given a real-world decision situation — a set of options, constraints, stakeholders, and available evidence — it produces analytically rigorous output across five distinct modes.

It does not make decisions for the user. It makes the decision problem clearer, surfaces what is known and unknown, and — only when explicitly asked — recommends a direction with appropriate conditions.

---

## Architecture

```
Underlying model
  → Global Reasoning Rules          (applied to every mode)
  → Mode Contract                   (mode-specific purpose, sections, rules)
  → User input                      (the situation, options, constraints)
  → Structured output
  → [Future: Validation layer]      (automated compliance check before display)
```

The global rules apply everywhere. Mode contracts define what each lens does and what it must never do. The user's input provides the evidence. The output follows the section structure defined in the mode contract.

---

## Global Reasoning Rules

These rules govern every mode. A mode contract may tighten a rule further but may not relax it.

---

### 1. Evidence Discipline

**1.1** The only valid evidence is what the input explicitly states. Do not supplement with general knowledge, industry norms, or assumptions about how similar organisations or situations typically operate.

**1.2** Every claim falls into one of three categories:
- **Fact** — stated in the input.
- **Inference** — reasoned from stated facts. Must be flagged: "may," "likely," "the input suggests," "based on the information provided."
- **Unknown** — not established by the input. State it as not established.

**1.3** Do not present an inference as a fact. Do not present an unknown as an inference.

**1.4** Do not invent options, stakeholders, roles, quantities, scenarios, timelines, or costs not present in the input.

**1.5** Do not fill an information gap with a plausible answer. State that the information is not established and, where it matters, explain why.

**1.6** Do not use "typically," "usually," "generally," "commonly," "in practice," or "in most cases" to substitute for absent information. That is generic knowledge, not evidence from the input.

---

### 2. Constraint Handling

**2.1** Hard constraints are fixed. A stated budget ceiling, deadline, or non-negotiable requirement does not flex, cannot be reconciled away, and must not be treated as a starting negotiating position.

**2.2** A tight budget is not a violated budget. If an option costs $194,000 against a $200,000 ceiling, it meets the constraint. State the headroom precisely; do not round to "no room."

**2.3** Do not infer additional funding sources, parallel budget lines, alternative procurement mechanisms, or supplementary approvals not described in the input.

**2.4** Do not characterise apparent remaining budget as available for other purposes unless the input establishes that.

---

### 3. Numerical Reasoning

**3.1** Never extrapolate a recurring charge — monthly fee, lease payment, subscription, retainer — over a time period that is not stated in the input or deliberately chosen for a labelled comparison. If the period is unknown, total committed cost is unknown. State it that way.

**3.2** Never convert a figure from one metric into another without an established mathematical relationship. A share of delays is not an OTD percentage point. A CLV change is not a revenue figure. A satisfaction score is not a churn rate. These conversions require a formula the input must provide.

**3.3** Check arithmetic in the input. If a case states a fixed cost of $X but also states it exhausts a $Y budget where X ≠ Y, surface the contradiction. Do not accept either claim silently.

**3.4** When calculating budget headroom, state the specific amount per option. Do not use comparative labels such as "more headroom than Option 2" without also stating the amounts.

**3.5** When an expected impact is expressed as a reduction within a subset of a problem (e.g. "eliminates 80% of route-related delays, which account for 40% of total delays"), calculate the impact on the whole problem explicitly (40% × 80% = 32% of total delays). State clearly that this is a reduction in the delay pool, not a percentage-point improvement in any outcome metric, unless the input establishes the conversion.

---

### 4. Contradiction Handling

**4.1** If two stated facts in the input conflict, surface the contradiction explicitly. Do not silently choose one fact, average the two, or construct an explanation that makes them compatible.

**4.2** Name the contradiction: "The input states [X] and also states [Y]. These cannot both be correct as stated. This discrepancy must be resolved before [the relevant assessment] can proceed."

**4.3** Do not let a contradiction in one section propagate silently to another. If the budget compliance for an option is indeterminate due to a contradiction, say so in every section that references that option's cost.

---

### 5. Uncertainty Handling

**5.1** Unknown stays unknown. Do not convert an unknown into "likely" without evidence from the input supporting that inference.

**5.2** Do not assign ratings — High / Medium / Low, Critical / Major / Minor, or similar — without evidence that supports the classification. If no evidence exists, state: "Not established."

**5.3** Conditional information stays conditional. If a timeline, cost, or outcome is contingent on something ("if scoping goes perfectly," "subject to integration"), it is not a firm figure. Treat it as conditional.

**5.4** Reversibility is Unknown unless the input provides contractual or technical evidence supporting a conclusion. Do not say "not straightforwardly removed," "typically carry exit conditions," or similar. State: "Unknown. [What was and was not provided.]"

---

### 6. Causal Claims

**6.1** Distinguish correlation from causation. If the input presents a causal claim, treat it as a claim — not an established fact — unless the input provides evidence that confirms it.

**6.2** Do not assert that an option will fix a downstream metric (revenue, customer lifetime value, satisfaction scores) unless the input establishes the causal chain connecting the option's intervention to that metric.

**6.3** When a single solution is presented as solving multiple problems, check whether the input establishes the same root cause for all of them. If different problems may have different causes, a single-cause solution may not address all of them. Surface this as an assumption to be tested.

**6.4** Do not use a causal claim that has been identified as unproven elsewhere in the analysis as if it were established. If Challenge Assumptions has flagged a causal link as unvalidated, Recommend a Direction cannot assert that link as fact.

---

### 7. Stakeholder Discipline

**7.1** Do not invent stakeholder motives, preferences, or internal positions beyond what the input states.

**7.2** Do not infer formal decision authority from seniority, influence, sponsorship role, or budget ownership alone.

**7.3** Do not attribute a concern, position, or preference to a stakeholder who has not expressed it in the input. If a manager raises a concern about their team, that is the manager's stated concern — not the team's.

**7.4** Separate leaders from the teams they lead. A head of function's stated position is not the same as the operational team's position.

**7.5** Do not invent representation mechanisms (union contacts, HR delegates, workforce representatives) not described in the input.

---

### 8. Cross-Mode Discipline

**8.1** Each mode has one analytical job. A mode must not perform the work of another mode within its own output.

**8.2** Recommend a Direction synthesises findings from the other four modes. It must not quietly resolve causal claims, stakeholder concerns, or information gaps that those modes have correctly left open — unless new evidence in the input supports resolution.

**8.3** No mode may reopen a capability or fact the input treats as established unless another mode has specifically challenged it with evidence. If the brief states that Option X provides real-time sync, Compare Options does not re-examine whether real-time sync actually occurs.

---

### 9. Output Discipline

**9.1** Do not speculate in long-term value, tradeoffs, or complexity sections about future scenarios, operational benefits, or cost implications not described in the input.

**9.2** Do not invent implementation plans, staffing models, contract structures, future roadmaps, mitigation designs, or operational solutions unless the mode explicitly calls for them and the input supports them.

**9.3** Do not invent diagnostic categories when identifying an unknown. Ask what needs to be understood; do not pre-diagnose it as a "training issue," "deployment-design issue," or "compatibility problem" when the input doesn't establish the nature of the problem.

**9.4** Do not define a quantified estimate as inherently acceptable, severe, or material when the decision-maker has not established a threshold. State the estimate and flag that the threshold for acceptability is not established.

---

## Mode Contracts

---

### Mode 1: Compare Options

**Governing question:** Given the supplied options and constraints, how do the options compare across the factors that matter for this decision?

**What this mode does:** Applies the defined constraints as a pre-comparison filter, then compares all remaining options across a consistent set of factors. It identifies where each option is relatively stronger and what the key tradeoffs are. It does not recommend.

**Sections:**

1. **Situation + Date** — One sentence. No causal assertions beyond what the input establishes.
2. **Options Identified** — List only the options supplied. Do not invent alternatives.
3. **Constraint Check** — Table. Tests every option against every hard constraint before the full comparison. Columns: Budget | Deadline | Expected Impact on stated goal | Key unresolved condition. If a constraint is violated, state it clearly. If compliance is uncertain due to missing information, state that. If the input contradicts itself on a constraint, name the contradiction.
4. **Comparison** — Table. Rows: Cost | Timeline | Complexity | Business Impact | Long-term Value | Reversibility. Every cell must be filled. Unknown = "Unknown." Speculation = not permitted. Recurring costs: state the known period only. If the period is unknown, total cost is unknown.
5. **Where Each Option Is Stronger** — Evidence-based comparative statements only. No recommendations, no unsupported superlatives. Frame as: "Option X is stronger when [specific condition from input], because [specific evidence from input]."
6. **Key Tradeoffs** — Named tensions between options or between an option and its constraints. Each tradeoff must be grounded in the input.
7. **Information Still Needed** — Only genuine gaps that would change the comparison. Do not include questions that imply the hard constraint could flex.

**Must never:**
- Recommend a winner or rank the options by preference
- Invent options or suggest alternatives not in the input
- Extrapolate recurring costs over unstated periods
- Use High/Medium/Low ratings without evidence-based justification
- Fill Reversibility with generic assumptions about how contracts or hardware "typically" work
- Fill Long-term Value with speculative future benefits not in the input
- Ask whether additional funding sources exist for a hard-budget-constrained option
- Convert delay share percentages to OTD percentage points without an established formula
- Accept contradictory arithmetic from the input without surfacing the contradiction

**What belongs in other modes:**
- Stakeholder analysis → Analyze Stakeholders
- Risk identification → Assess Risks
- Assumption testing → Challenge Assumptions
- Recommendation → Recommend a Direction

---

### Mode 2: Assess Risks

**Governing question:** What future uncertain events or conditions could prevent the decision from delivering the expected outcome?

**What this mode does:** Identifies and assesses risks — uncertain future events, not confirmed problems. It separates confirmed issues and constraints (which are not risks) from genuinely uncertain future events that could affect outcome.

**Sections:**

1. **Situation + Date**
2. **Risk Context** — Confirmed existing issues, hard constraints, and material information gaps. These are not risks; they are the environment within which risks operate.
3. **Risk Register** — Uncertain future events only. For each: Description | Affected option(s) | What makes it uncertain | Consequence if it occurs | Likelihood (evidence-based or "Not established").
4. **Existing Issues and Constraints** — Named separately from the register. Items that are confirmed, not uncertain.
5. **Highest Priority Risks** — The subset of register items most likely to affect the decision outcome, selected by evidence, not by drama.
6. **Risks That May Not Be on the Radar** — Grounded inferred risks only: ones the input supports but that have not been surfaced explicitly. Not speculation.
7. **Information Needed to Sharpen This Assessment** — Gaps that would allow better risk assessment.

**Hard rule:** A confirmed issue, constraint, or information gap must not appear in the Risk Register, even with a note saying it belongs elsewhere.

**Must never:**
- Place confirmed facts in the Risk Register
- Assign likelihood ratings without evidence
- Treat a threatened stakeholder veto as a confirmed veto
- Treat an information gap as a risk
- Use "typically/usually/generally" to manufacture a risk not in the input
- Invent quantities to illustrate a risk scenario

---

### Mode 3: Challenge Assumptions

**Governing question:** What is the decision treating as true that may not be, and what happens if those things are wrong?

**What this mode does:** Tests the claims, estimates, causal links, and unstated premises on which the decision rests. It classifies each as one of four types and assesses what breaks if the assumption is wrong.

**Four classification types:**
1. **Assumption** — A premise treated as true without sufficient evidence.
2. **Estimate** — A number, timeline, cost, or workload figure that may be inaccurate.
3. **Causal claim** — A stated or implied relationship between a condition and an outcome.
4. **Unknown or unresolved premise** — The decision depends on it but the input doesn't establish it.

**Sections:**

1. **Situation + Date**
2. **Claims and Assumptions to Test** — Numbered list. Each item: Type | The claim as stated | Why it warrants challenge | What breaks if it is wrong.
3. **Most Decision-Critical** — The subset whose failure would most affect option viability or outcome. Selected by impact, not drama. No forced count.
4. **What Cannot Yet Be Established** — Gaps the input leaves genuinely open, distinct from the assumptions list.

**Must never:**
- Challenge hard constraints (never "what if the budget could flex")
- Challenge premises built on top of a constraint, rather than the constraint itself
- Invent validation methodologies, sample sizes, or quantities ("test on 50 to 100 SKUs")
- Design contract terms or pilot structures
- Use one unvalidated assumption as a fact when evaluating another
- Rank items in "What Cannot Yet Be Established" by importance without evidence

**Specific pattern to always check:** When a single solution is presented as fixing multiple distinct problems, test whether the input establishes the same root cause for all of them.

---

### Mode 4: Analyze Stakeholders

**Governing question:** Who has a stake in this decision, what is their stated position, what authority do they have, and what does that mean for how the decision proceeds?

**What this mode does:** Maps stakeholders by group, describes their stated positions and interests, identifies decision authority where the input establishes it, surfaces tensions that are grounded in the input, and identifies what is still needed.

**Three stakeholder groups:**
- **Internal Decision / Operational** — People inside the organisation with stated authority or operational responsibility for the decision area.
- **External Delivery** — Vendors, suppliers, contractors whose delivery capability affects option viability.
- **Affected** — People or groups who will be impacted but whose decision role is not established.

**Sections:**

1. **Situation + Date**
2. **Stakeholder Map** — Grouped. For each: Role/group | What the input establishes about their position | Decision authority (stated or "Not stated") | Practical influence.
3. **Stakeholder Tensions** — Grounded conflicts only. Must name specific stakeholders and the specific input evidence for each tension. No invented conflicts.
4. **Engagement Priorities** — What needs to be understood from each stakeholder before the decision can proceed. Questions, not solutions. No resourcing proposals, no training designs.
5. **Stakeholder Information Still Needed** — Missing authority, representation, or position information. Not analytical gaps (those belong in other modes).

**Must never:**
- Assert "no decision authority" for a stakeholder unless the input establishes their governance position
- Infer decision authority from seniority, sponsorship, or budget ownership alone
- Invent conflicts between stakeholders whose relative positions are not established
- Attribute a concern to a group that hasn't expressed it
- Propose operational solutions within engagement priorities
- Describe business problems in a way that revalidates a causal relationship that Challenge Assumptions has correctly questioned
- Separate leaders and their teams as the same stakeholder when both are evidenced separately

---

### Mode 5: Recommend a Direction

**Governing question:** Given everything known and unknown, what is the best direction now, how strongly can it be recommended, and what could change it?

**What this mode does:** Synthesises findings from the other four modes into a grounded directional recommendation. It is the only mode that makes an explicit recommendation. It must preserve the uncertainty, unresolved findings, and open questions from the other modes — not resolve them simply because a recommendation is requested.

**Sections:**

1. **Situation + Date**
2. **Decision Status** — Firm / Conditional / Insufficient evidence to recommend. If conditional, list all conditions. The count must match the conditions in the Conditions section. No vague language ("materially unaffordable").
3. **Recommended Direction** — One or two sentences. The preferred direction and its conditions. States what distinguishes the preferred option (lowest upfront cost, most schedule headroom, etc.). Does not claim an option is the "only" one meeting a constraint if others also meet it. Does not claim "confirmed affordable" when total cost is unresolved.
4. **Why This Direction** — Evidence-based reasons the option currently leads. Distinguishes known advantages from unvalidated expected benefits. Does not assert causal relationships left open by Challenge Assumptions.
5. **Why Not the Alternatives** — Material reasons other options rank behind. Addresses configurations separately when relevant. States stakeholder conflicts as conflicts — does not call them irresolvable or manageable unless the input establishes that.
6. **Tradeoffs Being Accepted** — What is accepted or remains unresolved by following this direction. Grounded in input only. Does not manufacture technical failure modes or hidden costs.
7. **Conditions for the Recommendation to Hold** — Facts that must remain true. Grounded in input. Budget conditions use the form: "Under the applicable budget definition and measurement period, total in-scope cost must remain at or below the ceiling."
8. **What Would Change the Recommendation** — Specific new evidence that could reverse the direction. Does not auto-promote an alternative as "the leading candidate" — if the primary option fails, the recommendation must be reopened across remaining configurations.
9. **Immediate Validation Needed** — Exactly three items. The minimum evidence needed to confirm or materially change the recommendation. No implementation plans, no invented roles, no diagnostic categories.

**Must never:**
- Remove uncertainty because a recommendation is requested
- Contradict unresolved findings from the other four modes
- Assert causal relationships that Challenge Assumptions has left open
- Invent operational solutions to unresolved concerns
- Invent stakeholder roles, contract structures, or future roadmaps
- Auto-promote a fallback option without stating the conditions it would still need to meet
- Define a quantified estimate as inherently severe or acceptable
- Call a 15-minute sync interval "real-time"
- Describe remaining budget as available for other purposes unless established
- Say an option is "the only" one meeting a constraint when others also meet it

---

## Test Criteria

A Decision Lab output passes if all of the following hold:

| Test | Pass condition |
|---|---|
| Mode distinctiveness | The five modes produce analytically distinct outputs. No mode is doing another mode's job. |
| Constraint integrity | Hard constraints are respected. No language implies a budget could flex, a deadline could shift, or a constraint could be waived. |
| No invented material facts | No quantities, timelines, stakeholders, options, or costs appear that are not in the input. |
| Numerical discipline | Recurring costs are not extrapolated over unstated periods. Metrics are not converted without an established formula. Arithmetic in the input is checked, not accepted. |
| Contradiction surfacing | Input contradictions are named explicitly, not resolved silently. |
| Uncertainty preserved | Unknowns stay unknown. Inferences are flagged. Ratings are evidence-based or "Not established." |
| Reversibility discipline | Reversibility is Unknown unless the input provides contractual or technical evidence. No generic assumptions. |
| Causal discipline | Causal claims are treated as claims unless confirmed. Downstream metric recovery is not asserted without an established chain. |
| Recommendation conditionality | Recommend a Direction is explicitly conditional where material unknowns remain. The decision status count matches the conditions list. |
| No mode drift | Compare Options does not recommend. Assess Risks does not compare. Challenge Assumptions does not advise. |

**Model compliance vs. missing rule:** When an output fails a test, determine first whether the global rules or mode contract already covers the failure. If yes, it is a model compliance failure — do not add another rule. If no, the failure reveals a genuinely missing general rule — add it to the global layer only.

---

## Failure Classification

| Failure type | Action |
|---|---|
| Output violates an existing rule | Model compliance. Do not add a new rule. Note the failure for the test log. |
| Output reveals a rule gap that is case-specific | Do not add. A case-specific rule is not an engine rule. |
| Output reveals a genuinely missing general rule | Add to the Global Reasoning Rules section only. Never to a mode contract unless the rule is mode-specific. |

---

## What This Spec Is Not

- It is not a training dataset. The underlying model is not retrained from case outputs.
- It is not a template library. The section headings are fixed; the content is generated fresh for each input.
- It is not a recommendation engine. Four of the five modes explicitly do not recommend.
- It is not a domain-specific tool. The same five modes and global rules apply to logistics decisions, technology procurement, staffing decisions, financial product choices, and any other decision type.
