import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Calculator, Cpu } from 'lucide-react';
import { HardwareBenchLab } from '../data/practicalBenchData';
import { LabType } from '../types/ece423';

interface InteractiveWiringDiagramProps {
  lab: HardwareBenchLab;
  rcResKOhm: number;
  rcCapNf: number;
  fcHz: number;
  onOpenLab: (lab: LabType) => void;
  onOpenCalculator: (calcId?: string) => void;
  onOpenTheory?: (subTab?: 'principles' | 'timeline' | 'essays') => void;
}

export const InteractiveWiringDiagram: React.FC<InteractiveWiringDiagramProps> = ({
  lab,
  rcResKOhm,
  rcCapNf,
  fcHz,
  onOpenLab,
  onOpenCalculator,
  onOpenTheory,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    lab.interactiveNodes[0]?.id ?? 'source'
  );
  const [probeValue, setProbeValue] = useState<number>(lab.probeSpec.defaultVal);

  useEffect(() => {
    setSelectedNodeId(lab.interactiveNodes[0]?.id ?? '');
    setProbeValue(lab.probeSpec.defaultVal);
  }, [lab.id, lab.interactiveNodes, lab.probeSpec.defaultVal]);

  const activeNode =
    lab.interactiveNodes.find((n) => n.id === selectedNodeId) ||
    lab.interactiveNodes[0];

  // Live electrical telemetry derived from probeValue + actual divider/sensor equations
  const probeTelemetry = useMemo(() => {
    if (lab.id === 'voltage') {
      const vSensor = probeValue;
      const vPin = Math.min(3.3, vSensor * (3.3 / 13.3));
      const adcCode = Math.round((vPin / 3.3) * 4095);
      return {
        stage1: `${vSensor.toFixed(1)} V`,
        stage2: `${vPin.toFixed(2)} V`,
        stage3: `ADC ${adcCode}`,
        summary: `V_in = ${vSensor.toFixed(1)} V → V_div(GPIO34) = ${vPin.toFixed(2)} V → 12-bit code ${adcCode} / 4095`,
      };
    }
    if (lab.id === 'current') {
      const vSensor = 2.5 + 0.185 * probeValue;
      const vPin = Math.min(3.3, vSensor * (3.3 / 5.5));
      const adcCode = Math.round((vPin / 3.3) * 4095);
      return {
        stage1: `${vSensor.toFixed(2)} V`,
        stage2: `${vPin.toFixed(2)} V`,
        stage3: `ADC ${adcCode}`,
        summary: `I = ${probeValue.toFixed(2)} A → ACS712 VOUT = ${vSensor.toFixed(2)} V → GPIO35 = ${vPin.toFixed(2)} V (ADC ${adcCode})`,
      };
    }
    if (lab.id === 'gas') {
      const vSensor = probeValue;
      const vPin = Math.min(3.3, vSensor * (18 / 28));
      const adcCode = Math.round((vPin / 3.3) * 4095);
      return {
        stage1: `${vSensor.toFixed(2)} V`,
        stage2: `${vPin.toFixed(2)} V`,
        stage3: `ADC ${adcCode}`,
        summary: `MQ AOUT = ${vSensor.toFixed(2)} V → GPIO32 = ${vPin.toFixed(2)} V → 12-bit code ${adcCode} (DM tracking)`,
      };
    }
    if (lab.id === 'ultrasonic') {
      const echoUs = Math.round((probeValue * 2) / 0.0343);
      const byteVal = Math.min(255, Math.round((probeValue / 100) * 255));
      return {
        stage1: `${echoUs} µs`,
        stage2: '3.33 V TTL',
        stage3: `0x${byteVal.toString(16).toUpperCase().padStart(2, '0')}`,
        summary: `d = ${probeValue.toFixed(0)} cm → Echo pulse = ${echoUs} µs (5V→3.33V) → TDM slot byte 0x${byteVal
          .toString(16)
          .toUpperCase()
          .padStart(2, '0')}`,
      };
    }
    // kicad_aaf
    const vPin = Math.min(3.3, probeValue * 0.64);
    const adcCode = Math.round((vPin / 3.3) * 4095);
    return {
      stage1: `${probeValue.toFixed(1)} V`,
      stage2: `${vPin.toFixed(2)} V`,
      stage3: `fc ${fcHz.toFixed(0)} Hz`,
      summary: `Channel IN = ${probeValue.toFixed(1)} V → Clamped PIN = ${vPin.toFixed(2)} V (ADC ${adcCode}) · AAF fc = ${fcHz.toFixed(0)} Hz`,
    };
  }, [lab.id, probeValue, fcHz]);

  const nodeStroke = (nodeId: string, fallback = '#cbd5e1') =>
    activeNode?.id === nodeId ? '#0284c7' : fallback;

  const nodeFill = (nodeId: string, fallback = '#ffffff') =>
    activeNode?.id === nodeId ? '#f0f9ff' : fallback;

  return (
    <div className="space-y-4">
      {/* Header + Interactive Bench Signal Probe Slider */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-900">
            <span>Interactive Circuit Schematic ({lab.shortLabel})</span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className="font-mono text-sky-700">{lab.esp32Pins.join(' · ')}</span>
          </div>
          <p className="text-[11px] text-slate-600">
            Click any block on the diagram to trace how each wire maps to ECE 423 lecture theory.
          </p>
        </div>

        <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs shrink-0">
          <span className="font-medium text-slate-700 whitespace-nowrap">
            {lab.probeSpec.label}:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={lab.probeSpec.min}
              max={lab.probeSpec.max}
              step={lab.probeSpec.step}
              value={probeValue}
              onChange={(e) => setProbeValue(parseFloat(e.target.value))}
              className="w-28 sm:w-32"
            />
            <span className="font-mono font-semibold tabular-nums text-sky-800 w-16 text-right">
              {probeValue.toFixed(lab.probeSpec.step < 1 ? 2 : 0)} {lab.probeSpec.unit}
            </span>
          </div>
        </label>
      </div>

      {/* Sensor-Specific Interactive SVG Schematic */}
      <svg
        viewBox="0 0 760 250"
        className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50/60 select-none"
        role="img"
        aria-label={`Interactive wiring schematic for ${lab.shortLabel}`}
      >
        {/* Subtle schematic dot grid */}
        <defs>
          <pattern id={`grid-${lab.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="#cbd5e1" opacity="0.55" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="760" height="250" fill={`url(#grid-${lab.id})`} />

        {/* ============================================================= */}
        {/* 1. VOLTAGE SENSOR WIRING                                      */}
        {/* ============================================================= */}
        {lab.id === 'voltage' && (
          <>
            {/* Node 1: Isolated Input Source */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('source')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('source')}
              className="cursor-pointer"
            >
              <rect
                x={20}
                y={52}
                width={145}
                height={120}
                rx={8}
                fill={nodeFill('source')}
                stroke={nodeStroke('source')}
                strokeWidth={activeNode?.id === 'source' ? 2.2 : 1.5}
              />
              <text x={32} y={72} className="fill-sky-700 font-mono text-[10px] font-bold">
                1. INPUT SOURCE
              </text>
              <text x={92} y={96} textAnchor="middle" className="fill-slate-950 font-sans text-xs font-bold">
                0–12 V Bench
              </text>
              <text x={92} y={114} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
                or Step-Down AC
              </text>
              <text x={92} y={145} textAnchor="middle" className="fill-sky-800 font-mono text-xs font-bold">
                {probeTelemetry.stage1}
              </text>
              <text x={92} y={162} textAnchor="middle" className="fill-slate-400 font-mono text-[9px]">
                GND tied common
              </text>
            </g>

            {/* Signal Wire + Ground Bus */}
            <line x1={165} y1={98} x2={212} y2={98} stroke="#0284c7" strokeWidth="2.2" />
            <line x1={92} y1={172} x2={92} y2={208} stroke="#475569" strokeWidth="1.8" />
            <line x1={92} y1={208} x2={668} y2={208} stroke="#475569" strokeWidth="1.8" />
            <text x={380} y={224} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
              COMMON ANALOG GROUND BUS (GND)
            </text>

            {/* Node 2: Precision Divider R1 / R2 */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('divider')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('divider')}
              className="cursor-pointer"
            >
              <rect
                x={212}
                y={40}
                width={168}
                height={145}
                rx={8}
                fill={nodeFill('divider')}
                stroke={nodeStroke('divider')}
                strokeWidth={activeNode?.id === 'divider' ? 2.2 : 1.5}
              />
              <text x={224} y={60} className="fill-sky-700 font-mono text-[10px] font-bold">
                2. SCALING DIVIDER
              </text>
              {/* R1 series */}
              <line x1={226} y1={98} x2={248} y2={98} stroke="#0f172a" strokeWidth="1.8" />
              <rect x={248} y={88} width={52} height={20} rx={3} fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <text x={274} y={102} textAnchor="middle" className="fill-slate-900 font-mono text-[9px] font-semibold">
                R1 10kΩ
              </text>
              <line x1={300} y1={98} x2={364} y2={98} stroke="#0f172a" strokeWidth="1.8" />
              {/* R2 shunt to GND */}
              <circle cx={328} cy={98} r={3.5} fill="#0284c7" />
              <line x1={328} y1={98} x2={328} y2={120} stroke="#0f172a" strokeWidth="1.6" />
              <rect x={314} y={120} width={28} height={34} rx={3} fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <text x={328} y={135} textAnchor="middle" className="fill-slate-900 font-mono text-[8px] font-semibold">
                R2
              </text>
              <text x={328} y={147} textAnchor="middle" className="fill-slate-700 font-mono text-[8px]">
                3.3k
              </text>
              <line x1={328} y1={154} x2={328} y2={208} stroke="#475569" strokeWidth="1.6" />
              <text x={265} y={145} textAnchor="middle" className="fill-sky-800 font-mono text-[11px] font-bold">
                {probeTelemetry.stage2}
              </text>
              <text x={265} y={160} textAnchor="middle" className="fill-slate-500 font-mono text-[9px]">
                Gain 0.248
              </text>
            </g>

            {/* Wire to AAF */}
            <line x1={380} y1={98} x2={414} y2={98} stroke="#0284c7" strokeWidth="2.2" />

            {/* Node 3: BAT54S Clamp + RC Anti-Aliasing */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('aaf')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('aaf')}
              className="cursor-pointer"
            >
              <rect
                x={414}
                y={40}
                width={158}
                height={145}
                rx={8}
                fill={nodeFill('aaf', '#f0fdf4')}
                stroke={nodeStroke('aaf', '#059669')}
                strokeWidth={activeNode?.id === 'aaf' ? 2.2 : 1.5}
              />
              <text x={426} y={60} className="fill-emerald-800 font-mono text-[10px] font-bold">
                3. CLAMP &amp; AAF LPF
              </text>
              <line x1={426} y1={98} x2={558} y2={98} stroke="#059669" strokeWidth="2" />
              {/* Cap C1 to GND */}
              <circle cx={470} cy={98} r={3.5} fill="#059669" />
              <line x1={470} y1={98} x2={470} y2={125} stroke="#0f172a" strokeWidth="1.5" />
              <line x1={457} y1={125} x2={483} y2={125} stroke="#0f172a" strokeWidth="2.2" />
              <line x1={457} y1={133} x2={483} y2={133} stroke="#0f172a" strokeWidth="2.2" />
              <line x1={470} y1={133} x2={470} y2={208} stroke="#475569" strokeWidth="1.6" />
              <text x={470} y={152} textAnchor="middle" className="fill-slate-800 font-mono text-[9px] font-semibold">
                C1 {rcCapNf}nF
              </text>
              {/* BAT54S clamp block */}
              <rect x={505} y={114} width={54} height={28} rx={4} fill="#fffbeb" stroke="#d97706" strokeWidth="1.3" />
              <text x={532} y={128} textAnchor="middle" className="fill-amber-900 font-mono text-[9px] font-bold">
                BAT54S
              </text>
              <text x={532} y={138} textAnchor="middle" className="fill-amber-700 font-mono text-[8px]">
                0..3.3V
              </text>
              <text x={493} y={174} textAnchor="middle" className="fill-emerald-800 font-mono text-[10px] font-semibold">
                fc ≈ {fcHz.toFixed(0)} Hz (R={rcResKOhm.toFixed(1)}k)
              </text>
            </g>

            <line x1={572} y1={98} x2={602} y2={98} stroke="#059669" strokeWidth="2.2" />

            {/* Node 4: ESP32 GPIO34 */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('adc')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('adc')}
              className="cursor-pointer"
            >
              <rect
                x={602}
                y={40}
                width={138}
                height={145}
                rx={8}
                fill={activeNode?.id === 'adc' ? '#0c4a6e' : '#0f172a'}
                stroke={activeNode?.id === 'adc' ? '#38bdf8' : '#0f172a'}
                strokeWidth="2"
              />
              <text x={614} y={60} className="fill-sky-300 font-mono text-[10px] font-bold">
                4. ESP32 ADC1
              </text>
              <text x={671} y={88} textAnchor="middle" className="fill-white font-sans text-sm font-bold">
                GPIO34
              </text>
              <text x={671} y={106} textAnchor="middle" className="fill-sky-300 font-mono text-[10px]">
                ADC1_CH6 (12-bit)
              </text>
              <rect x={618} y={120} width={106} height={32} rx={4} fill="#1e293b" />
              <text x={671} y={140} textAnchor="middle" className="fill-emerald-300 font-mono text-xs font-bold">
                {probeTelemetry.stage3}
              </text>
              <line x1={668} y1={185} x2={668} y2={208} stroke="#475569" strokeWidth="1.8" />
            </g>
          </>
        )}

        {/* ============================================================= */}
        {/* 2. CURRENT SENSOR (ACS712) WIRING                             */}
        {/* ============================================================= */}
        {lab.id === 'current' && (
          <>
            {/* Node 1: ACS712 Hall Core + Load Loop */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('hall')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('hall')}
              className="cursor-pointer"
            >
              <rect
                x={20}
                y={36}
                width={175}
                height={150}
                rx={8}
                fill={nodeFill('hall')}
                stroke={nodeStroke('hall')}
                strokeWidth={activeNode?.id === 'hall' ? 2.2 : 1.5}
              />
              <text x={32} y={56} className="fill-sky-700 font-mono text-[10px] font-bold">
                1. ACS712 HALL CORE
              </text>
              {/* Series Load Loop IP+ -> IP- */}
              <rect x={36} y={66} width={142} height={30} rx={4} fill="#fff7ed" stroke="#d97706" strokeWidth="1.2" />
              <text x={107} y={85} textAnchor="middle" className="fill-amber-900 font-mono text-[10px] font-semibold">
                IP+ → Load ({probeValue.toFixed(2)} A) → IP-
              </text>
              <text x={107} y={118} textAnchor="middle" className="fill-slate-700 font-mono text-[10px]">
                VCC = 5V (C3 10µF)
              </text>
              <text x={107} y={142} textAnchor="middle" className="fill-sky-800 font-mono text-xs font-bold">
                VIOUT = {probeTelemetry.stage1}
              </text>
              <text x={107} y={168} textAnchor="middle" className="fill-slate-500 font-mono text-[9px]">
                2.50 V zero-A midpoint
              </text>
            </g>

            <line x1={195} y1={110} x2={232} y2={110} stroke="#0284c7" strokeWidth="2.2" />
            <line x1={107} y1={186} x2={107} y2={212} stroke="#475569" strokeWidth="1.8" />
            <line x1={107} y1={212} x2={672} y2={212} stroke="#475569" strokeWidth="1.8" />
            <text x={390} y={229} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
              SHARED GROUND RETURN (5V SUPPLY GND = ESP32 GND)
            </text>

            {/* Node 2: 5V -> 3.0V Level Divider */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('divider')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('divider')}
              className="cursor-pointer"
            >
              <rect
                x={232}
                y={40}
                width={165}
                height={146}
                rx={8}
                fill={nodeFill('divider')}
                stroke={nodeStroke('divider')}
                strokeWidth={activeNode?.id === 'divider' ? 2.2 : 1.5}
              />
              <text x={244} y={60} className="fill-sky-700 font-mono text-[10px] font-bold">
                2. 5V→3V DIVIDER
              </text>
              <line x1={244} y1={110} x2={266} y2={110} stroke="#0f172a" strokeWidth="1.8" />
              <rect x={266} y={100} width={52} height={20} rx={3} fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <text x={292} y={114} textAnchor="middle" className="fill-slate-900 font-mono text-[9px] font-semibold">
                R3 2.2k
              </text>
              <line x1={318} y1={110} x2={382} y2={110} stroke="#0f172a" strokeWidth="1.8" />
              <circle cx={346} cy={110} r={3.5} fill="#0284c7" />
              <line x1={346} y1={110} x2={346} y2={130} stroke="#0f172a" strokeWidth="1.6" />
              <rect x={331} y={130} width={30} height={32} rx={3} fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <text x={346} y={145} textAnchor="middle" className="fill-slate-900 font-mono text-[8px] font-semibold">
                R4
              </text>
              <text x={346} y={156} textAnchor="middle" className="fill-slate-700 font-mono text-[8px]">
                3.3k
              </text>
              <line x1={346} y1={162} x2={346} y2={212} stroke="#475569" strokeWidth="1.6" />
              <text x={282} y={154} textAnchor="middle" className="fill-sky-800 font-mono text-[11px] font-bold">
                {probeTelemetry.stage2}
              </text>
              <text x={282} y={168} textAnchor="middle" className="fill-slate-500 font-mono text-[9px]">
                0.60× Scale
              </text>
            </g>

            <line x1={397} y1={110} x2={428} y2={110} stroke="#0284c7" strokeWidth="2.2" />

            {/* Node 3: Brush Noise Bypass LPF */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('filter')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('filter')}
              className="cursor-pointer"
            >
              <rect
                x={428}
                y={40}
                width={142}
                height={146}
                rx={8}
                fill={nodeFill('filter', '#f0fdf4')}
                stroke={nodeStroke('filter', '#059669')}
                strokeWidth={activeNode?.id === 'filter' ? 2.2 : 1.5}
              />
              <text x={440} y={60} className="fill-emerald-800 font-mono text-[10px] font-bold">
                3. BRUSH LPF
              </text>
              <line x1={440} y1={110} x2={556} y2={110} stroke="#059669" strokeWidth="2" />
              <circle cx={498} cy={110} r={3.5} fill="#059669" />
              <line x1={498} y1={110} x2={498} y2={132} stroke="#0f172a" strokeWidth="1.6" />
              <line x1={484} y1={132} x2={512} y2={132} stroke="#0f172a" strokeWidth="2.2" />
              <line x1={484} y1={140} x2={512} y2={140} stroke="#0f172a" strokeWidth="2.2" />
              <line x1={498} y1={140} x2={498} y2={212} stroke="#475569" strokeWidth="1.6" />
              <text x={498} y={160} textAnchor="middle" className="fill-slate-800 font-mono text-[9px] font-semibold">
                C2 100 nF
              </text>
              <text x={498} y={176} textAnchor="middle" className="fill-emerald-800 font-mono text-[9px]">
                fc ≈ 1.21 kHz
              </text>
            </g>

            <line x1={570} y1={110} x2={602} y2={110} stroke="#059669" strokeWidth="2.2" />

            {/* Node 4: ESP32 GPIO35 + mu-Law */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('adc')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('adc')}
              className="cursor-pointer"
            >
              <rect
                x={602}
                y={40}
                width={138}
                height={146}
                rx={8}
                fill={activeNode?.id === 'adc' ? '#0c4a6e' : '#0f172a'}
                stroke={activeNode?.id === 'adc' ? '#38bdf8' : '#0f172a'}
                strokeWidth="2"
              />
              <text x={614} y={60} className="fill-sky-300 font-mono text-[10px] font-bold">
                4. μ-LAW ADC
              </text>
              <text x={671} y={88} textAnchor="middle" className="fill-white font-sans text-sm font-bold">
                GPIO35
              </text>
              <text x={671} y={106} textAnchor="middle" className="fill-sky-300 font-mono text-[10px]">
                ADC1_CH7 · μ=255
              </text>
              <rect x={618} y={122} width={106} height={32} rx={4} fill="#1e293b" />
              <text x={671} y={142} textAnchor="middle" className="fill-emerald-300 font-mono text-xs font-bold">
                {probeTelemetry.stage3}
              </text>
              <line x1={672} y1={186} x2={672} y2={212} stroke="#475569" strokeWidth="1.8" />
            </g>
          </>
        )}

        {/* ============================================================= */}
        {/* 3. GAS SENSOR (MQ-2 / MQ-135) WIRING                          */}
        {/* ============================================================= */}
        {lab.id === 'gas' && (
          <>
            {/* Node 1: External 5V Heater Rail */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('heater')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('heater')}
              className="cursor-pointer"
            >
              <rect
                x={20}
                y={24}
                width={155}
                height={70}
                rx={8}
                fill={nodeFill('heater', '#fffbeb')}
                stroke={nodeStroke('heater', '#d97706')}
                strokeWidth={activeNode?.id === 'heater' ? 2.2 : 1.5}
              />
              <text x={32} y={44} className="fill-amber-900 font-mono text-[10px] font-bold">
                1. EXT 5V HEATER
              </text>
              <text x={97} y={64} textAnchor="middle" className="fill-slate-900 font-sans text-xs font-bold">
                VIN / 5V (150 mA)
              </text>
              <text x={97} y={81} textAnchor="middle" className="fill-amber-800 font-mono text-[9px]">
                Never use 3.3V pin!
              </text>
            </g>

            {/* Heater supply wire down into MQ Sensing Module */}
            <line x1={97} y1={94} x2={97} y2={110} stroke="#d97706" strokeWidth="2" />

            {/* Node 2: MQ-2 / MQ-135 Sensing Element */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('sensing')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('sensing')}
              className="cursor-pointer"
            >
              <rect
                x={20}
                y={110}
                width={155}
                height={84}
                rx={8}
                fill={nodeFill('sensing')}
                stroke={nodeStroke('sensing')}
                strokeWidth={activeNode?.id === 'sensing' ? 2.2 : 1.5}
              />
              <text x={32} y={130} className="fill-sky-700 font-mono text-[10px] font-bold">
                2. MQ SnO₂ CELL
              </text>
              <text x={97} y={152} textAnchor="middle" className="fill-slate-950 font-sans text-xs font-bold">
                MQ-2 / MQ-135
              </text>
              <text x={97} y={172} textAnchor="middle" className="fill-sky-800 font-mono text-xs font-bold">
                AOUT = {probeTelemetry.stage1}
              </text>
            </g>

            <line x1={175} y1={152} x2={228} y2={152} stroke="#0284c7" strokeWidth="2.2" />
            <line x1={97} y1={194} x2={97} y2={218} stroke="#475569" strokeWidth="1.8" />
            <line x1={97} y1={218} x2={672} y2={218} stroke="#475569" strokeWidth="1.8" />
            <text x={385} y={235} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
              STAR-GROUND BUS (ISOLATE HEATER SURGE FROM ANALOG GND)
            </text>

            {/* Node 3: R5/R6 Divider + C4 220 nF Thermal LPF */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('divider')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('divider')}
              className="cursor-pointer"
            >
              <rect
                x={228}
                y={48}
                width={318}
                height={146}
                rx={8}
                fill={nodeFill('divider')}
                stroke={nodeStroke('divider')}
                strokeWidth={activeNode?.id === 'divider' ? 2.2 : 1.5}
              />
              <text x={242} y={68} className="fill-sky-700 font-mono text-[10px] font-bold">
                3. 5V→3.21V DIVIDER + THERMAL JITTER LPF
              </text>
              <line x1={242} y1={152} x2={268} y2={152} stroke="#0f172a" strokeWidth="1.8" />
              <rect x={268} y={142} width={56} height={20} rx={3} fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <text x={296} y={156} textAnchor="middle" className="fill-slate-900 font-mono text-[9px] font-semibold">
                R5 10kΩ
              </text>
              <line x1={324} y1={152} x2={530} y2={152} stroke="#0f172a" strokeWidth="1.8" />

              {/* R6 Shunt */}
              <circle cx={366} cy={152} r={3.5} fill="#0284c7" />
              <line x1={366} y1={152} x2={366} y2={166} stroke="#0f172a" strokeWidth="1.5" />
              <rect x={346} y={166} width={40} height={22} rx={3} fill="#ffffff" stroke="#0f172a" strokeWidth="1.4" />
              <text x={366} y={180} textAnchor="middle" className="fill-slate-900 font-mono text-[8px] font-semibold">
                R6 18k
              </text>
              <line x1={366} y1={188} x2={366} y2={218} stroke="#475569" strokeWidth="1.6" />

              {/* C4 Shunt */}
              <circle cx={455} cy={152} r={3.5} fill="#059669" />
              <line x1={455} y1={152} x2={455} y2={166} stroke="#0f172a" strokeWidth="1.5" />
              <line x1={442} y1={166} x2={468} y2={166} stroke="#0f172a" strokeWidth="2.2" />
              <line x1={442} y1={173} x2={468} y2={173} stroke="#0f172a" strokeWidth="2.2" />
              <line x1={455} y1={173} x2={455} y2={218} stroke="#475569" strokeWidth="1.6" />
              <text x={498} y={182} className="fill-emerald-800 font-mono text-[9px] font-semibold">
                C4 220nF
              </text>

              <text x={387} y={108} textAnchor="middle" className="fill-sky-800 font-mono text-sm font-bold">
                V_pin = {probeTelemetry.stage2}
              </text>
              <text x={387} y={126} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
                Gain = 18/(10+18) = 0.643 · fc ≈ 112 Hz
              </text>
            </g>

            <line x1={546} y1={152} x2={598} y2={152} stroke="#059669" strokeWidth="2.2" />

            {/* Node 4: ESP32 GPIO32 + 1-Bit DM */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('adc')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('adc')}
              className="cursor-pointer"
            >
              <rect
                x={598}
                y={48}
                width={142}
                height={146}
                rx={8}
                fill={activeNode?.id === 'adc' ? '#0c4a6e' : '#0f172a'}
                stroke={activeNode?.id === 'adc' ? '#38bdf8' : '#0f172a'}
                strokeWidth="2"
              />
              <text x={610} y={68} className="fill-sky-300 font-mono text-[10px] font-bold">
                4. 1-BIT DM ADC
              </text>
              <text x={669} y={98} textAnchor="middle" className="fill-white font-sans text-sm font-bold">
                GPIO32
              </text>
              <text x={669} y={116} textAnchor="middle" className="fill-sky-300 font-mono text-[10px]">
                ADC1_CH4 @ 200 Hz
              </text>
              <rect x={614} y={134} width={110} height={34} rx={4} fill="#1e293b" />
              <text x={669} y={155} textAnchor="middle" className="fill-emerald-300 font-mono text-xs font-bold">
                {probeTelemetry.stage3}
              </text>
              <line x1={672} y1={194} x2={672} y2={218} stroke="#475569" strokeWidth="1.8" />
            </g>
          </>
        )}

        {/* ============================================================= */}
        {/* 4. ULTRASONIC HC-SR04 WIRING                                  */}
        {/* ============================================================= */}
        {lab.id === 'ultrasonic' && (
          <>
            {/* HC-SR04 Module */}
            <rect x={24} y={40} width={160} height={152} rx={8} fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
            <text x={104} y={64} textAnchor="middle" className="fill-slate-950 font-sans text-xs font-bold">
              HC-SR04 Sensor
            </text>
            <text x={104} y={84} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
              VCC: 5V · GND: Common
            </text>
            <rect x={44} y={98} width={120} height={24} rx={4} fill="#f0f9ff" stroke="#0284c7" strokeWidth="1.2" />
            <text x={104} y={114} textAnchor="middle" className="fill-sky-800 font-mono text-[10px] font-semibold">
              TRIG (10µs In)
            </text>
            <rect x={44} y={138} width={120} height={24} rx={4} fill="#fffbeb" stroke="#d97706" strokeWidth="1.2" />
            <text x={104} y={154} textAnchor="middle" className="fill-amber-900 font-mono text-[10px] font-semibold">
              ECHO (5V: {probeTelemetry.stage1})
            </text>

            {/* Node 1: TRIG direct path (GPIO18 -> TRIG) */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('trig')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('trig')}
              className="cursor-pointer"
            >
              <rect
                x={224}
                y={40}
                width={296}
                height={58}
                rx={8}
                fill={nodeFill('trig')}
                stroke={nodeStroke('trig')}
                strokeWidth={activeNode?.id === 'trig' ? 2.2 : 1.5}
              />
              <text x={238} y={60} className="fill-sky-700 font-mono text-[10px] font-bold">
                1. TRIG LINE (DIRECT 3.3V CMOS ← GPIO18)
              </text>
              <line x1={184} y1={110} x2={224} y2={74} stroke="#0284c7" strokeWidth="2" />
              <line x1={520} y1={74} x2={588} y2={74} stroke="#0284c7" strokeWidth="2" />
              <text x={372} y={82} textAnchor="middle" className="fill-slate-700 font-mono text-[10px]">
                3.3 V pulse triggers burst every 20 TDM ticks
              </text>
            </g>

            {/* Node 2: ECHO 5V -> 3.3V Level Shifter */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('echo')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('echo')}
              className="cursor-pointer"
            >
              <rect
                x={224}
                y={114}
                width={296}
                height={80}
                rx={8}
                fill={nodeFill('echo', '#fffbeb')}
                stroke={nodeStroke('echo', '#d97706')}
                strokeWidth={activeNode?.id === 'echo' ? 2.2 : 1.5}
              />
              <text x={238} y={134} className="fill-amber-900 font-mono text-[10px] font-bold">
                2. ECHO 5V→3.3V SHIFTER (R7 1kΩ / R8 2kΩ)
              </text>
              <line x1={184} y1={150} x2={224} y2={150} stroke="#d97706" strokeWidth="2.2" />
              <rect x={265} y={146} width={60} height={20} rx={3} fill="#ffffff" stroke="#0f172a" strokeWidth="1.4" />
              <text x={295} y={160} textAnchor="middle" className="fill-slate-900 font-mono text-[9px] font-semibold">
                R7 1kΩ
              </text>
              <line x1={325} y1={156} x2={520} y2={156} stroke="#059669" strokeWidth="2" />
              <rect x={395} y={146} width={96} height={20} rx={3} fill="#ffffff" stroke="#059669" strokeWidth="1.4" />
              <text x={443} y={160} textAnchor="middle" className="fill-emerald-800 font-mono text-[9px] font-semibold">
                R8 2kΩ → GND
              </text>
              <text x={372} y={184} textAnchor="middle" className="fill-emerald-800 font-mono text-[10px] font-semibold">
                Safe 3.33 V Pulse → GPIO19
              </text>
            </g>

            <line x1={520} y1={156} x2={588} y2={156} stroke="#059669" strokeWidth="2.2" />

            {/* Node 3: ESP32 TDM Multiplexer + Line Out */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('tdm')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('tdm')}
              className="cursor-pointer"
            >
              <rect
                x={588}
                y={40}
                width={152}
                height={154}
                rx={8}
                fill={activeNode?.id === 'tdm' ? '#0c4a6e' : '#0f172a'}
                stroke={activeNode?.id === 'tdm' ? '#38bdf8' : '#0f172a'}
                strokeWidth="2"
              />
              <text x={600} y={60} className="fill-sky-300 font-mono text-[10px] font-bold">
                3. TDM &amp; LINE OUT
              </text>
              <text x={664} y={84} textAnchor="middle" className="fill-white font-mono text-xs font-bold">
                GPIO18 (TRIG)
              </text>
              <text x={664} y={104} textAnchor="middle" className="fill-emerald-300 font-mono text-xs font-bold">
                GPIO19 (ECHO)
              </text>
              <text x={664} y={124} textAnchor="middle" className="fill-sky-300 font-mono text-[10px]">
                GPIO25 (Line Code)
              </text>
              <rect x={604} y={138} width={120} height={38} rx={4} fill="#1e293b" />
              <text x={664} y={154} textAnchor="middle" className="fill-slate-300 font-mono text-[9px]">
                TDM Slot Byte
              </text>
              <text x={664} y={170} textAnchor="middle" className="fill-emerald-300 font-mono text-xs font-bold">
                {probeTelemetry.stage3}
              </text>
            </g>
          </>
        )}

        {/* ============================================================= */}
        {/* 5. KICAD ANALOG FRONT-END SHIELD                              */}
        {/* ============================================================= */}
        {lab.id === 'kicad_aaf' && (
          <>
            {/* Node 1: 4 Sensor Headers */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('headers')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('headers')}
              className="cursor-pointer"
            >
              <rect
                x={20}
                y={36}
                width={170}
                height={156}
                rx={8}
                fill={nodeFill('headers')}
                stroke={nodeStroke('headers')}
                strokeWidth={activeNode?.id === 'headers' ? 2.2 : 1.5}
              />
              <text x={32} y={56} className="fill-sky-700 font-mono text-[10px] font-bold">
                1. JST HEADERS J1–J4
              </text>
              <text x={36} y={82} className="fill-slate-800 font-mono text-[10px]">J1: Voltage (0–12V)</text>
              <text x={36} y={106} className="fill-slate-800 font-mono text-[10px]">J2: ACS712 Current</text>
              <text x={36} y={130} className="fill-slate-800 font-mono text-[10px]">J3: MQ-2/135 Gas</text>
              <text x={36} y={154} className="fill-slate-800 font-mono text-[10px]">J4: HC-SR04 Trig/Echo</text>
              <text x={36} y={178} className="fill-sky-700 font-mono text-[10px] font-bold">
                Probe: {probeTelemetry.stage1}
              </text>
            </g>

            <line x1={190} y1={114} x2={232} y2={114} stroke="#0284c7" strokeWidth="2.4" />

            {/* Node 2: BAT54S + RC AAF Bank */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('clamp')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('clamp')}
              className="cursor-pointer"
            >
              <rect
                x={232}
                y={36}
                width={205}
                height={156}
                rx={8}
                fill={nodeFill('clamp', '#f0fdf4')}
                stroke={nodeStroke('clamp', '#059669')}
                strokeWidth={activeNode?.id === 'clamp' ? 2.2 : 1.5}
              />
              <text x={244} y={56} className="fill-emerald-800 font-mono text-[10px] font-bold">
                2. CLAMP &amp; RC AAF BANK
              </text>
              <text x={334} y={88} textAnchor="middle" className="fill-slate-900 font-sans text-xs font-bold">
                D1–D3 BAT54S + {rcCapNf} nF
              </text>
              <text x={334} y={110} textAnchor="middle" className="fill-slate-600 font-mono text-[10px]">
                R = {rcResKOhm.toFixed(1)} kΩ · {probeTelemetry.stage3}
              </text>
              <rect x={258} y={128} width={152} height={44} rx={4} fill="#ffffff" stroke="#059669" strokeWidth="1.2" />
              <text x={334} y={146} textAnchor="middle" className="fill-emerald-800 font-mono text-[10px] font-bold">
                Clamped V_pin: {probeTelemetry.stage2}
              </text>
              <text x={334} y={162} textAnchor="middle" className="fill-slate-500 font-mono text-[9px]">
                Placed ≤ 5 mm from ADC1
              </text>
            </g>

            <line x1={437} y1={114} x2={474} y2={114} stroke="#059669" strokeWidth="2.4" />

            {/* Node 3: Star Ground + ESP32-WROOM-32 */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNodeId('star_gnd')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId('star_gnd')}
              className="cursor-pointer"
            >
              <rect
                x={474}
                y={36}
                width={266}
                height={156}
                rx={8}
                fill={activeNode?.id === 'star_gnd' ? '#0c4a6e' : '#0f172a'}
                stroke={activeNode?.id === 'star_gnd' ? '#38bdf8' : '#0f172a'}
                strokeWidth="2"
              />
              <text x={488} y={56} className="fill-sky-300 font-mono text-[10px] font-bold">
                3. ESP32-WROOM-32 + STAR GND
              </text>
              <text x={607} y={86} textAnchor="middle" className="fill-white font-sans text-sm font-bold">
                GPIO34 · 35 · 32 · 18/19
              </text>
              <text x={607} y={108} textAnchor="middle" className="fill-sky-300 font-mono text-[10px]">
                100 µF + 100 nF Rail Decoupling
              </text>
              <rect x={496} y={126} width={222} height={48} rx={4} fill="#1e293b" />
              <text x={607} y={146} textAnchor="middle" className="fill-emerald-300 font-mono text-[10px] font-bold">
                Analog GND ≠ 150 mA Heater Return
              </text>
              <text x={607} y={164} textAnchor="middle" className="fill-slate-300 font-mono text-[9px]">
                Joined cleanly at Star GND jack
              </text>
            </g>
          </>
        )}
      </svg>

      {/* Live Probe Telemetry Summary Line */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
          <Cpu className="h-3.5 w-3.5 text-sky-600 shrink-0" />
          <span>Live Circuit Probe:</span>
        </span>
        <span className="font-mono font-semibold tabular-nums text-slate-950">
          {probeTelemetry.summary}
        </span>
      </div>

      {/* Node Selector Strip (Keyboard + Touch Accessible) */}
      <div className="flex flex-wrap items-center gap-1.5">
        {lab.interactiveNodes.map((node) => {
          const isSelected = activeNode?.id === node.id;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => setSelectedNodeId(node.id)}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isSelected
                  ? 'border-sky-600 bg-sky-50 text-sky-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {node.stepNum}. {node.label}
            </button>
          );
        })}
      </div>

      {/* Selected Node Theory & Hardware-to-Lecture Bridge Panel */}
      {activeNode && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-sky-700">{activeNode.moduleTitle}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{activeNode.pinOrPart}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-950">
                {activeNode.stepNum}. {activeNode.label} — {activeNode.lectureConcept}
              </h3>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1 whitespace-nowrap shrink-0 tabular-nums">
              {activeNode.nominalSpec}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-slate-700">{activeNode.whyItMatters}</p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {activeNode.labType && (
              <button
                type="button"
                onClick={() => onOpenLab(activeNode.labType!)}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
              >
                <span>Open Matching Signal Lab</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            {activeNode.calcId && (
              <button
                type="button"
                onClick={() => onOpenCalculator(activeNode.calcId)}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700 whitespace-nowrap shrink-0"
              >
                <Calculator className="h-3.5 w-3.5 text-sky-600" />
                <span>Solve Related Formula</span>
              </button>
            )}
            {onOpenTheory && (
              <button
                type="button"
                onClick={() => onOpenTheory('principles')}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700 whitespace-nowrap shrink-0"
              >
                <BookOpen className="h-3.5 w-3.5 text-sky-600" />
                <span>Review Lecture Theory</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
