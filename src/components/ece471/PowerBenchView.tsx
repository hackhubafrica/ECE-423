import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { POWER_SCRIPT_PACK } from '../../data/ece471PracticeData';
import { FaultHistoryEntry, LiveFaultCurrentPanel } from './LiveFaultCurrentPanel';
import {
  cloneSequenceGraph,
  SequenceNetworkD3Section,
} from './SequenceNetworkD3Section';
import { UnitConversionSidebar } from './UnitConversionSidebar';
import {
  cAngDeg,
  cFmtPolar,
  cFmtRect,
  cMag,
  computeBewleyLattice,
  computeIdmtTripTime,
  computeLineParameters,
  computePeekCorona,
  cpx,
  cpxFromPolar,
  decomposeSymmetrical,
  FaultType,
  IdmtCurveType,
  SEQUENCE_NETWORK_TEMPLATES,
  SequenceNetworkGraph,
  solveEconomicDispatch,
  solvePowerFault,
  solveSequenceNetworkGraph,
} from '../../utils/powerMath';

export type PowerBenchTabId =
  | 'symmetrical_faults'
  | 'transients_protection'
  | 'pu_sequence'
  | 'line_corona_bench'
  | 'dispatch_bench'
  | 'scripts';

interface PowerBenchViewProps {
  initialSim?: PowerBenchTabId;
}

interface PowerBenchNavItem {
  id: PowerBenchTabId;
  shortCode: string;
  label: string;
  category: 'Faults & Protection' | 'Networks & Dispatch' | 'Code Export';
  description: string;
}

const BENCH_CATEGORIES: PowerBenchNavItem['category'][] = [
  'Faults & Protection',
  'Networks & Dispatch',
  'Code Export',
];

const BENCH_ITEMS: PowerBenchNavItem[] = [
  {
    id: 'symmetrical_faults',
    shortCode: 'SYM',
    label: 'Symmetrical & Fault Simulator',
    category: 'Faults & Protection',
    description: 'Fortescue 0/1/2 phasor decomposer plus balanced 3ϕ and unbalanced SLG/LL/DLG fault solver.',
  },
  {
    id: 'transients_protection',
    shortCode: 'WAV',
    label: 'Traveling Wave & Protection Lab',
    category: 'Faults & Protection',
    description: 'Bewley reflection bounce diagram, step transients, Mho Zones 1–3, and IEC IDMT curves.',
  },
  {
    id: 'pu_sequence',
    shortCode: 'PU',
    label: 'Per-Unit & Sequence Builder',
    category: 'Networks & Dispatch',
    description: 'Interactive D3.js diagram builder for p.u. conversions, Z₁/Z₂/Z₀ sequence networks, and nodal faults.',
  },
  {
    id: 'line_corona_bench',
    shortCode: 'CAT1',
    label: 'CAT 1 Line & Corona Sandbox',
    category: 'Networks & Dispatch',
    description: 'Compare single vs bundled overhead conductors, charging Mvar, and Peek corona.',
  },
  {
    id: 'dispatch_bench',
    shortCode: 'OPF',
    label: 'Economic Dispatch Sandbox',
    category: 'Networks & Dispatch',
    description: 'Adjust 3-unit cost coefficients a, b, c and load P_D to solve λ-iteration.',
  },
  {
    id: 'scripts',
    shortCode: 'CODE',
    label: `Julia / Python / MATLAB (${POWER_SCRIPT_PACK.length})`,
    category: 'Code Export',
    description: 'Copy or download runnable Julia, Python, and MATLAB power analysis scripts.',
  },
];

export const PowerBenchView: React.FC<PowerBenchViewProps> = ({ initialSim }) => {
  const [activeTab, setActiveTab] = useState<PowerBenchTabId>(
    initialSim || 'symmetrical_faults'
  );
  const [collapsed, setCollapsed] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    if (initialSim) {
      setActiveTab(initialSim);
    }
  }, [initialSim]);

  // =========================================================================
  // 0. LIFTED D3.JS SEQUENCE NETWORK GRAPH STATE (SHARED ACROSS BENCH TABS)
  // =========================================================================
  const [d3TemplateId, setD3TemplateId] = useState<string>(SEQUENCE_NETWORK_TEMPLATES[0].id);
  const [d3Graph, setD3Graph] = useState<SequenceNetworkGraph>(() =>
    cloneSequenceGraph(SEQUENCE_NETWORK_TEMPLATES[0].graph)
  );
  const solvedD3Graph = useMemo(() => solveSequenceNetworkGraph(d3Graph), [d3Graph]);

  const d3FaultBus = solvedD3Graph.faultBus;
  const d3VBaseKv = d3FaultBus?.vBaseKv ?? 132;
  const d3ZBaseOhm = (d3VBaseKv * d3VBaseKv) / Math.max(0.1, solvedD3Graph.sBaseMva);

  const [faultHistory, setFaultHistory] = useState<FaultHistoryEntry[]>([]);

  const handleAddFaultHistory = (entry: FaultHistoryEntry) => {
    setFaultHistory((prev) => [entry, ...prev].slice(0, 10));
  };

  const handleClearFaultHistory = () => {
    setFaultHistory([]);
  };

  const handleRestoreFaultSimulation = (entry: FaultHistoryEntry) => {
    if (entry.sourceLabel === 'D3 Grid' && entry.graphSnapshot) {
      setFaultSourceMode('d3');
      setD3TemplateId('custom');
      setD3Graph(cloneSequenceGraph(entry.graphSnapshot));
    } else {
      setFaultSourceMode('manual');
      setFaultType(entry.faultType);
      setZ1Pu(Number(entry.z1.im.toFixed(4)));
      setZ2Pu(Number(entry.z2.im.toFixed(4)));
      setZ0Pu(entry.z0Open ? 0.05 : Number(entry.z0.im.toFixed(4)));
      setZfPu(Number(entry.rfPu.toFixed(4)));
    }
  };

  const renderImpedanceSummaryCard = () => {
    const seqEntries = [
      {
        key: 'Z₁',
        title: 'Positive-Sequence (Z₁)',
        thevenin: solvedD3Graph.thevenin1,
        borderCls: 'border-emerald-200 bg-emerald-50/50',
        titleCls: 'text-emerald-900',
        valCls: 'text-emerald-950',
        subCls: 'text-emerald-800',
        openHint: 'No generator path to fault bus',
        closedHint: 'Balanced active source & branch path',
      },
      {
        key: 'Z₂',
        title: 'Negative-Sequence (Z₂)',
        thevenin: solvedD3Graph.thevenin2,
        borderCls: 'border-sky-200 bg-sky-50/50',
        titleCls: 'text-sky-900',
        valCls: 'text-sky-950',
        subCls: 'text-sky-800',
        openHint: 'No negative-sequence return path',
        closedHint: 'Active negative-sequence return path',
      },
      {
        key: 'Z₀',
        title: 'Zero-Sequence (Z₀)',
        thevenin: solvedD3Graph.thevenin0,
        borderCls: 'border-amber-200 bg-amber-50/50',
        titleCls: 'text-amber-900',
        valCls: 'text-amber-950',
        subCls: 'text-amber-800',
        openHint: 'Open (∞) · Isolated by Δ or ungrounded neutral',
        closedHint: 'Ground-return path active',
      },
    ];

    const z1 = solvedD3Graph.thevenin1;
    const xrText =
      z1.isOpenCircuit
        ? 'N/A'
        : z1.zEq.re > 1e-5
        ? `${(z1.zEq.im / z1.zEq.re).toFixed(2)}`
        : 'Purely reactive (R₁ ≈ 0)';

    return (
      <section
        aria-label="Impedance Summary"
        className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-950">Impedance Summary</h2>
            <p className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">
              Thévenin Equivalent at Fault Location:{' '}
              <span className="font-semibold text-slate-900">
                {d3FaultBus?.name ?? 'Select a fault bus'}
              </span>{' '}
              · V_base = {d3VBaseKv} kV · S_base = {solvedD3Graph.sBaseMva} MVA · Z_base ={' '}
              {d3ZBaseOhm.toFixed(2)} Ω
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums text-slate-700">
            <span className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1">
              X₁/R₁: <strong className="text-slate-950">{xrText}</strong>
            </span>
            <span className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1">
              R_f: <strong className="text-slate-950">{d3Graph.rfPu.toFixed(3)} pu</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {seqEntries.map((item) => {
            const isOpen = item.thevenin.isOpenCircuit;
            const zMagPu = isOpen ? Infinity : cMag(item.thevenin.zEq);
            const zOhm = isOpen ? Infinity : zMagPu * d3ZBaseOhm;

            return (
              <div
                key={item.key}
                className={`rounded-lg border px-3.5 py-3 space-y-1.5 ${item.borderCls}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold ${item.titleCls}`}>{item.title}</span>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    {isOpen ? 'Open' : 'Solved'}
                  </span>
                </div>

                {isOpen ? (
                  <div className="space-y-0.5 font-mono tabular-nums">
                    <div className={`text-base font-bold ${item.valCls}`}>∞ pu (Open Circuit)</div>
                    <div className={`text-[11px] ${item.subCls}`}>|Z| = ∞ Ω</div>
                  </div>
                ) : (
                  <div className="space-y-0.5 font-mono tabular-nums">
                    <div className={`text-sm font-bold ${item.valCls}`}>
                      {cFmtRect(item.thevenin.zEq, 4)} pu
                    </div>
                    <div className={`text-[11px] ${item.subCls}`}>
                      Polar: {cFmtPolar(item.thevenin.zEq, 3)} pu · {zOhm.toFixed(2)} Ω
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-600 pt-0.5 border-t border-slate-200/70">
                  {isOpen ? item.openHint : item.closedHint}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  // =========================================================================
  // 1. SYMMETRICAL COMPONENTS & FAULT ANALYSIS SIMULATOR
  // =========================================================================
  const [vaMag, setVaMag] = useState(1.0);
  const [vbMag, setVbMag] = useState(0.75);
  const [vbDeg, setVbDeg] = useState(-130);
  const [vcMag, setVcMag] = useState(0.9);
  const [vcDeg, setVcDeg] = useState(115);

  const symRes = useMemo(() => {
    const va = cpxFromPolar(vaMag, 0);
    const vb = cpxFromPolar(vbMag, vbDeg);
    const vc = cpxFromPolar(vcMag, vcDeg);
    return { va, vb, vc, ...decomposeSymmetrical(va, vb, vc) };
  }, [vaMag, vbMag, vbDeg, vcMag, vcDeg]);

  const [faultSourceMode, setFaultSourceMode] = useState<'d3' | 'manual'>('d3');
  const [faultType, setFaultType] = useState<FaultType>('slg');
  const [z1Pu, setZ1Pu] = useState(0.2);
  const [z2Pu, setZ2Pu] = useState(0.2);
  const [z0Pu, setZ0Pu] = useState(0.05);
  const [zfPu, setZfPu] = useState(0.0);

  const activeFaultType = faultSourceMode === 'd3' ? d3Graph.faultType : faultType;
  const setActiveFaultType = (ft: FaultType) => {
    if (faultSourceMode === 'd3') {
      setD3Graph((prev) => ({ ...prev, faultType: ft }));
    } else {
      setFaultType(ft);
    }
  };

  const faultRes = useMemo(() => {
    if (faultSourceMode === 'd3' && solvedD3Graph.faultResult) {
      return solvedD3Graph.faultResult;
    }
    return solvePowerFault({
      faultType,
      ePreFaultPu: 1.0,
      z1: cpx(0, z1Pu),
      z2: cpx(0, z2Pu),
      z0: cpx(0, z0Pu),
      zf: cpx(zfPu, 0),
      sBaseMva: 100,
      vBaseLineKv: 132,
    });
  }, [faultSourceMode, solvedD3Graph, faultType, z1Pu, z2Pu, z0Pu, zfPu]);

  // =========================================================================
  // 2. TRAVELING WAVE LATTICE DIAGRAM & PROTECTION RELAY LAB
  // =========================================================================
  const [vStepKv, setVStepKv] = useState(100);
  const [zSourceOhm, setZSourceOhm] = useState(100);
  const [zLineOhm, setZLineOhm] = useState(400);
  const [zLoadMode, setZLoadMode] = useState<'open' | 'short' | 'cable' | 'matched'>('open');
  const [lineLenKm] = useState(150);

  const zLoadOhm =
    zLoadMode === 'open'
      ? 1e9
      : zLoadMode === 'short'
      ? 0
      : zLoadMode === 'cable'
      ? 50
      : zLineOhm;

  const bewleyRes = useMemo(
    () =>
      computeBewleyLattice({
        vStepKv,
        zSourceOhm,
        zLineOhm,
        zLoadOhm,
        lineLengthKm: lineLenKm,
        numTransits: 6,
      }),
    [vStepKv, zSourceOhm, zLineOhm, zLoadOhm, lineLenKm]
  );

  const [idmtCurve, setIdmtCurve] = useState<IdmtCurveType>('standard');
  const [idmtTds, setIdmtTds] = useState(0.25);
  const [iPickupA] = useState(500);
  const [iFaultA, setIFaultA] = useState(2500);
  const [faultLocPct, setFaultLocPct] = useState(65);

  const tripTimeSec = computeIdmtTripTime(iFaultA, iPickupA, idmtTds, idmtCurve);

  const idmtPlotData = useMemo(() => {
    const pts = [];
    for (let m = 1.5; m <= 12; m += 0.5) {
      const t = computeIdmtTripTime(m * iPickupA, iPickupA, idmtTds, idmtCurve);
      pts.push({ psm: m, tripSec: Number(Math.min(20, t).toFixed(3)) });
    }
    return pts;
  }, [iPickupA, idmtTds, idmtCurve]);

  // (Section 3 interactive D3 Per-Unit & Sequence Builder state lives in SequenceNetworkD3Section)

  // =========================================================================
  // 4. LINE & DISPATCH SANDBOXES
  // =========================================================================
  const [benchBundle, setBenchBundle] = useState<1 | 2>(2);
  const [benchVkv, setBenchVkv] = useState(260);
  const [benchRcm, setBenchRcm] = useState(1.5);
  const [benchDcm, setBenchDcm] = useState(40);
  const [benchPhaseM, setBenchPhaseM] = useState(8);

  const benchLine = useMemo(
    () =>
      computeLineParameters({
        topology: 'three_phase_equilateral',
        bundleCount: benchBundle,
        radiusCm: benchRcm,
        bundleSpacingCm: benchDcm,
        dabM: benchPhaseM,
        dbcM: benchPhaseM,
        dcaM: benchPhaseM,
        lengthKm: 100,
        areaMm2: 250,
        resistivityOhmM: 2.82e-8,
        acSkinFactor: 1.15,
        lineVoltageKv: benchVkv,
        freqHz: 50,
      }),
    [benchBundle, benchRcm, benchDcm, benchPhaseM, benchVkv]
  );

  const benchCorona = useMemo(
    () =>
      computePeekCorona({
        operatingLineKv: benchVkv,
        radiusCm: benchLine.bundleEqRadiusC_M * 100,
        spacingCm: benchPhaseM * 100,
        freqHz: 50,
        airDensityFactor: 1.0,
        surfaceFactorM0: 0.85,
      }),
    [benchVkv, benchLine, benchPhaseM]
  );

  const [dLoad, setDLoad] = useState(420);
  const [u1b, setU1b] = useState(7.0);
  const [u1c, setU1c] = useState(0.008);
  const [u2b, setU2b] = useState(6.3);
  const [u2c, setU2c] = useState(0.009);
  const [u3b, setU3b] = useState(6.8);
  const [u3c, setU3c] = useState(0.007);

  const benchDispatch = useMemo(
    () =>
      solveEconomicDispatch(
        [
          { id: 'u1', name: 'Unit 1', a: 200, b: u1b, c: u1c, pMin: 50, pMax: 300 },
          { id: 'u2', name: 'Unit 2', a: 180, b: u2b, c: u2c, pMin: 50, pMax: 250 },
          { id: 'u3', name: 'Unit 3', a: 140, b: u3b, c: u3c, pMin: 40, pMax: 200 },
        ],
        dLoad,
        true
      ),
    [dLoad, u1b, u1c, u2b, u2c, u3b, u3c]
  );

  // Scripts filter & copy state
  const [langFilter, setLangFilter] = useState<'All' | 'Julia' | 'Python' | 'MATLAB'>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredScripts =
    langFilter === 'All'
      ? POWER_SCRIPT_PACK
      : POWER_SCRIPT_PACK.filter((s) => s.language === langFilter);

  const groupedBenchItems = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return BENCH_CATEGORIES.map((category) => ({
      category,
      items: BENCH_ITEMS.filter((item) => {
        if (item.category !== category) return false;
        if (collapsed || !q) return true;
        return (
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }),
    })).filter((g) => g.items.length > 0);
  }, [collapsed, filterQuery]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1800);
  };

  const handleDownload = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">
          ECE 471 Power Engineering Bench
        </h1>
        <p className="mt-1 text-sm text-slate-600 max-w-2xl">
          Run the Symmetrical Components &amp; Fault Analysis simulator, Traveling Wave Bewley Lattice &amp; Protection Relay lab, Per-Unit Sequence Network builder, and Julia/Python/MATLAB scripts.
        </p>
      </div>

      {/* Mobile Compact Selector */}
      <div className="lg:hidden">
        <label htmlFor="pwr-bench-mobile" className="block text-xs font-semibold text-slate-700 mb-1">
          Power Bench Simulator
        </label>
        <select
          id="pwr-bench-mobile"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as PowerBenchTabId)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
        >
          {BENCH_ITEMS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sticky Vertical Sidebar */}
        <aside
          aria-label="Power Bench Simulator Navigation"
          className={`hidden lg:flex lg:flex-col shrink-0 lg:sticky lg:top-20 rounded-xl border border-slate-200 bg-white overflow-hidden transition-[width] duration-200 ${
            collapsed ? 'lg:w-[68px]' : 'lg:w-[254px]'
          }`}
        >
          <div
            className={`flex items-center border-b border-slate-200 bg-slate-50/70 px-3 py-2.5 ${
              collapsed ? 'justify-center' : 'justify-between gap-2'
            }`}
          >
            {!collapsed && (
              <span className="text-xs font-bold text-slate-900">
                Power Bench ({BENCH_ITEMS.length})
              </span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="cursor-pointer rounded-md p-1.5 text-slate-600 hover:bg-slate-200/70 hover:text-slate-950"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          {!collapsed && (
            <div className="border-b border-slate-100 px-3 py-2.5">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Jump to simulator..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
                {filterQuery && (
                  <button
                    type="button"
                    onClick={() => setFilterQuery('')}
                    className="cursor-pointer absolute right-2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          <nav className="p-2 space-y-3">
            {groupedBenchItems.map((group, idx) => (
              <div
                key={group.category}
                className={idx > 0 ? 'border-t border-slate-100 pt-2.5' : ''}
              >
                {!collapsed && (
                  <div className="px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-slate-400">
                    {group.category}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        title={`${item.label} — ${item.description}`}
                        className={`cursor-pointer w-full rounded-lg transition-colors ${
                          collapsed
                            ? 'py-2 px-1 text-center font-mono text-[11px] font-semibold'
                            : 'px-2.5 py-1.5 text-left text-xs truncate'
                        } ${
                          active
                            ? 'bg-emerald-50 text-emerald-900 font-semibold ring-1 ring-inset ring-emerald-200'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 font-medium'
                        }`}
                      >
                        {collapsed ? item.shortCode : item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* ============================================================== */}
          {/* 1. SYMMETRICAL COMPONENTS & FAULT ANALYSIS SIMULATOR           */}
          {/* ============================================================== */}
          {activeTab === 'symmetrical_faults' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Fortescue Phasor Wheel */}
              <div className="xl:col-span-6 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-950">
                      Fortescue Symmetrical Components Decomposer
                    </h2>
                    <p className="text-xs text-slate-500">
                      Vary unbalanced phase phasors to inspect V₀, V₁, and V₂.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVaMag(1.0);
                      setVbMag(1.0);
                      setVbDeg(-120);
                      setVcMag(1.0);
                      setVcDeg(120);
                    }}
                    className="cursor-pointer text-[11px] font-semibold text-emerald-700 hover:underline shrink-0"
                  >
                    Reset Balanced
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <svg
                    viewBox="-120 -120 240 240"
                    className="w-full max-w-[230px] mx-auto border border-slate-200 rounded-lg bg-slate-50/70"
                    aria-label="Three-phase voltage phasor wheel"
                  >
                    <circle cx="0" cy="0" r="90" fill="none" stroke="#cbd5e1" strokeDasharray="3 3" />
                    <line x1="-105" y1="0" x2="105" y2="0" stroke="#e2e8f0" />
                    <line x1="0" y1="-105" x2="0" y2="105" stroke="#e2e8f0" />
                    {[
                      { label: 'Va', vec: symRes.va, color: '#047857' },
                      { label: 'Vb', vec: symRes.vb, color: '#0284c7' },
                      { label: 'Vc', vec: symRes.vc, color: '#d97706' },
                    ].map((p) => {
                      const x = p.vec.re * 75;
                      const y = -p.vec.im * 75;
                      return (
                        <g key={p.label}>
                          <line x1="0" y1="0" x2={x} y2={y} stroke={p.color} strokeWidth="2.5" />
                          <circle cx={x} cy={y} r="3.5" fill={p.color} />
                          <text
                            x={x * 1.15}
                            y={y * 1.15}
                            fontSize="11"
                            fontWeight="700"
                            fill={p.color}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            {p.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <div className="flex justify-between">
                        <span>|Vb| (pu)</span>
                        <span className="font-mono">{vbMag.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1.3}
                        step={0.05}
                        value={vbMag}
                        onChange={(e) => setVbMag(Number(e.target.value))}
                        className="w-full accent-sky-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <span>∠Vb</span>
                        <span className="font-mono">{vbDeg}°</span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={5}
                        value={vbDeg}
                        onChange={(e) => setVbDeg(Number(e.target.value))}
                        className="w-full accent-sky-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <span>|Vc| (pu)</span>
                        <span className="font-mono">{vcMag.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1.3}
                        step={0.05}
                        value={vcMag}
                        onChange={(e) => setVcMag(Number(e.target.value))}
                        className="w-full accent-amber-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <span>∠Vc</span>
                        <span className="font-mono">{vcDeg}°</span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={5}
                        value={vcDeg}
                        onChange={(e) => setVcDeg(Number(e.target.value))}
                        className="w-full accent-amber-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                  {[
                    { name: 'Positive V₁', val: cFmtPolar(symRes.v1, 3) },
                    { name: 'Negative V₂', val: cFmtPolar(symRes.v2, 3) },
                    { name: 'Zero V₀', val: cFmtPolar(symRes.v0, 3) },
                  ].map((s) => (
                    <div key={s.name} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                      <div className="text-[11px] text-slate-500">{s.name}</div>
                      <div className="font-mono font-bold text-slate-950 text-[11px] mt-0.5">{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fault Analysis Simulator */}
              <div className="xl:col-span-6 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-950">
                      Balanced &amp; Unbalanced Fault Analysis Simulator
                    </h2>
                    <p className="text-xs text-slate-500 font-mono">
                      {faultSourceMode === 'd3'
                        ? `Synced with D3 Canvas (${solvedD3Graph.faultBus?.name ?? 'Bus'} · ${d3Graph.sBaseMva} MVA · ${solvedD3Graph.faultBus?.vBaseKv ?? 132} kV)`
                        : 'Manual Inputs (100 MVA, 132 kV base)'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFaultSourceMode('d3')}
                      className={`cursor-pointer rounded px-2.5 py-1 font-semibold ${
                        faultSourceMode === 'd3'
                          ? 'bg-sky-700 text-white'
                          : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      Live D3 Grid
                    </button>
                    <button
                      type="button"
                      onClick={() => setFaultSourceMode('manual')}
                      className={`cursor-pointer rounded px-2.5 py-1 font-semibold ${
                        faultSourceMode === 'manual'
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs">
                  {[
                    { id: '3ph', label: '3ϕ Balanced' },
                    { id: 'slg', label: 'SLG (a-g)' },
                    { id: 'll', label: 'LL (b-c)' },
                    { id: 'dlg', label: 'DLG (b-c-g)' },
                  ].map((ft) => (
                    <button
                      key={ft.id}
                      type="button"
                      onClick={() => setActiveFaultType(ft.id as FaultType)}
                      className={`cursor-pointer rounded-md py-1.5 font-semibold ${
                        activeFaultType === ft.id
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      {ft.label}
                    </button>
                  ))}
                </div>

                {faultSourceMode === 'd3' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono tabular-nums">
                    <div className="rounded border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5">
                      <div className="font-sans text-[10px] text-emerald-800">Z₁ (D3)</div>
                      <div className="font-bold text-emerald-950">
                        {solvedD3Graph.thevenin1.isOpenCircuit
                          ? '∞'
                          : cFmtRect(solvedD3Graph.thevenin1.zEq, 3)}
                      </div>
                    </div>
                    <div className="rounded border border-sky-200 bg-sky-50/60 px-2.5 py-1.5">
                      <div className="font-sans text-[10px] text-sky-800">Z₂ (D3)</div>
                      <div className="font-bold text-sky-950">
                        {solvedD3Graph.thevenin2.isOpenCircuit
                          ? '∞'
                          : cFmtRect(solvedD3Graph.thevenin2.zEq, 3)}
                      </div>
                    </div>
                    <div className="rounded border border-amber-200 bg-amber-50/60 px-2.5 py-1.5">
                      <div className="font-sans text-[10px] text-amber-800">Z₀ (D3)</div>
                      <div className="font-bold text-amber-950">
                        {solvedD3Graph.thevenin0.isOpenCircuit
                          ? '∞ (Open)'
                          : cFmtRect(solvedD3Graph.thevenin0.zEq, 3)}
                      </div>
                    </div>
                    <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                      <label className="block font-sans text-[10px] text-slate-600">R_f (pu)</label>
                      <input
                        type="number"
                        min={0}
                        max={2}
                        step={0.01}
                        value={d3Graph.rfPu}
                        onChange={(e) =>
                          setD3Graph((prev) => ({
                            ...prev,
                            rfPu: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { label: 'X₁ (pu)', val: z1Pu, set: setZ1Pu },
                      { label: 'X₂ (pu)', val: z2Pu, set: setZ2Pu },
                      { label: 'X₀ (pu)', val: z0Pu, set: setZ0Pu },
                      { label: 'R_f (pu)', val: zfPu, set: setZfPu },
                    ].map((inp) => (
                      <div key={inp.label}>
                        <label className="block text-[11px] text-slate-500 mb-1">{inp.label}</label>
                        <input
                          type="number"
                          min={0}
                          max={2}
                          step={0.01}
                          value={inp.val}
                          onChange={(e) => inp.set(Math.max(0, Number(e.target.value)))}
                          className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs font-mono text-slate-700">
                  {activeFaultType === '3ph' && 'Topology: Positive-Sequence Only → I₁ = E / (Z₁ + Z_f)'}
                  {activeFaultType === 'slg' && 'Topology: Series Interconnection (1–2–0) → I₁ = I₂ = I₀'}
                  {activeFaultType === 'll' && 'Topology: Anti-Parallel (1–2) → I₂ = −I₁, I₀ = 0'}
                  {activeFaultType === 'dlg' && 'Topology: Parallel (1 ∥ 2 ∥ 0) → V₁ = V₂ = V₀'}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="text-[11px] text-slate-500">Max Fault Current</div>
                    <div className="font-mono tabular-nums text-base font-bold text-emerald-800">
                      {faultRes.faultCurrentKa.toFixed(2)} kA
                    </div>
                    <div className="font-mono tabular-nums text-[11px] text-slate-500">
                      Fault MVA = {faultRes.faultMva.toFixed(1)} MVA
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 font-mono tabular-nums space-y-0.5 text-[11px]">
                    <div>I_a = {cMag(faultRes.ia).toFixed(3)} ∠ {cAngDeg(faultRes.ia).toFixed(1)}° pu</div>
                    <div>I_b = {cMag(faultRes.ib).toFixed(3)} ∠ {cAngDeg(faultRes.ib).toFixed(1)}° pu</div>
                    <div>I_c = {cMag(faultRes.ic).toFixed(3)} ∠ {cAngDeg(faultRes.ic).toFixed(1)}° pu</div>
                  </div>
                </div>
              </div>

              {/* Full-Width D3 Network Impedance Summary & Live Fault Panel */}
              <div className="xl:col-span-12 space-y-6">
                {renderImpedanceSummaryCard()}
                <LiveFaultCurrentPanel
                  title={
                    faultSourceMode === 'd3'
                      ? 'Live Symmetrical & Asymmetrical Fault Currents (From D3.js Canvas)'
                      : 'Symmetrical & Asymmetrical Fault Currents (Manual Impedances)'
                  }
                  z1={
                    faultSourceMode === 'd3'
                      ? solvedD3Graph.thevenin1.zEq
                      : cpx(0, z1Pu)
                  }
                  z2={
                    faultSourceMode === 'd3'
                      ? solvedD3Graph.thevenin2.zEq
                      : cpx(0, z2Pu)
                  }
                  z0={
                    faultSourceMode === 'd3'
                      ? solvedD3Graph.thevenin0.zEq
                      : cpx(0, z0Pu)
                  }
                  z0Open={
                    faultSourceMode === 'd3'
                      ? solvedD3Graph.thevenin0.isOpenCircuit
                      : false
                  }
                  z1Open={
                    faultSourceMode === 'd3'
                      ? solvedD3Graph.thevenin1.isOpenCircuit
                      : false
                  }
                  rfPu={faultSourceMode === 'd3' ? d3Graph.rfPu : zfPu}
                  sBaseMva={faultSourceMode === 'd3' ? d3Graph.sBaseMva : 100}
                  vBaseKv={
                    faultSourceMode === 'd3'
                      ? solvedD3Graph.faultBus?.vBaseKv ?? 132
                      : 132
                  }
                  faultBusName={
                    faultSourceMode === 'd3'
                      ? solvedD3Graph.faultBus?.name ?? 'Fault Bus'
                      : 'Manual Equivalent Bus'
                  }
                  selectedFaultType={activeFaultType}
                  onSelectFaultType={setActiveFaultType}
                  onJumpToD3={() => setActiveTab('pu_sequence')}
                  sourceMode={faultSourceMode}
                  currentGraph={faultSourceMode === 'd3' ? d3Graph : null}
                  historyEntries={faultHistory}
                  onAddHistoryEntry={handleAddFaultHistory}
                  onClearHistory={handleClearFaultHistory}
                  onRestoreSimulation={handleRestoreFaultSimulation}
                />
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. TRAVELING WAVE LATTICE DIAGRAM & PROTECTION RELAY LAB       */}
          {/* ============================================================== */}
          {activeTab === 'transients_protection' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Bewley Lattice */}
              <div className="xl:col-span-7 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-950">
                    Traveling Wave Bewley Lattice Diagram
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Γ_L = {bewleyRes.gammaLoad.toFixed(3)} · Γ_S = {bewleyRes.gammaSource.toFixed(3)} · Transit τ ={' '}
                    {(bewleyRes.tauLineSec * 1e6).toFixed(0)} μs
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-500">V_step (kV)</label>
                    <input
                      type="number"
                      value={vStepKv}
                      onChange={(e) => setVStepKv(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Z_source (Ω)</label>
                    <input
                      type="number"
                      value={zSourceOhm}
                      onChange={(e) => setZSourceOhm(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Z_line (Ω)</label>
                    <input
                      type="number"
                      value={zLineOhm}
                      onChange={(e) => setZLineOhm(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Termination</label>
                    <select
                      value={zLoadMode}
                      onChange={(e) => setZLoadMode(e.target.value as typeof zLoadMode)}
                      className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                    >
                      <option value="open">Open End (∞)</option>
                      <option value="short">Short Circuit (0 Ω)</option>
                      <option value="cable">Cable Junction (50 Ω)</option>
                      <option value="matched">Matched (Z_L = Z_c)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <svg
                    viewBox="0 0 260 220"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/70"
                    aria-label="Bewley Lattice Reflection Diagram"
                  >
                    <line x1="45" y1="20" x2="45" y2="205" stroke="#334155" strokeWidth="2" />
                    <line x1="215" y1="20" x2="215" y2="205" stroke="#334155" strokeWidth="2" />
                    <text x="45" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">
                      Source (x=0)
                    </text>
                    <text x="215" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">
                      Load (x={lineLenKm}km)
                    </text>
                    {bewleyRes.bounces.slice(0, 6).map((b, idx) => {
                      const y1 = 28 + idx * 27;
                      const y2 = 28 + (idx + 1) * 27;
                      const x1 = b.fromEnd === 'Source' ? 45 : 215;
                      const x2 = b.toEnd === 'Load' ? 215 : 45;
                      return (
                        <g key={b.bounceIndex}>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={b.waveKv >= 0 ? '#047857' : '#d97706'}
                            strokeWidth="1.8"
                          />
                          <text
                            x="130"
                            y={(y1 + y2) / 2 - 3}
                            textAnchor="middle"
                            fontSize="9"
                            fontFamily="monospace"
                            fill="#0f172a"
                          >
                            {b.waveKv >= 0 ? '+' : ''}
                            {b.waveKv.toFixed(1)} kV
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={bewleyRes.waveform}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="tUs" tick={{ fontSize: 10 }} unit="μs" />
                        <YAxis tick={{ fontSize: 10 }} unit="kV" />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line
                          type="stepAfter"
                          dataKey="vLoadKv"
                          name="V_load(t)"
                          stroke="#047857"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="stepAfter"
                          dataKey="vSourceKv"
                          name="V_source(t)"
                          stroke="#0284c7"
                          strokeWidth={1.8}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Protection Relay Lab */}
              <div className="xl:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <h2 className="text-sm font-bold text-slate-950 border-b border-slate-100 pb-3">
                  Mho Distance Zones &amp; IEC IDMT Protection Relay
                </h2>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <svg
                    viewBox="-15 -115 130 130"
                    className="w-full max-w-[180px] mx-auto rounded-lg border border-slate-200 bg-slate-50/70"
                    aria-label="Mho Distance Relay R-X Characteristic"
                  >
                    <line x1="-10" y1="0" x2="110" y2="0" stroke="#cbd5e1" />
                    <line x1="0" y1="10" x2="0" y2="-110" stroke="#cbd5e1" />
                    <circle cx="24" cy="-58" r="63" fill="none" stroke="#94a3b8" strokeDasharray="3 3" />
                    <circle cx="16" cy="-38" r="41" fill="none" stroke="#0284c7" strokeWidth="1.5" />
                    <circle cx="11" cy="-26" r="28" fill="none" stroke="#047857" strokeWidth="2" />
                    <line x1="0" y1="0" x2="26" y2="-65" stroke="#0f172a" strokeWidth="2" />
                    <circle
                      cx={(26 * faultLocPct) / 100}
                      cy={(-65 * faultLocPct) / 100}
                      r="3.8"
                      fill={
                        faultLocPct <= 80 ? '#047857' : faultLocPct <= 120 ? '#0284c7' : '#d97706'
                      }
                    />
                  </svg>

                  <div className="space-y-2 text-xs">
                    <div className="font-semibold text-slate-900">
                      Fault Reach: {faultLocPct}% of Z_line
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={145}
                      step={5}
                      value={faultLocPct}
                      onChange={(e) => setFaultLocPct(Number(e.target.value))}
                      className="w-full accent-emerald-700"
                    />
                    <div className="rounded border border-slate-200 bg-slate-50 p-2 font-mono text-[11px]">
                      {faultLocPct <= 80
                        ? 'Zone 1 Trip (~20 ms)'
                        : faultLocPct <= 120
                        ? 'Zone 2 Trip (0.35 s delay)'
                        : 'Zone 3 Backup (0.90 s delay)'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[11px] text-slate-500">Curve</label>
                    <select
                      value={idmtCurve}
                      onChange={(e) => setIdmtCurve(e.target.value as IdmtCurveType)}
                      className="w-full rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-xs"
                    >
                      <option value="standard">Std Inv</option>
                      <option value="very">Very Inv</option>
                      <option value="extremely">Ext Inv</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">TDS</label>
                    <input
                      type="number"
                      min={0.05}
                      max={1.5}
                      step={0.05}
                      value={idmtTds}
                      onChange={(e) => setIdmtTds(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">I_fault (A)</label>
                    <input
                      type="number"
                      min={600}
                      max={8000}
                      step={100}
                      value={iFaultA}
                      onChange={(e) => setIFaultA(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <span>PSM = {(iFaultA / iPickupA).toFixed(2)}×</span>
                  <span className="font-bold text-emerald-800">
                    Trip Time = {Number.isFinite(tripTimeSec) ? `${tripTimeSec.toFixed(3)} s` : 'No Trip'}
                  </span>
                </div>

                <div className="h-[150px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={idmtPlotData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="psm" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="s" />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="tripSec"
                        name="Trip (s)"
                        stroke="#047857"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. PER-UNIT & SEQUENCE NETWORK BUILDER (D3.JS INTERACTIVE)     */}
          {/* ============================================================== */}
          {activeTab === 'pu_sequence' && (
            <div className="space-y-6">
              {renderImpedanceSummaryCard()}
              <SequenceNetworkD3Section
                templateId={d3TemplateId}
                onTemplateIdChange={setD3TemplateId}
                graph={d3Graph}
                onGraphChange={setD3Graph}
                solved={solvedD3Graph}
                historyEntries={faultHistory}
                onAddHistoryEntry={handleAddFaultHistory}
                onClearHistory={handleClearFaultHistory}
                onRestoreSimulation={handleRestoreFaultSimulation}
              />
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. LINE & CORONA SANDBOX                                       */}
          {/* ============================================================== */}
          {activeTab === 'line_corona_bench' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-950">
                  CAT 1 Single vs Bundled Overhead Line Comparison
                </h2>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs">
                  {([1, 2] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBenchBundle(b)}
                      className={`cursor-pointer rounded px-3 py-1 font-semibold ${
                        benchBundle === b ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {b === 1 ? 'Single Conductor' : '2-Conductor Bundle'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-slate-500">Radius r (cm)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={benchRcm}
                    onChange={(e) => setBenchRcm(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Bundle Spacing d (cm)</label>
                  <input
                    type="number"
                    step={2}
                    value={benchDcm}
                    onChange={(e) => setBenchDcm(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Phase Spacing D (m)</label>
                  <input
                    type="number"
                    step={0.5}
                    value={benchPhaseM}
                    onChange={(e) => setBenchPhaseM(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Line Voltage (kV)</label>
                  <input
                    type="number"
                    step={10}
                    value={benchVkv}
                    onChange={(e) => setBenchVkv(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 px-2 py-1 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <div className="text-[11px] text-slate-500">Equivalent GMR</div>
                  <div className="font-mono font-bold text-slate-950">
                    {(benchLine.bundleGmrL_M * 100).toFixed(3)} cm
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <div className="text-[11px] text-slate-500">Reactance X_L (50Hz)</div>
                  <div className="font-mono font-bold text-slate-950">
                    {benchLine.reactancePerPhaseOhmPerKm.toFixed(4)} Ω/km
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <div className="text-[11px] text-slate-500">Charging Mvar (100km)</div>
                  <div className="font-mono font-bold text-sky-800">
                    {(benchLine.chargingMvarPerKm * 100).toFixed(2)} Mvar
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <div className="text-[11px] text-slate-500">Peek Corona V_d / P_c</div>
                  <div className="font-mono font-bold text-emerald-800">
                    {benchCorona.vdPhaseKv.toFixed(1)} kV · {benchCorona.lossPerKmPerPhaseKw.toFixed(2)} kW/km
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 5. DISPATCH SANDBOX                                            */}
          {/* ============================================================== */}
          {activeTab === 'dispatch_bench' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-950">
                  Editable 3-Unit Economic Dispatch Sandbox
                </h2>
                <div className="font-mono text-xs font-bold text-emerald-800">
                  λ = ${benchDispatch.lambda.toFixed(3)}/MWh · Total Cost = ${benchDispatch.totalCostPerHr.toFixed(2)}/hr
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Target Load P_D (MW)</span>
                  <span className="font-mono">{dLoad} MW</span>
                </div>
                <input
                  type="range"
                  min={150}
                  max={740}
                  step={10}
                  value={dLoad}
                  onChange={(e) => setDLoad(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {[
                  { name: 'Unit 1 [50..300 MW]', b: u1b, setB: setU1b, c: u1c, setC: setU1c, res: benchDispatch.units[0] },
                  { name: 'Unit 2 [50..250 MW]', b: u2b, setB: setU2b, c: u2c, setC: setU2c, res: benchDispatch.units[1] },
                  { name: 'Unit 3 [40..200 MW]', b: u3b, setB: setU3b, c: u3c, setC: setU3c, res: benchDispatch.units[2] },
                ].map((u) => (
                  <div key={u.name} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
                    <div className="font-bold text-slate-950">{u.name}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-500">b ($/MWh)</label>
                        <input
                          type="number"
                          step={0.1}
                          value={u.b}
                          onChange={(e) => u.setB(Number(e.target.value))}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500">c ($/MW²h)</label>
                        <input
                          type="number"
                          step={0.001}
                          min={0.001}
                          value={u.c}
                          onChange={(e) => u.setC(Math.max(0.001, Number(e.target.value)))}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono"
                        />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200 font-mono flex justify-between">
                      <span className="font-bold text-emerald-800">{u.res.pMw.toFixed(1)} MW</span>
                      <span className="text-slate-500">{u.res.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 6. JULIA / PYTHON / MATLAB SCRIPTS                             */}
          {/* ============================================================== */}
          {activeTab === 'scripts' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
                <div>
                  <h2 className="text-sm font-bold text-slate-950">
                    Julia, Python &amp; MATLAB Power Analysis Scripts
                  </h2>
                  <p className="text-xs text-slate-500">
                    Julia excels at multi-unit dispatch optimization, ComplexF64 fault matrices, and ODE transient sweeps.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs">
                  {(['All', 'Julia', 'Python', 'MATLAB'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLangFilter(lang)}
                      className={`cursor-pointer rounded-md px-3 py-1 font-semibold ${
                        langFilter === lang ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {filteredScripts.map((script) => (
                <article
                  key={script.id}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-emerald-700">
                          {script.language}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-500">{script.module}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-600">{script.filename}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-950 mt-0.5">{script.title}</h3>
                      <p className="text-xs text-slate-600">{script.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(script.id, script.code)}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        {copiedId === script.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(script.filename, script.code)}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                  <pre className="overflow-x-auto bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
                    <code>{script.code}</code>
                  </pre>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Right-Side Collapsible Unit Conversion Sidebar */}
        <UnitConversionSidebar
          activeSBaseMva={faultSourceMode === 'd3' ? d3Graph.sBaseMva : 100}
          activeVBaseKv={faultSourceMode === 'd3' ? d3VBaseKv : 132}
          activeFaultBusName={
            faultSourceMode === 'd3' ? d3FaultBus?.name ?? 'Fault Bus' : 'Manual Bus'
          }
        />
      </div>
    </div>
  );
};
