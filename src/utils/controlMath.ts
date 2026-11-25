// Real numerical control theory & linear algebra engine for ECE 433 Control System II

export type Mat2 = [[number, number], [number, number]];
export type Vec2 = [number, number];

export interface ComplexNum {
  re: number;
  im: number;
}

export interface PidSimConfig {
  plantK: number;
  tau1: number;
  tau2: number;
  kp: number;
  ki: number;
  kd: number;
  uMax: number;
  antiWindup: 'none' | 'clamping' | 'back_calc';
  tEnd?: number;
  dt?: number;
}

export interface PidSimResult {
  times: number[];
  outputs: number[];
  controls: number[];
  integrals: number[];
  overshootPct: number;
  settlingTime: number;
  riseTime: number;
  steadyStateError: number;
  saturatedFraction: number;
}

export interface BodePoint {
  w: number;
  magDb: number;
  phaseDeg: number;
}

export interface BodeAnalysisResult {
  uncomp: BodePoint[];
  comp: BodePoint[];
  uncompPM: number;
  uncompGM: number;
  uncompWgc: number | null;
  compPM: number;
  compGM: number;
  compWgc: number | null;
  stepUncomp: number[];
  stepComp: number[];
  stepTimes: number[];
}

export interface CanonicalFormsResult {
  ccf: { A: Mat2; B: Vec2; C: Vec2; D: number };
  ocf: { A: Mat2; B: Vec2; C: Vec2; D: number };
  modal: {
    A: Mat2;
    B: Vec2;
    C: Vec2;
    D: number;
    modeType: 'distinct_real' | 'repeated_jordan' | 'complex_conjugate';
    eigenvalues: [ComplexNum, ComplexNum];
  };
  tfFromCcf: { b1: number; b0: number; a1: number; a0: number };
  zeros: number[];
  kalmanC: Mat2;
  kalmanO: Mat2;
  rankC: number;
  rankO: number;
  detC: number;
  detO: number;
  gilbertControllable: [boolean, boolean];
  gilbertObservable: [boolean, boolean];
}

export interface PoleObserverSimResult {
  K: Vec2;
  Ki: number;
  Nr: number;
  L: Vec2;
  times: number[];
  yTrue: number[];
  x1True: number[];
  x2True: number[];
  x1Hat: number[];
  x2Hat: number[];
  errNorm: number[];
  uSignal: number[];
  clPoles: [ComplexNum, ComplexNum];
  obsPoles: [ComplexNum, ComplexNum];
}

// =========================================================================
// 1. PID CLOSED-LOOP RK4 SIMULATOR WITH ACTUATOR SATURATION & ANTI-WINDUP
// =========================================================================
export function simulatePidLoop(cfg: PidSimConfig): PidSimResult {
  const dt = cfg.dt ?? 0.02;
  const tEnd = cfg.tEnd ?? 12.0;
  const steps = Math.round(tEnd / dt);

  // Plant: G(s) = K / ((tau1*s + 1)(tau2*s + 1)) = K / (tau1*tau2*s^2 + (tau1+tau2)*s + 1)
  const a2 = Math.max(0.02, cfg.tau1 * cfg.tau2);
  const a1 = cfg.tau1 + cfg.tau2;
  const a0 = 1.0;

  let y = 0;
  let yDot = 0;
  let integ = 0;
  let prevErr = 1.0; // unit step r = 1

  const times: number[] = [];
  const outputs: number[] = [];
  const controls: number[] = [];
  const integrals: number[] = [];
  let satCount = 0;

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const r = 1.0;
    const err = r - y;
    const dErr = i === 0 ? 0 : (err - prevErr) / dt;
    prevErr = err;

    const pTerm = cfg.kp * err;
    const dTerm = cfg.kd * dErr;
    const uRaw = pTerm + cfg.ki * integ + dTerm;
    const uSat = Math.max(-cfg.uMax, Math.min(cfg.uMax, uRaw));
    const isSat = Math.abs(uRaw - uSat) > 1e-6;
    if (isSat) satCount += 1;

    times.push(t);
    outputs.push(y);
    controls.push(uSat);
    integrals.push(cfg.ki * integ);

    // Anti-windup update for next step
    if (cfg.antiWindup === 'clamping') {
      const pushesFurther =
        (uRaw > cfg.uMax && err > 0) || (uRaw < -cfg.uMax && err < 0);
      if (!pushesFurther) {
        integ += err * dt;
      }
    } else if (cfg.antiWindup === 'back_calc') {
      const kb = cfg.ki > 0 ? Math.min(4.0, Math.max(0.5, cfg.ki)) : 1.0;
      integ += (err + kb * (uSat - uRaw)) * dt;
    } else {
      integ += err * dt;
    }

    // RK4 step for plant states [y, yDot] with constant ZOH uSat over dt
    const deriv = (stY: number, stYd: number): [number, number] => {
      const ydd = (cfg.plantK * uSat - a1 * stYd - a0 * stY) / a2;
      return [stYd, ydd];
    };

    const [k1y, k1yd] = deriv(y, yDot);
    const [k2y, k2yd] = deriv(y + 0.5 * dt * k1y, yDot + 0.5 * dt * k1yd);
    const [k3y, k3yd] = deriv(y + 0.5 * dt * k2y, yDot + 0.5 * dt * k2yd);
    const [k4y, k4yd] = deriv(y + dt * k3y, yDot + dt * k3yd);

    y += (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    yDot += (dt / 6) * (k1yd + 2 * k2yd + 2 * k3yd + k4yd);

    if (!Number.isFinite(y) || Math.abs(y) > 50) {
      // Clamp runaway unstable plot safely
      y = Math.sign(y || 1) * 50;
      yDot = 0;
    }
  }

  const yFinal = outputs[outputs.length - 1];
  const yMax = Math.max(...outputs);
  const target = 1.0;
  const overshootPct =
    yMax > target && Math.abs(yFinal) < 10
      ? Math.max(0, ((yMax - target) / target) * 100)
      : 0;

  let riseTime = tEnd;
  let t10: number | null = null;
  let t90: number | null = null;
  for (let i = 0; i < outputs.length; i++) {
    if (t10 === null && outputs[i] >= 0.1 * target) t10 = times[i];
    if (t90 === null && outputs[i] >= 0.9 * target) {
      t90 = times[i];
      break;
    }
  }
  if (t10 !== null && t90 !== null) {
    riseTime = Math.max(0.02, t90 - t10);
  }

  let settlingTime = tEnd;
  for (let i = outputs.length - 1; i >= 0; i--) {
    if (Math.abs(outputs[i] - yFinal) > 0.02 * Math.max(1, Math.abs(yFinal))) {
      settlingTime = times[Math.min(outputs.length - 1, i + 1)];
      break;
    }
    if (i === 0) settlingTime = 0;
  }

  return {
    times,
    outputs,
    controls,
    integrals,
    overshootPct,
    settlingTime,
    riseTime,
    steadyStateError: Math.abs(1.0 - yFinal),
    saturatedFraction: satCount / Math.max(1, times.length),
  };
}

export function zieglerNicholsClosedLoop(
  ku: number,
  pu: number,
  mode: 'P' | 'PI' | 'PID'
): { kp: number; ki: number; kd: number; ti: number; td: number } {
  if (mode === 'P') {
    return { kp: 0.5 * ku, ki: 0, kd: 0, ti: Infinity, td: 0 };
  }
  if (mode === 'PI') {
    const kp = 0.45 * ku;
    const ti = pu / 1.2;
    return { kp, ki: kp / ti, kd: 0, ti, td: 0 };
  }
  const kp = 0.6 * ku;
  const ti = 0.5 * pu;
  const td = 0.125 * pu;
  return { kp, ki: kp / ti, kd: kp * td, ti, td };
}

export function zieglerNicholsOpenLoop(
  kPlant: number,
  L: number,
  T: number,
  mode: 'P' | 'PI' | 'PID'
): { kp: number; ki: number; kd: number; ti: number; td: number } {
  const safeKL = Math.max(0.01, kPlant * L);
  if (mode === 'P') {
    return { kp: T / safeKL, ki: 0, kd: 0, ti: Infinity, td: 0 };
  }
  if (mode === 'PI') {
    const kp = (0.9 * T) / safeKL;
    const ti = L / 0.3;
    return { kp, ki: kp / ti, kd: 0, ti, td: 0 };
  }
  const kp = (1.2 * T) / safeKL;
  const ti = 2.0 * L;
  const td = 0.5 * L;
  return { kp, ki: kp / ti, kd: kp * td, ti, td };
}

// =========================================================================
// 2. FREQUENCY-DOMAIN BODE LEAD / LAG / PI / PD COMPENSATOR ENGINE
// =========================================================================
interface ComplexVal {
  re: number;
  im: number;
}

function cMul(a: ComplexVal, b: ComplexVal): ComplexVal {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

function cDiv(a: ComplexVal, b: ComplexVal): ComplexVal {
  const den = b.re * b.re + b.im * b.im + 1e-18;
  return {
    re: (a.re * b.re + a.im * b.im) / den,
    im: (a.im * b.re - a.re * b.im) / den,
  };
}

export function analyzeFrequencyCompensation(params: {
  plantK: number;
  p1: number;
  p2: number;
  compType: 'lead' | 'lag' | 'lead_lag' | 'pd' | 'pi';
  kc: number;
  alphaLead: number; // < 1 (e.g. 0.25)
  tauLead: number;
  betaLag: number; // > 1 (e.g. 6.0)
  tauLag: number;
}): BodeAnalysisResult {
  const nPts = 140;
  const wMin = 0.05;
  const wMax = 150;
  const uncomp: BodePoint[] = [];
  const comp: BodePoint[] = [];

  // Plant: G(s) = K / (s * (s/p1 + 1) * (s/p2 + 1)) -> Type 1 servo motor plant
  const evalPlant = (w: number): ComplexVal => {
    const s: ComplexVal = { re: 0, im: w };
    const f1: ComplexVal = { re: 1, im: w / params.p1 };
    const f2: ComplexVal = { re: 1, im: w / params.p2 };
    const den = cMul(s, cMul(f1, f2));
    return cDiv({ re: params.plantK, im: 0 }, den);
  };

  const evalComp = (w: number): ComplexVal => {
    if (params.compType === 'lead') {
      return cMul(
        { re: params.kc, im: 0 },
        cDiv({ re: 1, im: w * params.tauLead }, { re: 1, im: w * params.alphaLead * params.tauLead })
      );
    }
    if (params.compType === 'lag') {
      return cMul(
        { re: params.kc, im: 0 },
        cDiv({ re: 1, im: w * params.tauLag }, { re: 1, im: w * params.betaLag * params.tauLag })
      );
    }
    if (params.compType === 'lead_lag') {
      const lead = cDiv(
        { re: 1, im: w * params.tauLead },
        { re: 1, im: w * params.alphaLead * params.tauLead }
      );
      const lag = cDiv(
        { re: 1, im: w * params.tauLag },
        { re: 1, im: w * params.betaLag * params.tauLag }
      );
      return cMul({ re: params.kc, im: 0 }, cMul(lead, lag));
    }
    if (params.compType === 'pd') {
      // Ideal PD with high-freq rolloff pole at 10x zero for physical realizability
      return cMul(
        { re: params.kc, im: 0 },
        cDiv({ re: 1, im: w * params.tauLead }, { re: 1, im: w * 0.05 * params.tauLead })
      );
    }
    // PI: Kc * (1 + tauLag*s) / (tauLag*s)
    return cMul(
      { re: params.kc, im: 0 },
      cDiv({ re: 1, im: w * params.tauLag }, { re: 0, im: w * params.tauLag })
    );
  };

  const unwrapPhase = (rawDeg: number, prevDeg: number | null): number => {
    if (prevDeg === null) return rawDeg;
    let d = rawDeg;
    while (d - prevDeg > 180) d -= 360;
    while (d - prevDeg < -180) d += 360;
    return d;
  };

  let prevU: number | null = null;
  let prevC: number | null = null;

  for (let i = 0; i < nPts; i++) {
    const w = wMin * Math.pow(wMax / wMin, i / (nPts - 1));
    const g = evalPlant(w);
    const c = evalComp(w);
    const l = cMul(c, g);

    const gMag = Math.hypot(g.re, g.im);
    let gPh = (Math.atan2(g.im, g.re) * 180) / Math.PI;
    if (gPh > 0) gPh -= 360;
    gPh = unwrapPhase(gPh, prevU);
    prevU = gPh;

    const lMag = Math.hypot(l.re, l.im);
    let lPh = (Math.atan2(l.im, l.re) * 180) / Math.PI;
    if (lPh > 0) lPh -= 360;
    lPh = unwrapPhase(lPh, prevC);
    prevC = lPh;

    uncomp.push({ w, magDb: 20 * Math.log10(Math.max(1e-8, gMag)), phaseDeg: gPh });
    comp.push({ w, magDb: 20 * Math.log10(Math.max(1e-8, lMag)), phaseDeg: lPh });
  }

  const computeMargins = (pts: BodePoint[]) => {
    let wgc: number | null = null;
    let pm = 0;
    let gm = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (wgc === null && ((a.magDb >= 0 && b.magDb <= 0) || (a.magDb <= 0 && b.magDb >= 0))) {
        const frac = (0 - a.magDb) / (b.magDb - a.magDb || 1e-9);
        wgc = a.w + frac * (b.w - a.w);
        const phAtCross = a.phaseDeg + frac * (b.phaseDeg - a.phaseDeg);
        pm = 180 + phAtCross;
      }
      if ((a.phaseDeg >= -180 && b.phaseDeg <= -180) || (a.phaseDeg <= -180 && b.phaseDeg >= -180)) {
        const frac = (-180 - a.phaseDeg) / (b.phaseDeg - a.phaseDeg || 1e-9);
        const magAt180 = a.magDb + frac * (b.magDb - a.magDb);
        gm = -magAt180;
      }
    }
    return { wgc, pm, gm };
  };

  const mU = computeMargins(uncomp);
  const mC = computeMargins(comp);

  // Quick closed-loop step verification via state-space simulation
  const stepTimes: number[] = [];
  const stepUncomp: number[] = [];
  const stepComp: number[] = [];
  const dt = 0.025;
  const steps = 280; // 7 seconds

  // Uncompensated Plant states: x1 = y, x2 = yDot, x3 = yDDot
  // s*(s/p1+1)*(s/p2+1) = (1/(p1*p2)) s^3 + (1/p1 + 1/p2) s^2 + s
  const c3 = 1 / (params.p1 * params.p2);
  const c2 = 1 / params.p1 + 1 / params.p2;
  let ux1 = 0, ux2 = 0, ux3 = 0;
  // Compensated plant + 1st-order compensator state xc
  let cx1 = 0, cx2 = 0, cx3 = 0, xc1 = 0, xc2 = 0;

  for (let i = 0; i <= steps; i++) {
    stepTimes.push(i * dt);
    stepUncomp.push(ux1);
    stepComp.push(cx1);

    // Uncomp Euler/RK2 step
    const uErr = 1.0 - ux1;
    const ux3Dot = (params.plantK * uErr - c2 * ux3 - ux2) / c3;
    ux1 += ux2 * dt;
    ux2 += ux3 * dt;
    ux3 += Math.max(-500, Math.min(500, ux3Dot)) * dt;
    ux1 = Math.max(-5, Math.min(5, ux1));

    // Comp step
    const cErr = 1.0 - cx1;
    let uCtrl = params.kc * cErr;
    if (params.compType === 'lead') {
      const tp = params.alphaLead * params.tauLead;
      const xcDot = (cErr - xc1) / Math.max(0.005, tp);
      xc1 += xcDot * dt;
      uCtrl = params.kc * (xc1 + params.tauLead * xcDot);
    } else if (params.compType === 'lag') {
      const tp = params.betaLag * params.tauLag;
      const xcDot = (cErr - xc1) / Math.max(0.005, tp);
      xc1 += xcDot * dt;
      uCtrl = params.kc * (xc1 + params.tauLag * xcDot);
    } else if (params.compType === 'lead_lag') {
      const tp1 = params.alphaLead * params.tauLead;
      const xc1Dot = (cErr - xc1) / Math.max(0.005, tp1);
      xc1 += xc1Dot * dt;
      const mid = xc1 + params.tauLead * xc1Dot;
      const tp2 = params.betaLag * params.tauLag;
      const xc2Dot = (mid - xc2) / Math.max(0.005, tp2);
      xc2 += xc2Dot * dt;
      uCtrl = params.kc * (xc2 + params.tauLag * xc2Dot);
    } else if (params.compType === 'pd') {
      const tp = 0.05 * params.tauLead;
      const xcDot = (cErr - xc1) / Math.max(0.005, tp);
      xc1 += xcDot * dt;
      uCtrl = params.kc * (xc1 + params.tauLead * xcDot);
    } else {
      xc1 += (cErr / Math.max(0.05, params.tauLag)) * dt;
      uCtrl = params.kc * (cErr + xc1);
    }

    const cx3Dot = (params.plantK * uCtrl - c2 * cx3 - cx2) / c3;
    cx1 += cx2 * dt;
    cx2 += cx3 * dt;
    cx3 += Math.max(-500, Math.min(500, cx3Dot)) * dt;
    cx1 = Math.max(-5, Math.min(5, cx1));
  }

  return {
    uncomp,
    comp,
    uncompPM: mU.pm,
    uncompGM: mU.gm,
    uncompWgc: mU.wgc,
    compPM: mC.pm,
    compGM: mC.gm,
    compWgc: mC.wgc,
    stepUncomp,
    stepComp,
    stepTimes,
  };
}

// =========================================================================
// 3. 2x2 LINEAR ALGEBRA, CANONICAL FORMS, KALMAN/GILBERT & e^(At)
// =========================================================================
export function mat2Mul(A: Mat2, B: Mat2): Mat2 {
  return [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ];
}

export function mat2Vec(A: Mat2, v: Vec2): Vec2 {
  return [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
}

export function mat2Det(A: Mat2): number {
  return A[0][0] * A[1][1] - A[0][1] * A[1][0];
}

export function mat2Inv(A: Mat2): Mat2 | null {
  const det = mat2Det(A);
  if (Math.abs(det) < 1e-9) return null;
  return [
    [A[1][1] / det, -A[0][1] / det],
    [-A[1][0] / det, A[0][0] / det],
  ];
}

export function mat2Rank(M: Mat2, tol = 1e-7): number {
  const det = Math.abs(mat2Det(M));
  const norm =
    Math.max(
      Math.abs(M[0][0]),
      Math.abs(M[0][1]),
      Math.abs(M[1][0]),
      Math.abs(M[1][1])
    ) + 1e-12;
  if (norm <= tol) return 0;
  if (det / (norm * norm) > tol) return 2;
  return 1;
}

export function mat2Eigenvalues(A: Mat2): [ComplexNum, ComplexNum] {
  const tr = A[0][0] + A[1][1];
  const det = mat2Det(A);
  const disc = tr * tr - 4 * det;
  if (disc >= 0) {
    const sq = Math.sqrt(disc);
    return [
      { re: 0.5 * (tr + sq), im: 0 },
      { re: 0.5 * (tr - sq), im: 0 },
    ];
  }
  const im = 0.5 * Math.sqrt(-disc);
  return [
    { re: 0.5 * tr, im },
    { re: 0.5 * tr, im: -im },
  ];
}

export function computeMatrixExp2x2(A: Mat2, t: number): Mat2 {
  // Scaling and squaring with 6-term Taylor series
  const At: Mat2 = [
    [A[0][0] * t, A[0][1] * t],
    [A[1][0] * t, A[1][1] * t],
  ];
  const maxNorm = Math.max(
    Math.abs(At[0][0]) + Math.abs(At[0][1]),
    Math.abs(At[1][0]) + Math.abs(At[1][1])
  );
  const s = maxNorm > 0.5 ? Math.ceil(Math.log2(maxNorm / 0.5)) : 0;
  const scale = Math.pow(2, s);
  const M: Mat2 = [
    [At[0][0] / scale, At[0][1] / scale],
    [At[1][0] / scale, At[1][1] / scale],
  ];

  let res: Mat2 = [
    [1, 0],
    [0, 1],
  ];
  let term: Mat2 = [
    [1, 0],
    [0, 1],
  ];
  for (let k = 1; k <= 12; k++) {
    term = mat2Mul(term, M);
    term = [
      [term[0][0] / k, term[0][1] / k],
      [term[1][0] / k, term[1][1] / k],
    ];
    res = [
      [res[0][0] + term[0][0], res[0][1] + term[0][1]],
      [res[1][0] + term[1][0], res[1][1] + term[1][1]],
    ];
  }

  for (let i = 0; i < s; i++) {
    res = mat2Mul(res, res);
  }
  return res;
}

export function analyzeTransferFunction2ndOrder(
  b1: number,
  b0: number,
  a1: number,
  a0: number
): CanonicalFormsResult {
  // G(s) = (b1*s + b0) / (s^2 + a1*s + a0)
  const ccfA: Mat2 = [
    [0, 1],
    [-a0, -a1],
  ];
  const ccfB: Vec2 = [0, 1];
  const ccfC: Vec2 = [b0, b1];

  const ocfA: Mat2 = [
    [0, -a0],
    [1, -a1],
  ];
  const ocfB: Vec2 = [b0, b1];
  const ocfC: Vec2 = [0, 1];

  const eigs = mat2Eigenvalues(ccfA);
  let modalA: Mat2;
  let modalB: Vec2;
  let modalC: Vec2;
  let modeType: 'distinct_real' | 'repeated_jordan' | 'complex_conjugate';
  let gilbertC: [boolean, boolean];
  let gilbertO: [boolean, boolean];

  const disc = a1 * a1 - 4 * a0;
  if (Math.abs(disc) < 1e-6) {
    // Repeated eigenvalue lambda -> Jordan Canonical Form
    modeType = 'repeated_jordan';
    const lam = -a1 / 2;
    modalA = [
      [lam, 1],
      [0, lam],
    ];
    modalB = [0, 1];
    // C * (sI - J)^-1 * B = (c1 + c2(s-lam)) / (s-lam)^2 -> match b1*s + b0
    const c2 = b1;
    const c1 = b0 + b1 * lam;
    modalC = [c1, c2];
    gilbertC = [true, true];
    gilbertO = [Math.abs(c1) > 1e-6, Math.abs(c2) > 1e-6 || Math.abs(c1) > 1e-6];
  } else if (disc > 0) {
    modeType = 'distinct_real';
    const l1 = eigs[0].re;
    const l2 = eigs[1].re;
    modalA = [
      [l1, 0],
      [0, l2],
    ];
    // Partial fractions: (b1*s + b0)/((s-l1)(s-l2)) = r1/(s-l1) + r2/(s-l2)
    const r1 = (b1 * l1 + b0) / (l1 - l2);
    const r2 = (b1 * l2 + b0) / (l2 - l1);
    modalB = [1, 1];
    modalC = [r1, r2];
    gilbertC = [true, true];
    gilbertO = [Math.abs(r1) > 1e-6, Math.abs(r2) > 1e-6];
  } else {
    modeType = 'complex_conjugate';
    const sigma = eigs[0].re;
    const omega = Math.abs(eigs[0].im);
    modalA = [
      [sigma, omega],
      [-omega, sigma],
    ];
    modalB = [0, 1];
    // Transform from CCF using V = [[1, 0], [sigma, omega]]
    const V: Mat2 = [
      [1, 0],
      [sigma, omega],
    ];
    const Vinv = mat2Inv(V)!;
    modalB = mat2Vec(Vinv, ccfB);
    modalC = [ccfC[0] * V[0][0] + ccfC[1] * V[1][0], ccfC[0] * V[0][1] + ccfC[1] * V[1][1]];
    gilbertC = [true, true];
    const hasZeroCancel = Math.abs(b1) < 1e-6 && Math.abs(b0) < 1e-6;
    gilbertO = [!hasZeroCancel, !hasZeroCancel];
  }

  // Kalman Controllability C = [B, A*B] & Observability O = [C; C*A] on CCF
  const ab = mat2Vec(ccfA, ccfB);
  const kalmanC: Mat2 = [
    [ccfB[0], ab[0]],
    [ccfB[1], ab[1]],
  ];
  const ca: Vec2 = [
    ccfC[0] * ccfA[0][0] + ccfC[1] * ccfA[1][0],
    ccfC[0] * ccfA[0][1] + ccfC[1] * ccfA[1][1],
  ];
  const kalmanO: Mat2 = [
    [ccfC[0], ccfC[1]],
    [ca[0], ca[1]],
  ];

  const zeros = Math.abs(b1) > 1e-7 ? [-b0 / b1] : [];

  return {
    ccf: { A: ccfA, B: ccfB, C: ccfC, D: 0 },
    ocf: { A: ocfA, B: ocfB, C: ocfC, D: 0 },
    modal: {
      A: modalA,
      B: modalB,
      C: modalC,
      D: 0,
      modeType,
      eigenvalues: eigs,
    },
    tfFromCcf: { b1, b0, a1, a0 },
    zeros,
    kalmanC,
    kalmanO,
    rankC: mat2Rank(kalmanC),
    rankO: mat2Rank(kalmanO),
    detC: mat2Det(kalmanC),
    detO: mat2Det(kalmanO),
    gilbertControllable: gilbertC,
    gilbertObservable: gilbertO,
  };
}

export function analyzeGeneralStateSpace2x2(
  A: Mat2,
  B: Vec2,
  C: Vec2
): {
  eigs: [ComplexNum, ComplexNum];
  kalmanC: Mat2;
  kalmanO: Mat2;
  rankC: number;
  rankO: number;
  detC: number;
  detO: number;
  tfNum: [number, number]; // b1*s + b0
  tfDen: [number, number]; // s^2 + a1*s + a0 -> [a1, a0]
} {
  const eigs = mat2Eigenvalues(A);
  const ab = mat2Vec(A, B);
  const kalmanC: Mat2 = [
    [B[0], ab[0]],
    [B[1], ab[1]],
  ];
  const ca: Vec2 = [
    C[0] * A[0][0] + C[1] * A[1][0],
    C[0] * A[0][1] + C[1] * A[1][1],
  ];
  const kalmanO: Mat2 = [
    [C[0], C[1]],
    [ca[0], ca[1]],
  ];

  // G(s) = C * adj(sI - A) * B / det(sI - A)
  // adj(sI - A) = s*I + [[ -A22, A12], [A21, -A11 ]]? Wait:
  // sI - A = [[s - a11, -a12], [-a21, s - a22]]
  // adj = [[s - a22, a12], [a21, s - a11]] = s*I + [[-a22, a12], [a21, -a11]]
  const b1 = C[0] * B[0] + C[1] * B[1];
  const adjConstB: Vec2 = [
    -A[1][1] * B[0] + A[0][1] * B[1],
    A[1][0] * B[0] - A[0][0] * B[1],
  ];
  const b0 = C[0] * adjConstB[0] + C[1] * adjConstB[1];
  const a1 = -(A[0][0] + A[1][1]);
  const a0 = mat2Det(A);

  return {
    eigs,
    kalmanC,
    kalmanO,
    rankC: mat2Rank(kalmanC),
    rankO: mat2Rank(kalmanO),
    detC: mat2Det(kalmanC),
    detO: mat2Det(kalmanO),
    tfNum: [b1, b0],
    tfDen: [a1, a0],
  };
}

// =========================================================================
// 4. POLE PLACEMENT (ACKERMANN + INTEGRAL SERVO) & LUENBERGER OBSERVER
// =========================================================================
export function designPolePlacementAndObserver(params: {
  A: Mat2;
  B: Vec2;
  C: Vec2;
  p1: number;
  p2: number;
  obsMultiplier: number; // observer poles placed at obsMultiplier * p1, p2
  useIntegralControl: boolean;
  pInt: number; // 3rd pole for integral servo
  x0: Vec2;
  xHat0: Vec2;
  refStep: number;
}): PoleObserverSimResult | null {
  const { A, B, C, p1, p2, obsMultiplier, useIntegralControl, pInt, x0, xHat0, refStep } = params;

  const ab = mat2Vec(A, B);
  const kalmanC: Mat2 = [
    [B[0], ab[0]],
    [B[1], ab[1]],
  ];
  const cInv = mat2Inv(kalmanC);
  if (!cInv) return null;

  // Desired char poly: (s - p1)(s - p2) = s^2 + alpha1*s + alpha0
  const alpha1 = -(p1 + p2);
  const alpha0 = p1 * p2;

  // Ackermann: K = [0 1] * C^{-1} * (A^2 + alpha1*A + alpha0*I)
  const A2 = mat2Mul(A, A);
  const pA: Mat2 = [
    [A2[0][0] + alpha1 * A[0][0] + alpha0, A2[0][1] + alpha1 * A[0][1]],
    [A2[1][0] + alpha1 * A[1][0], A2[1][1] + alpha1 * A[1][1] + alpha0],
  ];
  const row2Cinv: Vec2 = [cInv[1][0], cInv[1][1]];
  const K: Vec2 = [
    row2Cinv[0] * pA[0][0] + row2Cinv[1] * pA[1][0],
    row2Cinv[0] * pA[0][1] + row2Cinv[1] * pA[1][1],
  ];

  // Observer dual Ackermann on (A^T, C^T)
  const AT: Mat2 = [
    [A[0][0], A[1][0]],
    [A[0][1], A[1][1]],
  ];
  const ca: Vec2 = [
    C[0] * A[0][0] + C[1] * A[1][0],
    C[0] * A[0][1] + C[1] * A[1][1],
  ];
  const kalmanO: Mat2 = [
    [C[0], C[1]],
    [ca[0], ca[1]],
  ];
  const oInv = mat2Inv(kalmanO);
  if (!oInv) return null;

  const q1 = p1 * obsMultiplier;
  const q2 = p2 * obsMultiplier;
  const obsA1 = -(q1 + q2);
  const obsA0 = q1 * q2;
  const AT2 = mat2Mul(AT, AT);
  const pAT: Mat2 = [
    [AT2[0][0] + obsA1 * AT[0][0] + obsA0, AT2[0][1] + obsA1 * AT[0][1]],
    [AT2[1][0] + obsA1 * AT[1][0], AT2[1][1] + obsA1 * AT[1][1] + obsA0],
  ];
  // L = pA * O^{-1} * [0; 1]
  const col2Oinv: Vec2 = [oInv[0][1], oInv[1][1]];
  // Wait: Ackermann for L^T on (A^T, C^T): O_dual = [C^T, A^T C^T] = O^T -> L^T = [0 1] * (O^T)^{-1} * p(A^T)
  const oTInv: Mat2 = [
    [oInv[0][0], oInv[1][0]],
    [oInv[0][1], oInv[1][1]],
  ];
  const row2OTinv: Vec2 = [oTInv[1][0], oTInv[1][1]];
  const L: Vec2 = [
    row2OTinv[0] * pAT[0][0] + row2OTinv[1] * pAT[1][0],
    row2OTinv[0] * pAT[0][1] + row2OTinv[1] * pAT[1][1],
  ];
  void col2Oinv;

  // Feedforward gain Nr for external reference when no integral control
  const Acl: Mat2 = [
    [A[0][0] - B[0] * K[0], A[0][1] - B[0] * K[1]],
    [A[1][0] - B[1] * K[0], A[1][1] - B[1] * K[1]],
  ];
  const AclInv = mat2Inv(Acl);
  let Nr = 1.0;
  if (AclInv) {
    const tmp = mat2Vec(AclInv, B);
    const dcGain = -(C[0] * tmp[0] + C[1] * tmp[1]);
    Nr = Math.abs(dcGain) > 1e-6 ? 1.0 / dcGain : 1.0;
  }

  // Optional 3rd-order Integral Servo Control:
  // Augmented: [A 0; -C 0], B_aug = [B; 0], K_aug = [K_reg, -Ki]
  // Desired poly: (s - p1)(s - p2)(s - pInt) = s^3 + d2*s^2 + d1*s + d0
  let K_active: Vec2 = [...K];
  let Ki = 0;
  if (useIntegralControl) {
    const d2 = -(p1 + p2 + pInt);
    const d1 = p1 * p2 + (p1 + p2) * pInt;
    const d0 = -p1 * p2 * pInt;

    // 3x3 Controllability matrix C_aug = [B_aug, A_aug*B_aug, A_aug^2*B_aug]
    const Aaug = [
      [A[0][0], A[0][1], 0],
      [A[1][0], A[1][1], 0],
      [-C[0], -C[1], 0],
    ];
    const Baug = [B[0], B[1], 0];
    const mul3v = (M: number[][], v: number[]) => [
      M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
      M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
      M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
    ];
    const mul3 = (M: number[][], N: number[][]) =>
      M.map((row) =>
        [0, 1, 2].map((j) => row[0] * N[0][j] + row[1] * N[1][j] + row[2] * N[2][j])
      );
    const col1 = Baug;
    const col2 = mul3v(Aaug, col1);
    const col3 = mul3v(Aaug, col2);
    const Caug = [
      [col1[0], col2[0], col3[0]],
      [col1[1], col2[1], col3[1]],
      [col1[2], col2[2], col3[2]],
    ];
    const inv3 = invert3x3(Caug);
    if (inv3) {
      const Aaug2 = mul3(Aaug, Aaug);
      const Aaug3 = mul3(Aaug2, Aaug);
      const polyA = [0, 1, 2].map((r) =>
        [0, 1, 2].map(
          (c) =>
            Aaug3[r][c] +
            d2 * Aaug2[r][c] +
            d1 * Aaug[r][c] +
            (r === c ? d0 : 0)
        )
      );
      const r3 = inv3[2];
      const kAug = [0, 1, 2].map(
        (c) => r3[0] * polyA[0][c] + r3[1] * polyA[1][c] + r3[2] * polyA[2][c]
      );
      K_active = [kAug[0], kAug[1]];
      Ki = -kAug[2];
    }
  }

  // Simulate true plant + Luenberger observer + optional integral state via RK4
  const dt = 0.015;
  const tEnd = 5.0;
  const steps = Math.round(tEnd / dt);
  let x: Vec2 = [...x0];
  let xh: Vec2 = [...xHat0];
  let xi = 0;

  const times: number[] = [];
  const yTrue: number[] = [];
  const x1True: number[] = [];
  const x2True: number[] = [];
  const x1Hat: number[] = [];
  const x2Hat: number[] = [];
  const errNorm: number[] = [];
  const uSignal: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const y = C[0] * x[0] + C[1] * x[1];
    const yh = C[0] * xh[0] + C[1] * xh[1];
    const u = useIntegralControl
      ? -(K_active[0] * xh[0] + K_active[1] * xh[1]) + Ki * xi
      : -(K_active[0] * xh[0] + K_active[1] * xh[1]) + Nr * refStep;

    times.push(t);
    yTrue.push(y);
    x1True.push(x[0]);
    x2True.push(x[1]);
    x1Hat.push(xh[0]);
    x2Hat.push(xh[1]);
    errNorm.push(Math.hypot(x[0] - xh[0], x[1] - xh[1]));
    uSignal.push(u);

    const stepState = (
      stX: Vec2,
      stXh: Vec2,
      stXi: number
    ): [Vec2, Vec2, number] => {
      const yy = C[0] * stX[0] + C[1] * stX[1];
      const yyh = C[0] * stXh[0] + C[1] * stXh[1];
      const uu = useIntegralControl
        ? -(K_active[0] * stXh[0] + K_active[1] * stXh[1]) + Ki * stXi
        : -(K_active[0] * stXh[0] + K_active[1] * stXh[1]) + Nr * refStep;
      const ax = mat2Vec(A, stX);
      const axh = mat2Vec(A, stXh);
      const innov = yy - yyh;
      const dx: Vec2 = [ax[0] + B[0] * uu, ax[1] + B[1] * uu];
      const dxh: Vec2 = [
        axh[0] + B[0] * uu + L[0] * innov,
        axh[1] + B[1] * uu + L[1] * innov,
      ];
      const dxi = refStep - yy;
      return [dx, dxh, dxi];
    };

    const [k1x, k1xh, k1xi] = stepState(x, xh, xi);
    const [k2x, k2xh, k2xi] = stepState(
      [x[0] + 0.5 * dt * k1x[0], x[1] + 0.5 * dt * k1x[1]],
      [xh[0] + 0.5 * dt * k1xh[0], xh[1] + 0.5 * dt * k1xh[1]],
      xi + 0.5 * dt * k1xi
    );
    const [k3x, k3xh, k3xi] = stepState(
      [x[0] + 0.5 * dt * k2x[0], x[1] + 0.5 * dt * k2x[1]],
      [xh[0] + 0.5 * dt * k2xh[0], xh[1] + 0.5 * dt * k2xh[1]],
      xi + 0.5 * dt * k2xi
    );
    const [k4x, k4xh, k4xi] = stepState(
      [x[0] + dt * k3x[0], x[1] + dt * k3x[1]],
      [xh[0] + dt * k3xh[0], xh[1] + dt * k3xh[1]],
      xi + dt * k3xi
    );

    x = [
      x[0] + (dt / 6) * (k1x[0] + 2 * k2x[0] + 2 * k3x[0] + k4x[0]),
      x[1] + (dt / 6) * (k1x[1] + 2 * k2x[1] + 2 * k3x[1] + k4x[1]),
    ];
    xh = [
      xh[0] + (dt / 6) * (k1xh[0] + 2 * k2xh[0] + 2 * k3xh[0] + k4xh[0]),
      xh[1] + (dt / 6) * (k1xh[1] + 2 * k2xh[1] + 2 * k3xh[1] + k4xh[1]),
    ];
    xi += (dt / 6) * (k1xi + 2 * k2xi + 2 * k3xi + k4xi);

    if (Math.abs(x[0]) > 50 || Math.abs(xh[0]) > 50) break;
  }

  return {
    K: K_active,
    Ki,
    Nr,
    L,
    times,
    yTrue,
    x1True,
    x2True,
    x1Hat,
    x2Hat,
    errNorm,
    uSignal,
    clPoles: [{ re: p1, im: 0 }, { re: p2, im: 0 }],
    obsPoles: [{ re: q1, im: 0 }, { re: q2, im: 0 }],
  };
}

function invert3x3(m: number[][]): number[][] | null {
  const [a, b, c] = m[0];
  const [d, e, f] = m[1];
  const [g, h, i] = m[2];
  const det =
    a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-9) return null;
  const invDet = 1 / det;
  return [
    [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
    [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
    [(d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet],
  ];
}

// =========================================================================
// 5. GENERAL POLYNOMIAL TRANSFER FUNCTION BODE & MARGIN GENERATOR
// =========================================================================
export interface GeneralBodeMargins {
  wgc: number | null;
  phaseMarginDeg: number | null;
  wpc: number | null;
  gainMarginDb: number | null;
}

export interface GeneralBodeResult {
  points: {
    w: number;
    uncompMagDb: number;
    uncompPhaseDeg: number;
    compMagDb: number;
    compPhaseDeg: number;
    compOnlyMagDb: number;
    compOnlyPhaseDeg: number;
  }[];
  uncomp: GeneralBodeMargins;
  comp: GeneralBodeMargins;
  systemType: number;
}

function evalPolyDescending(coeffs: number[], w: number): ComplexVal {
  // Evaluate P(j*w) = c_0 (j*w)^n + c_1 (j*w)^(n-1) + ... + c_n
  const n = coeffs.length - 1;
  let re = 0;
  let im = 0;
  for (let i = 0; i < coeffs.length; i++) {
    const power = n - i;
    const c = coeffs[i];
    const wPow = Math.pow(w, power);
    const mod = power % 4;
    if (mod === 0) re += c * wPow;
    else if (mod === 1) im += c * wPow;
    else if (mod === 2) re -= c * wPow;
    else im -= c * wPow;
  }
  return { re, im };
}

function countTrailingZeros(coeffs: number[]): number {
  let count = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    if (Math.abs(coeffs[i]) < 1e-12) count += 1;
    else break;
  }
  return count;
}

export function evaluateGeneralBode(params: {
  num: number[]; // descending powers of s
  den: number[]; // descending powers of s
  compType: 'none' | 'lead' | 'lag' | 'lead_lag' | 'pd' | 'pi';
  kc: number;
  alphaLead: number;
  tauLead: number;
  betaLag: number;
  tauLag: number;
  wMin?: number;
  wMax?: number;
}): GeneralBodeResult {
  const num = params.num.length > 0 ? params.num : [1];
  const den = params.den.length > 0 ? params.den : [1, 1];
  const wMin = params.wMin ?? 0.02;
  const wMax = params.wMax ?? 200;
  const nPts = 200;

  const evalComp = (w: number): ComplexVal => {
    if (params.compType === 'none') return { re: params.kc, im: 0 };
    if (params.compType === 'lead') {
      return cMul(
        { re: params.kc, im: 0 },
        cDiv({ re: 1, im: w * params.tauLead }, { re: 1, im: w * params.alphaLead * params.tauLead })
      );
    }
    if (params.compType === 'lag') {
      return cMul(
        { re: params.kc, im: 0 },
        cDiv({ re: 1, im: w * params.tauLag }, { re: 1, im: w * params.betaLag * params.tauLag })
      );
    }
    if (params.compType === 'lead_lag') {
      const lead = cDiv(
        { re: 1, im: w * params.tauLead },
        { re: 1, im: w * params.alphaLead * params.tauLead }
      );
      const lag = cDiv(
        { re: 1, im: w * params.tauLag },
        { re: 1, im: w * params.betaLag * params.tauLag }
      );
      return cMul({ re: params.kc, im: 0 }, cMul(lead, lag));
    }
    if (params.compType === 'pd') {
      return cMul(
        { re: params.kc, im: 0 },
        cDiv({ re: 1, im: w * params.tauLead }, { re: 1, im: w * 0.05 * params.tauLead })
      );
    }
    // PI: Kc * (1 + tauLag*s) / (tauLag*s)
    return cMul(
      { re: params.kc, im: 0 },
      cDiv({ re: 1, im: w * params.tauLag }, { re: 0, im: w * params.tauLag })
    );
  };

  const zDen = countTrailingZeros(den);
  const zNum = countTrailingZeros(num);
  const systemType = zDen - zNum;

  const unwrap = (rawDeg: number, prevDeg: number | null, anchorDeg: number): number => {
    if (prevDeg === null) {
      let d = rawDeg;
      while (d - anchorDeg > 180) d -= 360;
      while (d - anchorDeg < -180) d += 360;
      return d;
    }
    let d = rawDeg;
    while (d - prevDeg > 180) d -= 360;
    while (d - prevDeg < -180) d += 360;
    return d;
  };

  const lowNumCoeff = num[num.length - 1 - zNum] ?? 1;
  const lowDenCoeff = den[den.length - 1 - zDen] ?? 1;
  const dcSignNeg = lowNumCoeff * lowDenCoeff < 0;
  const baseAnchor = (dcSignNeg ? -180 : 0) - 90 * systemType;
  const compTypeShift = params.compType === 'pi' ? -90 : 0;
  const compAnchor = baseAnchor + compTypeShift - (params.kc < 0 ? 180 : 0);

  let prevU: number | null = null;
  let prevC: number | null = null;
  let prevCO: number | null = null;

  const points: GeneralBodeResult['points'] = [];

  for (let i = 0; i < nPts; i++) {
    const w = wMin * Math.pow(wMax / wMin, i / (nPts - 1));
    const nVal = evalPolyDescending(num, w);
    const dVal = evalPolyDescending(den, w);
    const g = cDiv(nVal, dVal);
    const c = evalComp(w);
    const l = cMul(c, g);

    const gMag = Math.hypot(g.re, g.im);
    const gPh = unwrap((Math.atan2(g.im, g.re) * 180) / Math.PI, prevU, baseAnchor);
    prevU = gPh;

    const lMag = Math.hypot(l.re, l.im);
    const lPh = unwrap((Math.atan2(l.im, l.re) * 180) / Math.PI, prevC, compAnchor);
    prevC = lPh;

    const cMag = Math.hypot(c.re, c.im);
    const cPh = unwrap((Math.atan2(c.im, c.re) * 180) / Math.PI, prevCO, compTypeShift);
    prevCO = cPh;

    points.push({
      w,
      uncompMagDb: 20 * Math.log10(Math.max(1e-8, gMag)),
      uncompPhaseDeg: gPh,
      compMagDb: 20 * Math.log10(Math.max(1e-8, lMag)),
      compPhaseDeg: lPh,
      compOnlyMagDb: 20 * Math.log10(Math.max(1e-8, cMag)),
      compOnlyPhaseDeg: cPh,
    });
  }

  const extractMargins = (useComp: boolean): GeneralBodeMargins => {
    let wgc: number | null = null;
    let phaseMarginDeg: number | null = null;
    let wpc: number | null = null;
    let gainMarginDb: number | null = null;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const m1 = useComp ? p1.compMagDb : p1.uncompMagDb;
      const m2 = useComp ? p2.compMagDb : p2.uncompMagDb;
      const ph1 = useComp ? p1.compPhaseDeg : p1.uncompPhaseDeg;
      const ph2 = useComp ? p2.compPhaseDeg : p2.uncompPhaseDeg;

      if (wgc === null && ((m1 >= 0 && m2 <= 0) || (m1 <= 0 && m2 >= 0))) {
        const frac = (0 - m1) / (m2 - m1 || 1e-12);
        // Log-frequency interpolation for crisp crossover estimate
        wgc = p1.w * Math.pow(p2.w / p1.w, frac);
        const phCross = ph1 + frac * (ph2 - ph1);
        phaseMarginDeg = 180 + phCross;
      }

      if (wpc === null && ((ph1 >= -180 && ph2 <= -180) || (ph1 <= -180 && ph2 >= -180))) {
        const frac = (-180 - ph1) / (ph2 - ph1 || 1e-12);
        wpc = p1.w * Math.pow(p2.w / p1.w, frac);
        const magCross = m1 + frac * (m2 - m1);
        gainMarginDb = -magCross;
      }
    }

    return { wgc, phaseMarginDeg, wpc, gainMarginDb };
  };

  return {
    points,
    uncomp: extractMargins(false),
    comp: extractMargins(true),
    systemType,
  };
}

// =========================================================================
// 6. ROOT LOCUS ENGINE (DURAND-KERNER POLYNOMIAL ROOT TRACER)
// =========================================================================
export interface RootLocusResult {
  openLoopPoles: ComplexNum[];
  openLoopZeros: ComplexNum[];
  branches: ComplexNum[][]; // branches[branchIdx][kIdx]
  kValues: number[];
  asymptoteCentroid: number | null;
  asymptoteAnglesDeg: number[];
  kCritical: number | null; // gain where a pole first enters RHP (Re >= 0)
  currentPoles: ComplexNum[];
}

function trimLeadingZeros(c: number[]): number[] {
  let i = 0;
  while (i < c.length - 1 && Math.abs(c[i]) < 1e-12) i++;
  return c.slice(i);
}

export function polyMul(a: number[], b: number[]): number[] {
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      out[i + j] += a[i] * b[j];
    }
  }
  return out;
}

function polyAdd(a: number[], b: number[]): number[] {
  const len = Math.max(a.length, b.length);
  const out = new Array(len).fill(0);
  for (let i = 0; i < a.length; i++) {
    out[len - a.length + i] += a[i];
  }
  for (let i = 0; i < b.length; i++) {
    out[len - b.length + i] += b[i];
  }
  return out;
}

function evalComplexPoly(monic: number[], z: ComplexVal): ComplexVal {
  let re = monic[0];
  let im = 0;
  for (let i = 1; i < monic.length; i++) {
    const nextRe = re * z.re - im * z.im + monic[i];
    const nextIm = re * z.im + im * z.re;
    re = nextRe;
    im = nextIm;
  }
  return { re, im };
}

export function solvePolyRoots(rawCoeffs: number[], warmStart?: ComplexNum[]): ComplexNum[] {
  const coeffs = trimLeadingZeros(rawCoeffs);
  const n = coeffs.length - 1;
  if (n <= 0) return [];
  const lead = coeffs[0];
  if (Math.abs(lead) < 1e-14) return [];

  const monic = coeffs.map((c) => c / lead);
  if (n === 1) {
    return [{ re: -monic[1], im: 0 }];
  }

  // Cauchy root radius bound
  const maxCoeff = Math.max(1, ...monic.slice(1).map((c) => Math.abs(c)));
  const R = Math.min(80, 1 + maxCoeff);

  const roots: ComplexNum[] = [];
  for (let k = 0; k < n; k++) {
    if (warmStart && warmStart.length === n) {
      // Tiny symmetry-breaking jitter prevents stalling at repeated poles (e.g., 1/s^2)
      const angle = 0.37 + (2 * Math.PI * k) / n;
      roots.push({
        re: warmStart[k].re + 1e-3 * Math.cos(angle),
        im: warmStart[k].im + 1e-3 * Math.sin(angle),
      });
    } else {
      const angle = 0.41 + (2 * Math.PI * k) / n;
      const rad = 0.65 * R + 0.08 * k;
      roots.push({
        re: rad * Math.cos(angle),
        im: rad * Math.sin(angle),
      });
    }
  }

  // Durand-Kerner iterations
  for (let iter = 0; iter < 55; iter++) {
    let maxStep = 0;
    for (let i = 0; i < n; i++) {
      const zi = roots[i];
      const pVal = evalComplexPoly(monic, zi);
      let prodRe = 1;
      let prodIm = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dre = zi.re - roots[j].re;
        const dim = zi.im - roots[j].im;
        const nr = prodRe * dre - prodIm * dim;
        const ni = prodRe * dim + prodIm * dre;
        prodRe = nr;
        prodIm = ni;
      }
      const denomMag2 = prodRe * prodRe + prodIm * prodIm + 1e-18;
      const stepRe = (pVal.re * prodRe + pVal.im * prodIm) / denomMag2;
      const stepIm = (pVal.im * prodRe - pVal.re * prodIm) / denomMag2;
      roots[i] = { re: zi.re - stepRe, im: zi.im - stepIm };
      const stepMag = Math.hypot(stepRe, stepIm);
      if (stepMag > maxStep) maxStep = stepMag;
    }
    if (maxStep < 1e-7) break;
  }

  return roots.map((r) => ({
    re: Math.abs(r.re) < 1e-7 ? 0 : r.re,
    im: Math.abs(r.im) < 1e-7 ? 0 : r.im,
  }));
}

function matchBranches(prev: ComplexNum[], next: ComplexNum[]): ComplexNum[] {
  const n = prev.length;
  if (next.length !== n) return next;
  const pairs: { i: number; j: number; d: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      pairs.push({
        i,
        j,
        d: Math.hypot(prev[i].re - next[j].re, prev[i].im - next[j].im),
      });
    }
  }
  pairs.sort((a, b) => a.d - b.d);
  const usedPrev = new Set<number>();
  const usedNext = new Set<number>();
  const ordered = new Array<ComplexNum>(n);
  for (const p of pairs) {
    if (usedPrev.has(p.i) || usedNext.has(p.j)) continue;
    usedPrev.add(p.i);
    usedNext.add(p.j);
    ordered[p.i] = next[p.j];
  }
  return ordered;
}

export function computeRootLocus(params: {
  num: number[];
  den: number[];
  compType: 'none' | 'lead' | 'lag' | 'lead_lag' | 'pd' | 'pi';
  zLead: number; // zero magnitude (>0, i.e., s + zLead)
  pLead: number; // pole magnitude (>0, i.e., s + pLead)
  zLag: number;
  pLag: number;
  kMax: number;
  kCurrent: number;
}): RootLocusResult {
  const gNum = trimLeadingZeros(params.num.length ? params.num : [1]);
  const gDen = trimLeadingZeros(params.den.length ? params.den : [1, 1]);

  let cNum = [1];
  let cDen = [1];

  if (params.compType === 'lead') {
    cNum = [1, params.zLead];
    cDen = [1, params.pLead];
  } else if (params.compType === 'lag') {
    cNum = [1, params.zLag];
    cDen = [1, params.pLag];
  } else if (params.compType === 'lead_lag') {
    cNum = polyMul([1, params.zLead], [1, params.zLag]);
    cDen = polyMul([1, params.pLead], [1, params.pLag]);
  } else if (params.compType === 'pd') {
    cNum = [1, params.zLead];
    cDen = [1];
  } else if (params.compType === 'pi') {
    cNum = [1, params.zLag];
    cDen = [1, 0];
  }

  const openNum = polyMul(gNum, cNum);
  const openDen = polyMul(gDen, cDen);

  const openLoopPoles = solvePolyRoots(openDen);
  const openLoopZeros = solvePolyRoots(openNum);

  const nPoles = openLoopPoles.length;
  const nZeros = openLoopZeros.length;
  const relDeg = nPoles - nZeros;

  let asymptoteCentroid: number | null = null;
  const asymptoteAnglesDeg: number[] = [];
  if (relDeg >= 1) {
    const sumP = openLoopPoles.reduce((acc, p) => acc + p.re, 0);
    const sumZ = openLoopZeros.reduce((acc, z) => acc + z.re, 0);
    asymptoteCentroid = (sumP - sumZ) / relDeg;
    for (let k = 0; k < relDeg; k++) {
      asymptoteAnglesDeg.push(((2 * k + 1) * 180) / relDeg);
    }
  }

  // Build dense non-uniform K grid so breakaway/low-K curvature is crisp
  const nSteps = 95;
  const kValues: number[] = [0];
  const kMax = Math.max(0.5, params.kMax);
  for (let i = 1; i <= nSteps; i++) {
    const frac = i / nSteps;
    // Blend quadratic + linear spacing
    const k = kMax * (0.65 * frac * frac + 0.35 * frac);
    kValues.push(k);
  }

  const branches: ComplexNum[][] = Array.from({ length: nPoles }, () => []);
  let prevRoots = openLoopPoles;
  for (let b = 0; b < nPoles; b++) {
    branches[b].push(openLoopPoles[b]);
  }

  let kCritical: number | null = null;
  const olStable = openLoopPoles.every((p) => p.re < -1e-4);

  for (let i = 1; i < kValues.length; i++) {
    const k = kValues[i];
    const scaledNum = openNum.map((c) => c * k);
    const charPoly = polyAdd(openDen, scaledNum);
    const rawRoots = solvePolyRoots(charPoly, prevRoots);
    const matched = matchBranches(prevRoots, rawRoots);
    for (let b = 0; b < nPoles; b++) {
      branches[b].push(matched[b]);
    }

    if (kCritical === null) {
      const prevMaxRe = Math.max(...prevRoots.map((r) => r.re));
      const currMaxRe = Math.max(...matched.map((r) => r.re));
      if (olStable && prevMaxRe < 0 && currMaxRe >= 0) {
        const frac = -prevMaxRe / (currMaxRe - prevMaxRe || 1e-9);
        kCritical = kValues[i - 1] + frac * (k - kValues[i - 1]);
      } else if (!olStable && prevMaxRe >= 0 && currMaxRe < 0) {
        // Gain where an unstable plant enters LHP
        const frac = prevMaxRe / (prevMaxRe - currMaxRe || 1e-9);
        kCritical = kValues[i - 1] + frac * (k - kValues[i - 1]);
      }
    }

    prevRoots = matched;
  }

  const currentCharPoly = polyAdd(
    openDen,
    openNum.map((c) => c * Math.max(0, params.kCurrent))
  );
  const currentPoles = solvePolyRoots(currentCharPoly, prevRoots);

  return {
    openLoopPoles,
    openLoopZeros,
    branches,
    kValues,
    asymptoteCentroid,
    asymptoteAnglesDeg,
    kCritical,
    currentPoles,
  };
}

// =========================================================================
// 7. CONTINUOUS-TIME LQR (KLEINMAN-NEWTON CARE SOLVER + RK4 TRAJECTORY)
// =========================================================================
export interface LqrResult {
  feasible: boolean;
  errorMsg: string | null;
  K: Vec2;
  P: Mat2;
  openLoopEigs: [ComplexNum, ComplexNum];
  closedLoopEigs: [ComplexNum, ComplexNum];
  optimalCostJ: number;
  riccatiResidual: number;
  nrFeedforward: number | null;
  times: number[];
  x1: number[];
  x2: number[];
  u: number[];
  costIntegrand: number[];
}

function solve2x2Lyapunov(Ak: Mat2, S: Mat2): Mat2 | null {
  // Solve Ak^T P + P Ak = S for symmetric P = [[p11, p12], [p12, p22]]
  const a11 = Ak[0][0];
  const a12 = Ak[0][1];
  const a21 = Ak[1][0];
  const a22 = Ak[1][1];
  const M = [
    [2 * a11, 2 * a21, 0],
    [a12, a11 + a22, a21],
    [0, 2 * a12, 2 * a22],
  ];
  const Minv = invert3x3(M);
  if (!Minv) return null;
  const rhs = [S[0][0], S[0][1], S[1][1]];
  const p11 = Minv[0][0] * rhs[0] + Minv[0][1] * rhs[1] + Minv[0][2] * rhs[2];
  const p12 = Minv[1][0] * rhs[0] + Minv[1][1] * rhs[1] + Minv[1][2] * rhs[2];
  const p22 = Minv[2][0] * rhs[0] + Minv[2][1] * rhs[1] + Minv[2][2] * rhs[2];
  return [
    [p11, p12],
    [p12, p22],
  ];
}

export function solveContinuousLqr(params: {
  A: Mat2;
  B: Vec2;
  C: Vec2;
  Q: Mat2;
  R: number;
  x0: Vec2;
  refStep?: number;
  tEnd?: number;
}): LqrResult {
  const { A, B, C, Q, R, x0 } = params;
  const refStep = params.refStep ?? 0;
  const tEnd = params.tEnd ?? 6.0;
  const openLoopEigs = mat2Eigenvalues(A);

  const zeroRes = (errorMsg: string): LqrResult => ({
    feasible: false,
    errorMsg,
    K: [0, 0],
    P: [
      [0, 0],
      [0, 0],
    ],
    openLoopEigs,
    closedLoopEigs: openLoopEigs,
    optimalCostJ: 0,
    riccatiResidual: 0,
    nrFeedforward: null,
    times: [],
    x1: [],
    x2: [],
    u: [],
    costIntegrand: [],
  });

  if (!(R > 1e-9)) {
    return zeroRes('Control weight R must be strictly positive (R > 0).');
  }
  const detQ = mat2Det(Q);
  if (Q[0][0] < -1e-9 || Q[1][1] < -1e-9 || detQ < -1e-8) {
    return zeroRes('State weight matrix Q must be positive semi-definite (q11 ≥ 0, q22 ≥ 0, det Q ≥ 0).');
  }

  // Stabilizing initial K0 via Ackermann if controllable
  const ab = mat2Vec(A, B);
  const kalmanC: Mat2 = [
    [B[0], ab[0]],
    [B[1], ab[1]],
  ];
  const cInv = mat2Inv(kalmanC);

  let K: Vec2 = [0, 0];
  if (cInv) {
    const shift = Math.max(0, openLoopEigs[0].re, openLoopEigs[1].re);
    const p1 = -2.0 - shift;
    const p2 = -3.0 - shift;
    const alpha1 = -(p1 + p2);
    const alpha0 = p1 * p2;
    const A2 = mat2Mul(A, A);
    const pA: Mat2 = [
      [A2[0][0] + alpha1 * A[0][0] + alpha0, A2[0][1] + alpha1 * A[0][1]],
      [A2[1][0] + alpha1 * A[1][0], A2[1][1] + alpha1 * A[1][1] + alpha0],
    ];
    const row2Cinv: Vec2 = [cInv[1][0], cInv[1][1]];
    K = [
      row2Cinv[0] * pA[0][0] + row2Cinv[1] * pA[1][0],
      row2Cinv[0] * pA[0][1] + row2Cinv[1] * pA[1][1],
    ];
  } else {
    // Uncontrollable: only feasible if open-loop poles are already strictly in LHP
    if (Math.max(openLoopEigs[0].re, openLoopEigs[1].re) >= -1e-5) {
      return zeroRes('System (A, B) is uncontrollable with unstable/marginal modes — CARE has no stabilizing solution.');
    }
  }

  let P: Mat2 = [
    [0, 0],
    [0, 0],
  ];

  // Kleinman Newton-Riccati iterations
  for (let iter = 0; iter < 25; iter++) {
    const Ak: Mat2 = [
      [A[0][0] - B[0] * K[0], A[0][1] - B[0] * K[1]],
      [A[1][0] - B[1] * K[0], A[1][1] - B[1] * K[1]],
    ];
    const S: Mat2 = [
      [-(Q[0][0] + R * K[0] * K[0]), -(Q[0][1] + R * K[0] * K[1])],
      [-(Q[1][0] + R * K[1] * K[0]), -(Q[1][1] + R * K[1] * K[1])],
    ];
    const nextP = solve2x2Lyapunov(Ak, S);
    if (!nextP) {
      return zeroRes('Lyapunov solve encountered a singular closed-loop matrix.');
    }
    P = nextP;
    const nextK: Vec2 = [
      (B[0] * P[0][0] + B[1] * P[1][0]) / R,
      (B[0] * P[0][1] + B[1] * P[1][1]) / R,
    ];
    const diff = Math.hypot(nextK[0] - K[0], nextK[1] - K[1]);
    K = nextK;
    if (diff < 1e-11) break;
  }

  const Acl: Mat2 = [
    [A[0][0] - B[0] * K[0], A[0][1] - B[0] * K[1]],
    [A[1][0] - B[1] * K[0], A[1][1] - B[1] * K[1]],
  ];
  const closedLoopEigs = mat2Eigenvalues(Acl);

  // Check Riccati residual: || A^T P + P A - P B R^-1 B^T P + Q ||_F
  const AT: Mat2 = [
    [A[0][0], A[1][0]],
    [A[0][1], A[1][1]],
  ];
  const ATP = mat2Mul(AT, P);
  const PA = mat2Mul(P, A);
  const PB: Vec2 = [P[0][0] * B[0] + P[0][1] * B[1], P[1][0] * B[0] + P[1][1] * B[1]];
  let resSq = 0;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const entry = ATP[i][j] + PA[i][j] - (PB[i] * PB[j]) / R + Q[i][j];
      resSq += entry * entry;
    }
  }
  const riccatiResidual = Math.sqrt(resSq);

  // Optimal quadratic cost J* = x0^T P x0
  const Px0 = mat2Vec(P, x0);
  const optimalCostJ = x0[0] * Px0[0] + x0[1] * Px0[1];

  // Feedforward gain Nr for nonzero step reference tracking
  const aclInv = mat2Inv(Acl);
  let nrFeedforward: number | null = null;
  if (aclInv) {
    const aclInvB = mat2Vec(aclInv, B);
    const dcGain = C[0] * aclInvB[0] + C[1] * aclInvB[1];
    if (Math.abs(dcGain) > 1e-8) {
      nrFeedforward = -1 / dcGain;
    }
  }

  // RK4 Closed-Loop Simulation
  const dt = 0.025;
  const steps = Math.round(tEnd / dt);
  const times: number[] = [];
  const x1: number[] = [];
  const x2: number[] = [];
  const u: number[] = [];
  const costIntegrand: number[] = [];

  let state: Vec2 = [...x0];
  const ffTerm = nrFeedforward !== null ? nrFeedforward * refStep : 0;

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const uk = -(K[0] * state[0] + K[1] * state[1]) + ffTerm;
    const Qx = mat2Vec(Q, state);
    const jRate = state[0] * Qx[0] + state[1] * Qx[1] + R * uk * uk;

    times.push(t);
    x1.push(state[0]);
    x2.push(state[1]);
    u.push(uk);
    costIntegrand.push(jRate);

    const deriv = (st: Vec2): Vec2 => {
      const uVal = -(K[0] * st[0] + K[1] * st[1]) + ffTerm;
      const ax = mat2Vec(A, st);
      return [ax[0] + B[0] * uVal, ax[1] + B[1] * uVal];
    };
    const k1 = deriv(state);
    const k2 = deriv([state[0] + 0.5 * dt * k1[0], state[1] + 0.5 * dt * k1[1]]);
    const k3 = deriv([state[0] + 0.5 * dt * k2[0], state[1] + 0.5 * dt * k2[1]]);
    const k4 = deriv([state[0] + dt * k3[0], state[1] + dt * k3[1]]);
    state = [
      state[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      state[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    ];
  }

  return {
    feasible: true,
    errorMsg: null,
    K,
    P,
    openLoopEigs,
    closedLoopEigs,
    optimalCostJ,
    riccatiResidual,
    nrFeedforward,
    times,
    x1,
    x2,
    u,
    costIntegrand,
  };
}

// =========================================================================
// 8. SECOND-ORDER PROTOTYPE STEP RESPONSE & PERFORMANCE BOUNDS ANALYZER
// =========================================================================
export interface SecondOrderStepResult {
  times: number[];
  yProto: number[];
  envUpper: number[];
  envLower: number[];
  regime: 'undamped' | 'underdamped' | 'critical' | 'overdamped';
  overshootPct: number;
  peakTime: number | null;
  riseTime1090: number;
  settlingTime2Pct: number;
  settlingFormula4Tau: number;
  dampedFreqWd: number;
  timeConstantTau: number;
  poles: [ComplexNum, ComplexNum];
}

export function analyzeSecondOrderPrototype(params: {
  wn: number;
  zeta: number;
  dcGain?: number;
  tEnd?: number;
  dt?: number;
}): SecondOrderStepResult {
  const wn = Math.max(0.1, params.wn);
  const zeta = Math.max(0, params.zeta);
  const K = params.dcGain ?? 1.0;
  const tEnd = params.tEnd ?? 10.0;
  const dt = params.dt ?? 0.04;
  const steps = Math.round(tEnd / dt);

  const times: number[] = [];
  const yProto: number[] = [];
  const envUpper: number[] = [];
  const envLower: number[] = [];

  let regime: SecondOrderStepResult['regime'] = 'underdamped';
  let poles: [ComplexNum, ComplexNum];
  let dampedFreqWd = 0;

  if (zeta < 1e-4) {
    regime = 'undamped';
    dampedFreqWd = wn;
    poles = [
      { re: 0, im: wn },
      { re: 0, im: -wn },
    ];
  } else if (zeta < 1 - 1e-4) {
    regime = 'underdamped';
    dampedFreqWd = wn * Math.sqrt(1 - zeta * zeta);
    poles = [
      { re: -zeta * wn, im: dampedFreqWd },
      { re: -zeta * wn, im: -dampedFreqWd },
    ];
  } else if (Math.abs(zeta - 1) <= 1e-4) {
    regime = 'critical';
    poles = [
      { re: -wn, im: 0 },
      { re: -wn, im: 0 },
    ];
  } else {
    regime = 'overdamped';
    const sq = wn * Math.sqrt(zeta * zeta - 1);
    poles = [
      { re: -zeta * wn + sq, im: 0 },
      { re: -zeta * wn - sq, im: 0 },
    ];
  }

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    let y = 0;
    let envSpread = 0;

    if (regime === 'undamped') {
      y = K * (1 - Math.cos(wn * t));
      envSpread = K;
    } else if (regime === 'underdamped') {
      const sq = Math.sqrt(1 - zeta * zeta);
      const phi = Math.acos(zeta);
      const decay = Math.exp(-zeta * wn * t);
      y = K * (1 - (decay / sq) * Math.sin(dampedFreqWd * t + phi));
      envSpread = K * (decay / sq);
    } else if (regime === 'critical') {
      const decay = Math.exp(-wn * t);
      y = K * (1 - decay * (1 + wn * t));
      envSpread = K * decay * (1 + wn * t);
    } else {
      const s1 = poles[0].re;
      const s2 = poles[1].re;
      y = K * (1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s1 - s2));
      envSpread = Math.abs(K - y);
    }

    times.push(t);
    yProto.push(y);
    envUpper.push(K + envSpread);
    envLower.push(K - envSpread);
  }

  // Exact analytical overshoot & peak time
  let overshootPct = 0;
  let peakTime: number | null = null;
  if (regime === 'undamped') {
    overshootPct = 100;
    peakTime = Math.PI / wn;
  } else if (regime === 'underdamped') {
    const sq = Math.sqrt(1 - zeta * zeta);
    overshootPct = 100 * Math.exp((-Math.PI * zeta) / sq);
    peakTime = Math.PI / dampedFreqWd;
  }

  // Numerical 10% -> 90% rise time on exact curve
  let t10 = 0;
  let t90 = tEnd;
  let found10 = false;
  let found90 = false;
  for (let i = 1; i < yProto.length; i++) {
    if (!found10 && yProto[i] >= 0.1 * K) {
      const prev = yProto[i - 1];
      const frac = (0.1 * K - prev) / (yProto[i] - prev || 1e-9);
      t10 = times[i - 1] + frac * dt;
      found10 = true;
    }
    if (!found90 && yProto[i] >= 0.9 * K) {
      const prev = yProto[i - 1];
      const frac = (0.9 * K - prev) / (yProto[i] - prev || 1e-9);
      t90 = times[i - 1] + frac * dt;
      found90 = true;
      break;
    }
  }
  const riseTime1090 = found90 ? Math.max(0, t90 - t10) : tEnd;

  // Settling time (±2% band around K)
  let settlingTime2Pct = tEnd;
  for (let i = yProto.length - 1; i >= 0; i--) {
    if (Math.abs(yProto[i] - K) > 0.02 * K) {
      settlingTime2Pct = times[Math.min(yProto.length - 1, i + 1)];
      break;
    }
    if (i === 0) settlingTime2Pct = 0;
  }

  const timeConstantTau = zeta > 1e-4 ? 1 / (zeta * wn) : Infinity;
  const settlingFormula4Tau = zeta > 1e-4 ? 4 / (zeta * wn) : Infinity;

  return {
    times,
    yProto,
    envUpper,
    envLower,
    regime,
    overshootPct,
    peakTime,
    riseTime1090,
    settlingTime2Pct,
    settlingFormula4Tau,
    dampedFreqWd,
    timeConstantTau,
    poles,
  };
}

// =========================================================================
// 9. PARAMETRIC SENSITIVITY ANALYSIS (ZETA, WN, OVERSHOOT, SETTLING TIME)
// =========================================================================
export type SensitivityParamKey = 'kp' | 'ki' | 'kd' | 'plantK' | 'tau1';

export interface ClosedLoopDominantMetrics {
  poles: ComplexNum[];
  zeta: number;
  wn: number;
  maxRe: number;
  isStable: boolean;
  overshootPct: number;
  settlingTime: number;
  riseTime: number;
}

export interface SensitivitySweepPoint {
  paramValue: number;
  zeta: number;
  wn: number;
  overshootPct: number;
  settlingTime: number;
  maxRe: number;
  isStable: boolean;
  sZeta: number; // Normalized sensitivity (theta / zeta) * (d zeta / d theta)
  sWn: number;   // Normalized sensitivity (theta / wn) * (d wn / d theta)
  dZetaDTheta: number;
  dWnDTheta: number;
}

export interface SensitivityJacobianRow {
  param: SensitivityParamKey;
  label: string;
  unit: string;
  nominal: number;
  dZetaDTheta: number;
  sZeta: number;
  dWnDTheta: number;
  sWn: number;
  sSettling: number;
  dOsDTheta: number;
}

export interface SensitivityAnalysisResult {
  nominalMetrics: ClosedLoopDominantMetrics;
  sweepPoints: SensitivitySweepPoint[];
  jacobian: SensitivityJacobianRow[];
  criticalStabilityValue: number | null;
}

export function evaluateClosedLoopMetrics(cfg: PidSimConfig): ClosedLoopDominantMetrics {
  const a2 = Math.max(0.01, cfg.tau1 * cfg.tau2);
  const a1 = Math.max(0.01, cfg.tau1 + cfg.tau2);
  const hasKi = Math.abs(cfg.ki) > 1e-6 && Math.abs(cfg.plantK) > 1e-6;

  const poles = hasKi
    ? solvePolyRoots([
        a2,
        a1 + cfg.plantK * cfg.kd,
        1 + cfg.plantK * cfg.kp,
        cfg.plantK * cfg.ki,
      ])
    : solvePolyRoots([
        a2,
        a1 + cfg.plantK * cfg.kd,
        1 + cfg.plantK * cfg.kp,
      ]);

  const maxRe = poles.length > 0 ? Math.max(...poles.map((p) => p.re)) : 0;
  const isStable = maxRe < -1e-4;

  // Pick dominant pole(s) continuously across overdamped <-> critical <-> underdamped
  const complexPoles = poles.filter((p) => p.im > 1e-4);
  let wn = 0;
  let zeta = 0;

  if (complexPoles.length > 0) {
    // Dominant complex conjugate pair (largest Re, i.e., closest to jw axis)
    const dom = [...complexPoles].sort((a, b) => b.re - a.re)[0];
    wn = Math.hypot(dom.re, dom.im);
    zeta = wn > 1e-8 ? -dom.re / wn : 0;
  } else if (poles.length >= 2) {
    // Two slowest real poles (largest Re)
    const sorted = [...poles].sort((a, b) => b.re - a.re);
    const s1 = sorted[0].re;
    const s2 = sorted[1].re;
    if (s1 < 0 && s2 < 0) {
      wn = Math.sqrt(Math.max(1e-8, s1 * s2));
      zeta = -(s1 + s2) / (2 * wn);
    } else {
      wn = Math.hypot(s1, s2);
      zeta = wn > 1e-8 ? -(s1 + s2) / (2 * wn) : -1;
    }
  } else if (poles.length === 1) {
    wn = Math.abs(poles[0].re);
    zeta = poles[0].re < 0 ? 1 : -1;
  }

  const sim = simulatePidLoop({
    ...cfg,
    tEnd: cfg.tEnd ?? 8.0,
    dt: cfg.dt ?? 0.05,
  });

  return {
    poles,
    zeta,
    wn,
    maxRe,
    isStable,
    overshootPct: sim.overshootPct,
    settlingTime: sim.settlingTime,
    riseTime: sim.riseTime,
  };
}

export function computePidSensitivityAnalysis(params: {
  nominal: PidSimConfig;
  sweepParam: SensitivityParamKey;
  minVal: number;
  maxVal: number;
  steps?: number;
}): SensitivityAnalysisResult {
  const { nominal, sweepParam, minVal, maxVal } = params;
  const steps = Math.max(15, params.steps ?? 36);

  const applyParam = (cfg: PidSimConfig, key: SensitivityParamKey, val: number): PidSimConfig => ({
    ...cfg,
    [key]: val,
  });

  const computeLocalDeriv = (cfg: PidSimConfig, key: SensitivityParamKey) => {
    const theta = cfg[key];
    const h = Math.max(0.01, Math.abs(theta) * 0.02);
    const leftVal = key === 'plantK' || key === 'tau1' ? Math.max(0.05, theta - h) : Math.max(0, theta - h);
    const rightVal = theta + h;
    const span = rightVal - leftVal || 1e-6;

    const m0 = evaluateClosedLoopMetrics(cfg);
    const mL = evaluateClosedLoopMetrics(applyParam(cfg, key, leftVal));
    const mR = evaluateClosedLoopMetrics(applyParam(cfg, key, rightVal));

    const dZetaDTheta = (mR.zeta - mL.zeta) / span;
    const dWnDTheta = (mR.wn - mL.wn) / span;
    const dTsDTheta = (mR.settlingTime - mL.settlingTime) / span;
    const dOsDTheta = (mR.overshootPct - mL.overshootPct) / span;

    const safeZeta = Math.abs(m0.zeta) > 1e-4 ? m0.zeta : 1e-4;
    const safeWn = Math.abs(m0.wn) > 1e-4 ? m0.wn : 1e-4;
    const safeTs = Math.abs(m0.settlingTime) > 1e-4 ? m0.settlingTime : 1e-4;

    return {
      m0,
      dZetaDTheta,
      dWnDTheta,
      dOsDTheta,
      sZeta: (theta / safeZeta) * dZetaDTheta,
      sWn: (theta / safeWn) * dWnDTheta,
      sSettling: (theta / safeTs) * dTsDTheta,
    };
  };

  const nominalMetrics = evaluateClosedLoopMetrics(nominal);

  // Sweep points + normalized sensitivity along the sweep
  const lo = Math.min(minVal, maxVal);
  const hi = Math.max(lo + 0.05, maxVal);
  const sweepPoints: SensitivitySweepPoint[] = [];
  let criticalStabilityValue: number | null = null;

  for (let i = 0; i <= steps; i++) {
    const val = lo + (i / steps) * (hi - lo);
    const cfg = applyParam(nominal, sweepParam, val);
    const deriv = computeLocalDeriv(cfg, sweepParam);
    const pt: SensitivitySweepPoint = {
      paramValue: val,
      zeta: deriv.m0.zeta,
      wn: deriv.m0.wn,
      overshootPct: deriv.m0.overshootPct,
      settlingTime: deriv.m0.settlingTime,
      maxRe: deriv.m0.maxRe,
      isStable: deriv.m0.isStable,
      sZeta: deriv.sZeta,
      sWn: deriv.sWn,
      dZetaDTheta: deriv.dZetaDTheta,
      dWnDTheta: deriv.dWnDTheta,
    };

    if (
      criticalStabilityValue === null &&
      sweepPoints.length > 0 &&
      sweepPoints[sweepPoints.length - 1].isStable !== pt.isStable
    ) {
      const prev = sweepPoints[sweepPoints.length - 1];
      const frac = Math.abs(prev.maxRe) / (Math.abs(prev.maxRe) + Math.abs(pt.maxRe) + 1e-9);
      criticalStabilityValue = prev.paramValue + frac * (pt.paramValue - prev.paramValue);
    }

    sweepPoints.push(pt);
  }

  // Full 5-parameter sensitivity Jacobian at nominal operating point
  const paramMeta: { key: SensitivityParamKey; label: string; unit: string }[] = [
    { key: 'kp', label: 'Proportional Gain Kp', unit: '—' },
    { key: 'ki', label: 'Integral Gain Ki', unit: 's⁻¹' },
    { key: 'kd', label: 'Derivative Gain Kd', unit: 's' },
    { key: 'plantK', label: 'Plant DC Gain K', unit: '—' },
    { key: 'tau1', label: 'Plant Lag τ₁', unit: 's' },
  ];

  const jacobian: SensitivityJacobianRow[] = paramMeta.map((pm) => {
    const res = computeLocalDeriv(nominal, pm.key);
    return {
      param: pm.key,
      label: pm.label,
      unit: pm.unit,
      nominal: nominal[pm.key],
      dZetaDTheta: res.dZetaDTheta,
      sZeta: res.sZeta,
      dWnDTheta: res.dWnDTheta,
      sWn: res.sWn,
      sSettling: res.sSettling,
      dOsDTheta: res.dOsDTheta,
    };
  });

  return {
    nominalMetrics,
    sweepPoints,
    jacobian,
    criticalStabilityValue,
  };
}

// =========================================================================
// 10. SETPOINT-TO-OUTPUT CROSS-CORRELATION & TRACKING PERFORMANCE ENGINE
// =========================================================================
export type ReferenceWaveformType = 'pulse_train' | 'multistep' | 'chirp' | 'delayed_step';

export interface SignalCorrelationPoint {
  lagSec: number;
  rxy: number; // Normalized cross-correlation R_ry(tau) in [-1, 1]
  rxx: number; // Setpoint autocorrelation R_rr(tau) in [-1, 1]
}

export interface SignalCorrelationTimePoint {
  t: number;
  r: number;
  y: number;
  yShifted: number;
  err: number;
  u: number;
}

export interface SignalCorrelationResult {
  timeSeries: SignalCorrelationTimePoint[];
  corrCurve: SignalCorrelationPoint[];
  zeroLagCorr: number;
  peakCorr: number;
  peakLagSec: number;
  rmse: number;
  lagCompensatedRmse: number;
  iae: number;
  itae: number;
  trackingScorePct: number;
}

export function computeSignalCorrelationAnalysis(params: {
  plantK: number;
  tau1: number;
  tau2: number;
  kp: number;
  ki: number;
  kd: number;
  uMax: number;
  antiWindup: 'none' | 'clamping' | 'back_calc';
  waveform: ReferenceWaveformType;
  deadTimeSec: number;
  noiseSigma: number;
  tEnd?: number;
  maxLagSec?: number;
}): SignalCorrelationResult {
  const dt = 0.04;
  const tEnd = params.tEnd ?? 12.0;
  const maxLagSec = params.maxLagSec ?? 3.0;
  const steps = Math.round(tEnd / dt);

  const generateRef = (t: number): number => {
    if (params.waveform === 'pulse_train') {
      const cyc = t % 4.0;
      return cyc < 2.0 ? 1.0 : 0.2;
    }
    if (params.waveform === 'multistep') {
      if (t < 1.2) return 0.2;
      if (t < 3.6) return 1.0;
      if (t < 6.0) return 0.55;
      if (t < 8.4) return 1.25;
      if (t < 10.4) return 0.35;
      return 0.85;
    }
    if (params.waveform === 'chirp') {
      const f0 = 0.12;
      const f1 = 0.65;
      const k = (f1 - f0) / Math.max(1, tEnd);
      const phase = 2 * Math.PI * (f0 * t + 0.5 * k * t * t);
      return 0.7 + 0.45 * Math.sin(phase);
    }
    // delayed_step
    return t >= 1.2 ? 1.0 : 0.0;
  };

  // Deterministic PRNG for repeatable measurement noise
  let seed = 1337;
  const nextRandNorm = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const u1 = Math.max(1e-6, (seed & 0xffff) / 65536);
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const u2 = (seed & 0xffff) / 65536;
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const a2 = Math.max(0.02, params.tau1 * params.tau2);
  const a1 = Math.max(0.02, params.tau1 + params.tau2);
  const delaySteps = Math.max(0, Math.round(params.deadTimeSec / dt));
  const uBuffer = new Array<number>(delaySteps + 1).fill(0);

  let yTrue = generateRef(0);
  let yDot = 0;
  let integ = 0;
  let prevErr = 0;

  const times: number[] = [];
  const rArr: number[] = [];
  const yArr: number[] = [];
  const uArr: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const r = generateRef(t);
    const noise = params.noiseSigma > 0 ? params.noiseSigma * nextRandNorm() : 0;
    const yMeas = yTrue + noise;

    const err = r - yMeas;
    const dErr = i === 0 ? 0 : (err - prevErr) / dt;
    prevErr = err;

    const uRaw = params.kp * err + params.ki * integ + params.kd * dErr;
    const uSat = Math.max(-params.uMax, Math.min(params.uMax, uRaw));

    times.push(t);
    rArr.push(r);
    yArr.push(yMeas);
    uArr.push(uSat);

    if (params.antiWindup === 'clamping') {
      const pushes = (uRaw > params.uMax && err > 0) || (uRaw < -params.uMax && err < 0);
      if (!pushes) integ += err * dt;
    } else if (params.antiWindup === 'back_calc') {
      const kb = params.ki > 0 ? Math.min(4.0, Math.max(0.5, params.ki)) : 1.0;
      integ += (err + kb * (uSat - uRaw)) * dt;
    } else {
      integ += err * dt;
    }

    uBuffer.push(uSat);
    const uDelayed = uBuffer.shift() ?? 0;

    const deriv = (stY: number, stYd: number): [number, number] => [
      stYd,
      (params.plantK * uDelayed - a1 * stYd - stY) / a2,
    ];
    const [k1y, k1yd] = deriv(yTrue, yDot);
    const [k2y, k2yd] = deriv(yTrue + 0.5 * dt * k1y, yDot + 0.5 * dt * k1yd);
    const [k3y, k3yd] = deriv(yTrue + 0.5 * dt * k2y, yDot + 0.5 * dt * k2yd);
    const [k4y, k4yd] = deriv(yTrue + dt * k3y, yDot + dt * k3yd);

    yTrue += (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    yDot += (dt / 6) * (k1yd + 2 * k2yd + 2 * k3yd + k4yd);
    if (!Number.isFinite(yTrue) || Math.abs(yTrue) > 25) {
      yTrue = Math.sign(yTrue || 1) * 25;
      yDot = 0;
    }
  }

  // Mean-centered Pearson cross-correlation R_ry(k) = corr(r[i], y[i + k])
  const n = rArr.length;
  const meanR = rArr.reduce((s, v) => s + v, 0) / n;
  const meanY = yArr.reduce((s, v) => s + v, 0) / n;
  const rc = rArr.map((v) => v - meanR);
  const yc = yArr.map((v) => v - meanY);

  const normR = Math.sqrt(rc.reduce((s, v) => s + v * v, 0)) + 1e-12;
  const normY = Math.sqrt(yc.reduce((s, v) => s + v * v, 0)) + 1e-12;
  const denomRY = normR * normY;
  const denomRR = normR * normR;

  const maxLagSteps = Math.min(Math.floor(n / 2), Math.round(maxLagSec / dt));
  const corrCurve: SignalCorrelationPoint[] = [];

  let peakCorr = -Infinity;
  let peakLagSteps = 0;
  let zeroLagCorr = 0;

  for (let k = -maxLagSteps; k <= maxLagSteps; k++) {
    let sumRY = 0;
    let sumRR = 0;
    const iStart = Math.max(0, -k);
    const iEnd = Math.min(n, n - k);
    for (let i = iStart; i < iEnd; i++) {
      sumRY += rc[i] * yc[i + k];
      sumRR += rc[i] * rc[i + k];
    }
    const rxy = Math.max(-1, Math.min(1, sumRY / denomRY));
    const rxx = Math.max(-1, Math.min(1, sumRR / denomRR));

    if (k === 0) zeroLagCorr = rxy;
    if (rxy > peakCorr) {
      peakCorr = rxy;
      peakLagSteps = k;
    }

    corrCurve.push({
      lagSec: Number((k * dt).toFixed(2)),
      rxy: Number(rxy.toFixed(4)),
      rxx: Number(rxx.toFixed(4)),
    });
  }

  // Tracking error metrics
  let sqErrSum = 0;
  let iae = 0;
  let itae = 0;
  let lagSqErrSum = 0;
  let lagCount = 0;

  const timeSeries: SignalCorrelationTimePoint[] = times.map((t, i) => {
    const err = rArr[i] - yArr[i];
    sqErrSum += err * err;
    iae += Math.abs(err) * dt;
    itae += t * Math.abs(err) * dt;

    const shiftedIdx = Math.max(0, Math.min(n - 1, i + peakLagSteps));
    const yShifted = yArr[shiftedIdx];
    if (i + peakLagSteps >= 0 && i + peakLagSteps < n) {
      const lErr = rArr[i] - yShifted;
      lagSqErrSum += lErr * lErr;
      lagCount += 1;
    }

    return {
      t: Number(t.toFixed(2)),
      r: Number(rArr[i].toFixed(4)),
      y: Number(yArr[i].toFixed(4)),
      yShifted: Number(yShifted.toFixed(4)),
      err: Number(err.toFixed(4)),
      u: Number(uArr[i].toFixed(4)),
    };
  });

  const rmse = Math.sqrt(sqErrSum / Math.max(1, n));
  const lagCompensatedRmse = Math.sqrt(lagSqErrSum / Math.max(1, lagCount));
  const rRange = Math.max(0.2, Math.max(...rArr) - Math.min(...rArr));
  const trackingScorePct = Math.max(
    0,
    Math.min(100, 100 * (1 - rmse / rRange) * Math.max(0, zeroLagCorr))
  );

  return {
    timeSeries,
    corrCurve,
    zeroLagCorr,
    peakCorr,
    peakLagSec: Number((peakLagSteps * dt).toFixed(2)),
    rmse,
    lagCompensatedRmse,
    iae,
    itae,
    trackingScorePct,
  };
}






