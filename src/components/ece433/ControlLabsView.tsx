import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Sliders,
  Zap,
} from 'lucide-react';
import { ControlLabType } from '../../types/ece433';
import {
  analyzeFrequencyCompensation,
  analyzeGeneralStateSpace2x2,
  analyzeTransferFunction2ndOrder,
  computeMatrixExp2x2,
  designPolePlacementAndObserver,
  Mat2,
  mat2Det,
  mat2Eigenvalues,
  mat2Inv,
  mat2Mul,
  simulatePidLoop,
  zieglerNicholsClosedLoop,
  zieglerNicholsOpenLoop,
} from '../../utils/controlMath';

interface ControlLabsViewProps {
  activeLab: ControlLabType;
  onSelectLab: (lab: ControlLabType) => void;
  onOpenTheory: (subTab?: 'principles' | 'opamp' | 'timeline' | 'essays') => void;
}

const LAB_TABS: { id: ControlLabType; label: string }[] = [
  { id: ControlLabType.PID_WINDUP, label: 'PID, ZN & Windup' },
  { id: ControlLabType.BODE_COMP, label: 'Bode Lead & Lag' },
  { id: ControlLabType.STATE_CANONICAL, label: 'State-Space & e^(At)' },
  { id: ControlLabType.POLE_OBSERVER, label: 'Pole & Observer' },
];

function formatComplex(re: number, im: number): string {
  if (Math.abs(im) < 1e-4) return re.toFixed(3);
  const sign = im >= 0 ? '+' : '−';
  return `${re.toFixed(2)} ${sign} j${Math.abs(im).toFixed(2)}`;
}

function MatBox({ title, M }: { title: string; M: Mat2 }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
      <div className="text-[11px] font-semibold text-slate-600">{title}</div>
      <div className="font-mono text-xs text-slate-950 tabular-nums space-y-0.5 border-l-2 border-r-2 border-slate-400 px-2.5 py-1 rounded-sm bg-white">
        <div className="flex justify-between gap-4">
          <span>{M[0][0].toFixed(3)}</span>
          <span>{M[0][1].toFixed(3)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>{M[1][0].toFixed(3)}</span>
          <span>{M[1][1].toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}

export const ControlLabsView: React.FC<ControlLabsViewProps> = ({
  activeLab,
  onSelectLab,
  onOpenTheory,
}) => {
  // 1. PID & Windup state
  const [plantK, setPlantK] = useState(1.2);
  const [tau1, setTau1] = useState(1.0);
  const [tau2, setTau2] = useState(0.5);
  const [kp, setKp] = useState(4.2);
  const [ki, setKi] = useState(2.8);
  const [kd, setKd] = useState(1.1);
  const [uMax, setUMax] = useState(2.2);
  const [antiWindup, setAntiWindup] = useState<'none' | 'clamping' | 'back_calc'>('none');

  // 2. Bode Lead/Lag state
  const [bodePlantK, setBodePlantK] = useState(20);
  const [compType, setCompType] = useState<'lead' | 'lag' | 'lead_lag' | 'pd' | 'pi'>('lead');
  const [kc, setKc] = useState(1.0);
  const [alphaLead, setAlphaLead] = useState(0.28);
  const [tauLead, setTauLead] = useState(0.32);
  const [betaLag, setBetaLag] = useState(6.0);
  const [tauLag, setTauLag] = useState(2.5);

  // 3. State-Space Canonical / e^(At) / Kalman & Gilbert state
  const [ssPreset, setSsPreset] = useState<'underdamped' | 'overdamped' | 'repeated' | 'uncontrollable'>('overdamped');
  const [b1, setB1] = useState(2);
  const [b0, setB0] = useState(8);
  const [a1, setA1] = useState(5);
  const [a0, setA0] = useState(6);
  const [simP12, setSimP12] = useState(2.0);
  const [evalTime, setEvalTime] = useState(0.5);

  // 4. Pole Placement + Integral Servo + Observer state
  const [pole1, setPole1] = useState(-3.0);
  const [pole2, setPole2] = useState(-4.0);
  const [obsMult, setObsMult] = useState(3.5);
  const [useIntegral, setUseIntegral] = useState(true);
  const [poleInt, setPoleInt] = useState(-5.0);
  const [xHatMismatch, setXHatMismatch] = useState(-1.2);

  // Computed PID Simulation
  const pidResult = useMemo(
    () =>
      simulatePidLoop({
        plantK,
        tau1,
        tau2,
        kp,
        ki,
        kd,
        uMax,
        antiWindup,
      }),
    [plantK, tau1, tau2, kp, ki, kd, uMax, antiWindup]
  );

  const pidClampBaseline = useMemo(
    () =>
      antiWindup === 'none'
        ? simulatePidLoop({
            plantK,
            tau1,
            tau2,
            kp,
            ki,
            kd,
            uMax,
            antiWindup: 'clamping',
          })
        : null,
    [plantK, tau1, tau2, kp, ki, kd, uMax, antiWindup]
  );

  // Computed Bode Compensation
  const bodeResult = useMemo(
    () =>
      analyzeFrequencyCompensation({
        plantK: bodePlantK,
        p1: 4.0,
        p2: 14.0,
        compType,
        kc,
        alphaLead,
        tauLead,
        betaLag,
        tauLag,
      }),
    [bodePlantK, compType, kc, alphaLead, tauLead, betaLag, tauLag]
  );

  const maxPhaseLeadDeg =
    (Math.asin(Math.max(-0.99, Math.min(0.99, (1 - alphaLead) / (1 + alphaLead)))) *
      180) /
    Math.PI;

  // Computed State-Space
  const ssResult = useMemo(() => {
    if (ssPreset === 'uncontrollable') {
      const A: Mat2 = [
        [-1, 0],
        [0, -4],
      ];
      const B: [number, number] = [1, 0];
      const C: [number, number] = [2, 5];
      const gen = analyzeGeneralStateSpace2x2(A, B, C);
      const P: Mat2 = [
        [1, simP12],
        [0, 1],
      ];
      const Pinv = mat2Inv(P)!;
      const Atilde = mat2Mul(mat2Mul(Pinv, A), P);
      const phiT = computeMatrixExp2x2(A, evalTime);
      return {
        isCustomUnctrl: true,
        A,
        B,
        C,
        Atilde,
        tildeEigs: mat2Eigenvalues(Atilde),
        phiT,
        gen,
        canonical: null,
      };
    }

    const can = analyzeTransferFunction2ndOrder(b1, b0, a1, a0);
    const A = can.ccf.A;
    const P: Mat2 = [
      [1, simP12],
      [0, 1],
    ];
    const Pinv = mat2Inv(P)!;
    const Atilde = mat2Mul(mat2Mul(Pinv, A), P);
    const phiT = computeMatrixExp2x2(A, evalTime);
    return {
      isCustomUnctrl: false,
      A,
      B: can.ccf.B,
      C: can.ccf.C,
      Atilde,
      tildeEigs: mat2Eigenvalues(Atilde),
      phiT,
      gen: null,
      canonical: can,
    };
  }, [ssPreset, b1, b0, a1, a0, simP12, evalTime]);

  // Computed Pole Placement & Observer
  const poleObsResult = useMemo(
    () =>
      designPolePlacementAndObserver({
        A: [
          [0, 1],
          [0, -2],
        ],
        B: [0, 1],
        C: [1, 0],
        p1: pole1,
        p2: pole2,
        obsMultiplier: obsMult,
        useIntegralControl: useIntegral,
        pInt: poleInt,
        x0: [0.0, 0.0],
        xHat0: [0.4, xHatMismatch],
        refStep: 1.0,
      }),
    [pole1, pole2, obsMult, useIntegral, poleInt, xHatMismatch]
  );

  return (
    <div className="space-y-8">
      {/* Header & Lab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Interactive Control System II Labs
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Experiment live with PID windup and Ziegler–Nichols rules, Bode Lead/Lag margins, state-space canonical matrices, e^(At), and Luenberger observers.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 shrink-0">
          {LAB_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectLab(tab.id)}
              className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeLab === tab.id
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================================================================== */}
      {/* LAB 1: PID, ZIEGLER-NICHOLS & INTEGRATOR WINDUP                    */}
      {/* ================================================================== */}
      {activeLab === ControlLabType.PID_WINDUP && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Closed-Loop Step Response &amp; Actuator Saturation Monitor
                </h2>
                <p className="text-xs text-slate-500">
                  Solid blue: output y(t) · Dashed emerald: clamping reference (when windup enabled) · Bottom: actuator u(t)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenTheory('opamp')}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
              >
                <BookOpen className="h-3.5 w-3.5 text-sky-600" />
                <span>Op-Amp Realizations</span>
              </button>
            </div>

            {/* Dual SVG Plot: Top y(t), Bottom u(t) */}
            <svg
              viewBox="0 0 720 340"
              className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/70 cursor-crosshair"
              role="img"
              aria-label="PID step response and actuator saturation waveform"
            >
              {/* Top Plot y(t) (y: 20..190) */}
              {[0, 0.5, 1.0, 1.5, 2.0].map((v) => {
                const yPos = 190 - (v / 2.2) * 165;
                return (
                  <g key={`yg-${v}`}>
                    <line
                      x1={56}
                      y1={yPos}
                      x2={692}
                      y2={yPos}
                      stroke={v === 1.0 ? '#94a3b8' : '#e2e8f0'}
                      strokeDasharray={v === 1.0 ? '4 4' : undefined}
                      strokeWidth="1"
                    />
                    <text x={48} y={yPos + 4} textAnchor="end" className="fill-slate-500 font-mono text-[10px]">
                      {v.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {pidClampBaseline && (
                <path
                  d={pidClampBaseline.outputs
                    .map((val, idx) => {
                      const x = 56 + (idx / Math.max(1, pidClampBaseline.times.length - 1)) * 636;
                      const clampedY = Math.max(-0.2, Math.min(2.2, val));
                      const y = 190 - (clampedY / 2.2) * 165;
                      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#059669"
                  strokeDasharray="5 4"
                  strokeWidth="1.8"
                />
              )}

              <path
                d={pidResult.outputs
                  .map((val, idx) => {
                    const x = 56 + (idx / Math.max(1, pidResult.times.length - 1)) * 636;
                    const clampedY = Math.max(-0.2, Math.min(2.2, val));
                    const y = 190 - (clampedY / 2.2) * 165;
                    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.4"
              />
              <text x={66} y={32} className="fill-sky-800 font-mono text-[10px] font-semibold">
                Output y(t) vs Setpoint r = 1.0
              </text>

              {/* Bottom Plot u(t) (y: 220..315) */}
              <line x1={56} y1={267} x2={692} y2={267} stroke="#cbd5e1" strokeWidth="1" />
              <line x1={56} y1={225} x2={692} y2={225} stroke="#fca5a5" strokeDasharray="3 3" strokeWidth="1" />
              <line x1={56} y1={309} x2={692} y2={309} stroke="#fca5a5" strokeDasharray="3 3" strokeWidth="1" />
              <text x={48} y={229} textAnchor="end" className="fill-red-600 font-mono text-[9px]">
                +{uMax.toFixed(1)}
              </text>
              <text x={48} y={312} textAnchor="end" className="fill-red-600 font-mono text-[9px]">
                −{uMax.toFixed(1)}
              </text>
              <path
                d={pidResult.controls
                  .map((u, idx) => {
                    const x = 56 + (idx / Math.max(1, pidResult.times.length - 1)) * 636;
                    const y = 267 - (u / Math.max(0.5, uMax)) * 42;
                    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#d97706"
                strokeWidth="2"
              />
              <text x={374} y={332} textAnchor="middle" className="fill-slate-600 font-mono text-[10px]">
                Actuator Control Effort u(t) Clamped at ±{uMax.toFixed(1)} · Time 0 to 12 s
              </text>
            </svg>

            {/* Telemetry Readout */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500">Overshoot</div>
                <div
                  className={`font-mono text-base font-bold tabular-nums ${
                    pidResult.overshootPct > 25 ? 'text-amber-700' : 'text-slate-950'
                  }`}
                >
                  {pidResult.overshootPct.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500">Rise Time (10–90%)</div>
                <div className="font-mono text-base font-bold tabular-nums text-slate-950">
                  {pidResult.riseTime.toFixed(2)} s
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500">Settling Time (2%)</div>
                <div className="font-mono text-base font-bold tabular-nums text-slate-950">
                  {pidResult.settlingTime.toFixed(2)} s
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500">Actuator Saturated</div>
                <div className="font-mono text-base font-bold tabular-nums text-sky-700">
                  {(pidResult.saturatedFraction * 100).toFixed(0)}% of run
                </div>
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-950">
                PID, Ziegler–Nichols &amp; Anti-Windup
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Plant: G(s) = {plantK.toFixed(1)} / (({tau1.toFixed(1)}s+1)({tau2.toFixed(1)}s+1))
              </p>
            </div>

            {/* One-Click ZN & Presets */}
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-700">
                Quick Controller Presets
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const zn = zieglerNicholsClosedLoop(6.5, 2.1, 'PID');
                    setKp(Number(zn.kp.toFixed(2)));
                    setKi(Number(zn.ki.toFixed(2)));
                    setKd(Number(zn.kd.toFixed(2)));
                  }}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                >
                  ZN Closed-Loop PID
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const zn = zieglerNicholsOpenLoop(plantK, 0.35, tau1 + tau2, 'PID');
                    setKp(Number(zn.kp.toFixed(2)));
                    setKi(Number(zn.ki.toFixed(2)));
                    setKd(Number(zn.kd.toFixed(2)));
                  }}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                >
                  ZN Open-Loop S-Curve
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { label: 'Proportional Kp', val: kp, set: setKp, min: 0, max: 12, step: 0.2 },
                { label: 'Integral Ki', val: ki, set: setKi, min: 0, max: 10, step: 0.2 },
                { label: 'Derivative Kd', val: kd, set: setKd, min: 0, max: 4, step: 0.1 },
                { label: 'Actuator Limit (±u_max)', val: uMax, set: setUMax, min: 1.0, max: 8.0, step: 0.2 },
                { label: 'Plant Gain K', val: plantK, set: setPlantK, min: 0.5, max: 3.0, step: 0.1 },
              ].map((s) => (
                <label key={s.label} className="block space-y-1">
                  <div className="flex justify-between font-medium text-slate-700">
                    <span>{s.label}</span>
                    <span className="font-mono tabular-nums text-slate-950">{s.val.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={s.val}
                    onChange={(e) => s.set(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </label>
              ))}
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-700">
                Anti-Windup Strategy
              </span>
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                {[
                  { id: 'none', label: 'None (Windup)' },
                  { id: 'clamping', label: 'Clamping' },
                  { id: 'back_calc', label: 'Back-Calc' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAntiWindup(m.id as typeof antiWindup)}
                    className={`cursor-pointer rounded-md py-1.5 text-[11px] font-semibold transition-colors ${
                      antiWindup === m.id ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* LAB 2: BODE LEAD & LAG COMPENSATION VS PI / PD                     */}
      {/* ================================================================== */}
      {activeLab === ControlLabType.BODE_COMP && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-950">
                Bode Magnitude / Phase Margin &amp; Closed-Loop Step Verification
              </h2>
              <p className="text-xs text-slate-500">
                Dashed slate: Uncompensated G(jω) · Solid blue: Compensated C(jω)G(jω)
              </p>
            </div>

            {/* Dual Bode Plot SVG */}
            <svg
              viewBox="0 0 720 340"
              className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/70"
              role="img"
              aria-label="Bode Magnitude and Phase response comparing compensated and uncompensated loops"
            >
              {/* Log frequency gridlines */}
              {[0.1, 1, 10, 100].map((wVal) => {
                const frac = Math.log10(wVal / 0.05) / Math.log10(150 / 0.05);
                const x = 60 + frac * 630;
                return (
                  <g key={`fw-${wVal}`}>
                    <line x1={x} y1={18} x2={x} y2={310} stroke="#e2e8f0" strokeWidth="1" />
                    <text x={x} y={328} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
                      {wVal} rad/s
                    </text>
                  </g>
                );
              })}

              {/* 0 dB line & -180 deg line */}
              <line x1={60} y1={90} x2={690} y2={90} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="1.2" />
              <text x={54} y={94} textAnchor="end" className="fill-slate-600 font-mono text-[10px]">0 dB</text>

              <line x1={60} y1={255} x2={690} y2={255} stroke="#dc2626" strokeDasharray="4 4" strokeWidth="1.2" />
              <text x={54} y={259} textAnchor="end" className="fill-red-600 font-mono text-[10px]">−180°</text>

              {/* Magnitude Paths (y: 18..162, range +60 dB to -60 dB) */}
              <path
                d={bodeResult.uncomp
                  .map((pt, i) => {
                    const x = 60 + (i / (bodeResult.uncomp.length - 1)) * 630;
                    const magClamped = Math.max(-60, Math.min(60, pt.magDb));
                    const y = 90 - (magClamped / 60) * 70;
                    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#64748b"
                strokeDasharray="5 4"
                strokeWidth="1.8"
              />
              <path
                d={bodeResult.comp
                  .map((pt, i) => {
                    const x = 60 + (i / (bodeResult.comp.length - 1)) * 630;
                    const magClamped = Math.max(-60, Math.min(60, pt.magDb));
                    const y = 90 - (magClamped / 60) * 70;
                    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.4"
              />

              {/* Phase Paths (y: 175..305, range -60 to -240 deg) */}
              <path
                d={bodeResult.uncomp
                  .map((pt, i) => {
                    const x = 60 + (i / (bodeResult.uncomp.length - 1)) * 630;
                    const phClamped = Math.max(-250, Math.min(-50, pt.phaseDeg));
                    const y = 255 - ((phClamped + 180) / 130) * 80;
                    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#64748b"
                strokeDasharray="5 4"
                strokeWidth="1.8"
              />
              <path
                d={bodeResult.comp
                  .map((pt, i) => {
                    const x = 60 + (i / (bodeResult.comp.length - 1)) * 630;
                    const phClamped = Math.max(-250, Math.min(-50, pt.phaseDeg));
                    const y = 255 - ((phClamped + 180) / 130) * 80;
                    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#059669"
                strokeWidth="2.4"
              />
            </svg>

            {/* Stability Margins Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500">Uncompensated PM</div>
                <div className="font-mono text-base font-bold tabular-nums text-slate-800">
                  {bodeResult.uncompPM.toFixed(1)}°
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500">Compensated PM</div>
                <div
                  className={`font-mono text-base font-bold tabular-nums ${
                    bodeResult.compPM >= 45
                      ? 'text-emerald-700'
                      : bodeResult.compPM > 0
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}
                >
                  {bodeResult.compPM.toFixed(1)}°
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500">Compensated ω_gc</div>
                <div className="font-mono text-base font-bold tabular-nums text-sky-700">
                  {bodeResult.compWgc ? `${bodeResult.compWgc.toFixed(2)} rad/s` : '—'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500">Gain Margin</div>
                <div className="font-mono text-base font-bold tabular-nums text-slate-950">
                  {Number.isFinite(bodeResult.compGM) ? `${bodeResult.compGM.toFixed(1)} dB` : '∞ dB'}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-950">
                Compensator Architecture
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Plant G(s) = {bodePlantK} / [s(s/4 + 1)(s/14 + 1)]
              </p>
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              {[
                { id: 'lead', label: 'Lead' },
                { id: 'lag', label: 'Lag' },
                { id: 'lead_lag', label: 'Lead-Lag' },
                { id: 'pd', label: 'PD' },
                { id: 'pi', label: 'PI' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCompType(m.id as typeof compType)}
                  className={`cursor-pointer rounded-md py-1.5 text-[11px] font-semibold transition-colors ${
                    compType === m.id ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Plant Gain (K)</span>
                  <span className="font-mono tabular-nums">{bodePlantK}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={1}
                  value={bodePlantK}
                  onChange={(e) => setBodePlantK(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Compensator Gain (Kc)</span>
                  <span className="font-mono tabular-nums">{kc.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={3.0}
                  step={0.1}
                  value={kc}
                  onChange={(e) => setKc(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>

              {(compType === 'lead' || compType === 'lead_lag' || compType === 'pd') && (
                <>
                  <label className="block space-y-1">
                    <div className="flex justify-between font-medium text-slate-700">
                      <span>Lead Ratio α (Max Lead {maxPhaseLeadDeg.toFixed(1)}°)</span>
                      <span className="font-mono tabular-nums">{alphaLead.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.08}
                      max={0.85}
                      step={0.02}
                      value={alphaLead}
                      onChange={(e) => setAlphaLead(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </label>
                  <label className="block space-y-1">
                    <div className="flex justify-between font-medium text-slate-700">
                      <span>Lead Time Constant (τ_lead)</span>
                      <span className="font-mono tabular-nums">{tauLead.toFixed(2)} s</span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={1.0}
                      step={0.02}
                      value={tauLead}
                      onChange={(e) => setTauLead(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </label>
                </>
              )}

              {(compType === 'lag' || compType === 'lead_lag' || compType === 'pi') && (
                <>
                  <label className="block space-y-1">
                    <div className="flex justify-between font-medium text-slate-700">
                      <span>Lag Ratio β</span>
                      <span className="font-mono tabular-nums">{betaLag.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={15}
                      step={0.5}
                      value={betaLag}
                      onChange={(e) => setBetaLag(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </label>
                  <label className="block space-y-1">
                    <div className="flex justify-between font-medium text-slate-700">
                      <span>Lag Time Constant (τ_lag)</span>
                      <span className="font-mono tabular-nums">{tauLag.toFixed(1)} s</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={8.0}
                      step={0.2}
                      value={tauLag}
                      onChange={(e) => setTauLag(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* LAB 3: STATE-SPACE CANONICAL, e^(At), SIMILARITY & KALMAN/GILBERT  */}
      {/* ================================================================== */}
      {activeLab === ControlLabType.STATE_CANONICAL && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Canonical Representations, Similarity Invariance, e^(At) &amp; Kalman/Gilbert Diagnostics
                </h2>
                <p className="text-xs text-slate-500">
                  {ssResult.isCustomUnctrl
                    ? 'Diagonal Plant: A = diag(−1, −4), B = [1; 0], C = [2, 5]'
                    : `Transfer Function: G(s) = (${b1}s + ${b0}) / (s² + ${a1}s + ${a0})`}
                </p>
              </div>

              <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                {[
                  { id: 'overdamped', label: 'Distinct Real' },
                  { id: 'underdamped', label: 'Complex Poles' },
                  { id: 'repeated', label: 'Jordan Repeated' },
                  { id: 'uncontrollable', label: 'Uncontrollable' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const id = p.id as typeof ssPreset;
                      setSsPreset(id);
                      if (id === 'overdamped') {
                        setB1(2); setB0(8); setA1(5); setA0(6);
                      } else if (id === 'underdamped') {
                        setB1(1); setB0(4); setA1(2); setA0(5);
                      } else if (id === 'repeated') {
                        setB1(1); setB0(5); setA1(4); setA0(4);
                      }
                    }}
                    className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      ssPreset === p.id ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {!ssResult.isCustomUnctrl && ssResult.canonical && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <MatBox title="Control Canonical A_ccf" M={ssResult.canonical.ccf.A} />
                  <div className="font-mono text-[11px] text-slate-600 px-1">
                    B = [0; 1] · C = [{ssResult.canonical.ccf.C.join(', ')}]
                  </div>
                </div>
                <div className="space-y-2">
                  <MatBox title="Observer Canonical A_ocf" M={ssResult.canonical.ocf.A} />
                  <div className="font-mono text-[11px] text-slate-600 px-1">
                    B = [{ssResult.canonical.ocf.B.join('; ')}] · C = [0, 1]
                  </div>
                </div>
                <div className="space-y-2">
                  <MatBox
                    title={
                      ssResult.canonical.modal.modeType === 'repeated_jordan'
                        ? 'Jordan Canonical J'
                        : ssResult.canonical.modal.modeType === 'complex_conjugate'
                        ? 'Real Modal Block'
                        : 'Diagonal Modal Λ'
                    }
                    M={ssResult.canonical.modal.A}
                  />
                  <div className="font-mono text-[11px] text-slate-600 px-1">
                    B̃ = [{ssResult.canonical.modal.B.map((v) => v.toFixed(2)).join('; ')}] · C̃ = [{ssResult.canonical.modal.C.map((v) => v.toFixed(2)).join(', ')}]
                  </div>
                </div>
              </div>
            )}

            {/* Similarity Transform + Matrix Exponential + Kalman Rank Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <MatBox title={`Similarity Ã = P⁻¹AP (p₁₂ = ${simP12.toFixed(1)})`} M={ssResult.Atilde} />
                <div className="text-[11px] font-mono text-emerald-700 font-semibold">
                  eig(Ã) = {formatComplex(ssResult.tildeEigs[0].re, ssResult.tildeEigs[0].im)},{' '}
                  {formatComplex(ssResult.tildeEigs[1].re, ssResult.tildeEigs[1].im)} (Invariant!)
                </div>
              </div>

              <div className="space-y-2">
                <MatBox title={`State Transition Φ(${evalTime.toFixed(2)}) = e^(At)`} M={ssResult.phiT} />
                <div className="text-[11px] font-mono text-slate-600">
                  det(Φ(t)) = {mat2Det(ssResult.phiT).toFixed(4)}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2 text-xs">
                <div className="font-semibold text-slate-900">Kalman &amp; Gilbert Diagnostics</div>
                {ssResult.gen ? (
                  <>
                    <div className="flex justify-between">
                      <span>Kalman rank(C):</span>
                      <span className="font-mono font-bold text-red-700">
                        {ssResult.gen.rankC} / 2 (Uncontrollable)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kalman rank(O):</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {ssResult.gen.rankO} / 2 (Observable)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Gilbert check: Row 2 of B = [1; 0] is zero ⇒ mode λ₂ = −4 is decoupled!
                    </p>
                  </>
                ) : (
                  ssResult.canonical && (
                    <>
                      <div className="flex justify-between">
                        <span>Kalman rank(C):</span>
                        <span
                          className={`font-mono font-bold ${
                            ssResult.canonical.rankC === 2 ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {ssResult.canonical.rankC} / 2 (det={ssResult.canonical.detC.toFixed(2)})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kalman rank(O):</span>
                        <span
                          className={`font-mono font-bold ${
                            ssResult.canonical.rankO === 2 ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {ssResult.canonical.rankO} / 2 (det={ssResult.canonical.detO.toFixed(2)})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Zeros: {ssResult.canonical.zeros.length > 0 ? ssResult.canonical.zeros[0].toFixed(2) : 'None'}
                      </div>
                    </>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-950">
                Transfer Function &amp; Transform Parameters
              </h3>
            </div>

            {!ssResult.isCustomUnctrl && (
              <div className="space-y-3 text-xs">
                {[
                  { label: 'Numerator b₁ (s term)', val: b1, set: setB1, min: -4, max: 6, step: 1 },
                  { label: 'Numerator b₀ (const)', val: b0, set: setB0, min: 1, max: 12, step: 1 },
                  { label: 'Denominator a₁ (s term)', val: a1, set: setA1, min: 1, max: 10, step: 1 },
                  { label: 'Denominator a₀ (const)', val: a0, set: setA0, min: 1, max: 12, step: 1 },
                ].map((c) => (
                  <label key={c.label} className="block space-y-1">
                    <div className="flex justify-between font-medium text-slate-700">
                      <span>{c.label}</span>
                      <span className="font-mono tabular-nums">{c.val}</span>
                    </div>
                    <input
                      type="range"
                      min={c.min}
                      max={c.max}
                      step={c.step}
                      value={c.val}
                      onChange={(e) => c.set(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </label>
                ))}
              </div>
            )}

            <div className="space-y-3 text-xs pt-2 border-t border-slate-100">
              <label className="block space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Similarity Shear (P[0,1])</span>
                  <span className="font-mono tabular-nums">{simP12.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={-4}
                  max={4}
                  step={0.5}
                  value={simP12}
                  onChange={(e) => setSimP12(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Matrix Exp Time (t)</span>
                  <span className="font-mono tabular-nums">{evalTime.toFixed(2)} s</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={2.0}
                  step={0.1}
                  value={evalTime}
                  onChange={(e) => setEvalTime(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* LAB 4: POLE PLACEMENT, INTEGRAL SERVO & LUENBERGER OBSERVER        */}
      {/* ================================================================== */}
      {activeLab === ControlLabType.POLE_OBSERVER && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-950">
                State-Variable Pole Placement &amp; Luenberger Observer Convergence
              </h2>
              <p className="text-xs text-slate-500">
                Solid blue: true hidden velocity x₂(t) · Dashed emerald: observer estimate x̂₂(t) · Solid amber: tracked output y(t) → 1.0
              </p>
            </div>

            {poleObsResult && (
              <>
                <svg
                  viewBox="0 0 720 290"
                  className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/70"
                  role="img"
                  aria-label="Observer state convergence and pole placement tracking plot"
                >
                  {[-1.5, -0.5, 0, 0.5, 1.0, 1.5, 2.0].map((v) => {
                    const y = 250 - ((v + 1.5) / 3.8) * 220;
                    return (
                      <g key={`og-${v}`}>
                        <line
                          x1={56}
                          y1={y}
                          x2={692}
                          y2={y}
                          stroke={v === 1.0 || v === 0 ? '#94a3b8' : '#e2e8f0'}
                          strokeDasharray={v === 1.0 ? '4 4' : undefined}
                          strokeWidth="1"
                        />
                        <text x={48} y={y + 4} textAnchor="end" className="fill-slate-500 font-mono text-[10px]">
                          {v.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* True state x2 */}
                  <path
                    d={poleObsResult.x2True
                      .map((val, idx) => {
                        const x = 56 + (idx / Math.max(1, poleObsResult.times.length - 1)) * 636;
                        const c = Math.max(-1.5, Math.min(2.3, val));
                        const y = 250 - ((c + 1.5) / 3.8) * 220;
                        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2.1"
                  />

                  {/* Observer estimate x2Hat */}
                  <path
                    d={poleObsResult.x2Hat
                      .map((val, idx) => {
                        const x = 56 + (idx / Math.max(1, poleObsResult.times.length - 1)) * 636;
                        const c = Math.max(-1.5, Math.min(2.3, val));
                        const y = 250 - ((c + 1.5) / 3.8) * 220;
                        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#059669"
                    strokeDasharray="5 4"
                    strokeWidth="2.1"
                  />

                  {/* Output y */}
                  <path
                    d={poleObsResult.yTrue
                      .map((val, idx) => {
                        const x = 56 + (idx / Math.max(1, poleObsResult.times.length - 1)) * 636;
                        const c = Math.max(-1.5, Math.min(2.3, val));
                        const y = 250 - ((c + 1.5) / 3.8) * 220;
                        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="2.4"
                  />

                  <text x={374} y={278} textAnchor="middle" className="fill-slate-600 font-mono text-[10px]">
                    Time 0 to 5.0 s · Observer poles placed {obsMult.toFixed(1)}× faster than controller poles
                  </text>
                </svg>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-slate-500">Ackermann Gain K</div>
                    <div className="font-mono text-sm font-bold tabular-nums text-slate-950">
                      [{poleObsResult.K[0].toFixed(2)}, {poleObsResult.K[1].toFixed(2)}]
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-slate-500">
                      {useIntegral ? 'Integral Servo Gain Ki' : 'Feedforward Gain Nr'}
                    </div>
                    <div className="font-mono text-sm font-bold tabular-nums text-sky-700">
                      {useIntegral
                        ? `Ki = ${poleObsResult.Ki.toFixed(2)}`
                        : `Nr = ${poleObsResult.Nr.toFixed(2)}`}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-slate-500">Luenberger Observer L</div>
                    <div className="font-mono text-sm font-bold tabular-nums text-emerald-700">
                      [{poleObsResult.L[0].toFixed(1)}; {poleObsResult.L[1].toFixed(1)}]
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-950">
                Pole Placement &amp; Observer Controls
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Plant: A = [[0, 1], [0, −2]], B = [0; 1], C = [1, 0]
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Desired Pole p₁</span>
                  <span className="font-mono tabular-nums">{pole1.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={-8}
                  max={-1}
                  step={0.5}
                  value={pole1}
                  onChange={(e) => setPole1(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Desired Pole p₂</span>
                  <span className="font-mono tabular-nums">{pole2.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={-8}
                  max={-1}
                  step={0.5}
                  value={pole2}
                  onChange={(e) => setPole2(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Observer Speed Ratio</span>
                  <span className="font-mono tabular-nums">{obsMult.toFixed(1)}× faster</span>
                </div>
                <input
                  type="range"
                  min={1.5}
                  max={6.0}
                  step={0.5}
                  value={obsMult}
                  onChange={(e) => setObsMult(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Initial Observer Mismatch x̂₂(0)</span>
                  <span className="font-mono tabular-nums">{xHatMismatch.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={-1.5}
                  max={1.5}
                  step={0.3}
                  value={xHatMismatch}
                  onChange={(e) => setXHatMismatch(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-slate-800">
                    Include Integral Servo State (ẋ_I = r − y)
                  </span>
                  <input
                    type="checkbox"
                    checked={useIntegral}
                    onChange={(e) => setUseIntegral(e.target.checked)}
                    className="h-4 w-4 accent-sky-600"
                  />
                </label>

                {useIntegral && (
                  <label className="block space-y-1">
                    <div className="flex justify-between font-medium text-slate-700">
                      <span>3rd Integral Pole (p_int)</span>
                      <span className="font-mono tabular-nums">{poleInt.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={-10}
                      max={-1.5}
                      step={0.5}
                      value={poleInt}
                      onChange={(e) => setPoleInt(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700 leading-relaxed flex items-start gap-2">
              <Zap className="h-3.5 w-3.5 text-sky-600 shrink-0 mt-0.5" />
              <span>
                Separation Principle holds: observer error converges independently of K, and integral control holds steady-state y = 1.0 even under plant uncertainty.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
