import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ArrowUpRight, BookmarkPlus, Check, Download, History, Info, RotateCcw, Trash2, X } from 'lucide-react';
import {
  AsymmetricalTransientPoint,
  cAngDeg,
  cFmtPolar,
  cFmtRect,
  cMag,
  computeAsymmetricalFaultTransient,
  Cpx,
  FaultInceptionMode,
  FaultType,
  SequenceNetworkGraph,
  solveAllFaultTypes,
} from '../../utils/powerMath';

const FAULT_CHAR_INFO: Record<
  FaultType,
  {
    name: string;
    classification: string;
    sequenceRule: string;
    equation: string;
    characteristics: string;
  }
> = {
  '3ph': {
    name: '3-Phase Balanced Fault (3ϕ)',
    classification: 'Symmetrical Fault',
    sequenceRule: 'Positive-sequence network only (Z₁)',
    equation: 'I₁ = E / (Z₁ + Z_f),  I₂ = I₀ = 0',
    characteristics:
      'Balanced three-phase short circuit with zero negative- or zero-sequence currents. Establishes the standard symmetrical short-circuit duty baseline for switchgear sizing.',
  },
  slg: {
    name: 'Single Line-to-Ground (SLG a–g)',
    classification: 'Asymmetrical Ground Fault',
    sequenceRule: 'Series connection (Z₁ + Z₂ + Z₀)',
    equation: 'I_a = 3·E / (Z₁ + Z₂ + Z₀ + 3·Z_f)',
    characteristics:
      'Most common grid fault (~70%). Requires a closed zero-sequence ground return; blocked completely when Z₀ is open across Δ windings and can exceed 3ϕ fault levels near solidly grounded neutrals.',
  },
  ll: {
    name: 'Line-to-Line Fault (LL b–c)',
    classification: 'Asymmetrical Phase Fault',
    sequenceRule: 'Anti-parallel Positive & Negative (Z₁ + Z₂)',
    equation: '|I_b| = |I_c| = √3·E / |Z₁ + Z₂ + Z_f|,  I₀ = 0',
    characteristics:
      'Phase-to-phase short circuit isolated from ground, so zero-sequence current is always zero. For passive networks with Z₁ = Z₂, fault current equals √3/2 (≈86.6%) of 3ϕ current.',
  },
  dlg: {
    name: 'Double Line-to-Ground (DLG b–c–g)',
    classification: 'Asymmetrical Ground Fault',
    sequenceRule: 'Parallel connection: Z₁ + [Z₂ ∥ (Z₀ + 3Z_f)]',
    equation: 'V₁ = V₂ = V₀ = E − I₁·Z₁',
    characteristics:
      'Two phases short simultaneously to earth, splitting return current across negative and zero sequences. If Z₀ is open across a Δ transformer, it degenerates into a Line-to-Line fault.',
  },
};

function csvEscape(val: string | number): string {
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface FaultHistoryEntry {
  id: string;
  timestampLabel: string;
  trigger: 'auto' | 'snapshot';
  sourceLabel: 'D3 Grid' | 'Manual';
  faultBusName: string;
  faultType: FaultType;
  faultShortLabel: string;
  symRmsKa: number;
  asymRmsKa: number;
  peakMomentaryKa: number;
  faultMva: number;
  xrRatio: number;
  kAsymAtParting: number;
  freqHz: 50 | 60;
  contactCycles: number;
  inceptionMode: FaultInceptionMode;
  customInceptionDeg: number;
  fallbackXR: number;
  rfPu: number;
  sBaseMva: number;
  vBaseKv: number;
  z1: Cpx;
  z2: Cpx;
  z0: Cpx;
  z0Open: boolean;
  graphSnapshot?: SequenceNetworkGraph | null;
  signature: string;
}

interface LiveFaultCurrentPanelProps {
  title?: string;
  subtitle?: string;
  z1: Cpx;
  z2: Cpx;
  z0: Cpx;
  z0Open: boolean;
  z1Open?: boolean;
  rfPu: number;
  sBaseMva: number;
  vBaseKv: number;
  faultBusName?: string;
  selectedFaultType: FaultType;
  onSelectFaultType: (ft: FaultType) => void;
  onJumpToD3?: () => void;
  sourceMode?: 'd3' | 'manual';
  currentGraph?: SequenceNetworkGraph | null;
  historyEntries?: FaultHistoryEntry[];
  onAddHistoryEntry?: (entry: FaultHistoryEntry) => void;
  onClearHistory?: () => void;
  onRestoreSimulation?: (entry: FaultHistoryEntry) => void;
}

function cloneGraphSafe(g?: SequenceNetworkGraph | null): SequenceNetworkGraph | null {
  if (!g) return null;
  return JSON.parse(JSON.stringify(g)) as SequenceNetworkGraph;
}

function formatClockTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export const LiveFaultCurrentPanel: React.FC<LiveFaultCurrentPanelProps> = ({
  title = 'Live Symmetrical & Asymmetrical Fault Current Panel',
  subtitle,
  z1,
  z2,
  z0,
  z0Open,
  z1Open = false,
  rfPu,
  sBaseMva,
  vBaseKv,
  faultBusName = 'Fault Bus',
  selectedFaultType,
  onSelectFaultType,
  onJumpToD3,
  sourceMode = 'd3',
  currentGraph = null,
  historyEntries,
  onAddHistoryEntry,
  onClearHistory,
  onRestoreSimulation,
}) => {
  const faultRadioName = useId();
  const fieldsetRef = useRef<HTMLFieldSetElement | null>(null);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);
  const suppressAutoSignatureRef = useRef<string | null>(null);

  const [freqHz, setFreqHz] = useState<50 | 60>(50);
  const [contactCycles, setContactCycles] = useState<number>(3);
  const [inceptionMode, setInceptionMode] = useState<FaultInceptionMode>('worst_case');
  const [customInceptionDeg, setCustomInceptionDeg] = useState<number>(0);
  const [fallbackXR, setFallbackXR] = useState<number>(15);
  const [hoveredFaultInfo, setHoveredFaultInfo] = useState<FaultType | null>(null);
  const [pinnedFaultInfo, setPinnedFaultInfo] = useState<FaultType | null>(null);
  const [csvExported, setCsvExported] = useState<boolean>(false);
  const [hoverWavePt, setHoverWavePt] = useState<AsymmetricalTransientPoint | null>(null);
  const [localHistory, setLocalHistory] = useState<FaultHistoryEntry[]>([]);
  const [restoredEntryId, setRestoredEntryId] = useState<string | null>(null);
  const [snapshotSaved, setSnapshotSaved] = useState<boolean>(false);

  const resolvedHistory = historyEntries ?? localHistory;

  useEffect(() => {
    if (!pinnedFaultInfo) return;
    const handlePointerDown = (ev: MouseEvent) => {
      if (fieldsetRef.current && !fieldsetRef.current.contains(ev.target as Node)) {
        setPinnedFaultInfo(null);
      }
    };
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setPinnedFaultInfo(null);
        setHoveredFaultInfo(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pinnedFaultInfo]);

  const zf = useMemo(() => ({ re: Math.max(0, rfPu), im: 0 }), [rfPu]);

  const allCases = useMemo(() => {
    if (z1Open) return [];
    return solveAllFaultTypes({
      ePreFaultPu: 1.0,
      z1,
      z2,
      z0,
      z0Open,
      zf,
      sBaseMva,
      vBaseLineKv: vBaseKv,
    });
  }, [z1Open, z1, z2, z0, z0Open, zf, sBaseMva, vBaseKv]);

  const caseTransients = useMemo(() => {
    return allCases.map((fc) => ({
      faultCase: fc,
      transient: computeAsymmetricalFaultTransient({
        symRmsKa: fc.analysis.faultCurrentKa,
        symInterruptingMva: fc.analysis.faultMva,
        zLoop: fc.zLoop,
        freqHz,
        contactCycles,
        inceptionMode,
        customInceptionDeg,
        fallbackXR,
      }),
    }));
  }, [allCases, freqHz, contactCycles, inceptionMode, customInceptionDeg, fallbackXR]);

  const activeEntry =
    caseTransients.find((e) => e.faultCase.faultType === selectedFaultType) ??
    caseTransients[0] ??
    null;

  // Compute SVG phasor endpoints for Ia, Ib, Ic
  const phasorVectors = useMemo(() => {
    if (!activeEntry) return [];
    const { ia, ib, ic } = activeEntry.faultCase.analysis;
    const maxMag = Math.max(0.01, cMag(ia), cMag(ib), cMag(ic));
    const scale = 78 / maxMag;
    const toSvg = (c: Cpx) => ({
      x: c.re * scale,
      y: -c.im * scale, // SVG Y points down
      magPu: cMag(c),
      deg: cAngDeg(c),
      magKa: cMag(c) * activeEntry.faultCase.analysis.iBaseKa,
    });
    return [
      { key: 'Ia', label: 'I_a', color: '#047857', ...toSvg(ia) },
      { key: 'Ib', label: 'I_b', color: '#0284C7', ...toSvg(ib) },
      { key: 'Ic', label: 'I_c', color: '#D97706', ...toSvg(ic) },
    ];
  }, [activeEntry]);

  useEffect(() => {
    setHoverWavePt(null);
    const svgEl = chartSvgRef.current;
    if (!svgEl || z1Open || !activeEntry) return;

    const { transient: activeTransient } = activeEntry;
    const data = activeTransient.waveform;
    if (data.length === 0) return;

    const width = 640;
    const height = 310;
    const margin = { top: 24, right: 20, bottom: 40, left: 58 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xMax = d3.max(data, (d) => d.tMs) ?? 100;
    const xScale = d3.scaleLinear().domain([0, xMax]).range([0, innerW]);

    const yMinRaw =
      d3.min(data, (d) => Math.min(d.iTotalKa, d.iAcKa, d.iDcKa, d.envLowerKa)) ?? -1;
    const yMaxRaw =
      d3.max(data, (d) => Math.max(d.iTotalKa, d.iAcKa, d.iDcKa, d.envUpperKa)) ?? 1;
    const ySpan = Math.max(0.5, yMaxRaw - yMinRaw);
    const yScale = d3
      .scaleLinear()
      .domain([yMinRaw - ySpan * 0.08, yMaxRaw + ySpan * 0.08])
      .nice()
      .range([innerH, 0]);

    // Horizontal & vertical gridlines
    g.append('g')
      .attr('class', 'grid-y')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(6)
          .tickSize(-innerW)
          .tickFormat(() => '')
      )
      .call((grp) => {
        grp.select('.domain').remove();
        grp
          .selectAll('line')
          .attr('stroke', '#e2e8f0')
          .attr('stroke-dasharray', '2,3');
      });

    g.append('g')
      .attr('class', 'grid-x')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(6)
          .tickSize(-innerH)
          .tickFormat(() => '')
      )
      .call((grp) => {
        grp.select('.domain').remove();
        grp
          .selectAll('line')
          .attr('stroke', '#e2e8f0')
          .attr('stroke-dasharray', '2,3');
      });

    // Zero current baseline
    if (yScale.domain()[0] < 0 && yScale.domain()[1] > 0) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 1);
    }

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(6)
      .tickFormat((d) => `${Number(d).toFixed(0)} ms`);
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(6)
      .tickFormat((d) => `${Number(d).toFixed(1)}`);

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis)
      .call((grp) => {
        grp.select('.domain').attr('stroke', '#cbd5e1');
        grp.selectAll('line').attr('stroke', '#cbd5e1');
        grp
          .selectAll('text')
          .attr('fill', '#475569')
          .attr('font-size', '10px')
          .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');
      });

    g.append('g')
      .call(yAxis)
      .call((grp) => {
        grp.select('.domain').attr('stroke', '#cbd5e1');
        grp.selectAll('line').attr('stroke', '#cbd5e1');
        grp
          .selectAll('text')
          .attr('fill', '#475569')
          .attr('font-size', '10px')
          .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');
      });

    // Axis labels
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + 32)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text('Time after fault inception (ms)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -43)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text('Current (kA)');

    // Line generators
    const makeLine = (accessor: (d: AsymmetricalTransientPoint) => number) =>
      d3
        .line<AsymmetricalTransientPoint>()
        .x((d) => xScale(d.tMs))
        .y((d) => yScale(accessor(d)))
        .curve(d3.curveMonotoneX);

    // Subtle asymmetry decay envelopes
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#fca5a5')
      .attr('stroke-width', 1.1)
      .attr('stroke-dasharray', '2,3')
      .attr('d', makeLine((d) => d.envUpperKa));

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#fca5a5')
      .attr('stroke-width', 1.1)
      .attr('stroke-dasharray', '2,3')
      .attr('d', makeLine((d) => d.envLowerKa));

    // AC symmetrical current i_ac(t)
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#047857')
      .attr('stroke-width', 1.65)
      .attr('stroke-dasharray', '5,4')
      .attr('d', makeLine((d) => d.iAcKa));

    // DC offset component I_dc(t)
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#d97706')
      .attr('stroke-width', 1.9)
      .attr('d', makeLine((d) => d.iDcKa));

    // Total asymmetrical current i(t)
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#dc2626')
      .attr('stroke-width', 2.4)
      .attr('d', makeLine((d) => d.iTotalKa));

    // Breaker contact parting reference line
    if (activeTransient.tPartMs >= 0 && activeTransient.tPartMs <= xMax) {
      const partX = xScale(activeTransient.tPartMs);
      g.append('line')
        .attr('x1', partX)
        .attr('x2', partX)
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', '#0284c7')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3');

      const anchorRight = partX > innerW - 110;
      g.append('text')
        .attr('x', anchorRight ? partX - 5 : partX + 5)
        .attr('y', -7)
        .attr('text-anchor', anchorRight ? 'end' : 'start')
        .attr('fill', '#0369a1')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .text(`${contactCycles}c Parting (${activeTransient.tPartMs.toFixed(1)} ms)`);
    }

    // Interactive crosshair + snapped focus markers
    const focusGroup = g.append('g').style('display', 'none');

    const crosshairLine = focusGroup
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#64748b')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,2');

    const dotTotal = focusGroup
      .append('circle')
      .attr('r', 4)
      .attr('fill', '#dc2626')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    const dotAc = focusGroup
      .append('circle')
      .attr('r', 3.5)
      .attr('fill', '#047857')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    const dotDc = focusGroup
      .append('circle')
      .attr('r', 3.5)
      .attr('fill', '#d97706')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    const bisectTime = d3.bisector<AsymmetricalTransientPoint, number>((d) => d.tMs).center;

    g.append('rect')
      .attr('width', innerW)
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mouseenter', () => {
        focusGroup.style('display', null);
      })
      .on('mouseleave', () => {
        focusGroup.style('display', 'none');
        setHoverWavePt(null);
      })
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event);
        const tVal = xScale.invert(mx);
        const idx = Math.max(0, Math.min(data.length - 1, bisectTime(data, tVal)));
        const pt = data[idx];
        if (!pt) return;

        const px = xScale(pt.tMs);
        crosshairLine.attr('x1', px).attr('x2', px);
        dotTotal.attr('cx', px).attr('cy', yScale(pt.iTotalKa));
        dotAc.attr('cx', px).attr('cy', yScale(pt.iAcKa));
        dotDc.attr('cx', px).attr('cy', yScale(pt.iDcKa));
        setHoverWavePt(pt);
      });
  }, [activeEntry, contactCycles, z1Open]);

  const simulationSignature = useMemo(() => {
    return [
      sourceMode,
      faultBusName,
      selectedFaultType,
      z1.re.toFixed(4),
      z1.im.toFixed(4),
      z2.re.toFixed(4),
      z2.im.toFixed(4),
      z0Open ? 'OPEN' : `${z0.re.toFixed(4)},${z0.im.toFixed(4)}`,
      rfPu.toFixed(4),
      sBaseMva.toFixed(2),
      vBaseKv.toFixed(2),
      freqHz,
      contactCycles,
      inceptionMode,
      inceptionMode === 'custom' ? customInceptionDeg : 0,
      fallbackXR,
    ].join('|');
  }, [
    sourceMode,
    faultBusName,
    selectedFaultType,
    z1.re,
    z1.im,
    z2.re,
    z2.im,
    z0.re,
    z0.im,
    z0Open,
    rfPu,
    sBaseMva,
    vBaseKv,
    freqHz,
    contactCycles,
    inceptionMode,
    customInceptionDeg,
    fallbackXR,
  ]);

  const buildHistoryEntry = useCallback(
    (trigger: 'auto' | 'snapshot'): FaultHistoryEntry | null => {
      if (z1Open || !activeEntry) return null;
      const { faultCase: fc, transient: tr } = activeEntry;
      return {
        id: `fh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        timestampLabel: formatClockTime(new Date()),
        trigger,
        sourceLabel: sourceMode === 'd3' ? 'D3 Grid' : 'Manual',
        faultBusName,
        faultType: fc.faultType,
        faultShortLabel: fc.shortLabel,
        symRmsKa: tr.symRmsKa,
        asymRmsKa: tr.asymRmsKa,
        peakMomentaryKa: tr.peakMomentaryKa,
        faultMva: tr.asymInterruptingMva,
        xrRatio: tr.xrRatio,
        kAsymAtParting: tr.kAsymAtParting,
        freqHz,
        contactCycles,
        inceptionMode,
        customInceptionDeg,
        fallbackXR,
        rfPu,
        sBaseMva,
        vBaseKv,
        z1: { ...z1 },
        z2: { ...z2 },
        z0: { ...z0 },
        z0Open,
        graphSnapshot: sourceMode === 'd3' ? cloneGraphSafe(currentGraph) : null,
        signature: simulationSignature,
      };
    },
    [
      z1Open,
      activeEntry,
      sourceMode,
      faultBusName,
      freqHz,
      contactCycles,
      inceptionMode,
      customInceptionDeg,
      fallbackXR,
      rfPu,
      sBaseMva,
      vBaseKv,
      z1,
      z2,
      z0,
      z0Open,
      currentGraph,
      simulationSignature,
    ]
  );

  const pushHistoryEntry = useCallback(
    (entry: FaultHistoryEntry) => {
      if (onAddHistoryEntry) {
        onAddHistoryEntry(entry);
      } else {
        setLocalHistory((prev) => [entry, ...prev].slice(0, 10));
      }
    },
    [onAddHistoryEntry]
  );

  // Debounced auto-log when simulation parameters settle
  useEffect(() => {
    if (z1Open || !activeEntry) return;
    if (suppressAutoSignatureRef.current === simulationSignature) {
      suppressAutoSignatureRef.current = null;
      return;
    }
    const latestSig = resolvedHistory[0]?.signature;
    if (latestSig === simulationSignature) return;

    const timer = window.setTimeout(() => {
      const entry = buildHistoryEntry('auto');
      if (entry) {
        pushHistoryEntry(entry);
      }
    }, 750);

    return () => window.clearTimeout(timer);
  }, [
    z1Open,
    activeEntry,
    simulationSignature,
    resolvedHistory,
    buildHistoryEntry,
    pushHistoryEntry,
  ]);

  const handleSaveSnapshot = () => {
    const entry = buildHistoryEntry('snapshot');
    if (!entry) return;
    pushHistoryEntry(entry);
    setSnapshotSaved(true);
    window.setTimeout(() => setSnapshotSaved(false), 1400);
  };

  const handleClearHistory = () => {
    if (onClearHistory) {
      onClearHistory();
    } else {
      setLocalHistory([]);
    }
    setRestoredEntryId(null);
  };

  const handleRestoreEntry = (entry: FaultHistoryEntry) => {
    suppressAutoSignatureRef.current = entry.signature;
    setFreqHz(entry.freqHz);
    setContactCycles(entry.contactCycles);
    setInceptionMode(entry.inceptionMode);
    setCustomInceptionDeg(entry.customInceptionDeg);
    setFallbackXR(entry.fallbackXR);
    onSelectFaultType(entry.faultType);
    onRestoreSimulation?.(entry);
    setRestoredEntryId(entry.id);
    window.setTimeout(() => {
      setRestoredEntryId((cur) => (cur === entry.id ? null : cur));
    }, 1800);
  };

  if (z1Open || !activeEntry) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
        <h3 className="text-sm font-bold text-slate-950">{title}</h3>
        <p className="text-xs text-slate-600">
          Connect at least one Positive-sequence generator path to {faultBusName} on the D3 canvas to calculate live symmetrical and asymmetrical fault currents.
        </p>
      </div>
    );
  }

  const { faultCase, transient } = activeEntry;
  const iBaseKa = faultCase.analysis.iBaseKa;

  const handleExportCsv = () => {
    const rows: (string | number)[][] = [
      ['ECE 471 Fault Current & Transient Report'],
      ['Target Bus', faultBusName],
      ['Active Fault Type', faultCase.label],
      ['Classification', faultCase.classification],
      ['System S_base (MVA)', sBaseMva],
      ['Bus V_base (kV)', vBaseKv],
      ['Base Current I_base (kA)', iBaseKa.toFixed(4)],
      ['Thevenin Z1 (pu)', cFmtRect(z1, 4)],
      ['Thevenin Z2 (pu)', cFmtRect(z2, 4)],
      ['Thevenin Z0 (pu)', z0Open ? 'Open (Infinity)' : cFmtRect(z0, 4)],
      ['Fault Impedance Rf (pu)', rfPu.toFixed(4)],
      ['System Frequency (Hz)', freqHz],
      ['Breaker Parting Time (cycles)', contactCycles],
      ['Breaker Parting Time (ms)', transient.tPartMs.toFixed(2)],
      ['Fault Inception Mode', inceptionMode === 'custom' ? `Custom ${customInceptionDeg} deg` : inceptionMode],
      ['Effective X/R Ratio', transient.xrRatio.toFixed(3)],
      ['X/R Source', transient.xrSource === 'network' ? 'Network R+jX' : 'Fallback X/R setting'],
      ['DC Time Constant tau_dc (ms)', transient.tauDcMs.toFixed(3)],
      ['Asymmetrical Multiplying Factor k_asym', transient.kAsymAtParting.toFixed(4)],
      ['Symmetrical Fault Current I_sym (kA)', transient.symRmsKa.toFixed(4)],
      ['Symmetrical Breaker Duty (MVA)', transient.symInterruptingMva.toFixed(2)],
      ['Asymmetrical RMS Current I_asym (kA)', transient.asymRmsKa.toFixed(4)],
      ['Asymmetrical Breaker Duty (MVA)', transient.asymInterruptingMva.toFixed(2)],
      ['Momentary Peak Current i_peak (kA)', transient.peakMomentaryKa.toFixed(4)],
      ['Phase Current Ia (pu)', cFmtPolar(faultCase.analysis.ia, 4)],
      ['Phase Current Ib (pu)', cFmtPolar(faultCase.analysis.ib, 4)],
      ['Phase Current Ic (pu)', cFmtPolar(faultCase.analysis.ic, 4)],
      ['Positive Sequence I1 (pu)', cFmtPolar(faultCase.analysis.i1, 4)],
      ['Negative Sequence I2 (pu)', cFmtPolar(faultCase.analysis.i2, 4)],
      ['Zero Sequence I0 (pu)', cFmtPolar(faultCase.analysis.i0, 4)],
      [],
      ['All Fault Types Comparison'],
      [
        'Fault Type',
        'Classification',
        'Max |I| (pu)',
        'I_sym (kA)',
        'I_asym (kA)',
        'Momentary Peak (kA)',
        'Fault MVA',
        'X/R Ratio',
        'Zero-Sequence Status',
      ],
      ...caseTransients.map(({ faultCase: fc, transient: tr }) => [
        fc.label,
        fc.classification,
        fc.maxIPu.toFixed(4),
        tr.symRmsKa.toFixed(4),
        tr.asymRmsKa.toFixed(4),
        tr.peakMomentaryKa.toFixed(4),
        fc.analysis.faultMva.toFixed(2),
        tr.xrRatio.toFixed(2),
        fc.isBlockedByZeroSeq && fc.faultType === 'slg' ? 'Blocked by Delta (Z0 = Open)' : 'Active',
      ]),
      [],
      [`Transient Current Waveform i(t) - ${faultCase.label}`],
      [
        'Time t (ms)',
        'Total Asymmetrical i_total (kA)',
        'AC Symmetrical i_ac (kA)',
        'DC Offset I_dc (kA)',
        'Upper Envelope (kA)',
        'Lower Envelope (kA)',
      ],
      ...transient.waveform.map((pt) => [
        pt.tMs.toFixed(2),
        pt.iTotalKa.toFixed(4),
        pt.iAcKa.toFixed(4),
        pt.iDcKa.toFixed(4),
        pt.envUpperKa.toFixed(4),
        pt.envLowerKa.toFixed(4),
      ]),
    ];

    const csvString = rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeBus = faultBusName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bus';
    link.href = url;
    link.download = `ece471-fault-${safeBus}-${faultCase.faultType}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCsvExported(true);
    window.setTimeout(() => setCsvExported(false), 1800);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
      {/* Header & Transient Controls */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-950">{title}</h3>
            {onJumpToD3 && (
              <button
                type="button"
                onClick={onJumpToD3}
                className="inline-flex items-center gap-1 cursor-pointer rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 hover:bg-sky-100"
              >
                <span>Edit D3 Grid</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">
            {subtitle ??
              `Target: ${faultBusName} · S_base = ${sBaseMva} MVA · V_base = ${vBaseKv} kV · I_base = ${iBaseKa.toFixed(
                3
              )} kA`}
          </p>
        </div>

        {/* Frequency / Breaker Parting / Inception Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            {([50, 60] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFreqHz(f)}
                className={`cursor-pointer rounded px-2 py-1 text-[11px] font-semibold ${
                  freqHz === f ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                }`}
              >
                {f} Hz
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px]">
            <span className="text-slate-600 font-medium whitespace-nowrap">Breaker Parting</span>
            <select
              value={contactCycles}
              onChange={(e) => setContactCycles(Number(e.target.value))}
              className="bg-transparent font-mono font-semibold text-slate-950 focus:outline-none"
            >
              <option value={2}>2 cyc</option>
              <option value={3}>3 cyc</option>
              <option value={5}>5 cyc</option>
              <option value={8}>8 cyc</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px]">
            <span className="text-slate-600 font-medium whitespace-nowrap">Inception</span>
            <select
              value={inceptionMode}
              onChange={(e) => setInceptionMode(e.target.value as FaultInceptionMode)}
              className="bg-transparent font-semibold text-slate-950 focus:outline-none"
            >
              <option value="worst_case">Worst-Case DC Offset</option>
              <option value="zero_crossing">Zero DC (Symmetrical)</option>
              <option value="custom">Custom Angle α°</option>
            </select>
          </label>

          {inceptionMode === 'custom' && (
            <label className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]">
              <span className="text-slate-600">α°</span>
              <input
                type="number"
                min={-180}
                max={180}
                step={5}
                value={customInceptionDeg}
                onChange={(e) => setCustomInceptionDeg(Number(e.target.value) || 0)}
                className="w-12 rounded border border-slate-200 bg-white px-1 py-0.5 font-mono tabular-nums"
              />
            </label>
          )}

          <label
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]"
            title="Used when network R = 0 (ideal lossless reactance model)"
          >
            <span className="text-slate-600 whitespace-nowrap">Default X/R</span>
            <input
              type="number"
              min={2}
              max={80}
              step={1}
              value={fallbackXR}
              onChange={(e) => setFallbackXR(Math.max(2, Number(e.target.value) || 15))}
              className="w-12 rounded border border-slate-200 bg-white px-1 py-0.5 font-mono tabular-nums"
            />
          </label>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-slate-900 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {csvExported ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Exported CSV</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Fault Type Radio-Button Selector (3ϕ / SLG / LL / DLG) with Info Popovers */}
      <fieldset
        ref={fieldsetRef}
        className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5"
      >
        <legend className="px-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
          Select Fault Simulation Type
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          {(
            [
              { id: '3ph', title: '3ϕ Balanced', sub: 'Symmetrical' },
              { id: 'slg', title: 'SLG (a–g)', sub: 'Single Line-to-Ground' },
              { id: 'll', title: 'LL (b–c)', sub: 'Line-to-Line' },
              { id: 'dlg', title: 'DLG (b–c–g)', sub: 'Double Line-to-Ground' },
            ] as const
          ).map((opt, idx) => {
            const isChecked = selectedFaultType === opt.id;
            const isPinned = pinnedFaultInfo === opt.id;
            const isOpen = isPinned || (pinnedFaultInfo === null && hoveredFaultInfo === opt.id);
            const info = FAULT_CHAR_INFO[opt.id];
            const alignRight = idx >= 2;

            return (
              <div
                key={opt.id}
                className={`relative flex items-center justify-between gap-1.5 rounded-lg border transition-colors ${
                  isChecked
                    ? 'border-red-600 bg-white text-slate-950 shadow-xs'
                    : 'border-slate-200 bg-white/75 text-slate-700 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <label className="flex flex-1 min-w-0 items-center gap-2.5 cursor-pointer px-3 py-2">
                  <input
                    type="radio"
                    name={faultRadioName}
                    value={opt.id}
                    checked={isChecked}
                    onChange={() => onSelectFaultType(opt.id)}
                    className="h-3.5 w-3.5 accent-red-700 cursor-pointer shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-950 leading-tight whitespace-nowrap">
                      {opt.title}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{opt.sub}</div>
                  </div>
                </label>

                <button
                  type="button"
                  aria-label={`Fault characteristics for ${opt.title}`}
                  aria-expanded={isOpen}
                  onMouseEnter={() => setHoveredFaultInfo(opt.id)}
                  onMouseLeave={() =>
                    setHoveredFaultInfo((curr) => (curr === opt.id ? null : curr))
                  }
                  onFocus={() => setHoveredFaultInfo(opt.id)}
                  onBlur={() =>
                    setHoveredFaultInfo((curr) => (curr === opt.id ? null : curr))
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinnedFaultInfo((curr) => (curr === opt.id ? null : opt.id));
                  }}
                  className={`mr-2 p-1.5 rounded-md cursor-pointer transition-colors shrink-0 ${
                    isPinned
                      ? 'bg-sky-100 text-sky-900'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>

                {isOpen && (
                  <div
                    role="dialog"
                    aria-label={info.name}
                    className={`absolute top-full mt-2 z-30 w-72 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg text-left space-y-2 ${
                      alignRight ? 'right-0' : 'left-0'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <div className="text-xs font-bold text-slate-950">{info.name}</div>
                        <div className="text-[11px] font-medium text-slate-500">
                          {info.classification}
                        </div>
                      </div>
                      {isPinned && (
                        <button
                          type="button"
                          aria-label="Close popover"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPinnedFaultInfo(null);
                          }}
                          className="cursor-pointer rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="font-semibold text-sky-900">{info.sequenceRule}</div>
                      <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10.5px] text-slate-900">
                        {info.equation}
                      </div>
                    </div>

                    <p className="text-[11px] leading-relaxed text-slate-600">
                      {info.characteristics}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* Top 4 Breaker Duty & Symmetrical / Asymmetrical KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
          <div className="text-[11px] font-semibold text-emerald-900">
            Symmetrical I_sym ({faultCase.shortLabel})
          </div>
          <div className="font-mono tabular-nums text-lg font-bold text-emerald-950 mt-0.5">
            {transient.symRmsKa.toFixed(3)} kA
          </div>
          <div className="font-mono tabular-nums text-[11px] text-emerald-800">
            Sym Duty = {transient.symInterruptingMva.toFixed(1)} MVA
          </div>
        </div>

        <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3">
          <div className="text-[11px] font-semibold text-sky-900">
            Asymmetrical I_asym (@ {contactCycles} cyc)
          </div>
          <div className="font-mono tabular-nums text-lg font-bold text-sky-950 mt-0.5">
            {transient.asymRmsKa.toFixed(3)} kA
          </div>
          <div className="font-mono tabular-nums text-[11px] text-sky-800">
            k_asym = {transient.kAsymAtParting.toFixed(3)}× · {transient.asymInterruptingMva.toFixed(1)} MVA
          </div>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
          <div className="text-[11px] font-semibold text-red-900">
            Momentary Peak i_peak
          </div>
          <div className="font-mono tabular-nums text-lg font-bold text-red-950 mt-0.5">
            {transient.peakMomentaryKa.toFixed(3)} kA
          </div>
          <div className="font-mono tabular-nums text-[11px] text-red-800">
            Peak factor = {transient.peakDoublingFactor.toFixed(3)} × √2·I_sym
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <div className="text-[11px] font-semibold text-amber-900">
            Effective X/R &amp; DC Decay τ
          </div>
          <div className="font-mono tabular-nums text-lg font-bold text-amber-950 mt-0.5">
            X/R = {transient.xrRatio.toFixed(1)}
          </div>
          <div className="font-mono tabular-nums text-[11px] text-amber-800">
            τ_dc = {transient.tauDcMs.toFixed(1)} ms ({transient.xrSource === 'network' ? 'from network R+jX' : 'from default X/R'})
          </div>
        </div>
      </div>

      {/* Main 12-Column Comparison Table + Phasor + Transient Waveform */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left 6 Cols: All-4-Fault Table + Ia/Ib/Ic Phasor Diagram */}
        <div className="xl:col-span-6 space-y-4">
          {/* Side-by-Side 4-Fault Comparison Table */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-900">
                All Fault Cases at {faultBusName} (Click Row to Inspect)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                R_f = {rfPu.toFixed(2)} pu
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] text-slate-600">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Fault Type</th>
                    <th className="py-2 px-2 font-semibold text-right">Max |I| (pu)</th>
                    <th className="py-2 px-2 font-semibold text-right">I_sym (kA)</th>
                    <th className="py-2 px-2 font-semibold text-right">I_asym (kA)</th>
                    <th className="py-2 px-2 font-semibold text-right">Peak (kA)</th>
                    <th className="py-2 px-3 font-semibold text-right">Fault MVA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {caseTransients.map(({ faultCase: fc, transient: tr }) => {
                    const isRowActive = fc.faultType === faultCase.faultType;
                    return (
                      <tr
                        key={fc.faultType}
                        onClick={() => onSelectFaultType(fc.faultType)}
                        className={`cursor-pointer transition-colors ${
                          isRowActive
                            ? 'bg-sky-50/90 text-slate-950 font-semibold'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <td className="py-2 px-3 font-sans">
                          <div className="font-semibold text-slate-950">{fc.label}</div>
                          <div className="text-[10px] text-slate-500">
                            {fc.classification}
                            {fc.isBlockedByZeroSeq && fc.faultType === 'slg'
                              ? ' · Blocked by Δ (Z₀ = ∞)'
                              : ''}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right">{fc.maxIPu.toFixed(3)}</td>
                        <td className="py-2 px-2 text-right text-emerald-800">
                          {tr.symRmsKa.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-sky-800">
                          {tr.asymRmsKa.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-red-700">
                          {tr.peakMomentaryKa.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {fc.analysis.faultMva.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Phase Current Phasor Diagram (Ia, Ib, Ic) & Sequence Currents */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Phase Current Phasor Diagram ({faultCase.label})
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {faultCase.topologyHint}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-5">
                <svg
                  viewBox="-110 -110 220 220"
                  className="w-full max-w-[205px] mx-auto rounded-lg border border-slate-200 bg-white"
                  aria-label="Phase Current Phasors Ia Ib Ic"
                >
                  <circle cx="0" cy="0" r="80" fill="none" stroke="#e2e8f0" strokeDasharray="3 3" />
                  <circle cx="0" cy="0" r="40" fill="none" stroke="#f1f5f9" />
                  <line x1="-96" y1="0" x2="96" y2="0" stroke="#cbd5e1" strokeWidth="1" />
                  <line x1="0" y1="-96" x2="0" y2="96" stroke="#cbd5e1" strokeWidth="1" />

                  <defs>
                    {phasorVectors.map((pv) => (
                      <marker
                        key={`arrow-${pv.key}`}
                        id={`phasor-arrow-${pv.key}`}
                        markerWidth="7"
                        markerHeight="7"
                        refX="5"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon points="0 0, 7 3.5, 0 7" fill={pv.color} />
                      </marker>
                    ))}
                  </defs>

                  {phasorVectors.map((pv) => {
                    const len = Math.hypot(pv.x, pv.y);
                    if (len < 2) return null;
                    return (
                      <g key={pv.key}>
                        <line
                          x1="0"
                          y1="0"
                          x2={pv.x}
                          y2={pv.y}
                          stroke={pv.color}
                          strokeWidth="2.4"
                          markerEnd={`url(#phasor-arrow-${pv.key})`}
                        />
                        <text
                          x={pv.x * 1.15}
                          y={pv.y * 1.15 + 3}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="700"
                          fill={pv.color}
                        >
                          {pv.key}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="sm:col-span-7 space-y-1.5 font-mono tabular-nums text-[11px]">
                {phasorVectors.map((pv) => (
                  <div
                    key={pv.key}
                    className="flex items-center justify-between rounded border border-slate-200 bg-white px-2.5 py-1.5"
                  >
                    <span className="font-bold" style={{ color: pv.color }}>
                      {pv.label}
                    </span>
                    <span className="text-slate-900">
                      {pv.magPu.toFixed(3)} ∠ {pv.deg.toFixed(1)}° pu ({pv.magKa.toFixed(2)} kA)
                    </span>
                  </div>
                ))}

                <div className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 space-y-0.5">
                  <div className="flex justify-between">
                    <span>I₁ (Pos)</span>
                    <span>{cFmtPolar(faultCase.analysis.i1, 3)} pu</span>
                  </div>
                  <div className="flex justify-between">
                    <span>I₂ (Neg)</span>
                    <span>{cFmtPolar(faultCase.analysis.i2, 3)} pu</span>
                  </div>
                  <div className="flex justify-between">
                    <span>I₀ (Zero)</span>
                    <span>{cFmtPolar(faultCase.analysis.i0, 3)} pu</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 6 Cols: Asymmetrical i(t) Transient Waveform & DC-Offset Plot */}
        <div className="xl:col-span-6 rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div>
              <h4 className="text-xs font-bold text-slate-950">
                Asymmetrical Short-Circuit Current i(t) &amp; DC Offset ({faultCase.shortLabel})
              </h4>
              <p className="text-[11px] font-mono text-slate-500">
                i(t) = √2·I_sym·[sin(ωt + α − θ) − sin(α − θ)·e^(−t/τ)] · Parting at t ={' '}
                {transient.tPartMs.toFixed(1)} ms
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 bg-red-600" />
                Total i_asym(t)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-emerald-700" />
                AC Symmetrical
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 bg-amber-600" />
                DC Offset I_dc(t)
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <span className="inline-block h-0.5 w-4 border-t border-dotted border-red-300" />
                Envelope
              </span>
            </div>

            <div className="font-mono tabular-nums text-[11px] text-slate-700 rounded border border-slate-200 bg-slate-50 px-2 py-0.5">
              {hoverWavePt ? (
                <span>
                  t={hoverWavePt.tMs.toFixed(1)} ms ·{' '}
                  <strong className="text-red-700">i={hoverWavePt.iTotalKa.toFixed(2)}</strong> ·{' '}
                  <span className="text-emerald-800">ac={hoverWavePt.iAcKa.toFixed(2)}</span> ·{' '}
                  <span className="text-amber-700">dc={hoverWavePt.iDcKa.toFixed(2)}</span> kA
                </span>
              ) : (
                <span className="text-slate-500">
                  Hover D3 waveform · Peak {transient.peakMomentaryKa.toFixed(2)} kA
                </span>
              )}
            </div>
          </div>

          <div className="w-full">
            <svg
              ref={chartSvgRef}
              viewBox="0 0 640 310"
              className="w-full h-[295px] select-none rounded-lg border border-slate-200 bg-slate-50/40"
              role="img"
              aria-label={`Real-time D3.js transient fault current waveform for ${faultCase.shortLabel}`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] font-mono tabular-nums border-t border-slate-100 pt-2.5 text-slate-700">
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="font-sans font-semibold text-slate-900">Asymmetrical RMS at Parting</div>
              <div>
                I_asym = I_sym · √(1 + 2·e^(−2t/τ)) = {transient.asymRmsKa.toFixed(3)} kA
              </div>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="font-sans font-semibold text-slate-900">Breaker Interrupting Duty</div>
              <div>
                √3 · {vBaseKv} kV · {transient.asymRmsKa.toFixed(2)} kA ={' '}
                {transient.asymInterruptingMva.toFixed(1)} MVA
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Session Simulation History Log (Last 10 Runs) */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-700" aria-hidden="true" />
              <h4 className="text-xs font-bold text-slate-950">
                Session Fault Simulation History ({resolvedHistory.length}/10)
              </h4>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Auto-records settled fault runs during this session · Click any entry to restore parameters
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveSnapshot}
              className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 whitespace-nowrap shrink-0"
            >
              {snapshotSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Save Snapshot</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={resolvedHistory.length === 0}
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1 cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          </div>
        </div>

        {resolvedHistory.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500">
            No fault simulations logged yet. Toggle fault types or adjust network parameters to record up to 10 recent runs, or click Save Snapshot.
          </div>
        ) : (
          <div
            className="max-h-[250px] overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100"
            role="region"
            aria-label="Scrollable fault simulation history log"
          >
            {resolvedHistory.map((entry, idx) => {
              const isJustRestored = restoredEntryId === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleRestoreEntry(entry)}
                  className={`cursor-pointer w-full text-left px-3.5 py-2.5 transition-colors flex flex-wrap items-center justify-between gap-2 hover:bg-emerald-50/40 ${
                    isJustRestored ? 'bg-emerald-50/70' : ''
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span className="font-mono tabular-nums text-[11px] text-slate-500">
                        #{idx + 1} · {entry.timestampLabel}
                      </span>
                      <span className="font-bold text-slate-950">{entry.faultShortLabel}</span>
                      <span className="text-slate-400" aria-hidden="true">·</span>
                      <span className="text-slate-700 font-medium">{entry.faultBusName}</span>
                      <span className="text-slate-400" aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] text-slate-600">
                        {entry.sourceLabel} · {entry.trigger === 'snapshot' ? 'Snapshot' : 'Auto'}
                      </span>
                    </div>
                    <div className="font-mono tabular-nums text-[11px] text-slate-500">
                      {entry.freqHz} Hz · {entry.contactCycles}c parting · R_f={entry.rfPu.toFixed(3)} pu · Z₀={entry.z0Open ? 'Open' : cFmtRect(entry.z0, 3)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 font-mono tabular-nums text-xs">
                    <div className="text-right">
                      <div className="font-bold text-emerald-900">
                        I_sym {entry.symRmsKa.toFixed(2)} kA
                      </div>
                      <div className="text-[11px] text-red-700">
                        I_asym {entry.asymRmsKa.toFixed(2)} kA · Peak {entry.peakMomentaryKa.toFixed(2)} kA
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-600 hidden sm:block">
                      <div>{entry.faultMva.toFixed(1)} MVA</div>
                      <div>X/R {entry.xrRatio.toFixed(1)}</div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-700">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isJustRestored ? 'Restored' : 'Restore'}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
