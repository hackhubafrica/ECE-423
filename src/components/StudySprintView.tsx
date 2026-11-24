import React, { useState } from 'react';
import {
  ArrowRight,
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
  COMPRESSION_COMPARISON_ROWS,
  FOUR_WEEK_EXAM_PLAN,
  MODULE_META,
  NON_WAVEFORM_COMPARISON_ROWS,
  STUDY_METHOD_STEPS,
  SYLLABUS_TOPICS,
  TONIGHT_CAT_TIMELINE,
} from '../data/syllabusData';
import { INLINE_TOPIC_THEORY } from '../data/theoryHistoryData';
import { MODULATION_CATALOG } from '../utils/dspMath';
import {
  DigitalModScheme,
  LabType,
  StudyProgressState,
  SyllabusModule,
} from '../types/ece423';
import { WeakTopicsSidebar } from './WeakTopicsSidebar';

interface StudySprintViewProps {
  progress: StudyProgressState;
  onToggleTopic: (topicId: string) => void;
  onOpenLab: (lab: LabType) => void;
  onOpenCalculator: (calcId?: string) => void;
  onOpenTheory?: (subTab?: 'principles' | 'timeline' | 'essays') => void;
  onStartCatQuiz: () => void;
  onResolveQuizTopic: (questionIds: string[]) => void;
  onResolveSolverAttempt: (id: string) => void;
}

export const StudySprintView: React.FC<StudySprintViewProps> = ({
  progress,
  onToggleTopic,
  onOpenLab,
  onOpenCalculator,
  onOpenTheory,
  onStartCatQuiz,
  onResolveQuizTopic,
  onResolveSolverAttempt,
}) => {
  const [horizon, setHorizon] = useState<'tonight' | 'exam'>('tonight');
  const [selectedModule, setSelectedModule] = useState<'all' | SyllabusModule>('all');
  const [comparisonTab, setComparisonTab] = useState<'waveform' | 'nonwaveform' | 'modulation'>('waveform');
  const [highlightedTopicId, setHighlightedTopicId] = useState<string | null>(null);
  const [expandedTheoryIds, setExpandedTheoryIds] = useState<Record<string, boolean>>({});

  const toggleTopicTheory = (topicId: string) => {
    setExpandedTheoryIds((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const handleFocusSyllabusTopic = (syllabusTopicId: string) => {
    setSelectedModule('all');
    setHighlightedTopicId(syllabusTopicId);
    window.setTimeout(() => {
      const el = document.getElementById(`syllabus-topic-${syllabusTopicId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 40);
  };

  const totalTopics = SYLLABUS_TOPICS.length;
  const completedCount = progress.completedTopics.length;
  const masteryPct = Math.round((completedCount / totalTopics) * 100);
  const latestAttempt = progress.quizAttempts[0];

  const filteredTopics =
    selectedModule === 'all'
      ? SYLLABUS_TOPICS
      : SYLLABUS_TOPICS.filter((t) => t.module === selectedModule);

  const modSchemesOrder: DigitalModScheme[] = [
    'ask',
    'bpsk',
    'qpsk',
    'dpsk',
    'bfsk_coh',
    'bfsk_noncoh',
    'msk',
    'qam16',
  ];

  return (
    <div className="space-y-10">
      {/* Section 1: Focused Study Hero & Readiness Metrics */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span>ECE 423 Digital Communication Systems</span>
              <span aria-hidden="true">·</span>
              <span>4 Units</span>
              <span aria-hidden="true">·</span>
              <span>Tomorrow&apos;s CAT &amp; Next Month&apos;s Exam</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-950">
              Master ECE 423 by pairing core derivations with live signal labs
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-600">
              Reading definitions passively fails under CAT time pressure. Digest this syllabus fastest in four loops: lock the high-frequency formulas, inspect failure thresholds (aliasing, slope overload, BER knees) in the Signal Labs, work numerical derivations on paper before checking the Solver, and run a 20-minute timed CAT sprint.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onStartCatQuiz}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0"
              >
                <span>Take 20-Min CAT Sprint</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onOpenLab(LabType.SAMPLING_PCM)}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Sliders className="h-4 w-4 text-sky-600" />
                <span>Open Signal Labs</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenCalculator('pcm_snr')}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Calculator className="h-4 w-4 text-sky-600" />
                <span>Step-by-Step Calculators</span>
              </button>
            </div>
          </div>

          {/* Right column: Clean tabular readiness summary */}
          <div className="lg:col-span-4 rounded-lg border border-slate-200 bg-slate-50/70 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Your Preparation Readiness</h2>
            <div className="divide-y divide-slate-200">
              <div className="flex items-baseline justify-between py-2.5">
                <span className="text-sm text-slate-600">Syllabus Topics Checked</span>
                <span className="font-mono text-base font-semibold tabular-nums text-slate-950">
                  {completedCount} / {totalTopics} ({masteryPct}%)
                </span>
              </div>
              <div className="flex items-baseline justify-between py-2.5">
                <span className="text-sm text-slate-600">Worked Examples Mastered</span>
                <span className="font-mono text-base font-semibold tabular-nums text-slate-950">
                  {progress.masteredExamples.length} / 12
                </span>
              </div>
              <div className="flex items-baseline justify-between py-2.5">
                <span className="text-sm text-slate-600">Latest Quiz Score</span>
                <span className="font-mono text-base font-semibold tabular-nums text-slate-950">
                  {latestAttempt
                    ? `${latestAttempt.score}/${latestAttempt.total} (${Math.round(
                        (latestAttempt.score / latestAttempt.total) * 100
                      )}%)`
                    : 'Not attempted'}
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-sky-600 transition-all duration-200"
                style={{ width: `${masteryPct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Study Body + Sticky Weak Topics Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-10 min-w-0">
          {/* Section 2: Learning Strategy & Dual-Horizon Action Plan */}
          <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Study Roadmap: Tomorrow&apos;s CAT vs Next Month&apos;s Exam
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Switch between tonight&apos;s 3.5-hour high-yield triage plan and your 4-week deep mastery schedule.
            </p>
          </div>
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 shrink-0">
            <button
              type="button"
              onClick={() => setHorizon('tonight')}
              className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                horizon === 'tonight'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tonight&apos;s CAT Sprint (3.5h)
            </button>
            <button
              type="button"
              onClick={() => setHorizon('exam')}
              className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                horizon === 'exam'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4-Week Final Exam Plan
            </button>
          </div>
        </div>

        {/* 4-Step Active Learning Loop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STUDY_METHOD_STEPS.map((item) => (
            <div
              key={item.step}
              className="rounded-lg border border-slate-200 bg-white p-5 space-y-2"
            >
              <h3 className="text-sm font-semibold text-slate-950">{item.step}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>

        {/* Timeline Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {horizon === 'tonight'
            ? TONIGHT_CAT_TIMELINE.map((block) => (
                <div
                  key={block.block}
                  className="rounded-lg border border-slate-200 bg-white p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                    <h3 className="text-base font-semibold text-slate-950">{block.focus}</h3>
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-sky-700 whitespace-nowrap shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      {block.block}
                    </span>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {block.tasks.map((task) => (
                      <li key={task} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            : FOUR_WEEK_EXAM_PLAN.map((wk) => (
                <div
                  key={wk.week}
                  className="rounded-lg border border-slate-200 bg-white p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                    <h3 className="text-base font-semibold text-slate-950">{wk.week}</h3>
                    <span className="text-xs font-medium text-sky-700 whitespace-nowrap shrink-0">
                      {wk.goal}
                    </span>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {wk.deliverables.map((task) => (
                      <li key={task} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
        </div>
      </section>

      {/* Section 3: Interactive Syllabus Mastery Checklist */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Complete ECE 423 Syllabus Checklist &amp; Direct Practice Links
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Check off each topic once you can derive its formula and predict its behavior in the lab.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            {[
              { id: 'all', label: 'All Modules' },
              { id: SyllabusModule.PCM, label: 'PCM Systems' },
              { id: SyllabusModule.COMPRESSION, label: 'Compression' },
              { id: SyllabusModule.MODULATION, label: 'Modulation' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedModule(tab.id as 'all' | SyllabusModule)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  selectedModule === tab.id
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-200">
          {filteredTopics.map((topic) => {
            const isDone = progress.completedTopics.includes(topic.id);
            const isHighlighted = highlightedTopicId === topic.id;
            const modTitle = MODULE_META[topic.module].title;
            const inlineTheory = INLINE_TOPIC_THEORY[topic.id];
            const isTheoryOpen = Boolean(expandedTheoryIds[topic.id]);
            return (
              <div
                key={topic.id}
                id={`syllabus-topic-${topic.id}`}
                className={`p-5 space-y-3 transition-colors ${
                  isHighlighted ? 'bg-sky-50/70' : 'hover:bg-slate-50/70'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <button
                      type="button"
                      onClick={() => onToggleTopic(topic.id)}
                      aria-label={`Mark ${topic.title} as ${isDone ? 'incomplete' : 'complete'}`}
                      className="cursor-pointer mt-0.5 text-slate-400 hover:text-sky-600 shrink-0 focus-visible:outline-2 focus-visible:outline-sky-600"
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{modTitle}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            topic.catPriority === 'Critical'
                              ? 'font-semibold text-amber-700'
                              : topic.catPriority === 'High'
                              ? 'font-semibold text-sky-700'
                              : 'text-slate-600'
                          }
                        >
                          {topic.catPriority} Priority
                        </span>
                      </div>
                      <h3
                        className={`text-base font-semibold ${
                          isDone ? 'text-slate-500 line-through' : 'text-slate-950'
                        }`}
                      >
                        {topic.title}
                      </h3>
                      <p className="text-sm text-slate-600 max-w-3xl">{topic.summary}</p>
                      {topic.keyFormula && (
                        <p className="pt-1 font-mono text-xs font-medium text-slate-800">
                          Key Formula: {topic.keyFormula}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-8 lg:pl-0 shrink-0">
                    {inlineTheory && (
                      <button
                        type="button"
                        onClick={() => toggleTopicTheory(topic.id)}
                        className={`cursor-pointer inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          isTheoryOpen
                            ? 'border-sky-300 bg-sky-50 text-sky-800'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-sky-300 hover:text-sky-700'
                        }`}
                      >
                        <span>Theory &amp; Pioneer</span>
                        {isTheoryOpen ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    {topic.recommendedLab && (
                      <button
                        type="button"
                        onClick={() => onOpenLab(topic.recommendedLab!)}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-300 hover:text-sky-700 whitespace-nowrap shrink-0"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Simulate</span>
                      </button>
                    )}
                    {topic.recommendedCalc && (
                      <button
                        type="button"
                        onClick={() => onOpenCalculator(topic.recommendedCalc)}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-300 hover:text-sky-700 whitespace-nowrap shrink-0"
                      >
                        <Calculator className="h-3.5 w-3.5" />
                        <span>Calculate</span>
                      </button>
                    )}
                    {!topic.recommendedLab && !topic.recommendedCalc && (
                      <button
                        type="button"
                        onClick={() => onOpenCalculator('examples')}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-300 hover:text-sky-700 whitespace-nowrap shrink-0"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Worked Problems</span>
                      </button>
                    )}
                  </div>
                </div>

                {inlineTheory && isTheoryOpen && (
                  <div className="ml-8 rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        Physical Intuition &amp; Origin
                      </span>
                      <span className="font-mono text-sky-700 font-medium tabular-nums">
                        {inlineTheory.historyYear} · {inlineTheory.pioneerNote}
                      </span>
                    </div>
                    <p className="leading-relaxed text-slate-700">{inlineTheory.intuition}</p>
                    {onOpenTheory && (
                      <div className="pt-1 flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          onClick={() => onOpenTheory('principles')}
                          className="cursor-pointer inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-900"
                        >
                          <span>Read Full Principle</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenTheory('timeline')}
                          className="cursor-pointer inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-950"
                        >
                          <span>Open Historical Timeline</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 4: High-Yield Exam Comparison Matrices */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Exam Comparison Matrices
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              High-frequency short-answer comparison tables directly from the ECE 423 syllabus.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            {[
              { id: 'waveform', label: 'PCM vs DPCM vs ADPCM vs DM' },
              { id: 'nonwaveform', label: 'LPC, CELP, JPEG & MPEG' },
              { id: 'modulation', label: 'Modulation Performance' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setComparisonTab(tab.id as 'waveform' | 'nonwaveform' | 'modulation')
                }
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  comparisonTab === tab.id
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          {comparisonTab === 'waveform' && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                <tr>
                  <th className="px-4 py-3">Coding Scheme</th>
                  <th className="px-4 py-3">Bits / Sample</th>
                  <th className="px-4 py-3">Prediction Filter</th>
                  <th className="px-4 py-3">Quantizer Step</th>
                  <th className="px-4 py-3">Primary Trade-off / Distortion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {COMPRESSION_COMPARISON_ROWS.map((row) => (
                  <tr key={row.scheme} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-950 whitespace-nowrap">
                      {row.scheme}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums">{row.bitsPerSample}</td>
                    <td className="px-4 py-3">{row.predictor}</td>
                    <td className="px-4 py-3">{row.stepSize}</td>
                    <td className="px-4 py-3">{row.keyFailureMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {comparisonTab === 'nonwaveform' && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                <tr>
                  <th className="px-4 py-3">Codec / Standard</th>
                  <th className="px-4 py-3">Signal Domain</th>
                  <th className="px-4 py-3">Core Mechanism</th>
                  <th className="px-4 py-3">Engineering Trade-off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {NON_WAVEFORM_COMPARISON_ROWS.map((row) => (
                  <tr key={row.scheme} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-950 whitespace-nowrap">
                      {row.scheme}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.domain}</td>
                    <td className="px-4 py-3">{row.mechanism}</td>
                    <td className="px-4 py-3">{row.tradeoff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {comparisonTab === 'modulation' && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                <tr>
                  <th className="px-4 py-3">Scheme</th>
                  <th className="px-4 py-3">k (bits/sym)</th>
                  <th className="px-4 py-3">Null-to-Null BW</th>
                  <th className="px-4 py-3">η (bps/Hz)</th>
                  <th className="px-4 py-3">Error Probability Pb</th>
                  <th className="px-4 py-3">Receiver / Detection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {modSchemesOrder.map((key) => {
                  const info = MODULATION_CATALOG[key];
                  return (
                    <tr key={info.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-950 whitespace-nowrap">
                        {info.shortName}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums">
                        {info.bitsPerSymbol}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{info.bandwidthFormula}</td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums">
                        {info.spectralEfficiency.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{info.berFormulaLabel}</td>
                      <td className="px-4 py-3">{info.detectionType}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
        </div>

        {/* Right Sidebar: Weak Topics Diagnostic & Review */}
        <div className="lg:col-span-4 lg:sticky lg:top-20">
          <WeakTopicsSidebar
            progress={progress}
            onOpenLab={onOpenLab}
            onOpenCalculator={onOpenCalculator}
            onOpenTheory={onOpenTheory}
            onStartCatQuiz={onStartCatQuiz}
            onFocusSyllabusTopic={handleFocusSyllabusTopic}
            onResolveQuizTopic={onResolveQuizTopic}
            onResolveSolverAttempt={onResolveSolverAttempt}
          />
        </div>
      </div>
    </div>
  );
};
