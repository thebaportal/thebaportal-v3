// ─── THE BA PORTAL — LEARNING ACADEMY ───────────────────────────────────────
// Module 1: BA Foundations (Revised)
// src/data/academy/module1.ts
// ─────────────────────────────────────────────────────────────────────────────

export const module1 = {
  id: "module-1",
  number: 1,
  title: "BA Foundations",
  subtitle: "Understanding the role before picking up the tools",
  description:
    "You just joined Vela. Nobody agrees on what the product is. Your job is to figure out what problem they are actually solving before anyone writes a single requirement.",
  duration: "55 to 70 minutes",
  sdlcPhase: "Month 1 — Discovery",
  tier: "free",
  badgeOnCompletion: {
    id: "ba-foundations",
    name: "BA Foundations",
    icon: "🎯",
    color: "#1fbf9f",
  },
  blueprint: {
    section: "Section 1 — Problem Definition",
    description:
      "By the end of this module you will add your first two entries to the Vela Lending Blueprint: a problem statement and an initial stakeholder map.",
  },

  lessons: [

    // ─── LESSON 1 ─────────────────────────────────────────────────────────────
    {
      id: "m1-l1",
      number: 1,
      title: "Welcome to Vela",
      readingTime: "3 minutes",
      whereWeAre: null,

      story: `It is Monday morning in Lagos and you are sitting in a glass-walled meeting room on the fourteenth floor. The city moves below you. Traffic. Heat. Noise.

Amara Osei walks in holding two coffees and a printed slide deck. She is the Chief Product Officer and she has the energy of someone who has not slept much but does not mind.

She slides a coffee toward you and opens with three words.

"We are lending now."

Vela processes mobile payments for small businesses across West Africa and the UK diaspora community. Two million transactions a month. Series B funded. The board wants a Merchant Cash Advance product live in nine months. Small business owners would receive instant working capital loans based on their transaction history. No bank statements. No long applications. Just data and a decision.

It sounds clean. It is not.

Before Amara finishes her sentence, David Mensah appears in the doorway. He is the CTO and he has the expression of someone who has already identified three problems with whatever is being said.

"Transaction data alone does not tell the full story," he says, pulling up a chair. "Some of our merchants use three other payment apps. We are only seeing part of their revenue picture."

Amara waves her hand. "That is why we have a Business Analyst."

Both of them look at you.

This is your first hour at Vela. You have two weeks to find out whether this product is viable before engineering spends a single dollar.`,

      concept: {
        title: "What does a Business Analyst actually do?",
        body: `A Business Analyst is the person who figures out the real problem before anyone starts building the solution.

That sounds simple. In practice it is one of the hardest things to do in any organisation, because most people arrive at meetings already talking about solutions. They want features. They want screens. They want to build things. Your job is to slow that down just enough to ask a better question.

Here is the simplest way to think about it. The BA sits at the intersection of three things: what the business needs, what technology can realistically deliver, and what real people will actually use. Your job is to understand all three and find the space where they overlap.

At Vela right now, Amara represents the business ambition. David represents the technical reality. And somewhere out in Lagos, a merchant named Fatima Bello represents the human truth this product has to serve.

You have not met Fatima yet. But every decision you make will affect her.`,
      },

      example: {
        title: "The first thing a BA does",
        body: `After that first meeting, you do not open a requirements template. You do not start drawing diagrams.

You write three questions on a notepad.

What problem are we actually solving? For whom? And how will we know when we have solved it?

Those three questions are the foundation of everything. Before stakeholder maps, before user stories, before process diagrams — you need to be clear on what sits at the centre of this project.

At Vela, the problem is this: small business owners cannot access fast, affordable working capital because traditional banks require documentation that informal businesses cannot easily produce.

That is real. Fatima has lived it. Thousands of merchants like her have lived it. The question is whether Vela can solve it safely, legally, and within nine months.

That is your assignment.`,
      },

      artifact: {
        type: "problem-statement",
        title: "BA Artifact: The Problem Statement",
        description:
          "A problem statement is one of the first things a BA produces. It gives the whole team shared language so everyone is solving the same problem.",
        template: {
          headers: ["Element", "Vela Example"],
          rows: [
            ["The problem of", "Small business owners on the Vela platform cannot access fast working capital"],
            ["Affects", "Merchants across West Africa and the UK diaspora community who rely on Vela for payments"],
            ["The impact is", "Missed business opportunities, reliance on expensive informal credit, and lost revenue potential for Vela"],
            ["A successful solution would", "Offer instant working capital advances based on Vela transaction history, within regulatory requirements in Nigeria and the UK"],
          ],
        },
      },

      knowledgeCheck: {
        multipleChoice: [
          {
            id: "m1-l1-q1",
            question: "What is the primary role of a Business Analyst?",
            options: [
              "To document what stakeholders say and pass it to developers",
              "To enable change by defining needs and recommending solutions that deliver value",
              "To manage the project timeline and budget",
              "To test the product before it goes live",
            ],
            correctIndex: 1,
            explanation:
              "A BA does far more than documentation. The role is about enabling change — understanding what is really needed and helping the organisation get there.",
          },
          {
            id: "m1-l1-q2",
            question: "David raises a concern about transaction data in the first meeting. What is the BA's most useful response?",
            options: [
              "Reassure David the data will be sufficient and move on",
              "Let Amara and David resolve it between themselves",
              "Document the concern as a risk and investigate it during discovery",
              "Tell David to raise it in the next engineering meeting",
            ],
            correctIndex: 2,
            explanation:
              "David's concern is a legitimate project risk. A good BA captures it, investigates it, and brings evidence back to the team rather than ignoring it or passing it along.",
          },
        ],
        scenarioQuestion: {
          id: "m1-l1-s1",
          prompt:
            "It is the end of your first day at Vela. Amara asks you to share your initial thoughts on project scope by Friday. You have spoken to Amara and David but nobody else. What do you do before Friday?",
          options: [
            {
              id: "a",
              text: "Draft a scope document based on what Amara described in the morning meeting",
              feedback:
                "This is a common early mistake. You only have one perspective and it is the most optimistic one. Scoping without broader input almost always means missing critical constraints.",
            },
            {
              id: "b",
              text: "Identify the stakeholders you have not spoken to yet and schedule brief conversations before Friday",
              feedback:
                "Strong instinct. You cannot define scope responsibly with two voices. Priya in compliance, Kofi in sales, and a merchant like Fatima all hold pieces of the picture you do not have yet.",
            },
            {
              id: "c",
              text: "Tell Amara you need more time and push the conversation to the following week",
              feedback:
                "Asking for more time is sometimes right, but the better move is to share what you have learned while being clear about what you still need to find out. Silence is not the same as thoroughness.",
            },
            {
              id: "d",
              text: "Research the Merchant Cash Advance industry and bring market data to Friday",
              feedback:
                "Market research has value but it is secondary at this stage. Your first priority is understanding the internal landscape and the people involved.",
            },
          ],
          bestOptionId: "b",
        },
      },

      challengeConnection: {
        challengeId: "banking-discovery-001",
        text: "This lesson connects to the Banking Discovery challenge. You will face a similar situation — joining a project where the problem is not clearly defined and stakeholders have different versions of the truth.",
      },
    },

    // ─── LESSON 2 ─────────────────────────────────────────────────────────────
    {
      id: "m1-l2",
      number: 2,
      title: "Thinking Like a BA",
      readingTime: "4 minutes",

      whereWeAre:
        "You joined Vela on day one and received your assignment. Amara wants the product built. David already has doubts. You have two weeks to determine whether the idea is viable. Now you need to start thinking like the BA who can answer that question.",

      story: `You find Priya Nair at her standing desk at the end of the open floor. She is the Head of Compliance and she is reading something with the focused expression of someone who has found a problem.

She does not look up when you introduce yourself. She holds up one finger. Finishes reading. Then turns.

"Tell me you have read the FCA Consumer Duty regulations," she says.

You have not.

"And the CBN guidelines on digital lending in Nigeria?"

You have not read those either.

Priya does not seem surprised. She pulls up two documents. "The lending product is not just a technology problem. It is a regulatory problem. Before we talk about features, someone on this project needs to understand what we are legally required to do."

This is your second conversation at Vela and you have already learned something important. The problem Amara described has constraints surrounding it that will shape every requirement you write.

A BA who only listens to the product vision and ignores the compliance reality will produce requirements that cannot be built.

You ask Priya if she has time to walk you through the key regulatory constraints this week.

She looks at you for a moment. Then she says yes.`,

      concept: {
        title: "Three qualities that define how effective BAs think",
        body: `Curiosity means asking why before asking how. When Amara says she wants a lending product, the first BA question is not what the application form should look like. It is why this product, why now, and why Vela specifically. Curiosity drives you below the surface of what people say to what they actually need.

Structure means turning messy conversations into organised information. Every stakeholder gives you fragments. Your job is to piece them into a coherent picture the whole team can work from — through documents, diagrams, and clear decisions that others can read and challenge.

Challenge means respectfully questioning assumptions. When someone says transaction data alone is enough for lending decisions, a BA does not just accept that. They ask what evidence supports it and what happens if it turns out to be wrong. This is not being difficult. It is how bad ideas get caught before they become expensive mistakes.

These three qualities work together. Curiosity finds the questions. Structure organises the answers. Challenge makes sure the answers are actually true.`,
      },

      example: {
        title: "What this looks like at Vela",
        body: `After your conversation with Priya, you do something that becomes a habit throughout the project. You write down every assumption you have heard and mark each one as confirmed, unconfirmed, or at risk.

Amara assumes transaction data is sufficient for lending decisions. Unconfirmed.

David assumes some merchants use multiple platforms and Vela's data is therefore incomplete. Partially confirmed.

Priya assumes FCA Consumer Duty and CBN digital lending guidelines both apply. Likely confirmed — legal review pending.

Amara assumes nine months is enough time to build and launch. Unconfirmed.

That list becomes one of the most useful documents on the project. Every time a decision is based on one of those assumptions, you can point to whether it has been validated or not.

This is not bureaucracy. This is how BAs protect projects from building on sand.`,
      },

      artifact: {
        type: "assumption-log",
        title: "BA Artifact: The Assumption Log",
        description:
          "An assumption log captures beliefs the team is treating as facts until evidence confirms or disproves them. It lives and grows throughout the project.",
        template: {
          headers: ["Assumption", "Made by", "Status", "Risk if wrong"],
          rows: [
            ["Vela transaction data is sufficient to assess creditworthiness", "Amara Osei", "Unconfirmed", "High — lending decisions may be unreliable"],
            ["Some merchants use multiple payment platforms beyond Vela", "David Mensah", "Partially confirmed", "Medium — data completeness strategy needed"],
            ["FCA Consumer Duty applies to UK diaspora lending", "Priya Nair", "Likely confirmed — legal review pending", "High — product may need redesign for UK market"],
            ["Nine month timeline is achievable", "Board", "Unconfirmed", "High — scope may need to be phased"],
          ],
        },
      },

      knowledgeCheck: {
        multipleChoice: [
          {
            id: "m1-l2-q1",
            question: "A stakeholder says a feature will definitely work because it worked at their previous company. What should a BA do?",
            options: [
              "Accept it and include the feature in requirements",
              "Record it as an assumption and identify what evidence would confirm or disprove it",
              "Reject the idea since other companies are different",
              "Escalate to the project manager to decide",
            ],
            correctIndex: 1,
            explanation:
              "Experience from other organisations is valuable input, not confirmed fact. Record it as an assumption and work to validate it in your current context.",
          },
          {
            id: "m1-l2-q2",
            question: "Which of the following best describes the BA mindset?",
            options: [
              "Accepting the product vision and translating it into requirements",
              "Challenging every stakeholder until the perfect solution is found",
              "Balancing curiosity, structure, and respectful challenge to clarify real needs",
              "Documenting decisions made by senior leadership",
            ],
            correctIndex: 2,
            explanation:
              "The BA mindset is not passive documentation and it is not adversarial challenge. It is the combination of all three qualities working together.",
          },
        ],
        scenarioQuestion: {
          id: "m1-l2-s1",
          prompt:
            "Kofi from sales joins your discovery session and says the product needs to approve loans in under 30 seconds because a competitor offers that. Amara agrees immediately and says to add it as a requirement. What do you do?",
          options: [
            {
              id: "a",
              text: "Add a 30 second approval requirement to the document",
              feedback:
                "Moving too fast. A 30 second approval involves credit scoring, fraud checks, and regulatory validation. Whether that is technically achievable has not been established. Adding it unchallenged creates a commitment the team may not be able to keep.",
            },
            {
              id: "b",
              text: "Record the 30 second target as a proposed performance requirement, flag it as unconfirmed, and schedule time with David to assess technical feasibility",
              feedback:
                "This is the right move. You honour the business intent — fast approvals matter — while ensuring the team does not commit to a number engineering has not validated. Document it clearly and create the path to confirmation.",
            },
            {
              id: "c",
              text: "Tell Kofi that competitor analysis is not part of your role",
              feedback:
                "Too dismissive. Understanding what competitors offer is legitimate business context. The issue is that the 30 second figure is being treated as a requirement without any validation.",
            },
            {
              id: "d",
              text: "Ask the team to table the discussion until engineering is involved",
              feedback:
                "Partially right. Engineering input is needed, but you do not need to table everything. Capture the intent now and create the right conversation to validate it.",
            },
          ],
          bestOptionId: "b",
        },
      },

      challengeConnection: {
        challengeId: "saas-uat-001",
        text: "The assumption log becomes critical in the UAT challenge. When something does not work as expected during testing, tracing back to an unvalidated assumption is often where you find the root cause.",
      },
    },

    // ─── LESSON 3 ─────────────────────────────────────────────────────────────
    {
      id: "m1-l3",
      number: 3,
      title: "The People Behind the Problem",
      readingTime: "4 minutes",

      whereWeAre:
        "Three days in. You have a problem statement and an assumption log. Now you need to understand everyone who has a stake in this product — not just the people in the building.",

      story: `On Thursday morning, Kofi Asante calls you before the stand-up.

"I need you to understand something," he says. "The merchants are not going to fill out long forms. They will not upload documents. They will not wait 48 hours. If this product is slower or harder than walking to a microfinance office, we will lose them in the first week."

Kofi has spent three years talking to small business owners across Lagos, Accra, and London. He knows what they will and will not tolerate.

After the call you look at your notes. You have been mapping internal stakeholders. Amara. David. Priya. Kofi. The board. But Kofi just reminded you that the most important stakeholder is not in any of your meetings.

Her name is Fatima Bello. She runs a fabric business in Balogun Market in Lagos. She has been processing payments through Vela for three years. She needs eight hundred thousand naira to buy inventory before the Eid market season. She needs it in days, not weeks.

Fatima will never attend a requirements workshop. She will never read a user story.

But every decision you make about this product will affect her.

A BA who does not think about Fatima is building the wrong thing.`,

      concept: {
        title: "Stakeholders: who they are and why they all matter",
        body: `A stakeholder is anyone affected by the outcome of a project or able to influence it.

That definition is broader than most people expect. It includes the people in the meeting room and the people who will live with the product once it is built.

Experienced BAs think about stakeholders in a few categories. There are the people who will use the product — Fatima and thousands of merchants like her. There are the internal experts who shape decisions — Priya on compliance, David on technology. There are the sponsors with authority and budget — Amara and the board. And there are external parties like regulators who can stop the whole thing from launching.

Identifying stakeholders is only the first step. What matters more is understanding each person's interests, concerns, and level of influence over the project.

A stakeholder map plots this as a simple grid: influence on one axis, interest on the other. People with high influence and high interest need close engagement throughout. People with high interest but lower influence — like Fatima — need to be understood deeply even if they are not in the room. People with high influence but low day-to-day interest — like the board — need to be kept informed at the right moments, not overwhelmed with every detail.

The map is not permanent. Stakeholders shift as the project evolves. Update it at every major milestone.`,
      },

      example: {
        title: "Who matters at Vela and why",
        body: `By the end of week one your stakeholder map looks like this.

Amara sits in high influence, high interest. She owns the product vision and has board backing. Her primary concern is speed to market.

David is also high influence, high interest. He controls engineering capacity and has already raised a technical risk. His concern is building something that works with the data they actually have.

Priya starts at high influence, medium interest. But the moment a regulatory question surfaces she moves to the centre. Her concern is that Vela does not get fined or shut down.

Kofi is medium influence, high interest. He represents the commercial reality and will tell you when a proposed feature will not land with merchants.

Fatima sits outside the building but at the centre of the problem. She cannot influence the project directly but she must influence your thinking. Every requirement you write should be tested against whether it serves someone like her.

James Whitfield from the FCA is high influence, low interest right now. He will not engage until Vela applies for its lending licence. But when he does, he can delay or block the launch entirely.`,
      },

      artifact: {
        type: "stakeholder-map",
        title: "BA Artifact: Stakeholder Map",
        description:
          "A stakeholder map organises everyone with a stake in the project by influence and interest. It guides how the BA communicates with each group throughout the project.",
        template: {
          headers: ["Stakeholder", "Role", "Influence", "Interest", "Primary concern", "Engagement approach"],
          rows: [
            ["Amara Osei", "Chief Product Officer", "High", "High", "Speed to market", "Involve in all key decisions"],
            ["David Mensah", "CTO", "High", "High", "Technical feasibility", "Regular working sessions"],
            ["Priya Nair", "Head of Compliance", "High", "Medium (rising)", "Regulatory risk", "Weekly briefings — escalate immediately on any regulatory flag"],
            ["Kofi Asante", "VP Sales", "Medium", "High", "Merchant usability", "Involve in requirements review and user testing"],
            ["Fatima Bello", "Merchant — end user", "Low", "High", "Fast, simple access to capital", "Research and represent — she must be in the room even when she is not"],
            ["James Whitfield", "FCA Auditor", "High", "Low (for now)", "Regulatory compliance", "Monitor — brief Priya when engagement becomes relevant"],
            ["Vela Board", "Investors and governance", "High", "Low day to day", "ROI and timeline", "Monthly updates at key milestones"],
          ],
        },
      },

      knowledgeCheck: {
        multipleChoice: [
          {
            id: "m1-l3-q1",
            question: "Why is Fatima Bello a stakeholder even though she will never attend a project meeting?",
            options: [
              "She is not a real stakeholder — only internal team members qualify",
              "She is affected by the product outcome and must be understood and represented in requirements",
              "She qualifies only if Vela decides to run formal customer research",
              "End users become stakeholders only after the product launches",
            ],
            correctIndex: 1,
            explanation:
              "A stakeholder is anyone affected by the project outcome. Fatima will use the product and be directly affected by its design. Leaving her out of your thinking is how products get built for the wrong people.",
          },
          {
            id: "m1-l3-q2",
            question: "A stakeholder has high influence but low interest in the project day to day. How should the BA handle them?",
            options: [
              "Exclude them from communication since they are not engaged",
              "Give them the same involvement as high interest stakeholders",
              "Keep them informed at key milestones without overwhelming them with detail",
              "Ask them to increase their interest before including them",
            ],
            correctIndex: 2,
            explanation:
              "High influence stakeholders can significantly affect the project even when they are not closely involved day to day. Keep them informed at the right moments — not ignored, not overloaded.",
          },
        ],
        scenarioQuestion: {
          id: "m1-l3-s1",
          prompt:
            "You discover that Vela's customer support team will handle merchant queries about the lending product after launch. They were not on the stakeholder list. What do you do?",
          options: [
            {
              id: "a",
              text: "Add them to the stakeholder map and schedule a conversation to understand their operational concerns",
              feedback:
                "Exactly right. Customer support will live with this product every day after launch. Their concerns about query volume, escalation paths, and system access are legitimate requirements inputs. Adding them now prevents pain later.",
            },
            {
              id: "b",
              text: "Inform the project manager and leave it for them to decide",
              feedback:
                "Stakeholder identification is a core BA responsibility. You do not need to wait. Flagging it and updating the map yourself is the right move.",
            },
            {
              id: "c",
              text: "Note it as a post-launch concern and keep focus on pre-launch needs",
              feedback:
                "This creates problems. If support requirements are not captured before build, the product may launch without the tools, documentation, or training the team needs. Those are pre-launch requirements.",
            },
            {
              id: "d",
              text: "Ask Amara whether customer support should be involved",
              feedback:
                "Not wrong to raise it, but you already know the answer. Customer support is a stakeholder. Add them and engage them. You do not need permission to do the core work of your role.",
            },
          ],
          bestOptionId: "a",
        },
      },

      challengeConnection: {
        challengeId: "saas-facilitation-001",
        text: "Stakeholder mapping becomes essential in the Facilitation challenge. You will run a session with multiple competing interests and your preparation beforehand will determine whether the room produces decisions or deadlock.",
      },
    },

    // ─── LESSON 4 ─────────────────────────────────────────────────────────────
    {
      id: "m1-l4",
      number: 4,
      title: "The Business Case for Analysis",
      readingTime: "3 minutes",

      whereWeAre:
        "End of week one at Vela. You have a problem statement, an assumption log, and a stakeholder map. Today you present your initial findings. But first — why does any of this structured analysis actually matter?",

      story: `The night before your first presentation you find James Whitfield's email address in a regulatory filing Priya forwarded. On impulse you send him a short message. You introduce yourself as the BA on Vela's lending project and ask if he would be willing to answer two questions about what the FCA expects from data-driven lending products.

He replies in eleven minutes.

"Happy to speak. Most companies contact us after they have already built something we cannot approve. Refreshing to hear from someone at the beginning."

You sit with that sentence for a while.

Most companies contact us after they have already built something we cannot approve.

That is what happens when analysis is skipped. Teams build fast. They make assumptions. They treat opinions as facts. Nine months later they show a regulator something that cannot be approved. They either rebuild from scratch or they shut the product down.

The next morning you walk into the presentation room with three documents. A problem statement. An assumption log with seven unconfirmed items. A stakeholder map that includes a name most people in the room have never heard.

Priya sees James Whitfield's name and sits up straighter.

"You contacted the FCA already?"

"I sent an introductory email," you say. "He is willing to speak with us."

Amara looks at David. David reads the assumption log slowly.

"Some of these are things I have been thinking about for weeks," he says quietly. "Nobody wrote them down before."

That is the value of business analysis. Not the documents. The thinking that produces them.`,

      concept: {
        title: "Why analysis matters — and what it costs to skip it",
        body: `Research into software project failures consistently finds the same culprit: requirements problems. Unclear requirements. Incomplete requirements. Requirements that changed with no managed process for handling the change.

Business analysis addresses all three of those failure modes directly.

There is a principle called the cost of change curve. The earlier you find a problem, the cheaper it is to fix. A requirement that is wrong during discovery costs almost nothing to change. The same requirement wrong after six months of engineering costs months of rework. A product that reaches a regulator without meeting legal requirements may cost the organisation the ability to launch at all.

The modern BA role has also expanded significantly. Agile teams need BAs who work in short sprints and adapt requirements quickly. AI tools now assist with drafting requirements, mapping stakeholders, and modeling processes. Product discovery practices ask BAs to validate whether a problem is even worth solving before any solution is designed.

What has not changed is the core responsibility: understand the problem clearly before committing to a solution.

At Vela, that principle just led you to contact a regulator before engineering wrote a single line of code. That eleven-minute reply may save the company six months of work.`,
      },

      example: {
        title: "What you actually delivered in week one",
        body: `Before you joined, the Vela project had momentum and enthusiasm. It also had seven unconfirmed assumptions, a regulatory risk nobody had formally identified, and no written definition of the problem the team was trying to solve.

In five days you produced a problem statement that gave the team shared language. An assumption log that made invisible risks visible. A stakeholder map that surfaced James Whitfield before he became a blocker. And an FCA contact that no one else had thought to make.

None of that required a technical skill. It required curiosity, structure, and the confidence to ask questions that felt obvious but had not been asked yet.

That is the foundation. Everything else — requirements writing, process modeling, user stories — is built on top of it.

If the foundation is weak, none of the techniques will save the project.`,
      },

      artifact: {
        type: "discovery-summary",
        title: "BA Artifact: Week One Discovery Summary",
        description:
          "At the end of a discovery sprint, the BA produces a summary of what was learned, what is confirmed, and what still needs investigation. This is the first contribution to the Vela Lending Blueprint.",
        template: {
          headers: ["Area", "Finding", "Status", "Next step"],
          rows: [
            ["Business problem", "Small merchants cannot access fast working capital without traditional bank documentation", "Confirmed", "Validate with merchant research"],
            ["Technical risk", "Vela transaction data may not represent full merchant revenue due to multi-platform usage", "Unconfirmed", "David's team to run data completeness analysis"],
            ["Regulatory risk — Nigeria", "CBN digital lending guidelines require specific disclosures and interest rate caps", "Identified — details pending", "Priya to brief legal team this week"],
            ["Regulatory risk — UK", "FCA Consumer Duty may apply to UK diaspora lending", "Identified — FCA contact made", "Schedule call with James Whitfield"],
            ["Timeline", "Board expects launch in 9 months — no feasibility assessment done", "At risk", "Scope phasing discussion needed with Amara"],
            ["End user voice", "No direct merchant input gathered yet", "Gap", "Schedule conversations with 3 to 5 merchants in Lagos"],
          ],
        },
      },

      knowledgeCheck: {
        multipleChoice: [
          {
            id: "m1-l4-q1",
            question: "What does the cost of change curve tell us about when to do business analysis?",
            options: [
              "Analysis is most valuable at the end of a project when everything is clear",
              "Finding and fixing problems early costs significantly less than finding them late",
              "The cost of analysis always exceeds the cost of building and iterating",
              "Change costs are roughly equal at all project stages",
            ],
            correctIndex: 1,
            explanation:
              "Problems found during discovery cost a fraction of what they cost to fix after build. This is one of the strongest economic arguments for investing in analysis upfront.",
          },
          {
            id: "m1-l4-q2",
            question: "How has the modern BA role changed compared to traditional approaches?",
            options: [
              "BAs now only write requirements and hand them to developers",
              "BAs now manage project timelines instead of requirements",
              "BAs now work across Agile sprints, use AI tools, and contribute to product discovery alongside traditional analysis",
              "BAs are no longer needed because AI handles requirements automatically",
            ],
            correctIndex: 2,
            explanation:
              "The BA role has expanded significantly. Agile collaboration, AI-assisted analysis, and product discovery are all now part of the toolkit. The core responsibility — understand the problem before committing to a solution — has not changed.",
          },
        ],
        scenarioQuestion: {
          id: "m1-l4-s1",
          prompt:
            "Amara reviews your week one summary and says the regulatory risks feel like overthinking. She wants to move straight into requirements next week. David is in the meeting and stays quiet. What do you do?",
          options: [
            {
              id: "a",
              text: "Agree with Amara and start requirements as requested",
              feedback:
                "Moving to requirements without resolving the regulatory risks means building on unvalidated assumptions. If the FCA call reveals something that changes the product architecture, you will be rewriting requirements you have not finished yet.",
            },
            {
              id: "b",
              text: "Escalate to the board to override Amara's decision",
              feedback:
                "Escalating to the board at this stage is premature and would damage your relationship with Amara. There is a more direct path.",
            },
            {
              id: "c",
              text: "Acknowledge Amara's urgency, propose running requirements in parallel for non-regulatory features while the FCA call happens this week, and put the risk formally on record",
              feedback:
                "This is the right move. You do not block progress — you protect the project. Running both tracks keeps momentum while ensuring the regulatory risk gets answered before it shapes requirements. Putting the risk on record means the decision was made with full information, whatever happens next.",
            },
            {
              id: "d",
              text: "Ask David to back your position before responding to Amara",
              feedback:
                "Seeking allies before making your case is a political move that rarely lands well. Make your case directly with evidence. David may well agree once he hears the argument.",
            },
          ],
          bestOptionId: "c",
        },
      },

      challengeConnection: {
        challengeId: "banking-discovery-001",
        text: "The discovery discipline from this module is exactly what the Banking Discovery challenge tests. You will separate what stakeholders want from what the organisation actually needs, and produce a clear problem definition under pressure.",
      },
    },
  ],
};

export type Module = typeof module1;
export type Lesson = typeof module1.lessons[0];