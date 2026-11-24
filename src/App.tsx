import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { TopNav } from './components/TopNav';
import { StudySprintView } from './components/StudySprintView';
import { TheoryHistoryView } from './components/TheoryHistoryView';
import { SignalLabsView } from './components/SignalLabsView';
import { PracticalBenchView } from './components/PracticalBenchView';
import { SolverFormulasView } from './components/SolverFormulasView';
import { TimedQuizView } from './components/TimedQuizView';
import { ConfettiBurstEvent, ConfettiShower } from './components/ConfettiShower';
import { SYLLABUS_TOPICS } from './data/syllabusData';
import {
  FailedSolverAttempt,
  LabType,
  QuizAttempt,
  StudyProgressState,
  WorkspaceTab,
} from './types/ece423';

const STORAGE_KEY = 'ece423_study_progress_v1';

const DEFAULT_PROGRESS: StudyProgressState = {
  completedTopics: [],
  masteredExamples: [],
  masteredEssays: [],
  quizAttempts: [],
  failedSolverAttempts: [],
  resolvedWeakQuizIds: [],
};

function loadInitialProgress(): StudyProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<StudyProgressState>;
    return {
      completedTopics: Array.isArray(parsed.completedTopics) ? parsed.completedTopics : [],
      masteredExamples: Array.isArray(parsed.masteredExamples) ? parsed.masteredExamples : [],
      masteredEssays: Array.isArray(parsed.masteredEssays) ? parsed.masteredEssays : [],
      quizAttempts: Array.isArray(parsed.quizAttempts) ? parsed.quizAttempts : [],
      failedSolverAttempts: Array.isArray(parsed.failedSolverAttempts)
        ? parsed.failedSolverAttempts
        : [],
      resolvedWeakQuizIds: Array.isArray(parsed.resolvedWeakQuizIds)
        ? parsed.resolvedWeakQuizIds
        : [],
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(WorkspaceTab.SPRINT);
  const [activeLab, setActiveLab] = useState<LabType>(LabType.SAMPLING_PCM);
  const [requestedCalcId, setRequestedCalcId] = useState<string | undefined>(undefined);
  const [theorySubTab, setTheorySubTab] = useState<'principles' | 'timeline' | 'essays'>('principles');
  const [autoStartQuiz, setAutoStartQuiz] = useState<'cat_sprint' | null>(null);
  const [progress, setProgress] = useState<StudyProgressState>(loadInitialProgress);
  const [confettiBurst, setConfettiBurst] = useState<ConfettiBurstEvent | null>(null);
  const [reinforcementMsg, setReinforcementMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const triggerReinforcement = (
    variant: 'subtle' | 'celebrate',
    message: string
  ) => {
    setConfettiBurst({ id: Date.now() + Math.random(), variant });
    setReinforcementMsg(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setReinforcementMsg(null);
    }, 2600);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota issues cleanly
    }
  }, [progress]);

  const handleToggleTopic = (topicId: string) => {
    const exists = progress.completedTopics.includes(topicId);
    if (!exists) {
      const nextCount = progress.completedTopics.length + 1;
      const total = SYLLABUS_TOPICS.length;
      const variant = nextCount === total ? 'celebrate' : 'subtle';
      const msg =
        nextCount === total
          ? `All ${total} syllabus topics mastered!`
          : `Topic mastered · ${nextCount} / ${total} complete`;
      triggerReinforcement(variant, msg);
    }
    setProgress((prev) => {
      const already = prev.completedTopics.includes(topicId);
      return {
        ...prev,
        completedTopics: already
          ? prev.completedTopics.filter((id) => id !== topicId)
          : [...prev.completedTopics, topicId],
      };
    });
  };

  const handleToggleMasteredExample = (exId: string) => {
    const exists = progress.masteredExamples.includes(exId);
    if (!exists) {
      const nextCount = progress.masteredExamples.length + 1;
      triggerReinforcement(
        'subtle',
        `Worked problem mastered · ${nextCount} / 12`
      );
    }
    setProgress((prev) => {
      const already = prev.masteredExamples.includes(exId);
      return {
        ...prev,
        masteredExamples: already
          ? prev.masteredExamples.filter((id) => id !== exId)
          : [...prev.masteredExamples, exId],
        failedSolverAttempts: !already
          ? prev.failedSolverAttempts.filter((item) => item.id !== exId)
          : prev.failedSolverAttempts,
      };
    });
  };

  const handleToggleMasteredEssay = (essayId: string) => {
    const exists = progress.masteredEssays.includes(essayId);
    if (!exists) {
      const nextCount = progress.masteredEssays.length + 1;
      triggerReinforcement(
        'subtle',
        `Concept essay mastered · ${nextCount} / 9`
      );
    }
    setProgress((prev) => {
      const already = prev.masteredEssays.includes(essayId);
      return {
        ...prev,
        masteredEssays: already
          ? prev.masteredEssays.filter((id) => id !== essayId)
          : [...prev.masteredEssays, essayId],
        failedSolverAttempts: !already
          ? prev.failedSolverAttempts.filter((item) => item.id !== essayId)
          : prev.failedSolverAttempts,
      };
    });
  };

  const handleRecordSolverFailure = (
    failure: Omit<FailedSolverAttempt, 'failCount' | 'lastFailedAt'>
  ) => {
    setProgress((prev) => {
      const existing = prev.failedSolverAttempts.find((f) => f.id === failure.id);
      const updatedList = existing
        ? prev.failedSolverAttempts.map((f) =>
            f.id === failure.id
              ? {
                  ...f,
                  failCount: f.failCount + 1,
                  lastFailedAt: Date.now(),
                  lastReason: failure.lastReason,
                }
              : f
          )
        : [
            {
              ...failure,
              failCount: 1,
              lastFailedAt: Date.now(),
            },
            ...prev.failedSolverAttempts,
          ];
      return {
        ...prev,
        failedSolverAttempts: updatedList,
      };
    });
  };

  const handleResolveSolverAttempt = (id: string) => {
    setProgress((prev) => ({
      ...prev,
      failedSolverAttempts: prev.failedSolverAttempts.filter((item) => item.id !== id),
    }));
  };

  const handleResolveQuizTopic = (questionIds: string[]) => {
    setProgress((prev) => {
      const merged = new Set([...prev.resolvedWeakQuizIds, ...questionIds]);
      return {
        ...prev,
        resolvedWeakQuizIds: Array.from(merged),
      };
    });
  };

  const handleSaveQuizAttempt = (attempt: QuizAttempt) => {
    const pct = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;
    const label =
      attempt.mode === 'cat_sprint'
        ? 'CAT Sprint complete'
        : attempt.mode === 'full_exam'
        ? 'Full Mock Exam complete'
        : 'Module Drill complete';
    triggerReinforcement(
      attempt.mode === 'module_drill' ? 'subtle' : 'celebrate',
      `${label} · ${attempt.score}/${attempt.total} (${pct}%)`
    );

    const newlyMissedIds = new Set(
      (attempt.missedTopics || []).map((m) => m.questionId)
    );
    setProgress((prev) => ({
      ...prev,
      quizAttempts: [attempt, ...prev.quizAttempts].slice(0, 20),
      resolvedWeakQuizIds: prev.resolvedWeakQuizIds.filter(
        (id) => !newlyMissedIds.has(id)
      ),
    }));
  };

  const handleOpenLab = (lab: LabType) => {
    setActiveLab(lab);
    setActiveTab(WorkspaceTab.LABS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCalculator = (calcId?: string) => {
    setRequestedCalcId(calcId);
    setActiveTab(WorkspaceTab.SOLVER);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTheory = (subTab: 'principles' | 'timeline' | 'essays' = 'principles') => {
    setTheorySubTab(subTab);
    setActiveTab(WorkspaceTab.THEORY);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartCatQuiz = () => {
    setAutoStartQuiz('cat_sprint');
    setActiveTab(WorkspaceTab.QUIZ);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onStartCatQuiz={handleStartCatQuiz}
      />

      <main className="mx-auto w-full max-w-[1360px] flex-1 px-6 py-8">
        {activeTab === WorkspaceTab.SPRINT && (
          <StudySprintView
            progress={progress}
            onToggleTopic={handleToggleTopic}
            onOpenLab={handleOpenLab}
            onOpenCalculator={handleOpenCalculator}
            onOpenTheory={handleOpenTheory}
            onStartCatQuiz={handleStartCatQuiz}
            onResolveQuizTopic={handleResolveQuizTopic}
            onResolveSolverAttempt={handleResolveSolverAttempt}
          />
        )}

        {activeTab === WorkspaceTab.THEORY && (
          <TheoryHistoryView
            initialSubTab={theorySubTab}
            masteredEssays={progress.masteredEssays}
            failedSolverAttempts={progress.failedSolverAttempts}
            onToggleMasteredEssay={handleToggleMasteredEssay}
            onRecordEssayFailure={handleRecordSolverFailure}
            onResolveAttempt={handleResolveSolverAttempt}
            onOpenLab={handleOpenLab}
            onOpenCalculator={handleOpenCalculator}
          />
        )}

        {activeTab === WorkspaceTab.LABS && (
          <SignalLabsView
            activeLab={activeLab}
            onSelectLab={setActiveLab}
            onOpenTheory={handleOpenTheory}
          />
        )}

        {activeTab === WorkspaceTab.BENCH && (
          <PracticalBenchView
            onOpenLab={handleOpenLab}
            onOpenCalculator={handleOpenCalculator}
            onOpenTheory={handleOpenTheory}
          />
        )}

        {activeTab === WorkspaceTab.SOLVER && (
          <SolverFormulasView
            initialCalcId={requestedCalcId}
            masteredExamples={progress.masteredExamples}
            failedSolverAttempts={progress.failedSolverAttempts}
            onToggleMastered={handleToggleMasteredExample}
            onRecordSolverFailure={handleRecordSolverFailure}
            onResolveSolverAttempt={handleResolveSolverAttempt}
          />
        )}

        {activeTab === WorkspaceTab.QUIZ && (
          <TimedQuizView
            autoStartMode={autoStartQuiz}
            onClearAutoStart={() => setAutoStartQuiz(null)}
            attempts={progress.quizAttempts}
            onSaveAttempt={handleSaveQuizAttempt}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 px-6 py-4 text-xs text-slate-500">
          <span>ECE 423 Digital Communication Systems · Interactive Study &amp; Simulation Lab</span>
          <span>Progress saved locally in your browser</span>
        </div>
      </footer>

      <ConfettiShower burst={confettiBurst} />

      {reinforcementMsg && (
        <div
          role="status"
          aria-live="polite"
          className="animate-toast-in pointer-events-none fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 shadow-sm"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="tabular-nums">{reinforcementMsg}</span>
        </div>
      )}
    </div>
  );
}
