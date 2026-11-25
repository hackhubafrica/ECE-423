import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Sparkles,
} from 'lucide-react';
import { CONTROL_WORKED_EXAMPLES } from '../../data/ece433PracticeData';
import { CONTROL_MODULE_META } from '../../data/ece433SyllabusData';
import { ControlFailedAttempt, ControlModule } from '../../types/ece433';
import {
  analyzeTransferFunction2ndOrder,
  computeMatrixExp2x2,
  designPolePlacementAndObserver,
  zieglerNicholsClosedLoop,
  zieglerNicholsOpenLoop,
} from '../../utils/controlMath';

interface ControlSolverViewProps {
  initialCalcId?: string;
  masteredExamples: string[];
  onToggleMastered: (id: string) => void;
  onRecordSolverFailure: (
    failure: Omit<ControlFailedAttempt, 'failCount' | 'lastFailedAt'>
  ) => void;
}

type CalcKey =
  | 'zn_tuning'
  | 'opamp_pid'
  | 'lead_lag'
  | 'canonical_ss'
  | 'matrix_exp'
  | 'kalman_rank'
  | 'pole_place';

export const ControlSolverView: React.FC<ControlSolverViewProps> = ({
  initialCalcId,
  masteredExamples,
  onToggleMastered,
  onRecordSolverFailure,
}) => {
  const [activeCalc, setActiveCalc] = useState<CalcKey>(
    (initialCalcId as CalcKey) || 'zn_tuning'
  );

  useEffect(() => {
    if (initialCalcId) {
      setActiveCalc(initialCalcId as CalcKey);
    }
  }, [initialCalcId]);

  // ZN inputs
  const [znKu, setZnKu] = useState(48);
  const [znPu, setZnPu] = useState(2.22);
  const [znK, setZnK] = useState(1.2);
  const [znL, setZnL] = useState(0.4);
  const [znT, setZnT] = useState(2.0);

  // Op-Amp PID inputs
  const [opRfK, setOpRfK] = useState(48);
  const [opRinK, setOpRinK] = useState(10);
  const [opCfUf, setOpCfUf] = useState(18.75);
  const [opCdUf, setOpCdUf] = useState(1.0);

  // Lead/Lag inputs
  const [phiReqDeg, setPhiReqDeg] = useState(30);
  const [omegaM, setOmegaM] = useState(6.0);
  const [lagBeta, setLagBeta] = useState(8.0);
  const [lagWgc, setLagWgc] = useState(1.5);

  // Canonical / e^(At) / Kalman / Pole inputs
  const [b1, setB1] = useState(2);
  const [b0, setB0] = useState(8);
  const [a1, setA1] = useState(5);
  const [a0, setA0] = useState(6);
  const [expT, setExpT] = useState(0.5);
  const [desP1, setDesP1] = useState(-3);
  const [desP2, setDesP2] = useState(-3);

  // Hand check state
  const [handAnswers, setHandAnswers] = useState<Record<string, string>>({});
  const [handResults, setHandResults] = useState<
    Record<string, { ok: boolean; msg: string }>
  >({});

  const znCl = useMemo(() => zieglerNicholsClosedLoop(znKu, znPu, 'PID'), [znKu, znPu]);
  const znOl = useMemo(() => zieglerNicholsOpenLoop(znK, znL, znT, 'PID'), [znK, znL, znT]);

  const leadMath = useMemo(() => {
    const rad = (phiReqDeg * Math.PI) / 180;
    const s = Math.sin(rad);
    const alpha = (1 - s) / (1 + s);
    const tau = 1 / (omegaM * Math.sqrt(Math.max(0.01, alpha)));
    const boostDb = 20 * Math.log10(1 / Math.max(0.01, alpha));
    const lagTau = 10 / Math.max(0.1, lagWgc);
    return { alpha, tau, alphaTau: alpha * tau, boostDb, lagTau, lagPole: 1 / (lagBeta * lagTau) };
  }, [phiReqDeg, omegaM, lagBeta, lagWgc]);

  const ssAnalysis = useMemo(
    () => analyzeTransferFunction2ndOrder(b1, b0, a1, a0),
    [b1, b0, a1, a0]
  );

  const phiExp = useMemo(
    () => computeMatrixExp2x2(ssAnalysis.ccf.A, expT),
    [ssAnalysis.ccf.A, expT]
  );

  const poleObs = useMemo(
    () =>
      designPolePlacementAndObserver({
        A: ssAnalysis.ccf.A,
        B: ssAnalysis.ccf.B,
        C: ssAnalysis.ccf.C,
        p1: desP1,
        p2: desP2,
        obsMultiplier: 3,
        useIntegralControl: false,
        pInt: -5,
        x0: [1, 0],
        xHat0: [0, 0],
        refStep: 1,
      }),
    [ssAnalysis, desP1, desP2]
  );

  const verifyHandCalc = (
    exId: string,
    title: string,
    mod: ControlModule,
    expected: number,
    calcId: string
  ) => {
    const raw = parseFloat((handAnswers[exId] || '').trim());
    if (!Number.isFinite(raw)) {
      setHandResults((p) => ({ ...p, [exId]: { ok: false, msg: 'Enter a numeric value first.' } }));
      return;
    }
    const tol = Math.max(0.05, Math.abs(expected) * 0.03);
    if (Math.abs(raw - expected) <= tol) {
      setHandResults((p) => ({
        ...p,
        [exId]: { ok: true, msg: `Verified (${raw}) within 3% of exact ${expected.toFixed(2)}.` },
      }));
    } else {
      setHandResults((p) => ({
        ...p,
        [exId]: {
          ok: false,
          msg: `Got ${raw}, expected ≈ ${expected.toFixed(2)}. Logged to Weak Topics.`,
        },
      }));
      onRecordSolverFailure({
        id: exId,
        title,
        module: mod,
        source: 'example',
        recommendedCalc: calcId,
        lastReason: `Hand answer ${raw} differed from exact ${expected.toFixed(2)}`,
      });
    }
  };

  const EXPECTED_VALUES: Record<string, { prompt: string; expected: number; calcId: string }> = {
    'ex-433-zn': { prompt: 'Check ZN Kp:', expected: 28.8, calcId: 'zn_tuning' },
    'ex-433-lead': { prompt: 'Check α:', expected: 0.333, calcId: 'lead_lag' },
    'ex-433-canonical': { prompt: 'Check diagonal r₁:', expected: 4.0, calcId: 'canonical_ss' },
    'ex-433-stm': { prompt: 'Check Φ₁₁(0.5):', expected: 0.845, calcId: 'matrix_exp' },
    'ex-433-kalman': { prompt: 'Check det(O):', expected: -30, calcId: 'kalman_rank' },
    'ex-433-pole-obs': { prompt: 'Check observer l₂:', expected: 49, calcId: 'pole_place' },
  };

  return (
    <div className="space-y-10">
      {/* Interactive Solver Grid */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              ECE 433 Solvers &amp; Matrix Verifiers
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Verify homework, CAT derivations, and MATLAB results across PID, Bode Lead/Lag, Canonical Forms, e^(At), and Ackermann Pole Placement.
            </p>
          </div>

          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            {[
              { id: 'zn_tuning', label: 'Ziegler–Nichols' },
              { id: 'opamp_pid', label: 'Op-Amp PID' },
              { id: 'lead_lag', label: 'Lead / Lag' },
              { id: 'canonical_ss', label: 'Canonical SS' },
              { id: 'matrix_exp', label: 'e^(At)' },
              { id: 'kalman_rank', label: 'Kalman / Gilbert' },
              { id: 'pole_place', label: 'Pole & L' },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCalc(c.id as CalcKey)}
                className={`cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeCalc === c.id ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 1. ZN Solver */}
        {activeCalc === 'zn_tuning' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="font-semibold text-sm text-slate-950">Method 2: Closed-Loop Ultimate Gain</div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="font-medium text-slate-700">Ultimate Gain Ku</span>
                  <input
                    type="number"
                    value={znKu}
                    onChange={(e) => setZnKu(parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-medium text-slate-700">Ultimate Period Pu (s)</span>
                  <input
                    type="number"
                    step="0.05"
                    value={znPu}
                    onChange={(e) => setZnPu(parseFloat(e.target.value) || 0.1)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono"
                  />
                </label>
              </div>
              <div className="rounded border border-slate-200 bg-white p-3 font-mono space-y-1 tabular-nums">
                <div>Kp = 0.6·Ku = <strong className="text-sky-700">{znCl.kp.toFixed(3)}</strong></div>
                <div>Ti = 0.5·Pu = <strong>{znCl.ti.toFixed(3)} s</strong> (Ki = {znCl.ki.toFixed(3)})</div>
                <div>Td = 0.125·Pu = <strong>{znCl.td.toFixed(3)} s</strong> (Kd = {znCl.kd.toFixed(3)})</div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="font-semibold text-sm text-slate-950">Method 1: Open-Loop Reaction Curve</div>
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="font-medium text-slate-700">Gain K</span>
                  <input
                    type="number"
                    step="0.1"
                    value={znK}
                    onChange={(e) => setZnK(parseFloat(e.target.value) || 0.1)}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-medium text-slate-700">Delay L (s)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={znL}
                    onChange={(e) => setZnL(parseFloat(e.target.value) || 0.05)}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-medium text-slate-700">Time Const T (s)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={znT}
                    onChange={(e) => setZnT(parseFloat(e.target.value) || 0.1)}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono"
                  />
                </label>
              </div>
              <div className="rounded border border-slate-200 bg-white p-3 font-mono space-y-1 tabular-nums">
                <div>Kp = 1.2·T/(K·L) = <strong className="text-sky-700">{znOl.kp.toFixed(3)}</strong></div>
                <div>Ti = 2·L = <strong>{znOl.ti.toFixed(3)} s</strong> (Ki = {znOl.ki.toFixed(3)})</div>
                <div>Td = 0.5·L = <strong>{znOl.td.toFixed(3)} s</strong> (Kd = {znOl.kd.toFixed(3)})</div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Op-Amp PID */}
        {activeCalc === 'opamp_pid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <label className="space-y-1">
                <span>Rin (kΩ)</span>
                <input type="number" value={opRinK} onChange={(e) => setOpRinK(parseFloat(e.target.value) || 1)} className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono" />
              </label>
              <label className="space-y-1">
                <span>Rf (kΩ)</span>
                <input type="number" value={opRfK} onChange={(e) => setOpRfK(parseFloat(e.target.value) || 1)} className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono" />
              </label>
              <label className="space-y-1">
                <span>Cf (µF)</span>
                <input type="number" step="0.25" value={opCfUf} onChange={(e) => setOpCfUf(parseFloat(e.target.value) || 0.1)} className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono" />
              </label>
              <label className="space-y-1">
                <span>Cd (µF)</span>
                <input type="number" step="0.1" value={opCdUf} onChange={(e) => setOpCdUf(parseFloat(e.target.value) || 0.1)} className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono" />
              </label>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 font-mono space-y-2 tabular-nums">
              <div>Kp = Rf / Rin = <strong className="text-sky-700">{(opRfK / opRinK).toFixed(3)}</strong></div>
              <div>Ti = Rf · Cf = <strong>{(opRfK * 1000 * opCfUf * 1e-6).toFixed(4)} s</strong></div>
              <div>Ki = 1 / (Rin · Cf) = <strong>{(1 / (opRinK * 1000 * opCfUf * 1e-6)).toFixed(3)} s⁻¹</strong></div>
              <div>Kd = Rf · Cd = <strong>{(opRfK * 1000 * opCdUf * 1e-6).toFixed(4)} s</strong></div>
            </div>
          </div>
        )}

        {/* 3. Lead / Lag */}
        {activeCalc === 'lead_lag' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="font-semibold text-sm text-slate-950">Lead Compensator Solver</div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span>Required φ_max (deg)</span>
                  <input type="number" value={phiReqDeg} onChange={(e) => setPhiReqDeg(Math.min(75, Math.max(5, parseFloat(e.target.value) || 30)))} className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono" />
                </label>
                <label className="space-y-1">
                  <span>Center Freq ω_m (rad/s)</span>
                  <input type="number" step="0.5" value={omegaM} onChange={(e) => setOmegaM(parseFloat(e.target.value) || 1)} className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono" />
                </label>
              </div>
              <div className="rounded border border-slate-200 bg-white p-3 font-mono space-y-1 tabular-nums">
                <div>α = (1 − sin φ)/(1 + sin φ) = <strong className="text-sky-700">{leadMath.alpha.toFixed(4)}</strong></div>
                <div>τ = 1 / (ω_m √α) = <strong>{leadMath.tau.toFixed(4)} s</strong></div>
                <div>C_lead(s) = (1 + {leadMath.tau.toFixed(3)}s) / (1 + {leadMath.alphaTau.toFixed(3)}s) (+{leadMath.boostDb.toFixed(2)} dB)</div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="font-semibold text-sm text-slate-950">Lag Compensator Solver</div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span>DC Gain Boost Ratio β</span>
                  <input type="number" value={lagBeta} onChange={(e) => setLagBeta(Math.max(1.5, parseFloat(e.target.value) || 5))} className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono" />
                </label>
                <label className="space-y-1">
                  <span>Target ω_gc (rad/s)</span>
                  <input type="number" step="0.2" value={lagWgc} onChange={(e) => setLagWgc(parseFloat(e.target.value) || 1)} className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono" />
                </label>
              </div>
              <div className="rounded border border-slate-200 bg-white p-3 font-mono space-y-1 tabular-nums">
                <div>Zero at 1/τ = ω_gc / 10 = <strong>{(1 / leadMath.lagTau).toFixed(3)} rad/s</strong></div>
                <div>Pole at 1/(βτ) = <strong>{leadMath.lagPole.toFixed(4)} rad/s</strong></div>
                <div>HF Attenuation: <strong>−{(20 * Math.log10(lagBeta)).toFixed(2)} dB</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* 4..7 State-Space / e^(At) / Kalman / Pole & Observer */}
        {(activeCalc === 'canonical_ss' ||
          activeCalc === 'matrix_exp' ||
          activeCalc === 'kalman_rank' ||
          activeCalc === 'pole_place') && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <label className="space-y-1">
                <span>Num b₁</span>
                <input type="number" value={b1} onChange={(e) => setB1(parseFloat(e.target.value) || 0)} className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono" />
              </label>
              <label className="space-y-1">
                <span>Num b₀</span>
                <input type="number" value={b0} onChange={(e) => setB0(parseFloat(e.target.value) || 0)} className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono" />
              </label>
              <label className="space-y-1">
                <span>Den a₁</span>
                <input type="number" value={a1} onChange={(e) => setA1(parseFloat(e.target.value) || 0)} className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono" />
              </label>
              <label className="space-y-1">
                <span>Den a₀</span>
                <input type="number" value={a0} onChange={(e) => setA0(parseFloat(e.target.value) || 0)} className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono" />
              </label>
              <label className="space-y-1">
                <span>t for e^(At)</span>
                <input type="number" step="0.1" value={expT} onChange={(e) => setExpT(parseFloat(e.target.value) || 0)} className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono" />
              </label>
              <label className="space-y-1">
                <span>Target Poles p₁=p₂</span>
                <input type="number" step="0.5" value={desP1} onChange={(e) => { const v = parseFloat(e.target.value) || -3; setDesP1(v); setDesP2(v); }} className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 font-mono space-y-1.5 tabular-nums">
                <div className="font-sans font-semibold text-slate-900">Canonical Forms</div>
                <div>A_ccf = [[0, 1], [{-a0}, {-a1}]]</div>
                <div>C_ccf = [{b0}, {b1}]</div>
                <div>A_ocf = [[0, {-a0}], [1, {-a1}]]</div>
                <div>Modal: [{ssAnalysis.modal.A[0].map((v) => v.toFixed(2)).join(', ')}]; [{ssAnalysis.modal.A[1].map((v) => v.toFixed(2)).join(', ')}]</div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 font-mono space-y-1.5 tabular-nums">
                <div className="font-sans font-semibold text-slate-900">Φ({expT}) = e^(At) &amp; Kalman Rank</div>
                <div>Φ = [[{phiExp[0][0].toFixed(3)}, {phiExp[0][1].toFixed(3)}], [{phiExp[1][0].toFixed(3)}, {phiExp[1][1].toFixed(3)}]]</div>
                <div>Kalman rank(C) = {ssAnalysis.rankC} (det={ssAnalysis.detC.toFixed(2)})</div>
                <div>Kalman rank(O) = {ssAnalysis.rankO} (det={ssAnalysis.detO.toFixed(2)})</div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 font-mono space-y-1.5 tabular-nums">
                <div className="font-sans font-semibold text-slate-900">Ackermann K &amp; Observer L</div>
                {poleObs ? (
                  <>
                    <div>K = [{poleObs.K[0].toFixed(3)}, {poleObs.K[1].toFixed(3)}]</div>
                    <div>L (3× poles) = [{poleObs.L[0].toFixed(2)}; {poleObs.L[1].toFixed(2)}]</div>
                    <div>Feedforward Nr = {poleObs.Nr.toFixed(3)}</div>
                  </>
                ) : (
                  <div className="text-red-700">Uncontrollable or unobservable pair!</div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Worked Exam Problems */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            Worked ECE 433 Exam Problems &amp; Hand-Calc Verifier
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify your hand-derived numerical answers; wrong answers are automatically logged to Weak Topics.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {CONTROL_WORKED_EXAMPLES.map((ex) => {
            const mastered = masteredExamples.includes(ex.id);
            const checkCfg = EXPECTED_VALUES[ex.id];
            const res = handResults[ex.id];

            return (
              <div
                key={ex.id}
                className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{CONTROL_MODULE_META[ex.module].shortTitle}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-amber-700">{ex.catRelevance}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-950 mt-0.5">{ex.title}</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleMastered(ex.id)}
                    className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 ${
                      mastered
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'border border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {mastered ? (
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

                <p className="text-sm text-slate-800">{ex.problemStatement}</p>

                <div className="space-y-2 text-xs">
                  {ex.steps.map((st) => (
                    <div key={st.label} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <div className="font-semibold text-slate-900">{st.label}</div>
                      <div className="font-mono text-sky-800 mt-0.5">{st.calculation}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs font-mono font-semibold text-emerald-900">
                  Final Answer: {ex.finalAnswer}
                </div>

                {checkCfg && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="font-medium text-slate-700">{checkCfg.prompt}</span>
                    <input
                      type="text"
                      value={handAnswers[ex.id] || ''}
                      onChange={(e) =>
                        setHandAnswers((p) => ({ ...p, [ex.id]: e.target.value }))
                      }
                      placeholder="Your value"
                      className="w-28 rounded border border-slate-300 px-2.5 py-1 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        verifyHandCalc(
                          ex.id,
                          ex.title,
                          ex.module,
                          checkCfg.expected,
                          checkCfg.calcId
                        )
                      }
                      className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white hover:bg-slate-800"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Verify Answer</span>
                    </button>
                    {res && (
                      <span
                        className={`font-medium ${
                          res.ok ? 'text-emerald-700' : 'text-amber-800'
                        }`}
                      >
                        {res.msg}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
