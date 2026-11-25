import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Sparkles } from 'lucide-react';
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
import { evaluateGeneralBode } from '../../utils/controlMath';

interface TfPreset {
  id: string;
  label: string;
  formula: string;
  numStr: string;
  denStr: string;
  recommendedComp: 'lead' | 'lag' | 'lead_lag';
  kc: number;
  phiLeadDeg: number;
  wm: number;
  betaLag: number;
  tauLag: number;
}

const TF_PRESETS: TfPreset[] = [
  {
    id: 'type1_2nd',
    label: 'Type-1 Servo G(s) = 20 / (s(s+4))',
    formula: '20 / (s² + 4s)',
    numStr: '20',
    denStr: '1, 4, 0',
    recommendedComp: 'lead',
    kc: 1.0,
    phiLeadDeg: 35,
    wm: 5.5,
    betaLag: 6.0,
    tauLag: 4.0,
  },
  {
    id: 'type1_3rd',
    label: 'Type-1 3-Pole G(s) = 40 / (s(s+2)(s+5))',
    formula: '40 / (s³ + 7s² + 10s)',
    numStr: '40',
    denStr: '1, 7, 10, 0',
    recommendedComp: 'lead',
    kc: 1.0,
    phiLeadDeg: 40,
    wm: 3.4,
    betaLag: 8.0,
    tauLag: 5.0,
  },
  {
    id: 'type0_3rd',
    label: 'Type-0 Plant G(s) = 80 / ((s+1)(s+2)(s+5))',
    formula: '80 / (s³ + 8s² + 17s + 10)',
    numStr: '80',
    denStr: '1, 8, 17, 10',
    recommendedComp: 'lag',
    kc: 1.0,
    phiLeadDeg: 30,
    wm: 4.0,
    betaLag: 5.0,
    tauLag: 3.5,
  },
  {
    id: 'high_gain_unstable',
    label: 'Unstable High-Gain G(s) = 180 / (s(s+2)(s+6))',
    formula: '180 / (s³ + 8s² + 12s)',
    numStr: '180',
    denStr: '1, 8, 12, 0',
    recommendedComp: 'lag',
    kc: 1.0,
    phiLeadDeg: 42,
    wm: 4.5,
    betaLag: 10.0,
    tauLag: 6.0,
  },
  {
    id: 'zero_plant',
    label: 'Non-Zero Num G(s) = (15s + 30) / (s(s+1)(s+8))',
    formula: '(15s + 30) / (s³ + 9s² + 8s)',
    numStr: '15, 30',
    denStr: '1, 9, 8, 0',
    recommendedComp: 'lead_lag',
    kc: 1.0,
    phiLeadDeg: 30,
    wm: 6.0,
    betaLag: 6.0,
    tauLag: 4.0,
  },
];

function parsePolyInput(str: string): { coeffs: number[]; error: string | null } {
  const parts = str
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { coeffs: [], error: 'Enter at least one numeric coefficient.' };
  }
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) {
    return { coeffs: [], error: 'Coefficients must be finite numbers separated by commas.' };
  }
  if (nums.every((n) => Math.abs(n) < 1e-12)) {
    return { coeffs: [], error: 'Polynomial cannot be identically zero.' };
  }
  return { coeffs: nums, error: null };
}

function formatPolyString(coeffs: number[]): string {
  const n = coeffs.length - 1;
  const terms: string[] = [];
  coeffs.forEach((c, idx) => {
    if (Math.abs(c) < 1e-12) return;
    const pow = n - idx;
    const absC = Math.abs(c);
    const sign = c < 0 ? '−' : terms.length > 0 ? '+' : '';
    const coefStr =
      pow === 0 || Math.abs(absC - 1) > 1e-6 ? Number(absC.toFixed(3)).toString() : '';
    const sStr = pow === 0 ? '' : pow === 1 ? 's' : `s^${pow}`;
    terms.push(`${sign}${terms.length > 0 ? ' ' : ''}${coefStr}${sStr}`);
  });
  return terms.join(' ') || '0';
}

function formatFreq(w: number | null): string {
  if (w === null) return 'None';
  return `${w.toFixed(2)} rad/s`;
}

function formatPm(pm: number | null): string {
  if (pm === null) return '∞ (|G|<0 dB)';
  return `${pm.toFixed(1)}°`;
}

function formatGm(gm: number | null): string {
  if (gm === null) return '∞ (No −180°)';
  return `${gm.toFixed(1)} dB`;
}

export interface BodeDesignSummary {
  plantLabel: string;
  compType: 'none' | 'lead' | 'lag' | 'lead_lag' | 'pd' | 'pi';
  pmDeg: number | null;
  gmDb: number | null;
  wgc: number | null;
  wpc: number | null;
  isStable: boolean;
}

interface BodeGeneratorSectionProps {
  onSummaryChange?: (summary: BodeDesignSummary) => void;
}

export const BodeGeneratorSection: React.FC<BodeGeneratorSectionProps> = ({
  onSummaryChange,
}) => {
  const [numInput, setNumInput] = useState<string>(TF_PRESETS[0].numStr);
  const [denInput, setDenInput] = useState<string>(TF_PRESETS[0].denStr);
  const [compType, setCompType] = useState<'none' | 'lead' | 'lag' | 'lead_lag' | 'pd' | 'pi'>('lead');
  const [kc, setKc] = useState<number>(1.0);
  const [phiLeadDeg, setPhiLeadDeg] = useState<number>(35);
  const [wm, setWm] = useState<number>(5.5);
  const [betaLag, setBetaLag] = useState<number>(6.0);
  const [tauLag, setTauLag] = useState<number>(4.0);
  const [copiedMatlab, setCopiedMatlab] = useState<boolean>(false);

  const parsedNum = useMemo(() => parsePolyInput(numInput), [numInput]);
  const parsedDen = useMemo(() => parsePolyInput(denInput), [denInput]);

  const numCoeffs = parsedNum.error ? [20] : parsedNum.coeffs;
  const denCoeffs = parsedDen.error ? [1, 4, 0] : parsedDen.coeffs;

  // Derive Lead alpha & tau from desired max phase lead phiLeadDeg and center freq wm
  const sinPhi = Math.sin((phiLeadDeg * Math.PI) / 180);
  const alphaLead = Math.max(0.03, (1 - sinPhi) / (1 + sinPhi));
  const tauLead = 1 / (Math.max(0.1, wm) * Math.sqrt(alphaLead));

  const bode = useMemo(() => {
    return evaluateGeneralBode({
      num: numCoeffs,
      den: denCoeffs,
      compType,
      kc,
      alphaLead,
      tauLead,
      betaLag,
      tauLag,
    });
  }, [numCoeffs, denCoeffs, compType, kc, alphaLead, tauLead, betaLag, tauLag]);

  const chartData = useMemo(() => {
    return bode.points.map((pt) => ({
      w: Number(pt.w.toFixed(4)),
      uncompMagDb: Number(pt.uncompMagDb.toFixed(2)),
      compMagDb: Number(pt.compMagDb.toFixed(2)),
      uncompPhaseDeg: Number(pt.uncompPhaseDeg.toFixed(1)),
      compPhaseDeg: Number(pt.compPhaseDeg.toFixed(1)),
    }));
  }, [bode]);

  const activeMargins = compType === 'none' ? bode.uncomp : bode.comp;
  const isStableMargins =
    (activeMargins.phaseMarginDeg === null || activeMargins.phaseMarginDeg > 0) &&
    (activeMargins.gainMarginDb === null || activeMargins.gainMarginDb > 0);
  const isHealthyMargins =
    isStableMargins &&
    (activeMargins.phaseMarginDeg === null || activeMargins.phaseMarginDeg >= 45) &&
    (activeMargins.gainMarginDb === null || activeMargins.gainMarginDb >= 6);

  const pmDelta =
    bode.uncomp.phaseMarginDeg !== null && bode.comp.phaseMarginDeg !== null
      ? bode.comp.phaseMarginDeg - bode.uncomp.phaseMarginDeg
      : null;

  useEffect(() => {
    if (!onSummaryChange) return;
    onSummaryChange({
      plantLabel: `(${formatPolyString(numCoeffs)}) / (${formatPolyString(denCoeffs)})`,
      compType,
      pmDeg: activeMargins.phaseMarginDeg,
      gmDb: activeMargins.gainMarginDb,
      wgc: activeMargins.wgc,
      wpc: activeMargins.wpc,
      isStable: isStableMargins,
    });
  }, [onSummaryChange, numCoeffs, denCoeffs, compType, activeMargins, isStableMargins]);

  const handleApplyPreset = (preset: TfPreset) => {
    setNumInput(preset.numStr);
    setDenInput(preset.denStr);
    setCompType(preset.recommendedComp);
    setKc(preset.kc);
    setPhiLeadDeg(preset.phiLeadDeg);
    setWm(preset.wm);
    setBetaLag(preset.betaLag);
    setTauLag(preset.tauLag);
  };

  const handleAutoAlignLead = () => {
    setCompType('lead');
    const baseWgc = bode.uncomp.wgc ?? 3.5;
    const basePm = bode.uncomp.phaseMarginDeg ?? 25;
    const neededBoost = Math.min(58, Math.max(15, 52 - basePm + 8));
    setPhiLeadDeg(Math.round(neededBoost));
    setWm(Number((baseWgc * 1.35).toFixed(2)));
  };

  const matlabSnippet = useMemo(() => {
    const numMat = `[${numCoeffs.join(' ')}]`;
    const denMat = `[${denCoeffs.join(' ')}]`;
    let cLine = `C = tf(${kc.toFixed(2)}, 1);`;
    if (compType === 'lead') {
      cLine = `C = ${kc.toFixed(2)} * tf([${tauLead.toFixed(4)} 1], [${(alphaLead * tauLead).toFixed(4)} 1]);`;
    } else if (compType === 'lag') {
      cLine = `C = ${kc.toFixed(2)} * tf([${tauLag.toFixed(4)} 1], [${(betaLag * tauLag).toFixed(4)} 1]);`;
    } else if (compType === 'lead_lag') {
      cLine = `C = ${kc.toFixed(2)} * tf([${tauLead.toFixed(4)} 1], [${(alphaLead * tauLead).toFixed(4)} 1]) * tf([${tauLag.toFixed(4)} 1], [${(betaLag * tauLag).toFixed(4)} 1]);`;
    } else if (compType === 'pd') {
      cLine = `C = ${kc.toFixed(2)} * tf([${tauLead.toFixed(4)} 1], [${(0.05 * tauLead).toFixed(4)} 1]);`;
    } else if (compType === 'pi') {
      cLine = `C = ${kc.toFixed(2)} * tf([${tauLag.toFixed(4)} 1], [${tauLag.toFixed(4)} 0]);`;
    }
    return `G = tf(${numMat}, ${denMat});\n${cLine}\nfigure; margin(G); hold on; margin(C*G);\nlegend('Uncompensated G(s)', 'Compensated C(s)G(s)'); grid on;`;
  }, [numCoeffs, denCoeffs, compType, kc, alphaLead, tauLead, betaLag, tauLag]);

  const handleCopyMatlab = async () => {
    try {
      await navigator.clipboard.writeText(matlabSnippet);
      setCopiedMatlab(true);
      window.setTimeout(() => setCopiedMatlab(false), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Control Column: Transfer Function & Compensator Designer */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-950">
              Transfer Function G(s) &amp; Compensator
            </h2>
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
                  <span>MATLAB tf()</span>
                </>
              )}
            </button>
          </div>

          {/* Textbook Transfer Function Presets */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Plant Presets (Descending Powers of s)
            </label>
            <select
              onChange={(e) => {
                const found = TF_PRESETS.find((p) => p.id === e.target.value);
                if (found) handleApplyPreset(found);
              }}
              defaultValue={TF_PRESETS[0].id}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-900"
            >
              {TF_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Numerator & Denominator Polynomial Inputs */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="bode-num" className="block text-xs font-semibold text-slate-900">
                Numerator Coefficients (num)
              </label>
              <input
                id="bode-num"
                type="text"
                value={numInput}
                onChange={(e) => setNumInput(e.target.value)}
                placeholder="e.g. 20 or 15, 30"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-900"
              />
              {parsedNum.error && (
                <p className="text-[11px] text-red-600">{parsedNum.error}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="bode-den" className="block text-xs font-semibold text-slate-900">
                Denominator Coefficients (den)
              </label>
              <input
                id="bode-den"
                type="text"
                value={denInput}
                onChange={(e) => setDenInput(e.target.value)}
                placeholder="e.g. 1, 4, 0"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-900"
              />
              {parsedDen.error && (
                <p className="text-[11px] text-red-600">{parsedDen.error}</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 font-mono text-[11px] text-slate-700 space-y-0.5">
              <div className="text-[10px] text-slate-500 uppercase">
                Parsed Plant (Type {Math.max(0, bode.systemType)})
              </div>
              <div className="text-sky-800 font-semibold break-all">
                G(s) = ({formatPolyString(numCoeffs)}) / ({formatPolyString(denCoeffs)})
              </div>
            </div>
          </div>

          {/* Compensator Selection */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-950">Compensator C(s)</span>
              <button
                type="button"
                onClick={handleAutoAlignLead}
                className="cursor-pointer inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
              >
                <Sparkles className="h-3 w-3" />
                <span>Auto-Target 52° PM</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              {[
                { id: 'none', label: 'None' },
                { id: 'lead', label: 'Lead' },
                { id: 'lag', label: 'Lag' },
                { id: 'lead_lag', label: 'Lead-Lag' },
                { id: 'pd', label: 'PD' },
                { id: 'pi', label: 'PI' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCompType(c.id as typeof compType)}
                  className={`cursor-pointer rounded py-1 text-[11px] font-semibold ${
                    compType === c.id
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Compensator Gain Kc */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-800">Series Gain Kc</span>
                <span className="font-mono font-semibold text-sky-700 tabular-nums">
                  {kc.toFixed(2)} ({(20 * Math.log10(Math.max(0.01, kc))).toFixed(1)} dB)
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={6.0}
                step={0.05}
                value={kc}
                onChange={(e) => setKc(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            {/* Lead / PD Controls */}
            {(compType === 'lead' || compType === 'lead_lag' || compType === 'pd') && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                {compType !== 'pd' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">Max Phase Lead φm</span>
                      <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                        {phiLeadDeg}° (α = {alphaLead.toFixed(3)})
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={62}
                      step={1}
                      value={phiLeadDeg}
                      onChange={(e) => setPhiLeadDeg(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {compType === 'pd' ? 'Zero Break ωz' : 'Center Freq ωm'}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {wm.toFixed(2)} rad/s (τ = {tauLead.toFixed(3)}s)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={25}
                    step={0.1}
                    value={wm}
                    onChange={(e) => setWm(parseFloat(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Lag / PI Controls */}
            {(compType === 'lag' || compType === 'lead_lag' || compType === 'pi') && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                {compType !== 'pi' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">Lag Ratio β (&gt; 1)</span>
                      <span className="font-mono font-semibold text-amber-700 tabular-nums">
                        {betaLag.toFixed(1)} (−{(20 * Math.log10(betaLag)).toFixed(1)} dB HF)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1.5}
                      max={20}
                      step={0.5}
                      value={betaLag}
                      onChange={(e) => setBetaLag(parseFloat(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">Lag Time Constant τ_lag</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {tauLag.toFixed(2)} s (ωz = {(1 / tauLag).toFixed(2)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={15}
                    step={0.2}
                    value={tauLag}
                    onChange={(e) => setTauLag(parseFloat(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Visualization Column: Margins & Bode Plots */}
        <div className="lg:col-span-8 space-y-5">
          {/* Phase & Gain Margin Comparison Scorecard */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="text-sm font-bold text-slate-950">
                Frequency Stability Margins Verification
              </div>
              <div
                className={`text-xs font-semibold tabular-nums ${
                  !isStableMargins
                    ? 'text-red-700'
                    : isHealthyMargins
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                {!isStableMargins
                  ? 'Unstable Closed-Loop (Negative PM or GM)'
                  : isHealthyMargins
                  ? 'Verified Healthy Margins (PM ≥ 45° & GM ≥ 6 dB)'
                  : 'Marginal Damping (Target PM ≥ 45° for < 20% overshoot)'}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Phase Margin (PM)</div>
                <div className="mt-1 font-mono text-base font-bold tabular-nums text-slate-950">
                  {compType === 'none'
                    ? formatPm(bode.uncomp.phaseMarginDeg)
                    : formatPm(bode.comp.phaseMarginDeg)}
                </div>
                {compType !== 'none' && (
                  <div className="mt-0.5 font-mono text-[11px] text-slate-600 tabular-nums">
                    Plant: {formatPm(bode.uncomp.phaseMarginDeg)}
                    {pmDelta !== null && (
                      <span
                        className={
                          pmDelta >= 0 ? ' text-emerald-700 font-semibold' : ' text-red-600 font-semibold'
                        }
                      >
                        {' '}
                        ({pmDelta >= 0 ? '+' : ''}
                        {pmDelta.toFixed(1)}°)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Gain Margin (GM)</div>
                <div className="mt-1 font-mono text-base font-bold tabular-nums text-slate-950">
                  {compType === 'none'
                    ? formatGm(bode.uncomp.gainMarginDb)
                    : formatGm(bode.comp.gainMarginDb)}
                </div>
                {compType !== 'none' && (
                  <div className="mt-0.5 font-mono text-[11px] text-slate-600 tabular-nums">
                    Plant: {formatGm(bode.uncomp.gainMarginDb)}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Gain Crossover (ω_gc)</div>
                <div className="mt-1 font-mono text-base font-bold tabular-nums text-sky-700">
                  {compType === 'none'
                    ? formatFreq(bode.uncomp.wgc)
                    : formatFreq(bode.comp.wgc)}
                </div>
                {compType !== 'none' && (
                  <div className="mt-0.5 font-mono text-[11px] text-slate-600 tabular-nums">
                    Plant: {formatFreq(bode.uncomp.wgc)}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Phase Crossover (ω_pc)</div>
                <div className="mt-1 font-mono text-base font-bold tabular-nums text-amber-700">
                  {compType === 'none'
                    ? formatFreq(bode.uncomp.wpc)
                    : formatFreq(bode.comp.wpc)}
                </div>
                {compType !== 'none' && (
                  <div className="mt-0.5 font-mono text-[11px] text-slate-600 tabular-nums">
                    Plant: {formatFreq(bode.uncomp.wpc)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bode Magnitude Plot (dB vs log ω) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-950">
                Bode Magnitude Plot |L(jω)| (dB)
              </h3>
              <span className="font-mono text-[11px] text-slate-500">
                0 dB crossing determines ω_gc and Phase Margin
              </span>
            </div>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="w"
                    type="number"
                    scale="log"
                    domain={[0.02, 200]}
                    ticks={[0.05, 0.1, 0.5, 1, 5, 10, 50, 100]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${v}`}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${v}dB`}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label) => `ω = ${Number(label).toFixed(2)} rad/s`}
                    formatter={(value, name) => [
                      `${typeof value === 'number' ? value.toFixed(2) : String(value ?? '')} dB`,
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <ReferenceLine y={0} stroke="#0f172a" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="uncompMagDb"
                    name="Uncompensated |G(jω)|"
                    stroke="#64748b"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                  {compType !== 'none' && (
                    <Line
                      type="monotone"
                      dataKey="compMagDb"
                      name="Compensated |C(jω)G(jω)|"
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

          {/* Bode Phase Plot (deg vs log ω) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-950">
                Bode Phase Plot ∠L(jω) (degrees)
              </h3>
              <span className="font-mono text-[11px] text-slate-500">
                −180° crossing determines ω_pc and Gain Margin
              </span>
            </div>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="w"
                    type="number"
                    scale="log"
                    domain={[0.02, 200]}
                    ticks={[0.05, 0.1, 0.5, 1, 5, 10, 50, 100]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${v}`}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${v}°`}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label) => `ω = ${Number(label).toFixed(2)} rad/s`}
                    formatter={(value, name) => [
                      `${typeof value === 'number' ? value.toFixed(1) : String(value ?? '')}°`,
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <ReferenceLine
                    y={-180}
                    stroke="#dc2626"
                    strokeDasharray="4 4"
                    label={{ value: '−180° Stability Limit', position: 'insideTopRight', fontSize: 10, fill: '#dc2626' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="uncompPhaseDeg"
                    name="Uncompensated ∠G(jω)"
                    stroke="#64748b"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                  {compType !== 'none' && (
                    <Line
                      type="monotone"
                      dataKey="compPhaseDeg"
                      name="Compensated ∠C(jω)G(jω)"
                      stroke="#059669"
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
