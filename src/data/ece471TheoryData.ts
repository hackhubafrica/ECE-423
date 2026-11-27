import {
  PowerEssayPrompt,
  PowerFlashcard,
  PowerMilestone,
  PowerModule,
  PowerPrinciple,
  PowerLabType,
} from '../types/ece471';

export const POWER_PRINCIPLES: PowerPrinciple[] = [
  {
    id: 'prin_gmr_flux',
    module: PowerModule.LINE_CORONA,
    title: 'Why Inductance Uses GMR (0.7788r) While Capacitance Uses Radius (r)',
    plainEnglishIntuition:
      'Magnetic flux penetrates inside a solid copper/aluminum wire, creating internal inductance; electric charge sits purely on the outer skin, so there is zero internal electric field.',
    physicalMechanism:
      'Integrating magnetic flux inside a uniform-current cylinder yields an internal inductance of μ₀/(8π) H/m = 0.5×10⁻⁷ H/m. Combining internal and external flux gives 2×10⁻⁷[1/4 + ln(D/r)] = 2×10⁻⁷ ln(D / (r·e⁻¹/⁴)), where e⁻¹/⁴ = 0.7788.',
    whyItMatters:
      'Mixing up r and r\' = 0.7788r is the single most common CAT 1 calculation mistake in transmission line parameter questions.',
    commonMisconception:
      'Using 0.7788r inside the capacitance formula C_n = 2πε₀/ln(D/r). Capacitance always uses the actual outer physical radius r!',
    pioneerHighlight: 'James Clerk Maxwell & Oliver Heaviside — distributed telegrapher parameters',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'line_inductance',
  },
  {
    id: 'prin_corona_peek',
    module: PowerModule.LINE_CORONA,
    title: 'Corona Onset, Disruptive Gradient & Peek’s Power Law',
    plainEnglishIntuition:
      'When the electric field at a conductor’s surface exceeds air’s breakdown strength (~21.21 kV rms/cm), air molecules ionize into a conductive plasma sheath—effectively enlarging the wire until the stress drops below breakdown.',
    physicalMechanism:
      'Irregularities (stranding, dust, rain) concentrate the field by m₀ < 1 and lower air density δ at high altitude/temperature reduces breakdown strength proportionally. Above disruptive voltage V_d, energy is dissipated each half-cycle proportional to (f + 25)(V_ph − V_d)².',
    whyItMatters:
      'Corona dictates minimum EHV conductor bundle size: too small a radius causes severe annual energy loss and AM/TV radio noise; controlled corona also bleeds down lightning overvoltages.',
    commonMisconception:
      'Using line-to-line voltage V_L instead of line-to-neutral phase voltage V_ph = V_L/√3 inside Peek’s loss formula (V_ph − V_d)².',
    pioneerHighlight: 'Frank W. Peek Jr. (General Electric, 1911) — Dielectric Phenomena in High Voltage Engineering',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'peek_corona',
  },
  {
    id: 'prin_lambda_dispatch',
    module: PowerModule.DISPATCH_AGC,
    title: 'Equal Incremental Cost Criterion & Clamped Limits',
    plainEnglishIntuition:
      'To supply total grid demand at minimum $/hr, shift load away from expensive generators toward cheaper ones until the marginal cost of the next 1 MW is identical across every unconstrained unit.',
    physicalMechanism:
      'Minimizing Σ C_i(P_i) subject to Σ P_i = P_D via Lagrange multiplier λ gives ∂L/∂P_i = dC_i/dP_i − λ = 0. If any unit hits P_max or P_min, KKT complementarity clamps it at its limit and remaining free units raise/lower λ.',
    whyItMatters:
      'Forms the mathematical backbone of real-time optimal power flow (OPF) and wholesale electricity locational marginal pricing (LMP).',
    commonMisconception:
      'Picking the generator with the lowest average $/MWh cost rather than matching incremental slopes b_i + 2c_i P_i = λ.',
    pioneerHighlight: 'Leon Kirchmayer (1958) — Economic Operation of Power Systems',
    recommendedLab: PowerLabType.DISPATCH_AGC,
    recommendedCalc: 'econ_dispatch',
  },
  {
    id: 'prin_fortescue',
    module: PowerModule.SYMMETRICAL,
    title: 'Fortescue Decoupling: Why Sequence Networks Don’t Cross-Couple',
    plainEnglishIntuition:
      'Even an ugly unbalanced fault becomes three independent single-phase circuits when viewed in positive, negative, and zero sequence coordinates—connecting only at the fault point itself.',
    physicalMechanism:
      'In a balanced transposed 3-phase grid, the impedance matrix Z_abc is circulant. Multiplying by Fortescue’s unitary-scaled matrix A diagonalizes Z_abc into Z₀₁₂ = diag(Z₀, Z₁, Z₂), eliminating mutual coupling everywhere except the asymmetric fault.',
    whyItMatters:
      'Allows engineers to solve 3-phase unbalanced SLG, LL, and DLG faults with simple series/parallel Thévenin circuits instead of coupled 3×3 matrix inversions.',
    commonMisconception:
      'Assuming Z₀ = Z₁ = Z₂. In rotating machines Z₀ ≪ Z₁, and in overhead lines Z₀ ≈ 2.5 to 3.5 × Z₁ due to earth-return flux.',
    pioneerHighlight: 'Charles LeGeyt Fortescue (1918 AIEE Paper) — Method of Symmetrical Co-ordinates',
    recommendedLab: PowerLabType.SYMMETRICAL_FAULTS,
    recommendedCalc: 'symmetrical_comp',
  },
  {
    id: 'prin_bewley_lattice',
    module: PowerModule.TRANSIENTS,
    title: 'Traveling Waves, Surge Impedance & Open-End Voltage Doubling',
    plainEnglishIntuition:
      'A switching step doesn’t appear everywhere on a 300 km line instantly—it sprints at ~300 m/μs carrying voltage/current in ratio Z_c = √(L/C), bouncing off open breakers at double voltage.',
    physicalMechanism:
      'At an open termination (Z_L = ∞), current must be zero, forcing a reflected current wave −I⁺ and positive voltage wave V⁻ = +V⁺ (Γ = +1, τ = 2). At a short circuit (Z_L = 0), V⁻ = −V⁺ cancels voltage and doubles current.',
    whyItMatters:
      'Explains Basic Impulse Insulation Levels (BIL), arrestor placement at substations, and why line energization surges can exceed 2.0 p.u.',
    commonMisconception:
      'Forgetting the source voltage divider Z_c / (Z_s + Z_c) when computing the initial wave V⁺ launched onto the line at t = 0.',
    pioneerHighlight: 'Loyal V. Bewley (1933) — Traveling Waves on Transmission Systems',
    recommendedLab: PowerLabType.TRANSIENTS_PROTECTION,
    recommendedCalc: 'pu_traveling_wave',
  },
  {
    id: 'prin_protection_coord',
    module: PowerModule.PROTECTION,
    title: 'Selectivity vs Speed: Why Zone 1 Distance Stops at 80–85%',
    plainEnglishIntuition:
      'A relay must trip lightning-fast for faults on its own line, yet never mis-operate for a fault just past the remote substation bus due to CT/PT measurement tolerance.',
    physicalMechanism:
      'CT ratio errors, CVT transient errors, and line impedance uncertainties create a ±10–15% measurement band. Setting Zone 1 to 80–85% of Z_line guarantees zero overreach into Line 2, while Zone 2 (120% with 0.35 s delay) clears the remaining 15–20%.',
    whyItMatters:
      'Prevents cascading blackouts caused by false tripping of healthy parallel corridors during external faults.',
    commonMisconception:
      'Setting Zone 1 to 100% of line impedance—any slight CT saturation or fault arc resistance error would trip two lines unnecessarily.',
    pioneerHighlight: 'A.R. van C. Warrington — Protective Relays & Distance Protection',
    recommendedLab: PowerLabType.TRANSIENTS_PROTECTION,
    recommendedCalc: 'pu_traveling_wave',
  },
];

export const POWER_MILESTONES: PowerMilestone[] = [
  {
    id: 'ms_war_currents',
    year: '1891',
    yearNumeric: 1891,
    era: '1880s–1920s',
    module: PowerModule.LINE_CORONA,
    pioneer: 'Mikhail Dolivo-Dobrovolsky & Nikola Tesla',
    affiliation: 'AEG Frankfurt / Westinghouse',
    breakthrough: 'First long-distance 3-phase AC transmission (Lauffen–Frankfurt, 175 km)',
    storyAndContext:
      'Delivered 300 hp at 15–25 kV with 75% efficiency, proving high-voltage 3-phase AC could beat DC losses by reducing I²R via transformer step-up.',
    ece471Connection: 'Motivation behind per-phase resistance, reactance, and line efficiency formulas.',
    recommendedLab: PowerLabType.LINE_CORONA,
  },
  {
    id: 'ms_peek_1911',
    year: '1911',
    yearNumeric: 1911,
    era: '1880s–1920s',
    module: PowerModule.LINE_CORONA,
    pioneer: 'Frank W. Peek Jr.',
    affiliation: 'General Electric High-Voltage Lab',
    breakthrough: 'Empirical corona disruptive voltage & quadratic power-loss laws',
    storyAndContext:
      'Measured high-voltage air breakdown across conductor radii, altitudes, and weather conditions to derive the famous Peek corona loss equation still taught worldwide.',
    ece471Connection: 'Direct foundation for CAT 1 Q1, Q2, and Q7 calculations.',
    recommendedLab: PowerLabType.LINE_CORONA,
  },
  {
    id: 'ms_fortescue_1918',
    year: '1918',
    yearNumeric: 1918,
    era: '1880s–1920s',
    module: PowerModule.SYMMETRICAL,
    pioneer: 'Charles LeGeyt Fortescue',
    affiliation: 'Westinghouse Electric Corp.',
    breakthrough: 'Method of Symmetrical Coordinates for unbalanced polyphase networks',
    storyAndContext:
      'Originally developed to analyze single-phase railway traction motors fed from 3-phase lines, Fortescue’s transform became the universal language of fault analysis.',
    ece471Connection: 'Basis of positive, negative, and zero sequence networks and SLG/LL/DLG faults.',
    recommendedLab: PowerLabType.SYMMETRICAL_FAULTS,
  },
  {
    id: 'ms_bewley_1931',
    year: '1931',
    yearNumeric: 1931,
    era: '1930s–1960s',
    module: PowerModule.TRANSIENTS,
    pioneer: 'Loyal V. Bewley',
    affiliation: 'General Electric / Lehigh University',
    breakthrough: 'Bewley Reflection Lattice Diagram for switching & lightning surges',
    storyAndContext:
      'Before digital computers existed, Bewley invented a crisp space-time zig-zag bookkeeping chart to track dozens of overlapping reflected waves on multi-line grids.',
    ece471Connection: 'Used directly in Traveling Wave & Protection Lab.',
    recommendedLab: PowerLabType.TRANSIENTS_PROTECTION,
  },
  {
    id: 'ms_cohn_agc_1956',
    year: '1956',
    yearNumeric: 1956,
    era: '1930s–1960s',
    module: PowerModule.DISPATCH_AGC,
    pioneer: 'Nathan Cohn',
    affiliation: 'Leeds & Northrup',
    breakthrough: 'Tie-Line Bias Automatic Generation Control (AGC) & Area Control Error',
    storyAndContext:
      'Enabled interconnected regional utilities to regulate their own 60 Hz frequency and scheduled tie-line exports simultaneously without fighting each other.',
    ece471Connection: 'Drives ACE = B·Δf + ΔP_tie in our AGC Frequency Control Simulator.',
    recommendedLab: PowerLabType.DISPATCH_AGC,
  },
  {
    id: 'ms_numerical_relays',
    year: '1980s–Present',
    yearNumeric: 1985,
    era: '1970s–Modern',
    module: PowerModule.PROTECTION,
    pioneer: 'Arun G. Phadke & James S. Thorp',
    affiliation: 'Virginia Tech / IEEE',
    breakthrough: 'Microprocessor distance relays & synchronized phasor measurements (PMUs)',
    storyAndContext:
      'Replaced electromechanical induction disks with DFT phasor estimators and GPS-synchronized synchrophasors for sub-cycle fault detection and wide-area stability.',
    ece471Connection: 'Powers modern digital Mho Zone 1–3 distance relays and IEC IDMT protection.',
    recommendedLab: PowerLabType.TRANSIENTS_PROTECTION,
  },
];

export const POWER_ESSAY_PROMPTS: PowerEssayPrompt[] = [
  {
    id: 'essay_cat1_q1_effects',
    module: PowerModule.LINE_CORONA,
    catRelevance: 'CAT 1 High-Yield',
    title: 'CAT 1 Q1: Effects of Corona on HV Transmission Line Performance',
    question:
      'Explain the effects of corona on the performance of high-voltage transmission lines.',
    marksGuide: '3 marks · Cover electrical loss, interference, chemical/insulation impact & surge damping',
    keyPoints: [
      'Real power loss (P_c): continuous I²-like energy dissipation reduces transmission efficiency, especially in wet/rainy weather.',
      'Radio & TV interference (EMI) plus audible hissing/violet glow near towers.',
      'Ozone & nitric acid formation corrodes aluminum/steel conductors and degrades nearby insulator surfaces.',
      'Non-sinusoidal charging current introduces 3rd/odd harmonics into the line.',
      'Beneficial side-effect: acts as a safety valve by attenuating steep lightning/switching surge peaks.',
    ],
    modelAnswer:
      'Corona ionization around high-voltage conductors causes continuous real power loss (reducing overall line efficiency, worsening significantly during fog or rain), generates high-frequency electromagnetic/radio interference and audible noise, produces corrosive ozone and nitrous acids that attack conductors and insulators, and injects third-harmonic currents into the system. On the positive side, corona increases the effective conductor diameter and dissipates energy during transient overvoltages, helping damp steep lightning and switching surges.',
    recommendedLab: PowerLabType.LINE_CORONA,
  },
  {
    id: 'essay_cat1_q2_apps',
    module: PowerModule.LINE_CORONA,
    catRelevance: 'CAT 1 High-Yield',
    title: 'CAT 1 Q2: Two Useful Applications of Corona Discharge',
    question: 'State two useful applications of corona discharge.',
    marksGuide: '2 marks · State two clear engineering/industrial applications with brief mechanism',
    keyPoints: [
      'Electrostatic precipitators (flue-gas dust/ash collection in coal/cement plants).',
      'Natural surge attenuation / lightning overvoltage damping on overhead HV lines.',
      'Laser printers / photocopier drum charging, ozone water sterilization, or air ionizers.',
    ],
    modelAnswer:
      '1) Surge attenuation on EHV lines: corona discharge dissipates surge energy and increases effective shunt capacitance above disruptive voltage, clipping steep lightning and switching overvoltage fronts.\n2) Electrostatic precipitators & xerography: corona ionizes gas molecules to electrostatically charge fly-ash particles in power-plant smokestacks (or toner/photoreceptor drums in printers) for efficient collection.',
    recommendedLab: PowerLabType.LINE_CORONA,
  },
  {
    id: 'essay_cat1_q6c_bundles',
    module: PowerModule.LINE_CORONA,
    catRelevance: 'CAT 1 High-Yield',
    title: 'CAT 1 Q6(c): Two Advantages of Bundled Conductors in EHV Systems',
    question:
      'Explain two advantages of bundled conductors in extra-high-voltage (EHV) transmission systems.',
    marksGuide: '1–2 marks · Contrast inductance/reactance reduction and corona/EMI suppression',
    keyPoints: [
      'Reduces line inductance L and inductive reactance X_L by increasing equivalent phase GMR → raises power transfer limit and Surge Impedance Loading (SIL).',
      'Reduces maximum surface electric field gradient → raises disruptive critical voltage V_d, lowering corona power loss and radio interference.',
      'Improves thermal cooling surface area per phase for higher ampacity.',
    ],
    modelAnswer:
      '1) Lower Inductance & Higher Power Capacity: Sub-conductor spacing increases the equivalent geometric mean radius (GMR), reducing inductive reactance X_L per km, improving voltage regulation, and boosting steady-state stability and Surge Impedance Loading.\n2) Corona & Radio Interference Suppression: Sharing phase charge across multiple sub-conductors lowers the surface electric stress gradient, raising the corona disruptive voltage V_d and cutting audible noise and power loss.',
    recommendedLab: PowerLabType.LINE_CORONA,
  },
  {
    id: 'essay_agc_vs_droop',
    module: PowerModule.DISPATCH_AGC,
    catRelevance: 'Final Exam Core',
    title: 'Primary Speed Droop vs Secondary AGC Frequency Restoration',
    question:
      'Distinguish between primary governor droop control and secondary Automatic Generation Control (AGC) following a sudden load increase.',
    marksGuide: '6 marks · Time scale, steady-state error, ACE equation & tie-line power sharing',
    keyPoints: [
      'Primary droop (1–10 s): proportional governor loop ΔP = −Δf / R arrests frequency drop rapidly and shares load across all parallel units.',
      'Droop alone leaves a non-zero steady-state frequency deviation Δf_ss = −ΔP_L / (1/R + D) and shifts tie-line flows.',
      'Secondary AGC (tens of seconds to minutes): integral controller drives Area Control Error ACE = B·Δf + ΔP_tie → 0, restoring nominal 50/60 Hz and scheduled tie-line interchange.',
    ],
    modelAnswer:
      'When load rises suddenly, primary governor speed droop reacts within seconds to open turbine valves proportionally to 1/R, arresting the frequency decline and sharing the extra demand among all synchronized generators. Because droop is proportional-only control, frequency settles below nominal (Δf_ss = −ΔP_L / β). Secondary AGC acts over 30–120 seconds using an integral feedback loop on Area Control Error (ACE = B·Δf + ΔP_tie) to reset generator load reference setpoints until frequency returns to nominal 50/60 Hz and each control area supplies its own load.',
    recommendedLab: PowerLabType.DISPATCH_AGC,
  },
  {
    id: 'essay_slg_vs_3ph',
    module: PowerModule.FAULTS,
    catRelevance: 'Final Exam Core',
    title: 'When Can an SLG Fault Exceed a Balanced 3-Phase Fault?',
    question:
      'Derive the condition under which a solidly bolted Single Line-to-Ground (SLG) fault current exceeds the balanced three-phase fault current at the same bus.',
    marksGuide: '5 marks · Compare 3E/(Z₁+Z₂+Z₀) vs E/Z₁ assuming Z₁ ≈ Z₂',
    keyPoints: [
      'I_SLG = 3E / (Z₁ + Z₂ + Z₀) while I_3ϕ = E / Z₁.',
      'Taking Z₂ ≈ Z₁: I_SLG > I_3ϕ whenever 3/(2Z₁ + Z₀) > 1/Z₁ ⟺ Z₀ < Z₁.',
      'Occurs close to solidly grounded synchronous generators or Δ–Yg step-up transformers where local Z₀ is lower than generator positive-sequence reactance.',
    ],
    modelAnswer:
      'For a bolted fault (Z_f = 0) with Z₁ = Z₂, the balanced 3-phase fault current is I_3ϕ = E / Z₁ while the SLG fault current is I_SLG = 3E / (2Z₁ + Z₀). Setting I_SLG > I_3ϕ yields 3Z₁ > 2Z₁ + Z₀, which simplifies to Z₀ < Z₁. Physically, this happens near solidly grounded generators or Δ–Yg substation transformers where the zero-sequence reactance of the grounded transformer/generator is smaller than the positive-sequence reactance.',
    recommendedLab: PowerLabType.SYMMETRICAL_FAULTS,
  },
  {
    id: 'essay_distance_zones',
    module: PowerModule.PROTECTION,
    catRelevance: 'Final Exam Core',
    title: 'Three-Zone Distance Relay Coordination & Infeed Effect',
    question:
      'Explain why Zone 1 of a Mho distance relay is set to 80–85% of the line impedance and how Zones 2 and 3 provide complete line and remote backup protection.',
    marksGuide: '6 marks · CT/PT tolerances, Zone 1/2/3 reach & time delays',
    keyPoints: [
      'Zone 1 (80–85%, 0 ms intentional delay): avoids overreaching past the remote bus due to CT/PT/line-parameter inaccuracies.',
      'Zone 2 (100% Line 1 + 20–50% of shortest Line 2, ~0.3–0.4 s): guarantees full coverage of Line 1 far-end faults with grading margin.',
      'Zone 3 (Line 1 + 120% of longest Line 2, ~0.8–1.2 s): provides remote backup if adjacent breaker or relay fails.',
    ],
    modelAnswer:
      'Because current transformers, voltage transformers, and calculated line impedances carry combined errors of 5–15%, setting instantaneous Zone 1 to 100% would risk false tripping for faults on the adjacent busbar. Limiting Zone 1 to 80–85% ensures selectivity with zero intentional delay. The remaining 15–20% of the protected line is cleared by Zone 2 (reaching 120% of Line 1 after a 0.3–0.4 s coordination delay), while Zone 3 reaches past the longest downstream line after ~1.0 s to back up failed downstream relays or breakers.',
    recommendedLab: PowerLabType.TRANSIENTS_PROTECTION,
  },
];

export const POWER_FLASHCARDS: PowerFlashcard[] = [
  {
    id: 'fc_resistance',
    syllabusTopicId: 'pwr_dc_ac_resistance',
    module: PowerModule.LINE_CORONA,
    title: 'DC & AC Line Resistance',
    catPriority: 'Critical',
    formulaDisplay: 'R_dc = ρ·l / A ,   R_ac = k_skin · R_dc',
    variableLegend: ['ρ: Ω·m', 'l: m', 'A: m² (1 mm² = 10⁻⁶ m²)', 'k_skin ≈ 1.02–1.15'],
    promptQuestion: 'How do you convert 250 mm² to m² and find 3-phase total DC resistance?',
    practicalApplication: 'I²R thermal losses and voltage drop sizing for overhead aluminum (ACSR) feeders.',
    systemConsequence: 'AC resistance exceeds DC resistance due to skin effect crowding current toward the outer surface.',
    catTrap: 'Forgetting to multiply per-phase R_dc by 3 for total 3-phase circuit resistance, or mis-converting mm² (10⁻⁶ m²).',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'dc_ac_resistance',
  },
  {
    id: 'fc_gmr_1ph',
    syllabusTopicId: 'pwr_gmr_inductance',
    module: PowerModule.LINE_CORONA,
    title: 'Single-Phase GMR & Loop Inductance',
    catPriority: 'Critical',
    formulaDisplay: 'GMR = 0.7788·r ,   L_cond = 2×10⁻⁷ ln(D / GMR) H/m',
    variableLegend: ['r: conductor radius (m)', 'D: spacing (m)', 'L_total = 2 × L_cond (1ϕ loop)'],
    promptQuestion: 'What is total loop inductance per km of a 2-wire single-phase circuit?',
    practicalApplication: 'Calculates inductive reactance X_L = 2πfL causing reactive voltage drop along feeders.',
    systemConsequence: '0.7788 = e⁻¹/⁴ captures internal magnetic flux inside solid round conductors.',
    catTrap: 'Reporting single-conductor inductance instead of multiplying by 2 for total 2-wire loop inductance.',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'line_inductance',
  },
  {
    id: 'fc_cap_3ph',
    syllabusTopicId: 'pwr_cap_charging',
    module: PowerModule.LINE_CORONA,
    title: '3-Phase Capacitance & Charging Current',
    catPriority: 'Critical',
    formulaDisplay: 'C_n = 2πε₀ / ln(D/r) F/m ,   I_c = 2πf · C_km · (V_L / √3)',
    variableLegend: ['ε₀ = 8.854×10⁻¹² F/m', 'r: actual outer radius', 'V_L: line-to-line voltage'],
    promptQuestion: 'Why does I_c rise linearly with voltage and frequency even at no-load?',
    practicalApplication: 'Sizes shunt reactors on lightly loaded EHV lines to prevent Ferranti overvoltage.',
    systemConsequence: 'Shunt capacitive reactive power Q_c = 3 V_ph I_c can overload long underground cables.',
    catTrap: 'Using 0.7788r instead of r in ln(D/r), or forgetting to divide line voltage V_L by √3 to get V_ph!',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'line_capacitance',
  },
  {
    id: 'fc_bundle_gmr',
    syllabusTopicId: 'pwr_bundled_conductors',
    module: PowerModule.LINE_CORONA,
    title: '2-Conductor Bundle GMR',
    catPriority: 'Critical',
    formulaDisplay: 'D_sb = √(r\' · d) ,   L_ph = 2×10⁻⁷ ln(D_eq / D_sb) H/m',
    variableLegend: ['r\' = 0.7788·r', 'd: sub-conductor spacing', 'D_eq = ∛(D_ab D_bc D_ca)'],
    promptQuestion: 'How does doubling r\' to D_sb affect line inductance and corona?',
    practicalApplication: 'Used on all 220 kV–765 kV EHV lines to slash reactance and surface electric gradient.',
    systemConsequence: 'Larger D_sb reduces L, shrinks surge impedance Z_c, and increases Surge Impedance Loading (SIL).',
    catTrap: 'Mixing units between sub-conductor radius r (cm), spacing d (cm), and phase spacing D (m). Convert all to meters!',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'bundled_gmr',
  },
  {
    id: 'fc_peek_vd',
    syllabusTopicId: 'pwr_peek_corona',
    module: PowerModule.LINE_CORONA,
    title: 'Peek’s Disruptive Voltage & Corona Loss',
    catPriority: 'Critical',
    formulaDisplay: 'V_d = m₀ g₀ δ r ln(D/r) ,   P_c = (242.2/δ)(f+25)√(r/D)(V_ph−V_d)²×10⁻⁵',
    variableLegend: ['g₀ = 21.21 kV(rms)/cm', 'δ: air density', 'm₀: surface factor', 'V_ph = V_L/√3'],
    promptQuestion: 'What happens to corona power loss P_c if operating voltage exceeds V_d?',
    practicalApplication: 'Determines conductor sizing so fair-weather V_ph remains comfortably below V_d.',
    systemConsequence: 'Loss grows quadratically with (V_ph − V_d)²; high altitude (low δ) drops V_d sharply.',
    catTrap: 'Entering line-to-line voltage (260 kV) directly as V_ph instead of 260/√3 = 150.11 kV!',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'peek_corona',
  },
  {
    id: 'fc_econ_lambda',
    syllabusTopicId: 'pwr_econ_dispatch',
    module: PowerModule.DISPATCH_AGC,
    title: 'Economic Dispatch Equal Incremental Cost',
    catPriority: 'Exam Core',
    formulaDisplay: 'IC_i = b_i + 2c_i P_i = λ  ($/MWh)',
    variableLegend: ['C_i = a_i + b_i P_i + c_i P_i²', 'P_min ≤ P_i ≤ P_max'],
    promptQuestion: 'What do you do if unconstrained P_i exceeds P_max?',
    practicalApplication: 'Real-time AGC base-point economic dispatch every 4–5 minutes in control centers.',
    systemConsequence: 'Clamping one unit at P_max forces remaining unconstrained generators to raise λ to meet load.',
    catTrap: 'Forgetting to re-calculate λ after clamping a unit at P_min or P_max so total generation still equals P_D.',
    recommendedLab: PowerLabType.DISPATCH_AGC,
    recommendedCalc: 'econ_dispatch',
  },
  {
    id: 'fc_fortescue',
    syllabusTopicId: 'pwr_symmetrical_transform',
    module: PowerModule.SYMMETRICAL,
    title: 'Fortescue Symmetrical Transform',
    catPriority: 'High',
    formulaDisplay: 'V₁ = (V_a + aV_b + a²V_c)/3 ,   a = 1∠120° = −0.5 + j0.866',
    variableLegend: ['a² = 1∠240°', '1 + a + a² = 0', 'a³ = 1'],
    promptQuestion: 'What is V₀ and V₂ for a perfectly balanced positive-sequence set?',
    practicalApplication: 'Detects grid unbalance, open-conductor faults, and negative-sequence rotor heating.',
    systemConsequence: 'Zero-sequence current 3I₀ = I_a + I_b + I_c flows to ground only when a neutral return exists.',
    catTrap: 'Swapping a and a² between the synthesis matrix A and inverse analysis matrix A⁻¹!',
    recommendedLab: PowerLabType.SYMMETRICAL_FAULTS,
    recommendedCalc: 'symmetrical_comp',
  },
  {
    id: 'fc_slg_fault',
    syllabusTopicId: 'pwr_unbalanced_faults',
    module: PowerModule.FAULTS,
    title: 'Unbalanced Fault Sequence Connections',
    catPriority: 'Exam Core',
    formulaDisplay: 'SLG: I_a = 3E / (Z₁ + Z₂ + Z₀ + 3Z_f) ,   LL: I₁ = E / (Z₁ + Z₂ + Z_f)',
    variableLegend: ['SLG = series 1-2-0', 'LL = anti-parallel 1-2', 'DLG = parallel 1∥(2∥0)'],
    promptQuestion: 'How does transformer Δ–Yg grounding affect Z₀ seen from each side?',
    practicalApplication: 'Sizes circuit breaker interrupting ratings and sets ground-overcurrent relays.',
    systemConsequence: 'A Δ winding blocks zero-sequence current from crossing to the other side while providing a local ground loop on its Yg side.',
    catTrap: 'Omitting the factor of 3 in 3Z_f or 3Z_n inside the zero-sequence network!',
    recommendedLab: PowerLabType.SYMMETRICAL_FAULTS,
    recommendedCalc: 'power_faults',
  },
  {
    id: 'fc_bewley',
    syllabusTopicId: 'pwr_bewley_lattice',
    module: PowerModule.TRANSIENTS,
    title: 'Bewley Lattice Reflection & Transmission',
    catPriority: 'Exam Core',
    formulaDisplay: 'Γ = (Z_L − Z_c)/(Z_L + Z_c) ,   τ = 1 + Γ = 2Z_L/(Z_L + Z_c)',
    variableLegend: ['Open end: Γ = +1, τ = 2', 'Short end: Γ = −1, τ = 0', 'Matched: Γ = 0'],
    promptQuestion: 'What is the load voltage after the first reflection on an open-ended lossless line?',
    practicalApplication: 'Insulation coordination and surge arrester protection at cable-to-overhead junctions.',
    systemConsequence: 'An open-ended line doubles an incoming step wave (V_load = 2 V⁺) before reflections settle.',
    catTrap: 'Using Γ_current = −Γ_voltage without flipping sign: at a short circuit V reflects with −1 while current reflects with +1.',
    recommendedLab: PowerLabType.TRANSIENTS_PROTECTION,
    recommendedCalc: 'pu_traveling_wave',
  },
  {
    id: 'fc_idmt_mho',
    syllabusTopicId: 'pwr_protection_relays',
    module: PowerModule.PROTECTION,
    title: 'IEC IDMT Overcurrent & Mho Distance',
    catPriority: 'Exam Core',
    formulaDisplay: 't_op = TDS · 0.14 / ((I_f / I_pickup)^0.02 − 1)  (Standard Inverse)',
    variableLegend: ['PSM = I_f / I_pickup > 1', 'TDS: Time Dial Setting', 'Z_seen = V_relay / I_relay'],
    promptQuestion: 'How do adjacent overcurrent relays maintain coordination time margin?',
    practicalApplication: 'Radial distribution feeder protection and main EHV line impedance relaying.',
    systemConsequence: 'Higher fault current trips faster (inverse time); upstream relay TDS is graded +0.3 s above downstream.',
    catTrap: 'Forgetting CT ratio conversion between primary fault amperes and relay secondary pickup amperes.',
    recommendedLab: PowerLabType.TRANSIENTS_PROTECTION,
    recommendedCalc: 'pu_traveling_wave',
  },
];

export const POWER_INLINE_THEORY: Record<
  string,
  { intuition: string; pioneerNote: string }
> = {
  pwr_corona_physics: {
    intuition:
      'Air ionizes into a conductive halo whenever surface electric stress exceeds 21.21 kV(rms)/cm—converting energy into light, sound, ozone, and RF noise.',
    pioneerNote:
      'Frank W. Peek Jr. systematically mapped corona loss in GE’s high-voltage lab in 1911.',
  },
  pwr_dc_ac_resistance: {
    intuition:
      'Alternating magnetic fields induce eddy counter-currents in the core of a wire, pushing 50/60 Hz current toward the outer skin and raising effective resistance.',
    pioneerNote:
      'Heaviside & Kelvin formalized skin-effect depth equations in the late 19th century.',
  },
  pwr_gmr_inductance: {
    intuition:
      'A hollow tube of radius 0.7788r carries the exact same total magnetic flux linkage as a solid wire of radius r carrying uniform current.',
    pioneerNote:
      'Maxwell introduced geometric mean distance (GMD) & GMR to simplify multi-strand busbars.',
  },
  pwr_cap_charging: {
    intuition:
      'Long overhead lines behave like giant distributed cylindrical capacitors drawing leading charging current all along their length.',
    pioneerNote:
      'Sebastian Ziani de Ferranti observed voltage rising along lightly loaded Deptford cables in 1890.',
  },
  pwr_bundled_conductors: {
    intuition:
      'Splitting one fat conductor into two or more separated sub-conductors spreads magnetic flux and electric charge across a wider virtual cylinder.',
    pioneerNote:
      'Pioneered on 380–500 kV Swedish and North American EHV corridors in the 1950s.',
  },
  pwr_peek_corona: {
    intuition:
      'Corona power loss is zero below V_d and rises smoothly as a parabola (V_ph − V_d)² above the breakdown threshold.',
    pioneerNote:
      'Peek’s empirical constant 242.2 accounts for fair-weather air ionization losses per km per phase.',
  },
  pwr_econ_dispatch: {
    intuition:
      'Running every free plant at the exact same marginal slope $/MWh leaves zero room to save money by shifting 1 MW from one unit to another.',
    pioneerNote:
      'Kirchmayer popularized incremental cost dispatch computers across US utility pools in the 1950s.',
  },
  pwr_droop_agc: {
    intuition:
      'Droop lets multiple governors share a load shock stably without fighting; integral AGC slowly trims the governor reference back to 50/60 Hz.',
    pioneerNote:
      'Nathan Cohn’s 1956 tie-line bias ACE principle still coordinates continental synchronous grids.',
  },
  pwr_symmetrical_transform: {
    intuition:
      'Any lopsided 3-phase star of phasors equals a forward-spinning star + backward-spinning star + three parallel pulsating arrows.',
    pioneerNote:
      'Fortescue proved this diagonalization theorem in his landmark 1918 AIEE paper.',
  },
  pwr_pu_sequence_nets: {
    intuition:
      'Per-unit normalization erases transformer turns ratios so a 13.8 kV / 230 kV / 69 kV grid collapses onto one clean impedance circuit.',
    pioneerNote:
      'Standardized across utility network analyzers in the 1930s.',
  },
  pwr_balanced_fault: {
    intuition:
      'A bolted 3-phase fault maintains 120° symmetry, so negative and zero sequence components vanish identically.',
    pioneerNote:
      'Defines maximum symmetrical breaking duty for HV SF₆ circuit breakers.',
  },
  pwr_unbalanced_faults: {
    intuition:
      'Fault boundary conditions at the faulted bus dictate whether sequence networks wire in series (SLG), parallel (DLG), or anti-parallel (LL).',
    pioneerNote:
      'Edith Clarke (first female EE professor at UT Austin) authored classic fault network charts.',
  },
  pwr_traveling_waves: {
    intuition:
      'Wavefronts see only local L and C per meter—forming a purely resistive surge ratio Z_c = √(L/C) until a reflection returns.',
    pioneerNote:
      'Oliver Heaviside derived wave propagation and distortionless transmission conditions.',
  },
  pwr_bewley_lattice: {
    intuition:
      'Each reflection coefficient Γ scales the arriving wave; adding all arriving + reflected waves at an endpoint gives exact voltage vs time.',
    pioneerNote:
      'L.V. Bewley’s 1931 bounce lattice turned partial differential wave equations into arithmetic.',
  },
  pwr_protection_relays: {
    intuition:
      'Fast local tripping (Zone 1 / 87T) isolates faults in milliseconds while time-graded backup zones (Zone 2 / IDMT) wait safely.',
    pioneerNote:
      'Phadke & Thorp’s digital relaying algorithms transitioned grids from induction disks to microprocessor relays.',
  },
};
