import {
  ControlModule,
  ControlQuizQuestion,
  ControlWorkedExample,
} from '../types/ece433';

export interface ControlBenchHardwareGuide {
  id: 'opamp_pid' | 'esp32_motor' | 'esp32_observer' | 'matlab_simulink';
  shortLabel: string;
  title: string;
  hardwareTarget: string;
  pins: string[];
  module: ControlModule;
  objective: string;
  conditioningRule: string;
  steps: string[];
  safetyNote: string;
  bom: { ref: string; value: string; purpose: string }[];
}

export interface ControlScriptItem {
  id: string;
  language: 'matlab' | 'python' | 'esp32';
  filename: string;
  title: string;
  environment: string;
  module: ControlModule;
  summary: string;
  howToRun: string[];
  code: string;
}

export const CONTROL_WORKED_EXAMPLES: ControlWorkedExample[] = [
  {
    id: 'ex-433-zn',
    module: ControlModule.PID,
    title: 'Ziegler–Nichols Closed-Loop Tuning & Op-Amp PI Component Sizing',
    catRelevance: 'CAT High-Yield',
    problemStatement:
      'A unity-feedback plant G(s) = K / (s(s+2)(s+4)) undergoes Ziegler–Nichols closed-loop testing. First find the ultimate gain Ku and ultimate period Pu via Routh–Hurwitz, compute ZN PID gains, then size Rin and Cf for an op-amp PI stage (Kp=4.8, Ti=0.9 s) using Rf = 48 kΩ.',
    given: [
      'G(s) = 1 / (s³ + 6s² + 8s)',
      'Op-amp feedback resistor Rf = 48 kΩ (for PI check)',
    ],
    find: [
      '(a) Ultimate gain Ku and oscillation period Pu',
      '(b) Ziegler–Nichols PID gains Kp, Ki, Kd',
      '(c) Op-amp Rin and Cf values',
    ],
    governingEquations: [
      'Char. eq: s³ + 6s² + 8s + K = 0',
      'ZN PID: Kp = 0.6·Ku, Ti = 0.5·Pu, Td = 0.125·Pu',
      'Op-Amp PI: Kp = Rf/Rin, Ti = Rf·Cf',
    ],
    steps: [
      {
        label: '1. Find Ku and ω_u via Routh–Hurwitz',
        calculation: 'Row s²: [6, K]; Row s¹: (48 − K)/6 = 0 ⇒ Ku = 48. Aux eq: 6s² + 48 = 0 ⇒ ω_u = √8 = 2.828 rad/s',
      },
      {
        label: '2. Compute ultimate period Pu',
        calculation: 'Pu = 2π / ω_u = 2π / 2.8284 = 2.221 s',
      },
      {
        label: '3. Apply Ziegler–Nichols PID rules',
        calculation: 'Kp = 0.6(48) = 28.8; Ti = 0.5(2.221) = 1.111 s; Td = 0.125(2.221) = 0.278 s ⇒ Ki = 25.92, Kd = 8.01',
      },
      {
        label: '4. Size Op-Amp PI components (Kp=4.8, Ti=0.9 s, Rf=48 kΩ)',
        calculation: 'Rin = Rf / Kp = 48 kΩ / 4.8 = 10 kΩ; Cf = Ti / Rf = 0.9 / 48,000 = 18.75 µF',
      },
    ],
    finalAnswer: 'Ku = 48, Pu = 2.22 s | ZN PID: Kp = 28.8, Ki = 25.92, Kd = 8.01 | Op-Amp: Rin = 10 kΩ, Cf = 18.75 µF',
    examTrap: 'Do not use Kp directly as Ki—remember Ki = Kp / Ti and Kd = Kp · Td!',
  },
  {
    id: 'ex-433-lead',
    module: ControlModule.FREQ_COMP,
    title: 'Frequency-Domain Lead Compensator Design for Phase Margin',
    catRelevance: 'CAT High-Yield',
    problemStatement:
      'A Type-1 servo G(s) = 20 / (s(s + 4)) has uncompensated Phase Margin ≈ 36.2° at ω_gc = 3.55 rad/s. Design a Lead compensator C(s) = (1 + τs)/(1 + ατs) to provide φ_m = 30° maximum phase lead centered at ω_m = 6.0 rad/s.',
    given: ['φ_m = 30°', 'Center frequency ω_m = 6.0 rad/s'],
    find: ['(a) Pole-zero ratio α', '(b) Zero time constant τ and compensator C(s)', '(c) High-frequency gain boost (dB)'],
    governingEquations: [
      'α = (1 − sin φ_m) / (1 + sin φ_m)',
      'τ = 1 / (ω_m · √α)',
      'HF Boost = 20 · log10(1 / α)',
    ],
    steps: [
      {
        label: '1. Solve α from required max phase lead φ_m = 30°',
        calculation: 'sin(30°) = 0.5 ⇒ α = (1 − 0.5)/(1 + 0.5) = 0.5 / 1.5 = 1/3 ≈ 0.333',
      },
      {
        label: '2. Compute zero and pole time constants',
        calculation: 'τ = 1 / (6.0 · √(1/3)) = 1.732 / 6.0 = 0.2887 s ⇒ ατ = 0.0962 s',
      },
      {
        label: '3. Write Lead compensator transfer function & HF boost',
        calculation: 'C(s) = (1 + 0.289s)/(1 + 0.096s) | HF Boost = 20·log10(3) = +9.54 dB',
      },
    ],
    finalAnswer: 'α = 0.333, τ = 0.289 s, C(s) = (1 + 0.289s)/(1 + 0.096s), HF boost = +9.54 dB',
    examTrap: 'Zero sits at −1/τ = −3.46 (closer to jω axis) and pole sits at −1/(ατ) = −10.39 (further left). Swapping α > 1 produces a Lag compensator!',
  },
  {
    id: 'ex-433-canonical',
    module: ControlModule.STATE_SPACE,
    title: 'Transfer Function to CCF, OCF & Diagonal Canonical Forms',
    catRelevance: 'CAT High-Yield',
    problemStatement:
      'Convert G(s) = (2s + 8) / (s² + 5s + 6) into Control Canonical Form (CCF), Observer Canonical Form (OCF), and Diagonal Modal Form.',
    given: ['b₁ = 2, b₀ = 8', 'Denominator s² + 5s + 6 = (s + 2)(s + 3) ⇒ a₁ = 5, a₀ = 6'],
    find: ['(a) CCF (A, B, C)', '(b) OCF (A, B, C)', '(c) Diagonal Form (Λ, B̃, C̃)'],
    governingEquations: [
      'CCF: A = [0 1; −a₀ −a₁], B = [0; 1], C = [b₀ b₁]',
      'OCF: A = [0 −a₀; 1 −a₁], B = [b₀; b₁], C = [0 1]',
      'Partial Fractions: G(s) = r₁/(s + 2) + r₂/(s + 3)',
    ],
    steps: [
      {
        label: '1. Write Control Canonical Form by inspection',
        calculation: 'A_ccf = [[0, 1], [−6, −5]], B_ccf = [0; 1], C_ccf = [8, 2], D = 0',
      },
      {
        label: '2. Write Observer Canonical Form (transpose dual)',
        calculation: 'A_ocf = [[0, −6], [1, −5]], B_ocf = [8; 2], C_ocf = [0, 1], D = 0',
      },
      {
        label: '3. Partial fraction expansion for Diagonal Modal Form',
        calculation: 'r₁ = (2(−2)+8)/(−2+3) = 4; r₂ = (2(−3)+8)/(−3+2) = −2 ⇒ Λ = diag(−2, −3), B̃ = [1; 1], C̃ = [4, −2]',
      },
    ],
    finalAnswer: 'CCF C=[8 2], OCF B=[8;2], Diagonal Λ=diag(−2, −3) with B̃=[1;1], C̃=[4, −2]',
    examTrap: 'Ensure descending/ascending coefficient ordering matches: bottom row of CCF is [−a₀, −a₁] where a₀ is the constant term.',
  },
  {
    id: 'ex-433-stm',
    module: ControlModule.STATE_SPACE,
    title: 'State Transition Matrix Φ(t) = e^(At) & Homogeneous Response',
    catRelevance: 'CAT High-Yield',
    problemStatement:
      'Given A = [[0, 1], [−2, −3]], compute Φ(t) = e^(At) via the Laplace resolvent L⁻¹{(sI − A)⁻¹} and find x(t) for x(0) = [1; 0] with u(t) = 0.',
    given: ['A = [[0, 1], [−2, −3]]', 'x(0) = [1; 0]'],
    find: ['(a) (sI − A)⁻¹', '(b) Φ(t) = e^(At)', '(c) x(t) = Φ(t)x(0)'],
    governingEquations: [
      'Φ(t) = L⁻¹{(sI − A)⁻¹}',
      'x(t) = Φ(t)x(0) (homogeneous)',
    ],
    steps: [
      {
        label: '1. Compute sI − A and its determinant',
        calculation: 'sI − A = [[s, −1], [2, s+3]]; det = s² + 3s + 2 = (s + 1)(s + 2)',
      },
      {
        label: '2. Invert (sI − A) via adjugate / det',
        calculation: '(sI−A)⁻¹ = 1/((s+1)(s+2)) · [[s+3, 1], [−2, s]]',
      },
      {
        label: '3. Partial fractions & inverse Laplace per entry',
        calculation: 'Φ₁₁(t) = 2e^(−t) − e^(−2t); Φ₁₂(t) = e^(−t) − e^(−2t); Φ₂₁(t) = −2e^(−t) + 2e^(−2t); Φ₂₂(t) = −e^(−t) + 2e^(−2t)',
      },
      {
        label: '4. Multiply Φ(t) by x(0) = [1; 0]',
        calculation: 'x₁(t) = 2e^(−t) − e^(−2t),  x₂(t) = −2e^(−t) + 2e^(−2t)',
      },
    ],
    finalAnswer: 'x₁(t) = 2e^(−t) − e^(−2t), x₂(t) = −2e^(−t) + 2e^(−2t) (check Φ(0) = I)',
    examTrap: 'Always sanity-check your Φ(t) by plugging t = 0: it MUST equal the identity matrix I!',
  },
  {
    id: 'ex-433-kalman',
    module: ControlModule.DESIGN_OBS,
    title: 'Kalman Rank & Gilbert Modal Controllability/Observability Test',
    catRelevance: 'CAT High-Yield',
    problemStatement:
      'Test controllability and observability of A = [[−1, 0], [0, −4]], B = [1; 0], C = [2, 5] using both Kalman’s and Gilbert’s methods.',
    given: ['A = diag(−1, −4)', 'B = [1; 0]', 'C = [2, 5]'],
    find: ['(a) Kalman C and O matrices + ranks', '(b) Gilbert modal diagnosis'],
    governingEquations: [
      'C = [B, AB],  O = [C; CA]',
      'Gilbert: inspect rows of B̃ = V⁻¹B and cols of C̃ = CV (here V = I)',
    ],
    steps: [
      {
        label: '1. Form Kalman controllability matrix C = [B, AB]',
        calculation: 'AB = [−1; 0] ⇒ C = [[1, −1], [0, 0]] ⇒ det(C) = 0, rank(C) = 1 < 2 (Uncontrollable)',
      },
      {
        label: '2. Form Kalman observability matrix O = [C; CA]',
        calculation: 'CA = [−2, −20] ⇒ O = [[2, 5], [−2, −20]] ⇒ det(O) = −40 − (−10) = −30 ≠ 0, rank(O) = 2 (Observable)',
      },
      {
        label: '3. Apply Gilbert test (A already diagonal, V = I)',
        calculation: 'Row 2 of B̃ = [1; 0] is 0 ⇒ mode λ₂ = −4 is uncontrollable. Both cols of C̃ = [2, 5] are nonzero ⇒ both modes observable.',
      },
    ],
    finalAnswer: 'Uncontrollable (rank C = 1; mode λ₂ = −4 decoupled from B) but Fully Observable (rank O = 2)',
    examTrap: 'Even though λ₂ = −4 is stable, you CANNOT move the pole at −4 with any state feedback K!',
  },
  {
    id: 'ex-433-pole-obs',
    module: ControlModule.DESIGN_OBS,
    title: 'Ackermann Pole Placement & Luenberger Observer Gain L',
    catRelevance: 'Final Exam Core',
    problemStatement:
      'For A = [[0, 1], [0, −2]], B = [0; 1], C = [1, 0], design state feedback K to place closed-loop poles at s = −3 ± j0 (repeated −3, −3), and design Luenberger observer L for poles at s = −9, −9.',
    given: [
      'A = [[0, 1], [0, −2]], B = [0; 1], C = [1, 0]',
      'Regulator desired: (s+3)² = s² + 6s + 9',
      'Observer desired: (s+9)² = s² + 18s + 81',
    ],
    find: ['(a) Feedback gain vector K = [k₁, k₂]', '(b) Observer gain vector L = [l₁; l₂]'],
    governingEquations: [
      'det(sI − (A − BK)) = s² + (2 + k₂)s + k₁',
      'det(sI − (A − LC)) = s² + (2 + l₁)s + (2l₁ + l₂)',
    ],
    steps: [
      {
        label: '1. Match regulator polynomial det(sI − (A − BK))',
        calculation: 'A − BK = [[0, 1], [−k₁, −2−k₂]] ⇒ s² + (2+k₂)s + k₁ = s² + 6s + 9 ⇒ k₁ = 9, k₂ = 4',
      },
      {
        label: '2. Form observer error matrix A − LC',
        calculation: 'A − LC = [[−l₁, 1], [−l₂, −2]] ⇒ det(sI−(A−LC)) = (s+l₁)(s+2) + l₂ = s² + (2+l₁)s + (2l₁+l₂)',
      },
      {
        label: '3. Match observer characteristic polynomial s² + 18s + 81',
        calculation: '2 + l₁ = 18 ⇒ l₁ = 16;  2(16) + l₂ = 81 ⇒ l₂ = 81 − 32 = 49',
      },
    ],
    finalAnswer: 'K = [9, 4] and L = [16; 49] (observer 3× faster than closed-loop regulator)',
    examTrap: 'Never ignore the off-diagonal coupling term (here 2·l₁) inside det(sI − (A − LC))!',
  },
];

export const CONTROL_QUIZ_BANK: ControlQuizQuestion[] = [
  {
    id: 'q433-1',
    module: ControlModule.PID,
    topic: 'PID Mode Characteristics',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'Which PID action eliminates steady-state error for a step setpoint on a Type-0 plant while typically increasing overshoot and slowing settling?',
    options: [
      'Proportional (P) action',
      'Integral (I) action',
      'Derivative (D) action',
      'Feedforward bias',
    ],
    correctIndex: 1,
    formulaHint: 'Integral adds a pole at s = 0, adding −90° phase lag.',
    explanation:
      'Integral action adds a pole at the origin (raising system Type by +1) so steady-state step error goes to zero, at the expense of −90° phase lag that reduces phase margin.',
  },
  {
    id: 'q433-2',
    module: ControlModule.PID,
    topic: 'Electronic Op-Amp PID',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'An inverting op-amp PI controller uses Rin = 10 kΩ, Rf = 50 kΩ, and series Cf = 20 µF. What are its proportional gain Kp and integral time constant Ti?',
    options: [
      'Kp = 5.0, Ti = 1.0 s',
      'Kp = 0.2, Ti = 0.2 s',
      'Kp = 5.0, Ti = 0.2 s',
      'Kp = 50, Ti = 1.0 s',
    ],
    correctIndex: 0,
    formulaHint: 'Kp = Rf / Rin and Ti = Rf · Cf.',
    explanation:
      'Kp = Rf / Rin = 50 kΩ / 10 kΩ = 5.0, and Ti = Rf · Cf = 50×10³ × 20×10⁻⁶ = 1.0 s.',
  },
  {
    id: 'q433-3',
    module: ControlModule.PID,
    topic: 'Ziegler-Nichols Tuning',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'Under Ziegler–Nichols closed-loop testing, sustained oscillations occur at Ku = 20 with period Pu = 0.8 s. What are the ZN PID values (Kp, Ti, Td)?',
    options: [
      'Kp = 12, Ti = 0.4 s, Td = 0.1 s',
      'Kp = 9, Ti = 0.67 s, Td = 0 s',
      'Kp = 10, Ti = 0.4 s, Td = 0.2 s',
      'Kp = 12, Ti = 0.8 s, Td = 0.4 s',
    ],
    correctIndex: 0,
    formulaHint: 'ZN PID: Kp = 0.6·Ku, Ti = 0.5·Pu, Td = 0.125·Pu.',
    explanation:
      'Kp = 0.6 × 20 = 12, Ti = 0.5 × 0.8 = 0.4 s, and Td = 0.125 × 0.8 = 0.1 s.',
  },
  {
    id: 'q433-4',
    module: ControlModule.PID,
    topic: 'Integrator Windup',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'What causes Integrator Windup in a closed-loop control system and which Simulink/digital technique eliminates it?',
    options: [
      'Derivative noise amplification; solved by increasing Kd',
      'Actuator saturation decoupling plant motion from unchecked integral growth; solved by clamping or back-calculation',
      'Sampling faster than Nyquist; solved by an anti-aliasing filter',
      'Pole-zero cancellation; solved by Kalman observability check',
    ],
    correctIndex: 1,
    formulaHint: 'ė_i = e + Kb·(u_sat − u_raw).',
    explanation:
      'During actuator saturation, output error stays large and the integrator accumulates excess state unless frozen (clamping) or unwound via Kb(u_sat − u_raw).',
  },
  {
    id: 'q433-5',
    module: ControlModule.PID,
    topic: 'Practical Op-Amp Differentiator',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'Why must a practical op-amp PD/PID differentiator stage include a small series resistor Rd in series with the input capacitor Cd?',
    options: [
      'To eliminate DC steady-state error',
      'To limit high-frequency gain and prevent sensor noise saturation',
      'To double the integral time constant Ti',
      'To invert the sign of the error signal',
    ],
    correctIndex: 1,
    formulaHint: 'Practical D: C_D(s) = −Rf·Cd·s / (1 + Rd·Cd·s).',
    explanation:
      'An ideal differentiator gain grows linearly with frequency, saturating the op-amp on high-frequency noise; Rd caps high-frequency gain at Rf/Rd.',
  },
  {
    id: 'q433-6',
    module: ControlModule.FREQ_COMP,
    topic: 'Lead Compensator Phase',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'A Lead compensator C(s) = (1 + τs)/(1 + ατs) has α = 0.25. What is the maximum phase lead φ_max it can contribute?',
    options: ['19.5°', '30.0°', '36.9°', '54.9°'],
    correctIndex: 2,
    formulaHint: 'sin(φ_max) = (1 − α) / (1 + α).',
    explanation:
      'sin(φ_max) = (1 − 0.25) / (1 + 0.25) = 0.75 / 1.25 = 0.6 ⇒ φ_max = arcsin(0.6) ≈ 36.87°.',
  },
  {
    id: 'q433-7',
    module: ControlModule.FREQ_COMP,
    topic: 'Lag vs Lead Selection',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'When your uncompensated Bode plot already has acceptable phase margin at a lower frequency, and you need to boost DC velocity error constant Kv without amplifying high-frequency noise, which compensator is preferred?',
    options: [
      'Lead compensator',
      'Lag compensator',
      'Ideal PD controller',
      'Pure differentiator',
    ],
    correctIndex: 1,
    formulaHint: 'Lag attenuates HF magnitude by 20·log10(β) while keeping low-frequency DC gain high.',
    explanation:
      'A Lag compensator shifts ω_gc leftward to a frequency where plant phase is already safe, while boosting DC gain by factor β and attenuating HF noise.',
  },
  {
    id: 'q433-8',
    module: ControlModule.FREQ_COMP,
    topic: 'Lead/Lag vs PD/PI Comparison',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'How does a frequency-domain Lag compensator fundamentally differ from a PI controller?',
    options: [
      'Lag places its pole at a finite negative location −1/(βτ), whereas PI places its pole strictly at s = 0',
      'Lag adds +90° phase lead everywhere, whereas PI adds −90°',
      'PI cannot eliminate steady-state step error on Type-0 plants',
      'Lag requires active op-amps while PI is purely passive',
    ],
    correctIndex: 0,
    formulaHint: 'PI is the limiting case of Lag as β → ∞ (pole → 0).',
    explanation:
      'A PI controller has an ideal pole at the origin (increasing system Type by 1); a Lag compensator has a finite left-half-plane pole, boosting error constants finitely by factor β.',
  },
  {
    id: 'q433-9',
    module: ControlModule.STATE_SPACE,
    topic: 'Canonical Forms',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'What is the Control Canonical Form (CCF) A and C matrices for G(s) = (3s + 7) / (s² + 6s + 8)?',
    options: [
      'A = [[0, 1], [−8, −6]], C = [7, 3]',
      'A = [[0, 1], [−6, −8]], C = [3, 7]',
      'A = [[0, −8], [1, −6]], C = [0, 1]',
      'A = [[−2, 0], [0, −4]], C = [7, 3]',
    ],
    correctIndex: 0,
    formulaHint: 'CCF bottom row = [−a₀, −a₁], C = [b₀, b₁].',
    explanation:
      'With a₀ = 8, a₁ = 6, b₀ = 7, b₁ = 3, CCF has A = [[0, 1], [−8, −6]], B = [0; 1], C = [7, 3].',
  },
  {
    id: 'q433-10',
    module: ControlModule.STATE_SPACE,
    topic: 'Similarity Invariance',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'If a coordinate transformation z = P⁻¹x transforms (A, B, C) into (P⁻¹AP, P⁻¹B, CP), which statement is ALWAYS true?',
    options: [
      'The matrix entries A_ij remain unchanged',
      'The eigenvalues of A and transfer function G(s) remain strictly invariant',
      'Kalman controllability rank drops by 1',
      'All state variables retain identical physical units',
    ],
    correctIndex: 1,
    formulaHint: 'det(λI − P⁻¹AP) = det(λI − A).',
    explanation:
      'Similarity transformations represent the same LTI system in new coordinates—so eigenvalues, characteristic polynomial, and input-output transfer function G(s) are invariant.',
  },
  {
    id: 'q433-11',
    module: ControlModule.STATE_SPACE,
    topic: 'State Transition Matrix',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'Which identity is NOT a valid property of the LTI State Transition Matrix Φ(t) = e^(At)?',
    options: [
      'Φ(0) = I',
      'Φ(t₁ + t₂) = Φ(t₁)Φ(t₂)',
      'Φ⁻¹(t) = Φ(−t)',
      'dΦ(t)/dt = A⁻¹Φ(t)',
    ],
    correctIndex: 3,
    formulaHint: 'Matrix exponential satisfies d/dt(e^(At)) = A·e^(At).',
    explanation:
      'The derivative of Φ(t) = e^(At) is A·Φ(t) (or Φ(t)·A), never A⁻¹·Φ(t).',
  },
  {
    id: 'q433-12',
    module: ControlModule.STATE_SPACE,
    topic: 'State-Space to Transfer Function',
    catHighYield: false,
    difficulty: 'Analytical',
    question:
      'Given diagonal A = [[−1, 0], [0, −5]], B = [1; 1], C = [3, 2], D = 0, what is G(s) = C(sI − A)⁻¹B?',
    options: [
      '3/(s+1) + 2/(s+5) = (5s + 17)/((s+1)(s+5))',
      '1/(s+1) + 1/(s+5)',
      '6/((s+1)(s+5))',
      '(2s + 3)/((s+1)(s+5))',
    ],
    correctIndex: 0,
    formulaHint: 'For diagonal A, G(s) = Σ c_i·b_i / (s − λ_i).',
    explanation:
      'In diagonal form, each mode contributes c_i·b_i/(s − λ_i): 3/(s+1) + 2/(s+5) = (5s + 17)/((s+1)(s+5)).',
  },
  {
    id: 'q433-13',
    module: ControlModule.DESIGN_OBS,
    topic: 'Kalman Controllability Test',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'For A = [[2, 0], [0, −3]] and B = [0; 4], what is the Kalman controllability matrix C = [B, AB] and its rank?',
    options: [
      'C = [[0, 0], [4, −12]], rank = 1 (Uncontrollable)',
      'C = [[0, 4], [4, −12]], rank = 2 (Controllable)',
      'C = [[2, 0], [0, −3]], rank = 2 (Controllable)',
      'C = [[0, 0], [0, 0]], rank = 0',
    ],
    correctIndex: 0,
    formulaHint: 'Compute AB first, then concatenate [B, AB].',
    explanation:
      'AB = [[2,0],[0,-3]][0;4] = [0; -12]. Row 1 of C = [B, AB] is all zeros, so rank = 1 < 2: mode λ = 2 is uncontrollable!',
  },
  {
    id: 'q433-14',
    module: ControlModule.DESIGN_OBS,
    topic: 'Gilbert Modal Test & Pole-Zero Cancellation',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'In Gilbert’s controllability & observability test (for distinct eigenvalues), what indicates that mode λ_k is unobservable?',
    options: [
      'The k-th row of B̃ = V⁻¹B is zero',
      'The k-th column of C̃ = CV is zero',
      'λ_k is negative real',
      'Matrix A has nonzero off-diagonal entries',
    ],
    correctIndex: 1,
    formulaHint: 'C̃ = CV maps modal coordinates z to output y = C̃z.',
    explanation:
      'If column k of C̃ = CV is zero, modal state z_k produces zero output contribution at y(t) and is therefore unobservable.',
  },
  {
    id: 'q433-15',
    module: ControlModule.DESIGN_OBS,
    topic: 'Pole Placement & Integral Servo',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'Why is an augmented integral state ẋ_I = r − Cx preferred over a static feedforward gain u = −Kx + Nr·r for step reference tracking?',
    options: [
      'Feedforward Nr achieves zero error only for exact nominal (A, B, C), whereas integral control preserves zero steady-state error under plant uncertainty',
      'Integral control eliminates the need for system controllability',
      'Feedforward Nr destabilizes open-loop zeros',
      'Integral control lowers the closed-loop system order by 1',
    ],
    correctIndex: 0,
    formulaHint: 'Integral feedback creates Type-1 closed-loop dynamics.',
    explanation:
      'Static Nr cancels DC error only if the model is exact; integral action drives steady-state error to zero robustly even if plant gain drifts.',
  },
  {
    id: 'q433-16',
    module: ControlModule.DESIGN_OBS,
    topic: 'Luenberger State Observer Design',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'According to the Separation Principle, how are closed-loop eigenvalues affected when state feedback u = −Kx̂ uses a Luenberger observer x̂̇ = Ax̂ + Bu + L(y − Cx̂)?',
    options: [
      'Observer poles shift the regulator poles K unpredictably',
      'Closed-loop poles equal the exact union of eig(A − BK) and eig(A − LC)',
      'Observer poles must be placed slower than regulator poles',
      'Observers only work if D ≠ 0',
    ],
    correctIndex: 1,
    formulaHint: 'Block-triangular dynamics of [x; e] decouple characteristic polynomials.',
    explanation:
      'In [x; e] coordinates (e = x − x̂), the system matrix is block-upper-triangular, so eigenvalues are simply eig(A − BK) ∪ eig(A − LC).',
  },
];

export const STATE_SPACE_QUIZ_BANK: ControlQuizQuestion[] = [
  {
    id: 'ss-q1',
    module: ControlModule.DESIGN_OBS,
    topic: 'Controllability Matrix & Rank',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'Given A = [[0, 1], [−6, −5]] and B = [0; 1], identify the exact Kalman controllability matrix C = [B, AB] and determine whether the system is controllable.',
    options: [
      'C = [[0, 1], [1, −5]], det(C) = −1 ≠ 0 → Controllable',
      'C = [[0, 0], [1, −6]], det(C) = 0 → Uncontrollable',
      'C = [[1, −5], [0, 1]], det(C) = 1 → Controllable',
      'C = [[0, 1], [−6, −5]], det(C) = 6 → Controllable',
    ],
    correctIndex: 0,
    formulaHint: 'C = [B, AB], where AB = [[0, 1], [−6, −5]][0; 1] = [1; −5].',
    explanation:
      'Multiplying A·B gives [1; −5]. Concatenating [B, AB] yields C = [[0, 1], [1, −5]] with det(C) = 0·(−5) − 1·1 = −1 ≠ 0, so rank(C) = 2 (completely controllable, as expected for CCF).',
  },
  {
    id: 'ss-q2',
    module: ControlModule.DESIGN_OBS,
    topic: 'Controllability Matrix & Rank',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'For the upper-triangular system A = [[−1, 2], [0, −4]] and B = [1; 0], what is the controllability matrix C = [B, AB] and which mode is uncontrollable?',
    options: [
      'C = [[1, −1], [0, 0]], rank(C) = 1 → Mode λ = −4 is uncontrollable',
      'C = [[1, 2], [0, −4]], rank(C) = 2 → Fully controllable',
      'C = [[1, 0], [−1, 0]], rank(C) = 1 → Mode λ = −1 is uncontrollable',
      'C = [[1, 1], [0, −4]], rank(C) = 2 → Fully controllable',
    ],
    correctIndex: 0,
    formulaHint: 'Compute AB = [[−1, 2], [0, −4]][1; 0] = [−1; 0].',
    explanation:
      'Because ẋ₂ = −4x₂ has zero input coupling (B₂ = 0), AB = [−1; 0], making the entire second row of C = [[1, −1], [0, 0]] zero. Thus rank(C) = 1 < 2 and the mode λ = −4 cannot be moved by u.',
  },
  {
    id: 'ss-q3',
    module: ControlModule.DESIGN_OBS,
    topic: 'Controllability Matrix & Rank',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'A 3rd-order system has A = diag(−1, −2, −3) and B = [1; 1; 0]. Identify the 3×3 Kalman controllability matrix C = [B, AB, A²B] and its rank.',
    options: [
      'C = [[1, −1, 1], [1, −2, 4], [0, 0, 0]], rank(C) = 2 (Uncontrollable)',
      'C = [[1, −1, 1], [1, −2, 4], [0, 1, −3]], rank(C) = 3 (Controllable)',
      'C = [[1, 1, 1], [1, 2, 4], [0, 0, 0]], rank(C) = 2 (Uncontrollable)',
      'C = [[−1, 1, −1], [−2, 4, −8], [0, 0, 0]], rank(C) = 1 (Uncontrollable)',
    ],
    correctIndex: 0,
    formulaHint: 'For diagonal A, A^k B multiplies entry i by λ_i^k.',
    explanation:
      'AB = [−1; −2; 0] and A²B = [1; 4; 0]. Thus C = [[1, −1, 1], [1, −2, 4], [0, 0, 0]]. The 3rd row is identically zero so rank(C) = 2 < 3 (mode λ = −3 is uncontrollable).',
  },
  {
    id: 'ss-q4',
    module: ControlModule.STATE_SPACE,
    topic: 'Eigenvalues & Characteristic Polynomial',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'Compute the eigenvalues of the system matrix A = [[0, 1], [−13, −4]].',
    options: [
      'λ₁,₂ = −2 ± j3',
      'λ₁,₂ = −4 ± j13',
      'λ₁ = −1, λ₂ = −13',
      'λ₁,₂ = 2 ± j3',
    ],
    correctIndex: 0,
    formulaHint: 'det(λI − A) = λ² − tr(A)λ + det(A) = λ² + 4λ + 13 = 0.',
    explanation:
      'Here tr(A) = −4 and det(A) = 13, giving characteristic equation λ² + 4λ + 13 = (λ + 2)² + 9 = 0, whose roots are complex conjugates λ = −2 ± j3 (stable, ωₙ = √13).',
  },
  {
    id: 'ss-q5',
    module: ControlModule.STATE_SPACE,
    topic: 'Eigenvalues & Characteristic Polynomial',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'Compute the eigenvalues of A = [[−3, 4], [2, −1]] and classify the open-loop equilibrium stability.',
    options: [
      'λ₁ = 1, λ₂ = −5 → Unstable (one RHP eigenvalue)',
      'λ₁ = −1, λ₂ = −5 → Asymptotically stable',
      'λ₁ = −2 ± j1 → Asymptotically stable',
      'λ₁ = 3, λ₂ = −1 → Unstable',
    ],
    correctIndex: 0,
    formulaHint: 'tr(A) = −3 + (−1) = −4; det(A) = (−3)(−1) − (4)(2) = −5.',
    explanation:
      'Characteristic polynomial: λ² − tr(A)λ + det(A) = λ² + 4λ − 5 = (λ − 1)(λ + 5) = 0, giving λ₁ = +1 and λ₂ = −5. Because λ₁ > 0 lies in the RHP, the system is unstable.',
  },
  {
    id: 'ss-q6',
    module: ControlModule.STATE_SPACE,
    topic: 'Eigenvalues & Characteristic Polynomial',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'What are the eigenvalues of the 3×3 state matrix A = [[−2, 5, 1], [0, −4, 3], [0, 0, −7]]?',
    options: [
      'λ = −2, −4, −7 (strictly diagonal entries)',
      'λ = −2, −5, −3',
      'λ = 2, 4, 7',
      'Cannot be found without computing all 3×3 cofactors of A',
    ],
    correctIndex: 0,
    formulaHint: 'The determinant of an upper-triangular matrix (λI − A) is the product of its diagonal entries.',
    explanation:
      'For any triangular matrix, det(λI − A) = (λ + 2)(λ + 4)(λ + 7) = 0, so the eigenvalues are simply the diagonal elements −2, −4, −7 (all LHP → asymptotically stable).',
  },
  {
    id: 'ss-q7',
    module: ControlModule.STATE_SPACE,
    topic: 'Canonical Forms',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'A plant obeys ÿ + 7ẏ + 12y = 2u̇ + 5u. What are its Observable Canonical Form (OCF) matrix A_o and system eigenvalues?',
    options: [
      'A_o = [[0, −12], [1, −7]], B_o = [5; 2], C_o = [0, 1]; λ = −3, −4',
      'A_o = [[0, 1], [−12, −7]], B_o = [0; 1], C_o = [5, 2]; λ = −3, −4',
      'A_o = [[0, −7], [1, −12]], B_o = [2; 5], C_o = [1, 0]; λ = −2, −5',
      'A_o = [[−3, 0], [0, −4]], B_o = [1; 1], C_o = [5, 2]; λ = −1, −12',
    ],
    correctIndex: 0,
    formulaHint: 'OCF is the dual transpose: A_o = A_cᵀ, B_o = C_cᵀ, C_o = B_cᵀ.',
    explanation:
      'From G(s) = (2s + 5)/(s² + 7s + 12), transposing CCF gives A_o = [[0, −12], [1, −7]], B_o = [5; 2], C_o = [0, 1]. Its characteristic polynomial s² + 7s + 12 = (s + 3)(s + 4) yields λ = −3, −4.',
  },
  {
    id: 'ss-q8',
    module: ControlModule.STATE_SPACE,
    topic: 'Similarity Invariance',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'If a pair (A, B) is controllable (rank([B, AB, ..., Aⁿ⁻¹B]) = n), what happens to controllability after applying state feedback u = −Kx + v?',
    options: [
      'The closed-loop pair (A − BK, B) remains strictly controllable (rank of C is unchanged)',
      'Controllability is lost whenever det(A − BK) ≠ det(A)',
      'Rank of C drops by the number of nonzero entries in K',
      'Only the observable modes remain controllable',
    ],
    correctIndex: 0,
    formulaHint: 'Each column A_cl^k B is a linear combination of B, AB, ..., A^k B.',
    explanation:
      'State feedback u = −Kx + v shifts the eigenvalues eig(A − BK) arbitrarily, but the column space of [B, (A−BK)B, ...] spans the exact same subspace as [B, AB, ...], preserving controllability.',
  },
];

export const CONTROL_BENCH_LABS: ControlBenchHardwareGuide[] = [
  {
    id: 'opamp_pid',
    shortLabel: 'Op-Amp PID Circuit',
    title: 'Analog Electronic PID Realization (LM324 / TL084 + ESP32 Monitor)',
    hardwareTarget: 'Quad Op-Amp Non-Interacting PID → ESP32 ADC1 Logger',
    pins: ['GPIO34 (Setpoint Ref)', 'GPIO35 (Plant Output y)', 'GPIO32 (Controller u)'],
    module: ControlModule.PID,
    objective:
      'Build the ECE 433 4-op-amp parallel PID controller on a breadboard, clip feedback capacitors with Zener/Schottky anti-windup clamps, and log live step responses into the browser via ESP32 Web Serial.',
    conditioningRule:
      'Bias dual-rail or single-supply op-amp stages cleanly inside 0.2–3.0 V before tapping into ESP32 ADC1 pins (GPIO34/35/32), using 1 kΩ + 100 nF RC protection at the ADC inputs.',
    steps: [
      'Configure U1A as error subtractor e = r − y (10 kΩ matched bridge).',
      'Wire U1B (P: Kp = Rf/R1), U1C (I: Ci = 10 µF), and U1D (D: Cd = 1 µF with Rd = 1 kΩ noise limiter).',
      'Place back-to-back 3.3 V Zeners across Ci to test hardware anti-windup vs open-capacitor windup.',
      'Connect ESP32 GPIO34/35/32 to capture step response CSV and inspect overshoot in Python/MATLAB.',
    ],
    safetyNote:
      'Never exceed 3.3 V on ESP32 ADC pins if running op-amps from ±12 V rails—always clamp with BAT54S or a resistor divider.',
    bom: [
      { ref: 'U1', value: 'TL084 / LM324 Quad Op-Amp', purpose: 'Error, P, I, D stages' },
      { ref: 'Ci', value: '10 µF Film / Ceramic', purpose: 'Integrator storage element' },
      { ref: 'Rd / Cd', value: '1 kΩ + 1 µF', purpose: 'Bandlimited practical differentiator' },
      { ref: 'D1', value: 'BAT54S Dual Schottky', purpose: 'Protects ESP32 ADC from ±op-amp rails' },
    ],
  },
  {
    id: 'esp32_motor',
    shortLabel: 'ESP32 Discrete PID',
    title: 'ESP32 Closed-Loop DC Motor / RC Thermal Plant with Anti-Windup',
    hardwareTarget: 'PWM Out GPIO25 → Plant (MOSFET/RC) → Sensor Feedback GPIO34',
    pins: ['GPIO25 (PWM u)', 'GPIO34 (Plant y)', '115200 Baud Web Serial'],
    module: ControlModule.PID,
    objective:
      'Run a deterministic Ts = 20 ms discrete PID loop on your ESP32 driving an RC thermal plant or DC motor speed sensor, observing real actuator PWM saturation (0–100%) and back-calculation anti-windup.',
    conditioningRule:
      'Use a 2nd-order RC ladder (two cascaded 10 kΩ + 100 µF stages) if you want a 100% safe desktop plant directly driven by GPIO25 PWM and read back by GPIO34!',
    steps: [
      'Wire GPIO25 → 10 kΩ → Node1 (100 µF to GND) → 10 kΩ → Node2 (100 µF to GND) → GPIO34 for an instant zero-risk 2nd-order plant.',
      'Flash ece433_esp32_pid_observer.ino and open the Live Serial Monitor tab.',
      'Send ZN tuning commands over Web Serial TX (e.g., KP=3.5, KI=1.8, AW=0 vs AW=1) to see integrator windup vanish.',
    ],
    safetyNote:
      'If driving an inductive DC motor instead of the 2-stage RC plant, always use a flyback diode (1N5819) and an external MOSFET supply.',
    bom: [
      { ref: 'R_p1, R_p2', value: '10 kΩ (2×)', purpose: '2-pole analog RC plant ladder' },
      { ref: 'C_p1, C_p2', value: '100 µF (2×)', purpose: 'Creates τ1 = τ2 = 1.0 s plant poles' },
    ],
  },
  {
    id: 'esp32_observer',
    shortLabel: 'State-Space Observer',
    title: 'ESP32 Luenberger State Observer + Pole Placement Loop',
    hardwareTarget: '1 Output Sensor (GPIO34) → Full 2-State Observer x̂(t) on ESP32',
    pins: ['GPIO34 (Measured y = x₁)', 'GPIO25 (u = −K·x̂)', 'UART Telemetry'],
    module: ControlModule.DESIGN_OBS,
    objective:
      'Measure only one physical state (Node 2 voltage x₁ on GPIO34) while an embedded discrete Luenberger observer estimates the hidden internal state x̂₂ (Node 1 voltage) in real time and applies u = −Kx̂ + Ki·x_I.',
    conditioningRule:
      'Tap Node 1 temporarily to GPIO35 only to verify how closely your software observer estimate x̂₂ tracks the hidden true state x₂!',
    steps: [
      'Compute K, Ki, and L in the Solver & Matrices tab or MATLAB script for your 2-stage RC plant.',
      'Enable OBSERVER_MODE in the ESP32 firmware and log y, x1_hat, x2_hat over Web Serial.',
      'Compare true measured x₂ on GPIO35 against software-estimated x̂₂ to verify Separation Principle convergence.',
    ],
    safetyNote:
      'Verify common GND between plant capacitors and ESP32 GND so ADC bias stays rock solid.',
    bom: [
      { ref: 'J1', value: 'ESP32 DevKit V1', purpose: 'Runs 50 Hz discrete observer + integral servo' },
      { ref: 'Test Lead', value: 'GPIO35 Probe', purpose: 'Optional ground-truth check for hidden state x2' },
    ],
  },
  {
    id: 'matlab_simulink',
    shortLabel: 'MATLAB & Simulink',
    title: 'MATLAB Control Systems Toolbox & Simulink Anti-Windup Workflow',
    hardwareTarget: 'MATLAB R2020b+ (Control System Toolbox + Simulink)',
    pins: ['pid()', 'pidtune()', 'bode() / margin()', 'ss() / place()'],
    module: ControlModule.FREQ_COMP,
    objective:
      'Mirror every ECE 433 analytical calculation in MATLAB Control Systems Toolbox and build a Simulink PID loop with Saturation + Clamping/Back-Calculation anti-windup.',
    conditioningRule:
      'In Simulink, open the PID Controller block → Output Saturation tab → enable "Limit output" and toggle Anti-windup method between "none", "clamping", and "back-calculation" to match our browser lab.',
    steps: [
      'Download ece433_pid_bode_toolbox.m and ece433_statespace_observer.m from the Script Pack.',
      'Run Section 1 to verify Ziegler-Nichols vs pidtune() and Bode Lead/Lag margins.',
      'Run Section 2 to cross-check CCF/OCF, Kalman ctrb/obsv ranks, Ackermann place(), and Luenberger observer trajectories.',
    ],
    safetyNote:
      'If using Python instead of MATLAB, install python-control (pip install control numpy scipy matplotlib) for identical syntax.',
    bom: [
      { ref: 'Toolbox', value: 'Control System Toolbox', purpose: 'tf, ss, pid, margin, ctrb, obsv, place' },
      { ref: 'Simulink', value: 'PID Controller Block', purpose: 'Built-in Clamping & Back-Calculation anti-windup' },
    ],
  },
];

export const CONTROL_SCRIPT_PACK: ControlScriptItem[] = [
  {
    id: 'ctrl-mat-pid-bode',
    language: 'matlab',
    filename: 'ece433_pid_bode_toolbox.m',
    title: 'MATLAB Control Systems Toolbox: PID, ZN, Windup & Bode Lead/Lag',
    environment: 'MATLAB + Control System Toolbox (pid, bode, margin, lsim)',
    module: ControlModule.FREQ_COMP,
    summary:
      'Computes Ziegler–Nichols PID tuning, compares open-loop Bode Lead/Lag compensators vs PI/PD using margin(), and simulates step responses.',
    howToRun: [
      'Open in MATLAB R2019b+ with Control System Toolbox installed.',
      'Run section-by-section (Ctrl+Enter) to inspect Step & Bode Margin figures.',
    ],
    code: `%% ECE 433 Control System II — PID, Ziegler-Nichols & Bode Lead/Lag Lab
clear; clc; close all;

%% 1. Plant & Ziegler-Nichols Ultimate Gain Check
s = tf('s');
G = 1 / (s * (s + 2) * (s + 4));

% Find gain margin => Ku and phase crossover frequency => Pu
[Gm, ~, Wcg, ~] = margin(G);
Ku = Gm;
Pu = 2*pi / Wcg;
fprintf("Ultimate Gain Ku = %.3f, Ultimate Period Pu = %.3f s\\n", Ku, Pu);

Kp_zn = 0.6 * Ku;
Ti_zn = 0.5 * Pu;
Td_zn = 0.125 * Pu;
C_zn = pid(Kp_zn, Kp_zn/Ti_zn, Kp_zn*Td_zn);

% Modern MATLAB pidtune comparison
C_tune = pidtune(G, 'PID');

figure('Name', 'PID Step Comparison');
step(feedback(C_zn*G, 1), feedback(C_tune*G, 1), 6);
legend('Ziegler-Nichols PID', 'MATLAB pidtune()');
title('ECE 433: Ziegler-Nichols vs Modern PID Tuning'); grid on;

%% 2. Frequency-Domain Lead Compensator vs PD Controller
Gp = 20 / (s * (s + 4));
phi_m = deg2rad(35);
alpha = (1 - sin(phi_m)) / (1 + sin(phi_m));
wm = 6.0;
tau = 1 / (wm * sqrt(alpha));

C_lead = (1 + tau*s) / (1 + alpha*tau*s);
C_pd   = (1 + tau*s); % Ideal PD (high-freq noise gain unbounded)

figure('Name', 'Bode Lead Compensation');
margin(Gp); hold on;
margin(C_lead * Gp);
legend('Uncompensated Gp', 'Lead Compensated C_lead * Gp');
grid on;

figure('Name', 'Lead vs Lag Step Response');
step(feedback(Gp, 1), feedback(C_lead*Gp, 1), 3);
legend('Uncompensated', 'Lead Compensated'); grid on;
`,
  },
  {
    id: 'ctrl-mat-ss-obs',
    language: 'matlab',
    filename: 'ece433_statespace_observer.m',
    title: 'MATLAB State-Space: Canonical, Kalman/Gilbert, Pole Placement & Observer',
    environment: 'MATLAB + Control System Toolbox (ss, canon, ctrb, obsv, place)',
    module: ControlModule.DESIGN_OBS,
    summary:
      'Demonstrates tf-to-state-space canonical forms, similarity eigenvalue invariance, matrix exponential expm(A*t), Kalman rank tests, integral servo placement, and Luenberger observer simulation.',
    howToRun: [
      'Run in MATLAB to verify all state-space hand calculations and plot observer convergence.',
    ],
    code: `%% ECE 433 Control System II — State-Space, Kalman, Pole Placement & Observer
clear; clc; close all;

%% 1. Transfer Function -> Control Canonical & Modal Diagonal Forms
num = [2 8]; den = [1 5 6];
G = tf(num, den);
sys_ccf = canon(ss(G), 'companion');
sys_mod = canon(ss(G), 'modal');

A = [0 1; -6 -5]; B = [0; 1]; C = [8 2]; D = 0;

%% 2. Similarity Transformation & Eigenvalue Invariance
P = [1 2; 0 1];
A_tilde = P \\ A * P;
fprintf("Original eig(A): %s | Transformed eig(P^-1 A P): %s\\n", ...
    mat2str(eig(A).', 4), mat2str(eig(A_tilde).', 4));

%% 3. State Transition Matrix Phi(t) = expm(A*t)
t_eval = 0.5;
Phi_05 = expm(A * t_eval);
disp("Phi(0.5) = expm(0.5*A):"); disp(Phi_05);

%% 4. Kalman Controllability & Observability Rank Tests
Co = ctrb(A, B);
Ob = obsv(A, C);
fprintf("rank(C) = %d, rank(O) = %d (n = %d)\\n", rank(Co), rank(Ob), size(A,1));

%% 5. Pole Placement + Integral Servo & Luenberger Observer Design
% Desired regulator poles & 3x faster observer poles
p_reg = [-3 -4];
p_obs = [-12 -14];
K = place(A, B, p_reg);
L = place(A', C', p_obs)';

% Integral servo augmentation: A_aug = [A 0; -C 0], B_aug = [B; 0]
A_aug = [A, zeros(2,1); -C, 0];
B_aug = [B; 0];
K_aug = place(A_aug, B_aug, [-3 -4 -6]);
K_servo = K_aug(1:2); Ki_servo = -K_aug(3);

fprintf("Ackermann K = [%.3f, %.3f] | Observer L = [%.3f; %.3f]\\n", K(1), K(2), L(1), L(2));
fprintf("Integral Servo: K = [%.3f, %.3f], Ki = %.3f\\n", K_servo(1), K_servo(2), Ki_servo);
`,
  },
  {
    id: 'ctrl-py-pid',
    language: 'python',
    filename: 'ece433_pid_bode_spyder.py',
    title: 'Spyder Python: PID Anti-Windup & Bode Lead/Lag Compensator',
    environment: 'Python 3 · Spyder IDE (numpy, scipy, matplotlib)',
    module: ControlModule.PID,
    summary:
      'Simulates a saturated 2nd-order plant showing Integrator Windup vs Clamping/Back-Calculation, plus Bode Lead/Lag Phase Margin shaping.',
    howToRun: [
      'Open in Spyder and run cells (Ctrl+Enter). Uses pure numpy/scipy/matplotlib (no extra packages needed).',
    ],
    code: `#%% ECE 433 Control System II — PID Windup & Frequency Compensation (Spyder)
import numpy as np
import matplotlib.pyplot as plt

def sim_pid(kp=4.5, ki=3.0, kd=1.2, u_max=2.5, anti_windup="none"):
    dt = 0.01
    t = np.arange(0, 10.0, dt)
    y, yd, integ, prev_e = 0.0, 0.0, 0.0, 1.0
    y_hist, u_hist = [], []
    for k in range(len(t)):
        e = 1.0 - y
        de = 0.0 if k == 0 else (e - prev_e) / dt
        prev_e = e
        u_raw = kp * e + ki * integ + kd * de
        u_sat = np.clip(u_raw, -u_max, u_max)
        y_hist.append(y); u_hist.append(u_sat)
        if anti_windup == "clamping":
            if not ((u_raw > u_max and e > 0) or (u_raw < -u_max and e < 0)):
                integ += e * dt
        elif anti_windup == "back_calc":
            integ += (e + 2.0 * (u_sat - u_raw)) * dt
        else:
            integ += e * dt
        ydd = u_sat - 2.0 * yd - 1.0 * y
        yd += ydd * dt
        y += yd * dt
    return t, np.array(y_hist), np.array(u_hist)

t, y_wind, u_wind = sim_pid(anti_windup="none")
_, y_clamp, u_clamp = sim_pid(anti_windup="clamping")

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(9, 6), sharex=True)
ax1.plot(t, y_wind, label="Without Anti-Windup (Overshoot!)", color="#dc2626")
ax1.plot(t, y_clamp, label="With Clamping Anti-Windup", color="#059669", lw=2)
ax1.axhline(1.0, ls="--", color="#64748b")
ax1.set_ylabel("Output y(t)"); ax1.set_title("ECE 433 Integrator Windup Demo"); ax1.legend()

ax2.plot(t, u_wind, color="#dc2626", label="Control u(t) Windup")
ax2.plot(t, u_clamp, color="#059669", label="Control u(t) Clamped")
ax2.set_ylabel("Actuator u(t)"); ax2.set_xlabel("Time (s)"); ax2.legend()
plt.tight_layout(); plt.show()
`,
  },
  {
    id: 'ctrl-py-ss',
    language: 'python',
    filename: 'ece433_statespace_kalman_spyder.py',
    title: 'Spyder Python: Kalman Rank, Matrix Exp e^(At) & Observer Twin',
    environment: 'Python 3 · Spyder IDE (numpy, scipy, matplotlib)',
    module: ControlModule.DESIGN_OBS,
    summary:
      'Computes Kalman controllability/observability ranks, matrix exponential expm(A*t), Ackermann K & L, and plots true vs observer-estimated state convergence.',
    howToRun: [
      'Execute cells in Spyder to verify your matrix homework and observe x̂(t) → x(t).',
    ],
    code: `#%% ECE 433 — State-Space, Matrix Exp & Luenberger Observer (Spyder)
import numpy as np
from scipy.linalg import expm
import matplotlib.pyplot as plt

A = np.array([[0.0, 1.0], [0.0, -2.0]])
B = np.array([[0.0], [1.0]])
C = np.array([[1.0, 0.0]])

# Kalman Controllability & Observability matrices
Co = np.hstack([B, A @ B])
Ob = np.vstack([C, C @ A])
print("rank(C) =", np.linalg.matrix_rank(Co), "| rank(O) =", np.linalg.matrix_rank(Ob))
print("expm(A * 0.5) =\\n", expm(A * 0.5))

# Ackermann for poles (-3, -3) and observer poles (-9, -9)
K = np.array([[9.0, 4.0]])
L = np.array([[16.0], [49.0]])

dt = 0.01
t = np.arange(0, 3.0, dt)
x = np.array([[1.2], [0.0]])
xh = np.array([[0.0], [-1.0]]) # Deliberate initial observer mismatch
x2_true, x2_hat = [], []

for _ in t:
    u = float(-(K @ xh)[0, 0])
    y = float((C @ x)[0, 0])
    yh = float((C @ xh)[0, 0])
    x2_true.append(float(x[1, 0])); x2_hat.append(float(xh[1, 0]))
    x = x + (A @ x + B * u) * dt
    xh = xh + (A @ xh + B * u + L * (y - yh)) * dt

plt.figure(figsize=(9, 4))
plt.plot(t, x2_true, label="True Hidden State x2(t)", color="#0284c7", lw=2)
plt.plot(t, x2_hat, "--", label="Observer Estimate x2_hat(t)", color="#059669", lw=2)
plt.title("Luenberger Observer Reconstructing Unmeasured Velocity x2")
plt.xlabel("Time (s)"); plt.ylabel("State x2"); plt.legend(); plt.grid(True); plt.show()
`,
  },
  {
    id: 'ctrl-esp32-ino',
    language: 'esp32',
    filename: 'ece433_esp32_pid_observer.ino',
    title: 'ESP32 Discrete PID + Anti-Windup & 2-State Observer Firmware',
    environment: 'Arduino IDE 2.x · 115200 Baud UART (Web Serial Compatible)',
    module: ControlModule.PID,
    summary:
      'Runs a 50 Hz closed-loop discrete PID controller with anti-windup clamping on ESP32 GPIO25/GPIO34 and accepts live KP=, KI=, AW= commands from the Web Serial Monitor.',
    howToRun: [
      'Wire a safe 2-stage RC plant (GPIO25 → 10kΩ → 100µF → 10kΩ → 100µF → GPIO34) or DC motor driver.',
      'Upload to ESP32 and connect via the Live Serial Monitor in Control Bench.',
    ],
    code: `// ECE 433 Control System II — ESP32 Discrete PID + Anti-Windup Loop
// Drive GPIO25 (DAC/PWM) -> 2-stage RC plant -> Read y on GPIO34

#include <Arduino.h>

const int PIN_PWM_OUT = 25; // DAC1 0..255 (0..3.3V clean analog plant input)
const int PIN_Y_ADC   = 34; // Plant output y(t)

float Kp = 2.8f, Ki = 1.6f, Kd = 0.35f;
bool antiWindup = true;
float setpointV = 1.65f; // Mid-scale step target
float integ = 0.0f, prevErr = 0.0f;
const float Ts = 0.02f; // 50 Hz deterministic loop
uint32_t lastUs = 0;

void handleSerialCmd(String cmd) {
  cmd.trim();
  if (cmd.startsWith("KP=")) Kp = cmd.substring(3).toFloat();
  else if (cmd.startsWith("KI=")) Ki = cmd.substring(3).toFloat();
  else if (cmd.startsWith("KD=")) Kd = cmd.substring(3).toFloat();
  else if (cmd.startsWith("SP=")) setpointV = constrain(cmd.substring(3).toFloat(), 0.2f, 3.0f);
  else if (cmd.startsWith("AW=")) antiWindup = (cmd.substring(3).toInt() != 0);
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  Serial.println("t_ms,setpoint_v,y_v,u_v,integ");
  lastUs = micros();
}

void loop() {
  if (Serial.available()) {
    handleSerialCmd(Serial.readStringUntil('\\n'));
  }
  uint32_t nowUs = micros();
  if ((uint32_t)(nowUs - lastUs) < 20000UL) return;
  lastUs += 20000UL;

  float yV = (analogRead(PIN_Y_ADC) / 4095.0f) * 3.3f;
  float err = setpointV - yV;
  float dErr = (err - prevErr) / Ts;
  prevErr = err;

  float uRaw = Kp * err + Ki * integ + Kd * dErr;
  float uSat = constrain(uRaw, 0.0f, 3.3f);

  // Conditional clamping anti-windup
  bool satPush = (uRaw > 3.3f && err > 0.0f) || (uRaw < 0.0f && err < 0.0f);
  if (!antiWindup || !satPush) {
    integ += err * Ts;
  }

  uint8_t dacVal = (uint8_t)roundf((uSat / 3.3f) * 255.0f);
  dacWrite(PIN_PWM_OUT, dacVal);

  Serial.print(millis()); Serial.print(',');
  Serial.print(setpointV, 3); Serial.print(',');
  Serial.print(yV, 3); Serial.print(',');
  Serial.print(uSat, 3); Serial.print(',');
  Serial.println(integ, 3);
}
`,
  },
];
