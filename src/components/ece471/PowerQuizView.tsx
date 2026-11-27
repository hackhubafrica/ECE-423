import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Flag,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { POWER_QUIZ_BANK } from '../../data/ece471PracticeData';
import { POWER_MODULE_META } from '../../data/ece471SyllabusData';
import {
  PowerMissedTopic,
  PowerModule,
  PowerQuizAttempt,
  PowerQuizQuestion,
} from '../../types/ece471';

interface PowerQuizViewProps {
  autoStartMode?: 'cat_sprint' | null;
  onClearAutoStart: () => void;
  attempts: PowerQuizAttempt[];
  onSaveAttempt: (attempt: PowerQuizAttempt) => void;
}

type QuizPhase = 'lobby' | 'active' | 'results';
type QuizMode = 'cat_sprint' | 'faults_drill' | 'dispatch_prot_drill' | 'full_exam';

const MODULE_ORDER: PowerModule[] = [
  PowerModule.LINE_CORONA,
  PowerModule.DISPATCH_AGC,
  PowerModule.SYMMETRICAL,
  PowerModule.FAULTS,
  PowerModule.TRANSIENTS,
  PowerModule.PROTECTION,
];

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function emptyBreakdown(): Record<PowerModule, { correct: number; total: number }> {
  return {
    [PowerModule.LINE_CORONA]: { correct: 0, total: 0 },
    [PowerModule.DISPATCH_AGC]: { correct: 0, total: 0 },
    [PowerModule.SYMMETRICAL]: { correct: 0, total: 0 },
    [PowerModule.FAULTS]: { correct: 0, total: 0 },
    [PowerModule.TRANSIENTS]: { correct: 0, total: 0 },
    [PowerModule.PROTECTION]: { correct: 0, total: 0 },
  };
}

export const PowerQuizView: React.FC<PowerQuizViewProps> = ({
  autoStartMode,
  onClearAutoStart,
  attempts,
  onSaveAttempt,
}) => {
  const [phase, setPhase] = useState<QuizPhase>('lobby');
  const [mode, setMode] = useState<QuizMode>('cat_sprint');
  const [questions, setQuestions] = useState<PowerQuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isTimed, setIsTimed] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const startSession = (selectedMode: QuizMode) => {
    let pool: PowerQuizQuestion[] = [];
    let duration = 15 * 60;
    const timed = true;

    if (selectedMode === 'cat_sprint') {
      pool = POWER_QUIZ_BANK.filter((q) => q.catHighYield);
      duration = 15 * 60;
    } else if (selectedMode === 'faults_drill') {
      pool = POWER_QUIZ_BANK.filter(
        (q) => q.module === PowerModule.SYMMETRICAL || q.module === PowerModule.FAULTS
      );
      duration = 12 * 60;
    } else if (selectedMode === 'dispatch_prot_drill') {
      pool = POWER_QUIZ_BANK.filter(
        (q) =>
          q.module === PowerModule.DISPATCH_AGC ||
          q.module === PowerModule.TRANSIENTS ||
          q.module === PowerModule.PROTECTION
      );
      duration = 12 * 60;
    } else {
      pool = [...POWER_QUIZ_BANK];
      duration = 30 * 60;
    }

    setMode(selectedMode);
    setQuestions(pool);
    setCurrentIdx(0);
    setAnswers({});
    setFlagged({});
    setSecondsLeft(duration);
    setElapsedSeconds(0);
    setIsTimed(timed);
    setPhase('active');
  };

  useEffect(() => {
    if (autoStartMode === 'cat_sprint') {
      startSession('cat_sprint');
      onClearAutoStart();
    }
  }, [autoStartMode, onClearAutoStart]);

  const finishQuiz = () => {
    const breakdown = emptyBreakdown();
    const missedTopics: PowerMissedTopic[] = [];
    const correctIds: string[] = [];
    let score = 0;

    questions.forEach((q) => {
      breakdown[q.module].total += 1;
      if (answers[q.id] === q.correctIndex) {
        score += 1;
        breakdown[q.module].correct += 1;
        correctIds.push(q.id);
      } else {
        missedTopics.push({ questionId: q.id, topic: q.topic, module: q.module });
      }
    });

    onSaveAttempt({
      id: `pwr_quiz_${Date.now()}`,
      mode,
      timestamp: Date.now(),
      score,
      total: questions.length,
      durationSeconds: elapsedSeconds,
      moduleBreakdown: breakdown,
      missedTopics,
      correctQuestionIds: correctIds,
    });
    setPhase('results');
  };

  useEffect(() => {
    if (phase !== 'active') return;
    const id = window.setInterval(() => {
      setElapsedSeconds((e) => e + 1);
      if (isTimed) {
        setSecondsLeft((s) => {
          if (s <= 1) {
            finishQuiz();
            return 0;
          }
          return s - 1;
        });
      }
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isTimed, questions, answers]);

  if (phase === 'lobby') {
    const catCount = POWER_QUIZ_BANK.filter((q) => q.catHighYield).length;
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            ECE 471 Timed Quiz &amp; CAT 1 Exam Drills
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Drill CAT 1 Transmission Line &amp; Peek Corona calculations under exam timing or take the full Power Systems II assessment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              id: 'cat_sprint' as const,
              title: `CAT 1 Sprint (${catCount} Questions · 15 min)`,
              desc: 'Focused drill on corona effects, DC/AC resistance, GMR inductance, charging current, bundled conductors, and Peek V_d & P_c.',
              cta: 'Start CAT 1 Sprint',
            },
            {
              id: 'faults_drill' as const,
              title: 'Symmetrical & Unbalanced Faults Drill (12 min)',
              desc: 'Practice Fortescue identities, per-unit base changes, and SLG/LL/DLG sequence interconnections.',
              cta: 'Start Faults Drill',
            },
            {
              id: 'dispatch_prot_drill' as const,
              title: 'Dispatch, Transients & Protection Drill (12 min)',
              desc: 'Cover λ-iteration incremental cost, primary droop vs AGC, Bewley open-end reflections, and Zone 1 Mho reach.',
              cta: 'Start Systems Drill',
            },
            {
              id: 'full_exam' as const,
              title: `Full ECE 471 Mock Exam (${POWER_QUIZ_BANK.length} Questions · 30 min)`,
              desc: 'Comprehensive assessment across all 6 syllabus modules with module-by-module accuracy scoring.',
              cta: 'Start Full Mock Exam',
            },
          ].map((card) => (
            <div
              key={card.id}
              className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-1.5">
                <h2 className="text-base font-bold text-slate-950">{card.title}</h2>
                <p className="text-xs leading-relaxed text-slate-600">{card.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => startSession(card.id)}
                className="cursor-pointer w-fit rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                {card.cta}
              </button>
            </div>
          ))}
        </div>

        {attempts.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <h2 className="text-sm font-bold text-slate-950">Recent Quiz Attempts</h2>
            <div className="divide-y divide-slate-200 text-xs">
              {attempts.slice(0, 5).map((a) => (
                <div key={a.id} className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    {a.mode.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span className="font-mono text-slate-600">
                    {a.score}/{a.total} ({Math.round((a.score / a.total) * 100)}%) · {formatClock(a.durationSeconds)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'active') {
    const q = questions[currentIdx];
    const selected = answers[q.id];

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-xs">
          <div className="font-mono font-semibold text-slate-900">
            Question {currentIdx + 1} / {questions.length} · {POWER_MODULE_META[q.module].shortTitle}
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-mono font-bold text-emerald-800">
              <Clock className="h-3.5 w-3.5" />
              {formatClock(secondsLeft)}
            </span>
            <button
              type="button"
              onClick={() => setFlagged((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
              className={`cursor-pointer rounded p-1 ${
                flagged[q.id] ? 'text-amber-600' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-emerald-700">{q.topic}</div>
            <h2 className="text-base font-bold text-slate-950">{q.question}</h2>
          </div>

          <div className="space-y-2.5">
            {q.options.map((opt, idx) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                className={`cursor-pointer w-full rounded-lg border px-4 py-3 text-left text-xs font-medium transition-colors ${
                  selected === idx
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold'
                    : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="font-mono font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                {opt}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-[11px] text-slate-600">
            <strong>Formula Hint:</strong> {q.formulaHint}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
            >
              Previous
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx((i) => i + 1)}
                className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Next Question
              </button>
            ) : (
              <button
                type="button"
                onClick={finishQuiz}
                className="cursor-pointer rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Submit &amp; Grade Quiz
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Results phase
  const latest = attempts[0];
  const score = questions.filter((q) => answers[q.id] === q.correctIndex).length;
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-emerald-700">Assessment Complete</div>
          <h1 className="text-2xl font-bold text-slate-950 font-mono tabular-nums">
            {score} / {questions.length} ({pct}%)
          </h1>
          <p className="text-xs text-slate-500">
            Duration: {formatClock(elapsedSeconds)} · Missed items automatically synced to Weak Topics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPhase('lobby')}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Back to Quiz Lobby</span>
        </button>
      </div>

      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {MODULE_ORDER.map((m) => {
            const b = latest.moduleBreakdown[m];
            return (
              <div key={m} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                <div className="text-[11px] text-slate-500 truncate">{POWER_MODULE_META[m].shortTitle}</div>
                <div className="font-mono font-bold text-slate-950 mt-0.5">
                  {b && b.total > 0 ? `${b.correct}/${b.total}` : '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => {
          const userAns = answers[q.id];
          const ok = userAns === q.correctIndex;
          return (
            <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="font-bold text-slate-950">
                  {idx + 1}. {q.question}
                </div>
                {ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-amber-600 shrink-0" />
                )}
              </div>
              <div className="text-slate-700">
                <strong>Correct Answer:</strong> {q.options[q.correctIndex]}
              </div>
              {!ok && (
                <div className="text-amber-800">
                  <strong>Your Answer:</strong> {userAns !== undefined ? q.options[userAns] : 'Unanswered'}
                </div>
              )}
              <div className="rounded bg-slate-50 p-2.5 text-slate-600">{q.explanation}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
