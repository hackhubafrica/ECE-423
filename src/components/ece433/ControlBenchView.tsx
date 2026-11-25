import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Cpu,
  Download,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sliders,
  Terminal,
  Trash2,
  Unplug,
  Usb,
  XCircle,
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
import {
  CONTROL_BENCH_LABS,
  CONTROL_SCRIPT_PACK,
} from '../../data/ece433PracticeData';
import { CONTROL_MODULE_META } from '../../data/ece433SyllabusData';
import {
  computeRootLocus,
  evaluateGeneralBode,
  simulatePidLoop,
  zieglerNicholsOpenLoop,
} from '../../utils/controlMath';
import { MatrixExpD3Section } from './MatrixExpD3Section';
import { BodeDesignSummary, BodeGeneratorSection } from './BodeGeneratorSection';
import { RootLocusDesignSummary, RootLocusSection } from './RootLocusSection';
import { OpAmpPidSimSection } from './OpAmpPidSimSection';
import { LqrDesignSection } from './LqrDesignSection';
import { StepAnalyzerSection } from './StepAnalyzerSection';
import { SensitivityAnalysisSection } from './SensitivityAnalysisSection';
import { FreqResponse3DSection } from './FreqResponse3DSection';
import { SignalCorrelationSection } from './SignalCorrelationSection';

interface ControlSample {
  tMs: number;
  sp: number;
  y: number;
  u: number;
}

interface SerialLogLine {
  id: number;
  ts: string;
  dir: 'RX' | 'TX' | 'SYS';
  text: string;
}

type SerialPortHandle = {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
};

type NavigatorWithSerial = Navigator & {
  serial?: {
    requestPort: () => Promise<SerialPortHandle>;
  };
};

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function nowTs(): string {
  return new Date().toTimeString().slice(0, 8);
}

export const ControlBenchView: React.FC = () => {
  const [subTab, setSubTab] = useState<'pid_sim' | 'step_analyzer' | 'sensitivity' | 'correlation' | 'opamp_sim' | 'bode_gen' | 'freq_3d' | 'root_locus' | 'lqr_design' | 'state_exp' | 'monitor' | 'wiring' | 'scripts'>('pid_sim');

  // Interactive Recharts PID Simulator State
  const [kp, setKp] = useState<number>(3.2);
  const [ki, setKi] = useState<number>(2.1);
  const [kd, setKd] = useState<number>(0.85);
  const [plantK, setPlantK] = useState<number>(1.0);
  const [tau1, setTau1] = useState<number>(1.0);
  const [tau2, setTau2] = useState<number>(0.5);
  const [uMax, setUMax] = useState<number>(4.0);
  const [antiWindup, setAntiWindup] = useState<'none' | 'clamping' | 'back_calc'>('clamping');
  const [tEnd, setTEnd] = useState<number>(10);
  const [showControlEffort, setShowControlEffort] = useState<boolean>(true);

  // Iterative Design Constraints Targets & Live Bode / Root Locus Summaries
  const [showConstraintsTable, setShowConstraintsTable] = useState<boolean>(true);
  const [targetPmDeg, setTargetPmDeg] = useState<number>(45);
  const [targetGmDb, setTargetGmDb] = useState<number>(6);
  const [minWgc, setMinWgc] = useState<number>(2.5);
  const [minZeta, setMinZeta] = useState<number>(0.45);
  const [maxOsPct, setMaxOsPct] = useState<number>(20);

  const [bodeSummary, setBodeSummary] = useState<BodeDesignSummary>(() => {
    const sinPhi = Math.sin((35 * Math.PI) / 180);
    const alphaLead = Math.max(0.03, (1 - sinPhi) / (1 + sinPhi));
    const tauLead = 1 / (5.5 * Math.sqrt(alphaLead));
    const res = evaluateGeneralBode({
      num: [20],
      den: [1, 4, 0],
      compType: 'lead',
      kc: 1.0,
      alphaLead,
      tauLead,
      betaLag: 6.0,
      tauLag: 4.0,
    });
    const m = res.comp;
    return {
      plantLabel: '(20) / (s^2 + 4s)',
      compType: 'lead',
      pmDeg: m.phaseMarginDeg,
      gmDb: m.gainMarginDb,
      wgc: m.wgc,
      wpc: m.wpc,
      isStable:
        (m.phaseMarginDeg === null || m.phaseMarginDeg > 0) &&
        (m.gainMarginDb === null || m.gainMarginDb > 0),
    };
  });

  const [rlSummary, setRlSummary] = useState<RootLocusDesignSummary>(() => {
    const locus = computeRootLocus({
      num: [1],
      den: [1, 6, 8, 0],
      compType: 'lead',
      zLead: 2.2,
      pLead: 9.0,
      zLag: 0.25,
      pLag: 0.04,
      kMax: 160,
      kCurrent: 32,
    });
    const poles = locus.currentPoles;
    const maxRe = poles.length > 0 ? Math.max(...poles.map((p) => p.re)) : 0;
    const sorted = [...poles].sort((a, b) => Math.abs(a.re) - Math.abs(b.re));
    const dom = sorted.find((p) => Math.abs(p.im) > 1e-3) || sorted[0] || { re: 0, im: 0 };
    const wn = Math.hypot(dom.re, dom.im);
    const zeta = wn > 1e-6 ? -dom.re / wn : 0;
    const osPct =
      zeta > 0 && zeta < 1
        ? 100 * Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta))
        : 0;
    return {
      plantLabel: '[1] / [1, 6, 8, 0]',
      compType: 'lead',
      kCurrent: 32,
      kCritical: locus.kCritical,
      isStable: maxRe < -1e-4,
      maxRe,
      zeta,
      osPct,
      wn,
      centroid: locus.asymptoteCentroid,
    };
  });

  const pidSim = useMemo(() => {
    return simulatePidLoop({
      plantK,
      tau1,
      tau2,
      kp,
      ki,
      kd,
      uMax,
      antiWindup,
      tEnd,
      dt: 0.04,
    });
  }, [plantK, tau1, tau2, kp, ki, kd, uMax, antiWindup, tEnd]);

  const pidChartData = useMemo(() => {
    return pidSim.times.map((t, idx) => ({
      t: Number(t.toFixed(2)),
      setpoint: 1.0,
      y: Number(pidSim.outputs[idx].toFixed(4)),
      u: Number(pidSim.controls[idx].toFixed(4)),
      iTerm: Number(pidSim.integrals[idx].toFixed(4)),
    }));
  }, [pidSim]);

  const applyPidPreset = (preset: 'p' | 'pi' | 'pd' | 'pid' | 'zn') => {
    if (preset === 'p') {
      setKp(3.0);
      setKi(0);
      setKd(0);
    } else if (preset === 'pi') {
      setKp(2.4);
      setKi(1.8);
      setKd(0);
    } else if (preset === 'pd') {
      setKp(3.8);
      setKi(0);
      setKd(1.1);
    } else if (preset === 'pid') {
      setKp(3.2);
      setKi(2.1);
      setKd(0.85);
    } else if (preset === 'zn') {
      // Approximate FOPDT delay L = 0.25*min(tau1,tau2), T = tau1+tau2
      const L = Math.max(0.15, 0.35 * Math.min(tau1, tau2));
      const T = Math.max(0.4, tau1 + tau2);
      const zn = zieglerNicholsOpenLoop(plantK, L, T, 'PID');
      setKp(Number(Math.min(12, zn.kp).toFixed(2)));
      setKi(Number(Math.min(10, zn.ki).toFixed(2)));
      setKd(Number(Math.min(5, zn.kd).toFixed(2)));
    }
  };

  // Web Serial & ESP32 Monitor State
  const [streamMode, setStreamMode] = useState<'sim' | 'serial' | 'paused'>('sim');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [samples, setSamples] = useState<ControlSample[]>(() => {
    const out: ControlSample[] = [];
    for (let i = 0; i < 80; i++) {
      const t = i * 0.04;
      const y = 1.65 * (1 - Math.exp(-1.4 * t) * (Math.cos(2.6 * t) + 0.54 * Math.sin(2.6 * t)));
      out.push({
        tMs: i * 40,
        sp: 1.65,
        y: Math.max(0, Math.min(3.3, y)),
        u: Math.max(0, Math.min(3.3, 1.65 + 1.4 * (1.65 - y))),
      });
    }
    return out;
  });

  const [logs, setLogs] = useState<SerialLogLine[]>([
    {
      id: 1,
      ts: nowTs(),
      dir: 'SYS',
      text: 'Control Bench simulator active · Format: t_ms,setpoint_v,y_v,u_v,integ',
    },
  ]);
  const [txInput, setTxInput] = useState('');
  const [companionId, setCompanionId] = useState(CONTROL_SCRIPT_PACK[0].id);
  const [selectedGuideId, setSelectedGuideId] = useState(CONTROL_BENCH_LABS[0].id);
  const [scriptFilter, setScriptFilter] = useState<'all' | 'matlab' | 'python' | 'esp32'>('all');
  const [selectedScriptId, setSelectedScriptId] = useState(CONTROL_SCRIPT_PACK[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const simTickRef = useRef(80);
  const logIdRef = useRef(2);
  const logBoxRef = useRef<HTMLDivElement | null>(null);
  const portRef = useRef<SerialPortHandle | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const abortRef = useRef(false);

  const appendLog = (dir: SerialLogLine['dir'], text: string) => {
    logIdRef.current += 1;
    setLogs((prev) => [...prev.slice(-79), { id: logIdRef.current, ts: nowTs(), dir, text }]);
  };

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (streamMode !== 'sim') return;
    const timer = window.setInterval(() => {
      simTickRef.current += 1;
      const idx = simTickRef.current;
      const phase = (idx * 0.04) % 4.0;
      const sp = phase < 2.0 ? 2.2 : 1.0;
      const prev = samples[samples.length - 1]?.y ?? 1.2;
      const y = prev + 0.16 * (sp - prev) + 0.02 * Math.sin(idx * 0.4);
      const u = Math.max(0, Math.min(3.3, 1.4 + 2.1 * (sp - y)));
      const s: ControlSample = { tMs: idx * 40, sp, y, u };
      setSamples((p) => [...p.slice(-119), s]);
      if (idx % 5 === 0) {
        appendLog(
          'RX',
          `${s.tMs},${s.sp.toFixed(2)},${s.y.toFixed(3)},${s.u.toFixed(3)},0.42`
        );
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [streamMode, samples]);

  const disconnectSerial = async () => {
    abortRef.current = true;
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current.releaseLock();
        readerRef.current = null;
      }
    } catch {
      // ignore
    }
    try {
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    return () => {
      void disconnectSerial();
    };
  }, []);

  const handleConnect = async () => {
    setSerialError(null);
    const nav = navigator as NavigatorWithSerial;
    if (!nav.serial) {
      setSerialError(
        'Web Serial API requires desktop Chrome or Edge. Use the Interactive PID Simulator or copy the MATLAB/Python scripts alongside.'
      );
      return;
    }
    try {
      await disconnectSerial();
      const port = await nav.serial.requestPort();
      await port.open({ baudRate });
      portRef.current = port;
      abortRef.current = false;
      setSamples([]);
      setStreamMode('serial');
      appendLog('SYS', `Connected ESP32 control loop @ ${baudRate} baud`);
      if (!port.readable) throw new Error('Port readable stream unavailable.');

      const decoder = new TextDecoderStream();
      const pipeClosed = port.readable.pipeTo(
        decoder.writable as unknown as WritableStream<Uint8Array>
      );
      const reader = decoder.readable.getReader();
      readerRef.current = reader;

      let buf = '';
      while (!abortRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        buf += value;
        const lines = buf.split(/\r?\n/);
        buf = lines.pop() || '';
        const batch: ControlSample[] = [];
        lines.forEach((line) => {
          const t = line.trim();
          if (!t) return;
          appendLog('RX', t);
          if (t.startsWith('t_ms')) return;
          const p = t.split(',');
          if (p.length >= 4) {
            const tMs = parseFloat(p[0]);
            const sp = parseFloat(p[1]);
            const y = parseFloat(p[2]);
            const u = parseFloat(p[3]);
            if (
              Number.isFinite(tMs) &&
              Number.isFinite(sp) &&
              Number.isFinite(y) &&
              Number.isFinite(u)
            ) {
              batch.push({ tMs, sp, y, u });
            }
          }
        });
        if (batch.length > 0) {
          setSamples((prev) => [...prev.slice(-(120 - batch.length)), ...batch]);
        }
      }
      await pipeClosed.catch(() => {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect Web Serial.';
      if (!msg.toLowerCase().includes('no port selected')) {
        setSerialError(msg);
      }
      setStreamMode('sim');
    }
  };

  const handleSendTx = async (cmd: string) => {
    const clean = cmd.trim();
    if (!clean) return;
    if (streamMode !== 'serial' || !portRef.current?.writable) {
      appendLog('SYS', `TX queued ("${clean}") — connect ESP32 over USB to transmit.`);
      setTxInput('');
      return;
    }
    try {
      const writer = portRef.current.writable.getWriter();
      await writer.write(new TextEncoder().encode(`${clean}\n`));
      writer.releaseLock();
      appendLog('TX', clean);
      setTxInput('');
    } catch (err) {
      setSerialError(err instanceof Error ? err.message : 'Write failed');
    }
  };

  const handleSyncGainsToEsp32 = async () => {
    const cmds = [
      `KP=${kp.toFixed(2)}`,
      `KI=${ki.toFixed(2)}`,
      `KD=${kd.toFixed(2)}`,
      `AW=${antiWindup === 'none' ? 0 : 1}`,
    ];
    for (const c of cmds) {
      await handleSendTx(c);
    }
    setSubTab('monitor');
  };

  const handleCopy = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // ignore
    }
  };

  const companionScript =
    CONTROL_SCRIPT_PACK.find((s) => s.id === companionId) || CONTROL_SCRIPT_PACK[0];
  const activeGuide =
    CONTROL_BENCH_LABS.find((g) => g.id === selectedGuideId) || CONTROL_BENCH_LABS[0];
  const filteredScripts =
    scriptFilter === 'all'
      ? CONTROL_SCRIPT_PACK
      : CONTROL_SCRIPT_PACK.filter((s) => s.language === scriptFilter);
  const activeScript =
    filteredScripts.find((s) => s.id === selectedScriptId) ||
    filteredScripts[0] ||
    CONTROL_SCRIPT_PACK[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Control Bench: Interactive PID, Web Serial &amp; MATLAB/Python
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Tune Kp, Ki, and Kd in real time with Recharts transient plots, push gains to an ESP32 over Web Serial, or export MATLAB/Simulink and Python scripts.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 shrink-0">
          {[
            { id: 'pid_sim', label: 'PID Simulator' },
            { id: 'step_analyzer', label: 'Step Analyzer' },
            { id: 'sensitivity', label: 'Sensitivity Analysis' },
            { id: 'correlation', label: 'Signal Correlation' },
            { id: 'opamp_sim', label: 'Op-Amp PID Circuit' },
            { id: 'bode_gen', label: 'Bode Plot & Margins' },
            { id: 'freq_3d', label: '3D Pole-Zero Bode' },
            { id: 'root_locus', label: 'Root Locus' },
            { id: 'lqr_design', label: 'LQR Optimal' },
            { id: 'state_exp', label: 'e^(At) & Trajectories' },
            { id: 'monitor', label: 'Live Serial Monitor' },
            { id: 'wiring', label: `Op-Amp & ESP32 Wiring (${CONTROL_BENCH_LABS.length})` },
            { id: 'scripts', label: `MATLAB / Python / ESP32 (${CONTROL_SCRIPT_PACK.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as typeof subTab)}
              className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                subTab === t.id
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ITERATIVE DESIGN CONSTRAINTS SUMMARY TABLE (BODE + ROOT LOCUS)        */}
      {/* ===================================================================== */}
      {(() => {
        const pmPass = bodeSummary.pmDeg === null || bodeSummary.pmDeg >= targetPmDeg;
        const gmPass = bodeSummary.gmDb === null || bodeSummary.gmDb >= targetGmDb;
        const wgcPass = bodeSummary.wgc !== null && bodeSummary.wgc >= minWgc;
        const zetaPass = rlSummary.isStable && rlSummary.zeta >= minZeta;
        const osPass = rlSummary.isStable && rlSummary.osPct <= maxOsPct;
        const rlGainPass =
          rlSummary.isStable &&
          (rlSummary.kCritical === null || rlSummary.kCurrent < rlSummary.kCritical);
        const stabilityPass = bodeSummary.isStable && rlGainPass;

        const passCount = [pmPass, gmPass, wgcPass, zetaPass, osPass, stabilityPass].filter(
          Boolean
        ).length;

        const rlGainMarginDb =
          rlSummary.kCritical !== null && rlSummary.kCurrent > 0
            ? 20 * Math.log10(rlSummary.kCritical / rlSummary.kCurrent)
            : null;
        const bodeEstZeta =
          bodeSummary.pmDeg !== null ? Math.max(0, bodeSummary.pmDeg / 100) : null;
        const bodeEstOs =
          bodeEstZeta !== null && bodeEstZeta > 0 && bodeEstZeta < 1
            ? 100 *
              Math.exp(
                (-Math.PI * bodeEstZeta) / Math.sqrt(1 - bodeEstZeta * bodeEstZeta)
              )
            : null;

        return (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/70 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-sm font-bold text-slate-950">
                  Iterative Design Constraints Summary
                </h2>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span
                  className={`font-mono text-xs font-semibold tabular-nums ${
                    passCount === 6
                      ? 'text-emerald-700'
                      : passCount >= 4
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}
                >
                  {passCount}/6 Specs Met
                </span>
                <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="text-xs font-mono text-slate-500 hidden sm:inline">
                  Bode ({bodeSummary.compType.toUpperCase()}) · RL ({rlSummary.compType.toUpperCase()}, K={rlSummary.kCurrent.toFixed(1)})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 text-[11px]">
                  <span className="text-slate-500 mr-1">Target Profiles:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetPmDeg(45);
                      setTargetGmDb(6);
                      setMinWgc(2.5);
                      setMinZeta(0.45);
                      setMaxOsPct(20);
                    }}
                    className="cursor-pointer rounded border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:border-sky-400"
                  >
                    Servo Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetPmDeg(55);
                      setTargetGmDb(8);
                      setMinWgc(4.0);
                      setMinZeta(0.59);
                      setMaxOsPct(10);
                    }}
                    className="cursor-pointer rounded border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:border-sky-400"
                  >
                    Fast Precision
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetPmDeg(60);
                      setTargetGmDb(10);
                      setMinWgc(1.5);
                      setMinZeta(0.65);
                      setMaxOsPct(7);
                    }}
                    className="cursor-pointer rounded border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:border-sky-400"
                  >
                    High Robustness
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConstraintsTable((v) => !v)}
                  className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <span>{showConstraintsTable ? 'Hide' : 'Show'}</span>
                  {showConstraintsTable ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {showConstraintsTable && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-white text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Design Constraint</th>
                      <th className="py-2.5 px-4 font-semibold">Target Spec</th>
                      <th className="py-2.5 px-4 font-semibold">Bode Tool Computed</th>
                      <th className="py-2.5 px-4 font-semibold">Root Locus Computed</th>
                      <th className="py-2.5 px-4 font-semibold">Status</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Iterate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {/* 1. Phase Margin */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        Phase Margin (PM)
                        <div className="text-[11px] font-normal text-slate-500">
                          Relative phase stability at 0 dB crossover
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        <label className="inline-flex items-center gap-1">
                          <span className="text-slate-500">≥</span>
                          <input
                            type="number"
                            min={10}
                            max={85}
                            step={5}
                            aria-label="Target Phase Margin Degrees"
                            value={targetPmDeg}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (Number.isFinite(v)) setTargetPmDeg(Math.max(5, Math.min(85, v)));
                            }}
                            className="w-14 rounded border border-slate-300 px-1.5 py-0.5 font-mono text-xs text-slate-900"
                          />
                          <span className="text-slate-500">°</span>
                        </label>
                      </td>
                      <td
                        className={`py-2.5 px-4 font-mono font-bold ${
                          pmPass ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {bodeSummary.pmDeg === null ? '∞ (|G|<0 dB)' : `${bodeSummary.pmDeg.toFixed(1)}°`}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {rlSummary.isStable
                          ? `≈ ${(rlSummary.zeta * 100).toFixed(1)}° (100ζ)`
                          : 'Unstable'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            pmPass ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {pmPass ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Pass</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Add Lead</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSubTab('bode_gen')}
                          className="cursor-pointer font-semibold text-sky-700 hover:underline"
                        >
                          Open Bode
                        </button>
                      </td>
                    </tr>

                    {/* 2. Gain Margin */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        Gain Margin (GM)
                        <div className="text-[11px] font-normal text-slate-500">
                          Allowable gain boost before −180° / jω crossing
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        <label className="inline-flex items-center gap-1">
                          <span className="text-slate-500">≥</span>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            step={1}
                            aria-label="Target Gain Margin dB"
                            value={targetGmDb}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (Number.isFinite(v)) setTargetGmDb(Math.max(1, Math.min(30, v)));
                            }}
                            className="w-14 rounded border border-slate-300 px-1.5 py-0.5 font-mono text-xs text-slate-900"
                          />
                          <span className="text-slate-500">dB</span>
                        </label>
                      </td>
                      <td
                        className={`py-2.5 px-4 font-mono font-bold ${
                          gmPass ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {bodeSummary.gmDb === null ? '∞ (No −180°)' : `${bodeSummary.gmDb.toFixed(1)} dB`}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {rlGainMarginDb === null
                          ? '∞ (No jω crossing)'
                          : `${rlGainMarginDb.toFixed(1)} dB (K_crit=${rlSummary.kCritical?.toFixed(1)})`}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            gmPass ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {gmPass ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Pass</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Lower Kc</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setSubTab('bode_gen')}
                          className="cursor-pointer font-semibold text-sky-700 hover:underline"
                        >
                          Bode
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubTab('root_locus')}
                          className="cursor-pointer font-semibold text-sky-700 hover:underline"
                        >
                          RL
                        </button>
                      </td>
                    </tr>

                    {/* 3. Gain Crossover / Natural Frequency */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        Crossover Speed (ω_gc / ω_n)
                        <div className="text-[11px] font-normal text-slate-500">
                          Closed-loop bandwidth &amp; response speed
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        <label className="inline-flex items-center gap-1">
                          <span className="text-slate-500">≥</span>
                          <input
                            type="number"
                            min={0.2}
                            max={40}
                            step={0.5}
                            aria-label="Target Minimum Crossover Frequency"
                            value={minWgc}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (Number.isFinite(v)) setMinWgc(Math.max(0.2, Math.min(40, v)));
                            }}
                            className="w-14 rounded border border-slate-300 px-1.5 py-0.5 font-mono text-xs text-slate-900"
                          />
                          <span className="text-slate-500">rad/s</span>
                        </label>
                      </td>
                      <td
                        className={`py-2.5 px-4 font-mono font-bold ${
                          wgcPass ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {bodeSummary.wgc === null ? 'None' : `${bodeSummary.wgc.toFixed(2)} rad/s`}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        ω_n = {rlSummary.wn.toFixed(2)} rad/s
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            wgcPass ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {wgcPass ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Pass</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Too Slow</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSubTab('bode_gen')}
                          className="cursor-pointer font-semibold text-sky-700 hover:underline"
                        >
                          Open Bode
                        </button>
                      </td>
                    </tr>

                    {/* 4. Dominant Damping Ratio */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        Damping Ratio (ζ)
                        <div className="text-[11px] font-normal text-slate-500">
                          Dominant pole angle θ = arccos(ζ) in s-plane
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        <label className="inline-flex items-center gap-1">
                          <span className="text-slate-500">≥</span>
                          <input
                            type="number"
                            min={0.1}
                            max={1.0}
                            step={0.05}
                            aria-label="Target Minimum Damping Ratio"
                            value={minZeta}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (Number.isFinite(v)) setMinZeta(Math.max(0.05, Math.min(1.0, v)));
                            }}
                            className="w-14 rounded border border-slate-300 px-1.5 py-0.5 font-mono text-xs text-slate-900"
                          />
                        </label>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {bodeEstZeta !== null ? `≈ ${bodeEstZeta.toFixed(2)} (PM/100)` : '≥ 0.85'}
                      </td>
                      <td
                        className={`py-2.5 px-4 font-mono font-bold ${
                          zetaPass ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {rlSummary.zeta.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            zetaPass ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {zetaPass ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Pass</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Under-damped</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSubTab('root_locus')}
                          className="cursor-pointer font-semibold text-sky-700 hover:underline"
                        >
                          Open RL
                        </button>
                      </td>
                    </tr>

                    {/* 5. Maximum Overshoot */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        Desired Overshoot (%OS)
                        <div className="text-[11px] font-normal text-slate-500">
                          Peak step overshoot (PID Sim live: {pidSim.overshootPct.toFixed(1)}%)
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        <label className="inline-flex items-center gap-1">
                          <span className="text-slate-500">≤</span>
                          <input
                            type="number"
                            min={0}
                            max={60}
                            step={1}
                            aria-label="Target Maximum Overshoot Percent"
                            value={maxOsPct}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (Number.isFinite(v)) setMaxOsPct(Math.max(0, Math.min(80, v)));
                            }}
                            className="w-14 rounded border border-slate-300 px-1.5 py-0.5 font-mono text-xs text-slate-900"
                          />
                          <span className="text-slate-500">%</span>
                        </label>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {bodeEstOs !== null ? `≈ ${bodeEstOs.toFixed(1)}%` : '< 5%'}
                      </td>
                      <td
                        className={`py-2.5 px-4 font-mono font-bold ${
                          osPass ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {rlSummary.isStable ? `${rlSummary.osPct.toFixed(1)}%` : 'Divergent'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            osPass ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {osPass ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Pass</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Exceeds Max</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setSubTab('root_locus')}
                          className="cursor-pointer font-semibold text-sky-700 hover:underline"
                        >
                          RL
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubTab('step_analyzer')}
                          className="cursor-pointer font-semibold text-sky-700 hover:underline"
                        >
                          Step
                        </button>
                      </td>
                    </tr>

                    {/* 6. Closed-Loop Stability */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        Closed-Loop Stability
                        <div className="text-[11px] font-normal text-slate-500">
                          Positive Bode margins &amp; all Root Locus poles in LHP
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        Re(s_i) &lt; 0, PM &gt; 0
                      </td>
                      <td
                        className={`py-2.5 px-4 font-mono font-bold ${
                          bodeSummary.isStable ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {bodeSummary.isStable ? 'Stable' : 'Unstable'}
                      </td>
                      <td
                        className={`py-2.5 px-4 font-mono font-bold ${
                          rlGainPass ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {rlGainPass
                          ? `LHP (max Re = ${rlSummary.maxRe.toFixed(2)})`
                          : `RHP (max Re = +${rlSummary.maxRe.toFixed(2)})`}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            stabilityPass ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {stabilityPass ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Stable</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Unstable</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSubTab('root_locus')}
                          className="cursor-pointer font-semibold text-sky-700 hover:underline"
                        >
                          Verify Poles
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* TAB 1: REAL-TIME INTERACTIVE PID SIMULATOR (RECHARTS)                 */}
      {/* ===================================================================== */}
      {subTab === 'pid_sim' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Control Panel */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-950">Real-Time PID Gains</h2>
              </div>
              <button
                type="button"
                onClick={() => applyPidPreset('pid')}
                className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Quick Mode Presets */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Controller Mode Presets
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { id: 'p', label: 'P' },
                  { id: 'pi', label: 'PI' },
                  { id: 'pd', label: 'PD' },
                  { id: 'pid', label: 'PID' },
                  { id: 'zn', label: 'ZN' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPidPreset(p.id as 'p' | 'pi' | 'pd' | 'pid' | 'zn')}
                    className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:bg-sky-50/60"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kp Slider + Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="bench-kp" className="font-semibold text-slate-900">
                  Proportional Gain (Kp)
                </label>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={25}
                  value={kp}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setKp(Math.max(0, Math.min(25, v)));
                  }}
                  className="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-right font-mono text-xs font-semibold text-sky-700 tabular-nums"
                />
              </div>
              <input
                id="bench-kp"
                type="range"
                min={0}
                max={15}
                step={0.1}
                value={Math.min(15, kp)}
                onChange={(e) => setKp(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0.0 (Off)</span>
                <span>Speeds rise time · lowers offset</span>
                <span>15.0</span>
              </div>
            </div>

            {/* Ki Slider + Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="bench-ki" className="font-semibold text-slate-900">
                  Integral Gain (Ki)
                </label>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={20}
                  value={ki}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setKi(Math.max(0, Math.min(20, v)));
                  }}
                  className="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-right font-mono text-xs font-semibold text-emerald-700 tabular-nums"
                />
              </div>
              <input
                id="bench-ki"
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={Math.min(10, ki)}
                onChange={(e) => setKi(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0.0</span>
                <span>Zero steady-state error</span>
                <span>10.0</span>
              </div>
            </div>

            {/* Kd Slider + Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="bench-kd" className="font-semibold text-slate-900">
                  Derivative Gain (Kd)
                </label>
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  max={10}
                  value={kd}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setKd(Math.max(0, Math.min(10, v)));
                  }}
                  className="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-right font-mono text-xs font-semibold text-amber-700 tabular-nums"
                />
              </div>
              <input
                id="bench-kd"
                type="range"
                min={0}
                max={5}
                step={0.05}
                value={Math.min(5, kd)}
                onChange={(e) => setKd(parseFloat(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0.0</span>
                <span>Damps overshoot via phase lead</span>
                <span>5.0</span>
              </div>
            </div>

            {/* Plant & Anti-Windup Settings */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Plant &amp; Actuator Constraints
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <label className="space-y-1">
                  <span className="block text-[11px] text-slate-600 font-mono">Plant K</span>
                  <input
                    type="number"
                    step={0.1}
                    min={0.2}
                    max={5}
                    value={plantK}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setPlantK(Math.max(0.2, Math.min(5, v)));
                    }}
                    className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs tabular-nums"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-[11px] text-slate-600 font-mono">τ₁ (s)</span>
                  <input
                    type="number"
                    step={0.1}
                    min={0.1}
                    max={5}
                    value={tau1}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setTau1(Math.max(0.1, Math.min(5, v)));
                    }}
                    className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs tabular-nums"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-[11px] text-slate-600 font-mono">τ₂ (s)</span>
                  <input
                    type="number"
                    step={0.1}
                    min={0.1}
                    max={5}
                    value={tau2}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setTau2(Math.max(0.1, Math.min(5, v)));
                    }}
                    className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs tabular-nums"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="space-y-1">
                  <span className="block text-[11px] text-slate-600 font-mono">
                    Actuator ±u_max
                  </span>
                  <input
                    type="number"
                    step={0.5}
                    min={1}
                    max={24}
                    value={uMax}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setUMax(Math.max(1, Math.min(24, v)));
                    }}
                    className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs tabular-nums"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-[11px] text-slate-600 font-mono">
                    Horizon (s)
                  </span>
                  <select
                    value={tEnd}
                    onChange={(e) => setTEnd(parseInt(e.target.value, 10))}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs"
                  >
                    <option value={6}>6 s</option>
                    <option value={10}>10 s</option>
                    <option value={16}>16 s</option>
                  </select>
                </label>
              </div>

              <div className="space-y-1">
                <span className="block text-[11px] text-slate-600 font-mono">
                  Anti-Windup Strategy
                </span>
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'clamping', label: 'Clamp' },
                    { id: 'back_calc', label: 'Back-Calc' },
                  ].map((aw) => (
                    <button
                      key={aw.id}
                      type="button"
                      onClick={() => setAntiWindup(aw.id as typeof antiWindup)}
                      className={`cursor-pointer rounded py-1 text-[11px] font-semibold ${
                        antiWindup === aw.id
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      {aw.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSyncGainsToEsp32()}
              className="cursor-pointer w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Push Gains to ESP32 Serial</span>
            </button>
          </div>

          {/* Recharts Visualization Column */}
          <div className="lg:col-span-8 space-y-5">
            {/* Transient Performance Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="text-[11px] font-medium text-slate-500">Overshoot (%OS)</div>
                <div
                  className={`mt-1 font-mono text-lg font-bold tabular-nums ${
                    pidSim.overshootPct > 25 ? 'text-red-600' : 'text-slate-950'
                  }`}
                >
                  {pidSim.overshootPct.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="text-[11px] font-medium text-slate-500">Rise Time (tr)</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-950">
                  {pidSim.riseTime.toFixed(2)} s
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="text-[11px] font-medium text-slate-500">Settling (±2%)</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-950">
                  {pidSim.settlingTime.toFixed(2)} s
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="text-[11px] font-medium text-slate-500">Steady Error (ess)</div>
                <div
                  className={`mt-1 font-mono text-lg font-bold tabular-nums ${
                    Math.abs(pidSim.steadyStateError) > 0.05 ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {pidSim.steadyStateError.toFixed(3)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="text-[11px] font-medium text-slate-500">Actuator Sat.</div>
                <div
                  className={`mt-1 font-mono text-lg font-bold tabular-nums ${
                    pidSim.saturatedFraction > 0.25 ? 'text-amber-700' : 'text-slate-950'
                  }`}
                >
                  {(pidSim.saturatedFraction * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Primary Step Response Chart (Recharts) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">
                    Unit Step Transient Response y(t)
                  </h3>
                  <p className="font-mono text-xs text-slate-500">
                    C(s) = {kp.toFixed(2)} + {ki.toFixed(2)}/s + {kd.toFixed(2)}s · G(s) ={' '}
                    {plantK.toFixed(1)} / (({tau1.toFixed(1)}s+1)({tau2.toFixed(1)}s+1))
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showControlEffort}
                    onChange={(e) => setShowControlEffort(e.target.checked)}
                    className="rounded accent-sky-600"
                  />
                  <span>Show Actuator u(t) &amp; Integral State</span>
                </label>
              </div>

              <div className="h-[290px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={pidChartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="t"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v) => `${v}s`}
                    />
                    <YAxis
                      domain={[0, 'auto']}
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
                      labelFormatter={(label) => `Time t = ${label} s`}
                      formatter={(value, name) => [
                        typeof value === 'number' ? value.toFixed(3) : String(value ?? ''),
                        String(name),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <ReferenceLine
                      y={1.0}
                      stroke="#64748b"
                      strokeDasharray="5 4"
                      label={{ value: 'Setpoint r = 1.0', position: 'insideTopRight', fontSize: 10, fill: '#64748b' }}
                    />
                    <ReferenceLine y={1.02} stroke="#cbd5e1" strokeDasharray="2 3" />
                    <ReferenceLine y={0.98} stroke="#cbd5e1" strokeDasharray="2 3" />
                    <Line
                      type="monotone"
                      dataKey="y"
                      name="Plant Output y(t)"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Secondary Control Effort & Integrator Chart (Recharts) */}
            {showControlEffort && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <h3 className="text-sm font-semibold text-slate-950">
                    Control Effort u(t) &amp; Integral Term Ki·∫e(t)dt
                  </h3>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    Saturation Rails: ±{uMax.toFixed(1)} · Anti-Windup: {antiWindup}
                  </span>
                </div>

                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={pidChartData}
                      margin={{ top: 8, right: 20, left: 0, bottom: 6 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="t"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(v) => `${v}s`}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={44} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#cbd5e1',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelFormatter={(label) => `Time t = ${label} s`}
                        formatter={(value, name) => [
                          typeof value === 'number' ? value.toFixed(3) : String(value ?? ''),
                          String(name),
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <ReferenceLine y={uMax} stroke="#dc2626" strokeDasharray="4 4" />
                      <ReferenceLine y={-uMax} stroke="#dc2626" strokeDasharray="4 4" />
                      <Line
                        type="monotone"
                        dataKey="u"
                        name="Saturated Control u(t)"
                        stroke="#d97706"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="iTerm"
                        name="Integral Output Ki·∫e dt"
                        stroke="#059669"
                        strokeWidth={1.8}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: SECOND-ORDER STEP ANALYZER & PID OVERLAY                       */}
      {/* ===================================================================== */}
      {subTab === 'step_analyzer' && (
        <StepAnalyzerSection
          kp={kp}
          ki={ki}
          kd={kd}
          plantK={plantK}
          tau1={tau1}
          tau2={tau2}
          uMax={uMax}
          antiWindup={antiWindup}
          onUpdatePid={({ kp: nextKp, ki: nextKi, kd: nextKd }) => {
            setKp(nextKp);
            setKi(nextKi);
            setKd(nextKd);
          }}
        />
      )}

      {/* ===================================================================== */}
      {/* TAB 3: PARAMETRIC SENSITIVITY ANALYSIS DASHBOARD                      */}
      {/* ===================================================================== */}
      {subTab === 'sensitivity' && (
        <SensitivityAnalysisSection
          kp={kp}
          ki={ki}
          kd={kd}
          plantK={plantK}
          tau1={tau1}
          tau2={tau2}
          uMax={uMax}
          antiWindup={antiWindup}
          onUpdateParams={(next) => {
            if (next.kp !== undefined) setKp(next.kp);
            if (next.ki !== undefined) setKi(next.ki);
            if (next.kd !== undefined) setKd(next.kd);
            if (next.plantK !== undefined) setPlantK(next.plantK);
            if (next.tau1 !== undefined) setTau1(next.tau1);
          }}
        />
      )}

      {/* ===================================================================== */}
      {/* TAB 3B: SIGNAL CORRELATION & TRACKING PERFORMANCE TOOL                */}
      {/* ===================================================================== */}
      {subTab === 'correlation' && (
        <SignalCorrelationSection
          kp={kp}
          ki={ki}
          kd={kd}
          plantK={plantK}
          tau1={tau1}
          tau2={tau2}
          uMax={uMax}
          antiWindup={antiWindup}
          onUpdateParams={(next) => {
            if (next.kp !== undefined) setKp(next.kp);
            if (next.ki !== undefined) setKi(next.ki);
            if (next.kd !== undefined) setKd(next.kd);
          }}
        />
      )}

      {/* ===================================================================== */}
      {/* TAB 3: INTERACTIVE OP-AMP PID CIRCUIT SIMULATOR                       */}
      {/* ===================================================================== */}
      {subTab === 'opamp_sim' && <OpAmpPidSimSection />}

      {/* ===================================================================== */}
      {/* TAB 4: INTERACTIVE BODE PLOT & MARGIN GENERATOR                       */}
      {/* ===================================================================== */}
      {subTab === 'bode_gen' && (
        <BodeGeneratorSection onSummaryChange={setBodeSummary} />
      )}

      {/* ===================================================================== */}
      {/* TAB 5B: 3D POLE-ZERO LAPLACE SURFACE & BODE MAPPER                    */}
      {/* ===================================================================== */}
      {subTab === 'freq_3d' && <FreqResponse3DSection />}

      {/* ===================================================================== */}
      {/* TAB 5: INTERACTIVE ROOT LOCUS PLOTTER                                 */}
      {/* ===================================================================== */}
      {subTab === 'root_locus' && (
        <RootLocusSection onSummaryChange={setRlSummary} />
      )}

      {/* ===================================================================== */}
      {/* TAB 5: LQR OPTIMAL STATE-FEEDBACK DESIGN                              */}
      {/* ===================================================================== */}
      {subTab === 'lqr_design' && <LqrDesignSection />}

      {/* ===================================================================== */}
      {/* TAB 6: D3 MATRIX EXPONENTIAL e^(At) & PHASE TRAJECTORIES              */}
      {/* ===================================================================== */}
      {subTab === 'state_exp' && <MatrixExpD3Section />}

      {/* ===================================================================== */}
      {/* TAB 3: LIVE WEB SERIAL MONITOR                                        */}
      {/* ===================================================================== */}
      {subTab === 'monitor' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Real-Time Closed-Loop Plant Response (Setpoint r, Output y, Actuator u)
                </h2>
                <p className="text-xs text-slate-500">
                  Dashed slate: Setpoint r(t) · Solid blue: Plant output y(t) · Solid amber: Control u(t)
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700">
                {streamMode === 'serial' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">ESP32 USB Active · {baudRate} baud</span>
                  </>
                ) : (
                  <>
                    <Cpu className="h-3.5 w-3.5" />
                    <span>{streamMode === 'sim' ? 'Simulated Control Loop' : 'Paused'}</span>
                  </>
                )}
              </span>
            </div>

            {serialError && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{serialError}</span>
              </div>
            )}

            <svg
              viewBox="0 0 760 240"
              className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/70"
              role="img"
              aria-label="Live control loop step response monitor"
            >
              {[0, 0.825, 1.65, 2.475, 3.3].map((v) => {
                const y = 212 - (v / 3.3) * 185;
                return (
                  <g key={`cg-${v}`}>
                    <line x1={52} y1={y} x2={732} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                    <text x={45} y={y + 4} textAnchor="end" className="fill-slate-500 font-mono text-[10px]">
                      {v.toFixed(1)}V
                    </text>
                  </g>
                );
              })}

              {samples.length > 1 && (
                <>
                  <path
                    d={samples
                      .map((s, i) => {
                        const x = 52 + (i / (samples.length - 1)) * 680;
                        const y = 212 - (s.sp / 3.3) * 185;
                        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    strokeWidth="1.6"
                  />
                  <path
                    d={samples
                      .map((s, i) => {
                        const x = 52 + (i / (samples.length - 1)) * 680;
                        const y = 212 - (s.u / 3.3) * 185;
                        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="1.6"
                  />
                  <path
                    d={samples
                      .map((s, i) => {
                        const x = 52 + (i / (samples.length - 1)) * 680;
                        const y = 212 - (s.y / 3.3) * 185;
                        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2.4"
                  />
                </>
              )}
            </svg>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={baudRate}
                disabled={streamMode === 'serial'}
                onChange={(e) => setBaudRate(parseInt(e.target.value, 10))}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs text-slate-900"
              >
                <option value={9600}>9600 baud</option>
                <option value={115200}>115200 baud</option>
                <option value={230400}>230400 baud</option>
              </select>

              <button
                type="button"
                onClick={handleConnect}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
              >
                <Usb className="h-3.5 w-3.5" />
                <span>Connect ESP32 (Web Serial)</span>
              </button>

              {streamMode === 'serial' && (
                <button
                  type="button"
                  onClick={async () => {
                    await disconnectSerial();
                    setStreamMode('paused');
                  }}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                >
                  <Unplug className="h-3.5 w-3.5" />
                  <span>Disconnect</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setStreamMode((m) => (m === 'sim' ? 'paused' : 'sim'))}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                {streamMode === 'sim' ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    <span>Pause Sim</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 text-sky-600" />
                    <span>Run Sim</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* UART Terminal */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-sky-600" />
                    <h3 className="text-sm font-semibold text-slate-950">UART Serial Console</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogs([])}
                    className="cursor-pointer rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                    aria-label="Clear console"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div
                  ref={logBoxRef}
                  className="h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-[11px] text-slate-200 space-y-1"
                >
                  {logs.map((l) => (
                    <div key={l.id} className="flex items-start gap-2 tabular-nums">
                      <span className="text-slate-500 shrink-0">{l.ts}</span>
                      <span
                        className={`font-semibold shrink-0 ${
                          l.dir === 'TX'
                            ? 'text-amber-400'
                            : l.dir === 'SYS'
                            ? 'text-sky-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {l.dir}
                      </span>
                      <span className="break-all">{l.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSendTx(txInput);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={txInput}
                    onChange={(e) => setTxInput(e.target.value)}
                    placeholder="Send command (e.g. KP=3.5 or AW=1)"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs"
                  />
                  <button
                    type="submit"
                    className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Send className="h-3 w-3" />
                    <span>Send</span>
                  </button>
                </form>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {['KP=3.5', 'KI=1.8', 'AW=0', 'AW=1', 'SP=2.2'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => void handleSendTx(c)}
                      className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-slate-700 hover:border-sky-400"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Companion MATLAB / Python Inspector */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-sky-600" />
                  <h3 className="text-sm font-semibold text-slate-950">
                    MATLAB Toolbox / Python / ESP32 Code Inspector
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(companionScript.id, companionScript.code)}
                    className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-800"
                  >
                    {copiedId === companionScript.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadFile(companionScript.filename, companionScript.code)}
                    className="cursor-pointer inline-flex items-center gap-1 rounded bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                {CONTROL_SCRIPT_PACK.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCompanionId(s.id)}
                    className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                      companionScript.id === s.id
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    {s.filename.replace('ece433_', '')}
                  </button>
                ))}
              </div>

              <pre className="h-56 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3.5 font-mono text-[11px] leading-relaxed text-slate-100">
                <code>{companionScript.code}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: OP-AMP & ESP32 WIRING                                          */}
      {/* ===================================================================== */}
      {subTab === 'wiring' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 w-fit">
            {CONTROL_BENCH_LABS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGuideId(g.id)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  activeGuide.id === g.id ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                }`}
              >
                {g.shortLabel}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="space-y-1 border-b border-slate-100 pb-4">
                <div className="text-xs text-slate-500">
                  <span>{CONTROL_MODULE_META[activeGuide.module].shortTitle}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono text-sky-700 font-semibold">
                    {activeGuide.hardwareTarget}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-950">{activeGuide.title}</h2>
                <p className="text-sm text-slate-600">{activeGuide.objective}</p>
              </div>

              <svg
                viewBox="0 0 720 190"
                className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/70"
                role="img"
                aria-label={`Control loop wiring schematic for ${activeGuide.shortLabel}`}
              >
                <rect x={24} y={45} width={155} height={95} rx={8} fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x={101} y={76} textAnchor="middle" className="fill-slate-950 font-sans text-xs font-bold">
                  Setpoint / Error
                </text>
                <text x={101} y={98} textAnchor="middle" className="fill-sky-700 font-mono text-[10px]">
                  {activeGuide.pins[0]}
                </text>
                <text x={101} y={118} textAnchor="middle" className="fill-slate-500 font-mono text-[9px]">
                  r(t) − y(t)
                </text>

                <line x1={179} y1={92} x2={245} y2={92} stroke="#0284c7" strokeWidth="2.2" />

                <rect x={245} y={35} width={215} height={115} rx={8} fill="#f0fdf4" stroke="#059669" strokeWidth="1.6" />
                <text x={352} y={66} textAnchor="middle" className="fill-emerald-950 font-sans text-xs font-bold">
                  Controller + Anti-Windup
                </text>
                <text x={352} y={90} textAnchor="middle" className="fill-emerald-800 font-mono text-[10px]">
                  {activeGuide.shortLabel}
                </text>
                <text x={352} y={114} textAnchor="middle" className="fill-slate-600 font-mono text-[9px]">
                  {activeGuide.pins[1]}
                </text>

                <line x1={460} y1={92} x2={526} y2={92} stroke="#059669" strokeWidth="2.2" />

                <rect x={526} y={45} width={170} height={95} rx={8} fill="#0f172a" />
                <text x={611} y={76} textAnchor="middle" className="fill-white font-sans text-xs font-bold">
                  Plant &amp; Sensor
                </text>
                <text x={611} y={98} textAnchor="middle" className="fill-sky-300 font-mono text-[10px]">
                  {activeGuide.pins[2] || 'GPIO34 Feedback'}
                </text>
                <text x={611} y={118} textAnchor="middle" className="fill-emerald-300 font-mono text-[9px]">
                  y(t) → Closed Loop
                </text>
              </svg>

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-xs space-y-1">
                <div className="font-semibold text-slate-900">Hardware &amp; Conditioning Rule</div>
                <p className="text-slate-700 leading-relaxed">{activeGuide.conditioningRule}</p>
              </div>

              <ol className="space-y-2 text-sm text-slate-700">
                {activeGuide.steps.map((s, idx) => (
                  <li key={s} className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-bold text-sky-700 mt-0.5 tabular-nums">
                      {idx + 1}.
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>

              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{activeGuide.safetyNote}</span>
              </div>
            </div>

            <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-950">
                Recommended Parts ({activeGuide.shortLabel})
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {activeGuide.bom.map((b) => (
                  <div key={b.ref} className="py-2.5 space-y-0.5">
                    <div className="flex justify-between font-mono font-semibold text-slate-900">
                      <span>{b.ref}</span>
                      <span className="text-sky-700">{b.value}</span>
                    </div>
                    <p className="text-slate-600">{b.purpose}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: MATLAB / PYTHON / ESP32 SCRIPTS                                */}
      {/* ===================================================================== */}
      {subTab === 'scripts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-4">
            <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              {[
                { id: 'all', label: `All (${CONTROL_SCRIPT_PACK.length})` },
                { id: 'matlab', label: 'MATLAB' },
                { id: 'python', label: 'Python' },
                { id: 'esp32', label: 'ESP32' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setScriptFilter(f.id as typeof scriptFilter)}
                  className={`cursor-pointer flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                    scriptFilter === f.id ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-200">
              {filteredScripts.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedScriptId(s.id)}
                  className={`cursor-pointer w-full p-4 text-left space-y-1 ${
                    activeScript.id === s.id ? 'bg-sky-50/70' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex justify-between text-[11px] font-mono text-slate-500">
                    <span className="font-semibold text-sky-700 uppercase">{s.language}</span>
                    <span className="truncate">{s.filename}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-950">{s.title}</div>
                  <p className="text-xs text-slate-600 line-clamp-2">{s.summary}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="text-xs text-slate-500">
                  <span className="font-mono font-semibold text-sky-700">{activeScript.filename}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{activeScript.environment}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-950 mt-0.5">{activeScript.title}</h2>
                <p className="text-sm text-slate-600 mt-1">{activeScript.summary}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(activeScript.id, activeScript.code)}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  {copiedId === activeScript.id ? (
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
                  onClick={() => downloadFile(activeScript.filename, activeScript.code)}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            <pre className="max-h-[500px] overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
              <code>{activeScript.code}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
