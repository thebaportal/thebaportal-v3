"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, ChevronRight, ChevronLeft, Check,
  LayoutDashboard, TrendingUp, Target, GraduationCap,
  BriefcaseBusiness, Trophy, Lock, ArrowLeft,
  Clock, Zap,
} from "lucide-react";

interface Option { id: string; text: string; feedback: string; }
interface MCQ { id: string; question: string; options: string[]; correctIndex: number; explanation: string; }
interface ScenarioQ { id: string; prompt: string; options: Option[]; bestOptionId: string; }
interface Artifact { type: string; title: string; description: string; template: { headers: string[]; rows: string[][] }; }
interface KnowledgeCheck { multipleChoice: MCQ[]; scenarioQuestion: ScenarioQ; }
interface Lesson {
  id: string; number: number; title: string; readingTime: string;
  whereWeAre: string | null; story: string;
  concept: { title: string; body: string };
  example: { title: string; body: string };
  artifact: Artifact;
  knowledgeCheck: KnowledgeCheck;
  challengeConnection: { challengeId: string; text: string };
}
interface Module {
  id: string; number: number; title: string; subtitle: string;
  description: string; duration: string; sdlcPhase: string; tier: string;
  badgeOnCompletion: { id: string; name: string; icon: string; color: string };
  lessons: Lesson[];
}
interface Badge { badgeId: string; name: string; icon: string; }

const MODULES: Module[] = [
  {
    id: "module-1", number: 1, title: "BA Foundations",
    subtitle: "Understanding the role before picking up the tools",
    description: "You just joined Vela. Nobody agrees on what the product is. Your job is to figure out what problem they are actually solving before anyone writes a single requirement.",
    duration: "55 to 70 minutes", sdlcPhase: "Month 1 — Discovery", tier: "free",
    badgeOnCompletion: { id: "ba-foundations", name: "BA Foundations", icon: "🎯", color: "#1fbf9f" },
    lessons: [
      {
        id: "m1-l1", number: 1, title: "Welcome to Vela", readingTime: "3 minutes", whereWeAre: null,
        story: `It is Monday morning in Lagos and you are sitting in a glass-walled meeting room on the fourteenth floor. The city moves below you. Traffic. Heat. Noise.\n\nAmara Osei walks in holding two coffees and a printed slide deck. She is the Chief Product Officer and she has the energy of someone who has not slept much but does not mind.\n\nShe slides a coffee toward you and opens with three words.\n\n"We are lending now."\n\nVela processes mobile payments for small businesses across West Africa and the UK diaspora community. Two million transactions a month. Series B funded. The board wants a Merchant Cash Advance product live in nine months. Small business owners would receive instant working capital loans based on their transaction history. No bank statements. No long applications. Just data and a decision.\n\nIt sounds clean. It is not.\n\nBefore Amara finishes her sentence, David Mensah appears in the doorway. He is the CTO and he has the expression of someone who has already identified three problems with whatever is being said.\n\n"Transaction data alone does not tell the full story," he says. "Some of our merchants use three other payment apps. We are only seeing part of their revenue picture."\n\nAmara waves her hand. "That is why we have a Business Analyst."\n\nBoth of them look at you.\n\nThis is your first hour at Vela. You have two weeks to find out whether this product is viable before engineering spends a single dollar.`,
        concept: { title: "What does a Business Analyst actually do?", body: `A Business Analyst is the person who figures out the real problem before anyone starts building the solution.\n\nThat sounds simple. In practice it is one of the hardest things to do in any organisation, because most people arrive at meetings already talking about solutions. They want features. They want screens. They want to build things. Your job is to slow that down just enough to ask a better question.\n\nThe BA sits at the intersection of three things: what the business needs, what technology can realistically deliver, and what real people will actually use. Your job is to understand all three and find the space where they overlap.\n\nAt Vela right now, Amara represents the business ambition. David represents the technical reality. And somewhere out in Lagos, a merchant named Fatima Bello represents the human truth this product has to serve.\n\nYou have not met Fatima yet. But every decision you make will affect her.` },
        example: { title: "The first thing a BA does", body: `After that first meeting, you do not open a requirements template. You do not start drawing diagrams.\n\nYou write three questions on a notepad.\n\nWhat problem are we actually solving? For whom? And how will we know when we have solved it?\n\nThose three questions are the foundation of everything. Before stakeholder maps, before user stories, before process diagrams — you need to be clear on what sits at the centre of this project.\n\nAt Vela, the problem is this: small business owners cannot access fast, affordable working capital because traditional banks require documentation that informal businesses cannot easily produce.\n\nThat is real. Fatima has lived it. Thousands of merchants like her have lived it. The question is whether Vela can solve it safely, legally, and within nine months.\n\nThat is your assignment.` },
        artifact: {
          type: "problem-statement", title: "BA Artifact: The Problem Statement",
          description: "A problem statement gives the whole team shared language so everyone is solving the same problem.",
          template: { headers: ["Element", "Vela Example"], rows: [["The problem of", "Small business owners on the Vela platform cannot access fast working capital"], ["Affects", "Merchants across West Africa and the UK diaspora community"], ["The impact is", "Missed opportunities, reliance on expensive informal credit, and lost revenue for Vela"], ["A successful solution would", "Offer instant advances based on Vela transaction history, within regulatory requirements in Nigeria and the UK"]] },
        },
        knowledgeCheck: {
          multipleChoice: [
            { id: "m1-l1-q1", question: "What is the primary role of a Business Analyst?", options: ["To document what stakeholders say and pass it to developers", "To enable change by defining needs and recommending solutions that deliver value", "To manage the project timeline and budget", "To test the product before it goes live"], correctIndex: 1, explanation: "A BA does far more than documentation. The role is about enabling change — understanding what is really needed and helping the organisation get there." },
            { id: "m1-l1-q2", question: "David raises a concern about transaction data in the first meeting. What is the BA's most useful response?", options: ["Reassure David the data will be sufficient and move on", "Let Amara and David resolve it between themselves", "Document the concern as a risk and investigate it during discovery", "Tell David to raise it in the next engineering meeting"], correctIndex: 2, explanation: "David's concern is a legitimate project risk. A good BA captures it, investigates it, and brings evidence back to the team." },
          ],
          scenarioQuestion: {
            id: "m1-l1-s1", prompt: "End of your first day at Vela. Amara asks you to share initial thoughts on project scope by Friday. You have spoken to Amara and David but nobody else. What do you do before Friday?",
            options: [
              { id: "a", text: "Draft a scope document based on what Amara described in the morning meeting", feedback: "This is a common early mistake. You only have one perspective and it is the most optimistic one. Scoping without broader input almost always means missing critical constraints." },
              { id: "b", text: "Identify the stakeholders you have not spoken to yet and schedule brief conversations before Friday", feedback: "Strong instinct. You cannot define scope responsibly with two voices. Priya in compliance, Kofi in sales, and a merchant like Fatima all hold pieces of the picture you do not have yet." },
              { id: "c", text: "Tell Amara you need more time and push the conversation to the following week", feedback: "Asking for more time is sometimes right, but the better move is to share what you have learned while being clear about what you still need to find out." },
              { id: "d", text: "Research the Merchant Cash Advance industry and bring market data to Friday", feedback: "Market research has value but it is secondary at this stage. Your first priority is understanding the internal landscape and the people involved." },
            ], bestOptionId: "b",
          },
        },
        challengeConnection: { challengeId: "banking-discovery-001", text: "This lesson connects to the Banking Discovery challenge. You will face a similar situation — joining a project where the problem is not clearly defined and stakeholders have different versions of the truth." },
      },
      {
        id: "m1-l2", number: 2, title: "Thinking Like a BA", readingTime: "4 minutes",
        whereWeAre: "You joined Vela on day one and received your assignment. Amara wants the product built. David already has doubts. You have two weeks to determine whether the idea is viable. Now you need to start thinking like the BA who can answer that question.",
        story: `You find Priya Nair at her standing desk at the end of the open floor. She is the Head of Compliance and she is reading something with the focused expression of someone who has found a problem.\n\nShe does not look up when you introduce yourself. She holds up one finger. Finishes reading. Then turns.\n\n"Tell me you have read the FCA Consumer Duty regulations," she says.\n\nYou have not.\n\n"And the CBN guidelines on digital lending in Nigeria?"\n\nYou have not read those either.\n\nPriya does not seem surprised. She pulls up two documents. "The lending product is not just a technology problem. It is a regulatory problem. Before we talk about features, someone on this project needs to understand what we are legally required to do."\n\nThis is your second conversation at Vela and you have already learned something important. The problem Amara described has constraints surrounding it that will shape every requirement you write.\n\nA BA who only listens to the product vision and ignores the compliance reality will produce requirements that cannot be built.\n\nYou ask Priya if she has time to walk you through the key regulatory constraints this week.\n\nShe looks at you for a moment. Then she says yes.`,
        concept: { title: "Three qualities that define how effective BAs think", body: `Curiosity means asking why before asking how. When Amara says she wants a lending product, the first BA question is not what the application form should look like. It is why this product, why now, and why Vela specifically. Curiosity drives you below the surface of what people say to what they actually need.\n\nStructure means turning messy conversations into organised information. Every stakeholder gives you fragments. Your job is to piece them into a coherent picture the whole team can work from — through documents, diagrams, and clear decisions that others can read and challenge.\n\nChallenge means respectfully questioning assumptions. When someone says transaction data alone is enough for lending decisions, a BA does not just accept that. They ask what evidence supports it and what happens if it turns out to be wrong. This is not being difficult. It is how bad ideas get caught before they become expensive mistakes.\n\nThese three qualities work together. Curiosity finds the questions. Structure organises the answers. Challenge makes sure the answers are actually true.` },
        example: { title: "What this looks like at Vela", body: `After your conversation with Priya, you do something that becomes a habit throughout the project. You write down every assumption you have heard and mark each one as confirmed, unconfirmed, or at risk.\n\nAmara assumes transaction data is sufficient for lending decisions. Unconfirmed.\n\nDavid assumes some merchants use multiple platforms and Vela's data is therefore incomplete. Partially confirmed.\n\nPriya assumes FCA Consumer Duty and CBN digital lending guidelines both apply. Likely confirmed — legal review pending.\n\nAmara assumes nine months is enough time to build and launch. Unconfirmed.\n\nThat list becomes one of the most useful documents on the project. Every time a decision is based on one of those assumptions, you can point to whether it has been validated or not.\n\nThis is not bureaucracy. This is how BAs protect projects from building on sand.` },
        artifact: {
          type: "assumption-log", title: "BA Artifact: The Assumption Log",
          description: "An assumption log captures beliefs the team is treating as facts until evidence confirms or disproves them. It lives and grows throughout the project.",
          template: { headers: ["Assumption", "Made by", "Status", "Risk if wrong"], rows: [["Vela transaction data is sufficient to assess creditworthiness", "Amara Osei", "Unconfirmed", "High — lending decisions may be unreliable"], ["Some merchants use multiple payment platforms beyond Vela", "David Mensah", "Partially confirmed", "Medium — data completeness strategy needed"], ["FCA Consumer Duty applies to UK diaspora lending", "Priya Nair", "Likely confirmed — legal review pending", "High — product may need redesign for UK market"], ["Nine month timeline is achievable", "Board", "Unconfirmed", "High — scope may need to be phased"]] },
        },
        knowledgeCheck: {
          multipleChoice: [
            { id: "m1-l2-q1", question: "A stakeholder says a feature will definitely work because it worked at their previous company. What should a BA do?", options: ["Accept it and include the feature in requirements", "Record it as an assumption and identify what evidence would confirm or disprove it", "Reject the idea since other companies are different", "Escalate to the project manager to decide"], correctIndex: 1, explanation: "Experience from other organisations is valuable input, not confirmed fact. Record it as an assumption and work to validate it in your current context." },
            { id: "m1-l2-q2", question: "Which of the following best describes the BA mindset?", options: ["Accepting the product vision and translating it into requirements", "Challenging every stakeholder until the perfect solution is found", "Balancing curiosity, structure, and respectful challenge to clarify real needs", "Documenting decisions made by senior leadership"], correctIndex: 2, explanation: "The BA mindset is not passive documentation and it is not adversarial challenge. It is the combination of all three qualities working together." },
          ],
          scenarioQuestion: {
            id: "m1-l2-s1", prompt: "Kofi from sales joins your discovery session and says the product needs to approve loans in under 30 seconds because a competitor offers that. Amara agrees immediately and says to add it as a requirement. What do you do?",
            options: [
              { id: "a", text: "Add a 30 second approval requirement to the document", feedback: "Moving too fast. A 30 second approval involves credit scoring, fraud checks, and regulatory validation. Adding it unchallenged creates a commitment the team may not be able to keep." },
              { id: "b", text: "Record the 30 second target as a proposed performance requirement, flag it as unconfirmed, and schedule time with David to assess technical feasibility", feedback: "This is the right move. You honour the business intent while ensuring the team does not commit to a number engineering has not validated." },
              { id: "c", text: "Tell Kofi that competitor analysis is not part of your role", feedback: "Too dismissive. Understanding what competitors offer is legitimate business context. The issue is that the figure is being treated as a requirement without validation." },
              { id: "d", text: "Ask the team to table the discussion until engineering is involved", feedback: "Partially right but you do not need to table everything. Capture the intent now and create the right conversation to validate it." },
            ], bestOptionId: "b",
          },
        },
        challengeConnection: { challengeId: "saas-uat-001", text: "The assumption log becomes critical in the UAT challenge. When something does not work as expected during testing, tracing back to an unvalidated assumption is often where you find the root cause." },
      },
      {
        id: "m1-l3", number: 3, title: "The People Behind the Problem", readingTime: "4 minutes",
        whereWeAre: "Three days in. You have a problem statement and an assumption log. Now you need to understand everyone who has a stake in this product — not just the people in the building.",
        story: `On Thursday morning, Kofi Asante calls you before the stand-up.\n\n"I need you to understand something," he says. "The merchants are not going to fill out long forms. They will not upload documents. They will not wait 48 hours. If this product is slower or harder than walking to a microfinance office, we will lose them in the first week."\n\nKofi has spent three years talking to small business owners across Lagos, Accra, and London. He knows what they will and will not tolerate.\n\nAfter the call you look at your notes. You have been mapping internal stakeholders. Amara. David. Priya. Kofi. The board. But Kofi just reminded you that the most important stakeholder is not in any of your meetings.\n\nHer name is Fatima Bello. She runs a fabric business in Balogun Market in Lagos. She has been processing payments through Vela for three years. She needs eight hundred thousand naira to buy inventory before the Eid market season. She needs it in days, not weeks.\n\nFatima will never attend a requirements workshop. She will never read a user story.\n\nBut every decision you make about this product will affect her.\n\nA BA who does not think about Fatima is building the wrong thing.`,
        concept: { title: "Stakeholders: who they are and why they all matter", body: `A stakeholder is anyone affected by the outcome of a project or able to influence it.\n\nThat definition is broader than most people expect. It includes the people in the meeting room and the people who will live with the product once it is built.\n\nExperienced BAs think about stakeholders in a few categories. There are the people who will use the product — Fatima and thousands of merchants like her. There are internal experts who shape decisions — Priya on compliance, David on technology. There are sponsors with authority and budget — Amara and the board. And there are external parties like regulators who can stop the whole thing from launching.\n\nA stakeholder map plots this as a simple grid: influence on one axis, interest on the other. High influence and high interest means close engagement throughout. High interest but lower influence means understanding them deeply even when they are not in the room. High influence but low day to day interest means informing them at the right moments without overloading them.\n\nUpdate the map at every major milestone. Stakeholders shift as the project evolves.` },
        example: { title: "Who matters at Vela and why", body: `By the end of week one your stakeholder map looks like this.\n\nAmara is high influence, high interest. She owns the product vision and has board backing. Her primary concern is speed to market.\n\nDavid is also high influence, high interest. He controls engineering capacity and has already raised a technical risk. His concern is building something that works with the data they actually have.\n\nPriya starts at high influence, medium interest. The moment a regulatory question surfaces she moves to the centre. Her concern is that Vela does not get fined or shut down.\n\nKofi is medium influence, high interest. He represents the commercial reality and will tell you when a proposed feature will not land with merchants.\n\nFatima sits outside the building but at the centre of the problem. She cannot influence the project directly but she must influence your thinking. Every requirement should be tested against whether it serves someone like her.\n\nJames Whitfield from the FCA is high influence, low interest right now. He will not engage until Vela applies for its lending licence. But when he does, he can delay or block the launch entirely.` },
        artifact: {
          type: "stakeholder-map", title: "BA Artifact: Stakeholder Map",
          description: "A stakeholder map organises everyone with a stake in the project by influence and interest. It guides how the BA communicates with each group throughout the project.",
          template: { headers: ["Stakeholder", "Role", "Influence", "Interest", "Primary concern", "Engagement approach"], rows: [["Amara Osei", "Chief Product Officer", "High", "High", "Speed to market", "Involve in all key decisions"], ["David Mensah", "CTO", "High", "High", "Technical feasibility", "Regular working sessions"], ["Priya Nair", "Head of Compliance", "High", "Medium (rising)", "Regulatory risk", "Weekly briefings — escalate immediately on any flag"], ["Kofi Asante", "VP Sales", "Medium", "High", "Merchant usability", "Involve in requirements review and user testing"], ["Fatima Bello", "Merchant — end user", "Low", "High", "Fast, simple access to capital", "Research and represent — keep her in the room even when she is not"], ["James Whitfield", "FCA Auditor", "High", "Low (for now)", "Regulatory compliance", "Monitor — brief Priya when engagement becomes relevant"], ["Vela Board", "Investors and governance", "High", "Low day to day", "ROI and timeline", "Monthly updates at key milestones"]] },
        },
        knowledgeCheck: {
          multipleChoice: [
            { id: "m1-l3-q1", question: "Why is Fatima Bello a stakeholder even though she will never attend a project meeting?", options: ["She is not a real stakeholder — only internal team members qualify", "She is affected by the product outcome and must be understood and represented in requirements", "She qualifies only if Vela decides to run formal customer research", "End users become stakeholders only after the product launches"], correctIndex: 1, explanation: "A stakeholder is anyone affected by the project outcome. Fatima will use the product and be directly affected by its design. Leaving her out of your thinking is how products get built for the wrong people." },
            { id: "m1-l3-q2", question: "A stakeholder has high influence but low interest day to day. How should the BA handle them?", options: ["Exclude them since they are not engaged", "Give them the same involvement as high interest stakeholders", "Keep them informed at key milestones without overwhelming them with detail", "Ask them to increase their interest before including them"], correctIndex: 2, explanation: "High influence stakeholders can significantly affect the project even when not closely involved. Keep them informed at the right moments — not ignored, not overloaded." },
          ],
          scenarioQuestion: {
            id: "m1-l3-s1", prompt: "You discover that Vela's customer support team will handle merchant queries about the lending product after launch. They were not on the stakeholder list. What do you do?",
            options: [
              { id: "a", text: "Add them to the stakeholder map and schedule a conversation to understand their operational concerns", feedback: "Exactly right. Customer support will live with this product every day. Their concerns about query volume, escalation paths, and system access are legitimate requirements inputs. Adding them now prevents pain later." },
              { id: "b", text: "Inform the project manager and leave it for them to decide", feedback: "Stakeholder identification is a core BA responsibility. You do not need to wait. Update the map and engage them yourself." },
              { id: "c", text: "Note it as a post-launch concern", feedback: "This creates problems. If support requirements are not captured before build, the product may launch without the tools or training the team needs. Those are pre-launch requirements." },
              { id: "d", text: "Ask Amara whether customer support should be involved", feedback: "Not wrong to mention it, but you already know the answer. Add them and engage them. You do not need permission to do the core work of your role." },
            ], bestOptionId: "a",
          },
        },
        challengeConnection: { challengeId: "saas-facilitation-001", text: "Stakeholder mapping becomes essential in the Facilitation challenge. You will run a session with multiple competing interests and your preparation beforehand will determine whether the room produces decisions or deadlock." },
      },
      {
        id: "m1-l4", number: 4, title: "The Business Case for Analysis", readingTime: "3 minutes",
        whereWeAre: "End of week one at Vela. You have a problem statement, an assumption log, and a stakeholder map. Today you present your initial findings. But first — why does any of this structured thinking actually matter?",
        story: `The night before your first presentation you find James Whitfield's email address in a regulatory filing Priya forwarded. On impulse you send him a short message. You introduce yourself as the BA on Vela's lending project and ask whether he would be willing to answer two questions about what the FCA expects from data-driven lending products.\n\nHe replies in eleven minutes.\n\n"Happy to speak. Most companies contact us after they have already built something we cannot approve. Refreshing to hear from someone at the beginning."\n\nYou sit with that sentence for a while.\n\nMost companies contact us after they have already built something we cannot approve.\n\nThat is what happens when analysis is skipped. Teams build fast. They make assumptions. They treat opinions as facts. Nine months later they show a regulator something that cannot be approved. They rebuild from scratch or they shut the product down.\n\nThe next morning you walk into the presentation room with three documents. A problem statement. An assumption log with seven unconfirmed items. A stakeholder map that includes a name most people in the room have never heard.\n\nPriya sees James Whitfield's name and sits up straighter.\n\n"You contacted the FCA already?"\n\n"I sent an introductory email. He is willing to speak with us."\n\nAmara looks at David. David reads the assumption log slowly.\n\n"Some of these are things I have been thinking about for weeks," he says quietly. "Nobody wrote them down before."\n\nThat is the value of business analysis. Not the documents. The thinking that produces them.`,
        concept: { title: "Why analysis matters — and what it costs to skip it", body: `Research into software project failures consistently finds the same culprit: requirements problems. Unclear requirements. Incomplete requirements. Requirements that changed with no managed process for handling the change.\n\nBusiness analysis addresses all three directly.\n\nThere is a principle called the cost of change curve. The earlier you find a problem, the cheaper it is to fix. A wrong requirement during discovery costs almost nothing to change. The same requirement wrong after six months of engineering costs months of rework. A product that reaches a regulator without meeting legal requirements may cost the organisation the ability to launch at all.\n\nThe modern BA role has also expanded. Agile teams need BAs who work in short sprints and adapt quickly. AI tools now assist with drafting requirements and mapping stakeholders. Product discovery practices ask BAs to validate whether a problem is worth solving before any solution is designed.\n\nWhat has not changed is the core responsibility: understand the problem clearly before committing to a solution.` },
        example: { title: "What you actually delivered in week one", body: `Before you joined, the Vela project had momentum and enthusiasm. It also had seven unconfirmed assumptions, a regulatory risk nobody had formally identified, and no written definition of the problem the team was solving.\n\nIn five days you produced a problem statement that gave the team shared language. An assumption log that made invisible risks visible. A stakeholder map that surfaced James Whitfield before he became a blocker. And an FCA contact nobody else had thought to make.\n\nNone of that required a technical skill. It required curiosity, structure, and the confidence to ask questions that felt obvious but had not been asked.\n\nThat is the foundation. Everything else — requirements writing, process modeling, user stories — is built on top of it. If the foundation is weak, none of the techniques will save the project.` },
        artifact: {
          type: "discovery-summary", title: "BA Artifact: Week One Discovery Summary",
          description: "The first contribution to the Vela Lending Blueprint. A summary of what was learned, what is confirmed, and what still needs investigation.",
          template: { headers: ["Area", "Finding", "Status", "Next step"], rows: [["Business problem", "Small merchants cannot access fast working capital without traditional bank documentation", "Confirmed", "Validate with merchant research"], ["Technical risk", "Vela transaction data may not represent full merchant revenue due to multi-platform usage", "Unconfirmed", "David's team to run data completeness analysis"], ["Regulatory risk — Nigeria", "CBN digital lending guidelines require specific disclosures and interest rate caps", "Identified — details pending", "Priya to brief legal team this week"], ["Regulatory risk — UK", "FCA Consumer Duty may apply to UK diaspora lending", "Identified — FCA contact made", "Schedule call with James Whitfield"], ["Timeline", "Board expects launch in 9 months — no feasibility assessment done", "At risk", "Scope phasing discussion needed with Amara"], ["End user voice", "No direct merchant input gathered yet", "Gap", "Schedule conversations with 3 to 5 merchants in Lagos"]] },
        },
        knowledgeCheck: {
          multipleChoice: [
            { id: "m1-l4-q1", question: "What does the cost of change curve tell us about when to do business analysis?", options: ["Analysis is most valuable at the end of a project", "Finding and fixing problems early costs significantly less than finding them late", "The cost of analysis always exceeds the cost of building and iterating", "Change costs are roughly equal at all project stages"], correctIndex: 1, explanation: "Problems found during discovery cost a fraction of what they cost to fix after build. This is one of the strongest arguments for investing in analysis upfront." },
            { id: "m1-l4-q2", question: "How has the modern BA role changed?", options: ["BAs now only write requirements and hand them to developers", "BAs now manage timelines instead of requirements", "BAs work across Agile sprints, use AI tools, and contribute to product discovery alongside traditional analysis", "BAs are no longer needed because AI handles requirements automatically"], correctIndex: 2, explanation: "The BA role has expanded significantly. Agile, AI tools, and product discovery are all part of the modern toolkit. The core responsibility has not changed: understand the problem before committing to a solution." },
          ],
          scenarioQuestion: {
            id: "m1-l4-s1", prompt: "Amara reviews your week one summary and says the regulatory risks feel like overthinking. She wants to move straight into requirements next week. David stays quiet. What do you do?",
            options: [
              { id: "a", text: "Agree with Amara and start requirements as requested", feedback: "Moving to requirements without resolving the regulatory risks means building on unvalidated assumptions. If the FCA call reveals something that changes the product architecture, you will be rewriting requirements you have not finished yet." },
              { id: "b", text: "Escalate to the board to override Amara", feedback: "Escalating to the board at this stage is premature and would damage your relationship with Amara. There is a more direct path." },
              { id: "c", text: "Acknowledge Amara's urgency, propose running requirements in parallel for non-regulatory features while the FCA call happens this week, and put the risk formally on record", feedback: "This is the right move. You do not block progress — you protect the project. Running both tracks keeps momentum while ensuring the regulatory risk gets answered before it shapes requirements." },
              { id: "d", text: "Ask David to back your position before responding to Amara", feedback: "Seeking allies before making your case rarely lands well. Make your case directly with evidence." },
            ], bestOptionId: "c",
          },
        },
        challengeConnection: { challengeId: "banking-discovery-001", text: "The discovery discipline from this module is exactly what the Banking Discovery challenge tests. You will separate what stakeholders want from what the organisation actually needs, and produce a clear problem definition under pressure." },
      },
    ],
  },
  {
    id: "module-2", number: 2, title: "Planning & Stakeholder Strategy",
    subtitle: "Map the battlefield before the meetings start",
    description: "Month 2. Amara wants everything. David wants nothing changed. Priya wants compliance first. You build a BA plan that holds the project together.",
    duration: "60 to 75 minutes", sdlcPhase: "Month 2 — Planning", tier: "pro",
    badgeOnCompletion: { id: "ba-planner", name: "Strategic Planner", icon: "🗺️", color: "#a78bfa" },
    lessons: [
      {
        id: "m2-l1", number: 1, title: "Building the BA Plan", readingTime: "4 minutes",
        whereWeAre: "Week one is done. You surfaced seven unconfirmed assumptions, made contact with the FCA, and gave Amara a discovery summary she did not expect. Now she wants a plan for the next eight weeks. Not a project plan. A BA plan. Nobody on this team has written one before.",
        story: `Amara sends you a calendar invite at 7:43 on Monday morning. The subject line is: BA Planning Session — Come with something.\n\nYou arrive to find David already at the table. He has a whiteboard behind him with what looks like an architecture sketch. Kofi joins by video from Accra. Priya is at her desk but has her chair turned toward the room.\n\nAmara opens immediately. "I need to know what you are going to produce and when. The board wants a requirements document by end of month six. Engineering starts scoping in month three. What are you doing between now and then?"\n\nThis is the question you prepared for.\n\nA BA plan is not a list of tasks. It is a document that explains how analysis will happen on this specific project — what methods you will use, what you will produce, who needs to review it, and what risks could derail the whole thing.\n\nYou open your laptop and walk Amara through a one-page outline.\n\nDavid stops you at slide two. "Why are you spending three weeks on stakeholder interviews? We already know what people want."\n\n"We know what three people want," you say. "We have not spoken to a single merchant."\n\nDavid is quiet for a moment.\n\nPriya speaks without turning around. "The FCA call is confirmed for Thursday. Whatever your plan says about regulatory requirements, it needs to account for whatever comes out of that conversation."\n\nBy the end of the session, Amara has approved the outline. It is not perfect. But it exists, and everyone in the room has agreed to it. That is the purpose of a BA plan.`,
        concept: { title: "What goes into a BA plan and why it matters", body: `A BA plan answers one question: how will analysis happen on this project?\n\nIt covers four things. First, scope — what is in the analysis and what is explicitly out. Without a defined scope, every stakeholder will assume the BA is responsible for whatever they personally care about.\n\nSecond, methods — how you will gather information. Will you run workshops? One-on-one interviews? Document reviews? The methods should match the complexity of the problem and the availability of the people involved.\n\nThird, deliverables — what you will produce and when. A requirements document. A process model. A stakeholder register. Each deliverable should have a purpose, an owner, and a review process.\n\nFourth, risks — what could prevent the analysis from succeeding. Stakeholders who are too busy to engage. A tight timeline that compresses elicitation. Regulatory uncertainty that makes requirements unstable until a key decision is made.\n\nThe plan does not need to be long. One to three pages is usually enough. The value is not in the document itself. It is in the conversations that happen when people read it and disagree with what it says.` },
        example: { title: "The Vela BA plan in practice", body: `Your plan for the Vela lending project covers eight weeks.\n\nWeeks one and two: stakeholder interviews. You will speak to Amara, David, Priya, Kofi, and at least three merchants including Fatima. The goal is to validate the problem statement and surface requirements you do not know about yet.\n\nWeeks three and four: regulatory analysis. Priya and the legal team will brief you on the FCA and CBN constraints. You will map those constraints to specific product requirements.\n\nWeeks five and six: requirements drafting. You will document functional requirements, non-functional requirements, and constraints. David's team will review the technical feasibility of each.\n\nWeeks seven and eight: requirements review and sign-off. Amara, David, Priya, and Kofi all need to sign off before engineering begins scoping.\n\nThe plan also flags two risks. The FCA call could reveal compliance requirements that change the product scope significantly. And merchant interviews might be hard to schedule — you need Kofi's help to set those up.\n\nNeither risk is a reason to delay. Both are reasons to start early.` },
        artifact: {
          type: "ba-plan", title: "BA Artifact: The BA Plan",
          description: "A BA plan defines how analysis will happen, what it will produce, and what could go wrong. It is the contract between the BA and the project.",
          template: { headers: ["Section", "Vela Lending Project — Month 2"], rows: [["Scope", "Analysis covers lending product requirements for Nigeria and UK markets. Out of scope: treasury systems, merchant onboarding beyond lending, post-launch operational support"], ["Methods", "Stakeholder interviews (6), merchant research sessions (3), document review (FCA and CBN guidelines), requirements workshops (2)"], ["Deliverables", "Stakeholder register, requirements document, process model for loan application flow, regulatory constraints log"], ["Timeline", "Weeks 1 to 2: interviews. Weeks 3 to 4: regulatory analysis. Weeks 5 to 6: requirements draft. Weeks 7 to 8: review and sign-off"], ["Key risks", "FCA guidance may require significant scope change. Merchant access depends on Kofi's coordination. Nine month timeline assumes no major regulatory redesign"], ["Review process", "Requirements reviewed by Amara, David, Priya, and Kofi before engineering scoping begins in month 3"]] },
        },
        knowledgeCheck: {
          multipleChoice: [
            { id: "m2-l1-q1", question: "David says three weeks of stakeholder interviews is too long. What is the strongest response?", options: ["Agree and reduce the interview phase to one week", "Point out that no merchant has been interviewed yet and merchant input is critical to the product design", "Escalate the disagreement to Amara to decide", "Remove merchant interviews from the plan and add them later"], correctIndex: 1, explanation: "David is speaking from an internal perspective. The gap in the current knowledge is the merchant voice. Naming that gap specifically is more persuasive than defending the timeline in general." },
            { id: "m2-l1-q2", question: "What is the primary purpose of a BA plan?", options: ["To give the project manager a status update format", "To define how analysis will happen, what it will produce, and what risks could derail it", "To document what stakeholders have already agreed to", "To create a timeline for the development team"], correctIndex: 1, explanation: "A BA plan is about how analysis happens, not what the system will do. It creates alignment before work begins so everyone understands what the BA is doing and why." },
          ],
          scenarioQuestion: {
            id: "m2-l1-s1", prompt: "Two days after approving your BA plan, Amara tells you the board has moved the requirements sign-off date forward by three weeks. Your eight-week plan is now a five-week plan. What do you do?",
            options: [
              { id: "a", text: "Compress every phase equally to fit five weeks", feedback: "Compressing everything equally means every phase is underdone. The result is requirements that look complete but are not. That problem gets discovered in month five when engineering hits a gap." },
              { id: "b", text: "Tell Amara the plan cannot be delivered in five weeks and refuse to proceed", feedback: "Refusing without offering an alternative is not useful. The BA's job is to help the project navigate constraints, not to block progress when conditions change." },
              { id: "c", text: "Assess which phases can be shortened without critical quality loss, identify what gets cut, make the tradeoffs visible to Amara, and update the plan", feedback: "This is the right move. You do not just absorb the change silently. You make the tradeoffs explicit so the decision is made with full information. Amara may not realise what a three-week compression actually costs." },
              { id: "d", text: "Proceed with the original plan and let the timeline overrun naturally", feedback: "Ignoring a confirmed change to the timeline damages your credibility and surprises the team when the deadline is missed. Changes need to be acknowledged and responded to." },
            ], bestOptionId: "c",
          },
        },
        challengeConnection: { challengeId: "banking-discovery-001", text: "Planning under pressure is exactly what the Banking Discovery challenge tests. You will need to decide what to investigate, in what order, with limited time before a deadline." },
      },
      {
        id: "m2-l2", number: 2, title: "Stakeholder Analysis in Depth", readingTime: "4 minutes",
        whereWeAre: "Your BA plan is approved. The FCA call is Thursday. Before you start interviews, you need to understand each stakeholder well enough to ask the right questions and handle what comes back.",
        story: `You schedule your first deep-dive stakeholder session with Kofi on Tuesday afternoon. You have twenty minutes. Kofi is in Accra, on his phone, between two other calls.\n\n"Tell me what the merchants actually need," you say.\n\nKofi laughs. "What they need and what they will do are different things. I have been selling to these people for three years. You can build the most sophisticated credit product in West Africa and if the application takes longer than four minutes, half of them will abandon it before they finish."\n\nYou write that down. Four minutes.\n\n"What about the loan size?" you ask.\n\n"Varies wildly. Fatima's fabric business needs eight hundred thousand naira before Eid. The tailor next door needs fifty thousand to replace a broken machine. You need to design for both."\n\nYou have a follow-up question forming but Kofi's phone beeps. "Other call. Send me a list of questions and I will record voice notes tonight." He hangs up.\n\nTwenty minutes. Three things you did not have before: the four-minute threshold, the loan size range, and a way to keep Kofi engaged even when he is unavailable for live conversations.\n\nEvery stakeholder interaction is a data collection exercise. The quality of your requirements depends on the quality of these conversations.`,
        concept: { title: "How to analyse stakeholders properly", body: `Stakeholder analysis goes deeper than the influence and interest grid you built in week one. It asks four additional questions about each person.\n\nWhat do they care about most? Amara cares about speed. David cares about not building something that breaks. Priya cares about not getting the company fined. Kofi cares about merchant experience. Fatima cares about getting money when she needs it. These are not the same concern and they will sometimes conflict directly.\n\nWhat do they know that you do not? Every stakeholder holds information the others do not have. Kofi knows the merchant behaviour patterns. Priya knows which regulatory clause is most likely to restrict the product. David knows what the data pipeline can actually deliver. Your job is to extract that knowledge systematically.\n\nWhat do they fear? Fear drives resistance. David's resistance to the three-week interview phase probably comes from a fear that analysis will slow engineering down and the product will miss the board's deadline. Understanding the fear lets you address it directly instead of arguing about the timeline.\n\nHow do they prefer to communicate? Kofi gives you twenty minutes between calls and then sends voice notes. Priya turns her chair when she wants to engage. Amara wants written outlines before any verbal presentation. Adapting to each person's style is not people-pleasing. It is how information actually gets shared.` },
        example: { title: "Applying stakeholder analysis to the FCA call", body: `Thursday arrives. You join the call with Priya. James Whitfield from the FCA is direct and unhurried.\n\n"Two things," he says. "First, Consumer Duty applies to any product marketed to UK consumers regardless of where the provider is incorporated. Second, affordability assessment is not optional. You need to demonstrate that a merchant can reasonably repay the advance before you offer it."\n\nPriya takes notes rapidly. You ask one follow-up: "Is transaction data on its own sufficient for an affordability assessment under Consumer Duty?"\n\nJames pauses. "It depends on what the data shows. If a merchant's transaction volume is declining, you would need to explain why you approved the advance anyway. The bar is whether a reasonable person reviewing the decision could understand how it was made."\n\nAfter the call, you update your stakeholder analysis for James. His concern is not blocking the product. It is ensuring that the decision-making logic is explainable and documented. That is a requirements input, not just a compliance checkbox.\n\nYou add a new requirement to your log: the lending algorithm must produce an explainable decision record for every approved and declined application.` },
        artifact: {
          type: "stakeholder-analysis", title: "BA Artifact: Deep Stakeholder Analysis",
          description: "A stakeholder analysis goes beyond influence and interest to capture what each person knows, fears, and needs from the BA relationship.",
          template: { headers: ["Stakeholder", "Primary concern", "Key knowledge", "Underlying fear", "Communication style"], rows: [["Amara Osei", "Speed to market", "Board priorities, commercial strategy, competitive landscape", "Missing the launch window and losing board confidence", "Written outlines first, then verbal discussion"], ["David Mensah", "Technical feasibility", "Data pipeline limitations, platform architecture, engineering capacity", "Being asked to build something the data cannot support", "Direct, evidence-based — show him the constraints"], ["Priya Nair", "Regulatory compliance", "FCA Consumer Duty, CBN digital lending rules, company legal exposure", "A regulatory action that damages the company's licence to operate", "Thorough briefings — she needs detail, not summary"], ["Kofi Asante", "Merchant experience", "Merchant behaviour patterns, competitors, acceptable friction levels", "A product that merchants will not use despite his sales effort", "Short live sessions, then async voice notes or messages"], ["Fatima Bello", "Access to capital when needed", "Real use case, actual loan size needed, timing of cash flow gaps", "Applying for money and being declined without explanation", "Direct language, no jargon — speak to outcomes not process"], ["James Whitfield", "Explainable, auditable decisions", "FCA Consumer Duty application to data-driven lending", "A product that harms consumers through opaque decision-making", "Formal, precise — document everything he says"]] },
        },
        knowledgeCheck: {
          multipleChoice: [
            { id: "m2-l2-q1", question: "Why is understanding what a stakeholder fears more useful than understanding what they want?", options: ["Fear is more honest than stated preferences", "Understanding fear helps you address the resistance behind their objections rather than just arguing about the surface issue", "Stakeholders will not tell you what they want directly", "Fear-based analysis is required by the IIBA BABOK"], correctIndex: 1, explanation: "Resistance usually has a reason underneath it. David's pushback on the interview timeline is probably about his fear of the product missing its deadline — not about the interviews themselves. Address the fear and the resistance often dissolves." },
            { id: "m2-l2-q2", question: "James Whitfield says the lending algorithm needs to produce an explainable decision record. How should the BA handle this?", options: ["Note it as a regulatory opinion and check with legal before acting on it", "Capture it immediately as a confirmed requirement with FCA as the source", "Add it as a low-priority backlog item for the engineering team", "Ask Priya to decide whether it qualifies as a real requirement"], correctIndex: 1, explanation: "When the regulator tells you what is required, that is a confirmed requirement. Capture it with the source and date. Waiting for legal review before documenting it creates unnecessary risk." },
          ],
          scenarioQuestion: {
            id: "m2-l2-s1", prompt: "You schedule a two-hour requirements workshop with all six stakeholders. Thirty minutes in, Amara and David are debating a technical architecture point and the workshop has stalled. What do you do?",
            options: [
              { id: "a", text: "Let them finish — the architecture debate might surface important requirements", feedback: "Passive facilitation in a stalled workshop usually means the loudest voices dominate and quieter stakeholders disengage. Priya, Kofi, and others are losing their window to contribute." },
              { id: "b", text: "Intervene, acknowledge the architecture question as important, park it as a separate action item, and redirect the group back to the requirements agenda", feedback: "This is the BA's job in a workshop. You are not there to make the architecture decision. You are there to keep the group producing requirements. Parking the debate with a clear follow-up path is the right move." },
              { id: "c", text: "End the workshop early and reschedule once the architecture issue is resolved", feedback: "Ending early wastes everyone's time and makes future workshops harder to schedule. The architecture debate is a symptom of poor facilitation, not a reason to cancel." },
              { id: "d", text: "Ask Priya to resolve the architecture debate since she has the most authority", feedback: "Priya is a compliance expert, not a technical architect. Asking her to arbitrate a technical debate misreads her role and puts her in an uncomfortable position." },
            ], bestOptionId: "b",
          },
        },
        challengeConnection: { challengeId: "saas-facilitation-001", text: "The facilitation challenge puts you directly into a room where stakeholders are pulling in different directions. Your stakeholder analysis from this lesson is the preparation that makes you effective in that room." },
      },
      {
        id: "m2-l3", number: 3, title: "Scope Management and Prioritisation", readingTime: "4 minutes",
        whereWeAre: "Week three. You have completed your stakeholder interviews. The list of things people want on this product is now three pages long. Engineering starts scoping in four weeks. You need to prioritise and define scope before that conversation begins.",
        story: `Kofi sends you a voice note at 11pm on Wednesday.\n\n"Hey. Spoke to five merchants today for your research. Three things came up that were not in your original brief. They want to see their repayment schedule before they accept the advance. They want to be able to make early repayments. And at least two of them mentioned they have heard about a competitor that sends a repayment reminder by WhatsApp. I know these are probably out of scope but I wanted you to know."\n\nYou listen to the voice note twice.\n\nAll three of those features are reasonable. All three of them are also outside the scope of what the board approved in month one. And all three of them, if added, would push the nine-month timeline.\n\nYou add them to a log with the label: out of scope for v1 — candidate for v2.\n\nThe next morning Amara sees the log in the shared drive and calls you immediately. "Why are these out of scope? The repayment schedule feature is basic. Merchants will expect it."\n\n"It was not in the original scope," you say. "Adding it means something else either gets cut or the timeline extends. Which one do you want to discuss?"\n\nThis is scope management. Not blocking good ideas. Making tradeoffs visible so decisions can be made at the right level.`,
        concept: { title: "How to manage scope without killing good ideas", body: `Scope creep is not caused by bad ideas. It is caused by good ideas that enter the project without a decision being made about what they cost.\n\nThe BA's job in scope management is to create a visible, structured process for how new items enter and leave scope. This usually means two things.\n\nFirst, a scope boundary. A clear statement of what the project is building and what it is not building. The Vela v1 scope is a data-driven lending decision engine with basic application and disbursement flow for Nigeria and UK. Everything else is a candidate for v2.\n\nSecond, a change log. Every time something new is proposed, it goes into a log with its source, its rough size, and a decision status. Approved. Deferred. Rejected. The log creates accountability. Nobody can later say they did not know a feature was cut or deferred.\n\nPrioritisation frameworks like MoSCoW help structure the conversation. Must have means the product cannot launch without it. Should have means it is important but not launch-critical. Could have means it adds value but can wait. Will not have means explicitly out of scope for this version.\n\nThe goal is not to say no. The goal is to make sure every yes has been properly evaluated against the cost it carries.` },
        example: { title: "Running the MoSCoW exercise at Vela", body: `You run a two-hour prioritisation session with Amara, David, and Priya. Kofi joins the last forty minutes by video.\n\nYou start with the must-haves. Everyone agrees quickly: merchant identity verification, transaction data-based credit assessment, loan disbursement to mobile wallet, basic repayment collection, and the FCA-required explainable decision record.\n\nThe should-haves generate more debate. Amara wants the repayment schedule visible to the merchant before acceptance. David says it adds two weeks to the build. You write both facts down and ask the group to decide. They agree it is a should-have — it goes in if the timeline allows, but does not block launch.\n\nThe WhatsApp repayment reminder is a could-have. Nobody argues it should block the launch.\n\nThe early repayment feature produces the most debate. Kofi says merchants will want it. David says the repayment engine is not designed for variable schedules. Priya says early repayment may have specific FCA disclosure requirements. You log it as will not have for v1 and action Priya to confirm the regulatory position before the next planning review.\n\nAt the end of the session, you have a prioritised scope that everyone has agreed to. That agreement is more valuable than the document.` },
        artifact: {
          type: "scope-register", title: "BA Artifact: Scope Register with MoSCoW",
          description: "A scope register documents every proposed feature with its priority, size estimate, decision status, and rationale. It is the living record of what the project is and is not building.",
          template: { headers: ["Feature", "Priority", "Source", "Size estimate", "Decision", "Rationale"], rows: [["Transaction data credit assessment", "Must have", "Board brief", "Large", "In scope — v1", "Core product function"], ["Merchant identity verification", "Must have", "Priya — regulatory", "Medium", "In scope — v1", "CBN requirement"], ["Disbursement to mobile wallet", "Must have", "Amara, Kofi", "Medium", "In scope — v1", "Primary customer outcome"], ["Explainable decision record", "Must have", "FCA — James Whitfield", "Medium", "In scope — v1", "Consumer Duty requirement"], ["Repayment schedule shown before acceptance", "Should have", "Kofi — merchant research", "Small", "In scope if timeline allows", "Improves merchant trust — does not block launch"], ["WhatsApp repayment reminder", "Could have", "Kofi — merchant research", "Medium", "Deferred to v2", "Valuable but not launch-critical"], ["Early repayment capability", "Will not have", "Kofi — merchant research", "Large", "Deferred to v2 — FCA position needed", "Technical complexity and regulatory uncertainty"]] },
        },
        knowledgeCheck: {
          multipleChoice: [
            { id: "m2-l3-q1", question: "What is the difference between a should-have and a must-have in MoSCoW?", options: ["Must-haves are from senior stakeholders, should-haves are from junior ones", "Must-haves are required for the product to launch. Should-haves are important but the product can launch without them", "Must-haves are technical requirements, should-haves are business requirements", "There is no practical difference — both should be delivered in the first version"], correctIndex: 1, explanation: "The distinction matters because it determines what gets cut if the timeline is compressed. Must-haves define the minimum viable product. Should-haves are the first candidates for deferral when pressure hits." },
            { id: "m2-l3-q2", question: "Amara challenges your decision to defer a feature. What is the most effective response?", options: ["Defend your prioritisation decision and explain your reasoning", "Reverse the decision to maintain the working relationship", "Show the cost of adding the feature — what it requires and what would need to be cut or extended in return", "Escalate to the board to make the final call"], correctIndex: 2, explanation: "The BA does not own the prioritisation decision — the project sponsor does. Your job is to make the cost of each option visible so the decision is made with full information. Show the tradeoff and let Amara decide." },
          ],
          scenarioQuestion: {
            id: "m2-l3-s1", prompt: "A week after your prioritisation session, Amara adds a new feature directly to the engineering backlog without going through the scope register. The feature would add three weeks to the build. What do you do?",
            options: [
              { id: "a", text: "Leave it — Amara is the CPO and has the authority to add features", feedback: "Authority does not remove the need for analysis. The feature has a cost the team may not be aware of. A CPO who bypasses the scope process is not acting with full information — that is something you can address directly." },
              { id: "b", text: "Remove it from the backlog without telling Amara", feedback: "Never make scope decisions unilaterally and without transparency. This damages trust and creates confusion in the team." },
              { id: "c", text: "Raise it with Amara directly — show her the three-week impact, ask whether she wants to proceed, and add the feature to the scope register with the decision documented", feedback: "This is right. You are not blocking Amara. You are ensuring she knows what the feature costs before it becomes part of the build. Document the conversation and the decision regardless of outcome." },
              { id: "d", text: "Ask David to refuse the feature on technical grounds", feedback: "Using David as a shield is not scope management. It creates conflict between Amara and David and removes you from your own responsibility." },
            ], bestOptionId: "c",
          },
        },
        challengeConnection: { challengeId: "healthcare-requirements-001", text: "The Healthcare challenge involves a system with many competing stakeholder demands. The MoSCoW skills from this lesson are exactly what you need to produce a requirements set that is realistic to build." },
      },
      {
        id: "m2-l4", number: 4, title: "Communicating with Stakeholders", readingTime: "3 minutes",
        whereWeAre: "End of month two. You have a BA plan, a deep stakeholder analysis, and a prioritised scope register. Now you need to present the month two findings to the full Vela leadership team. This is your most important communication yet.",
        story: `The leadership review is on Friday at 3pm. You have fifteen minutes. The room includes Amara, David, Priya, Kofi on video, and two board observers you have not met before.\n\nYou prepared twenty slides. The night before, you cut it to six.\n\nSlide one: where we are. Month two complete. Analysis phase on track.\n\nSlide two: what we confirmed. The problem is real. Merchant demand is validated. FCA and CBN requirements are known and manageable.\n\nSlide three: what we found that changes the picture. Transaction data completeness is a higher risk than originally assumed. David's team has confirmed that thirty percent of merchants use at least one other payment platform. We are only seeing part of their revenue.\n\nSlide four: the scope register. What is in, what is out, and why.\n\nSlide five: risks and decisions needed. Two items require a leadership decision before month three begins.\n\nSlide six: month three plan. What happens next.\n\nAmara asks three questions. David asks one. The board observers ask none but take notes.\n\nAt the end, one of the board observers says: "This is the clearest update we have had on a product initiative in two years."\n\nYou do not say that the previous version had twenty slides. You thank him and move to the decision items.\n\nClear communication is a BA skill. Not a soft skill. A skill.`,
        concept: { title: "How BAs communicate with different audiences", body: `BA communication fails in one of two ways. Too much detail for people who need the headline. Too little context for people who need to make decisions.\n\nThe solution is audience mapping. Before any communication — written or verbal — ask three questions. Who is receiving this? What decision or action do they need to take as a result? What is the minimum information they need to take that action?\n\nFor executives and sponsors, lead with the headline and the decision required. They do not need to know how you got there. They need to know what it means and what they need to do.\n\nFor technical stakeholders like David, lead with evidence and constraints. He is not persuaded by vision statements. He is persuaded by data and specific technical constraints that are clearly sourced.\n\nFor compliance stakeholders like Priya, lead with what was confirmed, what is pending, and what the specific risk is if the pending item is not resolved. Priya needs precision, not summary.\n\nWritten communication follows the same logic. A requirements document for engineering is not the same document you show the board. The BA produces different artefacts for different audiences from the same underlying analysis.` },
        example: { title: "The two decisions from the month two review", body: `Your slide five flags two items that need a leadership decision before month three.\n\nFirst: the data completeness problem. Thirty percent of merchants use other platforms. The credit assessment will be working with incomplete revenue data for at least a third of the merchant base. The decision: accept this risk and build a model that accounts for incomplete data, or require merchants to link additional data sources before qualifying for an advance.\n\nAmara and David debate this for four minutes. They agree on a middle path: the algorithm will note incomplete data as a risk factor and reduce the advance amount offered to merchants where coverage is below a threshold. David's team will define the threshold.\n\nYou document the decision, the rationale, and the owners. That documentation goes into the requirements log immediately after the meeting.\n\nSecond: the nine-month timeline. With the scope register as it stands and the regulatory requirements now confirmed, the timeline is still achievable but has no buffer. Any scope addition or regulatory surprise will push the launch date.\n\nAmara asks the board observers directly whether a two-week overrun would be acceptable. They say no. She turns to the room and says: "Nothing new enters scope without a decision at this level."\n\nYou add that sentence to the scope register as a governance rule. It came from the right person in the right room. It will hold.` },
        artifact: {
          type: "communication-plan", title: "BA Artifact: Stakeholder Communication Plan",
          description: "A communication plan defines who gets what information, in what format, and how often. It prevents important decisions from being made without the right people involved.",
          template: { headers: ["Stakeholder", "What they need", "Format", "Frequency", "Owner"], rows: [["Amara Osei", "Status, decisions required, scope changes", "Written summary plus verbal walkthrough", "Weekly", "BA"], ["David Mensah", "Technical requirements, feasibility questions, data constraints", "Direct briefings with documented outputs", "Twice weekly during requirements phase", "BA"], ["Priya Nair", "Regulatory findings, compliance requirements, risk flags", "Detailed written briefings", "Weekly plus immediate escalation on any new flag", "BA"], ["Kofi Asante", "Merchant research questions, scope decisions affecting merchant experience", "Short async briefs plus monthly live sessions", "Weekly async, monthly live", "BA"], ["Board observers", "Progress against milestone, risks, decisions made", "Executive summary slide deck", "Monthly", "BA with Amara review"], ["Vela leadership team", "Full project status, scope register, risk log", "Leadership review presentation", "End of each project month", "BA"]] },
        },
        knowledgeCheck: {
          multipleChoice: [
            { id: "m2-l4-q1", question: "Why did cutting the presentation from twenty slides to six improve the outcome?", options: ["Shorter presentations are always better regardless of content", "The audience needed to make decisions, not receive a full briefing — the six slides contained everything needed for that purpose", "The board observers had limited attention spans", "Twenty slides would have exceeded the fifteen minute slot"], correctIndex: 1, explanation: "The purpose of the presentation was to get two decisions made. Every slide should serve that purpose. Slides that inform but do not contribute to the decision should be removed or moved to an appendix." },
            { id: "m2-l4-q2", question: "What makes a communication plan different from just sending updates?", options: ["A communication plan is a formal document that satisfies project governance requirements", "A communication plan defines what each stakeholder needs, in what format, and how often — so communication is designed for the audience, not sent at the BA's convenience", "A communication plan ensures the BA is copied on all project emails", "There is no meaningful difference"], correctIndex: 1, explanation: "Ad hoc updates reach people inconsistently and in formats that may not serve their needs. A communication plan makes communication deliberate and audience-specific, which is what makes it effective." },
          ],
          scenarioQuestion: {
            id: "m2-l4-s1", prompt: "After the leadership review, a board observer emails you directly asking for the full requirements document before it is finished. Amara has not approved sharing draft requirements externally. What do you do?",
            options: [
              { id: "a", text: "Send it — a board observer has more authority than Amara", feedback: "Authority and approval are different things. Amara is the project sponsor and has not cleared draft requirements for external distribution. Bypassing her damages the working relationship and the governance structure." },
              { id: "b", text: "Decline and explain that draft requirements are not yet ready for distribution", feedback: "Partially right but incomplete. You should also inform Amara of the request so she can decide how to handle the board relationship. Handling it unilaterally without her knowledge creates a gap in the communication chain." },
              { id: "c", text: "Inform Amara of the request, let her decide how to respond to the board observer, and offer to prepare an executive summary version if that would help", feedback: "This is the right move. You flag the request to the right person, offer a useful alternative, and let the decision be made at the appropriate level. The board observer gets a response. Amara stays in control of the communication flow." },
              { id: "d", text: "Send a high-level summary without telling Amara", feedback: "Acting without Amara's knowledge on a communication from a board observer is a significant breach of professional trust. Even if the content is harmless, the process matters." },
            ], bestOptionId: "c",
          },
        },
        challengeConnection: { challengeId: "saas-facilitation-001", text: "The facilitation challenge tests your ability to communicate clearly under pressure with stakeholders who have competing priorities. The communication discipline from this lesson is your foundation." },
      },
    ],
  },
  {
    id: "module-3", number: 3, title: "Elicitation & Collaboration",
    subtitle: "Finding the truth between the stories",
    description: "Month 3. You run your first stakeholder interviews. Kofi tells you one thing. Fatima tells you something completely different. Both of them are right.",
    duration: "65 to 80 minutes", sdlcPhase: "Month 3 — Elicitation", tier: "pro",
    badgeOnCompletion: { id: "elicitation-specialist", name: "Elicitation Specialist", icon: "🎤", color: "#38bdf8" },
    lessons: [
      {
        id: "m3-l1", number: 1, title: "Elicitation Techniques: Choosing the Right Approach", readingTime: "4 minutes",
        whereWeAre: "Month two is done. You have a BA plan, a stakeholder analysis, and a prioritised scope. Now the real work starts — talking to the people who hold the actual requirements in their heads.",
        story: `Amara called the elicitation kickoff for Monday morning. Full cast: Kofi from Sales, Priya from Compliance, David from Tech, and two merchant representatives including Fatima Bello from Lagos.\n\nBy 9:15, Kofi was drawing boxes on the whiteboard. "The system is simple," he said. "Merchant applies. Algorithm approves. Funds hit the account in two minutes. Done." He sat down looking very pleased with himself.\n\nPriya did not look pleased. "Kofi, you have just described a product with no KYC check, no affordability assessment, and zero audit trail. That is not a product. That is a regulatory action waiting to happen."\n\nFatima had been quiet the whole time. She raised her hand. "I do not understand what KYC means. But I do know that if the money does not arrive before 11 AM on market day, it is useless to me. The fabric suppliers do not wait."\n\nYou wrote three different things in your notebook in thirty seconds. Kofi wanted speed. Priya wanted compliance. Fatima wanted timing. None of them said the same thing — and none of them were wrong.\n\nThis is the moment every BA either masters or gets buried by. How do you get the real requirements out of a room full of people who each think they already gave them to you?`,
        concept: { title: "The seven elicitation techniques and when to use them", body: `Elicitation is how you extract what stakeholders actually need — not just what they say they want. BABOK defines it as drawing out, exploring, and identifying information from stakeholders and other sources.\n\nSeven core techniques cover most situations.\n\nInterviews are one-on-one structured conversations. Best for uncovering individual perspectives, political context, and unstated assumptions. Use open questions first, then close down to specifics. Always interview Priya and Kofi separately — they perform differently in front of each other.\n\nWorkshops are facilitated group sessions. Best for building consensus and resolving conflicting views. High risk of groupthink if you do not manage power dynamics. Kofi talks a lot in workshops. Make sure Fatima has space.\n\nObservation means watching stakeholders do their actual work. It surfaces tacit knowledge — things people do but never think to say. Essential for Fatima's use case. You will never understand her time pressure from a video call.\n\nSurveys are structured data collection at scale. Good for quantifying frequency and priority. Weak at uncovering nuance or things people do not know to articulate.\n\nDocument analysis means reviewing existing artifacts — policies, reports, contracts, prior project docs. Priya's compliance files are gold here. Most BAs skip this and regret it.\n\nPrototyping means showing stakeholders a mock interface to react to. Unlocks requirements that people cannot articulate verbally but immediately recognise visually.\n\nBrainstorming is open idea generation, usually in groups. Useful for identifying solution options. Not the right tool for requirements capture — too unstructured.\n\nChoosing your technique depends on what kind of information you need, who you are talking to, what stage you are in, and what constraints you have. For Vela, you need individual interviews with Kofi and Priya before any joint session. You need observation with Fatima before you write a single timing requirement. And you need document analysis on FCA guidelines before Priya will trust anything you produce.` },
        example: { title: "Matching techniques to the Vela cast", body: `Here is how you map elicitation techniques to each stakeholder.\n\nFor Kofi, use individual interviews. He dominates group sessions. One-on-one, he is more honest about sales pressure and the gap between what he promises merchants and what Compliance will allow.\n\nFor Priya, use document analysis first, then interview. If you come to her empty-handed she will spend the whole session explaining why everything is complicated. But if you arrive having read the FCA Consumer Duty guidelines, she will treat you as a peer and you will get to the real constraints much faster.\n\nFor Fatima, use observation first, then interview. Her requirements live in her behaviour, not her vocabulary. Watch her market morning — how she sources fabric, when suppliers arrive, when cash is needed — and you will discover timing constraints no survey would surface.\n\nFor David, use workshops plus prototyping. He thinks in systems and responds well to having something visual to react to. Joint workshops with Priya work well here because both of them need to agree on the compliance architecture before David will commit to a technical approach.\n\nThe right sequence for month three: document analysis first, then observation with Fatima, then individual interviews with Kofi and Priya, then a joint workshop to resolve conflicts and validate scope.` },
        artifact: {
          type: "elicitation-planning-matrix", title: "BA Artifact: Elicitation Planning Matrix",
          description: "Maps each stakeholder to the right techniques, timing, and what you are trying to learn from each session.",
          template: { headers: ["Stakeholder", "Technique", "Sequence", "What you are trying to learn", "Watch-outs"], rows: [["Kofi Asante", "Individual interview", "Week 1 — before group sessions", "True merchant demand; competitive benchmarks; sales commitments already made", "Will oversell speed — keep bringing him back to what merchants actually asked for"], ["Priya Nair", "Document analysis then interview", "Documents first, interview week 2", "Regulatory hard limits; audit requirements; non-negotiables vs. areas of flexibility", "Will lead with complexity — probe for what would make this possible, not just why it is hard"], ["Fatima Bello", "Observation then interview", "Observation week 1, interview week 2", "Real timing constraints; daily cash flow pattern; what fast actually means in practice", "Do not use fintech jargon — ask about her day, not about the product"], ["David Mensah", "Workshop plus prototyping", "Week 3 — after individual interviews", "Technical constraints; data availability; what the algorithm can actually see", "Will default to we can build anything — push for time and risk estimates"], ["James Whitfield", "Document analysis plus structured interview", "Week 4 — late stage validation", "Regulatory expectations; audit trail requirements; what triggers an investigation", "Formal relationship — prepare written questions in advance and document everything"]] },
        },
        knowledgeCheck: {
          multipleChoice: [
            { id: "m3-l1-q1", question: "You need to understand why Fatima always requests loans before 9 AM. Which technique gives you the most accurate answer?", options: ["Survey — ask about her preferred loan timing", "Observation — spend a market morning watching how she actually operates", "Interview — ask her directly why 9 AM matters", "Document analysis — review her past loan application timestamps"], correctIndex: 1, explanation: "Observation reveals what people do, not just what they say. Watching Fatima's market morning surfaces timing constraints she has never consciously articulated. Surveys and interviews measure what people think to say — they rarely surface tacit behavioural knowledge." },
            { id: "m3-l1-q2", question: "Priya keeps saying it is complicated when you ask about compliance requirements. What is the most effective move?", options: ["Schedule more interviews until she opens up", "Escalate to Amara — Priya is not being cooperative", "Do document analysis on the FCA guidelines before your next session with her", "Move on and come back to compliance requirements later"], correctIndex: 2, explanation: "Priya thinks in frameworks. If you arrive having read the relevant guidance, she shifts from explaining complexity to problem-solving with you. Document analysis unlocks the interview. More interviews without new preparation just repeat the same dynamic." },
          ],
          scenarioQuestion: {
            id: "m3-l1-s1", prompt: "Kofi opens your first interview by saying: I have already figured this out. The product is simple — instant approval, two minutes, no friction. Just document that and we are done. How do you respond?",
            options: [
              { id: "a", text: "Agree and document his description as the business requirement — he is VP Sales and knows the market", feedback: "A BA's job is to distinguish needs from solutions. Documenting a solution framed as a requirement produces a product that might not solve the actual problem." },
              { id: "b", text: "Challenge him directly: that is not a requirement, that is a solution — I need the underlying need first", feedback: "Technically correct but unnecessarily confrontational. You will get better information and a better working relationship by validating his confidence while redirecting to the underlying need." },
              { id: "c", text: "Acknowledge his input and use it as a starting point: that is a strong direction — help me understand what problem that solves for merchants so I can make sure the solution actually delivers it", feedback: "This is the right move. It acknowledges Kofi without surrendering to his framing. Help me understand the problem that solves is one of the most useful sentences in elicitation — it works with stakeholders who jump straight to solutions." },
              { id: "d", text: "Ignore the framing and start asking your planned questions anyway", feedback: "Ignoring what a senior stakeholder just said is a fast way to lose the relationship and the interview." },
            ], bestOptionId: "c",
          },
        },
        challengeConnection: { challengeId: "saas-facilitation-001", text: "Choosing the right elicitation technique for each stakeholder is exactly what the Facilitation challenge tests. Your planning matrix from this lesson is your preparation for that room." },
      },
      {
        id: "m3-l2", number: 2, title: "Interview Mastery: Questions That Actually Work", readingTime: "4 minutes",
        whereWeAre: "You chose your techniques and planned your sessions. Now you are in the room. The first interview went 45 minutes and produced almost nothing useful. The second went 22 minutes and changed the whole project.",
        story: `Your first interview was with Kofi. It went 45 minutes. He talked the whole time. You filled four pages of notes. When you got back to your desk and read them, you realised he had told you almost nothing — a lot of confident language about market opportunity and competitive differentiation, but zero specifics about what merchants actually need or what Vela can actually deliver.\n\nYour second interview was with Fatima. It went 22 minutes. She was distracted at first — she had a delivery arriving. But when you asked her to walk you through what last Friday looked like from the moment she needed money to the moment she had it, she stopped, looked at you, and said something that changed the whole project.\n\n"I called my cousin. That is what I do. I call my cousin, he brings cash, and I give him 10 percent when I pay him back. That is your competition. Not a bank. My cousin."\n\nThat was it. The real requirement. Not two-minute approval. Not instant funds. The actual barrier to adoption was that her informal lending network was faster, cheaper, and required zero paperwork. Vela had to beat a cousin, not a bank.\n\nYou got that from 22 minutes with the right questions. Kofi's 45 minutes got you nothing useful.\n\nThe difference is not the person you are talking to. It is the questions you ask.`,
        concept: { title: "The architecture of a good BA interview", body: `A BA interview is a structured conversation with a clear goal: extract the real need beneath the stated want.\n\nOpen questions invite elaboration and surface unexpected information. Walk me through what happens when a merchant applies for working capital today. What would have to be true for this product to actually change how you operate. Tell me about a time this process broke down.\n\nClosed questions confirm specifics and pin down scope. Is the current approval process manual or automated. Does the system store transaction data going back 12 months. Would a four-hour turnaround meet the requirement or does it need to be same-day.\n\nThe rule: start open, close down to confirm, never start closed. You anchor the conversation too early and miss what you did not know to ask.\n\nFour probing techniques do most of the work. Tell me more about that — the simplest and most powerful probe, works in almost any situation. What do you mean by that specific word — essential for jargon and assumed terms like fast, compliant, seamless. Why does that matter — connects a stated preference to an underlying need, ask it three times in a row and you will find the real requirement. What happens if that does not work — surfaces downstream impacts and reveals how much someone actually cares about a stated requirement.\n\nFive traps to avoid. Leading questions give you the answer you just suggested, not the truth. Double-barrelled questions get one answer for two questions — ask them separately. Premature solution questions produce fake requirements grounded in nothing. Silence panic — most interviewers fill silence too fast. When a stakeholder pauses and looks thoughtful, wait. The next thing they say is usually the most important thing in the session. And confirmation bias — you came in with a hypothesis and hear everything through that lens.\n\nA 60-minute session runs in four phases. Context-setting at the start — five minutes. Big picture open questions — ten minutes. Deep dive with probing — thirty minutes. Validation, reading back key things you heard — ten minutes. Close, asking is there anything I should have asked that I did not — five minutes.` },
        example: { title: "The questions that found the cousin", body: `Here is a reconstruction of the 22 minutes that surfaced Vela's real competitive landscape.\n\nQuestion one: Fatima, walk me through last Friday morning from the moment you woke up to the moment your stall was open. Narrative questions put people in the experience rather than asking them to summarise it. She described the whole morning — including the call to her cousin — without realising it was the most important thing she would say.\n\nQuestion two after she mentioned her cousin: Tell me more about how that works. Most interviewers would have moved past I called my cousin. It sounds like a throwaway detail. It was not.\n\nQuestion three: When you say you give him 10 percent — is that 10 percent of the total amount or a flat fee. Confirmed the cost structure. 10 percent of 50,000 naira is 5,000 naira. That is the price point Vela needs to beat.\n\nQuestion four: Why your cousin and not a microfinance institution. Fatima's answer: he answers his phone. The real requirement was not speed of funds transfer. It was reliability of access. That is a different product design problem entirely.\n\nQuestion five: What happens on a Friday when your cousin is not available. Fatima's answer: I buy less. Or I do not open. Surfaces the cost of the current failure — lost revenue from not opening is the quantified value of solving this. This becomes the business case.\n\nQuestion six to validate: Just to make sure I have this right — you need to know before 10 AM that funding is confirmed, not necessarily that the money has arrived, because that is when you have to commit to the supplier. Is that right. Fatima confirmed it exactly. The distinction between funds confirmed and funds received is a significant technical and regulatory difference. Getting this in her words before leaving the interview prevents a full rework later.` },
        artifact: {
          type: "interview-question-bank", title: "BA Artifact: Interview Question Bank",
          description: "A structured set of questions for each stakeholder type — ready to use and adapt for elicitation sessions.",
          template: { headers: ["Stakeholder", "Question type", "Question", "What it surfaces", "Follow-up probe"], rows: [["Any", "Opening — open", "Walk me through what your role looks like on a typical Monday morning", "Day-in-the-life context; pain points mentioned without prompting", "You mentioned X — tell me more about that"], ["Merchant — Fatima", "Deep dive — open", "Describe the last time you needed working capital urgently. What happened?", "Real use case, timing, current workaround, cost of failure", "What would have made that easier?"], ["Merchant — Fatima", "Probe — why", "Why does the money need to arrive before 10 AM specifically?", "The underlying constraint — supplier schedule, market timing", "What happens if it arrives at 11?"], ["Kofi — Sales", "Deep dive — open", "What are the top three things merchants ask for that we cannot currently offer?", "Unmet market demand; sales friction points", "How often does that come up?"], ["Kofi — Sales", "Probe — what do you mean", "You mentioned instant approval — what does instant mean to a merchant in practice?", "Operational definition of speed; gap between ideal and acceptable", "Is there a threshold where slow becomes unacceptable?"], ["Priya — Compliance", "Deep dive — open", "What are the things that would make you personally uncomfortable signing off on this product?", "Compliance non-negotiables; personal risk tolerance", "Is that a regulatory requirement or internal policy?"], ["David — Tech", "Validation — closed", "Do we currently store merchant transaction data going back 12 months in a structured format?", "Technical feasibility of the credit algorithm data requirements", "What is the data quality like?"], ["Any", "Close — open", "Is there anything I should have asked that I did not?", "Information the stakeholder wanted to share but had no opening to", "Why does that matter to you?"]] },
        },
        knowledgeCheck: {
          multipleChoice: [
            { id: "m3-l2-q1", question: "Kofi says merchants do not care about anything except fast approvals. What is the right probing question?", options: ["So you would agree that speed is the top priority then?", "Why does that matter to merchants — what happens when approval is slow?", "What do you mean by fast — is that under two minutes or under an hour?", "Have you validated that with actual merchants?"], correctIndex: 1, explanation: "Why does that matter connects the stated preference to the underlying need. You might discover speed matters because of supplier timing, not because merchants are impatient — a significantly different requirement. Option A is a leading question that confirms his framing without testing it." },
            { id: "m3-l2-q2", question: "You ask Fatima an open question and she pauses for about eight seconds, looking thoughtful. What do you do?", options: ["Rephrase the question — she probably did not understand it", "Wait — let the silence sit", "Move to your next question to keep the session moving", "Offer a possible answer to help her along"], correctIndex: 1, explanation: "Eight seconds is not confusion — it is thinking. The most common interview mistake is filling silence too fast. A stakeholder pausing to think is about to tell you something important. Wait for it." },
          ],
          scenarioQuestion: {
            id: "m3-l2-s1", prompt: "After interviewing Kofi and Fatima separately you have two completely contradictory inputs. Kofi says merchants want instant decisions and do not care about interest rates. Fatima says she would accept a 24-hour turnaround if the rate was lower than what her cousin charges. How do you handle this?",
            options: [
              { id: "a", text: "Document both views and let Amara decide which stakeholder is right", feedback: "Handing conflicts upward without analysis is not BA work. Your job is to frame the conflict and propose a resolution path, not just surface it." },
              { id: "b", text: "Treat Kofi's input as authoritative — he is a more senior stakeholder and represents the broader merchant base", feedback: "Seniority does not determine which requirement is correct. Kofi has a sales view. Fatima has a user view. Both are valid and neither trumps the other on accuracy." },
              { id: "c", text: "Document both views as valid requirements, flag the conflict explicitly, and propose a workshop where both perspectives are validated with additional merchant data", feedback: "This is right. Document the conflict without resolution bias, flag it explicitly so it does not get buried, and propose a structured way to resolve it. Contradictory stakeholder inputs are normal. Unacknowledged contradictions in a requirements document are a project risk." },
              { id: "d", text: "Conduct more interviews with other merchants to determine which view is the majority position", feedback: "Useful supplementary step, but it defers resolution and does not address the underlying tension between Kofi's sales assumptions and actual merchant behaviour. Do this in addition to option C, not instead of it." },
            ], bestOptionId: "c",
          },
        },
        challengeConnection: { challengeId: "banking-discovery-001", text: "The Banking Discovery challenge puts you in back-to-back stakeholder conversations where every person gives you a different version of the truth. The interviewing skills from this lesson are what you need to find the signal in the noise." },
      },
      {
        id: "m3-l3", number: 3, title: "Workshops and Facilitation: Managing Conflict in the Room", readingTime: "4 minutes",
        whereWeAre: "Individual interviews are done. You have conflicting inputs. Now you need to get everyone in a room together and turn those conflicts into agreed requirements. This is where most BAs lose control.",
        story: `The joint requirements workshop was supposed to run from 2 to 5 PM. By 2:45 it had become a two-person debate between Kofi and Priya about whether Vela was building a product or a compliance exercise.\n\nKofi had his slides up — merchant acquisition projections, competitive benchmarks, the slide titled Why Friction Kills Fintech. Priya had her document up — 47 pages of FCA guidelines, highlighted in three colours.\n\n"If we require a 48-hour manual review for every application," Kofi said, voice rising slightly, "we will lose every merchant to M-Pesa before we finish the pilot."\n\n"If we skip the manual review," Priya said, absolutely flat, "we will not be operating in 18 months. Full stop."\n\nDavid was looking at his laptop. Fatima had stopped taking notes and was watching the two of them.\n\nYou were standing at the whiteboard. You had a marker in your hand. You had about thirty seconds before this became unproductive.\n\nHere is what a good BA facilitator does in that moment.`,
        concept: { title: "Running a requirements workshop that produces decisions", body: `A requirements workshop is a structured, facilitated session where stakeholders with different perspectives come together to identify, clarify, and reach consensus on requirements. The keyword is structured — unstructured meetings produce noise. Workshops produce decisions.\n\nYour role as the BA facilitator is not to be neutral. You have a point of view: you want complete, unambiguous, agreed requirements. That means protecting all voices, keeping discussions on needs not solutions, naming conflicts explicitly rather than letting them go underground, and moving toward a decision at the end of every session.\n\nBefore the workshop, preparation is most of the work. Set a clear objective — by the end of this session we will have agreed on the top ten business requirements. Distribute pre-reading so the session can go deep. Define ground rules: one person speaks at a time, challenge ideas not people, silence means tentative agreement. Know your conflict flashpoints in advance. The Kofi versus Priya standoff was predictable. Prepare your intervention before it happens.\n\nFive facilitation techniques cover most situations. The Parking Lot is a visible space where off-topic items go. When Kofi tries to relitigate the product strategy mid-session, you write it in the Parking Lot: that is an important point, putting it here so we do not lose it. Round-robin goes around the room asking each person for one input before open discussion — it prevents the loudest voice from dominating. Dot voting gives each participant a fixed number of votes to allocate across options, making prioritisation visible. Affinity mapping groups individual ideas into themes, useful when the room has generated too much to process. The how-might-we reframe turns a constraint from a wall into a design challenge: how might we achieve the goal while still satisfying the constraint that...\n\nManaging a stakeholder standoff means naming the tension as a legitimate design constraint and redirecting to the shared goal. Both of you are pointing at something real. Kofi, you are saying friction above a certain threshold kills adoption. Priya, you are saying below a certain compliance standard we do not have a product we can operate. Those are not opposing positions — they are two edges of the design space. Our job today is to find the requirements that sit inside both edges.\n\nA workshop must end with four things. A prioritised list of agreed requirements. A documented list of conflicts with owners and deadlines. A Parking Lot list with owners. Explicit next steps. Without these you ran a meeting, not a workshop.` },
        example: { title: "The thirty-second intervention that saved the workshop", body: `You put the marker down. You walked to the centre of the room.\n\n"Both of you are right," you said. "Kofi — merchant acquisition dies above a friction threshold. That is real. Priya — below a compliance floor, the product does not exist. Also real."\n\nYou drew two horizontal lines on the whiteboard. A top line labelled compliance floor — non-negotiable. A bottom line labelled friction ceiling — above this, merchants leave. A gap between them.\n\n"Everything Vela builds has to live in here. Our job for the next two hours is to define what that space actually contains."\n\nYou turned to Priya. "Starting with you — for a digital lending product processing under 500 pounds or 500,000 naira, what is the minimum audit trail that keeps us on the right side of the FCA?"\n\nPriya paused. This was a specific question, not a debate opener. She pulled up her document. "Transaction ID, merchant identifier, timestamp, decision basis, and a 90-day data retention log. If we have those five things, we can defend any individual decision."\n\nYou wrote all five on the whiteboard.\n\nYou turned to Kofi. "If those five data points are captured automatically — zero merchant-facing friction — does the two-minute approval timeline still work?"\n\nKofi looked at the list. "If it is all backend, yes. The merchant just sees approved."\n\nThe standoff was over in under four minutes. Because you redirected from positions to requirements.` },
        artifact: {
          type: "workshop-facilitation-plan", title: "BA Artifact: Workshop Facilitation Plan",
          description: "Pre-workshop preparation template covering objectives, participants, agenda, conflict management strategy, and required outputs.",
          template: { headers: ["Element", "Detail", "Owner", "Notes"], rows: [["Workshop objective", "Agree on the top 10 business requirements for the Vela MVP and document conflicts for resolution", "BA", "Outcome must be specific — discuss is not an objective"], ["Participants", "Amara, Kofi, Priya, David, Fatima as merchant representative", "BA to invite", "Consider whether Fatima needs a plain-language pre-brief"], ["Pre-reading", "Elicitation summary from individual interviews; FCA digital lending summary; Kofi's market analysis — 2 pages max", "BA to distribute 48 hours before", "Keep it short — people will not read 47 pages before a workshop"], ["Ground rules", "One speaker at a time; challenge ideas not people; silence means tentative agreement; Parking Lot for off-topic items", "BA to open with these", "Read them aloud at the start"], ["Known conflict: speed vs. compliance", "Kofi needs low friction; Priya needs audit trail. Resolution: define minimum compliance requirements that are fully backend with zero merchant-facing friction", "BA to facilitate; Amara to arbitrate if needed", "Prepare the two-lines whiteboard diagram in advance"], ["Required outputs", "Prioritised requirements list; conflict log with owners; Parking Lot with owners; next steps", "BA to document during session", "Send written summary within 24 hours"]] },
        },
        knowledgeCheck: {
          multipleChoice: [
            { id: "m3-l3-q1", question: "Kofi keeps interrupting Fatima mid-sentence in the workshop. What do you do?", options: ["Let it go — Kofi is more senior and likely to have the more relevant input", "Pause the conversation: Kofi, let us hear Fatima finish — she is describing the merchant experience we are building for", "Call Kofi out directly: you keep interrupting, please let her speak", "Ask Fatima to summarise her point more quickly so it does not invite interruption"], correctIndex: 1, explanation: "This redirects firmly without shaming Kofi. It also signals to Fatima that her voice matters — which increases the quality of her contribution. Option C is accurate but too confrontational. Option D puts the responsibility on Fatima to manage Kofi's behaviour." },
            { id: "m3-l3-q2", question: "David raises a valid point about data architecture that is important but out of scope for today's requirements session. What is the right move?", options: ["Let the discussion run — technical constraints affect requirements and should not be deferred", "Tell David to bring it to a separate technical meeting and move on", "Acknowledge it, write it in the Parking Lot, assign David as owner, and return to the requirements agenda", "Ask the group to vote on whether to address it now or later"], correctIndex: 2, explanation: "Parking Lot captures it visibly so it does not feel dismissed, assigns ownership so it does not get lost, and keeps the session on track. Option B achieves the same outcome but less respectfully. Voting creates meta-process overhead and sets a precedent for every subsequent tangent." },
          ],
          scenarioQuestion: {
            id: "m3-l3-s1", prompt: "At the end of the workshop you have 12 proposed requirements on the board. Kofi thinks all 12 are must-haves. Priya thinks 4 are non-negotiable compliance items. David thinks 3 are not technically feasible in the timeline. The group is tired and running out of time. How do you close the session productively?",
            options: [
              { id: "a", text: "Run a dot-voting exercise where each participant gets 5 votes to allocate across the 12 requirements, note Priya's 4 separately as compliance requirements regardless of vote result, and document David's feasibility concerns for follow-up", feedback: "This is the right move. Dot voting makes prioritisation fast, visible, and collectively owned. Noting Priya's non-negotiables separately protects them from being voted away. David's concerns get captured for follow-up rather than resolved on the spot." },
              { id: "b", text: "Ask Amara to make the final call on all 12 requirements — it is her product", feedback: "Valid in extreme cases, but it removes collective ownership from the output. The group is more likely to implement requirements they had a hand in prioritising." },
              { id: "c", text: "Extend the session until the group reaches full consensus on all 12 items", feedback: "Group energy at the end of a workshop goes negative fast. Forcing consensus when people are tired produces false agreement and resentment. Better to close with a clear structure and complete the work in a follow-up." },
              { id: "d", text: "Close the session and send a follow-up email asking stakeholders to vote asynchronously before the next meeting", feedback: "Asynchronous voting works but loses the benefit of the group being in the room together. Better to do a quick dot vote now while everyone is present." },
            ], bestOptionId: "a",
          },
        },
        challengeConnection: { challengeId: "saas-facilitation-001", text: "The Facilitation challenge is this lesson in real time. You will run a session where stakeholders are pulling in different directions and your job is to leave with agreed requirements — not a polite stalemate." },
      },
      {
        id: "m3-l4", number: 4, title: "Documenting What You Heard: From Notes to Requirements", readingTime: "4 minutes",
        whereWeAre: "The interviews and workshop are done. You have eight pages of notes, four stakeholder voices, and one very tight deadline. Amara needs a requirements document by end of week. The gap between notes and requirements is bigger than most BAs expect.",
        story: `You had eight pages of interview notes, a workshop summary, and a very full head. What you did not have was a requirements document that anyone could build from.\n\nAmara called you on Thursday. "I need to share something with the board on Monday. Can you send me the requirements this afternoon?"\n\nYou opened your notes. There was Kofi's speech about friction. There was Fatima's cousin. There was Priya's list of five audit trail items. There was David's point about data structure that went in the Parking Lot and had not been written up yet. There was a heated 20-minute exchange between Kofi and Priya that you had captured in fragments.\n\nNone of it was a requirement. All of it was raw material.\n\nThe gap between raw material and a requirements document is not a writing task. It is an analytical task. You are not transcribing what people said. You are synthesising what they need.\n\nHere is how to do that with eight pages and an afternoon.`,
        concept: { title: "From elicitation output to structured requirements", body: `Elicitation produces information. Requirements engineering turns that information into structured, verifiable, agreed statements of need. They are related but distinct activities.\n\nA well-written requirement has four properties. It is specific — it states exactly what is needed, not a vague direction. It is measurable — it contains a success criterion. The approval decision shall be returned within four minutes is measurable. Approval should be fast is not. It is achievable — technically and operationally feasible. And it is traceable — it links back to a business objective and forward to a test case.\n\nBABOK defines four requirement types. Business requirements describe what the organisation needs to achieve — they come from Amara. Stakeholder requirements describe what specific stakeholders need — they come from your interviews. Solution requirements describe what the system must do — these split into functional requirements covering what the system does, and non-functional requirements covering how well it does it. Transition requirements cover what is needed to move from the current to the future state.\n\nTo convert your notes to requirements, follow a five-step process. First, read all notes without writing anything — let the themes emerge. Second, identify the recurring needs behind different stakeholder statements. Kofi says no friction. Fatima says before 10 AM. These point to different requirements. Third, write business requirements first — they anchor everything else. Fourth, write stakeholder requirements grouped by stakeholder. Fifth, convert stakeholder requirements to solution requirements, adding the non-functional how-well to each functional what.\n\nDocument constraints separately. Priya's five audit trail items are constraints, not negotiable requirements. They belong in a constraints section, not in the requirements list. If they cannot be met, the product cannot launch.\n\nList assumptions and open issues explicitly. Unresolved things do not disappear when you leave them out of a document — they become surprises in development.` },
        example: { title: "Turning the Vela notes into requirements", body: `Here is how three raw interview statements become structured requirements.\n\nRaw note from Kofi: merchants do not want paperwork, they want to apply on the app and get an answer, if they have to upload documents or call anyone we have already lost them.\n\nBusiness requirement: Vela shall provide a fully digital, self-service working capital loan application requiring no manual merchant intervention.\n\nFunctional requirement: the system shall process loan applications using automated credit scoring with no requirement for merchant document upload.\n\nRaw note from Fatima: if the money arrives at noon it is too late, my suppliers leave by 11, I need to know by 9 or 10 that the money is coming.\n\nStakeholder requirement: merchants shall receive a loan decision no later than four hours before their stated supplier payment window.\n\nNon-functional requirement: the loan decision system shall achieve a median response time of under four minutes, with the 99th percentile not exceeding 15 minutes, 24 hours a day.\n\nRaw note from Priya: for every transaction I need a transaction ID, the merchant identifier, a timestamp, the decision basis, and a 90-day retention log — those five things, without them I cannot defend any individual decision.\n\nConstraint — not a requirement: all loan decisions shall be logged with the following minimum data — transaction ID, merchant identifier, decision timestamp, credit scoring basis summary, and decision outcome. Log data shall be retained for a minimum of 90 days in an auditable tamper-evident format.\n\nNote the distinction. Priya's five items are not a requirement to be prioritised or negotiated. They are a compliance constraint. If they cannot be met, the product cannot launch. They belong in the constraints section.` },
        artifact: {
          type: "requirements-register", title: "BA Artifact: Vela Lending Blueprint — Elicitation Layer",
          description: "The requirements extracted from Month 3 elicitation work. This is the elicitation contribution to the living Vela Lending Blueprint, showing all requirement types in structured form.",
          template: { headers: ["ID", "Type", "Requirement statement", "Source stakeholder", "Priority", "Status"], rows: [["BR-04", "Business", "Vela shall provide a fully digital self-service working capital loan application requiring no manual merchant intervention", "Kofi Asante", "Must have", "Draft — pending David feasibility review"], ["BR-05", "Business", "Vela shall enable merchants to secure working capital confirmation in advance of their stated supplier payment window", "Fatima Bello", "Must have", "Draft — timing SLA to be confirmed with operations"], ["SH-K-01", "Stakeholder", "Merchants shall apply for, receive a decision on, and accept a loan entirely within the Vela mobile application", "Kofi Asante", "Must have", "Draft"], ["SH-F-01", "Stakeholder", "Merchants shall receive a loan decision no later than four hours before their stated supplier payment window", "Fatima Bello", "Must have", "Open issue — how does merchant declare payment window?"], ["FR-12", "Functional", "The system shall process loan applications using automated credit scoring with no requirement for merchant document upload", "Kofi and David", "Must have", "Draft — David to confirm feasibility"], ["NFR-03", "Non-functional", "The loan decision system shall achieve median response time under four minutes; 99th percentile not exceeding 15 minutes, 24 hours a day", "Fatima — timing need", "Must have", "Draft — David to validate against current architecture"], ["CONSTRAINT-01", "Constraint", "All loan decisions shall be logged with transaction ID, merchant identifier, decision timestamp, scoring basis, and outcome. 90-day tamper-evident retention required.", "Priya Nair", "Non-negotiable", "Confirmed verbally by Priya — formal sign-off pending"], ["ASSUMPTION-01", "Assumption", "Merchant transaction data from the Vela platform going back at least 90 days is available in structured format for credit scoring", "David Mensah", "High", "Unconfirmed — David to validate data quality by end of month 3"]] },
        },
        knowledgeCheck: {
          multipleChoice: [
            { id: "m3-l4-q1", question: "Priya says every loan decision must have an audit trail. How should you document this?", options: ["As a high-priority functional requirement that the team should implement if time allows", "As a constraint — non-negotiable, not subject to prioritisation", "As a business requirement owned by the compliance team", "As an assumption that the current system likely already handles this"], correctIndex: 1, explanation: "Compliance requirements are constraints. They bound the solution space and are pre-conditions for any requirement to matter. They do not compete with other requirements for priority. Assuming it is already handled without validation is one of the most common and expensive BA mistakes." },
            { id: "m3-l4-q2", question: "You write: the system should process loans quickly. What is wrong with this?", options: ["It should say shall not should", "It is not specific or measurable — quickly has no success criterion and cannot be tested", "Functional requirements should not describe performance", "Nothing — this is appropriate for a draft document"], correctIndex: 1, explanation: "A requirement without a measurable success criterion is a wish, not a requirement. The system shall return a loan decision within four minutes of application submission is testable. Quickly is not. Even drafts need measurable intent." },
          ],
          scenarioQuestion: {
            id: "m3-l4-s1", prompt: "You sent the draft requirements to stakeholders for review. Kofi wants to add a loyalty rewards feature. Priya added 12 new compliance items she forgot to mention in the workshop. David says three functional requirements are not technically feasible in the timeline. How do you manage all three?",
            options: [
              { id: "a", text: "Add Kofi's loyalty feature, add Priya's 12 items, and remove David's 3 items — incorporate all feedback as received", feedback: "Treating all feedback as equally valid without analysis is not requirements management — it is transcription. Kofi's loyalty feature is a scope change that needs a change control process. David's feasibility concern needs analysis before removal, not just deletion." },
              { id: "b", text: "Reject Kofi's addition as out of scope, add Priya's items as constraints, and schedule a feasibility review with David before updating the document", feedback: "Good instincts on Priya and David. But reject for Kofi is too blunt — new requirements from stakeholders are not automatically rejected. They need scope assessment and may legitimately belong in a future phase." },
              { id: "c", text: "Prioritise Priya's feedback first since compliance is the highest risk area, have a change control conversation with Amara about Kofi's feature before it enters the document, and work with David to identify alternatives to the infeasible requirements rather than deleting them", feedback: "This applies the right process to each type of feedback. Compliance concerns are urgent and non-negotiable. Scope additions need a change control conversation at the right level. Feasibility concerns need options analysis before any deletion." },
              { id: "d", text: "Call a follow-up workshop with all three stakeholders to review the feedback together before making any changes", feedback: "Valid for complex conflicts, but a full workshop for three reviewers' comments is heavy process. Handle these sequentially with the right process for each type of feedback." },
            ], bestOptionId: "c",
          },
        },
        challengeConnection: { challengeId: "healthcare-requirements-001", text: "The Healthcare challenge asks you to produce a requirements document under pressure with incomplete stakeholder input. The conversion skills from this lesson — from messy notes to structured requirements — are exactly what you need to pass it." },
      },
    ],
  },
  { id: "module-4", number: 4, title: "Requirements Analysis & Modeling", subtitle: "Turning conversations into structured requirements", description: "Month 4 to 5. You model the lending process. Priya tears it apart. That is the job.", duration: "70 to 85 minutes", sdlcPhase: "Month 4 to 5 — Analysis", tier: "pro", badgeOnCompletion: { id: "requirements-analyst", name: "Requirements Analyst", icon: "📋", color: "#fb923c" }, lessons: [] },
  { id: "module-5", number: 5, title: "Requirements Lifecycle & Governance", subtitle: "Protecting the project when scope starts to drift", description: "Month 6 to 7. Scope creep hits. David is losing patience. You build a change control process that saves the project.", duration: "60 to 75 minutes", sdlcPhase: "Month 6 to 7 — Governance", tier: "pro", badgeOnCompletion: { id: "governance-lead", name: "Governance Lead", icon: "🛡️", color: "#f59e0b" }, lessons: [] },
  { id: "module-6", number: 6, title: "Solution Evaluation & Improvement", subtitle: "The pilot launched. Now the real work starts.", description: "Month 8 to 9. Vela launches a pilot. Data comes back. Some features flopped. You lead the post-launch analysis.", duration: "60 to 75 minutes", sdlcPhase: "Month 8 to 9 — Evaluation", tier: "pro", badgeOnCompletion: { id: "solution-evaluator", name: "Solution Evaluator", icon: "📊", color: "#f87171" }, lessons: [] },
];

const navItems = [
  { icon: LayoutDashboard,    label: "Dashboard",    href: "/dashboard" },
  { icon: BookOpen,           label: "Challenges",   href: "/scenarios" },
  { icon: TrendingUp,         label: "Progress",     href: "/progress" },
  { icon: GraduationCap,      label: "Learning",     href: "/learning", active: true },
  { icon: Target,             label: "Exam Prep",    href: "/exam",     locked: true },
  { icon: BriefcaseBusiness,  label: "Career Suite", href: "/career",   locked: true },
  { icon: Trophy,             label: "Portfolio",    href: "/portfolio",locked: true },
];

// ─── Badge Toast ──────────────────────────────────────────────────────────────
function BadgeToast({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.96 }} transition={{ type: "spring", damping: 20, stiffness: 300 }}
      style={{ position: "fixed", bottom: "32px", left: "50%", transform: "translateX(-50%)", zIndex: 9999, padding: "20px 28px", borderRadius: "18px", background: "var(--bg-2)", border: "1px solid rgba(31,191,159,0.3)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: "16px", minWidth: "320px" }}
    >
      <div style={{ fontSize: "40px", lineHeight: 1 }}>{badge.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)", marginBottom: "3px" }}>BADGE EARNED</div>
        <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-1)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{badge.name}</div>
        <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>Module complete</div>
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", fontSize: "20px", lineHeight: 1, padding: "4px" }}>×</button>
    </motion.div>
  );
}

// ─── Artifact Table ───────────────────────────────────────────────────────────
function ArtifactTable({ artifact }: { artifact: Artifact }) {
  return (
    <div style={{ margin: "32px 0", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(31,191,159,0.2)" }}>
      <div style={{ padding: "14px 20px", background: "rgba(31,191,159,0.08)", borderBottom: "1px solid rgba(31,191,159,0.15)", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "16px" }}>📄</span>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>BA ARTIFACT</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-1)", marginTop: "1px" }}>{artifact.title}</div>
        </div>
      </div>
      <div style={{ padding: "12px 20px 14px", background: "rgba(31,191,159,0.03)", borderBottom: "1px solid rgba(31,191,159,0.1)" }}>
        <p style={{ fontSize: "13px", color: "var(--text-3)", lineHeight: 1.65 }}>{artifact.description}</p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {artifact.template.headers.map((h, i) => (
                <th key={i} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", borderBottom: "1px solid var(--border)" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {artifact.template.rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: ri < artifact.template.rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: "12px 16px", fontSize: "13px", color: ci === 0 ? "var(--text-2)" : "var(--text-1)", fontWeight: ci === 0 ? 600 : 400, lineHeight: 1.55, verticalAlign: "top" }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Knowledge Check ──────────────────────────────────────────────────────────
function KnowledgeCheckPanel({ check, onComplete }: { check: KnowledgeCheck; onComplete: () => void }) {
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number | null>>({});
  const [mcqRevealed, setMcqRevealed] = useState<Record<string, boolean>>({});
  const [scenarioAnswer, setScenarioAnswer] = useState<string | null>(null);
  const [scenarioRevealed, setScenarioRevealed] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const allMcqAnswered = check.multipleChoice.every(q => mcqRevealed[q.id]);
  const canComplete = allMcqAnswered && scenarioRevealed;

  function handleMcq(qId: string, idx: number) {
    if (mcqRevealed[qId]) return;
    setMcqAnswers(prev => ({ ...prev, [qId]: idx }));
    setTimeout(() => setMcqRevealed(prev => ({ ...prev, [qId]: true })), 300);
  }

  function handleScenario(optId: string) {
    if (scenarioRevealed) return;
    setScenarioAnswer(optId);
    setTimeout(() => setScenarioRevealed(true), 300);
  }

  function handleComplete() {
    setAllDone(true);
    setTimeout(onComplete, 600);
  }

  return (
    <div style={{ margin: "40px 0 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--teal-soft)", border: "1px solid var(--teal-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "16px" }}>✍️</span>
        </div>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>KNOWLEDGE CHECK</div>
          <div style={{ fontSize: "13px", color: "var(--text-3)", marginTop: "1px" }}>Answer all questions to mark this lesson complete</div>
        </div>
      </div>

      {check.multipleChoice.map((q, qi) => {
        const revealed = mcqRevealed[q.id];
        return (
          <div key={q.id} style={{ marginBottom: "24px", padding: "20px", borderRadius: "14px", background: "var(--bg-2)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)", marginBottom: "14px", lineHeight: 1.55 }}>
              <span style={{ color: "var(--teal)", fontFamily: "var(--font-mono)", marginRight: "8px" }}>{qi + 1}.</span>{q.question}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {q.options.map((opt, oi) => {
                const isSelected = mcqAnswers[q.id] === oi;
                const isCorrect = oi === q.correctIndex;
                let bg = "rgba(255,255,255,0.03)", border = "1px solid var(--border)", color = "var(--text-2)";
                if (revealed) {
                  if (isCorrect) { bg = "rgba(31,191,159,0.1)"; border = "1px solid rgba(31,191,159,0.3)"; color = "var(--teal)"; }
                  else if (isSelected) { bg = "rgba(248,113,113,0.08)"; border = "1px solid rgba(248,113,113,0.2)"; color = "#f87171"; }
                } else if (isSelected) { bg = "rgba(255,255,255,0.06)"; border = "1px solid rgba(255,255,255,0.15)"; }
                return (
                  <button key={oi} onClick={() => handleMcq(q.id, oi)} disabled={!!mcqAnswers[q.id]}
                    style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 14px", borderRadius: "10px", background: bg, border, cursor: mcqAnswers[q.id] !== undefined ? "default" : "pointer", textAlign: "left", transition: "all 0.2s" }}>
                    <div style={{ width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0, border: `1px solid ${revealed && isCorrect ? "var(--teal)" : revealed && isSelected ? "#f87171" : "var(--border)"}`, background: revealed && isCorrect ? "var(--teal)" : "none", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "1px" }}>
                      {revealed && isCorrect && <Check size={10} style={{ color: "var(--bg)" }} />}
                    </div>
                    <span style={{ fontSize: "13px", color, lineHeight: 1.55 }}>{opt}</span>
                  </button>
                );
              })}
            </div>
            {revealed && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: "12px", padding: "12px 14px", borderRadius: "10px", background: "rgba(31,191,159,0.06)", border: "1px solid rgba(31,191,159,0.12)" }}>
                <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.65 }}>{q.explanation}</p>
              </motion.div>
            )}
          </div>
        );
      })}

      <div style={{ padding: "20px", borderRadius: "14px", background: "rgba(124,110,245,0.05)", border: "1px solid rgba(124,110,245,0.15)", marginBottom: "24px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#7c6ef5", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: "10px" }}>SCENARIO — WHAT WOULD YOU DO?</div>
        <p style={{ fontSize: "14px", color: "var(--text-1)", lineHeight: 1.7, marginBottom: "16px", fontWeight: 500 }}>{check.scenarioQuestion.prompt}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {check.scenarioQuestion.options.map(opt => {
            const isSelected = scenarioAnswer === opt.id;
            const isBest = opt.id === check.scenarioQuestion.bestOptionId;
            const revealed = scenarioRevealed;
            let bg = "rgba(255,255,255,0.03)", border = "1px solid var(--border)";
            if (revealed && isBest) { bg = "rgba(31,191,159,0.1)"; border = "1px solid rgba(31,191,159,0.25)"; }
            else if (isSelected && !revealed) { bg = "rgba(124,110,245,0.08)"; border = "1px solid rgba(124,110,245,0.2)"; }
            return (
              <div key={opt.id}>
                <button onClick={() => handleScenario(opt.id)} disabled={scenarioRevealed}
                  style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px", borderRadius: "10px", background: bg, border, cursor: scenarioRevealed ? "default" : "pointer", textAlign: "left", transition: "all 0.2s" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: revealed && isBest ? "var(--teal)" : "var(--text-4)", fontFamily: "var(--font-mono)", flexShrink: 0, marginTop: "2px" }}>{opt.id.toUpperCase()}</span>
                  <span style={{ fontSize: "13px", color: revealed && isBest ? "var(--text-1)" : "var(--text-2)", lineHeight: 1.55 }}>{opt.text}</span>
                </button>
                {revealed && isSelected && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ margin: "6px 0 4px", padding: "12px 14px", borderRadius: "10px", background: isBest ? "rgba(31,191,159,0.06)" : "rgba(255,255,255,0.03)", border: isBest ? "1px solid rgba(31,191,159,0.12)" : "1px solid var(--border)" }}>
                    <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.65 }}>{opt.feedback}</p>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {canComplete && !allDone && (
        <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={handleComplete}
          style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "var(--teal)", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 700, color: "var(--bg)", fontFamily: "var(--font-display)", letterSpacing: "-0.01em", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <Check size={16} /> Mark lesson complete
        </motion.button>
      )}

      {allDone && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          style={{ padding: "16px", borderRadius: "12px", background: "rgba(31,191,159,0.08)", border: "1px solid rgba(31,191,159,0.2)", textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "6px" }}>✅</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--teal)" }}>Lesson complete</div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props {
  profile: { subscription_tier: string; full_name?: string | null } | null;
  completedLessons: string[];
}

export default function LearningClient({ profile, completedLessons: initialCompleted }: Props) {
  const router = useRouter();
  const isPro = profile?.subscription_tier === "pro" || profile?.subscription_tier === "enterprise";

  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>(initialCompleted);
  const [activeSection, setActiveSection] = useState<"story" | "concept" | "example" | "artifact" | "check">("story");
  const [earnedBadge, setEarnedBadge] = useState<Badge | null>(null);

  const sections = ["story", "concept", "example", "artifact", "check"] as const;
  const sectionLabels = { story: "Story", concept: "Concept", example: "Example", artifact: "Artifact", check: "Check" };

  function openModule(mod: Module) {
    if (mod.tier === "pro" && !isPro) return;
    setSelectedModule(mod);
    setSelectedLesson(mod.lessons[0] || null);
    setActiveSection("story");
  }

  function openLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    setActiveSection("story");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleLessonComplete() {
    if (!selectedLesson || !selectedModule) return;
    setCompletedLessons(prev => [...prev, selectedLesson.id]);

    try {
      const res = await fetch("/api/learning/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: selectedLesson.id, moduleId: selectedModule.id }),
      });
      const data = await res.json();
      if (data.badge) setEarnedBadge(data.badge);
    } catch { /* fail silently */ }

    const currentIdx = selectedModule.lessons.findIndex(l => l.id === selectedLesson.id);
    if (currentIdx < selectedModule.lessons.length - 1) {
      setTimeout(() => openLesson(selectedModule.lessons[currentIdx + 1]), 800);
    }
  }

  const renderSectionContent = () => {
    if (!selectedLesson) return null;
    const L = selectedLesson;
    switch (activeSection) {
      case "story": return (
        <div>
          {L.whereWeAre && (
            <div style={{ padding: "14px 18px", borderRadius: "12px", background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)", marginBottom: "28px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#38bdf8", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>WHERE WE LEFT OFF</div>
              <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.7 }}>{L.whereWeAre}</p>
            </div>
          )}
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "16px", lineHeight: 1.85, color: "var(--text-1)" }}>
            {L.story.split("\n\n").map((para, i) => <p key={i} style={{ marginBottom: "20px" }}>{para}</p>)}
          </div>
        </div>
      );
      case "concept": return (
        <div>
          <h3 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-1)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em", marginBottom: "20px" }}>{L.concept.title}</h3>
          <div style={{ fontSize: "15px", lineHeight: 1.85, color: "var(--text-2)" }}>
            {L.concept.body.split("\n\n").map((para, i) => <p key={i} style={{ marginBottom: "18px" }}>{para}</p>)}
          </div>
        </div>
      );
      case "example": return (
        <div>
          <h3 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-1)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em", marginBottom: "20px" }}>{L.example.title}</h3>
          <div style={{ fontSize: "15px", lineHeight: 1.85, color: "var(--text-2)" }}>
            {L.example.body.split("\n\n").map((para, i) => <p key={i} style={{ marginBottom: "18px" }}>{para}</p>)}
          </div>
        </div>
      );
      case "artifact": return (
        <div>
          <ArtifactTable artifact={L.artifact} />
          <div style={{ padding: "14px 18px", borderRadius: "12px", background: "rgba(31,191,159,0.05)", border: "1px solid rgba(31,191,159,0.12)", marginTop: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>CHALLENGE CONNECTION</div>
            <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.65 }}>{L.challengeConnection.text}</p>
            <button onClick={() => router.push(`/scenarios/${L.challengeConnection.challengeId}?mode=normal`)}
              style={{ marginTop: "10px", fontSize: "12px", fontWeight: 700, color: "var(--teal)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
              Try the challenge <ChevronRight size={12} />
            </button>
          </div>
        </div>
      );
      case "check": return <KnowledgeCheckPanel check={L.knowledgeCheck} onComplete={handleLessonComplete} />;
    }
  };

  // ── Module grid ─────────────────────────────────────────────────────────────
  if (!selectedModule) return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <aside className="w-64 flex-shrink-0 flex flex-col relative overflow-hidden" style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}>
        <div className="absolute inset-0 pointer-events-none dot-grid" />
        <div className="relative px-5 pt-6 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--teal-soft)", border: "1px solid var(--teal-border)" }}>
              <BookOpen className="w-4 h-4" style={{ color: "var(--teal)" }} />
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "15px", color: "var(--text-1)", letterSpacing: "-0.03em" }}>
              The<span style={{ color: "var(--teal)" }}>BA</span>Portal
            </div>
          </div>
        </div>
        <nav className="relative flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <div className="type-label px-3 pb-3">Platform</div>
          {navItems.map(item => (
            <button key={item.href} onClick={() => !item.locked && router.push(item.href)} className="sidebar-item"
              style={item.active ? { background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid var(--teal-border)" } : item.locked ? { color: "var(--text-4)", cursor: "not-allowed" } : {}}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.active && <div className="teal-dot" />}
              {item.locked && <span className="type-label" style={{ padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.03)", color: "var(--text-4)" }}>SOON</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="px-8 py-5 flex items-center gap-4 sticky top-0 z-20" style={{ background: "rgba(9,9,11,0.88)", backdropFilter: "blur(24px)", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => router.push("/dashboard")} className="btn-ghost p-2" style={{ borderRadius: "10px" }}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "22px", color: "var(--text-1)", letterSpacing: "-0.03em", lineHeight: 1 }}>Learning Academy</h1>
            <p className="type-body" style={{ marginTop: "4px" }}>One story. Six modules. The full BA journey.</p>
          </div>
        </header>

        <div className="px-8 py-8" style={{ maxWidth: "900px" }}>
          <div className="relative rounded-2xl overflow-hidden mb-8 p-7" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(31,191,159,0.05) 0%, transparent 70%)" }} />
            <div className="relative">
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)", marginBottom: "8px" }}>YOUR CASE STORY</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "22px", color: "var(--text-1)", letterSpacing: "-0.03em", marginBottom: "10px" }}>You are the BA at <span style={{ color: "var(--teal)" }}>Vela</span></h2>
              <p style={{ fontSize: "14px", color: "var(--text-2)", lineHeight: 1.7, maxWidth: "540px", marginBottom: "16px" }}>Vela is a Lagos-based fintech expanding across West Africa and the UK. The board just approved a Merchant Cash Advance product. Nine months. High stakes. You just got hired to make sense of it all.</p>
              <div className="flex items-center gap-4 flex-wrap">
                {["Amara — CPO", "David — CTO", "Priya — Compliance", "Kofi — Sales", "Fatima — Your merchant", "James — FCA"].map(name => (
                  <span key={name} style={{ fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", color: "var(--text-3)", border: "1px solid var(--border)" }}>{name}</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)", marginBottom: "16px" }}>6 MODULES — FOLLOWING THE SDLC</div>
          <div className="space-y-3">
            {MODULES.map((mod, i) => {
              const isLocked = mod.tier === "pro" && !isPro;
              const completedCount = mod.lessons.filter(l => completedLessons.includes(l.id)).length;
              const isStarted = completedCount > 0;
              const isModComplete = mod.lessons.length > 0 && completedCount === mod.lessons.length;
              return (
                <motion.button key={mod.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  onClick={() => openModule(mod)} disabled={isLocked}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "16px", padding: "18px 20px", borderRadius: "16px", textAlign: "left", background: isModComplete ? "rgba(31,191,159,0.06)" : "var(--surface)", border: isModComplete ? "1px solid rgba(31,191,159,0.2)" : "1px solid var(--border)", cursor: isLocked ? "not-allowed" : "pointer", opacity: isLocked ? 0.5 : 1, transition: "all 0.2s" }}
                  whileHover={isLocked ? {} : { y: -2, transition: { duration: 0.15 } }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0, background: isModComplete ? "rgba(31,191,159,0.12)" : "rgba(255,255,255,0.04)", border: isModComplete ? "1px solid rgba(31,191,159,0.2)" : "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                    {isModComplete ? "✅" : isLocked ? "🔒" : mod.badgeOnCompletion.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-4)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>MODULE {mod.number}</span>
                      <span style={{ fontSize: "10px", color: "var(--text-4)" }}>·</span>
                      <span style={{ fontSize: "10px", color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>{mod.sdlcPhase}</span>
                      {mod.tier === "free" && <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", background: "rgba(31,191,159,0.1)", color: "var(--teal)", border: "1px solid rgba(31,191,159,0.2)" }}>FREE</span>}
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "15px", color: "var(--text-1)", letterSpacing: "-0.01em", marginBottom: "2px" }}>{mod.title}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-3)" }}>{mod.subtitle}</div>
                    {isStarted && !isModComplete && mod.lessons.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div style={{ flex: 1, height: "2px", borderRadius: "1px", background: "rgba(255,255,255,0.05)", maxWidth: "120px" }}>
                          <div style={{ height: "100%", borderRadius: "1px", background: "var(--teal)", width: `${(completedCount / mod.lessons.length) * 100}%` }} />
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>{completedCount}/{mod.lessons.length}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1" style={{ fontSize: "12px", color: "var(--text-4)" }}>
                      <Clock size={11} /><span>{mod.duration.split(" ")[0]} min</span>
                    </div>
                    {isLocked ? <Lock size={16} style={{ color: "var(--text-4)" }} /> : <ChevronRight size={16} style={{ color: "var(--text-3)" }} />}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {!isPro && (
            <div className="mt-6 p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "16px", color: "var(--text-1)", marginBottom: "6px" }}>Unlock all 6 modules</div>
              <p style={{ fontSize: "13px", color: "var(--text-3)", marginBottom: "14px" }}>Module 1 is free. Modules 2 through 6 require a Pro subscription.</p>
              <button onClick={() => router.push("/pricing")} className="btn-teal" style={{ padding: "10px 20px", fontSize: "13px" }}>
                <Zap size={14} /> Upgrade to Pro
              </button>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {earnedBadge && <BadgeToast badge={earnedBadge} onClose={() => setEarnedBadge(null)} />}
      </AnimatePresence>
    </div>
  );

  // ── Lesson reader ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <aside className="w-72 flex-shrink-0 flex flex-col" style={{ background: "var(--surface)", borderRight: "1px solid var(--border)", overflowY: "auto" }}>
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => setSelectedModule(null)} className="flex items-center gap-2 mb-4" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: "13px" }}>
            <ArrowLeft size={14} /> All modules
          </button>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>MODULE {selectedModule.number}</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "16px", color: "var(--text-1)", letterSpacing: "-0.02em", lineHeight: 1.25 }}>{selectedModule.title}</div>
          <div style={{ fontSize: "12px", color: "var(--text-4)", marginTop: "4px" }}>{selectedModule.sdlcPhase}</div>
        </div>

        <div className="flex-1 px-3 py-4 space-y-1">
          <div className="type-label px-2 pb-2">Lessons</div>
          {selectedModule.lessons.map((lesson, i) => {
            const isComplete = completedLessons.includes(lesson.id);
            const isActive = selectedLesson?.id === lesson.id;
            return (
              <button key={lesson.id} onClick={() => openLesson(lesson)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", textAlign: "left", background: isActive ? "var(--teal-soft)" : "none", border: isActive ? "1px solid var(--teal-border)" : "1px solid transparent", cursor: "pointer" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, background: isComplete ? "var(--teal)" : isActive ? "var(--teal-soft)" : "rgba(255,255,255,0.05)", border: isComplete ? "none" : `1px solid ${isActive ? "var(--teal-border)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isComplete ? <Check size={11} style={{ color: "var(--bg)" }} /> : <span style={{ fontSize: "10px", fontWeight: 700, color: isActive ? "var(--teal)" : "var(--text-4)", fontFamily: "var(--font-mono)" }}>{i + 1}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: isActive ? 600 : 500, color: isActive ? "var(--teal)" : "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lesson.title}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-4)", marginTop: "1px" }}>{lesson.readingTime}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 pb-5">
          <div style={{ padding: "14px", borderRadius: "12px", background: "rgba(31,191,159,0.05)", border: "1px solid rgba(31,191,159,0.12)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>MODULE BADGE</div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "20px" }}>{selectedModule.badgeOnCompletion.icon}</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>{selectedModule.badgeOnCompletion.name}</span>
            </div>
            <p style={{ fontSize: "11px", color: "var(--text-4)", marginTop: "4px" }}>Complete all lessons to earn this badge</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="px-10 pt-8 pb-0 sticky top-0 z-10" style={{ background: "rgba(9,9,11,0.94)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
          <div className="flex items-center gap-3 mb-5">
            <span style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>Module {selectedModule.number} / Lesson {selectedLesson?.number}</span>
            <span style={{ fontSize: "11px", color: "var(--text-4)" }}>·</span>
            <span style={{ fontSize: "11px", color: "var(--text-4)" }}>{selectedLesson?.readingTime} read</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "26px", color: "var(--text-1)", letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: "16px" }}>{selectedLesson?.title}</h1>
          <div className="flex items-center gap-1">
            {sections.map(sec => (
              <button key={sec} onClick={() => setActiveSection(sec)}
                style={{ padding: "8px 14px", borderRadius: "8px 8px 0 0", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: activeSection === sec ? "var(--bg)" : "none", border: activeSection === sec ? "1px solid var(--border)" : "1px solid transparent", borderBottom: activeSection === sec ? "1px solid var(--bg)" : "1px solid transparent", color: activeSection === sec ? "var(--text-1)" : "var(--text-4)", marginBottom: activeSection === sec ? "-1px" : "0", transition: "all 0.15s" }}>
                {sectionLabels[sec]}
              </button>
            ))}
          </div>
        </div>

        <div className="px-10 py-8" style={{ maxWidth: "680px" }}>
          <AnimatePresence mode="wait">
            <motion.div key={`${selectedLesson?.id}-${activeSection}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {renderSectionContent()}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-10 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={() => { const idx = sections.indexOf(activeSection); if (idx > 0) setActiveSection(sections[idx - 1]); }} disabled={sections.indexOf(activeSection) === 0} className="btn-ghost"
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", opacity: sections.indexOf(activeSection) === 0 ? 0.3 : 1 }}>
              <ChevronLeft size={14} /> Previous
            </button>
            <span style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>{sections.indexOf(activeSection) + 1} of {sections.length}</span>
            <button onClick={() => { const idx = sections.indexOf(activeSection); if (idx < sections.length - 1) setActiveSection(sections[idx + 1]); }} disabled={sections.indexOf(activeSection) === sections.length - 1} className="btn-ghost"
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", opacity: sections.indexOf(activeSection) === sections.length - 1 ? 0.3 : 1 }}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {earnedBadge && <BadgeToast badge={earnedBadge} onClose={() => setEarnedBadge(null)} />}
      </AnimatePresence>
    </div>
  );
}