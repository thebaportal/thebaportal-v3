# Illustration Style Guide
## The BA Portal — Visual Identity Brief

---

## Emotional Identity

**Three words that govern every decision:**
Calm. Competent. Quietly confident.

**The emotional target for every user:**
"I can do this." — not "this looks cool."

**Design principle:**
The confidence comes from what is held back, not what is pushed forward.

---

## The Five-Adjective Filter

Every illustration must satisfy all five before it belongs in the product.
If any one of these is missing, the image does not make the cut — regardless of how beautiful it is.

| Adjective | What it means | What it rules out |
|---|---|---|
| **Calm** | No urgency, no tension, no overwhelm | Dynamic angles, dramatic lighting, cluttered scenes |
| **Competent** | The person looks like they know what they are doing | Confused expressions, chaotic environments, uncertainty |
| **Human** | Real people in real professional moments | Abstract metaphors, floating objects, symbols without people |
| **Purposeful** | Something is happening — the image has intent | Decorative scenes with no clear meaning, posed stock photo energy |
| **Hopeful** | Forward-facing, not cheerful. The person looks at something ahead, not at the camera | Forced smiles, celebratory poses, arms raised, hollow optimism |

---

## Style Specification

**What it is:**
Premium editorial illustration. Think Harvard Business Review, The Atlantic, or Monocle — sophisticated, human, slightly abstracted but clearly real.

**What it is not:**
- Not cartoon (no simplified features, no big eyes, no flat vector clip art)
- Not stock photography (no staged smiles, no generic office backgrounds)
- Not photorealistic (clearly illustrated, not a photograph)
- Not SaaS generic (no floating UI elements, no abstract tech metaphors)

**Line quality:**
Confident, clean line work. Not sketchy. Not overly detailed. The line should feel like it was drawn by someone who knew exactly where it was going.

**Backgrounds:**
Minimal. Soft environmental suggestion, not detailed interiors. A wash of warm white, a hint of an office window, a desk edge. The human is the subject. The background supports — it does not compete.

---

## Colour in Illustrations

The illustration palette works alongside the UI palette but is not identical to it.

**UI colours (for reference):**
- Warm white `#F8F7F4`
- Deep navy-black `#1C1C2E`
- Teal `#0D9488`
- Slate `#64748B`

**In illustrations, add:**
- Amber `#C4883A` — the emotional accent. A warm highlight on clothing, a document edge, a background wash. Never dominant. Always felt, not seen.
- Naturalistic skin tones across the full range — warm, accurate, never generic
- Professional clothing in deep navy, charcoal, warm grey — competent without being corporate boring

**Rule:** Amber never appears in functional UI (buttons, badges, tabs, links). It lives only in illustrations, success moments, hero sections, and marketing. The moment it appears in a UI component, it becomes a second brand colour and loses its emotional power.

---

## The Human in Every Image

**Who they are:**
An aspirational peer — not an aspirational boss. Mid-career, accomplished, focused. The user should see the version of themselves they are working toward. One step ahead, not ten.

**What they are doing:**
Engaged with something ahead of them. Reviewing a document. Thinking. Writing. In a quiet moment of focus or readiness. Never posing. Never performing.

**What they are never doing:**
- Looking at the camera
- Smiling for the viewer
- Celebrating with arms raised or fists pumped
- Appearing stressed, even if the resolution is positive
- Appearing rushed or frantic

**Diversity:**
Deliberate and intentional — not random. Each illustration should specify the person: a Black woman reviewing a document, a South Asian man in a meeting, a white woman at a laptop. Chosen thoughtfully so the full set represents the full range of professionals who use this product.

---

## The Five Priority Moments

### 1. Opportunity Finder — Loading State
**What is happening in the product:** The system is scanning jobs and ranking by fit. The user waits.
**What the user feels:** Mild anxiety. Hoping to see themselves in the results.
**What the illustration communicates:** "Something real is being found for you."
**The image:** A professional (woman, early 40s, South Asian) at a desk, leaning slightly forward, reading something off-screen. Still. Focused. The quality of someone who knows how to wait well.
**Colour mood:** Cool teal wash in the background. Warm amber on her jacket.

---

### 2. Apply Engine — Evidence Interview
**What is happening in the product:** The AI is asking the user questions about their experience to build a better application.
**What the user feels:** Uncertainty. "Is this going anywhere? Am I saying the right things?"
**What the illustration communicates:** "Your experience matters. This is worth your time."
**The image:** A professional (man, mid-30s, Black) writing in a notebook or typing, in a moment of quiet thought. Not intense — thoughtful. Like someone who has done this before and trusts the process.
**Colour mood:** Warm white background. Deep navy clothing. Amber on a notebook or paper element.

---

### 3. Application Package — Success State
**What is happening in the product:** The full application — tailored resume, cover letter, interview prep — has been generated.
**What the user feels:** Relief, but also "is this actually good?"
**What the illustration communicates:** "You are ready. This is real."
**The image:** A professional (woman, late 30s, white) standing, holding a printed document, looking forward. Not at the camera. Not smiling. Composed. The posture of someone about to walk into a room they are prepared for.
**Colour mood:** Warm white. Teal accent in the background. Amber on the document she holds.

---

### 4. Empty States — No Applications / No Evidence Yet
**What is happening in the product:** The user has not yet saved an application or added career evidence.
**What the user feels:** Uncertain where to start. Possibly overwhelmed.
**What the illustration communicates:** "This is the beginning. That is fine. Let's build it."
**The image:** A professional (man, 40s, East Asian) at a clean, uncluttered desk. Nothing on it yet. He is looking at the space ahead of him with quiet readiness — not anxiety. The feeling of a blank page that is about to become something.
**Colour mood:** Very soft warm background. Clean. Open. No amber — this moment is neutral and waiting.

---

### 5. Career Profile — Header / Welcome
**What is happening in the product:** The user is viewing their career profile. This is their home base.
**What the user feels:** This should feel like ownership. "This is mine."
**What the illustration communicates:** "Your career story lives here. It is growing."
**The image:** A professional (woman, 50s, Black) in a professional setting, not at a desk — perhaps standing near a window, reviewing something she holds. The posture of someone who has built something and knows it. Assured without being proud.
**Colour mood:** Warm, slightly golden background wash. Teal accent. Amber warmly present.

---

## Midjourney Style Prompt Template

Use this suffix on every generation to maintain consistency:

```
premium editorial illustration, [SCENE DESCRIPTION], minimal background with soft colour wash, 
professional business setting suggested not detailed, warm white tones, teal accent, 
sophisticated and human, clean confident line work, diverse professional, 
quiet composure not celebration, forward-facing gaze, 
flat illustration with subtle depth, no cartoon, no stock photo energy, 
editorial style, [DOMINANT CLOTHING COLOUR], amber warm accent element
```

**Lock the seed or style reference** after the first approved image. Every subsequent image runs through the same style reference to maintain consistency across the set.

---

## What This Is Not

- It is not a mood board
- It is not a set of decorative assets
- It is not marketing collateral repurposed for the UI

It is a third UX layer. Text explains. Buttons enable action. These images create the emotional experience of using the product. Every image earns its place by reducing anxiety, celebrating progress, explaining a concept, or making the user feel capable.

If it does not do one of those things, it does not belong.
