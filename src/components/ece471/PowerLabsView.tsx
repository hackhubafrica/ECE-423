import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  Cable,
  Zap,
} from 'lucide-react';
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
import { PowerLabType } from '../../types/ece471';
import {
  computeLineParameters,
  computePeekCorona,
  GeneratorCostUnit,
  simulateAgcFrequencyControl,
  solveEconomicDispatch,
} from '../../utils/powerMath';

interface PowerLabsViewProps {
  activeLab: PowerLabType;
  onSelectLab: (lab: PowerLabType) => void;
  onOpenTheory: (subTab?: 'principles' | 'timeline' | 'essays') => void;
}

type LabSubView = 'line_params' | 'peek_corona' | 'dispatch_agc';

const LAB_CARDS: {
  id: LabSubView;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'line_params',
    label: 'Transmission Line Parameters',
    subtitle: 'R_dc/R_ac, GMR, L, C_n, I_c & Bundles',
    icon: Cable,
  },
  {
    id: 'peek_corona',
    label: 'Peek Corona Calculator',
    subtitle: 'Disruptive V_d, V_v & Power Loss P_c',
    icon: Zap,
  },
  {
    id: 'dispatch_agc',
    label: 'Economic Dispatch & AGC Lab',
    subtitle: 'λ-Iteration & Frequency Droop/AGC',
    icon: Activity,
  },
];

export const PowerLabsView: React.FC<PowerLabsViewProps> = ({
  activeLab,
  onSelectLab,
  onOpenTheory,
}) => {
  const [subLab, setSubLab] = useState<LabSubView>(() =>
    activeLab === PowerLabType.DISPATCH_AGC ? 'dispatch_agc' : 'line_params'
  );

  useEffect(() => {
    if (activeLab === PowerLabType.DISPATCH_AGC) {
      setSubLab('dispatch_agc');
    } else if (activeLab === PowerLabType.LINE_CORONA && subLab === 'dispatch_agc') {
      setSubLab('line_params');
    }
  }, [activeLab, subLab]);

  const handleSelectSubLab = (id: LabSubView) => {
    setSubLab(id);
    if (id === 'dispatch_agc') {
      onSelectLab(PowerLabType.DISPATCH_AGC);
    } else {
      onSelectLab(PowerLabType.LINE_CORONA);
    }
  };

  // =========================================================================
  // 1. TRANSMISSION LINE PARAMETERS LAB
  // =========================================================================
  const [lineTopo, setLineTopo] = useState<
    'single_phase_2wire' | 'three_phase_equilateral' | 'three_phase_unsymmetrical'
  >('three_phase_equilateral');
  const [bundleCount, setBundleCount] = useState<1 | 2 | 3 | 4>(2);
  const [radiusCm, setRadiusCm] = useState(1.5);
  const [bundleSpacingCm, setBundleSpacingCm] = useState(40);
  const [dabM, setDabM] = useState(8);
  const [dbcM, setDbcM] = useState(8);
  const [dcaM, setDcaM] = useState(12);
  const [lineVoltageKv, setLineVoltageKv] = useState(132);
  const [freqHz, setFreqHz] = useState(50);
  const [areaMm2, setAreaMm2] = useState(250);
  const [lengthKm, setLengthKm] = useState(100);
  const [acFactor, setAcFactor] = useState(1.15);

  const lineRes = useMemo(
    () =>
      computeLineParameters({
        topology: lineTopo,
        bundleCount,
        radiusCm,
        bundleSpacingCm,
        dabM,
        dbcM,
        dcaM,
        lengthKm,
        areaMm2,
        resistivityOhmM: 2.82e-8,
        acSkinFactor: acFactor,
        lineVoltageKv,
        freqHz,
      }),
    [
      lineTopo,
      bundleCount,
      radiusCm,
      bundleSpacingCm,
      dabM,
      dbcM,
      dcaM,
      lengthKm,
      areaMm2,
      acFactor,
      lineVoltageKv,
      freqHz,
    ]
  );

  // =========================================================================
  // 2. PEEK CORONA CALCULATOR LAB
  // =========================================================================
  const [pkVLineKv, setPkVLineKv] = useState(260);
  const [pkRadiusCm, setPkRadiusCm] = useState(1.0);
  const [pkSpacingCm, setPkSpacingCm] = useState(300);
  const [pkFreqHz, setPkFreqHz] = useState(50);
  const [pkDelta, setPkDelta] = useState(1.0);
  const [pkM0, setPkM0] = useState(0.85);
  const [pkOverrideVd, setPkOverrideVd] = useState<string>('');

  const coronaRes = useMemo(() => {
    const parsed = Number(pkOverrideVd);
    return computePeekCorona({
      operatingLineKv: pkVLineKv,
      radiusCm: pkRadiusCm,
      spacingCm: pkSpacingCm,
      freqHz: pkFreqHz,
      airDensityFactor: pkDelta,
      surfaceFactorM0: pkM0,
      overrideVdKv: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
    });
  }, [pkVLineKv, pkRadiusCm, pkSpacingCm, pkFreqHz, pkDelta, pkM0, pkOverrideVd]);

  // =========================================================================
  // 3. ECONOMIC DISPATCH & AGC FREQUENCY CONTROL LAB
  // =========================================================================
  const [loadMw, setLoadMw] = useState(520);
  const [enforceLimits, setEnforceLimits] = useState(true);
  const [u1b, setU1b] = useState(7.0);
  const [u1c, setU1c] = useState(0.008);
  const [u2b, setU2b] = useState(6.3);
  const [u2c, setU2c] = useState(0.009);
  const [u3b, setU3b] = useState(6.8);
  const [u3c, setU3c] = useState(0.007);

  const genUnits: GeneratorCostUnit[] = useMemo(
    () => [
      { id: 'g1', name: 'Unit 1 (Coal Base)', a: 200, b: u1b, c: u1c, pMin: 50, pMax: 300 },
      { id: 'g2', name: 'Unit 2 (CCGT Mid)', a: 180, b: u2b, c: u2c, pMin: 50, pMax: 250 },
      { id: 'g3', name: 'Unit 3 (Peaker)', a: 140, b: u3b, c: u3c, pMin: 40, pMax: 200 },
    ],
    [u1b, u1c, u2b, u2c, u3b, u3c]
  );

  const [droopR, setDroopR] = useState(0.05);
  const [kiAgc, setKiAgc] = useState(0.35);
  const [loadStepPu, setLoadStepPu] = useState(0.08);
  const [inertiaH, setInertiaH] = useState(5.0);

  const dispatchRes = useMemo(
    () => solveEconomicDispatch(genUnits, loadMw, enforceLimits),
    [genUnits, loadMw, enforceLimits]
  );

  const agcSeries = useMemo(
    () =>
      simulateAgcFrequencyControl({
        inertiaH,
        dampingD: 0.8,
        droopR,
        tgSec: 0.25,
        ttSec: 0.5,
        kiAgc,
        loadStepPu,
        fNominalHz: 50,
      }),
    [inertiaH, droopR, kiAgc, loadStepPu]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            ECE 471 Power Systems Interactive Labs
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Interactive engineering simulators for Transmission Line Parameters, Peek Corona Critical Voltage &amp; Power Loss, and Economic Dispatch with AGC Frequency Control.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenTheory('principles')}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:border-emerald-400 hover:text-emerald-700 shrink-0 whitespace-nowrap"
        >
          <BookOpen className="h-3.5 w-3.5 text-emerald-700" />
          <span>Review Power Principles</span>
        </button>
      </div>

      {/* 3-Simulator Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {LAB_CARDS.map((card) => {
          const Icon = card.icon;
          const active = subLab === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleSelectSubLab(card.id)}
              className={`cursor-pointer rounded-xl border p-4 text-left transition-colors flex items-start gap-3 ${
                active
                  ? 'border-emerald-600 bg-emerald-50/70 text-slate-950'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <div
                className={`rounded-lg p-2 shrink-0 ${
                  active ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-950">{card.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{card.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ================================================================== */}
      {/* LAB 1: TRANSMISSION LINE PARAMETERS                                */}
      {/* ================================================================== */}
      {subLab === 'line_params' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-950">Line Conductor &amp; Tower Geometry</h2>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setLineTopo('single_phase_2wire');
                    setBundleCount(1);
                    setRadiusCm(1.0);
                    setDabM(2.0);
                  }}
                  className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-emerald-700 hover:border-emerald-400"
                >
                  CAT 1 Q4 (1ϕ)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLineTopo('three_phase_equilateral');
                    setBundleCount(1);
                    setRadiusCm(1.0);
                    setDabM(4.0);
                    setLineVoltageKv(132);
                    setFreqHz(50);
                  }}
                  className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-emerald-700 hover:border-emerald-400"
                >
                  CAT 1 Q5 (3ϕ Cap)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLineTopo('three_phase_equilateral');
                    setBundleCount(2);
                    setRadiusCm(1.5);
                    setBundleSpacingCm(40);
                    setDabM(8.0);
                  }}
                  className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-emerald-700 hover:border-emerald-400"
                >
                  CAT 1 Q6 (Bundle)
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Line Configuration</label>
                <select
                  value={lineTopo}
                  onChange={(e) => setLineTopo(e.target.value as typeof lineTopo)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                >
                  <option value="single_phase_2wire">Single-Phase 2-Wire Loop</option>
                  <option value="three_phase_equilateral">Three-Phase Equilateral Spacing</option>
                  <option value="three_phase_unsymmetrical">Three-Phase Unsymmetrical (GMD)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bundled Sub-Conductors per Phase ({bundleCount}×)
                </label>
                <div className="grid grid-cols-4 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                  {([1, 2, 3, 4] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setBundleCount(n)}
                      className={`cursor-pointer rounded py-1 text-xs font-semibold ${
                        bundleCount === n ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {n}×
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Sub-Conductor Radius r</span>
                  <span className="font-mono text-emerald-800">{radiusCm.toFixed(2)} cm</span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={3.0}
                  step={0.05}
                  value={radiusCm}
                  onChange={(e) => setRadiusCm(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </div>

              {bundleCount > 1 && (
                <div>
                  <div className="flex justify-between font-medium text-slate-700">
                    <span>Bundle Sub-Spacing d</span>
                    <span className="font-mono text-emerald-800">{bundleSpacingCm} cm</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={60}
                    step={1}
                    value={bundleSpacingCm}
                    onChange={(e) => setBundleSpacingCm(Number(e.target.value))}
                    className="w-full accent-emerald-700"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Phase Spacing D_ab</span>
                  <span className="font-mono text-emerald-800">{dabM.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={15.0}
                  step={0.5}
                  value={dabM}
                  onChange={(e) => setDabM(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </div>

              {lineTopo === 'three_phase_unsymmetrical' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500">D_bc (m)</label>
                    <input
                      type="number"
                      step={0.5}
                      value={dbcM}
                      onChange={(e) => setDbcM(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">D_ca (m)</label>
                    <input
                      type="number"
                      step={0.5}
                      value={dcaM}
                      onChange={(e) => setDcaM(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] text-slate-500">Line Voltage (kV)</label>
                  <input
                    type="number"
                    step={5}
                    value={lineVoltageKv}
                    onChange={(e) => setLineVoltageKv(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Frequency (Hz)</label>
                  <input
                    type="number"
                    step={5}
                    value={freqHz}
                    onChange={(e) => setFreqHz(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Area (mm²)</label>
                  <input
                    type="number"
                    step={10}
                    value={areaMm2}
                    onChange={(e) => setAreaMm2(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Length (km)</label>
                  <input
                    type="number"
                    step={10}
                    value={lengthKm}
                    onChange={(e) => setLengthKm(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-500">AC Skin-Effect Multiplier</label>
                <input
                  type="number"
                  step={0.01}
                  value={acFactor}
                  onChange={(e) => setAcFactor(Number(e.target.value))}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            {/* Cross-Section Geometry SVG */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-950">
                  Phase Cross-Section &amp; Equivalent Radii
                </h3>
                <span className="font-mono text-xs text-emerald-800 font-semibold">
                  GMD = {lineRes.gmdM.toFixed(3)} m · GMR_L = {(lineRes.bundleGmrL_M * 100).toFixed(3)} cm
                </span>
              </div>
              <svg
                viewBox="0 0 560 120"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70"
                aria-label="Transmission Line Conductor Geometry"
              >
                <text x="16" y="20" fontSize="10" fontWeight="700" fill="#475569">
                  {lineTopo === 'single_phase_2wire'
                    ? 'Single-Phase 2-Wire Go & Return'
                    : `3-Phase (${bundleCount} sub-conductor${bundleCount > 1 ? 's' : ''} / phase)`}
                </text>
                {(lineTopo === 'single_phase_2wire' ? ['Phase (+)', 'Return (−)'] : ['Phase A', 'Phase B', 'Phase C']).map(
                  (lbl, i) => {
                    const cx = lineTopo === 'single_phase_2wire' ? 170 + i * 220 : 120 + i * 160;
                    const cy = 66;
                    const offsets =
                      bundleCount === 1
                        ? [[0, 0]]
                        : bundleCount === 2
                        ? [[-14, 0], [14, 0]]
                        : bundleCount === 3
                        ? [[0, -14], [-12, 10], [12, 10]]
                        : [[-12, -12], [12, -12], [-12, 12], [12, 12]];
                    return (
                      <g key={lbl}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={bundleCount > 1 ? 26 : 12}
                          fill="none"
                          stroke="#94a3b8"
                          strokeDasharray="3 3"
                        />
                        {offsets.map(([dx, dy], idx) => (
                          <circle key={idx} cx={cx + dx} cy={cy + dy} r="5.5" fill="#047857" />
                        ))}
                        <text x={cx} y={108} textAnchor="middle" fontSize="10" fontWeight="600" fill="#0f172a">
                          {lbl}
                        </text>
                      </g>
                    );
                  }
                )}
              </svg>
            </div>

            {/* Output Readout Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'DC Resistance / phase', val: `${lineRes.rDcPerPhaseOhm.toFixed(3)} Ω` },
                { label: 'Total Circuit R_dc', val: `${lineRes.rDcTotal3PhOhm.toFixed(3)} Ω` },
                { label: 'AC Resistance / phase', val: `${lineRes.rAcPerPhaseOhm.toFixed(3)} Ω` },
                { label: 'Single Wire GMR (r\')', val: `${(lineRes.singleGmrM * 100).toFixed(4)} cm` },
                { label: 'Bundle GMR (Inductance)', val: `${(lineRes.bundleGmrL_M * 100).toFixed(3)} cm` },
                { label: 'L per conductor / phase', val: `${(lineRes.inductancePerCondOrPhaseHPerM * 1e6).toFixed(4)} μH/m` },
                {
                  label: lineTopo === 'single_phase_2wire' ? 'Total 2-Wire L/km' : 'Inductance L/km',
                  val: `${lineRes.inductanceTotalPerKmMh.toFixed(4)} mH/km`,
                },
                { label: 'Reactance X_L (per km)', val: `${lineRes.reactancePerPhaseOhmPerKm.toFixed(4)} Ω/km` },
                { label: 'Capacitance C_n', val: `${lineRes.capacitancePerPhaseNfPerKm.toFixed(3)} nF/km` },
                { label: 'Charging Current I_c', val: `${lineRes.chargingCurrentAPerKm.toFixed(4)} A/km` },
                { label: 'Charging Q_c', val: `${lineRes.chargingMvarPerKm.toFixed(4)} Mvar/km` },
                { label: 'Surge Impedance Z_c', val: `${lineRes.surgeImpedanceOhm.toFixed(1)} Ω` },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="text-[11px] text-slate-500">{m.label}</div>
                  <div className="font-mono text-sm font-bold text-slate-950 mt-0.5 tabular-nums">
                    {m.val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* LAB 2: PEEK CORONA CALCULATOR                                      */}
      {/* ================================================================== */}
      {subLab === 'peek_corona' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-950">Peek Corona Parameters</h2>
              <div className="flex gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setPkRadiusCm(1.0);
                    setPkSpacingCm(300);
                    setPkFreqHz(50);
                    setPkDelta(1.0);
                    setPkM0(0.85);
                    setPkOverrideVd('');
                  }}
                  className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-emerald-700 hover:border-emerald-400"
                >
                  CAT 1 Q7(a)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPkVLineKv(260);
                    setPkRadiusCm(1.0);
                    setPkSpacingCm(300);
                    setPkFreqHz(50);
                    setPkDelta(1.0);
                    setPkOverrideVd('133.1');
                  }}
                  className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-emerald-700 hover:border-emerald-400"
                >
                  CAT 1 Q7(b)
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Operating Line Voltage V_L</span>
                  <span className="font-mono text-emerald-800">{pkVLineKv} kV</span>
                </div>
                <input
                  type="range"
                  min={66}
                  max={500}
                  step={2}
                  value={pkVLineKv}
                  onChange={(e) => setPkVLineKv(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Conductor Radius r</span>
                  <span className="font-mono text-emerald-800">{pkRadiusCm.toFixed(2)} cm</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.05}
                  value={pkRadiusCm}
                  onChange={(e) => setPkRadiusCm(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Conductor Spacing D</span>
                  <span className="font-mono text-emerald-800">{pkSpacingCm} cm</span>
                </div>
                <input
                  type="range"
                  min={150}
                  max={1000}
                  step={10}
                  value={pkSpacingCm}
                  onChange={(e) => setPkSpacingCm(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500">Air Density δ</label>
                  <input
                    type="number"
                    step={0.05}
                    min={0.5}
                    max={1.2}
                    value={pkDelta}
                    onChange={(e) => setPkDelta(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Irregularity m₀</label>
                  <input
                    type="number"
                    step={0.01}
                    min={0.5}
                    max={1.0}
                    value={pkM0}
                    onChange={(e) => setPkM0(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Frequency (Hz)</label>
                  <input
                    type="number"
                    step={5}
                    value={pkFreqHz}
                    onChange={(e) => setPkFreqHz(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Override V_d (kV/ph)</label>
                  <input
                    type="text"
                    placeholder="auto"
                    value={pkOverrideVd}
                    onChange={(e) => setPkOverrideVd(e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Operating V_ph = V_L/√3', val: `${coronaRes.vPhaseKv.toFixed(2)} kV` },
                { label: 'Disruptive V_d / phase', val: `${coronaRes.vdPhaseKv.toFixed(2)} kV` },
                { label: 'Disruptive V_d (L-L)', val: `${coronaRes.vdLineKv.toFixed(1)} kV` },
                { label: 'Visual Onset V_v / ph', val: `${coronaRes.vvPhaseKv.toFixed(1)} kV` },
                {
                  label: 'Loss / km / phase',
                  val: `${coronaRes.lossPerKmPerPhaseKw.toFixed(3)} kW`,
                },
                {
                  label: 'Total 3-Phase Loss / km',
                  val: `${coronaRes.lossTotal3PhPerKmKw.toFixed(3)} kW`,
                },
                {
                  label: 'Corona Status',
                  val: coronaRes.coronaActive ? 'Discharge Active' : 'Corona-Free',
                },
                { label: 'Breakdown g₀ (RMS)', val: '21.21 kV/cm' },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="text-[11px] text-slate-500">{m.label}</div>
                  <div className="font-mono text-sm font-bold text-slate-950 mt-0.5 tabular-nums">
                    {m.val}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-950">
                  Peek Corona Power Loss Curve P_c vs Line Voltage
                </h3>
                <p className="text-xs text-slate-500">
                  Quadratic growth above disruptive critical voltage V_d(L-L) ={' '}
                  <span className="font-mono font-semibold text-slate-900">
                    {coronaRes.vdLineKv.toFixed(1)} kV
                  </span>
                </p>
              </div>
              <div className="h-[290px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={coronaRes.sweepCurve}
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="vLineKv"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      label={{
                        value: 'Operating Line Voltage (kV)',
                        position: 'insideBottom',
                        offset: -4,
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      label={{ value: 'kW / km', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine
                      x={Number(coronaRes.vdLineKv.toFixed(1))}
                      stroke="#d97706"
                      strokeDasharray="4 4"
                      label={{ value: 'V_d', position: 'top', fill: '#b45309', fontSize: 11 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="loss3PhKwPerKm"
                      name="3-Phase Loss (kW/km)"
                      stroke="#047857"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="lossPhaseKwPerKm"
                      name="Per-Phase Loss (kW/km)"
                      stroke="#0284c7"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* LAB 3: ECONOMIC DISPATCH & AGC FREQUENCY CONTROL                   */}
      {/* ================================================================== */}
      {subLab === 'dispatch_agc' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-950 border-b border-slate-100 pb-3">
              3-Generator Economic Dispatch (λ-Iteration)
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>System Total Demand P_D</span>
                  <span className="font-mono font-bold text-emerald-800">{loadMw} MW</span>
                </div>
                <input
                  type="range"
                  min={160}
                  max={740}
                  step={5}
                  value={loadMw}
                  onChange={(e) => setLoadMw(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enforceLimits}
                  onChange={(e) => setEnforceLimits(e.target.checked)}
                  className="accent-emerald-700"
                />
                <span>Enforce P_min / P_max generator inequality limits</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'U1 b/c', b: u1b, setB: setU1b, c: u1c, setC: setU1c },
                  { label: 'U2 b/c', b: u2b, setB: setU2b, c: u2c, setC: setU2c },
                  { label: 'U3 b/c', b: u3b, setB: setU3b, c: u3c, setC: setU3c },
                ].map((u) => (
                  <div key={u.label} className="rounded border border-slate-200 p-2 space-y-1">
                    <div className="font-semibold text-[11px] text-slate-700">{u.label}</div>
                    <input
                      type="number"
                      step={0.1}
                      value={u.b}
                      onChange={(e) => u.setB(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[11px]"
                    />
                    <input
                      type="number"
                      step={0.001}
                      min={0.001}
                      value={u.c}
                      onChange={(e) => u.setC(Math.max(0.001, Number(e.target.value)))}
                      className="w-full rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[11px]"
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-slate-500">System λ</div>
                  <div className="font-mono text-base font-bold text-emerald-800 tabular-nums">
                    ${dispatchRes.lambda.toFixed(3)} /MWh
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Total Fuel Cost</div>
                  <div className="font-mono text-base font-bold text-slate-950 tabular-nums">
                    ${dispatchRes.totalCostPerHr.toFixed(1)} /hr
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {dispatchRes.units.map((u) => (
                  <div key={u.id} className="p-3 bg-white flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        IC = ${u.incrementalCost.toFixed(2)}/MWh · {u.status}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-bold text-slate-950">{u.pMw.toFixed(1)} MW</div>
                      <div className="text-[11px] text-slate-500">${u.hourlyCost.toFixed(0)}/hr</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-950">
                AGC Frequency Response (Primary Droop vs Secondary Integral)
              </h2>
              <p className="text-xs text-slate-500">
                50 Hz single-area model under step load disturbance ΔP_L = {loadStepPu.toFixed(2)} pu.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Droop R</span>
                  <span className="font-mono">{(droopR * 100).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min={0.02}
                  max={0.1}
                  step={0.005}
                  value={droopR}
                  onChange={(e) => setDroopR(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </div>
              <div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>AGC Gain K_i</span>
                  <span className="font-mono">{kiAgc.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.8}
                  step={0.05}
                  value={kiAgc}
                  onChange={(e) => setKiAgc(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </div>
              <div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Inertia H</span>
                  <span className="font-mono">{inertiaH.toFixed(1)} s</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={10}
                  step={0.5}
                  value={inertiaH}
                  onChange={(e) => setInertiaH(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>Step Load Disturbance ΔP_L</span>
                <span className="font-mono">{loadStepPu.toFixed(2)} pu</span>
              </div>
              <input
                type="range"
                min={0.02}
                max={0.2}
                step={0.01}
                value={loadStepPu}
                onChange={(e) => setLoadStepPu(Number(e.target.value))}
                className="w-full accent-emerald-700"
              />
            </div>

            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={agcSeries} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="t" tick={{ fontSize: 11, fill: '#64748b' }} unit="s" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit=" Hz" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="deltaF_Hz"
                    name="With Secondary AGC (Δf → 0)"
                    stroke="#047857"
                    strokeWidth={2.2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="deltaF_NoAgc_Hz"
                    name="Primary Droop Only (Steady-State Offset)"
                    stroke="#d97706"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
