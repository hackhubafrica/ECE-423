import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Circle,
  Cpu,
  History,
  PenTool,
  Sliders,
} from 'lucide-react';
import { CONTROL_MODULE_META } from '../../data/ece433SyllabusData';
import {
  CONTROL_ESSAY_PROMPTS,
  CONTROL_HISTORY_TIMELINE,
  CONTROL_THEORY_PRINCIPLES,
  OPAMP_REALIZATIONS,
} from '../../data/ece433TheoryData';
import {
  ControlFailedAttempt,
  ControlLabType,
  ControlModule,
} from '../../types/ece433';

interface ControlTheoryViewProps {
  initialSubTab?: 'principles' | 'opamp' | 'timeline' | 'essays';
  masteredEssays: string[];
  onToggleMasteredEssay: (essayId: string) => void;
  onRecordEssayFailure: (
    failure: Omit<ControlFailedAttempt, 'failCount' | 'lastFailedAt'>
  ) => void;
  onOpenLab: (lab: ControlLabType) => void;
  onOpenCalculator: (calcId?: string) => void;
}

export const ControlTheoryView: React.FC<ControlTheoryViewProps> = ({
  initialSubTab = 'principles',
  masteredEssays,
  onToggleMasteredEssay,
  onRecordEssayFailure,
  onOpenLab,
  onOpenCalculator,
}) => {
  const [subTab, setSubTab] = useState<'principles' | 'opamp' | 'timeline' | 'essays'>(
    initialSubTab
  );
  const [modFilter, setModFilter] = useState<'all' | ControlModule>('all');
  const [selectedOpAmpId, setSelectedOpAmpId] = useState<string>(OPAMP_REALIZATIONS[1].id);
  const [opRinK, setOpRinK] = useState<number>(10);
  const [opRfK, setOpRfK] = useState<number>(47);
  const [opCfUf, setOpCfUf] = useState<number>(10);
  const [opCdUf, setOpCdUf] = useState<number>(1.0);
  const [opRdK, setOpRdK] = useState<number>(1.0);

  const [revealedEssays, setRevealedEssays] = useState<Record<string, boolean>>({});
  const [essayFlagFeedback, setEssayFlagFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const filteredPrinciples =
    modFilter === 'all'
      ? CONTROL_THEORY_PRINCIPLES
      : CONTROL_THEORY_PRINCIPLES.filter((p) => p.module === modFilter);

  const activeOpAmp =
    OPAMP_REALIZATIONS.find((o) => o.id === selectedOpAmpId) || OPAMP_REALIZATIONS[0];

  const kpCalc = opRfK / opRinK;
  const tiCalc = opRfK * 1000 * (opCfUf * 1e-6);
  const kiCalc = tiCalc > 0 ? kpCalc / tiCalc : 0;
  const kdCalc = opRfK * 1000 * (opCdUf * 1e-6);
  const noisePoleHz = 1 / (2 * Math.PI * opRdK * 1000 * opCdUf * 1e-6);

  return (
    <div className="space-y-8">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Theory, Op-Amp PID Circuits &amp; Control Pioneers
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Build deep conceptual intuition for windup, Bode shaping, state-space invariance, electronic op-amp realizations, and the pioneers from Maxwell (1868) to Luenberger (1964).
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 shrink-0">
          {[
            { id: 'principles', label: 'Core Principles', icon: BookOpen },
            { id: 'opamp', label: 'Op-Amp PID Realizations', icon: Cpu },
            { id: 'timeline', label: 'Control Pioneers (1868–1972)', icon: History },
            { id: 'essays', label: `Essay Drills (${masteredEssays.length}/${CONTROL_ESSAY_PROMPTS.length})`, icon: PenTool },
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

      {/* ================================================================== */}
      {/* SUB-TAB 1: CORE PRINCIPLES & INTUITION                             */}
      {/* ================================================================== */}
      {subTab === 'principles' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 w-fit">
            {[
              { id: 'all', label: 'All Modules' },
              { id: ControlModule.PID, label: 'PID' },
              { id: ControlModule.FREQ_COMP, label: 'Lead/Lag' },
              { id: ControlModule.STATE_SPACE, label: 'State-Space' },
              { id: ControlModule.DESIGN_OBS, label: 'Pole/Obs' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setModFilter(f.id as 'all' | ControlModule)}
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

          <div className="grid grid-cols-1 gap-6">
            {filteredPrinciples.map((p) => (
              <article
                key={p.id}
                className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="text-xs text-slate-500">
                      <span>{CONTROL_MODULE_META[p.module].title}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-medium text-sky-700">{p.pioneerHighlight}</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-950 mt-0.5">{p.title}</h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {p.recommendedLab && (
                      <button
                        type="button"
                        onClick={() => onOpenLab(p.recommendedLab!)}
                        className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                      >
                        <Sliders className="h-3.5 w-3.5 text-sky-600" />
                        <span>Simulate</span>
                      </button>
                    )}
                    {p.recommendedCalc && (
                      <button
                        type="button"
                        onClick={() => onOpenCalculator(p.recommendedCalc)}
                        className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                      >
                        <Calculator className="h-3.5 w-3.5 text-sky-600" />
                        <span>Solver</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-500">Plain-English Intuition</h3>
                    <p className="leading-relaxed text-slate-800">{p.plainEnglishIntuition}</p>
                    <h3 className="text-xs font-semibold text-slate-500 pt-2">Why It Matters</h3>
                    <p className="leading-relaxed text-slate-700">{p.whyItMatters}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1">
                      <div className="text-xs font-semibold text-slate-900">Physical &amp; Mathematical Mechanism</div>
                      <p className="text-xs leading-relaxed text-slate-700">{p.physicalMechanism}</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 space-y-1">
                      <div className="text-xs font-semibold text-amber-900">Common Exam Misconception</div>
                      <p className="text-xs leading-relaxed text-amber-950">{p.commonMisconception}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 2: ELECTRONIC OP-AMP PID REALIZATIONS                      */}
      {/* ================================================================== */}
      {subTab === 'opamp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Topology Picker + Schematic + Component Readout */}
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              {OPAMP_REALIZATIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedOpAmpId(item.id)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    activeOpAmp.id === item.id
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.topology === 'PID_PARALLEL'
                    ? '4-Op-Amp PID'
                    : item.topology === 'LEAD_LAG'
                    ? 'Op-Amp Lead/Lag'
                    : `${item.topology} Stage`}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-950">{activeOpAmp.title}</h2>
              <div className="font-mono text-sm font-semibold text-sky-700">
                {activeOpAmp.transferFunction}
              </div>
            </div>

            {/* Clean Op-Amp Circuit Schematic SVG */}
            <svg
              viewBox="0 0 720 220"
              className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/70"
              role="img"
              aria-label={`Electronic op-amp realization schematic for ${activeOpAmp.title}`}
            >
              {/* Input Terminal */}
              <text x={28} y={136} className="fill-slate-900 font-mono text-xs font-bold">
                e(t)
              </text>
              <line x1={62} y1={132} x2={120} y2={132} stroke="#0284c7" strokeWidth="2.2" />

              {/* Input Impedance Zin */}
              <rect x={120} y={114} width={115} height={36} rx={5} fill="#ffffff" stroke="#0f172a" strokeWidth="1.6" />
              <text x={177} y={130} textAnchor="middle" className="fill-slate-900 font-mono text-[10px] font-bold">
                {activeOpAmp.topology === 'PD'
                  ? `Rd ${opRdK}k + Cd ${opCdUf}µF`
                  : activeOpAmp.topology === 'LEAD_LAG'
                  ? `R1 ${opRinK}k || C1 ${opCdUf}µF`
                  : `Rin = ${opRinK} kΩ`}
              </text>
              <text x={177} y={143} textAnchor="middle" className="fill-slate-500 font-mono text-[9px]">
                Z_in(s)
              </text>

              {/* Summing Junction (Virtual Ground) */}
              <line x1={235} y1={132} x2={340} y2={132} stroke="#0f172a" strokeWidth="2" />
              <circle cx={280} cy={132} r={4} fill="#0284c7" />
              <text x={280} y={120} textAnchor="middle" className="fill-sky-700 font-mono text-[9px] font-semibold">
                V− ≈ 0V
              </text>

              {/* Feedback Loop Up & Across */}
              <line x1={280} y1={132} x2={280} y2={48} stroke="#059669" strokeWidth="2" />
              <line x1={280} y1={48} x2={345} y2={48} stroke="#059669" strokeWidth="2" />

              {/* Feedback Impedance Zf(s) */}
              <rect x={345} y={24} width={175} height={48} rx={6} fill="#f0fdf4" stroke="#059669" strokeWidth="1.6" />
              <text x={432} y={44} textAnchor="middle" className="fill-emerald-900 font-mono text-[10px] font-bold">
                {activeOpAmp.topology === 'P'
                  ? `Rf = ${opRfK} kΩ`
                  : activeOpAmp.topology === 'PI'
                  ? `Rf ${opRfK}k + Cf ${opCfUf}µF`
                  : activeOpAmp.topology === 'PD'
                  ? `Rf = ${opRfK} kΩ`
                  : activeOpAmp.topology === 'LEAD_LAG'
                  ? `R2 ${opRfK}k || C2 ${opCfUf}µF`
                  : `P + I(Ci=${opCfUf}µF) + D(Cd=${opCdUf}µF)`}
              </text>
              <text x={432} y={60} textAnchor="middle" className="fill-emerald-700 font-mono text-[9px]">
                Z_f(s) Feedback Network
              </text>

              <line x1={520} y1={48} x2={565} y2={48} stroke="#059669" strokeWidth="2" />
              <line x1={565} y1={48} x2={565} y2={144} stroke="#059669" strokeWidth="2" />

              {/* Op-Amp Triangle */}
              <polygon
                points="340,104 340,184 445,144"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.2"
              />
              <text x={352} y={136} className="fill-slate-900 font-mono text-sm font-bold">−</text>
              <text x={352} y={168} className="fill-slate-900 font-mono text-sm font-bold">+</text>
              <text x={386} y={149} textAnchor="middle" className="fill-slate-700 font-mono text-[10px] font-semibold">
                TL084
              </text>

              {/* Non-inverting GND */}
              <line x1={315} y1={164} x2={340} y2={164} stroke="#475569" strokeWidth="1.8" />
              <line x1={315} y1={164} x2={315} y2={192} stroke="#475569" strokeWidth="1.8" />
              <line x1={302} y1={192} x2={328} y2={192} stroke="#475569" strokeWidth="2" />
              <text x={315} y={208} textAnchor="middle" className="fill-slate-500 font-mono text-[9px]">
                GND
              </text>

              {/* Output + Sign Inverter Stage Note */}
              <line x1={445} y1={144} x2={595} y2={144} stroke="#0f172a" strokeWidth="2.2" />
              <circle cx={565} cy={144} r={4} fill="#059669" />
              <rect x={595} y={120} width={105} height={48} rx={6} fill="#0f172a" />
              <text x={647} y={141} textAnchor="middle" className="fill-white font-mono text-[10px] font-bold">
                −u(t) → ×(−1)
              </text>
              <text x={647} y={157} textAnchor="middle" className="fill-sky-300 font-mono text-[9px]">
                Unity Inverter
              </text>
            </svg>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                <div className="font-semibold text-slate-950">Governing Component Equations</div>
                <ul className="space-y-1 text-slate-700 font-mono">
                  {activeOpAmp.gainFormulas.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                <div className="font-semibold text-slate-950">Hardware Design &amp; Anti-Windup</div>
                <p className="text-slate-700 leading-relaxed">{activeOpAmp.designNotes}</p>
                <p className="text-amber-800 leading-relaxed font-medium">
                  Anti-Windup: {activeOpAmp.antiWindupNote}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Live R/C Sizing Panel */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-950">
                Op-Amp PID Component Sizer
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Adjust physical R and C values to compute real Kp, Ki, Kd, and noise roll-off pole.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block space-y-1 text-xs">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Input Resistor (Rin)</span>
                  <span className="font-mono tabular-nums text-slate-950">{opRinK} kΩ</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={opRinK}
                  onChange={(e) => setOpRinK(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1 text-xs">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Feedback Resistor (Rf)</span>
                  <span className="font-mono tabular-nums text-slate-950">{opRfK} kΩ</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={220}
                  step={1}
                  value={opRfK}
                  onChange={(e) => setOpRfK(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1 text-xs">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Integrator Capacitor (Cf)</span>
                  <span className="font-mono tabular-nums text-slate-950">{opCfUf} µF</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={opCfUf}
                  onChange={(e) => setOpCfUf(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1 text-xs">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Derivative Capacitor (Cd)</span>
                  <span className="font-mono tabular-nums text-slate-950">{opCdUf.toFixed(1)} µF</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={opCdUf}
                  onChange={(e) => setOpCdUf(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1 text-xs">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Derivative Limit Resistor (Rd)</span>
                  <span className="font-mono tabular-nums text-slate-950">{opRdK.toFixed(1)} kΩ</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={10}
                  step={0.2}
                  value={opRdK}
                  onChange={(e) => setOpRdK(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Proportional Gain (Kp)</span>
                <span className="font-mono font-semibold tabular-nums text-sky-700">
                  {kpCalc.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Integral Time (Ti = Rf·Cf)</span>
                <span className="font-mono font-semibold tabular-nums text-slate-950">
                  {tiCalc.toFixed(3)} s (Ki = {kiCalc.toFixed(2)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Derivative Gain (Kd = Rf·Cd)</span>
                <span className="font-mono font-semibold tabular-nums text-slate-950">
                  {kdCalc.toFixed(4)} s
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">HF Noise Pole (1/2πRdCd)</span>
                <span className="font-mono font-semibold tabular-nums text-emerald-700">
                  {noisePoleHz.toFixed(1)} Hz
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 3: CONTROL PIONEERS TIMELINE (1868–1972)                   */}
      {/* ================================================================== */}
      {subTab === 'timeline' && (
        <div className="space-y-4">
          {CONTROL_HISTORY_TIMELINE.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col md:flex-row md:items-start justify-between gap-4"
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-bold text-sky-700">{m.year}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-slate-900">{m.pioneer}</span>
                  <span aria-hidden="true">·</span>
                  <span>{m.affiliation}</span>
                </div>
                <h2 className="text-base font-bold text-slate-950">{m.breakthrough}</h2>
                <p className="text-sm leading-relaxed text-slate-700">{m.storyAndContext}</p>
                <p className="text-xs text-sky-800 font-medium">
                  ECE 433 Connection: {m.ece433Connection}
                </p>
              </div>

              {m.recommendedLab && (
                <button
                  type="button"
                  onClick={() => onOpenLab(m.recommendedLab!)}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700 whitespace-nowrap shrink-0"
                >
                  <span>Test in Lab</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 4: CONCEPTUAL & ESSAY DRILLS                               */}
      {/* ================================================================== */}
      {subTab === 'essays' && (
        <div className="space-y-5">
          {CONTROL_ESSAY_PROMPTS.map((essay) => {
            const isMastered = masteredEssays.includes(essay.id);
            const isRevealed = Boolean(revealedEssays[essay.id]);

            return (
              <div
                key={essay.id}
                className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{CONTROL_MODULE_META[essay.module].shortTitle}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-amber-700">{essay.catRelevance}</span>
                      <span aria-hidden="true">·</span>
                      <span>{essay.marksGuide}</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-950">{essay.title}</h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleMasteredEssay(essay.id)}
                    className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 ${
                      isMastered
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'border border-slate-300 bg-white text-slate-700 hover:border-sky-400'
                    }`}
                  >
                    {isMastered ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Mastered</span>
                      </>
                    ) : (
                      <>
                        <Circle className="h-3.5 w-3.5" />
                        <span>Mark Mastered</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-sm font-medium text-slate-900">{essay.question}</p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRevealedEssays((prev) => ({
                        ...prev,
                        [essay.id]: !prev[essay.id],
                      }))
                    }
                    className="cursor-pointer rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                  >
                    {isRevealed ? 'Hide Model Rubric' : 'Reveal Key Points & Model Answer'}
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
                        lastReason: 'Flagged for weak-topic review during essay self-check',
                      });
                      setEssayFlagFeedback((p) => ({
                        ...p,
                        [essay.id]: 'Added to Weak Topics sidebar for sprint review.',
                      }));
                    }}
                    className="cursor-pointer rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    Needs Practice (Flag Weak)
                  </button>
                </div>

                {essayFlagFeedback[essay.id] && (
                  <p className="text-xs font-medium text-amber-800">
                    {essayFlagFeedback[essay.id]}
                  </p>
                )}

                {isRevealed && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 mb-1">Grading Key Points:</div>
                      <ul className="space-y-1 text-slate-700">
                        {essay.keyPoints.map((kp, i) => (
                          <li key={kp} className="flex items-start gap-2">
                            <span className="font-mono font-semibold text-sky-700">{i + 1}.</span>
                            <span>{kp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-t border-slate-200 pt-2.5">
                      <div className="font-semibold text-slate-900 mb-1">Full Model Answer:</div>
                      <p className="leading-relaxed text-slate-700">{essay.modelAnswer}</p>
                    </div>
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
