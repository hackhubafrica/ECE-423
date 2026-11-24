export enum SyllabusModule {
  PCM = 'pcm',
  COMPRESSION = 'compression',
  MODULATION = 'modulation',
}

export enum WorkspaceTab {
  SPRINT = 'sprint',
  LABS = 'labs',
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
  source: 'calculator' | 'example';
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

export interface StudyProgressState {
  completedTopics: string[];
  masteredExamples: string[];
  quizAttempts: QuizAttempt[];
  failedSolverAttempts: FailedSolverAttempt[];
  resolvedWeakQuizIds: string[];
}
