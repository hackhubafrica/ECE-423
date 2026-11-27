import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Layers,
  PlayCircle,
  RotateCcw,
  Shuffle,
  Sliders,
} from 'lucide-react';
import {
  CORONA_MITIGATION_ROWS,
  FAULT_COMPARISON_ROWS,
  POWER_MODULE_META,
  POWER_SYLLABUS_TOPICS,
  POWER_TONIGHT_TIMELINE,
  PROTECTION_ZONE_ROWS,
} from '../../data/ece471SyllabusData';
import { POWER_FLASHCARDS, POWER_INLINE_THEORY } from '../../data/ece471TheoryData';
import { POWER_WORKED_EXAMPLES } from '../../data/ece471PracticeData';
import {
  PowerLabType,
  PowerModule,
  PowerProgressState,
} from '../../types/ece471';
import {
  computePowerWeakTopics,
  POWER_SOLVER_TO_SYLLABUS,
} from '../../utils/ece471WeakTopics';

interface PowerStudySprintViewProps {
  progress: PowerProgressState;
  onToggleTopic: (topicId: string) => void;
  onOpenLab: (lab: PowerLabType) => void;
  onOpenCalculator: (calcId?: string) => void;
  onOpenTheory: (subTab?: 'principles' | 'timeline' | 'essays') => void;
  onStartCatQuiz: () => void;
  onResolveQuizTopic: (questionIds: string[]) => void;
  onResolveSolverAttempt: (id: string) => void;
}

export const PowerStudySprintView: React.FC<PowerStudySprintViewProps> = ({
  progress,
  onToggleTopic,
  onOpenLab,
  onOpenCalculator,
  onOpenTheory,
  onStartCatQuiz,
  onResolveQuizTopic,
  onResolveSolverAttempt,
}) => {
  const [sprintMode, setSprintMode] = useState<'roadmap' | 'flashcards'>('roadmap');
  const [selectedModule, setSelectedModule] = useState<'all' | PowerModule>('all');
  const [comparisonTab, setComparisonTab] = useState<'faults' | 'corona' | 'protection'>('faults');
  const [highlightedTopicId, setHighlightedTopicId] = useState<string | null>(null);
  const [expandedTheoryIds, setExpandedTheoryIds] = useState<Record<string, boolean>>({});

  const {
    weakQuizTopics,
    weakSolverItems,
    weakSyllabusIds,
    weakReasonsBySyllabusId,
  } = useMemo(() => computePowerWeakTopics(progress), [progress]);

  const [deckScope, setDeckScope] = useState<'weak' | 'unmastered' | 'all'>(() =>
    weakSyllabusIds.size > 0 ? 'weak' : 'all'
  );
  const [cardIdx, setCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardOrder, setCardOrder] = useState<string[]>(() =>
    POWER_FLASHCARDS.map((c) => c.id)
  );

  const activeFlashcards = useMemo(() => {
    const byId = new Map(POWER_FLASHCARDS.map((c) => [c.id, c]));
    return cardOrder
      .map((id) => byId.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .filter((c) => {
        if (deckScope === 'weak') return weakSyllabusIds.has(c.syllabusTopicId);
        if (deckScope === 'unmastered') {
          return !progress.completedTopics.includes(c.syllabusTopicId);
        }
        return true;
      });
  }, [cardOrder, deckScope, weakSyllabusIds, progress.completedTopics]);

  const safeCardIdx =
    activeFlashcards.length === 0 ? 0 : Math.min(cardIdx, activeFlashcards.length - 1);
  const currentCard = activeFlashcards[safeCardIdx];

  const totalTopics = POWER_SYLLABUS_TOPICS.length;
  const completedCount = progress.completedTopics.length;
  const masteryPct = Math.round((completedCount / totalTopics) * 100);
  const latestAttempt = progress.quizAttempts[0];
  const totalWeakItems = weakQuizTopics.length + weakSolverItems.length;

  const filteredTopics =
    selectedModule === 'all'
      ? POWER_SYLLABUS_TOPICS
      : POWER_SYLLABUS_TOPICS.filter((t) => t.module === selectedModule);

  const focusTopic = (syllabusTopicId: string) => {
    setSprintMode('roadmap');
    setSelectedModule('all');
    setHighlightedTopicId(syllabusTopicId);
    window.setTimeout(() => {
      document
        .getElementById(`pwr-topic-${syllabusTopicId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 40);
  };

  const openFlashcardsOnTopic = (syllabusTopicId?: string) => {
    setSprintMode('flashcards');
    if (syllabusTopicId) {
      setDeckScope('all');
      const idx = activeFlashcards.findIndex(
        (c) => c.syllabusTopicId === syllabusTopicId
      );
      if (idx >= 0) setCardIdx(idx);
      else {
        const allIdx = POWER_FLASHCARDS.findIndex(
          (c) => c.syllabusTopicId === syllabusTopicId
        );
        if (allIdx >= 0) setCardIdx(allIdx);
      }
      setIsFlipped(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero Banner */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span>ECE 471 Electric Power Systems II (3 Units)</span>
              <span aria-hidden="true">·</span>
              <span>Line Constants &amp; Corona · Dispatch &amp; AGC · Faults · Transients · Protection</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950 max-w-2xl">
              Master EHV line parameters &amp; corona, economic dispatch, sequence faults, traveling waves, and relays
            </h1>

            <p className="text-sm md:text-base leading-relaxed text-slate-600 max-w-2xl">
              Includes full step-by-step CAT 1 solutions (Q1–Q7: corona physics, DC/AC resistance, GMR inductance, charging current, bundles, and Peek’s formula) plus interactive power labs, per-unit sequence builders, and Python/MATLAB/Julia scripts.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenLab(PowerLabType.LINE_CORONA)}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
              >
                <Sliders className="h-4 w-4" />
                <span>Open Power Labs</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenCalculator('peek_corona')}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Calculator className="h-4 w-4 text-emerald-700" />
                <span>CAT 1 &amp; Power Solvers</span>
              </button>
              <button
                type="button"
                onClick={onStartCatQuiz}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <PlayCircle className="h-4 w-4 text-sky-600" />
                <span>Take CAT 1 Sprint Quiz</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">
                ECE 471 Readiness
              </span>
              <span className="font-mono text-sm font-semibold text-emerald-700 tabular-nums">
                {masteryPct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${masteryPct}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-200">
              <div>
                <div className="text-[11px] text-slate-500">Topics</div>
                <div className="font-mono text-base font-semibold text-slate-950 tabular-nums">
                  {completedCount}/{totalTopics}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Problems</div>
                <div className="font-mono text-base font-semibold text-slate-950 tabular-nums">
                  {progress.masteredExamples.length}/{POWER_WORKED_EXAMPLES.length}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Last Quiz</div>
                <div className="font-mono text-base font-semibold text-slate-950 tabular-nums">
                  {latestAttempt
                    ? `${Math.round((latestAttempt.score / latestAttempt.total) * 100)}%`
                    : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Split: Syllabus Checklist / Flashcards + Weak Topics Sidebar */}
      <section
        id="pwr-sprint-workspace"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        <div className="lg:col-span-8 space-y-6">
          {/* Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                ECE 471 Active Study Workspace
              </h2>
              <p className="text-xs text-slate-500">
                Switch between the {totalTopics}-topic syllabus checklist or interactive power formula flashcards.
              </p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 shrink-0">
              <button
                type="button"
                onClick={() => setSprintMode('roadmap')}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  sprintMode === 'roadmap'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Syllabus Checklist ({completedCount}/{totalTopics})</span>
              </button>
              <button
                type="button"
                onClick={() => setSprintMode('flashcards')}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  sprintMode === 'flashcards'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Flashcards ({POWER_FLASHCARDS.length})</span>
              </button>
            </div>
          </div>

          {sprintMode === 'flashcards' ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                  {[
                    { id: 'weak', label: `Weak Focus (${weakSyllabusIds.size})` },
                    { id: 'unmastered', label: `Unmastered (${totalTopics - completedCount})` },
                    { id: 'all', label: `All (${POWER_FLASHCARDS.length})` },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setDeckScope(s.id as 'weak' | 'unmastered' | 'all');
                        setCardIdx(0);
                        setIsFlipped(false);
                      }}
                      className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        deckScope === s.id
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCardOrder((prev) => [...prev].sort(() => Math.random() - 0.5));
                    setCardIdx(0);
                    setIsFlipped(false);
                  }}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  <span>Shuffle</span>
                </button>
              </div>

              {!currentCard ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center space-y-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-900">
                    No cards in this filter yet
                  </p>
                  <p className="text-xs text-slate-600">
                    Switch to All ({POWER_FLASHCARDS.length}) to drill all Transmission Line, Corona, Dispatch, Fault, and Protection formulas.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDeckScope('all')}
                    className="cursor-pointer mt-2 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Show All Cards
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Card{' '}
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {safeCardIdx + 1} / {activeFlashcards.length}
                      </span>
                    </span>
                    <span>{POWER_MODULE_META[currentCard.module].shortTitle}</span>
                  </div>

                  {weakReasonsBySyllabusId[currentCard.syllabusTopicId] && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-900">
                      <strong>Flagged Weak Topic:</strong>{' '}
                      {weakReasonsBySyllabusId[currentCard.syllabusTopicId].join(' · ')}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsFlipped((f) => !f)}
                    className="cursor-pointer w-full rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-left transition-colors hover:border-emerald-300 space-y-4 min-h-[240px] flex flex-col justify-between"
                  >
                    {!isFlipped ? (
                      <>
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-emerald-700">
                            {currentCard.title} · Front (Formula / Law)
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 font-mono text-base md:text-lg font-semibold text-slate-950">
                            {currentCard.formulaDisplay}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                            {currentCard.variableLegend.map((v) => (
                              <span key={v}>{v}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
                          <span className="font-medium text-slate-700">
                            {currentCard.promptQuestion}
                          </span>
                          <span className="font-semibold text-emerald-700 shrink-0 ml-3">
                            Click to flip →
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-sky-700">
                            {currentCard.title} · Back (Engineering Application)
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-slate-500">
                              Practical Application
                            </div>
                            <p className="text-sm text-slate-900">
                              {currentCard.practicalApplication}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-slate-500">
                              System Consequence
                            </div>
                            <p className="text-xs leading-relaxed text-slate-700">
                              {currentCard.systemConsequence}
                            </p>
                          </div>
                          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-950">
                            <strong>CAT Trap:</strong> {currentCard.catTrap}
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-emerald-700 text-right pt-2 border-t border-slate-200">
                          Click to flip back ↺
                        </div>
                      </>
                    )}
                  </button>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCardIdx(
                            (i) => (i - 1 + activeFlashcards.length) % activeFlashcards.length
                          );
                          setIsFlipped(false);
                        }}
                        className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Prev</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCardIdx((i) => (i + 1) % activeFlashcards.length);
                          setIsFlipped(false);
                        }}
                        className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        <span>Next</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {currentCard.recommendedLab && (
                        <button
                          type="button"
                          onClick={() => onOpenLab(currentCard.recommendedLab!)}
                          className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
                        >
                          Lab
                        </button>
                      )}
                      {currentCard.recommendedCalc && (
                        <button
                          type="button"
                          onClick={() => onOpenCalculator(currentCard.recommendedCalc)}
                          className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
                        >
                          Solver
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onToggleTopic(currentCard.syllabusTopicId)}
                        className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold ${
                          progress.completedTopics.includes(currentCard.syllabusTopicId)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-700 text-white hover:bg-emerald-800'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>
                          {progress.completedTopics.includes(currentCard.syllabusTopicId)
                            ? 'Topic Mastered'
                            : 'Mark Mastered'}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* CAT 1 & Exam Study Sequence */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      CAT 1 &amp; Final Exam Study Sequence
                    </h2>
                    <p className="text-xs text-slate-500">
                      Prioritized 3.5-hour sprint from CAT 1 Q1–Q7 Line/Corona fundamentals through Faults, Transients &amp; Protection.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenTheory('essays')}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-emerald-400 hover:text-emerald-700"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-emerald-700" />
                    <span>CAT 1 Corona Essays</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {POWER_TONIGHT_TIMELINE.map((block) => (
                    <div
                      key={block.slot}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1.5"
                    >
                      <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{block.slot}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{block.focus}</div>
                      <p className="text-xs leading-relaxed text-slate-600">{block.actions}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Syllabus Checklist */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      ECE 471 Complete Syllabus Checklist
                    </h2>
                    <p className="text-xs text-slate-500">
                      Check off topics as you master them, or expand Theory &amp; Pioneer notes inline.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                    {[
                      { id: 'all', label: `All (${totalTopics})` },
                      { id: PowerModule.LINE_CORONA, label: 'CAT 1 Lines/Corona' },
                      { id: PowerModule.DISPATCH_AGC, label: 'Dispatch' },
                      { id: PowerModule.SYMMETRICAL, label: 'Symmetrical' },
                      { id: PowerModule.FAULTS, label: 'Faults' },
                      { id: PowerModule.TRANSIENTS, label: 'Transients' },
                      { id: PowerModule.PROTECTION, label: 'Protection' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedModule(f.id as 'all' | PowerModule)}
                        className={`cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          selectedModule === f.id
                            ? 'bg-white text-slate-950 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-slate-200 border-t border-slate-200">
                  {filteredTopics.map((topic) => {
                    const done = progress.completedTopics.includes(topic.id);
                    const theoryNote = POWER_INLINE_THEORY[topic.id];
                    const isTheoryOpen = Boolean(expandedTheoryIds[topic.id]);
                    const isHighlighted = highlightedTopicId === topic.id;
                    const isFlaggedWeak = weakSyllabusIds.has(topic.id);

                    return (
                      <div
                        key={topic.id}
                        id={`pwr-topic-${topic.id}`}
                        className={`py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                          isHighlighted ? 'bg-emerald-50/70 -mx-3 px-3 rounded-lg' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => onToggleTopic(topic.id)}
                            aria-label={`Mark ${topic.title} as mastered`}
                            className="cursor-pointer mt-0.5 text-emerald-700 hover:text-emerald-800 shrink-0"
                          >
                            {done ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-slate-300 hover:text-emerald-500" />
                            )}
                          </button>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span>{POWER_MODULE_META[topic.module].shortTitle}</span>
                              <span aria-hidden="true">·</span>
                              <span
                                className={
                                  topic.catPriority === 'Critical'
                                    ? 'font-semibold text-amber-700'
                                    : 'font-medium text-slate-600'
                                }
                              >
                                {topic.catPriority}
                              </span>
                              {isFlaggedWeak && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-semibold text-amber-700">
                                    Needs Review
                                  </span>
                                </>
                              )}
                            </div>
                            <h3
                              className={`text-sm font-semibold ${
                                done ? 'text-slate-500 line-through' : 'text-slate-950'
                              }`}
                            >
                              {topic.title}
                            </h3>
                            <p className="text-xs leading-relaxed text-slate-600 max-w-2xl">
                              {topic.summary}
                            </p>
                            {topic.keyFormula && (
                              <div className="pt-0.5 font-mono text-xs text-emerald-800">
                                {topic.keyFormula}
                              </div>
                            )}

                            {theoryNote && (
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedTheoryIds((prev) => ({
                                      ...prev,
                                      [topic.id]: !prev[topic.id],
                                    }))
                                  }
                                  className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900"
                                >
                                  <BookOpen className="h-3.5 w-3.5" />
                                  <span>
                                    {isTheoryOpen ? 'Hide Theory & Pioneer' : 'Theory & Pioneer'}
                                  </span>
                                  {isTheoryOpen ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>

                                {isTheoryOpen && (
                                  <div className="mt-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5 text-xs text-slate-700 max-w-2xl">
                                    <p>
                                      <strong className="text-slate-900">Physical Intuition:</strong>{' '}
                                      {theoryNote.intuition}
                                    </p>
                                    <p className="text-slate-600">
                                      <strong className="text-slate-900">Historical Context:</strong>{' '}
                                      {theoryNote.pioneerNote}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pl-8 lg:pl-0 shrink-0">
                          {topic.recommendedLab && (
                            <button
                              type="button"
                              onClick={() => onOpenLab(topic.recommendedLab!)}
                              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-700 whitespace-nowrap shrink-0"
                            >
                              <span>Lab</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                          {topic.recommendedCalc && (
                            <button
                              type="button"
                              onClick={() => onOpenCalculator(topic.recommendedCalc)}
                              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-700 whitespace-nowrap shrink-0"
                            >
                              <span>Solver</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Weak Topics Sidebar */}
        <aside
          aria-label="ECE 471 Weak Topics Sidebar"
          className="lg:col-span-4 lg:sticky lg:top-20 rounded-xl border border-slate-200 bg-white p-5 space-y-5"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">Weak Topics</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Aggregated from missed quiz items &amp; failed CAT 1 / fault checks
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

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Module Quiz Accuracy</span>
              <span className="font-mono text-slate-500 tabular-nums">
                {progress.quizAttempts.length} attempt(s)
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 divide-y divide-slate-200">
              {Object.values(PowerModule).map((mod) => {
                let cor = 0;
                let tot = 0;
                progress.quizAttempts.forEach((a) => {
                  cor += a.moduleBreakdown[mod]?.correct || 0;
                  tot += a.moduleBreakdown[mod]?.total || 0;
                });
                const pct = tot > 0 ? Math.round((cor / tot) * 100) : null;
                return (
                  <div
                    key={mod}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-medium text-slate-800 truncate">
                      {POWER_MODULE_META[mod].shortTitle}
                    </span>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        pct === null
                          ? 'text-slate-400'
                          : pct < 70
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {pct === null ? '—' : `${pct}% (${cor}/${tot})`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {totalWeakItems === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-xs">
              <p className="font-semibold text-slate-900">
                No weak ECE 471 topics flagged yet
              </p>
              <p className="text-slate-600 leading-relaxed">
                Take the Timed CAT 1 Quiz or verify your CAT 1 hand calculations in Solver &amp; Per-Unit—any missed items will appear here for focused review.
              </p>
              <button
                type="button"
                onClick={onStartCatQuiz}
                className="cursor-pointer w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                <span>Run CAT 1 Diagnostic Quiz</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {weakQuizTopics.map((item) => (
                <div
                  key={item.topic}
                  className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-semibold text-amber-700">
                        Missed {item.missCount}× · {POWER_MODULE_META[item.module].shortTitle}
                      </div>
                      <button
                        type="button"
                        onClick={() => item.syllabusTopicId && focusTopic(item.syllabusTopicId)}
                        className="cursor-pointer text-left text-xs font-bold text-slate-950 hover:text-emerald-700"
                      >
                        {item.topic}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onResolveQuizTopic(item.questionIds)}
                      title="Dismiss resolved item"
                      className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-700"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {item.syllabusTopicId && (
                      <button
                        type="button"
                        onClick={() => openFlashcardsOnTopic(item.syllabusTopicId)}
                        className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
                      >
                        Flashcard
                      </button>
                    )}
                    {item.recommendedLab && (
                      <button
                        type="button"
                        onClick={() => onOpenLab(item.recommendedLab!)}
                        className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
                      >
                        Lab
                      </button>
                    )}
                    {item.recommendedCalc && (
                      <button
                        type="button"
                        onClick={() => onOpenCalculator(item.recommendedCalc)}
                        className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
                      >
                        Solver
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {weakSolverItems.map((item) => {
                const sid = item.recommendedCalc
                  ? POWER_SOLVER_TO_SYLLABUS[item.recommendedCalc]
                  : undefined;
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-semibold text-amber-700">
                          Failed {item.failCount}× · {item.source}
                        </div>
                        <div className="text-xs font-bold text-slate-950">{item.title}</div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.lastReason}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onResolveSolverAttempt(item.id)}
                        title="Dismiss resolved item"
                        className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sid && (
                        <button
                          type="button"
                          onClick={() => focusTopic(sid)}
                          className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
                        >
                          Syllabus
                        </button>
                      )}
                      {item.recommendedCalc && (
                        <button
                          type="button"
                          onClick={() => onOpenCalculator(item.recommendedCalc)}
                          className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
                        >
                          Retry Solver
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => openFlashcardsOnTopic()}
            className="cursor-pointer w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-emerald-400 hover:text-emerald-700"
          >
            <RotateCcw className="h-3.5 w-3.5 text-emerald-700" />
            <span>Drill Weak Topics in Flashcards</span>
          </button>
        </aside>
      </section>

      {/* High-Yield Comparison Matrices */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              High-Yield Power System Comparison Tables
            </h2>
            <p className="text-xs text-slate-500">
              Side-by-side fault sequence connections, EHV corona mitigation methods, and protection relay zones.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            {[
              { id: 'faults', label: 'Fault Sequences (3ϕ/SLG/LL/DLG)' },
              { id: 'corona', label: 'Corona Mitigation' },
              { id: 'protection', label: 'Distance & Differential Zones' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  setComparisonTab(t.id as 'faults' | 'corona' | 'protection')
                }
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  comparisonTab === t.id
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {comparisonTab === 'faults' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Fault Type</th>
                  <th className="py-2.5 px-4 font-semibold">Sequence Network Connection</th>
                  <th className="py-2.5 px-4 font-semibold">Zero Sequence?</th>
                  <th className="py-2.5 px-4 font-semibold">Current Formula</th>
                  <th className="py-2.5 pl-4 font-semibold">Engineering Behavior</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FAULT_COMPARISON_ROWS.map((row) => (
                  <tr key={row.faultType}>
                    <td className="py-3 pr-4 font-semibold text-slate-950 whitespace-nowrap">
                      {row.faultType}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{row.sequenceConnection}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{row.zeroSeqPresent}</td>
                    <td className="py-3 px-4 font-mono text-emerald-800">
                      {row.faultCurrentFormula}
                    </td>
                    <td className="py-3 pl-4 text-slate-600">{row.typicalSeverity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {comparisonTab === 'corona' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Mitigation Technique</th>
                  <th className="py-2.5 px-4 font-semibold">Physical Mechanism</th>
                  <th className="py-2.5 px-4 font-semibold">Peek Formula Effect</th>
                  <th className="py-2.5 pl-4 font-semibold">Design Tradeoff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CORONA_MITIGATION_ROWS.map((row) => (
                  <tr key={row.method}>
                    <td className="py-3 pr-4 font-semibold text-slate-950">{row.method}</td>
                    <td className="py-3 px-4 text-slate-700">{row.mechanism}</td>
                    <td className="py-3 px-4 font-mono text-emerald-800">{row.formulaEffect}</td>
                    <td className="py-3 pl-4 text-slate-600">{row.engineeringTradeoff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {comparisonTab === 'protection' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Protection Scheme</th>
                  <th className="py-2.5 px-4 font-semibold">Reach / Pickup Rule</th>
                  <th className="py-2.5 px-4 font-semibold">Operating Time</th>
                  <th className="py-2.5 pl-4 font-semibold">Coordination Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PROTECTION_ZONE_ROWS.map((row) => (
                  <tr key={row.scheme}>
                    <td className="py-3 pr-4 font-semibold text-slate-950 whitespace-nowrap">
                      {row.scheme}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-800">
                      {row.reachOrCondition}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{row.operatingTime}</td>
                    <td className="py-3 pl-4 text-slate-600">{row.primaryRole}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};
