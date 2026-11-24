import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import { WORKED_EXAMPLES } from '../data/workedExamples';
import { MODULE_META } from '../data/syllabusData';
import {
  aLawCompress,
  calculateOverallPcmSnr,
  computeBer,
  dbToLinear,
  formatSci,
  MODULATION_CATALOG,
  muLawCompress,
} from '../utils/dspMath';
import {
  DigitalModScheme,
  FailedSolverAttempt,
  LabType,
  SyllabusModule,
} from '../types/ece423';

interface SolverFormulasViewProps {
  initialCalcId?: string;
  masteredExamples: string[];
  failedSolverAttempts: FailedSolverAttempt[];
  onToggleMastered: (id: string) => void;
  onRecordSolverFailure: (
    failure: Omit<FailedSolverAttempt, 'failCount' | 'lastFailedAt'>
  ) => void;
  onResolveSolverAttempt: (id: string) => void;
}

type CalcId = 'pcm_snr' | 'tdm_frame' | 'companding' | 'shannon' | 'delta_mod' | 'modulation';

const CALCULATORS: {
  id: CalcId;
  label: string;
  module: SyllabusModule;
  recommendedLab?: LabType;
  targetPrompt: string;
  unitLabel: string;
}[] = [
  {
    id: 'pcm_snr',
    label: 'PCM Bit Rate & Overall SNR',
    module: SyllabusModule.PCM,
    recommendedLab: LabType.SAMPLING_PCM,
    targetPrompt: 'Overall Output SNR (dB)',
    unitLabel: 'dB',
  },
  {
    id: 'tdm_frame',
    label: 'TDM Frame Multiplexer',
    module: SyllabusModule.PCM,
    targetPrompt: 'Aggregate Line Rate Rb (Mbps)',
    unitLabel: 'Mbps',
  },
  {
    id: 'companding',
    label: 'μ-Law & A-Law Companding',
    module: SyllabusModule.PCM,
    recommendedLab: LabType.COMPANDING,
    targetPrompt: 'Compressed Output y',
    unitLabel: 'norm',
  },
  {
    id: 'shannon',
    label: 'Shannon Channel Capacity',
    module: SyllabusModule.COMPRESSION,
    targetPrompt: 'Channel Capacity C (kbps)',
    unitLabel: 'kbps',
  },
  {
    id: 'delta_mod',
    label: 'Delta Modulation & Slope Overload',
    module: SyllabusModule.COMPRESSION,
    recommendedLab: LabType.DELTA_MOD,
    targetPrompt: 'Minimum Step Size Δ_min (V)',
    unitLabel: 'V',
  },
  {
    id: 'modulation',
    label: 'Modulation BW, η & BER',
    module: SyllabusModule.MODULATION,
    recommendedLab: LabType.DIGITAL_MOD,
    targetPrompt: 'Null-to-Null Bandwidth (MHz)',
    unitLabel: 'MHz',
  },
];

export const SolverFormulasView: React.FC<SolverFormulasViewProps> = ({
  initialCalcId,
  masteredExamples,
  failedSolverAttempts,
  onToggleMastered,
  onRecordSolverFailure,
  onResolveSolverAttempt,
}) => {
  const [sectionMode, setSectionMode] = useState<'calculators' | 'examples'>(
    initialCalcId === 'examples' ? 'examples' : 'calculators'
  );
  const [activeCalc, setActiveCalc] = useState<CalcId>(
    initialCalcId && initialCalcId !== 'examples' ? (initialCalcId as CalcId) : 'pcm_snr'
  );
  const [hideSteps, setHideSteps] = useState(false);
  const [userGuess, setUserGuess] = useState('');
  const [checkFeedback, setCheckFeedback] = useState<{
    status: 'pass' | 'fail';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (initialCalcId === 'examples') {
      setSectionMode('examples');
    } else if (initialCalcId) {
      setSectionMode('calculators');
      setActiveCalc(initialCalcId as CalcId);
    }
  }, [initialCalcId]);

  useEffect(() => {
    setUserGuess('');
    setCheckFeedback(null);
  }, [activeCalc]);

  const [exampleModuleFilter, setExampleModuleFilter] = useState<'all' | SyllabusModule>('all');
  const [expandedExample, setExpandedExample] = useState<string>(WORKED_EXAMPLES[0].id);

  // Calc 1: PCM & Overall SNR
  const [c1Fm, setC1Fm] = useState(4); // kHz
  const [c1OverPct, setC1OverPct] = useState(25); // % above Nyquist
  const [c1Bits, setC1Bits] = useState(8);
  const [c1PeExp, setC1PeExp] = useState(-5); // Pe = 10^c1PeExp

  // Calc 2: TDM Frame
  const [c2Channels, setC2Channels] = useState(24);
  const [c2Fs, setC2Fs] = useState(8); // kHz
  const [c2Bits, setC2Bits] = useState(8);
  const [c2SyncBits, setC2SyncBits] = useState(1);

  // Calc 3: Companding
  const [c3Type, setC3Type] = useState<'mu' | 'a'>('mu');
  const [c3Param, setC3Param] = useState(255);
  const [c3X, setC3X] = useState(0.05);

  // Calc 4: Shannon
  const [c4BwKhz, setC4BwKhz] = useState(3.4);
  const [c4SnrDb, setC4SnrDb] = useState(30);

  // Calc 5: Delta Modulation
  const [c5Am, setC5Am] = useState(2.0);
  const [c5FmKhz, setC5FmKhz] = useState(1.0);
  const [c5FsKhz, setC5FsKhz] = useState(32);
  const [c5Delta, setC5Delta] = useState(0.5);
  const [c5WKhz, setC5WKhz] = useState(4.0);

  // Calc 6: Modulation
  const [c6Scheme, setC6Scheme] = useState<DigitalModScheme>('qpsk');
  const [c6RbMbps, setC6RbMbps] = useState(24);
  const [c6EbNoDb, setC6EbNoDb] = useState(10);

  const calc1Result = useMemo(() => {
    const fNyq = 2 * c1Fm;
    const fs = fNyq * (1 + c1OverPct / 100);
    const rb = c1Bits * fs;
    const pe = Math.pow(10, c1PeExp);
    const snr = calculateOverallPcmSnr(c1Bits, pe);
    return { fNyq, fs, rb, pe, ...snr };
  }, [c1Fm, c1OverPct, c1Bits, c1PeExp]);

  const calc2Result = useMemo(() => {
    const bitsPerFrame = c2Channels * c2Bits + c2SyncBits;
    const tfUs = 1000 / c2Fs;
    const rbMbps = (bitsPerFrame * c2Fs) / 1000;
    const tbNs = 1000 / rbMbps;
    return { bitsPerFrame, tfUs, rbMbps, tbNs };
  }, [c2Channels, c2Fs, c2Bits, c2SyncBits]);

  const calc3Result = useMemo(() => {
    const y =
      c3Type === 'mu'
        ? muLawCompress(c3X, c3Param)
        : aLawCompress(c3X, Math.max(1, c3Param));
    const gain = Math.abs(c3X) > 1e-6 ? Math.abs(y / c3X) : 1;
    const gainDb = 20 * Math.log10(Math.max(gain, 1e-6));
    return { y, gain, gainDb };
  }, [c3Type, c3Param, c3X]);

  const calc4Result = useMemo(() => {
    const snrLin = dbToLinear(c4SnrDb);
    const capKbps = c4BwKhz * Math.log2(1 + snrLin);
    const eta = capKbps / Math.max(c4BwKhz, 0.001);
    return { snrLin, capKbps, eta };
  }, [c4BwKhz, c4SnrDb]);

  const calc5Result = useMemo(() => {
    const fsHz = c5FsKhz * 1000;
    const fmHz = c5FmKhz * 1000;
    const wHz = c5WKhz * 1000;
    const maxSlope = 2 * Math.PI * fmHz * c5Am;
    const minDelta = maxSlope / fsHz;
    const overloaded = c5Delta < minDelta;
    const nq = (c5Delta * c5Delta * wHz) / (3 * fsHz);
    const sigPower = (c5Am * c5Am) / 2;
    const snrDb = 10 * Math.log10(sigPower / Math.max(nq, 1e-12));
    return { maxSlope, minDelta, overloaded, nq, snrDb };
  }, [c5Am, c5FmKhz, c5FsKhz, c5Delta, c5WKhz]);

  const calc6Result = useMemo(() => {
    const info = MODULATION_CATALOG[c6Scheme];
    const k = info.bitsPerSymbol;
    const rsMBaud = c6RbMbps / k;
    const bNullMhz =
      c6Scheme === 'msk'
        ? 1.5 * c6RbMbps
        : c6Scheme === 'bfsk_coh' || c6Scheme === 'bfsk_noncoh'
        ? 3 * c6RbMbps
        : 2 * rsMBaud;
    const eta = c6RbMbps / bNullMhz;
    const ber = computeBer(c6Scheme, c6EbNoDb);
    return { info, k, rsMBaud, bNullMhz, eta, ber };
  }, [c6Scheme, c6RbMbps, c6EbNoDb]);

  const filteredExamples =
    exampleModuleFilter === 'all'
      ? WORKED_EXAMPLES
      : WORKED_EXAMPLES.filter((e) => e.module === exampleModuleFilter);

  const activeCalcMeta = CALCULATORS.find((c) => c.id === activeCalc)!;

  const expectedCalcValue = useMemo(() => {
    switch (activeCalc) {
      case 'pcm_snr':
        return calc1Result.totalSnrDb;
      case 'tdm_frame':
        return calc2Result.rbMbps;
      case 'companding':
        return calc3Result.y;
      case 'shannon':
        return calc4Result.capKbps;
      case 'delta_mod':
        return calc5Result.minDelta;
      case 'modulation':
        return calc6Result.bNullMhz;
    }
  }, [activeCalc, calc1Result, calc2Result, calc3Result, calc4Result, calc5Result, calc6Result]);

  const handleVerifyCalculation = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(userGuess);
    if (userGuess.trim() === '' || Number.isNaN(parsed)) {
      setCheckFeedback({
        status: 'fail',
        message: 'Enter a numeric value before verifying.',
      });
      return;
    }

    const tol = Math.max(0.03, Math.abs(expectedCalcValue) * 0.025);
    const isCorrect = Math.abs(parsed - expectedCalcValue) <= tol;
    const solverKey = `calc:${activeCalc}`;

    if (isCorrect) {
      setCheckFeedback({
        status: 'pass',
        message: `Verified (${parsed} matches expected ${expectedCalcValue.toFixed(3)} ${activeCalcMeta.unitLabel}). Removed from Weak Topics.`,
      });
      setHideSteps(false);
      onResolveSolverAttempt(solverKey);
    } else {
      setCheckFeedback({
        status: 'fail',
        message: `Mismatch: entered ${parsed} ${activeCalcMeta.unitLabel}, expected ${expectedCalcValue.toFixed(3)} ${activeCalcMeta.unitLabel}. Flagged in Weak Topics.`,
      });
      setHideSteps(false);
      onRecordSolverFailure({
        id: solverKey,
        title: activeCalcMeta.label,
        module: activeCalcMeta.module,
        source: 'calculator',
        recommendedCalc: activeCalc,
        recommendedLab: activeCalcMeta.recommendedLab,
        lastReason: `Hand check missed ${activeCalcMeta.targetPrompt}: entered ${parsed}, expected ${expectedCalcValue.toFixed(2)} ${activeCalcMeta.unitLabel}.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Step-by-Step Formula Calculators &amp; Worked Exam Problems
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Verify your hand calculations line-by-line or drill 12 high-yield CAT &amp; final exam problems.
          </p>
        </div>

        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 shrink-0">
          <button
            type="button"
            onClick={() => setSectionMode('calculators')}
            className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              sectionMode === 'calculators'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Formula Calculators (6)
          </button>
          <button
            type="button"
            onClick={() => setSectionMode('examples')}
            className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              sectionMode === 'examples'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Worked Exam Bank (12)
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* MODE 1: CUSTOM STEP-BY-STEP FORMULA CALCULATORS                    */}
      {/* ================================================================== */}
      {sectionMode === 'calculators' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Calculator selector sidebar */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-3 space-y-1">
            {CALCULATORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCalc(c.id)}
                className={`cursor-pointer w-full rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                  activeCalc === c.id
                    ? 'bg-sky-50 text-sky-900 font-semibold border border-sky-200'
                    : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Active calculator inputs + algebraic substitution steps */}
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 space-y-6">
            {activeCalc === 'pcm_snr' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    PCM Bit Rate, Quantization SQNR &amp; Threshold Effect
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Computes Nyquist sampling, bit rate, quantization SNR, and overall channel-degraded SNR.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Signal Bandwidth fm (kHz)</span>
                    <input
                      type="number"
                      min={0.1}
                      step={0.5}
                      value={c1Fm}
                      onChange={(e) => setC1Fm(Math.max(0.1, Number(e.target.value) || 0.1))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-950"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Oversampling Above Nyquist (%)</span>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={c1OverPct}
                      onChange={(e) => setC1OverPct(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-950"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Bits per Sample (n)</span>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={c1Bits}
                      onChange={(e) =>
                        setC1Bits(Math.min(16, Math.max(1, parseInt(e.target.value, 10) || 1)))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-950"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Bit Error Probability Pe = 10^(exp)</span>
                    <input
                      type="number"
                      min={-9}
                      max={-1}
                      step={1}
                      value={c1PeExp}
                      onChange={(e) =>
                        setC1PeExp(Math.min(-1, Math.max(-9, Number(e.target.value) || -5)))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-950"
                    />
                  </label>
                </div>

                {!hideSteps && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5 font-mono text-xs text-slate-800">
                    <div>
                      <span className="text-slate-500">Step 1 · Nyquist &amp; Sampling Rate: </span>
                      f_Nyq = 2 × {c1Fm} = {calc1Result.fNyq.toFixed(2)} kHz → fs = {calc1Result.fs.toFixed(2)} kHz
                    </div>
                    <div>
                      <span className="text-slate-500">Step 2 · PCM Bit Rate: </span>
                      Rb = n × fs = {c1Bits} × {calc1Result.fs.toFixed(2)} ={' '}
                      <strong className="text-sky-700">{calc1Result.rb.toFixed(2)} kbps</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Step 3 · Quantization SQNR: </span>
                      6.02({c1Bits}) + 1.76 ={' '}
                      <strong className="text-slate-950">{calc1Result.sqnrDb.toFixed(2)} dB</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Step 4 · Overall SNR (with Pe = 10^{c1PeExp}): </span>
                      1.5 / (2^(-{2 * c1Bits}) + 4 × {calc1Result.pe.toExponential(1)}) ={' '}
                      <strong className={calc1Result.inThresholdRegion ? 'text-red-700' : 'text-emerald-700'}>
                        {calc1Result.totalSnrDb.toFixed(2)} dB
                      </strong>{' '}
                      ({calc1Result.inThresholdRegion ? 'PAST THRESHOLD — bit errors dominate' : 'ABOVE THRESHOLD — nominal'})
                    </div>
                  </div>
                )}
              </>
            )}

            {activeCalc === 'tdm_frame' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    TDM Frame Multiplexer &amp; Bit Timing
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Calculates bits per frame, frame period Tf, aggregate line rate Rb, and bit duration Tb.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Number of Channels (N_ch)</span>
                    <input
                      type="number"
                      min={1}
                      value={c2Channels}
                      onChange={(e) => setC2Channels(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Channel Sampling Rate fs (kHz)</span>
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={c2Fs}
                      onChange={(e) => setC2Fs(Math.max(0.5, Number(e.target.value) || 1))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Bits per Channel Sample (n)</span>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={c2Bits}
                      onChange={(e) => setC2Bits(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Sync / Framing Bits per Frame</span>
                    <input
                      type="number"
                      min={0}
                      value={c2SyncBits}
                      onChange={(e) => setC2SyncBits(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                </div>

                {!hideSteps && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5 font-mono text-xs text-slate-800">
                    <div>
                      <span className="text-slate-500">Step 1 · Bits / Frame: </span>
                      ({c2Channels} × {c2Bits}) + {c2SyncBits} ={' '}
                      <strong>{calc2Result.bitsPerFrame} bits/frame</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Step 2 · Frame Duration Tf: </span>
                      1 / {c2Fs} kHz = <strong>{calc2Result.tfUs.toFixed(2)} μs</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Step 3 · Aggregate Line Rate Rb: </span>
                      {calc2Result.bitsPerFrame} × {c2Fs} kHz ={' '}
                      <strong className="text-sky-700">{calc2Result.rbMbps.toFixed(4)} Mbps</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Step 4 · Bit Duration Tb: </span>
                      1 / Rb = <strong>{calc2Result.tbNs.toFixed(2)} ns</strong>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeCalc === 'companding' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    μ-Law &amp; A-Law Companding Output Solver
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluates normalized compressor output y and low-level amplitude boost.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Law Standard</span>
                    <select
                      value={c3Type}
                      onChange={(e) => {
                        const val = e.target.value as 'mu' | 'a';
                        setC3Type(val);
                        setC3Param(val === 'mu' ? 255 : 87.6);
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                    >
                      <option value="mu">μ-Law (North America)</option>
                      <option value="a">A-Law (ITU-T Europe)</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>{c3Type === 'mu' ? 'μ Parameter' : 'A Parameter'}</span>
                    <input
                      type="number"
                      step={0.1}
                      min={1}
                      value={c3Param}
                      onChange={(e) => setC3Param(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Normalized Input x ∈ [-1, 1]</span>
                    <input
                      type="number"
                      step={0.01}
                      min={-1}
                      max={1}
                      value={c3X}
                      onChange={(e) =>
                        setC3X(Math.min(1, Math.max(-1, Number(e.target.value) || 0)))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                </div>

                {!hideSteps && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5 font-mono text-xs text-slate-800">
                    <div>
                      <span className="text-slate-500">Governing Formula: </span>
                      {c3Type === 'mu'
                        ? 'y = sgn(x) · ln(1 + μ|x|) / ln(1 + μ)'
                        : Math.abs(c3X) < 1 / c3Param
                        ? 'Segment 1 (|x| < 1/A): y = sgn(x) · A|x| / (1 + ln A)'
                        : 'Segment 2 (|x| ≥ 1/A): y = sgn(x) · (1 + ln(A|x|)) / (1 + ln A)'}
                    </div>
                    <div>
                      <span className="text-slate-500">Compressed Output y: </span>
                      <strong className="text-sky-700">{calc3Result.y.toFixed(5)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Weak-Signal Step Boost |y/x|: </span>
                      <strong>
                        {calc3Result.gain.toFixed(2)}× (+{calc3Result.gainDb.toFixed(2)} dB)
                      </strong>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeCalc === 'shannon' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Shannon-Hartley Channel Capacity Calculator
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Converts SNR from dB to linear ratio and computes theoretical upper capacity C.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Channel Bandwidth B (kHz)</span>
                    <input
                      type="number"
                      min={0.1}
                      step={0.2}
                      value={c4BwKhz}
                      onChange={(e) => setC4BwKhz(Math.max(0.1, Number(e.target.value) || 0.1))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Channel SNR (dB)</span>
                    <input
                      type="number"
                      step={1}
                      value={c4SnrDb}
                      onChange={(e) => setC4SnrDb(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                </div>

                {!hideSteps && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5 font-mono text-xs text-slate-800">
                    <div>
                      <span className="text-slate-500">Step 1 · Linear S/N: </span>
                      10^({c4SnrDb}/10) = <strong>{calc4Result.snrLin.toFixed(3)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Step 2 · Channel Capacity C: </span>
                      {c4BwKhz} kHz × log2(1 + {calc4Result.snrLin.toFixed(3)}) ={' '}
                      <strong className="text-sky-700">{calc4Result.capKbps.toFixed(3)} kbps</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Step 3 · Max Spectral Efficiency C/B: </span>
                      <strong>{calc4Result.eta.toFixed(3)} bps/Hz</strong>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeCalc === 'delta_mod' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Delta Modulation Slope-Overload &amp; Noise Calculator
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Checks Δ · fs ≥ 2π · fm · Am and computes filtered granular noise power &amp; SNR.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Amplitude Am (V)</span>
                    <input
                      type="number"
                      step={0.1}
                      min={0.1}
                      value={c5Am}
                      onChange={(e) => setC5Am(Math.max(0.1, Number(e.target.value) || 0.1))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Message Freq fm (kHz)</span>
                    <input
                      type="number"
                      step={0.2}
                      min={0.1}
                      value={c5FmKhz}
                      onChange={(e) => setC5FmKhz(Math.max(0.1, Number(e.target.value) || 0.1))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>DM Sampling fs (kHz)</span>
                    <input
                      type="number"
                      step={1}
                      min={1}
                      value={c5FsKhz}
                      onChange={(e) => setC5FsKhz(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Step Size Δ (V)</span>
                    <input
                      type="number"
                      step={0.05}
                      min={0.01}
                      value={c5Delta}
                      onChange={(e) => setC5Delta(Math.max(0.01, Number(e.target.value) || 0.01))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>LPF Bandwidth W (kHz)</span>
                    <input
                      type="number"
                      step={0.5}
                      min={0.5}
                      value={c5WKhz}
                      onChange={(e) => setC5WKhz(Math.max(0.5, Number(e.target.value) || 0.5))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                </div>

                {!hideSteps && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5 font-mono text-xs text-slate-800">
                    <div>
                      <span className="text-slate-500">Step 1 · Max Input Slope: </span>
                      2π × {c5FmKhz * 1000} × {c5Am} ={' '}
                      <strong>{calc5Result.maxSlope.toFixed(1)} V/s</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Step 2 · Min Step Size Δ_min: </span>
                      {calc5Result.maxSlope.toFixed(1)} / {c5FsKhz * 1000} ={' '}
                      <strong className="text-sky-700">{calc5Result.minDelta.toFixed(4)} V</strong>{' '}
                      ({calc5Result.overloaded ? 'SLOPE OVERLOAD — increase Δ or fs' : 'NO SLOPE OVERLOAD'})
                    </div>
                    <div>
                      <span className="text-slate-500">Step 3 · Granular Noise Power Nq: </span>
                      (Δ²·W)/(3·fs) = <strong>{calc5Result.nq.toFixed(5)} V²</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Step 4 · Baseband DM SNR: </span>
                      10·log10((Am²/2) / Nq) = <strong>{calc5Result.snrDb.toFixed(2)} dB</strong>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeCalc === 'modulation' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Digital Modulation Bandwidth, Spectral Efficiency &amp; BER
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Computes baud rate Rs, null-to-null passband bandwidth, η, and bit error probability Pb.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Modulation Scheme</span>
                    <select
                      value={c6Scheme}
                      onChange={(e) => setC6Scheme(e.target.value as DigitalModScheme)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                    >
                      {(Object.keys(MODULATION_CATALOG) as DigitalModScheme[]).map((s) => (
                        <option key={s} value={s}>
                          {MODULATION_CATALOG[s].shortName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Bit Rate Rb (Mbps)</span>
                    <input
                      type="number"
                      step={1}
                      min={0.1}
                      value={c6RbMbps}
                      onChange={(e) => setC6RbMbps(Math.max(0.1, Number(e.target.value) || 0.1))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>Eb / N0 (dB)</span>
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      max={20}
                      value={c6EbNoDb}
                      onChange={(e) => setC6EbNoDb(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                </div>

                {!hideSteps && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5 font-mono text-xs text-slate-800">
                    <div>
                      <span className="text-slate-500">Step 1 · Symbol Rate (Rs = Rb / k): </span>
                      {c6RbMbps} Mbps / {calc6Result.k} ={' '}
                      <strong>{calc6Result.rsMBaud.toFixed(2)} MBaud</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Step 2 · Null-to-Null Bandwidth: </span>
                      <strong>{calc6Result.bNullMhz.toFixed(2)} MHz</strong> ({calc6Result.info.bandwidthFormula})
                    </div>
                    <div>
                      <span className="text-slate-500">Step 3 · Spectral Efficiency (η = Rb / B): </span>
                      <strong>{calc6Result.eta.toFixed(2)} bps/Hz</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Step 4 · Error Probability ({calc6Result.info.berFormulaLabel}): </span>
                      <strong className="text-sky-700">{formatSci(calc6Result.ber)}</strong>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Self-Check Hand Calculation Verifier */}
            <div className="border-t border-slate-200 pt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    Test Yourself: Verify Hand Calculation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hide steps, compute <strong>{activeCalcMeta.targetPrompt}</strong> on paper, and verify—errors automatically log to Weak Topics.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHideSteps((prev) => !prev)}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
                >
                  {hideSteps ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  <span>{hideSteps ? 'Reveal Steps' : 'Hide Steps'}</span>
                </button>
              </div>

              {hideSteps && (
                <div className="rounded-lg border border-slate-200 bg-slate-100/70 px-4 py-3 text-xs text-slate-600">
                  Derivation steps hidden for self-testing. Enter your computed{' '}
                  <span className="font-mono font-semibold text-slate-800">
                    {activeCalcMeta.targetPrompt}
                  </span>{' '}
                  below or click Reveal Steps.
                </div>
              )}

              <form onSubmit={handleVerifyCalculation} className="flex flex-wrap items-center gap-2.5">
                <input
                  type="number"
                  step="any"
                  value={userGuess}
                  onChange={(e) => setUserGuess(e.target.value)}
                  placeholder={`Enter ${activeCalcMeta.targetPrompt}`}
                  className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-950 focus:border-sky-600 focus:outline-none"
                />
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  Verify Answer
                </button>
              </form>

              {checkFeedback && (
                <div
                  className={`flex items-start gap-2 rounded-lg border p-3 text-xs font-medium ${
                    checkFeedback.status === 'pass'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-800'
                  }`}
                >
                  {checkFeedback.status === 'pass' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>{checkFeedback.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODE 2: WORKED EXAM PROBLEM BANK (12 PROBLEMS)                     */}
      {/* ================================================================== */}
      {sectionMode === 'examples' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              {[
                { id: 'all', label: 'All (12)' },
                { id: SyllabusModule.PCM, label: 'PCM Systems (4)' },
                { id: SyllabusModule.COMPRESSION, label: 'Compression (4)' },
                { id: SyllabusModule.MODULATION, label: 'Modulation (4)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setExampleModuleFilter(tab.id as 'all' | SyllabusModule)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    exampleModuleFilter === tab.id
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="font-mono text-xs text-slate-600 tabular-nums">
              {masteredExamples.length} / {WORKED_EXAMPLES.length} Mastered
            </span>
          </div>

          <div className="space-y-3">
            {filteredExamples.map((ex) => {
              const isOpen = expandedExample === ex.id;
              const isMastered = masteredExamples.includes(ex.id);
              const isFlaggedWeak = failedSolverAttempts.some((f) => f.id === ex.id);
              return (
                <div
                  key={ex.id}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleMastered(ex.id)}
                        aria-label={`Mark ${ex.title} mastered`}
                        className="cursor-pointer mt-0.5 text-slate-400 hover:text-emerald-600 shrink-0"
                      >
                        {isMastered ? (
                          <CheckCircle2 className="animate-master-pop h-5 w-5 text-emerald-600" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{MODULE_META[ex.module].title}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              ex.catRelevance === 'CAT High-Yield'
                                ? 'font-semibold text-amber-700'
                                : 'text-slate-600'
                            }
                          >
                            {ex.catRelevance}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-950 mt-0.5">
                          {ex.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (isFlaggedWeak) {
                            onResolveSolverAttempt(ex.id);
                          } else {
                            onRecordSolverFailure({
                              id: ex.id,
                              title: ex.title,
                              module: ex.module,
                              source: 'example',
                              recommendedCalc: 'examples',
                              lastReason: 'Flagged during worked problem practice for CAT review.',
                            });
                          }
                        }}
                        className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          isFlaggedWeak
                            ? 'border-red-300 bg-red-50 text-red-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>{isFlaggedWeak ? 'Flagged Weak' : 'Flag Weak'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedExample(isOpen ? '' : ex.id)}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 shrink-0"
                      >
                        <span>{isOpen ? 'Hide Solution' : 'Solve & View Steps'}</span>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-200 bg-slate-50/50 p-5 space-y-5">
                      <p className="text-sm leading-relaxed text-slate-800 font-medium">
                        {ex.problemStatement}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-1.5">
                          <h4 className="font-semibold text-slate-900">Given</h4>
                          <ul className="space-y-1 font-mono text-slate-700">
                            {ex.given.map((g) => (
                              <li key={g}>{g}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-1.5">
                          <h4 className="font-semibold text-slate-900">Find</h4>
                          <ul className="space-y-1 font-mono text-slate-700">
                            {ex.find.map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-1.5">
                          <h4 className="font-semibold text-slate-900">Governing Equations</h4>
                          <ul className="space-y-1 font-mono text-sky-800">
                            {ex.governingEquations.map((eq) => (
                              <li key={eq}>{eq}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <h4 className="text-xs font-semibold text-slate-900">
                          Step-by-Step Solution
                        </h4>
                        <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                          {ex.steps.map((st) => (
                            <div key={st.label} className="p-3.5 space-y-1">
                              <div className="text-xs font-semibold text-slate-700">{st.label}</div>
                              <div className="font-mono text-xs text-slate-950">{st.calculation}</div>
                              {st.note && (
                                <div className="text-xs text-slate-500">{st.note}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5">
                          <div className="font-semibold text-emerald-900">Final Answer</div>
                          <div className="mt-1 font-mono font-semibold text-emerald-800">
                            {ex.finalAnswer}
                          </div>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5">
                          <div className="font-semibold text-amber-900">Common CAT / Exam Trap</div>
                          <div className="mt-1 text-amber-900">{ex.examTrap}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
