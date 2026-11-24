import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  PlayCircle,
  Sliders,
} from 'lucide-react';
import { MODULE_META } from '../data/syllabusData';
import { QUIZ_QUESTIONS } from '../data/quizQuestions';
import {
  LabType,
  StudyProgressState,
  SyllabusModule,
} from '../types/ece423';

interface WeakTopicsSidebarProps {
  progress: StudyProgressState;
  onOpenLab: (lab: LabType) => void;
  onOpenCalculator: (calcId?: string) => void;
  onOpenTheory?: (subTab?: 'principles' | 'timeline' | 'essays') => void;
  onStartCatQuiz: () => void;
  onFocusSyllabusTopic: (syllabusTopicId: string) => void;
  onResolveQuizTopic: (questionIds: string[]) => void;
  onResolveSolverAttempt: (id: string) => void;
}

interface AggregatedWeakQuizTopic {
  topicKey: string;
  questionIds: string[];
  topic: string;
  module: SyllabusModule;
  missCount: number;
  isRecurring: boolean;
  formulaHint: string;
  syllabusTopicId: string;
  recommendedLab?: LabType;
  recommendedCalc?: string;
}

const TOPIC_TO_PRACTICE: Record<
  string,
  { syllabusTopicId: string; lab?: LabType; calc?: string }
> = {
  'Sampling Theorem': {
    syllabusTopicId: 'pcm-nyquist',
    lab: LabType.SAMPLING_PCM,
    calc: 'pcm_snr',
  },
  'Uniform Quantization': {
    syllabusTopicId: 'pcm-quantization',
    lab: LabType.SAMPLING_PCM,
    calc: 'pcm_snr',
  },
  'Quantization Noise': {
    syllabusTopicId: 'pcm-quantization',
    lab: LabType.SAMPLING_PCM,
    calc: 'pcm_snr',
  },
  'PCM Bit Rate': {
    syllabusTopicId: 'pcm-quantization',
    lab: LabType.SAMPLING_PCM,
    calc: 'pcm_snr',
  },
  'Overall PCM SNR & Threshold': {
    syllabusTopicId: 'pcm-noise-threshold',
    calc: 'pcm_snr',
  },
  'TDM Multiplexing': {
    syllabusTopicId: 'pcm-tdm',
    calc: 'tdm_frame',
  },
  Synchronization: {
    syllabusTopicId: 'pcm-tdm',
    lab: LabType.LINE_CODING,
    calc: 'tdm_frame',
  },
  Companding: {
    syllabusTopicId: 'pcm-companding',
    lab: LabType.COMPANDING,
    calc: 'companding',
  },
  'Line Coding': {
    syllabusTopicId: 'pcm-line-coding',
    lab: LabType.LINE_CODING,
  },
  "Shannon's Law": {
    syllabusTopicId: 'comp-shannon',
    calc: 'shannon',
  },
  'Shannon Limit': {
    syllabusTopicId: 'comp-shannon',
    calc: 'shannon',
  },
  'Delta Modulation': {
    syllabusTopicId: 'comp-dm',
    lab: LabType.DELTA_MOD,
    calc: 'delta_mod',
  },
  'Delta Modulation Numerical': {
    syllabusTopicId: 'comp-dm',
    lab: LabType.DELTA_MOD,
    calc: 'delta_mod',
  },
  'DPCM & Prediction': {
    syllabusTopicId: 'comp-dpcm',
    calc: 'examples',
  },
  'ADPCM vs DM': {
    syllabusTopicId: 'comp-adaptive',
    lab: LabType.DELTA_MOD,
    calc: 'examples',
  },
  'Non-Waveform Coding': {
    syllabusTopicId: 'comp-nonwaveform',
    calc: 'examples',
  },
  'CELP Speech Coding': {
    syllabusTopicId: 'comp-nonwaveform',
    calc: 'examples',
  },
  'JPEG Image Coding': {
    syllabusTopicId: 'comp-nonwaveform',
    calc: 'examples',
  },
  'MPEG Video Coding': {
    syllabusTopicId: 'comp-nonwaveform',
    calc: 'examples',
  },
  'Power Efficiency & BER': {
    syllabusTopicId: 'mod-binary',
    lab: LabType.DIGITAL_MOD,
    calc: 'modulation',
  },
  'Spectral Efficiency': {
    syllabusTopicId: 'mod-mary',
    lab: LabType.DIGITAL_MOD,
    calc: 'modulation',
  },
  'QPSK vs BPSK': {
    syllabusTopicId: 'mod-mary',
    lab: LabType.DIGITAL_MOD,
    calc: 'modulation',
  },
  'DPSK Detection': {
    syllabusTopicId: 'mod-binary',
    lab: LabType.DIGITAL_MOD,
    calc: 'modulation',
  },
  'MSK Properties': {
    syllabusTopicId: 'mod-mary',
    lab: LabType.DIGITAL_MOD,
    calc: 'modulation',
  },
  'Matched Filter Receiver': {
    syllabusTopicId: 'mod-receivers',
    calc: 'examples',
  },
  'ASK vs BPSK Distance': {
    syllabusTopicId: 'mod-binary',
    lab: LabType.DIGITAL_MOD,
    calc: 'modulation',
  },
  'BFSK Orthogonality': {
    syllabusTopicId: 'mod-binary',
    lab: LabType.DIGITAL_MOD,
    calc: 'modulation',
  },
  'Constellation & Gray Coding': {
    syllabusTopicId: 'mod-mary',
    lab: LabType.DIGITAL_MOD,
  },
  'Receiver Synchronization': {
    syllabusTopicId: 'mod-receivers',
    lab: LabType.DIGITAL_MOD,
  },
};

const SOLVER_TO_SYLLABUS_ID: Record<string, string> = {
  'calc:pcm_snr': 'pcm-noise-threshold',
  'calc:tdm_frame': 'pcm-tdm',
  'calc:companding': 'pcm-companding',
  'calc:shannon': 'comp-shannon',
  'calc:delta_mod': 'comp-dm',
  'calc:modulation': 'mod-metrics',
  'ex-pcm-1': 'pcm-quantization',
  'ex-pcm-2': 'pcm-tdm',
  'ex-pcm-3': 'pcm-companding',
  'ex-pcm-4': 'pcm-noise-threshold',
  'ex-comp-1': 'comp-shannon',
  'ex-comp-2': 'comp-dm',
  'ex-comp-3': 'comp-dpcm',
  'ex-comp-4': 'comp-nonwaveform',
  'ex-mod-1': 'mod-mary',
  'ex-mod-2': 'mod-binary',
  'ex-mod-3': 'mod-mary',
  'ex-mod-4': 'mod-receivers',
  'essay-pcm-1': 'pcm-noise-threshold',
  'essay-pcm-2': 'pcm-line-coding',
  'essay-pcm-3': 'pcm-tdm',
  'essay-comp-1': 'comp-dm',
  'essay-comp-2': 'comp-nonwaveform',
  'essay-comp-3': 'comp-nonwaveform',
  'essay-mod-1': 'mod-receivers',
  'essay-mod-2': 'mod-metrics',
  'essay-mod-3': 'mod-mary',
};

export const WeakTopicsSidebar: React.FC<WeakTopicsSidebarProps> = ({
  progress,
  onOpenLab,
  onOpenCalculator,
  onOpenTheory,
  onStartCatQuiz,
  onFocusSyllabusTopic,
  onResolveQuizTopic,
  onResolveSolverAttempt,
}) => {
  // Aggregate module accuracy across all recorded quiz attempts
  const moduleStats = useMemo(() => {
    const totals: Record<SyllabusModule, { correct: number; total: number }> = {
      [SyllabusModule.PCM]: { correct: 0, total: 0 },
      [SyllabusModule.COMPRESSION]: { correct: 0, total: 0 },
      [SyllabusModule.MODULATION]: { correct: 0, total: 0 },
    };

    progress.quizAttempts.forEach((att) => {
      (Object.keys(totals) as SyllabusModule[]).forEach((mod) => {
        totals[mod].correct += att.moduleBreakdown[mod]?.correct || 0;
        totals[mod].total += att.moduleBreakdown[mod]?.total || 0;
      });
    });

    return totals;
  }, [progress.quizAttempts]);

  // Aggregate missed quiz questions by topic across attempts
  const weakQuizTopics = useMemo<AggregatedWeakQuizTopic[]>(() => {
    const questionMissMap = new Map<
      string,
      { questionId: string; topic: string; module: SyllabusModule; count: number }
    >();

    // Walk chronologically so newer correct answers clear that specific question
    const chronological = [...progress.quizAttempts].reverse();
    chronological.forEach((att) => {
      att.correctQuestionIds?.forEach((qid) => {
        questionMissMap.delete(qid);
      });
      att.missedTopics?.forEach((m) => {
        if (progress.resolvedWeakQuizIds.includes(m.questionId)) return;
        const prev = questionMissMap.get(m.questionId);
        questionMissMap.set(m.questionId, {
          questionId: m.questionId,
          topic: m.topic,
          module: m.module,
          count: (prev?.count || 0) + 1,
        });
      });
    });

    // Aggregate unresolved missed questions by (module + topic)
    const topicGroups = new Map<string, AggregatedWeakQuizTopic>();
    questionMissMap.forEach((entry) => {
      const topicKey = `${entry.module}:${entry.topic}`;
      const existing = topicGroups.get(topicKey);
      const qMeta = QUIZ_QUESTIONS.find((q) => q.id === entry.questionId);
      const links = TOPIC_TO_PRACTICE[entry.topic] || {
        syllabusTopicId:
          entry.module === SyllabusModule.PCM
            ? 'pcm-nyquist'
            : entry.module === SyllabusModule.COMPRESSION
            ? 'comp-shannon'
            : 'mod-metrics',
      };

      if (existing) {
        existing.questionIds.push(entry.questionId);
        existing.missCount += entry.count;
        existing.isRecurring = existing.missCount >= 2;
      } else {
        topicGroups.set(topicKey, {
          topicKey,
          questionIds: [entry.questionId],
          topic: entry.topic,
          module: entry.module,
          missCount: entry.count,
          isRecurring: entry.count >= 2,
          formulaHint: qMeta?.formulaHint || '',
          syllabusTopicId: links.syllabusTopicId,
          recommendedLab: links.lab,
          recommendedCalc: links.calc,
        });
      }
    });

    return Array.from(topicGroups.values()).sort(
      (a, b) => b.missCount - a.missCount
    );
  }, [progress.quizAttempts, progress.resolvedWeakQuizIds]);

  const weakSolverItems = useMemo(() => {
    return [...progress.failedSolverAttempts].sort(
      (a, b) => b.failCount - a.failCount || b.lastFailedAt - a.lastFailedAt
    );
  }, [progress.failedSolverAttempts]);

  const totalWeakItems = weakQuizTopics.length + weakSolverItems.length;
  const hasQuizData = progress.quizAttempts.length > 0;

  return (
    <aside
      aria-label="Weak Topics Review Sidebar"
      className="rounded-xl border border-slate-200 bg-white p-5 space-y-5"
    >
      {/* Sidebar Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-950">Weak Topics</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Aggregated from failed solver checks &amp; missed quiz topics
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold shrink-0 ${
            totalWeakItems > 0
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {totalWeakItems > 0 ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="font-mono tabular-nums">{totalWeakItems} Flagged</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </>
          )}
        </div>
      </div>

      {/* Module Accuracy Diagnostics */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Module Quiz Accuracy</span>
          <span className="font-mono text-slate-500 tabular-nums">
            {hasQuizData ? `${progress.quizAttempts.length} attempt(s)` : 'No quizzes yet'}
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 divide-y divide-slate-200">
          {[SyllabusModule.PCM, SyllabusModule.COMPRESSION, SyllabusModule.MODULATION].map(
            (mod) => {
              const stat = moduleStats[mod];
              const pct =
                stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : null;
              const isWeak = pct !== null && pct < 75;
              const shortLabel =
                mod === SyllabusModule.PCM
                  ? 'PCM Systems'
                  : mod === SyllabusModule.COMPRESSION
                  ? 'Compression'
                  : 'Digital Modulation';

              return (
                <div
                  key={mod}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{shortLabel}</div>
                    <div className="text-[11px] text-slate-500">
                      {pct === null
                        ? 'Awaiting quiz score'
                        : isWeak
                        ? 'Below 75% CAT target'
                        : 'On track for CAT'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono text-xs font-semibold tabular-nums ${
                        pct === null
                          ? 'text-slate-400'
                          : isWeak
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {pct === null ? '—' : `${pct}%`}
                    </div>
                    {stat.total > 0 && (
                      <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                        {stat.correct}/{stat.total}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Empty State or Prioritized Weak Topics List */}
      {totalWeakItems === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3">
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-900">
              No weak topics recorded yet
            </h3>
            <p className="text-xs leading-relaxed text-slate-600">
              Any question missed in <strong>Timed Quiz</strong> or hand calculation that fails verification in <strong>Solver &amp; Formulas</strong> appears here with direct review links.
            </p>
          </div>
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={onStartCatQuiz}
              className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition-colors"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              <span>Run 20-Min CAT Diagnostic</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenCalculator('pcm_snr')}
              className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <Calculator className="h-3.5 w-3.5 text-sky-600" />
              <span>Test Formulas in Solver</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Failed Formula Solver Attempts */}
          {weakSolverItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Failed Formula &amp; Problem Checks</span>
                <span className="font-mono text-slate-500 tabular-nums">
                  {weakSolverItems.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {weakSolverItems.map((item) => {
                  const syllabusId = SOLVER_TO_SYLLABUS_ID[item.id];
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-red-200 bg-red-50/40 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                            <span>{MODULE_META[item.module].title}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-semibold text-red-700 tabular-nums">
                              {item.failCount}× failed
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (item.source === 'essay' && onOpenTheory) {
                                onOpenTheory('essays');
                              } else {
                                onOpenCalculator(
                                  item.recommendedCalc ||
                                    (item.source === 'example' ? 'examples' : 'pcm_snr')
                                );
                              }
                            }}
                            className="cursor-pointer text-left text-xs font-semibold text-sky-800 hover:text-sky-950 underline underline-offset-2"
                          >
                            {item.title}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onResolveSolverAttempt(item.id)}
                          title="Mark topic reviewed"
                          className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-emerald-700 hover:border-emerald-300 shrink-0"
                        >
                          <Check className="h-3 w-3" />
                          <span>Clear</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-snug">
                        {item.lastReason}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {syllabusId && (
                          <button
                            type="button"
                            onClick={() => onFocusSyllabusTopic(syllabusId)}
                            className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                          >
                            <BookOpen className="h-3 w-3" />
                            <span>Notes</span>
                          </button>
                        )}
                        {item.source === 'essay' && onOpenTheory ? (
                          <button
                            type="button"
                            onClick={() => onOpenTheory('essays')}
                            className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                          >
                            <BookOpen className="h-3 w-3" />
                            <span>Practice Essay</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenCalculator(
                                item.recommendedCalc ||
                                  (item.source === 'example' ? 'examples' : 'pcm_snr')
                              )
                            }
                            className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                          >
                            <Calculator className="h-3 w-3" />
                            <span>Retry Solver</span>
                          </button>
                        )}
                        {item.recommendedLab && (
                          <button
                            type="button"
                            onClick={() => onOpenLab(item.recommendedLab!)}
                            className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                          >
                            <Sliders className="h-3 w-3" />
                            <span>Lab</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aggregated & Recurring Missed Quiz Topics */}
          {weakQuizTopics.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Missed Quiz Topics</span>
                <span className="font-mono text-slate-500 tabular-nums">
                  {weakQuizTopics.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {weakQuizTopics.map((item) => (
                  <div
                    key={item.topicKey}
                    className="rounded-lg border border-amber-200 bg-amber-50/40 p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                          <span>
                            {item.module === SyllabusModule.PCM
                              ? 'PCM Systems'
                              : item.module === SyllabusModule.COMPRESSION
                              ? 'Compression'
                              : 'Modulation'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-semibold text-amber-800 tabular-nums">
                            {item.missCount}× missed
                            {item.isRecurring ? ' (Recurring)' : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onFocusSyllabusTopic(item.syllabusTopicId)}
                          className="cursor-pointer text-left text-xs font-semibold text-sky-800 hover:text-sky-950 underline underline-offset-2"
                        >
                          {item.topic}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => onResolveQuizTopic(item.questionIds)}
                        title="Mark topic reviewed"
                        className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-emerald-700 hover:border-emerald-300 shrink-0"
                      >
                        <Check className="h-3 w-3" />
                        <span>Reviewed</span>
                      </button>
                    </div>
                    {item.formulaHint && (
                      <p className="font-mono text-[11px] text-slate-700 leading-snug">
                        {item.formulaHint}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => onFocusSyllabusTopic(item.syllabusTopicId)}
                        className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>Review Topic</span>
                      </button>
                      {item.recommendedLab && (
                        <button
                          type="button"
                          onClick={() => onOpenLab(item.recommendedLab!)}
                          className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                        >
                          <Sliders className="h-3 w-3" />
                          <span>Lab</span>
                        </button>
                      )}
                      {item.recommendedCalc && (
                        <button
                          type="button"
                          onClick={() => onOpenCalculator(item.recommendedCalc)}
                          className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                        >
                          <Calculator className="h-3 w-3" />
                          <span>Solver</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onStartCatQuiz}
                        className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                      >
                        <span>Re-Quiz</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
