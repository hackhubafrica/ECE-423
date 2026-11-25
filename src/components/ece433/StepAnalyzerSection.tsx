import React, { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
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
import {
  analyzeSecondOrderPrototype,
  simulatePidLoop,
} from '../../utils/controlMath';

interface StepAnalyzerSectionProps {
  kp: number;
  ki: number;
  kd: number;
  plantK: number;
  tau1: number;
  tau2: number;
  uMax: number;
  antiWindup: 'none' | 'clamping' | 'back_calc';
  onUpdatePid: (gains: { kp: number; ki: number; kd: number }) => void;
}

export const StepAnalyzerSection: React.FC<StepAnalyzerSectionProps> = ({
  kp,
  ki,
  kd,
  plantK,
  tau1,
  tau2,
  uMax,
  antiWindup,
  onUpdatePid,
}) => {
  const [wn, setWn] = useState<number>(2.5);
  const [zeta, setZeta] = useState<number>(0.55);
  const [tEnd, setTEnd] = useState<number>(8);
  const [showEnvelope, setShowEnvelope] = useState<boolean>(true);
  const [showPidOverlay, setShowPidOverlay] = useState<boolean>(true);

  const proto = useMemo(() => {
    return analyzeSecondOrderPrototype({
      wn,
      zeta,
      dcGain: 1.0,
      tEnd,
      dt: 0.04,
    });
  }, [wn, zeta, tEnd]);

  const pidSim = useMemo(() => {
    return simulatePidLoop({
      plantK,
      tau1,
      tau2,
      kp,
      ki,
      kd,
      uMax,
      antiWindup,
      tEnd,
      dt: 0.04,
    });
  }, [plantK, tau1, tau2, kp, ki, kd, uMax, antiWindup, tEnd]);

  // Compute PID peak time too
  const pidPeakTime = useMemo(() => {
    let maxVal = -Infinity;
    let peakT: number | null = null;
    for (let i = 0; i < pidSim.outputs.length; i++) {
      if (pidSim.outputs[i] > maxVal) {
        maxVal = pidSim.outputs[i];
        peakT = pidSim.times[i];
      }
    }
    return maxVal > 1.002 ? peakT : null;
  }, [pidSim]);

  const chartData = useMemo(() => {
    return proto.times.map((t, i) => ({
      t: Number(t.toFixed(2)),
      yProto: Number(proto.yProto[i].toFixed(4)),
      envUpper: Number(proto.envUpper[i].toFixed(4)),
      envLower: Number(proto.envLower[i].toFixed(4)),
      yPid: Number((pidSim.outputs[i] ?? 0).toFixed(4)),
    }));
  }, [proto, pidSim]);

  // Prototype pole-placement PID synthesizer for G(s) = plantK / ((tau1*s+1)(tau2*s+1))
  // Matches closed-loop char poly to (s^2 + 2*zeta*wn*s + wn^2)(s + 4*zeta*wn)
  const handleAutoTunePidToSpec = () => {
    const a2 = Math.max(0.02, tau1 * tau2);
    const a1 = tau1 + tau2;
    const alphaPole = Math.max(0.8, 4 * zeta * wn);
    const c2 = 2 * zeta * wn + alphaPole;
    const c1 = wn * wn + 2 * zeta * wn * alphaPole;
    const c0 = wn * wn * alphaPole;

    const nextKd = Math.max(0, Number(((a2 * c2 - a1) / plantK).toFixed(2)));
    const nextKp = Math.max(0.1, Number(((a2 * c1 - 1) / plantK).toFixed(2)));
    const nextKi = Math.max(0, Number(((a2 * c0) / plantK).toFixed(2)));
    onUpdatePid({ kp: nextKp, ki: nextKi, kd: nextKd });
  };

  const peakBoundY = 1 + proto.overshootPct / 100;
  const osPass = pidSim.overshootPct <= proto.overshootPct + 2.0;
  const tsPass =
    Number.isFinite(proto.settlingFormula4Tau)
      ? pidSim.settlingTime <= proto.settlingFormula4Tau + 0.3
      : true;
  const trPass = pidSim.riseTime <= proto.riseTime1090 + 0.15;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls: 2nd-Order Spec & PID Comparison Controls */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-950">
              Second-Order Theoretical Target
            </h2>
            <p className="font-mono text-xs text-sky-700 mt-0.5">
              T(s) = ωₙ² / (s² + 2ζωₙs + ωₙ²)
            </p>
          </div>

          {/* Standard Damping Regimes */}
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {[
              { label: 'ζ=0.35', z: 0.35, w: 3.0 },
              { label: 'ζ=0.55', z: 0.55, w: 2.5 },
              { label: 'ζ=0.71', z: 0.707, w: 2.5 },
              { label: 'ζ=1.0', z: 1.0, w: 2.5 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setZeta(p.z);
                  setWn(p.w);
                }}
                className="cursor-pointer rounded border border-slate-200 bg-slate-50 py-1.5 font-mono text-[11px] font-semibold text-slate-800 hover:border-sky-400"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Natural Frequency wn */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <label htmlFor="sa-wn" className="font-semibold text-slate-800">
                Natural Frequency (ωₙ)
              </label>
              <span className="font-mono font-semibold text-sky-700 tabular-nums">
                {wn.toFixed(2)} rad/s
              </span>
            </div>
            <input
              id="sa-wn"
              type="range"
              min={0.5}
              max={8}
              step={0.1}
              value={wn}
              onChange={(e) => setWn(parseFloat(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          {/* Damping Ratio zeta */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <label htmlFor="sa-zeta" className="font-semibold text-slate-800">
                Damping Ratio (ζ)
              </label>
              <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                {zeta.toFixed(3)} ({proto.regime})
              </span>
            </div>
            <input
              id="sa-zeta"
              type="range"
              min={0}
              max={1.8}
              step={0.01}
              value={zeta}
              onChange={(e) => setZeta(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          {/* Live PID Overlay Gains */}
          <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-950">PID Overlay Gains</span>
              <button
                type="button"
                onClick={handleAutoTunePidToSpec}
                className="cursor-pointer inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
              >
                <Sparkles className="h-3 w-3" />
                <span>Match Spec Poles</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-700 font-semibold">Kp</span>
                  <span className="font-mono font-semibold text-sky-700 tabular-nums">
                    {kp.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={0.1}
                  value={Math.min(15, kp)}
                  onChange={(e) =>
                    onUpdatePid({ kp: parseFloat(e.target.value), ki, kd })
                  }
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-700 font-semibold">Ki</span>
                  <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                    {ki.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.1}
                  value={Math.min(10, ki)}
                  onChange={(e) =>
                    onUpdatePid({ kp, ki: parseFloat(e.target.value), kd })
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-700 font-semibold">Kd</span>
                  <span className="font-mono font-semibold text-amber-700 tabular-nums">
                    {kd.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.05}
                  value={Math.min(5, kd)}
                  onChange={(e) =>
                    onUpdatePid({ kp, ki, kd: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEnvelope}
                  onChange={(e) => setShowEnvelope(e.target.checked)}
                  className="rounded accent-sky-600"
                />
                <span>Show 2nd-order exponential decay envelope</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPidOverlay}
                  onChange={(e) => setShowPidOverlay(e.target.checked)}
                  className="rounded accent-sky-600"
                />
                <span>Overlay live PID controller response</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-mono">Time Window:</span>
              <select
                value={tEnd}
                onChange={(e) => setTEnd(parseInt(e.target.value, 10))}
                className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs"
              >
                <option value={5}>5 s</option>
                <option value={8}>8 s</option>
                <option value={12}>12 s</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Comparison Scorecard & Recharts Plot */}
        <div className="lg:col-span-8 space-y-5">
          {/* Theoretical vs PID Performance Scorecard */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-950">
                  Second-Order Theoretical Bounds vs. PID Controller
                </h3>
                <p className="font-mono text-[11px] text-slate-500">
                  Poles s = {proto.poles[0].re.toFixed(2)} ± j{Math.abs(proto.poles[0].im).toFixed(2)} · τ ={' '}
                  {Number.isFinite(proto.timeConstantTau)
                    ? `${proto.timeConstantTau.toFixed(2)} s`
                    : '∞'}
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                {osPass && tsPass && trPass ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-700">PID Meets Theoretical Spec Bounds</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-700">PID Exceeds Target Bound (Tune Kd or Kp)</span>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Max Overshoot (%OS)</div>
                <div className="mt-1 font-mono text-base font-bold tabular-nums text-emerald-700">
                  Bound: {proto.overshootPct.toFixed(1)}%
                </div>
                <div
                  className={`mt-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                    osPass ? 'text-sky-700' : 'text-red-600'
                  }`}
                >
                  PID: {pidSim.overshootPct.toFixed(1)}%
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Settling Time (±2%)</div>
                <div className="mt-1 font-mono text-base font-bold tabular-nums text-emerald-700">
                  4/ζωₙ:{' '}
                  {Number.isFinite(proto.settlingFormula4Tau)
                    ? `${proto.settlingFormula4Tau.toFixed(2)}s`
                    : '∞'}
                </div>
                <div
                  className={`mt-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                    tsPass ? 'text-sky-700' : 'text-red-600'
                  }`}
                >
                  PID: {pidSim.settlingTime.toFixed(2)}s
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Rise Time (10%→90%)</div>
                <div className="mt-1 font-mono text-base font-bold tabular-nums text-emerald-700">
                  Target: {proto.riseTime1090.toFixed(2)}s
                </div>
                <div
                  className={`mt-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                    trPass ? 'text-sky-700' : 'text-amber-700'
                  }`}
                >
                  PID: {pidSim.riseTime.toFixed(2)}s
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Peak Time (tp = π/ωd)</div>
                <div className="mt-1 font-mono text-base font-bold tabular-nums text-emerald-700">
                  {proto.peakTime !== null ? `${proto.peakTime.toFixed(2)}s` : 'No Peak'}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-slate-600 tabular-nums">
                  PID: {pidPeakTime !== null ? `${pidPeakTime.toFixed(2)}s` : 'No Peak'}
                </div>
              </div>
            </div>
          </div>

          {/* Recharts Overlay Graph */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-950">
                  Step Response &amp; Theoretical Performance Bounds Overlay
                </h3>
                <p className="text-xs text-slate-500">
                  Green: Prototype 2nd-order · Blue: Live PID loop · Dashed amber: Peak OS bound ({peakBoundY.toFixed(2)}) &amp; ±2% settling rails
                </p>
              </div>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 12, right: 20, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${v}s`}
                  />
                  <YAxis
                    domain={[0, 'auto']}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={44}
                  />
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

                  {/* Settling ±2% Band & Overshoot Ceiling */}
                  <ReferenceLine y={1.0} stroke="#64748b" strokeDasharray="4 4" />
                  <ReferenceLine y={1.02} stroke="#cbd5e1" strokeDasharray="2 3" />
                  <ReferenceLine y={0.98} stroke="#cbd5e1" strokeDasharray="2 3" />
                  {proto.overshootPct > 0.1 && (
                    <ReferenceLine
                      y={peakBoundY}
                      stroke="#d97706"
                      strokeDasharray="5 4"
                      label={{
                        value: `Max OS ${(proto.overshootPct).toFixed(1)}%`,
                        position: 'insideTopRight',
                        fontSize: 10,
                        fill: '#b45309',
                      }}
                    />
                  )}

                  {showEnvelope && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="envUpper"
                        name="Upper Envelope 1 + e^(−ζωₙt)/√(1−ζ²)"
                        stroke="#94a3b8"
                        strokeWidth={1.3}
                        strokeDasharray="3 3"
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="envLower"
                        name="Lower Envelope"
                        stroke="#94a3b8"
                        strokeWidth={1.3}
                        strokeDasharray="3 3"
                        dot={false}
                        isAnimationActive={false}
                      />
                    </>
                  )}

                  <Line
                    type="monotone"
                    dataKey="yProto"
                    name="2nd-Order Theoretical"
                    stroke="#059669"
                    strokeWidth={2.4}
                    dot={false}
                    isAnimationActive={false}
                  />

                  {showPidOverlay && (
                    <Line
                      type="monotone"
                      dataKey="yPid"
                      name="PID Controller Output"
                      stroke="#0284c7"
                      strokeWidth={2.6}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
