import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Check, Copy, Sparkles } from 'lucide-react';
import { ComplexNum, computeRootLocus } from '../../utils/controlMath';

interface RootLocusPreset {
  id: string;
  label: string;
  numStr: string;
  denStr: string;
  compType: 'none' | 'lead' | 'lag' | 'lead_lag' | 'pd' | 'pi';
  zLead: number;
  pLead: number;
  zLag: number;
  pLag: number;
  kMax: number;
  kCurrent: number;
  note: string;
}

const RL_PRESETS: RootLocusPreset[] = [
  {
    id: 'three_pole_lead',
    label: '3-Pole Plant Stabilized by Lead',
    numStr: '1',
    denStr: '1, 6, 8, 0',
    compType: 'lead',
    zLead: 2.2,
    pLead: 9.0,
    zLag: 0.25,
    pLag: 0.04,
    kMax: 160,
    kCurrent: 32,
    note: 'Lead zero at −2.2 pulls the centroid leftward away from the jω axis, raising K_crit.',
  },
  {
    id: 'double_int',
    label: 'Double Integrator 1/s² + Lead',
    numStr: '1',
    denStr: '1, 0, 0',
    compType: 'lead',
    zLead: 1.5,
    pLead: 8.5,
    zLag: 0.2,
    pLag: 0.03,
    kMax: 80,
    kCurrent: 18,
    note: 'Uncompensated 1/s² oscillates along the jω axis for all K > 0; Lead pulls poles into LHP.',
  },
  {
    id: 'servo_lag',
    label: 'Type-1 Servo + Lag Compensator',
    numStr: '1',
    denStr: '1, 5, 4, 0',
    compType: 'lag',
    zLead: 2.0,
    pLead: 8.0,
    zLag: 0.3,
    pLag: 0.05,
    kMax: 45,
    kCurrent: 10,
    note: 'Close pole-zero dipole (p=−0.05, z=−0.3) boosts DC Kv by 6× with minimal root-locus shift.',
  },
  {
    id: 'uncomp_3pole',
    label: 'Uncompensated 3-Pole jω Crossing',
    numStr: '1',
    denStr: '1, 6, 8, 0',
    compType: 'none',
    zLead: 2.0,
    pLead: 8.0,
    zLag: 0.25,
    pLag: 0.05,
    kMax: 80,
    kCurrent: 24,
    note: 'At K = 48 (Routh Ku), two complex branches cross the jω stability boundary into the RHP.',
  },
];

const BRANCH_COLORS = ['#0284c7', '#059669', '#7c3aed', '#d97706', '#db2777'];

function parsePoly(str: string): { coeffs: number[]; error: string | null } {
  const parts = str
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return { coeffs: [], error: 'Enter polynomial coefficients.' };
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) {
    return { coeffs: [], error: 'Use finite numbers separated by commas.' };
  }
  if (nums.every((n) => Math.abs(n) < 1e-12)) {
    return { coeffs: [], error: 'Polynomial cannot be identically zero.' };
  }
  return { coeffs: nums, error: null };
}

function formatPole(p: ComplexNum): string {
  if (Math.abs(p.im) < 1e-3) return p.re.toFixed(3);
  const sign = p.im >= 0 ? '+' : '−';
  return `${p.re.toFixed(2)} ${sign} j${Math.abs(p.im).toFixed(2)}`;
}

export interface RootLocusDesignSummary {
  plantLabel: string;
  compType: 'none' | 'lead' | 'lag' | 'lead_lag' | 'pd' | 'pi';
  kCurrent: number;
  kCritical: number | null;
  isStable: boolean;
  maxRe: number;
  zeta: number;
  osPct: number;
  wn: number;
  centroid: number | null;
}

interface RootLocusSectionProps {
  onSummaryChange?: (summary: RootLocusDesignSummary) => void;
}

export const RootLocusSection: React.FC<RootLocusSectionProps> = ({
  onSummaryChange,
}) => {
  const [numStr, setNumStr] = useState<string>(RL_PRESETS[0].numStr);
  const [denStr, setDenStr] = useState<string>(RL_PRESETS[0].denStr);
  const [compType, setCompType] = useState<'none' | 'lead' | 'lag' | 'lead_lag' | 'pd' | 'pi'>(
    RL_PRESETS[0].compType
  );
  const [zLead, setZLead] = useState<number>(RL_PRESETS[0].zLead);
  const [pLead, setPLead] = useState<number>(RL_PRESETS[0].pLead);
  const [zLag, setZLag] = useState<number>(RL_PRESETS[0].zLag);
  const [pLag, setPLag] = useState<number>(RL_PRESETS[0].pLag);
  const [kMax, setKMax] = useState<number>(RL_PRESETS[0].kMax);
  const [kCurrent, setKCurrent] = useState<number>(RL_PRESETS[0].kCurrent);
  const [showUncompOverlay, setShowUncompOverlay] = useState<boolean>(true);
  const [copiedMatlab, setCopiedMatlab] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const parsedNum = useMemo(() => parsePoly(numStr), [numStr]);
  const parsedDen = useMemo(() => parsePoly(denStr), [denStr]);
  const numCoeffs = parsedNum.error ? [1] : parsedNum.coeffs;
  const denCoeffs = parsedDen.error ? [1, 6, 8, 0] : parsedDen.coeffs;

  const locus = useMemo(() => {
    return computeRootLocus({
      num: numCoeffs,
      den: denCoeffs,
      compType,
      zLead,
      pLead,
      zLag,
      pLag,
      kMax,
      kCurrent,
    });
  }, [numCoeffs, denCoeffs, compType, zLead, pLead, zLag, pLag, kMax, kCurrent]);

  const uncompLocus = useMemo(() => {
    if (!showUncompOverlay || compType === 'none') return null;
    return computeRootLocus({
      num: numCoeffs,
      den: denCoeffs,
      compType: 'none',
      zLead,
      pLead,
      zLag,
      pLag,
      kMax,
      kCurrent,
    });
  }, [showUncompOverlay, compType, numCoeffs, denCoeffs, zLead, pLead, zLag, pLag, kMax, kCurrent]);

  // Dominant pole damping / overshoot summary
  const poleMetrics = useMemo(() => {
    const poles = locus.currentPoles;
    if (poles.length === 0) {
      return { isStable: true, maxRe: 0, zeta: 1, wn: 0, osPct: 0 };
    }
    const maxRe = Math.max(...poles.map((p) => p.re));
    const isStable = maxRe < -1e-4;
    // Dominant pole = closest to jω axis among finite poles (prefer complex pair)
    const sorted = [...poles].sort((a, b) => Math.abs(a.re) - Math.abs(b.re));
    const dom = sorted.find((p) => Math.abs(p.im) > 1e-3) || sorted[0];
    const wn = Math.hypot(dom.re, dom.im);
    const zeta = wn > 1e-6 ? -dom.re / wn : 0;
    const osPct =
      zeta > 0 && zeta < 1
        ? 100 * Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta))
        : 0;
    return { isStable, maxRe, zeta, wn, osPct };
  }, [locus.currentPoles]);

  useEffect(() => {
    if (!onSummaryChange) return;
    onSummaryChange({
      plantLabel: `[${numCoeffs.join(', ')}] / [${denCoeffs.join(', ')}]`,
      compType,
      kCurrent,
      kCritical: locus.kCritical,
      isStable: poleMetrics.isStable,
      maxRe: poleMetrics.maxRe,
      zeta: poleMetrics.zeta,
      osPct: poleMetrics.osPct,
      wn: poleMetrics.wn,
      centroid: locus.asymptoteCentroid,
    });
  }, [onSummaryChange, numCoeffs, denCoeffs, compType, kCurrent, locus.kCritical, locus.asymptoteCentroid, poleMetrics]);

  const handleApplyPreset = (preset: RootLocusPreset) => {
    setNumStr(preset.numStr);
    setDenStr(preset.denStr);
    setCompType(preset.compType);
    setZLead(preset.zLead);
    setPLead(preset.pLead);
    setZLag(preset.zLag);
    setPLag(preset.pLag);
    setKMax(preset.kMax);
    setKCurrent(preset.kCurrent);
  };

  const handleCopyMatlab = async () => {
    const nStr = `[${numCoeffs.join(' ')}]`;
    const dStr = `[${denCoeffs.join(' ')}]`;
    let cCmd = 'C = 1;';
    if (compType === 'lead') cCmd = `C = tf([1 ${zLead.toFixed(2)}], [1 ${pLead.toFixed(2)}]);`;
    else if (compType === 'lag') cCmd = `C = tf([1 ${zLag.toFixed(2)}], [1 ${pLag.toFixed(2)}]);`;
    else if (compType === 'lead_lag') {
      cCmd = `C = tf([1 ${zLead.toFixed(2)}], [1 ${pLead.toFixed(2)}]) * tf([1 ${zLag.toFixed(2)}], [1 ${pLag.toFixed(2)}]);`;
    } else if (compType === 'pd') cCmd = `C = tf([1 ${zLead.toFixed(2)}], 1);`;
    else if (compType === 'pi') cCmd = `C = tf([1 ${zLag.toFixed(2)}], [1 0]);`;

    const code = `G = tf(${nStr}, ${dStr});\n${cCmd}\nfigure; rlocus(C * G); sgrid;\ntitle('ECE 433 Root Locus');`;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedMatlab(true);
      window.setTimeout(() => setCopiedMatlab(false), 1600);
    } catch {
      // ignore
    }
  };

  // =========================================================================
  // D3 S-PLANE ROOT LOCUS RENDERER
  // =========================================================================
  useEffect(() => {
    if (!svgRef.current) return;

    const width = 700;
    const height = 430;
    const margin = { top: 20, right: 24, bottom: 40, left: 52 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Clip plot area so asymptotes / high-K branches stay tidy
    svg
      .append('defs')
      .append('clipPath')
      .attr('id', 'rl-clip')
      .append('rect')
      .attr('width', innerW)
      .attr('height', innerH);

    // Compute balanced s-plane bounds
    const allPts: ComplexNum[] = [
      ...locus.openLoopPoles,
      ...locus.openLoopZeros,
      ...locus.currentPoles,
      ...locus.branches.flat(),
    ];
    if (uncompLocus) {
      allPts.push(...uncompLocus.branches.flat());
    }

    const absMaxRe = Math.max(
      3,
      d3.max(allPts, (p) => Math.min(25, Math.abs(p.re))) ?? 6
    );
    const absMaxIm = Math.max(
      3,
      d3.max(allPts, (p) => Math.min(25, Math.abs(p.im))) ?? 6
    );
    const xMin = -Math.max(4.5, absMaxRe * 1.25);
    const xMax = Math.max(2.5, Math.min(absMaxRe * 0.75, 10));
    const ySpan = Math.max(4, absMaxIm * 1.22);

    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
    const yScale = d3.scaleLinear().domain([-ySpan, ySpan]).range([innerH, 0]);

    const plotLayer = g.append('g').attr('clip-path', 'url(#rl-clip)');

    // RHP Unstable Region subtle shading (Re(s) > 0)
    if (xMax > 0) {
      plotLayer
        .append('rect')
        .attr('x', xScale(0))
        .attr('y', 0)
        .attr('width', Math.max(0, innerW - xScale(0)))
        .attr('height', innerH)
        .attr('fill', 'rgba(239, 68, 68, 0.06)');

      plotLayer
        .append('text')
        .attr('x', xScale(0) + 8)
        .attr('y', 16)
        .attr('fill', '#dc2626')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .text('Unstable RHP (Re > 0)');
    }

    plotLayer
      .append('text')
      .attr('x', 8)
      .attr('y', 16)
      .attr('fill', '#059669')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text('Stable LHP (Re < 0)');

    // Grid lines
    g.append('g')
      .call(
        d3
          .axisBottom(xScale)
          .ticks(7)
          .tickSize(innerH)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#f1f5f9');
    g.append('g')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(6)
          .tickSize(-innerW)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#f1f5f9');

    // Constant damping rays (zeta = 0.45 and 0.707)
    [0.45, 0.707].forEach((z) => {
      const sinTheta = Math.sqrt(1 - z * z);
      const rayLen = Math.max(Math.abs(xMin), ySpan) * 1.4;
      const sx = -z * rayLen;
      const sy = sinTheta * rayLen;
      [1, -1].forEach((sign) => {
        plotLayer
          .append('line')
          .attr('x1', xScale(0))
          .attr('y1', yScale(0))
          .attr('x2', xScale(sx))
          .attr('y2', yScale(sign * sy))
          .attr('stroke', '#cbd5e1')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2 4');
      });
    });

    // Real axis & jω stability axis
    plotLayer
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.2);

    plotLayer
      .append('line')
      .attr('x1', xScale(0))
      .attr('x2', xScale(0))
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1.4)
      .attr('stroke-dasharray', '4 3');

    // Asymptotes
    if (locus.asymptoteCentroid !== null) {
      const sigmaA = locus.asymptoteCentroid;
      const rayLen = Math.max(Math.abs(xMin), ySpan) * 2;
      locus.asymptoteAnglesDeg.forEach((deg) => {
        const rad = (deg * Math.PI) / 180;
        plotLayer
          .append('line')
          .attr('x1', xScale(sigmaA))
          .attr('y1', yScale(0))
          .attr('x2', xScale(sigmaA + rayLen * Math.cos(rad)))
          .attr('y2', yScale(rayLen * Math.sin(rad)))
          .attr('stroke', '#94a3b8')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '6 4');
      });
    }

    const lineGen = d3
      .line<ComplexNum>()
      .x((d) => xScale(d.re))
      .y((d) => yScale(d.im))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // Optional uncompensated G(s) overlay branches
    if (uncompLocus) {
      uncompLocus.branches.forEach((branch) => {
        plotLayer
          .append('path')
          .datum(branch)
          .attr('fill', 'none')
          .attr('stroke', '#94a3b8')
          .attr('stroke-width', 1.6)
          .attr('stroke-dasharray', '4 4')
          .attr('d', lineGen);
      });
    }

    // Active compensated Root Locus branches
    locus.branches.forEach((branch, idx) => {
      const color = BRANCH_COLORS[idx % BRANCH_COLORS.length];
      plotLayer
        .append('path')
        .datum(branch)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2.6)
        .attr('d', lineGen);
    });

    // Open-loop poles (X)
    locus.openLoopPoles.forEach((p) => {
      const cx = xScale(p.re);
      const cy = yScale(p.im);
      const r = 5;
      plotLayer
        .append('line')
        .attr('x1', cx - r)
        .attr('y1', cy - r)
        .attr('x2', cx + r)
        .attr('y2', cy + r)
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 2);
      plotLayer
        .append('line')
        .attr('x1', cx - r)
        .attr('y1', cy + r)
        .attr('x2', cx + r)
        .attr('y2', cy - r)
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 2);
    });

    // Open-loop zeros (O)
    locus.openLoopZeros.forEach((z) => {
      plotLayer
        .append('circle')
        .attr('cx', xScale(z.re))
        .attr('cy', yScale(z.im))
        .attr('r', 5.5)
        .attr('fill', '#ffffff')
        .attr('stroke', '#0284c7')
        .attr('stroke-width', 2);
    });

    // Current closed-loop poles at K = kCurrent
    locus.currentPoles.forEach((cp, idx) => {
      const isRhp = cp.re >= 0;
      plotLayer
        .append('circle')
        .attr('cx', xScale(cp.re))
        .attr('cy', yScale(cp.im))
        .attr('r', 6)
        .attr('fill', isRhp ? '#dc2626' : BRANCH_COLORS[idx % BRANCH_COLORS.length])
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2);
    });

    // Axes
    const xAxis = g
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(7));
    xAxis.selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');
    xAxis.selectAll('path, line').attr('stroke', '#cbd5e1');

    const yAxis = g.append('g').call(d3.axisLeft(yScale).ticks(6));
    yAxis.selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');
    yAxis.selectAll('path, line').attr('stroke', '#cbd5e1');

    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + 32)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '11px')
      .text('Real Axis σ = Re(s)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -36)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '11px')
      .text('Imaginary Axis jω = Im(s)');
  }, [locus, uncompLocus]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-950">
              Root Locus Plant &amp; Compensator
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
                  <span>MATLAB rlocus()</span>
                </>
              )}
            </button>
          </div>

          {/* Presets */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              ECE 433 Root Locus Scenarios
            </label>
            <select
              onChange={(e) => {
                const found = RL_PRESETS.find((p) => p.id === e.target.value);
                if (found) handleApplyPreset(found);
              }}
              defaultValue={RL_PRESETS[0].id}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-900"
            >
              {RL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Plant Polynomials */}
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label htmlFor="rl-num" className="block text-xs font-semibold text-slate-900">
                Plant Numerator G_num(s)
              </label>
              <input
                id="rl-num"
                type="text"
                value={numStr}
                onChange={(e) => setNumStr(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs"
              />
              {parsedNum.error && (
                <p className="text-[11px] text-red-600">{parsedNum.error}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="rl-den" className="block text-xs font-semibold text-slate-900">
                Plant Denominator G_den(s)
              </label>
              <input
                id="rl-den"
                type="text"
                value={denStr}
                onChange={(e) => setDenStr(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs"
              />
              {parsedDen.error && (
                <p className="text-[11px] text-red-600">{parsedDen.error}</p>
              )}
            </div>
          </div>

          {/* Compensator Selection */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-950">Lead / Lag Zero-Pole Shaping</span>
              <button
                type="button"
                onClick={() => {
                  setCompType('lead');
                  setZLead(2.0);
                  setPLead(9.5);
                }}
                className="cursor-pointer inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
              >
                <Sparkles className="h-3 w-3" />
                <span>Lead Pull Left</span>
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

            {(compType === 'lead' || compType === 'lead_lag' || compType === 'pd') && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2.5 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-800">Lead Zero (−z)</span>
                    <span className="font-mono font-semibold text-sky-700 tabular-nums">
                      −{zLead.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={8}
                    step={0.1}
                    value={zLead}
                    onChange={(e) => setZLead(parseFloat(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>
                {compType !== 'pd' && (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-800">Lead Pole (−p)</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        −{pLead.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={18}
                      step={0.2}
                      value={pLead}
                      onChange={(e) => setPLead(parseFloat(e.target.value))}
                      className="w-full accent-slate-700 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}

            {(compType === 'lag' || compType === 'lead_lag' || compType === 'pi') && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2.5 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-800">Lag Zero (−z)</span>
                    <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                      −{zLag.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={2.5}
                    step={0.05}
                    value={zLag}
                    onChange={(e) => setZLag(parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
                {compType !== 'pi' && (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-800">Lag Pole (−p)</span>
                      <span className="font-mono font-semibold text-amber-700 tabular-nums">
                        −{pLag.toFixed(3)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.01}
                      max={1.0}
                      step={0.01}
                      value={pLag}
                      onChange={(e) => setPLag(parseFloat(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gain Sweep K & K_max */}
          <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <label htmlFor="rl-k" className="font-bold text-slate-950">
                Loop Gain K
              </label>
              <input
                type="number"
                step={0.5}
                min={0}
                max={kMax}
                value={kCurrent}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isFinite(v)) setKCurrent(Math.max(0, Math.min(kMax, v)));
                }}
                className="w-20 rounded border border-slate-300 px-2 py-0.5 text-right font-mono font-semibold text-sky-700 tabular-nums"
              />
            </div>
            <input
              id="rl-k"
              type="range"
              min={0}
              max={kMax}
              step={kMax / 200}
              value={kCurrent}
              onChange={(e) => setKCurrent(parseFloat(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-mono">Sweep Max K:</span>
              <select
                value={kMax}
                onChange={(e) => {
                  const next = parseInt(e.target.value, 10);
                  setKMax(next);
                  if (kCurrent > next) setKCurrent(next);
                }}
                className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs"
              >
                <option value={30}>30</option>
                <option value={80}>80</option>
                <option value={160}>160</option>
                <option value={300}>300</option>
              </select>
            </div>

            {compType !== 'none' && (
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUncompOverlay}
                  onChange={(e) => setShowUncompOverlay(e.target.checked)}
                  className="rounded accent-sky-600"
                />
                <span>Show uncompensated G(s) locus (dashed)</span>
              </label>
            )}
          </div>
        </div>

        {/* Right S-Plane Plot & Live Pole Telemetry */}
        <div className="lg:col-span-8 space-y-5">
          {/* Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] text-slate-500">Closed-Loop Stability</div>
              <div
                className={`mt-1 text-sm font-bold ${
                  poleMetrics.isStable ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {poleMetrics.isStable ? 'Stable (All LHP)' : 'Unstable (RHP Pole)'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] text-slate-500">Critical Crossing K_crit</div>
              <div className="mt-1 font-mono text-base font-bold tabular-nums text-slate-950">
                {locus.kCritical !== null ? locus.kCritical.toFixed(2) : 'None in [0, Kmax]'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] text-slate-500">Asymptote Centroid σ_a</div>
              <div className="mt-1 font-mono text-base font-bold tabular-nums text-sky-700">
                {locus.asymptoteCentroid !== null
                  ? locus.asymptoteCentroid.toFixed(2)
                  : 'N/A (n = m)'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] text-slate-500">Dom. Damping ζ / %OS</div>
              <div className="mt-1 font-mono text-base font-bold tabular-nums text-slate-950">
                {poleMetrics.zeta.toFixed(2)} · {poleMetrics.osPct.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* D3 S-Plane Canvas */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-950">
                  S-Plane Root Locus Paths (1 + K·C(s)G(s) = 0)
                </h3>
                <p className="text-xs text-slate-500">
                  × Open-loop poles · ○ Open-loop zeros · Solid dots: closed-loop poles at K = {kCurrent.toFixed(1)} · Dashed rays: ζ = 0.45 &amp; 0.707
                </p>
              </div>
            </div>

            <svg
              ref={svgRef}
              className="w-full h-auto rounded-lg border border-slate-200 bg-white"
              role="img"
              aria-label="Interactive Root Locus s-plane plot"
            />
          </div>

          {/* Current Closed-Loop Poles Readout */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="font-semibold text-slate-900">
              Active Closed-Loop Poles at K = {kCurrent.toFixed(2)}:
            </div>
            <div className="flex flex-wrap gap-3 font-mono tabular-nums">
              {locus.currentPoles.map((p, idx) => (
                <span
                  key={`${idx}-${p.re.toFixed(2)}`}
                  className={p.re >= 0 ? 'font-bold text-red-700' : 'font-semibold text-slate-800'}
                >
                  s{idx + 1} = {formatPole(p)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
