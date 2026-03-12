"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, ChevronRight, ChevronLeft, Check,
  LayoutDashboard, TrendingUp, Target, GraduationCap,
  BriefcaseBusiness, Trophy, Lock, ArrowLeft,
  Clock, Award, Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Mock data (replace with real import) ────────────────────────────────────
const MODULES: Module[] = [
  {
    id: "module-1", number: 1, title: "BA Foundations",
    subtitle: "Understanding the role before picking up the tools",
    description: "You just joined Vela. Nobody agrees on what the product is. Your job is to figure out what problem they are actually solving before anyone writes a single requirement.",
    duration: "55 to 70 minutes", sdlcPhase: "Month 1 — Discovery", tier: "free",
    badgeOnCompletion: { id: "ba-foundations", name: "BA Foundations", icon: "🎯", color: "#1fbf9f" },
    lessons: [
      {
        id: "m1-l1", number: 1, title: "Welcome to Vela", readingTime: "3 minutes",
        whereWeAre: null,
        story: `It is Monday morning in Lagos and you are sitting in a glass-walled meeting room on the fourteenth floor. The city moves below you. Traffic. Heat. Noise.\n\nAmara Osei walks in holding two coffees and a printed slide deck. She is the Chief Product Officer and she has the energy of someone who has not slept much but does not mind.\n\nShe slides a coffee toward you and opens with three words.\n\n"We are lending now."\n\nVela processes mobile payments for small businesses across West Africa and the UK diaspora community. Two million transactions a month. Series B funded. The board wants a Merchant Cash Advance product live in nine months. Small business owners would receive instant working capital loans based on their transaction history. No bank statements. No long applications. Just data and a decision.\n\nIt sounds clean. It is not.\n\nBefore Amara finishes her sentence, David Mensah appears in the doorway. He is the CTO and he has the expression of someone who has already identified three problems with whatever is being said.\n\n"Transaction data alone does not tell the full story," he says. "Some of our merchants use three other payment apps. We are only seeing part of their revenue picture."\n\nAmara waves her hand. "That is why we have a Business Analyst."\n\nBoth of them look at you.\n\nThis is your first hour at Vela. You have two weeks to find out whether this product is viable before engineering spends a single dollar.`,
        concept: {
          title: "What does a Business Analyst actually do?",
          body: `A Business Analyst is the person who figures out the real problem before anyone starts building the solution.\n\nThat sounds simple. In practice it is one of the hardest things to do in any organisation, because most people arrive at meetings already talking about solutions. They want features. They want screens. They want to build things. Your job is to slow that down just enough to ask a better question.\n\nHere is the simplest way to think about it. The BA sits at the intersection of three things: what the business needs, what technology can realistically deliver, and what real people will actually use. Your job is to understand all three and find the space where they overlap.\n\nAt Vela right now, Amara represents the business ambition. David represents the technical reality. And somewhere out in Lagos, a merchant named Fatima Bello represents the human truth this product has to serve.\n\nYou have not met Fatima yet. But every decision you make will affect her.`,
        },
        example: {
          title: "The first thing a BA does",
          body: `After that first meeting, you do not open a requirements template. You do not start drawing diagrams.\n\nYou write three questions on a notepad.\n\nWhat problem are we actually solving? For whom? And how will we know when we have solved it?\n\nThose three questions are the foundation of everything. Before stakeholder maps, before user stories, before process diagrams — you need to be clear on what sits at the centre of this project.\n\nAt Vela, the problem is this: small business owners cannot access fast, affordable working capital because traditional banks require documentation that informal businesses cannot easily produce.\n\nThat is real. Fatima has lived it. Thousands of merchants like her have lived it. The question is whether Vela can solve it safely, legally, and within nine months.\n\nThat is your assignment.`,
        },
        artifact: {
          type: "problem-statement", title: "BA Artifact: The Problem Statement",
          description: "A problem statement gives the whole team shared language so everyone is solving the same problem.",
          template: {
            headers: ["Element", "Vela Example"],
            rows: [
              ["The problem of", "Small business owners on the Vela platform cannot access fast working capital"],
              ["Affects", "Merchants across West Africa and the UK diaspora community"],
              ["The impact is", "Missed opportunities, reliance on expensive informal credit, and lost revenue for Vela"],
              ["A successful solution would", "Offer instant advances based on Vela transaction history, within regulatory requirements in Nigeria and the UK"],
            ],
          },
        },
        knowledgeCheck: {
          multipleChoice: [
            {
              id: "m1-l1-q1",
              question: "What is the primary role of a Business Analyst?",
              options: ["To document what stakeholders say and pass it to developers", "To enable change by defining needs and recommending solutions that deliver value", "To manage the project timeline and budget", "To test the product before it goes live"],
              correctIndex: 1,
              explanation: "A BA does far more than documentation. The role is about enabling change — understanding what is really needed and helping the organisation get there.",
            },
            {
              id: "m1-l1-q2",
              question: "David raises a concern about transaction data in the first meeting. What is the BA's most useful response?",
              options: ["Reassure David the data will be sufficient and move on", "Let Amara and David resolve it between themselves", "Document the concern as a risk and investigate it during discovery", "Tell David to raise it in the next engineering meeting"],
              correctIndex: 2,
              explanation: "David's concern is a legitimate project risk. A good BA captures it, investigates it, and brings evidence back to the team.",
            },
          ],
          scenarioQuestion: {
            id: "m1-l1-s1",
            prompt: "End of your first day at Vela. Amara asks you to share initial thoughts on project scope by Friday. You have spoken to Amara and David but nobody else. What do you do before Friday?",
            options: [
              { id: "a", text: "Draft a scope document based on what Amara described in the morning meeting", feedback: "This is a common early mistake. You only have one perspective and it is the most optimistic one. Scoping without broader input almost always means missing critical constraints." },
              { id: "b", text: "Identify the stakeholders you have not spoken to yet and schedule brief conversations before Friday", feedback: "Strong instinct. You cannot define scope responsibly with two voices. Priya in compliance, Kofi in sales, and a merchant like Fatima all hold pieces of the picture you do not have yet." },
              { id: "c", text: "Tell Amara you need more time and push the conversation to the following week", feedback: "Asking for more time is sometimes right, but the better move is to share what you have learned while being clear about what you still need to find out." },
              { id: "d", text: "Research the Merchant Cash Advance industry and bring market data to Friday", feedback: "Market research has value but it is secondary at this stage. Your first priority is understanding the internal landscape and the people involved." },
            ],
            bestOptionId: "b",
          },
        },
        challengeConnection: { challengeId: "banking-discovery-001", text: "This lesson connects to the Banking Discovery challenge. You will face a similar situation — joining a project where the problem is not clearly defined and stakeholders have different versions of the truth." },
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
  { icon: LayoutDashboard, label: "Dashboard",      href: "/dashboard" },
  { icon: BookOpen,        label: "Challenges",     href: "/scenarios" },
  { icon: TrendingUp,      label: "Progress",       href: "/progress" },
  { icon: GraduationCap,   label: "Learning",       href: "/learning", active: true },
  { icon: Target,          label: "Exam Prep",      href: "/exam",      locked: true },
  { icon: BriefcaseBusiness, label: "Career Suite", href: "/career",    locked: true },
  { icon: Trophy,          label: "Portfolio",      href: "/portfolio", locked: true },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

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
                <th key={i} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", borderBottom: "1px solid var(--border)" }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {artifact.template.rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: ri < artifact.template.rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: "12px 16px", fontSize: "13px", color: ci === 0 ? "var(--text-2)" : "var(--text-1)", fontWeight: ci === 0 ? 600 : 400, lineHeight: 1.55, verticalAlign: "top" }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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

      {/* Multiple choice */}
      {check.multipleChoice.map((q, qi) => {
        const answered = mcqAnswers[q.id] !== undefined;
        const revealed = mcqRevealed[q.id];
        return (
          <div key={q.id} style={{ marginBottom: "24px", padding: "20px", borderRadius: "14px", background: "var(--bg-2)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)", marginBottom: "14px", lineHeight: 1.55 }}>
              <span style={{ color: "var(--teal)", fontFamily: "var(--font-mono)", marginRight: "8px" }}>{qi + 1}.</span>
              {q.question}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {q.options.map((opt, oi) => {
                const isSelected = mcqAnswers[q.id] === oi;
                const isCorrect = oi === q.correctIndex;
                let bg = "rgba(255,255,255,0.03)";
                let border = "1px solid var(--border)";
                let color = "var(--text-2)";
                if (revealed) {
                  if (isCorrect) { bg = "rgba(31,191,159,0.1)"; border = "1px solid rgba(31,191,159,0.3)"; color = "var(--teal)"; }
                  else if (isSelected) { bg = "rgba(248,113,113,0.08)"; border = "1px solid rgba(248,113,113,0.2)"; color = "#f87171"; }
                } else if (isSelected) {
                  bg = "rgba(255,255,255,0.06)"; border = "1px solid rgba(255,255,255,0.15)";
                }
                return (
                  <button
                    key={oi}
                    onClick={() => handleMcq(q.id, oi)}
                    disabled={!!mcqAnswers[q.id]}
                    style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 14px", borderRadius: "10px", background: bg, border, cursor: mcqAnswers[q.id] !== undefined ? "default" : "pointer", textAlign: "left", transition: "all 0.2s" }}
                  >
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

      {/* Scenario question */}
      <div style={{ padding: "20px", borderRadius: "14px", background: "rgba(124,110,245,0.05)", border: "1px solid rgba(124,110,245,0.15)", marginBottom: "24px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#7c6ef5", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: "10px" }}>SCENARIO — WHAT WOULD YOU DO?</div>
        <p style={{ fontSize: "14px", color: "var(--text-1)", lineHeight: 1.7, marginBottom: "16px", fontWeight: 500 }}>{check.scenarioQuestion.prompt}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {check.scenarioQuestion.options.map(opt => {
            const isSelected = scenarioAnswer === opt.id;
            const isBest = opt.id === check.scenarioQuestion.bestOptionId;
            const revealed = scenarioRevealed;
            let bg = "rgba(255,255,255,0.03)";
            let border = "1px solid var(--border)";
            if (revealed && isBest) { bg = "rgba(31,191,159,0.1)"; border = "1px solid rgba(31,191,159,0.25)"; }
            else if (revealed && isSelected) { bg = "rgba(255,255,255,0.04)"; }
            else if (isSelected) { bg = "rgba(124,110,245,0.08)"; border = "1px solid rgba(124,110,245,0.2)"; }
            return (
              <div key={opt.id}>
                <button
                  onClick={() => handleScenario(opt.id)}
                  disabled={scenarioRevealed}
                  style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px", borderRadius: "10px", background: bg, border, cursor: scenarioRevealed ? "default" : "pointer", textAlign: "left", transition: "all 0.2s" }}
                >
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
        <motion.button
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          onClick={handleComplete}
          style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "var(--teal)", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 700, color: "var(--bg)", fontFamily: "var(--font-display)", letterSpacing: "-0.01em", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          <Check size={16} />
          Mark lesson complete
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

// ─── Main Component ───────────────────────────────────────────────────────────
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

  function handleLessonComplete() {
    if (!selectedLesson) return;
    const newCompleted = [...completedLessons, selectedLesson.id];
    setCompletedLessons(newCompleted);

    if (!selectedModule) return;
    const currentIdx = selectedModule.lessons.findIndex(l => l.id === selectedLesson.id);
    if (currentIdx < selectedModule.lessons.length - 1) {
      setTimeout(() => openLesson(selectedModule.lessons[currentIdx + 1]), 800);
    }
  }

  const renderSectionContent = () => {
    if (!selectedLesson) return null;
    const lesson = selectedLesson;

    switch (activeSection) {
      case "story":
        return (
          <div>
            {lesson.whereWeAre && (
              <div style={{ padding: "14px 18px", borderRadius: "12px", background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)", marginBottom: "28px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#38bdf8", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>WHERE WE LEFT OFF</div>
                <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.7 }}>{lesson.whereWeAre}</p>
              </div>
            )}
            <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "16px", lineHeight: 1.85, color: "var(--text-1)" }}>
              {lesson.story.split("\n\n").map((para, i) => (
                <p key={i} style={{ marginBottom: "20px" }}>{para}</p>
              ))}
            </div>
          </div>
        );

      case "concept":
        return (
          <div>
            <h3 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-1)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em", marginBottom: "20px" }}>{lesson.concept.title}</h3>
            <div style={{ fontSize: "15px", lineHeight: 1.85, color: "var(--text-2)" }}>
              {lesson.concept.body.split("\n\n").map((para, i) => (
                <p key={i} style={{ marginBottom: "18px" }}>{para}</p>
              ))}
            </div>
          </div>
        );

      case "example":
        return (
          <div>
            <h3 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-1)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em", marginBottom: "20px" }}>{lesson.example.title}</h3>
            <div style={{ fontSize: "15px", lineHeight: 1.85, color: "var(--text-2)" }}>
              {lesson.example.body.split("\n\n").map((para, i) => (
                <p key={i} style={{ marginBottom: "18px" }}>{para}</p>
              ))}
            </div>
          </div>
        );

      case "artifact":
        return (
          <div>
            <ArtifactTable artifact={lesson.artifact} />
            <div style={{ padding: "14px 18px", borderRadius: "12px", background: "rgba(31,191,159,0.05)", border: "1px solid rgba(31,191,159,0.12)", marginTop: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>CHALLENGE CONNECTION</div>
              <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.65 }}>{lesson.challengeConnection.text}</p>
              <button onClick={() => router.push(`/scenarios/${lesson.challengeConnection.challengeId}?mode=normal`)}
                style={{ marginTop: "10px", fontSize: "12px", fontWeight: 700, color: "var(--teal)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                Try the challenge <ChevronRight size={12} />
              </button>
            </div>
          </div>
        );

      case "check":
        return <KnowledgeCheckPanel check={lesson.knowledgeCheck} onComplete={handleLessonComplete} />;
    }
  };

  // ── Module grid view ────────────────────────────────────────────────────────
  if (!selectedModule) {
    return (
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
            <button onClick={() => router.push("/dashboard")} className="btn-ghost p-2" style={{ borderRadius: "10px" }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "22px", color: "var(--text-1)", letterSpacing: "-0.03em", lineHeight: 1 }}>Learning Academy</h1>
              <p className="type-body" style={{ marginTop: "4px" }}>One story. Six modules. The full BA journey.</p>
            </div>
          </header>

          <div className="px-8 py-8" style={{ maxWidth: "900px" }}>

            {/* Vela story banner */}
            <div className="relative rounded-2xl overflow-hidden mb-8 p-7" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(31,191,159,0.05) 0%, transparent 70%)" }} />
              <div className="relative">
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)", marginBottom: "8px" }}>YOUR CASE STORY</div>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "22px", color: "var(--text-1)", letterSpacing: "-0.03em", marginBottom: "10px" }}>
                  You are the BA at <span style={{ color: "var(--teal)" }}>Vela</span>
                </h2>
                <p style={{ fontSize: "14px", color: "var(--text-2)", lineHeight: 1.7, maxWidth: "540px", marginBottom: "16px" }}>
                  Vela is a Lagos-based fintech expanding across West Africa and the UK. The board just approved a Merchant Cash Advance product. Nine months. High stakes. You just got hired to make sense of it all.
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  {["Amara — CPO", "David — CTO", "Priya — Compliance", "Kofi — Sales", "Fatima — Your merchant", "James — FCA"].map(name => (
                    <span key={name} style={{ fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", color: "var(--text-3)", border: "1px solid var(--border)" }}>{name}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Module cards */}
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)", marginBottom: "16px" }}>6 MODULES — FOLLOWING THE SDLC</div>
            <div className="space-y-3">
              {MODULES.map((mod, i) => {
                const isLocked = mod.tier === "pro" && !isPro;
                const modLessons = mod.lessons;
                const completedCount = modLessons.filter(l => completedLessons.includes(l.id)).length;
                const isStarted = completedCount > 0;
                const isModComplete = modLessons.length > 0 && completedCount === modLessons.length;

                return (
                  <motion.button
                    key={mod.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => openModule(mod)}
                    disabled={isLocked}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: "16px",
                      padding: "18px 20px", borderRadius: "16px", textAlign: "left",
                      background: isModComplete ? "rgba(31,191,159,0.06)" : "var(--surface)",
                      border: isModComplete ? "1px solid rgba(31,191,159,0.2)" : "1px solid var(--border)",
                      cursor: isLocked ? "not-allowed" : "pointer",
                      opacity: isLocked ? 0.5 : 1,
                      transition: "all 0.2s",
                    }}
                    whileHover={isLocked ? {} : { y: -2, transition: { duration: 0.15 } }}
                  >
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
                      {isStarted && !isModComplete && modLessons.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <div style={{ flex: 1, height: "2px", borderRadius: "1px", background: "rgba(255,255,255,0.05)", maxWidth: "120px" }}>
                            <div style={{ height: "100%", borderRadius: "1px", background: "var(--teal)", width: `${(completedCount / modLessons.length) * 100}%` }} />
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>{completedCount}/{modLessons.length}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1" style={{ fontSize: "12px", color: "var(--text-4)" }}>
                        <Clock size={11} />
                        <span>{mod.duration.split(" ")[0]} min</span>
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
                  <Zap size={14} />Upgrade to Pro
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── Lesson reader view ──────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>

      {/* Chapter sidebar */}
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
              <button
                key={lesson.id}
                onClick={() => openLesson(lesson)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 12px", borderRadius: "10px", textAlign: "left",
                  background: isActive ? "var(--teal-soft)" : "none",
                  border: isActive ? "1px solid var(--teal-border)" : "1px solid transparent",
                  cursor: "pointer",
                }}
              >
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, background: isComplete ? "var(--teal)" : isActive ? "var(--teal-soft)" : "rgba(255,255,255,0.05)", border: isComplete ? "none" : `1px solid ${isActive ? "var(--teal-border)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isComplete
                    ? <Check size={11} style={{ color: "var(--bg)" }} />
                    : <span style={{ fontSize: "10px", fontWeight: 700, color: isActive ? "var(--teal)" : "var(--text-4)", fontFamily: "var(--font-mono)" }}>{i + 1}</span>}
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

      {/* Reading pane */}
      <main className="flex-1 overflow-y-auto">

        {/* Lesson header */}
        <div className="px-10 pt-8 pb-0 sticky top-0 z-10" style={{ background: "rgba(9,9,11,0.94)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
          <div className="flex items-center gap-3 mb-5">
            <span style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>
              Module {selectedModule.number} / Lesson {selectedLesson?.number}
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-4)" }}>·</span>
            <span style={{ fontSize: "11px", color: "var(--text-4)" }}>{selectedLesson?.readingTime} read</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "26px", color: "var(--text-1)", letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: "16px" }}>
            {selectedLesson?.title}
          </h1>

          {/* Section tabs */}
          <div className="flex items-center gap-1">
            {sections.map(sec => (
              <button
                key={sec}
                onClick={() => setActiveSection(sec)}
                style={{
                  padding: "8px 14px", borderRadius: "8px 8px 0 0",
                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  background: activeSection === sec ? "var(--bg)" : "none",
                  border: activeSection === sec ? "1px solid var(--border)" : "1px solid transparent",
                  borderBottom: activeSection === sec ? "1px solid var(--bg)" : "1px solid transparent",
                  color: activeSection === sec ? "var(--text-1)" : "var(--text-4)",
                  marginBottom: activeSection === sec ? "-1px" : "0",
                  transition: "all 0.15s",
                }}
              >
                {sectionLabels[sec]}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-10 py-8" style={{ maxWidth: "680px" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedLesson?.id}-${activeSection}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderSectionContent()}
            </motion.div>
          </AnimatePresence>

          {/* Section navigation */}
          <div className="flex items-center justify-between mt-10 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => {
                const idx = sections.indexOf(activeSection);
                if (idx > 0) setActiveSection(sections[idx - 1]);
              }}
              disabled={sections.indexOf(activeSection) === 0}
              className="btn-ghost"
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", opacity: sections.indexOf(activeSection) === 0 ? 0.3 : 1 }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>
              {sections.indexOf(activeSection) + 1} of {sections.length}
            </span>
            <button
              onClick={() => {
                const idx = sections.indexOf(activeSection);
                if (idx < sections.length - 1) setActiveSection(sections[idx + 1]);
              }}
              disabled={sections.indexOf(activeSection) === sections.length - 1}
              className="btn-ghost"
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", opacity: sections.indexOf(activeSection) === sections.length - 1 ? 0.3 : 1 }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}