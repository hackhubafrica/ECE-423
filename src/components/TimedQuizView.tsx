import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Flag,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { QUIZ_QUESTIONS } from '../data/quizQuestions';
import { MODULE_META } from '../data/syllabusData';
import { QuizAttempt, QuizQuestion, SyllabusModule } from '../types/ece423';

interface TimedQuizViewProps {
  autoStartMode?: 'cat_sprint' | null;
  onClearAutoStart: () => void;
  attempts: QuizAttempt[];
  onSaveAttempt: (attempt: QuizAttempt) => void;
}

type QuizPhase = 'lobby' | 'active' | 'results';
type QuizMode = 'cat_sprint' | 'full_exam' | 'module_drill';

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const TimedQuizView: React.FC<TimedQuizViewProps> = ({
  autoStartMode,
  onClearAutoStart,
  attempts,
  onSaveAttempt,
}) => {
  const [phase, setPhase] = useState<QuizPhase>('lobby');
  const [mode, setMode] = useState<QuizMode>('cat_sprint');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isTimed, setIsTimed] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'missed'>('all');

  const startSession = (
    selectedMode: QuizMode,
    moduleFilter?: SyllabusModule
  ) => {
    let pool: QuizQuestion[] = [];
    let duration = 20 * 60;
    let timed = true;

    if (selectedMode === 'cat_sprint') {
      pool = QUIZ_QUESTIONS.filter((q) => q.catHighYield);
      duration = 20 * 60;
      timed = true;
    } else if (selectedMode === 'full_exam') {
      pool = [...QUIZ_QUESTIONS];
      duration = 45 * 60;
      timed = true;
    } else {
      pool = moduleFilter
        ? QUIZ_QUESTIONS.filter((q) => q.module === moduleFilter)
        : [...QUIZ_QUESTIONS];
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
    const breakdown: Record<SyllabusModule, { correct: number; total: number }> = {
      [SyllabusModule.PCM]: { correct: 0, total: 0 },
      [SyllabusModule.COMPRESSION]: { correct: 0, total: 0 },
      [SyllabusModule.MODULATION]: { correct: 0, total: 0 },
    };
    const missedTopics: { questionId: string; topic: string; module: SyllabusModule }[] = [];
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

    const attempt: QuizAttempt = {
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

  // Timer tick
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

  // Auto-submit on timer expiration
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
    const breakdown: Record<SyllabusModule, { correct: number; total: number }> = {
      [SyllabusModule.PCM]: { correct: 0, total: 0 },
      [SyllabusModule.COMPRESSION]: { correct: 0, total: 0 },
      [SyllabusModule.MODULATION]: { correct: 0, total: 0 },
    };

    questions.forEach((q) => {
      breakdown[q.module].total += 1;
      if (answers[q.id] === q.correctIndex) {
        correct += 1;
        breakdown[q.module].correct += 1;
      }
    });

    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    return { correct, total: questions.length, pct, breakdown };
  }, [phase, questions, answers]);

  // =========================================================================
  // LOBBY
  // =========================================================================
  if (phase === 'lobby') {
    const catCount = QUIZ_QUESTIONS.filter((q) => q.catHighYield).length;
    const fullCount = QUIZ_QUESTIONS.length;
    const perModuleCount = Math.round(fullCount / 3);

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Timed CAT &amp; Final Exam Simulator
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Test your speed and accuracy under exam conditions, then inspect worked mathematical derivations and conceptual explanations for every question.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Tomorrow's CAT Sprint */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-amber-700">Recommended for Tonight</span>
                <span className="font-mono tabular-nums">{catCount} Questions · 20:00</span>
              </div>
              <h2 className="text-xl font-bold text-slate-950">
                Tomorrow&apos;s CAT High-Yield Sprint
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                Curated {catCount}-question timed sprint covering the highest-probability CAT derivations and core concepts across Nyquist/PCM, TDM, Line Coding, Shannon, Delta Modulation, and Digital Modulation BER/Bandwidth.
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

          {/* Card 2: Full Mock Exam */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-sky-700">Next Month Exam Prep</span>
                <span className="font-mono tabular-nums">{fullCount} Questions · 45:00</span>
              </div>
              <h2 className="text-xl font-bold text-slate-950">
                Full ECE 423 Mock Examination
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                Comprehensive {fullCount}-question exam simulation spanning numerical problems, threshold effects, μ-Law/A-Law, DPCM/ADPCM, LPC/CELP/JPEG/MPEG, matched-filter receivers, and historical principles.
              </p>
            </div>
            <button
              type="button"
              onClick={() => startSession('full_exam')}
              className="cursor-pointer w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
            >
              Start 45-Min Full Mock Exam
            </button>
          </div>
        </div>

        {/* Untimed Module Drills */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              Untimed Topic Drills ({perModuleCount} Questions Each)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Practice a single module at your own pace without a countdown clock.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[SyllabusModule.PCM, SyllabusModule.COMPRESSION, SyllabusModule.MODULATION].map(
              (mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => startSession('module_drill', mod)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-left hover:border-sky-300 hover:bg-sky-50/40 transition-colors"
                >
                  <div className="text-sm font-semibold text-slate-950">
                    {MODULE_META[mod].title}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{MODULE_META[mod].subtitle}</div>
                </button>
              )
            )}
          </div>
        </div>

        {/* Recent Attempt History */}
        {attempts.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-950">Recent Attempt History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Mode</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">Time Used</th>
                    <th className="py-2 pr-4">PCM</th>
                    <th className="py-2 pr-4">Compression</th>
                    <th className="py-2">Modulation</th>
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
                          : 'Module Drill'}
                      </td>
                      <td className="py-2.5 pr-4 font-semibold">
                        {att.score}/{att.total} ({Math.round((att.score / att.total) * 100)}%)
                      </td>
                      <td className="py-2.5 pr-4">{formatClock(att.durationSeconds)}</td>
                      <td className="py-2.5 pr-4">
                        {att.moduleBreakdown.pcm.correct}/{att.moduleBreakdown.pcm.total}
                      </td>
                      <td className="py-2.5 pr-4">
                        {att.moduleBreakdown.compression.correct}/
                        {att.moduleBreakdown.compression.total}
                      </td>
                      <td className="py-2.5">
                        {att.moduleBreakdown.modulation.correct}/
                        {att.moduleBreakdown.modulation.total}
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
        {/* Top bar for active exam */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-slate-950">
              {mode === 'cat_sprint'
                ? 'CAT High-Yield Sprint'
                : mode === 'full_exam'
                ? 'Full ECE 423 Mock Exam'
                : 'Topic Practice Drill'}
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
          {/* Question Card */}
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 space-y-6">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-semibold text-slate-900">
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <span aria-hidden="true">·</span>
                <span>{MODULE_META[currentQuestion.module].title}</span>
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

          {/* Question Navigator Grid */}
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
                    ? 'Assessment Completed · Strong CAT Readiness'
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
                onClick={() => startSession(mode)}
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

          {/* Module diagnostic breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[SyllabusModule.PCM, SyllabusModule.COMPRESSION, SyllabusModule.MODULATION].map(
              (mod) => {
                const b = resultsStats.breakdown[mod];
                if (b.total === 0) return null;
                const modPct = Math.round((b.correct / b.total) * 100);
                return (
                  <div
                    key={mod}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1.5"
                  >
                    <div className="text-xs font-semibold text-slate-700">
                      {MODULE_META[mod].title}
                    </div>
                    <div className="font-mono text-lg font-bold tabular-nums text-slate-950">
                      {b.correct} / {b.total} ({modPct}%)
                    </div>
                    <div className="text-xs text-slate-600">
                      {modPct >= 75 ? 'Exam Ready' : 'Review Worked Examples'}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Review filter */}
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
                      {MODULE_META[q.module].title} · {q.topic}
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
