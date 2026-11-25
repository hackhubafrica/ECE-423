import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Pause,
  RefreshCw,
  RotateCcw,
  Sliders,
  Unplug,
  Usb,
} from 'lucide-react';

export interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

export interface SerialOpenOptions {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

export interface SerialSignals {
  dataTerminalReady?: boolean;
  requestToSend?: boolean;
  break?: boolean;
}

export interface SerialPortHandle {
  open: (options: SerialOpenOptions) => Promise<void>;
  close: () => Promise<void>;
  getInfo?: () => SerialPortInfo;
  setSignals?: (signals: SerialSignals) => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

export type DtrRtsMode = 'hold_low' | 'normal' | 'pulse_reset';
export type TxLineEnding = 'lf' | 'crlf' | 'cr';

export const PRESET_BAUD_RATES = [
  9600,
  19200,
  38400,
  57600,
  115200,
  230400,
  460800,
  921600,
] as const;

export const COMMON_COM_PORTS = [
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  '/dev/ttyUSB0',
  '/dev/ttyUSB1',
  '/dev/ttyACM0',
  '/dev/cu.usbserial-0001',
] as const;

export const ESP32_USB_FILTERS: Array<{ usbVendorId: number }> = [
  { usbVendorId: 0x10c4 }, // Silicon Labs CP210x
  { usbVendorId: 0x1a86 }, // WCH CH340 / CH341 / CH9102
  { usbVendorId: 0x303a }, // Espressif Native USB / JTAG
  { usbVendorId: 0x0403 }, // FTDI FT232R
];

export function describeUsbSerialPort(port: SerialPortHandle, index: number): string {
  const info = port.getInfo?.();
  if (!info || info.usbVendorId === undefined) {
    return `Authorized Serial Port #${index + 1}`;
  }
  const vid = info.usbVendorId;
  const pid = info.usbProductId;
  const vidHex = `0x${vid.toString(16).toUpperCase().padStart(4, '0')}`;
  const pidHex =
    pid !== undefined
      ? `:0x${pid.toString(16).toUpperCase().padStart(4, '0')}`
      : '';

  if (vid === 0x10c4) return `Silicon Labs CP210x (${vidHex}${pidHex})`;
  if (vid === 0x1a86) return `WCH CH340/CH9102 (${vidHex}${pidHex})`;
  if (vid === 0x303a) return `Espressif USB-JTAG/Serial (${vidHex}${pidHex})`;
  if (vid === 0x0403) return `FTDI FT232R UART (${vidHex}${pidHex})`;
  if (vid === 0x2341 || vid === 0x239a) return `USB CDC Serial (${vidHex}${pidHex})`;
  return `USB Serial Device (${vidHex}${pidHex})`;
}

interface SerialConfigPanelProps {
  webSerialSupported: boolean;
  streamSource: 'simulating' | 'serial' | 'paused';
  comPortLabel: string;
  onComPortLabelChange: (port: string) => void;
  pairedPorts: SerialPortHandle[];
  selectedPortIndex: number;
  onSelectPortIndex: (idx: number) => void;
  onScanPorts: () => void;
  onPairNewPort: () => void;
  filterEsp32Vendors: boolean;
  onFilterEsp32VendorsChange: (val: boolean) => void;
  baudRate: number;
  onBaudRateChange: (baud: number) => void;
  dataBits: 7 | 8;
  onDataBitsChange: (bits: 7 | 8) => void;
  parity: 'none' | 'even' | 'odd';
  onParityChange: (parity: 'none' | 'even' | 'odd') => void;
  stopBits: 1 | 2;
  onStopBitsChange: (stopBits: 1 | 2) => void;
  flowControl: 'none' | 'hardware';
  onFlowControlChange: (flow: 'none' | 'hardware') => void;
  bufferSize: number;
  onBufferSizeChange: (size: number) => void;
  dtrRtsMode: DtrRtsMode;
  onDtrRtsModeChange: (mode: DtrRtsMode) => void;
  txLineEnding: TxLineEnding;
  onTxLineEndingChange: (ending: TxLineEnding) => void;
  autoReconnect: boolean;
  onAutoReconnectChange: (val: boolean) => void;
  settingsDirtyWhileConnected: boolean;
  rxFrameCount: number;
  parseErrorCount: number;
  reconnectCount: number;
  onConnect: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
  onResetDefaults: () => void;
}

export const SerialConfigPanel: React.FC<SerialConfigPanelProps> = ({
  webSerialSupported,
  streamSource,
  comPortLabel,
  onComPortLabelChange,
  pairedPorts,
  selectedPortIndex,
  onSelectPortIndex,
  onScanPorts,
  onPairNewPort,
  filterEsp32Vendors,
  onFilterEsp32VendorsChange,
  baudRate,
  onBaudRateChange,
  dataBits,
  onDataBitsChange,
  parity,
  onParityChange,
  stopBits,
  onStopBitsChange,
  flowControl,
  onFlowControlChange,
  bufferSize,
  onBufferSizeChange,
  dtrRtsMode,
  onDtrRtsModeChange,
  txLineEnding,
  onTxLineEndingChange,
  autoReconnect,
  onAutoReconnectChange,
  settingsDirtyWhileConnected,
  rxFrameCount,
  parseErrorCount,
  reconnectCount,
  onConnect,
  onReconnect,
  onDisconnect,
  onResetDefaults,
}) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [customComMode, setCustomComMode] = useState<boolean>(
    !COMMON_COM_PORTS.includes(comPortLabel as (typeof COMMON_COM_PORTS)[number])
  );
  const [customBaudInput, setCustomBaudInput] = useState<string>(String(baudRate));
  const isPresetBaud = PRESET_BAUD_RATES.includes(
    baudRate as (typeof PRESET_BAUD_RATES)[number]
  );
  const [showCustomBaud, setShowCustomBaud] = useState<boolean>(!isPresetBaud);

  useEffect(() => {
    setCustomBaudInput(String(baudRate));
  }, [baudRate]);

  const framingCode = `${dataBits}${parity === 'none' ? 'N' : parity === 'even' ? 'E' : 'O'}${stopBits}`;
  const isConnected = streamSource === 'serial';
  const maxBytesPerSec = Math.round(baudRate / (1 + dataBits + (parity === 'none' ? 0 : 1) + stopBits));

  return (
    <section
      aria-label="ESP32 Serial Port and Connection Configuration"
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/70 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-sky-600 shrink-0" />
            <h2 className="text-sm font-bold text-slate-950">
              ESP32 COM Port &amp; UART Stability Configuration
            </h2>
          </div>

          <span className="hidden sm:inline text-slate-300" aria-hidden="true">
            |
          </span>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono tabular-nums">
            <span className="font-semibold text-slate-900">{comPortLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{baudRate} baud</span>
            <span aria-hidden="true">·</span>
            <span>{framingCode}</span>
            <span aria-hidden="true">·</span>
            <span>{bufferSize} B RX</span>
            <span aria-hidden="true">·</span>
            {streamSource === 'serial' ? (
              <span className="inline-flex items-center gap-1 font-sans font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Connected</span>
              </span>
            ) : streamSource === 'simulating' ? (
              <span className="inline-flex items-center gap-1 font-sans font-medium text-sky-700">
                <Cpu className="h-3.5 w-3.5" />
                <span>Simulator Feed</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-sans font-medium text-slate-600">
                <Pause className="h-3.5 w-3.5" />
                <span>Idle</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {settingsDirtyWhileConnected && isConnected && (
            <button
              type="button"
              onClick={onReconnect}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Apply &amp; Reconnect</span>
            </button>
          )}

          {!isConnected ? (
            <button
              type="button"
              onClick={onConnect}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Usb className="h-3.5 w-3.5" />
              <span>Connect {comPortLabel}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onDisconnect}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Unplug className="h-3.5 w-3.5" />
              <span>Disconnect</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <span>{expanded ? 'Hide Settings' : 'Configure'}</span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Column 1: COM Port & Web Serial Device Selection */}
          <div className="lg:col-span-4 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">
                1. COM Port &amp; USB Device Mapping
              </h3>
              <button
                type="button"
                onClick={onScanPorts}
                disabled={!webSerialSupported}
                className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 disabled:text-slate-400 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Scan Ports</span>
              </button>
            </div>

            {/* OS COM Port Label Selector (Synced to Python / MATLAB scripts) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="com-port-select" className="font-medium text-slate-700">
                  Target COM / TTY Port
                </label>
                <button
                  type="button"
                  onClick={() => setCustomComMode((v) => !v)}
                  className="cursor-pointer text-[11px] font-semibold text-sky-700 hover:text-sky-900"
                >
                  {customComMode ? 'Use Preset List' : 'Enter Custom Port'}
                </button>
              </div>

              {customComMode ? (
                <input
                  id="com-port-select"
                  type="text"
                  value={comPortLabel}
                  onChange={(e) => onComPortLabelChange(e.target.value)}
                  placeholder="e.g. COM11 or /dev/ttyUSB0"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                />
              ) : (
                <select
                  id="com-port-select"
                  value={
                    COMMON_COM_PORTS.includes(
                      comPortLabel as (typeof COMMON_COM_PORTS)[number]
                    )
                      ? comPortLabel
                      : COMMON_COM_PORTS[2]
                  }
                  onChange={(e) => onComPortLabelChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                >
                  {COMMON_COM_PORTS.map((portName) => (
                    <option key={portName} value={portName}>
                      {portName}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-slate-500">
                Synced with the Python &amp; MATLAB serial logger scripts below.
              </p>
            </div>

            {/* Browser Web Serial Paired Port Picker */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="web-serial-port-select" className="font-medium text-slate-700">
                  Authorized Web Serial Hardware
                </label>
                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                  {pairedPorts.length} paired
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  id="web-serial-port-select"
                  value={selectedPortIndex}
                  disabled={!webSerialSupported || isConnected}
                  onChange={(e) => onSelectPortIndex(parseInt(e.target.value, 10))}
                  className="flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 disabled:bg-slate-100 truncate"
                >
                  <option value={-1}>
                    {webSerialSupported
                      ? 'Prompt browser port picker on connect'
                      : 'Web Serial unavailable (use desktop Chrome/Edge)'}
                  </option>
                  {pairedPorts.map((p, idx) => (
                    <option key={`paired-${idx}`} value={idx}>
                      {describeUsbSerialPort(p, idx)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={onPairNewPort}
                  disabled={!webSerialSupported}
                  className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 hover:border-sky-400 hover:text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  Pair Port
                </button>
              </div>

              <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterEsp32Vendors}
                  onChange={(e) => onFilterEsp32VendorsChange(e.target.checked)}
                  className="accent-sky-600 rounded"
                />
                <span>Filter picker to ESP32 USB-UART bridges (CP210x, CH340, Espressif, FTDI)</span>
              </label>
            </div>
          </div>

          {/* Column 2: Baud Rate & UART Framing */}
          <div className="lg:col-span-4 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">
                2. Baud Rate &amp; UART Frame Format
              </h3>
              <button
                type="button"
                onClick={() => {
                  const next = !showCustomBaud;
                  setShowCustomBaud(next);
                  if (next) setCustomBaudInput(String(baudRate));
                }}
                className="cursor-pointer text-[11px] font-semibold text-sky-700 hover:text-sky-900"
              >
                {showCustomBaud ? 'Preset Grid' : 'Custom Baud'}
              </button>
            </div>

            {showCustomBaud ? (
              <div className="space-y-1.5">
                <label htmlFor="custom-baud-input" className="block text-xs font-medium text-slate-700">
                  Custom Baud Rate (bps)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="custom-baud-input"
                    type="number"
                    min={1200}
                    max={2000000}
                    step={100}
                    value={customBaudInput}
                    onChange={(e) => {
                      setCustomBaudInput(e.target.value);
                      const parsed = parseInt(e.target.value, 10);
                      if (Number.isFinite(parsed) && parsed >= 1200 && parsed <= 2000000) {
                        onBaudRateChange(parsed);
                      }
                    }}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 tabular-nums focus:border-sky-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onBaudRateChange(115200);
                      setCustomBaudInput('115200');
                      setShowCustomBaud(false);
                    }}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 font-mono text-xs font-semibold text-slate-700 hover:border-sky-400 whitespace-nowrap shrink-0"
                  >
                    115200
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_BAUD_RATES.map((rate) => {
                  const active = baudRate === rate;
                  return (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => onBaudRateChange(rate)}
                      className={`cursor-pointer rounded-lg border py-1.5 font-mono text-xs font-semibold tabular-nums transition-colors ${
                        active
                          ? 'border-sky-600 bg-sky-50 text-sky-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {rate}
                    </button>
                  );
                })}
              </div>
            )}

            {/* UART Framing Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-xs">
              <label className="space-y-1">
                <span className="block text-[11px] font-medium text-slate-600">Data Bits</span>
                <select
                  value={dataBits}
                  onChange={(e) => onDataBitsChange(parseInt(e.target.value, 10) as 7 | 8)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-900"
                >
                  <option value={8}>8 bit</option>
                  <option value={7}>7 bit</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="block text-[11px] font-medium text-slate-600">Parity</span>
                <select
                  value={parity}
                  onChange={(e) =>
                    onParityChange(e.target.value as 'none' | 'even' | 'odd')
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-900"
                >
                  <option value="none">None</option>
                  <option value="even">Even</option>
                  <option value="odd">Odd</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="block text-[11px] font-medium text-slate-600">Stop Bits</span>
                <select
                  value={stopBits}
                  onChange={(e) => onStopBitsChange(parseInt(e.target.value, 10) as 1 | 2)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-900"
                >
                  <option value={1}>1 stop</option>
                  <option value={2}>2 stop</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="block text-[11px] font-medium text-slate-600">Flow Ctrl</span>
                <select
                  value={flowControl}
                  onChange={(e) =>
                    onFlowControlChange(e.target.value as 'none' | 'hardware')
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-900"
                >
                  <option value="none">None</option>
                  <option value="hardware">RTS/CTS</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
              <span>Throughput ceiling: ~{maxBytesPerSec.toLocaleString()} B/s</span>
              <span>ESP32 default: 115200 · 8N1</span>
            </div>
          </div>

          {/* Column 3: Stability & Link Guardrails */}
          <div className="lg:col-span-4 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">
                3. Link Stability &amp; Reset Guard
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCustomComMode(false);
                  setShowCustomBaud(false);
                  setCustomBaudInput('115200');
                  onResetDefaults();
                }}
                className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <label className="space-y-1">
                <span className="block text-[11px] font-medium text-slate-600">
                  DTR / RTS Boot Guard
                </span>
                <select
                  value={dtrRtsMode}
                  onChange={(e) => onDtrRtsModeChange(e.target.value as DtrRtsMode)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                >
                  <option value="hold_low">Hold Low (Prevent Reset)</option>
                  <option value="normal">Standard (DTR High)</option>
                  <option value="pulse_reset">Pulse Reset on Connect</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="block text-[11px] font-medium text-slate-600">
                  RX Stream Buffer
                </span>
                <select
                  value={bufferSize}
                  onChange={(e) => onBufferSizeChange(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900"
                >
                  <option value={1024}>1024 bytes</option>
                  <option value={4096}>4096 bytes</option>
                  <option value={8192}>8192 bytes (Recommended)</option>
                  <option value={16384}>16384 bytes</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={autoReconnect}
                  onChange={(e) => onAutoReconnectChange(e.target.checked)}
                  className="accent-sky-600 rounded"
                />
                <span>Auto-reconnect on USB drop</span>
              </label>

              <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                <span>TX EOL:</span>
                <select
                  value={txLineEnding}
                  onChange={(e) => onTxLineEndingChange(e.target.value as TxLineEnding)}
                  className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-900"
                >
                  <option value="lf">\n (LF)</option>
                  <option value="crlf">\r\n (CRLF)</option>
                  <option value="cr">\r (CR)</option>
                </select>
              </label>
            </div>

            {/* Link Health Telemetry Strip */}
            <div className="border-t border-slate-100 pt-3 grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <div className="text-slate-500">Valid Frames</div>
                <div className="font-mono font-bold text-slate-950 tabular-nums mt-0.5">
                  {rxFrameCount}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Parse Mismatch</div>
                <div
                  className={`font-mono font-bold tabular-nums mt-0.5 ${
                    parseErrorCount > 0 ? 'text-amber-700' : 'text-slate-950'
                  }`}
                >
                  {parseErrorCount}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Reconnects</div>
                <div className="font-mono font-bold text-slate-950 tabular-nums mt-0.5">
                  {reconnectCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
