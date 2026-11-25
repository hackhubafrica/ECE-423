import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  Bar,
  BarChart,
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
  computePidSensitivityAnalysis,
  SensitivityParamKey,
} from '../../utils/controlMath';

interface SensitivityAnalysisSectionProps {
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
    plantK?: number;
    tau1?: number;
  }) => void;
}

const PARAM_META: Record<
  SensitivityParamKey,
  {
    short: string;
    label: string;
    unit: string;
    defaultMin: number;
    defaultMax: number;
    sliderMin: number;
    sliderMax: number;
    step: number;
  }
> = {
  kp: {
    short: 'Kp',
    label: 'Proportional Gain Kp',
    unit: '',
    defaultMin: 0.4,
    defaultMax: 10.0,
    sliderMin: 0.1,
    sliderMax: 15.0,
    step: 0.1,
  },
  ki: {
    short: 'Ki',
    label: 'Integral Gain Ki',
    unit: 's⁻¹',
    defaultMin: 0.0,
    defaultMax: 6.0,
    sliderMin: 0.0,
    sliderMax: 10.0,
    step: 0.1,
  },
  kd: {
    short: 'Kd',
    label: 'Derivative Gain Kd',
    unit: 's',
    defaultMin: 0.0,
    defaultMax: 3.0,
    sliderMin: 0.0,
    sliderMax: 5.0,
    step: 0.05,
  },
  plantK: {
    short: 'Plant K',
    label: 'Plant DC Gain K',
    unit: '',
    defaultMin: 0.3,
    defaultMax: 3.0,
    sliderMin: 0.2,
    sliderMax: 5.0,
    step: 0.1,
  },
  tau1: {
    short: 'τ₁',
    label: 'Plant Lag τ₁',
    unit: 's',
    defaultMin: 0.2,
    defaultMax: 3.0,
    sliderMin: 0.1,
    sliderMax: 5.0,
    step: 0.1,
  },
};

function getRegimeLabel(zeta: number, isStable: boolean): string {
  if (!isStable) return 'Unstable (RHP)';
  if (zeta < 0.995) return 'Underdamped';
  if (zeta <= 1.02) return 'Critically Damped';
  return 'Overdamped';
}

export const SensitivityAnalysisSection: React.FC<SensitivityAnalysisSectionProps> = ({
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
  const [sweepParam, setSweepParam] = useState<SensitivityParamKey>('kp');
  const [sweepMin, setSweepMin] = useState<number>(PARAM_META.kp.defaultMin);
  const [sweepMax, setSweepMax] = useState<number>(PARAM_META.kp.defaultMax);
  const [primaryView, setPrimaryView] = useState<'modal' | 'transient'>('modal');

  const currentValues: Record<SensitivityParamKey, number> = {
    kp,
    ki,
    kd,
    plantK,
    tau1,
  };

  const nominalTheta = currentValues[sweepParam];
  const meta = PARAM_META[sweepParam];

  const handleSelectSweepParam = (key: SensitivityParamKey) => {
    setSweepParam(key);
    const val = currentValues[key];
    const spanLo = key === 'plantK' || key === 'tau1' ? 0.2 : 0.0;
    if (val > 0.2) {
      setSweepMin(Number(Math.max(spanLo, val * 0.25).toFixed(2)));
      setSweepMax(Number(Math.max(val * 2.2, PARAM_META[key].defaultMax).toFixed(2)));
    } else {
      setSweepMin(PARAM_META[key].defaultMin);
      setSweepMax(PARAM_META[key].defaultMax);
    }
  };

  const applyRangePreset = (mode: 'pm50' | 'wide') => {
    const floor = sweepParam === 'plantK' || sweepParam === 'tau1' ? 0.1 : 0.0;
    if (mode === 'pm50') {
      const base = Math.max(0.4, nominalTheta);
      setSweepMin(Number(Math.max(floor, base * 0.5).toFixed(2)));
      setSweepMax(Number((base * 1.5).toFixed(2)));
    } else {
      setSweepMin(PARAM_META[sweepParam].defaultMin);
      setSweepMax(
        Number(Math.max(PARAM_META[sweepParam].defaultMax, nominalTheta * 2.0).toFixed(2))
      );
    }
  };

  const analysis = useMemo(() => {
    return computePidSensitivityAnalysis({
      nominal: {
        plantK,
        tau1,
        tau2,
        kp,
        ki,
        kd,
        uMax,
        antiWindup,
        tEnd: 8.0,
        dt: 0.05,
      },
      sweepParam,
      minVal: sweepMin,
      maxVal: sweepMax,
      steps: 36,
    });
  }, [plantK, tau1, tau2, kp, ki, kd, uMax, antiWindup, sweepParam, sweepMin, sweepMax]);

  const sweepChartData = useMemo(() => {
    return analysis.sweepPoints.map((pt) => ({
      theta: Number(pt.paramValue.toFixed(3)),
      zeta: Number(Math.max(-1.5, Math.min(3.5, pt.zeta)).toFixed(4)),
      wn: Number(pt.wn.toFixed(3)),
      overshootPct: Number(pt.overshootPct.toFixed(2)),
      settlingTime: Number(pt.settlingTime.toFixed(3)),
      sZeta: Number(Math.max(-5, Math.min(5, pt.sZeta)).toFixed(4)),
      sWn: Number(Math.max(-5, Math.min(5, pt.sWn)).toFixed(4)),
    }));
  }, [analysis.sweepPoints]);

  const nearestNominalX = useMemo(() => {
    if (sweepChartData.length === 0) return nominalTheta;
    let best = sweepChartData[0].theta;
    let minDiff = Math.abs(best - nominalTheta);
    for (const pt of sweepChartData) {
      const d = Math.abs(pt.theta - nominalTheta);
      if (d < minDiff) {
        minDiff = d;
        best = pt.theta;
      }
    }
    return best;
  }, [sweepChartData, nominalTheta]);

  const activeJacobianRow =
    analysis.jacobian.find((r) => r.param === sweepParam) ?? analysis.jacobian[0];

  const barChartData = useMemo(() => {
    return analysis.jacobian.map((row) => ({
      name: PARAM_META[row.param].short,
      sZeta: Number(Math.max(-3, Math.min(3, row.sZeta)).toFixed(3)),
      sWn: Number(Math.max(-3, Math.min(3, row.sWn)).toFixed(3)),
    }));
  }, [analysis.jacobian]);

  const stableSweepPct = useMemo(() => {
    const count = analysis.sweepPoints.filter((p) => p.isStable).length;
    return Math.round((count / Math.max(1, analysis.sweepPoints.length)) * 100);
  }, [analysis.sweepPoints]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Control & Sweep Console */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-950">
                Parameter Sweep &amp; Nominal Point
              </h2>
              <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                S_θ^M = (θ / M) · (∂M / ∂θ)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdateParams({
                  kp: 3.2,
                  ki: 2.1,
                  kd: 0.85,
                  plantK: 1.0,
                  tau1: 1.0,
                });
                handleSelectSweepParam('kp');
              }}
              className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Parameter Selector */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Swept Parameter (θ)
            </div>
            <div className="grid grid-cols-5 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              {(Object.keys(PARAM_META) as SensitivityParamKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectSweepParam(key)}
                  className={`cursor-pointer rounded-md py-1.5 font-mono text-xs font-semibold transition-colors whitespace-nowrap ${
                    sweepParam === key
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {PARAM_META[key].short}
                </button>
              ))}
            </div>
          </div>

          {/* Sweep Bounds */}
          <div className="space-y-2.5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">
                Sweep Window for {meta.short}
              </span>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyRangePreset('pm50')}
                  className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 hover:border-sky-400"
                >
                  ±50%
                </button>
                <button
                  type="button"
                  onClick={() => applyRangePreset('wide')}
                  className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 hover:border-sky-400"
                >
                  Wide
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <label className="space-y-1">
                <span className="block text-[11px] font-mono text-slate-500">
                  Min {meta.short}
                </span>
                <input
                  type="number"
                  step={meta.step}
                  min={sweepParam === 'plantK' || sweepParam === 'tau1' ? 0.05 : 0}
                  max={25}
                  value={sweepMin}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    const floor = sweepParam === 'plantK' || sweepParam === 'tau1' ? 0.05 : 0;
                    if (Number.isFinite(v)) setSweepMin(Math.max(floor, v));
                  }}
                  className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-[11px] font-mono text-slate-500">
                  Max {meta.short}
                </span>
                <input
                  type="number"
                  step={meta.step}
                  min={0.2}
                  max={30}
                  value={sweepMax}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setSweepMax(Math.max(0.2, Math.min(30, v)));
                  }}
                  className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs tabular-nums"
                />
              </label>
            </div>
          </div>

          {/* Synchronized Nominal Gains & Plant Parameters */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">
                Nominal Operating Point
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Synced with PID Sim
              </span>
            </div>

            {(Object.keys(PARAM_META) as SensitivityParamKey[]).map((key) => {
              const pMeta = PARAM_META[key];
              const val = currentValues[key];
              const isActive = key === sweepParam;
              return (
                <div
                  key={key}
                  className={`rounded-lg border p-2.5 space-y-1.5 ${
                    isActive
                      ? 'border-sky-300 bg-sky-50/40'
                      : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor={`sens-${key}`}
                      className="font-semibold text-slate-900"
                    >
                      {pMeta.label}
                    </label>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {val.toFixed(2)}
                      {pMeta.unit ? (
                        <span className="text-[10px] font-normal text-slate-500 ml-1">
                          {pMeta.unit}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <input
                    id={`sens-${key}`}
                    type="range"
                    min={pMeta.sliderMin}
                    max={pMeta.sliderMax}
                    step={pMeta.step}
                    value={Math.min(pMeta.sliderMax, Math.max(pMeta.sliderMin, val))}
                    onChange={(e) =>
                      onUpdateParams({ [key]: parseFloat(e.target.value) })
                    }
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Telemetry & Sensitivity Curves Stage */}
        <div className="lg:col-span-8 space-y-5">
          {/* 4-Column Precision KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] font-medium text-slate-500">
                Nominal Damping Ratio (ζ₀)
              </div>
              <div
                className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                  !analysis.nominalMetrics.isStable
                    ? 'text-red-700'
                    : analysis.nominalMetrics.zeta < 0.45
                    ? 'text-amber-700'
                    : 'text-slate-950'
                }`}
              >
                {analysis.nominalMetrics.zeta.toFixed(3)}
              </div>
              <div className="mt-0.5 text-[11px] font-mono text-slate-500">
                {getRegimeLabel(
                  analysis.nominalMetrics.zeta,
                  analysis.nominalMetrics.isStable
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] font-medium text-slate-500">
                Natural Frequency (ωₙ₀)
              </div>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-950">
                {analysis.nominalMetrics.wn.toFixed(2)}
                <span className="text-xs font-normal text-slate-500 ml-1">rad/s</span>
              </div>
              <div className="mt-0.5 text-[11px] font-mono text-slate-500 tabular-nums">
                %OS = {analysis.nominalMetrics.overshootPct.toFixed(1)}% · Ts ={' '}
                {analysis.nominalMetrics.settlingTime.toFixed(2)}s
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] font-medium text-slate-500">
                Damping Sensitivity (S_{meta.short}^ζ)
              </div>
              <div
                className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                  Math.abs(activeJacobianRow.sZeta) > 0.8
                    ? 'text-amber-700'
                    : 'text-sky-700'
                }`}
              >
                {activeJacobianRow.sZeta >= 0 ? '+' : ''}
                {activeJacobianRow.sZeta.toFixed(3)}
              </div>
              <div className="mt-0.5 text-[11px] font-mono text-slate-500 tabular-nums">
                ∂ζ/∂{meta.short} = {activeJacobianRow.dZetaDTheta >= 0 ? '+' : ''}
                {activeJacobianRow.dZetaDTheta.toFixed(3)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] font-medium text-slate-500">
                Freq Sensitivity (S_{meta.short}^ωₙ)
              </div>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-700">
                {activeJacobianRow.sWn >= 0 ? '+' : ''}
                {activeJacobianRow.sWn.toFixed(3)}
              </div>
              <div className="mt-0.5 text-[11px] font-mono text-slate-500 tabular-nums">
                {analysis.criticalStabilityValue !== null
                  ? `Stability limit ≈ ${analysis.criticalStabilityValue.toFixed(2)}`
                  : `Sweep stable: ${stableSweepPct}%`}
              </div>
            </div>
          </div>

          {/* Chart 1: Performance Metrics vs Swept Parameter */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">
                  {primaryView === 'modal'
                    ? `Damping Ratio (ζ) & Natural Frequency (ωₙ) vs ${meta.label}`
                    : `Step Overshoot (%OS) & Settling Time (Ts) vs ${meta.label}`}
                </h3>
                <p className="font-mono text-xs text-slate-500 tabular-nums">
                  Vertical marker: Current {meta.short} = {nominalTheta.toFixed(2)} · Plant τ₁={tau1.toFixed(1)}s, τ₂={tau2.toFixed(1)}s
                </p>
              </div>

              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setPrimaryView('modal')}
                  className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                    primaryView === 'modal'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  ζ &amp; ωₙ Curves
                </button>
                <button
                  type="button"
                  onClick={() => setPrimaryView('transient')}
                  className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                    primaryView === 'transient'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  %OS &amp; Ts Curves
                </button>
              </div>
            </div>

            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {primaryView === 'modal' ? (
                  <LineChart
                    data={sweepChartData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="theta"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v) => Number(v).toFixed(2)}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: '#0284c7' }}
                      width={44}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#059669' }}
                      tickFormatter={(v) => `${Number(v).toFixed(1)}`}
                      width={46}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#cbd5e1',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelFormatter={(label) => `${meta.short} = ${Number(label).toFixed(3)}`}
                      formatter={(value, name) => [
                        typeof value === 'number' ? value.toFixed(3) : String(value ?? ''),
                        String(name),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <ReferenceLine
                      yAxisId="left"
                      y={0}
                      stroke="#dc2626"
                      strokeDasharray="4 4"
                    />
                    <ReferenceLine
                      yAxisId="left"
                      x={nearestNominalX}
                      stroke="#0f172a"
                      strokeDasharray="4 3"
                      label={{
                        value: `${meta.short}=${nominalTheta.toFixed(2)}`,
                        position: 'insideTopRight',
                        fontSize: 10,
                        fill: '#0f172a',
                      }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="zeta"
                      name="Damping Ratio ζ"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="wn"
                      name="Natural Freq ωₙ (rad/s)"
                      stroke="#059669"
                      strokeWidth={2.2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                ) : (
                  <LineChart
                    data={sweepChartData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="theta"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v) => Number(v).toFixed(2)}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: '#d97706' }}
                      tickFormatter={(v) => `${v}%`}
                      width={46}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#7c3aed' }}
                      tickFormatter={(v) => `${Number(v).toFixed(1)}s`}
                      width={46}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#cbd5e1',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelFormatter={(label) => `${meta.short} = ${Number(label).toFixed(3)}`}
                      formatter={(value, name) => [
                        typeof value === 'number' ? value.toFixed(2) : String(value ?? ''),
                        String(name),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <ReferenceLine
                      yAxisId="left"
                      x={nearestNominalX}
                      stroke="#0f172a"
                      strokeDasharray="4 3"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="overshootPct"
                      name="Step Overshoot (%OS)"
                      stroke="#d97706"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="settlingTime"
                      name="Settling Time Ts (s)"
                      stroke="#7c3aed"
                      strokeWidth={2.2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Real-Time Normalized Sensitivity Curves S_theta^zeta and S_theta^wn */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Normalized Logarithmic Sensitivity Curves: S_{meta.short}^ζ &amp; S_{meta.short}^ωₙ
                </h3>
                <p className="text-xs text-slate-500">
                  Dimensionless elasticity (% change in metric per 1% change in {meta.short}) across the parameter sweep
                </p>
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                |S| &gt; 1 → High Parametric Sensitivity
              </span>
            </div>

            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={sweepChartData}
                  margin={{ top: 8, right: 20, left: 0, bottom: 6 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="theta"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => Number(v).toFixed(2)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={44} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label) => `${meta.short} = ${Number(label).toFixed(3)}`}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(3) : String(value ?? ''),
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
                  <ReferenceLine
                    x={nearestNominalX}
                    stroke="#0f172a"
                    strokeDasharray="4 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="sZeta"
                    name={`S_${meta.short}^ζ (Damping Elasticity)`}
                    stroke="#0284c7"
                    strokeWidth={2.3}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sWn"
                    name={`S_${meta.short}^ωₙ (Frequency Elasticity)`}
                    stroke="#059669"
                    strokeWidth={2.1}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Analytical Row: Multi-Parameter Sensitivity Comparison + Jacobian Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-bold text-slate-950">
              Cross-Parameter Elasticity Comparison
            </h3>
            <p className="text-xs text-slate-500">
              Normalized sensitivity at current operating point (Kp={kp.toFixed(2)}, Ki={ki.toFixed(2)}, Kd={kd.toFixed(2)})
            </p>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{ top: 10, right: 12, left: -8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={44} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toFixed(3) : String(value ?? ''),
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <ReferenceLine y={0} stroke="#64748b" />
                <Bar dataKey="sZeta" name="S_θ^ζ" fill="#0284c7" radius={[3, 3, 0, 0]} />
                <Bar dataKey="sWn" name="S_θ^ωₙ" fill="#059669" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-950">
                Local Parametric Sensitivity Jacobian
              </h3>
              <p className="text-xs text-slate-500">
                Click any row to sweep that parameter in the live curves above
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-white text-[11px] tracking-wide text-slate-500">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Parameter θ</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Nominal</th>
                  <th className="py-2.5 px-3 font-semibold text-right">∂ζ/∂θ</th>
                  <th className="py-2.5 px-3 font-semibold text-right">S_θ^ζ</th>
                  <th className="py-2.5 px-3 font-semibold text-right">∂ωₙ/∂θ</th>
                  <th className="py-2.5 px-3 font-semibold text-right">S_θ^ωₙ</th>
                  <th className="py-2.5 px-4 font-semibold text-right">∂(%OS)/∂θ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {analysis.jacobian.map((row) => {
                  const selected = row.param === sweepParam;
                  return (
                    <tr
                      key={row.param}
                      onClick={() => handleSelectSweepParam(row.param)}
                      className={`cursor-pointer transition-colors ${
                        selected ? 'bg-sky-50/70' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                        {row.label}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {row.nominal.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {row.dZetaDTheta >= 0 ? '+' : ''}
                        {row.dZetaDTheta.toFixed(3)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          row.sZeta >= 0 ? 'text-sky-700' : 'text-amber-700'
                        }`}
                      >
                        {row.sZeta >= 0 ? '+' : ''}
                        {row.sZeta.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {row.dWnDTheta >= 0 ? '+' : ''}
                        {row.dWnDTheta.toFixed(3)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          row.sWn >= 0 ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {row.sWn >= 0 ? '+' : ''}
                        {row.sWn.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-700">
                        {row.dOsDTheta >= 0 ? '+' : ''}
                        {row.dOsDTheta.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
