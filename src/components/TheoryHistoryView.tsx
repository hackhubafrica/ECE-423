import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Sliders,
} from 'lucide-react';
import {
  CORE_THEORY_PRINCIPLES,
  ESSAY_PROMPTS,
  HISTORICAL_TIMELINE,
} from '../data/theoryHistoryData';
import { MODULE_META } from '../data/syllabusData';
import {
  FailedSolverAttempt,
  HistoryEra,
  LabType,
  SyllabusModule,
} from '../types/ece423';

interface TheoryHistoryViewProps {
  initialSubTab?: 'principles' | 'timeline' | 'essays';
  masteredEssays: string[];
  failedSolverAttempts: FailedSolverAttempt[];
  onToggleMasteredEssay: (id: string) => void;
  onRecordEssayFailure: (
    failure: Omit<FailedSolverAttempt, 'failCount' | 'lastFailedAt'>
  ) => void;
  onResolveAttempt: (id: string) => void;
  onOpenLab: (lab: LabType) => void;
  onOpenCalculator: (calcId?: string) => void;
}

export const TheoryHistoryView: React.FC<TheoryHistoryViewProps> = ({
  initialSubTab,
  masteredEssays,
  failedSolverAttempts,
  onToggleMasteredEssay,
  onRecordEssayFailure,
  onResolveAttempt,
  onOpenLab,
  onOpenCalculator,
}) => {
  const [subTab, setSubTab] = useState<'principles' | 'timeline' | 'essays'>(
    initialSubTab || 'principles'
  );
  const [moduleFilter, setModuleFilter] = useState<'all' | SyllabusModule>('all');
  const [eraFilter, setEraFilter] = useState<'all' | HistoryEra>('all');
  const [expandedEssayId, setExpandedEssayId] = useState<string>(ESSAY_PROMPTS[0].id);
  const [revealedRubrics, setRevealedRubrics] = useState<Record<string, boolean>>({});
  const [essayDrafts, setEssayDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const filteredPrinciples =
    moduleFilter === 'all'
      ? CORE_THEORY_PRINCIPLES
      : CORE_THEORY_PRINCIPLES.filter((p) => p.module === moduleFilter);

  const filteredTimeline = HISTORICAL_TIMELINE.filter((m) => {
    const matchEra = eraFilter === 'all' || m.era === eraFilter;
    const matchMod = moduleFilter === 'all' || m.module === moduleFilter;
    return matchEra && matchMod;
  }).sort((a, b) => a.yearNumeric - b.yearNumeric);

  const filteredEssays =
    moduleFilter === 'all'
      ? ESSAY_PROMPTS
      : ESSAY_PROMPTS.filter((e) => e.module === moduleFilter);

  return (
    <div className="space-y-8">
      {/* Header & Sub-tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Theoretical Foundations, History &amp; Pioneers
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Build physical intuition behind every equation, trace breakthroughs chronologically from the 1920s to modern codecs, and practice descriptive exam essays.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 shrink-0">
          {[
            { id: 'principles', label: 'Core Principles (9)' },
            { id: 'timeline', label: '1920s–Modern Timeline (13)' },
            { id: 'essays', label: 'Essay & Concept Drill (9)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as 'principles' | 'timeline' | 'essays')}
              className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                subTab === tab.id
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shared Module Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
          {[
            { id: 'all', label: 'All Modules' },
            { id: SyllabusModule.PCM, label: 'PCM Systems' },
            { id: SyllabusModule.COMPRESSION, label: 'Compression' },
            { id: SyllabusModule.MODULATION, label: 'Digital Modulation' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setModuleFilter(tab.id as 'all' | SyllabusModule)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                moduleFilter === tab.id
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {subTab === 'timeline' && (
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            {[
              { id: 'all', label: 'All Eras' },
              { id: '1920s–1940s', label: '1920s–1940s' },
              { id: '1950s–1960s', label: '1950s–1960s' },
              { id: '1970s–Modern', label: '1970s–Modern' },
            ].map((era) => (
              <button
                key={era.id}
                type="button"
                onClick={() => setEraFilter(era.id as 'all' | HistoryEra)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  eraFilter === era.id
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {era.label}
              </button>
            ))}
          </div>
        )}

        {subTab === 'essays' && (
          <span className="font-mono text-xs text-slate-600 tabular-nums">
            {masteredEssays.length} / {ESSAY_PROMPTS.length} Essays Mastered
          </span>
        )}
      </div>

      {/* ================================================================== */}
      {/* SUB-TAB 1: CORE PRINCIPLES & PLAIN-ENGLISH INTUITION               */}
      {/* ================================================================== */}
      {subTab === 'principles' && (
        <div className="space-y-5">
          {filteredPrinciples.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{MODULE_META[item.module].title}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-sky-700">{item.pioneerHighlight}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-950">{item.title}</h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.recommendedLab && (
                    <button
                      type="button"
                      onClick={() => onOpenLab(item.recommendedLab!)}
                      className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-300 hover:text-sky-700 whitespace-nowrap shrink-0"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      <span>Simulate in Lab</span>
                    </button>
                  )}
                  {item.recommendedCalc && (
                    <button
                      type="button"
                      onClick={() => onOpenCalculator(item.recommendedCalc)}
                      className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-300 hover:text-sky-700 whitespace-nowrap shrink-0"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                      <span>Open Solver</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-slate-900">
                    Plain-English Intuition
                  </h3>
                  <p className="leading-relaxed text-slate-700">
                    {item.plainEnglishIntuition}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-slate-900">
                    Physical Mechanism
                  </h3>
                  <p className="leading-relaxed text-slate-700">
                    {item.physicalMechanism}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                  <div className="font-semibold text-slate-900">Why It Matters in Engineering</div>
                  <p className="text-slate-700 leading-relaxed">{item.whyItMatters}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 space-y-1">
                  <div className="font-semibold text-amber-900">Common Exam Misconception</div>
                  <p className="text-amber-950 leading-relaxed">{item.commonMisconception}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 2: CHRONOLOGICAL TIMELINE & PIONEERS (1920s -> MODERN)     */}
      {/* ================================================================== */}
      {subTab === 'timeline' && (
        <div className="relative pl-6 md:pl-8 space-y-6 before:absolute before:left-2.5 md:before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-slate-300">
          {filteredTimeline.map((milestone) => (
            <div key={milestone.id} className="relative">
              {/* Hairline timeline node */}
              <span
                aria-hidden="true"
                className="absolute -left-[22px] md:-left-[26px] top-6 h-3 w-3 rounded-full border-2 border-sky-600 bg-white"
              />

              <article className="rounded-xl border border-slate-200 bg-white p-5 md:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-sky-700 tabular-nums">
                        <Clock className="h-3.5 w-3.5" />
                        {milestone.year}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{milestone.era}</span>
                      <span aria-hidden="true">·</span>
                      <span>{MODULE_META[milestone.module].title}</span>
                    </div>
                    <h2 className="text-base md:text-lg font-bold text-slate-950">
                      {milestone.pioneer} — {milestone.breakthrough}
                    </h2>
                    <div className="text-xs text-slate-500">{milestone.affiliation}</div>
                  </div>

                  {milestone.recommendedLab && (
                    <button
                      type="button"
                      onClick={() => onOpenLab(milestone.recommendedLab!)}
                      className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-300 hover:text-sky-700 whitespace-nowrap shrink-0"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      <span>Explore in Lab</span>
                    </button>
                  )}
                </div>

                <p className="text-sm leading-relaxed text-slate-700">
                  {milestone.storyAndContext}
                </p>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-800">
                  <span className="font-semibold text-slate-950">ECE 423 Syllabus Link: </span>
                  <span>{milestone.ece423Connection}</span>
                </div>
              </article>
            </div>
          ))}
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 3: CONCEPTUAL & THEORY ESSAY PRACTICE                      */}
      {/* ================================================================== */}
      {subTab === 'essays' && (
        <div className="space-y-4">
          {filteredEssays.map((essay) => {
            const isOpen = expandedEssayId === essay.id;
            const isMastered = masteredEssays.includes(essay.id);
            const isFlaggedWeak = failedSolverAttempts.some((f) => f.id === essay.id);
            const rubricShown = !!revealedRubrics[essay.id];

            return (
              <div
                key={essay.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleMasteredEssay(essay.id)}
                      aria-label={`Mark ${essay.title} mastered`}
                      className="cursor-pointer mt-0.5 text-slate-400 hover:text-emerald-600 shrink-0"
                    >
                      {isMastered ? (
                        <CheckCircle2 className="animate-master-pop h-5 w-5 text-emerald-600" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{MODULE_META[essay.module].title}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            essay.catRelevance === 'CAT High-Yield'
                              ? 'font-semibold text-amber-700'
                              : 'text-slate-600'
                          }
                        >
                          {essay.catRelevance}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{essay.marksGuide}</span>
                      </div>
                      <h2 className="text-base font-semibold text-slate-950 mt-0.5">
                        {essay.title}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (isFlaggedWeak) {
                          onResolveAttempt(essay.id);
                        } else {
                          onRecordEssayFailure({
                            id: essay.id,
                            title: essay.title,
                            module: essay.module,
                            source: 'essay',
                            recommendedLab: essay.recommendedLab,
                            lastReason: 'Theory / essay prompt flagged for CAT review.',
                          });
                        }
                      }}
                      className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        isFlaggedWeak
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{isFlaggedWeak ? 'Flagged Weak' : 'Flag Weak'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedEssayId(isOpen ? '' : essay.id)}
                      className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 shrink-0"
                    >
                      <span>{isOpen ? 'Collapse' : 'Practice Answer'}</span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-200 bg-slate-50/50 p-5 space-y-4">
                    <p className="text-sm font-medium leading-relaxed text-slate-900">
                      {essay.question}
                    </p>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Your Outline / Practice Response (Optional Scratchpad)
                      </label>
                      <textarea
                        rows={3}
                        value={essayDrafts[essay.id] || ''}
                        onChange={(e) =>
                          setEssayDrafts((prev) => ({
                            ...prev,
                            [essay.id]: e.target.value,
                          }))
                        }
                        placeholder="Jot down the core physical principles and key terms before revealing the marking rubric..."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedRubrics((prev) => ({
                            ...prev,
                            [essay.id]: !prev[essay.id],
                          }))
                        }
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>
                          {rubricShown
                            ? 'Hide Marking Rubric & Model Answer'
                            : 'Reveal Marking Rubric & Model Answer'}
                        </span>
                      </button>

                      {essay.recommendedLab && (
                        <button
                          type="button"
                          onClick={() => onOpenLab(essay.recommendedLab!)}
                          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          <span>Verify in Signal Lab</span>
                        </button>
                      )}
                    </div>

                    {rubricShown && (
                      <div className="space-y-4 pt-1">
                        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
                          <h3 className="text-xs font-semibold text-slate-950">
                            Examiner Marking Rubric (Key Points Needed for Full Marks)
                          </h3>
                          <ul className="space-y-1.5 text-xs text-slate-700">
                            {essay.keyPoints.map((pt) => (
                              <li key={pt} className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sky-600 shrink-0" />
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 space-y-1.5">
                          <h3 className="text-xs font-semibold text-emerald-950">
                            Model Synthesis Answer
                          </h3>
                          <p className="text-xs leading-relaxed text-emerald-950">
                            {essay.modelAnswer}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
