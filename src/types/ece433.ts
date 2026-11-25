export type CourseId = 'ece423' | 'ece433';

export enum ControlModule {
  PID = 'pid',
  FREQ_COMP = 'freq_comp',
  STATE_SPACE = 'state_space',
  DESIGN_OBS = 'design_obs',
}

export enum ControlLabType {
  PID_WINDUP = 'pid_windup',
  BODE_COMP = 'bode_comp',
  STATE_CANONICAL = 'state_canonical',
  POLE_OBSERVER = 'pole_observer',
}

export interface ControlSyllabusTopic {
  id: string;
  module: ControlModule;
  title: string;
  keyFormula?: string;
  catPriority: 'Critical' | 'High' | 'Exam Core';
  summary: string;
  recommendedLab?: ControlLabType;
  recommendedCalc?: string;
}

export interface ControlPrinciple {
  id: string;
  module: ControlModule;
  title: string;
  plainEnglishIntuition: string;
  physicalMechanism: string;
  whyItMatters: string;
  commonMisconception: string;
  pioneerHighlight: string;
  recommendedLab?: ControlLabType;
  recommendedCalc?: string;
}

export interface ControlMilestone {
  id: string;
  year: string;
  yearNumeric: number;
  era: '1860s–1930s' | '1940s–1950s' | '1960s–Modern';
  module: ControlModule;
  pioneer: string;
  affiliation: string;
  breakthrough: string;
  storyAndContext: string;
  ece433Connection: string;
  recommendedLab?: ControlLabType;
}

export interface OpAmpRealization {
  id: string;
  topology: 'P' | 'PI' | 'PD' | 'PID_PARALLEL' | 'PID_SERIES' | 'LEAD_LAG';
  title: string;
  transferFunction: string;
  gainFormulas: string[];
  designNotes: string;
  antiWindupNote: string;
}

export interface ControlEssayPrompt {
  id: string;
  module: ControlModule;
  catRelevance: 'CAT High-Yield' | 'Final Exam Core';
  title: string;
  question: string;
  marksGuide: string;
  keyPoints: string[];
  modelAnswer: string;
  recommendedLab?: ControlLabType;
}

export interface ControlFlashcard {
  id: string;
  syllabusTopicId: string;
  module: ControlModule;
  title: string;
  catPriority: 'Critical' | 'High' | 'Exam Core';
  formulaDisplay: string;
  variableLegend: string[];
  promptQuestion: string;
  practicalApplication: string;
  systemConsequence: string;
  catTrap: string;
  recommendedLab?: ControlLabType;
  recommendedCalc?: string;
}

export interface ControlWorkedExample {
  id: string;
  module: ControlModule;
  title: string;
  catRelevance: 'CAT High-Yield' | 'Final Exam Core';
  problemStatement: string;
  given: string[];
  find: string[];
  governingEquations: string[];
  steps: {
    label: string;
    calculation: string;
    note?: string;
  }[];
  finalAnswer: string;
  examTrap: string;
}

export interface ControlQuizQuestion {
  id: string;
  module: ControlModule;
  topic: string;
  catHighYield: boolean;
  difficulty: 'Standard' | 'Analytical';
  question: string;
  options: string[];
  correctIndex: number;
  formulaHint: string;
  explanation: string;
}

export interface ControlMissedTopic {
  questionId: string;
  topic: string;
  module: ControlModule;
}

export interface ControlFailedAttempt {
  id: string;
  title: string;
  module: ControlModule;
  source: 'calculator' | 'example' | 'essay';
  recommendedCalc?: string;
  recommendedLab?: ControlLabType;
  failCount: number;
  lastFailedAt: number;
  lastReason: string;
}

export interface ControlQuizAttempt {
  id: string;
  mode: 'cat_sprint' | 'full_exam' | 'module_drill' | 'state_space_drill';
  timestamp: number;
  score: number;
  total: number;
  durationSeconds: number;
  moduleBreakdown: Record<ControlModule, { correct: number; total: number }>;
  missedTopics?: ControlMissedTopic[];
  correctQuestionIds?: string[];
}

export interface ControlProgressState {
  completedTopics: string[];
  masteredExamples: string[];
  masteredEssays: string[];
  quizAttempts: ControlQuizAttempt[];
  failedSolverAttempts: ControlFailedAttempt[];
  resolvedWeakQuizIds: string[];
}
