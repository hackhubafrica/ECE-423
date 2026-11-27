// =========================================================================
// ECE 471 ELECTRIC POWER SYSTEMS II — NUMERICAL & PHASOR COMPUTATION ENGINE
// =========================================================================

export interface Cpx {
  re: number;
  im: number;
}

export const cpx = (re: number, im = 0): Cpx => ({ re, im });

export const cpxFromPolar = (mag: number, deg: number): Cpx => {
  const rad = (deg * Math.PI) / 180;
  return { re: mag * Math.cos(rad), im: mag * Math.sin(rad) };
};

export const cAdd = (a: Cpx, b: Cpx): Cpx => ({ re: a.re + b.re, im: a.im + b.im });
export const cSub = (a: Cpx, b: Cpx): Cpx => ({ re: a.re - b.re, im: a.im - b.im });
export const cMul = (a: Cpx, b: Cpx): Cpx => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
export const cDiv = (a: Cpx, b: Cpx): Cpx => {
  const den = b.re * b.re + b.im * b.im;
  if (den < 1e-18) return { re: 0, im: 0 };
  return {
    re: (a.re * b.re + a.im * b.im) / den,
    im: (a.im * b.re - a.re * b.im) / den,
  };
};
export const cScale = (a: Cpx, s: number): Cpx => ({ re: a.re * s, im: a.im * s });
export const cMag = (a: Cpx): number => Math.hypot(a.re, a.im);
export const cAngDeg = (a: Cpx): number => (Math.atan2(a.im, a.re) * 180) / Math.PI;

export function cFmtRect(a: Cpx, decimals = 3): string {
  const sign = a.im >= 0 ? '+' : '−';
  return `${a.re.toFixed(decimals)} ${sign} j${Math.abs(a.im).toFixed(decimals)}`;
}

export function cFmtPolar(a: Cpx, decimals = 3): string {
  return `${cMag(a).toFixed(decimals)} ∠ ${cAngDeg(a).toFixed(1)}°`;
}

// Fortescue operator a = 1∠120°, a^2 = 1∠240°
export const FORTESCUE_A: Cpx = cpxFromPolar(1, 120);
export const FORTESCUE_A2: Cpx = cpxFromPolar(1, 240);

// =========================================================================
// 1. TRANSMISSION LINE PARAMETERS (R, GMR, L, C, CHARGING CURRENT, BUNDLE)
// =========================================================================
export interface LineParametersInput {
  topology: 'single_phase_2wire' | 'three_phase_equilateral' | 'three_phase_unsymmetrical';
  bundleCount: 1 | 2 | 3 | 4;
  radiusCm: number;
  bundleSpacingCm: number;
  dabM: number;
  dbcM: number;
  dcaM: number;
  lengthKm: number;
  areaMm2: number;
  resistivityOhmM: number;
  acSkinFactor: number;
  lineVoltageKv: number;
  freqHz: number;
}

export interface LineParametersResult {
  rDcPerPhaseOhm: number;
  rDcTotal3PhOhm: number;
  rAcPerPhaseOhm: number;
  singleGmrM: number;
  bundleGmrL_M: number;
  bundleEqRadiusC_M: number;
  gmdM: number;
  inductancePerCondOrPhaseHPerM: number;
  inductanceTotalPerKmMh: number;
  reactancePerPhaseOhmPerKm: number;
  capacitancePerPhaseFPerM: number;
  capacitancePerPhaseNfPerKm: number;
  chargingCurrentAPerKm: number;
  chargingMvarPerKm: number;
  surgeImpedanceOhm: number;
  propagationVelKmPerS: number;
}

export function computeLineParameters(input: LineParametersInput): LineParametersResult {
  const MU_0 = 4 * Math.PI * 1e-7;
  const EPS_0 = 8.8541878e-12;

  const rM = Math.max(1e-4, input.radiusCm / 100);
  const dBundleM = Math.max(rM * 2.1, input.bundleSpacingCm / 100);
  const singleGmrM = 0.7788 * rM;

  // Equivalent GMR for inductance and equivalent radius for capacitance
  let bundleGmrL_M = singleGmrM;
  let bundleEqRadiusC_M = rM;
  if (input.bundleCount === 2) {
    bundleGmrL_M = Math.sqrt(singleGmrM * dBundleM);
    bundleEqRadiusC_M = Math.sqrt(rM * dBundleM);
  } else if (input.bundleCount === 3) {
    bundleGmrL_M = Math.cbrt(singleGmrM * dBundleM * dBundleM);
    bundleEqRadiusC_M = Math.cbrt(rM * dBundleM * dBundleM);
  } else if (input.bundleCount === 4) {
    bundleGmrL_M = 1.0905 * Math.pow(singleGmrM * Math.pow(dBundleM, 3), 0.25);
    bundleEqRadiusC_M = 1.0905 * Math.pow(rM * Math.pow(dBundleM, 3), 0.25);
  }

  const gmdM =
    input.topology === 'three_phase_unsymmetrical'
      ? Math.cbrt(Math.max(0.05, input.dabM) * Math.max(0.05, input.dbcM) * Math.max(0.05, input.dcaM))
      : Math.max(0.05, input.dabM);

  const areaM2 = Math.max(1e-7, input.areaMm2 * 1e-6);
  const lengthM = Math.max(0.1, input.lengthKm) * 1000;
  // Note: if bundled, effective parallel sub-conductor area multiplies by bundleCount for total phase cross-section if area is per sub-conductor,
  // or keep areaMm2 as effective phase conductor area (CAT 1 convention: area = 250 mm² per phase).
  const rDcPerPhaseOhm = (input.resistivityOhmM * lengthM) / areaM2;
  const rDcTotal3PhOhm =
    input.topology === 'single_phase_2wire' ? 2 * rDcPerPhaseOhm : 3 * rDcPerPhaseOhm;
  const rAcPerPhaseOhm = input.acSkinFactor * rDcPerPhaseOhm;

  const lPerCondHPerM =
    (MU_0 / (2 * Math.PI)) * Math.log(Math.max(1.01, gmdM / bundleGmrL_M));

  const inductanceTotalPerKmMh =
    input.topology === 'single_phase_2wire'
      ? 2 * lPerCondHPerM * 1000 * 1000
      : lPerCondHPerM * 1000 * 1000;

  const omega = 2 * Math.PI * Math.max(1, input.freqHz);
  const reactancePerPhaseOhmPerKm = omega * lPerCondHPerM * 1000;

  const capPerPhaseFPerM =
    input.topology === 'single_phase_2wire'
      ? (Math.PI * EPS_0) / Math.log(Math.max(1.01, gmdM / bundleEqRadiusC_M))
      : (2 * Math.PI * EPS_0) / Math.log(Math.max(1.01, gmdM / bundleEqRadiusC_M));

  const capacitancePerPhaseNfPerKm = capPerPhaseFPerM * 1000 * 1e9;

  const vPhaseV =
    input.topology === 'single_phase_2wire'
      ? input.lineVoltageKv * 1000
      : (input.lineVoltageKv * 1000) / Math.sqrt(3);

  const chargingCurrentAPerKm = omega * (capPerPhaseFPerM * 1000) * vPhaseV;
  const chargingMvarPerKm =
    input.topology === 'single_phase_2wire'
      ? (vPhaseV * chargingCurrentAPerKm) / 1e6
      : (3 * vPhaseV * chargingCurrentAPerKm) / 1e6;

  const surgeImpedanceOhm = Math.sqrt(lPerCondHPerM / Math.max(1e-18, capPerPhaseFPerM));
  const propagationVelKmPerS = 1 / Math.sqrt(lPerCondHPerM * capPerPhaseFPerM) / 1000;

  return {
    rDcPerPhaseOhm,
    rDcTotal3PhOhm,
    rAcPerPhaseOhm,
    singleGmrM,
    bundleGmrL_M,
    bundleEqRadiusC_M,
    gmdM,
    inductancePerCondOrPhaseHPerM: lPerCondHPerM,
    inductanceTotalPerKmMh,
    reactancePerPhaseOhmPerKm,
    capacitancePerPhaseFPerM: capPerPhaseFPerM,
    capacitancePerPhaseNfPerKm,
    chargingCurrentAPerKm,
    chargingMvarPerKm,
    surgeImpedanceOhm,
    propagationVelKmPerS,
  };
}

// =========================================================================
// 2. PEEK'S CORONA DISRUPTIVE VOLTAGE & POWER LOSS ENGINE
// =========================================================================
export interface PeekCoronaInput {
  operatingLineKv: number;
  radiusCm: number;
  spacingCm: number;
  freqHz: number;
  airDensityFactor: number; // delta
  surfaceFactorM0: number; // m0
  visualFactorMv?: number;
  g0RmsKvPerCm?: number; // default 21.21 kV(rms)/cm (30 / sqrt(2))
  overrideVdKv?: number;
}

export interface PeekCoronaResult {
  vPhaseKv: number;
  vdPhaseKv: number;
  vdLineKv: number;
  vvPhaseKv: number;
  coronaActive: boolean;
  lossPerKmPerPhaseKw: number;
  lossTotal3PhPerKmKw: number;
  sweepCurve: { vLineKv: number; loss3PhKwPerKm: number; lossPhaseKwPerKm: number }[];
}

export function computePeekCorona(input: PeekCoronaInput): PeekCoronaResult {
  const g0 = input.g0RmsKvPerCm ?? 21.2132;
  const delta = Math.max(0.4, input.airDensityFactor);
  const m0 = Math.max(0.5, input.surfaceFactorM0);
  const mv = input.visualFactorMv ?? 0.72;
  const r = Math.max(0.1, input.radiusCm);
  const d = Math.max(r * 2.5, input.spacingCm);

  const lnDR = Math.log(d / r);
  const computedVd = m0 * g0 * delta * r * lnDR;
  const vdPhaseKv = input.overrideVdKv ?? computedVd;
  const vdLineKv = vdPhaseKv * Math.sqrt(3);
  const vvPhaseKv = mv * g0 * delta * r * (1 + 0.301 / Math.sqrt(delta * r)) * lnDR;

  const vPhaseKv = input.operatingLineKv / Math.sqrt(3);
  const coronaActive = vPhaseKv > vdPhaseKv;

  const calcLossPhase = (vPh: number): number => {
    if (vPh <= vdPhaseKv) return 0;
    return (
      (242.2 / delta) *
      (input.freqHz + 25) *
      Math.sqrt(r / d) *
      Math.pow(vPh - vdPhaseKv, 2) *
      1e-5
    );
  };

  const lossPerKmPerPhaseKw = calcLossPhase(vPhaseKv);
  const lossTotal3PhPerKmKw = 3 * lossPerKmPerPhaseKw;

  const maxSweepV = Math.max(input.operatingLineKv * 1.35, vdLineKv * 1.6, 300);
  const minSweepV = Math.max(30, vdLineKv * 0.55);
  const sweepCurve: PeekCoronaResult['sweepCurve'] = [];
  for (let i = 0; i <= 32; i++) {
    const vL = minSweepV + ((maxSweepV - minSweepV) * i) / 32;
    const pPh = calcLossPhase(vL / Math.sqrt(3));
    sweepCurve.push({
      vLineKv: Number(vL.toFixed(1)),
      lossPhaseKwPerKm: Number(pPh.toFixed(3)),
      loss3PhKwPerKm: Number((3 * pPh).toFixed(3)),
    });
  }

  return {
    vPhaseKv,
    vdPhaseKv,
    vdLineKv,
    vvPhaseKv,
    coronaActive,
    lossPerKmPerPhaseKw,
    lossTotal3PhPerKmKw,
    sweepCurve,
  };
}

// =========================================================================
// 3. ECONOMIC DISPATCH (LAMBDA-ITERATION) & AGC FREQUENCY CONTROL
// =========================================================================
export interface GeneratorCostUnit {
  id: string;
  name: string;
  a: number; // $/hr constant
  b: number; // $/MWh linear
  c: number; // $/MW^2h quadratic (C = a + bP + cP^2)
  pMin: number;
  pMax: number;
}

export interface EconomicDispatchUnitResult {
  id: string;
  name: string;
  pMw: number;
  incrementalCost: number;
  hourlyCost: number;
  status: 'Active' | 'Clamped Min' | 'Clamped Max';
}

export interface EconomicDispatchResult {
  lambda: number;
  totalLoadMw: number;
  totalGeneratedMw: number;
  totalCostPerHr: number;
  feasible: boolean;
  units: EconomicDispatchUnitResult[];
}

export function solveEconomicDispatch(
  units: GeneratorCostUnit[],
  loadMw: number,
  enforceLimits = true
): EconomicDispatchResult {
  const sumMin = units.reduce((s, u) => s + u.pMin, 0);
  const sumMax = units.reduce((s, u) => s + u.pMax, 0);
  const feasible = !enforceLimits || (loadMw >= sumMin - 1e-6 && loadMw <= sumMax + 1e-6);
  const clampedTarget = enforceLimits
    ? Math.max(sumMin, Math.min(sumMax, loadMw))
    : loadMw;

  const evalAtLambda = (lam: number) =>
    units.map((u) => {
      const rawP = (lam - u.b) / Math.max(1e-6, 2 * u.c);
      if (!enforceLimits) return { u, p: rawP, status: 'Active' as const };
      if (rawP <= u.pMin) return { u, p: u.pMin, status: 'Clamped Min' as const };
      if (rawP >= u.pMax) return { u, p: u.pMax, status: 'Clamped Max' as const };
      return { u, p: rawP, status: 'Active' as const };
    });

  let lo = 0;
  let hi = 250;
  for (let i = 0; i < 65; i++) {
    const mid = 0.5 * (lo + hi);
    const totalP = evalAtLambda(mid).reduce((s, x) => s + x.p, 0);
    if (totalP < clampedTarget) lo = mid;
    else hi = mid;
  }
  const lambda = 0.5 * (lo + hi);
  const evaluated = evalAtLambda(lambda);

  const unitResults: EconomicDispatchUnitResult[] = evaluated.map(({ u, p, status }) => ({
    id: u.id,
    name: u.name,
    pMw: p,
    incrementalCost: u.b + 2 * u.c * p,
    hourlyCost: u.a + u.b * p + u.c * p * p,
    status,
  }));

  return {
    lambda,
    totalLoadMw: loadMw,
    totalGeneratedMw: unitResults.reduce((s, u) => s + u.pMw, 0),
    totalCostPerHr: unitResults.reduce((s, u) => s + u.hourlyCost, 0),
    feasible,
    units: unitResults,
  };
}

export interface AgcPoint {
  t: number;
  deltaF_Hz: number;
  deltaF_NoAgc_Hz: number;
  deltaPm_pu: number;
}

export function simulateAgcFrequencyControl(params: {
  inertiaH: number; // s
  dampingD: number; // pu/pu
  droopR: number; // pu (e.g. 0.05)
  tgSec: number;
  ttSec: number;
  kiAgc: number;
  loadStepPu: number;
  fNominalHz?: number;
}): AgcPoint[] {
  const f0 = params.fNominalHz ?? 60;
  const H = Math.max(1, params.inertiaH);
  const D = Math.max(0.1, params.dampingD);
  const R = Math.max(0.01, params.droopR);
  const Tg = Math.max(0.05, params.tgSec);
  const Tt = Math.max(0.1, params.ttSec);
  const Ki = Math.max(0, params.kiAgc);
  const dPL = params.loadStepPu;
  const B = 1 / R + D;

  const dt = 0.05;
  const steps = Math.round(25 / dt);

  // State 1: With AGC [df, dPm, dPg, aceInteg]
  let df = 0, dPm = 0, dPg = 0, integ = 0;
  // State 2: Primary Droop Only (no integral AGC)
  let dfNo = 0, dPmNo = 0, dPgNo = 0;

  const out: AgcPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    if (i % 2 === 0) {
      out.push({
        t: Number(t.toFixed(2)),
        deltaF_Hz: Number((df * f0).toFixed(4)),
        deltaF_NoAgc_Hz: Number((dfNo * f0).toFixed(4)),
        deltaPm_pu: Number(dPm.toFixed(4)),
      });
    }

    const derivAgc = (s: [number, number, number, number]): [number, number, number, number] => {
      const [f, pm, pg, z] = s;
      const ace = B * f;
      return [
        (pm - dPL - D * f) / (2 * H),
        (pg - pm) / Tt,
        (-z - f / R - pg) / Tg,
        Ki * ace,
      ];
    };

    const s0: [number, number, number, number] = [df, dPm, dPg, integ];
    const k1 = derivAgc(s0);
    const k2 = derivAgc([s0[0] + 0.5 * dt * k1[0], s0[1] + 0.5 * dt * k1[1], s0[2] + 0.5 * dt * k1[2], s0[3] + 0.5 * dt * k1[3]]);
    const k3 = derivAgc([s0[0] + 0.5 * dt * k2[0], s0[1] + 0.5 * dt * k2[1], s0[2] + 0.5 * dt * k2[2], s0[3] + 0.5 * dt * k2[3]]);
    const k4 = derivAgc([s0[0] + dt * k3[0], s0[1] + dt * k3[1], s0[2] + dt * k3[2], s0[3] + dt * k3[3]]);
    df += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    dPm += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    dPg += (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    integ += (dt / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]);

    // Primary droop only RK4
    const derivNo = (s: [number, number, number]): [number, number, number] => [
      (s[1] - dPL - D * s[0]) / (2 * H),
      (s[2] - s[1]) / Tt,
      (-s[0] / R - s[2]) / Tg,
    ];
    const n0: [number, number, number] = [dfNo, dPmNo, dPgNo];
    const nk1 = derivNo(n0);
    const nk2 = derivNo([n0[0] + 0.5 * dt * nk1[0], n0[1] + 0.5 * dt * nk1[1], n0[2] + 0.5 * dt * nk1[2]]);
    const nk3 = derivNo([n0[0] + 0.5 * dt * nk2[0], n0[1] + 0.5 * dt * nk2[1], n0[2] + 0.5 * dt * nk2[2]]);
    const nk4 = derivNo([n0[0] + dt * nk3[0], n0[1] + dt * nk3[1], n0[2] + dt * nk3[2]]);
    dfNo += (dt / 6) * (nk1[0] + 2 * nk2[0] + 2 * nk3[0] + nk4[0]);
    dPmNo += (dt / 6) * (nk1[1] + 2 * nk2[1] + 2 * nk3[1] + nk4[1]);
    dPgNo += (dt / 6) * (nk1[2] + 2 * nk2[2] + 2 * nk3[2] + nk4[2]);
  }
  return out;
}

// =========================================================================
// 4. SYMMETRICAL COMPONENTS, BALANCED & UNBALANCED FAULT SOLVER
// =========================================================================
export function decomposeSymmetrical(va: Cpx, vb: Cpx, vc: Cpx): { v0: Cpx; v1: Cpx; v2: Cpx } {
  const a = FORTESCUE_A;
  const a2 = FORTESCUE_A2;
  const v0 = cScale(cAdd(cAdd(va, vb), vc), 1 / 3);
  const v1 = cScale(cAdd(cAdd(va, cMul(a, vb)), cMul(a2, vc)), 1 / 3);
  const v2 = cScale(cAdd(cAdd(va, cMul(a2, vb)), cMul(a, vc)), 1 / 3);
  return { v0, v1, v2 };
}

export function composeFromSequence(v0: Cpx, v1: Cpx, v2: Cpx): { va: Cpx; vb: Cpx; vc: Cpx } {
  const a = FORTESCUE_A;
  const a2 = FORTESCUE_A2;
  const va = cAdd(cAdd(v0, v1), v2);
  const vb = cAdd(cAdd(v0, cMul(a2, v1)), cMul(a, v2));
  const vc = cAdd(cAdd(v0, cMul(a, v1)), cMul(a2, v2));
  return { va, vb, vc };
}

export type FaultType = '3ph' | 'slg' | 'll' | 'dlg';

export interface FaultAnalysisResult {
  i0: Cpx;
  i1: Cpx;
  i2: Cpx;
  ia: Cpx;
  ib: Cpx;
  ic: Cpx;
  v0: Cpx;
  v1: Cpx;
  v2: Cpx;
  va: Cpx;
  vb: Cpx;
  vc: Cpx;
  iBaseKa: number;
  faultCurrentKa: number;
  faultMva: number;
}

export function solvePowerFault(params: {
  faultType: FaultType;
  ePreFaultPu: number;
  z1: Cpx;
  z2: Cpx;
  z0: Cpx;
  zf: Cpx;
  sBaseMva: number;
  vBaseLineKv: number;
}): FaultAnalysisResult {
  const E = cpx(params.ePreFaultPu, 0);
  const { z1, z2, z0, zf } = params;

  let i0 = cpx(0, 0);
  let i1 = cpx(0, 0);
  let i2 = cpx(0, 0);

  if (params.faultType === '3ph') {
    i1 = cDiv(E, cAdd(z1, zf));
  } else if (params.faultType === 'slg') {
    const zTotal = cAdd(cAdd(cAdd(z1, z2), z0), cScale(zf, 3));
    i1 = cDiv(E, zTotal);
    i2 = i1;
    i0 = i1;
  } else if (params.faultType === 'll') {
    const zTotal = cAdd(cAdd(z1, z2), zf);
    i1 = cDiv(E, zTotal);
    i2 = cScale(i1, -1);
    i0 = cpx(0, 0);
  } else {
    // DLG: Z2 || (Z0 + 3Zf)
    const z0eff = cAdd(z0, cScale(zf, 3));
    const zPar = cDiv(cMul(z2, z0eff), cAdd(z2, z0eff));
    i1 = cDiv(E, cAdd(z1, zPar));
    const v1Term = cSub(E, cMul(i1, z1));
    i2 = cScale(cDiv(v1Term, z2), -1);
    i0 = cScale(cDiv(v1Term, z0eff), -1);
  }

  const v1 = cSub(E, cMul(i1, z1));
  const v2 = cScale(cMul(i2, z2), -1);
  const v0 = cScale(cMul(i0, z0), -1);

  const { va: ia, vb: ib, vc: ic } = composeFromSequence(i0, i1, i2);
  const { va, vb, vc } = composeFromSequence(v0, v1, v2);

  const iBaseKa = params.sBaseMva / (Math.sqrt(3) * Math.max(0.1, params.vBaseLineKv));
  const maxIPu = Math.max(cMag(ia), cMag(ib), cMag(ic));
  const faultCurrentKa = maxIPu * iBaseKa;
  const faultMva = maxIPu * params.sBaseMva;

  return {
    i0,
    i1,
    i2,
    ia,
    ib,
    ic,
    v0,
    v1,
    v2,
    va,
    vb,
    vc,
    iBaseKa,
    faultCurrentKa,
    faultMva,
  };
}

// =========================================================================
// 5. PER-UNIT BASE CONVERSION & SEQUENCE NETWORK BUILDER
// =========================================================================
export function convertPerUnitImpedance(
  zOldPu: number,
  sOldMva: number,
  sNewMva: number,
  vOldKv: number,
  vNewKv: number
): number {
  return zOldPu * (sNewMva / Math.max(1e-3, sOldMva)) * Math.pow(vOldKv / Math.max(1e-3, vNewKv), 2);
}

export interface SeqBranchInput {
  x1Pu: number;
  x2Pu: number;
  x0Pu: number;
  txGroundConfig: 'yg_yg' | 'yg_delta_isolated' | 'delta_delta';
  genGroundingXnPu: number;
}

export function buildSimpleRadialSequenceEquiv(params: {
  genX1: number;
  genX2: number;
  genX0: number;
  genXn: number;
  txX: number;
  txConfig: 'yg_yg' | 'yg_delta_fault_side' | 'yg_delta_gen_side';
  lineX1: number;
  lineX0: number;
}) {
  const z1Eq = params.genX1 + params.txX + params.lineX1;
  const z2Eq = params.genX2 + params.txX + params.lineX1;
  let z0Eq = params.lineX0;
  if (params.txConfig === 'yg_yg') {
    z0Eq = params.genX0 + 3 * params.genXn + params.txX + params.lineX0;
  } else if (params.txConfig === 'yg_delta_fault_side') {
    // Delta blocks generator zero-sequence, grounded Y on fault side provides shunt path through transformer
    z0Eq = params.txX + params.lineX0;
  } else {
    // Delta on fault side opens zero-sequence path to fault
    z0Eq = 9999; // effectively open circuit
  }
  return { z1Eq, z2Eq, z0Eq };
}

// =========================================================================
// 6. TRAVELING WAVE LATTICE & PROTECTION RELAYS
// =========================================================================
export interface BewleyLatticeResult {
  gammaLoad: number;
  tauLoad: number;
  gammaSource: number;
  tauLineSec: number;
  bounces: {
    bounceIndex: number;
    timeUs: number;
    fromEnd: 'Source' | 'Load';
    toEnd: 'Load' | 'Source';
    waveKv: number;
    loadVoltageKv: number;
    sourceVoltageKv: number;
  }[];
  waveform: { tUs: number; vLoadKv: number; vSourceKv: number }[];
}

export function computeBewleyLattice(params: {
  vStepKv: number;
  zSourceOhm: number;
  zLineOhm: number;
  zLoadOhm: number; // >= 1e6 treated as open circuit
  lineLengthKm: number;
  velocityKmPerUs?: number; // default 0.30 km/us (3e8 m/s overhead)
  numTransits?: number;
}): BewleyLatticeResult {
  const vVel = params.velocityKmPerUs ?? 0.3;
  const tauUs = (params.lineLengthKm / vVel) * 1; // us if velocity is km/us (0.3 km/us = 300 m/us)
  const zc = Math.max(1, params.zLineOhm);
  const zs = Math.max(0, params.zSourceOhm);
  const zl = params.zLoadOhm;

  const gammaLoad = zl >= 1e5 ? 1.0 : (zl - zc) / (zl + zc);
  const tauLoad = 1 + gammaLoad;
  const gammaSource = zs >= 1e5 ? 1.0 : (zs - zc) / (zs + zc);

  // Initial voltage injected into line at t = 0
  const vInit = params.vStepKv * (zc / (zc + zs));
  let vSource = vInit;
  let vLoad = 0;
  let currentWave = vInit;

  const transits = params.numTransits ?? 6;
  const bounces: BewleyLatticeResult['bounces'] = [];
  const waveform: BewleyLatticeResult['waveform'] = [{ tUs: 0, vLoadKv: 0, vSourceKv: Number(vSource.toFixed(3)) }];

  for (let k = 1; k <= transits; k++) {
    const tUs = k * tauUs;
    if (k % 2 === 1) {
      // Arrives at Load
      const reflected = currentWave * gammaLoad;
      vLoad += currentWave + reflected;
      bounces.push({
        bounceIndex: k,
        timeUs: Number(tUs.toFixed(2)),
        fromEnd: 'Source',
        toEnd: 'Load',
        waveKv: Number(currentWave.toFixed(3)),
        loadVoltageKv: Number(vLoad.toFixed(3)),
        sourceVoltageKv: Number(vSource.toFixed(3)),
      });
      waveform.push({
        tUs: Number(Math.max(0, tUs - 0.01).toFixed(2)),
        vLoadKv: Number((vLoad - (currentWave + reflected)).toFixed(3)),
        vSourceKv: Number(vSource.toFixed(3)),
      });
      waveform.push({
        tUs: Number(tUs.toFixed(2)),
        vLoadKv: Number(vLoad.toFixed(3)),
        vSourceKv: Number(vSource.toFixed(3)),
      });
      currentWave = reflected;
    } else {
      // Arrives back at Source
      const reflected = currentWave * gammaSource;
      vSource += currentWave + reflected;
      bounces.push({
        bounceIndex: k,
        timeUs: Number(tUs.toFixed(2)),
        fromEnd: 'Load',
        toEnd: 'Source',
        waveKv: Number(currentWave.toFixed(3)),
        loadVoltageKv: Number(vLoad.toFixed(3)),
        sourceVoltageKv: Number(vSource.toFixed(3)),
      });
      waveform.push({
        tUs: Number(Math.max(0, tUs - 0.01).toFixed(2)),
        vLoadKv: Number(vLoad.toFixed(3)),
        vSourceKv: Number((vSource - (currentWave + reflected)).toFixed(3)),
      });
      waveform.push({
        tUs: Number(tUs.toFixed(2)),
        vLoadKv: Number(vLoad.toFixed(3)),
        vSourceKv: Number(vSource.toFixed(3)),
      });
      currentWave = reflected;
    }
  }

  return {
    gammaLoad,
    tauLoad,
    gammaSource,
    tauLineSec: tauUs * 1e-6,
    bounces,
    waveform,
  };
}

export type IdmtCurveType = 'standard' | 'very' | 'extremely';

export function computeIdmtTripTime(
  iFaultA: number,
  iPickupA: number,
  tds: number,
  curve: IdmtCurveType
): number {
  const m = iFaultA / Math.max(1e-3, iPickupA);
  if (m <= 1.02) return Infinity;
  const coeffs: Record<IdmtCurveType, { k: number; alpha: number }> = {
    standard: { k: 0.14, alpha: 0.02 },
    very: { k: 13.5, alpha: 1.0 },
    extremely: { k: 80.0, alpha: 2.0 },
  };
  const { k, alpha } = coeffs[curve];
  return tds * (k / (Math.pow(m, alpha) - 1));
}

// =========================================================================
// 7. MULTI-BUS SEQUENCE NETWORK GRAPH SOLVER (D3.JS INTERACTIVE BUILDER)
// =========================================================================
export type TxWindingConfig =
  | 'yg_yg'
  | 'yg_delta'
  | 'delta_yg'
  | 'delta_delta'
  | 'y_yg'
  | 'y_y';

export interface SeqBusNode {
  id: string;
  name: string;
  x: number;
  y: number;
  vBaseKv: number;
}

export interface SeqGeneratorUnit {
  id: string;
  busId: string;
  name: string;
  sRatedMva: number;
  vRatedKv: number;
  rPu: number;
  x1Pu: number;
  x2Pu: number;
  x0Pu: number;
  grounded: boolean;
  xnPu: number;
}

export interface SeqLineBranch {
  id: string;
  kind: 'line';
  name: string;
  fromBusId: string;
  toBusId: string;
  inputMode: 'pu' | 'ohm';
  r1: number;
  x1: number;
  r0: number;
  x0: number;
  sOrigMva: number;
  vOrigKv: number;
}

export interface SeqTransformerBranch {
  id: string;
  kind: 'transformer';
  name: string;
  fromBusId: string;
  toBusId: string;
  sRatedMva: number;
  vPrimaryKv: number;
  vSecondaryKv: number;
  rPu: number;
  xPu: number;
  winding: TxWindingConfig;
  xnPrimaryPu: number;
  xnSecondaryPu: number;
}

export type SeqBranchEdge = SeqLineBranch | SeqTransformerBranch;

export interface SequenceNetworkGraph {
  sBaseMva: number;
  faultBusId: string;
  faultType: FaultType;
  rfPu: number;
  buses: SeqBusNode[];
  generators: SeqGeneratorUnit[];
  branches: SeqBranchEdge[];
}

export interface ConvertedGeneratorInfo {
  id: string;
  z1Pu: Cpx;
  z2Pu: Cpx;
  z0Pu: Cpx;
  z0ConnectedToRef: boolean;
  conversionScale: number;
  vBaseBusKv: number;
}

export interface ConvertedBranchInfo {
  id: string;
  kind: 'line' | 'transformer';
  z1Pu: Cpx;
  z2Pu: Cpx;
  z0Pu: Cpx;
  z0Mode: 'series' | 'shunt_from' | 'shunt_to' | 'open';
  zBaseOhm: number;
  conversionScale: number;
}

export interface SequenceTheveninResult {
  sequence: 'z1' | 'z2' | 'z0';
  isOpenCircuit: boolean;
  zEq: Cpx;
  yBusDiagonal: Cpx | null;
}

export interface SequenceGraphSolveResult {
  sBaseMva: number;
  faultBus: SeqBusNode | null;
  convertedGenerators: Record<string, ConvertedGeneratorInfo>;
  convertedBranches: Record<string, ConvertedBranchInfo>;
  thevenin1: SequenceTheveninResult;
  thevenin2: SequenceTheveninResult;
  thevenin0: SequenceTheveninResult;
  faultResult: FaultAnalysisResult | null;
  warnings: string[];
}

/**
 * Solves A * x = b for an N x N complex matrix using Gaussian elimination with partial pivoting.
 */
export function solveLinearSystemCpx(aMat: Cpx[][], bVec: Cpx[]): Cpx[] | null {
  const n = aMat.length;
  if (n === 0) return [];
  const a = aMat.map((row) => row.map((v) => ({ ...v })));
  const b = bVec.map((v) => ({ ...v }));

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxMag = cMag(a[col][col]);
    for (let r = col + 1; r < n; r++) {
      const m = cMag(a[r][col]);
      if (m > maxMag) {
        maxMag = m;
        pivotRow = r;
      }
    }
    if (maxMag < 1e-12) return null;

    if (pivotRow !== col) {
      [a[col], a[pivotRow]] = [a[pivotRow], a[col]];
      [b[col], b[pivotRow]] = [b[pivotRow], b[col]];
    }

    const pivotVal = a[col][col];
    for (let j = col; j < n; j++) {
      a[col][j] = cDiv(a[col][j], pivotVal);
    }
    b[col] = cDiv(b[col], pivotVal);

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = a[r][col];
      if (cMag(factor) < 1e-15) continue;
      for (let j = col; j < n; j++) {
        a[r][j] = cSub(a[r][j], cMul(factor, a[col][j]));
      }
      b[r] = cSub(b[r], cMul(factor, b[col]));
    }
  }
  return b;
}

function solveComponentThevenin(
  sequence: 'z1' | 'z2' | 'z0',
  busIndexMap: Map<string, number>,
  busCount: number,
  faultBusIdx: number,
  seriesLinks: { u: number; v: number; z: Cpx }[],
  refShunts: { bus: number; z: Cpx }[]
): SequenceTheveninResult {
  if (busCount === 0 || faultBusIdx < 0 || faultBusIdx >= busCount) {
    return { sequence, isOpenCircuit: true, zEq: cpx(0, 1e9), yBusDiagonal: null };
  }

  // Adjacency for BFS reachability from faultBusIdx
  const adj: number[][] = Array.from({ length: busCount }, () => []);
  const hasRef = new Array<boolean>(busCount).fill(false);

  for (const link of seriesLinks) {
    if (cMag(link.z) > 1e-9 && link.u !== link.v) {
      adj[link.u].push(link.v);
      adj[link.v].push(link.u);
    }
  }
  for (const sh of refShunts) {
    if (cMag(sh.z) > 1e-9) {
      hasRef[sh.bus] = true;
    }
  }

  const visited = new Array<boolean>(busCount).fill(false);
  const queue: number[] = [faultBusIdx];
  visited[faultBusIdx] = true;
  const compNodes: number[] = [];
  let reachesReference = false;

  while (queue.length > 0) {
    const curr = queue.shift()!;
    compNodes.push(curr);
    if (hasRef[curr]) reachesReference = true;
    for (const nxt of adj[curr]) {
      if (!visited[nxt]) {
        visited[nxt] = true;
        queue.push(nxt);
      }
    }
  }

  if (!reachesReference) {
    return { sequence, isOpenCircuit: true, zEq: cpx(0, 1e9), yBusDiagonal: null };
  }

  // Assemble Y_bus on the connected component only (guarantees nonsingular matrix)
  const localIdx = new Map<number, number>();
  compNodes.forEach((globalIdx, i) => localIdx.set(globalIdx, i));
  const m = compNodes.length;
  const yBus: Cpx[][] = Array.from({ length: m }, () =>
    Array.from({ length: m }, () => cpx(0, 0))
  );

  for (const link of seriesLinks) {
    const lu = localIdx.get(link.u);
    const lv = localIdx.get(link.v);
    if (lu === undefined || lv === undefined) continue;
    const zSafe = cMag(link.z) < 1e-6 ? cpx(0, 1e-5) : link.z;
    const y = cDiv(cpx(1, 0), zSafe);
    yBus[lu][lu] = cAdd(yBus[lu][lu], y);
    yBus[lv][lv] = cAdd(yBus[lv][lv], y);
    yBus[lu][lv] = cSub(yBus[lu][lv], y);
    yBus[lv][lu] = cSub(yBus[lv][lu], y);
  }

  for (const sh of refShunts) {
    const lb = localIdx.get(sh.bus);
    if (lb === undefined) continue;
    const zSafe = cMag(sh.z) < 1e-6 ? cpx(0, 1e-5) : sh.z;
    const y = cDiv(cpx(1, 0), zSafe);
    yBus[lb][lb] = cAdd(yBus[lb][lb], y);
  }

  const fLocal = localIdx.get(faultBusIdx)!;
  const rhs: Cpx[] = Array.from({ length: m }, (_, i) =>
    i === fLocal ? cpx(1, 0) : cpx(0, 0)
  );
  const sol = solveLinearSystemCpx(yBus, rhs);
  if (!sol) {
    return { sequence, isOpenCircuit: true, zEq: cpx(0, 1e9), yBusDiagonal: null };
  }

  const zEq = sol[fLocal];
  return {
    sequence,
    isOpenCircuit: false,
    zEq,
    yBusDiagonal: yBus[fLocal][fLocal],
  };
}

export function solveSequenceNetworkGraph(
  graph: SequenceNetworkGraph
): SequenceGraphSolveResult {
  const sBaseMva = Math.max(1, graph.sBaseMva);
  const busMap = new Map<string, SeqBusNode>();
  const busIndexMap = new Map<string, number>();
  graph.buses.forEach((b, idx) => {
    busMap.set(b.id, b);
    busIndexMap.set(b.id, idx);
  });

  const faultBus = busMap.get(graph.faultBusId) ?? graph.buses[0] ?? null;
  const faultBusIdx = faultBus ? busIndexMap.get(faultBus.id) ?? -1 : -1;

  const convertedGenerators: Record<string, ConvertedGeneratorInfo> = {};
  const convertedBranches: Record<string, ConvertedBranchInfo> = {};

  const links1: { u: number; v: number; z: Cpx }[] = [];
  const links2: { u: number; v: number; z: Cpx }[] = [];
  const links0: { u: number; v: number; z: Cpx }[] = [];

  const shunts1: { bus: number; z: Cpx }[] = [];
  const shunts2: { bus: number; z: Cpx }[] = [];
  const shunts0: { bus: number; z: Cpx }[] = [];

  // 1. Generators -> Shunts to Sequence Reference Bus
  for (const gen of graph.generators) {
    const bus = busMap.get(gen.busId);
    const bIdx = busIndexMap.get(gen.busId);
    if (!bus || bIdx === undefined) continue;

    const scale =
      (sBaseMva / Math.max(0.1, gen.sRatedMva)) *
      Math.pow(Math.max(0.1, gen.vRatedKv) / Math.max(0.1, bus.vBaseKv), 2);

    const z1 = cpx(gen.rPu * scale, Math.max(1e-4, gen.x1Pu) * scale);
    const z2 = cpx(gen.rPu * scale, Math.max(1e-4, gen.x2Pu) * scale);
    const z0 = cpx(gen.rPu * scale, (Math.max(1e-4, gen.x0Pu) + 3 * Math.max(0, gen.xnPu)) * scale);

    convertedGenerators[gen.id] = {
      id: gen.id,
      z1Pu: z1,
      z2Pu: z2,
      z0Pu: z0,
      z0ConnectedToRef: gen.grounded,
      conversionScale: scale,
      vBaseBusKv: bus.vBaseKv,
    };

    shunts1.push({ bus: bIdx, z: z1 });
    shunts2.push({ bus: bIdx, z: z2 });
    if (gen.grounded) {
      shunts0.push({ bus: bIdx, z: z0 });
    }
  }

  // 2. Transmission Lines & Transformers
  for (const br of graph.branches) {
    const fromBus = busMap.get(br.fromBusId);
    const toBus = busMap.get(br.toBusId);
    const u = busIndexMap.get(br.fromBusId);
    const v = busIndexMap.get(br.toBusId);
    if (!fromBus || !toBus || u === undefined || v === undefined) continue;

    if (br.kind === 'line') {
      const vZoneKv = Math.max(0.1, fromBus.vBaseKv);
      const zBaseOhm = (vZoneKv * vZoneKv) / sBaseMva;

      let scale = 1;
      let z1: Cpx;
      let z0: Cpx;
      if (br.inputMode === 'ohm') {
        scale = 1 / zBaseOhm;
        z1 = cpx(Math.max(0, br.r1) * scale, Math.max(1e-4, br.x1) * scale);
        z0 = cpx(Math.max(0, br.r0) * scale, Math.max(1e-4, br.x0) * scale);
      } else {
        scale =
          (sBaseMva / Math.max(0.1, br.sOrigMva)) *
          Math.pow(Math.max(0.1, br.vOrigKv) / vZoneKv, 2);
        z1 = cpx(Math.max(0, br.r1) * scale, Math.max(1e-4, br.x1) * scale);
        z0 = cpx(Math.max(0, br.r0) * scale, Math.max(1e-4, br.x0) * scale);
      }

      convertedBranches[br.id] = {
        id: br.id,
        kind: 'line',
        z1Pu: z1,
        z2Pu: z1,
        z0Pu: z0,
        z0Mode: 'series',
        zBaseOhm,
        conversionScale: scale,
      };

      links1.push({ u, v, z: z1 });
      links2.push({ u, v, z: z1 });
      links0.push({ u, v, z: z0 });
    } else {
      const vZoneKv = Math.max(0.1, fromBus.vBaseKv);
      const scale =
        (sBaseMva / Math.max(0.1, br.sRatedMva)) *
        Math.pow(Math.max(0.1, br.vPrimaryKv) / vZoneKv, 2);
      const z1 = cpx(Math.max(0, br.rPu) * scale, Math.max(1e-4, br.xPu) * scale);

      let z0Mode: ConvertedBranchInfo['z0Mode'] = 'open';
      let z0 = z1;

      if (br.winding === 'yg_yg') {
        z0Mode = 'series';
        const x0Tot =
          Math.max(1e-4, br.xPu) + 3 * Math.max(0, br.xnPrimaryPu) + 3 * Math.max(0, br.xnSecondaryPu);
        z0 = cpx(Math.max(0, br.rPu) * scale, x0Tot * scale);
        links0.push({ u, v, z: z0 });
      } else if (br.winding === 'yg_delta') {
        z0Mode = 'shunt_from';
        const x0Tot = Math.max(1e-4, br.xPu) + 3 * Math.max(0, br.xnPrimaryPu);
        z0 = cpx(Math.max(0, br.rPu) * scale, x0Tot * scale);
        shunts0.push({ bus: u, z: z0 });
      } else if (br.winding === 'delta_yg') {
        z0Mode = 'shunt_to';
        const x0Tot = Math.max(1e-4, br.xPu) + 3 * Math.max(0, br.xnSecondaryPu);
        z0 = cpx(Math.max(0, br.rPu) * scale, x0Tot * scale);
        shunts0.push({ bus: v, z: z0 });
      } else {
        z0Mode = 'open';
        z0 = cpx(0, 9999);
      }

      convertedBranches[br.id] = {
        id: br.id,
        kind: 'transformer',
        z1Pu: z1,
        z2Pu: z1,
        z0Pu: z0,
        z0Mode,
        zBaseOhm: (vZoneKv * vZoneKv) / sBaseMva,
        conversionScale: scale,
      };

      links1.push({ u, v, z: z1 });
      links2.push({ u, v, z: z1 });
    }
  }

  const busCount = graph.buses.length;
  const thevenin1 = solveComponentThevenin('z1', busIndexMap, busCount, faultBusIdx, links1, shunts1);
  const thevenin2 = solveComponentThevenin('z2', busIndexMap, busCount, faultBusIdx, links2, shunts2);
  const thevenin0 = solveComponentThevenin('z0', busIndexMap, busCount, faultBusIdx, links0, shunts0);

  const warnings: string[] = [];
  if (!faultBus) {
    warnings.push('Add at least one bus and designate it as the Fault Bus.');
  } else if (thevenin1.isOpenCircuit) {
    warnings.push(`${faultBus.name} has no active Positive-sequence (Z₁) generator path.`);
  } else if (thevenin0.isOpenCircuit) {
    warnings.push(
      `${faultBus.name} is isolated in the Zero-sequence (Z₀) network (Δ winding or ungrounded neutral blocks Z₀ → I₀ = 0).`
    );
  }

  let faultResult: FaultAnalysisResult | null = null;
  if (faultBus && !thevenin1.isOpenCircuit && !thevenin2.isOpenCircuit) {
    const zf = cpx(Math.max(0, graph.rfPu), 0);
    if (thevenin0.isOpenCircuit && (graph.faultType === 'slg' || graph.faultType === 'dlg')) {
      // Exact open-Z0 physical limit
      const E = cpx(1, 0);
      const z1 = thevenin1.zEq;
      const z2 = thevenin2.zEq;
      let i0 = cpx(0, 0);
      let i1 = cpx(0, 0);
      let i2 = cpx(0, 0);
      if (graph.faultType === 'dlg') {
        i1 = cDiv(E, cAdd(cAdd(z1, z2), zf));
        i2 = cScale(i1, -1);
      }
      const v1 = cSub(E, cMul(i1, z1));
      const v2 = cScale(cMul(i2, z2), -1);
      const v0 = cpx(0, 0);
      const { va: ia, vb: ib, vc: ic } = composeFromSequence(i0, i1, i2);
      const { va, vb, vc } = composeFromSequence(v0, v1, v2);
      const iBaseKa = sBaseMva / (Math.sqrt(3) * Math.max(0.1, faultBus.vBaseKv));
      const maxIPu = Math.max(cMag(ia), cMag(ib), cMag(ic));
      faultResult = {
        i0,
        i1,
        i2,
        ia,
        ib,
        ic,
        v0,
        v1,
        v2,
        va,
        vb,
        vc,
        iBaseKa,
        faultCurrentKa: maxIPu * iBaseKa,
        faultMva: maxIPu * sBaseMva,
      };
    } else {
      faultResult = solvePowerFault({
        faultType: graph.faultType,
        ePreFaultPu: 1.0,
        z1: thevenin1.zEq,
        z2: thevenin2.zEq,
        z0: thevenin0.isOpenCircuit ? cpx(0, 1e9) : thevenin0.zEq,
        zf,
        sBaseMva,
        vBaseLineKv: faultBus.vBaseKv,
      });
    }
  }

  return {
    sBaseMva,
    faultBus,
    convertedGenerators,
    convertedBranches,
    thevenin1,
    thevenin2,
    thevenin0,
    faultResult,
    warnings,
  };
}

export interface SequenceTemplatePreset {
  id: string;
  label: string;
  summary: string;
  graph: SequenceNetworkGraph;
}

export const SEQUENCE_NETWORK_TEMPLATES: SequenceTemplatePreset[] = [
  {
    id: 'radial_stepup',
    label: 'Radial Gen → Δ–Yg Tx → Line',
    summary: 'Classic 3-bus feeder showing Δ–Yg zero-sequence isolation of generator and shunt grounding.',
    graph: {
      sBaseMva: 100,
      faultBusId: 'b3',
      faultType: 'slg',
      rfPu: 0,
      buses: [
        { id: 'b1', name: 'Bus 1', x: 140, y: 185, vBaseKv: 13.8 },
        { id: 'b2', name: 'Bus 2', x: 380, y: 185, vBaseKv: 132 },
        { id: 'b3', name: 'Bus 3', x: 630, y: 185, vBaseKv: 132 },
      ],
      generators: [
        {
          id: 'g1',
          busId: 'b1',
          name: 'Gen G1',
          sRatedMva: 100,
          vRatedKv: 13.8,
          rPu: 0,
          x1Pu: 0.18,
          x2Pu: 0.18,
          x0Pu: 0.06,
          grounded: true,
          xnPu: 0.05,
        },
      ],
      branches: [
        {
          id: 'br1',
          kind: 'transformer',
          name: 'Tx T1 (Δ–Yg)',
          fromBusId: 'b1',
          toBusId: 'b2',
          sRatedMva: 100,
          vPrimaryKv: 13.8,
          vSecondaryKv: 132,
          rPu: 0,
          xPu: 0.1,
          winding: 'delta_yg',
          xnPrimaryPu: 0,
          xnSecondaryPu: 0,
        },
        {
          id: 'br2',
          kind: 'line',
          name: 'Line L12',
          fromBusId: 'b2',
          toBusId: 'b3',
          inputMode: 'pu',
          r1: 0,
          x1: 0.15,
          r0: 0,
          x0: 0.4,
          sOrigMva: 100,
          vOrigKv: 132,
        },
      ],
    },
  },
  {
    id: 'dual_source_ring',
    label: 'Dual-Source Parallel & Ring Grid',
    summary: 'Two generators with parallel 132 kV lines testing multi-path Thévenin reduction.',
    graph: {
      sBaseMva: 100,
      faultBusId: 'b3',
      faultType: 'slg',
      rfPu: 0,
      buses: [
        { id: 'b1', name: 'Bus 1', x: 130, y: 175, vBaseKv: 13.8 },
        { id: 'b2', name: 'Bus 2', x: 330, y: 175, vBaseKv: 132 },
        { id: 'b3', name: 'Bus 3', x: 540, y: 175, vBaseKv: 132 },
        { id: 'b4', name: 'Bus 4', x: 710, y: 175, vBaseKv: 13.8 },
      ],
      generators: [
        {
          id: 'g1',
          busId: 'b1',
          name: 'Gen G1',
          sRatedMva: 100,
          vRatedKv: 13.8,
          rPu: 0,
          x1Pu: 0.2,
          x2Pu: 0.2,
          x0Pu: 0.05,
          grounded: true,
          xnPu: 0.04,
        },
        {
          id: 'g2',
          busId: 'b4',
          name: 'Gen G2',
          sRatedMva: 50,
          vRatedKv: 13.8,
          rPu: 0,
          x1Pu: 0.12,
          x2Pu: 0.12,
          x0Pu: 0.04,
          grounded: false,
          xnPu: 0,
        },
      ],
      branches: [
        {
          id: 'br1',
          kind: 'transformer',
          name: 'Tx T1 (Δ–Yg)',
          fromBusId: 'b1',
          toBusId: 'b2',
          sRatedMva: 100,
          vPrimaryKv: 13.8,
          vSecondaryKv: 132,
          rPu: 0,
          xPu: 0.08,
          winding: 'delta_yg',
          xnPrimaryPu: 0,
          xnSecondaryPu: 0,
        },
        {
          id: 'br2',
          kind: 'line',
          name: 'Line L23-A',
          fromBusId: 'b2',
          toBusId: 'b3',
          inputMode: 'pu',
          r1: 0,
          x1: 0.2,
          r0: 0,
          x0: 0.5,
          sOrigMva: 100,
          vOrigKv: 132,
        },
        {
          id: 'br3',
          kind: 'line',
          name: 'Line L23-B',
          fromBusId: 'b2',
          toBusId: 'b3',
          inputMode: 'pu',
          r1: 0,
          x1: 0.2,
          r0: 0,
          x0: 0.5,
          sOrigMva: 100,
          vOrigKv: 132,
        },
        {
          id: 'br4',
          kind: 'transformer',
          name: 'Tx T2 (Yg–Yg)',
          fromBusId: 'b3',
          toBusId: 'b4',
          sRatedMva: 50,
          vPrimaryKv: 132,
          vSecondaryKv: 13.8,
          rPu: 0,
          xPu: 0.06,
          winding: 'yg_yg',
          xnPrimaryPu: 0,
          xnSecondaryPu: 0,
        },
      ],
    },
  },
  {
    id: 'pu_base_drill',
    label: 'Mixed MVA/kV Base Conversion Grid',
    summary: 'Demonstrates automatic MVA & Ohm-to-pu base conversion across 66 kV / 220 kV zones.',
    graph: {
      sBaseMva: 100,
      faultBusId: 'b3',
      faultType: '3ph',
      rfPu: 0,
      buses: [
        { id: 'b1', name: 'Bus 1', x: 145, y: 185, vBaseKv: 11 },
        { id: 'b2', name: 'Bus 2', x: 390, y: 185, vBaseKv: 220 },
        { id: 'b3', name: 'Bus 3', x: 640, y: 185, vBaseKv: 220 },
      ],
      generators: [
        {
          id: 'g1',
          busId: 'b1',
          name: 'Gen G1',
          sRatedMva: 60,
          vRatedKv: 11,
          rPu: 0,
          x1Pu: 0.15,
          x2Pu: 0.15,
          x0Pu: 0.05,
          grounded: true,
          xnPu: 0.03,
        },
      ],
      branches: [
        {
          id: 'br1',
          kind: 'transformer',
          name: 'Tx T1 (Yg–Yg)',
          fromBusId: 'b1',
          toBusId: 'b2',
          sRatedMva: 80,
          vPrimaryKv: 11,
          vSecondaryKv: 220,
          rPu: 0,
          xPu: 0.12,
          winding: 'yg_yg',
          xnPrimaryPu: 0,
          xnSecondaryPu: 0,
        },
        {
          id: 'br2',
          kind: 'line',
          name: 'Line 220kV (Ω)',
          fromBusId: 'b2',
          toBusId: 'b3',
          inputMode: 'ohm',
          r1: 6.2,
          x1: 38.4,
          r0: 14.5,
          x0: 96.0,
          sOrigMva: 100,
          vOrigKv: 220,
        },
      ],
    },
  },
];

// =========================================================================
// 8. ALL-FAULT BATCH COMPARISON & ASYMMETRICAL DC-OFFSET TRANSIENT ENGINE
// =========================================================================
export interface FaultCaseSummary {
  faultType: FaultType;
  label: string;
  shortLabel: string;
  classification: 'Symmetrical' | 'Asymmetrical';
  topologyHint: string;
  zLoop: Cpx;
  maxIPu: number;
  isBlockedByZeroSeq: boolean;
  analysis: FaultAnalysisResult;
}

export function solveAllFaultTypes(params: {
  ePreFaultPu?: number;
  z1: Cpx;
  z2: Cpx;
  z0: Cpx;
  z0Open: boolean;
  zf: Cpx;
  sBaseMva: number;
  vBaseLineKv: number;
}): FaultCaseSummary[] {
  const E = cpx(params.ePreFaultPu ?? 1.0, 0);
  const { z1, z2, z0, z0Open, zf, sBaseMva, vBaseLineKv } = params;
  const iBaseKa = sBaseMva / (Math.sqrt(3) * Math.max(0.1, vBaseLineKv));

  const defs: {
    faultType: FaultType;
    label: string;
    shortLabel: string;
    classification: 'Symmetrical' | 'Asymmetrical';
    topologyHint: string;
  }[] = [
    {
      faultType: '3ph',
      label: '3-Phase Balanced',
      shortLabel: '3ϕ',
      classification: 'Symmetrical',
      topologyHint: 'Positive sequence only: I₁ = E / (Z₁ + Z_f)',
    },
    {
      faultType: 'slg',
      label: 'Single Line-to-Ground (a–g)',
      shortLabel: 'SLG',
      classification: 'Asymmetrical',
      topologyHint: 'Series (1–2–0): I₁ = I₂ = I₀ = E / (Z₁ + Z₂ + Z₀ + 3Z_f)',
    },
    {
      faultType: 'll',
      label: 'Line-to-Line (b–c)',
      shortLabel: 'LL',
      classification: 'Asymmetrical',
      topologyHint: 'Anti-parallel (1–2): I₂ = −I₁, I₀ = 0',
    },
    {
      faultType: 'dlg',
      label: 'Double Line-to-Ground (b–c–g)',
      shortLabel: 'DLG',
      classification: 'Asymmetrical',
      topologyHint: 'Parallel [Z₁ + Z₂ ∥ (Z₀ + 3Z_f)]',
    },
  ];

  return defs.map((def) => {
    if (z0Open && def.faultType === 'slg') {
      const zero = cpx(0, 0);
      return {
        ...def,
        zLoop: cpx(0, 1e9),
        maxIPu: 0,
        isBlockedByZeroSeq: true,
        analysis: {
          i0: zero,
          i1: zero,
          i2: zero,
          ia: zero,
          ib: zero,
          ic: zero,
          v0: zero,
          v1: E,
          v2: zero,
          va: E,
          vb: cMul(E, FORTESCUE_A2),
          vc: cMul(E, FORTESCUE_A),
          iBaseKa,
          faultCurrentKa: 0,
          faultMva: 0,
        },
      };
    }

    if (z0Open && def.faultType === 'dlg') {
      const zLoop = cAdd(cAdd(z1, z2), zf);
      const i1 = cDiv(E, zLoop);
      const i2 = cScale(i1, -1);
      const i0 = cpx(0, 0);
      const v1 = cSub(E, cMul(i1, z1));
      const v2 = cScale(cMul(i2, z2), -1);
      const v0 = cpx(0, 0);
      const { va: ia, vb: ib, vc: ic } = composeFromSequence(i0, i1, i2);
      const { va, vb, vc } = composeFromSequence(v0, v1, v2);
      const maxIPu = Math.max(cMag(ia), cMag(ib), cMag(ic));
      return {
        ...def,
        zLoop,
        maxIPu,
        isBlockedByZeroSeq: true,
        analysis: {
          i0,
          i1,
          i2,
          ia,
          ib,
          ic,
          v0,
          v1,
          v2,
          va,
          vb,
          vc,
          iBaseKa,
          faultCurrentKa: maxIPu * iBaseKa,
          faultMva: maxIPu * sBaseMva,
        },
      };
    }

    let zLoop = cAdd(z1, zf);
    if (def.faultType === 'slg') {
      zLoop = cAdd(cAdd(cAdd(z1, z2), z0), cScale(zf, 3));
    } else if (def.faultType === 'll') {
      zLoop = cAdd(cAdd(z1, z2), zf);
    } else if (def.faultType === 'dlg') {
      const z0eff = cAdd(z0, cScale(zf, 3));
      const zPar = cDiv(cMul(z2, z0eff), cAdd(z2, z0eff));
      zLoop = cAdd(z1, zPar);
    }

    const analysis = solvePowerFault({
      faultType: def.faultType,
      ePreFaultPu: E.re,
      z1,
      z2,
      z0,
      zf,
      sBaseMva,
      vBaseLineKv,
    });

    const maxIPu = Math.max(cMag(analysis.ia), cMag(analysis.ib), cMag(analysis.ic));
    return {
      ...def,
      zLoop,
      maxIPu,
      isBlockedByZeroSeq: false,
      analysis,
    };
  });
}

export type FaultInceptionMode = 'worst_case' | 'zero_crossing' | 'custom';

export interface AsymmetricalTransientPoint {
  tMs: number;
  iTotalKa: number;
  iAcKa: number;
  iDcKa: number;
  envUpperKa: number;
  envLowerKa: number;
}

export interface AsymmetricalTransientResult {
  xrRatio: number;
  xrSource: 'network' | 'fallback';
  tauDcMs: number;
  tPartMs: number;
  dcOffsetFactor0: number;
  kAsymAtParting: number;
  symRmsKa: number;
  asymRmsKa: number;
  symInterruptingMva: number;
  asymInterruptingMva: number;
  peakMomentaryKa: number;
  peakDoublingFactor: number;
  waveform: AsymmetricalTransientPoint[];
}

export function computeAsymmetricalFaultTransient(params: {
  symRmsKa: number;
  symInterruptingMva: number;
  zLoop: Cpx;
  freqHz: 50 | 60;
  contactCycles: number;
  inceptionMode: FaultInceptionMode;
  customInceptionDeg: number;
  fallbackXR: number;
}): AsymmetricalTransientResult {
  const symRmsKa = Math.max(0, params.symRmsKa);
  const symMva = Math.max(0, params.symInterruptingMva);
  const freq = params.freqHz;
  const omega = 2 * Math.PI * freq;
  const tPartSec = Math.max(0.5, params.contactCycles) / freq;
  const tPartMs = tPartSec * 1000;

  const rLoop = Math.max(0, params.zLoop.re);
  const xLoop = Math.max(1e-5, params.zLoop.im);
  const hasNetworkR = rLoop > 1e-4;
  const xrRatio = hasNetworkR ? Math.min(200, xLoop / rLoop) : Math.max(1, params.fallbackXR);
  const xrSource: 'network' | 'fallback' = hasNetworkR ? 'network' : 'fallback';

  const thetaRad = Math.atan(xrRatio);
  let phaseShiftRad = -Math.PI / 2; // alpha - theta for worst-case full DC offset
  if (params.inceptionMode === 'zero_crossing') {
    phaseShiftRad = 0; // alpha = theta -> zero DC offset
  } else if (params.inceptionMode === 'custom') {
    const alphaRad = (params.customInceptionDeg * Math.PI) / 180;
    phaseShiftRad = alphaRad - thetaRad;
  }

  // i(t) = sqrt(2)*I_sym * [ sin(omega*t + (alpha - theta)) - sin(alpha - theta)*e^(-t/tau) ]
  const dcOffsetFactor0 = -Math.sin(phaseShiftRad);
  const tauDcSec = xrRatio / omega;
  const tauDcMs = tauDcSec * 1000;

  const kAsymAtParting = Math.sqrt(
    1 + 2 * dcOffsetFactor0 * dcOffsetFactor0 * Math.exp((-2 * tPartSec) / Math.max(1e-6, tauDcSec))
  );
  const asymRmsKa = symRmsKa * kAsymAtParting;
  const asymInterruptingMva = symMva * kAsymAtParting;

  const totalCycles = 6;
  const totalSec = totalCycles / freq;
  const samples = 180;
  const iPeakAc = Math.SQRT2 * symRmsKa;
  const waveform: AsymmetricalTransientPoint[] = [];

  let peakMomentaryKa = 0;
  for (let i = 0; i <= samples; i++) {
    const t = (totalSec * i) / samples;
    const tMs = t * 1000;
    const iAcKa = iPeakAc * Math.sin(omega * t + phaseShiftRad);
    const iDcKa = iPeakAc * dcOffsetFactor0 * Math.exp(-t / Math.max(1e-6, tauDcSec));
    const iTotalKa = iAcKa + iDcKa;
    peakMomentaryKa = Math.max(peakMomentaryKa, Math.abs(iTotalKa));

    waveform.push({
      tMs: Number(tMs.toFixed(2)),
      iTotalKa: Number(iTotalKa.toFixed(3)),
      iAcKa: Number(iAcKa.toFixed(3)),
      iDcKa: Number(iDcKa.toFixed(3)),
      envUpperKa: Number((iDcKa + iPeakAc).toFixed(3)),
      envLowerKa: Number((iDcKa - iPeakAc).toFixed(3)),
    });
  }

  const peakDoublingFactor =
    iPeakAc > 1e-6 ? peakMomentaryKa / iPeakAc : 0;

  return {
    xrRatio,
    xrSource,
    tauDcMs,
    tPartMs,
    dcOffsetFactor0,
    kAsymAtParting,
    symRmsKa,
    asymRmsKa,
    symInterruptingMva: symMva,
    asymInterruptingMva,
    peakMomentaryKa,
    peakDoublingFactor,
    waveform,
  };
}


