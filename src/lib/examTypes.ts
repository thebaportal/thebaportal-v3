export type BABOKArea =
  | "planning" | "elicitation" | "lifecycle" | "strategy"
  | "analysis" | "evaluation" | "agile" | "bi"
  | "architecture" | "it" | "bpm" | "competencies";

export type Difficulty = "ecba" | "ccba" | "cbap";

export interface ExamQuestion {
  id: string;
  area: BABOKArea;
  difficulty: Difficulty;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  babokRef: string;
  technique: string;
}

export const AREA_LABELS: Record<BABOKArea, string> = {
  planning:      "Business Analysis Planning and Monitoring",
  elicitation:   "Elicitation and Collaboration",
  lifecycle:     "Requirements Life Cycle Management",
  strategy:      "Strategy Analysis",
  analysis:      "Requirements Analysis and Design Definition",
  evaluation:    "Solution Evaluation",
  agile:         "Agile Perspective",
  bi:            "Business Intelligence Perspective",
  architecture:  "Business Architecture Perspective",
  it:            "Information Technology Perspective",
  bpm:           "Business Process Management Perspective",
  competencies:  "Underlying Competencies",
};

export const AREA_SHORT: Record<BABOKArea, string> = {
  planning:      "Planning",
  elicitation:   "Elicitation",
  lifecycle:     "Lifecycle Mgmt",
  strategy:      "Strategy",
  analysis:      "Analysis & Design",
  evaluation:    "Solution Eval",
  agile:         "Agile",
  bi:            "BI Perspective",
  architecture:  "Business Architecture",
  it:            "IT Perspective",
  bpm:           "BPM Perspective",
  competencies:  "Competencies",
};
