import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Pause, Play, RotateCcw } from 'lucide-react';
import {
  computeMatrixExp2x2,
  Mat2,
  mat2Eigenvalues,
  mat2Vec,
  Vec2,
} from '../../utils/controlMath';

interface LtiPreset {
  id: string;
  label: string;
  desc: string;
  A: Mat2;
  x0: Vec2;
  B: Vec2;
  uStep: number;
  tMax: number;
}

const LTI_PRESETS: LtiPreset[] = [
  {
    id: 'focus',
    label: 'Stable Spiral (Focus)',
    desc: 'Complex conjugate poles in LHP (Re λ < 0): damped oscillation converging to origin.',
    A: [
      [0, 1],
      [-4, -1.2],
    ],
    x0: [1.8, 0.4],
    B: [0, 1],
    uStep: 0,
    tMax: 6,
  },
  {
    id: 'node',
    label: 'Overdamped Node',
    desc: 'Distinct negative real eigenvalues (−1, −2): monotonic non-oscillatory decay.',
    A: [
      [0, 1],
      [-2, -3],
    ],
    x0: [1.6, -1.2],
    B: [0, 1],
    uStep: 0,
    tMax: 5,
  },
  {
    id: 'jordan',
    label: 'Repeated Jordan Block',
    desc: 'Defective matrix with repeated λ = −1.5: exhibits t·e^(λt) transient growth before decay.',
    A: [
      [-1.5, 1.8],
      [0, -1.5],
    ],
    x0: [0.4, 2.0],
    B: [0, 1],
    uStep: 0,
    tMax: 5,
  },
  {
    id: 'center',
    label: 'Undamped Center',
    desc: 'Purely imaginary poles ±j2: energy-conserving marginal periodic orbit.',
    A: [
      [0, 1],
      [-4, 0],
    ],
    x0: [1.5, 0],
    B: [0, 1],
    uStep: 0,
    tMax: 6.3,
  },
  {
    id: 'saddle',
    label: 'Saddle Point',
    desc: 'One positive & one negative real eigenvalue: exponential growth along unstable eigenvector.',
    A: [
      [0.5, 0.3],
      [0.4, -1.2],
    ],
    x0: [0.35, -1.4],
    B: [0, 1],
    uStep: 0,
    tMax: 3.5,
  },
  {
    id: 'unstable_spiral',
    label: 'Unstable Growth Spiral',
    desc: 'Complex poles in RHP (Re λ > 0): e^(σt) envelope expands outward exponentially.',
    A: [
      [0.32, 1.6],
      [-1.6, 0.32],
    ],
    x0: [0.45, 0.25],
    B: [0, 1],
    uStep: 0,
    tMax: 4.5,
  },
];

interface SimSample {
  t: number;
  phi11: number;
  phi12: number;
  phi21: number;
  phi22: number;
  normF: number;
  x1: number;
  x2: number;
}

function clampVal(v: number, lim = 250): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-lim, Math.min(lim, v));
}

function formatComplex(re: number, im: number): string {
  if (Math.abs(im) < 1e-4) return re.toFixed(3);
  const sign = im >= 0 ? '+' : '−';
  return `${re.toFixed(2)} ${sign} j${Math.abs(im).toFixed(2)}`;
}

export const MatrixExpD3Section: React.FC = () => {
  const [a11, setA11] = useState<number>(LTI_PRESETS[0].A[0][0]);
  const [a12, setA12] = useState<number>(LTI_PRESETS[0].A[0][1]);
  const [a21, setA21] = useState<number>(LTI_PRESETS[0].A[1][0]);
  const [a22, setA22] = useState<number>(LTI_PRESETS[0].A[1][1]);
  const [x10, setX10] = useState<number>(LTI_PRESETS[0].x0[0]);
  const [x20, setX20] = useState<number>(LTI_PRESETS[0].x0[1]);
  const [b1, setB1] = useState<number>(0);
  const [b2, setB2] = useState<number>(1);
  const [uStep, setUStep] = useState<number>(0);
  const [tMax, setTMax] = useState<number>(6);
  const [tCursor, setTCursor] = useState<number>(2.4);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [leftPlotMode, setLeftPlotMode] = useState<'entries' | 'norm' | 'states'>('entries');

  const expSvgRef = useRef<SVGSVGElement | null>(null);
  const phaseSvgRef = useRef<SVGSVGElement | null>(null);

  const A: Mat2 = useMemo(
    () => [
      [a11, a12],
      [a21, a22],
    ],
    [a11, a12, a21, a22]
  );

  const eigs = useMemo(() => mat2Eigenvalues(A), [A]);

  const stabilityInfo = useMemo(() => {
    const maxRe = Math.max(eigs[0].re, eigs[1].re);
    if (maxRe < -1e-4) {
      return {
        label: 'Asymptotically Stable (Re λ < 0)',
        tone: 'text-emerald-700',
      };
    }
    if (Math.abs(maxRe) <= 1e-4) {
      return {
        label: 'Marginally Stable (Re λ = 0)',
        tone: 'text-amber-700',
      };
    }
    return {
      label: 'Unstable Exponential Growth (Re λ > 0)',
      tone: 'text-red-700',
    };
  }, [eigs]);

  // Compute full trajectory x(t) = e^(At)x(0) + integral_0^t e^(A(t-tau)) B u dtau
  const simSeries = useMemo<SimSample[]>(() => {
    const N = 150;
    const dt = tMax / N;
    const out: SimSample[] = [];
    let x1 = x10;
    let x2 = x20;
    const Bu: Vec2 = [b1 * uStep, b2 * uStep];

    for (let i = 0; i <= N; i++) {
      const t = i * dt;
      const phi = computeMatrixExp2x2(A, t);
      const phi11 = clampVal(phi[0][0]);
      const phi12 = clampVal(phi[0][1]);
      const phi21 = clampVal(phi[1][0]);
      const phi22 = clampVal(phi[1][1]);
      const normF = clampVal(
        Math.sqrt(phi11 * phi11 + phi12 * phi12 + phi21 * phi21 + phi22 * phi22)
      );

      if (Math.abs(uStep) < 1e-9) {
        // Exact analytical homogeneous solution x(t) = e^(At) * x(0)
        x1 = clampVal(phi11 * x10 + phi12 * x20);
        x2 = clampVal(phi21 * x10 + phi22 * x20);
      }

      out.push({
        t,
        phi11,
        phi12,
        phi21,
        phi22,
        normF,
        x1,
        x2,
      });

      if (Math.abs(uStep) >= 1e-9 && i < N) {
        // RK4 integration of x' = Ax + Bu
        const deriv = (sx1: number, sx2: number): [number, number] => [
          A[0][0] * sx1 + A[0][1] * sx2 + Bu[0],
          A[1][0] * sx1 + A[1][1] * sx2 + Bu[1],
        ];
        const [k1a, k1b] = deriv(x1, x2);
        const [k2a, k2b] = deriv(x1 + 0.5 * dt * k1a, x2 + 0.5 * dt * k1b);
        const [k3a, k3b] = deriv(x1 + 0.5 * dt * k2a, x2 + 0.5 * dt * k2b);
        const [k4a, k4b] = deriv(x1 + dt * k3a, x2 + dt * k3b);
        x1 = clampVal(x1 + (dt / 6) * (k1a + 2 * k2a + 2 * k3a + k4a));
        x2 = clampVal(x2 + (dt / 6) * (k1b + 2 * k2b + 2 * k3b + k4b));
      }
    }
    return out;
  }, [A, x10, x20, b1, b2, uStep, tMax]);

  const currentSample = useMemo(() => {
    const idx = Math.min(
      simSeries.length - 1,
      Math.max(0, Math.round((tCursor / Math.max(0.01, tMax)) * (simSeries.length - 1)))
    );
    return simSeries[idx];
  }, [simSeries, tCursor, tMax]);

  const phiAtCursor = useMemo(
    () => computeMatrixExp2x2(A, tCursor),
    [A, tCursor]
  );

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      setTCursor((prev) => {
        const next = prev + tMax / 120;
        if (next >= tMax) return 0;
        return next;
      });
    }, 45);
    return () => window.clearInterval(id);
  }, [isPlaying, tMax]);

  const applyPreset = (preset: LtiPreset) => {
    setIsPlaying(false);
    setA11(preset.A[0][0]);
    setA12(preset.A[0][1]);
    setA21(preset.A[1][0]);
    setA22(preset.A[1][1]);
    setX10(preset.x0[0]);
    setX20(preset.x0[1]);
    setB1(preset.B[0]);
    setB2(preset.B[1]);
    setUStep(preset.uStep);
    setTMax(preset.tMax);
    setTCursor(Number((preset.tMax * 0.45).toFixed(2)));
  };

  // =========================================================================
  // D3 RENDERER 1: Matrix Exponential Φ(t) = e^(At) & Growth Curves
  // =========================================================================
  useEffect(() => {
    if (!expSvgRef.current || simSeries.length === 0) return;

    const width = 580;
    const height = 310;
    const margin = { top: 20, right: 20, bottom: 36, left: 48 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(expSvgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([0, tMax]).range([0, innerW]);

    let allY: number[] = [];
    if (leftPlotMode === 'entries') {
      allY = simSeries.flatMap((d) => [d.phi11, d.phi12, d.phi21, d.phi22]);
    } else if (leftPlotMode === 'norm') {
      allY = simSeries.map((d) => d.normF);
    } else {
      allY = simSeries.flatMap((d) => [d.x1, d.x2]);
    }

    let yMin = d3.min(allY) ?? -1;
    let yMax = d3.max(allY) ?? 1;
    if (Math.abs(yMax - yMin) < 0.2) {
      yMin -= 0.5;
      yMax += 0.5;
    }
    const pad = (yMax - yMin) * 0.12;
    const yScale = d3
      .scaleLinear()
      .domain([Math.min(0, yMin - pad), Math.max(0, yMax + pad)])
      .nice()
      .range([innerH, 0]);

    // Gridlines
    g.append('g')
      .attr('class', 'grid-y')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(-innerW)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-dasharray', '3 3');
    g.select('.grid-y path.domain').remove();

    // Zero baseline
    if (yScale.domain()[0] <= 0 && yScale.domain()[1] >= 0) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 1);
    }

    // Axes
    const xAxis = g
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat((d) => `${d}s`));
    xAxis.selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');
    xAxis.selectAll('path, line').attr('stroke', '#cbd5e1');

    const yAxis = g.append('g').call(d3.axisLeft(yScale).ticks(5));
    yAxis.selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');
    yAxis.selectAll('path, line').attr('stroke', '#cbd5e1');

    const drawCurve = (
      accessor: (d: SimSample) => number,
      color: string,
      strokeWidth = 2.2,
      dashed = false
    ) => {
      const lineGen = d3
        .line<SimSample>()
        .x((d) => xScale(d.t))
        .y((d) => yScale(accessor(d)))
        .curve(d3.curveMonotoneX);

      const path = g
        .append('path')
        .datum(simSeries)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', strokeWidth)
        .attr('d', lineGen);

      if (dashed) {
        path.attr('stroke-dasharray', '5 4');
      }

      g.append('circle')
        .attr('cx', xScale(currentSample.t))
        .attr('cy', yScale(accessor(currentSample)))
        .attr('r', 4.2)
        .attr('fill', color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.4);
    };

    if (leftPlotMode === 'entries') {
      drawCurve((d) => d.phi11, '#0284c7', 2.4);
      drawCurve((d) => d.phi12, '#059669', 2.2);
      drawCurve((d) => d.phi21, '#d97706', 2.0, true);
      drawCurve((d) => d.phi22, '#7c3aed', 2.0);
    } else if (leftPlotMode === 'norm') {
      const areaGen = d3
        .area<SimSample>()
        .x((d) => xScale(d.t))
        .y0(yScale(0))
        .y1((d) => yScale(d.normF))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(simSeries)
        .attr('fill', 'rgba(2, 132, 199, 0.12)')
        .attr('d', areaGen);

      drawCurve((d) => d.normF, '#0284c7', 2.6);
    } else {
      drawCurve((d) => d.x1, '#0284c7', 2.5);
      drawCurve((d) => d.x2, '#059669', 2.3);
    }

    // Time scrub cursor line
    g.append('line')
      .attr('x1', xScale(currentSample.t))
      .attr('x2', xScale(currentSample.t))
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '3 3');

    g.append('text')
      .attr('x', Math.min(innerW - 44, xScale(currentSample.t) + 6))
      .attr('y', 12)
      .attr('fill', '#0f172a')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .text(`t=${currentSample.t.toFixed(2)}s`);

    // Axis label
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + 30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '11px')
      .text('Time t (seconds)');
  }, [simSeries, currentSample, tMax, leftPlotMode]);

  // =========================================================================
  // D3 RENDERER 2: Phase-Plane Vector Field & Trajectory Evolution (x1, x2)
  // =========================================================================
  useEffect(() => {
    if (!phaseSvgRef.current || simSeries.length === 0) return;

    const width = 520;
    const height = 370;
    const margin = { top: 20, right: 20, bottom: 38, left: 46 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(phaseSvgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Arrowhead marker definitions
    const defs = svg.append('defs');
    defs
      .append('marker')
      .attr('id', 'd3-vec-arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 7)
      .attr('refY', 5)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 1.5 L 8 5 L 0 8.5 z')
      .attr('fill', '#94a3b8');

    defs
      .append('marker')
      .attr('id', 'd3-state-arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 8)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 1 L 9 5 L 0 9 z')
      .attr('fill', '#059669');

    const maxCoord = Math.max(
      2.2,
      d3.max(simSeries, (d) => Math.max(Math.abs(d.x1), Math.abs(d.x2))) ?? 2.2
    );
    const bound = maxCoord * 1.15;

    const xScale = d3.scaleLinear().domain([-bound, bound]).range([0, innerW]);
    const yScale = d3.scaleLinear().domain([-bound, bound]).range([innerH, 0]);

    // Background grid
    g.append('g')
      .call(
        d3
          .axisBottom(xScale)
          .ticks(6)
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

    // Origin crosshairs
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1.2);
    g.append('line')
      .attr('x1', xScale(0))
      .attr('x2', xScale(0))
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1.2);

    // Vector field arrows dx/dt = A x + B u
    const gridN = 9;
    const Bu: Vec2 = [b1 * uStep, b2 * uStep];
    const step = (2 * bound) / (gridN + 1);
    const arrowPx = 18;
    for (let ix = 1; ix <= gridN; ix++) {
      for (let iy = 1; iy <= gridN; iy++) {
        const px = -bound + ix * step;
        const py = -bound + iy * step;
        const [dx, dy] = mat2Vec(A, [px, py]);
        const vx = dx + Bu[0];
        const vy = dy + Bu[1];
        const mag = Math.hypot(vx, vy);
        if (mag < 1e-6) continue;
        const ux = vx / mag;
        const uy = vy / mag;

        const cx = xScale(px);
        const cy = yScale(py);
        g.append('line')
          .attr('x1', cx - ux * arrowPx * 0.45)
          .attr('y1', cy + uy * arrowPx * 0.45)
          .attr('x2', cx + ux * arrowPx * 0.55)
          .attr('y2', cy - uy * arrowPx * 0.55)
          .attr('stroke', '#94a3b8')
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.72)
          .attr('marker-end', 'url(#d3-vec-arrow)');
      }
    }

    // Real Eigenvector invariant lines (when unforced & real eigenvalues)
    if (Math.abs(uStep) < 1e-9 && Math.abs(eigs[0].im) < 1e-5) {
      [eigs[0].re, eigs[1].re].forEach((lam, idx) => {
        if (idx === 1 && Math.abs(eigs[0].re - eigs[1].re) < 1e-4) return;
        const m00 = A[0][0] - lam;
        const m01 = A[0][1];
        const m10 = A[1][0];
        const m11 = A[1][1] - lam;
        let v: Vec2 =
          Math.abs(m01) + Math.abs(m00) >= Math.abs(m11) + Math.abs(m10)
            ? [-m01, m00]
            : [-m11, m10];
        const n = Math.hypot(v[0], v[1]);
        if (n < 1e-6) v = [1, 0];
        else v = [v[0] / n, v[1] / n];
        const ray = bound * 1.3;
        g.append('line')
          .attr('x1', xScale(-v[0] * ray))
          .attr('y1', yScale(-v[1] * ray))
          .attr('x2', xScale(v[0] * ray))
          .attr('y2', yScale(v[1] * ray))
          .attr('stroke', lam > 0 ? '#fca5a5' : '#a7f3d0')
          .attr('stroke-width', 1.4)
          .attr('stroke-dasharray', '4 4');
      });
    }

    // Full future trajectory preview (dashed)
    const phaseLine = d3
      .line<SimSample>()
      .x((d) => xScale(d.x1))
      .y((d) => yScale(d.x2))
      .curve(d3.curveCatmullRom.alpha(0.5));

    g.append('path')
      .datum(simSeries)
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.4)
      .attr('stroke-dasharray', '4 3')
      .attr('d', phaseLine);

    // Active trajectory up to tCursor
    const activeSlice = simSeries.filter((d) => d.t <= currentSample.t + 1e-6);
    if (activeSlice.length > 1) {
      g.append('path')
        .datum(activeSlice)
        .attr('fill', 'none')
        .attr('stroke', '#0284c7')
        .attr('stroke-width', 2.8)
        .attr('d', phaseLine);
    }

    // State vector arrow from origin to x(tCursor)
    g.append('line')
      .attr('x1', xScale(0))
      .attr('y1', yScale(0))
      .attr('x2', xScale(currentSample.x1))
      .attr('y2', yScale(currentSample.x2))
      .attr('stroke', '#059669')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#d3-state-arrow)');

    // Initial state marker x(0)
    g.append('circle')
      .attr('cx', xScale(x10))
      .attr('cy', yScale(x20))
      .attr('r', 5)
      .attr('fill', '#d97706')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    g.append('text')
      .attr('x', xScale(x10) + 8)
      .attr('y', yScale(x20) - 6)
      .attr('fill', '#b45309')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .text('x(0)');

    // Current state marker x(t)
    g.append('circle')
      .attr('cx', xScale(currentSample.x1))
      .attr('cy', yScale(currentSample.x2))
      .attr('r', 5.5)
      .attr('fill', '#0284c7')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.6);

    // Outer Axes
    const xAxis = g
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(5));
    xAxis.selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');
    xAxis.selectAll('path, line').attr('stroke', '#cbd5e1');

    const yAxis = g.append('g').call(d3.axisLeft(yScale).ticks(5));
    yAxis.selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');
    yAxis.selectAll('path, line').attr('stroke', '#cbd5e1');

    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + 31)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '11px')
      .text('State x₁(t)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -33)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '11px')
      .text('State x₂(t)');
  }, [simSeries, currentSample, A, b1, b2, uStep, x10, x20, eigs]);

  return (
    <div className="space-y-6">
      {/* Presets & Matrix / Initial State Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              D3 Matrix Exponential e^(At) &amp; LTI State-Space Trajectory Lab
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Explore how eigenvalues of A govern Φ(t) = e^(At) growth/decay and steer x(t) = e^(At)x(0) + ∫ e^(A(t−τ))Bu(τ)dτ across the phase plane.
            </p>
          </div>
          <div className={`text-xs font-semibold tabular-nums ${stabilityInfo.tone}`}>
            {stabilityInfo.label}
          </div>
        </div>

        {/* Eigenvalue Regime Presets */}
        <div className="flex flex-wrap gap-2">
          {LTI_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:bg-sky-50/50 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Parameter Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Matrix A */}
          <div className="lg:col-span-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
            <div className="text-xs font-semibold text-slate-900">
              System Matrix A (2×2)
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <label className="space-y-1">
                <span className="text-[10px] text-slate-500">a₁₁</span>
                <input
                  type="number"
                  step={0.1}
                  value={a11}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setA11(v);
                  }}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] text-slate-500">a₁₂</span>
                <input
                  type="number"
                  step={0.1}
                  value={a12}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setA12(v);
                  }}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] text-slate-500">a₂₁</span>
                <input
                  type="number"
                  step={0.1}
                  value={a21}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setA21(v);
                  }}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] text-slate-500">a₂₂</span>
                <input
                  type="number"
                  step={0.1}
                  value={a22}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setA22(v);
                  }}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 tabular-nums"
                />
              </label>
            </div>
            <div className="font-mono text-[11px] text-sky-800 tabular-nums">
              λ₁ = {formatComplex(eigs[0].re, eigs[0].im)} · λ₂ ={' '}
              {formatComplex(eigs[1].re, eigs[1].im)}
            </div>
          </div>

          {/* Initial State x(0) & Forced Input B*u */}
          <div className="lg:col-span-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
            <div className="text-xs font-semibold text-slate-900">
              Initial State x(0) &amp; Step Input B·u₀
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <label className="space-y-1">
                <span className="text-[10px] text-slate-500">x₁(0)</span>
                <input
                  type="number"
                  step={0.2}
                  value={x10}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setX10(v);
                  }}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] text-slate-500">x₂(0)</span>
                <input
                  type="number"
                  step={0.2}
                  value={x20}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setX20(v);
                  }}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] text-slate-500">Input B = [b₁; b₂]</span>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step={0.5}
                    value={b1}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setB1(v);
                    }}
                    className="w-1/2 rounded border border-slate-300 bg-white px-1.5 py-1 tabular-nums"
                  />
                  <input
                    type="number"
                    step={0.5}
                    value={b2}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setB2(v);
                    }}
                    className="w-1/2 rounded border border-slate-300 bg-white px-1.5 py-1 tabular-nums"
                  />
                </div>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] text-slate-500">Step u₀ (0 = Homog.)</span>
                <input
                  type="number"
                  step={0.5}
                  value={uStep}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setUStep(v);
                  }}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 tabular-nums"
                />
              </label>
            </div>
            <div className="font-mono text-[11px] text-slate-600">
              {Math.abs(uStep) < 1e-9
                ? 'Homogeneous: x(t) = e^(At)x(0)'
                : `Non-Homogeneous: u(t) = ${uStep.toFixed(1)}`}
            </div>
          </div>

          {/* Live State Transition Matrix Φ(t) Readout & Time Scrubber */}
          <div className="lg:col-span-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900">
                Φ(t) = e^(At) at t = {tCursor.toFixed(2)} s
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-3 w-3" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 text-sky-600" />
                      <span>Animate</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setTCursor(0);
                  }}
                  className="cursor-pointer rounded border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-50"
                  aria-label="Reset time cursor"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={tMax}
              step={tMax / 150}
              value={tCursor}
              onChange={(e) => {
                setIsPlaying(false);
                setTCursor(parseFloat(e.target.value));
              }}
              className="w-full accent-sky-600 cursor-pointer"
            />

            <div className="grid grid-cols-2 gap-2 font-mono text-xs tabular-nums">
              <div className="rounded border border-slate-200 bg-white p-2">
                <div className="text-[10px] text-slate-500">Φ(t) = e^(At)</div>
                <div className="flex justify-between mt-0.5 text-slate-950 font-semibold">
                  <span>{clampVal(phiAtCursor[0][0], 9999).toFixed(3)}</span>
                  <span>{clampVal(phiAtCursor[0][1], 9999).toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-slate-950 font-semibold">
                  <span>{clampVal(phiAtCursor[1][0], 9999).toFixed(3)}</span>
                  <span>{clampVal(phiAtCursor[1][1], 9999).toFixed(3)}</span>
                </div>
              </div>
              <div className="rounded border border-slate-200 bg-white p-2">
                <div className="text-[10px] text-slate-500">State Vector x(t)</div>
                <div className="mt-0.5 text-sky-700 font-semibold">
                  x₁ = {currentSample.x1.toFixed(3)}
                </div>
                <div className="text-emerald-700 font-semibold">
                  x₂ = {currentSample.x2.toFixed(3)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two D3 Visualization Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: D3 Matrix Exponential Curves */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-950">
                Matrix Exponential Evolution (D3)
              </h3>
              <p className="text-xs text-slate-500">
                {leftPlotMode === 'entries'
                  ? 'Blue Φ₁₁ · Green Φ₁₂ · Dashed Amber Φ₂₁ · Violet Φ₂₂'
                  : leftPlotMode === 'norm'
                  ? 'Frobenius Norm ||e^(At)||_F — shows transient Jordan hump or exponential growth'
                  : 'Blue x₁(t) · Green x₂(t) time-domain trajectories'}
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-semibold">
              {[
                { id: 'entries', label: 'Φᵢⱼ(t)' },
                { id: 'norm', label: '||e^(At)||' },
                { id: 'states', label: 'x₁, x₂(t)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLeftPlotMode(m.id as typeof leftPlotMode)}
                  className={`cursor-pointer rounded-md px-2.5 py-1 ${
                    leftPlotMode === m.id
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <svg
            ref={expSvgRef}
            className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/40"
            role="img"
            aria-label="D3 Matrix exponential time evolution chart"
          />
        </div>

        {/* Right: D3 Phase Portrait & Trajectory Evolution */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-950">
              State-Space Phase Portrait &amp; Vector Field (D3)
            </h3>
            <p className="text-xs text-slate-500">
              Amber dot: x(0) · Solid blue: trajectory to t · Green arrow: live state vector x(t) · Grey arrows: ẋ = Ax + Bu
            </p>
          </div>

          <svg
            ref={phaseSvgRef}
            className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/40"
            role="img"
            aria-label="D3 State-space phase plane trajectory and vector field"
          />
        </div>
      </div>
    </div>
  );
};
