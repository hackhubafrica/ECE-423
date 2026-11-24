import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  Layers,
  PlayCircle,
  Sliders,
} from 'lucide-react';
import { MODULE_META } from '../data/syllabusData';
import {
  LabType,
  StudyProgressState,
  SyllabusModule,
} from '../types/ece423';
import {
  computeWeakTopicDiagnostics,
  SOLVER_TO_SYLLABUS_ID,
} from '../utils/weakTopics';

interface WeakTopicsSidebarProps {
  progress: StudyProgressState;
  onOpenLab: (lab: LabType) => void;
  onOpenCalculator: (calcId?: string) => void;
  onOpenTheory?: (subTab?: 'principles' | 'timeline' | 'essays') => void;
  onOpenFlashcards?: (syllabusTopicId?: string) => void;
  onStartCatQuiz: () => void;
  onFocusSyllabusTopic: (syllabusTopicId: string) => void;
  onResolveQuizTopic: (questionIds: string[]) => void;
  onResolveSolverAttempt: (id: string) => void;
}

export const WeakTopicsSidebar: React.FC<WeakTopicsSidebarProps> = ({
  progress,
  onOpenLab,
  onOpenCalculator,
  onOpenTheory,
  onOpenFlashcards,
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

  const { weakQuizTopics, weakSolverItems } = useMemo(
    () => computeWeakTopicDiagnostics(progress),
    [progress]
  );

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
          {onOpenFlashcards && (
            <button
              type="button"
              onClick={() => onOpenFlashcards()}
              className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition-colors"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Drill Weak Topics in Flashcards</span>
            </button>
          )}

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
                        {syllabusId && onOpenFlashcards && (
                          <button
                            type="button"
                            onClick={() => onOpenFlashcards(syllabusId)}
                            className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                          >
                            <Layers className="h-3 w-3" />
                            <span>Flashcard</span>
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
                      {onOpenFlashcards && (
                        <button
                          type="button"
                          onClick={() => onOpenFlashcards(item.syllabusTopicId)}
                          className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                        >
                          <Layers className="h-3 w-3" />
                          <span>Flashcard</span>
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
