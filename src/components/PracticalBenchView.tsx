import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
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
} from 'lucide-react';
import {
  BENCH_SCRIPT_PACK,
  HARDWARE_BENCH_LABS,
  ScriptLanguage,
  SensorExperimentId,
} from '../data/practicalBenchData';
import { MODULE_META } from '../data/syllabusData';
import { LabType } from '../types/ece423';
import { muLawCompress, muLawExpand } from '../utils/dspMath';
import { InteractiveWiringDiagram } from './InteractiveWiringDiagram';

interface PracticalBenchViewProps {
  onOpenLab: (lab: LabType) => void;
  onOpenCalculator: (calcId?: string) => void;
  onOpenTheory?: (subTab?: 'principles' | 'timeline' | 'essays') => void;
}

interface BenchSample {
  tMs: number;
  vVolts: number;
  iVolts: number;
  gasVolts: number;
  distCm: number;
}

interface SerialLogLine {
  id: number;
  ts: string;
  direction: 'RX' | 'TX' | 'SYS';
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

type BenchSubTab = 'capture' | 'hardware' | 'scripts';
type ActiveChannel = 'voltage' | 'current' | 'gas' | 'ultrasonic';
type DspMode = 'pcm' | 'mulaw' | 'dm';

const MAX_BUFFER = 140;
const MAX_SERIAL_LOGS = 90;
const BAUD_RATES = [9600, 115200, 230400, 921600] as const;

function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function nowTimeStamp(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

function createInitialSimSamples(channel: ActiveChannel): BenchSample[] {
  const out: BenchSample[] = [];
  for (let idx = 0; idx < 90; idx += 1) {
    const tSec = idx * 0.025;
    out.push(generateSimSample(idx * 25, tSec, channel));
  }
  return out;
}

function generateSimSample(
  tMs: number,
  tSec: number,
  activeChannel: ActiveChannel
): BenchSample {
  const vBase =
    1.65 +
    1.05 * Math.sin(2 * Math.PI * 1.4 * tSec) +
    0.18 * Math.sin(2 * Math.PI * 4.2 * tSec);
  const cycle = tSec % 3.2;
  const iBase =
    cycle > 1.2 && cycle < 2.2
      ? 2.35 + 0.14 * Math.sin(2 * Math.PI * 7 * tSec)
      : 0.32 + 0.04 * Math.sin(2 * Math.PI * 2 * tSec);
  const gasPhase = tSec % 4.0;
  const gasBase =
    gasPhase < 0.7
      ? 0.55
      : gasPhase < 1.2
      ? 0.55 + (2.3 * (gasPhase - 0.7)) / 0.5
      : 0.55 + 2.3 * Math.exp(-(gasPhase - 1.2) * 1.25);
  const distBase =
    38 +
    26 * Math.sin(2 * Math.PI * 0.35 * tSec) +
    (activeChannel === 'ultrasonic' ? 4 * Math.cos(2 * Math.PI * 1.1 * tSec) : 0);

  return {
    tMs,
    vVolts: Math.max(0.05, Math.min(3.25, vBase)),
    iVolts: Math.max(0.05, Math.min(3.25, iBase)),
    gasVolts: Math.max(0.05, Math.min(3.25, gasBase)),
    distCm: Math.max(4, Math.min(95, distBase)),
  };
}

export const PracticalBenchView: React.FC<PracticalBenchViewProps> = ({
  onOpenLab,
  onOpenCalculator,
  onOpenTheory,
}) => {
  const [subTab, setSubTab] = useState<BenchSubTab>('capture');

  // Sub-tab 1: Live Web Serial Monitor & Waveform Analyzer
  const [streamSource, setStreamSource] = useState<'simulating' | 'serial' | 'paused'>('simulating');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<ActiveChannel>('voltage');
  const [dspMode, setDspMode] = useState<DspMode>('pcm');
  const [quantBits, setQuantBits] = useState<number>(4);
  const [dmStepV, setDmStepV] = useState<number>(0.18);
  const [samples, setSamples] = useState<BenchSample[]>(() => createInitialSimSamples('voltage'));

  // Serial Monitor Terminal state
  const [serialLogs, setSerialLogs] = useState<SerialLogLine[]>([
    {
      id: 1,
      ts: nowTimeStamp(),
      direction: 'SYS',
      text: 'Simulator active · Format: t_ms,v_volts,i_volts,gas_volts,dist_cm',
    },
  ]);
  const [monitorPaused, setMonitorPaused] = useState<boolean>(false);
  const [autoScrollMonitor, setAutoScrollMonitor] = useState<boolean>(true);
  const [txInput, setTxInput] = useState<string>('');
  const [rxFrameCount, setRxFrameCount] = useState<number>(90);
  const [companionSnippetId, setCompanionSnippetId] = useState<string>('script-py-serial');

  const simTickRef = useRef<number>(90);
  const logIdRef = useRef<number>(2);
  const monitorScrollRef = useRef<HTMLDivElement | null>(null);
  const serialPortRef = useRef<SerialPortHandle | null>(null);
  const serialReaderRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const serialAbortRef = useRef<boolean>(false);
  const monitorPausedRef = useRef<boolean>(false);
  monitorPausedRef.current = monitorPaused;

  // Sub-tab 2: Hardware Wiring & KiCad RC Filter Calculator
  const [selectedHardware, setSelectedHardware] = useState<SensorExperimentId>('voltage');
  const [rcResKOhm, setRcResKOhm] = useState<number>(1.0);
  const [rcCapNf, setRcCapNf] = useState<number>(100);
  const [targetFsHz, setTargetFsHz] = useState<number>(1000);

  // Sub-tab 3: Full Script Pack
  const [scriptFilter, setScriptFilter] = useState<'all' | ScriptLanguage>('all');
  const [selectedScriptId, setSelectedScriptId] = useState<string>(BENCH_SCRIPT_PACK[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const webSerialSupported =
    typeof navigator !== 'undefined' &&
    Boolean((navigator as NavigatorWithSerial).serial);

  const appendSerialLog = (direction: SerialLogLine['direction'], text: string) => {
    if (monitorPausedRef.current && direction === 'RX') return;
    logIdRef.current += 1;
    const entry: SerialLogLine = {
      id: logIdRef.current,
      ts: nowTimeStamp(),
      direction,
      text,
    };
    setSerialLogs((prev) => [...prev.slice(-(MAX_SERIAL_LOGS - 1)), entry]);
  };

  useEffect(() => {
    if (autoScrollMonitor && monitorScrollRef.current) {
      monitorScrollRef.current.scrollTop = monitorScrollRef.current.scrollHeight;
    }
  }, [serialLogs, autoScrollMonitor]);

  // Simulated stream ticker
  useEffect(() => {
    if (streamSource !== 'simulating') return;
    const interval = window.setInterval(() => {
      simTickRef.current += 1;
      const idx = simTickRef.current;
      const sample = generateSimSample(idx * 25, idx * 0.025, activeChannel);
      setSamples((prev) => [...prev.slice(-(MAX_BUFFER - 1)), sample]);
      setRxFrameCount((c) => c + 1);
      // Log every 4th simulated sample so the serial monitor stays readable
      if (idx % 4 === 0 && !monitorPausedRef.current) {
        logIdRef.current += 1;
        const lineText = `${Math.round(sample.tMs)},${sample.vVolts.toFixed(3)},${sample.iVolts.toFixed(3)},${sample.gasVolts.toFixed(3)},${sample.distCm.toFixed(1)}`;
        setSerialLogs((prev) => [
          ...prev.slice(-(MAX_SERIAL_LOGS - 1)),
          { id: logIdRef.current, ts: nowTimeStamp(), direction: 'RX', text: lineText },
        ]);
      }
    }, 65);
    return () => window.clearInterval(interval);
  }, [streamSource, activeChannel]);

  const stopSerialConnection = async (announce = false) => {
    serialAbortRef.current = true;
    try {
      if (serialReaderRef.current) {
        await serialReaderRef.current.cancel();
        serialReaderRef.current.releaseLock();
        serialReaderRef.current = null;
      }
    } catch {
      // Ignore cancel cleanup errors
    }
    try {
      if (serialPortRef.current) {
        await serialPortRef.current.close();
        serialPortRef.current = null;
      }
    } catch {
      // Ignore port close cleanup errors
    }
    if (announce) {
      appendSerialLog('SYS', 'USB Web Serial disconnected.');
    }
  };

  useEffect(() => {
    return () => {
      void stopSerialConnection(false);
    };
  }, []);

  const handleConnectSerial = async () => {
    setSerialError(null);
    const nav = navigator as NavigatorWithSerial;
    if (!nav.serial) {
      setSerialError(
        'Web Serial API requires desktop Chrome or Edge over HTTPS/localhost. Keep using the Live Simulator here, or copy the Spyder / MATLAB serial logger script beside this monitor.'
      );
      return;
    }

    try {
      await stopSerialConnection(false);
      const port = await nav.serial.requestPort();
      await port.open({ baudRate });
      serialPortRef.current = port;
      serialAbortRef.current = false;
      setSamples([]);
      setRxFrameCount(0);
      setStreamSource('serial');
      appendSerialLog('SYS', `Connected to ESP32 via Web Serial @ ${baudRate} baud`);

      if (!port.readable) {
        throw new Error('Serial port opened without a readable stream.');
      }

      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(
        textDecoder.writable as unknown as WritableStream<Uint8Array>
      );
      const reader = textDecoder.readable.getReader();
      serialReaderRef.current = reader;

      let lineBuf = '';
      while (!serialAbortRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        lineBuf += value;
        const lines = lineBuf.split(/\r?\n/);
        lineBuf = lines.pop() || '';
        const batch: BenchSample[] = [];

        lines.forEach((rawLine) => {
          const trimmed = rawLine.trim();
          if (!trimmed) return;
          appendSerialLog('RX', trimmed);
          if (trimmed.startsWith('t_ms')) return;
          const parts = trimmed.split(',');
          if (parts.length >= 5) {
            const tMs = parseFloat(parts[0]);
            const vVolts = parseFloat(parts[1]);
            const iVolts = parseFloat(parts[2]);
            const gasVolts = parseFloat(parts[3]);
            const distCm = parseFloat(parts[4]);
            if (
              Number.isFinite(tMs) &&
              Number.isFinite(vVolts) &&
              Number.isFinite(iVolts) &&
              Number.isFinite(gasVolts) &&
              Number.isFinite(distCm)
            ) {
              batch.push({ tMs, vVolts, iVolts, gasVolts, distCm });
            }
          }
        });

        if (batch.length > 0) {
          setRxFrameCount((c) => c + batch.length);
          setSamples((prev) => [...prev.slice(-(MAX_BUFFER - batch.length)), ...batch]);
        }
      }
      await readableStreamClosed.catch(() => {});
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to connect to ESP32 serial port.';
      if (!msg.toLowerCase().includes('no port selected')) {
        setSerialError(msg);
        appendSerialLog('SYS', `Serial error: ${msg}`);
      }
      setStreamSource('simulating');
    }
  };

  const handleDisconnectSerial = async () => {
    await stopSerialConnection(true);
    setStreamSource('paused');
  };

  const handleSendSerialCommand = async (cmdText: string) => {
    const clean = cmdText.trim();
    if (!clean) return;
    if (streamSource !== 'serial' || !serialPortRef.current?.writable) {
      appendSerialLog(
        'SYS',
        `TX queued locally ("${clean}") — connect an ESP32 via Web Serial to transmit over USB UART.`
      );
      setTxInput('');
      return;
    }

    try {
      const writer = serialPortRef.current.writable.getWriter();
      const encoded = new TextEncoder().encode(`${clean}\n`);
      await writer.write(encoded);
      writer.releaseLock();
      appendSerialLog('TX', clean);
      setTxInput('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to write to serial port.';
      setSerialError(msg);
    }
  };

  // Live DSP processing on captured buffer
  const dspAnalysis = useMemo(() => {
    const maxRange = activeChannel === 'ultrasonic' ? 100 : 3.3;
    const rawValues = samples.map((s) =>
      activeChannel === 'voltage'
        ? s.vVolts
        : activeChannel === 'current'
        ? s.iVolts
        : activeChannel === 'gas'
        ? s.gasVolts
        : s.distCm
    );

    if (rawValues.length === 0) {
      return {
        rawValues: [],
        processedValues: [],
        overloadFlags: [],
        sqnrDb: 0,
        stepSize: 0,
        latestVal: 0,
        overloadCount: 0,
        maxRange,
        tdmHex: 'AA 55 00 00 00 00',
      };
    }

    const levels = Math.pow(2, quantBits);
    const deltaPcm = maxRange / levels;
    const processedValues: number[] = [];
    const overloadFlags: boolean[] = [];

    if (dspMode === 'pcm') {
      rawValues.forEach((v) => {
        const idx = Math.min(levels - 1, Math.max(0, Math.floor(v / deltaPcm)));
        processedValues.push((idx + 0.5) * deltaPcm);
        overloadFlags.push(false);
      });
    } else if (dspMode === 'mulaw') {
      const mid = maxRange / 2;
      rawValues.forEach((v) => {
        const xNorm = Math.max(-1, Math.min(1, (v - mid) / mid));
        const y = muLawCompress(xNorm, 255);
        const qStep = 2 / levels;
        const qIdx = Math.min(levels - 1, Math.max(0, Math.floor((y + 1) / qStep)));
        const yQ = -1 + (qIdx + 0.5) * qStep;
        const xHat = muLawExpand(yQ, 255);
        processedValues.push(mid + xHat * mid);
        overloadFlags.push(false);
      });
    } else {
      const dmScaledStep = activeChannel === 'ultrasonic' ? dmStepV * 20 : dmStepV;
      let acc = rawValues[0];
      rawValues.forEach((v) => {
        const diff = v - acc;
        acc += diff >= 0 ? dmScaledStep : -dmScaledStep;
        acc = Math.max(0, Math.min(maxRange, acc));
        processedValues.push(acc);
        overloadFlags.push(Math.abs(v - acc) > dmScaledStep * 1.45);
      });
    }

    const meanVal = rawValues.reduce((a, b) => a + b, 0) / rawValues.length;
    const sigPow =
      rawValues.reduce((acc, v) => acc + Math.pow(v - meanVal, 2), 0) /
      rawValues.length;
    const errPow =
      rawValues.reduce((acc, v, i) => acc + Math.pow(v - processedValues[i], 2), 0) /
      rawValues.length;
    const sqnrDb = 10 * Math.log10(Math.max(sigPow, 1e-6) / Math.max(errPow, 1e-7));

    const latest = samples[samples.length - 1];
    const toByteHex = (val: number, scale: number) =>
      Math.min(255, Math.max(0, Math.round((val / scale) * 255)))
        .toString(16)
        .toUpperCase()
        .padStart(2, '0');

    const tdmHex = latest
      ? `AA 55 ${toByteHex(latest.vVolts, 3.3)} ${toByteHex(
          latest.iVolts,
          3.3
        )} ${toByteHex(latest.gasVolts, 3.3)} ${toByteHex(latest.distCm, 100)}`
      : 'AA 55 00 00 00 00';

    return {
      rawValues,
      processedValues,
      overloadFlags,
      sqnrDb,
      stepSize: dspMode === 'dm' ? (activeChannel === 'ultrasonic' ? dmStepV * 20 : dmStepV) : deltaPcm,
      latestVal: rawValues[rawValues.length - 1],
      overloadCount: overloadFlags.filter(Boolean).length,
      maxRange,
      tdmHex,
    };
  }, [samples, activeChannel, dspMode, quantBits, dmStepV]);

  // KiCad Anti-Aliasing RC Filter math
  const rcFilterMath = useMemo(() => {
    const rOhm = rcResKOhm * 1000;
    const cFarad = rcCapNf * 1e-9;
    const fcHz = 1 / (2 * Math.PI * rOhm * cFarad);
    const fNyquist = targetFsHz / 2;
    const ratio = fNyquist / fcHz;
    const attenDb = -10 * Math.log10(1 + ratio * ratio);
    const isSafe = fcHz <= fNyquist * 0.65;
    return { fcHz, fNyquist, attenDb, isSafe };
  }, [rcResKOhm, rcCapNf, targetFsHz]);

  const activeHardwareLab =
    HARDWARE_BENCH_LABS.find((l) => l.id === selectedHardware) || HARDWARE_BENCH_LABS[0];

  const companionScripts = useMemo(
    () => BENCH_SCRIPT_PACK.filter((s) => s.language === 'python' || s.language === 'matlab' || s.language === 'esp32'),
    []
  );
  const activeCompanionScript =
    companionScripts.find((s) => s.id === companionSnippetId) || companionScripts[0];

  const filteredScripts =
    scriptFilter === 'all'
      ? BENCH_SCRIPT_PACK
      : BENCH_SCRIPT_PACK.filter((s) => s.language === scriptFilter);

  const activeScript =
    filteredScripts.find((s) => s.id === selectedScriptId) ||
    filteredScripts[0] ||
    BENCH_SCRIPT_PACK[0];

  const handleExportCaptureCsv = () => {
    const header = 't_ms,v_volts,i_volts,gas_volts,dist_cm\n';
    const body = samples
      .map(
        (s) =>
          `${Math.round(s.tMs)},${s.vVolts.toFixed(4)},${s.iVolts.toFixed(
            4
          )},${s.gasVolts.toFixed(4)},${s.distCm.toFixed(2)}`
      )
      .join('\n');
    downloadTextFile('esp32_bench_capture.csv', header + body, 'text/csv;charset=utf-8');
  };

  const handleExportBomCsv = () => {
    const rows = ['Lab,Reference,Value,Purpose'];
    HARDWARE_BENCH_LABS.forEach((lab) => {
      lab.kicadComponents.forEach((c) => {
        rows.push(`"${lab.shortLabel}","${c.ref}","${c.value}","${c.purpose}"`);
      });
    });
    downloadTextFile('ece423_kicad_shield_bom.csv', rows.join('\n'), 'text/csv;charset=utf-8');
  };

  const handleCopyScript = async (scriptId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(scriptId);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Fallback ignored if clipboard denied
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Sub-tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Practical Hardware &amp; Software Bench
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Stream live ESP32 sensor telemetry over Web Serial, inspect real-time waveforms beside Python/MATLAB DSP code, and explore interactive wiring diagrams mapped to ECE 423 theory.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 shrink-0">
          {[
            { id: 'capture', label: 'Live Serial Monitor' },
            { id: 'hardware', label: `Interactive Wiring & KiCad (${HARDWARE_BENCH_LABS.length})` },
            { id: 'scripts', label: `Full Script Pack (${BENCH_SCRIPT_PACK.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as BenchSubTab)}
              className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                subTab === tab.id
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================================================================== */}
      {/* SUB-TAB 1: LIVE SERIAL MONITOR + WAVEFORM + PYTHON/MATLAB COMPANION */}
      {/* ================================================================== */}
      {subTab === 'capture' && (
        <div className="space-y-6">
          {/* Top Row: Oscilloscope & Channel Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Stage: Oscilloscope & Web Serial Controls */}
            <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Real-Time Sensor Oscilloscope &amp; Web Serial Capture
                  </h2>
                  <p className="text-xs text-slate-500">
                    Solid blue: incoming ESP32 sensor waveform · Stepped emerald/red:{' '}
                    {dspMode === 'pcm'
                      ? `${quantBits}-bit Uniform PCM`
                      : dspMode === 'mulaw'
                      ? `${quantBits}-bit μ-Law PCM`
                      : '1-Bit Delta Modulation'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold">
                  {streamSource === 'serial' ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>USB Serial Active · {baudRate} baud</span>
                    </span>
                  ) : streamSource === 'simulating' ? (
                    <span className="inline-flex items-center gap-1.5 text-sky-700">
                      <Cpu className="h-3.5 w-3.5" />
                      <span>Simulated ESP32 Feed</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <Pause className="h-3.5 w-3.5" />
                      <span>Stream Paused</span>
                    </span>
                  )}
                </div>
              </div>

              {serialError && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{serialError}</span>
                </div>
              )}

              {/* Oscilloscope SVG */}
              <svg
                viewBox="0 0 720 290"
                className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/70 cursor-crosshair"
                role="img"
                aria-label="Live sensor capture and digital quantization oscilloscope"
              >
                {[0.2, 0.4, 0.6, 0.8].map((frac) => (
                  <line
                    key={`gv-${frac}`}
                    x1={52 + frac * 640}
                    y1={18}
                    x2={52 + frac * 640}
                    y2={258}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                ))}
                {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
                  const y = 258 - frac * 228;
                  const val = frac * dspAnalysis.maxRange;
                  return (
                    <g key={`gh-${frac}`}>
                      <line x1={52} y1={y} x2={692} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                      <text
                        x={45}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-slate-500 font-mono text-[10px]"
                      >
                        {activeChannel === 'ultrasonic' ? `${val.toFixed(0)}cm` : `${val.toFixed(1)}V`}
                      </text>
                    </g>
                  );
                })}

                {dspAnalysis.rawValues.length > 1 && (
                  <path
                    d={dspAnalysis.rawValues
                      .map((val, idx) => {
                        const x = 52 + (idx / Math.max(1, dspAnalysis.rawValues.length - 1)) * 640;
                        const y = 258 - (val / dspAnalysis.maxRange) * 228;
                        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2.1"
                  />
                )}

                {dspAnalysis.processedValues.length > 1 &&
                  dspAnalysis.processedValues.map((val, idx) => {
                    if (idx >= dspAnalysis.processedValues.length - 1) return null;
                    const nextVal = dspAnalysis.processedValues[idx + 1];
                    const x1 = 52 + (idx / (dspAnalysis.processedValues.length - 1)) * 640;
                    const x2 = 52 + ((idx + 1) / (dspAnalysis.processedValues.length - 1)) * 640;
                    const y1 = 258 - (val / dspAnalysis.maxRange) * 228;
                    const y2 = 258 - (nextVal / dspAnalysis.maxRange) * 228;
                    const isOverload = dspAnalysis.overloadFlags[idx];
                    return (
                      <path
                        key={`st-${idx}`}
                        d={`M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`}
                        fill="none"
                        stroke={isOverload ? '#dc2626' : '#059669'}
                        strokeWidth="1.9"
                      />
                    );
                  })}

                <text x={372} y={280} textAnchor="middle" className="fill-slate-600 font-mono text-[11px]">
                  Rolling Capture Window ({samples.length} Samples · {rxFrameCount} Frames Received)
                </text>
              </svg>

              {/* TDM Frame Byte Decoder Strip */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-900">
                    4-Sensor TDM Frame (Sync + V + I + Gas + Dist)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Sync word <span className="font-mono">0xAA 0x55</span> followed by 8-bit quantized slots from all four sensors
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold tracking-wider text-sky-800 bg-white border border-slate-200 rounded px-2.5 py-1 tabular-nums">
                  {dspAnalysis.tdmHex}
                </span>
              </div>

              {/* Web Serial Connection Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                    <span className="font-medium">Baud:</span>
                    <select
                      value={baudRate}
                      disabled={streamSource === 'serial'}
                      onChange={(e) => setBaudRate(parseInt(e.target.value, 10))}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-2 font-mono text-xs text-slate-900 disabled:bg-slate-100 tabular-nums"
                    >
                      {BAUD_RATES.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={handleConnectSerial}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Usb className="h-3.5 w-3.5" />
                    <span>
                      {streamSource === 'serial' ? 'Switch Port' : 'Connect ESP32 (Web Serial)'}
                    </span>
                  </button>

                  {streamSource === 'serial' && (
                    <button
                      type="button"
                      onClick={handleDisconnectSerial}
                      className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 whitespace-nowrap shrink-0"
                    >
                      <Unplug className="h-3.5 w-3.5" />
                      <span>Disconnect</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      if (streamSource === 'serial') {
                        await stopSerialConnection(true);
                        setStreamSource('simulating');
                      } else {
                        setStreamSource((prev) => (prev === 'simulating' ? 'paused' : 'simulating'));
                      }
                    }}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    {streamSource === 'simulating' ? (
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

                  <button
                    type="button"
                    onClick={() => setSamples(createInitialSimSamples(activeChannel))}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportCaptureCsv}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 hover:border-sky-400 hover:text-sky-700 whitespace-nowrap shrink-0"
                >
                  <Download className="h-3.5 w-3.5 text-sky-600" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Right Control Deck */}
            <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-semibold text-slate-950">
                  Channel &amp; DSP Controls
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {webSerialSupported
                    ? 'Web Serial ready (Chrome / Edge desktop)'
                    : 'Use Chrome/Edge for USB Web Serial, or built-in sim'}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-slate-700">
                  Active Hardware Sensor Channel
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'voltage', label: 'Voltage (GPIO34)' },
                    { id: 'current', label: 'Current (GPIO35)' },
                    { id: 'gas', label: 'Gas MQ (GPIO32)' },
                    { id: 'ultrasonic', label: 'Ultrasonic (HC-SR04)' },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setActiveChannel(ch.id as ActiveChannel)}
                      className={`cursor-pointer rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                        activeChannel === ch.id
                          ? 'border-sky-600 bg-sky-50 text-sky-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-slate-700">
                  ECE 423 Coding Stage
                </span>
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                  {[
                    { id: 'pcm', label: 'PCM' },
                    { id: 'mulaw', label: 'μ-Law' },
                    { id: 'dm', label: 'Delta Mod' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDspMode(m.id as DspMode)}
                      className={`cursor-pointer rounded-md py-1.5 text-xs font-semibold transition-colors ${
                        dspMode === m.id ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {dspMode === 'dm' ? (
                <label className="block space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>DM Step Size (Δ)</span>
                    <span className="font-mono tabular-nums text-slate-950">
                      {dmStepV.toFixed(2)} V
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.04}
                    max={0.6}
                    step={0.02}
                    value={dmStepV}
                    onChange={(e) => setDmStepV(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </label>
              ) : (
                <label className="block space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>Quantizer Resolution (n)</span>
                    <span className="font-mono tabular-nums text-slate-950">
                      {quantBits} bits ({Math.pow(2, quantBits)} levels)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={8}
                    step={1}
                    value={quantBits}
                    onChange={(e) => setQuantBits(parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                </label>
              )}

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Latest Reading</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-950">
                    {activeChannel === 'ultrasonic'
                      ? `${dspAnalysis.latestVal.toFixed(1)} cm`
                      : `${dspAnalysis.latestVal.toFixed(3)} V`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Effective Step (Δ)</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-950">
                    {activeChannel === 'ultrasonic'
                      ? `${dspAnalysis.stepSize.toFixed(2)} cm`
                      : `${dspAnalysis.stepSize.toFixed(4)} V`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Measured Signal-to-Noise</span>
                  <span className="font-mono font-semibold tabular-nums text-sky-700">
                    {dspAnalysis.sqnrDb.toFixed(2)} dB
                  </span>
                </div>
                {dspMode === 'dm' && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Slope Overload Samples</span>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        dspAnalysis.overloadCount > 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {dspAnalysis.overloadCount} (
                      {dspAnalysis.overloadCount > 0 ? 'Overloaded' : 'Tracking'})
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHardware(activeChannel);
                    setSubTab('hardware');
                  }}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700 whitespace-nowrap shrink-0"
                >
                  <Sliders className="h-3.5 w-3.5 text-sky-600" />
                  <span>Inspect {activeChannel} Wiring</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Split: Live Serial Monitor Console + Companion Python/MATLAB Code Snippets */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Live Serial Monitor Terminal */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-sky-600" />
                    <h3 className="text-sm font-semibold text-slate-950">
                      Live Serial Monitor (UART Console)
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMonitorPaused((p) => !p)}
                      className="cursor-pointer rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      {monitorPaused ? 'Resume Log' : 'Pause Log'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoScrollMonitor((a) => !a)}
                      className={`cursor-pointer rounded border px-2 py-1 text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                        autoScrollMonitor
                          ? 'border-sky-200 bg-sky-50 text-sky-800'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      Autoscroll
                    </button>
                    <button
                      type="button"
                      onClick={() => setSerialLogs([])}
                      aria-label="Clear serial console"
                      className="cursor-pointer rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Scrolling Console Viewport */}
                <div
                  ref={monitorScrollRef}
                  className="h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-200 space-y-1"
                >
                  {serialLogs.length === 0 ? (
                    <div className="text-slate-500">
                      Console cleared. Waiting for incoming ESP32 frames...
                    </div>
                  ) : (
                    serialLogs.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-2 tabular-nums">
                        <span className="text-slate-500 shrink-0">{entry.ts}</span>
                        <span
                          className={`shrink-0 font-semibold ${
                            entry.direction === 'TX'
                              ? 'text-amber-400'
                              : entry.direction === 'SYS'
                              ? 'text-sky-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {entry.direction}
                        </span>
                        <span className="break-all text-slate-100">{entry.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* TX Command Input + Quick Commands */}
              <div className="space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSendSerialCommand(txInput);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={txInput}
                    onChange={(e) => setTxInput(e.target.value)}
                    placeholder="Send UART command to ESP32 (e.g. RATE=200)"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <Send className="h-3 w-3" />
                    <span>Send</span>
                  </button>
                </form>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <span>Quick TX:</span>
                  {['PING', 'RATE=1000', 'RATE=70', 'STATUS'].map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => void handleSendSerialCommand(cmd)}
                      className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-700 hover:border-sky-400 hover:text-sky-700"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Companion Python / MATLAB Code Inspector Alongside Waveform */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-sky-600" />
                    <h3 className="text-sm font-semibold text-slate-950">
                      Side-by-Side Python / MATLAB / ESP32 Code Inspector
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyScript(activeCompanionScript.id, activeCompanionScript.code)
                      }
                      className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      {copiedId === activeCompanionScript.id ? (
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
                      onClick={() =>
                        downloadTextFile(
                          activeCompanionScript.filename,
                          activeCompanionScript.code
                        )
                      }
                      className="cursor-pointer inline-flex items-center gap-1 rounded bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                {/* Snippet Switcher Tabs */}
                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                  {companionScripts.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setCompanionSnippetId(sc.id)}
                      className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        activeCompanionScript.id === sc.id
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {sc.filename.replace('ece423_', '')}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span>{activeCompanionScript.environment}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedScriptId(activeCompanionScript.id);
                      setSubTab('scripts');
                    }}
                    className="cursor-pointer inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-900"
                  >
                    <span>Open Full View</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <pre className="h-56 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3.5 font-mono text-[11px] leading-relaxed text-slate-100">
                  <code>{activeCompanionScript.code}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 2: INTERACTIVE WIRING DIAGRAMS & KICAD FRONT-END           */}
      {/* ================================================================== */}
      {subTab === 'hardware' && (
        <div className="space-y-6">
          {/* Sensor / KiCad Tab Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              {HARDWARE_BENCH_LABS.map((lab) => (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => setSelectedHardware(lab.id)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    selectedHardware === lab.id
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lab.shortLabel}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportBomCsv}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 hover:border-sky-400 hover:text-sky-700 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-sky-600" />
              <span>Download Full KiCad BOM (.csv)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Zone: Interactive Sensor Schematic + Conditioning + Procedure */}
            <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 space-y-6">
              <div className="space-y-1.5 border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{MODULE_META[activeHardwareLab.module].title}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-sky-700 font-medium">
                    {activeHardwareLab.hardwareTarget}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-950">
                  {activeHardwareLab.title}
                </h2>
                <p className="text-sm leading-relaxed text-slate-600">
                  {activeHardwareLab.objective}
                </p>
              </div>

              {/* Sensor-Specific Interactive Wiring Diagram & Lecture Theory Bridge */}
              <InteractiveWiringDiagram
                lab={activeHardwareLab}
                rcResKOhm={rcResKOhm}
                rcCapNf={rcCapNf}
                fcHz={rcFilterMath.fcHz}
                onOpenLab={onOpenLab}
                onOpenCalculator={onOpenCalculator}
                onOpenTheory={onOpenTheory}
              />

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1.5 text-xs">
                <h3 className="font-semibold text-slate-950">Analog Conditioning Rule</h3>
                <p className="leading-relaxed text-slate-700">
                  {activeHardwareLab.signalConditioning}
                </p>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-slate-950">
                  Step-by-Step Bench Procedure
                </h3>
                <ol className="space-y-2 text-sm text-slate-700">
                  {activeHardwareLab.benchProcedure.map((step, idx) => (
                    <li key={step} className="flex items-start gap-2.5">
                      <span className="font-mono text-xs font-semibold text-sky-700 mt-0.5 shrink-0 tabular-nums">
                        {idx + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Hardware Safety Check:</strong> {activeHardwareLab.safetyWarning}
                </div>
              </div>
            </div>

            {/* Right Zone: KiCad RC Filter Sizer + BOM Table */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-semibold text-slate-950">
                    KiCad Anti-Aliasing RC Filter Sizer
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Design fc = 1 / (2π·R·C) below Nyquist frequency fs / 2
                  </p>
                </div>

                <div className="space-y-3.5">
                  <label className="block space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>Filter Resistor (R)</span>
                      <span className="font-mono tabular-nums text-slate-950">
                        {rcResKOhm.toFixed(1)} kΩ
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={22}
                      step={0.5}
                      value={rcResKOhm}
                      onChange={(e) => setRcResKOhm(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>Filter Capacitor (C)</span>
                      <span className="font-mono tabular-nums text-slate-950">{rcCapNf} nF</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={470}
                      step={10}
                      value={rcCapNf}
                      onChange={(e) => setRcCapNf(parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                  </label>

                  <label className="block space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>ESP32 Sampling Rate (fs)</span>
                      <span className="font-mono tabular-nums text-slate-950">
                        {targetFsHz} Hz
                      </span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={5000}
                      step={100}
                      value={targetFsHz}
                      onChange={(e) => setTargetFsHz(parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                  </label>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">−3 dB Cutoff (fc)</span>
                    <span className="font-mono font-semibold tabular-nums text-sky-700">
                      {rcFilterMath.fcHz.toFixed(1)} Hz
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Nyquist Boundary (fs / 2)</span>
                    <span className="font-mono font-semibold tabular-nums text-slate-950">
                      {rcFilterMath.fNyquist.toFixed(0)} Hz
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Attenuation at fs / 2</span>
                    <span className="font-mono font-semibold tabular-nums text-slate-950">
                      {rcFilterMath.attenDb.toFixed(2)} dB
                    </span>
                  </div>
                  <div className="pt-1 border-t border-slate-200 font-medium">
                    {rcFilterMath.isSafe ? (
                      <span className="text-emerald-700">
                        Nominal Guard Band: fc cleanly below fs/2
                      </span>
                    ) : (
                      <span className="text-amber-800">
                        Warning: Lower fc or raise fs so fc ≤ 0.65·(fs/2)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-950">
                  Recommended KiCad Parts ({activeHardwareLab.shortLabel})
                </h3>
                <div className="divide-y divide-slate-100 text-xs">
                  {activeHardwareLab.kicadComponents.map((part) => (
                    <div key={part.ref} className="py-2.5 space-y-0.5">
                      <div className="flex items-center justify-between font-mono font-semibold text-slate-900">
                        <span>{part.ref}</span>
                        <span className="text-sky-700">{part.value}</span>
                      </div>
                      <p className="text-slate-600">{part.purpose}</p>
                    </div>
                  ))}
                </div>

                {activeHardwareLab.recommendedLab && (
                  <button
                    type="button"
                    onClick={() => onOpenLab(activeHardwareLab.recommendedLab!)}
                    className="cursor-pointer w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700"
                  >
                    <span>Verify Theory in Signal Lab</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 3: FULL PYTHON (SPYDER), MATLAB & ESP32 SCRIPT PACK        */}
      {/* ================================================================== */}
      {subTab === 'scripts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-4">
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              {[
                { id: 'all', label: `All (${BENCH_SCRIPT_PACK.length})` },
                { id: 'esp32', label: 'ESP32' },
                { id: 'python', label: 'Python' },
                { id: 'matlab', label: 'MATLAB' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setScriptFilter(f.id as 'all' | ScriptLanguage)}
                  className={`cursor-pointer flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    scriptFilter === f.id
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-200">
              {filteredScripts.map((sc) => {
                const isSelected = activeScript.id === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setSelectedScriptId(sc.id)}
                    className={`cursor-pointer w-full p-4 text-left space-y-1 transition-colors ${
                      isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                      <span className="font-semibold text-sky-700 uppercase">
                        {sc.language === 'esp32'
                          ? 'ESP32 .INO'
                          : sc.language === 'python'
                          ? 'SPYDER .PY'
                          : 'MATLAB .M'}
                      </span>
                      <span className="truncate">{sc.filename}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-950">{sc.title}</div>
                    <div className="text-xs text-slate-600 line-clamp-2">{sc.summary}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-sky-700">
                    {activeScript.filename}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeScript.environment}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-950">{activeScript.title}</h2>
                <p className="text-sm text-slate-600">{activeScript.summary}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyScript(activeScript.id, activeScript.code)}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
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
                  onClick={() => downloadTextFile(activeScript.filename, activeScript.code)}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download {activeScript.filename}</span>
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1.5 text-xs">
              <div className="font-semibold text-slate-900">Quick Setup &amp; Execution</div>
              <ul className="space-y-1 text-slate-700">
                {activeScript.howToRun.map((line, i) => (
                  <li key={line} className="flex items-start gap-2">
                    <span className="font-mono font-semibold text-sky-700 shrink-0 tabular-nums">
                      {i + 1}.
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <pre className="max-h-[520px] overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
              <code>{activeScript.code}</code>
            </pre>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
              <span className="text-slate-500">
                Tip: Export CSV from Live Serial Monitor to feed real ESP32 traces straight into Spyder or MATLAB.
              </span>
              <button
                type="button"
                onClick={() => onOpenCalculator('pcm_snr')}
                className="cursor-pointer inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-900"
              >
                <span>Compare Against Exact Formula Solver</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
