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
  CANONICAL_COMPARISON_ROWS,
  COMPENSATOR_COMPARISON_ROWS,
  CONTROL_MODULE_META,
  CONTROL_SYLLABUS_TOPICS,
  CONTROL_TONIGHT_TIMELINE,
  PID_MODE_ROWS,
} from '../../data/ece433SyllabusData';
import {
  CONTROL_FLASHCARDS,
  CONTROL_INLINE_THEORY,
} from '../../data/ece433TheoryData';
import {
  ControlLabType,
  ControlModule,
  ControlProgressState,
} from '../../types/ece433';
import {
  computeControlWeakTopics,
  CONTROL_SOLVER_TO_SYLLABUS,
} from '../../utils/ece433WeakTopics';

interface ControlStudySprintViewProps {
  progress: ControlProgressState;
  onToggleTopic: (topicId: string) => void;
  onOpenLab: (lab: ControlLabType) => void;
  onOpenCalculator: (calcId?: string) => void;
  onOpenTheory: (subTab?: 'principles' | 'opamp' | 'timeline' | 'essays') => void;
  onStartCatQuiz: () => void;
  onResolveQuizTopic: (questionIds: string[]) => void;
  onResolveSolverAttempt: (id: string) => void;
}

export const ControlStudySprintView: React.FC<ControlStudySprintViewProps> = ({
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
  const [selectedModule, setSelectedModule] = useState<'all' | ControlModule>('all');
  const [comparisonTab, setComparisonTab] = useState<'pid' | 'comp' | 'canonical'>('pid');
  const [highlightedTopicId, setHighlightedTopicId] = useState<string | null>(null);
  const [expandedTheoryIds, setExpandedTheoryIds] = useState<Record<string, boolean>>({});

  // Flashcard state
  const {
    weakQuizTopics,
    weakSolverItems,
    weakSyllabusIds,
    weakReasonsBySyllabusId,
  } = useMemo(() => computeControlWeakTopics(progress), [progress]);

  const [deckScope, setDeckScope] = useState<'weak' | 'unmastered' | 'all'>(() =>
    weakSyllabusIds.size > 0 ? 'weak' : 'all'
  );
  const [cardIdx, setCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardOrder, setCardOrder] = useState<string[]>(() =>
    CONTROL_FLASHCARDS.map((c) => c.id)
  );

  const activeFlashcards = useMemo(() => {
    const byId = new Map(CONTROL_FLASHCARDS.map((c) => [c.id, c]));
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

  const totalTopics = CONTROL_SYLLABUS_TOPICS.length;
  const completedCount = progress.completedTopics.length;
  const masteryPct = Math.round((completedCount / totalTopics) * 100);
  const latestAttempt = progress.quizAttempts[0];
  const totalWeakItems = weakQuizTopics.length + weakSolverItems.length;

  const filteredTopics =
    selectedModule === 'all'
      ? CONTROL_SYLLABUS_TOPICS
      : CONTROL_SYLLABUS_TOPICS.filter((t) => t.module === selectedModule);

  const focusTopic = (syllabusTopicId: string) => {
    setSprintMode('roadmap');
    setSelectedModule('all');
    setHighlightedTopicId(syllabusTopicId);
    window.setTimeout(() => {
      document
        .getElementById(`ctrl-topic-${syllabusTopicId}`)
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
        const allIdx = CONTROL_FLASHCARDS.findIndex(
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
              <span>ECE 433 Control System II (3 Units)</span>
              <span aria-hidden="true">·</span>
              <span>PID · Bode Compensation · State-Space · Observers</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950 max-w-2xl">
              Master classical PID &amp; Bode shaping alongside state-space pole placement and observers
            </h1>

            <p className="text-sm md:text-base leading-relaxed text-slate-600 max-w-2xl">
              Work through every ECE 433 topic from op-amp PID realizations and Ziegler–Nichols windup fixes to matrix exponentials e^(At), Kalman/Gilbert rank tests, and Luenberger estimators.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenLab(ControlLabType.PID_WINDUP)}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0"
              >
                <Sliders className="h-4 w-4" />
                <span>Open Control Labs</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenCalculator('canonical_ss')}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Calculator className="h-4 w-4 text-sky-600" />
                <span>State-Space &amp; Matrix Solvers</span>
              </button>
              <button
                type="button"
                onClick={onStartCatQuiz}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <PlayCircle className="h-4 w-4 text-emerald-600" />
                <span>Take Timed CAT Quiz</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">
                ECE 433 Readiness
              </span>
              <span className="font-mono text-sm font-semibold text-sky-700 tabular-nums">
                {masteryPct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-sky-600 transition-all duration-300"
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
                  {progress.masteredExamples.length}/6
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
        id="ctrl-sprint-workspace"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        <div className="lg:col-span-8 space-y-6">
          {/* Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                ECE 433 Active Study Workspace
              </h2>
              <p className="text-xs text-slate-500">
                Switch between the 15-topic syllabus checklist or interactive theorem &amp; formula flashcards.
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
                <span>Flashcards ({CONTROL_FLASHCARDS.length})</span>
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
                    { id: 'all', label: `All (${CONTROL_FLASHCARDS.length})` },
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
                    Switch to All ({CONTROL_FLASHCARDS.length}) to drill all Control System II formulas and state-space theorems.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDeckScope('all')}
                    className="cursor-pointer mt-2 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                  >
                    Show All Cards
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Card <span className="font-mono font-semibold text-slate-900 tabular-nums">{safeCardIdx + 1} / {activeFlashcards.length}</span>
                    </span>
                    <span>{CONTROL_MODULE_META[currentCard.module].shortTitle}</span>
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
                    className="cursor-pointer w-full rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-left transition-colors hover:border-sky-300 space-y-4 min-h-[240px] flex flex-col justify-between"
                  >
                    {!isFlipped ? (
                      <>
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-sky-700">
                            {currentCard.title} · Front (Formula / Theorem)
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
                          <span className="font-medium text-slate-700">{currentCard.promptQuestion}</span>
                          <span className="font-semibold text-sky-700 shrink-0 ml-3">Click to flip →</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-emerald-700">
                            {currentCard.title} · Back (Engineering Application)
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-slate-500">Practical Application</div>
                            <p className="text-sm text-slate-900">{currentCard.practicalApplication}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-slate-500">System Consequence</div>
                            <p className="text-xs leading-relaxed text-slate-700">{currentCard.systemConsequence}</p>
                          </div>
                          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-950">
                            <strong>CAT Trap:</strong> {currentCard.catTrap}
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-sky-700 text-right pt-2 border-t border-slate-200">
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
                          setCardIdx((i) => (i - 1 + activeFlashcards.length) % activeFlashcards.length);
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
                          className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-700"
                        >
                          Lab
                        </button>
                      )}
                      {currentCard.recommendedCalc && (
                        <button
                          type="button"
                          onClick={() => onOpenCalculator(currentCard.recommendedCalc)}
                          className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-700"
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
                            : 'bg-sky-600 text-white hover:bg-sky-700'
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
              {/* Tonight CAT Sprint Plan */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      CAT &amp; Exam Study Sequence
                    </h2>
                    <p className="text-xs text-slate-500">
                      Focused 3.5-hour sweep covering classical PID/Bode and modern state-space design.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenTheory('opamp')}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-sky-600" />
                    <span>Op-Amp PID Circuits</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CONTROL_TONIGHT_TIMELINE.map((block) => (
                    <div
                      key={block.slot}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1.5"
                    >
                      <div className="flex items-center gap-2 text-xs font-mono text-sky-700 font-semibold">
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
                      ECE 433 Complete Syllabus Checklist
                    </h2>
                    <p className="text-xs text-slate-500">
                      Check off topics as you master them, or expand Theory &amp; Pioneer notes inline.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                    {[
                      { id: 'all', label: 'All (15)' },
                      { id: ControlModule.PID, label: 'PID' },
                      { id: ControlModule.FREQ_COMP, label: 'Lead/Lag' },
                      { id: ControlModule.STATE_SPACE, label: 'State-Space' },
                      { id: ControlModule.DESIGN_OBS, label: 'Pole/Obs' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedModule(f.id as 'all' | ControlModule)}
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
                    const theoryNote = CONTROL_INLINE_THEORY[topic.id];
                    const isTheoryOpen = Boolean(expandedTheoryIds[topic.id]);
                    const isHighlighted = highlightedTopicId === topic.id;
                    const isFlaggedWeak = weakSyllabusIds.has(topic.id);

                    return (
                      <div
                        key={topic.id}
                        id={`ctrl-topic-${topic.id}`}
                        className={`py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                          isHighlighted ? 'bg-sky-50/70 -mx-3 px-3 rounded-lg' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => onToggleTopic(topic.id)}
                            aria-label={`Mark ${topic.title} as mastered`}
                            className="cursor-pointer mt-0.5 text-sky-600 hover:text-sky-700 shrink-0"
                          >
                            {done ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-slate-300 hover:text-sky-500" />
                            )}
                          </button>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span>{CONTROL_MODULE_META[topic.module].shortTitle}</span>
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
                              <div className="pt-0.5 font-mono text-xs text-sky-700">
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
                                  className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900"
                                >
                                  <BookOpen className="h-3.5 w-3.5" />
                                  <span>{isTheoryOpen ? 'Hide Theory & Pioneer' : 'Theory & Pioneer'}</span>
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
                              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-sky-400 hover:text-sky-700 whitespace-nowrap shrink-0"
                            >
                              <span>Lab</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                          {topic.recommendedCalc && (
                            <button
                              type="button"
                              onClick={() => onOpenCalculator(topic.recommendedCalc)}
                              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-sky-400 hover:text-sky-700 whitespace-nowrap shrink-0"
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
          aria-label="ECE 433 Weak Topics Sidebar"
          className="lg:col-span-4 lg:sticky lg:top-20 rounded-xl border border-slate-200 bg-white p-5 space-y-5"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">Weak Topics</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Aggregated from missed quiz items &amp; failed matrix/PID checks
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

          {/* Module Accuracy Bars */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Module Quiz Accuracy</span>
              <span className="font-mono text-slate-500 tabular-nums">
                {progress.quizAttempts.length} attempt(s)
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 divide-y divide-slate-200">
              {Object.values(ControlModule).map((mod) => {
                let cor = 0;
                let tot = 0;
                progress.quizAttempts.forEach((a) => {
                  cor += a.moduleBreakdown[mod]?.correct || 0;
                  tot += a.moduleBreakdown[mod]?.total || 0;
                });
                const pct = tot > 0 ? Math.round((cor / tot) * 100) : null;
                return (
                  <div key={mod} className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-800 truncate">
                      {CONTROL_MODULE_META[mod].shortTitle}
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
                No weak ECE 433 topics flagged yet
              </p>
              <p className="text-slate-600 leading-relaxed">
                Take a Timed CAT Quiz or test your hand calculations in Solver &amp; Matrices—any missed items will automatically appear here as direct study links.
              </p>
              <button
                type="button"
                onClick={onStartCatQuiz}
                className="cursor-pointer w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                <span>Run CAT Diagnostic Quiz</span>
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
                        Missed {item.missCount}× · {CONTROL_MODULE_META[item.module].shortTitle}
                      </div>
                      <button
                        type="button"
                        onClick={() => item.syllabusTopicId && focusTopic(item.syllabusTopicId)}
                        className="cursor-pointer text-left text-xs font-bold text-slate-950 hover:text-sky-700"
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
                        className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-sky-400 hover:text-sky-700"
                      >
                        Flashcard
                      </button>
                    )}
                    {item.recommendedLab && (
                      <button
                        type="button"
                        onClick={() => onOpenLab(item.recommendedLab!)}
                        className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-sky-400 hover:text-sky-700"
                      >
                        Lab
                      </button>
                    )}
                    {item.recommendedCalc && (
                      <button
                        type="button"
                        onClick={() => onOpenCalculator(item.recommendedCalc)}
                        className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-sky-400 hover:text-sky-700"
                      >
                        Solver
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {weakSolverItems.map((item) => {
                const sid = item.recommendedCalc
                  ? CONTROL_SOLVER_TO_SYLLABUS[item.recommendedCalc]
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
                          className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-sky-400 hover:text-sky-700"
                        >
                          Syllabus
                        </button>
                      )}
                      {item.recommendedCalc && (
                        <button
                          type="button"
                          onClick={() => onOpenCalculator(item.recommendedCalc)}
                          className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-sky-400 hover:text-sky-700"
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
            className="cursor-pointer w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
          >
            <RotateCcw className="h-3.5 w-3.5 text-sky-600" />
            <span>Drill Weak Topics in Flashcards</span>
          </button>
        </aside>
      </section>

      {/* High-Yield Comparison Matrices */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              High-Yield Comparison Matrices
            </h2>
            <p className="text-xs text-slate-500">
              Frequently tested side-by-side contrasts in ECE 433 CATs and final exams.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            {[
              { id: 'pid', label: 'P / PI / PD / PID' },
              { id: 'comp', label: 'Lead / Lag vs PD / PI' },
              { id: 'canonical', label: 'Canonical Forms' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setComparisonTab(t.id as 'pid' | 'comp' | 'canonical')}
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
          {comparisonTab === 'pid' && (
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 pr-4">Mode</th>
                  <th className="py-3 pr-4">Law</th>
                  <th className="py-3 pr-4">Rise Time</th>
                  <th className="py-3 pr-4">Overshoot</th>
                  <th className="py-3 pr-4">Steady-State Error</th>
                  <th className="py-3">Typical Application</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PID_MODE_ROWS.map((r) => (
                  <tr key={r.mode} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4 font-semibold text-slate-950">{r.mode}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-sky-700">{r.formula}</td>
                    <td className="py-3 pr-4 text-slate-700">{r.riseTime}</td>
                    <td className="py-3 pr-4 text-slate-700">{r.overshoot}</td>
                    <td className="py-3 pr-4 text-slate-700">{r.ssError}</td>
                    <td className="py-3 text-slate-600">{r.bestUse}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {comparisonTab === 'comp' && (
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 pr-4">Criterion</th>
                  <th className="py-3 pr-4">Lead Compensator</th>
                  <th className="py-3 pr-4">Lag Compensator</th>
                  <th className="py-3 pr-4">PD Controller</th>
                  <th className="py-3">PI Controller</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {COMPENSATOR_COMPARISON_ROWS.map((r) => (
                  <tr key={r.property} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4 font-semibold text-slate-950">{r.property}</td>
                    <td className="py-3 pr-4 text-slate-700">{r.lead}</td>
                    <td className="py-3 pr-4 text-slate-700">{r.lag}</td>
                    <td className="py-3 pr-4 text-slate-700">{r.pd}</td>
                    <td className="py-3 text-slate-700">{r.pi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {comparisonTab === 'canonical' && (
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 pr-4">Canonical Form</th>
                  <th className="py-3 pr-4">Matrix Structure</th>
                  <th className="py-3 pr-4">Key Design Advantage</th>
                  <th className="py-3">Limitation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CANONICAL_COMPARISON_ROWS.map((r) => (
                  <tr key={r.form} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4 font-semibold text-slate-950">{r.form}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-sky-700">{r.structure}</td>
                    <td className="py-3 pr-4 text-slate-700">{r.strength}</td>
                    <td className="py-3 text-slate-600">{r.drawback}</td>
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
