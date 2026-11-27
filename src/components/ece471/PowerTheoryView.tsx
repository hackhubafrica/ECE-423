import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Circle,
  History,
  PenTool,
  Sliders,
} from 'lucide-react';
import { POWER_MODULE_META } from '../../data/ece471SyllabusData';
import {
  POWER_ESSAY_PROMPTS,
  POWER_MILESTONES,
  POWER_PRINCIPLES,
} from '../../data/ece471TheoryData';
import {
  PowerFailedAttempt,
  PowerLabType,
  PowerModule,
} from '../../types/ece471';

interface PowerTheoryViewProps {
  initialSubTab?: 'principles' | 'timeline' | 'essays';
  masteredEssays: string[];
  onToggleMasteredEssay: (essayId: string) => void;
  onRecordEssayFailure: (
    failure: Omit<PowerFailedAttempt, 'failCount' | 'lastFailedAt'>
  ) => void;
  onOpenLab: (lab: PowerLabType) => void;
  onOpenCalculator: (calcId?: string) => void;
}

export const PowerTheoryView: React.FC<PowerTheoryViewProps> = ({
  initialSubTab = 'principles',
  masteredEssays,
  onToggleMasteredEssay,
  onRecordEssayFailure,
  onOpenLab,
  onOpenCalculator,
}) => {
  const [subTab, setSubTab] = useState<'principles' | 'timeline' | 'essays'>(initialSubTab);
  const [modFilter, setModFilter] = useState<'all' | PowerModule>('all');
  const [revealedEssays, setRevealedEssays] = useState<Record<string, boolean>>({});
  const [essayFlagFeedback, setEssayFlagFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const filteredPrinciples =
    modFilter === 'all'
      ? POWER_PRINCIPLES
      : POWER_PRINCIPLES.filter((p) => p.module === modFilter);

  return (
    <div className="space-y-8">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Theory, Line Physics &amp; Power System Pioneers
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Build rigorous physical intuition for GMR vs capacitance radius, Peek’s corona onset, Lagrange dispatch, Fortescue sequence decoupling, Bewley reflections, and CAT 1 / exam written essays.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 shrink-0">
          {[
            { id: 'principles', label: 'Core Principles', icon: BookOpen },
            { id: 'timeline', label: 'Grid Pioneers (1891–Present)', icon: History },
            {
              id: 'essays',
              label: `CAT 1 & Exam Essays (${masteredEssays.length}/${POWER_ESSAY_PROMPTS.length})`,
              icon: PenTool,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as typeof subTab)}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  subTab === tab.id
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tab 1: Core Principles */}
      {subTab === 'principles' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 w-fit">
            {[
              { id: 'all', label: 'All Principles' },
              { id: PowerModule.LINE_CORONA, label: 'Lines & Corona' },
              { id: PowerModule.DISPATCH_AGC, label: 'Dispatch' },
              { id: PowerModule.SYMMETRICAL, label: 'Symmetrical' },
              { id: PowerModule.TRANSIENTS, label: 'Transients' },
              { id: PowerModule.PROTECTION, label: 'Protection' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setModFilter(f.id as 'all' | PowerModule)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  modFilter === f.id
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredPrinciples.map((p) => (
              <article
                key={p.id}
                className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-emerald-700">
                    {POWER_MODULE_META[p.module].title}
                  </div>
                  <h2 className="text-lg font-bold text-slate-950">{p.title}</h2>
                  <p className="text-sm leading-relaxed text-slate-700">
                    {p.plainEnglishIntuition}
                  </p>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs text-slate-700">
                    <div>
                      <strong className="text-slate-900">Physical Mechanism:</strong>{' '}
                      {p.physicalMechanism}
                    </div>
                    <div>
                      <strong className="text-slate-900">Why It Matters:</strong>{' '}
                      {p.whyItMatters}
                    </div>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950">
                    <strong>Common Trap:</strong> {p.commonMisconception}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">{p.pioneerHighlight}</span>
                  <div className="flex items-center gap-2">
                    {p.recommendedLab && (
                      <button
                        type="button"
                        onClick={() => onOpenLab(p.recommendedLab!)}
                        className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Lab</span>
                      </button>
                    )}
                    {p.recommendedCalc && (
                      <button
                        type="button"
                        onClick={() => onOpenCalculator(p.recommendedCalc)}
                        className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
                      >
                        <Calculator className="h-3.5 w-3.5" />
                        <span>Solver</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tab 2: Historical Grid Milestones */}
      {subTab === 'timeline' && (
        <div className="space-y-4">
          {POWER_MILESTONES.map((ms) => (
            <article
              key={ms.id}
              className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col md:flex-row gap-6 justify-between"
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-emerald-700">{ms.year}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-slate-700">{ms.pioneer}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-500">{ms.affiliation}</span>
                </div>
                <h2 className="text-base font-bold text-slate-950">{ms.breakthrough}</h2>
                <p className="text-xs leading-relaxed text-slate-600">{ms.storyAndContext}</p>
                <div className="text-xs font-medium text-emerald-800 pt-1">
                  ECE 471 Connection: {ms.ece471Connection}
                </div>
              </div>

              {ms.recommendedLab && (
                <div className="shrink-0 flex items-center">
                  <button
                    type="button"
                    onClick={() => onOpenLab(ms.recommendedLab!)}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:border-emerald-400 hover:text-emerald-700 whitespace-nowrap"
                  >
                    <span>Explore Lab</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Sub-tab 3: CAT 1 & Exam Essay Drills */}
      {subTab === 'essays' && (
        <div className="space-y-5">
          {POWER_ESSAY_PROMPTS.map((essay) => {
            const mastered = masteredEssays.includes(essay.id);
            const revealed = Boolean(revealedEssays[essay.id]);

            return (
              <article
                key={essay.id}
                className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-emerald-700">
                        {essay.catRelevance}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-500">
                        {POWER_MODULE_META[essay.module].shortTitle}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-slate-600">{essay.marksGuide}</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-950">{essay.title}</h2>
                    <p className="text-sm text-slate-800">{essay.question}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleMasteredEssay(essay.id)}
                    className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 whitespace-nowrap ${
                      mastered
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-800 hover:border-emerald-400'
                    }`}
                  >
                    {mastered ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    <span>{mastered ? 'Mastered' : 'Mark Mastered'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRevealedEssays((prev) => ({
                        ...prev,
                        [essay.id]: !prev[essay.id],
                      }))
                    }
                    className="cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    {revealed ? 'Hide Model Answer & Rubric' : 'Reveal Model Answer & Rubric'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onRecordEssayFailure({
                        id: essay.id,
                        title: essay.title,
                        module: essay.module,
                        source: 'essay',
                        recommendedLab: essay.recommendedLab,
                        lastReason: 'Flagged for written CAT/exam recall practice',
                      });
                      setEssayFlagFeedback((prev) => ({
                        ...prev,
                        [essay.id]: 'Added to Weak Topics sidebar for review.',
                      }));
                    }}
                    className="cursor-pointer rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    Flag for Review
                  </button>

                  {essay.recommendedLab && (
                    <button
                      type="button"
                      onClick={() => onOpenLab(essay.recommendedLab!)}
                      className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
                    >
                      <span>Open Related Lab</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {essayFlagFeedback[essay.id] && (
                  <div className="text-xs font-medium text-amber-800">
                    {essayFlagFeedback[essay.id]}
                  </div>
                )}

                {revealed && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 mb-1">
                        Examiner Key Marking Points:
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-slate-700">
                        {essay.keyPoints.map((kp) => (
                          <li key={kp}>{kp}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <div className="font-semibold text-emerald-800 mb-1">
                        Model Written Response:
                      </div>
                      <p className="leading-relaxed text-slate-800 whitespace-pre-line">
                        {essay.modelAnswer}
                      </p>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
