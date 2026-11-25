import {
  ControlLabType,
  ControlModule,
  ControlSyllabusTopic,
} from '../types/ece433';

export const CONTROL_MODULE_META: Record<
  ControlModule,
  {
    title: string;
    shortTitle: string;
    subtitle: string;
    examWeight: string;
  }
> = {
  [ControlModule.PID]: {
    title: 'Module 1 · PID Control, Op-Amp Circuits & Tuning',
    shortTitle: 'PID & Op-Amps',
    subtitle:
      'P/PI/PD/PID laws, electronic op-amp realizations, Ziegler-Nichols tuning, integrator windup & MATLAB/Simulink.',
    examWeight: '25% Exam Weight',
  },
  [ControlModule.FREQ_COMP]: {
    title: 'Module 2 · Frequency-Domain Lead & Lag Compensation',
    shortTitle: 'Bode Lead/Lag',
    subtitle:
      'Lead, Lag & Lead-Lag Bode shaping, phase/gain margin design, and direct comparison with PI/PD controllers.',
    examWeight: '20% Exam Weight',
  },
  [ControlModule.STATE_SPACE]: {
    title: 'Module 3 · State-Space Models, Canonical Forms & e^(At)',
    shortTitle: 'State-Space & e^(At)',
    subtitle:
      'LTI SISO models, CCF/OCF/Jordan canonical forms, similarity invariance, eigenvalues/zeros, and Φ(t) = e^(At).',
    examWeight: '30% Exam Weight',
  },
  [ControlModule.DESIGN_OBS]: {
    title: 'Module 4 · Controllability, Pole Placement & Observers',
    shortTitle: 'Kalman, Pole & Observer',
    subtitle:
      'Kalman/Gilbert/Structural controllability, reachability, pole placement with integral control, and Luenberger observers.',
    examWeight: '25% Exam Weight',
  },
};

export const CONTROL_SYLLABUS_TOPICS: ControlSyllabusTopic[] = [
  {
    id: 'ctrl_pid_modes',
    module: ControlModule.PID,
    title: 'P, PI, PD & PID Controller Characteristics and Applications',
    keyFormula: 'C(s) = Kp + Ki/s + Kd·s',
    catPriority: 'Critical',
    summary:
      'Role of each term: P cuts rise time but leaves offset; I eliminates steady-state step error; D adds phase lead damping to suppress overshoot.',
    recommendedLab: ControlLabType.PID_WINDUP,
    recommendedCalc: 'zn_tuning',
  },
  {
    id: 'ctrl_pid_opamp',
    module: ControlModule.PID,
    title: 'Electronic Realizations of PID Controllers (Op-Amp Networks)',
    keyFormula: 'C(s) = -(Rf/Rin)·(1 + 1/(Rf·Cf·s))·(1 + Ri·Ci·s)',
    catPriority: 'High',
    summary:
      'Inverting summing, Miller integrator, practical differentiator (with series R to bound high-frequency gain), and parallel vs series op-amp PID topologies.',
    recommendedLab: ControlLabType.PID_WINDUP,
    recommendedCalc: 'opamp_pid',
  },
  {
    id: 'ctrl_ziegler_nichols',
    module: ControlModule.PID,
    title: 'Ziegler-Nichols Tuning Rules (Open-Loop S-Curve & Ultimate Gain)',
    keyFormula: 'PID: Kp = 0.6·Ku, Ti = 0.5·Pu, Td = 0.125·Pu',
    catPriority: 'Critical',
    summary:
      'First method (process reaction curve L, T) and Second method (ultimate gain Ku, oscillation period Pu) targeting ~1/4 decay ratio.',
    recommendedLab: ControlLabType.PID_WINDUP,
    recommendedCalc: 'zn_tuning',
  },
  {
    id: 'ctrl_windup',
    module: ControlModule.PID,
    title: 'Integrator Windup & Anti-Windup Strategies (MATLAB/Simulink)',
    keyFormula: 'ė_i = e + Kb·(u_sat − u_raw)',
    catPriority: 'Critical',
    summary:
      'Why actuator saturation causes unchecked integral growth, prolonged overshoot, and sluggish recovery—solved via conditional clamping or back-calculation.',
    recommendedLab: ControlLabType.PID_WINDUP,
    recommendedCalc: 'zn_tuning',
  },
  {
    id: 'ctrl_lag_lead',
    module: ControlModule.FREQ_COMP,
    title: 'Lag, Lead & Lead-Lag Compensation in Frequency Domain',
    keyFormula: 'C_lead(s) = Kc·(1 + τs)/(1 + ατs), φm = arcsin((1−α)/(1+α))',
    catPriority: 'Critical',
    summary:
      'Lead shifts phase upward near ω_gc to boost Phase Margin & bandwidth; Lag attenuates high-frequency gain to raise low-frequency DC gain K_v without destabilizing.',
    recommendedLab: ControlLabType.BODE_COMP,
    recommendedCalc: 'lead_lag',
  },
  {
    id: 'ctrl_comp_vs_pipd',
    module: ControlModule.FREQ_COMP,
    title: 'Comparison: Lag/Lead Compensators vs PI/PD Controllers',
    keyFormula: 'PI ↔ Ideal Lag (pole at 0) · PD ↔ Ideal Lead (no HF pole)',
    catPriority: 'High',
    summary:
      'PI places a pole at s=0 (infinite DC gain, zero step error) while Lag uses a finite pole (finite error boost, passive RC realizable); Lead bounds HF noise unlike ideal PD.',
    recommendedLab: ControlLabType.BODE_COMP,
    recommendedCalc: 'lead_lag',
  },
  {
    id: 'ctrl_ss_models',
    module: ControlModule.STATE_SPACE,
    title: 'LTI SISO State-Space Models & Transfer Function Conversion',
    keyFormula: 'ẋ = Ax + Bu, y = Cx + Du ⇔ G(s) = C(sI − A)⁻¹B + D',
    catPriority: 'Critical',
    summary:
      'State vector x(t), system matrix A, input B, output C, feedthrough D; converting between differential equations, transfer functions, and matrix triples.',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'canonical_ss',
  },
  {
    id: 'ctrl_canonical',
    module: ControlModule.STATE_SPACE,
    title: 'Canonical Forms: Control (CCF), Observer (OCF) & Diagonal/Jordan',
    keyFormula: 'CCF A = companion(−a₀..−aₙ₋₁) · OCF = CCFᵀ dual',
    catPriority: 'Critical',
    summary:
      'Deriving CCF and OCF directly by inspection of denominator/numerator coefficients, plus modal Diagonal (distinct poles) and Jordan blocks (repeated poles).',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'canonical_ss',
  },
  {
    id: 'ctrl_ss_props',
    module: ControlModule.STATE_SPACE,
    title: 'Eigenvalues, Transmission Zeros & Similarity Invariance',
    keyFormula: 'det(λI − P⁻¹AP) = det(λI − A) · G̃(s) = G(s)',
    catPriority: 'Critical',
    summary:
      'State-space realizations are non-unique under z = P⁻¹x, yet eigenvalues, characteristic polynomial, and input-output transfer function G(s) remain strictly invariant.',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'canonical_ss',
  },
  {
    id: 'ctrl_stm_exp',
    module: ControlModule.STATE_SPACE,
    title: 'Solution to State Equation, Matrix Exponential e^(At) & Φ(t)',
    keyFormula: 'x(t) = Φ(t)x(0) + ∫₀ᵗ Φ(t−τ)Bu(τ)dτ, Φ(t) = L⁻¹{(sI−A)⁻¹}',
    catPriority: 'Critical',
    summary:
      'Homogeneous vs forced response, computing e^(At) via Laplace resolvent or Cayley-Hamilton, and semigroup properties Φ(0)=I, Φ(t₁+t₂)=Φ(t₁)Φ(t₂).',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'matrix_exp',
  },
  {
    id: 'ctrl_kalman',
    module: ControlModule.DESIGN_OBS,
    title: 'Kalman Numerical Tests of Controllability & Observability',
    keyFormula: 'rank([B AB … Aⁿ⁻¹B]) = n · rank([C; CA; …; CAⁿ⁻¹]) = n',
    catPriority: 'Critical',
    summary:
      'Algebraic full-rank determinant/Gaussian tests on C and O matrices determining whether every state can be steered in finite time or inferred from y(t).',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'kalman_rank',
  },
  {
    id: 'ctrl_gilbert',
    module: ControlModule.DESIGN_OBS,
    title: 'Gilbert Diagonal/Modal Test, Structural Controllability & Reachability',
    keyFormula: 'Modal B̃ = V⁻¹B (no zero rows) · C̃ = CV (no zero cols)',
    catPriority: 'Exam Core',
    summary:
      'Gilbert decouples modes to pinpoint exactly which eigenvalue is uncontrollable/unobservable; distinguishes structural graph connectivity from numerical cancellation and reachability.',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'kalman_rank',
  },
  {
    id: 'ctrl_pole_reg',
    module: ControlModule.DESIGN_OBS,
    title: 'State Feedback Pole Placement (No External Input & Prototype Design)',
    keyFormula: 'u = −Kx ⇒ det(sI − (A − BK)) = α_desired(s)',
    catPriority: 'Critical',
    summary:
      'Coefficient matching, canonical transformation, and Ackermann’s formula K = [0…1]C⁻¹α_d(A) using prototype ITAE/Butterworth or ζ,ω_n pole targets.',
    recommendedLab: ControlLabType.POLE_OBSERVER,
    recommendedCalc: 'pole_place',
  },
  {
    id: 'ctrl_integral_servo',
    module: ControlModule.DESIGN_OBS,
    title: 'Pole Placement with External Inputs & Integral Control (Type-1 Servo)',
    keyFormula: 'u = −Kx + Ki·∫(r − y)dt · Augmented (n+1) order plant',
    catPriority: 'Critical',
    summary:
      'Comparison between feedforward scaling u = −Kx + Nr·r (sensitive to model error) and augmented integral state ẋ_I = r − Cx guaranteeing zero steady-state error.',
    recommendedLab: ControlLabType.POLE_OBSERVER,
    recommendedCalc: 'pole_place',
  },
  {
    id: 'ctrl_observer',
    module: ControlModule.DESIGN_OBS,
    title: 'State Observers (Full-Order & Reduced-Order Luenberger Estimators)',
    keyFormula: 'x̂̇ = Ax̂ + Bu + L(y − Cx̂) ⇒ ė = (A − LC)e',
    catPriority: 'Critical',
    summary:
      'Need for observers when sensors are absent/expensive; dual pole placement for L making observer poles 3–5× faster than controller poles; Separation Principle.',
    recommendedLab: ControlLabType.POLE_OBSERVER,
    recommendedCalc: 'pole_place',
  },
];

export const PID_MODE_ROWS = [
  {
    mode: 'P (Proportional)',
    formula: 'Kp · e(t)',
    riseTime: 'Decreases',
    overshoot: 'Increases',
    settlingTime: 'Small change',
    ssError: 'Decreases (never zero for Type 0)',
    bestUse: 'Fast, stable first-order processes tolerating slight offset',
  },
  {
    mode: 'PI (Prop. + Integral)',
    formula: 'Kp·e(t) + Ki∫e dt',
    riseTime: 'Decreases',
    overshoot: 'Increases (adds −90° lag)',
    settlingTime: 'Increases',
    ssError: 'Eliminates step offset (Type +1)',
    bestUse: 'Flow, pressure, and speed loops requiring zero steady-state error',
  },
  {
    mode: 'PD (Prop. + Derivative)',
    formula: 'Kp·e(t) + Kd·ė(t)',
    riseTime: 'Minor decrease',
    overshoot: 'Decreases strongly (adds phase lead)',
    settlingTime: 'Decreases',
    ssError: 'Minor change',
    bestUse: 'Position servos & double-integrator plants needing damping',
  },
  {
    mode: 'PID (3-Term)',
    formula: 'Kp·e + Ki∫e dt + Kd·ė',
    riseTime: 'Decreases',
    overshoot: 'Controlled / Low',
    settlingTime: 'Decreases',
    ssError: 'Eliminates step offset',
    bestUse: 'General thermal, robotic, and multi-lag industrial plants',
  },
];

export const COMPENSATOR_COMPARISON_ROWS = [
  {
    property: 'Pole-Zero Placement',
    lead: 'Zero closer to jω axis than pole (α < 1)',
    lag: 'Pole closer to jω axis than zero (β > 1)',
    pd: 'Ideal zero only (unbounded HF gain)',
    pi: 'Pole at origin s = 0, finite zero',
  },
  {
    property: 'Primary Effect on Bode',
    lead: 'Adds +φ_m near ω_gc; widens bandwidth',
    lag: 'Attenuates HF by 20·log(β) dB; keeps PM',
    pd: 'Continuous +90° phase boost; +20 dB/dec HF',
    pi: '+20 dB/dec at DC; −90° lag at low ω',
  },
  {
    property: 'Steady-State Accuracy',
    lead: 'Little improvement unless Kc raised',
    lag: 'Boosts K_p / K_v by factor β without pole at 0',
    pd: 'No DC gain improvement',
    pi: 'Increases system Type by +1 (zero step error)',
  },
  {
    property: 'High-Frequency Noise',
    lead: 'Bounded finite gain Kc/α',
    lag: 'Attenuates HF noise above 1/τ',
    pd: 'Amplifies sensor noise strongly',
    pi: 'Passes HF at flat Kp gain',
  },
];

export const CANONICAL_COMPARISON_ROWS = [
  {
    form: 'Control Canonical (CCF)',
    structure: 'Bottom row holds [−a₀, −a₁, …], B = [0…0, 1]ᵀ',
    strength: 'Instant pole placement when system is controllable; C reads numerator directly',
    drawback: 'May be unobservable if pole-zero cancellation occurs',
  },
  {
    form: 'Observer Canonical (OCF)',
    structure: 'Right/Left column holds [−a₀, −a₁, …]ᵀ, C = [0…0, 1]',
    strength: 'Dual of CCF; instant Luenberger observer L calculation by inspection',
    drawback: 'Less intuitive for direct input steering',
  },
  {
    form: 'Diagonal / Jordan Form',
    structure: 'Eigenvalues λ_i on main diagonal (1 on superdiagonal if repeated)',
    strength: 'Decouples modes for Gilbert controllability/observability & trivial e^(At)',
    drawback: 'Requires computing eigenvalues/eigenvectors; complex conjugate blocks if oscillatory',
  },
];

export const CONTROL_TONIGHT_TIMELINE = [
  {
    slot: 'Block 1 · 45 min',
    focus: 'PID, Op-Amp Circuits, ZN Rules & Windup',
    actions:
      'Review P/PI/PD trade-offs, verify inverting op-amp PID transfer functions, memorize ZN Ku/Pu table, and test anti-windup in the PID Simulator.',
  },
  {
    slot: 'Block 2 · 45 min',
    focus: 'Bode Lead & Lag Compensation vs PI/PD',
    actions:
      'Practice computing α from φ_max, finding new ω_gc where |G(jω)| = −10·log(1/α), and contrast Lag attenuation against PI origin poles.',
  },
  {
    slot: 'Block 3 · 60 min',
    focus: 'State-Space Canonical Forms, Similarity & e^(At)',
    actions:
      'Convert 2nd/3rd-order G(s) into CCF, OCF, and Diagonal/Jordan form; compute Φ(t) = L⁻¹{(sI−A)⁻¹} and verify similarity invariance P⁻¹AP.',
  },
  {
    slot: 'Block 4 · 60 min',
    focus: 'Kalman/Gilbert Rank, Ackermann Pole Placement & Observers',
    actions:
      'Drill rank(C) and rank(O) tests, design K with/without integral servo control, compute L for a 2×2 observer, and run a 12-question Timed CAT Quiz.',
  },
];
