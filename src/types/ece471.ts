export enum PowerModule {
  LINE_CORONA = 'line_corona',
  DISPATCH_AGC = 'dispatch_agc',
  SYMMETRICAL = 'symmetrical',
  FAULTS = 'faults',
  TRANSIENTS = 'transients',
  PROTECTION = 'protection',
}

export enum PowerLabType {
  LINE_CORONA = 'line_corona',
  DISPATCH_AGC = 'dispatch_agc',
  SYMMETRICAL_FAULTS = 'symmetrical_faults',
  TRANSIENTS_PROTECTION = 'transients_protection',
}

export interface PowerSyllabusTopic {
  id: string;
  module: PowerModule;
  title: string;
  keyFormula?: string;
  catPriority: 'Critical' | 'High' | 'Exam Core';
  summary: string;
  recommendedLab?: PowerLabType;
  recommendedCalc?: string;
}

export interface PowerPrinciple {
  id: string;
  module: PowerModule;
  title: string;
  plainEnglishIntuition: string;
  physicalMechanism: string;
  whyItMatters: string;
  commonMisconception: string;
  pioneerHighlight: string;
  recommendedLab?: PowerLabType;
  recommendedCalc?: string;
}

export interface PowerMilestone {
  id: string;
  year: string;
  yearNumeric: number;
  era: '1880s–1920s' | '1930s–1960s' | '1970s–Modern';
  module: PowerModule;
  pioneer: string;
  affiliation: string;
  breakthrough: string;
  storyAndContext: string;
  ece471Connection: string;
  recommendedLab?: PowerLabType;
}

export interface PowerEssayPrompt {
  id: string;
  module: PowerModule;
  catRelevance: 'CAT 1 High-Yield' | 'Final Exam Core';
  title: string;
  question: string;
  marksGuide: string;
  keyPoints: string[];
  modelAnswer: string;
  recommendedLab?: PowerLabType;
}

export interface PowerFlashcard {
  id: string;
  syllabusTopicId: string;
  module: PowerModule;
  title: string;
  catPriority: 'Critical' | 'High' | 'Exam Core';
  formulaDisplay: string;
  variableLegend: string[];
  promptQuestion: string;
  practicalApplication: string;
  systemConsequence: string;
  catTrap: string;
  recommendedLab?: PowerLabType;
  recommendedCalc?: string;
}

export interface PowerWorkedExample {
  id: string;
  module: PowerModule;
  title: string;
  catRelevance: 'CAT 1 Exact Match' | 'CAT 1 High-Yield' | 'Final Exam Core';
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

export interface PowerQuizQuestion {
  id: string;
  module: PowerModule;
  topic: string;
  catHighYield: boolean;
  difficulty: 'Standard' | 'Analytical';
  question: string;
  options: string[];
  correctIndex: number;
  formulaHint: string;
  explanation: string;
}

export interface PowerMissedTopic {
  questionId: string;
  topic: string;
  module: PowerModule;
}

export interface PowerFailedAttempt {
  id: string;
  title: string;
  module: PowerModule;
  source: 'calculator' | 'example' | 'essay';
  recommendedCalc?: string;
  recommendedLab?: PowerLabType;
  failCount: number;
  lastFailedAt: number;
  lastReason: string;
}

export interface PowerQuizAttempt {
  id: string;
  mode: 'cat_sprint' | 'faults_drill' | 'dispatch_prot_drill' | 'full_exam';
  timestamp: number;
  score: number;
  total: number;
  durationSeconds: number;
  moduleBreakdown: Record<PowerModule, { correct: number; total: number }>;
  missedTopics?: PowerMissedTopic[];
  correctQuestionIds?: string[];
}

export interface PowerProgressState {
  completedTopics: string[];
  masteredExamples: string[];
  masteredEssays: string[];
  quizAttempts: PowerQuizAttempt[];
  failedSolverAttempts: PowerFailedAttempt[];
  resolvedWeakQuizIds: string[];
}
