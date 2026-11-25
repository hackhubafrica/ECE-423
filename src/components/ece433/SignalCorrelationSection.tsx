import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
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
  computeSignalCorrelationAnalysis,
  ReferenceWaveformType,
} from '../../utils/controlMath';

interface SignalCorrelationSectionProps {
  kp: number;
  ki: number;
  kd: number;
  plantK: number;
  tau1: number;
  tau2: number;
  uMax: number;
  antiWindup: 'none' | 'clamping' | 'back_calc';
  onUpdateParams: (next: {
    kp?: number;
    ki?: number;
    kd?: number;
  }) => void;
}

const WAVEFORM_OPTIONS: {
  id: ReferenceWaveformType;
  label: string;
  desc: string;
}[] = [
  { id: 'pulse_train', label: 'Pulse Train', desc: '4 s period square reference' },
  { id: 'multistep', label: 'Multi-Step', desc: 'Variable amplitude staircase' },
  { id: 'chirp', label: 'Sine Chirp', desc: '0.12–0.65 Hz swept sinusoid' },
  { id: 'delayed_step', label: 'Delayed Step', desc: 'Unit step at t = 1.20 s' },
];

export const SignalCorrelationSection: React.FC<SignalCorrelationSectionProps> = ({
  kp,
  ki,
  kd,
  plantK,
  tau1,
  tau2,
  uMax,
  antiWindup,
  onUpdateParams,
}) => {
  const [waveform, setWaveform] = useState<ReferenceWaveformType>('multistep');
  const [deadTimeSec, setDeadTimeSec] = useState<number>(0.16);
  const [noiseSigma, setNoiseSigma] = useState<number>(0.02);
  const [tEnd, setTEnd] = useState<number>(12);
  const [showAutocorr, setShowAutocorr] = useState<boolean>(true);
  const [showShiftedOutput, setShowShiftedOutput] = useState<boolean>(true);
  const [showErrorTrace, setShowErrorTrace] = useState<boolean>(false);

  const analysis = useMemo(() => {
    return computeSignalCorrelationAnalysis({
      plantK,
      tau1,
      tau2,
      kp,
      ki,
      kd,
      uMax,
      antiWindup,
      waveform,
      deadTimeSec,
      noiseSigma,
      tEnd,
      maxLagSec: 3.0,
    });
  }, [
    plantK,
    tau1,
    tau2,
    kp,
    ki,
    kd,
    uMax,
    antiWindup,
    waveform,
    deadTimeSec,
    noiseSigma,
    tEnd,
  ]);

  const diagnostic = useMemo(() => {
    const delayDiff = analysis.peakCorr - analysis.zeroLagCorr;
    const isDelayDominated =
      delayDiff > 0.06 && analysis.lagCompensatedRmse < analysis.rmse * 0.72;
    const isDistorted = analysis.peakCorr < 0.85;

    if (isDelayDominated) {
      return {
        tone: 'border-amber-200 bg-amber-50/70 text-amber-950',
        badge: 'Delay-Dominated Tracking Error',
        detail: `Peak cross-correlation reaches ${analysis.peakCorr.toFixed(3)} at τ* = ${
          analysis.peakLagSec >= 0 ? '+' : ''
        }${analysis.peakLagSec.toFixed(2)} s, dropping RMSE from ${analysis.rmse.toFixed(
          3
        )} to ${analysis.lagCompensatedRmse.toFixed(
          3
        )} after lag alignment. Phase lag / dead-time accounts for most of the error.`,
      };
    }

    if (isDistorted) {
      return {
        tone: 'border-red-200 bg-red-50/70 text-red-950',
        badge: 'Bandwidth / Waveform Distortion',
        detail: `Peak correlation ρ_max = ${analysis.peakCorr.toFixed(
          3
        )} remains below 0.85 even after compensating τ* = ${analysis.peakLagSec.toFixed(
          2
        )} s. Increase Kp/Kd bandwidth or reduce overshoot/noise to restore waveform fidelity.`,
      };
    }

    return {
      tone: 'border-emerald-200 bg-emerald-50/70 text-emerald-950',
      badge: 'Tight Closed-Loop Tracking',
      detail: `Zero-lag correlation R_ry(0) = ${analysis.zeroLagCorr.toFixed(
        3
      )} closely tracks peak ρ_max = ${analysis.peakCorr.toFixed(
        3
      )} (lag τ* = ${analysis.peakLagSec.toFixed(2)} s) with ${analysis.trackingScorePct.toFixed(
        1
      )}% overall tracking fidelity.`,
    };
  }, [analysis]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Control Console */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-950">
                Correlation &amp; Tracking Setup
              </h2>
              <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                R_ry(τ) = ⟨r₀(t) · y₀(t+τ)⟩ / (σ_r · σ_y)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setWaveform('multistep');
                setDeadTimeSec(0.16);
                setNoiseSigma(0.02);
                setTEnd(12);
                onUpdateParams({ kp: 3.2, ki: 2.1, kd: 0.85 });
              }}
              className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Reference Setpoint Waveform */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Reference Setpoint r(t)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {WAVEFORM_OPTIONS.map((opt) => {
                const active = waveform === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setWaveform(opt.id)}
                    className={`cursor-pointer rounded-lg border p-2 text-left transition-colors ${
                      active
                        ? 'border-sky-500 bg-sky-50/70 text-slate-950'
                        : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Channel / Plant Impairments */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="text-xs font-semibold text-slate-800">
              Delay &amp; Sensor Noise
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="corr-deadtime" className="font-semibold text-slate-900">
                  Transport Dead-Time (L)
                </label>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {deadTimeSec.toFixed(2)}
                  <span className="text-[10px] font-normal text-slate-500 ml-1">s</span>
                </span>
              </div>
              <input
                id="corr-deadtime"
                type="range"
                min={0}
                max={1.52}
                step={0.04}
                value={deadTimeSec}
                onChange={(e) => setDeadTimeSec(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="corr-noise" className="font-semibold text-slate-900">
                  Measurement Noise (σₙ)
                </label>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {noiseSigma.toFixed(2)}
                </span>
              </div>
              <input
                id="corr-noise"
                type="range"
                min={0}
                max={0.15}
                step={0.01}
                value={noiseSigma}
                onChange={(e) => setNoiseSigma(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs font-semibold text-slate-700">Horizon (T)</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                {[8, 12, 16].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setTEnd(sec)}
                    className={`cursor-pointer rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${
                      tEnd === sec
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Plot Overlay Toggles */}
          <div className="space-y-2 border-t border-slate-100 pt-4 text-xs">
            <div className="font-semibold text-slate-800">Plot Overlays</div>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={showAutocorr}
                onChange={(e) => setShowAutocorr(e.target.checked)}
                className="accent-sky-600 rounded"
              />
              <span>Setpoint autocorrelation R_rr(τ)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={showShiftedOutput}
                onChange={(e) => setShowShiftedOutput(e.target.checked)}
                className="accent-emerald-600 rounded"
              />
              <span>Lag-aligned output y(t + τ*)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={showErrorTrace}
                onChange={(e) => setShowErrorTrace(e.target.checked)}
                className="accent-amber-600 rounded"
              />
              <span>Tracking error e(t) = r(t) − y(t)</span>
            </label>
          </div>

          {/* Synchronized PID Gains */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">PID Gains (Synced)</span>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateParams({ kp: 5.5, ki: 3.4, kd: 1.4 })}
                  className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 hover:border-sky-400"
                >
                  Fast Track
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateParams({ kp: 2.0, ki: 0.9, kd: 1.25 })}
                  className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 hover:border-sky-400"
                >
                  Damped
                </button>
              </div>
            </div>

            {[
              { key: 'kp' as const, label: 'Kp', val: kp, min: 0.2, max: 12.0, step: 0.1 },
              { key: 'ki' as const, label: 'Ki', val: ki, min: 0.0, max: 8.0, step: 0.1 },
              { key: 'kd' as const, label: 'Kd', val: kd, min: 0.0, max: 4.0, step: 0.05 },
            ].map((item) => (
              <div key={item.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor={`corr-${item.key}`} className="font-mono font-semibold text-slate-800">
                    {item.label}
                  </label>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {item.val.toFixed(2)}
                  </span>
                </div>
                <input
                  id={`corr-${item.key}`}
                  type="range"
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  value={Math.min(item.max, Math.max(item.min, item.val))}
                  onChange={(e) => onUpdateParams({ [item.key]: parseFloat(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right Telemetry & Correlation Stage */}
        <div className="lg:col-span-8 space-y-5">
          {/* 4-Column Precision Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] font-medium text-slate-500">
                Peak Correlation (ρ_max)
              </div>
              <div
                className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                  analysis.peakCorr >= 0.9
                    ? 'text-emerald-700'
                    : analysis.peakCorr >= 0.75
                    ? 'text-sky-700'
                    : 'text-red-700'
                }`}
              >
                {analysis.peakCorr.toFixed(3)}
              </div>
              <div className="mt-0.5 text-[11px] font-mono text-slate-500 tabular-nums">
                Peak lag τ* = {analysis.peakLagSec >= 0 ? '+' : ''}
                {analysis.peakLagSec.toFixed(2)} s
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] font-medium text-slate-500">
                Zero-Lag R_ry(0)
              </div>
              <div
                className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                  analysis.zeroLagCorr >= 0.85
                    ? 'text-slate-950'
                    : analysis.zeroLagCorr >= 0.65
                    ? 'text-amber-700'
                    : 'text-red-700'
                }`}
              >
                {analysis.zeroLagCorr.toFixed(3)}
              </div>
              <div className="mt-0.5 text-[11px] font-mono text-slate-500 tabular-nums">
                Δρ = {(analysis.peakCorr - analysis.zeroLagCorr).toFixed(3)} lag penalty
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] font-medium text-slate-500">
                Tracking RMSE
              </div>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-950">
                {analysis.rmse.toFixed(3)}
              </div>
              <div className="mt-0.5 text-[11px] font-mono text-slate-500 tabular-nums">
                Aligned RMSE = {analysis.lagCompensatedRmse.toFixed(3)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] font-medium text-slate-500">
                Integral Error &amp; Score
              </div>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums text-sky-700">
                {analysis.trackingScorePct.toFixed(1)}
                <span className="text-xs font-normal text-slate-500 ml-0.5">%</span>
              </div>
              <div className="mt-0.5 text-[11px] font-mono text-slate-500 tabular-nums">
                IAE = {analysis.iae.toFixed(2)} · ITAE = {analysis.itae.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Diagnostic Readout */}
          <div className={`rounded-xl border px-4 py-3 text-xs ${diagnostic.tone}`}>
            <div className="font-semibold">{diagnostic.badge}</div>
            <div className="mt-0.5 leading-relaxed opacity-90">{diagnostic.detail}</div>
          </div>

          {/* Chart 1: Time-Domain Setpoint vs Plant Output */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-base font-semibold text-slate-950">
                  Setpoint r(t) vs Closed-Loop Output y(t)
                </h3>
                <p className="font-mono text-xs text-slate-500 tabular-nums">
                  Plant K={plantK.toFixed(1)} · τ₁={tau1.toFixed(1)}s · τ₂={tau2.toFixed(1)}s · L={deadTimeSec.toFixed(2)}s · σₙ={noiseSigma.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analysis.timeSeries}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${Number(v).toFixed(1)}s`}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={44} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label) => `t = ${Number(label).toFixed(2)} s`}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(3) : String(value ?? ''),
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <ReferenceLine y={0} stroke="#cbd5e1" />
                  <Line
                    type="stepAfter"
                    dataKey="r"
                    name="Setpoint r(t)"
                    stroke="#475569"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="y"
                    name="Plant Output y(t)"
                    stroke="#0284c7"
                    strokeWidth={2.4}
                    dot={false}
                    isAnimationActive={false}
                  />
                  {showShiftedOutput && (
                    <Line
                      type="monotone"
                      dataKey="yShifted"
                      name={`Lag-Aligned y(t ${analysis.peakLagSec >= 0 ? '+' : ''}${analysis.peakLagSec.toFixed(2)}s)`}
                      stroke="#059669"
                      strokeWidth={1.8}
                      strokeDasharray="3 3"
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                  {showErrorTrace && (
                    <Line
                      type="monotone"
                      dataKey="err"
                      name="Error e(t)"
                      stroke="#d97706"
                      strokeWidth={1.6}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Normalized Cross-Correlation R_ry(tau) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Normalized Cross-Correlation R_ry(τ) vs Lag τ
                </h3>
                <p className="text-xs text-slate-500">
                  Positive peak lag τ* &gt; 0 indicates y(t) lags behind setpoint r(t) by τ* seconds
                </p>
              </div>
              <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                τ ∈ [−3.0 s, +3.0 s]
              </span>
            </div>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analysis.corrCurve}
                  margin={{ top: 10, right: 18, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="lagSec"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${Number(v).toFixed(1)}s`}
                  />
                  <YAxis
                    domain={[-1, 1]}
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
                    labelFormatter={(label) => `Lag τ = ${Number(label).toFixed(2)} s`}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(4) : String(value ?? ''),
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                  <ReferenceLine
                    x={0}
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    label={{
                      value: 'τ = 0',
                      position: 'insideTopLeft',
                      fontSize: 10,
                      fill: '#64748b',
                    }}
                  />
                  <ReferenceLine
                    x={analysis.peakLagSec}
                    stroke="#059669"
                    strokeWidth={1.6}
                    strokeDasharray="4 2"
                    label={{
                      value: `τ*=${analysis.peakLagSec.toFixed(2)}s`,
                      position: 'insideTopRight',
                      fontSize: 10,
                      fill: '#059669',
                    }}
                  />
                  {showAutocorr && (
                    <Line
                      type="monotone"
                      dataKey="rxx"
                      name="Setpoint Autocorrelation R_rr(τ)"
                      stroke="#94a3b8"
                      strokeWidth={1.8}
                      strokeDasharray="5 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="rxy"
                    name="Cross-Correlation R_ry(τ)"
                    stroke="#0284c7"
                    strokeWidth={2.5}
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
