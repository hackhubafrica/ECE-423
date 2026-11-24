import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Circle,
  PlayCircle,
  RotateCcw,
  Shuffle,
  Sliders,
} from 'lucide-react';
import { ECE423_FLASHCARDS } from '../data/flashcardsData';
import { MODULE_META } from '../data/syllabusData';
import {
  FlashcardItem,
  LabType,
  StudyProgressState,
  SyllabusModule,
} from '../types/ece423';
import { computeWeakTopicDiagnostics } from '../utils/weakTopics';

export interface FlashcardFocusRequest {
  syllabusTopicId: string;
  nonce: number;
}

interface FlashcardDeckProps {
  progress: StudyProgressState;
  focusRequest?: FlashcardFocusRequest | null;
  onToggleTopic: (topicId: string) => void;
  onOpenLab: (lab: LabType) => void;
  onOpenCalculator: (calcId?: string) => void;
  onStartCatQuiz: () => void;
}

type DeckScope = 'weak' | 'unmastered' | 'all';

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({
  progress,
  focusRequest,
  onToggleTopic,
  onOpenLab,
  onOpenCalculator,
  onStartCatQuiz,
}) => {
  const { weakSyllabusIds, weakReasonsBySyllabusId } = useMemo(
    () => computeWeakTopicDiagnostics(progress),
    [progress]
  );

  const [deckScope, setDeckScope] = useState<DeckScope>(() =>
    weakSyllabusIds.size > 0
      ? 'weak'
      : progress.completedTopics.length < 15
      ? 'unmastered'
      : 'all'
  );
  const [moduleFilter, setModuleFilter] = useState<'all' | SyllabusModule>('all');
  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    ECE423_FLASHCARDS.map((c) => c.id)
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionReviewedIds, setSessionReviewedIds] = useState<string[]>([]);

  const weakCount = useMemo(
    () =>
      ECE423_FLASHCARDS.filter((c) => weakSyllabusIds.has(c.syllabusTopicId))
        .length,
    [weakSyllabusIds]
  );

  const unmasteredCount = useMemo(
    () =>
      ECE423_FLASHCARDS.filter(
        (c) => !progress.completedTopics.includes(c.syllabusTopicId)
      ).length,
    [progress.completedTopics]
  );

  // Build active card list preserving user's shuffle/requeue order while keeping weak cards prioritized
  const activeCards = useMemo<FlashcardItem[]>(() => {
    const byId = new Map(ECE423_FLASHCARDS.map((c) => [c.id, c]));
    const baseOrdered = orderedIds
      .map((id) => byId.get(id))
      .filter((c): c is FlashcardItem => Boolean(c));

    return baseOrdered.filter((card) => {
      const modOk = moduleFilter === 'all' || card.module === moduleFilter;
      if (!modOk) return false;
      if (deckScope === 'weak') return weakSyllabusIds.has(card.syllabusTopicId);
      if (deckScope === 'unmastered') {
        return !progress.completedTopics.includes(card.syllabusTopicId);
      }
      return true;
    });
  }, [
    orderedIds,
    moduleFilter,
    deckScope,
    weakSyllabusIds,
    progress.completedTopics,
  ]);

  // Clamp index if activeCards shrinks (e.g., marking an unmastered card mastered)
  useEffect(() => {
    if (activeCards.length === 0) {
      setCurrentIdx(0);
      setIsFlipped(false);
    } else if (currentIdx >= activeCards.length) {
      setCurrentIdx(0);
      setIsFlipped(false);
    }
  }, [activeCards.length, currentIdx]);

  // Respond to sidebar click focusing a specific weak topic card
  useEffect(() => {
    if (!focusRequest) return;
    setModuleFilter('all');

    const targetIsWeak = weakSyllabusIds.has(focusRequest.syllabusTopicId);
    const targetScope: DeckScope = targetIsWeak ? 'weak' : 'all';
    setDeckScope(targetScope);

    const matchingList = orderedIds.filter((id) => {
      const c = ECE423_FLASHCARDS.find((item) => item.id === id);
      if (!c) return false;
      if (targetScope === 'weak') return weakSyllabusIds.has(c.syllabusTopicId);
      return true;
    });

    const targetIndex = matchingList.findIndex((id) => {
      const c = ECE423_FLASHCARDS.find((item) => item.id === id);
      return c?.syllabusTopicId === focusRequest.syllabusTopicId;
    });

    setCurrentIdx(targetIndex >= 0 ? targetIndex : 0);
    setIsFlipped(false);
  }, [focusRequest, weakSyllabusIds, orderedIds]);

  const currentCard = activeCards[currentIdx];

  const handlePrev = () => {
    if (activeCards.length <= 1) return;
    setIsFlipped(false);
    setCurrentIdx((prev) => (prev - 1 + activeCards.length) % activeCards.length);
  };

  const handleNext = () => {
    if (activeCards.length === 0) return;
    if (currentCard && !sessionReviewedIds.includes(currentCard.id)) {
      setSessionReviewedIds((prev) => [...prev, currentCard.id]);
    }
    setIsFlipped(false);
    if (activeCards.length > 1) {
      setCurrentIdx((prev) => (prev + 1) % activeCards.length);
    }
  };

  const handleReviewAgain = () => {
    if (!currentCard || activeCards.length <= 1) {
      setIsFlipped(false);
      return;
    }
    setOrderedIds((prev) => {
      const without = prev.filter((id) => id !== currentCard.id);
      return [...without, currentCard.id];
    });
    setIsFlipped(false);
    // Keep same index so next card slides into view cleanly
    setCurrentIdx((prev) => (prev >= activeCards.length - 1 ? 0 : prev));
  };

  const handleShuffle = () => {
    setOrderedIds((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
    setCurrentIdx(0);
    setIsFlipped(false);
  };

  const handleResetOrder = () => {
    // Place weak cards first, then default syllabus order
    const weakFirst = [
      ...ECE423_FLASHCARDS.filter((c) => weakSyllabusIds.has(c.syllabusTopicId)),
      ...ECE423_FLASHCARDS.filter((c) => !weakSyllabusIds.has(c.syllabusTopicId)),
    ].map((c) => c.id);
    setOrderedIds(weakFirst);
    setCurrentIdx(0);
    setIsFlipped(false);
  };

  const isCurrentMastered = currentCard
    ? progress.completedTopics.includes(currentCard.syllabusTopicId)
    : false;
  const currentWeakReason = currentCard
    ? weakReasonsBySyllabusId.get(currentCard.syllabusTopicId)
    : undefined;

  return (
    <section
      aria-label="Formula & Application Flashcard Mode"
      className="space-y-5"
    >
      {/* Flashcard Toolbar: Scope & Module Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Formula &amp; Application Flashcards
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Flip between governing ECE 423 equations and their practical engineering applications, prioritizing topics flagged in Weak Topics.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShuffle}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Shuffle className="h-3.5 w-3.5 text-sky-600" />
              <span>Shuffle</span>
            </button>
            <button
              type="button"
              onClick={handleResetOrder}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Prioritize Weak</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Deck Scope Filter */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            {[
              {
                id: 'weak' as DeckScope,
                label: `Weak Topics (${weakCount})`,
              },
              {
                id: 'unmastered' as DeckScope,
                label: `Unmastered (${unmasteredCount})`,
              },
              {
                id: 'all' as DeckScope,
                label: `All Cards (${ECE423_FLASHCARDS.length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setDeckScope(tab.id);
                  setCurrentIdx(0);
                  setIsFlipped(false);
                }}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                  deckScope === tab.id
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Module Filter */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            {[
              { id: 'all', label: 'All' },
              { id: SyllabusModule.PCM, label: 'PCM' },
              { id: SyllabusModule.COMPRESSION, label: 'Compression' },
              { id: SyllabusModule.MODULATION, label: 'Modulation' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setModuleFilter(tab.id as 'all' | SyllabusModule);
                  setCurrentIdx(0);
                  setIsFlipped(false);
                }}
                className={`cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  moduleFilter === tab.id
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State or Active Flip Card */}
      {!currentCard ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-4">
          <div className="mx-auto max-w-md space-y-2">
            <h3 className="text-base font-bold text-slate-950">
              {deckScope === 'weak'
                ? 'No weak topics flagged for this filter'
                : deckScope === 'unmastered'
                ? 'All syllabus topics in this view are mastered!'
                : 'No flashcards match this module filter'}
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">
              {deckScope === 'weak'
                ? 'Run a 20-minute CAT Sprint or check formulas in the Solver—any missed questions or failed checks automatically populate your Weak Topics flashcard deck.'
                : 'Switch to All Cards to keep formulas sharp before tomorrow’s assessment.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setDeckScope('all');
                setModuleFilter('all');
                setCurrentIdx(0);
                setIsFlipped(false);
              }}
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <span>Browse All {ECE423_FLASHCARDS.length} Flashcards</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            {deckScope === 'weak' && (
              <button
                type="button"
                onClick={onStartCatQuiz}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <PlayCircle className="h-3.5 w-3.5 text-sky-600" />
                <span>Run 20-Min CAT Diagnostic</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Card Progress Bar & Telemetry */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-mono font-semibold text-slate-900 tabular-nums">
              <span>
                Card {currentIdx + 1} of {activeCards.length}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="font-sans font-medium text-slate-500">
                {sessionReviewedIds.length} flipped this session
              </span>
            </div>
            <span className="text-xs text-slate-500">
              Click card face to flip between Formula &amp; Application
            </span>
          </div>

          {/* 3D Flip Card Stage */}
          <div className="flashcard-perspective">
            <div className={`flashcard-inner ${isFlipped ? 'is-flipped' : ''}`}>
              {/* FRONT FACE: GOVERNING FORMULA & VARIABLES */}
              <div
                aria-hidden={isFlipped}
                className={`flashcard-face rounded-xl border border-slate-200 bg-white p-6 md:p-7 flex flex-col justify-between gap-6 ${
                  isFlipped ? 'pointer-events-none' : ''
                }`}
              >
                <div className="space-y-5">
                  {/* Top metadata row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {MODULE_META[currentCard.module].title}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          currentCard.catPriority === 'Critical'
                            ? 'font-semibold text-amber-700'
                            : 'font-medium text-sky-700'
                        }
                      >
                        {currentCard.catPriority} Priority
                      </span>
                      {currentWeakReason && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Flagged in Weak Topics</span>
                          </span>
                        </>
                      )}
                    </div>
                    <span className="font-mono text-xs font-semibold text-sky-700">
                      Front · Governing Formula
                    </span>
                  </div>

                  {/* Title & Weak reason */}
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-bold text-slate-950">
                      {currentCard.title}
                    </h3>
                    {currentWeakReason && currentWeakReason.labels.length > 0 && (
                      <p className="text-xs text-amber-800 font-medium">
                        Sidebar Alert: {currentWeakReason.labels[0]}
                      </p>
                    )}
                  </div>

                  {/* Clickable Formula Stage */}
                  <div
                    role="button"
                    tabIndex={isFlipped ? -1 : 0}
                    onClick={() => setIsFlipped(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsFlipped(true);
                      }
                    }}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/80 p-5 md:p-6 space-y-4 transition-colors hover:border-sky-300 hover:bg-sky-50/30 focus-visible:outline-2 focus-visible:outline-sky-600"
                  >
                    <div className="font-mono text-base md:text-lg font-semibold text-slate-950 leading-relaxed break-words">
                      {currentCard.formulaDisplay}
                    </div>
                    <div className="border-t border-slate-200 pt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-slate-700">
                      {currentCard.variableLegend.map((item) => (
                        <div key={item} className="leading-relaxed">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Recall Prompt */}
                  <p className="text-sm font-medium text-slate-700">
                    Recall Prompt: {currentCard.promptQuestion}
                  </p>
                </div>

                {/* Front Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    tabIndex={isFlipped ? -1 : 0}
                    onClick={() => onToggleTopic(currentCard.syllabusTopicId)}
                    className={`cursor-pointer inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      isCurrentMastered
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-slate-300 bg-white text-slate-800 hover:border-emerald-400 hover:text-emerald-700'
                    }`}
                  >
                    {isCurrentMastered ? (
                      <CheckCircle2 className="animate-master-pop h-4 w-4 text-emerald-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-400" />
                    )}
                    <span>
                      {isCurrentMastered ? 'Topic Mastered' : 'Mark Topic Mastered'}
                    </span>
                  </button>

                  <button
                    type="button"
                    tabIndex={isFlipped ? -1 : 0}
                    onClick={() => setIsFlipped(true)}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Flip to Practical Application</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* BACK FACE: PRACTICAL APPLICATION, FAILURE MODE & CAT CHECK */}
              <div
                aria-hidden={!isFlipped}
                className={`flashcard-face flashcard-face-back rounded-xl border border-slate-200 bg-white p-6 md:p-7 flex flex-col justify-between gap-6 ${
                  !isFlipped ? 'pointer-events-none' : ''
                }`}
              >
                <div className="space-y-4">
                  {/* Top metadata row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {currentCard.title}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-emerald-700">
                      Back · Practical Application
                    </span>
                  </div>

                  {/* Practical Application */}
                  <div
                    role="button"
                    tabIndex={!isFlipped ? -1 : 0}
                    onClick={() => setIsFlipped(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsFlipped(false);
                      }
                    }}
                    className="cursor-pointer space-y-3 focus-visible:outline-2 focus-visible:outline-sky-600"
                  >
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-1.5">
                      <h4 className="text-xs font-semibold text-slate-950">
                        Real-World Engineering Application
                      </h4>
                      <p className="text-sm leading-relaxed text-slate-700">
                        {currentCard.practicalApplication}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-1">
                        <h4 className="font-semibold text-slate-900">
                          What Breaks / Physical Consequence
                        </h4>
                        <p className="leading-relaxed text-slate-600">
                          {currentCard.systemConsequence}
                        </p>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 space-y-1">
                        <h4 className="font-semibold text-amber-950">
                          CAT Exam Verification Trap
                        </h4>
                        <p className="leading-relaxed text-amber-900">
                          {currentCard.catTrap}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      tabIndex={!isFlipped ? -1 : 0}
                      onClick={() => onToggleTopic(currentCard.syllabusTopicId)}
                      className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        isCurrentMastered
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-slate-300 bg-white text-slate-800 hover:border-emerald-400 hover:text-emerald-700'
                      }`}
                    >
                      {isCurrentMastered ? (
                        <CheckCircle2 className="animate-master-pop h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      <span>
                        {isCurrentMastered ? 'Mastered' : 'Mark Mastered'}
                      </span>
                    </button>

                    {currentCard.recommendedLab && (
                      <button
                        type="button"
                        tabIndex={!isFlipped ? -1 : 0}
                        onClick={() => onOpenLab(currentCard.recommendedLab!)}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-300 hover:text-sky-700 whitespace-nowrap shrink-0"
                      >
                        <Sliders className="h-3.5 w-3.5 text-sky-600" />
                        <span>Simulate</span>
                      </button>
                    )}

                    {currentCard.recommendedCalc && (
                      <button
                        type="button"
                        tabIndex={!isFlipped ? -1 : 0}
                        onClick={() => onOpenCalculator(currentCard.recommendedCalc)}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-300 hover:text-sky-700 whitespace-nowrap shrink-0"
                      >
                        <Calculator className="h-3.5 w-3.5 text-sky-600" />
                        <span>Solver</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    tabIndex={!isFlipped ? -1 : 0}
                    onClick={() => setIsFlipped(false)}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Flip to Formula</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Deck Navigation & Self-Rating Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={activeCards.length <= 1}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={activeCards.length <= 1}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <span>Next</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleReviewAgain}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50/70 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100/70 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Re-Queue Card</span>
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <span>Got It · Next Card</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
