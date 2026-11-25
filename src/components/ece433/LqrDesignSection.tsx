import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Mat2, solveContinuousLqr, Vec2 } from '../../utils/controlMath';

interface LqrPreset {
  id: string;
  label: string;
  desc: string;
  A: Mat2;
  B: Vec2;
  C: Vec2;
  x0: Vec2;
  q11: number;
  q22: number;
  rVal: number;
}

const LQR_PRESETS: LqrPreset[] = [
  {
    id: 'pendulum',
    label: 'Inverted Pendulum (Unstable Open-Loop)',
    desc: 'Linearized upright pendulum ẍ = 9.8x + u stabilized automatically by CARE.',
    A: [
      [0, 1],
      [9.8, 0],
    ],
    B: [0, 1],
    C: [1, 0],
    x0: [0.35, 0.0],
    q11: 20,
    q22: 2.0,
    rVal: 1.0,
  },
  {
    id: 'double_int',
    label: 'Double Integrator (Spacecraft / Mass)',
    desc: 'Pure inertial plant ẍ = u trading off position regulation against thruster fuel R.',
    A: [
      [0, 1],
      [0, 0],
    ],
    B: [0, 1],
    C: [1, 0],
    x0: [1.5, -0.5],
    q11: 10,
    q22: 1.0,
    rVal: 1.0,
  },
  {
    id: 'dc_servo',
    label: 'DC Servo Plant (Stable 2nd-Order)',
    desc: 'Damped servo motor with speed & angle states; compare cheap vs expensive control R.',
    A: [
      [0, 1],
      [-2, -3],
    ],
    B: [0, 1],
    C: [1, 0],
    x0: [1.2, 0.4],
    q11: 15,
    q22: 1.5,
    rVal: 0.5,
  },
  {
    id: 'flex_beam',
    label: 'Lightly Damped Oscillator',
    desc: 'High natural frequency ωn = 3 rad/s with low damping; LQR adds active damping via k2.',
    A: [
      [0, 1],
      [-9, -0.4],
    ],
    B: [0, 1],
    C: [1, 0],
    x0: [1.0, 0.0],
    q11: 8,
    q22: 4.0,
    rVal: 0.8,
  },
];

function formatComplex(re: number, im: number): string {
  if (Math.abs(im) < 1e-4) return re.toFixed(3);
  const sign = im >= 0 ? '+' : '−';
  return `${re.toFixed(2)} ${sign} j${Math.abs(im).toFixed(2)}`;
}

export const LqrDesignSection: React.FC = () => {
  const [a11, setA11] = useState<number>(LQR_PRESETS[0].A[0][0]);
  const [a12, setA12] = useState<number>(LQR_PRESETS[0].A[0][1]);
  const [a21, setA21] = useState<number>(LQR_PRESETS[0].A[1][0]);
  const [a22, setA22] = useState<number>(LQR_PRESETS[0].A[1][1]);
  const [b1, setB1] = useState<number>(LQR_PRESETS[0].B[0]);
  const [b2, setB2] = useState<number>(LQR_PRESETS[0].B[1]);
  const [x10, setX10] = useState<number>(LQR_PRESETS[0].x0[0]);
  const [x20, setX20] = useState<number>(LQR_PRESETS[0].x0[1]);

  const [q11, setQ11] = useState<number>(LQR_PRESETS[0].q11);
  const [q22, setQ22] = useState<number>(LQR_PRESETS[0].q22);
  const [q12, setQ12] = useState<number>(0);
  const [rVal, setRVal] = useState<number>(LQR_PRESETS[0].rVal);
  const [refStep, setRefStep] = useState<number>(0);
  const [copiedMatlab, setCopiedMatlab] = useState<boolean>(false);

  const A: Mat2 = useMemo(
    () => [
      [a11, a12],
      [a21, a22],
    ],
    [a11, a12, a21, a22]
  );
  const B: Vec2 = useMemo(() => [b1, b2], [b1, b2]);
  const C: Vec2 = [1, 0];
  const Q: Mat2 = useMemo(
    () => [
      [q11, q12],
      [q12, q22],
    ],
    [q11, q12, q22]
  );
  const x0: Vec2 = useMemo(() => [x10, x20], [x10, x20]);

  const lqr = useMemo(() => {
    return solveContinuousLqr({
      A,
      B,
      C,
      Q,
      R: rVal,
      x0,
      refStep,
      tEnd: 5.0,
    });
  }, [A, B, Q, rVal, x0, refStep]);

  const chartData = useMemo(() => {
    return lqr.times.map((t, idx) => ({
      t: Number(t.toFixed(2)),
      x1: Number(lqr.x1[idx].toFixed(4)),
      x2: Number(lqr.x2[idx].toFixed(4)),
      u: Number(lqr.u[idx].toFixed(4)),
      costRate: Number(lqr.costIntegrand[idx].toFixed(4)),
    }));
  }, [lqr]);

  const applyPreset = (p: LqrPreset) => {
    setA11(p.A[0][0]);
    setA12(p.A[0][1]);
    setA21(p.A[1][0]);
    setA22(p.A[1][1]);
    setB1(p.B[0]);
    setB2(p.B[1]);
    setX10(p.x0[0]);
    setX20(p.x0[1]);
    setQ11(p.q11);
    setQ22(p.q22);
    setQ12(0);
    setRVal(p.rVal);
  };

  const handleCopyMatlab = async () => {
    const code = `A = [${a11} ${a12}; ${a21} ${a22}];\nB = [${b1}; ${b2}];\nQ = [${q11} ${q12}; ${q12} ${q22}];\nR = ${rVal};\n[K, P, E] = lqr(A, B, Q, R);\ndisp('Optimal Gain K:'); disp(K);\ndisp('Riccati Matrix P:'); disp(P);\ndisp('Closed-loop poles E:'); disp(E);`;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedMatlab(true);
      window.setTimeout(() => setCopiedMatlab(false), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls: Plant (A,B), Q & R Weighting */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-950">
                LQR Optimal Weighting (Q &amp; R)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Minimize J = ∫(xᵀQx + R·u²)dt via CARE.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyMatlab}
              className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              {copiedMatlab ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span>Copied .m</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>MATLAB lqr()</span>
                </>
              )}
            </button>
          </div>

          {/* Plant Presets */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              LTI Plant Scenarios
            </label>
            <select
              onChange={(e) => {
                const found = LQR_PRESETS.find((p) => p.id === e.target.value);
                if (found) applyPreset(found);
              }}
              defaultValue={LQR_PRESETS[0].id}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-900"
            >
              {LQR_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Weighting Trade-Off Regimes */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Cost Trade-off Regimes
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setQ11(80);
                  setQ22(6);
                  setQ12(0);
                  setRVal(0.1);
                }}
                className="cursor-pointer rounded border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-semibold text-slate-800 hover:border-sky-400"
              >
                Cheap Control
              </button>
              <button
                type="button"
                onClick={() => {
                  setQ11(15);
                  setQ22(2);
                  setQ12(0);
                  setRVal(1.0);
                }}
                className="cursor-pointer rounded border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-semibold text-slate-800 hover:border-sky-400"
              >
                Balanced
              </button>
              <button
                type="button"
                onClick={() => {
                  setQ11(2);
                  setQ22(0.5);
                  setQ12(0);
                  setRVal(12.0);
                }}
                className="cursor-pointer rounded border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-semibold text-slate-800 hover:border-sky-400"
              >
                Low Energy
              </button>
            </div>
          </div>

          {/* Q Matrix Diagonal & Off-Diagonal Sliders */}
          <div className="space-y-3 border-t border-slate-100 pt-4 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-800">State Weight q₁₁ (x₁ penalty)</span>
                <span className="font-mono font-semibold text-sky-700 tabular-nums">
                  {q11.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={q11}
                onChange={(e) => setQ11(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-800">State Weight q₂₂ (x₂ penalty)</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {q22.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={0.5}
                value={q22}
                onChange={(e) => setQ22(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-800">Cross-Term q₁₂ = q₂₁</span>
                <span className="font-mono font-semibold text-slate-800 tabular-nums">
                  {q12.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={-15}
                max={15}
                step={0.5}
                value={q12}
                onChange={(e) => setQ12(parseFloat(e.target.value))}
                className="w-full accent-slate-700 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-800">Control Weight R (u penalty)</span>
                <span className="font-mono font-semibold text-amber-700 tabular-nums">
                  {rVal.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.05}
                max={20}
                step={0.05}
                value={rVal}
                onChange={(e) => setRVal(parseFloat(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Editable A, B & x(0) */}
          <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Plant Matrices A, B &amp; Initial State x(0)
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <label className="space-y-0.5">
                <span className="text-[10px] text-slate-500">a₁₁ / a₁₂</span>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step={0.2}
                    value={a11}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setA11(v);
                    }}
                    className="w-1/2 rounded border border-slate-300 px-1.5 py-1 tabular-nums"
                  />
                  <input
                    type="number"
                    step={0.2}
                    value={a12}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setA12(v);
                    }}
                    className="w-1/2 rounded border border-slate-300 px-1.5 py-1 tabular-nums"
                  />
                </div>
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-slate-500">a₂₁ / a₂₂</span>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step={0.2}
                    value={a21}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setA21(v);
                    }}
                    className="w-1/2 rounded border border-slate-300 px-1.5 py-1 tabular-nums"
                  />
                  <input
                    type="number"
                    step={0.2}
                    value={a22}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setA22(v);
                    }}
                    className="w-1/2 rounded border border-slate-300 px-1.5 py-1 tabular-nums"
                  />
                </div>
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-slate-500">B = [b₁; b₂]</span>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step={0.5}
                    value={b1}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setB1(v);
                    }}
                    className="w-1/2 rounded border border-slate-300 px-1.5 py-1 tabular-nums"
                  />
                  <input
                    type="number"
                    step={0.5}
                    value={b2}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setB2(v);
                    }}
                    className="w-1/2 rounded border border-slate-300 px-1.5 py-1 tabular-nums"
                  />
                </div>
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-slate-500">x(0) = [x₁; x₂]</span>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step={0.2}
                    value={x10}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setX10(v);
                    }}
                    className="w-1/2 rounded border border-slate-300 px-1.5 py-1 tabular-nums"
                  />
                  <input
                    type="number"
                    step={0.2}
                    value={x20}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setX20(v);
                    }}
                    className="w-1/2 rounded border border-slate-300 px-1.5 py-1 tabular-nums"
                  />
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="font-semibold text-slate-700">Reference Mode:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setRefStep(0)}
                  className={`cursor-pointer rounded px-2.5 py-1 ${
                    refStep === 0 ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Regulate → 0
                </button>
                <button
                  type="button"
                  onClick={() => setRefStep(1)}
                  className={`cursor-pointer rounded px-2.5 py-1 ${
                    refStep === 1 ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Step Track r=1
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Optimal Gain K, Riccati P, Eigenvalues & Recharts Simulation */}
        <div className="lg:col-span-8 space-y-5">
          {!lqr.feasible && lqr.errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <span>{lqr.errorMsg}</span>
            </div>
          )}

          {/* Optimal Gain & Riccati Matrix Readout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3.5">
              <div className="text-[11px] font-semibold text-sky-900">
                Optimal Gain K = R⁻¹BᵀP
              </div>
              <div className="mt-1 font-mono text-base font-bold tabular-nums text-sky-800">
                [{lqr.K[0].toFixed(3)}, {lqr.K[1].toFixed(3)}]
              </div>
              <div className="text-[10px] font-mono text-slate-600">
                u = −k₁x₁ − k₂x₂
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] text-slate-500">Closed-Loop Poles (A−BK)</div>
              <div className="mt-1 font-mono text-xs font-bold tabular-nums text-emerald-700">
                λ₁ = {formatComplex(lqr.closedLoopEigs[0].re, lqr.closedLoopEigs[0].im)}
              </div>
              <div className="font-mono text-xs font-bold tabular-nums text-emerald-700">
                λ₂ = {formatComplex(lqr.closedLoopEigs[1].re, lqr.closedLoopEigs[1].im)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] text-slate-500">Riccati Solution P</div>
              <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-slate-900">
                [{lqr.P[0][0].toFixed(2)}, {lqr.P[0][1].toFixed(2)}]
              </div>
              <div className="font-mono text-xs font-semibold tabular-nums text-slate-900">
                [{lqr.P[1][0].toFixed(2)}, {lqr.P[1][1].toFixed(2)}]
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] text-slate-500">Optimal Cost J* = x₀ᵀPx₀</div>
              <div className="mt-1 font-mono text-base font-bold tabular-nums text-slate-950">
                {lqr.optimalCostJ.toFixed(3)}
              </div>
              <div className="text-[10px] font-mono text-slate-500 tabular-nums">
                CARE Residual: {lqr.riccatiResidual.toExponential(1)}
              </div>
            </div>
          </div>

          {/* Chart 1: Optimal Closed-Loop State Trajectories */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-950">
                  LQR Closed-Loop State Trajectories x₁(t) &amp; x₂(t)
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Open-Loop eig(A): {formatComplex(lqr.openLoopEigs[0].re, lqr.openLoopEigs[0].im)},{' '}
                  {formatComplex(lqr.openLoopEigs[1].re, lqr.openLoopEigs[1].im)}
                  {refStep > 0 && lqr.nrFeedforward !== null
                    ? ` · Feedforward Nr = ${lqr.nrFeedforward.toFixed(2)}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${v}s`}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={44} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label) => `t = ${label} s`}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(3) : String(value ?? ''),
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <ReferenceLine y={refStep} stroke="#64748b" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="x1"
                    name="State x₁(t)"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="x2"
                    name="State x₂(t)"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Control Effort u(t) & Instantaneous Cost Integrand */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-950">
                Optimal Control Effort u(t) = −Kx(t) &amp; Cost Rate (xᵀQx + Ru²)
              </h3>
              <span className="font-mono text-[11px] text-slate-500">
                Higher R lowers peak |u(t)|; higher Q speeds convergence
              </span>
            </div>

            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 20, left: 0, bottom: 6 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${v}s`}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={44} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label) => `t = ${label} s`}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(3) : String(value ?? ''),
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <ReferenceLine y={0} stroke="#cbd5e1" />
                  <Line
                    type="monotone"
                    dataKey="u"
                    name="Optimal Control u(t)"
                    stroke="#d97706"
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="costRate"
                    name="Cost Rate xᵀQx + Ru²"
                    stroke="#7c3aed"
                    strokeWidth={1.8}
                    strokeDasharray="4 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
