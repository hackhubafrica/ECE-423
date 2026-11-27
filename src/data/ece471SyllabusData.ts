import { PowerModule, PowerSyllabusTopic, PowerLabType } from '../types/ece471';

export const POWER_MODULE_META: Record<
  PowerModule,
  { title: string; shortTitle: string; examFocus: string }
> = {
  [PowerModule.LINE_CORONA]: {
    title: 'Transmission Line Parameters & Corona',
    shortTitle: 'Lines & Corona',
    examFocus: 'CAT 1 Exact Core (Q1–Q7)',
  },
  [PowerModule.DISPATCH_AGC]: {
    title: 'Generation Control & Economic Dispatch',
    shortTitle: 'Dispatch & AGC',
    examFocus: 'Equal Incremental Cost & Droop',
  },
  [PowerModule.SYMMETRICAL]: {
    title: 'Symmetrical Components & Per-Unit',
    shortTitle: 'Symmetrical & p.u.',
    examFocus: 'Fortescue Transform & Z₀',
  },
  [PowerModule.FAULTS]: {
    title: 'Balanced & Unbalanced Power Faults',
    shortTitle: 'Power Faults',
    examFocus: '3ϕ, SLG, LL & DLG Sequences',
  },
  [PowerModule.TRANSIENTS]: {
    title: 'Transient Analysis of Transmission Lines',
    shortTitle: 'Traveling Waves',
    examFocus: 'Surge Zc & Bewley Lattice',
  },
  [PowerModule.PROTECTION]: {
    title: 'Introduction to Power System Protection',
    shortTitle: 'Protection Relays',
    examFocus: 'IDMT Overcurrent & Mho Zones',
  },
};

export const POWER_SYLLABUS_TOPICS: PowerSyllabusTopic[] = [
  // Module 1: Transmission Line Parameters & Corona (CAT 1 Focus)
  {
    id: 'pwr_corona_physics',
    module: PowerModule.LINE_CORONA,
    title: 'Corona Discharge Effects, Losses & Applications',
    keyFormula: 'E_air ≈ 30 kV(peak)/cm = 21.21 kV(rms)/cm',
    catPriority: 'Critical',
    summary:
      'Ionization of air surrounding HV conductors produces ozone, violet glow, hissing, radio interference, non-sinusoidal harmonics, and real power loss—while acting as a natural surge damper.',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'peek_corona',
  },
  {
    id: 'pwr_dc_ac_resistance',
    module: PowerModule.LINE_CORONA,
    title: 'DC & AC Line Resistance and Skin Effect',
    keyFormula: 'R_dc = ρ·l / A ,   R_ac = k_skin · R_dc',
    catPriority: 'Critical',
    summary:
      'Compute per-phase and total 3-phase circuit DC resistance from resistivity and cross-section, then scale by skin-effect & spiraling multipliers (e.g. 1.15×) for 50/60 Hz AC.',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'dc_ac_resistance',
  },
  {
    id: 'pwr_gmr_inductance',
    module: PowerModule.LINE_CORONA,
    title: 'Conductor GMR & Single/Three-Phase Inductance',
    keyFormula: 'r\' = 0.7788·r ,   L = 2×10⁻⁷ ln(GMD / GMR) H/m',
    catPriority: 'Critical',
    summary:
      'Account for internal flux linkage via the 0.7788 factor to find GMR per wire, inductance per conductor, and total loop inductance per km in 1-phase and 3-phase lines.',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'line_inductance',
  },
  {
    id: 'pwr_cap_charging',
    module: PowerModule.LINE_CORONA,
    title: 'Line Capacitance & Shunt Charging Current',
    keyFormula: 'C_n = 2πε₀ / ln(D / r) ,   I_c = ω·C_n·V_ph',
    catPriority: 'Critical',
    summary:
      'Use full outer radius r (not GMR) for electric field capacitance per phase and compute 50/60 Hz charging current per kilometre that causes Ferranti voltage rise at light load.',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'line_capacitance',
  },
  {
    id: 'pwr_bundled_conductors',
    module: PowerModule.LINE_CORONA,
    title: 'Bundled Conductors: Equivalent GMR & EHV Benefits',
    keyFormula: 'D_sb(2) = √(r\'·d) ,   D_sb(3) = ∛(r\'·d²)',
    catPriority: 'Critical',
    summary:
      'Sub-conductor bundling increases effective GMR and capacitance radius, lowering reactance X_L, boosting Surge Impedance Loading (SIL), and suppressing surface voltage gradient.',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'bundled_gmr',
  },
  {
    id: 'pwr_peek_corona',
    module: PowerModule.LINE_CORONA,
    title: 'Peek\'s Formula: Disruptive Voltage & Corona Power Loss',
    keyFormula: 'V_d = m₀ g₀ δ r ln(D/r) ,   P_c = (242.2/δ)(f+25)√(r/D)(V_ph−V_d)²×10⁻⁵',
    catPriority: 'Critical',
    summary:
      'Evaluate disruptive critical voltage V_d per phase using air-density δ and irregularity m₀, then calculate fair-weather corona loss in kW/km/phase when V_ph > V_d.',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'peek_corona',
  },

  // Module 2: Generation Control & Economic Dispatch
  {
    id: 'pwr_econ_dispatch',
    module: PowerModule.DISPATCH_AGC,
    title: 'Economic Dispatch & Equal Incremental Cost (λ-Iteration)',
    keyFormula: 'dC_i/dP_i = b_i + 2c_i P_i = λ  (subject to P_min ≤ P_i ≤ P_max)',
    catPriority: 'Exam Core',
    summary:
      'Allocate total system demand across thermal units to minimize $/hr generation cost while clamping units that hit P_min or P_max limits and re-solving λ on free units.',
    recommendedLab: PowerLabType.DISPATCH_AGC,
    recommendedCalc: 'econ_dispatch',
  },
  {
    id: 'pwr_droop_agc',
    module: PowerModule.DISPATCH_AGC,
    title: 'Governor Speed Droop & Automatic Generation Control (AGC)',
    keyFormula: 'Δf_ss = −ΔP_L / (1/R + D) ,   ACE = B·Δf + ΔP_tie',
    catPriority: 'Exam Core',
    summary:
      'Primary speed droop shares load changes proportionally to unit rating in seconds, leaving a steady-state frequency error that secondary integral AGC drives back to zero.',
    recommendedLab: PowerLabType.DISPATCH_AGC,
    recommendedCalc: 'econ_dispatch',
  },

  // Module 3: Symmetrical Components & Per-Unit
  {
    id: 'pwr_symmetrical_transform',
    module: PowerModule.SYMMETRICAL,
    title: 'Fortescue Symmetrical Components (0, 1, 2 Sequences)',
    keyFormula: '[V₀, V₁, V₂]ᵀ = (1/3) [1 1 1; 1 a a²; 1 a² a] [V_a, V_b, V_c]ᵀ',
    catPriority: 'High',
    summary:
      'Decompose any unbalanced three-phase phasor set into balanced positive (a-b-c), negative (a-c-b), and zero (co-phasal) sequence sets using a = 1∠120°.',
    recommendedLab: PowerLabType.SYMMETRICAL_FAULTS,
    recommendedCalc: 'symmetrical_comp',
  },
  {
    id: 'pwr_pu_sequence_nets',
    module: PowerModule.SYMMETRICAL,
    title: 'Per-Unit Base Conversion & Sequence Network Modeling',
    keyFormula: 'Z_new = Z_old · (S_new / S_old) · (V_old / V_new)²',
    catPriority: 'High',
    summary:
      'Normalize multi-voltage transformer grids onto common MVA/kV bases and assemble positive, negative, and transformer-grounding-dependent zero-sequence networks.',
    recommendedLab: PowerLabType.SYMMETRICAL_FAULTS,
    recommendedCalc: 'pu_traveling_wave',
  },

  // Module 4: Power System Faults
  {
    id: 'pwr_balanced_fault',
    module: PowerModule.FAULTS,
    title: 'Balanced Three-Phase Fault & Subtransient Reactance',
    keyFormula: 'I_f(3ϕ) = E_pre / (Z₁ + Z_f) ,   S_sc = S_base / |Z₁|',
    catPriority: 'Exam Core',
    summary:
      'Compute symmetrical fault MVA and breaker interrupting current using only the positive-sequence Thévenin equivalent at the faulted bus.',
    recommendedLab: PowerLabType.SYMMETRICAL_FAULTS,
    recommendedCalc: 'power_faults',
  },
  {
    id: 'pwr_unbalanced_faults',
    module: PowerModule.FAULTS,
    title: 'Unbalanced Faults: SLG, Line-to-Line & Double Line-to-Ground',
    keyFormula: 'SLG: I₁ = E/(Z₁+Z₂+Z₀+3Z_f) ,  LL: I₁ = E/(Z₁+Z₂+Z_f)',
    catPriority: 'Exam Core',
    summary:
      'Connect positive, negative, and zero sequence networks in series (SLG), anti-parallel (LL), or all-parallel (DLG) to solve exact phase fault currents and healthy-phase voltages.',
    recommendedLab: PowerLabType.SYMMETRICAL_FAULTS,
    recommendedCalc: 'power_faults',
  },

  // Module 5: Transients on Transmission Lines
  {
    id: 'pwr_traveling_waves',
    module: PowerModule.TRANSIENTS,
    title: 'Traveling Wave Equation, Surge Impedance & Velocity',
    keyFormula: 'Z_c = √(L/C) ,   v = 1/√(LC) ≈ 3×10⁸ m/s (overhead)',
    catPriority: 'High',
    summary:
      'Relate forward/backward voltage and current surges on lossless distributed-parameter lines during lightning strikes or breaker switching.',
    recommendedLab: PowerLabType.TRANSIENTS_PROTECTION,
    recommendedCalc: 'pu_traveling_wave',
  },
  {
    id: 'pwr_bewley_lattice',
    module: PowerModule.TRANSIENTS,
    title: 'Reflection Coefficients & Bewley Lattice Bounce Diagrams',
    keyFormula: 'Γ_L = (Z_L − Z_c)/(Z_L + Z_c) ,   τ_L = 2Z_L/(Z_L + Z_c)',
    catPriority: 'Exam Core',
    summary:
      'Track step and surge reflections between mismatched source, line, and load terminations across transit intervals τ = l / v to predict open-line voltage doubling.',
    recommendedLab: PowerLabType.TRANSIENTS_PROTECTION,
    recommendedCalc: 'pu_traveling_wave',
  },

  // Module 6: Power System Protection
  {
    id: 'pwr_protection_relays',
    module: PowerModule.PROTECTION,
    title: 'Overcurrent IDMT Curves, Mho Distance Zones & Differential Relays',
    keyFormula: 't_trip = TDS · k / ((I_f / I_pickup)^α − 1)',
    catPriority: 'Exam Core',
    summary:
      'Coordinate primary and backup protection via IEC 60255 inverse-time curves, 3-zone Mho impedance circles (80% / 120% / backup), and transformer percentage differential restraint.',
    recommendedLab: PowerLabType.TRANSIENTS_PROTECTION,
    recommendedCalc: 'pu_traveling_wave',
  },
];

export const POWER_TONIGHT_TIMELINE = [
  {
    slot: '0:00 – 0:50',
    focus: 'CAT 1 Core: Resistance, GMR, Inductance & Capacitance',
    actions:
      'Drill CAT 1 Q3–Q6 in Solver & Per-Unit: memorize r\' = 0.7788r, bundle √(r\'·d), and charging current I_c = ωC_n V_ph.',
  },
  {
    slot: '0:50 – 1:35',
    focus: 'CAT 1 Core: Corona Physics & Peek’s Formulas (Q1, Q2, Q7)',
    actions:
      'Master corona effects/applications essays and practice both Peek disruptive voltage V_d and corona loss P_c on varying voltages.',
  },
  {
    slot: '1:35 – 2:30',
    focus: 'Economic Dispatch, AGC & Symmetrical Components',
    actions:
      'Run λ-iteration with P_min/P_max clamping in Power Labs, then verify Fortescue a = 1∠120° decompositions and SLG/LL/DLG sequence connections.',
  },
  {
    slot: '2:30 – 3:20',
    focus: 'Traveling Wave Lattice & Protection Relay Drills',
    actions:
      'Trace 4+ bounces on the Bewley Lattice Lab, inspect Zone 1–3 Mho circles, and finish with the Timed CAT Sprint Quiz.',
  },
];

export interface FaultComparisonRow {
  faultType: string;
  sequenceConnection: string;
  zeroSeqPresent: string;
  faultCurrentFormula: string;
  typicalSeverity: string;
}

export const FAULT_COMPARISON_ROWS: FaultComparisonRow[] = [
  {
    faultType: '3-Phase Balanced (3ϕ)',
    sequenceConnection: 'Positive sequence only (Z₁ + Z_f)',
    zeroSeqPresent: 'No (I₀ = I₂ = 0)',
    faultCurrentFormula: 'I_a = E / (Z₁ + Z_f)',
    typicalSeverity: 'Reference benchmark (~100%); rarely lower than SLG except near grounded Δ-Y tx',
  },
  {
    faultType: 'Single Line-to-Ground (SLG)',
    sequenceConnection: 'Series: Z₁ + Z₂ + Z₀ + 3Z_f',
    zeroSeqPresent: 'Yes (I₁ = I₂ = I₀)',
    faultCurrentFormula: 'I_a = 3E / (Z₁ + Z₂ + Z₀ + 3Z_f)',
    typicalSeverity: 'Most common fault (~70%); exceeds 3ϕ fault when Z₀ < Z₁ at solidly grounded buses',
  },
  {
    faultType: 'Line-to-Line (LL)',
    sequenceConnection: 'Anti-parallel: Z₁ + Z₂ + Z_f',
    zeroSeqPresent: 'No (I₀ = 0)',
    faultCurrentFormula: 'I_b = −j√3 E / (Z₁ + Z₂ + Z_f)',
    typicalSeverity: '≈ 0.866 × I_3ϕ when Z₁ = Z₂; zero ground current',
  },
  {
    faultType: 'Double Line-to-Ground (DLG)',
    sequenceConnection: 'Parallel: Z₁ + [Z₂ ∥ (Z₀ + 3Z_f)]',
    zeroSeqPresent: 'Yes (V₁ = V₂ = V₀ at fault)',
    faultCurrentFormula: 'I_1 = E / (Z₁ + Z₂∥(Z₀+3Z_f))',
    typicalSeverity: 'High ground fault current; healthy phase voltage can rise transiently',
  },
];

export interface CoronaMitigationRow {
  method: string;
  mechanism: string;
  formulaEffect: string;
  engineeringTradeoff: string;
}

export const CORONA_MITIGATION_ROWS: CoronaMitigationRow[] = [
  {
    method: 'Bundled Conductors (2, 3, or 4 sub-conductors)',
    mechanism: 'Increases effective geometric radius and smooths electric field gradient around phase.',
    formulaEffect: 'Raises effective r_eq → boosts V_d and lowers X_L simultaneously.',
    engineeringTradeoff: 'Requires spacer dampers and heavier tower hardware; standard on ≥220 kV lines.',
  },
  {
    method: 'Larger Conductor Diameter / ACSR',
    mechanism: 'Directly lowers surface electric stress g_max = V / (r ln(D/r)).',
    formulaEffect: 'Increases r in V_d = m₀ g₀ δ r ln(D/r).',
    engineeringTradeoff: 'Higher conductor weight, ice/wind loading, and capital aluminum cost.',
  },
  {
    method: 'Increased Phase Spacing (D)',
    mechanism: 'Reduces mutual electric field intensification between adjacent phases.',
    formulaEffect: 'Increases ln(D/r) in V_d and shrinks √(r/D) in P_c.',
    engineeringTradeoff: 'Wider right-of-way towers and higher inductive reactance X_L.',
  },
  {
    method: 'Smooth Corona Rings / Grading Shields',
    mechanism: 'Raises surface irregularity factor m₀ near insulator strings and clamps.',
    formulaEffect: 'Prevents local premature ionization (m₀ → 0.90–0.98).',
    engineeringTradeoff: 'Minimal cost; essential at EHV hardware terminations.',
  },
];

export interface ProtectionZoneRow {
  scheme: string;
  reachOrCondition: string;
  operatingTime: string;
  primaryRole: string;
}

export const PROTECTION_ZONE_ROWS: ProtectionZoneRow[] = [
  {
    scheme: 'Distance Zone 1 (Mho)',
    reachOrCondition: '80%–85% of protected line Z_L',
    operatingTime: 'Instantaneous (~15–30 ms)',
    primaryRole: 'High-speed primary clearing without under/over-reach error into next bus.',
  },
  {
    scheme: 'Distance Zone 2 (Mho)',
    reachOrCondition: '100% of Line 1 + 20%–50% of shortest next line',
    operatingTime: '0.30 – 0.45 s timer delay',
    primaryRole: 'Covers far-end 15%–20% of Line 1 and provides remote bus backup.',
  },
  {
    scheme: 'Distance Zone 3 (Mho)',
    reachOrCondition: '100% of Line 1 + 100%–120% of longest adjacent line',
    operatingTime: '0.80 – 1.20 s timer delay',
    primaryRole: 'Remote backup if downstream breaker fails to trip.',
  },
  {
    scheme: 'Percentage Differential (87T)',
    reachOrCondition: '|I₁ − I₂| > slope · (I₁ + I₂)/2 + I_min',
    operatingTime: 'Instantaneous (< 1 cycle)',
    primaryRole: 'Unit protection for transformers/generators; immune to external through-faults.',
  },
];
