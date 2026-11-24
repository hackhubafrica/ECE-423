import { useEffect, useState } from 'react';
import { TopNav } from './components/TopNav';
import { StudySprintView } from './components/StudySprintView';
import { SignalLabsView } from './components/SignalLabsView';
import { SolverFormulasView } from './components/SolverFormulasView';
import { TimedQuizView } from './components/TimedQuizView';
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
  const [autoStartQuiz, setAutoStartQuiz] = useState<'cat_sprint' | null>(null);
  const [progress, setProgress] = useState<StudyProgressState>(loadInitialProgress);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota issues cleanly
    }
  }, [progress]);

  const handleToggleTopic = (topicId: string) => {
    setProgress((prev) => {
      const exists = prev.completedTopics.includes(topicId);
      return {
        ...prev,
        completedTopics: exists
          ? prev.completedTopics.filter((id) => id !== topicId)
          : [...prev.completedTopics, topicId],
      };
    });
  };

  const handleToggleMasteredExample = (exId: string) => {
    setProgress((prev) => {
      const exists = prev.masteredExamples.includes(exId);
      return {
        ...prev,
        masteredExamples: exists
          ? prev.masteredExamples.filter((id) => id !== exId)
          : [...prev.masteredExamples, exId],
        failedSolverAttempts: !exists
          ? prev.failedSolverAttempts.filter((item) => item.id !== exId)
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
            onStartCatQuiz={handleStartCatQuiz}
            onResolveQuizTopic={handleResolveQuizTopic}
            onResolveSolverAttempt={handleResolveSolverAttempt}
          />
        )}

        {activeTab === WorkspaceTab.LABS && (
          <SignalLabsView activeLab={activeLab} onSelectLab={setActiveLab} />
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
    </div>
  );
}
