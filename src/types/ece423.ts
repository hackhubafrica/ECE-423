export enum SyllabusModule {
  PCM = 'pcm',
  COMPRESSION = 'compression',
  MODULATION = 'modulation',
}

export enum WorkspaceTab {
  SPRINT = 'sprint',
  THEORY = 'theory',
  LABS = 'labs',
  BENCH = 'bench',
  SOLVER = 'solver',
  QUIZ = 'quiz',
}

export enum LabType {
  SAMPLING_PCM = 'sampling_pcm',
  COMPANDING = 'companding',
  LINE_CODING = 'line_coding',
  DELTA_MOD = 'delta_mod',
  DIGITAL_MOD = 'digital_mod',
}

export type LineCodingScheme = 'unipolar_nrz' | 'polar_nrz' | 'polar_rz' | 'manchester' | 'bipolar_ami';

export type DigitalModScheme = 'ask' | 'bpsk' | 'qpsk' | 'dpsk' | 'bfsk_coh' | 'bfsk_noncoh' | 'msk' | 'qam16';

export interface SyllabusTopic {
  id: string;
  module: SyllabusModule;
  title: string;
  keyFormula?: string;
  catPriority: 'Critical' | 'High' | 'Exam Core';
  summary: string;
  recommendedLab?: LabType;
  recommendedCalc?: string;
}

export interface WorkedExample {
  id: string;
  module: SyllabusModule;
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

export interface QuizQuestion {
  id: string;
  module: SyllabusModule;
  topic: string;
  catHighYield: boolean;
  difficulty: 'Standard' | 'Analytical';
  question: string;
  options: string[];
  correctIndex: number;
  formulaHint: string;
  explanation: string;
}

export interface MissedQuizTopic {
  questionId: string;
  topic: string;
  module: SyllabusModule;
}

export interface FailedSolverAttempt {
  id: string;
  title: string;
  module: SyllabusModule;
  source: 'calculator' | 'example' | 'essay';
  recommendedCalc?: string;
  recommendedLab?: LabType;
  failCount: number;
  lastFailedAt: number;
  lastReason: string;
}

export interface QuizAttempt {
  id: string;
  mode: 'cat_sprint' | 'full_exam' | 'module_drill';
  timestamp: number;
  score: number;
  total: number;
  durationSeconds: number;
  moduleBreakdown: Record<SyllabusModule, { correct: number; total: number }>;
  missedTopics?: MissedQuizTopic[];
  correctQuestionIds?: string[];
}

export type HistoryEra = '1920s–1940s' | '1950s–1960s' | '1970s–Modern';

export interface TheoryPrinciple {
  id: string;
  module: SyllabusModule;
  title: string;
  plainEnglishIntuition: string;
  physicalMechanism: string;
  whyItMatters: string;
  commonMisconception: string;
  pioneerHighlight: string;
  recommendedLab?: LabType;
  recommendedCalc?: string;
}

export interface HistoricalMilestone {
  id: string;
  year: string;
  yearNumeric: number;
  era: HistoryEra;
  module: SyllabusModule;
  pioneer: string;
  affiliation: string;
  breakthrough: string;
  storyAndContext: string;
  ece423Connection: string;
  recommendedLab?: LabType;
}

export interface EssayPrompt {
  id: string;
  module: SyllabusModule;
  catRelevance: 'CAT High-Yield' | 'Final Exam Core';
  title: string;
  question: string;
  marksGuide: string;
  keyPoints: string[];
  modelAnswer: string;
  recommendedLab?: LabType;
}

export interface FlashcardItem {
  id: string;
  syllabusTopicId: string;
  module: SyllabusModule;
  title: string;
  catPriority: 'Critical' | 'High' | 'Exam Core';
  formulaDisplay: string;
  variableLegend: string[];
  promptQuestion: string;
  practicalApplication: string;
  systemConsequence: string;
  catTrap: string;
  recommendedLab?: LabType;
  recommendedCalc?: string;
}

export interface StudyProgressState {
  completedTopics: string[];
  masteredExamples: string[];
  masteredEssays: string[];
  quizAttempts: QuizAttempt[];
  failedSolverAttempts: FailedSolverAttempt[];
  resolvedWeakQuizIds: string[];
}

