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
  { id: "module-2", number: 2, title: "Planning & Stakeholder Strategy", subtitle: "Map the battlefield before the meetings start", description: "Month 2. Amara wants everything. David wants nothing changed. Priya wants compliance first. You build a BA plan that keeps everyone moving.", duration: "60 to 75 minutes", sdlcPhase: "Month 2 — Planning", tier: "pro", badgeOnCompletion: { id: "ba-planner", name: "Strategic Planner", icon: "🗺️", color: "#a78bfa" }, lessons: [] },
  { id: "module-3", number: 3, title: "Elicitation & Collaboration", subtitle: "Finding the truth between the stories", description: "Month 3. You run your first stakeholder interviews. Kofi tells you one thing. Fatima tells you something completely different.", duration: "65 to 80 minutes", sdlcPhase: "Month 3 — Elicitation", tier: "pro", badgeOnCompletion: { id: "elicitation-specialist", name: "Elicitation Specialist", icon: "🎤", color: "#38bdf8" }, lessons: [] },
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