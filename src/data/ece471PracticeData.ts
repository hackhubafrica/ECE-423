import { PowerModule, PowerQuizQuestion, PowerWorkedExample } from '../types/ece471';

export const POWER_WORKED_EXAMPLES: PowerWorkedExample[] = [
  {
    id: 'ex_cat1_q3_resistance',
    module: PowerModule.LINE_CORONA,
    title: 'CAT 1 Q3: Three-Phase Aluminium Line DC & AC Resistance',
    catRelevance: 'CAT 1 Exact Match',
    problemStatement:
      'A three-phase overhead transmission line uses aluminium conductors having a cross-sectional area of 250 mm². Each conductor has a length of 100 km and resistivity ρ = 2.82 × 10⁻⁸ Ω·m. Calculate (a) DC resistance per phase, (b) total DC resistance of the 3-phase circuit, and (c) AC resistance per phase if R_ac = 1.15 × R_dc.',
    given: [
      'Material: Aluminium, ρ = 2.82 × 10⁻⁸ Ω·m',
      'Cross-sectional area A = 250 mm² = 250 × 10⁻⁶ m² = 2.5 × 10⁻⁴ m²',
      'Length l = 100 km = 100,000 m',
      'AC/DC ratio (skin + spiraling) = 1.15',
    ],
    find: [
      '(a) R_dc per phase',
      '(b) Total 3-phase circuit DC resistance',
      '(c) R_ac per phase',
    ],
    governingEquations: [
      'R_dc,ph = (ρ · l) / A',
      'R_dc,total(3ϕ) = 3 · R_dc,ph',
      'R_ac,ph = 1.15 · R_dc,ph',
    ],
    steps: [
      {
        label: 'Part (a): DC resistance per phase',
        calculation:
          'R_dc,ph = (2.82 × 10⁻⁸ × 100,000) / (250 × 10⁻⁶) = (2.82 × 10⁻³) / (2.5 × 10⁻⁴) = 11.28 Ω/phase',
        note: 'Convert mm² to m² using 1 mm² = 10⁻⁶ m².',
      },
      {
        label: 'Part (b): Total DC resistance of the 3-phase circuit',
        calculation: 'R_dc,total = 3 × 11.28 Ω = 33.84 Ω',
        note: 'Sum of all three identical phase conductors.',
      },
      {
        label: 'Part (c): AC resistance per phase',
        calculation: 'R_ac,ph = 1.15 × 11.28 Ω = 12.972 Ω ≈ 12.97 Ω/phase',
        note: 'Reflects skin effect at power frequency.',
      },
    ],
    finalAnswer: 'R_dc,ph = 11.28 Ω | R_dc,3ϕ = 33.84 Ω | R_ac,ph = 12.97 Ω',
    examTrap: 'Never divide by 10⁻³ for area—area conversion is (10⁻³)² = 10⁻⁶ m²/mm².',
  },
  {
    id: 'ex_cat1_q4_inductance',
    module: PowerModule.LINE_CORONA,
    title: 'CAT 1 Q4: Single-Phase Two-Wire GMR & Inductance',
    catRelevance: 'CAT 1 Exact Match',
    problemStatement:
      'A single-phase two-wire transmission line consists of two conductors separated by a distance of 2 m. Each conductor has a radius of 1 cm. Calculate (a) GMR of each conductor, (b) inductance per conductor per metre, and (c) total inductance of the two-wire circuit per kilometre.',
    given: [
      'Spacing D = 2 m',
      'Conductor radius r = 1 cm = 0.01 m',
      'μ₀ = 4π × 10⁻⁷ H/m',
    ],
    find: [
      '(a) GMR (r\') of each conductor',
      '(b) L per conductor per metre',
      '(c) Total 2-wire loop inductance per km',
    ],
    governingEquations: [
      'GMR = r\' = 0.7788 · r',
      'L_cond = (μ₀ / 2π) · ln(D / r\') = 2 × 10⁻⁷ ln(D / r\') H/m',
      'L_loop = 2 · L_cond · 1000 (per km)',
    ],
    steps: [
      {
        label: 'Part (a): Geometric Mean Radius (GMR)',
        calculation: 'r\' = 0.7788 × 1 cm = 0.7788 cm = 0.007788 m',
      },
      {
        label: 'Part (b): Inductance per conductor per metre',
        calculation:
          'L_cond = 2 × 10⁻⁷ × ln(2 / 0.007788) = 2 × 10⁻⁷ × ln(256.805) = 2 × 10⁻⁷ × 5.5483 = 1.110 × 10⁻⁶ H/m (1.110 μH/m)',
      },
      {
        label: 'Part (c): Total inductance of 2-wire circuit per km',
        calculation:
          'L_total/km = 2 × (1.1097 × 10⁻⁶ H/m) × 1000 m/km = 2.219 × 10⁻³ H/km = 2.219 mH/km',
        note: 'Two-wire single-phase circuit carries go + return conductors.',
      },
    ],
    finalAnswer: 'GMR = 0.7788 cm | L_cond = 1.110 μH/m | L_loop = 2.219 mH/km',
    examTrap: 'Forgetting the factor of 2 in part (c) for the return conductor of a single-phase line.',
  },
  {
    id: 'ex_cat1_q5_capacitance',
    module: PowerModule.LINE_CORONA,
    title: 'CAT 1 Q5: Three-Phase Capacitance & Charging Current',
    catRelevance: 'CAT 1 Exact Match',
    problemStatement:
      'A three-phase overhead transmission line has equilateral conductor spacing of 4 m and each conductor has radius 1 cm. Calculate (a) capacitance per phase per metre, (b) capacitance per phase per kilometre, and (c) charging current per phase per kilometre at 132 kV, 50 Hz.',
    given: [
      'Equilateral spacing D = 4 m',
      'Radius r = 1 cm = 0.01 m',
      'Operating voltage V_L = 132 kV, frequency f = 50 Hz',
      'ε₀ = 8.854 × 10⁻¹² F/m',
    ],
    find: [
      '(a) C_n per metre',
      '(b) C_n per kilometre',
      '(c) Charging current I_c per km per phase',
    ],
    governingEquations: [
      'C_n = 2πε₀ / ln(D / r) F/m',
      'I_c = ω · C_km · V_ph ,   V_ph = V_L / √3',
    ],
    steps: [
      {
        label: 'Part (a): Capacitance per phase per metre',
        calculation:
          'C_n = (2π × 8.854 × 10⁻¹²) / ln(4 / 0.01) = (5.563 × 10⁻¹¹) / ln(400) = (5.563 × 10⁻¹¹) / 5.9915 = 9.285 × 10⁻¹² F/m (9.285 pF/m)',
        note: 'Use actual outer radius r = 0.01 m, NOT 0.7788r.',
      },
      {
        label: 'Part (b): Capacitance per phase per kilometre',
        calculation: 'C_km = 9.285 × 10⁻¹² × 1000 = 9.285 × 10⁻⁹ F/km = 9.285 nF/km',
      },
      {
        label: 'Part (c): Charging current per phase per km',
        calculation:
          'V_ph = 132,000 / √3 = 76,210.2 V | ω = 2π(50) = 314.16 rad/s | I_c = 314.16 × 9.285 × 10⁻⁹ × 76,210.2 = 0.2223 A/km',
      },
    ],
    finalAnswer: 'C_n = 9.285 pF/m | C_km = 9.285 nF/km | I_c = 0.222 A/km',
    examTrap: 'Dividing by √3 is mandatory because 132 kV is line-to-line while C_n is line-to-neutral.',
  },
  {
    id: 'ex_cat1_q6_bundled',
    module: PowerModule.LINE_CORONA,
    title: 'CAT 1 Q6: Two-Conductor Bundled GMR & Phase Inductance',
    catRelevance: 'CAT 1 Exact Match',
    problemStatement:
      'A three-phase transmission line uses two conductors per phase. The radius of each sub-conductor is 1.5 cm, and the spacing between the two sub-conductors is 40 cm. Phase-to-phase spacing is 8 m. Calculate (a) equivalent GMR of the bundled conductor, (b) inductance per phase per metre, and (c) state two EHV advantages.',
    given: [
      'Sub-conductor radius r = 1.5 cm = 0.015 m',
      'Bundle spacing d = 40 cm = 0.40 m',
      'Phase-to-phase equilateral spacing D = 8 m',
    ],
    find: [
      '(a) Equivalent bundle GMR (D_sb)',
      '(b) Inductance per phase per metre',
      '(c) Two EHV advantages',
    ],
    governingEquations: [
      'r\' = 0.7788 · r',
      'D_sb = √(r\' · d)',
      'L_ph = 2 × 10⁻⁷ ln(D / D_sb) H/m',
    ],
    steps: [
      {
        label: 'Step 1: Sub-conductor self-GMR',
        calculation: 'r\' = 0.7788 × 0.015 m = 0.011682 m (1.1682 cm)',
      },
      {
        label: 'Part (a): Equivalent GMR of 2-conductor bundle',
        calculation: 'D_sb = √(0.011682 × 0.40) = √0.0046728 = 0.06836 m (6.836 cm)',
      },
      {
        label: 'Part (b): Inductance per phase per metre',
        calculation:
          'L_ph = 2 × 10⁻⁷ × ln(8 / 0.06836) = 2 × 10⁻⁷ × ln(117.03) = 2 × 10⁻⁷ × 4.7624 = 0.9525 × 10⁻⁶ H/m (0.9525 μH/m)',
      },
      {
        label: 'Part (c): Two EHV advantages',
        calculation:
          '1) Reduces inductive reactance X_L → increases power transfer & SIL. 2) Reduces surface electric stress → suppresses corona loss and radio interference.',
      },
    ],
    finalAnswer: 'D_sb = 6.836 cm (0.0684 m) | L_ph = 0.9525 μH/m',
    examTrap: 'Remember to multiply sub-conductor radius r by 0.7788 BEFORE taking √(r\'·d)!',
  },
  {
    id: 'ex_cat1_q7_corona',
    module: PowerModule.LINE_CORONA,
    title: 'CAT 1 Q7: Peek’s Disruptive Critical Voltage & Corona Power Loss',
    catRelevance: 'CAT 1 Exact Match',
    problemStatement:
      'Part A: Conductor r = 1.0 cm, spacing D = 300 cm, f = 50 Hz, δ = 1.0, m₀ = 0.85. Calculate disruptive critical voltage V_d per phase using Peek’s formula.\nPart B: Operating line voltage = 260 kV (line-to-line), r = 1 cm, D = 300 cm, f = 50 Hz, δ = 1, V_d = 133.1 kV/phase. Calculate corona power loss per km per phase.',
    given: [
      'g₀ = 21.21 kV(rms)/cm (30 / √2)',
      'Part A: r = 1.0 cm, D = 300 cm, δ = 1.0, m₀ = 0.85',
      'Part B: V_L = 260 kV → V_ph = 260/√3 = 150.11 kV, V_d = 133.1 kV/ph',
    ],
    find: [
      'Part A: V_d per phase (kV)',
      'Part B: Corona loss P_c (kW/km/phase)',
    ],
    governingEquations: [
      'V_d = m₀ · g₀ · δ · r · ln(D / r)',
      'P_c = (242.2 / δ) · (f + 25) · √(r / D) · (V_ph − V_d)² × 10⁻⁵  kW/km/ph',
    ],
    steps: [
      {
        label: 'Part A: Disruptive critical voltage V_d',
        calculation:
          'V_d = 0.85 × 21.21 × 1.0 × 1.0 × ln(300 / 1.0) = 18.0285 × 5.7038 = 102.83 kV/phase (178.1 kV line-to-line)',
        note: 'Note: Using g₀ = 21.21 kV(rms)/cm gives 102.8 kV/phase.',
      },
      {
        label: 'Part B Step 1: Convert operating voltage to phase voltage',
        calculation: 'V_ph = 260 / √3 = 150.111 kV/phase (> V_d = 133.1 kV, so corona occurs)',
      },
      {
        label: 'Part B Step 2: Evaluate Peek’s corona loss formula',
        calculation:
          'P_c = (242.2 / 1) × (50 + 25) × √(1 / 300) × (150.111 − 133.1)² × 10⁻⁵ = 242.2 × 75 × 0.057735 × (17.011)² × 10⁻⁵ = 3.035 kW/km/phase',
        note: 'Total 3-phase corona loss = 3 × 3.035 = 9.105 kW/km.',
      },
    ],
    finalAnswer: 'Part A: V_d = 102.8 kV/ph | Part B: P_c = 3.035 kW/km/phase',
    examTrap: 'Never plug 260 kV directly into (V_ph − V_d)²—you must convert 260 kV line-to-line to 150.11 kV line-to-neutral.',
  },
  {
    id: 'ex_dispatch_limits',
    module: PowerModule.DISPATCH_AGC,
    title: 'Economic Dispatch with Inequality Limits (λ-Iteration)',
    catRelevance: 'Final Exam Core',
    problemStatement:
      'Two thermal units have cost functions C₁ = 200 + 7.0 P₁ + 0.008 P₁² $/hr (50 ≤ P₁ ≤ 300 MW) and C₂ = 180 + 6.3 P₂ + 0.009 P₂² $/hr (50 ≤ P₂ ≤ 250 MW). Find optimal dispatch for total load P_D = 420 MW.',
    given: [
      'IC₁ = 7.0 + 0.016 P₁',
      'IC₂ = 6.3 + 0.018 P₂',
      'Total load P_D = 420 MW',
    ],
    find: ['Optimal P₁, P₂, λ, and total $/hr cost'],
    governingEquations: [
      '7.0 + 0.016 P₁ = 6.3 + 0.018 P₂ = λ',
      'P₁ + P₂ = 420',
    ],
    steps: [
      {
        label: 'Step 1: Solve unconstrained λ',
        calculation:
          'P₁ = (λ − 7.0)/0.016 ,  P₂ = (λ − 6.3)/0.018 → (62.5 + 55.556)λ − (437.5 + 350) = 420 → 118.056 λ = 1207.5 → λ = 10.228 $/MWh',
      },
      {
        label: 'Step 2: Compute unit outputs and check limits',
        calculation:
          'P₁ = (10.228 − 7.0)/0.016 = 201.8 MW (within [50, 300]) | P₂ = (10.228 − 6.3)/0.018 = 218.2 MW (within [50, 250])',
      },
      {
        label: 'Step 3: Total hourly fuel cost',
        calculation: 'C_total = C₁(201.8) + C₂(218.2) = 1938.2 + 1983.2 = $3,921.4/hr',
      },
    ],
    finalAnswer: 'λ = 10.23 $/MWh | P₁ = 201.8 MW | P₂ = 218.2 MW | $3,921.4/hr',
    examTrap: 'Always verify every P_i stays within [P_min, P_max]; if clamped, fix that unit and re-solve λ on remaining units.',
  },
  {
    id: 'ex_slg_fault',
    module: PowerModule.FAULTS,
    title: 'Bolted Single Line-to-Ground (SLG) Fault Analysis',
    catRelevance: 'Final Exam Core',
    problemStatement:
      'A 100 MVA, 13.8 kV solidly grounded generator has Z₁ = j0.20 pu, Z₂ = j0.20 pu, and Z₀ = j0.05 pu. Determine the subtransient fault current in per-unit and kA for a bolted SLG fault on phase a at no-load (E = 1.0∠0° pu).',
    given: [
      'S_base = 100 MVA, V_base = 13.8 kV',
      'Z₁ = j0.20, Z₂ = j0.20, Z₀ = j0.05, Z_f = 0',
    ],
    find: ['Sequence currents I₁, I₂, I₀ and phase fault current I_a in kA'],
    governingEquations: [
      'I₁ = I₂ = I₀ = E / (Z₁ + Z₂ + Z₀)',
      'I_a = 3 · I₁',
      'I_base = S_base / (√3 · V_base)',
    ],
    steps: [
      {
        label: 'Step 1: Compute sequence currents',
        calculation:
          'I₁ = I₂ = I₀ = 1.0∠0° / j(0.20 + 0.20 + 0.05) = 1.0 / j0.45 = −j2.222 pu',
      },
      {
        label: 'Step 2: Phase fault current in pu',
        calculation: 'I_a = 3 × (−j2.222) = −j6.667 pu (I_b = I_c = 0)',
      },
      {
        label: 'Step 3: Convert to physical kilo-amperes',
        calculation:
          'I_base = 100,000 / (√3 × 13.8) = 4.184 kA → |I_a| = 6.667 × 4.184 = 27.89 kA',
        note: 'Notice |I_SLG| = 6.67 pu exceeds |I_3ϕ| = 1/0.20 = 5.0 pu because Z₀ < Z₁!',
      },
    ],
    finalAnswer: 'I_a = −j6.667 pu = 27.89 kA',
    examTrap: 'Remember I_base uses line-to-line voltage √3 V_L in the denominator.',
  },
  {
    id: 'ex_bewley_step',
    module: PowerModule.TRANSIENTS,
    title: 'Bewley Lattice: Source Step onto Open-Circuited Line',
    catRelevance: 'Final Exam Core',
    problemStatement:
      'A 100 kV DC step source with Z_s = 100 Ω switches onto a lossless 150 km transmission line with Z_c = 400 Ω and open-circuited far end (Z_L = ∞). Find Γ_L, Γ_S, initial wave V⁺, and load voltage after first arrival (t = τ).',
    given: [
      'V_step = 100 kV, Z_s = 100 Ω, Z_c = 400 Ω, Z_L = ∞',
      'v = 3 × 10⁸ m/s, length = 150 km → τ = 500 μs',
    ],
    find: ['Γ_L, Γ_S, V⁺, and V_load at t = 500 μs'],
    governingEquations: [
      'V⁺ = V_step · Z_c / (Z_c + Z_s)',
      'Γ_L = (Z_L − Z_c) / (Z_L + Z_c) = +1',
      'Γ_S = (Z_s − Z_c) / (Z_s + Z_c)',
    ],
    steps: [
      {
        label: 'Step 1: Initial forward wave entering line',
        calculation: 'V⁺ = 100 kV × 400 / (400 + 100) = 80.0 kV',
      },
      {
        label: 'Step 2: Reflection coefficients',
        calculation: 'Γ_L = +1.0 (open end) | Γ_S = (100 − 400)/(100 + 400) = −0.60',
      },
      {
        label: 'Step 3: Load voltage at t = τ = 500 μs',
        calculation: 'V_load(τ) = V⁺(1 + Γ_L) = 80 × (1 + 1) = 160.0 kV',
      },
    ],
    finalAnswer: 'V⁺ = 80 kV | Γ_L = +1 | Γ_S = −0.6 | V_load(500 μs) = 160 kV',
    examTrap: 'The initial wave is 80 kV (not 100 kV) due to the Z_s : Z_c voltage divider at t = 0.',
  },
];

export const POWER_QUIZ_BANK: PowerQuizQuestion[] = [
  {
    id: 'q471_1',
    module: PowerModule.LINE_CORONA,
    topic: 'Corona Physics & Effects',
    catHighYield: true,
    difficulty: 'Standard',
    question: 'Which statement accurately describes the effect of corona on a high-voltage transmission line?',
    options: [
      'It increases transmission efficiency by lowering line resistance',
      'It causes real power loss, ozone corrosion, radio interference, and helps damp lightning surges',
      'It occurs only when line voltage drops below the disruptive critical voltage V_d',
      'It converts three-phase power purely into DC leakage current',
    ],
    correctIndex: 1,
    formulaHint: 'Corona ionizes air above V_d, dissipating power while clipping steep transient surges.',
    explanation:
      'Corona causes power loss, audible noise, RF interference, and corrosive ozone/nitric acid, while usefully attenuating steep lightning and switching surges.',
  },
  {
    id: 'q471_2',
    module: PowerModule.LINE_CORONA,
    topic: 'DC & AC Line Resistance',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'A 100 km, 3-phase aluminium line (ρ = 2.82×10⁻⁸ Ω·m, A = 250 mm²) has AC factor 1.15. What is its AC resistance per phase?',
    options: ['11.28 Ω', '12.97 Ω', '33.84 Ω', '38.92 Ω'],
    correctIndex: 1,
    formulaHint: 'R_dc = ρ·l/A with A = 250×10⁻⁶ m²; R_ac = 1.15 × R_dc.',
    explanation:
      'R_dc = (2.82×10⁻⁸ × 10⁵) / (2.5×10⁻⁴) = 11.28 Ω/phase. Multiplying by 1.15 for skin effect yields 12.97 Ω/phase.',
  },
  {
    id: 'q471_3',
    module: PowerModule.LINE_CORONA,
    topic: 'Single-Phase GMR & Inductance',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'For a solid cylindrical conductor of radius r = 1 cm, what is its Geometric Mean Radius (GMR) used in inductance calculations?',
    options: ['1.000 cm', '0.7788 cm', '0.500 cm', '1.284 cm'],
    correctIndex: 1,
    formulaHint: 'GMR = r·e⁻¹/⁴ = 0.7788·r.',
    explanation:
      'Internal flux linkage lowers the effective radius for magnetic flux to r\' = 0.7788r = 0.7788 cm.',
  },
  {
    id: 'q471_4',
    module: PowerModule.LINE_CORONA,
    topic: 'Single-Phase GMR & Inductance',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'A single-phase 2-wire line has spacing D = 2 m and r = 1 cm (GMR = 0.7788 cm). What is the total inductance of the two-wire loop per km?',
    options: ['1.110 mH/km', '2.219 mH/km', '0.555 mH/km', '4.438 mH/km'],
    correctIndex: 1,
    formulaHint: 'L_loop = 2 × [2×10⁻⁷ ln(D/GMR)] × 1000.',
    explanation:
      'L_cond = 2×10⁻⁷ ln(2/0.007788) = 1.1097 μH/m. Total 2-wire loop per km = 2 × 1.1097 = 2.219 mH/km.',
  },
  {
    id: 'q471_5',
    module: PowerModule.LINE_CORONA,
    topic: 'Capacitance & Charging Current',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'A 3-phase equilateral 132 kV, 50 Hz line has D = 4 m and r = 1 cm (C_n = 9.285 nF/km). What is the charging current per phase per km?',
    options: ['0.385 A/km', '0.222 A/km', '0.128 A/km', '0.667 A/km'],
    correctIndex: 1,
    formulaHint: 'I_c = 2πf · C_km · (V_L / √3).',
    explanation:
      'V_ph = 132,000/√3 = 76,210 V. I_c = 2π(50) × 9.285×10⁻⁹ × 76,210 = 0.2223 A/km.',
  },
  {
    id: 'q471_6',
    module: PowerModule.LINE_CORONA,
    topic: 'Bundled Conductors',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'Two sub-conductors of radius r = 1.5 cm are spaced d = 40 cm apart. What is the equivalent bundle GMR for inductance?',
    options: ['7.75 cm', '6.84 cm', '20.75 cm', '4.67 cm'],
    correctIndex: 1,
    formulaHint: 'r\' = 0.7788 × 1.5 cm = 1.1682 cm; D_sb = √(r\'·d).',
    explanation:
      'D_sb = √(1.1682 × 40) = √46.728 = 6.836 cm (0.06836 m).',
  },
  {
    id: 'q471_7',
    module: PowerModule.LINE_CORONA,
    topic: 'Peek Corona & Power Loss',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'A 3-phase line operates at 260 kV (L-L), 50 Hz, δ = 1, r = 1 cm, D = 300 cm, and V_d = 133.1 kV/phase. What is the corona loss per km per phase?',
    options: ['17.0 kW/km/ph', '3.035 kW/km/ph', '9.105 kW/km/ph', '1.012 kW/km/ph'],
    correctIndex: 1,
    formulaHint: 'V_ph = 260/√3 = 150.11 kV; P_c = (242.2/δ)(f+25)√(r/D)(V_ph−V_d)²×10⁻⁵.',
    explanation:
      'P_c = 242.2 × 75 × √(1/300) × (150.11 − 133.1)² × 10⁻⁵ = 3.035 kW/km/phase.',
  },
  {
    id: 'q471_8',
    module: PowerModule.LINE_CORONA,
    topic: 'Peek Corona & Power Loss',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'With r = 1.0 cm, D = 300 cm, δ = 1.0, m₀ = 0.85, and g₀ = 21.21 kV(rms)/cm, what is Peek’s disruptive critical voltage V_d per phase?',
    options: ['102.8 kV/phase', '121.0 kV/phase', '178.1 kV/phase', '145.4 kV/phase'],
    correctIndex: 0,
    formulaHint: 'V_d = m₀ · g₀ · δ · r · ln(D/r).',
    explanation: 'V_d = 0.85 × 21.21 × 1 × 1 × ln(300) = 18.029 × 5.7038 = 102.8 kV/phase.',
  },
  {
    id: 'q471_9',
    module: PowerModule.DISPATCH_AGC,
    topic: 'Economic Dispatch',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'Under lossless Economic Dispatch with unconstrained generators, optimal minimum total fuel cost occurs when:',
    options: [
      'Every generator operates at the same MW output',
      'All unconstrained units operate at equal incremental cost dC_i/dP_i = λ',
      'Only the unit with lowest no-load constant a_i runs',
      'All generators run at maximum efficiency regardless of load',
    ],
    correctIndex: 1,
    formulaHint: 'Lagrange multiplier ∂L/∂P_i = 0 → b_i + 2c_i P_i = λ.',
    explanation:
      'Equal incremental cost guarantees no 1 MW shift between free units can reduce total $/hr cost.',
  },
  {
    id: 'q471_10',
    module: PowerModule.DISPATCH_AGC,
    topic: 'Droop & AGC Frequency Control',
    catHighYield: false,
    difficulty: 'Analytical',
    question:
      'Why does primary governor droop control alone fail to restore grid frequency back to exactly 50/60 Hz after a load increase?',
    options: [
      'Because governor speed droop is proportional-only control requiring a non-zero Δf to sustain extra valve opening',
      'Because steam turbines cannot increase mechanical torque above 50 Hz',
      'Because load damping D drives ACE to infinity',
      'Because integral gain K_i causes immediate instability',
    ],
    correctIndex: 0,
    formulaHint: 'ΔP_m = −Δf / R → non-zero ΔP requires non-zero steady-state Δf unless secondary integral AGC resets ΔP_ref.',
    explanation:
      'Primary droop is proportional control (Δf_ss = −ΔP_L/(1/R+D)); secondary integral AGC removes the steady-state offset.',
  },
  {
    id: 'q471_11',
    module: PowerModule.SYMMETRICAL,
    topic: 'Fortescue Symmetrical Components',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'In symmetrical component theory, what is the value of the phase-shift operator identity 1 + a + a² where a = 1∠120°?',
    options: ['3', '−1', '0', 'j√3'],
    correctIndex: 2,
    formulaHint: 'Three equal vectors spaced by 120° form a closed equilateral triangle.',
    explanation: '1 + (−0.5 + j0.866) + (−0.5 − j0.866) = 0 identically.',
  },
  {
    id: 'q471_12',
    module: PowerModule.SYMMETRICAL,
    topic: 'Per-Unit & Sequence Networks',
    catHighYield: false,
    difficulty: 'Analytical',
    question:
      'A 100 MVA transformer has X = 0.10 pu on its own base. What is X_pu on a new 200 MVA system base at the same voltage rating?',
    options: ['0.05 pu', '0.10 pu', '0.20 pu', '0.40 pu'],
    correctIndex: 2,
    formulaHint: 'Z_new = Z_old · (S_new / S_old) · (V_old / V_new)².',
    explanation: 'X_new = 0.10 × (200 / 100) × 1² = 0.20 pu.',
  },
  {
    id: 'q471_13',
    module: PowerModule.FAULTS,
    topic: 'Balanced & Unbalanced Faults',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'How are the positive, negative, and zero sequence networks connected to model a bolted Single Line-to-Ground (SLG) fault?',
    options: [
      'Positive sequence only',
      'Positive and negative in anti-parallel',
      'Positive, negative, and zero sequence networks connected in series',
      'All three sequence networks connected in parallel',
    ],
    correctIndex: 2,
    formulaHint: 'At an SLG fault on phase a: I_b = I_c = 0 → I₁ = I₂ = I₀ (series connection).',
    explanation:
      'Equal sequence currents (I₁ = I₂ = I₀) and V_a = V₀ + V₁ + V₂ = 3Z_f I₁ correspond to a series interconnection.',
  },
  {
    id: 'q471_14',
    module: PowerModule.FAULTS,
    topic: 'Balanced & Unbalanced Faults',
    catHighYield: false,
    difficulty: 'Analytical',
    question:
      'A solidly grounded generator has Z₁ = Z₂ = j0.20 pu and Z₀ = j0.05 pu. What is the per-unit SLG fault current |I_a| at E = 1.0 pu?',
    options: ['2.22 pu', '5.00 pu', '6.67 pu', '15.0 pu'],
    correctIndex: 2,
    formulaHint: 'I_a = 3E / (Z₁ + Z₂ + Z₀).',
    explanation: 'I_a = 3(1.0) / j(0.20 + 0.20 + 0.05) = 3 / 0.45 = 6.67 pu.',
  },
  {
    id: 'q471_15',
    module: PowerModule.TRANSIENTS,
    topic: 'Traveling Waves & Bewley Lattice',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'An 80 kV step wave reaches the open-circuited end of an overhead transmission line (Z_L = ∞). What is the resulting voltage at the open end immediately upon reflection?',
    options: ['0 kV', '40 kV', '80 kV', '160 kV'],
    correctIndex: 3,
    formulaHint: 'Γ_L = (∞ − Z_c)/(∞ + Z_c) = +1 → τ_L = 1 + Γ_L = 2.',
    explanation: 'Open-circuit voltage doubles upon reflection: V_load = 80 kV × (1 + 1) = 160 kV.',
  },
  {
    id: 'q471_16',
    module: PowerModule.PROTECTION,
    topic: 'Protection Relays (IDMT & Mho)',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'Why is Zone 1 of a Mho distance relay typically set to cover only 80–85% of the protected transmission line?',
    options: [
      'To save copper inside the relay CT secondary',
      'To prevent overreach onto the next line due to CT/CVT and impedance estimation errors',
      'Because Zone 1 relays cannot measure faults beyond 85 km',
      'To slow down clearing of close-in three-phase faults',
    ],
    correctIndex: 1,
    formulaHint: 'CT/PT & line parameter errors (~10–15%) require an underreach safety margin for instantaneous Zone 1.',
    explanation:
      'Setting Zone 1 to 80–85% guarantees instantaneous tripping without overreaching into adjacent lines; Zone 2 covers the remaining 15–20%.',
  },
];

export interface PowerCodeScript {
  id: string;
  language: 'Julia' | 'Python' | 'MATLAB';
  title: string;
  module: string;
  filename: string;
  description: string;
  code: string;
}

export const POWER_SCRIPT_PACK: PowerCodeScript[] = [
  {
    id: 'jl_cat1_corona',
    language: 'Julia',
    title: 'CAT 1 Line Parameters, Bundles & Peek Corona',
    module: 'Lines & Corona',
    filename: 'ece471_line_corona.jl',
    description:
      'High-speed Julia solver for CAT 1 Q3–Q7: DC/AC resistance, GMR, L, C, charging current, 2-bundles, and Peek V_d & P_c.',
    code: `# ECE 471 — Transmission Line Parameters & Peek Corona (Julia)
using Printf

const MU0 = 4π * 1e-7
const EPS0 = 8.8541878e-12

function cat1_line_report(; rho=2.82e-8, area_mm2=250.0, len_km=100.0,
                            r_cm=1.0, D_m=4.0, V_line_kV=132.0, freq=50.0)
    A = area_mm2 * 1e-6
    R_dc_ph = rho * (len_km * 1000.0) / A
    R_ac_ph = 1.15 * R_dc_ph

    r = r_cm / 100.0
    gmr = 0.7788 * r
    L_ph = (MU0 / (2π)) * log(D_m / gmr)              # H/m
    C_ph = (2π * EPS0) / log(D_m / r)                 # F/m
    I_c_km = 2π * freq * (C_ph * 1000.0) * (V_line_kV * 1e3 / sqrt(3))

    @printf("R_dc/ph = %.3f Ω | R_ac/ph = %.3f Ω\\n", R_dc_ph, R_ac_ph)
    @printf("GMR = %.4f cm | L_ph = %.4f μH/m | C_ph = %.4f nF/km\\n", gmr*100, L_ph*1e6, C_ph*1e12)
    @printf("Charging current I_c = %.4f A/km\\n", I_c_km)
end

function peek_corona(; V_line_kV=260.0, r_cm=1.0, D_cm=300.0, freq=50.0, delta=1.0, m0=0.85)
    g0 = 21.2132 # kV(rms)/cm
    Vd = m0 * g0 * delta * r_cm * log(D_cm / r_cm)
    V_ph = V_line_kV / sqrt(3)
    Pc = V_ph > Vd ? (242.2 / delta) * (freq + 25) * sqrt(r_cm / D_cm) * (V_ph - Vd)^2 * 1e-5 : 0.0
    @printf("V_d = %.2f kV/ph | V_ph = %.2f kV/ph | P_c = %.4f kW/km/ph\\n", Vd, V_ph, Pc)
end

cat1_line_report()
peek_corona(V_line_kV=260.0, m0=1.0) # or override Vd = 133.1`,
  },
  {
    id: 'jl_dispatch',
    language: 'Julia',
    title: 'λ-Iteration Economic Dispatch & AGC ODE',
    module: 'Dispatch & AGC',
    filename: 'ece471_dispatch_agc.jl',
    description:
      'Vectorized Julia λ-iteration solver with P_min/P_max generator clamping plus RK4 frequency step simulation.',
    code: `# ECE 471 — Economic Dispatch Lambda-Iteration (Julia)
using Printf

struct GenUnit
    name::String
    a::Float64; b::Float64; c::Float64
    pmin::Float64; pmax::Float64
end

function solve_dispatch(units::Vector{GenUnit}, P_load::Float64)
    lo, hi = 0.0, 200.0
    for _ in 1:60
        mid = 0.5 * (lo + hi)
        P_sum = sum(clamp((mid - u.b) / (2 * u.c), u.pmin, u.pmax) for u in units)
        P_sum < P_load ? (lo = mid) : (hi = mid)
    end
    lam = 0.5 * (lo + hi)
    @printf("Optimal λ = %.4f \$/MWh\\n", lam)
    total_cost = 0.0
    for u in units
        P = clamp((lam - u.b) / (2 * u.c), u.pmin, u.pmax)
        C = u.a + u.b * P + u.c * P^2
        total_cost += C
        @printf("  %s: P = %7.2f MW | IC = %.3f | Cost = %8.2f \$/hr\\n",
                u.name, P, u.b + 2*u.c*P, C)
    end
    @printf("Total Generation Cost = %.2f \$/hr\\n", total_cost)
end

units = [
    GenUnit("Gen 1", 200, 7.0, 0.008, 50, 300),
    GenUnit("Gen 2", 180, 6.3, 0.009, 50, 250),
    GenUnit("Gen 3", 140, 6.8, 0.007, 40, 200),
]
solve_dispatch(units, 520.0)`,
  },
  {
    id: 'jl_faults',
    language: 'Julia',
    title: 'Symmetrical Components & Unbalanced Faults',
    module: 'Symmetrical & Faults',
    filename: 'ece471_symmetrical_faults.jl',
    description:
      'Native ComplexF64 matrix implementation of Fortescue transforms and 3ϕ / SLG / LL / DLG fault calculations.',
    code: `# ECE 471 — Symmetrical Components & Faults (Julia)
using LinearAlgebra, Printf

const a = cis(2π / 3)
const A = [1 1 1; 1 a^2 a; 1 a a^2]
const A_inv = inv(A)

function solve_fault(fault_type::Symbol, E::ComplexF64, Z1::ComplexF64, Z2::ComplexF64, Z0::ComplexF64; Zf=0.0im)
    if fault_type == :three_phase
        I1 = E / (Z1 + Zf); I2 = 0.0im; I0 = 0.0im
    elseif fault_type == :slg
        I1 = I2 = I0 = E / (Z1 + Z2 + Z0 + 3 * Zf)
    elseif fault_type == :ll
        I1 = E / (Z1 + Z2 + Zf); I2 = -I1; I0 = 0.0im
    elseif fault_type == :dlg
        Zpar = (Z2 * (Z0 + 3Zf)) / (Z2 + Z0 + 3Zf)
        I1 = E / (Z1 + Zpar)
        V1 = E - I1 * Z1
        I2 = -V1 / Z2
        I0 = -V1 / (Z0 + 3Zf)
    end
    I_abc = A * [I0, I1, I2]
    println("Fault: ", fault_type)
    for (ph, val) in zip(["Ia", "Ib", "Ic"], I_abc)
        @printf("  %s = %.4f ∠ %.1f° pu\\n", ph, abs(val), rad2deg(angle(val)))
    end
end

solve_fault(:slg, 1.0+0im, 0.20im, 0.20im, 0.05im)`,
  },
  {
    id: 'py_bewley_protection',
    language: 'Python',
    title: 'Bewley Lattice & IEC IDMT Relay Coordination',
    module: 'Transients & Protection',
    filename: 'ece471_transients_protection.py',
    description:
      'Python NumPy/Matplotlib simulation script for traveling wave reflections and IEC 60255 overcurrent curves.',
    code: `# ECE 471 — Traveling Wave Bewley Lattice & IDMT Relay (Python)
import math

def bewley_lattice(V_step_kV=100.0, Zs=100.0, Zc=400.0, ZL=1e9, length_km=150.0, transits=6):
    tau_us = length_km / 0.3  # v ≈ 0.3 km/us
    gamma_L = 1.0 if ZL > 1e6 else (ZL - Zc) / (ZL + Zc)
    gamma_S = (Zs - Zc) / (Zs + Zc)
    wave = V_step_kV * Zc / (Zc + Zs)
    V_load, V_src = 0.0, wave

    print(f"Gamma_L={gamma_L:.3f}, Gamma_S={gamma_S:.3f}, tau={tau_us:.1f} us")
    for k in range(1, transits + 1):
        t = k * tau_us
        if k % 2 == 1:
            refl = wave * gamma_L
            V_load += wave + refl
            print(f"t={t:6.1f} us | Load V={V_load:7.2f} kV")
        else:
            refl = wave * gamma_S
            V_src += wave + refl
            print(f"t={t:6.1f} us | Source V={V_src:7.2f} kV")
        wave = refl

def idmt_trip_time(I_fault, I_pickup, tds=0.2, curve="standard"):
    curves = {"standard": (0.14, 0.02), "very": (13.5, 1.0), "extremely": (80.0, 2.0)}
    k, alpha = curves[curve]
    psm = I_fault / I_pickup
    return float("inf") if psm <= 1.0 else tds * k / (psm**alpha - 1.0)

bewley_lattice()
print(f"Trip time (PSM=5, TDS=0.2): {idmt_trip_time(2500, 500, 0.2):.3f} s")`,
  },
  {
    id: 'mat_power_suite',
    language: 'MATLAB',
    title: 'Sequence Faults & Per-Unit Line Analyzer',
    module: 'Symmetrical & Faults',
    filename: 'ece471_faults_and_lines.m',
    description:
      'MATLAB script for CAT 1 line constants, bundle GMR, and unbalanced SLG/LL/DLG sequence fault current vectors.',
    code: `% ECE 471 — Electric Power Systems II MATLAB Script
clc; clear;

%% 1. CAT 1 Bundled Line & Peek Corona
r = 0.015; d = 0.40; D = 8.0;
r_prime = 0.7788 * r;
Dsb = sqrt(r_prime * d);
L_ph = 2e-7 * log(D / Dsb);
fprintf('Bundle GMR = %.5f m | L_ph = %.4f uH/m\\n', Dsb, L_ph*1e6);

%% 2. Fortescue Symmetrical Components & SLG Fault
a = exp(1j * 2*pi/3);
A = [1 1 1; 1 a^2 a; 1 a a^2];

E = 1.0; Z1 = 0.20j; Z2 = 0.20j; Z0 = 0.05j; Zf = 0;
I1_slg = E / (Z1 + Z2 + Z0 + 3*Zf);
I_seq = [I1_slg; I1_slg; I1_slg];
I_abc = A * I_seq;

fprintf('SLG Ia = %.3f pu (angle %.1f deg)\\n', abs(I_abc(1)), rad2deg(angle(I_abc(1))));`,
  },
];
