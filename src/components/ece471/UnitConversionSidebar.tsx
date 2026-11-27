import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Calculator,
  Check,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
} from 'lucide-react';
import { convertPerUnitImpedance } from '../../utils/powerMath';

interface UnitConversionSidebarProps {
  activeSBaseMva: number;
  activeVBaseKv: number;
  activeFaultBusName?: string;
}

function fmtNum(val: number, decimals = 4): string {
  if (!Number.isFinite(val)) return '0';
  const rounded = Number(val.toFixed(decimals));
  return String(rounded);
}

function parseSafe(str: string): number {
  const n = Number(str);
  return Number.isFinite(n) ? n : 0;
}

export const UnitConversionSidebar: React.FC<UnitConversionSidebarProps> = ({
  activeSBaseMva,
  activeVBaseKv,
  activeFaultBusName = 'Fault Bus',
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState<'pu_phys' | 'base_change'>('pu_phys');
  const [syncedNotice, setSyncedNotice] = useState(false);

  // System Base values
  const [sBaseMva, setSBaseMva] = useState<number>(activeSBaseMva || 100);
  const [vBaseKv, setVBaseKv] = useState<number>(activeVBaseKv || 132);

  // Derived bases: I_base (kA) = S_base / (sqrt(3) * V_base), Z_base (Ohm) = V_base^2 / S_base
  const safeSBase = Math.max(0.01, sBaseMva);
  const safeVBase = Math.max(0.01, vBaseKv);
  const iBaseKa = safeSBase / (Math.sqrt(3) * safeVBase);
  const zBaseOhm = (safeVBase * safeVBase) / safeSBase;

  // Bidirectional Physical <-> PU input strings
  const [vKvStr, setVKvStr] = useState<string>(fmtNum(activeVBaseKv || 132, 3));
  const [vPuStr, setVPuStr] = useState<string>('1');

  const [sMvaStr, setSMvaStr] = useState<string>(fmtNum(activeSBaseMva || 100, 3));
  const [sPuStr, setSPuStr] = useState<string>('1');

  const [iKaStr, setIKaStr] = useState<string>(fmtNum(iBaseKa * 1.25, 4));
  const [iPuStr, setIPuStr] = useState<string>('1.25');

  const [rOhmStr, setROhmStr] = useState<string>(fmtNum(0.02 * zBaseOhm, 3));
  const [xOhmStr, setXOhmStr] = useState<string>(fmtNum(0.2 * zBaseOhm, 3));
  const [rPuStr, setRPuStr] = useState<string>('0.02');
  const [xPuStr, setXPuStr] = useState<string>('0.2');

  // Base-change calculator state
  const [oldSBase, setOldSBase] = useState<number>(50);
  const [oldVBase, setOldVBase] = useState<number>(138);
  const [oldRPu, setOldRPu] = useState<number>(0.015);
  const [oldXPu, setOldXPu] = useState<number>(0.18);
  const [newSBase, setNewSBase] = useState<number>(activeSBaseMva || 100);
  const [newVBase, setNewVBase] = useState<number>(activeVBaseKv || 132);

  const recalcPuFromBase = (nextS: number, nextV: number) => {
    const s = Math.max(0.01, nextS);
    const v = Math.max(0.01, nextV);
    const nextI = s / (Math.sqrt(3) * v);
    const nextZ = (v * v) / s;

    setVPuStr(fmtNum(parseSafe(vKvStr) / v, 4));
    setSPuStr(fmtNum(parseSafe(sMvaStr) / s, 4));
    setIPuStr(fmtNum(parseSafe(iKaStr) / nextI, 4));
    setRPuStr(fmtNum(parseSafe(rOhmStr) / nextZ, 5));
    setXPuStr(fmtNum(parseSafe(xOhmStr) / nextZ, 5));
  };

  const handleSBaseChange = (val: number) => {
    const nextS = Math.max(0.01, val || 0.01);
    setSBaseMva(nextS);
    recalcPuFromBase(nextS, vBaseKv);
  };

  const handleVBaseChange = (val: number) => {
    const nextV = Math.max(0.01, val || 0.01);
    setVBaseKv(nextV);
    recalcPuFromBase(sBaseMva, nextV);
  };

  const handleSyncToActiveBus = () => {
    const nextS = Math.max(0.01, activeSBaseMva || 100);
    const nextV = Math.max(0.01, activeVBaseKv || 132);
    setSBaseMva(nextS);
    setVBaseKv(nextV);
    setNewSBase(nextS);
    setNewVBase(nextV);
    recalcPuFromBase(nextS, nextV);
    setSyncedNotice(true);
    window.setTimeout(() => setSyncedNotice(false), 1600);
  };

  // Individual bidirectional handlers
  const handleVKvChange = (str: string) => {
    setVKvStr(str);
    setVPuStr(fmtNum(parseSafe(str) / safeVBase, 4));
  };
  const handleVPuChange = (str: string) => {
    setVPuStr(str);
    setVKvStr(fmtNum(parseSafe(str) * safeVBase, 3));
  };

  const handleSMvaChange = (str: string) => {
    setSMvaStr(str);
    setSPuStr(fmtNum(parseSafe(str) / safeSBase, 4));
  };
  const handleSPuChange = (str: string) => {
    setSPuStr(str);
    setSMvaStr(fmtNum(parseSafe(str) * safeSBase, 3));
  };

  const handleIKaChange = (str: string) => {
    setIKaStr(str);
    setIPuStr(fmtNum(parseSafe(str) / iBaseKa, 4));
  };
  const handleIPuChange = (str: string) => {
    setIPuStr(str);
    setIKaStr(fmtNum(parseSafe(str) * iBaseKa, 4));
  };

  const handleROhmChange = (str: string) => {
    setROhmStr(str);
    setRPuStr(fmtNum(parseSafe(str) / zBaseOhm, 5));
  };
  const handleXOhmChange = (str: string) => {
    setXOhmStr(str);
    setXPuStr(fmtNum(parseSafe(str) / zBaseOhm, 5));
  };
  const handleRPuChange = (str: string) => {
    setRPuStr(str);
    setROhmStr(fmtNum(parseSafe(str) * zBaseOhm, 3));
  };
  const handleXPuChange = (str: string) => {
    setXPuStr(str);
    setXOhmStr(fmtNum(parseSafe(str) * zBaseOhm, 3));
  };

  // Derived polar Z
  const zPolarSummary = useMemo(() => {
    const rOhm = parseSafe(rOhmStr);
    const xOhm = parseSafe(xOhmStr);
    const rPu = parseSafe(rPuStr);
    const xPu = parseSafe(xPuStr);
    const magOhm = Math.hypot(rOhm, xOhm);
    const magPu = Math.hypot(rPu, xPu);
    const angDeg = (Math.atan2(xPu, rPu) * 180) / Math.PI;
    return { magOhm, magPu, angDeg };
  }, [rOhmStr, xOhmStr, rPuStr, xPuStr]);

  // Derived base-change Z_new
  const baseChangeRes = useMemo(() => {
    const rNew = convertPerUnitImpedance(oldRPu, oldSBase, newSBase, oldVBase, newVBase);
    const xNew = convertPerUnitImpedance(oldXPu, oldSBase, newSBase, oldVBase, newVBase);
    const magNew = Math.hypot(rNew, xNew);
    const angNew = (Math.atan2(xNew, rNew) * 180) / Math.PI;
    const zNewBaseOhm = (Math.max(0.01, newVBase) ** 2) / Math.max(0.01, newSBase);
    const zNewOhm = magNew * zNewBaseOhm;
    return { rNew, xNew, magNew, angNew, zNewOhm, zNewBaseOhm };
  }, [oldRPu, oldXPu, oldSBase, oldVBase, newSBase, newVBase]);

  const converterBody = (
    <div className="p-3.5 space-y-4 text-xs">
      {/* System Base Card */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-900">System Base Values</span>
          <button
            type="button"
            onClick={handleSyncToActiveBus}
            title={`Sync S_base and V_base to ${activeFaultBusName}`}
            className="inline-flex items-center gap-1 cursor-pointer rounded border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 whitespace-nowrap shrink-0"
          >
            {syncedNotice ? (
              <>
                <Check className="w-3 h-3 text-emerald-700" />
                <span>Synced</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                <span>Sync Bus</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-[10px] font-medium text-slate-600 mb-0.5">
              S_base (MVA)
            </span>
            <input
              type="number"
              min={0.1}
              step={10}
              value={sBaseMva}
              onChange={(e) => handleSBaseChange(Number(e.target.value))}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono tabular-nums text-xs text-slate-950"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] font-medium text-slate-600 mb-0.5">
              V_base (kV_LL)
            </span>
            <input
              type="number"
              min={0.1}
              step={1}
              value={vBaseKv}
              onChange={(e) => handleVBaseChange(Number(e.target.value))}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono tabular-nums text-xs text-slate-950"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200 font-mono tabular-nums text-[11px]">
          <div>
            <span className="block font-sans text-[10px] text-slate-500">I_base</span>
            <span className="font-bold text-slate-950">{iBaseKa.toFixed(4)} kA</span>
          </div>
          <div>
            <span className="block font-sans text-[10px] text-slate-500">Z_base</span>
            <span className="font-bold text-slate-950">{zBaseOhm.toFixed(2)} Ω</span>
          </div>
        </div>
      </div>

      {/* Mode Switcher: Physical <-> pu | Base Change */}
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode('pu_phys')}
          className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
            mode === 'pu_phys'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          Physical ↔ pu
        </button>
        <button
          type="button"
          onClick={() => setMode('base_change')}
          className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
            mode === 'base_change'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          Base Change
        </button>
      </div>

      {mode === 'pu_phys' ? (
        <div className="space-y-3">
          {/* Voltage kV <-> pu */}
          <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-900">Voltage (V_LL)</span>
              <span className="font-mono text-[10px] text-slate-500">V_pu = kV / V_base</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">kV</span>
                <input
                  type="number"
                  step={0.5}
                  value={vKvStr}
                  onChange={(e) => handleVKvChange(e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs"
                />
              </label>
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400 mt-4" aria-hidden="true" />
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">pu</span>
                <input
                  type="number"
                  step={0.01}
                  value={vPuStr}
                  onChange={(e) => handleVPuChange(e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs text-emerald-900 font-semibold"
                />
              </label>
            </div>
          </div>

          {/* Power MVA <-> pu */}
          <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-900">Apparent Power (S)</span>
              <span className="font-mono text-[10px] text-slate-500">S_pu = MVA / S_base</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">MVA</span>
                <input
                  type="number"
                  step={5}
                  value={sMvaStr}
                  onChange={(e) => handleSMvaChange(e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs"
                />
              </label>
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400 mt-4" aria-hidden="true" />
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">pu</span>
                <input
                  type="number"
                  step={0.05}
                  value={sPuStr}
                  onChange={(e) => handleSPuChange(e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs text-emerald-900 font-semibold"
                />
              </label>
            </div>
          </div>

          {/* Current kA <-> pu */}
          <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-900">Line Current (I)</span>
              <span className="font-mono text-[10px] text-slate-500">I_pu = kA / I_base</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">kA</span>
                <input
                  type="number"
                  step={0.05}
                  value={iKaStr}
                  onChange={(e) => handleIKaChange(e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs"
                />
              </label>
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400 mt-4" aria-hidden="true" />
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">pu</span>
                <input
                  type="number"
                  step={0.05}
                  value={iPuStr}
                  onChange={(e) => handleIPuChange(e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs text-sky-900 font-semibold"
                />
              </label>
            </div>
          </div>

          {/* Complex Impedance R+jX (Ohm <-> pu) */}
          <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-900">Impedance (R + jX)</span>
              <span className="font-mono text-[10px] text-slate-500">Z_pu = Z_Ω / Z_base</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">R (Ω)</span>
                <input
                  type="number"
                  step={0.5}
                  value={rOhmStr}
                  onChange={(e) => handleROhmChange(e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs"
                />
              </label>
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">X (Ω)</span>
                <input
                  type="number"
                  step={0.5}
                  value={xOhmStr}
                  onChange={(e) => handleXOhmChange(e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs"
                />
              </label>
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">R (pu)</span>
                <input
                  type="number"
                  step={0.005}
                  value={rPuStr}
                  onChange={(e) => handleRPuChange(e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs text-amber-900 font-semibold"
                />
              </label>
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">X (pu)</span>
                <input
                  type="number"
                  step={0.01}
                  value={xPuStr}
                  onChange={(e) => handleXPuChange(e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs text-amber-900 font-semibold"
                />
              </label>
            </div>

            <div className="rounded border border-slate-100 bg-slate-50 px-2 py-1.5 font-mono tabular-nums text-[10px] text-slate-700 space-y-0.5">
              <div>
                |Z| = {zPolarSummary.magOhm.toFixed(2)} Ω ∠ {zPolarSummary.angDeg.toFixed(1)}°
              </div>
              <div className="font-semibold text-slate-900">
                |Z| = {zPolarSummary.magPu.toFixed(4)} pu ∠ {zPolarSummary.angDeg.toFixed(1)}°
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Per-Unit Base Change Calculator */
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
            <div className="text-[11px] font-semibold text-slate-900">
              Original Equipment Rating (Old Base)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">S_old (MVA)</span>
                <input
                  type="number"
                  min={0.1}
                  step={5}
                  value={oldSBase}
                  onChange={(e) => setOldSBase(Math.max(0.01, Number(e.target.value) || 0.01))}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs"
                />
              </label>
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">V_old (kV)</span>
                <input
                  type="number"
                  min={0.1}
                  step={1}
                  value={oldVBase}
                  onChange={(e) => setOldVBase(Math.max(0.01, Number(e.target.value) || 0.01))}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs"
                />
              </label>
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">R_old (pu)</span>
                <input
                  type="number"
                  step={0.005}
                  value={oldRPu}
                  onChange={(e) => setOldRPu(Number(e.target.value) || 0)}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs"
                />
              </label>
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">X_old (pu)</span>
                <input
                  type="number"
                  step={0.01}
                  value={oldXPu}
                  onChange={(e) => setOldXPu(Number(e.target.value) || 0)}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs"
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-900">Target System Base</span>
              <button
                type="button"
                onClick={() => {
                  setNewSBase(safeSBase);
                  setNewVBase(safeVBase);
                }}
                className="cursor-pointer text-[10px] font-semibold text-emerald-700 hover:underline"
              >
                Use Top Base
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">S_new (MVA)</span>
                <input
                  type="number"
                  min={0.1}
                  step={10}
                  value={newSBase}
                  onChange={(e) => setNewSBase(Math.max(0.01, Number(e.target.value) || 0.01))}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs"
                />
              </label>
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-0.5">V_new (kV)</span>
                <input
                  type="number"
                  min={0.1}
                  step={1}
                  value={newVBase}
                  onChange={(e) => setNewVBase(Math.max(0.01, Number(e.target.value) || 0.01))}
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono tabular-nums text-xs"
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
              Converted Z_new (pu)
            </div>
            <div className="font-mono tabular-nums text-sm font-bold text-emerald-950">
              {baseChangeRes.rNew.toFixed(4)} + j{baseChangeRes.xNew.toFixed(4)} pu
            </div>
            <div className="font-mono tabular-nums text-[11px] text-emerald-800">
              |Z_new| = {baseChangeRes.magNew.toFixed(4)} ∠ {baseChangeRes.angNew.toFixed(1)}° pu
            </div>
            <div className="font-mono tabular-nums text-[10px] text-slate-600 pt-1 border-t border-emerald-200/70">
              Ohmic invariance: {baseChangeRes.zNewOhm.toFixed(2)} Ω
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile / Tablet Collapsible Utility Strip */}
      <div className="lg:hidden w-full order-first rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="cursor-pointer w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/70 text-xs font-bold text-slate-900"
        >
          <span className="inline-flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-700" />
            <span>Unit Converter (kV · MVA · kA · Ω ↔ pu)</span>
          </span>
          <span className="font-mono text-[11px] text-slate-600">
            {mobileOpen ? 'Hide' : 'Open'}
          </span>
        </button>
        {mobileOpen && <div className="border-t border-slate-200">{converterBody}</div>}
      </div>

      {/* Desktop Right-Side Collapsible Utility Sidebar */}
      <aside
        aria-label="Power System Unit Conversion Sidebar"
        className={`hidden lg:flex lg:flex-col shrink-0 lg:sticky lg:top-20 rounded-xl border border-slate-200 bg-white overflow-hidden transition-[width] duration-200 ${
          collapsed ? 'lg:w-[54px]' : 'lg:w-[296px]'
        }`}
      >
        <div
          className={`flex items-center border-b border-slate-200 bg-slate-50/70 px-3 py-2.5 ${
            collapsed ? 'justify-center' : 'justify-between gap-2'
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Calculator className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-xs font-bold text-slate-900 truncate">
                Unit Converter
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand unit conversion sidebar' : 'Collapse unit conversion sidebar'}
            title={collapsed ? 'Expand unit conversion sidebar' : 'Collapse unit conversion sidebar'}
            className="cursor-pointer rounded-md p-1.5 text-slate-600 hover:bg-slate-200/70 hover:text-slate-950 shrink-0"
          >
            {collapsed ? (
              <PanelRightOpen className="h-4 w-4" />
            ) : (
              <PanelRightClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {collapsed ? (
          <div className="py-3 flex flex-col items-center gap-3 text-[10px] font-mono font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              title="Open kV, MVA, kA, Ohm and per-unit converter"
              className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
            >
              pu
            </button>
            <div className="text-center leading-tight text-slate-400">
              <div>{Math.round(safeSBase)}</div>
              <div>MVA</div>
            </div>
            <div className="text-center leading-tight text-slate-400">
              <div>{Math.round(safeVBase)}</div>
              <div>kV</div>
            </div>
          </div>
        ) : (
          converterBody
        )}
      </aside>
    </>
  );
};
