import React, { useMemo, useState } from 'react';
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

export type OpAmpTopology = 'P' | 'PI' | 'PD' | 'PID_PARALLEL' | 'PID_SERIES';

interface TopologyMeta {
  id: OpAmpTopology;
  label: string;
  shortLabel: string;
  configDesc: string;
  formula: string;
}

const TOPOLOGIES: TopologyMeta[] = [
  {
    id: 'P',
    label: 'P · Inverting Amplifier',
    shortLabel: 'P (Inverting)',
    configDesc: 'Single inverting op-amp stage with input resistor Rin and feedback resistor Rf.',
    formula: 'C(s) = −(Rf / Rin)',
  },
  {
    id: 'PI',
    label: 'PI · Resistor + Miller Integrator',
    shortLabel: 'PI (Series Rf+Cf)',
    configDesc: 'Inverting op-amp with series Rf + Cf feedback creating proportional + integral action.',
    formula: 'C(s) = −(Rf / Rin) · (1 + 1 / (Rf·Cf·s))',
  },
  {
    id: 'PD',
    label: 'PD · Band-Limited Differentiator',
    shortLabel: 'PD (Practical)',
    configDesc: 'Parallel Rin || (Cd + Rd) input network into Rf feedback; Rd caps HF sensor noise.',
    formula: 'C(s) = −[ Rf/Rin + (Rf·Cd·s)/(1 + Rd·Cd·s) ]',
  },
  {
    id: 'PID_PARALLEL',
    label: 'PID · 4-Op-Amp Parallel Summer',
    shortLabel: 'PID (4-OpAmp)',
    configDesc: 'Non-interacting P, Miller I, and Practical D stages summed by an inverting summer.',
    formula: 'C(s) = +(Kp + Ki/s + Kd·s / (1 + Rd·Cd·s))',
  },
  {
    id: 'PID_SERIES',
    label: 'PID · Single-Op-Amp Interacting',
    shortLabel: 'PID (1-OpAmp)',
    configDesc: 'Combined (Rin || (Cd + Rd)) input impedance with series (Rf + Cf) feedback network.',
    formula: 'C(s) = −[(Rf·Cf·s + 1)(Rin·Cd·s + 1)] / [Rin·Cf·s·(Rd·Cd·s + 1)]',
  },
];

interface SimPoint {
  t: number;
  vOut: number;
  yPlant: number;
  vInteg: number;
  vDiff: number;
  setpoint: number;
}

export const OpAmpPidSimSection: React.FC = () => {
  const [topology, setTopology] = useState<OpAmpTopology>('PID_PARALLEL');
  const [rinK, setRinK] = useState<number>(10); // kΩ
  const [rfK, setRfK] = useState<number>(28); // kΩ
  const [cfUf, setCfUf] = useState<number>(47); // µF
  const [cdUf, setCdUf] = useState<number>(15); // µF
  const [rdK, setRdK] = useState<number>(2.0); // kΩ
  const [vRail, setVRail] = useState<number>(12); // ±12V or ±5V or ±3.3V
  const [zenerClamp, setZenerClamp] = useState<boolean>(true);
  const [testMode, setTestMode] = useState<'closed_loop' | 'open_loop'>('closed_loop');

  // Derived analog gains in SI units (R in Ohms, C in Farads)
  const gains = useMemo(() => {
    const Rin = rinK * 1e3;
    const Rf = rfK * 1e3;
    const Cf = cfUf * 1e-6;
    const Cd = cdUf * 1e-6;
    const Rd = rdK * 1e3;

    const kpBase = Rf / Rin;
    const ti = Rf * Cf; // seconds
    const kiBase = 1 / (Rin * Cf);
    const kdBase = Rf * Cd;
    const tauD = Rd * Cd;
    const hfGainCap = Rf / Math.max(100, Rd);

    if (topology === 'P') {
      return { kp: kpBase, ki: 0, kd: 0, ti: Infinity, td: 0, tauD, hfGainCap, inverting: true };
    }
    if (topology === 'PI') {
      return { kp: kpBase, ki: kiBase, kd: 0, ti, td: 0, tauD, hfGainCap, inverting: true };
    }
    if (topology === 'PD') {
      return {
        kp: kpBase,
        ki: 0,
        kd: kdBase,
        ti: Infinity,
        td: kdBase / kpBase,
        tauD,
        hfGainCap,
        inverting: true,
      };
    }
    if (topology === 'PID_PARALLEL') {
      return {
        kp: kpBase,
        ki: kiBase,
        kd: kdBase,
        ti,
        td: kdBase / kpBase,
        tauD,
        hfGainCap,
        inverting: false, // 2nd inverting summer restores positive overall polarity
      };
    }
    // Single-op-amp series interacting PID:
    // -(Rf/Rin + Cd/Cf) - 1/(Rin*Cf*s) - Rf*Cd*s / (1 + Rd*Cd*s)
    const kpSeries = Rf / Rin + Cd / Cf;
    return {
      kp: kpSeries,
      ki: kiBase,
      kd: kdBase,
      ti: kpSeries / kiBase,
      td: kdBase / kpSeries,
      tauD,
      hfGainCap,
      inverting: true,
    };
  }, [topology, rinK, rfK, cfUf, cdUf, rdK]);

  // Simulate analog op-amp circuit dynamics + optional 2nd-order plant
  const simData = useMemo<SimPoint[]>(() => {
    const dt = 0.015;
    const tEnd = 8.0;
    const steps = Math.round(tEnd / dt);
    const out: SimPoint[] = [];

    // Plant Gp(s) = 1 / ((0.8s + 1)(0.4s + 1)) => 0.32 y'' + 1.2 y' + y = u
    const a2 = 0.32;
    const a1 = 1.2;
    let y = 0;
    let yDot = 0;

    // Analog op-amp internal capacitor states
    let vCf = 0; // Integrator capacitor state (stores Ki * int e dt)
    let xDiff = 0; // Band-limited differentiator filter state: dx/dt = (e - x)/tauD

    for (let i = 0; i <= steps; i++) {
      const t = i * dt;
      const setpoint = 1.0; // 1.0 V step
      const err = testMode === 'closed_loop' ? setpoint - y : setpoint;

      // Practical differentiator output: Kd * (e - xDiff) / tauD
      const tauEff = Math.max(0.02, gains.tauD);
      const vD = gains.kd > 0 ? (gains.kd * (err - xDiff)) / tauEff : 0;
      const vP = gains.kp * err;
      const vI = gains.ki > 0 ? vCf : 0;

      // In inverting single-stage topologies, inverting amplifier flips polarity internally;
      // in closed-loop we show controller magnitude drive or true op-amp output voltage.
      const sign = testMode === 'open_loop' && gains.inverting ? -1 : 1;
      const vRaw = sign * (vP + vI + vD);
      const vOut = Math.max(-vRail, Math.min(vRail, vRaw));

      out.push({
        t: Number(t.toFixed(2)),
        vOut: Number(vOut.toFixed(3)),
        yPlant: Number(y.toFixed(3)),
        vInteg: Number((sign * vI).toFixed(3)),
        vDiff: Number((sign * vD).toFixed(3)),
        setpoint,
      });

      // Update differentiator capacitor state
      xDiff += ((err - xDiff) / tauEff) * dt;

      // Update integrator capacitor voltage with optional Zener anti-windup clamp
      if (gains.ki > 0) {
        const satPos = Math.abs(vRaw) >= vRail && vRaw > 0;
        const satNeg = Math.abs(vRaw) >= vRail && vRaw < 0;
        const pushesSat = (satPos && err > 0) || (satNeg && err < 0);
        if (!zenerClamp || !pushesSat) {
          vCf += gains.ki * err * dt;
        }
        if (zenerClamp) {
          vCf = Math.max(-vRail * 0.9, Math.min(vRail * 0.9, vCf));
        }
      }

      // Plant integration (when in closed-loop mode)
      if (testMode === 'closed_loop') {
        const uDrive = vOut;
        const ydd = (uDrive - a1 * yDot - y) / a2;
        yDot += ydd * dt;
        y += yDot * dt;
      }
    }

    return out;
  }, [gains, vRail, zenerClamp, testMode]);

  const activeMeta = TOPOLOGIES.find((t) => t.id === topology) || TOPOLOGIES[0];
  const hasI = topology === 'PI' || topology === 'PID_PARALLEL' || topology === 'PID_SERIES';
  const hasD = topology === 'PD' || topology === 'PID_PARALLEL' || topology === 'PID_SERIES';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls: Topology & Passive Components */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-950">
              Op-Amp Controller Topology
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Switch between P, PI, PD, and inverting-summer PID realizations.
            </p>
          </div>

          {/* Topology Buttons */}
          <div className="grid grid-cols-1 gap-1.5">
            {TOPOLOGIES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTopology(t.id)}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-left transition-colors ${
                  topology === t.id
                    ? 'border-sky-600 bg-sky-50/70 text-slate-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold">{t.label}</div>
                <div className="text-[11px] font-mono text-sky-700 mt-0.5">{t.formula}</div>
              </button>
            ))}
          </div>

          {/* Passive Component Sliders */}
          <div className="border-t border-slate-100 pt-4 space-y-3.5 text-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Resistor &amp; Capacitor Sizing
            </div>

            {/* Rin */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-800">Input Resistor Rin</span>
                <span className="font-mono font-semibold text-slate-950 tabular-nums">
                  {rinK.toFixed(1)} kΩ
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={50}
                step={0.5}
                value={rinK}
                onChange={(e) => setRinK(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            {/* Rf */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-800">Feedback Resistor Rf</span>
                <span className="font-mono font-semibold text-sky-700 tabular-nums">
                  {rfK.toFixed(1)} kΩ
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={120}
                step={1}
                value={rfK}
                onChange={(e) => setRfK(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            {/* Cf (for I action) */}
            {hasI && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-800">Integrator Capacitor Cf</span>
                  <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                    {cfUf.toFixed(0)} µF
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={220}
                  step={1}
                  value={cfUf}
                  onChange={(e) => setCfUf(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            )}

            {/* Cd & Rd (for D action) */}
            {hasD && (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-800">Differentiator Cap Cd</span>
                    <span className="font-mono font-semibold text-amber-700 tabular-nums">
                      {cdUf.toFixed(0)} µF
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={68}
                    step={1}
                    value={cdUf}
                    onChange={(e) => setCdUf(parseFloat(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-800">Noise-Limit Resistor Rd</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {rdK.toFixed(1)} kΩ (Cap {gains.hfGainCap.toFixed(1)}×)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={15}
                    step={0.5}
                    value={rdK}
                    onChange={(e) => setRdK(parseFloat(e.target.value))}
                    className="w-full accent-slate-700 cursor-pointer"
                  />
                </div>
              </>
            )}
          </div>

          {/* Rail & Test Mode */}
          <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-800">Op-Amp Supply Rails</span>
              <select
                value={vRail}
                onChange={(e) => setVRail(parseFloat(e.target.value))}
                className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs"
              >
                <option value={12}>±12.0 V (TL084/LM324)</option>
                <option value={5}>±5.0 V</option>
                <option value={3.3}>±3.3 V (ESP32 Rail)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTestMode('closed_loop')}
                className={`cursor-pointer rounded py-1 text-[11px] font-semibold ${
                  testMode === 'closed_loop'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Closed-Loop Plant
              </button>
              <button
                type="button"
                onClick={() => setTestMode('open_loop')}
                className={`cursor-pointer rounded py-1 text-[11px] font-semibold ${
                  testMode === 'open_loop'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Open-Loop Op-Amp Step
              </button>
            </div>

            {hasI && (
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={zenerClamp}
                  onChange={(e) => setZenerClamp(e.target.checked)}
                  className="rounded accent-sky-600"
                />
                <span>Enable Zener anti-windup clamp across Cf</span>
              </label>
            )}
          </div>
        </div>

        {/* Right Column: Live Circuit Schematic + Calculated Gains + Recharts Response */}
        <div className="lg:col-span-8 space-y-5">
          {/* Calculated PID Gains Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] text-slate-500">Proportional Gain Kp</div>
              <div className="mt-1 font-mono text-lg font-bold tabular-nums text-sky-700">
                {gains.kp.toFixed(2)}
              </div>
              <div className="text-[10px] font-mono text-slate-500">Rf / Rin</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] text-slate-500">Integral Gain Ki</div>
              <div className="mt-1 font-mono text-lg font-bold tabular-nums text-emerald-700">
                {gains.ki.toFixed(2)} s⁻¹
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {Number.isFinite(gains.ti) ? `Ti = ${gains.ti.toFixed(2)} s` : 'No Integrator'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] text-slate-500">Derivative Gain Kd</div>
              <div className="mt-1 font-mono text-lg font-bold tabular-nums text-amber-700">
                {gains.kd.toFixed(2)} s
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {gains.kd > 0 ? `Td = ${gains.td.toFixed(2)} s` : 'No Differentiator'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] text-slate-500">Polarity &amp; HF Cap</div>
              <div className="mt-1 font-mono text-sm font-bold tabular-nums text-slate-950">
                {gains.inverting ? 'Inverting (−)' : 'Non-Inv (+)'}
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {hasD ? `Max D Gain: ${gains.hfGainCap.toFixed(1)}×` : `Rails: ±${vRail} V`}
              </div>
            </div>
          </div>

          {/* Interactive SVG Op-Amp Circuit Diagram */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-950">{activeMeta.label}</h3>
                <p className="text-xs text-slate-500">{activeMeta.configDesc}</p>
              </div>
            </div>

            <svg
              viewBox="0 0 740 230"
              className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/60"
              role="img"
              aria-label={`Analog op-amp schematic for ${activeMeta.label}`}
            >
              {topology !== 'PID_PARALLEL' ? (
                <>
                  {/* Single Op-Amp Topology (P, PI, PD, PID_SERIES) */}
                  {/* Input node */}
                  <text x={36} y={134} className="fill-slate-800 font-mono text-[11px] font-bold">
                    e(t)
                  </text>
                  <line x1={62} y1={130} x2={125} y2={130} stroke="#0f172a" strokeWidth="1.8" />

                  {/* Input impedance block */}
                  <rect
                    x={125}
                    y={104}
                    width={145}
                    height={52}
                    rx={6}
                    fill="#ffffff"
                    stroke={hasD ? '#d97706' : '#0284c7'}
                    strokeWidth="1.6"
                  />
                  <text
                    x={197}
                    y={125}
                    textAnchor="middle"
                    className="fill-slate-900 font-mono text-[11px] font-bold"
                  >
                    Rin = {rinK.toFixed(1)} kΩ
                  </text>
                  <text
                    x={197}
                    y={144}
                    textAnchor="middle"
                    className="fill-amber-700 font-mono text-[10px]"
                  >
                    {hasD ? `|| Cd=${cdUf}µF + Rd=${rdK}kΩ` : 'Pure Resistive Input'}
                  </text>

                  {/* Wire to inverting node */}
                  <line x1={270} y1={130} x2={345} y2={130} stroke="#0f172a" strokeWidth="1.8" />
                  <circle cx={312} cy={130} r={3.5} fill="#0284c7" />

                  {/* Feedback Loop over Op-Amp */}
                  <line x1={312} y1={130} x2={312} y2={48} stroke="#059669" strokeWidth="1.8" />
                  <line x1={312} y1={48} x2={355} y2={48} stroke="#059669" strokeWidth="1.8" />
                  <rect
                    x={355}
                    y={24}
                    width={185}
                    height={48}
                    rx={6}
                    fill="#f0fdf4"
                    stroke="#059669"
                    strokeWidth="1.6"
                  />
                  <text
                    x={447}
                    y={44}
                    textAnchor="middle"
                    className="fill-emerald-950 font-mono text-[11px] font-bold"
                  >
                    Rf = {rfK.toFixed(1)} kΩ
                  </text>
                  <text
                    x={447}
                    y={61}
                    textAnchor="middle"
                    className="fill-emerald-700 font-mono text-[10px]"
                  >
                    {hasI
                      ? `+ Series Cf = ${cfUf} µF ${zenerClamp ? '(Zener)' : ''}`
                      : 'Resistive Feedback'}
                  </text>
                  <line x1={540} y1={48} x2={585} y2={48} stroke="#059669" strokeWidth="1.8" />
                  <line x1={585} y1={48} x2={585} y2={146} stroke="#059669" strokeWidth="1.8" />
                  <circle cx={585} cy={146} r={3.5} fill="#059669" />

                  {/* Op-Amp Triangle */}
                  <polygon
                    points="345,104 345,188 445,146"
                    fill="#ffffff"
                    stroke="#0f172a"
                    strokeWidth="2.2"
                  />
                  <text x={356} y={134} className="fill-slate-900 font-mono text-sm font-bold">
                    −
                  </text>
                  <text x={356} y={170} className="fill-slate-900 font-mono text-sm font-bold">
                    +
                  </text>
                  <text x={392} y={150} textAnchor="middle" className="fill-slate-600 font-mono text-[10px]">
                    ±{vRail}V
                  </text>

                  {/* Non-inverting input to GND */}
                  <line x1={312} y1={165} x2={345} y2={165} stroke="#0f172a" strokeWidth="1.8" />
                  <line x1={312} y1={165} x2={312} y2={198} stroke="#0f172a" strokeWidth="1.8" />
                  <line x1={298} y1={198} x2={326} y2={198} stroke="#0f172a" strokeWidth="2" />
                  <line x1={303} y1={204} x2={321} y2={204} stroke="#0f172a" strokeWidth="1.6" />
                  <line x1={308} y1={210} x2={316} y2={210} stroke="#0f172a" strokeWidth="1.2" />

                  {/* Output wire */}
                  <line x1={445} y1={146} x2={665} y2={146} stroke="#0284c7" strokeWidth="2.2" />
                  <text x={672} y={150} className="fill-sky-800 font-mono text-xs font-bold">
                    Vout(t)
                  </text>
                </>
              ) : (
                <>
                  {/* 4-Op-Amp Parallel Non-Interacting PID + Inverting Summer */}
                  <text x={24} y={118} className="fill-slate-800 font-mono text-[11px] font-bold">
                    e(t)
                  </text>
                  <line x1={52} y1={115} x2={92} y2={115} stroke="#0f172a" strokeWidth="1.8" />
                  <line x1={92} y1={44} x2={92} y2={186} stroke="#0f172a" strokeWidth="1.8" />

                  {/* P Branch */}
                  <line x1={92} y1={44} x2={135} y2={44} stroke="#0284c7" strokeWidth="1.6" />
                  <rect x={135} y={24} width={225} height={40} rx={6} fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
                  <text x={247} y={48} textAnchor="middle" className="fill-sky-900 font-mono text-[11px] font-bold">
                    U1A (P): −Rf/Rin = −{gains.kp.toFixed(2)}
                  </text>
                  <line x1={360} y1={44} x2={425} y2={44} stroke="#0284c7" strokeWidth="1.6" />

                  {/* I Branch */}
                  <line x1={92} y1={115} x2={135} y2={115} stroke="#059669" strokeWidth="1.6" />
                  <rect x={135} y={95} width={225} height={40} rx={6} fill="#f0fdf4" stroke="#059669" strokeWidth="1.5" />
                  <text x={247} y={119} textAnchor="middle" className="fill-emerald-900 font-mono text-[11px] font-bold">
                    U1B (I): −1/(Rin·Cf·s) · Ki={gains.ki.toFixed(2)}
                  </text>
                  <line x1={360} y1={115} x2={425} y2={115} stroke="#059669" strokeWidth="1.6" />

                  {/* D Branch */}
                  <line x1={92} y1={186} x2={135} y2={186} stroke="#d97706" strokeWidth="1.6" />
                  <rect x={135} y={166} width={225} height={40} rx={6} fill="#fffbeb" stroke="#d97706" strokeWidth="1.5" />
                  <text x={247} y={190} textAnchor="middle" className="fill-amber-900 font-mono text-[11px] font-bold">
                    U1C (D): −Rf·Cd·s/(1+Rd·Cd·s) · Kd={gains.kd.toFixed(2)}
                  </text>
                  <line x1={360} y1={186} x2={425} y2={186} stroke="#d97706" strokeWidth="1.6" />

                  {/* Summing Bus */}
                  <line x1={425} y1={44} x2={425} y2={186} stroke="#0f172a" strokeWidth="2" />
                  <line x1={425} y1={115} x2={470} y2={115} stroke="#0f172a" strokeWidth="2" />

                  {/* U1D Inverting Summer */}
                  <polygon
                    points="470,74 470,162 566,118"
                    fill="#ffffff"
                    stroke="#0f172a"
                    strokeWidth="2.2"
                  />
                  <text x={480} y={108} className="fill-slate-900 font-mono text-sm font-bold">
                    −
                  </text>
                  <text x={480} y={144} className="fill-slate-900 font-mono text-sm font-bold">
                    +
                  </text>
                  <text x={513} y={122} textAnchor="middle" className="fill-slate-700 font-mono text-[10px]">
                    U1D Σ
                  </text>
                  <line x1={566} y1={118} x2={650} y2={118} stroke="#0284c7" strokeWidth="2.2" />
                  <text x={658} y={122} className="fill-sky-800 font-mono text-xs font-bold">
                    +Vout(t)
                  </text>
                </>
              )}
            </svg>
          </div>

          {/* Recharts Circuit Transient Response */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-950">
                  {testMode === 'closed_loop'
                    ? 'Closed-Loop Analog PID + Plant Transient Response'
                    : 'Open-Loop Op-Amp Step Response Vout(t) to 1.0 V Input'}
                </h3>
                <p className="text-xs text-slate-500">
                  {testMode === 'closed_loop'
                    ? `Blue: Plant y(t) · Amber: Op-Amp Output Vout(t) clipped at ±${vRail}V`
                    : `Amber: Op-Amp Vout(t) · Green: Integrator Stage · Supply Rails ±${vRail}V`}
                </p>
              </div>
            </div>

            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={simData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${v}s`}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${v}V`}
                    width={46}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label) => `t = ${label} s`}
                    formatter={(value, name) => [
                      `${typeof value === 'number' ? value.toFixed(3) : String(value ?? '')} V`,
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <ReferenceLine y={vRail} stroke="#dc2626" strokeDasharray="4 4" />
                  <ReferenceLine y={-vRail} stroke="#dc2626" strokeDasharray="4 4" />
                  {testMode === 'closed_loop' && (
                    <ReferenceLine y={1.0} stroke="#64748b" strokeDasharray="4 4" />
                  )}
                  {testMode === 'closed_loop' && (
                    <Line
                      type="monotone"
                      dataKey="yPlant"
                      name="Plant Output y(t)"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="vOut"
                    name="Op-Amp Vout(t)"
                    stroke="#d97706"
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  {hasI && (
                    <Line
                      type="monotone"
                      dataKey="vInteg"
                      name="Integrator Stage (Cf)"
                      stroke="#059669"
                      strokeWidth={1.8}
                      strokeDasharray="4 3"
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
