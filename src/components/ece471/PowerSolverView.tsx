import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { POWER_WORKED_EXAMPLES } from '../../data/ece471PracticeData';
import { POWER_MODULE_META } from '../../data/ece471SyllabusData';
import { PowerFailedAttempt, PowerModule } from '../../types/ece471';
import {
  cAngDeg,
  cFmtPolar,
  cMag,
  computeBewleyLattice,
  computeLineParameters,
  computePeekCorona,
  cpx,
  cpxFromPolar,
  decomposeSymmetrical,
  FaultType,
  solveEconomicDispatch,
  solvePowerFault,
} from '../../utils/powerMath';

interface PowerSolverViewProps {
  initialCalcId?: string;
  masteredExamples: string[];
  onToggleMastered: (id: string) => void;
  onRecordSolverFailure: (
    failure: Omit<PowerFailedAttempt, 'failCount' | 'lastFailedAt'>
  ) => void;
}

type CalcKey =
  | 'dc_ac_resistance'
  | 'line_inductance'
  | 'line_capacitance'
  | 'bundled_gmr'
  | 'peek_corona'
  | 'econ_dispatch'
  | 'symmetrical_comp'
  | 'power_faults'
  | 'pu_traveling_wave';

const CALC_TABS: { id: CalcKey; label: string }[] = [
  { id: 'dc_ac_resistance', label: '1. DC/AC Resistance (Q3)' },
  { id: 'line_inductance', label: '2. GMR & Inductance (Q4)' },
  { id: 'line_capacitance', label: '3. Capacitance & I_c (Q5)' },
  { id: 'bundled_gmr', label: '4. Bundled GMR (Q6)' },
  { id: 'peek_corona', label: '5. Peek Corona V_d & P_c (Q7)' },
  { id: 'econ_dispatch', label: '6. Economic Dispatch λ' },
  { id: 'symmetrical_comp', label: '7. Fortescue 0/1/2' },
  { id: 'power_faults', label: '8. SLG / LL / DLG Faults' },
  { id: 'pu_traveling_wave', label: '9. Bewley Wave Lattice' },
];

export const PowerSolverView: React.FC<PowerSolverViewProps> = ({
  initialCalcId,
  masteredExamples,
  onToggleMastered,
  onRecordSolverFailure,
}) => {
  const [activeCalc, setActiveCalc] = useState<CalcKey>(
    (initialCalcId as CalcKey) || 'peek_corona'
  );

  useEffect(() => {
    if (initialCalcId) {
      setActiveCalc(initialCalcId as CalcKey);
    }
  }, [initialCalcId]);

  // Q3: Resistance
  const [rhoCoeff, setRhoCoeff] = useState(2.82); // x1e-8
  const [areaMm2, setAreaMm2] = useState(250);
  const [lenKm, setLenKm] = useState(100);
  const [acFactor, setAcFactor] = useState(1.15);

  const resCalc = useMemo(
    () =>
      computeLineParameters({
        topology: 'three_phase_equilateral',
        bundleCount: 1,
        radiusCm: 1,
        bundleSpacingCm: 40,
        dabM: 4,
        dbcM: 4,
        dcaM: 4,
        lengthKm: lenKm,
        areaMm2,
        resistivityOhmM: rhoCoeff * 1e-8,
        acSkinFactor: acFactor,
        lineVoltageKv: 132,
        freqHz: 50,
      }),
    [rhoCoeff, areaMm2, lenKm, acFactor]
  );

  // Q4: 1-phase 2-wire inductance
  const [indD_m, setIndD_m] = useState(2.0);
  const [indR_cm, setIndR_cm] = useState(1.0);
  const indCalc = useMemo(
    () =>
      computeLineParameters({
        topology: 'single_phase_2wire',
        bundleCount: 1,
        radiusCm: indR_cm,
        bundleSpacingCm: 40,
        dabM: indD_m,
        dbcM: indD_m,
        dcaM: indD_m,
        lengthKm: 1,
        areaMm2: 250,
        resistivityOhmM: 2.82e-8,
        acSkinFactor: 1.15,
        lineVoltageKv: 11,
        freqHz: 50,
      }),
    [indD_m, indR_cm]
  );

  // Q5: 3-phase Capacitance & Charging Current
  const [capD_m, setCapD_m] = useState(4.0);
  const [capR_cm, setCapR_cm] = useState(1.0);
  const [capV_kv, setCapV_kv] = useState(132);
  const [capF_hz, setCapF_hz] = useState(50);
  const capCalc = useMemo(
    () =>
      computeLineParameters({
        topology: 'three_phase_equilateral',
        bundleCount: 1,
        radiusCm: capR_cm,
        bundleSpacingCm: 40,
        dabM: capD_m,
        dbcM: capD_m,
        dcaM: capD_m,
        lengthKm: 1,
        areaMm2: 250,
        resistivityOhmM: 2.82e-8,
        acSkinFactor: 1.15,
        lineVoltageKv: capV_kv,
        freqHz: capF_hz,
      }),
    [capD_m, capR_cm, capV_kv, capF_hz]
  );

  // Q6: Bundled Conductor
  const [bunR_cm, setBunR_cm] = useState(1.5);
  const [bunD_cm, setBunD_cm] = useState(40);
  const [bunPhase_m, setBunPhase_m] = useState(8);
  const bunCalc = useMemo(
    () =>
      computeLineParameters({
        topology: 'three_phase_equilateral',
        bundleCount: 2,
        radiusCm: bunR_cm,
        bundleSpacingCm: bunD_cm,
        dabM: bunPhase_m,
        dbcM: bunPhase_m,
        dcaM: bunPhase_m,
        lengthKm: 1,
        areaMm2: 250,
        resistivityOhmM: 2.82e-8,
        acSkinFactor: 1.15,
        lineVoltageKv: 220,
        freqHz: 50,
      }),
    [bunR_cm, bunD_cm, bunPhase_m]
  );

  // Q7: Peek Corona
  const [pkV_kv, setPkV_kv] = useState(260);
  const [pkR_cm, setPkR_cm] = useState(1.0);
  const [pkD_cm, setPkD_cm] = useState(300);
  const [pkF_hz, setPkF_hz] = useState(50);
  const [pkDelta, setPkDelta] = useState(1.0);
  const [pkM0, setPkM0] = useState(0.85);
  const [pkOverrideVd, setPkOverrideVd] = useState<string>('133.1');

  const pkCalcVd = useMemo(
    () =>
      computePeekCorona({
        operatingLineKv: pkV_kv,
        radiusCm: pkR_cm,
        spacingCm: pkD_cm,
        freqHz: pkF_hz,
        airDensityFactor: pkDelta,
        surfaceFactorM0: pkM0,
      }),
    [pkV_kv, pkR_cm, pkD_cm, pkF_hz, pkDelta, pkM0]
  );

  const pkLossCalc = useMemo(() => {
    const parsed = Number(pkOverrideVd);
    return computePeekCorona({
      operatingLineKv: pkV_kv,
      radiusCm: pkR_cm,
      spacingCm: pkD_cm,
      freqHz: pkF_hz,
      airDensityFactor: pkDelta,
      surfaceFactorM0: pkM0,
      overrideVdKv: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
    });
  }, [pkV_kv, pkR_cm, pkD_cm, pkF_hz, pkDelta, pkM0, pkOverrideVd]);

  // Calc 6: Economic Dispatch
  const [edLoad, setEdLoad] = useState(420);
  const edCalc = useMemo(
    () =>
      solveEconomicDispatch(
        [
          { id: '1', name: 'Gen 1', a: 200, b: 7.0, c: 0.008, pMin: 50, pMax: 300 },
          { id: '2', name: 'Gen 2', a: 180, b: 6.3, c: 0.009, pMin: 50, pMax: 250 },
        ],
        edLoad,
        true
      ),
    [edLoad]
  );

  // Calc 7: Symmetrical Components
  const [symVa, setSymVa] = useState(1.0);
  const [symVb, setSymVb] = useState(0.8);
  const [symVc, setSymVc] = useState(1.1);
  const symCalc = useMemo(
    () =>
      decomposeSymmetrical(
        cpxFromPolar(symVa, 0),
        cpxFromPolar(symVb, -120),
        cpxFromPolar(symVc, 120)
      ),
    [symVa, symVb, symVc]
  );

  // Calc 8: Power Faults
  const [fltType, setFltType] = useState<FaultType>('slg');
  const [fltX1, setFltX1] = useState(0.2);
  const [fltX0, setFltX0] = useState(0.05);
  const fltCalc = useMemo(
    () =>
      solvePowerFault({
        faultType: fltType,
        ePreFaultPu: 1.0,
        z1: cpx(0, fltX1),
        z2: cpx(0, fltX1),
        z0: cpx(0, fltX0),
        zf: cpx(0, 0),
        sBaseMva: 100,
        vBaseLineKv: 13.8,
      }),
    [fltType, fltX1, fltX0]
  );

  // Calc 9: Bewley Wave
  const [bwV, setBwV] = useState(100);
  const [bwZs, setBwZs] = useState(100);
  const [bwZc, setBwZc] = useState(400);
  const bwCalc = useMemo(
    () =>
      computeBewleyLattice({
        vStepKv: bwV,
        zSourceOhm: bwZs,
        zLineOhm: bwZc,
        zLoadOhm: 1e9,
        lineLengthKm: 150,
      }),
    [bwV, bwZs, bwZc]
  );

  // Hand check
  const [handInput, setHandInput] = useState('');
  const [handFeedback, setHandFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [exampleFilter, setExampleFilter] = useState<'all' | PowerModule>('all');

  const getActiveTarget = (): { label: string; expected: number; module: PowerModule } => {
    switch (activeCalc) {
      case 'dc_ac_resistance':
        return { label: 'R_ac per phase (Ω)', expected: resCalc.rAcPerPhaseOhm, module: PowerModule.LINE_CORONA };
      case 'line_inductance':
        return { label: 'Total 2-wire L per km (mH/km)', expected: indCalc.inductanceTotalPerKmMh, module: PowerModule.LINE_CORONA };
      case 'line_capacitance':
        return { label: 'Charging current I_c (A/km)', expected: capCalc.chargingCurrentAPerKm, module: PowerModule.LINE_CORONA };
      case 'bundled_gmr':
        return { label: 'Bundle GMR D_sb (cm)', expected: bunCalc.bundleGmrL_M * 100, module: PowerModule.LINE_CORONA };
      case 'peek_corona':
        return { label: 'Corona loss P_c (kW/km/phase)', expected: pkLossCalc.lossPerKmPerPhaseKw, module: PowerModule.LINE_CORONA };
      case 'econ_dispatch':
        return { label: 'System λ ($/MWh)', expected: edCalc.lambda, module: PowerModule.DISPATCH_AGC };
      case 'symmetrical_comp':
        return { label: 'Positive-sequence |V₁| (pu)', expected: cMag(symCalc.v1), module: PowerModule.SYMMETRICAL };
      case 'power_faults':
        return { label: 'Fault current |I_f| (kA)', expected: fltCalc.faultCurrentKa, module: PowerModule.FAULTS };
      case 'pu_traveling_wave':
        return { label: 'First open-end Load V (kV)', expected: bwCalc.bounces[0]?.loadVoltageKv ?? 0, module: PowerModule.TRANSIENTS };
    }
  };

  const checkHandAnswer = () => {
    const target = getActiveTarget();
    const num = Number(handInput);
    if (!Number.isFinite(num) || handInput.trim() === '') {
      setHandFeedback({ ok: false, msg: 'Enter a valid numeric answer first.' });
      return;
    }
    const tol = Math.max(0.05, Math.abs(target.expected) * 0.03);
    if (Math.abs(num - target.expected) <= tol) {
      setHandFeedback({
        ok: true,
        msg: `Correct! ${target.label} = ${target.expected.toFixed(3)}`,
      });
    } else {
      const reason = `Expected ${target.expected.toFixed(3)} for ${target.label}, entered ${num}`;
      setHandFeedback({ ok: false, msg: `Not quite — ${reason}. Added to Weak Topics.` });
      onRecordSolverFailure({
        id: `calc_${activeCalc}`,
        title: CALC_TABS.find((t) => t.id === activeCalc)?.label || activeCalc,
        module: target.module,
        source: 'calculator',
        recommendedCalc: activeCalc,
        lastReason: reason,
      });
    }
  };

  const filteredExamples =
    exampleFilter === 'all'
      ? POWER_WORKED_EXAMPLES
      : POWER_WORKED_EXAMPLES.filter((ex) => ex.module === exampleFilter);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">
          ECE 471 Solver, CAT 1 Calculators &amp; Worked Solutions
        </h1>
        <p className="mt-1 text-sm text-slate-600 max-w-2xl">
          Interactive parameter solvers pre-configured with CAT 1 Q3–Q7 defaults, hand-calculation verification, and full step-by-step worked solutions.
        </p>
      </div>

      {/* Calculator Selector Tabs */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-4">
          {CALC_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveCalc(t.id);
                setHandFeedback(null);
              }}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeCalc === t.id
                  ? 'bg-emerald-700 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Calc Body */}
        {activeCalc === 'dc_ac_resistance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-500">Resistivity ρ (×10⁻⁸ Ω·m)</label>
                <input type="number" step={0.01} value={rhoCoeff} onChange={(e) => setRhoCoeff(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Area A (mm²)</label>
                <input type="number" step={10} value={areaMm2} onChange={(e) => setAreaMm2(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Length l (km)</label>
                <input type="number" step={5} value={lenKm} onChange={(e) => setLenKm(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">AC Skin Multiplier</label>
                <input type="number" step={0.01} value={acFactor} onChange={(e) => setAcFactor(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 font-mono text-xs space-y-1.5">
              <div>(a) DC Resistance / phase: <strong className="text-slate-950">{resCalc.rDcPerPhaseOhm.toFixed(3)} Ω</strong></div>
              <div>(b) Total 3-phase DC Resistance: <strong className="text-slate-950">{resCalc.rDcTotal3PhOhm.toFixed(3)} Ω</strong></div>
              <div>(c) AC Resistance / phase: <strong className="text-emerald-800">{resCalc.rAcPerPhaseOhm.toFixed(3)} Ω</strong></div>
            </div>
          </div>
        )}

        {activeCalc === 'line_inductance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-500">Spacing D (m)</label>
                <input type="number" step={0.1} value={indD_m} onChange={(e) => setIndD_m(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Conductor Radius r (cm)</label>
                <input type="number" step={0.1} value={indR_cm} onChange={(e) => setIndR_cm(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 font-mono text-xs space-y-1.5">
              <div>(a) Conductor GMR (0.7788r): <strong className="text-slate-950">{(indCalc.singleGmrM * 100).toFixed(4)} cm</strong></div>
              <div>(b) L per conductor: <strong className="text-slate-950">{(indCalc.inductancePerCondOrPhaseHPerM * 1e6).toFixed(4)} μH/m</strong></div>
              <div>(c) Total 2-wire loop L/km: <strong className="text-emerald-800">{indCalc.inductanceTotalPerKmMh.toFixed(4)} mH/km</strong></div>
            </div>
          </div>
        )}

        {activeCalc === 'line_capacitance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-500">Equilateral Spacing D (m)</label>
                <input type="number" step={0.2} value={capD_m} onChange={(e) => setCapD_m(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Radius r (cm)</label>
                <input type="number" step={0.1} value={capR_cm} onChange={(e) => setCapR_cm(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Line Voltage V_L (kV)</label>
                <input type="number" step={1} value={capV_kv} onChange={(e) => setCapV_kv(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Frequency (Hz)</label>
                <input type="number" step={5} value={capF_hz} onChange={(e) => setCapF_hz(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 font-mono text-xs space-y-1.5">
              <div>(a) C_n per metre: <strong className="text-slate-950">{(capCalc.capacitancePerPhaseFPerM * 1e12).toFixed(3)} pF/m</strong></div>
              <div>(b) C_n per km: <strong className="text-slate-950">{capCalc.capacitancePerPhaseNfPerKm.toFixed(3)} nF/km</strong></div>
              <div>(c) Charging current I_c: <strong className="text-emerald-800">{capCalc.chargingCurrentAPerKm.toFixed(4)} A/km</strong></div>
            </div>
          </div>
        )}

        {activeCalc === 'bundled_gmr' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-500">Sub-conductor r (cm)</label>
                <input type="number" step={0.1} value={bunR_cm} onChange={(e) => setBunR_cm(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Bundle spacing d (cm)</label>
                <input type="number" step={2} value={bunD_cm} onChange={(e) => setBunD_cm(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Phase spacing D (m)</label>
                <input type="number" step={0.5} value={bunPhase_m} onChange={(e) => setBunPhase_m(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 font-mono text-xs space-y-1.5">
              <div>Sub-conductor r&apos;: <strong className="text-slate-950">{(bunCalc.singleGmrM * 100).toFixed(4)} cm</strong></div>
              <div>(a) Equivalent Bundle GMR: <strong className="text-slate-950">{(bunCalc.bundleGmrL_M * 100).toFixed(3)} cm ({bunCalc.bundleGmrL_M.toFixed(5)} m)</strong></div>
              <div>(b) Phase Inductance: <strong className="text-emerald-800">{(bunCalc.inductancePerCondOrPhaseHPerM * 1e6).toFixed(4)} μH/m</strong></div>
            </div>
          </div>
        )}

        {activeCalc === 'peek_corona' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-500">Operating V_L (kV)</label>
                <input type="number" value={pkV_kv} onChange={(e) => setPkV_kv(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Radius r (cm)</label>
                <input type="number" step={0.1} value={pkR_cm} onChange={(e) => setPkR_cm(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Spacing D (cm)</label>
                <input type="number" step={10} value={pkD_cm} onChange={(e) => setPkD_cm(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Air density δ</label>
                <input type="number" step={0.05} value={pkDelta} onChange={(e) => setPkDelta(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Surface m₀</label>
                <input type="number" step={0.01} value={pkM0} onChange={(e) => setPkM0(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Loss V_d override (kV)</label>
                <input type="text" placeholder="auto" value={pkOverrideVd} onChange={(e) => setPkOverrideVd(e.target.value)} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 font-mono text-xs space-y-1.5">
              <div>Part A (Computed V_d): <strong className="text-slate-950">{pkCalcVd.vdPhaseKv.toFixed(2)} kV/phase</strong></div>
              <div>Operating V_ph = V_L/√3: <strong className="text-slate-950">{pkLossCalc.vPhaseKv.toFixed(2)} kV/phase</strong></div>
              <div>Part B Corona Loss P_c: <strong className="text-emerald-800">{pkLossCalc.lossPerKmPerPhaseKw.toFixed(3)} kW/km/phase</strong></div>
              <div>Total 3-Phase Loss: <strong className="text-slate-900">{pkLossCalc.lossTotal3PhPerKmKw.toFixed(3)} kW/km</strong></div>
            </div>
          </div>
        )}

        {activeCalc === 'econ_dispatch' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="text-xs space-y-2">
              <label className="block text-[11px] text-slate-500">Total Demand P_D (MW)</label>
              <input type="number" step={10} value={edLoad} onChange={(e) => setEdLoad(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2.5 py-1.5 font-mono" />
              <p className="text-slate-500">Uses C₁ = 200 + 7.0P₁ + 0.008P₁² and C₂ = 180 + 6.3P₂ + 0.009P₂².</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 font-mono text-xs space-y-1.5">
              <div>Incremental Cost λ: <strong className="text-emerald-800">${edCalc.lambda.toFixed(3)} /MWh</strong></div>
              {edCalc.units.map((u) => (
                <div key={u.id}>{u.name}: <strong>{u.pMw.toFixed(2)} MW</strong> ({u.status})</div>
              ))}
              <div>Total Cost: <strong>${edCalc.totalCostPerHr.toFixed(2)} /hr</strong></div>
            </div>
          </div>
        )}

        {activeCalc === 'symmetrical_comp' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-500">|Va|∠0°</label>
                <input type="number" step={0.1} value={symVa} onChange={(e) => setSymVa(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">|Vb|∠−120°</label>
                <input type="number" step={0.1} value={symVb} onChange={(e) => setSymVb(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">|Vc|∠+120°</label>
                <input type="number" step={0.1} value={symVc} onChange={(e) => setSymVc(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2 py-1.5 font-mono" />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 font-mono text-xs space-y-1.5">
              <div>V₀ (Zero): <strong>{cFmtPolar(symCalc.v0, 3)} pu</strong></div>
              <div>V₁ (Positive): <strong className="text-emerald-800">{cFmtPolar(symCalc.v1, 3)} pu</strong></div>
              <div>V₂ (Negative): <strong>{cFmtPolar(symCalc.v2, 3)} pu</strong></div>
            </div>
          </div>
        )}

        {activeCalc === 'power_faults' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-500">Fault Type</label>
                <select value={fltType} onChange={(e) => setFltType(e.target.value as FaultType)} className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
                  <option value="3ph">3ϕ Balanced</option>
                  <option value="slg">SLG</option>
                  <option value="ll">LL</option>
                  <option value="dlg">DLG</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-500">X₁ = X₂ (pu)</label>
                <input type="number" step={0.02} value={fltX1} onChange={(e) => setFltX1(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">X₀ (pu)</label>
                <input type="number" step={0.01} value={fltX0} onChange={(e) => setFltX0(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2 py-1.5 font-mono" />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 font-mono text-xs space-y-1.5">
              <div>Max Fault Current (100 MVA, 13.8 kV): <strong className="text-emerald-800">{fltCalc.faultCurrentKa.toFixed(2)} kA</strong></div>
              <div>I_a = {cMag(fltCalc.ia).toFixed(3)} ∠ {cAngDeg(fltCalc.ia).toFixed(1)}° pu</div>
              <div>Fault MVA = {fltCalc.faultMva.toFixed(1)} MVA</div>
            </div>
          </div>
        )}

        {activeCalc === 'pu_traveling_wave' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-500">Step V (kV)</label>
                <input type="number" value={bwV} onChange={(e) => setBwV(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Z_source (Ω)</label>
                <input type="number" value={bwZs} onChange={(e) => setBwZs(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Z_c (Ω)</label>
                <input type="number" value={bwZc} onChange={(e) => setBwZc(Number(e.target.value))} className="w-full rounded border border-slate-200 px-2 py-1.5 font-mono" />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 font-mono text-xs space-y-1.5">
              <div>Initial Wave V⁺: <strong>{bwCalc.bounces[0]?.waveKv.toFixed(2)} kV</strong></div>
              <div>Open-End Reflection Γ_L: <strong>+{bwCalc.gammaLoad.toFixed(2)}</strong> | Γ_S: <strong>{bwCalc.gammaSource.toFixed(2)}</strong></div>
              <div>First Open-End Load Peak: <strong className="text-emerald-800">{bwCalc.bounces[0]?.loadVoltageKv.toFixed(2)} kV</strong></div>
            </div>
          </div>
        )}

        {/* Hand-Calculation Check Box */}
        <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Sparkles className="h-4 w-4 text-emerald-700 shrink-0" />
            <span className="font-semibold text-slate-800">
              Verify your hand calc ({getActiveTarget().label}):
            </span>
            <input
              type="text"
              value={handInput}
              onChange={(e) => setHandInput(e.target.value)}
              placeholder="Enter numeric value..."
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs w-40"
            />
            <button
              type="button"
              onClick={checkHandAnswer}
              className="cursor-pointer rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Check Answer
            </button>
          </div>
          {handFeedback && (
            <div
              className={`text-xs font-semibold ${
                handFeedback.ok ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {handFeedback.msg}
            </div>
          )}
        </div>
      </section>

      {/* Complete CAT 1 & Power Worked Examples */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Complete CAT 1 (Q3–Q7) &amp; Power Systems II Worked Solutions
            </h2>
            <p className="text-xs text-slate-500">
              Mark problems as mastered as you verify every intermediate step by hand.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs">
            {[
              { id: 'all', label: `All (${POWER_WORKED_EXAMPLES.length})` },
              { id: PowerModule.LINE_CORONA, label: 'CAT 1 Lines & Corona' },
              { id: PowerModule.DISPATCH_AGC, label: 'Dispatch' },
              { id: PowerModule.FAULTS, label: 'Faults' },
              { id: PowerModule.TRANSIENTS, label: 'Transients' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setExampleFilter(f.id as 'all' | PowerModule)}
                className={`cursor-pointer rounded-md px-3 py-1.5 font-semibold ${
                  exampleFilter === f.id ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredExamples.map((ex) => {
            const mastered = masteredExamples.includes(ex.id);
            return (
              <article
                key={ex.id}
                className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-emerald-700">{ex.catRelevance}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-500">{POWER_MODULE_META[ex.module].shortTitle}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-950 mt-0.5">{ex.title}</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleMastered(ex.id)}
                    className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 ${
                      mastered
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-800 hover:border-emerald-400'
                    }`}
                  >
                    {mastered ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5 text-slate-400" />}
                    <span>{mastered ? 'Mastered' : 'Mark Mastered'}</span>
                  </button>
                </div>

                <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                  {ex.problemStatement}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1">
                    <div className="font-semibold text-slate-900">Given Data</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                      {ex.given.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1">
                    <div className="font-semibold text-slate-900">Governing Equations</div>
                    <ul className="space-y-0.5 font-mono text-emerald-800">
                      {ex.governingEquations.map((eq) => (
                        <li key={eq}>{eq}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  {ex.steps.map((s) => (
                    <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="font-semibold text-slate-900">{s.label}</div>
                      <div className="font-mono text-slate-800 mt-0.5">{s.calculation}</div>
                      {s.note && <div className="text-slate-500 mt-0.5">{s.note}</div>}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="font-mono font-bold text-emerald-800">
                    Final Answer: {ex.finalAnswer}
                  </div>
                  <div className="text-amber-800">
                    <strong>Exam Trap:</strong> {ex.examTrap}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
