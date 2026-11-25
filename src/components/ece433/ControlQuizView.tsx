import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Flag,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import {
  CONTROL_QUIZ_BANK,
  STATE_SPACE_QUIZ_BANK,
} from '../../data/ece433PracticeData';
import { CONTROL_MODULE_META } from '../../data/ece433SyllabusData';
import {
  ControlMissedTopic,
  ControlModule,
  ControlQuizAttempt,
  ControlQuizQuestion,
} from '../../types/ece433';

interface ControlQuizViewProps {
  autoStartMode?: 'cat_sprint' | null;
  onClearAutoStart: () => void;
  attempts: ControlQuizAttempt[];
  onSaveAttempt: (attempt: ControlQuizAttempt) => void;
}

type QuizPhase = 'lobby' | 'active' | 'results';
type QuizMode = 'cat_sprint' | 'full_exam' | 'module_drill' | 'state_space_drill';

const MODULE_ORDER: ControlModule[] = [
  ControlModule.PID,
  ControlModule.FREQ_COMP,
  ControlModule.STATE_SPACE,
  ControlModule.DESIGN_OBS,
];

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function emptyBreakdown(): Record<ControlModule, { correct: number; total: number }> {
  return {
    [ControlModule.PID]: { correct: 0, total: 0 },
    [ControlModule.FREQ_COMP]: { correct: 0, total: 0 },
    [ControlModule.STATE_SPACE]: { correct: 0, total: 0 },
    [ControlModule.DESIGN_OBS]: { correct: 0, total: 0 },
  };
}

export const ControlQuizView: React.FC<ControlQuizViewProps> = ({
  autoStartMode,
  onClearAutoStart,
  attempts,
  onSaveAttempt,
}) => {
  const [phase, setPhase] = useState<QuizPhase>('lobby');
  const [mode, setMode] = useState<QuizMode>('cat_sprint');
  const [questions, setQuestions] = useState<ControlQuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isTimed, setIsTimed] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'missed'>('all');

  const startSession = (
    selectedMode: QuizMode,
    moduleFilter?: ControlModule,
    timedOverride?: boolean
  ) => {
    let pool: ControlQuizQuestion[] = [];
    let duration = 20 * 60;
    let timed = true;

    if (selectedMode === 'cat_sprint') {
      pool = CONTROL_QUIZ_BANK.filter((q) => q.catHighYield);
      duration = 20 * 60;
      timed = true;
    } else if (selectedMode === 'full_exam') {
      pool = [...CONTROL_QUIZ_BANK];
      duration = 35 * 60;
      timed = true;
    } else if (selectedMode === 'state_space_drill') {
      pool = [...STATE_SPACE_QUIZ_BANK];
      timed = timedOverride ?? true;
      duration = timed ? 15 * 60 : 0;
    } else {
      pool = moduleFilter
        ? CONTROL_QUIZ_BANK.filter((q) => q.module === moduleFilter)
        : [...CONTROL_QUIZ_BANK];
      duration = 0;
      timed = false;
    }

    setMode(selectedMode);
    setQuestions(pool);
    setCurrentIdx(0);
    setAnswers({});
    setFlagged({});
    setSecondsLeft(duration);
    setElapsedSeconds(0);
    setIsTimed(timed);
    setReviewFilter('all');
    setPhase('active');
  };

  useEffect(() => {
    if (autoStartMode === 'cat_sprint') {
      startSession('cat_sprint');
      onClearAutoStart();
    }
  }, [autoStartMode, onClearAutoStart]);

  const submitQuiz = () => {
    let correctCount = 0;
    const breakdown = emptyBreakdown();
    const missedTopics: ControlMissedTopic[] = [];
    const correctQuestionIds: string[] = [];

    questions.forEach((q) => {
      breakdown[q.module].total += 1;
      if (answers[q.id] === q.correctIndex) {
        correctCount += 1;
        breakdown[q.module].correct += 1;
        correctQuestionIds.push(q.id);
      } else {
        missedTopics.push({
          questionId: q.id,
          topic: q.topic,
          module: q.module,
        });
      }
    });

    const attempt: ControlQuizAttempt = {
      id: `${Date.now()}`,
      mode,
      timestamp: Date.now(),
      score: correctCount,
      total: questions.length,
      durationSeconds: elapsedSeconds,
      moduleBreakdown: breakdown,
      missedTopics,
      correctQuestionIds,
    };

    onSaveAttempt(attempt);
    setPhase('results');
  };

  useEffect(() => {
    if (phase !== 'active') return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      if (isTimed) {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            window.clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [phase, isTimed]);

  useEffect(() => {
    if (phase === 'active' && isTimed && secondsLeft === 0 && elapsedSeconds > 0) {
      submitQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase, isTimed]);

  const currentQuestion = questions[currentIdx];

  const resultsStats = useMemo(() => {
    if (phase !== 'results') return null;
    let correct = 0;
    const breakdown = emptyBreakdown();

    questions.forEach((q) => {
      breakdown[q.module].total += 1;
      if (answers[q.id] === q.correctIndex) {
        correct += 1;
        breakdown[q.module].correct += 1;
      }
    });

    const pct =
      questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    return { correct, total: questions.length, pct, breakdown };
  }, [phase, questions, answers]);

  // =========================================================================
  // LOBBY
  // =========================================================================
  if (phase === 'lobby') {
    const catCount = CONTROL_QUIZ_BANK.filter((q) => q.catHighYield).length;
    const fullCount = CONTROL_QUIZ_BANK.length;

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            ECE 433 Control System II · Timed CAT &amp; Exam Simulator
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Drill PID/op-amp derivations, Ziegler–Nichols, Bode Lead/Lag margins, canonical state-space, Kalman/Gilbert rank tests, pole placement, and Luenberger observers under exam timing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-amber-700">High-Probability CAT Sprint</span>
                <span className="font-mono tabular-nums">{catCount} Questions · 20:00</span>
              </div>
              <h2 className="text-xl font-bold text-slate-950">
                ECE 433 CAT High-Yield Sprint
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                Focused {catCount}-question timed drill targeting ZN PID rules, op-amp component sizing, anti-windup, Lead/Lag phase margin, CCF/OCF matrices, similarity invariance, Kalman rank, and observer separation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => startSession('cat_sprint')}
              className="cursor-pointer w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
            >
              Start 20-Min CAT Sprint
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-sky-700">Complete 3-Unit Exam Prep</span>
                <span className="font-mono tabular-nums">{fullCount} Questions · 35:00</span>
              </div>
              <h2 className="text-xl font-bold text-slate-950">
                Full Control System II Mock Exam
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                Full {fullCount}-question assessment across every syllabus section—feeding missed concepts automatically into your Weak Topics sidebar for targeted flashcard and solver recovery.
              </p>
            </div>
            <button
              type="button"
              onClick={() => startSession('full_exam')}
              className="cursor-pointer w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
            >
              Start 35-Min Full Mock Exam
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              Untimed Module Drills
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Practice any single Control System II module without a countdown clock.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MODULE_ORDER.map((mod) => {
              const count = CONTROL_QUIZ_BANK.filter((q) => q.module === mod).length;
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => startSession('module_drill', mod)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-left hover:border-sky-300 hover:bg-sky-50/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-950">
                      {CONTROL_MODULE_META[mod].shortTitle}
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      {count}Q
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                    {CONTROL_MODULE_META[mod].subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dedicated State-Space Representation, Controllability & Eigenvalues Section */}
        <div className="rounded-xl border border-sky-200 bg-white p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-sky-700 font-semibold">
                <span>Focused Matrix &amp; Linear Systems Section</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="font-mono text-slate-500 tabular-nums">
                  {STATE_SPACE_QUIZ_BANK.length} Questions · 15:00 Timed or Untimed
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-950">
                State-Space Representation, Controllability &amp; Eigenvalues
              </h2>
              <p className="text-sm text-slate-600 max-w-3xl">
                Targeted practice on constructing Kalman controllability matrices C = [B, AB, …], evaluating rank for uncontrollable modes, computing 2×2 &amp; 3×3 eigenvalues from det(λI − A) = 0, and mapping ODEs into canonical forms.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => startSession('state_space_drill', undefined, true)}
                className="cursor-pointer rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap"
              >
                Start 15-Min Matrix Drill
              </button>
              <button
                type="button"
                onClick={() => startSession('state_space_drill', undefined, false)}
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
              >
                Untimed Practice
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-950">Controllability Matrices</span>
                <span className="font-mono text-[11px] text-sky-700 tabular-nums">
                  {STATE_SPACE_QUIZ_BANK.filter((q) => q.topic === 'Controllability Matrix & Rank').length}Q
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-700">
                C = [B, AB, …, Aⁿ⁻¹B]
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Build 2×2 and 3×3 Kalman matrices, evaluate det(C) ≠ 0 or rank deficiency, and identify uncontrollable eigenvalues.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-950">Eigenvalue Computation</span>
                <span className="font-mono text-[11px] text-sky-700 tabular-nums">
                  {STATE_SPACE_QUIZ_BANK.filter((q) => q.topic === 'Eigenvalues & Characteristic Polynomial').length}Q
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-700">
                det(λI − A) = λ² − tr(A)λ + det(A) = 0
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Compute real, complex-conjugate, and triangular 3×3 eigenvalues directly and classify LHP vs RHP equilibrium stability.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-950">Canonical &amp; Invariance</span>
                <span className="font-mono text-[11px] text-sky-700 tabular-nums">
                  {STATE_SPACE_QUIZ_BANK.filter(
                    (q) =>
                      q.topic !== 'Controllability Matrix & Rank' &&
                      q.topic !== 'Eigenvalues & Characteristic Polynomial'
                  ).length}Q
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-700">
                A_o = A_cᵀ · rank(C(A−BK, B)) = n
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Convert higher-order ODEs and G(s) into Observable/Control Canonical Forms and verify controllability invariance under state feedback.
              </p>
            </div>
          </div>
        </div>

        {attempts.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-950">Recent ECE 433 Attempt History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Mode</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">Time Used</th>
                    <th className="py-2 pr-4">PID/OpAmp</th>
                    <th className="py-2 pr-4">Bode Comp</th>
                    <th className="py-2 pr-4">State-Space</th>
                    <th className="py-2">Kalman/Obs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-slate-800">
                  {attempts.slice(0, 6).map((att) => (
                    <tr key={att.id}>
                      <td className="py-2.5 pr-4 font-sans font-medium">
                        {att.mode === 'cat_sprint'
                          ? 'CAT Sprint'
                          : att.mode === 'full_exam'
                          ? 'Full Mock'
                          : att.mode === 'state_space_drill'
                          ? 'State-Space Drill'
                          : 'Module Drill'}
                      </td>
                      <td className="py-2.5 pr-4 font-semibold">
                        {att.score}/{att.total} ({Math.round((att.score / att.total) * 100)}%)
                      </td>
                      <td className="py-2.5 pr-4">{formatClock(att.durationSeconds)}</td>
                      <td className="py-2.5 pr-4">
                        {att.moduleBreakdown.pid.correct}/{att.moduleBreakdown.pid.total}
                      </td>
                      <td className="py-2.5 pr-4">
                        {att.moduleBreakdown.freq_comp.correct}/{att.moduleBreakdown.freq_comp.total}
                      </td>
                      <td className="py-2.5 pr-4">
                        {att.moduleBreakdown.state_space.correct}/{att.moduleBreakdown.state_space.total}
                      </td>
                      <td className="py-2.5">
                        {att.moduleBreakdown.design_obs.correct}/{att.moduleBreakdown.design_obs.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // ACTIVE QUIZ SESSION
  // =========================================================================
  if (phase === 'active' && currentQuestion) {
    const answeredCount = Object.keys(answers).length;
    const isFlagged = !!flagged[currentQuestion.id];

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-slate-950">
              {mode === 'cat_sprint'
                ? 'ECE 433 CAT High-Yield Sprint'
                : mode === 'full_exam'
                ? 'Full Control System II Mock Exam'
                : mode === 'state_space_drill'
                ? 'State-Space, Controllability & Eigenvalues Drill'
                : 'ECE 433 Module Practice Drill'}
            </span>
            <span aria-hidden="true" className="text-slate-300">
              |
            </span>
            <span className="font-mono text-xs text-slate-600 tabular-nums">
              Answered {answeredCount} / {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`inline-flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums ${
                isTimed && secondsLeft < 180 ? 'text-red-600' : 'text-slate-900'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>
                {isTimed ? formatClock(secondsLeft) : formatClock(elapsedSeconds)}
              </span>
            </div>
            <button
              type="button"
              onClick={submitQuiz}
              className="cursor-pointer rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
            >
              Submit &amp; Grade
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 space-y-6">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-semibold text-slate-900">
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <span aria-hidden="true">·</span>
                <span>{CONTROL_MODULE_META[currentQuestion.module].shortTitle}</span>
                <span aria-hidden="true">·</span>
                <span>{currentQuestion.topic}</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFlagged((prev) => ({
                    ...prev,
                    [currentQuestion.id]: !prev[currentQuestion.id],
                  }))
                }
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
                  isFlagged
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Flag className="h-3.5 w-3.5" />
                <span>{isFlagged ? 'Flagged' : 'Flag'}</span>
              </button>
            </div>

            <h2 className="text-base md:text-lg font-semibold leading-relaxed text-slate-950">
              {currentQuestion.question}
            </h2>

            <div className="space-y-2.5">
              {currentQuestion.options.map((opt, idx) => {
                const selected = answers[currentQuestion.id] === idx;
                const letter = String.fromCharCode(65 + idx);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQuestion.id]: idx,
                      }))
                    }
                    className={`cursor-pointer w-full rounded-lg border p-3.5 text-left text-sm transition-colors flex items-start gap-3 ${
                      selected
                        ? 'border-sky-600 bg-sky-50/70 text-slate-950 font-medium'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-xs font-semibold ${
                        selected
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-300 text-slate-600'
                      }`}
                    >
                      {letter}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {currentIdx < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))
                  }
                  className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Next Question
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submitQuiz}
                  className="cursor-pointer rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  Finish &amp; Grade
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-950">Question Navigator</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAns = answers[q.id] !== undefined;
                const isCurr = idx === currentIdx;
                const isFlg = !!flagged[q.id];
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`cursor-pointer relative rounded-md border py-2 font-mono text-xs font-semibold tabular-nums transition-colors ${
                      isCurr
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : isAns
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                    {isFlg && (
                      <span
                        aria-label="Flagged"
                        className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 border border-white"
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setPhase('lobby')}
              className="cursor-pointer w-full rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Exit to Quiz Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RESULTS & WORKED SOLUTION REVIEW
  // =========================================================================
  if (phase === 'results' && resultsStats) {
    const displayedQuestions =
      reviewFilter === 'missed'
        ? questions.filter((q) => answers[q.id] !== q.correctIndex)
        : questions;

    return (
      <div className="space-y-6">
        <div className="animate-toast-in rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="animate-master-pop h-4 w-4 shrink-0" />
                <span>
                  {resultsStats.pct >= 75
                    ? 'Assessment Completed · Strong ECE 433 Readiness'
                    : 'Assessment Completed · Review Missed Concepts Below'}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-950 mt-1 tabular-nums">
                Score: {resultsStats.correct} / {resultsStats.total} ({resultsStats.pct}%)
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => startSession(mode, undefined, isTimed)}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retake</span>
              </button>
              <button
                type="button"
                onClick={() => setPhase('lobby')}
                className="cursor-pointer rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
              >
                Back to Quiz Lobby
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULE_ORDER.map((mod) => {
              const b = resultsStats.breakdown[mod];
              if (b.total === 0) return null;
              const modPct = Math.round((b.correct / b.total) * 100);
              return (
                <div
                  key={mod}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1.5"
                >
                  <div className="text-xs font-semibold text-slate-700">
                    {CONTROL_MODULE_META[mod].shortTitle}
                  </div>
                  <div className="font-mono text-lg font-bold tabular-nums text-slate-950">
                    {b.correct} / {b.total} ({modPct}%)
                  </div>
                  <div className="text-xs text-slate-600">
                    {modPct >= 75 ? 'Exam Ready' : 'Review Worked Examples'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-950">Detailed Solutions Review</h2>
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setReviewFilter('all')}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold ${
                reviewFilter === 'all' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
              }`}
            >
              All ({questions.length})
            </button>
            <button
              type="button"
              onClick={() => setReviewFilter('missed')}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold ${
                reviewFilter === 'missed' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
              }`}
            >
              Missed ({questions.length - resultsStats.correct})
            </button>
          </div>
        </div>

        {displayedQuestions.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm font-medium text-emerald-900">
            Zero missed questions! Every item in this assessment was answered correctly.
          </div>
        ) : (
          <div className="space-y-4">
            {displayedQuestions.map((q) => {
              const chosen = answers[q.id];
              const isCorrect = chosen === q.correctIndex;
              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-xs text-slate-500">
                      {CONTROL_MODULE_META[q.module].shortTitle} · {q.topic}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        isCorrect ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Correct</span>
                        </>
                      ) : chosen === undefined ? (
                        <>
                          <AlertCircle className="h-4 w-4" />
                          <span>Unanswered</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          <span>Incorrect</span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-950">{q.question}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                      <span className="text-slate-500">Your Answer: </span>
                      <span className="font-medium text-slate-900">
                        {chosen !== undefined ? q.options[chosen] : 'No selection'}
                      </span>
                    </div>
                    <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-2.5">
                      <span className="text-emerald-800">Correct Answer: </span>
                      <span className="font-semibold text-emerald-950">
                        {q.options[q.correctIndex]}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-1 text-xs">
                    <div className="font-mono font-semibold text-sky-800">
                      Formula: {q.formulaHint}
                    </div>
                    <p className="text-slate-700 leading-relaxed">{q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
};
