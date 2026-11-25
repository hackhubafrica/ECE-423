import {
  ControlEssayPrompt,
  ControlFlashcard,
  ControlLabType,
  ControlMilestone,
  ControlModule,
  ControlPrinciple,
  OpAmpRealization,
} from '../types/ece433';

export const CONTROL_INLINE_THEORY: Record<
  string,
  { intuition: string; pioneerNote: string }
> = {
  ctrl_pid_modes: {
    intuition:
      'Proportional reacts to present error, Integral remembers past accumulated error to eliminate offset, and Derivative anticipates future error slope to brake before overshoot.',
    pioneerNote:
      'Nicolas Minorsky formalized the three-term P+I+D law in 1922 while automating steering on the battleship USS New Mexico.',
  },
  ctrl_pid_opamp: {
    intuition:
      'An operational amplifier enforces a virtual ground at its inverting input so input currents through R and C sum cleanly into feedback impedances, realizing −Zf(s)/Zin(s) in hardware.',
    pioneerNote:
      'George Philbrick popularized commercial vacuum-tube and solid-state op-amp analog computers in the 1940s–1950s specifically for PID and process simulation.',
  },
  ctrl_ziegler_nichols: {
    intuition:
      'When you do not know the plant equations, push P-gain until sustained oscillation (Ku, Pu) or measure its step S-curve lag (L, T), then apply empirical ratios tuned for a brisk 1/4-amplitude decay.',
    pioneerNote:
      'John G. Ziegler and Nathaniel B. Nichols published these landmark empirical rules at Taylor Instrument Companies in 1942.',
  },
  ctrl_windup: {
    intuition:
      'When a valve or motor hits 100% saturation, the plant cannot move faster—yet a naive integrator keeps summing the large error and winds up huge, forcing severe overshoot even after crossing the setpoint.',
    pioneerNote:
      'Anti-windup back-calculation and conditional integration became standard industrial practice with electronic & early digital process controllers in the 1960s.',
  },
  ctrl_lag_lead: {
    intuition:
      'Lead compensation injects positive phase around gain crossover to stabilize and speed up a loop; Lag compensation drops high-frequency gain so you can boost steady-state DC accuracy without hitting −180°.',
    pioneerNote:
      'Hendrik Bode (1940) unified gain-phase integral relations and stability margins at Bell Labs, turning frequency shaping into an exact graphical discipline.',
  },
  ctrl_comp_vs_pipd: {
    intuition:
      'PI is simply an extreme Lag compensator whose pole sits exactly at s=0; PD is an extreme Lead compensator whose pole sits at infinity (which amplifies sensor noise unless rolled off).',
    pioneerNote:
      'Bode & Chestnut (1950s) mapped passive RC Lead/Lag networks directly onto ideal PI/PD control structures.',
  },
  ctrl_ss_models: {
    intuition:
      'Instead of collapsing internal physics into one input-output fraction G(s), state-space tracks every energy-storing variable (position, velocity, capacitor voltage) simultaneously as a first-order vector ODE.',
    pioneerNote:
      'Rudolf E. Kálmán pioneered modern state-space control in 1959–1960, extending classical SISO control to MIMO and time-varying systems.',
  },
  ctrl_canonical: {
    intuition:
      'The same input-output transfer function can be drawn with different internal state coordinates: Control Canonical lines up states as pure integrators for easy feedback, while Observer Canonical feeds output back into every integrator.',
    pioneerNote:
      'Canonical decompositions crystallized in the 1960s alongside Luenberger’s duality theorem linking control and estimation.',
  },
  ctrl_ss_props: {
    intuition:
      'Rotating or scaling your internal coordinate frame (z = P⁻¹x) changes the entries of A, B, and C, but never changes the physical natural frequencies (eigenvalues) or overall transfer function.',
    pioneerNote:
      'Built directly on linear-algebra similarity theory applied to dynamical systems during the 1960s modern control revolution.',
  },
  ctrl_stm_exp: {
    intuition:
      'The State Transition Matrix Φ(t) = e^(At) acts like a time-evolution propagator: multiply it by today’s initial state x(0) and you immediately know where the free system lands at time t.',
    pioneerNote:
      'Grounded in Peano–Baker and Cayley–Hamilton matrix series methods adapted to aerospace trajectory propagation.',
  },
  ctrl_kalman: {
    intuition:
      'If columns of [B, AB, …] do not span n-space, there is a hidden direction the actuator can never push; if rows of [C; CA; …] fail to span n-space, an internal mode is invisible at the sensor.',
    pioneerNote:
      'Rudolf Kálmán introduced controllability and observability in 1960 as the fundamental rank conditions for state-space design.',
  },
  ctrl_gilbert: {
    intuition:
      'Diagonalizing A exposes every mode independently: if a mode’s row in B̃ is zero, the input cannot excite it; if its column in C̃ is zero, the sensor cannot see it—even if structurally connected.',
    pioneerNote:
      'Elmer G. Gilbert published the modal controllability/observability criteria in 1963, clarifying hidden pole-zero cancellations.',
  },
  ctrl_pole_reg: {
    intuition:
      'Feeding back every state u = −Kx lets you rewrite every coefficient of the characteristic polynomial, relocating sluggish or unstable open-loop poles anywhere in the left-half plane.',
    pioneerNote:
      'Jürgen Ackermann published his closed-form vector pole-placement formula in 1972.',
  },
  ctrl_integral_servo: {
    intuition:
      'Feedforward scaling Nr·r relies on exact plant gain knowledge; appending an integral state ẋ_I = r − y forces the closed loop to hunt until steady-state tracking error equals zero even under disturbances.',
    pioneerNote:
      'Combined classical integral action with state-space pole placement for aerospace autopilots and industrial servos.',
  },
  ctrl_observer: {
    intuition:
      'When you cannot afford a tachometer or state sensor, run a fast software twin x̂̇ = Ax̂ + Bu inside the controller and nudge it with L(y − Cx̂) until estimation error decays to zero.',
    pioneerNote:
      'David G. Luenberger introduced full-order and reduced-order state observers in his 1964/1971 papers, proving the Separation Principle.',
  },
};

export const CONTROL_THEORY_PRINCIPLES: ControlPrinciple[] = [
  {
    id: 'cp-pid-windup',
    module: ControlModule.PID,
    title: 'Why Integrator Windup Happens & How Anti-Windup Prevents It',
    plainEnglishIntuition:
      'Imagine commanding a car cruise control from 30 km/h to 120 km/h up a steep hill. The throttle pedal hits the floor (100% actuator saturation), yet the integral accumulator keeps adding error every millisecond—so long after reaching 120 km/h, the huge stored integral keeps the throttle pinned wide open.',
    physicalMechanism:
      'Because a physical actuator saturates at u ∈ [−u_max, +u_max], the effective plant input freezes while linear error integration continues unchecked. Extra stored charge on the op-amp feedback capacitor (or accumulator variable) cannot bleed down until the output overshoots and reverses sign.',
    whyItMatters:
      'Every real motor driver, heater MOSFET, and hydraulic valve has hard supply limits. Ignoring windup in MATLAB/Simulink or ESP32 firmware turns a well-tuned PID loop into a sluggish, violently overshooting system.',
    commonMisconception:
      'Students often think lowering Ki fixes windup. While smaller Ki slows accumulation, any nonzero Ki will still wind up under prolonged saturation unless conditional clamping or back-calculation is added.',
    pioneerHighlight: 'Ziegler & Nichols (1942) + Anti-windup clamping & back-calculation (1960s)',
    recommendedLab: ControlLabType.PID_WINDUP,
    recommendedCalc: 'zn_tuning',
  },
  {
    id: 'cp-lead-lag',
    module: ControlModule.FREQ_COMP,
    title: 'Lead vs Lag Compensation: Phase Boost vs Gain Shaping',
    plainEnglishIntuition:
      'A Lead network pushes the Bode phase curve upward over a targeted mid-frequency band so the loop crosses 0 dB with healthy Phase Margin. A Lag network leaves phase alone at crossover and pulls high-frequency magnitude down so you can turn up DC gain safely.',
    physicalMechanism:
      'Lead places a zero at 1/τ before its pole at 1/(ατ) (α < 1), yielding maximum phase lead φ_m = arcsin((1−α)/(1+α)) centered geometrically at ω_m = 1/(τ√α). Lag places a pole at 1/(βτ) before its zero at 1/τ (β > 1), attenuating magnitudes above 1/τ by 20·log₁₀(β) dB.',
    whyItMatters:
      'Exam problems frequently ask whether to use Lead (when transient speed & Phase Margin are deficient) or Lag (when Phase Margin is acceptable at a lower frequency, or steady-state velocity constant K_v must be raised).',
    commonMisconception:
      'Adding a Lead compensator only shifts phase—it also raises high-frequency magnitude by +20·log₁₀(1/α), pushing ω_gc rightward! Always evaluate Phase Margin at the new shifted crossover frequency.',
    pioneerHighlight: 'Hendrik W. Bode (1940) & Harry Nyquist (1932)',
    recommendedLab: ControlLabType.BODE_COMP,
    recommendedCalc: 'lead_lag',
  },
  {
    id: 'cp-canonical-invariance',
    module: ControlModule.STATE_SPACE,
    title: 'Non-Uniqueness of State-Space Models & Similarity Invariance',
    plainEnglishIntuition:
      'A physical spring-mass-damper or DC motor has infinitely many valid state-space matrix descriptions depending on which internal coordinates you pick (position/velocity, modal coordinates, or canonical integrators), yet its true poles and step response never change.',
    physicalMechanism:
      'Defining z = P⁻¹x with any invertible matrix P transforms (A, B, C, D) into (P⁻¹AP, P⁻¹B, CP, D). Because det(λI − P⁻¹AP) = det(P⁻¹(λI−A)P) = det(λI−A), all eigenvalues—and C(sI−A)⁻¹B + D—remain identically invariant.',
    whyItMatters:
      'This invariance is the mathematical bridge that allows us to design pole placement in easy Control Canonical Form and transform K back into physical coordinates via P.',
    commonMisconception:
      'Thinking two different (A, B, C) triples represent different physical plants, or forgetting to transform B and C alongside A when applying P.',
    pioneerHighlight: 'Rudolf E. Kálmán (1960)',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'canonical_ss',
  },
  {
    id: 'cp-kalman-gilbert',
    module: ControlModule.DESIGN_OBS,
    title: 'Kalman vs Gilbert vs Structural Controllability & Reachability',
    plainEnglishIntuition:
      'Kalman tests controllability in one big matrix rank check—fast for computers, opaque for intuition. Gilbert rotates into diagonal mode coordinates so you can immediately point to the exact decoupled mode that the actuator cannot push or the sensor cannot see.',
    physicalMechanism:
      'Kalman checks rank([B AB … Aⁿ⁻¹B]) = n. Gilbert diagonalizes A = VΛV⁻¹ and inspects B̃ = V⁻¹B (a zero row means an uncontrollable eigenvalue) and C̃ = CV (a zero column means an unobservable eigenvalue). Structural controllability checks only the zero/nonzero wiring graph regardless of exact parameter cancellations.',
    whyItMatters:
      'For continuous LTI systems, Controllability (steering x(0) → 0) and Reachability (steering 0 → x_f) are equivalent whenever A is nonsingular/continuous, and full controllability is strictly required to place all closed-loop poles arbitrarily.',
    commonMisconception:
      'Assuming a system with a single input B = [b₁; b₂] where both b₁, b₂ ≠ 0 is automatically controllable—if B happens to align with one eigenvector of A, the orthogonal mode cannot be moved!',
    pioneerHighlight: 'Rudolf Kálmán (1960), Elmer Gilbert (1963), Ching-Tai Lin (1974)',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'kalman_rank',
  },
  {
    id: 'cp-pole-observer',
    module: ControlModule.DESIGN_OBS,
    title: 'Pole Placement, Integral Servo Control & Luenberger Separation',
    plainEnglishIntuition:
      'If all states are measurable, u = −Kx lets you place closed-loop poles wherever performance demands. When sensors are missing, a Luenberger observer estimates x̂(t) in real time, and the Separation Principle guarantees controller and observer poles do not interfere.',
    physicalMechanism:
      'Feeding estimated state u = −Kx̂ into the plant yields an augmented closed-loop system whose characteristic polynomial factors cleanly into det(sI − (A−BK)) · det(sI − (A−LC)) = 0. Making observer poles 3–5× faster than controller poles ensures x̂ → x before the plant moves far.',
    whyItMatters:
      'Adding an augmented integrator state ẋ_I = r − Cx eliminates steady-state tracking error to step references even when plant parameters drift, uniting classical PID accuracy with modern state-space pole assignment.',
    commonMisconception:
      'Placing observer poles 50× faster than the plant: while mathematically valid, huge observer gains L amplify sensor measurement noise dramatically.',
    pioneerHighlight: 'David G. Luenberger (1964) & Jürgen Ackermann (1972)',
    recommendedLab: ControlLabType.POLE_OBSERVER,
    recommendedCalc: 'pole_place',
  },
];

export const OPAMP_REALIZATIONS: OpAmpRealization[] = [
  {
    id: 'opamp-p',
    topology: 'P',
    title: 'Inverting Proportional (P) Stage',
    transferFunction: 'Vout(s) / Vin(s) = − Rf / Rin',
    gainFormulas: [
      'Kp = Rf / Rin (with a second inverting unity stage −1 to restore positive sign)',
      'Example: Rin = 10 kΩ, Rf = 47 kΩ ⇒ Kp = 4.7',
    ],
    designNotes:
      'Keep Rin ≥ 1 kΩ so the previous op-amp or sensor stage is not overloaded, and Rf ≤ 1 MΩ to limit bias-current offset.',
    antiWindupNote: 'No integrator state; output naturally saturates cleanly at ±(Vcc − 1.5 V) rail limits.',
  },
  {
    id: 'opamp-pi',
    topology: 'PI',
    title: 'Series RC Feedback PI Controller',
    transferFunction: 'C(s) = − (Rf / Rin) · (1 + 1 / (Rf · Cf · s)) = − [Kp + Ki/s]',
    gainFormulas: [
      'Kp = Rf / Rin',
      'Ki = 1 / (Rin · Cf)   ⇒   Ti = Rf · Cf',
      'Example: Rin = 10 kΩ, Rf = 22 kΩ, Cf = 10 µF ⇒ Kp = 2.2, Ki = 10 s⁻¹',
    ],
    designNotes:
      'Single op-amp realizes both P and I terms together via series Rf + Cf in the feedback path. Place a precision film or ceramic capacitor for Cf.',
    antiWindupNote:
      'Wire back-to-back Zener diodes (e.g. 2 × 5.1 V) or a MOSFET reset switch across Cf to clamp capacitor voltage during actuator saturation.',
  },
  {
    id: 'opamp-pd',
    topology: 'PD',
    title: 'Bandlimited Practical PD Stage',
    transferFunction: 'C(s) = − (Rf / Rin) · (1 + Rin · Cd · s) / (1 + Rd · Cd · s)',
    gainFormulas: [
      'Kp = Rf / Rin',
      'Kd = Rf · Cd',
      'Noise filter pole at ω_p = 1 / (Rd · Cd) chosen 10× above control bandwidth',
    ],
    designNotes:
      'Never build an ideal differentiator without series input resistor Rd—high-frequency op-amp gain would otherwise saturate on millivolt ADC/sensor noise.',
    antiWindupNote: 'Add a small feedback capacitor Cf across Rf (~100 pF) to prevent high-frequency op-amp ringing.',
  },
  {
    id: 'opamp-pid-parallel',
    topology: 'PID_PARALLEL',
    title: 'Parallel Non-Interacting Op-Amp PID (4-Op-Amp Topology)',
    transferFunction: 'u(t) = Kp·e(t) + Ki∫e(t)dt + Kd·ė(t)',
    gainFormulas: [
      'P branch: Kp = Rp / R1',
      'I branch: Ki = 1 / (R2 · Ci)',
      'D branch: Kd = R3 · Cd (with series R_limit)',
      'Output inverting summer combines P + I + D with independent tuning knobs!',
    ],
    designNotes:
      'Preferred in teaching labs and analog PID trainers because turning the Kp potentiometer does NOT alter Ki or Kd.',
    antiWindupNote:
      'Clamp only the Integrator op-amp capacitor Ci using diode feedback when the final summing stage reaches saturation.',
  },
  {
    id: 'opamp-lead-lag',
    topology: 'LEAD_LAG',
    title: 'Active Op-Amp Lead / Lag Compensator Network',
    transferFunction: 'C(s) = − (R2 / R1) · (1 + R1·C1·s) / (1 + R2·C2·s)',
    gainFormulas: [
      'Zero time constant: τ_z = R1 · C1',
      'Pole time constant: τ_p = R2 · C2',
      'Lead when τ_z > τ_p (α = τ_p/τ_z < 1) · Lag when τ_p > τ_z (β = τ_p/τ_z > 1)',
    ],
    designNotes:
      'Uses parallel R1||C1 at the inverting input and parallel R2||C2 in feedback—one single op-amp realizes Lead, Lag, or practical Lead-Lag simultaneously.',
    antiWindupNote: 'No pole at s=0 means zero DC integrator windup risk.',
  },
];

export const CONTROL_HISTORY_TIMELINE: ControlMilestone[] = [
  {
    id: 'hist-maxwell',
    year: '1868',
    yearNumeric: 1868,
    era: '1860s–1930s',
    module: ControlModule.STATE_SPACE,
    pioneer: 'James Clerk Maxwell',
    affiliation: 'King’s College London / Cambridge',
    breakthrough: 'First Differential Equation Stability Analysis ("On Governors")',
    storyAndContext:
      'James Watt’s centrifugal flyball governor regulated steam engines well until tighter tolerances triggered violent hunting oscillations. Maxwell linearized the governor ODEs and proved stability depends on all characteristic roots having negative real parts.',
    ece433Connection:
      'Direct origin of characteristic polynomials det(λI − A) = 0 and closed-loop pole placement in the open left-half s-plane.',
  },
  {
    id: 'hist-routh',
    year: '1877',
    yearNumeric: 1877,
    era: '1860s–1930s',
    module: ControlModule.PID,
    pioneer: 'Edward John Routh',
    affiliation: 'University of Cambridge',
    breakthrough: 'Routh–Hurwitz Algebraic Stability Criterion',
    storyAndContext:
      'Prompted by Maxwell’s challenge to find an algebraic test for higher-order polynomials without factoring roots by hand, Routh published the array test (independently derived by Adolf Hurwitz in 1895).',
    ece433Connection:
      'Used in Ziegler–Nichols closed-loop derivation to find the exact marginal stability gain Ku and oscillation frequency ω_u.',
  },
  {
    id: 'hist-minorsky',
    year: '1922',
    yearNumeric: 1922,
    era: '1860s–1930s',
    module: ControlModule.PID,
    pioneer: 'Nicolas Minorsky',
    affiliation: 'U.S. Navy Bureau of Construction & Repair',
    breakthrough: 'Formal Three-Term PID Control Law',
    storyAndContext:
      'Watching helmsmen steer the battleship USS New Mexico, Minorsky noticed skilled sailors didn’t just turn proportionally to heading error—they anticipated yaw rate (D) and trimmed persistent crosswind drift (I), formulating the mathematical PID law.',
    ece433Connection:
      'Foundation of Module 1: P, PI, PD, and PID characteristics and modern digital/op-amp control.',
    recommendedLab: ControlLabType.PID_WINDUP,
  },
  {
    id: 'hist-nyquist',
    year: '1932',
    yearNumeric: 1932,
    era: '1860s–1930s',
    module: ControlModule.FREQ_COMP,
    pioneer: 'Harry Nyquist',
    affiliation: 'Bell Telephone Laboratories',
    breakthrough: 'Nyquist Stability Criterion',
    storyAndContext:
      'Black’s negative-feedback telephone repeaters sometimes sang uncontrollably despite seeming stable. Nyquist mapped open-loop frequency response L(jω) around (−1, j0) via Cauchy’s argument principle to predict closed-loop stability from open-loop measurements.',
    ece433Connection:
      'Defines Gain Margin and Phase Margin—the exact metrics maximized by Lead and Lag compensators.',
    recommendedLab: ControlLabType.BODE_COMP,
  },
  {
    id: 'hist-bode',
    year: '1940',
    yearNumeric: 1940,
    era: '1940s–1950s',
    module: ControlModule.FREQ_COMP,
    pioneer: 'Hendrik Wade Bode',
    affiliation: 'Bell Telephone Laboratories',
    breakthrough: 'Bode Plots, Gain-Phase Integrals & Frequency Compensation',
    storyAndContext:
      'While designing transcontinental coax repeaters and anti-aircraft gun directors in WWII, Bode introduced asymptotic log-magnitude and phase plots, showing engineers how to sketch and shape Lead/Lag compensation on graph paper.',
    ece433Connection:
      'Powers all Module 2 frequency-domain Lead/Lag compensator designs and MATLAB margin() analysis.',
    recommendedLab: ControlLabType.BODE_COMP,
  },
  {
    id: 'hist-zn',
    year: '1942',
    yearNumeric: 1942,
    era: '1940s–1950s',
    module: ControlModule.PID,
    pioneer: 'John G. Ziegler & Nathaniel B. Nichols',
    affiliation: 'Taylor Instrument Companies',
    breakthrough: 'Ziegler–Nichols Empirical PID Tuning Rules',
    storyAndContext:
      'Chemical plant operators lacked differential equation models for massive distillation columns. Ziegler and Nichols tested hundreds of simulated pneumatic loops to publish two fast bench recipes (L/T reaction curve and Ku/Pu ultimate oscillation).',
    ece433Connection:
      'Taught verbatim in ECE 433 Module 1 as the classic starting point before fine-tuning overshoot and windup.',
    recommendedLab: ControlLabType.PID_WINDUP,
  },
  {
    id: 'hist-kalman',
    year: '1960',
    yearNumeric: 1960,
    era: '1960s–Modern',
    module: ControlModule.DESIGN_OBS,
    pioneer: 'Rudolf Emil Kálmán',
    affiliation: 'RIAS (Martin Company, Baltimore)',
    breakthrough: 'State-Space Control, Controllability & Observability',
    storyAndContext:
      'Apollo spacecraft rendezvous and multi-axis rockets broke classical single-loop SISO transfer functions. Kálmán unified linear systems in time-domain state space ẋ = Ax + Bu and proved exact algebraic rank conditions for controllability and observability.',
    ece433Connection:
      'Core of Modules 3 and 4: canonical transformations, Kalman rank tests, and state-variable feedback.',
    recommendedLab: ControlLabType.STATE_CANONICAL,
  },
  {
    id: 'hist-gilbert',
    year: '1963',
    yearNumeric: 1963,
    era: '1960s–Modern',
    module: ControlModule.DESIGN_OBS,
    pioneer: 'Elmer Grant Gilbert',
    affiliation: 'University of Michigan',
    breakthrough: 'Modal Diagonalization Test for Controllability & Observability',
    storyAndContext:
      'Gilbert showed that transforming a system into diagonal/Jordan coordinates immediately reveals which natural modes decouple from inputs or outputs—explaining why pole-zero cancellations hide uncontrollable or unobservable states.',
    ece433Connection:
      'Directly tested in ECE 433 alongside Kalman rank tests and Jordan canonical forms.',
    recommendedLab: ControlLabType.STATE_CANONICAL,
  },
  {
    id: 'hist-luenberger',
    year: '1964',
    yearNumeric: 1964,
    era: '1960s–Modern',
    module: ControlModule.DESIGN_OBS,
    pioneer: 'David G. Luenberger & Jürgen Ackermann (1972)',
    affiliation: 'Stanford University / DLR Oberpfaffenhofen',
    breakthrough: 'State Observers, Separation Principle & Ackermann Pole Placement',
    storyAndContext:
      'State feedback u = −Kx needed every internal variable measured. Luenberger proved a deterministic software observer could reconstruct unmeasured states using only u and y, while Ackermann gave engineers a single clean matrix formula for K and L.',
    ece433Connection:
      'Completes Module 4: prototype pole placement, integral servo tracking, and full/reduced-order observers.',
    recommendedLab: ControlLabType.POLE_OBSERVER,
  },
];

export const CONTROL_ESSAY_PROMPTS: ControlEssayPrompt[] = [
  {
    id: 'essay-windup',
    module: ControlModule.PID,
    catRelevance: 'CAT High-Yield',
    title: 'Integrator Windup Mechanism & Two Anti-Windup Fixes',
    question:
      'Explain physically why Integrator Windup occurs in a PID-controlled motor with actuator saturation, and compare Conditional Integration (Clamping) vs Back-Calculation anti-windup.',
    marksGuide: '8 Marks · Definition + physical cause + 2 remedies',
    keyPoints: [
      'Actuator clamps at ±u_max while error e(t) stays positive, decoupling plant speed from controller demand',
      'Integrator keeps accumulating ∫e(t)dt to a large excess value',
      'After y(t) reaches setpoint, the swollen integral holds u saturated, causing big overshoot',
      'Clamping freezes integration whenever saturated and sign(e) matches sign(u_raw)',
      'Back-calculation feeds Kb·(u_sat − u_raw) into the integrator to bleed excess charge dynamically',
    ],
    modelAnswer:
      'When a step reference demands more torque or voltage than the actuator hardware can deliver (u_raw > u_max), the physical plant sees only u_sat = u_max. Because the plant accelerates slower than the linear model expects, tracking error e(t) remains large for a prolonged period and the integral state Ki∫e(t)dt grows far beyond what is needed at steady state. Once the output finally crosses the setpoint, the huge stored integral keeps driving u saturated in the forward direction until error stays negative long enough to unwind it—producing severe overshoot and sluggish settling. Two practical remedies are: (1) Conditional Integration (Clamping), which halts integral accumulation whenever the actuator is saturated and the error would push it further into saturation; and (2) Back-Calculation, which adds a feedback path Kb·(u_sat − u_raw) to the integrator input so excess integral drains smoothly with time constant 1/Kb.',
    recommendedLab: ControlLabType.PID_WINDUP,
  },
  {
    id: 'essay-lead-lag-vs-pipd',
    module: ControlModule.FREQ_COMP,
    catRelevance: 'CAT High-Yield',
    title: 'Comparing Lead/Lag Compensators Against PD/PI Controllers',
    question:
      'Compare a frequency-domain Lead compensator with a PD controller, and a Lag compensator with a PI controller in terms of pole-zero geometry, steady-state error, noise sensitivity, and physical op-amp realization.',
    marksGuide: '10 Marks · Structure, Bode effect, error & noise',
    keyPoints: [
      'PD is an ideal zero Kc(1 + τs) with unbounded gain as ω → ∞, amplifying sensor noise',
      'Lead adds a finite high-frequency pole at 1/(ατ) (α < 1), bounding gain to Kc/α and realizable with passive RC',
      'PI places a pole strictly at s = 0, raising system Type by 1 and forcing zero steady-state step error',
      'Lag places its pole near origin at 1/(βτ) (β > 1), boosting DC gain by β with finite steady-state error',
    ],
    modelAnswer:
      'A PD controller C_PD(s) = Kp(1 + Td·s) provides pure phase lead approaching +90°, but its magnitude grows at +20 dB/decade indefinitely, severely amplifying high-frequency measurement noise and demanding an extra roll-off pole in op-amp hardware. A Lead compensator C_lead(s) = Kc(1 + τs)/(1 + ατs) with 0 < α < 1 achieves bounded phase lead φ_max = arcsin((1−α)/(1+α)) while capping high-frequency gain at Kc/α, making it passively realizable. Conversely, a PI controller places its pole directly at the origin s = 0, increasing the open-loop system Type by one and eliminating steady-state step error completely (at the cost of −90° low-frequency phase lag). A Lag compensator C_lag(s) = (1 + τs)/(1 + βτs) with β > 1 keeps its pole slightly inside the left-half plane at −1/(βτ), increasing low-frequency error constants (Kp or Kv) by factor β and attenuating high-frequency magnitude by 20·log10(β) without adding an active integrator.',
    recommendedLab: ControlLabType.BODE_COMP,
  },
  {
    id: 'essay-invariance-nonunique',
    module: ControlModule.STATE_SPACE,
    catRelevance: 'Final Exam Core',
    title: 'Non-Uniqueness of State-Space Realizations & Eigenvalue Invariance',
    question:
      'Prove why state-space models are non-unique under an invertible coordinate transformation z = P⁻¹x, yet eigenvalues and the input-output transfer function G(s) remain strictly invariant.',
    marksGuide: '8 Marks · Algebraic proof + physical interpretation',
    keyPoints: [
      'Substitute x = Pz into ẋ = Ax + Bu and y = Cx + Du to get Ã = P⁻¹AP, B̃ = P⁻¹B, C̃ = CP',
      'Characteristic polynomial det(λI − P⁻¹AP) = det(P⁻¹(λI − A)P) = det(P⁻¹)det(λI − A)det(P) = det(λI − A)',
      'Transfer function C̃(sI − Ã)⁻¹B̃ = CP[P⁻¹(sI − A)P]⁻¹P⁻¹B = C(sI − A)⁻¹B',
    ],
    modelAnswer:
      'Given an LTI model ẋ = Ax + Bu, y = Cx + Du and any invertible transformation matrix P (with x = Pz), differentiating yields Pż = APz + Bu, so ż = (P⁻¹AP)z + (P⁻¹B)u and y = (CP)z + Du. Thus infinitely many distinct matrix triples (Ã, B̃, C̃) represent the exact same physical system. However, the eigenvalues remain invariant because det(λI − P⁻¹AP) = det(P⁻¹(λI − A)P) = det(P⁻¹)·det(λI − A)·det(P) = det(λI − A). Likewise, the transfer function evaluates to C̃(sI − Ã)⁻¹B̃ + D = CP·P⁻¹(sI − A)⁻¹P·P⁻¹B + D = C(sI − A)⁻¹B + D, confirming that external input-output behavior is coordinate-independent.',
    recommendedLab: ControlLabType.STATE_CANONICAL,
  },
  {
    id: 'essay-ctrl-types',
    module: ControlModule.DESIGN_OBS,
    catRelevance: 'Final Exam Core',
    title: 'Controllability, Reachability, Structural Controllability & Gilbert Test',
    question:
      'Distinguish between Kalman controllability, Gilbert modal controllability, Reachability, and Structural Controllability, and explain why controllability is necessary for arbitrary pole placement.',
    marksGuide: '10 Marks · Definitions + comparison + design implication',
    keyPoints: [
      'Kalman tests rank([B AB … Aⁿ⁻¹B]) = n numerically; Gilbert diagonalizes A and checks for zero rows in B̃ = V⁻¹B',
      'Controllability steers any x(0) to 0 in finite time; Reachability steers 0 to any target x_f (identical for continuous LTI)',
      'Structural controllability evaluates only zero/nonzero graph topology, ignoring exact accidental parameter cancellations',
      'Uncontrollable eigenvalues are fixed roots of det(sI − (A−BK)) independent of K',
    ],
    modelAnswer:
      'A system is controllable if an unconstrained input u(t) can drive any initial state x(0) to the origin in finite time, and reachable if u(t) can steer the origin 0 to any desired target state x_f (equivalent for continuous-time LTI systems). Kalman’s numerical test checks whether C = [B AB … Aⁿ⁻¹B] has full rank n. Gilbert’s test converts A to diagonal/modal form so B̃ = V⁻¹B exposes decoupling directly: any zero row in B̃ identifies an uncontrollable mode caused by pole-zero cancellation or orthogonal actuator alignment. Structural controllability checks only the binary sparsity pattern of (A, B)—verifying that no state is isolated from inputs and no dilation blocks rank generically, even before numerical values are fixed. If a mode λ_u is uncontrollable, it remains an invariant eigenvalue of A − BK for every gain vector K, making arbitrary pole placement impossible.',
    recommendedLab: ControlLabType.POLE_OBSERVER,
  },
  {
    id: 'essay-observer-integral',
    module: ControlModule.DESIGN_OBS,
    catRelevance: 'CAT High-Yield',
    title: 'Need for State Observers, Separation Principle & Integral Servo Tracking',
    question:
      'Why do state-variable feedback systems require state observers, how fast should observer poles be placed, and why is Integral Control preferred over pure feedforward gain Nr for tracking external reference inputs?',
    marksGuide: '9 Marks · Observer need + speed trade-off + servo robustness',
    keyPoints: [
      'Full state feedback u = −Kx requires all n states, many of which lack physical sensors or are noisy',
      'Luenberger observer x̂̇ = Ax̂ + Bu + L(y − Cx̂) drives error ė = (A − LC)e to zero',
      'Separation Principle lets K and L be designed independently; observer poles set 3–5× faster than controller poles (not too fast to avoid sensor noise amplification)',
      'Pure feedforward Nr = −[C(A−BK)⁻¹B]⁻¹ cancels step error only for an exact plant model, whereas integral state ẋ_I = r − Cx enforces zero error under parameter drift',
    ],
    modelAnswer:
      'State feedback u = −Kx assumes access to every internal state variable, yet physical plants typically measure only one output y = Cx because extra sensors add cost, bulk, or reliability risk. A Luenberger observer simulates an internal model driven by u and corrected by output innovation L(y − Cx̂), yielding estimation error dynamics ė = (A − LC)e. By the Separation Principle, closed-loop poles equal the union of regulator poles eig(A − BK) and observer poles eig(A − LC). Engineers typically place observer poles 3 to 5 times faster than the regulator poles so estimates converge swiftly without amplifying high-frequency measurement noise through an oversized gain L. Finally, when tracking an external step input r, simple feedforward scaling u = −Kx + Nr·r yields zero steady-state error only if the plant matrices match the design model perfectly; augmenting an integral state ẋ_I = r − Cx (u = −Kx + Ki·x_I) builds Type-1 robustness that guarantees zero steady-state error even under load disturbances or parameter uncertainty.',
    recommendedLab: ControlLabType.POLE_OBSERVER,
  },
];

export const CONTROL_FLASHCARDS: ControlFlashcard[] = [
  {
    id: 'fc-433-1',
    syllabusTopicId: 'ctrl_pid_modes',
    module: ControlModule.PID,
    title: 'PID Parallel Transfer Function',
    catPriority: 'Critical',
    formulaDisplay: 'C(s) = Kp + Ki/s + Kd·s',
    variableLegend: ['Kp: Proportional gain', 'Ki = Kp/Ti: Integral gain', 'Kd = Kp·Td: Derivative gain'],
    promptQuestion: 'How do P, I, and D individually alter rise time, overshoot, and steady-state error?',
    practicalApplication:
      'Used in temperature ovens, DC motor speed/position servos, and ESP32/PLC industrial control loops.',
    systemConsequence:
      'PI eliminates steady-state step error at the cost of slower damping; PD adds phase lead damping to slash overshoot.',
    catTrap: 'Derivative acts on measurement noise—always pair Kd with a low-pass filter pole N in real hardware.',
    recommendedLab: ControlLabType.PID_WINDUP,
    recommendedCalc: 'zn_tuning',
  },
  {
    id: 'fc-433-2',
    syllabusTopicId: 'ctrl_pid_opamp',
    module: ControlModule.PID,
    title: 'Op-Amp PI & PID Realizations',
    catPriority: 'High',
    formulaDisplay: 'C_PI(s) = −(Rf/Rin)·(1 + 1/(Rf·Cf·s))',
    variableLegend: ['Rin: Input resistor', 'Rf: Feedback resistor', 'Cf: Feedback integrating capacitor'],
    promptQuestion: 'How do op-amp resistor/capacitor ratios map to Kp and Ki?',
    practicalApplication:
      'Analog bench PID boards and high-speed power-supply error amplifiers requiring sub-microsecond latency.',
    systemConsequence:
      'Kp = Rf/Rin and Ki = 1/(Rin·Cf); a single inverting op-amp realizes PI, while 4 op-amps give non-interacting PID.',
    catTrap: 'Do not forget the minus sign of an inverting op-amp—an extra unity inverter is needed for negative feedback!',
    recommendedLab: ControlLabType.PID_WINDUP,
    recommendedCalc: 'opamp_pid',
  },
  {
    id: 'fc-433-3',
    syllabusTopicId: 'ctrl_ziegler_nichols',
    module: ControlModule.PID,
    title: 'Ziegler–Nichols Ultimate Gain Rule',
    catPriority: 'Critical',
    formulaDisplay: 'PID: Kp = 0.6·Ku, Ti = 0.5·Pu, Td = 0.125·Pu',
    variableLegend: ['Ku: Ultimate gain for sustained oscillation', 'Pu: Ultimate oscillation period (s)'],
    promptQuestion: 'Given Ku and Pu from marginal stability, what are the ZN PID gains?',
    practicalApplication:
      'Rapid empirical tuning of unknown industrial plants without deriving full differential equations.',
    systemConsequence:
      'Targets a ~25% quarter-amplitude decay ratio—fast response, often with ~40–50% step overshoot needing light detuning.',
    catTrap: 'Watch units: Ti and Td are time constants, so Ki = Kp / Ti and Kd = Kp · Td!',
    recommendedLab: ControlLabType.PID_WINDUP,
    recommendedCalc: 'zn_tuning',
  },
  {
    id: 'fc-433-4',
    syllabusTopicId: 'ctrl_windup',
    module: ControlModule.PID,
    title: 'Integrator Windup & Back-Calculation',
    catPriority: 'Critical',
    formulaDisplay: 'ė_i = e + Kb · (u_sat − u_raw)',
    variableLegend: ['u_raw: Unlimited PID output', 'u_sat: Clamped actuator output', 'Kb: Back-calc tracking gain'],
    promptQuestion: 'Why does actuator saturation cause huge overshoot, and how does back-calculation stop it?',
    practicalApplication:
      'Mandatory in Simulink PID blocks and ESP32 PWM motor drivers whenever commands hit 0% or 100% duty cycle.',
    systemConsequence:
      'When u_sat ≠ u_raw, Kb·(u_sat − u_raw) actively unwinds the integrator to match the actuator limit.',
    catTrap: 'Without anti-windup, even a stable plant with huge Ki suffers massive prolonged overshoot after saturation.',
    recommendedLab: ControlLabType.PID_WINDUP,
  },
  {
    id: 'fc-433-5',
    syllabusTopicId: 'ctrl_lag_lead',
    module: ControlModule.FREQ_COMP,
    title: 'Lead Compensator Maximum Phase',
    catPriority: 'Critical',
    formulaDisplay: 'sin(φm) = (1 − α)/(1 + α),   ωm = 1/(τ√α)',
    variableLegend: ['α < 1: Pole/zero separation ratio', 'τ: Zero time constant', 'ωm: Frequency of max phase lead'],
    promptQuestion: 'How do you choose α and τ to deliver a required Phase Margin boost φm?',
    practicalApplication:
      'Stabilizing sluggish type-1/type-2 aerospace and gimbal servos in MATLAB bode()/margin() design.',
    systemConsequence:
      'Shifts phase upward by φm at ωm while raising gain crossover frequency ω_gc (faster settling time).',
    catTrap: 'Always add +5° to +12° safety margin to φm because Lead shifts ω_gc rightward where plant phase drops!',
    recommendedLab: ControlLabType.BODE_COMP,
    recommendedCalc: 'lead_lag',
  },
  {
    id: 'fc-433-6',
    syllabusTopicId: 'ctrl_comp_vs_pipd',
    module: ControlModule.FREQ_COMP,
    title: 'Lag Compensator vs PI Controller',
    catPriority: 'High',
    formulaDisplay: 'C_lag(s) = (1 + τs)/(1 + βτs)  (β > 1)',
    variableLegend: ['Zero at −1/τ', 'Pole at −1/(βτ)', 'High-freq attenuation: −20·log10(β) dB'],
    promptQuestion: 'When do you choose a Lag compensator over Lead, and how does it differ from PI?',
    practicalApplication:
      'Boosting DC velocity constant Kv on high-inertia plants without amplifying high-frequency sensor noise.',
    systemConsequence:
      'Places corner 1/τ one decade below desired ω_gc so phase margin stays intact while DC gain increases by β.',
    catTrap: 'Lag slows transient rise time slightly—unlike Lead, it relies on pulling ω_gc leftward to a higher-phase region.',
    recommendedLab: ControlLabType.BODE_COMP,
    recommendedCalc: 'lead_lag',
  },
  {
    id: 'fc-433-7',
    syllabusTopicId: 'ctrl_ss_models',
    module: ControlModule.STATE_SPACE,
    title: 'State-Space to Transfer Function',
    catPriority: 'Critical',
    formulaDisplay: 'G(s) = C(sI − A)⁻¹B + D',
    variableLegend: ['A: n×n system matrix', 'B: n×1 input matrix', 'C: 1×n output matrix', 'D: feedthrough scalar'],
    promptQuestion: 'How do you recover G(s) from any (A, B, C, D) state-space representation?',
    practicalApplication:
      'Verifying multi-state physical models (RLC circuits, inverted pendulums) against classical Bode/pole plots.',
    systemConsequence:
      'Denominator poles come from det(sI − A) unless cancelled by a numerator zero (uncontrollable/unobservable mode).',
    catTrap: 'Remember the adjugate transpose step when inverting (sI − A) by hand!',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'canonical_ss',
  },
  {
    id: 'fc-433-8',
    syllabusTopicId: 'ctrl_canonical',
    module: ControlModule.STATE_SPACE,
    title: 'CCF, OCF & Jordan Canonical Forms',
    catPriority: 'Critical',
    formulaDisplay: 'CCF: ẋ₂ = −a₀x₁ − a₁x₂ + u,  y = b₀x₁ + b₁x₂',
    variableLegend: ['a₀, a₁: Denominator s² + a₁s + a₀', 'b₀, b₁: Numerator b₁s + b₀', 'OCF: A_OCF = A_CCFᵀ'],
    promptQuestion: 'How do you write CCF, OCF, and Jordan forms directly from G(s)?',
    practicalApplication:
      'Rapid exam conversions and instant starting coordinates for Ackermann pole placement (CCF) or observers (OCF).',
    systemConsequence:
      'Repeated eigenvalues with algebraic multiplicity > geometric multiplicity require a 1 on the Jordan superdiagonal.',
    catTrap: 'When writing CCF for G(s) with non-zero D (b_n ≠ 0), perform polynomial long division first!',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'canonical_ss',
  },
  {
    id: 'fc-433-9',
    syllabusTopicId: 'ctrl_ss_props',
    module: ControlModule.STATE_SPACE,
    title: 'Similarity Transform Eigenvalue Invariance',
    catPriority: 'Critical',
    formulaDisplay: 'z = P⁻¹x ⇒ Ã = P⁻¹AP,  eig(Ã) = eig(A)',
    variableLegend: ['P: Invertible n×n change-of-basis matrix', 'Ã, B̃ = P⁻¹B, C̃ = CP'],
    promptQuestion: 'Why are state-space realizations non-unique yet eigenvalues & zeros invariant?',
    practicalApplication:
      'Switching freely between physical sensor coordinates and diagonal or canonical design coordinates.',
    systemConsequence:
      'Characteristic polynomial det(λI − Ã) and transfer function C̃(sI−Ã)⁻¹B̃ remain identical.',
    catTrap: 'Never forget to transform BOTH B → P⁻¹B and C → CP when changing coordinates!',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'canonical_ss',
  },
  {
    id: 'fc-433-10',
    syllabusTopicId: 'ctrl_stm_exp',
    module: ControlModule.STATE_SPACE,
    title: 'State Transition Matrix Φ(t) = e^(At)',
    catPriority: 'Critical',
    formulaDisplay: 'x(t) = e^(At)x(0) + ∫₀ᵗ e^(A(t−τ))Bu(τ)dτ',
    variableLegend: ['Φ(t) = L⁻¹{(sI−A)⁻¹}', 'Φ(0) = I', 'Φ(t₁+t₂) = Φ(t₁)Φ(t₂)', 'Φ⁻¹(t) = Φ(−t)'],
    promptQuestion: 'How do you compute e^(At) and use it for homogeneous & forced state solutions?',
    practicalApplication:
      'Exact closed-form discretization of continuous plants into ESP32/MATLAB discrete controllers x[k+1] = Φ(Ts)x[k] + Γu[k].',
    systemConsequence:
      'Determines exact trajectory evolution for any initial condition x(0) and input signal u(t).',
    catTrap: 'Watch the convolution kernel argument: e^(A(t−τ)), NOT e^(Aτ)!',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'matrix_exp',
  },
  {
    id: 'fc-433-11',
    syllabusTopicId: 'ctrl_kalman',
    module: ControlModule.DESIGN_OBS,
    title: 'Kalman Controllability & Observability',
    catPriority: 'Critical',
    formulaDisplay: 'C = [B  AB  …  Aⁿ⁻¹B],   O = [C; CA; …; CAⁿ⁻¹]',
    variableLegend: ['Full rank n ⇔ det(C) ≠ 0 (for SISO)', 'Dual: (A, C) obs ⇔ (Aᵀ, Cᵀ) ctrl'],
    promptQuestion: 'How do Kalman’s numerical tests prove controllability and observability?',
    practicalApplication:
      'Checking sensor/actuator placement before running place() or acker() in MATLAB.',
    systemConsequence:
      'If rank(C) < n, uncontrollable eigenvalues cannot be shifted by u = −Kx; if rank(O) < n, observer error cannot decay arbitrarily.',
    catTrap: 'For observability, stack C, CA, CA² as ROWS (or take columns of [Cᵀ, AᵀCᵀ, …])—do not transpose wrong!',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'kalman_rank',
  },
  {
    id: 'fc-433-12',
    syllabusTopicId: 'ctrl_gilbert',
    module: ControlModule.DESIGN_OBS,
    title: 'Gilbert Test, Structural Control & Reachability',
    catPriority: 'Exam Core',
    formulaDisplay: 'A_diag = V⁻¹AV ⇒ B̃ = V⁻¹B,  C̃ = CV',
    variableLegend: ['Zero row in B̃ ⇒ mode uncontrollable', 'Zero col in C̃ ⇒ mode unobservable'],
    promptQuestion: 'How does Gilbert’s modal test complement Kalman and Structural Controllability?',
    practicalApplication:
      'Diagnosing exact pole-zero cancellations and verifying sensor redundancy in aerospace/power grids.',
    systemConsequence:
      'Reveals WHICH exact eigenvalue is decoupled; structural controllability ignores lucky numerical cancellations.',
    catTrap: 'Gilbert’s simple row/col rule assumes distinct eigenvalues; repeated eigenvalues require checking linearly independent rows per Jordan block!',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'kalman_rank',
  },
  {
    id: 'fc-433-13',
    syllabusTopicId: 'ctrl_pole_reg',
    module: ControlModule.DESIGN_OBS,
    title: 'Ackermann Pole Placement Formula',
    catPriority: 'Critical',
    formulaDisplay: 'K = [0  0  …  1] · C⁻¹ · α_desired(A)',
    variableLegend: ['C: Kalman controllability matrix', 'α_desired(A): Desired char. polynomial evaluated at matrix A'],
    promptQuestion: 'How do you compute feedback gain K to place closed-loop poles at desired locations?',
    practicalApplication:
      'Regulating inverted pendulums, magnetic levitation, and drone attitude using state feedback.',
    systemConsequence:
      'Closed-loop matrix A_cl = A − BK achieves exact desired damping ratio ζ and natural frequency ω_n.',
    catTrap: 'Remember the negative feedback convention u = −Kx so A_cl = A − BK (not A + BK)!',
    recommendedLab: ControlLabType.POLE_OBSERVER,
    recommendedCalc: 'pole_place',
  },
  {
    id: 'fc-433-14',
    syllabusTopicId: 'ctrl_integral_servo',
    module: ControlModule.DESIGN_OBS,
    title: 'Integral Control Tracking (Augmented Servo)',
    catPriority: 'Critical',
    formulaDisplay: 'ẋ_I = r − Cx,   u = −Kx + Ki·x_I',
    variableLegend: ['x_I: Augmented integral error state', 'Ki: Integral servo gain', 'r: External reference'],
    promptQuestion: 'Why use an augmented (n+1) integral servo instead of simple feedforward gain Nr·r?',
    practicalApplication:
      'Precision CNC stages and cruise controls that must hold zero steady-state error despite friction or load changes.',
    systemConsequence:
      'Guarantees zero steady-state step error robustly even when A or B drifts from nominal values.',
    catTrap: 'Augmenting x_I adds a (n+1)th pole that you must place alongside the n plant poles!',
    recommendedLab: ControlLabType.POLE_OBSERVER,
    recommendedCalc: 'pole_place',
  },
  {
    id: 'fc-433-15',
    syllabusTopicId: 'ctrl_observer',
    module: ControlModule.DESIGN_OBS,
    title: 'Luenberger State Observer & Separation Principle',
    catPriority: 'Critical',
    formulaDisplay: 'x̂̇ = Ax̂ + Bu + L(y − Cx̂),   ė = (A − LC)e',
    variableLegend: ['L: n×1 observer gain vector', 'y − Cx̂: Output innovation error', 'Observer poles: 3–5× faster than K'],
    promptQuestion: 'How do you design L and combine an observer with state feedback?',
    practicalApplication:
      'Estimating unmeasured rotor flux, internal temperatures, or velocities inside ESP32/MATLAB controllers.',
    systemConsequence:
      'Combined system poles equal eig(A − BK) ∪ eig(A − LC); observer poles should converge 3–5× faster.',
    catTrap: 'Dual Ackermann places poles of (Aᵀ − CᵀLᵀ), so L is the transpose of the dual feedback gain!',
    recommendedLab: ControlLabType.POLE_OBSERVER,
    recommendedCalc: 'pole_place',
  },
];
