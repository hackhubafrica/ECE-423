import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
} from 'lucide-react';
import {
  aLawCompress,
  aLawExpand,
  computeBer,
  formatSci,
  LINE_CODE_INFO,
  MODULATION_CATALOG,
  muLawCompress,
  muLawExpand,
  seededGaussian,
} from '../utils/dspMath';
import {
  DigitalModScheme,
  LabType,
  LineCodingScheme,
} from '../types/ece423';

interface SignalLabsViewProps {
  activeLab: LabType;
  onSelectLab: (lab: LabType) => void;
}

const LAB_TABS: { id: LabType; label: string }[] = [
  { id: LabType.SAMPLING_PCM, label: '01. Nyquist & PCM' },
  { id: LabType.COMPANDING, label: '02. μ-Law & A-Law' },
  { id: LabType.LINE_CODING, label: '03. Line Coding' },
  { id: LabType.DELTA_MOD, label: '04. Delta Modulation' },
  { id: LabType.DIGITAL_MOD, label: '05. Digital Modulation' },
];

export const SignalLabsView: React.FC<SignalLabsViewProps> = ({
  activeLab,
  onSelectLab,
}) => {
  // Lab 1: Sampling & PCM
  const [fm, setFm] = useState(2.0); // kHz
  const [fs, setFs] = useState(6.0); // kHz
  const [nBits, setNBits] = useState(3); // bits/sample
  const [amplitude, setAmplitude] = useState(1.0); // V
  const [phaseSweep, setPhaseSweep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Lab 2: Companding
  const [compMode, setCompMode] = useState<'mu' | 'a'>('mu');
  const [muVal, setMuVal] = useState(255);
  const [aVal, setAVal] = useState(87.6);
  const [testInputX, setTestInputX] = useState(0.08);

  // Lab 3: Line Coding
  const [bitString, setBitString] = useState('1011000110');
  const [lineScheme, setLineScheme] = useState<LineCodingScheme>('manchester');

  // Lab 4: Delta Modulation
  const [dmFm, setDmFm] = useState(1.0); // kHz
  const [dmAm, setDmAm] = useState(1.5); // V
  const [dmFs, setDmFs] = useState(24); // kHz
  const [dmDelta, setDmDelta] = useState(0.45); // V

  // Lab 5: Digital Modulation
  const [modScheme, setModScheme] = useState<DigitalModScheme>('qpsk');
  const [ebNoDb, setEbNoDb] = useState(10); // dB
  const [modBits, setModBits] = useState('10110100');

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setPhaseSweep((p) => (p + 0.08) % (2 * Math.PI));
    }, 50);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  // --- Lab 1 derived math ---
  const pcmMath = useMemo(() => {
    const nyquistRate = 2 * fm;
    const isAliased = fs < nyquistRate;
    const aliasFreq = isAliased
      ? Math.abs(fm - Math.round(fm / fs) * fs)
      : fm;
    const levels = Math.pow(2, nBits);
    const stepSize = (2 * 1.2) / levels; // full-scale +-1.2V reference
    const sqnrDb = 6.02 * nBits + 1.76;
    const bitRate = nBits * fs;

    const T = 1.0; // 1 ms window (time in ms, freq in kHz -> f*t cycles)
    const continuousPts: { t: number; y: number }[] = [];
    const aliasedPts: { t: number; y: number }[] = [];
    for (let i = 0; i <= 220; i++) {
      const t = (i / 220) * T;
      const y = amplitude * Math.sin(2 * Math.PI * fm * t + phaseSweep);
      // Sampled spectrum reconstruction alias wave when fs < 2fm
      const yAlias = isAliased
        ? amplitude *
          Math.sin(
            2 * Math.PI * (fm - Math.round(fm / fs) * fs) * t + phaseSweep
          )
        : y;
      continuousPts.push({ t, y });
      aliasedPts.push({ t, y: yAlias });
    }

    const numSamples = Math.max(2, Math.floor(fs * T) + 1);
    const samples: { t: number; y: number; yQ: number; code: string }[] = [];
    for (let k = 0; k < numSamples; k++) {
      const t = k / fs;
      if (t > T + 1e-6) break;
      const y = amplitude * Math.sin(2 * Math.PI * fm * t + phaseSweep);
      // Mid-rise / uniform mapping in [-1.2, 1.2]
      const clamped = Math.max(-1.199, Math.min(1.199, y));
      const idx = Math.min(
        levels - 1,
        Math.max(0, Math.floor((clamped + 1.2) / stepSize))
      );
      const yQ = -1.2 + (idx + 0.5) * stepSize;
      const code = idx.toString(2).padStart(nBits, '0');
      samples.push({ t, y, yQ, code });
    }

    return {
      nyquistRate,
      isAliased,
      aliasFreq,
      levels,
      stepSize,
      sqnrDb,
      bitRate,
      continuousPts,
      aliasedPts,
      samples,
    };
  }, [fm, fs, nBits, amplitude, phaseSweep]);

  // --- Lab 2 derived math ---
  const compMath = useMemo(() => {
    const compress = (x: number) =>
      compMode === 'mu' ? muLawCompress(x, muVal) : aLawCompress(x, aVal);
    const expand = (y: number) =>
      compMode === 'mu' ? muLawExpand(y, muVal) : aLawExpand(y, aVal);

    const curvePts: { x: number; y: number }[] = [];
    for (let i = -100; i <= 100; i++) {
      const x = i / 100;
      curvePts.push({ x, y: compress(x) });
    }

    const compressedY = compress(testInputX);
    const expandedX = expand(compressedY);
    const gainRatio =
      Math.abs(testInputX) > 1e-4 ? Math.abs(compressedY / testInputX) : 1;
    const gainDb = 20 * Math.log10(Math.max(gainRatio, 1e-4));

    // Step density ticks on x-axis from uniform y-levels (8 levels positive)
    const inputThresholds: number[] = [];
    for (let i = 0; i <= 8; i++) {
      const yTick = i / 8;
      inputThresholds.push(expand(yTick));
    }

    return {
      curvePts,
      compressedY,
      expandedX,
      gainRatio,
      gainDb,
      inputThresholds,
    };
  }, [compMode, muVal, aVal, testInputX]);

  // --- Lab 3 derived math ---
  const cleanBits = useMemo(() => {
    const filtered = bitString.replace(/[^01]/g, '');
    return filtered.length > 0 ? filtered.slice(0, 14) : '10110010';
  }, [bitString]);

  const lineMath = useMemo(() => {
    const bits = cleanBits.split('').map(Number);
    // Build step segments over [0, bits.length]
    const segments: { x1: number; x2: number; y: number }[] = [];
    let amiPolarity = 1;
    let dcSum = 0;
    let maxZeroRun = 0;
    let currZeroRun = 0;
    let maxOneRun = 0;
    let currOneRun = 0;

    bits.forEach((b, i) => {
      if (b === 0) {
        currZeroRun++;
        currOneRun = 0;
      } else {
        currOneRun++;
        currZeroRun = 0;
      }
      maxZeroRun = Math.max(maxZeroRun, currZeroRun);
      maxOneRun = Math.max(maxOneRun, currOneRun);

      if (lineScheme === 'unipolar_nrz') {
        const v = b === 1 ? 1 : 0;
        segments.push({ x1: i, x2: i + 1, y: v });
        dcSum += v;
      } else if (lineScheme === 'polar_nrz') {
        const v = b === 1 ? 1 : -1;
        segments.push({ x1: i, x2: i + 1, y: v });
        dcSum += v;
      } else if (lineScheme === 'polar_rz') {
        const v = b === 1 ? 1 : -1;
        segments.push({ x1: i, x2: i + 0.5, y: v });
        segments.push({ x1: i + 0.5, x2: i + 1, y: 0 });
        dcSum += v * 0.5;
      } else if (lineScheme === 'manchester') {
        // IEEE 802.3: 1 = low-to-high (-1 -> +1), 0 = high-to-low (+1 -> -1)
        const v1 = b === 1 ? -1 : 1;
        const v2 = b === 1 ? 1 : -1;
        segments.push({ x1: i, x2: i + 0.5, y: v1 });
        segments.push({ x1: i + 0.5, x2: i + 1, y: v2 });
      } else if (lineScheme === 'bipolar_ami') {
        if (b === 0) {
          segments.push({ x1: i, x2: i + 1, y: 0 });
        } else {
          segments.push({ x1: i, x2: i + 1, y: amiPolarity });
          dcSum += amiPolarity;
          amiPolarity *= -1;
        }
      }
    });

    const dcAvg = dcSum / bits.length;
    const syncRisk =
      (lineScheme === 'unipolar_nrz' || lineScheme === 'polar_nrz') &&
      (maxZeroRun >= 3 || maxOneRun >= 3)
        ? 'SYNC RISK (Long constant run)'
        : lineScheme === 'bipolar_ami' && maxZeroRun >= 4
        ? 'SYNC RISK (Long 0-run — needs B8ZS/HDB3)'
        : 'SYNC STABLE';

    return {
      bits,
      segments,
      dcAvg,
      syncRisk,
      info: LINE_CODE_INFO[lineScheme],
    };
  }, [cleanBits, lineScheme]);

  // --- Lab 4 derived math ---
  const dmMath = useMemo(() => {
    const T = 1.5; // 1.5 ms window
    const maxSlope = 2 * Math.PI * dmFm * dmAm; // V/ms
    const trackerSlope = dmDelta * dmFs; // V/ms
    const minDelta = maxSlope / dmFs;
    const isOverloaded = trackerSlope < maxSlope;
    const isGranularHeavy = dmDelta > minDelta * 1.8 && !isOverloaded;

    const analogPts: { t: number; y: number }[] = [];
    for (let i = 0; i <= 200; i++) {
      const t = (i / 200) * T;
      analogPts.push({
        t,
        y: dmAm * Math.sin(2 * Math.PI * dmFm * t + phaseSweep),
      });
    }

    const totalSamples = Math.max(4, Math.floor(dmFs * T));
    const staircasePts: { t: number; yHat: number; overload: boolean }[] = [];
    const dmBits: number[] = [];
    let yHat = dmAm * Math.sin(phaseSweep); // start near initial signal
    let mse = 0;

    for (let k = 0; k < totalSamples; k++) {
      const t = k / dmFs;
      const m = dmAm * Math.sin(2 * Math.PI * dmFm * t + phaseSweep);
      const err = m - yHat;
      const bit = err >= 0 ? 1 : 0;
      dmBits.push(bit);
      const nextYHat = yHat + (bit === 1 ? dmDelta : -dmDelta);
      const overload = Math.abs(err) > dmDelta * 1.15;
      staircasePts.push({ t, yHat, overload });
      yHat = nextYHat;
      mse += err * err;
    }
    mse /= totalSamples;
    const sigPower = (dmAm * dmAm) / 2;
    const simSnrDb = 10 * Math.log10(Math.max(sigPower / Math.max(mse, 1e-6), 1e-4));

    return {
      maxSlope,
      trackerSlope,
      minDelta,
      isOverloaded,
      isGranularHeavy,
      analogPts,
      staircasePts,
      dmBits: dmBits.slice(0, 24).join(''),
      simSnrDb,
    };
  }, [dmFm, dmAm, dmFs, dmDelta, phaseSweep]);

  // --- Lab 5 derived math ---
  const modMath = useMemo(() => {
    const info = MODULATION_CATALOG[modScheme];
    const ber = computeBer(modScheme, ebNoDb);
    const gamma = Math.pow(10, ebNoDb / 10);
    // Noise standard deviation sigma on normalized unit-energy constellation
    const noiseSigma = Math.min(0.45, 1 / Math.sqrt(2 * gamma));

    // Ideal constellation points (I, Q)
    let idealPoints: { i: number; q: number; label: string }[] = [];
    if (modScheme === 'ask') {
      idealPoints = [
        { i: 0, q: 0, label: '0' },
        { i: 1.414, q: 0, label: '1' },
      ];
    } else if (modScheme === 'bpsk' || modScheme === 'dpsk') {
      idealPoints = [
        { i: -1, q: 0, label: '0' },
        { i: 1, q: 0, label: '1' },
      ];
    } else if (modScheme === 'qpsk' || modScheme === 'msk') {
      const s = 1 / Math.SQRT2;
      idealPoints = [
        { i: s, q: s, label: '11' },
        { i: -s, q: s, label: '01' },
        { i: -s, q: -s, label: '00' },
        { i: s, q: -s, label: '10' },
      ];
    } else if (modScheme === 'bfsk_coh' || modScheme === 'bfsk_noncoh') {
      // Orthogonal basis (phi_1, phi_2)
      idealPoints = [
        { i: 1, q: 0, label: '0 (f1)' },
        { i: 0, q: 1, label: '1 (f2)' },
      ];
    } else if (modScheme === 'qam16') {
      const levels = [-0.95, -0.316, 0.316, 0.95];
      const gray = ['00', '01', '11', '10'];
      levels.forEach((iv, ix) => {
        levels.forEach((qv, qx) => {
          idealPoints.push({
            i: iv,
            q: qv,
            label: `${gray[ix]}${gray[qx]}`,
          });
        });
      });
    }

    // Generate deterministic noisy received symbols around ideal points
    const scatterPts: { i: number; q: number }[] = [];
    const samplesPerPoint = Math.max(8, Math.floor(96 / idealPoints.length));
    idealPoints.forEach((pt, idx) => {
      for (let s = 0; s < samplesPerPoint; s++) {
        const [ni, nq] = seededGaussian(idx * 100 + s + ebNoDb * 3.1);
        scatterPts.push({
          i: pt.i + ni * noiseSigma,
          q: pt.q + nq * noiseSigma,
        });
      }
    });

    // Generate passband modulated time-domain waveform
    const cleanModBits = modBits.replace(/[^01]/g, '') || '10110100';
    const bitsArr = cleanModBits.slice(0, 8).split('').map(Number);
    const k = info.bitsPerSymbol;
    const padded = [...bitsArr];
    while (padded.length % k !== 0) padded.push(0);
    const numSymbols = Math.max(1, padded.length / k);

    const wavePts: { x: number; y: number }[] = [];
    const totalPx = 280;
    for (let px = 0; px <= totalPx; px++) {
      const u = (px / totalPx) * numSymbols; // time in symbol periods
      const symIdx = Math.min(numSymbols - 1, Math.floor(u));
      const localT = u - symIdx;
      const symBits = padded.slice(symIdx * k, (symIdx + 1) * k);
      const val = parseInt(symBits.join(''), 2);
      const fcCycles = 3; // carrier cycles per symbol
      let y = 0;

      if (modScheme === 'ask') {
        y = val === 1 ? Math.sin(2 * Math.PI * fcCycles * localT) : 0;
      } else if (modScheme === 'bpsk') {
        const sign = val === 1 ? 1 : -1;
        y = sign * Math.sin(2 * Math.PI * fcCycles * localT);
      } else if (modScheme === 'dpsk') {
        // cumulative differential phase
        let phase = 0;
        for (let s = 0; s <= symIdx; s++) {
          if (padded[s] === 1) phase += Math.PI;
        }
        y = Math.sin(2 * Math.PI * fcCycles * localT + phase);
      } else if (modScheme === 'qpsk') {
        const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
        y = Math.sin(2 * Math.PI * fcCycles * localT + angles[val % 4]);
      } else if (modScheme === 'bfsk_coh' || modScheme === 'bfsk_noncoh') {
        const cycles = val === 1 ? 4.5 : 2.0;
        y = Math.sin(2 * Math.PI * cycles * localT);
      } else if (modScheme === 'msk') {
        // continuous phase integration: +0.5 cycle for 1, -0.5 cycle for 0
        let phaseAccum = 0;
        for (let s = 0; s < symIdx; s++) {
          phaseAccum += (padded[s] === 1 ? 1 : -1) * (Math.PI / 2);
        }
        const currSlope = (val === 1 ? 1 : -1) * (Math.PI / 2) * localT;
        y = Math.sin(2 * Math.PI * fcCycles * localT + phaseAccum + currSlope);
      } else if (modScheme === 'qam16') {
        const iCode = (val >> 2) & 0x3;
        const qCode = val & 0x3;
        const mapLvl = [-0.95, -0.35, 0.35, 0.95];
        const iAmp = mapLvl[iCode];
        const qAmp = mapLvl[qCode];
        y =
          (iAmp * Math.cos(2 * Math.PI * fcCycles * localT) -
            qAmp * Math.sin(2 * Math.PI * fcCycles * localT)) *
          0.75;
      }
      wavePts.push({ x: u, y });
    }

    return {
      info,
      ber,
      idealPoints,
      scatterPts,
      wavePts,
      numSymbols,
      bitsUsed: padded.join(''),
    };
  }, [modScheme, ebNoDb, modBits]);

  return (
    <div className="space-y-6">
      {/* Lab selector header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Interactive Signal &amp; Modulation Labs
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manipulate physical parameters to observe sampling, aliasing, companding, line sync, slope overload, and I/Q noise scatter live.
          </p>
        </div>
      </div>

      {/* Segmented Lab Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1.5">
        {LAB_TABS.map((tab) => {
          const active = activeLab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectLab(tab.id)}
              className={`cursor-pointer rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ================================================================== */}
      {/* LAB 1: NYQUIST SAMPLING, ALIASING & PCM QUANTIZATION               */}
      {/* ================================================================== */}
      {activeLab === LabType.SAMPLING_PCM && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Zone: Interactive Stage (65%) */}
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Time-Domain Sampling &amp; Quantization Oscilloscope
                </h2>
                <p className="text-xs text-slate-500">
                  Solid blue: analog input m(t) · Dashed amber: reconstructed wave · Stepped emerald: {nBits}-bit quantized PCM
                </p>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
                  pcmMath.isAliased
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {pcmMath.isAliased ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>ALIASING DETECTED (fs &lt; 2·fm)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>NOMINAL NYQUIST SAMPLING</span>
                  </>
                )}
              </div>
            </div>

            <svg
              viewBox="0 0 720 320"
              className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/70"
              role="img"
              aria-label="Nyquist sampling and PCM quantization waveform plot"
            >
              {/* Grid lines */}
              {[0.2, 0.4, 0.6, 0.8].map((frac) => (
                <line
                  key={`v-${frac}`}
                  x1={50 + frac * 640}
                  y1={20}
                  x2={50 + frac * 640}
                  y2={280}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
              ))}
              {[-1.0, -0.5, 0, 0.5, 1.0].map((v) => {
                const y = 150 - (v / 1.3) * 120;
                return (
                  <g key={`h-${v}`}>
                    <line
                      x1={50}
                      y1={y}
                      x2={690}
                      y2={y}
                      stroke={v === 0 ? '#94a3b8' : '#e2e8f0'}
                      strokeWidth={v === 0 ? '1.2' : '1'}
                    />
                    <text
                      x={42}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 font-mono text-[10px]"
                    >
                      {v.toFixed(1)}V
                    </text>
                  </g>
                );
              })}

              {/* Quantization horizontal level guides */}
              {Array.from({ length: Math.min(pcmMath.levels, 32) }).map((_, idx) => {
                const step = (2 * 1.2) / Math.min(pcmMath.levels, 32);
                const levelV = -1.2 + (idx + 0.5) * step;
                const y = 150 - (levelV / 1.3) * 120;
                return (
                  <line
                    key={`q-${idx}`}
                    x1={50}
                    y1={y}
                    x2={690}
                    y2={y}
                    stroke="#cbd5e1"
                    strokeDasharray="2 4"
                    strokeWidth="0.7"
                  />
                );
              })}

              {/* Continuous analog signal */}
              <path
                d={pcmMath.continuousPts
                  .map((p, idx) => {
                    const x = 50 + p.t * 640;
                    const y = 150 - (p.y / 1.3) * 120;
                    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.2"
              />

              {/* Aliased reconstruction if fs < 2fm */}
              {pcmMath.isAliased && (
                <path
                  d={pcmMath.aliasedPts
                    .map((p, idx) => {
                      const x = 50 + p.t * 640;
                      const y = 150 - (p.y / 1.3) * 120;
                      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
              )}

              {/* Quantized zero-order-hold staircase */}
              {pcmMath.samples.length > 1 && (
                <path
                  d={pcmMath.samples
                    .map((s, idx) => {
                      const x = 50 + s.t * 640;
                      const y = 150 - (s.yQ / 1.3) * 120;
                      const nextX =
                        idx < pcmMath.samples.length - 1
                          ? 50 + pcmMath.samples[idx + 1].t * 640
                          : 690;
                      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} L ${nextX.toFixed(1)} ${y.toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="1.8"
                />
              )}

              {/* Sample impulse stems & dots */}
              {pcmMath.samples.map((s, idx) => {
                const x = 50 + s.t * 640;
                const y = 150 - (s.y / 1.3) * 120;
                return (
                  <g key={`smp-${idx}`}>
                    <line
                      x1={x}
                      y1={150}
                      x2={x}
                      y2={y}
                      stroke="#0f172a"
                      strokeOpacity="0.35"
                      strokeWidth="1"
                    />
                    <circle cx={x} cy={y} r="3.5" fill="#0f172a" />
                  </g>
                );
              })}

              {/* X-axis label */}
              <text
                x={370}
                y={305}
                textAnchor="middle"
                className="fill-slate-600 font-mono text-[11px]"
              >
                Time Window: 0.0 ms to 1.0 ms
              </text>
            </svg>

            {/* Encoded PCM Bitstream preview */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Encoded PCM Output Words (First 8 Samples)</span>
                <span className="font-mono tabular-nums">
                  {pcmMath.levels} Levels ({nBits} bits/sample)
                </span>
              </div>
              <div className="flex flex-wrap gap-2 font-mono text-xs font-semibold text-slate-900">
                {pcmMath.samples.slice(0, 8).map((s, idx) => (
                  <span
                    key={`code-${idx}`}
                    className="rounded border border-slate-200 bg-white px-2 py-1 tabular-nums"
                  >
                    S{idx}: {s.code}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Zone: Control & Concept Deck (35%) */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-950">Parameter Controls</h3>
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Sweep'}</span>
              </button>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>Signal Frequency (fm)</span>
                  <span className="font-mono tabular-nums text-slate-950">{fm.toFixed(1)} kHz</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={6.0}
                  step={0.5}
                  value={fm}
                  onChange={(e) => setFm(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>Sampling Rate (fs)</span>
                  <span className="font-mono tabular-nums text-slate-950">{fs.toFixed(1)} kHz</span>
                </div>
                <input
                  type="range"
                  min={2.0}
                  max={20.0}
                  step={0.5}
                  value={fs}
                  onChange={(e) => setFs(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>Quantizer Bit Depth (n)</span>
                  <span className="font-mono tabular-nums text-slate-950">{nBits} bits</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={6}
                  step={1}
                  value={nBits}
                  onChange={(e) => setNBits(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>Input Amplitude (Am)</span>
                  <span className="font-mono tabular-nums text-slate-950">{amplitude.toFixed(2)} V</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={1.15}
                  step={0.05}
                  value={amplitude}
                  onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>
            </div>

            {/* Live telemetry readout */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Nyquist Rate (2·fm)</span>
                <span className="font-mono font-semibold tabular-nums text-slate-950">
                  {pcmMath.nyquistRate.toFixed(1)} kHz
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Step Size (Δ)</span>
                <span className="font-mono font-semibold tabular-nums text-slate-950">
                  {pcmMath.stepSize.toFixed(4)} V
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">PCM Bit Rate (Rb = n·fs)</span>
                <span className="font-mono font-semibold tabular-nums text-slate-950">
                  {pcmMath.bitRate.toFixed(1)} kbps
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Theoretical SQNR</span>
                <span className="font-mono font-semibold tabular-nums text-sky-700">
                  {pcmMath.sqnrDb.toFixed(2)} dB
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              <strong>Exam Insight:</strong> Drop <em>fs</em> below 2·<em>fm</em> to watch the dashed amber alias frequency appear. Increasing <em>n</em> by 1 bit halves Δ and adds +6.02 dB SQNR.
            </p>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* LAB 2: MU-LAW & A-LAW COMPANDING                                   */}
      {/* ================================================================== */}
      {activeLab === LabType.COMPANDING && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Logarithmic Compressor Characteristic y = F(x)
                </h2>
                <p className="text-xs text-slate-500">
                  Blue curve: non-linear companding · Dashed gray: linear uniform quantizer · Vertical ticks: effective step density
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-sky-700">
                {compMode === 'mu' ? `μ = ${muVal} (North America / Japan)` : `A = ${aVal} (ITU-T Europe)`}
              </span>
            </div>

            <svg
              viewBox="0 0 640 340"
              className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/70"
              role="img"
              aria-label="Companding transfer curve plot"
            >
              {/* Coordinate axes centered at (320, 170) */}
              <line x1={60} y1={170} x2={580} y2={170} stroke="#94a3b8" strokeWidth="1.2" />
              <line x1={320} y1={25} x2={320} y2={315} stroke="#94a3b8" strokeWidth="1.2" />

              {/* Bounding square [-1, 1] x [-1, 1] */}
              <rect
                x={120}
                y={40}
                width={400}
                height={260}
                fill="none"
                stroke="#cbd5e1"
                strokeDasharray="4 4"
              />

              {/* Linear reference y = x */}
              <line
                x1={120}
                y1={300}
                x2={520}
                y2={40}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                strokeWidth="1.4"
              />

              {/* Companding curve */}
              <path
                d={compMath.curvePts
                  .map((p, idx) => {
                    const sx = 320 + p.x * 200;
                    const sy = 170 - p.y * 130;
                    return `${idx === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.6"
              />

              {/* Non-uniform quantization decision ticks along positive x-axis */}
              {compMath.inputThresholds.map((xt, idx) => {
                const sx = 320 + xt * 200;
                return (
                  <line
                    key={`tick-${idx}`}
                    x1={sx}
                    y1={164}
                    x2={sx}
                    y2={176}
                    stroke="#059669"
                    strokeWidth="2"
                  />
                );
              })}

              {/* Highlighted operating point */}
              <line
                x1={320 + testInputX * 200}
                y1={170}
                x2={320 + testInputX * 200}
                y2={170 - compMath.compressedY * 130}
                stroke="#d97706"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
              <line
                x1={320}
                y1={170 - compMath.compressedY * 130}
                x2={320 + testInputX * 200}
                y2={170 - compMath.compressedY * 130}
                stroke="#d97706"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
              <circle
                cx={320 + testInputX * 200}
                cy={170 - compMath.compressedY * 130}
                r="5.5"
                fill="#d97706"
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              <text x={530} y={174} className="fill-slate-600 font-mono text-[11px]">
                +1.0 (x)
              </text>
              <text x={326} y={35} className="fill-slate-600 font-mono text-[11px]">
                +1.0 (y)
              </text>
            </svg>
          </div>

          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <h3 className="text-sm font-semibold text-slate-950 border-b border-slate-100 pb-3">
              Companding Controls
            </h3>

            <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setCompMode('mu')}
                className={`cursor-pointer rounded-md py-1.5 text-xs font-semibold transition-colors ${
                  compMode === 'mu' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                }`}
              >
                μ-Law
              </button>
              <button
                type="button"
                onClick={() => setCompMode('a')}
                className={`cursor-pointer rounded-md py-1.5 text-xs font-semibold transition-colors ${
                  compMode === 'a' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                }`}
              >
                A-Law
              </button>
            </div>

            {compMode === 'mu' ? (
              <label className="block space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>Compression Factor (μ)</span>
                  <span className="font-mono tabular-nums text-slate-950">{muVal}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={255}
                  step={5}
                  value={muVal}
                  onChange={(e) => setMuVal(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </label>
            ) : (
              <label className="block space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>Compression Factor (A)</span>
                  <span className="font-mono tabular-nums text-slate-950">{aVal.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={0.6}
                  value={aVal}
                  onChange={(e) => setAVal(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>
            )}

            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>Normalized Input Sample (x)</span>
                <span className="font-mono tabular-nums text-slate-950">
                  {testInputX.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={-0.95}
                max={0.95}
                step={0.01}
                value={testInputX}
                onChange={(e) => setTestInputX(parseFloat(e.target.value))}
                className="w-full"
              />
            </label>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Compressed Output y</span>
                <span className="font-mono font-semibold tabular-nums text-sky-700">
                  {compMath.compressedY.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Expanded Recovery x̂</span>
                <span className="font-mono font-semibold tabular-nums text-slate-950">
                  {compMath.expandedX.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Amplitude Gain |y / x|</span>
                <span className="font-mono font-semibold tabular-nums text-emerald-700">
                  {compMath.gainRatio.toFixed(2)}× ({compMath.gainDb.toFixed(1)} dB)
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              <strong>Look at the green ticks on +x:</strong> Logarithmic compression packs quantization steps densely near 0 V so quiet speech samples experience far smaller step errors.
            </p>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* LAB 3: LINE CODING & SYNCHRONIZATION                               */}
      {/* ================================================================== */}
      {activeLab === LabType.LINE_CODING && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  {lineMath.info.name} Baseband Waveform
                </h2>
                <p className="text-xs text-slate-500">
                  Bit sequence: <span className="font-mono font-semibold text-slate-800">{cleanBits}</span>
                </p>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
                  lineMath.syncRisk.startsWith('SYNC RISK')
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {lineMath.syncRisk.startsWith('SYNC RISK') ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>{lineMath.syncRisk}</span>
              </div>
            </div>

            <svg
              viewBox="0 0 720 280"
              className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/70"
              role="img"
              aria-label="Baseband line coding voltage waveform"
            >
              {/* Voltage axes */}
              {[1, 0, -1].map((v) => {
                const y = 145 - v * 75;
                return (
                  <g key={`lvl-${v}`}>
                    <line
                      x1={55}
                      y1={y}
                      x2={695}
                      y2={y}
                      stroke={v === 0 ? '#64748b' : '#e2e8f0'}
                      strokeWidth={v === 0 ? '1.2' : '1'}
                    />
                    <text
                      x={46}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 font-mono text-[11px]"
                    >
                      {v === 1 ? '+V' : v === -1 ? '-V' : '0V'}
                    </text>
                  </g>
                );
              })}

              {/* Bit slot boundaries + bit labels */}
              {lineMath.bits.map((b, idx) => {
                const slotW = 640 / lineMath.bits.length;
                const x = 55 + idx * slotW;
                return (
                  <g key={`slot-${idx}`}>
                    <line
                      x1={x}
                      y1={40}
                      x2={x}
                      y2={245}
                      stroke="#cbd5e1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={x + slotW / 2}
                      y={28}
                      textAnchor="middle"
                      className="fill-slate-900 font-mono text-xs font-semibold"
                    >
                      {b}
                    </text>
                  </g>
                );
              })}
              <line x1={695} y1={40} x2={695} y2={245} stroke="#cbd5e1" strokeDasharray="3 3" />

              {/* Waveform trace */}
              <path
                d={(() => {
                  const slotW = 640 / lineMath.bits.length;
                  return lineMath.segments
                    .map((seg, idx) => {
                      const x1 = 55 + seg.x1 * slotW;
                      const x2 = 55 + seg.x2 * slotW;
                      const y = 145 - seg.y * 75;
                      return `${idx === 0 ? 'M' : 'L'} ${x1.toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${y.toFixed(1)}`;
                    })
                    .join(' ');
                })()}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.8"
                strokeLinejoin="miter"
              />
            </svg>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
              {lineMath.info.description}
            </div>
          </div>

          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <h3 className="text-sm font-semibold text-slate-950 border-b border-slate-100 pb-3">
              Bitstream &amp; Line Code Selector
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Binary Input (up to 14 bits)
              </label>
              <input
                type="text"
                value={bitString}
                maxLength={14}
                onChange={(e) => setBitString(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-950 focus:border-sky-600 focus:outline-none"
                placeholder="e.g. 1011000110"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const rand = Array.from({ length: 10 }, () =>
                      Math.random() > 0.5 ? '1' : '0'
                    ).join('');
                    setBitString(rand);
                  }}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  <span>Randomize</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBitString('1000000011')}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Long 0-Run Test</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-700">Encoding Scheme</span>
              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(LINE_CODE_INFO) as LineCodingScheme[]).map((scheme) => (
                  <button
                    key={scheme}
                    type="button"
                    onClick={() => setLineScheme(scheme)}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      lineScheme === scheme
                        ? 'border-sky-600 bg-sky-50 text-sky-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {LINE_CODE_INFO[scheme].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Measured DC Avg</span>
                <span className="font-mono font-semibold tabular-nums text-slate-950">
                  {lineMath.dcAvg.toFixed(2)} V
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Clock Recovery</span>
                <span className="font-medium text-right text-slate-900">
                  {lineMath.info.clockRecovery}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Error Detection</span>
                <span className="font-medium text-right text-slate-900">
                  {lineMath.info.errorDetection}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Bandwidth</span>
                <span className="font-mono font-semibold text-sky-700">
                  {lineMath.info.bandwidthFactor}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* LAB 4: DELTA MODULATION & SLOPE OVERLOAD                           */}
      {/* ================================================================== */}
      {activeLab === LabType.DELTA_MOD && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Delta Modulator Staircase Tracker
                </h2>
                <p className="text-xs text-slate-500">
                  Blue curve: m(t) · Green/Red stepped trace: DM accumulator m̂(t) (Red highlights slope-overload lag)
                </p>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
                  dmMath.isOverloaded
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : dmMath.isGranularHeavy
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {dmMath.isOverloaded ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>SLOPE OVERLOAD (Δ·fs &lt; 2π·fm·Am)</span>
                  </>
                ) : dmMath.isGranularHeavy ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>HIGH GRANULAR NOISE (Δ too large)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>OPTIMAL TRACKING</span>
                  </>
                )}
              </div>
            </div>

            <svg
              viewBox="0 0 720 310"
              className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/70"
              role="img"
              aria-label="Delta modulation tracking staircase waveform"
            >
              {[-2, -1, 0, 1, 2].map((v) => {
                const y = 155 - (v / 2.6) * 125;
                return (
                  <g key={`dm-v-${v}`}>
                    <line
                      x1={50}
                      y1={y}
                      x2={690}
                      y2={y}
                      stroke={v === 0 ? '#94a3b8' : '#e2e8f0'}
                    />
                    <text
                      x={42}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 font-mono text-[10px]"
                    >
                      {v}V
                    </text>
                  </g>
                );
              })}

              {/* Analog input */}
              <path
                d={dmMath.analogPts
                  .map((p, idx) => {
                    const x = 50 + (p.t / 1.5) * 640;
                    const y = 155 - (p.y / 2.6) * 125;
                    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.2"
              />

              {/* DM Staircase segments colored by overload vs normal */}
              {dmMath.staircasePts.map((pt, idx) => {
                if (idx >= dmMath.staircasePts.length - 1) return null;
                const next = dmMath.staircasePts[idx + 1];
                const x1 = 50 + (pt.t / 1.5) * 640;
                const x2 = 50 + (next.t / 1.5) * 640;
                const y1 = 155 - (pt.yHat / 2.6) * 125;
                const y2 = 155 - (next.yHat / 2.6) * 125;
                return (
                  <path
                    key={`dm-seg-${idx}`}
                    d={`M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`}
                    fill="none"
                    stroke={pt.overload ? '#dc2626' : '#059669'}
                    strokeWidth="2.2"
                  />
                );
              })}
            </svg>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-600">DM 1-Bit Output Stream:</span>
              <span className="font-mono font-semibold tracking-wider text-slate-950">
                {dmMath.dmBits}
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <h3 className="text-sm font-semibold text-slate-950 border-b border-slate-100 pb-3">
              Delta Modulator Controls
            </h3>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>Step Size (Δ)</span>
                  <span className="font-mono tabular-nums text-slate-950">{dmDelta.toFixed(2)} V</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1.2}
                  step={0.05}
                  value={dmDelta}
                  onChange={(e) => setDmDelta(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>DM Sampling Rate (fs)</span>
                  <span className="font-mono tabular-nums text-slate-950">{dmFs} kHz</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={48}
                  step={2}
                  value={dmFs}
                  onChange={(e) => setDmFs(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>Message Frequency (fm)</span>
                  <span className="font-mono tabular-nums text-slate-950">{dmFm.toFixed(1)} kHz</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.25}
                  value={dmFm}
                  onChange={(e) => setDmFm(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>

              <label className="block space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>Message Amplitude (Am)</span>
                  <span className="font-mono tabular-nums text-slate-950">{dmAm.toFixed(1)} V</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.2}
                  step={0.1}
                  value={dmAm}
                  onChange={(e) => setDmAm(parseFloat(e.target.value))}
                  className="w-full"
                />
              </label>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Max Signal Slope (2π·fm·Am)</span>
                <span className="font-mono font-semibold tabular-nums text-slate-950">
                  {dmMath.maxSlope.toFixed(2)} V/ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tracker Slew (Δ·fs)</span>
                <span className="font-mono font-semibold tabular-nums text-slate-950">
                  {dmMath.trackerSlope.toFixed(2)} V/ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Required Min Step (Δ_min)</span>
                <span className="font-mono font-semibold tabular-nums text-sky-700">
                  {dmMath.minDelta.toFixed(3)} V
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Unfiltered Tracker SNR</span>
                <span className="font-mono font-semibold tabular-nums text-slate-950">
                  {dmMath.simSnrDb.toFixed(1)} dB
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* LAB 5: DIGITAL MODULATION & I/Q CONSTELLATION                      */}
      {/* ================================================================== */}
      {activeLab === LabType.DIGITAL_MOD && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            {/* Stage 1: Passband Waveform */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    {modMath.info.name} — Modulated Carrier &amp; I/Q Constellation
                  </h2>
                  <p className="text-xs text-slate-500">
                    Bits transmitted: <span className="font-mono font-semibold text-slate-800">{modMath.bitsUsed}</span>
                    {' · '}
                    {modMath.info.bitsPerSymbol} bit{modMath.info.bitsPerSymbol > 1 ? 's' : ''}/symbol
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-sky-700">
                  Pb ≈ {formatSci(modMath.ber)}
                </span>
              </div>

              <svg
                viewBox="0 0 700 185"
                className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/70"
                role="img"
                aria-label="Passband modulated carrier waveform"
              >
                <line x1={40} y1={95} x2={680} y2={95} stroke="#94a3b8" strokeWidth="1" />
                {Array.from({ length: modMath.numSymbols }).map((_, idx) => {
                  const symW = 640 / modMath.numSymbols;
                  const x = 40 + idx * symW;
                  const label = modMath.bitsUsed.slice(
                    idx * modMath.info.bitsPerSymbol,
                    (idx + 1) * modMath.info.bitsPerSymbol
                  );
                  return (
                    <g key={`sym-${idx}`}>
                      <line
                        x1={x}
                        y1={20}
                        x2={x}
                        y2={170}
                        stroke="#cbd5e1"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={x + symW / 2}
                        y={16}
                        textAnchor="middle"
                        className="fill-slate-900 font-mono text-[11px] font-semibold"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
                <path
                  d={modMath.wavePts
                    .map((p, idx) => {
                      const x = 40 + (p.x / modMath.numSymbols) * 640;
                      const y = 95 - p.y * 62;
                      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2"
                />
              </svg>
            </div>

            {/* Stage 2: I/Q Constellation Scatter Plane */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-6">
                <svg
                  viewBox="0 0 300 300"
                  className="w-full max-w-[300px] mx-auto rounded-lg border border-slate-200 bg-slate-50"
                  role="img"
                  aria-label="I/Q Constellation Scatter Diagram"
                >
                  {/* Axes */}
                  <line x1={20} y1={150} x2={280} y2={150} stroke="#94a3b8" strokeWidth="1.2" />
                  <line x1={150} y1={20} x2={150} y2={280} stroke="#94a3b8" strokeWidth="1.2" />
                  <circle
                    cx={150}
                    cy={150}
                    r={90}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                  />

                  {/* Noisy AWGN scatter */}
                  {modMath.scatterPts.map((pt, idx) => (
                    <circle
                      key={`sc-${idx}`}
                      cx={150 + pt.i * 90}
                      cy={150 - pt.q * 90}
                      r="2.4"
                      fill="#0284c7"
                      fillOpacity="0.45"
                    />
                  ))}

                  {/* Ideal constellation centroids */}
                  {modMath.idealPoints.map((pt, idx) => (
                    <g key={`id-${idx}`}>
                      <circle
                        cx={150 + pt.i * 90}
                        cy={150 - pt.q * 90}
                        r="5.5"
                        fill="#0f172a"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <text
                        x={150 + pt.i * 90 + 9}
                        y={150 - pt.q * 90 - 7}
                        className="fill-slate-900 font-mono text-[10px] font-semibold"
                      >
                        {pt.label}
                      </text>
                    </g>
                  ))}

                  <text x={256} y={144} className="fill-slate-600 font-mono text-[10px]">
                    I (φ₁)
                  </text>
                  <text x={156} y={32} className="fill-slate-600 font-mono text-[10px]">
                    Q (φ₂)
                  </text>
                </svg>
              </div>

              <div className="md:col-span-6 space-y-3">
                <h3 className="text-sm font-semibold text-slate-950">
                  Constellation &amp; Receiver Diagnostics
                </h3>
                <p className="text-xs leading-relaxed text-slate-600">
                  {modMath.info.description}
                </p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Theoretical Pb Formula</span>
                    <span className="font-mono font-semibold text-slate-950">
                      {modMath.info.berFormulaLabel}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">BER at {ebNoDb} dB</span>
                    <span className="font-mono font-semibold tabular-nums text-sky-700">
                      {formatSci(modMath.ber)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Spectral Efficiency (η)</span>
                    <span className="font-mono font-semibold tabular-nums text-slate-950">
                      {modMath.info.spectralEfficiency.toFixed(2)} bps/Hz
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Bandwidth Formula</span>
                    <span className="font-mono font-semibold text-slate-950">
                      {modMath.info.bandwidthFormula}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Receiver Architecture</span>
                    <span className="font-medium text-right text-slate-900">
                      {modMath.info.detectionType}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <h3 className="text-sm font-semibold text-slate-950 border-b border-slate-100 pb-3">
              Modulation &amp; Channel Controls
            </h3>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-700">Modulation Scheme</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(MODULATION_CATALOG) as DigitalModScheme[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setModScheme(s)}
                    className={`cursor-pointer rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                      modScheme === s
                        ? 'border-sky-600 bg-sky-50 text-sky-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {MODULATION_CATALOG[s].shortName}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>Channel Eb / N0</span>
                <span className="font-mono tabular-nums text-slate-950">{ebNoDb} dB</span>
              </div>
              <input
                type="range"
                min={0}
                max={18}
                step={1}
                value={ebNoDb}
                onChange={(e) => setEbNoDb(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </label>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Input Bit Sequence (8 bits)
              </label>
              <input
                type="text"
                value={modBits}
                maxLength={8}
                onChange={(e) => setModBits(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-950 focus:border-sky-600 focus:outline-none"
              />
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              <strong>Watch the scatter:</strong> Lower <em>Eb/N0</em> below 6 dB in 16-QAM and adjacent decision regions overlap heavily, while BPSK/QPSK stay cleanly separated.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
