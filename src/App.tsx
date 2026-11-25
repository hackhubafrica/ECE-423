import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { TopNav } from './components/TopNav';
import { StudySprintView } from './components/StudySprintView';
import { TheoryHistoryView } from './components/TheoryHistoryView';
import { SignalLabsView } from './components/SignalLabsView';
import { PracticalBenchView } from './components/PracticalBenchView';
import { SolverFormulasView } from './components/SolverFormulasView';
import { TimedQuizView } from './components/TimedQuizView';
import { ControlStudySprintView } from './components/ece433/ControlStudySprintView';
import { ControlTheoryView } from './components/ece433/ControlTheoryView';
import { ControlLabsView } from './components/ece433/ControlLabsView';
import { ControlBenchView } from './components/ece433/ControlBenchView';
import { ControlSolverView } from './components/ece433/ControlSolverView';
import { ControlQuizView } from './components/ece433/ControlQuizView';
import { ConfettiBurstEvent, ConfettiShower } from './components/ConfettiShower';
import { SYLLABUS_TOPICS } from './data/syllabusData';
import { CONTROL_SYLLABUS_TOPICS } from './data/ece433SyllabusData';
import {
  CONTROL_ESSAY_PROMPTS,
} from './data/ece433TheoryData';
import { CONTROL_WORKED_EXAMPLES } from './data/ece433PracticeData';
import {
  FailedSolverAttempt,
  LabType,
  QuizAttempt,
  StudyProgressState,
  WorkspaceTab,
} from './types/ece423';
import {
  ControlFailedAttempt,
  ControlLabType,
  ControlProgressState,
  ControlQuizAttempt,
  CourseId,
} from './types/ece433';

const STORAGE_KEY_423 = 'ece423_study_progress_v1';
const STORAGE_KEY_433 = 'ece433_control_progress_v1';
const COURSE_STORAGE_KEY = 'ece_active_course_v1';

const DEFAULT_PROGRESS_423: StudyProgressState = {
  completedTopics: [],
  masteredExamples: [],
  masteredEssays: [],
  quizAttempts: [],
  failedSolverAttempts: [],
  resolvedWeakQuizIds: [],
};

const DEFAULT_PROGRESS_433: ControlProgressState = {
  completedTopics: [],
  masteredExamples: [],
  masteredEssays: [],
  quizAttempts: [],
  failedSolverAttempts: [],
  resolvedWeakQuizIds: [],
};

function loadInitialCourse(): CourseId {
  try {
    const raw = window.localStorage.getItem(COURSE_STORAGE_KEY);
    return raw === 'ece433' ? 'ece433' : 'ece423';
  } catch {
    return 'ece423';
  }
}

function loadInitialProgress423(): StudyProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_423);
    if (!raw) return DEFAULT_PROGRESS_423;
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
    return DEFAULT_PROGRESS_423;
  }
}

function loadInitialProgress433(): ControlProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_433);
    if (!raw) return DEFAULT_PROGRESS_433;
    const parsed = JSON.parse(raw) as Partial<ControlProgressState>;
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
    return DEFAULT_PROGRESS_433;
  }
}

export default function App() {
  const [activeCourse, setActiveCourse] = useState<CourseId>(loadInitialCourse);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(WorkspaceTab.SPRINT);

  // ECE 423 state
  const [activeLab, setActiveLab] = useState<LabType>(LabType.SAMPLING_PCM);
  const [requestedCalcId, setRequestedCalcId] = useState<string | undefined>(undefined);
  const [theorySubTab, setTheorySubTab] = useState<'principles' | 'timeline' | 'essays'>('principles');
  const [autoStartQuiz, setAutoStartQuiz] = useState<'cat_sprint' | null>(null);
  const [progress, setProgress] = useState<StudyProgressState>(loadInitialProgress423);

  // ECE 433 state
  const [activeControlLab, setActiveControlLab] = useState<ControlLabType>(
    ControlLabType.PID_WINDUP
  );
  const [ctrlRequestedCalcId, setCtrlRequestedCalcId] = useState<string | undefined>(undefined);
  const [ctrlTheorySubTab, setCtrlTheorySubTab] = useState<
    'principles' | 'opamp' | 'timeline' | 'essays'
  >('principles');
  const [ctrlAutoStartQuiz, setCtrlAutoStartQuiz] = useState<'cat_sprint' | null>(null);
  const [controlProgress, setControlProgress] =
    useState<ControlProgressState>(loadInitialProgress433);

  // Reinforcement confetti + toast
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
      window.localStorage.setItem(COURSE_STORAGE_KEY, activeCourse);
    } catch {
      // Ignore storage quota issues cleanly
    }
  }, [activeCourse]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_423, JSON.stringify(progress));
    } catch {
      // Ignore storage quota issues cleanly
    }
  }, [progress]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_433, JSON.stringify(controlProgress));
    } catch {
      // Ignore storage quota issues cleanly
    }
  }, [controlProgress]);

  // =========================================================================
  // ECE 423 Handlers
  // =========================================================================
  const handleToggleTopic = (topicId: string) => {
    const exists = progress.completedTopics.includes(topicId);
    if (!exists) {
      const nextCount = progress.completedTopics.length + 1;
      const total = SYLLABUS_TOPICS.length;
      const variant = nextCount === total ? 'celebrate' : 'subtle';
      const msg =
        nextCount === total
          ? `All ${total} ECE 423 syllabus topics mastered!`
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

  // =========================================================================
  // ECE 433 Handlers
  // =========================================================================
  const handleToggleControlTopic = (topicId: string) => {
    const exists = controlProgress.completedTopics.includes(topicId);
    if (!exists) {
      const nextCount = controlProgress.completedTopics.length + 1;
      const total = CONTROL_SYLLABUS_TOPICS.length;
      const variant = nextCount === total ? 'celebrate' : 'subtle';
      const msg =
        nextCount === total
          ? `All ${total} ECE 433 Control topics mastered!`
          : `Control topic mastered · ${nextCount} / ${total} complete`;
      triggerReinforcement(variant, msg);
    }
    setControlProgress((prev) => {
      const already = prev.completedTopics.includes(topicId);
      return {
        ...prev,
        completedTopics: already
          ? prev.completedTopics.filter((id) => id !== topicId)
          : [...prev.completedTopics, topicId],
      };
    });
  };

  const handleToggleMasteredControlExample = (exId: string) => {
    const exists = controlProgress.masteredExamples.includes(exId);
    if (!exists) {
      const nextCount = controlProgress.masteredExamples.length + 1;
      triggerReinforcement(
        'subtle',
        `Control worked problem mastered · ${nextCount} / ${CONTROL_WORKED_EXAMPLES.length}`
      );
    }
    setControlProgress((prev) => {
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

  const handleToggleMasteredControlEssay = (essayId: string) => {
    const exists = controlProgress.masteredEssays.includes(essayId);
    if (!exists) {
      const nextCount = controlProgress.masteredEssays.length + 1;
      triggerReinforcement(
        'subtle',
        `Control concept essay mastered · ${nextCount} / ${CONTROL_ESSAY_PROMPTS.length}`
      );
    }
    setControlProgress((prev) => {
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

  const handleRecordControlFailure = (
    failure: Omit<ControlFailedAttempt, 'failCount' | 'lastFailedAt'>
  ) => {
    setControlProgress((prev) => {
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

  const handleResolveControlAttempt = (id: string) => {
    setControlProgress((prev) => ({
      ...prev,
      failedSolverAttempts: prev.failedSolverAttempts.filter((item) => item.id !== id),
    }));
  };

  const handleResolveControlQuizTopic = (questionIds: string[]) => {
    setControlProgress((prev) => {
      const merged = new Set([...prev.resolvedWeakQuizIds, ...questionIds]);
      return {
        ...prev,
        resolvedWeakQuizIds: Array.from(merged),
      };
    });
  };

  const handleSaveControlQuizAttempt = (attempt: ControlQuizAttempt) => {
    const pct = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;
    const label =
      attempt.mode === 'cat_sprint'
        ? 'ECE 433 CAT Sprint complete'
        : attempt.mode === 'full_exam'
        ? 'ECE 433 Mock Exam complete'
        : attempt.mode === 'state_space_drill'
        ? 'State-Space Matrix Drill complete'
        : 'Module Drill complete';
    triggerReinforcement(
      attempt.mode === 'module_drill' ? 'subtle' : 'celebrate',
      `${label} · ${attempt.score}/${attempt.total} (${pct}%)`
    );

    const newlyMissedIds = new Set(
      (attempt.missedTopics || []).map((m) => m.questionId)
    );
    setControlProgress((prev) => ({
      ...prev,
      quizAttempts: [attempt, ...prev.quizAttempts].slice(0, 20),
      resolvedWeakQuizIds: prev.resolvedWeakQuizIds.filter(
        (id) => !newlyMissedIds.has(id)
      ),
    }));
  };

  const handleOpenControlLab = (lab: ControlLabType) => {
    setActiveControlLab(lab);
    setActiveTab(WorkspaceTab.LABS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenControlCalculator = (calcId?: string) => {
    setCtrlRequestedCalcId(calcId);
    setActiveTab(WorkspaceTab.SOLVER);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenControlTheory = (
    subTab: 'principles' | 'opamp' | 'timeline' | 'essays' = 'principles'
  ) => {
    setCtrlTheorySubTab(subTab);
    setActiveTab(WorkspaceTab.THEORY);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartCatQuiz = () => {
    if (activeCourse === 'ece433') {
      setCtrlAutoStartQuiz('cat_sprint');
    } else {
      setAutoStartQuiz('cat_sprint');
    }
    setActiveTab(WorkspaceTab.QUIZ);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchCourse = (course: CourseId) => {
    if (course === activeCourse) return;
    setActiveCourse(course);
    setActiveTab(WorkspaceTab.SPRINT);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopNav
        course={activeCourse}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onStartCatQuiz={handleStartCatQuiz}
      />

      <main className="mx-auto w-full max-w-[1360px] flex-1 px-6 py-8 space-y-6">
        {/* Dual-Course Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div
            role="tablist"
            aria-label="Course Workspace Switcher"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCourse === 'ece423'}
              onClick={() => handleSwitchCourse('ece423')}
              className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeCourse === 'ece423'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              ECE 423 · Digital Communication Systems
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeCourse === 'ece433'}
              onClick={() => handleSwitchCourse('ece433')}
              className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeCourse === 'ece433'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              ECE 433 · Control System II (3 Units)
            </button>
          </div>

          <div className="text-xs font-mono text-slate-500 tabular-nums">
            {activeCourse === 'ece433'
              ? `Mastered ${controlProgress.completedTopics.length}/${CONTROL_SYLLABUS_TOPICS.length} topics · ${controlProgress.quizAttempts.length} quizzes`
              : `Mastered ${progress.completedTopics.length}/${SYLLABUS_TOPICS.length} topics · ${progress.quizAttempts.length} quizzes`}
          </div>
        </div>

        {/* Active Course Views */}
        {activeCourse === 'ece423' ? (
          <>
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
          </>
        ) : (
          <>
            {activeTab === WorkspaceTab.SPRINT && (
              <ControlStudySprintView
                progress={controlProgress}
                onToggleTopic={handleToggleControlTopic}
                onOpenLab={handleOpenControlLab}
                onOpenCalculator={handleOpenControlCalculator}
                onOpenTheory={handleOpenControlTheory}
                onStartCatQuiz={handleStartCatQuiz}
                onResolveQuizTopic={handleResolveControlQuizTopic}
                onResolveSolverAttempt={handleResolveControlAttempt}
              />
            )}

            {activeTab === WorkspaceTab.THEORY && (
              <ControlTheoryView
                initialSubTab={ctrlTheorySubTab}
                masteredEssays={controlProgress.masteredEssays}
                onToggleMasteredEssay={handleToggleMasteredControlEssay}
                onRecordEssayFailure={handleRecordControlFailure}
                onOpenLab={handleOpenControlLab}
                onOpenCalculator={handleOpenControlCalculator}
              />
            )}

            {activeTab === WorkspaceTab.LABS && (
              <ControlLabsView
                activeLab={activeControlLab}
                onSelectLab={setActiveControlLab}
                onOpenTheory={handleOpenControlTheory}
              />
            )}

            {activeTab === WorkspaceTab.BENCH && <ControlBenchView />}

            {activeTab === WorkspaceTab.SOLVER && (
              <ControlSolverView
                initialCalcId={ctrlRequestedCalcId}
                masteredExamples={controlProgress.masteredExamples}
                onToggleMastered={handleToggleMasteredControlExample}
                onRecordSolverFailure={handleRecordControlFailure}
              />
            )}

            {activeTab === WorkspaceTab.QUIZ && (
              <ControlQuizView
                autoStartMode={ctrlAutoStartQuiz}
                onClearAutoStart={() => setCtrlAutoStartQuiz(null)}
                attempts={controlProgress.quizAttempts}
                onSaveAttempt={handleSaveControlQuizAttempt}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 px-6 py-4 text-xs text-slate-500">
          <span>
            {activeCourse === 'ece433'
              ? 'ECE 433 Control System II (3 Units) · Interactive Study & Simulation Lab'
              : 'ECE 423 Digital Communication Systems · Interactive Study & Simulation Lab'}
          </span>
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
